import { data } from 'react-router';
import type { Route } from './+types/control-events-new';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { studioSession, studioIdentity, studioFailure, studioHeaders } from '../lib/content-studio.server';
import { eventAction, type EventValues } from '../lib/event-studio.server';
import { EventEditor } from '../components/event-editor';
import { ControlDashboard } from '../components/control-dashboard';
import { EVENT_TIMEZONE } from '../lib/event-time';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function meta() { return [{ title: 'New Event Draft — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const { session } = await studioSession(request, env, false, import.meta.env.DEV);
    return data({ ...await studioIdentity(session, env), now: Date.now() }, { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export async function action({ request, context }: Route.ActionArgs) {
  return eventAction(request, context.get(contentEnvironmentContext), null, import.meta.env.DEV);
}
export default function NewEvent({ loaderData: d, actionData }: Route.ComponentProps) {
  const values: EventValues = actionData?.values ?? { title: '', bodyText: '', startLocal: '', endLocal: '', timezone: EVENT_TIMEZONE, startOccurrence: '', endOccurrence: '', revision: '0' };
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="new-event-heading">
    <h1 id="new-event-heading">New community event</h1><p>Start with a private event draft. Nothing saved here appears on the public website.</p>
    <EventEditor key={JSON.stringify(actionData ?? 'new')} initial={values} csrf={d.csrf} now={d.now} errors={actionData?.errors} message={actionData?.message} />
  </section></ControlDashboard>;
}
