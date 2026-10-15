import type { AuthEnvironment, StaffSession } from './staff-auth.server.ts';
import { MediaError, validateAndPreview } from './media-image.server.ts';
export { MediaError } from './media-image.server.ts';
export type MediaEnvironment = AuthEnvironment & { MEDIA_BUCKET?: R2Bucket };
export type MediaAsset = {
  id: string; mime_type: string; byte_size: number; width: number; height: number;
  title: string; description: string; alt_text: string; original_filename: string; uploaded_by: string;
  created_at: number; updated_at: number; version: number; deleted_at: number | null; recover_until: number | null;
  anonymous: number; creator_name: string; source_url: string; provenance: string; usage_count: number;
};
export const purposes = ['gallery', 'homepage', 'external'] as const;
export type MediaPurpose = typeof purposes[number];
export type MediaPermission = {
  purpose: MediaPurpose; status: 'pending' | 'approved' | 'rejected' | 'revoked';
  rights_holder: string; evidence: string; conditions: string; reviewed_by: string | null; reviewed_at: number | null; expires_at: number | null;
};
export function requireMediaStorage(env: MediaEnvironment) {
  if (!env.CONTENT_DB || !env.MEDIA_BUCKET) throw new MediaError('Media storage is not configured. Contact the community Owner.', 503);
  return { db: env.CONTENT_DB, bucket: env.MEDIA_BUCKET };
}
const selection = `SELECT a.id,a.mime_type,a.byte_size,a.width,a.height,a.title,a.description,a.alt_text,a.original_filename,a.uploaded_by,
 a.created_at,a.updated_at,a.version,a.deleted_at,a.recover_until,t.anonymous,t.creator_name,t.source_url,t.provenance,
 (SELECT count(*) FROM media_usage_references r WHERE r.asset_id=a.id) AS usage_count
 FROM media_assets a JOIN media_attribution t ON t.asset_id=a.id`;
export function validAssetId(id: string) { return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id); }
export async function listMedia(db: D1Database, search = '', trash = false, offset = 0, mime = '') {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new MediaError('Invalid page.');
  if (!['','image/jpeg','image/png','image/webp'].includes(mime)) throw new MediaError('Invalid image type filter.');
  const query = search.trim().slice(0, 160).replace(/[\\%_]/g, '\\$&');
  return (await db.prepare(`${selection} WHERE a.deleted_at IS ${trash ? 'NOT ' : ''}NULL
    AND (?='' OR a.mime_type=?) AND (a.title LIKE ? ESCAPE '\\' OR a.original_filename LIKE ? ESCAPE '\\') ORDER BY a.created_at DESC,a.id LIMIT 49 OFFSET ?`)
    .bind(mime, mime, `%${query}%`, `%${query}%`, offset).all<MediaAsset>()).results;
}
export async function getMedia(db: D1Database, id: string) {
  if (!validAssetId(id)) throw new MediaError('Image not found.', 404);
  const asset = await db.prepare(`${selection} WHERE a.id=?`).bind(id).first<MediaAsset>();
  if (!asset) throw new MediaError('Image not found.', 404);
  const permissions = (await db.prepare(`SELECT purpose,status,rights_holder,evidence,conditions,reviewed_by,reviewed_at,expires_at FROM media_permissions WHERE asset_id=? ORDER BY purpose`).bind(id).all<MediaPermission>()).results;
  const references = (await db.prepare('SELECT purpose,reference_label FROM media_usage_references WHERE asset_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all<{ purpose: MediaPurpose; reference_label: string }>()).results;
  return { asset, permissions, references };
}
function field(form: FormData, name: string, max: number, required = false) {
  const values = form.getAll(name);
  if (values.length > 1 || (values.length && typeof values[0] !== 'string')) throw new MediaError(`Invalid ${name}.`);
  const value = String(values[0] ?? '').trim();
  if ((required && !value) || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new MediaError(`Check ${name} (maximum ${max} characters).`);
  return value;
}
export function mediaMetadata(form: FormData) {
  const source = field(form, 'source_url', 2048);
  if (source) {
    try { const url = new URL(source); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); }
    catch { throw new MediaError('Source must be a complete HTTPS URL without credentials.'); }
  }
  return { title: field(form, 'title', 160, true), description: field(form, 'description', 4000), alt_text: field(form, 'alt_text', 1000),
    anonymous: field(form, 'anonymous', 3) === 'on' ? 1 : 0, creator_name: field(form, 'creator_name', 160), source_url: source, provenance: field(form, 'provenance', 4000) };
}
function permissionInput(form: FormData, purpose: MediaPurpose, actor: string, now: number): MediaPermission {
  const status = field(form, `${purpose}_status`, 20) || 'pending';
  if (!['pending','approved','rejected','revoked'].includes(status)) throw new MediaError('Invalid permission state.');
  const holder = field(form, `${purpose}_rights_holder`, 160), evidence = field(form, `${purpose}_evidence`, 2000);
  const conditions = field(form, `${purpose}_conditions`, 2000), expiry = field(form, `${purpose}_expires_at`, 30);
  const expires = expiry ? Date.parse(`${expiry}T00:00:00Z`) : null;
  if (expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || !Number.isSafeInteger(expires) || expires! <= now || new Date(expires!).toISOString().slice(0,10) !== expiry)) throw new MediaError('Permission expiry must be a future UTC date.');
  if (status === 'approved' && (!holder || !evidence)) throw new MediaError('Approval requires a rights holder and verifiable permission evidence.');
  return { purpose, status: status as MediaPermission['status'], rights_holder: holder, evidence, conditions, reviewed_by: actor, reviewed_at: now, expires_at: expires };
}
function audit(db: D1Database, id: string, actor: string, operation: string, now: number, details: object = {}) {
  return db.prepare('INSERT INTO audit_records(id,content_id,actor_id,action,details_json,created_at) VALUES (?,NULL,?,?,?,?)')
    .bind(crypto.randomUUID(), actor, operation === 'uploaded' ? 'created' : operation === 'metadata' ? 'updated' : 'state_changed', JSON.stringify({ entity: 'media', assetId: id, operation, ...details }), now);
}
export async function uploadMedia(env: MediaEnvironment, session: StaffSession, form: FormData, now = Date.now()) {
  const { db, bucket } = requireMediaStorage(env);
  const metadata = mediaMetadata(form), files = form.getAll('image');
  if (files.length !== 1 || typeof files[0] === 'string') throw new MediaError('Choose one image.');
  const file = files[0];
  if (file.size > 20 * 1024 * 1024) throw new MediaError('Each image must be at most 20 MB.', 413);
  const bytes = new Uint8Array(await file.arrayBuffer()), decoded = await validateAndPreview(bytes);
  const id = crypto.randomUUID(), originalKey = `private/${id}/original`, previewKey = `private/${id}/preview.png`;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const sha = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  const filename = file.name.split(/[\\/]/).at(-1)!.replace(/[\u0000-\u001f\u007f]/g, '').slice(0,255) || 'image';
  try {
    await bucket.put(originalKey, bytes, { httpMetadata: { contentType: 'application/octet-stream' } });
    await bucket.put(previewKey, decoded.preview, { httpMetadata: { contentType: 'image/png' } });
    await db.batch([
      db.prepare(`INSERT INTO media_assets(id,original_key,preview_key,mime_type,byte_size,sha256,width,height,title,description,alt_text,original_filename,uploaded_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, originalKey, previewKey, decoded.mime, bytes.length, sha, decoded.width, decoded.height, metadata.title, metadata.description, metadata.alt_text, filename, session.discord_user_id, now, now),
      db.prepare('INSERT INTO media_attribution(asset_id,anonymous,creator_name,source_url,provenance) VALUES (?,?,?,?,?)').bind(id, metadata.anonymous, metadata.creator_name, metadata.source_url, metadata.provenance),
      ...purposes.map(purpose => db.prepare('INSERT INTO media_permissions(asset_id,purpose) VALUES (?,?)').bind(id,purpose)),
      audit(db,id,session.discord_user_id,'uploaded',now),
    ]);
  } catch {
    // Compensate only this failed upload, never delete an accepted asset.
    await Promise.allSettled([bucket.delete(originalKey), bucket.delete(previewKey)]);
    throw new MediaError('The image could not be saved. Please try again.', 503);
  }
  return id;
}
export async function updateMedia(db: D1Database, id: string, actor: string, form: FormData, now = Date.now()) {
  const { asset, permissions } = await getMedia(db,id), version = Number(field(form,'version',12,true));
  if (asset.deleted_at !== null) throw new MediaError('Restore this image before editing.',409);
  if (version !== asset.version) throw new MediaError('This image changed. Reload before editing.',409);
  const metadata = mediaMetadata(form), next = purposes.map(purpose => permissionInput(form,purpose,actor,now));
  // A failing optimistic lock rolls back attribution, permissions and audit together.
  await db.batch([
    ...next.map(permission => db.prepare(`UPDATE media_permissions SET status=?,rights_holder=?,evidence=?,conditions=?,reviewed_by=?,reviewed_at=?,expires_at=? WHERE asset_id=? AND purpose=?`)
      .bind(permission.status,permission.rights_holder,permission.evidence,permission.conditions,actor,now,permission.expires_at,id,permission.purpose)),
    db.prepare('UPDATE media_attribution SET anonymous=?,creator_name=?,source_url=?,provenance=? WHERE asset_id=?').bind(metadata.anonymous,metadata.creator_name,metadata.source_url,metadata.provenance,id),
    db.prepare(`UPDATE media_assets SET title=?,description=?,alt_text=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND deleted_at IS NULL`)
      .bind(metadata.title,metadata.description,metadata.alt_text,now,id,version),
    // changes() immediately after the asset UPDATE ensures concurrent edits cannot silently succeed.
    db.prepare(`INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES (?,?,'updated',CASE WHEN changes()=1 THEN ? ELSE NULL END,?)`)
      .bind(crypto.randomUUID(),actor,JSON.stringify({entity:'media',assetId:id,operation:'metadata',before:{metadata:asset,permissions},after:{metadata,permissions:next}}),now),
  ]).catch(() => { throw new MediaError('The image changed or could not be saved. Reload and try again.',409); });
}
export async function trashMedia(db: D1Database, id: string, actor: string, restore: boolean, version: number, now = Date.now()) {
  const { asset } = await getMedia(db,id);
  if (version !== asset.version) throw new MediaError('The image changed. Reload before continuing.',409);
  if (!restore && asset.usage_count) throw new MediaError('This image is referenced by content. Remove its references before moving it to trash.',409);
  if (restore && (asset.deleted_at === null || asset.recover_until! < now)) throw new MediaError('The 30-day recovery period is unavailable or has expired.',409);
  if (!restore && asset.deleted_at !== null) throw new MediaError('This image is already in trash.',409);
  await db.batch([
    db.prepare(`UPDATE media_assets SET deleted_at=?,deleted_by=?,recover_until=?,updated_at=?,version=version+1
      WHERE id=? AND version=? AND ${restore ? 'deleted_at IS NOT NULL AND recover_until>=?' : 'deleted_at IS NULL'}`)
      .bind(...[restore?null:now,restore?null:actor,restore?null:now+2592000000,now,id,version,...(restore?[now]:[])]),
    db.prepare(`INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES (?,?,'state_changed',CASE WHEN changes()=1 THEN ? ELSE NULL END,?)`)
      .bind(crypto.randomUUID(),actor,JSON.stringify({entity:'media',assetId:id,operation:restore?'restored':'trashed'}),now),
  ]).catch(() => { throw new MediaError('The image changed or is referenced. Reload before continuing.',409); });
}
export { publicationEligibility } from './media-permissions.ts';
