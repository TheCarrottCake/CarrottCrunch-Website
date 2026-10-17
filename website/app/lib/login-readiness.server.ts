import { authConfiguration, currentSiteSession, type AuthEnvironment } from './staff-auth.server.ts';

/** Fixed categories and booleans only: safe for server logs, never include caught errors. */
export async function loginReadiness(request: Request, env: AuthEnvironment, development = false) {
  const flags = {
    databaseBinding: !!env.CONTENT_DB, configuration: false, originMatch: false, usersQuery: false,
    requestHttps: false, requestHostMatch: false, forwardedHostMatch: false, forwardedHttps: false,
  };
  let failedStage: 'configuration' | 'users-query' | 'origin' | 'session' = 'configuration';
  try {
    const config = authConfiguration(env, development);
    flags.configuration = true;
    flags.originMatch = new URL(request.url).origin === config.origin;
    flags.requestHttps = new URL(request.url).protocol === 'https:';
    flags.requestHostMatch = new URL(request.url).host === new URL(config.origin).host;
    flags.forwardedHostMatch = request.headers.get('X-Forwarded-Host') === new URL(config.origin).host;
    flags.forwardedHttps = request.headers.get('X-Forwarded-Proto') === 'https';
    failedStage = 'users-query';
    const result = await config.db.prepare('SELECT discord_user_id FROM site_users LIMIT 1').all();
    if (!result.success) throw new Error('Database unavailable');
    flags.usersQuery = true;
    failedStage = 'origin';
    // Keep the same strict origin requirement used by OAuth and protected routes.
    if (!flags.originMatch) return { configured: false, authenticated: false, diagnostic: { ...flags, failedStage } };
    failedStage = 'session';
    const authenticated = !!await currentSiteSession(request, env, development);
    return { configured: true, authenticated, diagnostic: { ...flags, failedStage: null } };
  } catch {
    return { configured: false, authenticated: false, diagnostic: { ...flags, failedStage } };
  }
}
