import { validFeaturedId } from './featured-image.ts';
import { data, redirect } from 'react-router';
import { createEventDraft } from './content-db.server.ts';
import { StudioError, studioSession, studioFailure, studioHeaders } from './content-studio.server.ts';
import type { AuthEnvironment } from './staff-auth.server.ts';
import { resolveEventTime, reopenEventTime, EVENT_TIMEZONE } from './event-time.ts';

export type EventValues = { featuredImageId?: string; pendingImageId?: string; title: string; bodyText: string; startLocal: string; endLocal: string; timezone: string; startOccurrence: string; endOccurrence: string; revision: string };
export type EventErrors = Partial<Record<keyof EventValues | 'form', string>>;
export type DraftEvent = {
  featured_image_id: string | null; pending_image_id: string | null; id: string; slug: string; title: string; body_text: string; state: 'draft'; created_at: number; updated_at: number;
  revision: number; author: string | null; last_editor: string | null; starts_at: number; ends_at: number; timezone: string; event_state: 'active' | 'cancelled';
};
const eligible = "c.kind='event' AND c.state='draft' AND c.published_at IS NULL AND c.is_fixture=0";
const columns = `c.id,c.slug,c.title,c.body_text,c.state,c.created_at,c.updated_at,e.starts_at,e.ends_at,e.timezone,e.event_state,
  (SELECT json_extract(snapshot_json,'$.featured_image_id') FROM content_revisions WHERE content_id=c.id ORDER BY revision DESC LIMIT 1) AS featured_image_id,
  (SELECT json_extract(snapshot_json,'$.pending_image_id') FROM content_revisions WHERE content_id=c.id ORDER BY revision DESC LIMIT 1) AS pending_image_id,
  (SELECT MAX(revision) FROM content_revisions WHERE content_id=c.id) AS revision,
  (SELECT COALESCE(NULLIF(u.display_name,''),u.username) FROM content_revisions r LEFT JOIN site_users u ON u.discord_user_id=r.actor_id WHERE r.content_id=c.id ORDER BY r.revision ASC LIMIT 1) AS author,
  (SELECT COALESCE(NULLIF(u.display_name,''),u.username) FROM content_revisions r LEFT JOIN site_users u ON u.discord_user_id=r.actor_id WHERE r.content_id=c.id ORDER BY r.revision DESC LIMIT 1) AS last_editor`;

class EventValidationError extends StudioError {
  readonly errors: EventErrors;
  constructor(errors: EventErrors) { super('Please check the highlighted fields.'); this.errors = errors; }
}
export function validateEvent(values: EventValues, preserved?: Pick<EventValues, 'startLocal' | 'endLocal'>, checkIncrements = true) {
  const errors: EventErrors = {};
  if(!validFeaturedId(values.pendingImageId||'') || (values.pendingImageId && values.featuredImageId))errors.pendingImageId='Choose one featured image.';
  if (!validFeaturedId(values.featuredImageId||'')) errors.featuredImageId='Choose a valid featured image.';
  if (!values.title.trim() || values.title.length > 160) errors.title = 'Enter a title of 1–160 characters.';
  if (!values.bodyText.trim() || values.bodyText.length > 40000) errors.bodyText = 'Enter a description of 1–40,000 characters.';
  if (!/^(0|[1-9][0-9]*)$/.test(values.revision) || !Number.isSafeInteger(Number(values.revision))) errors.revision = 'Reload the draft before saving.';
  try {
    if (values.timezone !== EVENT_TIMEZONE) throw new Error();
  } catch { errors.timezone = 'Events use Toronto time. Please reload this form.'; }
  let startsAt: number | undefined, endsAt: number | undefined;
  if (!errors.timezone) {
    try { startsAt = resolveEventTime(values.startLocal, values.timezone, values.startOccurrence); }
    catch (error) { errors.startLocal = (error as Error).message; }
    try { endsAt = resolveEventTime(values.endLocal, values.timezone, values.endOccurrence); }
    catch (error) { errors.endLocal = (error as Error).message; }
    if (startsAt !== undefined && endsAt !== undefined && endsAt <= startsAt) errors.endLocal = 'Please choose an end time after the start time.';
    if (checkIncrements) for (const field of ['startLocal', 'endLocal'] as const) {
      if (values[field] !== preserved?.[field] && !/^\d{4}-\d{2}-\d{2}T\d{2}:(00|15|30|45)$/.test(values[field])) errors[field] = 'Please choose a time from the 15-minute options.';
    }
  }
  return { errors, startsAt, endsAt };
}

export async function eventForm(request: Request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || !request.body) throw new StudioError('Use the supplied event form.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > 262144) { void reader.cancel(); throw new StudioError('The event form is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const form = new URLSearchParams(new TextDecoder().decode(bytes));
  const fields = ['title', 'bodyText', 'startLocal', 'endLocal', 'timezone', 'startOccurrence', 'endOccurrence', 'revision'] as const;
  const values = Object.fromEntries(fields.map(name => [name, form.get(name) ?? ''])) as EventValues;
  if(form.has('pendingImageId'))values.pendingImageId=form.get('pendingImageId')||'';
  if(form.has('featuredImageId'))values.featuredImageId=form.get('featuredImageId')||'';
  values.timezone = EVENT_TIMEZONE;
  const dates = ['eventDate', 'startTime', 'endTime', 'endDate'] as const;
  const parts = Object.fromEntries(dates.map(name => [name, form.get(name) ?? '']));
  // Visible date/time controls are authoritative. Hidden originals only retain
  // existing precision; saveEventDraft verifies that precision against saved data.
  const differentEndDate = form.get('differentEndDate') === '1';
  for (const [field, date, time] of [['startLocal', parts.eventDate, parts.startTime], ['endLocal', differentEndDate ? parts.endDate : parts.eventDate, parts.endTime]] as const) {
    const local = `${date}T${time}`;
    if (values[field].slice(0, 16) !== local) values[field] = local;
  }
  const { errors } = validateEvent(values, undefined, false);
  for (const name of fields.filter(name => name !== 'timezone')) if (form.getAll(name).length !== 1) errors[name] = 'Supply this field exactly once.';
  if(form.getAll('pendingImageId').length>1)errors.pendingImageId='Supply one uploaded image.';
  if(form.getAll('featuredImageId').length>1)errors.featuredImageId='Supply one featured image.';
  for (const name of dates) if (form.getAll(name).length !== 1) errors.form = 'Please use the supplied date and time controls.';
  if (form.getAll('differentEndDate').length > 1 || (form.has('differentEndDate') && !differentEndDate)) errors.form = 'Please choose whether the event ends on another day.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parts.eventDate) || !/^\d{2}:\d{2}$/.test(parts.startTime)) errors.startLocal = 'Please choose a date and start time.';
  if ((differentEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(parts.endDate)) || !/^\d{2}:\d{2}$/.test(parts.endTime)) errors.endLocal = 'Please choose a valid end date and time.';
  if (!differentEndDate && parts.endDate) errors.endLocal = 'Choose “Ends on another day” to use an end date.';
  if (form.has('timezone') && (form.getAll('timezone').length !== 1 || form.get('timezone') !== EVENT_TIMEZONE)) errors.timezone = 'Events use Toronto time. Please reload this form.';
  if (form.getAll('intent').length !== 1 || form.get('intent') !== 'save') errors.form = 'Only saving private event drafts is supported.';
  return { values, errors };
}

export async function listEventDrafts(db: D1Database, search: string, offset: number, status = '') {
  if (search.length > 160 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new StudioError('Use a search of at most 160 characters and a valid page.');
  return (await db.prepare(`SELECT ${columns} FROM content_items c JOIN events e ON e.content_id=c.id
    WHERE ${eligible.replace("c.state='draft'","c.state IN('draft','archived')")} AND (c.state!='archived' OR ?='archived') AND (?='' OR EXISTS(SELECT 1 FROM content_workflows w WHERE w.content_id=c.id AND w.status=?)) AND (?='' OR instr(lower(c.title || char(10) || c.body_text),lower(?))>0)
    ORDER BY c.updated_at DESC,c.id ASC LIMIT 25 OFFSET ?`).bind(status, status, status, search, search, offset).all<DraftEvent>()).results;
}
export async function getEventDraft(db: D1Database, id: string): Promise<DraftEvent> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new StudioError('Event draft not found.', 404);
  const draft = await db.prepare(`SELECT ${columns} FROM content_items c JOIN events e ON e.content_id=c.id WHERE ${eligible} AND c.id=?`).bind(id).first<DraftEvent>();
  if (!draft) throw new StudioError('Event draft not found.', 404);
  return draft;
}
export function eventEditorValues(draft: DraftEvent): EventValues {
  const start = reopenEventTime(draft.starts_at, EVENT_TIMEZONE), end = reopenEventTime(draft.ends_at, EVENT_TIMEZONE);
  const inputLocal = (local: string) => local.endsWith(':00.000') ? local.slice(0, 16) : local;
  return { ...(draft.pending_image_id ? {pendingImageId:draft.pending_image_id}:{}), ...(draft.featured_image_id ? {featuredImageId:draft.featured_image_id}:{}), title: draft.title, bodyText: draft.body_text, startLocal: inputLocal(start.local), endLocal: inputLocal(end.local), timezone: EVENT_TIMEZONE,
    startOccurrence: start.occurrence, endOccurrence: end.occurrence, revision: String(draft.revision) };
}

export async function saveEventDraft(db: D1Database, id: string | null, values: EventValues, actorId: string) {
  const current = id ? await getEventDraft(db, id) : null;
  if (current && /^(0|[1-9][0-9]*)$/.test(values.revision) && Number.isSafeInteger(Number(values.revision)) && Number(values.revision) !== current.revision) throw new StudioError('This draft changed in another session. Your event fields are preserved. Compare with the latest saved draft before reloading.', 409);
  const { errors, startsAt, endsAt } = validateEvent(values, current ? eventEditorValues(current) : undefined);
  if (Object.keys(errors).length || startsAt === undefined || endsAt === undefined) throw new EventValidationError(errors);
  if (!id) {
    if (values.revision !== '0') throw new StudioError('Reload the new event form.', 409);
    return createEventDraft(db, { slug: `event-${crypto.randomUUID()}`, title: values.title, bodyText: values.bodyText, actorId, startsAt, endsAt, timezone: values.timezone, featuredImageId:values.featuredImageId, pendingImageId:values.pendingImageId });
  }
  if (!current) throw new StudioError('Event draft not found.', 404);
  const revision = Number(values.revision);
  if (revision !== current.revision) throw new StudioError('This draft changed in another session. Your event fields are preserved. Compare with the latest saved draft before reloading.', 409);
  const now = Math.max(Date.now(), current.updated_at);
  const snapshot = { pending_image_id:values.pendingImageId === undefined ? current.pending_image_id : values.pendingImageId || null, featured_image_id:values.featuredImageId === undefined ? current.featured_image_id : values.featuredImageId || null, id, kind: 'event', slug: current.slug, title: values.title, body_text: values.bodyText,
    state: 'draft', is_fixture: 0, created_at: current.created_at, updated_at: now, published_at: null,
    starts_at: startsAt, ends_at: endsAt, timezone: values.timezone, event_state: current.event_state };
  // Guard the content revision/state and assert the update inside the same D1 transaction.
  // A failed guard aborts the audit insert and rolls back event, revision and content writes.
  await db.batch([
    db.prepare(`UPDATE content_items SET title=?,body_text=?,updated_at=? WHERE id=? AND kind='event'
      AND state='draft' AND published_at IS NULL AND is_fixture=0 AND (SELECT MAX(revision) FROM content_revisions WHERE content_id=?)=?`)
      .bind(values.title, values.bodyText, now, id, id, revision),
    db.prepare(`INSERT INTO audit_records(id,content_id,actor_id,action,details_json,created_at)
      VALUES (?,?,?,'updated',CASE WHEN changes()=1 THEN json_set(?, '$.invalidatedApproval',(SELECT approval_id FROM content_workflows WHERE content_id=?), '$.cancelledRelease',(SELECT pending_release_id FROM content_workflows WHERE content_id=?)) ELSE NULL END,?)`)
      .bind(crypto.randomUUID(), id, actorId, JSON.stringify({ state: 'draft', revision: revision + 1 }), id, id, now),
    db.prepare('UPDATE events SET starts_at=?,ends_at=?,timezone=? WHERE content_id=?').bind(startsAt, endsAt, values.timezone, id),
    db.prepare('INSERT INTO content_revisions(id,content_id,revision,snapshot_json,actor_id,created_at) VALUES (?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), id, revision + 1, JSON.stringify(snapshot), actorId, now),
  ]).catch(() => { throw new StudioError('The draft changed or could not be saved. Your event fields are preserved. Compare with the latest saved draft before reloading.', 409); });
  return id;
}

export async function eventAction(request: Request, env: AuthEnvironment, id: string | null, development: boolean) {
  let authorized: Awaited<ReturnType<typeof studioSession>>;
  try { authorized = await studioSession(request, env, true, development); }
  catch (error) { throw studioFailure(error); }
  const { values, errors } = await eventForm(request).catch(error => { throw studioFailure(error); });
  if (Object.keys(errors).length) return data({ values, errors, status: 400, message: 'Correct the highlighted fields. Your event fields have been preserved.' }, { status: 400, headers: studioHeaders });
  try {
    const savedId = await saveEventDraft(authorized.db, id, values, authorized.session.discord_user_id);
    return redirect(`/control/events/${savedId}?saved=1`, { status: 303, headers: studioHeaders });
  } catch (error) {
    const failure = studioFailure(error);
    return data({ values, errors: error instanceof EventValidationError ? error.errors : {} as EventErrors, status: failure.status, message: await failure.text() }, { status: failure.status, headers: studioHeaders });
  }
}
