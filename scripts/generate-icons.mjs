/* Rasterise icon.svg / icon-maskable.svg into the PNG sizes Android + PWA want.
 * Run:  node scripts/generate-icons.mjs   (needs `npm i -D sharp`)
 * Output goes to icons/. */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'icons');

const jobs = [
  { src: 'icon.svg',          out: 'icon-192.png',     size: 192 },
  { src: 'icon.svg',          out: 'icon-512.png',     size: 512 },
  { src: 'icon.svg',          out: 'icon-1024.png',    size: 1024 },
  { src: 'icon.svg',          out: 'apple-touch-icon.png', size: 180 },
  { src: 'icon.svg',          out: 'favicon-32.png',   size: 32 },
  { src: 'icon-maskable.svg', out: 'maskable-192.png', size: 192 },
  { src: 'icon-maskable.svg', out: 'maskable-512.png', size: 512 },
  // Capacitor @capacitor/assets source (1024 padded square + foreground)
  { src: 'icon.svg',          out: 'icon-foreground.png', size: 1024 }
];

await mkdir(outDir, { recursive: true });

for (const j of jobs) {
  const svg = await readFile(join(root, j.src));
  await sharp(svg, { density: 384 })
    .resize(j.size, j.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, j.out));
  console.log('✓', j.out, `(${j.size}px)`);
}

console.log('\nDone →', outDir);
