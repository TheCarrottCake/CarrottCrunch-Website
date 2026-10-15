import { data, Form, isRouteErrorResponse, redirect } from 'react-router';
import type { Route } from './+types/control';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, requireStaff, staffCsrfToken, staffAuthHeaders } from '../lib/staff-auth.server';
import { ControlShell } from '../components/control-shell';

export function headers() { return staffAuthHeaders; }
export function meta() {
  return [{ title: 'Crunch Control — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }];
}
export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const session = await requireStaff(request, env, 'Moderator', import.meta.env.DEV);
    return data({ identity: { username: session.username, displayName: session.display_name }, role: session.role, csrf: await staffCsrfToken(session, env) }, { headers: staffAuthHeaders });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'denied') throw redirect('/control/login', { headers: staffAuthHeaders });
    throw new Response('Staff access is unavailable', { status: 503, headers: staffAuthHeaders });
  }
}
export default function Control({ loaderData }: Route.ComponentProps) {
  return <ControlShell title="You’re in.">
    <p>Welcome, <strong>{loaderData.identity.displayName}</strong>.</p>
    <dl className="control-identity"><div><dt>Discord username</dt><dd>{loaderData.identity.username}</dd></div><div><dt>Staff role</dt><dd>{loaderData.role}</dd></div></dl>
    <p className="muted">This is the staff access foundation. Content editing and other staff tools are not available yet.</p>
    <Form method="post" action="/control/logout" reloadDocument>
      <input type="hidden" name="_csrf" value={loaderData.csrf} />
      <button className="button secondary">Sign out</button>
    </Form>
  </ControlShell>;
}
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const forbidden = isRouteErrorResponse(error) && error.status === 403;
  return <ControlShell title={forbidden ? 'Access denied.' : 'Staff access unavailable.'}>
    <p>{forbidden ? 'Your account does not have permission for this page.' : 'Please try again later or contact the community Owner.'}</p>
  </ControlShell>;
}
