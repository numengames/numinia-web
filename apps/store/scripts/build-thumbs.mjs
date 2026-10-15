/**
 * Thumbnail pipeline (MISSION-017): the archive was shipping full-resolution
 * images (~140KB each) into 240px cards — 2.25MB on /archive/ alone. This
 * script bakes WebP sizes per good into public/thumbs/ from the committed
 * fixture catalog, same doctrine as the data fixtures: committed snapshots,
 * refreshed deliberately, hermetic CI.
 *
 * - `<id>.webp`, up to 480px a side: the 2x picture of the 216–290px card
 *   slots.
 * - `1x/<id>.webp`, just large enough to cover a 288×216 slot: what a screen
 *   of density 1 downloads through the card's srcset (v0.89.0, «deberíamos
 *   optimizar las imágenes»): a third of the bytes, never upscaled in a card.
 * - `preview/<id>.webp`, a PICTURE only, up to 960px a side: what the
 *   Bazaar's preview shows whole (v0.91.0). The preview used to download the
 *   original — up to 2.2MB for a PNG of 2000px — to paint a 300px pane.
 *
 * A picture is its own thumbnail (v0.89.0, «si es un JPG debería de tener el
 * JPG pintado»): a PNG or JPG the catalogue gives no thumbnail_url is baked
 * from its own file — up to 2.2MB per original, ~30KB once baked. A WebP
 * already in public/thumbs/ is kept: a re-encode is a binary diff with
 * nothing new in it; a missing 1x is cut from the kept 2x, without the
 * network. Pass --force to bake every one again from its source.
 *
 * Run: node scripts/build-thumbs.mjs [--force]   (from apps/store; network only for new goods)
 * Output: public/thumbs/<id>.webp + public/thumbs/1x/<id>.webp +
 *         public/thumbs/preview/<id>.webp + src/generated/local-thumbs.json +
 *         src/generated/local-previews.json
 * Misses are logged loudly and skipped — the card (or the preview) falls back
 * to the remote.
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
/** The preview of a picture: whole, up to 960px a side — the sheet at density 2. */
const PREVIEW = { width: 960, height: 960, fit: 'inside', withoutEnlargement: true };
const QUALITY = 78;

/** Whether the good is a picture: its own file is what it looks like. */
function isPicture(item) {
  return PICTURES.has(String(item.type ?? item.format ?? '').toLowerCase());
}

/** A good's own file, as the Bazaar offers it for download. */
function ownFile(item) {
  const storage = item.storage ?? {};
  return storage.r2 || storage.github_raw || item.model_file_url || null;
}

/** What a good's thumbnail is baked from: its thumbnail, or — a picture — itself. */
function sourceOf(item) {
  if (item.thumbnail_url) return item.thumbnail_url;
  return isPicture(item) ? ownFile(item) : null;
}

/** One size of a picture, as WebP. */
function bake(input, size) {
  return sharp(input).resize(size).webp({ quality: QUALITY }).toBuffer();
}

/** A file fetched whole, or an error naming the status. */
async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;
/** Whether a file has to be baked: forced, or not there yet. */
const lacks = (file) => force || !existsSync(file);

const items = Object.values(catalogs)
  .filter(Array.isArray)
  .flat()
  .filter((item) => item.is_public && sourceOf(item));

const twoXDir = path.join(root, 'public/thumbs');
const oneXDir = path.join(twoXDir, '1x');
const previewDir = path.join(twoXDir, 'preview');
await mkdir(oneXDir, { recursive: true });
await mkdir(previewDir, { recursive: true });
const baked = [];
const previews = [];
for (const item of items) {
  const twoX = path.join(twoXDir, `${item.id}.webp`);
  const oneX = path.join(oneXDir, `${item.id}.webp`);
  try {
    if (lacks(twoX)) {
      const source = await download(sourceOf(item));
      const two = await bake(source, TWO_X);
      const one = await bake(source, ONE_X);
      await writeFile(twoX, two);
      await writeFile(oneX, one);
      console.log(`✓ ${item.id} ${kb(source.length)} → ${kb(two.length)} + ${kb(one.length)} (1x)`);
    } else if (lacks(oneX)) {
      const one = await bake(await readFile(twoX), ONE_X);
      await writeFile(oneX, one);
      console.log(`✓ ${item.id} 1x cut from the kept 2x → ${kb(one.length)}`);
    } else {
      console.log(`= ${item.id} (kept)`);
    }
    baked.push(item.id);
  } catch (error) {
    console.warn(`✗ ${item.id}: ${error.message} (card will use the remote)`);
    continue;
  }
  if (!isPicture(item)) continue;
  const previewFile = path.join(previewDir, `${item.id}.webp`);
  try {
    if (lacks(previewFile)) {
      const own = ownFile(item);
      if (!own) throw new Error('no file of its own');
      const source = await download(own);
      const preview = await bake(source, PREVIEW);
      await writeFile(previewFile, preview);
      console.log(`✓ ${item.id} preview ${kb(source.length)} → ${kb(preview.length)}`);
    }
    previews.push(item.id);
  } catch (error) {
    console.warn(`✗ ${item.id} preview: ${error.message} (the preview will use the original)`);
  }
}
baked.sort();
previews.sort();
await writeFile(
  path.join(root, 'src/generated/local-thumbs.json'),
  JSON.stringify(baked, null, 2) + '\n',
);
await writeFile(
  path.join(root, 'src/generated/local-previews.json'),
  JSON.stringify(previews, null, 2) + '\n',
);
console.log(
  `baked ${baked.length}/${items.length} thumbnails, each at 2x and 1x; ${previews.length} picture previews`,
);
