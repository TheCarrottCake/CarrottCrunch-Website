import { data, Form, Link } from 'react-router';
import type { Route } from './+types/control-news';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { listAnnouncementDrafts, studioFailure, studioHeaders, studioIdentity, studioSession } from '../lib/announcement-studio.server';
import { listEventDrafts } from '../lib/event-studio.server';
import { StudioError } from '../lib/content-studio.server';
import { eventScheduleSummary, formatTorontoDateTime } from '../lib/event-time';
import { ControlDashboard } from '../components/control-dashboard';
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
    if (!['announcement', 'event'].includes(kind)) throw new StudioError('Choose announcements or events.');
    const items = kind === 'event' ? await listEventDrafts(db, search, offset) : await listAnnouncementDrafts(db, search, offset);
    return data({ ...await studioIdentity(session, env), kind, items: items.slice(0, 24), more: items.length > 24, search, offset }, { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export default function NewsStudio({ loaderData: d }: Route.ComponentProps) {
  const page = (offset: number) => `?${new URLSearchParams({ kind: d.kind, q: d.search, offset: String(offset) })}`;
  const events = d.kind === 'event';
  const listing = events ? '/control/news?kind=event' : '/control/news';
  const draftLink = (id: string) => events ? `/control/events/${id}` : `/control/news/${id}`;
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="studio-heading">
    <div className="studio-heading"><div><span className="micro orange">CONTENT STUDIO / {events ? 'EVENTS' : 'ANNOUNCEMENTS'}</span><h1 id="studio-heading">News & Events</h1></div><Link className="button primary" to={events ? "/control/events/new" : "/control/news/new"}>{events ? "New event" : "New announcement"}</Link></div>
    <nav className="media-tabs studio-tabs" aria-label="Draft type"><Link to="/control/news" aria-current={!events ? 'page' : undefined}>Announcements</Link><Link to="/control/news?kind=event" aria-current={events ? 'page' : undefined}>Events</Link></nav>
    <p>Write, preview and save private {events ? 'event' : 'announcement'} drafts. Publishing is not available.</p>
    <Form method="get" className="studio-search"><input type="hidden" name="kind" value={d.kind} /><label htmlFor="draft-search">{events ? 'Search event titles and descriptions' : 'Search draft titles and summaries'}</label><div><input id="draft-search" name="q" maxLength={160} defaultValue={d.search} /><button className="button secondary">Search</button><Link className="text-link" to={listing}>Clear</Link></div></Form>
    {d.items.length ? <div className="studio-draft-list">{d.items.map(item => <article className="public-card" key={item.id}>
      <div className="studio-card-meta"><span className="micro orange">PRIVATE DRAFT</span><span>Revision {item.revision}</span></div>
      <h2><Link to={draftLink(item.id)}>{item.title}</Link></h2><p className="studio-summary">{'summary' in item ? item.summary || 'No summary yet.' : item.body_text.slice(0, 180)}</p>
      {'starts_at' in item && <p className="event-time">{eventScheduleSummary(item.starts_at, item.ends_at)}</p>}
      <p className="muted">Author: {item.author || 'Staff member (name unavailable)'}<br />Updated <time dateTime={new Date(item.updated_at).toISOString()}>{events ? formatTorontoDateTime(item.updated_at) : new Date(item.updated_at).toISOString().replace('T', ' ').replace('Z', ' UTC')}</time>{events ? ' (Toronto time)' : ''}</p>
      <Link className="text-link" to={draftLink(item.id)}>Edit draft<span className="sr-only">: {item.title}</span></Link>
    </article>)}</div> : <p className="content-empty">{d.search ? 'No drafts match your search.' : events ? 'No event drafts yet. Create one when you are ready.' : 'No announcement drafts yet. Create one when you are ready.'}</p>}
    <nav className="studio-actions" aria-label="Draft pages">{d.offset > 0 && <Link className="text-link" to={page(Math.max(0, d.offset - 24))}>Previous drafts</Link>}{d.more && <Link className="text-link" to={page(d.offset + 24)}>More drafts</Link>}</nav>
  </section></ControlDashboard>;
}
