import { useRef, useState } from 'react';
import { data, Form, Link, useRevalidator } from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authorizeMedia, mediaFailure, mediaHeaders } from '../lib/media-access.server';
import { listMedia, requireMediaStorage } from '../lib/media-db.server';
import { staffCsrfToken } from '../lib/staff-auth.server';
import { ControlDashboard } from '../components/control-dashboard';
import { MediaFields } from '../components/media-fields';
export { MediaErrorBoundary as ErrorBoundary } from '../components/media-error';
export function headers(){return mediaHeaders;}
export function meta(){return [{title:'Private Media Library — CarrottCrunch'},{name:'robots',content:'noindex, nofollow'}];}
export async function loader({request,context}:Route.LoaderArgs){
  try {
    const env=context.get(contentEnvironmentContext),session=await authorizeMedia(request,env,false,import.meta.env.DEV);
    const url=new URL(request.url),search=url.searchParams.get('q')||'',trash=url.searchParams.get('view')==='trash',offset=Number(url.searchParams.get('offset')||0),mime=url.searchParams.get('type')||'';
    const items=await listMedia(requireMediaStorage(env).db,search,trash,offset,mime);
    return data({identity:{username:session.username,displayName:session.display_name},role:session.role,csrf:await staffCsrfToken(session,env),items:items.slice(0,48),more:items.length>48,search,trash,offset,mime},{headers:mediaHeaders});
  }catch(error){throw mediaFailure(error);}
}
export default function MediaLibrary({loaderData:d}:Route.ComponentProps){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
  const revalidator=useRevalidator(),formRef=useRef<HTMLFormElement>(null);
  const query=(offset:number)=>`?${new URLSearchParams({q:d.search,view:d.trash?'trash':'active',offset:String(offset),type:d.mime})}`;
  return <ControlDashboard {...d} section="Media Library"><section className="media-workspace" aria-labelledby="media-heading">
    <h1 id="media-heading">Media Library</h1><p>Private staff images. Uploading grants no publication permissions. Original files are never publicly served.</p>
    <nav className="media-tabs" aria-label="Media collection"><Link aria-current={!d.trash?'page':undefined} to="/control/media">Library</Link><Link aria-current={d.trash?'page':undefined} to="?view=trash">Trash</Link></nav>
    {!d.trash&&<details className="public-card media-upload"><summary>Upload an image</summary>
      <p>JPEG, PNG or WebP; one image, at most 20 MB, 4096 pixels per side and 4 million pixels total. Animated images are not accepted.</p>
      <form ref={formRef} method="post" encType="multipart/form-data" action="/control/media/upload" onSubmit={async event=>{
        event.preventDefault();if(busy)return;setBusy(true);setMessage('');setFailed(false);
        try{
          const response=await fetch('/control/media/upload',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':d.csrf},body:new FormData(event.currentTarget)});
          const result=await response.json() as {message?:string;error?:string};
          if(!response.ok)throw new Error(result.error||'Upload failed.');
          setMessage(result.message||'Image saved privately.');formRef.current?.reset();await revalidator.revalidate();
        }catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Upload failed. Please try again.');}
        finally{setBusy(false);}
      }}>
        <fieldset disabled={busy}><legend>Private upload</legend><label>Image <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required/></label><MediaFields/><button className="button primary">{busy?'Uploading…':'Upload privately'}</button></fieldset>
        <noscript>Uploading requires JavaScript for the secure request token. Browsing and metadata forms remain available.</noscript>
      </form>
    </details>}
    <p role={failed?'alert':'status'} aria-live="polite">{message}</p>
    <Form method="get" className="media-search"><input type="hidden" name="view" value={d.trash?'trash':'active'}/><label>Search title or filename <input type="search" name="q" maxLength={160} defaultValue={d.search}/></label><label>Image type <select name="type" defaultValue={d.mime}><option value="">All types</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select></label><button className="button secondary">Search</button></Form>
    {revalidator.state!=='idle'&&<p role="status">Refreshing images…</p>}
    {d.trash&&<p>Recover images within 30 days. Nothing is automatically purged; recovery after the deadline is unavailable in this tool.</p>}
    {!d.items.length?<p className="public-card">{d.search?'No matching images.':'No images in this collection yet.'}</p>:<div className="media-grid">{d.items.map(asset=><article className="public-card media-card" key={asset.id}><Link to={`/control/media/${asset.id}`}><img loading="lazy" src={`/control/media/${asset.id}/preview`} alt={asset.alt_text||`Private preview of ${asset.title}`}/><h2>{asset.title}</h2></Link><p>{asset.mime_type.replace('image/','').toUpperCase()} · {(asset.byte_size/1048576).toFixed(2)} MB</p><small>{new Date(asset.created_at).toISOString().slice(0,10)} UTC · {asset.deleted_at?'In trash':'Private'}</small></article>)}</div>}
    <nav className="media-tabs" aria-label="Media pages">{d.offset>0&&<Link to={query(Math.max(0,d.offset-48))}>Previous page</Link>}{d.more&&<Link to={query(d.offset+48)}>Next page</Link>}</nav>
  </section></ControlDashboard>;
}
