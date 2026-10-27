import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authorizeMedia, mediaHeaders, mediaFailure, uploadForm, metadataForm } from '../lib/media-access.server';
import { uploadMedia, MediaError } from '../lib/media-db.server';
import { resolveEventTime, EVENT_TIMEZONE } from '../lib/event-time';
import type { Route } from './+types/studio-media';
export async function loader({ request, context }: Route.LoaderArgs) {
    try {
        const env = context.get(contentEnvironmentContext);
        await authorizeMedia(request, env, false, import.meta.env.DEV);
        const q = new URL(request.url).searchParams, search = q.get('q') || '', offset = Number(q.get('offset') || 0), type = q.get('type') || '', trash = q.get('trash') === '1';
        if (q.has('id'))
            return Response.json({ uses: (await env.CONTENT_DB!.prepare('SELECT DISTINCT d.id document_id,d.title,d.kind FROM studio_active_media m JOIN studio_documents d ON d.id=m.document_id WHERE m.asset_id=?').bind(q.get('id')).all()).results }, { headers: mediaHeaders });
        if (search.length > 160 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000 || !['', 'image/png', 'image/jpeg', 'image/webp'].includes(type))
            throw new MediaError('Check the search or page.');
        const rows = await env.CONTENT_DB!.prepare(`SELECT a.id,a.title,a.original_filename,a.description,a.tags,a.internal_notes,a.alt_text,a.version,a.mime_type,a.width,a.height,a.deleted_at,a.required_credit,a.publication_blocked,a.rights_expires_at,t.creator_name,t.source_url,(SELECT count(*) FROM studio_active_media r WHERE r.asset_id=a.id)+(SELECT count(*) FROM media_usage_references r WHERE r.asset_id=a.id) usage_count FROM media_assets a JOIN media_attribution t ON t.asset_id=a.id WHERE a.deleted_at IS ${trash ? 'NOT ' : ''}NULL AND (?='' OR a.mime_type=?) AND (?='' OR instr(lower(a.title||' '||a.original_filename||' '||a.description||' '||a.tags||' '||t.creator_name),lower(?))>0) ORDER BY ${q.get('sort') === 'name' ? 'a.title,a.id' : 'a.created_at DESC,a.id'} LIMIT 25 OFFSET ?`).bind(type, type, search, search, offset).all();
        return Response.json({ items: rows.results.slice(0, 24), more: rows.results.length > 24, offset }, { headers: mediaHeaders });
    }
    catch (e) {
        const f = mediaFailure(e);
        return Response.json({ message: await f.text() }, { status: f.status, headers: mediaHeaders });
    }
}
export async function action({ request, context }: Route.ActionArgs) {
    try {
        const env = context.get(contentEnvironmentContext), session = await authorizeMedia(request, env, true, import.meta.env.DEV);
        if (request.method !== 'POST')
            throw new MediaError('Method not allowed.', 405);
        if (request.headers.get('Content-Type')?.startsWith('multipart/form-data;')) {
            const form = await uploadForm(request), files = form.getAll('image');
            if (!files.length || files.length > 10 || files.some(f => typeof f === 'string'))
                throw new MediaError('Choose 1–10 images, at most 20 MB total.');
            const assets = [], errors = [];
            for (const file of files as File[])
                try {
                    const f = new FormData();
                    f.set('image', file);
                    f.set('title', file.name.replace(/[\u0000-\u001f]/g, '').slice(0, 160) || 'Image');
                    const id = await uploadMedia(env, session, f);
                    const asset=await env.CONTENT_DB!.prepare("SELECT id,title,width,height,alt_text,required_credit FROM media_assets WHERE id=?").bind(id).first();if(asset)assets.push({...asset,creator_name:'',source_url:''});
                }
                catch (e) {
                    errors.push(`${file.name}: ${e instanceof MediaError ? e.message : 'Upload failed.'}`);
                }
            return Response.json({ assets, errors }, { status: assets.length ? 200 : 400, headers: mediaHeaders });
        }
        const f = await metadataForm(request), db = env.CONTENT_DB!, id = String(f.get('id') || ''), version = Number(f.get('version')), intent = String(f.get('intent'));
        if (!Number.isSafeInteger(version) || f.getAll('id').length !== 1 || f.getAll('version').length !== 1)
            throw new MediaError('Reload the image.', 409);
        if (intent === 'trash' || intent === 'restore') {
            const { trashMedia } = await import('../lib/media-db.server');
            await trashMedia(db, id, session.discord_user_id, intent === 'restore', version);
            return Response.json({ message: intent === 'trash' ? 'Image moved to recoverable trash.' : 'Image restored.' }, { headers: mediaHeaders });
        }
        if (intent !== 'metadata')
            throw new MediaError('Choose an available action.');
        const field = (k: string, n: number) => { if (f.getAll(k).length > 1)
            throw new MediaError('Supply each metadata field once.'); const v = String(f.get(k) || '').trim(); if (v.length > n)
            throw new MediaError(`Check ${k}.`); return v; };
        const source = field('source', 2048);
        if (source) {
            let url:URL;try{url=new URL(source);}catch{throw new MediaError('Source must be an HTTPS URL.');}
            if (url.protocol !== 'https:' || url.username || url.password)
                throw new MediaError('Source must be an HTTPS URL.');
        }
        const expiry = field('rightsExpiry', 10);
        let expiresAt: number | null = null;
        if (expiry) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry))
                throw new MediaError('Choose a valid licence expiry date.');
            try {
                expiresAt = resolveEventTime(expiry + 'T00:00', EVENT_TIMEZONE, '');
            }
            catch {
                throw new MediaError('Choose a valid licence expiry date.');
            }
        }
        const before=await db.prepare('SELECT a.title,a.description,a.tags,a.internal_notes,a.alt_text,a.required_credit,a.publication_blocked,a.rights_expires_at,t.creator_name,t.source_url FROM media_assets a JOIN media_attribution t ON t.asset_id=a.id WHERE a.id=?').bind(id).first();
        const after={title:field('title',160),description:field('description',4000),tags:field('tags',1000),notes:field('notes',4000),alt:field('alt',1000),creator:field('creator',160),requiredCredit:field('requiredCredit',1000),source,blocked:f.get('blocked')==='1',rightsExpiry:f.has('rightsExpiry')?expiresAt:before?.rights_expires_at};
        await db.batch([db.prepare(`UPDATE media_assets SET title=CASE WHEN ?='' THEN original_filename ELSE ? END,description=?,tags=?,internal_notes=?,alt_text=?,required_credit=?,publication_blocked=?,rights_expires_at=CASE WHEN ? THEN ? ELSE rights_expires_at END,version=version+1,updated_at=? WHERE id=? AND version=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM staff_accounts WHERE discord_user_id=? AND active=1 AND role IN('Moderator','Administrator','Owner'))`).bind(field('title', 160), field('title', 160), field('description', 4000), field('tags', 1000), field('notes', 4000), field('alt', 1000), field('requiredCredit', 1000), f.get('blocked') === '1' ? 1 : 0, f.has('rightsExpiry') ? 1 : 0, expiresAt, Date.now(), id, version, session.discord_user_id),
            db.prepare("INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES(?,?,'updated',CASE WHEN changes()=1 THEN ? ELSE NULL END,?)").bind(crypto.randomUUID(), session.discord_user_id, JSON.stringify({ entity: 'media', operation: 'metadata-v2', assetId: id,version,before,after }), Date.now()), db.prepare('UPDATE media_attribution SET creator_name=?,source_url=?,anonymous=0 WHERE asset_id=?').bind(field('creator', 160), source, id)]).catch(() => { throw new MediaError('Image changed. Your metadata is preserved; reload the latest copy before retrying.', 409); });
        return Response.json({ message: 'Metadata saved.' }, { headers: mediaHeaders });
    }
    catch (e) {
        const f = mediaFailure(e);
        return Response.json({ message: await f.text() }, { status: f.status, headers: mediaHeaders });
    }
}
