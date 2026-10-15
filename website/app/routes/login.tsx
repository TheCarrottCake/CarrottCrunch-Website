import { data, Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/login';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { authConfiguration, currentSiteSession, staffAuthHeaders } from '../lib/staff-auth.server';
import { AccountShell } from '../components/account-shell';

const messages: Record<string, string> = {
  cancelled: 'Discord sign-in was cancelled. You can try again when you’re ready.',
  invalid: 'This sign-in attempt is invalid, expired, or already used. Please start again.',
  failed: 'Discord sign-in could not be completed. Please try again.',
  unavailable: 'Sign-in is currently unavailable. Please try again later.',
  csrf: 'This request could not be verified. Reload the page and try again.',
};
export function headers() { return staffAuthHeaders; }
export function meta() { return [{ title: 'Sign In with Discord — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  let configured = false;
  try {
    const env = context.get(contentEnvironmentContext);
    authConfiguration(env, import.meta.env.DEV);
    if (await currentSiteSession(request, env, import.meta.env.DEV)) throw redirect('/account', { headers: staffAuthHeaders });
    await env.CONTENT_DB!.prepare('SELECT discord_user_id FROM site_users LIMIT 1').all();
    configured = true;
  } catch (error) { if (error instanceof Response) throw error; }
  const error = new URL(request.url).searchParams.get('error');
  return data({ configured, message: !configured ? messages.unavailable : error && Object.hasOwn(messages, error) ? messages[error] : null }, { headers: staffAuthHeaders });
}
export default function Login({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  return <AccountShell title="Welcome to CarrottCrunch.">
    <p>Sign in with Discord to create or access your CarrottCrunch account. Staff use this same sign-in; staff permissions are assigned separately.</p>
    <p>Signing in to this website does not join the Discord community.</p>
    {loaderData.message && <p className="content-notice" role="status">{loaderData.message}</p>}
    <Form method="post" action="/auth/start" reloadDocument><button className="button primary" disabled={!loaderData.configured || navigation.state !== 'idle'}>Sign In with Discord <span aria-hidden="true">↗</span></button></Form>
  </AccountShell>;
}
