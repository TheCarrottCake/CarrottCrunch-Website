import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loginReadiness } from '../app/lib/login-readiness.server.ts';

const origin = 'https://community.example.test';
const environment = db => ({ CONTENT_DB: db, DISCORD_CLIENT_ID: '100000000000000099', DISCORD_CLIENT_SECRET: 'fictional-client-secret', AUTH_CSRF_SECRET: 'fictional-csrf-secret-at-least-32-characters', CONTROL_ORIGIN: origin });
function database({ failedQuery = false, expired = false } = {}) {
  return { prepare: () => ({
    all: async () => { if (failedQuery) throw Error('private-database-error-must-not-escape'); return { success: true, results: [] }; },
    bind: () => ({ first: async () => { assert.equal(expired, true); return null; } }),
  }) };
}

test('anonymous and expired sessions keep login available at the configured origin', async () => {
  for (const expired of [false, true]) {
    const request = new Request(origin + '/login', expired ? { headers: { Cookie: '__Host-cc_session=' + 'a'.repeat(64) } } : {});
    const result = await loginReadiness(request, environment(database({ expired })));
    assert.equal(result.configured, true);
    assert.equal(result.authenticated, false);
    assert.equal(result.diagnostic.failedStage, null);
  }
});

test('configuration and database failures disable login with sanitized diagnostics', async () => {
  const request = new Request(origin + '/login');
  const missing = await loginReadiness(request, environment(undefined));
  assert.equal(missing.configured, false);
  assert.equal(missing.diagnostic.failedStage, 'configuration');
  const broken = await loginReadiness(request, environment(database({ failedQuery: true })));
  assert.equal(broken.configured, false);
  assert.equal(broken.diagnostic.failedStage, 'users-query');
  assert.equal(JSON.stringify(broken).includes('private-database-error'), false);
});

test('origin mismatch is distinct from missing configuration or database connectivity', async () => {
  const result = await loginReadiness(new Request('https://other.example.test/login'), environment(database()), true);
  assert.equal(result.configured, false);
  assert.equal(result.diagnostic.failedStage, 'origin');
  assert.equal(result.diagnostic.configuration, true);
  assert.equal(result.diagnostic.usersQuery, true);
});
