import {pendingContentImage} from '../lib/content-image-upload.server';
import {PendingImageReview} from '../components/content-image-upload';
import {privateFeaturedImage} from '../lib/editorial-media.server';
import {FeaturedImageView} from '../components/featured-image';
import { data, Link } from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;actionData?:LegacyData<Awaited<ReturnType<typeof action>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioSession,studioIdentity,studioHeaders,studioFailure } from '../lib/content-studio.server';
import { getWorkflow,workflowPresentation,workflowHistory,workflowAction } from '../lib/publication-workflow.server';
import { ControlDashboard } from '../components/control-dashboard';
import { WorkflowControls } from '../components/workflow-controls';
import { ContentBody } from '../components/content-body';
import { eventScheduleSummary,formatTorontoDateTime } from '../lib/event-time';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers(){return studioHeaders;}
export function meta(){return [{title:'Content review — CarrottCrunch'},{name:'robots',content:'noindex, nofollow'}];}
export async function loader({request,context,params}:Route.LoaderArgs){try{
 const env=context.get(contentEnvironmentContext);const {session,db}=await studioSession(request,env,false,import.meta.env.DEV);const workflow=await getWorkflow(db,params.contentId);
 const revision=await db.prepare('SELECT snapshot_json FROM content_revisions WHERE content_id=? AND revision=?').bind(params.contentId,workflow.editorial_revision).first<{snapshot_json:string}>();
 if(!revision)throw new Response('Revision unavailable',{status:404,headers:studioHeaders});
 const snapshot=JSON.parse(revision.snapshot_json) as {title:string;body_text:string;summary?:string;kind:'announcement'|'event';starts_at:number;ends_at:number;featured_image_id?:string;pending_image_id?:string};
 const release=workflow.pending_release_id?await db.prepare('SELECT due_at FROM content_releases WHERE id=?').bind(workflow.pending_release_id).first<{due_at:number}>():null;
 return data({...await studioIdentity(session,env),workflow,pendingImage:snapshot.pending_image_id?await pendingContentImage(db,snapshot.pending_image_id):null,featuredImage:await privateFeaturedImage(db,snapshot.featured_image_id),publication:await workflowPresentation(db,workflow),snapshot,release,released:!!await db.prepare('SELECT id FROM content_releases WHERE content_id=? LIMIT 1').bind(params.contentId).first(),history:await workflowHistory(db,params.contentId),done:new URL(request.url).searchParams.has('done')},{headers:studioHeaders});
 }catch(error){throw studioFailure(error);}}
export function action({request,context,params}:Route.ActionArgs){return workflowAction(request,context.get(contentEnvironmentContext),params.contentId,import.meta.env.DEV);}
export default function WorkflowPage({loaderData:d}:Route.ComponentProps){const s=d.snapshot;return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="workflow-title"><Link className="text-link" to="/control/news">← News & Events</Link><WorkflowControls key={d.workflow.version} workflow={d.workflow} publication={d.publication} imagePending={!!d.pendingImage} csrf={d.csrf} role={d.role} kind={s.kind} released={d.released} history={(<section className="public-card studio-history" aria-labelledby="workflow-history"><h2 id="workflow-history">Workflow history</h2><ol>{d.history.map((h,i)=><li key={i}><strong>{h.action}</strong>{h.revision?` · Revision ${h.revision}`:''} · {h.name} · <time dateTime={new Date(h.at).toISOString()}>{formatTorontoDateTime(h.at)} (Toronto time)</time>{h.explanation&&<p>{h.explanation}</p>}</li>)}</ol><p className="muted">Showing up to 30 recent actions. All audit records remain stored.</p></section>)}/>{d.done&&<p role="status" className="studio-message">{d.workflow.status === 'published' ? 'Saved revision published.' : d.workflow.status === 'scheduled' ? 'Publication scheduled.' : d.workflow.status === 'approved' ? 'Revision approved. Approval alone does not publish.' : d.workflow.status === 'review' ? 'Saved revision submitted for review.' : d.workflow.status === 'archived' ? 'Content archived. No longer publicly visible.' : 'Working revision updated.'}</p>}

 <article className="public-card"><span className="micro orange">{s.kind === 'event' ? 'EVENT' : 'ANNOUNCEMENT'} / SAVED REVISION {d.workflow.editorial_revision}</span><h2>{s.title}</h2>{s.summary&&<p>{s.summary}</p>}{s.kind==='event'&&<p>{eventScheduleSummary(s.starts_at,s.ends_at)}</p>}{d.pendingImage&&<><PendingImageReview image={d.pendingImage}/><Link className="button secondary" to={'/control/'+(s.kind==='event'?'events':'news')+'/'+d.workflow.content_id}>Review image in editor</Link></>}<FeaturedImageView key={d.featuredImage?.id} image={d.featuredImage} privatePreview/><ContentBody text={s.body_text}/></article>


</section></ControlDashboard>;}
