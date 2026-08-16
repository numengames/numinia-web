/**
 * Thumbnail pipeline (MISSION-017): the archive was shipping full-resolution
 * images (~140KB each) into 240px cards — 2.25MB on /archive/ alone. This
 * script bakes 480px WebP thumbnails (2x for the 240/280px slots) into
 * public/thumbs/ from the committed fixture catalog, same doctrine as the
 * data fixtures: committed snapshots, refreshed deliberately, hermetic CI.
 *
 * Run: node scripts/build-thumbs.mjs   (from apps/store; network required)
 * Output: public/thumbs/<id>.webp + src/generated/local-thumbs.json
 * Misses are logged loudly and skipped — the card falls back to the remote.
 */

import { Buffer } from 'node:buffer';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalogs = JSON.parse(await readFile(path.join(root, 'fixtures/catalogs.json'), 'utf8'));

const items = Object.values(catalogs)
  .filter(Array.isArray)
  .flat()
  .filter((item) => item.is_public && item.thumbnail_url);

await mkdir(path.join(root, 'public/thumbs'), { recursive: true });
const baked = [];
for (const item of items) {
  try {
    const response = await fetch(item.thumbnail_url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const source = Buffer.from(await response.arrayBuffer());
    const webp = await sharp(source)
      .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    await writeFile(path.join(root, 'public/thumbs', `${item.id}.webp`), webp);
    baked.push(item.id);
    console.log(
      `✓ ${item.id} ${(source.length / 1024).toFixed(0)}KB → ${(webp.length / 1024).toFixed(0)}KB`,
    );
  } catch (error) {
    console.warn(`✗ ${item.id}: ${error.message} (card will use the remote)`);
  }
}
baked.sort();
await writeFile(
  path.join(root, 'src/generated/local-thumbs.json'),
  JSON.stringify(baked, null, 2) + '\n',
);
console.log(`baked ${baked.length}/${items.length} thumbnails`);
