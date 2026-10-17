import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codespacesDevelopmentRequest } from '../app/lib/codespaces-request.server.ts';
import { beginDiscordLogin, AuthError } from '../app/lib/staff-auth.server.ts';

const origin = 'https://fictional-space-5173.app.github.dev';
const env = { CONTENT_DB: {}, DISCORD_CLIENT_ID: '100000000000000099', DISCORD_CLIENT_SECRET: 'fictional-client-secret', AUTH_CSRF_SECRET: 'fictional-csrf-secret-at-least-32-characters', CONTROL_ORIGIN: origin };
const headers = { 'X-Forwarded-Host': new URL(origin).host, 'X-Forwarded-Proto': 'https' };

test('Codespaces correction preserves path, query, method, body and browser origin', async () => {
  const request = new Request('https://localhost:5173//auth/start?next=example', { method: 'POST', headers: { ...headers, Origin: origin }, body: 'example=body' });
  const corrected = codespacesDevelopmentRequest(request, env, true);
  assert.equal(corrected.url, origin + '//auth/start?next=example');
  assert.equal(corrected.method, 'POST');
  assert.equal(corrected.headers.get('Origin'), origin);
  assert.equal(await corrected.text(), 'example=body');
});

test('production and untrusted or incomplete forwarded requests are never rewritten', () => {
  const request = new Request('https://localhost:5173/login', { headers });
  assert.equal(codespacesDevelopmentRequest(request, env), request);
  for (const [url, forwarded, settings] of [
    ['https://remote.example:5173/login', headers, env],
    ['https://localhost:9999/login', headers, env],
    ['https://localhost:5173/login', { ...headers, 'X-Forwarded-Host': 'attacker.example' }, env],
    ['https://localhost:5173/login', { ...headers, 'X-Forwarded-Host': headers['X-Forwarded-Host'] + ',attacker.example' }, env],
    ['https://localhost:5173/login', { ...headers, 'X-Forwarded-Proto': 'http' }, env],
    ['https://localhost:5173/login', {}, env],
    ['https://localhost:5173/login', headers, { ...env, AUTH_CSRF_SECRET: undefined }],
    ['https://localhost:5173/login', { ...headers, 'X-Forwarded-Host': 'other.example' }, { ...env, CONTROL_ORIGIN: 'https://other.example' }],
  ]) {
    const candidate = new Request(url, { headers: forwarded });
    assert.equal(codespacesDevelopmentRequest(candidate, settings, true), candidate);
  }
});

test('correcting the development URL does not bypass browser mutation origin checks', async () => {
  const candidate = new Request('http://127.0.0.1:5173/auth/start', { method: 'POST', headers: { ...headers, Origin: 'https://attacker.example' } });
  const corrected = codespacesDevelopmentRequest(candidate, env, true);
  assert.equal(new URL(corrected.url).origin, origin);
  await assert.rejects(beginDiscordLogin(corrected, env, true), error => error instanceof AuthError && error.code === 'csrf');
});
