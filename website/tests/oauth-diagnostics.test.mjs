import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { AuthError, authFailure, finishDiscordLogin, reportCallbackFailure, staffAuthHeaders } from '../app/lib/staff-auth.server.ts';

// Synthetic fixtures only; no local bindings, credentials, or provider requests.
const origin = 'https://auth.example.test';
const state = 'a'.repeat(64), browser = 'b'.repeat(64);
const privateMarker = 'PRIVATE_DATA_MUST_NEVER_BE_LOGGED';
const identity = '100000000000000001';
function fixture(failure) {
  let batches = 0;
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.startsWith('DELETE FROM staff_oauth_transactions')) {
            if (failure === 'transaction-db') throw Error(privateMarker);
            return failure === 'transaction-missing' ? null : { verifier: 'c'.repeat(64) };
          }
          if (failure === 'staff-role') throw Error(privateMarker);
          return null;
        },
      };
    },
    async batch() {
      batches++;
      if (failure === 'owner-bootstrap' && batches === 1 || failure === 'account-session' && batches === 2) throw Error(privateMarker);
      return [];
    },
  };
  const env = {
    CONTENT_DB: db, CONTROL_ORIGIN: origin, DISCORD_CLIENT_ID: '100000000000000099',
    DISCORD_CLIENT_SECRET: privateMarker, AUTH_CSRF_SECRET: privateMarker,
    INITIAL_OWNER_DISCORD_ID: identity,
  };
  const calls = [];
  const fetcher = async input => {
    calls.push(String(input));
    if (String(input).endsWith('/token/revoke')) return new Response(null);
    if (String(input).endsWith('/token')) {
      if (failure === 'exchange-network') throw Error(privateMarker);
      if (failure === 'exchange-http') return new Response(privateMarker, { status: 401 });
      if (failure === 'token-json') return new Response(privateMarker);
      return Response.json({ access_token: privateMarker, token_type: failure === 'token-fields' ? privateMarker : 'Bearer', scope: 'identify', expires_in: 3600 });
    }
    if (failure === 'user-network') throw Error(privateMarker);
    if (failure === 'user-http') return new Response(privateMarker, { status: 503 });
    if (failure === 'user-json') return new Response(privateMarker);
    return Response.json({ id: failure === 'user-fields' ? privateMarker : identity, username: privateMarker });
  };
  const request = new Request(`${origin}/control/auth/callback?state=${state}&code=${privateMarker}`, {
    headers: { Cookie: `__Host-cc_oauth=${browser}` },
  });
  if (failure === 'callback-validation') request.headers.delete('Cookie');
  if (failure === 'configuration') delete env.CONTENT_DB;
  return { env, request, fetcher, calls };
}

test('callback failures report only fixed stages/categories and HTTP status, exclusively in development', async t => {
  const cases = [
    ['configuration', 'configuration', 'unavailable', 'unavailable'],
    ['callback-validation', 'callback-validation', 'invalid-callback', 'invalid'],
    ['transaction-db', 'oauth-transaction', 'database', 'failed'],
    ['transaction-missing', 'oauth-transaction', 'invalid-transaction', 'invalid'],
    ['exchange-network', 'code-exchange', 'network', 'failed'],
    ['exchange-http', 'code-exchange', 'http', 'failed', 401],
    ['token-json', 'token-validation', 'invalid-response', 'failed'],
    ['token-fields', 'token-validation', 'invalid-response', 'failed'],
    ['user-network', 'user-lookup', 'network', 'failed'],
    ['user-http', 'user-lookup', 'http', 'failed', 503],
    ['user-json', 'user-lookup', 'invalid-response', 'failed'],
    ['user-fields', 'user-lookup', 'invalid-response', 'failed'],
    ['owner-bootstrap', 'owner-bootstrap', 'database', 'failed'],
    ['account-session', 'account-session', 'database', 'failed'],
    ['staff-role', 'staff-role', 'database', 'failed'],
  ];
  const warn = t.mock.method(console, 'warn', () => {});
  for (const development of [false, true]) {
    for (const [failure, stage, category, code, status] of cases) {
      warn.mock.resetCalls();
      const { env, request, fetcher, calls } = fixture(failure);
      if (failure === 'configuration') await assert.rejects(finishDiscordLogin(request, env, development, fetcher), error => error.code === code);
      else {
        const response = await finishDiscordLogin(request, env, development, fetcher);
        assert.equal(response.status, 303);
        assert.equal(response.headers.get('Location'), `/login?error=${code}`);
        assert.equal(await response.text(), '');
        assert.doesNotMatch(JSON.stringify([...response.headers]), /PRIVATE_|category|stage|status/);
        assert.doesNotMatch(response.headers.get('Set-Cookie'), /cc_session/);
      }
      assert.equal(warn.mock.callCount(), development ? 1 : 0, failure);
      if (development) {
        assert.deepEqual(warn.mock.calls[0].arguments, ['[auth-callback]', JSON.stringify({ stage, category, ...(status === undefined ? {} : { status }) })]);
        assert.doesNotMatch(JSON.stringify(warn.mock.calls), new RegExp(`${privateMarker}|${state}|${browser}|${origin}`));
      }
      if (['token-fields', 'user-network', 'user-http', 'user-json', 'user-fields', 'owner-bootstrap', 'account-session', 'staff-role'].includes(failure)) {
        assert.ok(calls.some(url => url.endsWith('/token/revoke')), 'validated token still revoked on failure');
      }
    }
  }
});

test('successful callbacks are silent and logging failures cannot change the redirect', async t => {
  const warn = t.mock.method(console, 'warn', () => { throw Error(privateMarker); });
  const success = fixture();
  const response = await finishDiscordLogin(success.request, success.env, true, success.fetcher);
  assert.equal(response.headers.get('Location'), '/account');
  assert.match(response.headers.get('Set-Cookie'), /__Host-cc_session=.*HttpOnly; SameSite=Lax; Max-Age=28800; Secure/);
  assert.equal(warn.mock.callCount(), 0);
  const failure = fixture('exchange-http');
  assert.equal((await finishDiscordLogin(failure.request, failure.env, true, failure.fetcher)).headers.get('Location'), '/login?error=failed');
});

test('callback route reports context failure only in development and preserves generic public errors', async t => {
  const warn = t.mock.method(console, 'warn', () => {});
  const source = await readFile('app/routes/control-auth-callback.ts', 'utf8');
  for (const development of [false, true]) {
    warn.mock.resetCalls();
    const module = { exports: {} };
    const imports = {
      '../lib/cloudflare-context.server': { contentEnvironmentContext: Symbol('test-context') },
      '../lib/staff-auth.server': { AuthError, authFailure, finishDiscordLogin, reportCallbackFailure, staffAuthHeaders },
    };
    const output = ts.transpileModule(source.replaceAll('import.meta.env.DEV', String(development)), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(output, { module, exports: module.exports, Response, require: key => {
      assert.ok(key in imports, `Unexpected route import: ${key}`);
      return imports[key];
    } });
    const response = await module.exports.loader({ request: fixture().request, context: { get() { throw Error(privateMarker); } } });
    assert.equal(response.headers.get('Location'), '/login?error=failed');
    assert.equal(await response.text(), '');
    assert.equal(warn.mock.callCount(), development ? 1 : 0);
    if (development) assert.deepEqual(warn.mock.calls[0].arguments, ['[auth-callback]', '{"stage":"route-context","category":"unavailable"}']);
    warn.mock.resetCalls();
    const configurationFailure = await module.exports.loader({ request: fixture().request, context: { get() { return {}; } } });
    assert.equal(configurationFailure.headers.get('Location'), '/login?error=unavailable');
    assert.equal(warn.mock.callCount(), development ? 1 : 0, 'configuration is reported once');
    if (development) assert.deepEqual(warn.mock.calls[0].arguments, ['[auth-callback]', '{"stage":"configuration","category":"unavailable"}']);
    assert.equal(module.exports.action().status, 405);
  }
});
