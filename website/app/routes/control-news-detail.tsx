import { data, Link } from 'react-router';
import type { Route } from './+types/control-news-detail';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { announcementAction, announcementHistory, getAnnouncementDraft, studioFailure, studioHeaders, studioIdentity, studioSession } from '../lib/announcement-studio.server';
import { AnnouncementEditor } from '../components/announcement-editor';
import { ControlDashboard } from '../components/control-dashboard';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function meta() { return [{ title: 'Edit Announcement Draft — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context, params }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const { session, db } = await studioSession(request, env, false, import.meta.env.DEV);
    const draft = await getAnnouncementDraft(db, params.announcementId);
    const history = await announcementHistory(db, draft.id);
    return data({ ...await studioIdentity(session, env), draft, history, saved: new URL(request.url).searchParams.get('saved') === '1' }, { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export async function action({ request, context, params }: Route.ActionArgs) {
  return announcementAction(request, context.get(contentEnvironmentContext), params.announcementId, import.meta.env.DEV);
}
export default function EditAnnouncement({ loaderData: d, actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? { title: d.draft.title, summary: d.draft.summary, bodyText: d.draft.body_text, revision: String(d.draft.revision) };
  const conflict = actionData?.status === 409;
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="edit-heading">
    <Link className="text-link" to="/control/news">← All announcement drafts</Link><h1 id="edit-heading">Edit announcement</h1>
    <p><span className="micro orange">PRIVATE DRAFT</span> · Revision {d.draft.revision}<br />Author: {d.draft.author || 'Staff member (name unavailable)'} · Last editor: {d.draft.last_editor || 'Staff member (name unavailable)'}<br />Updated <time dateTime={new Date(d.draft.updated_at).toISOString()}>{new Date(d.draft.updated_at).toISOString()}</time> (UTC)</p>
    {d.saved && !actionData && <p className="studio-message" role="status">Draft saved. It remains private.</p>}
    <AnnouncementEditor key={JSON.stringify(actionData ?? `${d.draft.id}:${d.draft.revision}`)} initial={values} csrf={d.csrf} errors={actionData?.errors} message={actionData?.message} conflict={conflict} />
    {actionData && <a className="text-link" href={`/control/news/${d.draft.id}`} target="_blank" rel="noopener noreferrer">Open latest saved draft in a new tab</a>}
    <section className="public-card studio-history" aria-labelledby="history-heading"><h2 id="history-heading">Recent revisions</h2><p className="muted">Up to 20 recent saves. Earlier revisions and audit records remain stored.</p>
      <ol>{d.history.map(revision => <li key={revision.revision}><strong>Revision {revision.revision}</strong> · {revision.author || 'Staff member (name unavailable)'} · <time dateTime={new Date(revision.created_at).toISOString()}>{new Date(revision.created_at).toISOString()}</time></li>)}</ol>
    </section>
  </section></ControlDashboard>;
}
