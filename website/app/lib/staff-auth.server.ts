/** Server-only authentication. Never log Requests, cookies, provider responses, or errors here. */
export type StaffRole = 'Moderator' | 'Administrator' | 'Owner';
export type AuthEnvironment = {
  CONTENT_DB?: D1Database;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  CONTROL_ORIGIN?: string;
  AUTH_CSRF_SECRET?: string;
  INITIAL_OWNER_DISCORD_ID?: string;
};
export type AuthErrorCode = 'unavailable' | 'invalid' | 'cancelled' | 'denied' | 'failed' | 'csrf';
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode) { super('Authentication request could not be completed'); this.code = code; }
}
export const staffAuthHeaders = {
  'Cache-Control': 'no-store',
  // no-referrer makes native form POSTs send Origin: null, failing strict CSRF validation.
  // Keep same-origin form origins while withholding referrers from external destinations.
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'",
};
const snowflake = /^[0-9]{17,20}$/;
const opaque = /^[a-f0-9]{64}$/;
const SESSION_MS = 8 * 60 * 60 * 1000;
const OAUTH_MS = 10 * 60 * 1000;
const ranks: Record<StaffRole, number> = { Moderator: 1, Administrator: 2, Owner: 3 };
export function permitsRole(actual: StaffRole, minimum: StaffRole): boolean {
  return Object.hasOwn(ranks, actual) && Object.hasOwn(ranks, minimum) && ranks[actual] >= ranks[minimum];
}
export function authConfiguration(env: AuthEnvironment, development = false) {
  if (!env.CONTENT_DB || (!env.DISCORD_CLIENT_ID || !snowflake.test(env.DISCORD_CLIENT_ID)) || !env.DISCORD_CLIENT_SECRET?.trim() ||
      !env.CONTROL_ORIGIN || !env.AUTH_CSRF_SECRET || env.AUTH_CSRF_SECRET.length < 32 ||
      (env.INITIAL_OWNER_DISCORD_ID !== undefined && !snowflake.test(env.INITIAL_OWNER_DISCORD_ID))) throw new AuthError('unavailable');
  let url: URL;
  try { url = new URL(env.CONTROL_ORIGIN); } catch { throw new AuthError('unavailable'); }
  const localHttp = development && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((!localHttp && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new AuthError('unavailable');
  return {
    db: env.CONTENT_DB, origin: url.origin, callback: `${url.origin}/control/auth/callback`,
    secure: url.protocol === 'https:', clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET, csrfSecret: env.AUTH_CSRF_SECRET,
  };
}
type AuthConfig = ReturnType<typeof authConfiguration>;
function checkHost(request: Request, config: AuthConfig) {
  if (new URL(request.url).origin !== config.origin) throw new AuthError('invalid');
}
function checkMutationOrigin(request: Request, config: AuthConfig) {
  checkHost(request, config);
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) || request.headers.get('Origin') !== config.origin ||
      (request.headers.has('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin')) throw new AuthError('csrf');
}
function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function hashToken(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
async function pkceChallenge(verifier: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function cookieName(config: AuthConfig, kind: 'session' | 'oauth') {
  return `${config.secure ? '__Host-' : ''}cc_${kind}`;
}
function readCookie(request: Request, name: string): string | null {
  const values = (request.headers.get('Cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return opaque.test(value) ? value : null;
}
function cookie(config: AuthConfig, kind: 'session' | 'oauth', value: string, seconds: number) {
  return `${cookieName(config, kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${config.secure ? '; Secure' : ''}`;
}
function responseRedirect(path: string, cookies: string[] = []): Response {
  const headers = new Headers(staffAuthHeaders);
  headers.set('Location', path);
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 303, headers });
}
export function authFailure(code: AuthErrorCode): Response {
  return responseRedirect(`/login?error=${code}`);
}

export async function beginDiscordLogin(request: Request, env: AuthEnvironment, development = false, now = Date.now()): Promise<Response> {
  const config = authConfiguration(env, development);
  if (request.method !== 'POST') throw new AuthError('csrf');
  checkMutationOrigin(request, config);
  const state = randomToken();
  const browser = randomToken();
  const verifier = randomToken();
  const previous = readCookie(request, cookieName(config, 'oauth'));
  await config.db.batch([
    config.db.prepare('DELETE FROM staff_oauth_transactions WHERE expires_at <= ? OR browser_hash = ?').bind(now, previous ? await hashToken(previous) : ''),
    config.db.prepare('INSERT INTO staff_oauth_transactions(state_hash,browser_hash,verifier,created_at,expires_at) VALUES (?,?,?,?,?)')
      .bind(await hashToken(state), await hashToken(browser), verifier, now, now + OAUTH_MS),
  ]);
  const destination = new URL('https://discord.com/oauth2/authorize');
  destination.search = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.callback, response_type: 'code', scope: 'identify',
    state, code_challenge: await pkceChallenge(verifier), code_challenge_method: 'S256',
  }).toString();
  return responseRedirect(destination.href, [cookie(config, 'oauth', browser, OAUTH_MS / 1000)]);
}

function providerResponseFailed(response: Response): boolean {
  // workerd requires manual redirects. Reject every redirect without reading Location or following it.
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400) || !response.ok;
}
async function providerJson(response: Response): Promise<Record<string, unknown>> {
  if (providerResponseFailed(response)) throw new AuthError('failed');
  const text = await response.text();
  if (text.length > 262144) throw new AuthError('failed');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new AuthError('failed'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AuthError('failed');
  return value as Record<string, unknown>;
}
async function bootstrapOwner(env: AuthEnvironment, id: string, now: number) {
  if (env.INITIAL_OWNER_DISCORD_ID !== id) return;
  const db = env.CONTENT_DB!;
  await db.batch([
    db.prepare(`INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at)
      SELECT ?, 'Owner', ?, ? WHERE NOT EXISTS(SELECT 1 FROM staff_bootstrap)
      AND NOT EXISTS(SELECT 1 FROM staff_accounts) ON CONFLICT(discord_user_id) DO NOTHING`).bind(id, now, now),
    db.prepare(`INSERT INTO staff_bootstrap(singleton,initial_owner_id,created_at)
      SELECT 1,discord_user_id,? FROM staff_accounts WHERE discord_user_id=? AND role='Owner'
      ON CONFLICT(singleton) DO NOTHING`).bind(now, id),
  ]);
}

type CallbackStage = 'route-context' | 'configuration' | 'callback-validation' | 'oauth-transaction' |
  'code-exchange' | 'token-validation' | 'user-lookup' | 'owner-bootstrap' | 'account-session' | 'staff-role';
type CallbackCategory = 'unavailable' | 'invalid-callback' | 'database' | 'invalid-transaction' |
  'provider-cancelled' | 'provider-error' | 'invalid-code' | 'network' | 'http' | 'invalid-response' | 'internal';

/** Only fixed labels and HTTP status may reach logs. Never pass caught errors or request/provider data. */
export function reportCallbackFailure(development: boolean, stage: CallbackStage, category: CallbackCategory, status?: number) {
  if (!development) return;
  try {
    console.warn('[auth-callback]', JSON.stringify({ stage, category, ...(status === undefined ? {} : { status }) }));
  } catch { /* Diagnostics must not change authentication behavior. */ }
}

export async function finishDiscordLogin(request: Request, env: AuthEnvironment, development = false, fetcher: typeof fetch = fetch, now = Date.now()): Promise<Response> {
  let config: AuthConfig;
  try { config = authConfiguration(env, development); }
  catch (error) {
    reportCallbackFailure(development, 'configuration', 'unavailable');
    throw error;
  }
  const clear = cookie(config, 'oauth', '', 0);
  let accessToken: string | undefined;
  let stage: CallbackStage = 'callback-validation';
  let category: CallbackCategory = 'invalid-callback';
  let status: number | undefined;
  try {
    checkHost(request, config);
    const params = new URL(request.url).searchParams;
    if (request.method !== 'GET' || ['state', 'code', 'error'].some(name => params.getAll(name).length > 1)) throw new AuthError('invalid');
    const state = params.get('state');
    const browser = readCookie(request, cookieName(config, 'oauth'));
    if (!state || !opaque.test(state) || !browser) throw new AuthError('invalid');
    // Atomic consumption before any network call prevents concurrent callback replay.
    stage = 'oauth-transaction'; category = 'database';
    const transaction = await config.db.prepare(`DELETE FROM staff_oauth_transactions
      WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING verifier`)
      .bind(await hashToken(state), await hashToken(browser), now).first<{ verifier: string }>();
    category = 'invalid-transaction';
    if (!transaction) throw new AuthError('invalid');
    stage = 'callback-validation';
    category = params.get('error') === 'access_denied' ? 'provider-cancelled' : 'provider-error';
    if (params.has('error')) throw new AuthError(params.get('error') === 'access_denied' ? 'cancelled' : 'failed');
    category = 'invalid-code';
    const code = params.get('code');
    if (!code || !/^[A-Za-z0-9._~-]{1,2048}$/.test(code)) throw new AuthError('failed');
    stage = 'code-exchange'; category = 'network';
    const tokenResponse = await fetcher('https://discord.com/api/oauth2/token', {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
        grant_type: 'authorization_code', code, redirect_uri: config.callback, code_verifier: transaction.verifier }),
    });
    if (providerResponseFailed(tokenResponse)) { category = 'http'; status = tokenResponse.status; throw new AuthError('failed'); }
    stage = 'token-validation'; category = 'invalid-response';
    const token = await providerJson(tokenResponse);
    if (typeof token.access_token !== 'string' || !/^[A-Za-z0-9._~-]{16,2048}$/.test(token.access_token)) throw new AuthError('failed');
    accessToken = token.access_token;
    if (typeof token.token_type !== 'string' || token.token_type.toLowerCase() !== 'bearer' ||
        token.scope !== 'identify' || !Number.isSafeInteger(token.expires_in) || Number(token.expires_in) <= 0) throw new AuthError('failed');
    stage = 'user-lookup'; category = 'network';
    const userResponse = await fetcher('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }, redirect: 'manual', signal: AbortSignal.timeout(8000),
    });
    if (providerResponseFailed(userResponse)) { category = 'http'; status = userResponse.status; throw new AuthError('failed'); }
    category = 'invalid-response';
    const user = await providerJson(userResponse);
    if (typeof user.id !== 'string' || !snowflake.test(user.id) || user.bot === true ||
        typeof user.username !== 'string' || !user.username.trim() || user.username.length > 80 ||
        (user.global_name !== null && user.global_name !== undefined && (typeof user.global_name !== 'string' || user.global_name.length > 80)) ||
        (user.avatar !== null && user.avatar !== undefined && (typeof user.avatar !== 'string' || !/^(?:a_)?[a-f0-9]{32}$/.test(user.avatar)))) throw new AuthError('failed');
    stage = 'owner-bootstrap'; category = 'database';
    await bootstrapOwner(env, user.id, now);
    stage = 'account-session'; category = 'internal';
    const rawSession = randomToken();
    const sessionHash = await hashToken(rawSession);
    const expires = now + SESSION_MS;
    const previous = readCookie(request, cookieName(config, 'session'));
    category = 'database';
    await config.db.batch([
      config.db.prepare(`INSERT INTO site_users(discord_user_id,username,display_name,avatar_ref,created_at,updated_at)
        VALUES (?,?,?,?,?,?) ON CONFLICT(discord_user_id) DO UPDATE SET
        username=excluded.username, display_name=excluded.display_name, avatar_ref=excluded.avatar_ref, updated_at=excluded.updated_at`)
        .bind(user.id, user.username, typeof user.global_name === 'string' && user.global_name ? user.global_name : user.username,
          typeof user.avatar === 'string' ? user.avatar : null, now, now),
      config.db.prepare('INSERT INTO site_sessions(token_hash,discord_user_id,created_at,expires_at) VALUES (?,?,?,?)')
        .bind(sessionHash, user.id, now, expires),
      config.db.prepare('DELETE FROM site_sessions WHERE token_hash=?').bind(previous ? await hashToken(previous) : ''),
    ]);
    stage = 'staff-role';
    const staff = await config.db.prepare('SELECT role FROM staff_accounts WHERE discord_user_id=? AND active=1').bind(user.id).first();
    return responseRedirect(staff ? '/control' : '/account', [clear, cookie(config, 'session', rawSession, SESSION_MS / 1000)]);
  } catch (error) {
    reportCallbackFailure(development, stage, category, status);
    const code = error instanceof AuthError ? error.code : 'failed';
    return responseRedirect(`/login?error=${code}`, [clear]);
  } finally {
    // No token persistence/refresh. Revoke after identity lookup, even for denied users.
    if (accessToken) {
      try {
        const revoked = await fetcher('https://discord.com/api/oauth2/token/revoke', {
          method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(4000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, token: accessToken, token_type_hint: 'access_token' }),
        });
        if (providerResponseFailed(revoked)) throw new AuthError('failed');
      } catch { /* Best effort; never emit provider responses or credentials. */ }
    }
  }
}

export type SiteSession = {
  token_hash: string; discord_user_id: string; role: StaffRole | null; username: string; display_name: string; avatar_ref: string | null;
};
export type StaffSession = SiteSession & { role: StaffRole };
export async function currentSiteSession(request: Request, env: AuthEnvironment, development = false, now = Date.now()): Promise<SiteSession | null> {
  const config = authConfiguration(env, development);
  checkHost(request, config);
  const raw = readCookie(request, cookieName(config, 'session'));
  if (!raw) return null;
  return config.db.prepare(`SELECT s.token_hash,u.discord_user_id,u.username,u.display_name,u.avatar_ref,
    CASE WHEN a.active=1 THEN a.role ELSE NULL END AS role
    FROM site_sessions s JOIN site_users u ON u.discord_user_id=s.discord_user_id
    LEFT JOIN staff_accounts a ON a.discord_user_id=u.discord_user_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.revoked_at IS NULL`)
    .bind(await hashToken(raw), now).first<SiteSession>();
}
export async function requireSiteUser(request: Request, env: AuthEnvironment, development = false, now = Date.now()): Promise<SiteSession> {
  const session = await currentSiteSession(request, env, development, now);
  if (!session) throw new AuthError('denied');
  return session;
}
export async function currentStaffSession(request: Request, env: AuthEnvironment, development = false, now = Date.now()): Promise<StaffSession | null> {
  const session = await currentSiteSession(request, env, development, now);
  return session?.role ? session as StaffSession : null;
}
export function accountPresentation(session: SiteSession) {
  return {
    username: session.username, displayName: session.display_name,
    avatarUrl: session.avatar_ref ? `https://cdn.discordapp.com/avatars/${session.discord_user_id}/${session.avatar_ref}.png?size=64` : null,
    canAccessControl: session.role !== null,
  };
}
export async function requireStaff(request: Request, env: AuthEnvironment, minimum: StaffRole = 'Moderator', development = false, now = Date.now()): Promise<StaffSession> {
  const session = await currentStaffSession(request, env, development, now);
  if (!session) throw new AuthError('denied');
  if (!permitsRole(session.role, minimum)) throw new AuthError('denied');
  return session;
}
export async function staffCsrfToken(session: Pick<SiteSession, 'token_hash'>, env: AuthEnvironment): Promise<string> {
  if (!env.AUTH_CSRF_SECRET || env.AUTH_CSRF_SECRET.length < 32) throw new AuthError('unavailable');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.AUTH_CSRF_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`staff-action:${session.token_hash}`)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
function sameToken(left: string, right: string): boolean {
  if (!opaque.test(left) || !opaque.test(right)) return false;
  let difference = 0;
  for (let index = 0; index < 64; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
export async function requireSiteAction(request: Request, env: AuthEnvironment, development = false, now = Date.now()): Promise<SiteSession> {
  const config = authConfiguration(env, development);
  checkMutationOrigin(request, config);
  const session = await requireSiteUser(request, env, development, now);
  let provided = request.headers.get('X-CSRF-Token');
  if (!provided) {
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) throw new AuthError('csrf');
    // Media metadata/approval forms can exceed 16 KB after URL encoding. Bound
    // the stream at 256 KiB before decoding rather than buffering an unlimited request.
    const reader = request.clone().body?.getReader();
    if (!reader) throw new AuthError('csrf');
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 262144) { void reader.cancel(); throw new AuthError('csrf'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const text = new TextDecoder().decode(bytes);
    const params = new URLSearchParams(text);
    if (params.getAll('_csrf').length !== 1) throw new AuthError('csrf');
    provided = params.get('_csrf');
  }
  if (!provided || !sameToken(provided, await staffCsrfToken(session, env))) throw new AuthError('csrf');
  return session;
}
export async function requireStaffAction(request: Request, env: AuthEnvironment, minimum: StaffRole = 'Moderator', development = false, now = Date.now()): Promise<StaffSession> {
  const session = await requireSiteAction(request, env, development, now);
  if (!session.role || !permitsRole(session.role, minimum)) throw new AuthError('denied');
  return session as StaffSession;
}
export async function logoutStaff(request: Request, env: AuthEnvironment, development = false, now = Date.now()): Promise<Response> {
  const config = authConfiguration(env, development);
  if (request.method !== 'POST') throw new AuthError('csrf');
  checkMutationOrigin(request, config);
  const current = await currentSiteSession(request, env, development, now);
  const statements: D1PreparedStatement[] = [];
  if (current) {
    const session = await requireSiteAction(request, env, development, now);
    statements.push(config.db.prepare('DELETE FROM site_sessions WHERE token_hash=?').bind(session.token_hash));
  } else {
    // Idempotent logout of expired/revoked credentials cannot grant access.
    const raw = readCookie(request, cookieName(config, 'session'));
    if (raw) statements.push(config.db.prepare('DELETE FROM site_sessions WHERE token_hash=?').bind(await hashToken(raw)));
  }
  const pending = readCookie(request, cookieName(config, 'oauth'));
  if (pending) statements.push(config.db.prepare('DELETE FROM staff_oauth_transactions WHERE browser_hash=?').bind(await hashToken(pending)));
  if (statements.length) await config.db.batch(statements);
  return responseRedirect('/login', [cookie(config, 'session', '', 0), cookie(config, 'oauth', '', 0)]);
}

// Historical exports remain for existing protected routes; these use the same site session.
export const logoutSite = logoutStaff;
