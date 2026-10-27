import { MediaError } from './media-db.server.ts';
import { requireContentDatabase } from './content-db.server.ts';
import { AuthError, requireStaff, requireStaffAction, staffAuthHeaders, staffCsrfToken, type AuthEnvironment } from './staff-auth.server.ts';

export const studioHeaders = { ...staffAuthHeaders, 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export class StudioError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export async function studioSession(request: Request, env: AuthEnvironment, mutation = false, development = false) {
  if (mutation && request.method !== 'POST') throw new StudioError('Method not allowed.', 405);
  const session = mutation ? await requireStaffAction(request, env, 'Moderator', development) : await requireStaff(request, env, 'Moderator', development);
  return { session, db: requireContentDatabase(env) };
}
export async function studioIdentity(session: Awaited<ReturnType<typeof requireStaff>>, env: AuthEnvironment) {
  return { identity: { username: session.username, displayName: session.display_name }, role: session.role, csrf: await staffCsrfToken(session, env) };
}
export function studioFailure(error: unknown) {
  if (error instanceof Response) return error;
  const status = (error instanceof StudioError || error instanceof MediaError) ? error.status : error instanceof AuthError && ['denied', 'csrf'].includes(error.code) ? 403 : 503;
  const message = (error instanceof StudioError || error instanceof MediaError) ? error.message : status === 403 ? 'An authorized staff account and a valid same-origin request are required.' : 'Content Studio is unavailable. Check local database migrations or try again later.';
  return new Response(message, { status, headers: studioHeaders });
}

export async function draftHistory(db: D1Database, id: string) {
  // Only safe presentation fields leave the server; no actor identifiers or full audit payloads.
  const result = await db.prepare(`SELECT r.revision,r.created_at,COALESCE(NULLIF(u.display_name,''),u.username) AS author
    FROM content_revisions r LEFT JOIN site_users u ON u.discord_user_id=r.actor_id
    WHERE r.content_id=? ORDER BY r.revision DESC LIMIT 20`).bind(id).all<{ revision: number; created_at: number; author: string | null }>();
  return result.results;
}
