/* Assemble a clean web bundle in www/ for Capacitor to wrap.
 * Keeps source files at the project root (zero-build dev) while giving
 * Capacitor a folder free of node_modules / tooling.
 * Run:  node scripts/sync-web.mjs   (npm run build:web) */
import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

const ENTRIES = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'icon-maskable.svg',
  'styles',
  'src',
  'icons'
];

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });

for (const e of ENTRIES) {
  await cp(join(root, e), join(www, e), { recursive: true }).catch((err) => {
    console.warn('skip', e, '—', err.message);
  });
}
console.log('✓ web bundle →', www);
