import { data, Form, Link } from 'react-router';
import type { Route } from './+types/studio-posts';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioSession, studioIdentity, studioHeaders, studioFailure } from '../lib/content-studio.server';
import { studioList } from '../lib/studio.server';
import { ControlDashboard } from '../components/control-dashboard';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export async function loader({ request, context }: Route.LoaderArgs) { try {
    const env = context.get(contentEnvironmentContext), { session, db } = await studioSession(request, env, false, import.meta.env.DEV), q = new URL(request.url).searchParams;
    const kind=q.get('kind')||'',status=q.get('status')||'';
    if(!['','announcement','event'].includes(kind)||!['','draft','published','scheduled','unpublished','archived'].includes(status))throw new Response('Check the content filters.',{status:400,headers:studioHeaders});
    const rows=await studioList(db,kind,q.get('q')||'',status,Number(q.get('offset')||0));
    return data({ ...await studioIdentity(session, env), items:rows.slice(0,24),more:rows.length>24, q: q.get('q') || '', status: q.get('status') || '', kind: q.get('kind') || '', offset: Number(q.get('offset') || 0) }, { headers: studioHeaders });
}
catch (e) {
    throw studioFailure(e);
} }
export default function StudioPosts({ loaderData: d }: Route.ComponentProps) { return <ControlDashboard {...d} section="Posts & Events"><section className="studio-workspace"><div className="studio-heading"><h1>Posts & Events</h1><div className="studio-actions"><Link className="button primary" to="/control/posts/new/announcement">New post</Link><Link className="button secondary" to="/control/posts/new/event">New event</Link></div></div><Form method="get" className="studio-search"><label>Search<input name="q" defaultValue={d.q} maxLength={160}/></label><label>Status<select name="status" defaultValue={d.status}><option value="">All</option>{['draft', 'published', 'scheduled', 'unpublished', 'archived'].map(s => <option key={s}>{s}</option>)}</select></label><label>Type<select name="kind" defaultValue={d.kind}><option value="">Posts & events</option><option value="announcement">Posts</option><option value="event">Events</option></select></label><button className="button secondary">Search</button></Form><div className="studio-draft-list">{d.items.map(item => <article className="public-card" key={item.id}><span className="micro">{item.kind === 'event' ? 'Event' : 'Post'} · {item.status}{item.live_release_id && item.status === 'scheduled' ? ' · Current version is live' : ''}</span><h2><Link to={`/control/posts/${item.id}`}>{item.title}</Link></h2><p>Updated {new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' }).format(item.updated_at)}</p><Link className="button secondary" to={`/control/posts/${item.id}`}>Open<span className="sr-only">: {item.title}</span></Link></article>)}</div>{!d.items.length && <p className="content-empty">No matching content. Create a post or event to begin.</p>}<nav className="studio-actions" aria-label="Content pages">{d.offset > 0 && <Link to={`?${new URLSearchParams({ q: d.q, status: d.status, kind: d.kind, offset: String(Math.max(0, d.offset - 24)) })}`}>Previous</Link>}{d.more && <Link to={`?${new URLSearchParams({ q: d.q, status: d.status, kind: d.kind, offset: String(d.offset + 24) })}`}>More content</Link>}</nav></section></ControlDashboard>; }
