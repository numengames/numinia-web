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
      paragraph.
      Raised 9500→11000 on 2026-09-29: the Oracle ordered the four sites to
      look as numinia.org draws them, and that includes the night sky
      (STD-023 velo.cielo, ~1.5KB minified: 175 stars, rarity weights,
      still under reduced motion) and the phone menu button (~0.3KB). Both
      are chrome the design system requires, not feature creep; the sky is
      a bundled module, minified, still inline (no external JS). Landing
      sits at ~10.8KB.
      Raised 11000→12000 on 2026-10-03: main already sat at 11053B (over,
      unnoticed — only local `verify` runs budgets), and the Oracle ordered
      the epitaph skull at the foot of the four sites (CAN-002), whose
      toggle/Escape handler is ~0.7KB. House chrome, not feature creep.
      Landing sits at ~11.7KB.
      Raised 12000→14000 on 2026-10-14 (v0.82.0): the front door became the
      communities platform's (the Oracle's order), and two inline scripts
      came with it — the countdown beside each ritual's date, filled from
      the reader's clock so the built page carries no "today" (~1.1KB), and
      the strip's two arrows (~0.4KB). Still no external JS; the page works
      whole without either. Landing sits at ~12.7KB.
      Raised 14000→14500 on 2026-10-14 (v0.83.0): the app shell the Oracle
      approved — the sidebar's fold applied before paint, the «Más» and ⋮
      popovers, the «/» key to the search — and the featured strip's
      arrows, on a front door that dropped its explanation blocks. Still no
      external JS. Landing sits at ~14.2KB.
      Raised 14500→16500 on 2026-10-14 (v0.84.0): the chrome reads who is
      here — one session read per page that paints the account (face, short
      wallet, rank), the Oracle's rooms and the ladder of ranks, then tells
      the sign-in island (~1.8KB). Before it, a signed-in person still saw
      «Iniciar sesión» everywhere. Still no external JS: the island reaches
      the client through the window, never by import. Landing sits at ~16KB.
      Raised 16500→17500 on 2026-10-14 (v0.86.0): the visitor face's form
      to ask for a home opens the mail with a subject and one labelled line
      per field (~0.6KB); without JavaScript the form posts to the mail
      client as it is. Still no external JS. Landing sits at ~17KB. */
  landingInlineScriptBytes: 17_500,
  /** Any single non-3D JS chunk. */
  chunkBytes: 200_000,
  /** 3D island chunks (three.js + three-vrm are legitimately heavy). */
  threeDChunkBytes: 1_500_000,
  /** Chunks reachable ONLY from the identity surfaces (/spike/ and the
      L.A.P. session page): the wallet vendor is legitimately heavy and loads
      solely when someone chooses to enter. Layer 0/1 pages never reach it —
      their strict budget below still guards everything they do.
      Widened on 2026-10-12 (v0.77.0) to the worlds room (/lap/admin/worlds/,
      Oracle-only): each create, stop, start, download or delete is one
      request the Oracle's wallet signs, so the room loads the same wallet
      vendor the login does — the WalletConnect and Coinbase connectors,
      ~450KB each — and only on the click that asks for a signature. Those
      chunks were already in the build for the login; no other page reaches
      them, and every public page keeps the strict budget.
      Widened on 2026-10-15 (v0.95.0) to Saldo's members tab
      (/saldo/miembros/, signed-in people only): giving «Administrador» or
      «Gestionar roles» is one act the person's wallet signs again (STD-051
      ORG-008), so the tab reaches the same wallet chunks as the worlds room
      — the same module, ../components/auth/remembered-wallet.ts — and only
      on the click that asks for the signature. The tab itself still loads
      none of them. */
  identityOnlyChunkBytes: 1_500_000,
  /** Whole-page HTML weight for the landing. Raised 30000→33000 on
      2026-09-29 for the same order as the inline raise above: the sky, the
      phone menu, and one Phosphor icon before each bar entry (STD-023 §11,
      ~2KB of inline SVG). Landing sits at ~31.7KB.
      Raised 33000→36000 on 2026-10-03 for the epitaph skull (Oracle order,
      the four sites): the Phosphor skull SVG, the epitaph text, its button,
      popover styles and handler (~2.3KB), plus Discord in the Social column.
      Landing sits at ~35.2KB.
      Raised 36000→90000 on 2026-10-14 (v0.82.0): the front door is no
      longer three doors but the city's register — the upcoming rituals as
      cards, the three communities with life, four steps, three kinds, six
      templates, four agents — each card with its Phosphor icons inline
      (61 SVGs, ~25KB) and its texts in the page. Content, not feature
      creep; ~14KB on the wire once gzipped, and still no external JS.
      Landing sits at ~80KB.
      Raised 90000→95000 on 2026-10-14 (v0.84.0): the top bar's account —
      the face, the short wallet, the rank's name in each of its five forms,
      Perfil · Ajustes · Salir — and their three icons in the sprite, plus
      the session script above (~3.7KB). Landing sits at ~93.2KB.
      Raised 95000→120000 on 2026-10-14 (v0.86.0): the front door has two
      faces in one static page — the visitor face (the line that says what
      Numinia is, the four steps, the communities with an open home, six
      templates, the form, what stays yours, the city, five questions) for
      anyone without a session, and «Para ti» for the signed-in — with their
      Phosphor icons inline (~21KB). The page is prerendered, so both ship;
      the session script shows one. Still no external JS. Landing sits at
      ~115.6KB. */
  landingHtmlBytes: 120_000,
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
 * Chunks reachable from PUBLIC pages (anything but the identity surfaces:
 * /spike/, the session page, the worlds room and Saldo's members tab) get
 * the strict budgets; chunks only the identity surfaces can ever load get
 * their own class. Reachability = script refs in the HTML plus the import
 * graph (static and dynamic) walked from those entries.
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
  const isWorldsRoom = segments.join('/').includes('lap/admin/worlds/');
  const isMembersTab = segments.join('/').includes('saldo/miembros/');
  const isIdentitySurface =
    segments.includes('spike') || segments.includes('session') || isWorldsRoom || isMembersTab;
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
  let source;
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
