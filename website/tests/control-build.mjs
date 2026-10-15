// Post-build check of real route loaders/actions with isolated D1 and mocked Discord.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from 'wrangler';
import { beginDiscordLogin, finishDiscordLogin } from '../app/lib/staff-auth.server.ts';

const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', environment: 'content_dev', persist: false, remoteBindings: false, envFiles: [] });
try {
  const db = proxy.env.CONTENT_DB;
  for (const name of (await readdir('migrations')).filter(name => name.endsWith('.sql')).sort()) await db.batch(splitSql(await readFile(`migrations/${name}`, 'utf8')).map(sql => db.prepare(sql)));
  const bundles = (await readdir('build/server/assets')).filter(name => name.startsWith('server-build-') && name.endsWith('.js'));
  assert.equal(bundles.length, 1, 'Run npm run build first');
  const build = await import(pathToFileURL(resolve('build/server/assets', bundles[0])).href);
  const control = build.routes['routes/control'].module;
  const logout = build.routes['routes/control-logout'].module;
  const origin = 'https://staff.example.test';
  const env = { CONTENT_DB: db, CONTROL_ORIGIN: origin, DISCORD_CLIENT_ID: '100000000000000099', DISCORD_CLIENT_SECRET: 'fictional-client-secret', AUTH_CSRF_SECRET: 'fictional-csrf-secret-32-characters-long', INITIAL_OWNER_DISCORD_ID: '100000000000000001' };
  const context = { get: () => env };
  await assert.rejects(control.loader({ request: new Request(origin + '/control'), context, params: {} }), result => result.status === 302 && result.headers.get('Location') === '/control/login');
  const start = await beginDiscordLogin(new Request(origin + '/control/auth/start', { method: 'POST', headers: { Origin: origin } }), env);
  const state = new URL(start.headers.get('Location')).searchParams.get('state');
  const cookie = start.headers.getSetCookie()[0].split(';')[0];
  const response = await finishDiscordLogin(new Request(`${origin}/control/auth/callback?state=${state}&code=test-code`, { headers: { Cookie: cookie } }), env, false, async input => {
    if (String(input).endsWith('/token/revoke')) return new Response(null);
    if (String(input).endsWith('/token')) return Response.json({ access_token: 'fictional-access-token', token_type: 'Bearer', scope: 'identify', expires_in: 3600 });
    return Response.json({ id: env.INITIAL_OWNER_DISCORD_ID, username: 'fictional_staff', global_name: 'Fictional Staff' });
  });
  assert.equal(response.headers.get('Location'), '/control');
  const sessionCookie = response.headers.getSetCookie().map(value => value.split(';')[0]).filter(value => !value.endsWith('=')).join('; ');
  const request = new Request(origin + '/control', { headers: { Cookie: sessionCookie } });
  const result = await control.loader({ request, context, params: {} });
  assert.deepEqual(Object.keys(result.data).sort(), ['csrf', 'identity', 'role']);
  assert.deepEqual(result.data.identity, { username: 'fictional_staff', displayName: 'Fictional Staff' });
  assert.equal(result.data.role, 'Owner');
  assert.doesNotMatch(JSON.stringify(result.data), /token_hash|discord_user_id|fictional-access-token|fictional-client-secret/);
  const loggedOut = await logout.action({ request: new Request(origin + '/control/logout', { method: 'POST', headers: { Origin: origin, Cookie: sessionCookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `_csrf=${result.data.csrf}` }), context, params: {} });
  assert.equal(loggedOut.status, 303);
  await assert.rejects(control.loader({ request, context, params: {} }), result => result.status === 302);
  for (const name of (await readdir('build/client/assets')).filter(name => name.endsWith('.js'))) {
    assert.doesNotMatch(await readFile(`build/client/assets/${name}`, 'utf8'), /DISCORD_CLIENT_SECRET|AUTH_CSRF_SECRET|staff_oauth_transactions|staff_sessions/);
  }
  console.log('Built control loader/action checks passed: anonymous denial, verified Owner welcome DTO, logout revocation, and server-only authentication code.');
} finally { await proxy.dispose(); }
