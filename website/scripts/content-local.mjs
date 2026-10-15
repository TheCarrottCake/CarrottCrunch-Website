import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const operation = process.argv[2];
if (process.argv.length !== 3 || !['migrate', 'seed'].includes(operation)) {
  console.error('Usage: content-local.mjs migrate|seed (no additional flags accepted)');
  process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const common = ['--config', 'wrangler.jsonc', '--env', 'content_dev', '--local'];
const args = operation === 'migrate'
  ? ['d1', 'migrations', 'apply', 'carrottcrunch-content-local', ...common]
  : ['d1', 'execute', 'carrottcrunch-content-local', ...common, '--file', 'seeds/development.sql'];
// No remote mode, arbitrary SQL/file arguments, or production environment override.
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)), ...args], {
  cwd: root, stdio: 'inherit', env: { ...process.env, CLOUDFLARE_ENV: 'content_dev', WRANGLER_SEND_METRICS: 'false' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
