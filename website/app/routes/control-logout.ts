import type { Route } from './+types/control-logout';
import { contentEnvironmentContext } from '../lib/cloudflare-context.server';
import { AuthError, logoutStaff, staffAuthHeaders } from '../lib/staff-auth.server';
export function loader() { return new Response('Method not allowed', { status: 405, headers: { ...staffAuthHeaders, Allow: 'POST' } }); }
export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== 'POST') return loader();
  try { return await logoutStaff(request, context.get(contentEnvironmentContext), import.meta.env.DEV); }
  catch (error) {
    return new Response(error instanceof AuthError && error.code === 'csrf' ? 'Request could not be verified. Reload and try again.' : 'Sign-out is unavailable. Return to sign-in.', {
      status: error instanceof AuthError && error.code !== 'unavailable' ? 403 : 503, headers: staffAuthHeaders,
    });
  }
}
