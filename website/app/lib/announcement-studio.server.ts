import { createAnnouncementDraft } from './content-db.server.ts';
import { data, redirect } from 'react-router';
import type { AuthEnvironment } from './staff-auth.server.ts';
import { StudioError, studioHeaders, studioSession, studioIdentity, studioFailure, draftHistory } from './content-studio.server.ts';
export { StudioError, studioHeaders, studioSession, studioIdentity, studioFailure } from './content-studio.server.ts';

export type EditorValues = { title: string; summary: string; bodyText: string; revision: string };
export type EditorErrors = Partial<Record<keyof EditorValues | 'form', string>>;
export type DraftAnnouncement = {
  id: string; slug: string; title: string; summary: string; body_text: string;
  state: 'draft'; created_at: number; updated_at: number; revision: number;
  author: string | null; last_editor: string | null;
};
const eligible = "c.kind='announcement' AND c.state='draft' AND c.published_at IS NULL AND c.is_fixture=0";
const columns = `c.id,c.slug,c.title,a.summary,c.body_text,c.state,c.created_at,c.updated_at,
  (SELECT MAX(revision) FROM content_revisions WHERE content_id=c.id) AS revision,
  (SELECT COALESCE(NULLIF(u.display_name,''),u.username) FROM content_revisions r LEFT JOIN site_users u ON u.discord_user_id=r.actor_id WHERE r.content_id=c.id ORDER BY r.revision ASC LIMIT 1) AS author,
  (SELECT COALESCE(NULLIF(u.display_name,''),u.username) FROM content_revisions r LEFT JOIN site_users u ON u.discord_user_id=r.actor_id WHERE r.content_id=c.id ORDER BY r.revision DESC LIMIT 1) AS last_editor`;

/** Read only a bounded URL-encoded form, after authorization and CSRF verification. */
export async function editorForm(request: Request): Promise<{ values: EditorValues; errors: EditorErrors }> {
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || !request.body) throw new StudioError('Use the supplied announcement form.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 262144) { void reader.cancel(); throw new StudioError('The announcement form is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const form = new URLSearchParams(new TextDecoder().decode(bytes));
  const values = { title: form.get('title') ?? '', summary: form.get('summary') ?? '', bodyText: form.get('bodyText') ?? '', revision: form.get('revision') ?? '' };
  const errors: EditorErrors = {};
  for (const name of ['title', 'summary', 'bodyText', 'revision'] as const) if (form.getAll(name).length !== 1) errors[name] = 'Supply this field exactly once.';
  if (form.getAll('intent').length !== 1 || form.get('intent') !== 'save') errors.form = 'Only saving announcement drafts is supported.';
  Object.assign(errors, validateEditor(values));
  return { values, errors };
}
export function validateEditor(values: EditorValues): EditorErrors {
  const errors: EditorErrors = {};
  if (!values.title.trim() || values.title.length > 160) errors.title = 'Enter a title of 1–160 characters.';
  if (!values.summary.trim() || values.summary.length > 600) errors.summary = 'Enter a summary of 1–600 characters.';
  if (!values.bodyText.trim() || values.bodyText.length > 40000) errors.bodyText = 'Enter a Markdown body of 1–40,000 characters.';
  if (!/^(0|[1-9][0-9]*)$/.test(values.revision) || !Number.isSafeInteger(Number(values.revision))) errors.revision = 'Reload the draft before saving.';
  return errors;
}

export async function listAnnouncementDrafts(db: D1Database, search: string, offset: number) {
  if (search.length > 160 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new StudioError('Use a search of at most 160 characters and a valid page.');
  // instr treats %, _ and other search characters literally; parameters never become SQL.
  const result = await db.prepare(`SELECT ${columns} FROM content_items c JOIN announcements a ON a.content_id=c.id
    WHERE ${eligible} AND (?='' OR instr(lower(c.title || char(10) || a.summary),lower(?))>0)
    ORDER BY c.updated_at DESC,c.id ASC LIMIT 25 OFFSET ?`).bind(search, search, offset).all<DraftAnnouncement>();
  return result.results;
}
export async function getAnnouncementDraft(db: D1Database, id: string): Promise<DraftAnnouncement> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new StudioError('Announcement draft not found.', 404);
  const row = await db.prepare(`SELECT ${columns} FROM content_items c JOIN announcements a ON a.content_id=c.id WHERE ${eligible} AND c.id=?`).bind(id).first<DraftAnnouncement>();
  if (!row) throw new StudioError('Announcement draft not found.', 404);
  return row;
}
export const announcementHistory = draftHistory;
export async function saveAnnouncementDraft(db: D1Database, id: string | null, values: EditorValues, actorId: string) {
  if (Object.keys(validateEditor(values)).length) throw new StudioError('Correct the highlighted announcement fields.');
  if (!id) {
    if (values.revision !== '0') throw new StudioError('Reload the new announcement form.', 409);
    return createAnnouncementDraft(db, { slug: `announcement-${crypto.randomUUID()}`, title: values.title, summary: values.summary, bodyText: values.bodyText, actorId });
  }
  const current = await getAnnouncementDraft(db, id);
  const revision = Number(values.revision);
  if (revision !== current.revision) throw new StudioError('This draft changed in another session. Your text is preserved. Compare with the latest saved draft before reloading.', 409);
  const now = Math.max(Date.now(), current.updated_at);
  const snapshot = { id, kind: 'announcement', slug: current.slug, title: values.title, summary: values.summary,
    body_text: values.bodyText, state: 'draft', is_fixture: 0, created_at: current.created_at, updated_at: now, published_at: null };
  const details = JSON.stringify({ state: 'draft', revision: revision + 1 });
  // The guarded update and immediately following audit assertion are in ONE D1 transaction.
  // A lost race/state change makes details_json NULL, violating its NOT NULL constraint
  // and rolling back every write, including revision and summary changes.
  await db.batch([
    db.prepare(`UPDATE content_items SET title=?,body_text=?,updated_at=? WHERE id=? AND kind='announcement'
      AND state='draft' AND published_at IS NULL AND is_fixture=0
      AND (SELECT MAX(revision) FROM content_revisions WHERE content_id=?)=?`)
      .bind(values.title, values.bodyText, now, id, id, revision),
    db.prepare(`INSERT INTO audit_records(id,content_id,actor_id,action,details_json,created_at)
      VALUES (?,?,?,'updated',CASE WHEN changes()=1 THEN ? ELSE NULL END,?)`).bind(crypto.randomUUID(), id, actorId, details, now),
    db.prepare('UPDATE announcements SET summary=? WHERE content_id=?').bind(values.summary, id),
    db.prepare('INSERT INTO content_revisions(id,content_id,revision,snapshot_json,actor_id,created_at) VALUES (?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), id, revision + 1, JSON.stringify(snapshot), actorId, now),
  ]).catch(() => { throw new StudioError('The draft changed or could not be saved. Your text is preserved. Compare with the latest saved draft before reloading.', 409); });
  return id;
}

export async function announcementAction(request: Request, env: AuthEnvironment, id: string | null, development: boolean) {
  // Never reflect submitted data until the caller has passed role, Origin and CSRF checks.
  let authorized: Awaited<ReturnType<typeof studioSession>>;
  try { authorized = await studioSession(request, env, true, development); }
  catch (error) { throw studioFailure(error); }
  const { values, errors } = await editorForm(request).catch(error => { throw studioFailure(error); });
  if (Object.keys(errors).length) return data({ values, errors, status: 400, message: 'Correct the highlighted fields. Your text has been preserved.' }, { status: 400, headers: studioHeaders });
  try {
    const savedId = await saveAnnouncementDraft(authorized.db, id, values, authorized.session.discord_user_id);
    return redirect(`/control/news/${savedId}?saved=1`, { status: 303, headers: studioHeaders });
  } catch (error) {
    const failure = studioFailure(error);
    return data({ values, errors: {} as EditorErrors, status: failure.status, message: await failure.text() }, { status: failure.status, headers: studioHeaders });
  }
}
