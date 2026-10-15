import type { Route } from './+types/control-auth-start';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, authFailure, beginDiscordLogin, staffAuthHeaders } from '../lib/staff-auth.server';
export function loader() { return new Response('Method not allowed', { status: 405, headers: { ...staffAuthHeaders, Allow: 'POST' } }); }
export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return loader();
  try { return await beginDiscordLogin(request, context.get(contentEnvironmentContext), import.meta.env.DEV); }
  catch (error) { return authFailure(error instanceof AuthError ? error.code : 'unavailable'); }
}
