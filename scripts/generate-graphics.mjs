/* Render store graphics from SVG → PNG.  Run: node scripts/generate-graphics.mjs
   Outputs into store-assets/. */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store-assets');
await mkdir(out, { recursive: true });

const jobs = [
  { src: 'feature-graphic.svg', out: 'feature-graphic.png', w: 1024, h: 500 }
];

for (const j of jobs) {
  const svg = await readFile(join(root, j.src));
  await sharp(svg, { density: 200 }).resize(j.w, j.h).png().toFile(join(out, j.out));
  console.log('✓', j.out, `(${j.w}×${j.h})`);
}
console.log('\nDone →', out);
