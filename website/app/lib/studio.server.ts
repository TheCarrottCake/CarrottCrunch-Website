import type { StaffSession } from './staff-auth.server.ts';
import { StudioError } from './content-studio.server.ts';
import { studioDerivative } from './studio-media.server.ts';
import type { MediaEnvironment } from './media-db.server.ts';
import { normalizeMemories, validateMemoryRelease } from './about-memories-validation.server.ts';
import { assetIdValid, type StudioKind, type StudioSnapshot, type StudioDocument } from './studio-model.ts';
const roleGuard = "EXISTS(SELECT 1 FROM staff_accounts WHERE discord_user_id=? AND active=1 AND role IN('Moderator','Administrator','Owner'))";
const audit = (db: D1Database, id: string, actor: string, action: string, details: object, now: number, guard = false) => db.prepare(`INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES(?,?,'updated',${guard ? 'CASE WHEN changes()=1 THEN ? ELSE NULL END' : '?'},?)`).bind(crypto.randomUUID(), actor, JSON.stringify({ entity: 'studio', documentId: id, operation: action, ...details }), now);
export async function studioGet(db: D1Database, id: string) { const document = await db.prepare('SELECT * FROM studio_documents WHERE id=? AND deleted_at IS NULL').bind(id).first<StudioDocument>(); if (!document)
    throw new StudioError('Content not found.', 404); const row = await db.prepare('SELECT snapshot_json FROM studio_revisions WHERE document_id=? AND revision=?').bind(id, document.revision).first<{
    snapshot_json: string;
}>(); if (!row)
    throw new StudioError('Revision not found.', 404); return { document, snapshot: await revisionSnapshot(db,row.snapshot_json) }; }
export async function studioList(db: D1Database, kind = '', search = '', status = '', offset = 0) { if (search.length > 160 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
    throw new StudioError('Check search and page.'); return (await db.prepare(`SELECT * FROM studio_documents WHERE deleted_at IS NULL AND ((?='' AND kind IN('announcement','event')) OR kind=?) AND (?='' OR instr(lower(title),lower(?))>0) AND (?='' OR status=?) ORDER BY updated_at DESC,id LIMIT 25 OFFSET ?`).bind(kind, kind, search, search, status, status, offset).all<StudioDocument>()).results; }
export async function studioHistory(db: D1Database, id: string) { return (await db.prepare("SELECT r.revision,r.created_at,COALESCE(NULLIF(u.display_name,''),u.username,'Staff member') author FROM studio_revisions r LEFT JOIN site_users u ON u.discord_user_id=r.actor_id WHERE document_id=? ORDER BY revision DESC LIMIT 30").bind(id).all<{
    revision: number;
    created_at: number;
    author: string;
}>()).results; }
export function normalizeSnapshot(input: StudioSnapshot, kind: StudioKind): StudioSnapshot {
    if(!input||typeof input!=='object'||Array.isArray(input))throw new StudioError('Check the content.');
    if(kind === 'about-memories')return normalizeMemories(input);
    const s = structuredClone(input);
    delete s.scheduleInput;
    if (typeof s.title !== 'string' || s.title.length > 160 || !s.title.trim())
        throw new StudioError('Enter a title.');
    if (typeof s.body_text !== 'string' || s.body_text.length > 40000)
        throw new StudioError('Content must be at most 40,000 characters.');
    if (['announcement', 'event'].includes(kind) && !s.body_text.trim())
        throw new StudioError('Add some content.');
    if (kind === 'event' && (!Number.isSafeInteger(s.starts_at) || !Number.isSafeInteger(s.ends_at) || s.ends_at! <= s.starts_at!))
        throw new StudioError('Check the event date and end time.');
    if(s.coverId!==undefined&&typeof s.coverId!=='string'||s.coverAlt!==undefined&&(typeof s.coverAlt!=='string'||s.coverAlt.length>1000))throw new StudioError('Check the cover image description.');
    if(s.location!==undefined&&(typeof s.location!=='string'||s.location.length>300))throw new StudioError('Location must be at most 300 characters.');
    const media: {
        placement: string;
        assetId: string;
        alt: string;
    }[] = [];
    if (s.coverId) {
        if (!assetIdValid(s.coverId))
            throw new StudioError('Choose a valid cover image.');
        media.push({ placement: 'cover', assetId: s.coverId, alt: (s.coverAlt || `Image for ${s.title}`).slice(0, 1000) });
    }
    for (const match of s.body_text.matchAll(/!\[([^\]\n]{0,1000})\]\(media:([a-f0-9-]{36})\)/g)) {
        if (!assetIdValid(match[2]))
            throw new StudioError('Choose a valid embedded image.');
        media.push({ placement: `inline:${media.filter(m => m.placement.startsWith('inline:')).length}`, assetId: match[2], alt: match[1] || `Image for ${s.title}` });
    }
    if (s.items!==undefined) {
        if(!Array.isArray(s.items))throw new StudioError('Check the image entries.');
        if (s.items.length > 100)
            throw new StudioError('Use at most 100 entries.');
        const seen = new Set();
        for (const item of s.items) {
            if (!item||typeof item!=='object'||['title','description','alt','link','linkText'].some(key=>typeof item[key as keyof typeof item]!=='string')||typeof item.enabled!=='boolean'||typeof item.featured!=='boolean')throw new StudioError('Check the image entry.');
            if (!assetIdValid(item.assetId) || seen.has(item.id) || !assetIdValid(item.id) || item.title.length > 160 || item.description.length > 4000 || item.alt.length > 1000)
                throw new StudioError('Check the image entry.');
            seen.add(item.id);
            if (item.link && (!/^\/(?!\/)/.test(item.link) || /[\\\s\u0000-\u001f]/.test(item.link)))
                throw new StudioError('Slide links must point to this website.');
            media.push({ placement: item.id, assetId: item.assetId, alt: item.alt || item.title || `Image for ${s.title}` });
        }
    }
    if (media.length > 100)
        throw new StudioError('Use at most 100 images.');
    s.media = media;
    return s;
}
export async function studioSave(env: MediaEnvironment, actor: StaffSession, id: string | null, kind: StudioKind, input: StudioSnapshot, version: number, publish = false, releaseDue?: number) {
    if (!env.CONTENT_DB)
        throw new StudioError('Content storage is unavailable.', 503);
    if(!Number.isSafeInteger(version)||version<0||(!id&&version!==0))throw new StudioError('Reload the saved content before retrying.',409);
    const db = env.CONTENT_DB, now = Date.now(), snapshot = normalizeSnapshot(input, kind), current = id ? await studioGet(db, id) : null;
    if (current && (current.document.version !== version || current.document.kind !== kind))
        throw new StudioError('This content changed. Your input is preserved; compare with the latest saved version.', 409);
    if (!['announcement', 'event', 'homepage', 'gallery', 'banners', 'about-memories'].includes(kind))
        throw new StudioError('Unknown content type.');
    if (releaseDue !== undefined && (!Number.isSafeInteger(releaseDue) || releaseDue <= now))
        throw new StudioError('Choose a future publication time.');
    if(kind === 'about-memories' && (publish || releaseDue !== undefined))validateMemoryRelease(snapshot);
    for (const assetId of new Set(snapshot.media!.map(m => m.assetId))) {
        const asset = await db.prepare('SELECT id FROM media_assets WHERE id=? AND deleted_at IS NULL').bind(assetId).first();
        if (!asset)
            throw new StudioError('An image is unavailable. Remove or replace it.', 409);
        if (publish || releaseDue !== undefined)
            await studioDerivative(env, assetId,now);
    }
    const docId = id || crypto.randomUUID(), revision = (current?.document.revision || 0) + 1, releaseId = publish || releaseDue !== undefined ? crypto.randomUUID() : null, stmts: D1PreparedStatement[] = [];
    if (current)
        stmts.push(db.prepare(`UPDATE studio_documents SET title=?,revision=?,version=version+1,updated_at=?,pending_release_id=NULL,status=CASE WHEN live_release_id IS NOT NULL THEN 'published' WHEN status='unpublished' THEN 'unpublished' ELSE 'draft' END WHERE id=? AND version=? AND ${roleGuard}`).bind(snapshot.title, revision, now, docId, version, actor.discord_user_id));
    else
        stmts.push(db.prepare(`INSERT INTO studio_documents(id,kind,title,created_at,updated_at) SELECT ?,?,?,?,? WHERE ${roleGuard}`).bind(docId, kind, snapshot.title, now, now, actor.discord_user_id));
    stmts.push(audit(db, docId, actor.discord_user_id, 'save', { revision }, now, true), db.prepare('INSERT INTO studio_revisions(document_id,revision,snapshot_json,actor_id,created_at) VALUES(?,?,?,?,?)').bind(docId, revision, JSON.stringify(snapshot), actor.discord_user_id, now));
    if (releaseId)
        stmts.push(...releaseStatements(db, docId, revision, releaseId, actor.discord_user_id, now, releaseDue ?? now, publish));
    await db.batch(stmts).catch(() => { throw new StudioError('Content or media changed. Your input is preserved. Refresh the saved copy before retrying.', 409); });
    return docId;
}
function releaseStatements(db: D1Database, id: string, revision: number, releaseId: string, actor: string, now: number, due: number, execute: boolean) {
    return [
        db.prepare(`INSERT INTO studio_releases(id,document_id,revision,actor_id,created_at,due_at,executed_at) SELECT ?,?,?,?,?,?,? WHERE ${roleGuard}`).bind(releaseId, id, revision, actor, now, due, execute ? now : null, actor),
        audit(db, id, actor, execute ? 'publish' : 'schedule', { releaseId, revision, dueAt: due }, now, true),
        db.prepare(`UPDATE studio_documents SET ${execute ? 'live_release_id=?,pending_release_id=NULL,status=\'published\'' : 'pending_release_id=?,status=\'scheduled\''},version=version+1,updated_at=? WHERE id=?`).bind(releaseId, now, id)
    ];
}
export async function studioAction(env: MediaEnvironment, actor: StaffSession, id: string, version: number, intent: string, due?: number, restore?: number) {
    const db = env.CONTENT_DB;
    if (!db)
        throw new StudioError('Content storage unavailable.', 503);
    const { document: d, snapshot } = await studioGet(db, id);
    if (d.version !== version)
        throw new StudioError('This content changed. Reload the saved copy before retrying.', 409);
    if (intent === 'restore') {
        const r = await db.prepare('SELECT snapshot_json FROM studio_revisions WHERE document_id=? AND revision=?').bind(id, restore).first<{
            snapshot_json: string;
        }>();
        if (!r)
            throw new StudioError('Revision not found.', 404);
        return studioSave(env, actor, id, d.kind, await revisionSnapshot(db,r.snapshot_json), version);
    }
    if (!['publish', 'schedule', 'unpublish', 'archive', 'delete', 'cancel-schedule'].includes(intent))
        throw new StudioError('Choose an available action.');
    if (intent === 'delete' && !['Administrator', 'Owner'].includes(actor.role))
        throw new StudioError('Administrator or Owner permission required.', 403);
    const actionRoleGuard = intent === 'delete' ? roleGuard.replace("'Moderator','Administrator','Owner'", "'Administrator','Owner'") : roleGuard;
    const now = Date.now();
    if (intent === 'schedule' && (!Number.isSafeInteger(due) || due! <= now))
        throw new StudioError('Choose a future publication time.');
    if (['publish', 'schedule'].includes(intent)) {
        if(d.kind === 'about-memories')validateMemoryRelease(snapshot);
        const rows = await db.prepare('SELECT DISTINCT asset_id FROM studio_media_references WHERE document_id=? AND revision=?').bind(id, d.revision).all<{
            asset_id: string;
        }>();
        for (const row of rows.results)
            await studioDerivative(env, row.asset_id,now);
    }
    const stmts = [db.prepare(`UPDATE studio_documents SET version=version+1,updated_at=? WHERE id=? AND version=? AND ${actionRoleGuard}`).bind(now, id, version, actor.discord_user_id), audit(db, id, actor.discord_user_id, intent, { revision: d.revision }, now, true)];
    if (intent === 'publish' || intent === 'schedule')
        stmts.push(...releaseStatements(db, id, d.revision, crypto.randomUUID(), actor.discord_user_id, now, due || now, intent === 'publish'));
    else
        stmts.push(db.prepare(`UPDATE studio_documents SET status=?,pending_release_id=NULL,live_release_id=${intent === 'cancel-schedule' ? 'live_release_id' : 'NULL'},deleted_at=? WHERE id=?`).bind(intent === 'cancel-schedule' ? (d.live_release_id ? 'published' : 'draft') : intent === 'unpublish' ? 'unpublished' : 'archived', intent === 'delete' ? now : null, id));
    await db.batch(stmts).catch(() => { throw new StudioError('Content or media changed. Reload before trying again.', 409); });
    return id;
}
export async function studioSweep(env: MediaEnvironment, now = Date.now()) {
    const db = env.CONTENT_DB;
    if (!db)
        throw new Error('Content database unavailable');
    const rows = await db.prepare(`SELECT r.* FROM studio_documents d JOIN studio_releases r ON r.id=d.pending_release_id WHERE d.deleted_at IS NULL AND d.status='scheduled' AND r.due_at<=? AND ${roleGuard.replace('discord_user_id=?', 'discord_user_id=r.actor_id')} ORDER BY r.due_at,r.id LIMIT 50`).bind(now).all<{
        id: string;
        document_id: string;
        revision: number;
        actor_id: string;created_at:number;
    }>();
    let published = 0, failed = 0;
    for (const r of rows.results)
        try {
            const media = await db.prepare('SELECT DISTINCT asset_id FROM studio_media_references WHERE document_id=? AND revision=?').bind(r.document_id, r.revision).all<{
                asset_id: string;
            }>();
            for (const m of media.results)
                await studioDerivative(env, m.asset_id,r.created_at);
            const result = await db.batch([db.prepare(`UPDATE studio_documents SET live_release_id=?,pending_release_id=NULL,status='published',version=version+1,updated_at=? WHERE id=? AND pending_release_id=? AND revision=? AND deleted_at IS NULL AND ${roleGuard}`).bind(r.id, now, r.document_id, r.id, r.revision, r.actor_id), audit(db, r.document_id, r.actor_id, 'scheduled-publication', { releaseId: r.id }, now, true), db.prepare('UPDATE studio_releases SET executed_at=? WHERE id=? AND executed_at IS NULL').bind(now, r.id)]);
            published += result[0].meta.changes;
        }
        catch {
            failed++;
        }
    return { checked: rows.results.length, published, failed };
}
export async function studioPublic(db: D1Database, kind: StudioKind, limit = 100, id = '', now = Date.now()) { return Promise.all((await db.prepare(`SELECT d.id,d.kind,r.id release_id,r.revision,r.executed_at,s.snapshot_json FROM studio_documents d JOIN studio_releases r ON r.id=d.live_release_id JOIN studio_revisions s ON s.document_id=d.id AND s.revision=r.revision WHERE d.kind=? AND (?='' OR d.id=?) AND d.deleted_at IS NULL AND r.executed_at<=? ORDER BY r.executed_at DESC,d.id LIMIT ?`).bind(kind, id, id, now, Math.min(100, limit)).all<{
    id: string;
    kind: StudioKind;
    release_id: string;
    revision: number;
    executed_at: number;
    snapshot_json: string;
}>()).results.map(async row => ({ ...row, snapshot: await revisionSnapshot(db,row.snapshot_json) }))); }

async function revisionSnapshot(db:D1Database,json:string):Promise<StudioSnapshot>{
    const snapshot=JSON.parse(json) as StudioSnapshot & {featured_image_id?:string;pending_image_id?:string};
    if(snapshot.coverId&&snapshot.coverAlt===undefined){
        const imageId=snapshot.featured_image_id||snapshot.pending_image_id;
        if(imageId&&assetIdValid(imageId)){
            const table=snapshot.featured_image_id?'media_editorial_images':'media_upload_submissions';
            const row=await db.prepare(`SELECT alt_text FROM ${table} WHERE id=? AND asset_id=?`).bind(imageId,snapshot.coverId).first<{alt_text:string}>();
            if(row)snapshot.coverAlt=row.alt_text;
        }
    }
    return snapshot;
}
