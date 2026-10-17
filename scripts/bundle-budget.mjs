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
      client as it is. Still no external JS. Landing sits at ~17KB.
      Raised 17500→19500 on 2026-10-16 (v0.108.0, «El menú de la cara»): the
      account menu reads the till once, when it is first opened — the balance,
      the published name and the person's organizations — and writes them into
      the markup the page already has (~1.9KB with its two pure readers,
      lib/face-menu.ts). Still no external JS and nothing is asked before the
      menu opens. Landing sits at ~19KB.
      Raised 19500→21000 on 2026-10-16 (v0.111.0, v3 «Ahora»): the front
      page became «Ahora» — the featured frame shows one thing at a time and
      steps with its arrows (never by itself, WCAG 2.2.2), and it opens a
      world with people from the live count the site already reads, which the
      home now asks for too (~1.6KB in all, the frame's script bundled and
      minified). The visitor face's mail form left (~0.6KB). Still no
      external JS. Landing sits at ~20.6KB.
      Then raised 21000→26500 on 2026-10-16 (v0.112.0, «La ciudad y tú»): the
      new chrome's two mirrored rails need their own behaviour — each rail's
      fold kept per device and by width, Sistema · Noche · Día, the rail
      menus placed beside their button (~1.9KB), the folded rails' hoverable
      tooltips with Esc (WCAG 1.4.13, ~1KB), «Ahora en la ciudad» filled from
      /api/live (~0.9KB), the phone's «Tú» sheet focus (~0.4KB) and the
      boot script's fold rule before paint (~0.5KB), minus the old sidebar
      and top bar scripts. Three scripts, not one: each stays under the
      bundler's inline limit and shares no module with the others, so the
      landing still loads no external JS. With «Ahora» and the chrome together the landing sits near 25.5KB (measured at the gates).
      Then raised 26500→28500 on 2026-10-17 (v0.118.0, cut «Tu agenda»): «Me
      apunto» on the featured encounter is real — one script (~1.7KB,
      bundled and minified, no import so it stays inline) asks /api/rsvp
      once the session is in, toggles the button, fills «N personas van»
      and says it in a toast. Still no external JS. On top of the chrome the landing sits near ~27.5KB.
      Then raised 28500→29500 on 2026-10-17 (v0.120.0, cut «Tu agenda · Tus
      mundos»): the two new places of your rail carry a counter — one script
      of its own (~1.1KB, lib/you-counts.ts bundled and minified, sharing no
      module with the others so it stays inline) asks /api/rsvp and
      /api/mundos/mine once the session is in and paints the figures; nothing
      is asked signed out. Still no external JS. Landing sits near ~28.6KB.
      Then raised 29500→30500 on 2026-10-17 (v0.125.0, cut «Seguir»): the
      rail's counter now also asks /api/follow (communities = organizations ∪
      follows, each once) and the bell's dot («Avisos», v0.123.0) landed in
      the same window; together ~1.3KB more inline. Still no external JS.
      Landing sits near ~29.9KB.
      Then raised 30500→32000 on 2026-10-17 (v0.127.0, cut M «Crear → Un
      encuentro»): the encounters published from the site live in the till,
      and the landing is a static file, so its «Más encuentros» slot
      (RitualsLive.astro, ~1.5KB minified, sharing no module so it stays
      inline) asks /api/rituals?upcoming=1 once and draws the rows, hidden
      until there is one. Still no external JS. Landing sits near ~31.5KB. */
  landingInlineScriptBytes: 32_000,
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
      none of them.
      The organization panel's members screen (/panel/miembros/) hosts that
      very tab (the same island, for the organization the address names), so
      it is the same class: no byte budget moved, only the page's identity
      — the Summary and the balance screens stay public-class and reach no
      wallet chunk.
      On 2026-10-16 («La gente») the tab moved into the panel for good —
      /saldo/miembros/ only sends to /panel/miembros/, loads no script and
      leaves the class — and the panel's Roles editor (/panel/roles/) joins
      it: saving «Administrador» or «Gestionar roles» on a role is the same
      signed act. No byte budget moved. */
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
      ~115.6KB. 
      Raised 120000→124000 on 2026-10-16 (v0.108.0, «El menú de la cara»):
      the account menu gained its balance door, a label and a template for
      the person's panels (five locales' words, one coin icon in the sprite),
      ~2.8KB. Landing sits at ~122.8KB.
      Raised 124000→142000 on 2026-10-16 (v0.112.0, «La ciudad y tú»): the
      chrome became two mirrored rails plus the phone's own pieces, all in
      the one prerendered page — the city's rail (five places with their
      counters, «Ahora en la ciudad», its foot), yours (both faces, «Crear»,
      four places, the appearance and language as segmented controls), the
      face and «Crear» menus, the phone's header, bottom bar and «Tú» sheet,
      and the folded footer's second copy that closes the page on a phone,
      with their five-locale words and ten more Phosphor symbols in the
      sprite (~15KB). Still no external JS. Landing sits at ~139.6KB. */
  landingHtmlBytes: 142_000,
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
 * /spike/, the session page, the worlds room and the organization panel's
 * people screens, Miembros and Roles) get the strict budgets; chunks only
 * the identity surfaces can ever load get their own class. Reachability =
 * script refs in the HTML plus the import graph (static and dynamic) walked
 * from those entries.
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
  const isPeopleScreen =
    segments.join('/').includes('panel/miembros/') || segments.join('/').includes('panel/roles/');
  const isIdentitySurface =
    segments.includes('spike') || segments.includes('session') || isWorldsRoom || isPeopleScreen;
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
