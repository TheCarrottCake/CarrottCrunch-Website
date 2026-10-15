import { data, Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/control-login';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authConfiguration, currentStaffSession, staffAuthHeaders } from '../lib/staff-auth.server';
import { ControlShell } from '../components/control-shell';

const messages: Record<string, string> = {
  cancelled: 'Discord sign-in was cancelled. You can try again when you’re ready.',
  denied: 'This Discord account is not authorized for staff access. Contact the community Owner if you believe this is a mistake.',
  invalid: 'This sign-in attempt is invalid, expired, or already used. Please start again.',
  failed: 'Discord sign-in could not be completed. Please try again.',
  unavailable: 'Staff sign-in is currently unavailable. Please try again later.',
  csrf: 'This request could not be verified. Reload the page and try again.',
};
export function headers() { return staffAuthHeaders; }
export function meta() {
  return [{ title: 'Staff sign-in — Crunch Control | CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }];
}
export async function loader({ request, context }: Route.LoaderArgs) {
  let configured = false;
  try {
    const env = context.get(contentEnvironmentContext);
    authConfiguration(env, import.meta.env.DEV);
    if (await currentStaffSession(request, env, import.meta.env.DEV)) throw redirect('/control', { headers: staffAuthHeaders });
    // Also confirm the local schema is present before presenting a working sign-in.
    await env.CONTENT_DB!.prepare('SELECT singleton FROM staff_bootstrap LIMIT 1').all();
    configured = true;
  } catch (error) {
    if (error instanceof Response) throw error;
  }
  const error = new URL(request.url).searchParams.get('error');
  const message = !configured ? messages.unavailable : error && Object.hasOwn(messages, error) ? messages[error] : null;
  return data({ configured, message }, { headers: staffAuthHeaders });
}
export default function ControlLogin({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  return <ControlShell title="Welcome back.">
    <p>Sign in with Discord to access Crunch Control. Access is limited to explicitly authorized CarrottCrunch staff.</p>
    {loaderData.message && <p className="content-notice" role="status">{loaderData.message}</p>}
    <Form method="post" action="/control/auth/start" reloadDocument>
      <button className="button primary" disabled={!loaderData.configured || navigation.state !== 'idle'}>Sign in with Discord <span aria-hidden="true">↗</span></button>
    </Form>
  </ControlShell>;
}
