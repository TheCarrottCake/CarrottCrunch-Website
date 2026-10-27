import { MediaError, getMedia, validAssetId, type MediaEnvironment } from './media-db.server.ts';
import type { FeaturedImage } from './featured-image.ts';
import { StudioError } from './content-studio.server.ts';

export type EditorialGrant = { id:string;asset_id:string;status:string;rights_holder:string;evidence:string;conditions:string;expires_at:number|null;created_at:number };
export async function editorialGrant(db:D1Database,assetId:string) {
 return db.prepare('SELECT g.* FROM media_editorial_current c JOIN media_editorial_grants g ON g.id=c.grant_id WHERE c.asset_id=?').bind(assetId).first<EditorialGrant>();
}
export async function decideEditorialConsent(db:D1Database,assetId:string,actorId:string,form:FormData,now=Date.now()) {
 if(!await db.prepare("SELECT 1 FROM staff_accounts WHERE discord_user_id=? AND active=1 AND role IN('Administrator','Owner')").bind(actorId).first())throw new MediaError('Administrator or Owner authorization is required.',403);
 const value=(key:string,max:number)=>{const v=form.get(key);if(form.getAll(key).length>1||typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new MediaError('Check the editorial permission fields.');return v.trim();};
 const status=value('editorial_status',20),previous=value('editorial_previous',36),holder=value('editorial_holder',160),evidence=value('editorial_evidence',2000),conditions=value('editorial_conditions',2000),date=value('editorial_expiry',10);
 if(!validAssetId(assetId)||!['approved','revoked','pending','rejected'].includes(status))throw new MediaError('Choose a valid editorial permission.');
 const expiry=date?Date.parse(`${date}T00:00:00Z`):null;
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isSafeInteger(expiry)||expiry!<=now||new Date(expiry!).toISOString().slice(0,10)!==date))throw new MediaError('Choose a future permission expiry date.');
 if(status==='approved'&&(!holder||!evidence||conditions))throw new MediaError('Approval requires creator/licensing evidence and a rights holder. Resolve all conditions first.');
 const current=await editorialGrant(db,assetId);
 // Re-saving an identical decision must not unexpectedly suppress live images.
 if(current?.id===previous&&current.status===status&&current.rights_holder===holder&&current.evidence===evidence&&current.conditions===conditions&&current.expires_at===expiry)return current.id;
 const id=crypto.randomUUID();
 await db.batch([
  db.prepare('INSERT INTO media_editorial_grants(id,asset_id,previous_id,status,rights_holder,evidence,conditions,expires_at,actor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,assetId,previous||null,status,holder,evidence,conditions,expiry,actorId,now),
  db.prepare("INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES(?,?,'state_changed',?,?)").bind(crypto.randomUUID(),actorId,JSON.stringify({entity:'media',assetId,operation:'editorial-consent',grantId:id,previous:previous||null,status}),now),
 ]).catch(()=>{throw new MediaError('Editorial permission changed or Administrator/Owner authorization is required. Reload before trying again.',409);});
 return id;
}
export function editorialReadiness(asset:{deleted_at:number|null;alt_text:string;provenance:string;anonymous:number;creator_name:string},grant:EditorialGrant|null,now=Date.now()) {
 const reasons:string[]=[];
 if(asset.deleted_at!==null)reasons.push('Image is in trash.');
 if(!asset.alt_text.trim())reasons.push('Meaningful alt text is required.');
 if(!asset.provenance.trim()||(!asset.anonymous&&!asset.creator_name.trim()))reasons.push('Creator attribution or provenance is incomplete.');
 if(!grant||grant.status!=='approved'||!grant.rights_holder.trim()||!grant.evidence.trim()||grant.conditions.trim())reasons.push('Verified editorial-use approval is required.');
 if(grant?.expires_at!=null&&grant.expires_at<=now)reasons.push('Editorial permission has expired.');
 return {eligible:!reasons.length,reasons};
}
const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
/** R2 preparation precedes D1. Failed/racing preparations remain private, never public. */
export async function prepareEditorialImage(env:MediaEnvironment,assetId:string,version:number,grantId:string,actorId:string,now=Date.now(),submissionId?:string) {
 if(!env.CONTENT_DB||!env.MEDIA_BUCKET)throw new MediaError('Media storage is unavailable.',503);
 const db=env.CONTENT_DB,bucket=env.MEDIA_BUCKET,{asset}=await getMedia(db,assetId),grant=await editorialGrant(db,assetId);
 const readiness=editorialReadiness(asset,grant,now);
 if(!readiness.eligible)throw new MediaError(readiness.reasons.join(' '),409);
 if(asset.version!==version||grant?.id!==grantId)throw new MediaError('The selected image changed. Refresh the picker.',409);
 const row=await db.prepare('SELECT sha256,original_key FROM media_assets WHERE id=?').bind(assetId).first<{sha256:string;original_key:string}>();
 if(!row)throw new MediaError('Image is unavailable.',404);
 let derivative=await db.prepare('SELECT id FROM media_editorial_derivatives WHERE asset_id=? AND source_sha=?').bind(assetId,row.sha256).first<{id:string}>();
 if(!derivative){
  const object=await bucket.get(row.original_key);if(!object)throw new MediaError('Image bytes are unavailable.',409);
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(await digest(bytes)!==row.sha256)throw new MediaError('Image integrity check failed.',409);
  const {PhotonImage,resize,SamplingFilter}=await import('@cf-wasm/photon');
  const image=PhotonImage.new_from_byteslice(bytes),id=crypto.randomUUID();
  const variants:{bytes:Uint8Array;width:number;height:number}[]=[];
  try{for(const limit of [480,1280]){
   const ratio=Math.min(1,limit/Math.max(image.get_width(),image.get_height()));
   const width=Math.max(1,Math.round(image.get_width()*ratio)),height=Math.max(1,Math.round(image.get_height()*ratio));
   const output=resize(image,width,height,SamplingFilter.Triangle);
   try{const encoded=output.get_bytes();if(encoded.length>8*1024*1024)throw new MediaError('Prepared image is too large.',413);variants.push({bytes:encoded,width,height});}finally{output.free();}
  }}finally{image.free();}
  const [card,detail]=variants,cardKey=`private/editorial/${id}/card.png`,detailKey=`private/editorial/${id}/detail.png`;
  await bucket.put(cardKey,card.bytes,{httpMetadata:{contentType:'image/png'}});
  await bucket.put(detailKey,detail.bytes,{httpMetadata:{contentType:'image/png'}});
  // Never compensate by deleting a derivative another accepted presentation could use.
  await db.prepare('INSERT INTO media_editorial_derivatives(id,asset_id,source_sha,card_key,detail_key,card_sha,detail_sha,card_width,card_height,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
   .bind(id,assetId,row.sha256,cardKey,detailKey,await digest(card.bytes),await digest(detail.bytes),card.width,card.height,detail.width,detail.height,now).run().catch(async()=>{
    if(!await db.prepare('SELECT id FROM media_editorial_derivatives WHERE asset_id=? AND source_sha=?').bind(assetId,row.sha256).first())throw new MediaError('Image preparation changed. Try again.',409);
   });
  derivative=await db.prepare('SELECT id FROM media_editorial_derivatives WHERE asset_id=? AND source_sha=?').bind(assetId,row.sha256).first<{id:string}>();
 }
 if(!derivative)throw new MediaError('Prepared image is unavailable.',409);
 const objects=await db.prepare('SELECT card_key,detail_key FROM media_editorial_derivatives WHERE id=?').bind(derivative.id).first<{card_key:string;detail_key:string}>();
 if(!objects||!await bucket.head(objects.card_key)||!await bucket.head(objects.detail_key))throw new MediaError('Prepared image bytes are unavailable.',409);
 const id=crypto.randomUUID();
 await db.batch([
  db.prepare('INSERT INTO media_editorial_images(id,asset_id,grant_id,derivative_id,asset_version,alt_text,creator_name,anonymous,source_url,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,assetId,grantId,derivative.id,version,asset.alt_text,asset.creator_name,asset.anonymous,asset.source_url,now),
  db.prepare("INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES(?,?,'created',?,?)").bind(crypto.randomUUID(),actorId,JSON.stringify({entity:'media',operation:'editorial-preparation',assetId,imageId:id,grantId,submissionId}),now),
 ]).catch(()=>{throw new MediaError('Image metadata or consent changed. Refresh the picker.',409);});
 return privateFeaturedImage(db,id,now);
}
type ImageRow={id:string;asset_id:string;alt_text:string;creator_name:string;anonymous:number;source_url:string;width:number;height:number;card_width:number;card_height:number};
function presentation(row:ImageRow,src:string,cardSrc:string,available:boolean):FeaturedImage {
 return {id:row.id,assetId:row.asset_id,alt:row.alt_text,creator:row.anonymous?'':row.creator_name,anonymous:!!row.anonymous,source:row.source_url,width:row.width,height:row.height,cardWidth:row.card_width,cardHeight:row.card_height,src,cardSrc,available};
}
export async function privateFeaturedImage(db:D1Database,id:string|null|undefined,now=Date.now()):Promise<FeaturedImage|null> {
 if(!id||!validAssetId(id))return null;
 const row=await db.prepare('SELECT i.*,d.width,d.height,d.card_width,d.card_height FROM media_editorial_images i JOIN media_editorial_derivatives d ON d.id=i.derivative_id WHERE i.id=?').bind(id).first<ImageRow>();
 if(!row)return null;
 const ready=await db.prepare('SELECT id FROM editorial_media_ready WHERE id=? AND (expires_at IS NULL OR expires_at>?)').bind(id,now).first();
 return presentation(row,`/control/media/${row.asset_id}/preview`,`/control/media/${row.asset_id}/preview`,!!ready);
}
export async function assertRevisionMedia(db:D1Database,bucket:R2Bucket|undefined,id:string,revision:number,now=Date.now(),dueAt=now,allowPending=false) {
 const pending=await db.prepare('SELECT s.asset_version,a.version,a.deleted_at FROM content_revision_uploads u JOIN media_upload_submissions s ON s.id=u.submission_id JOIN media_assets a ON a.id=s.asset_id WHERE u.content_id=? AND u.revision=?').bind(id,revision).first<{asset_version:number;version:number;deleted_at:number|null}>();
 if(pending&&(!allowPending||pending.deleted_at!==null||pending.asset_version!==pending.version))throw new StudioError('Review and authorize the uploaded image in the editor, then save a new revision before approving or publishing.',409);
 const media=await db.prepare('SELECT image_id FROM content_revision_media WHERE content_id=? AND revision=?').bind(id,revision).first<{image_id:string}>();
 if(!media)return;
 const ready=await db.prepare('SELECT card_key,detail_key,card_sha,detail_sha FROM editorial_media_ready WHERE id=? AND (expires_at IS NULL OR expires_at>?)').bind(media.image_id,Math.max(now,dueAt)).first<{card_key:string;detail_key:string;card_sha:string;detail_sha:string}>();
 const fail=()=>new StudioError('Featured image unavailable or editorial permission expired. Remove or replace it in a new working revision.',409);
 if(!ready||!bucket)throw fail();
 for(const [key,sha] of [[ready.card_key,ready.card_sha],[ready.detail_key,ready.detail_sha]]){
  const object=await bucket.get(key);if(!object)throw fail();
  if(await digest(new Uint8Array(await object.arrayBuffer()))!==sha)throw fail();
 }
}
export async function publicFeaturedImages(db:D1Database,contentIds:string[],now=Date.now()):Promise<Map<string,FeaturedImage>> {
 if(!contentIds.length)return new Map();
 const rows=await db.prepare(`SELECT i.*,w.live_release_id,w.content_id FROM content_workflows w JOIN content_items c ON c.id=w.content_id AND c.is_fixture=0
 JOIN content_releases l ON l.id=w.live_release_id AND l.content_id=w.content_id
 JOIN content_reviews a ON a.id=l.approval_id AND a.content_id=l.content_id AND a.revision=l.revision AND a.action='approved'
 JOIN content_revision_media m ON m.content_id=l.content_id AND m.revision=l.revision
 JOIN editorial_media_ready i ON i.id=m.image_id WHERE w.content_id IN(${contentIds.map(()=>'?').join(',')}) AND w.live_at<=? AND (i.expires_at IS NULL OR i.expires_at>?)`).bind(...contentIds,now,now).all<ImageRow&{live_release_id:string;content_id:string}>();
 return new Map(rows.results.map(row=>{const base=`/media/releases/${row.live_release_id}/${row.id}`;return [row.content_id,presentation(row,`${base}/detail`,`${base}/card`,true)];}));
}
export async function publicFeaturedImage(db:D1Database,contentId:string,now=Date.now()):Promise<FeaturedImage|null> {
 return (await publicFeaturedImages(db,[contentId],now)).get(contentId)??null;
}
export async function deliverEditorialImage(request:Request,env:MediaEnvironment,releaseId:string,imageId:string,variant:string,now=Date.now()) {
 const headers={'Cache-Control':'no-store','Content-Type':'image/png','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'};
 const missing=()=>new Response(null,{status:404,headers});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(new URL(request.url).search||!validAssetId(releaseId)||!validAssetId(imageId)||!['card','detail'].includes(variant)||!env.CONTENT_DB||!env.MEDIA_BUCKET)return missing();
 const row=await env.CONTENT_DB.prepare(`SELECT i.* FROM content_workflows w JOIN content_items c ON c.id=w.content_id AND c.is_fixture=0
 JOIN content_releases l ON l.id=w.live_release_id AND l.content_id=w.content_id
 JOIN content_reviews a ON a.id=l.approval_id AND a.content_id=l.content_id AND a.revision=l.revision AND a.action='approved'
 JOIN content_revision_media m ON m.content_id=l.content_id AND m.revision=l.revision
 JOIN editorial_media_ready i ON i.id=m.image_id WHERE l.id=? AND i.id=? AND w.live_at<=? AND (i.expires_at IS NULL OR i.expires_at>?)`).bind(releaseId,imageId,now,now).first<{card_key:string;detail_key:string;card_sha:string;detail_sha:string}>();
 if(!row)return missing();
 const key=variant==='card'?row.card_key:row.detail_key;
 const object=await env.MEDIA_BUCKET.get(key);if(!object)return missing();
 // Verify encoded bytes too: a missing/replaced R2 object never substitutes unapproved bytes.
 const bytes=new Uint8Array(await object.arrayBuffer());if(await digest(bytes)!==(variant==='card'?row.card_sha:row.detail_sha))return missing();
 // Recheck consent/live identity after the nontransactional R2 read.
 const current=await env.CONTENT_DB.prepare(`SELECT 1 FROM content_workflows w JOIN content_releases l ON l.id=w.live_release_id
 JOIN content_revision_media m ON m.content_id=l.content_id AND m.revision=l.revision JOIN editorial_media_ready i ON i.id=m.image_id
 WHERE l.id=? AND i.id=? AND (i.expires_at IS NULL OR i.expires_at>?)`).bind(releaseId,imageId,Math.max(now,Date.now())).first();
 return current?new Response(request.method==='HEAD'?null:bytes,{headers}):missing();
}
