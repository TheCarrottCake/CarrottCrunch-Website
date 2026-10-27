import { formatTorontoDateTime } from '../lib/event-time';
import { getWorkflow, workflowPresentation } from '../lib/publication-workflow.server';
import { data, Link } from 'react-router';
import type {LegacyArgs,LegacyData} from '../lib/legacy-route-types';
namespace Route { export type LoaderArgs=LegacyArgs;export type ActionArgs=LegacyArgs;export type ComponentProps={loaderData:LegacyData<Awaited<ReturnType<typeof loader>>>;actionData?:LegacyData<Awaited<ReturnType<typeof action>>>;};export type MetaArgs={loaderData?:LegacyData<Awaited<ReturnType<typeof loader>>>};}
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
    const workflow = await getWorkflow(db, draft.id);
    return data({ ...await studioIdentity(session, env), draft, workflow, publication: await workflowPresentation(db, workflow), released: !!await db.prepare('SELECT id FROM content_releases WHERE content_id=? LIMIT 1').bind(draft.id).first(), history, saved: new URL(request.url).searchParams.get('saved') === '1', updated: new URL(request.url).searchParams.get('updated') === '1' }, { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export async function action({ request, context, params }: Route.ActionArgs) {
  return announcementAction(request, context.get(contentEnvironmentContext), params.announcementId, import.meta.env.DEV);
}
export default function EditAnnouncement({ loaderData: d, actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? { ...(d.draft.pending_image_id ? {pendingImageId:d.draft.pending_image_id}:{}), ...(d.draft.featured_image_id ? {featuredImageId:d.draft.featured_image_id}:{}), title: d.draft.title, summary: d.draft.summary, bodyText: d.draft.body_text, revision: String(d.draft.revision) };
  const conflict = actionData?.status === 409;
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="edit-heading">
    {d.updated && <p className="studio-message" role="status">{d.workflow.status === 'published' ? 'Saved revision published.' : d.workflow.status === 'scheduled' ? 'Publication scheduled.' : d.workflow.status === 'approved' ? 'Revision approved. Approval alone does not publish.' : d.workflow.status === 'review' ? 'Saved revision submitted for review.' : 'Working revision updated.'}</p>}
    {d.saved && !actionData && <p className="studio-message" role="status">Working revision saved. {d.workflow.live_release_id ? `Live revision ${d.publication.liveRevision} remains unchanged.` : 'Not publicly visible.'}</p>}
    <AnnouncementEditor key={JSON.stringify(actionData ?? `${d.draft.id}:${d.draft.revision}`)} initial={values} savedValues={{ ...(d.draft.featured_image_id ? {featuredImageId:d.draft.featured_image_id}:{}), title:d.draft.title, summary:d.draft.summary, bodyText:d.draft.body_text, revision:String(d.draft.revision) }} toolbar={{ workflow:d.workflow, publication:d.publication, role:d.role, released:d.released, headingId:"edit-heading", history:(<section className="public-card studio-history" aria-labelledby="history-heading"><h2 id="history-heading">Recent revisions</h2><p className="muted">Up to 20 recent saves. Earlier revisions and audit records remain stored.</p>
      <ol>{d.history.map(revision => <li key={revision.revision}><strong>Revision {revision.revision}</strong> · {revision.author || 'Staff member (name unavailable)'} · <time dateTime={new Date(revision.created_at).toISOString()}>{formatTorontoDateTime(revision.created_at)} (Toronto time)</time></li>)}</ol>
    </section>) }} csrf={d.csrf} errors={actionData?.errors} message={actionData?.message} conflict={conflict} />
    {actionData && <a className="text-link" href={`/control/news/${d.draft.id}`} target="_blank" rel="noopener noreferrer">Open latest saved draft in a new tab</a>}

  </section></ControlDashboard>;
}
