import type { Route } from './+types/control-auth-callback';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, authFailure, finishDiscordLogin, reportCallbackFailure, staffAuthHeaders } from '../lib/staff-auth.server';
export async function loader({ request, context }: Route.LoaderArgs) {
  let stage: 'route-context' | 'configuration' = 'route-context';
  try {
    const env = context.get(contentEnvironmentContext);
    stage = 'configuration';
    return await finishDiscordLogin(request, env, import.meta.env.DEV);
  } catch (error) {
    // Configuration failures are already reported by finishDiscordLogin.
    if (stage === 'route-context') reportCallbackFailure(import.meta.env.DEV, stage, 'unavailable');
    return authFailure(error instanceof AuthError ? error.code : 'failed');
  }
}
export function action() { return new Response('Method not allowed', { status: 405, headers: { ...staffAuthHeaders, Allow: 'GET' } }); }
