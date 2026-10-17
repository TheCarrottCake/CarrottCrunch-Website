import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finishDiscordLogin } from '../app/lib/staff-auth.server.ts';

// No live provider requests or local environment files. All credentials are fictional.
const origin = 'https://auth.example.test';
const endpoints = [
  'https://discord.com/api/oauth2/token',
  'https://discord.com/api/v10/users/@me',
  'https://discord.com/api/oauth2/token/revoke',
];
function fixture() {
  const writes = [];
  const db = {
    prepare(sql) { return {
      bind() { return this; },
      async first() { return sql.startsWith('DELETE FROM staff_oauth_transactions') ? { verifier: 'c'.repeat(64) } : null; },
    }; },
    async batch(statements) { writes.push(statements); return []; },
  };
  return {
    writes,
    env: { CONTENT_DB: db, CONTROL_ORIGIN: origin, DISCORD_CLIENT_ID: '100000000000000099',
      DISCORD_CLIENT_SECRET: 'fictional-client-secret', AUTH_CSRF_SECRET: 'fictional-csrf-secret-at-least-32-characters' },
    request: new Request(`${origin}/control/auth/callback?state=${'a'.repeat(64)}&code=fictional-code`, {
      headers: { Cookie: `__Host-cc_oauth=${'b'.repeat(64)}` },
    }),
  };
}
function success(index) {
  if (index === 0) return Response.json({ access_token: 'fictional-access-token', token_type: 'Bearer', scope: 'identify', expires_in: 3600 });
  if (index === 1) return Response.json({ id: '100000000000000001', username: 'fictional_member' });
  return new Response(null);
}

test('all OAuth provider fetches use manual redirects and preserve their timeout budgets', async t => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  const signals = new WeakMap();
  t.mock.method(AbortSignal, 'timeout', milliseconds => {
    const signal = timeout(milliseconds);
    signals.set(signal, milliseconds);
    return signal;
  });
  const { env, request } = fixture();
  const calls = [];
  const fetcher = async (url, options) => {
    const index = endpoints.indexOf(String(url));
    assert.notEqual(index, -1, 'credentials may only be sent to fixed Discord endpoints');
    assert.equal(options.redirect, 'manual');
    assert.equal(signals.get(options.signal), index === 2 ? 4000 : 8000);
    assert.equal(options.signal.aborted, false);
    calls.push(String(url));
    return success(index);
  };
  const result = await finishDiscordLogin(request, env, false, fetcher);
  assert.equal(result.headers.get('Location'), '/account');
  assert.deepEqual(calls, endpoints);
});

test('every 3xx and opaque provider redirect is rejected without following Location or parsing its body', async () => {
  for (const index of [0, 1, 2]) {
    for (const status of [...Array.from({ length: 100 }, (_, i) => 300 + i), 'opaque']) {
      const { env, request, writes } = fixture();
      const response = status === 'opaque' ? Response.error() : new Response(null, {
        status, headers: { Location: 'https://redirect-target.example.invalid/never-request' },
      });
      let inspected = false;
      const responseType = status === 'opaque' ? 'opaqueredirect' : response.type;
      Object.defineProperty(response, 'type', { get() { inspected = true; return responseType; } });
      response.text = async () => { assert.fail('redirect response body must not be parsed'); };
      const calls = [];
      const fetcher = async (url, options) => {
        assert.equal(options.redirect, 'manual');
        const endpoint = endpoints.indexOf(String(url));
        assert.notEqual(endpoint, -1, 'redirect destination must never receive credentials');
        calls.push(String(url));
        return endpoint === index ? response : success(endpoint);
      };
      const result = await finishDiscordLogin(request, env, false, fetcher);
      assert.equal(inspected, true, 'revocation responses must also be checked');
      if (index === 2) {
        // Revocation remains best effort; rejection never undoes an established login.
        assert.equal(result.headers.get('Location'), '/account');
        assert.deepEqual(calls, endpoints);
        assert.equal(writes.length, 1);
      } else {
        assert.equal(result.headers.get('Location'), '/login?error=failed');
        assert.doesNotMatch(result.headers.get('Set-Cookie'), /cc_session/);
        assert.equal(writes.length, 0, 'failed provider responses cannot create an account/session');
        assert.deepEqual(calls, index === 0 ? endpoints.slice(0, 1) : endpoints);
      }
    }
  }
});
