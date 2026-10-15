import { data, Form, Link, redirect } from 'react-router';
import type { Route } from './+types/account';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, requireSiteUser, accountPresentation, staffCsrfToken, staffAuthHeaders } from '../lib/staff-auth.server';
export function headers() { return staffAuthHeaders; }
export function meta() { return [{ title: 'My Account — CarrottCrunch' }, { name: 'robots', content: 'noindex, nofollow' }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  try {
    const env = context.get(contentEnvironmentContext);
    const session = await requireSiteUser(request, env, import.meta.env.DEV);
    return data({ account: accountPresentation(session), csrf: await staffCsrfToken(session, env) }, { headers: staffAuthHeaders });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'denied') throw redirect('/login', { headers: staffAuthHeaders });
    throw new Response('Account unavailable', { status: 503, headers: staffAuthHeaders });
  }
}
export default function Account({ loaderData: { account, csrf } }: Route.ComponentProps) {
  return <div className="container public-page account-page"><header className="public-page-intro"><div className="eyebrow orange">YOUR CARROTTCRUNCH ACCOUNT</div><h1>Welcome, <span>{account.displayName}</span>.</h1></header>
    <div className="public-card"><h2>Discord identity</h2>{account.avatarUrl && <img className="account-avatar" src={account.avatarUrl} width="64" height="64" alt="" referrerPolicy="no-referrer" />}<p>Username: {account.username}</p><p>Display name: {account.displayName}</p><p>This account uses your Discord identity. Advanced profiles and Minecraft linking are not available yet.</p></div>
    <div className="public-page-actions">{account.canAccessControl && <Link className="button secondary" to="/control">Crunch Control</Link>}<Form method="post" action="/logout" reloadDocument><input type="hidden" name="_csrf" value={csrf} /><button className="button secondary">Sign Out</button></Form></div>
  </div>;
}
export function ErrorBoundary() { return <div className="container public-page"><h1>Account unavailable.</h1><p className="content-empty">Please try again later.</p><Link to="/">Return to the public website</Link></div>; }
