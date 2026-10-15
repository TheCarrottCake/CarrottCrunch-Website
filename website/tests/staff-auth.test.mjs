import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import {
  AuthError, authConfiguration, beginDiscordLogin, finishDiscordLogin, currentStaffSession,
  requireStaff, requireStaffAction, staffCsrfToken, logoutStaff, permitsRole, hashToken,
} from '../app/lib/staff-auth.server.ts';

// Fictional identities/credentials only. No live Discord requests.
const owner = '100000000000000001', moderator = '100000000000000002', administrator = '100000000000000003', outsider = '100000000000000004';
const origin = 'https://staff.example.test', now = 1800000000000;
const environment = db => ({ CONTENT_DB: db, DISCORD_CLIENT_ID: '100000000000000099', DISCORD_CLIENT_SECRET: 'fictional-test-client-secret', AUTH_CSRF_SECRET: 'fictional-test-csrf-key-32-bytes-or-more', CONTROL_ORIGIN: origin, INITIAL_OWNER_DISCORD_ID: owner });
const post = (path, cookie = '', body = '', extra = {}) => new Request(origin + path, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', ...extra }, body });
const jar = response => response.headers.getSetCookie().map(value => value.split(';')[0]).filter(value => !value.endsWith('=')).join('; ');
const errorCode = code => error => error instanceof AuthError && error.code === code;
const sessionRequest = cookie => new Request(origin + '/control', { headers: { Cookie: cookie } });
async function setup(t) {
  const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', environment: 'content_dev', persist: false, remoteBindings: false, envFiles: [] });
  t.after(() => proxy.dispose());
  const db = proxy.env.CONTENT_DB;
  for (const name of (await readdir('migrations')).filter(name => name.endsWith('.sql')).sort()) await db.batch(splitSql(await readFile(`migrations/${name}`, 'utf8')).map(sql => db.prepare(sql)));
  return { db, env: environment(db) };
}
async function start(env, time = now) {
  const response = await beginDiscordLogin(post('/control/auth/start'), env, false, time);
  const url = new URL(response.headers.get('Location'));
  return { response, url, cookie: jar(response), state: url.searchParams.get('state') };
}
const callback = (attempt, suffix = 'code=test-code') => new Request(`${origin}/control/auth/callback?state=${attempt.state}&${suffix}`, { headers: { Cookie: attempt.cookie } });
function provider(id = owner, overrides = {}) {
  const calls = [];
  const fetcher = async (input, init = {}) => {
    calls.push({ input: String(input), init });
    if (String(input).endsWith('/token/revoke')) return new Response(null, { status: 200 });
    if (String(input).endsWith('/token')) return Response.json({ access_token: 'fictional-access-token-not-real', token_type: 'Bearer', scope: 'identify', expires_in: 3600, ...overrides.token });
    if (String(input).endsWith('/users/@me')) return Response.json({ id, username: 'fictional_staff', global_name: 'Fictional Staff', ...overrides.user });
    throw new Error('Unexpected provider endpoint');
  };
  return { calls, fetcher };
}
async function signIn(env, id = owner) {
  const attempt = await start(env), mock = provider(id);
  const response = await finishDiscordLogin(callback(attempt), env, false, mock.fetcher, now);
  return { response, mock, cookie: jar(response) };
}
const addStaff = (db, id, role) => db.prepare('INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES (?,?,?,?)').bind(id, role, now, now).run();

test('staff configuration fails closed and browser mutation origins are enforced', async t => {
  const { env } = await setup(t);
  for (const field of ['CONTENT_DB', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'CONTROL_ORIGIN', 'AUTH_CSRF_SECRET']) assert.throws(() => authConfiguration({ ...env, [field]: undefined }), errorCode('unavailable'));
  for (const CONTROL_ORIGIN of ['http://staff.example.test', 'https://staff.example.test/other', 'https://evil@staff.example.test', 'https://staff.example.test?next=evil']) assert.throws(() => authConfiguration({ ...env, CONTROL_ORIGIN }), errorCode('unavailable'));
  assert.throws(() => authConfiguration({ ...env, INITIAL_OWNER_DISCORD_ID: 'username' }), errorCode('unavailable'));
  assert.throws(() => authConfiguration({ ...env, CONTROL_ORIGIN: 'http://localhost:5173' }), errorCode('unavailable'));
  assert.equal(authConfiguration({ ...env, CONTROL_ORIGIN: 'http://localhost:5173' }, true).secure, false);
  await assert.rejects(requireStaff(sessionRequest(''), env, 'Moderator', false, now), errorCode('denied'));
  await assert.rejects(beginDiscordLogin(post('/control/auth/start', '', '', { Origin: 'https://evil.example' }), env), errorCode('csrf'));
  await assert.rejects(beginDiscordLogin(new Request(origin + '/control/auth/start'), env), errorCode('csrf'));
  await assert.rejects(beginDiscordLogin(post('/control/auth/start', '', '', { 'Sec-Fetch-Site': 'cross-site' }), env), errorCode('csrf'));
});

test('OAuth uses identify, S256 PKCE, browser binding, atomic state consumption and secure cookies', async t => {
  const { env, db } = await setup(t);
  const attempt = await start(env);
  assert.equal(attempt.url.origin, 'https://discord.com');
  assert.equal(attempt.url.searchParams.get('scope'), 'identify');
  assert.equal(attempt.url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(attempt.url.searchParams.get('redirect_uri'), origin + '/control/auth/callback');
  assert.match(attempt.response.headers.get('Set-Cookie'), /__Host-cc_oauth=.*HttpOnly; SameSite=Lax; Max-Age=600; Secure/);
  const stored = await db.prepare('SELECT * FROM staff_oauth_transactions WHERE state_hash=?').bind(await hashToken(attempt.state)).first();
  assert.notEqual(stored.state_hash, attempt.state);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stored.verifier));
  assert.equal(Buffer.from(digest).toString('base64url'), attempt.url.searchParams.get('code_challenge'));
  const wrong = await finishDiscordLogin(new Request(callback(attempt).url, { headers: { Cookie: '__Host-cc_oauth=' + 'a'.repeat(64) } }), env, false, provider().fetcher, now);
  assert.equal(wrong.headers.get('Location'), '/control/login?error=invalid');
  const mock = provider();
  const results = await Promise.all([finishDiscordLogin(callback(attempt), env, false, mock.fetcher, now), finishDiscordLogin(callback(attempt), env, false, mock.fetcher, now)]);
  assert.deepEqual(results.map(result => result.headers.get('Location')).sort(), ['/control', '/control/login?error=invalid'].sort());
  assert.equal(mock.calls.filter(call => call.input.endsWith('/token')).length, 1);
  assert.equal(new URLSearchParams(mock.calls[0].init.body).get('code_verifier'), stored.verifier);
  assert.equal(new URLSearchParams(mock.calls[0].init.body).get('client_secret'), env.DISCORD_CLIENT_SECRET);
  assert.ok(mock.calls.some(call => call.input.endsWith('/token/revoke')));
  const success = results.find(result => result.headers.get('Location') === '/control');
  const raw = jar(success).match(/__Host-cc_session=([a-f0-9]{64})/)[1];
  const session = await requireStaff(sessionRequest(jar(success)), env, 'Owner', false, now);
  assert.equal(session.token_hash, await hashToken(raw));
  assert.notEqual(session.token_hash, raw);
  assert.match(success.headers.getSetCookie().find(value => value.startsWith('__Host-cc_session=')), /HttpOnly; SameSite=Lax; Max-Age=28800; Secure/);
  assert.equal(success.headers.get('Cache-Control'), 'no-store');
  assert.equal(success.headers.get('Referrer-Policy'), 'no-referrer');
});

test('explicit staff identity/role boundaries and one-time Owner bootstrap', async t => {
  const { env, db } = await setup(t);
  assert.equal((await signIn(env, outsider)).response.headers.get('Location'), '/control/login?error=denied');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM staff_accounts').first()).n, 0);
  await signIn(env);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM staff_bootstrap').first()).n, 1);
  await addStaff(db, moderator, 'Moderator'); await addStaff(db, administrator, 'Administrator');
  for (const [id, role] of [[owner, 'Owner'], [administrator, 'Administrator'], [moderator, 'Moderator']]) {
    const signed = await signIn(env, id), request = sessionRequest(signed.cookie);
    assert.equal((await requireStaff(request, env, role, false, now)).discord_user_id, id);
    for (const minimum of ['Moderator', 'Administrator', 'Owner']) {
      if (permitsRole(role, minimum)) assert.equal((await requireStaff(request, env, minimum, false, now)).role, role);
      else await assert.rejects(requireStaff(request, env, minimum, false, now), errorCode('denied'));
    }
  }
  const denied = await signIn(env, outsider);
  assert.doesNotMatch(denied.cookie, /cc_session/);
  await db.prepare('UPDATE staff_accounts SET active=0 WHERE discord_user_id=?').bind(owner).run();
  assert.equal((await signIn(env)).response.headers.get('Location'), '/control/login?error=denied');
  await db.prepare('DELETE FROM staff_accounts WHERE discord_user_id=?').bind(owner).run();
  assert.equal((await signIn(env)).response.headers.get('Location'), '/control/login?error=denied');
  assert.equal((await signIn({ ...env, INITIAL_OWNER_DISCORD_ID: outsider }, outsider)).response.headers.get('Location'), '/control/login?error=denied');
});

test('expired/revoked sessions, role changes, and disable/re-enable cannot retain access', async t => {
  const { env, db } = await setup(t); await signIn(env); await addStaff(db, moderator, 'Moderator');
  const first = await signIn(env, moderator), request = sessionRequest(first.cookie);
  assert.ok(await currentStaffSession(request, env, false, now + 8 * 3600000 - 1));
  assert.equal(await currentStaffSession(request, env, false, now + 8 * 3600000), null);
  await db.prepare('UPDATE staff_sessions SET revoked_at=? WHERE discord_user_id=?').bind(now, moderator).run();
  assert.equal(await currentStaffSession(request, env, false, now), null);
  const active = await signIn(env, moderator);
  await db.prepare('UPDATE staff_accounts SET active=0 WHERE discord_user_id=?').bind(moderator).run();
  await db.prepare('UPDATE staff_accounts SET active=1 WHERE discord_user_id=?').bind(moderator).run();
  assert.equal(await currentStaffSession(sessionRequest(active.cookie), env, false, now), null);
  const beforeRole = await signIn(env, moderator);
  await db.prepare("UPDATE staff_accounts SET role='Administrator' WHERE discord_user_id=?").bind(moderator).run();
  assert.equal(await currentStaffSession(sessionRequest(beforeRole.cookie), env, false, now), null);
  assert.equal((await requireStaff(sessionRequest((await signIn(env, moderator)).cookie), env, 'Administrator', false, now)).role, 'Administrator');
  assert.equal(await currentStaffSession(sessionRequest('__Host-cc_session=' + 'a'.repeat(64)), env, false, now), null);
  assert.equal(await currentStaffSession(sessionRequest(first.cookie + '; ' + first.cookie), env, false, now), null);
});

test('session-bound CSRF and same-origin logout invalidate sessions', async t => {
  const { env } = await setup(t), signed = await signIn(env);
  const session = await requireStaff(sessionRequest(signed.cookie), env, 'Owner', false, now);
  const csrf = await staffCsrfToken(session, env);
  await assert.rejects(logoutStaff(post('/control/logout', signed.cookie), env, false, now), errorCode('csrf'));
  await assert.rejects(logoutStaff(post('/control/logout', signed.cookie, `_csrf=${csrf}`, { Origin: 'https://evil.example' }), env, false, now), errorCode('csrf'));
  await assert.rejects(logoutStaff(post('/control/logout', signed.cookie, '_csrf=' + 'a'.repeat(64)), env, false, now), errorCode('csrf'));
  const other = await signIn(env);
  await assert.rejects(requireStaffAction(post('/future-action', other.cookie, `_csrf=${csrf}`), env, 'Owner', false, now), errorCode('csrf'));
  assert.ok(await requireStaffAction(post('/future-action', signed.cookie, '', { 'X-CSRF-Token': csrf }), env, 'Owner', false, now));
  const pending = await start(env);
  const result = await logoutStaff(post('/control/logout', signed.cookie + '; ' + pending.cookie, `_csrf=${csrf}`), env, false, now);
  const cancelledProvider = provider();
  assert.equal((await finishDiscordLogin(callback(pending), env, false, cancelledProvider.fetcher, now)).headers.get('Location'), '/control/login?error=invalid');
  assert.equal(cancelledProvider.calls.length, 0);
  assert.equal(result.headers.get('Location'), '/control/login');
  assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal(await currentStaffSession(sessionRequest(signed.cookie), env, false, now), null);
  assert.equal((await logoutStaff(post('/control/logout', signed.cookie), env, false, now)).status, 303);
});

test('invalid/expired OAuth state, consent cancellation, and callback failures disclose nothing private', async t => {
  const { env, db } = await setup(t), attempt = await start(env), mock = provider();
  for (const request of [
    new Request(origin + '/control/auth/callback?code=anything'),
    new Request(origin + '/control/auth/callback?state=' + 'b'.repeat(64), { headers: { Cookie: attempt.cookie } }),
    callback(attempt, 'state=duplicate&code=test-code'),
    new Request(callback(attempt).url.replace(origin, 'https://evil.example'), { headers: { Cookie: attempt.cookie } }),
  ]) assert.equal((await finishDiscordLogin(request, env, false, mock.fetcher, now)).headers.get('Location'), '/control/login?error=invalid');
  assert.equal((await finishDiscordLogin(callback(attempt), env, false, mock.fetcher, now + 600000)).headers.get('Location'), '/control/login?error=invalid');
  const cancelledAttempt = await start(env);
  const cancelled = await finishDiscordLogin(callback(cancelledAttempt, 'error=access_denied&error_description=PRIVATE_PROVIDER_ERROR'), env, false, mock.fetcher, now);
  assert.equal(cancelled.headers.get('Location'), '/control/login?error=cancelled');
  assert.equal((await finishDiscordLogin(callback(cancelledAttempt), env, false, mock.fetcher, now)).headers.get('Location'), '/control/login?error=invalid');
  assert.equal(mock.calls.length, 0);
  const broken = [
    async () => { throw new Error('PRIVATE_UPSTREAM_FAILURE'); },
    async () => new Response('PRIVATE_UPSTREAM_ERROR', { status: 500 }),
    async () => new Response('not-json'),
    provider(owner, { token: { token_type: 'unknown' } }).fetcher,
    provider(owner, { token: { scope: 'identify email' } }).fetcher,
    provider(owner, { token: { expires_in: -1 } }).fetcher,
    provider(owner, { user: { id: 'username' } }).fetcher,
    provider(owner, { user: { bot: true } }).fetcher,
  ];
  for (const fetcher of broken) {
    const failed = await finishDiscordLogin(callback(await start(env)), env, false, fetcher, now);
    assert.equal(failed.headers.get('Location'), '/control/login?error=failed');
    assert.doesNotMatch(JSON.stringify([...failed.headers]), /PRIVATE_|fictional-access|fictional-test-client/);
    assert.doesNotMatch(jar(failed), /cc_session/);
  }
  assert.equal((await db.prepare('SELECT count(*) AS n FROM staff_sessions').first()).n, 0);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM staff_bootstrap').first()).n, 0);
});

test('new login rotates the old session and ignores redirect manipulation', async t => {
  const { env } = await setup(t);
  const previous = await signIn(env);
  const started = await beginDiscordLogin(post('/control/auth/start?next=https://evil.example&redirect_uri=https://evil.example'), env, false, now);
  const authorization = new URL(started.headers.get('Location'));
  assert.equal(authorization.searchParams.get('redirect_uri'), origin + '/control/auth/callback');
  const request = new Request(`${origin}/control/auth/callback?state=${authorization.searchParams.get('state')}&code=test-code&next=https://evil.example`, {
    headers: { Cookie: jar(started) + '; ' + previous.cookie },
  });
  const result = await finishDiscordLogin(request, env, false, provider().fetcher, now);
  assert.equal(result.headers.get('Location'), '/control');
  assert.notEqual(jar(result), previous.cookie);
  assert.equal(await currentStaffSession(sessionRequest(previous.cookie), env, false, now), null);
  assert.ok(await currentStaffSession(sessionRequest(jar(result)), env, false, now));
});
