import {editorialGrant,decideEditorialConsent} from '../lib/editorial-media.server';
import {EditorialPermission} from '../components/editorial-permission';
import { data, Form, Link } from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;actionData?:LegacyData<Awaited<ReturnType<typeof action>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authorizeMedia, mediaFailure, mediaHeaders, metadataForm } from '../lib/media-access.server';
import { getMedia, requireMediaStorage, trashMedia, updateMedia, MediaError } from '../lib/media-db.server';
import { publicationEligibility } from '../lib/media-permissions';
import { staffCsrfToken } from '../lib/staff-auth.server';
import { ControlDashboard } from '../components/control-dashboard';
import { MediaFields, PermissionFields } from '../components/media-fields';
export { MediaErrorBoundary as ErrorBoundary } from '../components/media-error';
export function headers(){return mediaHeaders;}
export function meta(){return [{title:'Private Image Details — CarrottCrunch'},{name:'robots',content:'noindex, nofollow'}];}
export async function loader({request,context,params}:Route.LoaderArgs){
  try{
    const env=context.get(contentEnvironmentContext),session=await authorizeMedia(request,env,false,import.meta.env.DEV);
    const result=await getMedia(requireMediaStorage(env).db,params.assetId);
    return data({...result,editorial:await editorialGrant(requireMediaStorage(env).db,params.assetId),identity:{username:session.username,displayName:session.display_name},role:session.role,csrf:await staffCsrfToken(session,env),now:Date.now()},{headers:mediaHeaders});
  }catch(error){throw mediaFailure(error);}
}
export async function action({request,context,params}:Route.ActionArgs){
  try{
    const env=context.get(contentEnvironmentContext),session=await authorizeMedia(request,env,true,import.meta.env.DEV);
    if(request.method!=='POST')throw new MediaError('Method not allowed.',405);
    const form=await metadataForm(request),db=requireMediaStorage(env).db,intent=form.get('intent');
    if(form.getAll('intent').length!==1)throw new MediaError('Invalid action.');
    if(intent==='editorial-consent'){
      if(!['Administrator','Owner'].includes(session.role))throw new MediaError('Administrator or Owner permission is required.',403);
      await decideEditorialConsent(db,params.assetId,session.discord_user_id,form);
    }
    else if(intent==='save')await updateMedia(db,params.assetId,session.discord_user_id,form);
    else if(intent==='trash'||intent==='restore')await trashMedia(db,params.assetId,session.discord_user_id,intent==='restore',Number(form.get('version')));
    else throw new MediaError('Invalid action.');
    return data({message:intent==='editorial-consent'?'Editorial decision recorded. Changed consent requires image reselection and a new authorized content release.':intent==='save'?'Metadata and permission records saved.':intent==='restore'?'Image restored.':'Image moved to recoverable trash.',error:false},{headers:mediaHeaders});
  }catch(error){const failure=mediaFailure(error);return data({message:await failure.text(),error:true},{status:failure.status,headers:mediaHeaders});}
}
export default function MediaDetail({loaderData:d,actionData}:Route.ComponentProps){
  const asset=d.asset;
  return <ControlDashboard {...d} section="Media Library"><section className="media-workspace" aria-labelledby="image-heading"><Link className="text-link" to={asset.deleted_at?'/control/media?view=trash':'/control/media'}>← Media Library</Link><h1 id="image-heading">{asset.title}</h1>
    {actionData&&<p role={actionData.error?'alert':'status'}>{actionData.message}</p>}
    <div className="media-detail"><img className="media-detail-preview" src={`/control/media/${asset.id}/preview`} alt={asset.alt_text||`Private preview of ${asset.title}`}/><dl className="media-facts"><dt>Original filename</dt><dd>{asset.original_filename}</dd><dt>Uploaded (UTC)</dt><dd>{new Date(asset.created_at).toISOString()}</dd><dt>Uploading staff Discord ID</dt><dd>{asset.uploaded_by}</dd><dt>Image</dt><dd>{asset.width} × {asset.height} · {asset.mime_type} · {(asset.byte_size/1048576).toFixed(2)} MB</dd><dt>Content references</dt><dd>{asset.usage_count}</dd><dt>Storage</dt><dd>Private original and metadata-free private PNG preview</dd></dl></div>
    <section className="public-card"><h2>Publication readiness</h2><p>Library permission does not publish an image. Editorial publishing rechecks consent and serves only approved derivatives from a live release.</p><ul>{(['gallery','homepage','external'] as const).map(purpose=>{const result=publicationEligibility(asset,d.permissions,purpose,d.now);return <li key={purpose}><strong>{purpose==='external'?'External promotion':purpose==='gallery'?'Community gallery':'Homepage'}:</strong> {result.eligible?'Recorded prerequisites met; publication review still required.':result.reasons.join(' ')}</li>;})}</ul></section>
    {!!d.editorialReferences.length&&<section className="public-card"><h2>Protected editorial references</h2><ul>{d.editorialReferences.map(r=><li key={r.content_id+':'+r.revision}><Link className="text-link" to={'/control/workflow/'+r.content_id}>Content revision {r.revision}</Link> (working, scheduled or live)</li>)}</ul></section>}
    {asset.deleted_at===null&&<EditorialPermission grant={d.editorial} csrf={d.csrf} canApprove={d.role==='Administrator'||d.role==='Owner'}/>}
    {!!d.references.length&&<section><h2>Usage references</h2><ul>{d.references.map((reference,index)=><li key={index}>{reference.purpose}: {reference.reference_label}</li>)}</ul></section>}
    {asset.deleted_at===null?<>
      <Form method="post" className="public-card media-editor" key={asset.version}><input type="hidden" name="_csrf" value={d.csrf}/><input type="hidden" name="version" value={asset.version}/><input type="hidden" name="intent" value="save"/><h2>Metadata and attribution</h2><MediaFields asset={asset}/><h2>Independent publication permissions</h2><p>Record explicit approval from the rights holder, with evidence staff can verify. Each use requires separate approval. Consent is never implied by upload.</p><PermissionFields permissions={d.permissions}/><button className="button primary">Save metadata and permissions</button></Form>
      <Form method="post" className="public-card"><input type="hidden" name="_csrf" value={d.csrf}/><input type="hidden" name="version" value={asset.version}/><input type="hidden" name="intent" value="trash"/><h2>Recoverable trash</h2><p>Recovery is available for 30 days. Images with content references cannot be moved to trash.</p><button className="button secondary" disabled={asset.usage_count>0}>Move to trash</button></Form>
    </>:<Form method="post" className="public-card"><input type="hidden" name="_csrf" value={d.csrf}/><input type="hidden" name="version" value={asset.version}/><input type="hidden" name="intent" value="restore"/><h2>Image in trash</h2><p>Recovery deadline (UTC): {new Date(asset.recover_until!).toISOString()}. No automatic purge is configured.</p><button className="button secondary" disabled={asset.recover_until!<d.now}>Restore image</button></Form>}
  </section></ControlDashboard>;
}
