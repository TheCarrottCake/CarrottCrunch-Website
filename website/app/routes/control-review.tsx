import { data,Form,Link } from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioSession,studioIdentity,studioHeaders,studioFailure,StudioError } from '../lib/content-studio.server';
import { ControlDashboard } from '../components/control-dashboard';
import { formatTorontoDateTime } from '../lib/event-time';
import { ContentBody } from '../components/content-body';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers(){return studioHeaders;}
export function meta(){return [{title:'Review queue — CarrottCrunch'},{name:'robots',content:'noindex, nofollow'}];}
export async function loader({request,context}:Route.LoaderArgs){try{
 const env=context.get(contentEnvironmentContext),{session,db}=await studioSession(request,env,false,import.meta.env.DEV);const q=new URL(request.url).searchParams,search=q.get('q')||'',offset=Number(q.get('offset')||0);
 if(search.length>160||!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new StudioError('Use a search of at most 160 characters and a valid page.');
 const rows=await db.prepare(`SELECT c.id,c.kind,c.title,w.editorial_revision,r.actor_name,r.created_at,v.snapshot_json FROM content_workflows w JOIN content_items c ON c.id=w.content_id JOIN content_reviews r ON r.id=w.submission_id JOIN content_revisions v ON v.content_id=w.content_id AND v.revision=w.editorial_revision
 WHERE w.status='review' AND c.is_fixture=0 AND (?='' OR instr(lower(c.title),lower(?))>0) ORDER BY r.created_at,c.id LIMIT 25 OFFSET ?`).bind(search,search,offset).all<{id:string;kind:string;title:string;editorial_revision:number;actor_name:string;created_at:number;snapshot_json:string}>();
 const items=rows.results.slice(0,24).map(({snapshot_json,...item})=>{
   const snapshot=JSON.parse(snapshot_json) as {summary?:string;body_text:string};
   return {...item,preview:snapshot.summary || snapshot.body_text.slice(0,1200),truncated:!snapshot.summary && snapshot.body_text.length>1200};
 });
 return data({...await studioIdentity(session,env),items,more:rows.results.length>24,search,offset},{headers:studioHeaders});
 }catch(error){throw studioFailure(error);}}
export default function ReviewQueue({loaderData:d}:Route.ComponentProps){
 const page=(offset:number)=>`?${new URLSearchParams({q:d.search,offset:String(offset)})}`;
 const canReview=d.role==='Administrator'||d.role==='Owner';
 return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="review-heading">
  <Link className="text-link" to="/control/news">← News & Events</Link><h1 id="review-heading">Pending review</h1>
  <p>Saved revisions awaiting an Administrator or Owner decision. Oldest submissions appear first.</p>
  <Form method="get" className="studio-search"><label htmlFor="review-search">Search submitted titles</label><div><input id="review-search" name="q" maxLength={160} defaultValue={d.search}/><button className="button secondary">Search</button>{d.search&&<Link className="text-link" to="/control/review">Clear search</Link>}</div></Form>
  <div className="studio-draft-list review-queue">{d.items.map(i=><article className="public-card review-item" key={i.id} aria-labelledby={`review-${i.id}`}>
   <div className="review-item-meta"><span className="micro">{i.kind==='event'?'Event':'Announcement'} · Revision {i.editorial_revision}</span><span className="workflow-status" data-workflow-status="review">Pending review</span></div>
   <h2 id={`review-${i.id}`}><Link to={`/control/workflow/${i.id}`}>{i.title}</Link></h2>
   <p>Submitted by {i.actor_name} · <time dateTime={new Date(i.created_at).toISOString()}>{formatTorontoDateTime(i.created_at)} (Toronto time)</time></p>
   <div className="review-item-actions"><details className="review-preview"><summary>Preview {i.kind==='event'?'event excerpt':'announcement summary'}<span className="sr-only">: {i.title}, revision {i.editorial_revision}</span></summary><ContentBody text={i.preview}/>{i.truncated&&<p className="muted">Excerpt only. Open the saved revision for the full content.</p>}</details>
   <Link className="button secondary" to={`/control/workflow/${i.id}`}>{canReview?'Review & decide':'View saved revision'}<span className="sr-only">: {i.title}, revision {i.editorial_revision}</span></Link></div>
  </article>)}</div>
  {!d.items.length&&<div className="content-empty"><h2>{d.search?'No matching submissions':d.offset?'No more submissions':'All caught up'}</h2><p>{d.search?'Try another title or clear the search.':d.offset?'Return to the first page to see the current queue.':'New submissions will appear here when a saved revision is sent for review.'}</p>{(d.search||d.offset>0)&&<Link className="text-link" to="/control/review">View current queue</Link>}</div>}
  <nav className="studio-actions" aria-label="Review queue pages">{d.offset>0&&<Link to={page(Math.max(0,d.offset-24))}>Previous submissions</Link>}{d.more&&<Link to={page(d.offset+24)}>More submissions</Link>}</nav>
 </section></ControlDashboard>;
}
