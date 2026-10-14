/**
 * Thumbnail pipeline (MISSION-017): the archive was shipping full-resolution
 * images (~140KB each) into 240px cards — 2.25MB on /archive/ alone. This
 * script bakes two WebP sizes per good into public/thumbs/ from the committed
 * fixture catalog, same doctrine as the data fixtures: committed snapshots,
 * refreshed deliberately, hermetic CI.
 *
 * - `<id>.webp`, up to 480px a side: the 2x picture of the 216–290px card
 *   slots, and what the preview shows.
 * - `1x/<id>.webp`, just large enough to cover a 288×216 slot: what a screen
 *   of density 1 downloads through the card's srcset (v0.89.0, «deberíamos
 *   optimizar las imágenes»): a third of the bytes, never upscaled in a card.
 *
 * A picture is its own thumbnail (v0.89.0, «si es un JPG debería de tener el
 * JPG pintado»): a PNG or JPG the catalogue gives no thumbnail_url is baked
 * from its own file — up to 2.2MB per original, ~30KB once baked. A WebP
 * already in public/thumbs/ is kept: a re-encode is a binary diff with
 * nothing new in it; a missing 1x is cut from the kept 2x, without the
 * network. Pass --force to bake every one again from its source.
 *
 * Run: node scripts/build-thumbs.mjs [--force]   (from apps/store; network only for new goods)
 * Output: public/thumbs/<id>.webp + public/thumbs/1x/<id>.webp + src/generated/local-thumbs.json
 * Misses are logged loudly and skipped — the card falls back to the remote.
 */

import { Buffer } from 'node:buffer';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalogs = JSON.parse(await readFile(path.join(root, 'fixtures/catalogs.json'), 'utf8'));
const force = process.argv.includes('--force');

/** The formats whose own file is their picture. */
const PICTURES = new Set(['png', 'jpg']);

/** The 2x card picture: up to 480px a side, whole. */
const TWO_X = { width: 480, height: 480, fit: 'inside', withoutEnlargement: true };
/** The 1x card picture: covers the widest card slot at density 1 (288×216, 4:3). */
const ONE_X = { width: 288, height: 216, fit: 'outside', withoutEnlargement: true };
const QUALITY = 78;

/** What a good's thumbnail is baked from: its thumbnail, or — a picture — itself. */
function sourceOf(item) {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (!PICTURES.has(String(item.type ?? item.format ?? '').toLowerCase())) return null;
  const storage = item.storage ?? {};
  return storage.r2 || storage.github_raw || item.model_file_url || null;
}

/** One size of a picture, as WebP. */
function bake(input, size) {
  return sharp(input).resize(size).webp({ quality: QUALITY }).toBuffer();
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

const items = Object.values(catalogs)
  .filter(Array.isArray)
  .flat()
  .filter((item) => item.is_public && sourceOf(item));

const twoXDir = path.join(root, 'public/thumbs');
const oneXDir = path.join(twoXDir, '1x');
await mkdir(oneXDir, { recursive: true });
const baked = [];
for (const item of items) {
  const twoX = path.join(twoXDir, `${item.id}.webp`);
  const oneX = path.join(oneXDir, `${item.id}.webp`);
  if (!force && existsSync(twoX)) {
    if (existsSync(oneX)) {
      console.log(`= ${item.id} (kept)`);
    } else {
      const one = await bake(await readFile(twoX), ONE_X);
      await writeFile(oneX, one);
      console.log(`✓ ${item.id} 1x cut from the kept 2x → ${kb(one.length)}`);
    }
    baked.push(item.id);
    continue;
  }
  try {
    const response = await fetch(sourceOf(item));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const two = await bake(source, TWO_X);
    const one = await bake(source, ONE_X);
    await writeFile(twoX, two);
    await writeFile(oneX, one);
    baked.push(item.id);
    console.log(`✓ ${item.id} ${kb(source.length)} → ${kb(two.length)} + ${kb(one.length)} (1x)`);
  } catch (error) {
    console.warn(`✗ ${item.id}: ${error.message} (card will use the remote)`);
  }
}
baked.sort();
await writeFile(
  path.join(root, 'src/generated/local-thumbs.json'),
  JSON.stringify(baked, null, 2) + '\n',
);
console.log(`baked ${baked.length}/${items.length} thumbnails, each at 2x and 1x`);
