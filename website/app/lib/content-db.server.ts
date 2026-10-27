import {studioPublic} from './studio.server.ts';
import {studioImages} from './studio-media.server.ts';
import type {StudioImage} from './studio-model.ts';
import type { FeaturedImage } from './featured-image.ts';
import { publicFeaturedImage, publicFeaturedImages } from './editorial-media.server.ts';
/** Only server code may import this module. No public mutation routes are provided. */
export type ContentEnvironment = { CONTENT_DB?: D1Database; CONTENT_DEMO_MODE?: string };
export type PublicationState = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type PublishedAnnouncement = {
  featuredImage?: FeaturedImage; studioImages?: Record<string,StudioImage>; location?:string;
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
async function hasStudio(db: D1Database) { return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='studio_documents'").first(); }
const published = "c.state = 'published' AND c.is_fixture = ? AND c.published_at <= ?";

export async function getPublishedAnnouncements(db: D1Database, now = Date.now(), limit = 20, options: PublicQueryOptions = {}): Promise<PublishedAnnouncement[]> {
  const migrated=await hasStudio(db),modern=migrated?await studioPublic(db,'announcement',limit,'',now):[];
  const result = await db.prepare(`SELECT ${publicColumns} FROM approved_public_content c
    JOIN announcements a ON a.content_id = c.id WHERE ${published} ${migrated?'AND NOT EXISTS(SELECT 1 FROM studio_documents d WHERE d.id=c.id)':''}
    ORDER BY c.published_at DESC, c.id ASC LIMIT ?`).bind(options.demonstration ? 1 : 0, timestamp(now), pageSize(limit)).all<PublishedAnnouncement>();
  const images=await publicFeaturedImages(db,result.results.map(item=>item.id),now);
  const legacy=result.results.map(item=>{const featuredImage=images.get(item.id);return featuredImage?{...item,featuredImage}:item;});
  return [...await Promise.all(modern.map(row=>modernPublic(db,row))),...legacy].sort((a,b)=>b.published_at-a.published_at||a.id.localeCompare(b.id)).slice(0,limit);
}

export async function getPublishedAnnouncement(db: D1Database, id: string, now = Date.now(), options: PublicQueryOptions = {}): Promise<PublishedAnnouncement | null> {
  const exists=await hasStudio(db)?await db.prepare('SELECT id FROM studio_documents WHERE id=?').bind(id).first():null;if(exists){const row=(await studioPublic(db,'announcement',1,id,now)).find(row=>row.id===id);return row?modernPublic(db,row):null;}
  const item = await db.prepare(`SELECT ${publicColumns} FROM approved_public_content c JOIN announcements a ON a.content_id = c.id
    WHERE ${published} AND c.id = ?`).bind(options.demonstration ? 1 : 0, timestamp(now), id).first<PublishedAnnouncement>();
  if(!item)return null;const featuredImage=await publicFeaturedImage(db,id,now);return featuredImage?{...item,featuredImage}:item;
}

export async function getPublishedEvents(db: D1Database, now = Date.now(), limit = 20, options: PublicQueryOptions & { upcomingOnly?: boolean } = {}): Promise<PublishedEvent[]> {
  timestamp(now);
  const migrated=await hasStudio(db),modern=migrated?await studioPublic(db,'event',100,'',now):[];
  const result = await db.prepare(`SELECT ${publicColumns}, c.starts_at, c.ends_at, c.timezone, c.event_state
    FROM approved_public_content c WHERE c.kind='event' AND ${published} ${migrated?'AND NOT EXISTS(SELECT 1 FROM studio_documents d WHERE d.id=c.id)':''}
    ${options.upcomingOnly ? "AND c.event_state = 'active' AND c.starts_at > ?" : ''}
    ORDER BY CASE WHEN c.event_state = 'cancelled' THEN 2 WHEN c.ends_at <= ? THEN 1 ELSE 0 END,
      CASE WHEN c.event_state = 'active' AND c.ends_at <= ? THEN -c.ends_at ELSE c.starts_at END ASC,
      c.id ASC LIMIT ?`).bind(
        options.demonstration ? 1 : 0, now, ...(options.upcomingOnly ? [now] : []), now, now, pageSize(limit),
      ).all<PublishedEvent>();
  const all=[...await Promise.all(modern.map(row=>modernPublic(db,row))),...result.results] as PublishedEvent[];
  const rank=(e:PublishedEvent)=>e.event_state==='cancelled'?2:e.ends_at<=now?1:0;
  return all.filter(e=>!options.upcomingOnly||(e.event_state==='active'&&e.starts_at>now)).sort((a,b)=>rank(a)-rank(b)||(rank(a)===1?b.ends_at-a.ends_at:a.starts_at-b.starts_at)||a.id.localeCompare(b.id)).slice(0,limit);
}

export type DraftInput = { slug: string; title: string; bodyText: string; actorId: string; summary?: string; featuredImageId?: string; pendingImageId?: string };
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
    ...(input.pendingImageId ? {pending_image_id:input.pendingImageId} : {}),
    ...(input.featuredImageId ? {featured_image_id:input.featuredImageId} : {}),
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

async function modernPublic(db:D1Database,row:Awaited<ReturnType<typeof studioPublic>>[number]){const s=row.snapshot,images=await studioImages(db,row.id,row.revision,row.release_id),cover=images.cover;return {id:row.id,slug:row.id,title:s.title,body_text:s.body_text,published_at:row.executed_at,is_fixture:0,studioImages:images,location:s.location,starts_at:s.starts_at||0,ends_at:s.ends_at||0,timezone:s.timezone||'America/Toronto',event_state:s.event_state||'active' as const,...(cover?{featuredImage:{id:cover.assetId,assetId:cover.assetId,alt:s.coverAlt||s.title,creator:cover.creator,anonymous:false,source:cover.source,requiredCredit:cover.requiredCredit,width:cover.width,height:cover.height,cardWidth:cover.width,cardHeight:cover.height,src:cover.src,cardSrc:cover.cardSrc,available:true}}:{})};}
