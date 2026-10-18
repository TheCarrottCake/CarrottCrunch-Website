import { data } from 'react-router';
import type { Route } from './+types/control-news-new';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { announcementAction, studioFailure, studioHeaders, studioIdentity, studioSession } from '../lib/announcement-studio.server';
import { AnnouncementEditor } from '../components/announcement-editor';
import { ControlDashboard } from '../components/control-dashboard';
export { StudioErrorBoundary as ErrorBoundary } from '../components/studio-error';
export function headers() { return studioHeaders; }
export function meta() { return [{ title: 'New Announcement — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const { session, db } = await studioSession(request, env, false, import.meta.env.DEV);
    await db.prepare('SELECT summary FROM announcements LIMIT 1').all();
    return data(await studioIdentity(session, env), { headers: studioHeaders });
  } catch (error) { throw studioFailure(error); }
}
export async function action({ request, context }: Route.ActionArgs) {
  return announcementAction(request, context.get(contentEnvironmentContext), null, import.meta.env.DEV);
}
export default function NewAnnouncement({ loaderData: d, actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? { title: '', summary: '', bodyText: '', revision: '0' };
  return <ControlDashboard {...d} section="News & Events"><section className="studio-workspace" aria-labelledby="new-heading">
    <h1 id="new-heading">New announcement</h1><p>Start with a private draft. Nothing saved here appears on the public website.</p>
    <AnnouncementEditor key={JSON.stringify(actionData ?? 'new')} initial={values} csrf={d.csrf} errors={actionData?.errors} message={actionData?.message} />
  </section></ControlDashboard>;
}
