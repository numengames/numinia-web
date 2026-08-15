/**
 * Bundle budgets — the 60KB-zod regression class, caught automatically.
 *
 * Budgets are enforced against the store build output. Landing pages must stay
 * effectively JS-free (inline metrics only); heavy 3D chunks may only ever
 * load behind a client:visible island.
 *
 * Usage: node scripts/bundle-budget.mjs   (requires apps/store/dist to exist)
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.join('apps', 'store', 'dist', 'client');

const BUDGETS = {
  /** Total inline <script> bytes in the landing HTML (metrics bootstrap). */
  landingInlineScriptBytes: 8_000,
  /** Any single non-3D JS chunk. */
  chunkBytes: 200_000,
  /** 3D island chunks (three.js + three-vrm are legitimately heavy). */
  threeDChunkBytes: 1_500_000,
  /** Whole-page HTML weight for the landing. */
  landingHtmlBytes: 30_000,
};

const failures = [];

const landing = await readFile(path.join(DIST, 'index.html'), 'utf8');
if (landing.length > BUDGETS.landingHtmlBytes) {
  failures.push(`landing HTML ${landing.length}B > ${BUDGETS.landingHtmlBytes}B`);
}
const inlineBytes = [...landing.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => (match[1] ?? '').length)
  .reduce((sum, value) => sum + value, 0);
if (inlineBytes > BUDGETS.landingInlineScriptBytes) {
  failures.push(`landing inline scripts ${inlineBytes}B > ${BUDGETS.landingInlineScriptBytes}B`);
}
if (/<script[^>]*\ssrc=/.test(landing)) {
  failures.push('landing loads external JS — it must ship inline metrics only');
}

const astroDir = path.join(DIST, '_astro');
let chunks = [];
try {
  chunks = (await readdir(astroDir)).filter((file) => file.endsWith('.js'));
} catch {
  // No JS chunks at all is a perfectly good outcome.
}
for (const chunk of chunks) {
  const { size } = await stat(path.join(astroDir, chunk));
  const is3d = /vrm|three|viewer/i.test(chunk);
  const budget = is3d ? BUDGETS.threeDChunkBytes : BUDGETS.chunkBytes;
  if (size > budget) {
    failures.push(`chunk ${chunk} ${size}B > ${budget}B`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`bundle-budget FAILED:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `bundle-budget OK: inline ${inlineBytes}B, ${chunks.length} chunks within budgets\n`,
);
