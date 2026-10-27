/** Only server code may import this module. No public mutation routes are provided. */
export type ContentEnvironment = { CONTENT_DB?: D1Database; CONTENT_DEMO_MODE?: string };
export type PublicationState = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type PublishedAnnouncement = {
  id: string; slug: string; title: string; body_text: string; published_at: number; is_fixture: number;
};
export type PublishedEvent = PublishedAnnouncement & {
  starts_at: number; ends_at: number; timezone: string; event_state: 'active' | 'cancelled';
};

export function requireContentDatabase(env: ContentEnvironment): D1Database {
  if (!env.CONTENT_DB) throw new Error('Content database is not configured');
  return env.CONTENT_DB;
}

function timestamp(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Expected UTC epoch milliseconds');
  return value;
}
function pageSize(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('Limit must be from 1 to 100');
  return value;
}
const publicColumns = 'c.id, c.slug, c.title, c.body_text, c.published_at, c.is_fixture';
export type PublicQueryOptions = { demonstration?: boolean };
// Fixtures are opt-in from a trusted server setting, never a URL parameter.
const published = "c.state = 'published' AND c.is_fixture = ? AND c.published_at <= ?";

export async function getPublishedAnnouncements(db: D1Database, now = Date.now(), limit = 20, options: PublicQueryOptions = {}): Promise<PublishedAnnouncement[]> {
  const result = await db.prepare(`SELECT ${publicColumns} FROM approved_public_content c
    JOIN announcements a ON a.content_id = c.id WHERE ${published}
    ORDER BY c.published_at DESC, c.id ASC LIMIT ?`).bind(options.demonstration ? 1 : 0, timestamp(now), pageSize(limit)).all<PublishedAnnouncement>();
  return result.results;
}

export async function getPublishedAnnouncement(db: D1Database, id: string, now = Date.now(), options: PublicQueryOptions = {}): Promise<PublishedAnnouncement | null> {
  return db.prepare(`SELECT ${publicColumns} FROM approved_public_content c JOIN announcements a ON a.content_id = c.id
    WHERE ${published} AND c.id = ?`).bind(options.demonstration ? 1 : 0, timestamp(now), id).first<PublishedAnnouncement>();
}

export async function getPublishedEvents(db: D1Database, now = Date.now(), limit = 20, options: PublicQueryOptions & { upcomingOnly?: boolean } = {}): Promise<PublishedEvent[]> {
  timestamp(now);
  const result = await db.prepare(`SELECT ${publicColumns}, c.starts_at, c.ends_at, c.timezone, c.event_state
    FROM approved_public_content c WHERE c.kind='event' AND ${published}
    ${options.upcomingOnly ? "AND c.event_state = 'active' AND c.starts_at > ?" : ''}
    ORDER BY CASE WHEN c.event_state = 'cancelled' THEN 2 WHEN c.ends_at <= ? THEN 1 ELSE 0 END,
      CASE WHEN c.event_state = 'active' AND c.ends_at <= ? THEN -c.ends_at ELSE c.starts_at END ASC,
      c.id ASC LIMIT ?`).bind(
        options.demonstration ? 1 : 0, now, ...(options.upcomingOnly ? [now] : []), now, now, pageSize(limit),
      ).all<PublishedEvent>();
  return result.results;
}

export type DraftInput = { slug: string; title: string; bodyText: string; actorId: string; summary?: string };
export type EventDraftInput = DraftInput & { startsAt: number; endsAt: number; timezone: string };

async function createDraft(db: D1Database, input: DraftInput, event?: EventDraftInput): Promise<string> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || !input.title.trim() || !input.actorId.trim()) {
    throw new Error('A slug, title, and actor identifier are required');
  }
  if (event) {
    timestamp(event.startsAt); timestamp(event.endsAt);
    if (event.endsAt <= event.startsAt) throw new Error('Event end must follow start');
    // Validate an IANA zone; do not infer UTC instants from ambiguous local times.
    if (/^[+-]/.test(event.timezone)) throw new Error('Expected an IANA timezone');
    new Intl.DateTimeFormat('en', { timeZone: event.timezone }).format();
  }
  if (input.summary !== undefined && (typeof input.summary !== 'string' || input.summary.length > 600)) throw new Error('Summary must be at most 600 characters');
  const id = crypto.randomUUID();
  const now = Date.now();
  const kind = event ? 'event' : 'announcement';
  const snapshot = {
    id, kind, slug: input.slug, title: input.title, body_text: input.bodyText,
    state: 'draft', is_fixture: 0, created_at: now, updated_at: now, published_at: null,
    ...(event ? { starts_at: event.startsAt, ends_at: event.endsAt, timezone: event.timezone, event_state: 'active' } : input.summary !== undefined ? { summary: input.summary } : {}),
  };
  // D1 batch is transactional: content, first revision, and audit succeed together.
  await db.batch([
    db.prepare(`INSERT INTO content_items (id, kind, slug, title, body_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, kind, input.slug, input.title, input.bodyText, now, now),
    event
      ? db.prepare('INSERT INTO events (content_id, starts_at, ends_at, timezone) VALUES (?, ?, ?, ?)').bind(id, event.startsAt, event.endsAt, event.timezone)
      : input.summary !== undefined
        ? db.prepare('INSERT INTO announcements (content_id, summary) VALUES (?, ?)').bind(id, input.summary)
        : db.prepare('INSERT INTO announcements (content_id) VALUES (?)').bind(id),
    db.prepare('INSERT INTO content_revisions (id, content_id, revision, snapshot_json, actor_id, created_at) VALUES (?, ?, 1, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, JSON.stringify(snapshot), input.actorId, now),
    db.prepare("INSERT INTO audit_records (id, content_id, actor_id, action, details_json, created_at) VALUES (?, ?, ?, 'created', ?, ?)")
      .bind(crypto.randomUUID(), id, input.actorId, JSON.stringify({ state: 'draft' }), now),
  ]);
  return id;
}

// Internal building blocks only. Staff-facing callers must enforce authorization.
export function createAnnouncementDraft(db: D1Database, input: DraftInput): Promise<string> {
  return createDraft(db, input);
}
export function createEventDraft(db: D1Database, input: EventDraftInput): Promise<string> {
  return createDraft(db, input, input);
}
