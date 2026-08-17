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
  /** Total inline <script> bytes in the landing HTML. Raised 8000→9000 on
      2026-08-16 with a written reason (the budget's own doctrine): the
      M-022 error beacon (~450B) and the M-029 preference bootstrap (~550B)
      are sanctioned chrome — operations and accessibility, not feature
      creep. Raised 9000→9500 on 2026-08-17: the v0.40.0 consent banner
      bootstrap (~800B, Oracle-ordered D12 slice) runs during parse so
      returning acceptors never see a flash — legally required chrome, not
      feature creep; it shipped past the gate because only local `verify`
      runs budgets. Landing sits at 9322B. The next raise needs its own
      paragraph. */
  landingInlineScriptBytes: 9_500,
  /** Any single non-3D JS chunk. */
  chunkBytes: 200_000,
  /** 3D island chunks (three.js + three-vrm are legitimately heavy). */
  threeDChunkBytes: 1_500_000,
  /** Chunks reachable ONLY from the identity surfaces (/spike/ and the
      L.A.P. session page): the wallet vendor is legitimately heavy and loads
      solely when someone chooses to enter. Layer 0/1 pages never reach it —
      their strict budget below still guards everything they do. */
  identityOnlyChunkBytes: 1_500_000,
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

/**
 * Chunks reachable from PUBLIC pages (anything outside /spike/) get the strict
 * budgets; chunks only the internal spike pages can ever load get their own
 * class. Reachability = script refs in the HTML plus the import graph
 * (static and dynamic) walked from those entries.
 */
async function collectHtml(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await collectHtml(full)));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const chunkRef = /_astro\/([\w.-]+\.js)/g;
const publicEntries = new Set();
for (const file of await collectHtml(DIST)) {
  const segments = path.relative(DIST, file).split(path.sep);
  const isIdentitySurface = segments.includes('spike') || segments.includes('session');
  if (isIdentitySurface) continue;
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(chunkRef)) publicEntries.add(match[1]);
}
const publiclyReachable = new Set();
const queue = [...publicEntries];
while (queue.length > 0) {
  const chunk = queue.pop();
  if (publiclyReachable.has(chunk)) continue;
  publiclyReachable.add(chunk);
  let source = '';
  try {
    source = await readFile(path.join(astroDir, chunk), 'utf8');
  } catch {
    continue; // referenced by page but outside _astro — nothing to walk
  }
  for (const match of source.matchAll(/["'./]+([\w.-]+\.js)["']/g)) {
    const name = match[1];
    if (chunks.includes(name) && !publiclyReachable.has(name)) queue.push(name);
  }
}

for (const chunk of chunks) {
  const { size } = await stat(path.join(astroDir, chunk));
  const is3d = /vrm|three|viewer/i.test(chunk);
  const identityOnly = !publiclyReachable.has(chunk);
  const budget = is3d
    ? BUDGETS.threeDChunkBytes
    : identityOnly
      ? BUDGETS.identityOnlyChunkBytes
      : BUDGETS.chunkBytes;
  if (size > budget) {
    failures.push(`chunk ${chunk} ${size}B > ${budget}B${identityOnly ? ' (identity-only)' : ''}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`bundle-budget FAILED:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `bundle-budget OK: inline ${inlineBytes}B, ${chunks.length} chunks within budgets\n`,
);
