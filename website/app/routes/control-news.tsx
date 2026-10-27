import { data, Form, Link } from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { listAnnouncementDrafts, studioFailure, studioHeaders, studioIdentity, studioSession } from '../lib/announcement-studio.server';
import { listEventDrafts } from '../lib/event-studio.server';
import { StudioError } from '../lib/content-studio.server';
import { eventScheduleSummary, formatTorontoDateTime } from '../lib/event-time';
import { ControlDashboard } from '../components/control-dashboard';
import { DeleteDraftButton } from '../components/delete-draft-button';
import { getWorkflow, workflowCounts } from '../lib/publication-workflow.server';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function meta() { return [{ title: 'News & Events Studio — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const { session, db } = await studioSession(request, env, false, import.meta.env.DEV);
    const query = new URL(request.url).searchParams;
    const search = query.get('q') ?? '', offset = Number(query.get('offset') ?? 0);
    const kind = query.get('kind') ?? 'announcement';
    const status = query.get('status') ?? '';
    if (!['','draft','review','approved','scheduled','published','archived'].includes(status)) throw new StudioError('Choose a valid workflow status.');
    if (!['announcement', 'event'].includes(kind)) throw new StudioError('Choose announcements or events.');
    const items = kind === 'event' ? await listEventDrafts(db, search, offset, status) : await listAnnouncementDrafts(db, search, offset, status);
    const rows = await Promise.all(items.slice(0,24).map(async item => ({...item,workflow:await getWorkflow(db,item.id),released:!!await db.prepare('SELECT id FROM content_releases WHERE content_id=? LIMIT 1').bind(item.id).first()})));
    return data({ ...await studioIdentity(session, env), kind, status, counts:await workflowCounts(db), deleted: query.get('deleted') === '1', items: rows, more: items.length > 24, search, offset }, { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export default function NewsStudio({ loaderData: d }: Route.ComponentProps) {
  const page = (offset: number) => `?${new URLSearchParams({ kind: d.kind, status:d.status, q: d.search, offset: String(offset) })}`;
  const events = d.kind === 'event';
  const listing = events ? '/control/news?kind=event' : '/control/news';
  const draftLink = (id: string) => events ? `/control/events/${id}` : `/control/news/${id}`;
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="studio-heading">
    <div className="studio-heading"><div><span className="micro orange">CONTENT STUDIO / {events ? 'EVENTS' : 'ANNOUNCEMENTS'}</span><h1 id="studio-heading">News & Events</h1></div><Link className="button primary" to={events ? "/control/events/new" : "/control/news/new"}>{events ? "New event" : "New announcement"}</Link></div>
    <nav className="media-tabs studio-tabs" aria-label="Draft type"><Link to="/control/news" aria-current={!events ? 'page' : undefined}>Announcements</Link><Link to="/control/news?kind=event" aria-current={events ? 'page' : undefined}>Events</Link></nav>
    <p>Write, review and publish community content. Working copies remain private until explicitly approved and published.</p>
    <p role="status">{d.counts?.pending || 0} awaiting review · {d.counts?.overdue || 0} overdue scheduled releases</p>
    <p><Link className="button secondary" to="/control/review">Open review queue</Link></p>
    {d.deleted && <p className="studio-message" role="status">Draft deleted. Its saved content and history have been retained.</p>}
    <Form method="get" className="studio-search"><input type="hidden" name="kind" value={d.kind} /><label htmlFor="workflow-status">Workflow status</label><select id="workflow-status" name="status" defaultValue={d.status}><option value="">All statuses</option><option value="draft">Drafts / returned for revision</option><option value="review">Pending review</option><option value="approved">Approved</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></select><label htmlFor="draft-search">{events ? 'Search event titles and descriptions' : 'Search titles and summaries'}</label><div><input id="draft-search" name="q" maxLength={160} defaultValue={d.search} /><button className="button secondary">Search</button><Link className="text-link" to={listing}>Clear</Link></div></Form>
    {d.items.length ? <div className="studio-draft-list">{d.items.map(item => <article className="public-card" key={item.id}>
      <div className="studio-card-meta"><span className="micro orange" data-workflow-status={item.workflow.status}>{item.workflow.status==='review'?'Pending review':item.workflow.status} · Revision {item.revision}{item.workflow.live_release_id?' · Live version':''}</span>{item.workflow.status==='draft' && !item.released && <DeleteDraftButton id={item.id} kind={events ? 'event' : 'announcement'} revision={item.revision} title={item.title} csrf={d.csrf} />}</div>
      <h2><Link to={`/control/workflow/${item.id}`}>{item.title}</Link></h2><p className="studio-summary">{'summary' in item ? item.summary || 'No summary yet.' : item.body_text.slice(0, 180)}</p>
      {'starts_at' in item && <p className="event-time">{eventScheduleSummary(item.starts_at, item.ends_at)}</p>}
      <p className="muted">Author: {item.author || 'Staff member (name unavailable)'}<br />Updated <time dateTime={new Date(item.updated_at).toISOString()}>{events ? formatTorontoDateTime(item.updated_at) : new Date(item.updated_at).toISOString().replace('T', ' ').replace('Z', ' UTC')}</time>{events ? ' (Toronto time)' : ''}</p>
      <Link className="text-link" to={`/control/workflow/${item.id}`}>Review &amp; publication<span className="sr-only">: {item.title}</span></Link>{item.workflow.status!=='archived' && <Link className="text-link" to={draftLink(item.id)}>Edit working copy<span className="sr-only">: {item.title}</span></Link>}
    </article>)}</div> : <p className="content-empty">{d.search ? 'No drafts match your search.' : events ? 'No event drafts yet. Create one when you are ready.' : 'No announcement drafts yet. Create one when you are ready.'}</p>}
    <nav className="studio-actions" aria-label="Draft pages">{d.offset > 0 && <Link className="text-link" to={page(Math.max(0, d.offset - 24))}>Previous drafts</Link>}{d.more && <Link className="text-link" to={page(d.offset + 24)}>More drafts</Link>}</nav>
  </section></ControlDashboard>;
}
