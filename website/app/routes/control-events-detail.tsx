import { data, Link } from 'react-router';
import type { Route } from './+types/control-events-detail';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioSession, studioIdentity, studioFailure, studioHeaders, draftHistory } from '../lib/content-studio.server';
import { eventAction, getEventDraft, eventEditorValues } from '../lib/event-studio.server';
import { EventEditor } from '../components/event-editor';
import { ControlDashboard } from '../components/control-dashboard';
import { formatTorontoDateTime } from '../lib/event-time';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function meta() { return [{ title: 'Edit Event Draft — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context, params }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const { session, db } = await studioSession(request, env, false, import.meta.env.DEV);
    const draft = await getEventDraft(db, params.eventId);
    return data({ ...await studioIdentity(session, env), draft, values: eventEditorValues(draft), history: await draftHistory(db, draft.id), now: Date.now(), saved: new URL(request.url).searchParams.get('saved') === '1' }, { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export async function action({ request, context, params }: Route.ActionArgs) {
  return eventAction(request, context.get(contentEnvironmentContext), params.eventId, import.meta.env.DEV);
}
export default function EditEvent({ loaderData: d, actionData }: Route.ComponentProps) {
  const conflict = actionData?.status === 409;
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="edit-event-heading">
    <Link className="text-link" to="/control/news?kind=event">← All event drafts</Link><h1 id="edit-event-heading">Edit community event</h1>
    <p><span className="micro orange">PRIVATE DRAFT</span> · Revision {d.draft.revision}<br />Author: {d.draft.author || 'Staff member (name unavailable)'} · Last editor: {d.draft.last_editor || 'Staff member (name unavailable)'}<br />Updated <time dateTime={new Date(d.draft.updated_at).toISOString()}>{formatTorontoDateTime(d.draft.updated_at)}</time> (Toronto time)</p>
    {d.saved && !actionData && <p className="studio-message" role="status">Draft saved. It remains private.</p>}
    <EventEditor key={JSON.stringify(actionData ?? `${d.draft.id}:${d.draft.revision}`)} initial={actionData?.values ?? d.values} csrf={d.csrf} now={d.now} errors={actionData?.errors} message={actionData?.message} conflict={conflict} eventState={d.draft.event_state} />
    {actionData && <a className="text-link" href={`/control/events/${d.draft.id}`} target="_blank" rel="noopener noreferrer">Open latest saved draft in a new tab</a>}
    <section className="public-card studio-history" aria-labelledby="event-history-heading"><h2 id="event-history-heading">Recent revisions</h2><p className="muted">Up to 20 recent saves. Earlier revisions and audit records remain stored.</p>
      <ol>{d.history.map(revision => <li key={revision.revision}><strong>Revision {revision.revision}</strong> · {revision.author || 'Staff member (name unavailable)'} · <time dateTime={new Date(revision.created_at).toISOString()}>{formatTorontoDateTime(revision.created_at)}</time></li>)}</ol>
    </section>
  </section></ControlDashboard>;
}
