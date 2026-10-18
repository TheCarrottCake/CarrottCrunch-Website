import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

test('Temporal polyfill resolves DST and fractional offsets inside local workerd', async () => {
  const bundle = await build({ entryPoints: ['tests/fixtures/temporal-worker.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  const worker = new Miniflare({ workers: [{ config: { name: 'temporal-check', compatibilityDate: '2026-10-06', manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: bundle.outputFiles[0].text } } } } }] });
  try {
    const response = await worker.dispatchFetch('http://local.test/');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      earlier: { offset: '-04:00', instant: '2026-11-01T05:30:00Z' },
      later: { offset: '-05:00', instant: '2026-11-01T06:30:00Z' },
      gapRejected: true, halfHourDifference: 1800000, fractionalOffset: '+05:45',
      applicationRoundTrip: true, applicationOffsets: ['-04:00', '-05:00'],
      applicationGapRejected: true, applicationAmbiguityRejected: true,
    });
  } finally { await worker.dispose(); }
});
