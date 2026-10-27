import {getMedia,uploadMedia,MediaError,type MediaEnvironment} from './media-db.server.ts';
import type {StaffSession} from './staff-auth.server.ts';
import {decideEditorialConsent,editorialGrant,prepareEditorialImage} from './editorial-media.server.ts';
import {validFeaturedId} from './featured-image.ts';

export type PendingContentImage={id:string;assetId:string;version:number;alt:string;creator:string;source:string;src:string;width:number;height:number;evidence:string;rightsHolder:string;conditions:string;previousGrantId:string;available:boolean};
export async function pendingContentImage(db:D1Database,id:string):Promise<PendingContentImage|null>{
 if(!id||!validFeaturedId(id))return null;
 const s=await db.prepare(`SELECT s.*,a.width,a.height,a.version,a.deleted_at FROM media_upload_submissions s JOIN media_assets a ON a.id=s.asset_id WHERE s.id=?`).bind(id).first<{
  id:string;asset_id:string;asset_version:number;alt_text:string;creator_name:string;source_url:string;evidence:string;rights_holder:string;conditions:string;width:number;height:number;version:number;deleted_at:number|null
 }>();
 if(!s)return null;
 return {id:s.id,assetId:s.asset_id,version:s.asset_version,alt:s.alt_text,creator:s.creator_name,source:s.source_url,src:`/control/media/${s.asset_id}/preview`,width:s.width,height:s.height,evidence:s.evidence,rightsHolder:s.rights_holder,conditions:s.conditions,previousGrantId:(await editorialGrant(db,s.asset_id))?.id||'',available:s.deleted_at===null&&s.version===s.asset_version};
}
export async function uploadContentImage(env:MediaEnvironment,session:StaffSession,form:FormData){
 if(!env.CONTENT_DB)throw new MediaError('Media storage is unavailable.',503);
 const field=(key:string,max:number)=>{const values=form.getAll(key);if(values.length>1||values.some(v=>typeof v!=='string'))throw new MediaError('Check the image fields.');const value=String(values[0]??'').trim();if(value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new MediaError('Check the image fields.');return value;};
 const alt=field('alt',1000),kind=field('rightsKind',20),source=field('source',2048),conditions=field('conditions',2000);
 const creator=field('creator',160)||(kind==='own'?(session.display_name||session.username):'');
 if(!alt||!creator)throw new MediaError('Add alt text and the creator name.');
 if(!['own','licensed'].includes(kind))throw new MediaError('Tell us who created this image.');
 if(kind==='own'&&field('owns',10)!=='yes')throw new MediaError('Confirm that you created this image and permit CarrottCrunch to use it.');
 const evidence=kind==='own'?`Creator declaration by ${creator}: I created this image and permit CarrottCrunch to use it in announcements, events, cards and same-site homepage teasers.`:field('evidence',2000);
 if(!evidence)throw new MediaError('Describe the creator permission or licence that allows this use.');
 const files=form.getAll('image');if(files.length!==1||typeof files[0]==='string')throw new MediaError('Choose one image.');
 // User-facing defaults are derived from the submitted file and explicit creator statement.
 const upload=new FormData();upload.set('image',files[0]);upload.set('title',files[0].name.replace(/\.[^.]+$/,'').slice(0,160)||'Content image');
 upload.set('alt_text',alt);upload.set('creator_name',creator);upload.set('source_url',source);upload.set('provenance',evidence);
 const assetId=await uploadMedia(env,session,upload),{asset}=await getMedia(env.CONTENT_DB,assetId),id=crypto.randomUUID(),now=Date.now();
 await env.CONTENT_DB.batch([
  env.CONTENT_DB.prepare('INSERT INTO media_upload_submissions(id,asset_id,asset_version,alt_text,creator_name,source_url,rights_kind,rights_holder,evidence,conditions,submitted_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,assetId,asset.version,alt,creator,source,kind,creator,evidence,conditions,session.discord_user_id,now),
  env.CONTENT_DB.prepare("INSERT INTO audit_records(id,actor_id,action,details_json,created_at) VALUES(?,?,'created',?,?)").bind(crypto.randomUUID(),session.discord_user_id,JSON.stringify({entity:'media',operation:'content-upload-submission',submissionId:id,assetId}),now),
 ]);
 return pendingContentImage(env.CONTENT_DB,id);
}
export async function authorizeContentImage(env:MediaEnvironment,session:StaffSession,id:string,previous:string){
 if(!['Administrator','Owner'].includes(session.role))throw new MediaError('Administrator or Owner permission is required.',403);
 if(!env.CONTENT_DB)throw new MediaError('Media storage is unavailable.',503);
 const pending=await pendingContentImage(env.CONTENT_DB,id);
 if(!pending||!pending.available)throw new MediaError('This upload changed or is unavailable. Replace or remove it.',409);
 if(pending.conditions.trim())throw new MediaError('Resolve the creator conditions before authorizing this image. Replace the upload with corrected permission evidence.',409);
 if(pending.previousGrantId!==previous)throw new MediaError('Image permission changed. Refresh the image review before continuing.',409);
 const f=new FormData();for(const [key,value] of Object.entries({editorial_previous:previous,editorial_status:'approved',editorial_holder:pending.rightsHolder,editorial_evidence:pending.evidence,editorial_conditions:'',editorial_expiry:''}))f.set(key,value);
 const grant=await decideEditorialConsent(env.CONTENT_DB,pending.assetId,session.discord_user_id,f);
 const image=await prepareEditorialImage(env,pending.assetId,pending.version,grant,session.discord_user_id,Date.now(),pending.id);
 return image;
}
