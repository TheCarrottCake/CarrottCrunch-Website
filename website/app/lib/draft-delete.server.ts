import { redirect } from 'react-router';
import { StudioError, studioFailure, studioHeaders, studioSession } from './content-studio.server.ts';
import type { AuthEnvironment } from './staff-auth.server.ts';

export type DraftKind = 'announcement' | 'event';
type DeletableDraft = {
  id: string; kind: DraftKind; slug: string; title: string; body_text: string; created_at: number; updated_at: number;
  revision: number; summary: string | null; starts_at: number | null; ends_at: number | null; timezone: string | null; event_state: string | null;
};

/** Remove an unpublished draft from the workspace without deleting any records. */
export async function archiveDraft(db: D1Database, id: string, kind: DraftKind, revision: number, actorId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new StudioError('Draft not found.', 404);
  if (!['announcement', 'event'].includes(kind) || !Number.isSafeInteger(revision) || revision < 1) throw new StudioError('Reload the draft before deleting it.');
  const current = await db.prepare(`SELECT c.id,c.kind,c.slug,c.title,c.body_text,c.created_at,c.updated_at,
    a.summary,e.starts_at,e.ends_at,e.timezone,e.event_state,
    (SELECT MAX(revision) FROM content_revisions WHERE content_id=c.id) AS revision
    FROM content_items c LEFT JOIN announcements a ON a.content_id=c.id LEFT JOIN events e ON e.content_id=c.id
    WHERE c.id=? AND c.kind=? AND c.state='draft' AND c.published_at IS NULL AND c.is_fixture=0 AND EXISTS(SELECT 1 FROM content_workflows w WHERE w.content_id=c.id AND w.status='draft' AND w.live_release_id IS NULL) AND NOT EXISTS(SELECT 1 FROM content_releases l WHERE l.content_id=c.id)`)
    .bind(id, kind).first<DeletableDraft>();
  if (!current || current.revision !== revision) throw new StudioError('This draft changed or is no longer available. Reload the list before trying again.', 409);
  const now = Math.max(Date.now(), current.updated_at);
  const snapshot = { id, kind, slug: current.slug, title: current.title, body_text: current.body_text, state: 'archived',
    is_fixture: 0, created_at: current.created_at, updated_at: now, published_at: null,
    ...(kind === 'announcement' ? { summary: current.summary } : { starts_at: current.starts_at, ends_at: current.ends_at, timezone: current.timezone, event_state: current.event_state }) };
  // The state/revision guard and changes() assertion share one transaction.
  // A race, repeated request or history failure rolls back every write.
  await db.batch([
    db.prepare(`UPDATE content_items SET state='archived',updated_at=? WHERE id=? AND kind=?
      AND state='draft' AND published_at IS NULL AND is_fixture=0
      AND EXISTS(SELECT 1 FROM content_workflows w WHERE w.content_id=? AND w.status='draft' AND w.live_release_id IS NULL) AND NOT EXISTS(SELECT 1 FROM content_releases l WHERE l.content_id=?)
      AND (SELECT MAX(revision) FROM content_revisions WHERE content_id=?)=?`).bind(now, id, kind, id, id, id, revision),
    db.prepare(`INSERT INTO audit_records(id,content_id,actor_id,action,details_json,created_at)
      VALUES (?,?,?,'state_changed',CASE WHEN changes()=1 THEN ? ELSE NULL END,?)`)
      .bind(crypto.randomUUID(), id, actorId, JSON.stringify({ reason: 'draft_deleted', from: 'draft', to: 'archived', revision: revision + 1 }), now),
    db.prepare('INSERT INTO content_revisions(id,content_id,revision,snapshot_json,actor_id,created_at) VALUES (?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), id, revision + 1, JSON.stringify(snapshot), actorId, now),
  ]).catch(() => { throw new StudioError('The draft changed or could not be deleted. Reload the list before trying again.', 409); });
}

export async function deleteDraftAction(request: Request, env: AuthEnvironment, id: string, development: boolean) {
  try {
    const { session, db } = await studioSession(request, env, true, development);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || !request.body) throw new StudioError('Use the supplied confirmation dialog.');
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 4096) { void reader.cancel(); throw new StudioError('The deletion request is too large.', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const fields = new URLSearchParams(new TextDecoder().decode(bytes));
    const kind = fields.get('kind'); const revision = fields.get('revision') ?? '';
    if (['kind', 'revision', 'intent'].some(name => fields.getAll(name).length !== 1) || fields.get('intent') !== 'delete'
      || (kind !== 'announcement' && kind !== 'event') || !/^[1-9][0-9]*$/.test(revision) || !Number.isSafeInteger(Number(revision))) throw new StudioError('Reload the draft and confirm deletion again.');
    await archiveDraft(db, id, kind, Number(revision), session.discord_user_id);
    return redirect(kind === 'event' ? '/control/news?kind=event&deleted=1' : '/control/news?deleted=1', { status: 303, headers: studioHeaders });
  } catch (error) {
    const failure = studioFailure(error);
    // Fetcher submissions keep their error in the dialog instead of losing editor text.
    return Response.json({ message: await failure.text(), status: failure.status }, { status: failure.status, headers: studioHeaders });
  }
}
