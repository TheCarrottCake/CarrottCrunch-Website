import { data, isRouteErrorResponse, redirect } from 'react-router';
import type { Route } from './+types/control';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, currentSiteSession, requireStaff, staffCsrfToken, staffAuthHeaders } from '../lib/staff-auth.server';
import { ControlDashboard } from '../components/control-dashboard';
import { ControlShell } from '../components/control-shell';
import { workflowCounts } from '../lib/publication-workflow.server';

export function headers() { return staffAuthHeaders; }
export function meta() {
  return [{ title: 'Crunch Control — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }];
}
export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const session = await requireStaff(request, env, 'Moderator', import.meta.env.DEV);
    return data({ identity: { username: session.username, displayName: session.display_name }, role: session.role, csrf: await staffCsrfToken(session, env), counts:env.CONTENT_DB?await workflowCounts(env.CONTENT_DB):null }, { headers: staffAuthHeaders });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'denied') {
      try {
        if (await currentSiteSession(request, context.get(contentEnvironmentContext), import.meta.env.DEV)) throw new Response('Staff access denied', { status: 403, headers: staffAuthHeaders });
      } catch (failure) { if (failure instanceof Response) throw failure; }
      throw redirect('/login', { headers: staffAuthHeaders });
    }
    throw new Response('Staff access is unavailable', { status: 503, headers: staffAuthHeaders });
  }
}
export default function Control({ loaderData }: Route.ComponentProps) {
  return <ControlDashboard {...loaderData} section="Overview" />;
}
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const forbidden = isRouteErrorResponse(error) && error.status === 403;
  return <ControlShell title={forbidden ? 'Access denied.' : 'Staff access unavailable.'}>
    <p>{forbidden ? 'Your account does not have permission for this page.' : 'Please try again later or contact the community Owner.'}</p>
  </ControlShell>;
}
