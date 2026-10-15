import type { Route } from './+types/control-auth-callback';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, authFailure, finishDiscordLogin, staffAuthHeaders } from '../lib/staff-auth.server';
export async function loader({ request, context }: Route.LoaderArgs) {
  try { return await finishDiscordLogin(request, context.get(contentEnvironmentContext), import.meta.env.DEV); }
  catch (error) { return authFailure(error instanceof AuthError ? error.code : 'failed'); }
}
export function action() { return new Response('Method not allowed', { status: 405, headers: { ...staffAuthHeaders, Allow: 'GET' } }); }
