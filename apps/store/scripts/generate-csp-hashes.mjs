#!/usr/bin/env node
/**
 * CSP inline-script hash generator (security hardening, 2026-10-18).
 *
 * `script-src 'unsafe-inline'` let ANY inline script run, including one
 * smuggled in through stored content. Three kinds of inline script ship
 * literally inside the HTML and need a hash:
 *   1. Astro's `is:inline` scripts (this app's boot/telemetry/widget code) —
 *      found by scanning the `.astro` sources below.
 *   2. Astro/Vite's own small hydration bootstraps for `client:*` islands,
 *      which Astro inlines as `<script type="module">...</script>` rather
 *      than an external file when they're small — these only exist AFTER a
 *      build, so they're harvested from `dist/client/**.html` when present
 *      (caught live, 2026-10-18: the first version of this generator only
 *      scanned sources, missed these, and silently broke every island on
 *      every page — the VRM/world-filter islands included).
 *   3. The same kind-2 bootstraps, but on a page that sets
 *      `export const prerender = false` (reads live/session data, so Astro
 *      never writes it to dist/client) — kind 2's scan misses these. Caught
 *      live, 2026-10-18: /crear/encuentro/'s publish button never fired
 *      because its hydration script was one of these. After the first
 *      build, this script spins the real server on a free port and fetches
 *      every *static-path* on-demand route (one per unique page template;
 *      locale copies share the same compiled script, so only the default
 *      locale is probed) to harvest their inline scripts too. Pages that are
 *      BOTH on-demand AND dynamically segmented (e.g. `mundos/[id]`, a
 *      specific world; `rituals/rit_[hex]`, a one-off invite code) can't be
 *      probed generically — `mundos/[id]` is covered by sampling one id from
 *      the fixture dataset below; `rituals/rit_[hex]` is not probed (no
 *      stable sample exists) and is a known gap — if it only reuses chunks
 *      already hashed from other pages it is fine; if it ever ships its own
 *      distinct inline script, that script will need adding here by hand.
 * None of the three kinds interpolates per-request data into the script
 * BODY (an is:inline script's per-page data travels in a `data-*`
 * attribute, which CSP hashing ignores; an island's hydration bootstrap is
 * the same compiled code for a given build regardless of the data it
 * hydrates), so a build-time SHA-256 of each body is stable across requests
 * and locales. `type="application/json"` blocks are inert (the browser
 * never executes them) and are skipped — they don't need a hash.
 *
 * Because kinds 2 and 3 only exist after a build, `npm run build` runs this
 * script, builds, runs it again with --harvest (now the dist and a live
 * server exist, so kinds 2 and 3 get added), then builds again so the final
 * server bundle ships with the complete list. `npm test`/`npm run dev` only
 * get kind 1 (no build precedes them) — acceptable, since neither is the
 * CSP-enforcing gate; the built-and-rebuilt `npm run build` output is what
 * ships and what the e2e suite runs against.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const here = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(here, '..');
const SRC_DIR = join(APP_DIR, 'src');
const PAGES_DIR = join(SRC_DIR, 'pages');
const DIST_CLIENT_DIR = join(APP_DIR, 'dist', 'client');
const DIST_SERVER_ENTRY = join(APP_DIR, 'dist', 'server', 'entry.mjs');
// A throwaway Node-adapter build, used ONLY to probe on-demand routes when
// the real build targets Cloudflare (see probeServerEntry() below).
const PROBE_DIR = join(APP_DIR, 'dist-csp-probe');
const PROBE_SERVER_ENTRY = join(PROBE_DIR, 'server', 'entry.mjs');
const OUT_FILE = join(SRC_DIR, 'lib', 'csp-hashes.generated.ts');
const HARVEST = process.argv.includes('--harvest');
const LOCALE_DIRS = new Set(['es', 'ja', 'ko', 'pt-br']);

/** Depth-first file listing by extension (node_modules never appears under src/ or dist/). */
function listFiles(dir, extension) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full, extension));
    else if (name.endsWith(extension)) out.push(full);
  }
  return out;
}

// Matches a script tag with a body (not self-closing), capturing its
// attributes and its literal body text — used on both .astro sources
// (is:inline only) and built .html output (every inline script).
// Note for CodeQL (js/bad-tag-filter): this is a build-time extraction
// over this repo's own trusted source/output tree, not an HTML sanitizer
// over untrusted input — a missed script tag only means a stricter CSP
// (the hash list under-reports), never a bypass that lets anything through.
const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi; // codeql[js/bad-tag-filter]

function sha256Base64(text) {
  return createHash('sha256').update(text, 'utf8').digest('base64');
}

function shouldHash(attrs, body) {
  if (/type\s*=\s*["']application\/json["']/.test(attrs)) return false; // inert, no hash needed
  return body.trim().length > 0;
}

function harvestHtml(html, hashes) {
  let match;
  while ((match = SCRIPT_TAG_RE.exec(html))) {
    const [, attrs, body] = match;
    if (!shouldHash(attrs, body)) continue;
    hashes.add(sha256Base64(body));
  }
}

/** Default-locale, static-path, on-demand (prerender=false) page routes:
 * one per unique page template, root/locale-free only — a locale copy of
 * the same .astro component compiles the same inline/hydration scripts. */
function findOnDemandStaticRoutes() {
  const routes = [];
  for (const file of listFiles(PAGES_DIR, '.astro')) {
    const rel = file.slice(PAGES_DIR.length + 1);
    const segments = rel.split('/');
    if (LOCALE_DIRS.has(segments[0])) continue; // a locale copy; same template
    if (rel.includes('[')) continue; // dynamic segment — handled by sampling below, or skipped
    if (!readFileSync(file, 'utf8').includes('prerender = false')) continue; // already in dist/client
    const name = segments.at(-1).replace(/\.astro$/, '');
    const urlSegments = name === 'index' ? segments.slice(0, -1) : [...segments.slice(0, -1), name];
    routes.push(`/${urlSegments.join('/')}/`);
  }
  return routes;
}

/** One concrete /mundos/<id>/ sample, from the same fixture `_fleet.ts` reads. */
function sampleWorldRoute() {
  try {
    const fleet = JSON.parse(
      readFileSync(join(APP_DIR, 'fixtures', 'worlds', 'fleet.json'), 'utf8'),
    );
    const slug = fleet?.cards?.[0]?.slug;
    return slug ? `/mundos/${slug}/` : null;
  } catch {
    return null; // no fixture to sample from — fine, mundos/[id] hashes come from wherever else uses the same chunks
  }
}

/** `dist/server/entry.mjs` is a Cloudflare Workers module (`export default
 * { fetch(request, env, ctx) {...} }`) whenever this build set
 * DEPLOY_TARGET=cloudflare (see astro.config.mjs) — spawning that file with
 * plain `node` doesn't boot a server at all; it throws (no `addEventListener`/
 * Workers globals) or just hangs until waitForServer's timeout. Caught live
 * on the production (Cloudflare Workers Builds) run, 2026-10-18: the harvest
 * pass crashed the whole `npm run build`, there of all places, because CI
 * never sets DEPLOY_TARGET and never hit this. The island hydration
 * bootstraps this step hashes are client-side bundles (dist/client) — same
 * bytes regardless of which server adapter rendered the HTML around them —
 * so when the real build targets Cloudflare, this throws away a disposable
 * Node-adapter build (DEPLOY_TARGET unset) into dist-csp-probe/, probes
 * THAT instead, and deletes it afterward; the real dist/ is untouched. */
function probeServerEntry() {
  if (process.env.DEPLOY_TARGET !== 'cloudflare') {
    return existsSync(DIST_SERVER_ENTRY) ? DIST_SERVER_ENTRY : null;
  }
  try {
    execFileSync('npx', ['astro', 'build', '--outDir', PROBE_DIR], {
      stdio: 'ignore',
      env: { ...process.env, DEPLOY_TARGET: '' },
      cwd: APP_DIR,
    });
    return existsSync(PROBE_SERVER_ENTRY) ? PROBE_SERVER_ENTRY : null;
  } catch (err) {
    console.warn(
      `csp-hashes: disposable Node probe build failed, skipping on-demand routes: ${err.message}`,
    );
    return null;
  }
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitForServer(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.status) return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`csp-hashes: server never answered at ${url}`);
}

async function harvestOnDemandRoutes(hashes) {
  const entry = probeServerEntry();
  if (!entry) return;
  const routes = [...findOnDemandStaticRoutes(), sampleWorldRoute()].filter(Boolean);
  if (routes.length === 0) return;
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATA_SOURCE: process.env.DATA_SOURCE ?? 'fixture',
    },
    stdio: 'ignore',
  });
  try {
    await waitForServer(origin);
    let scanned = 0;
    for (const route of routes) {
      try {
        const res = await fetch(`${origin}${route}`);
        if (!res.ok) continue;
        harvestHtml(await res.text(), hashes);
        scanned += 1;
      } catch {
        // a route that fails to render (e.g. no fixture sample) contributes nothing — not fatal
      }
    }
    console.log(`csp-hashes: harvested ${scanned}/${routes.length} on-demand route(s)`);
  } finally {
    child.kill();
    if (entry === PROBE_SERVER_ENTRY) rmSync(PROBE_DIR, { recursive: true, force: true });
  }
}

const hashes = new Set();

// Kind 1: is:inline scripts, from the .astro sources (also catches session-
// only SSR routes a static build never prerenders, e.g. /panel/*, /lap/*).
for (const file of listFiles(SRC_DIR, '.astro')) {
  const text = readFileSync(file, 'utf8');
  let match;
  while ((match = SCRIPT_TAG_RE.exec(text))) {
    const [, attrs, body] = match;
    if (!/\bis:inline\b/.test(attrs)) continue;
    if (/set:html=/.test(attrs)) continue; // resolved separately below (raw-imported source)
    if (!shouldHash(attrs, body)) continue;
    hashes.add(sha256Base64(body));
  }
}

// The one is:inline script set via `set:html={kitMotion}` (BaseLayout.astro):
// its body comes from a `?raw` import of src/scripts/sistema.js, so the hash
// is of that file's contents, not of anything in the .astro source text.
const sistemaJs = readFileSync(join(SRC_DIR, 'scripts', 'sistema.js'), 'utf8');
hashes.add(sha256Base64(sistemaJs));

if (HARVEST) {
  try {
    // Kind 2: every inline script in the built, prerendered static output —
    // island hydration bootstraps included.
    if (existsSync(DIST_CLIENT_DIR)) {
      for (const file of listFiles(DIST_CLIENT_DIR, '.html')) {
        harvestHtml(readFileSync(file, 'utf8'), hashes);
      }
    }
    // Kind 3: the same, for on-demand routes dist/client never sees.
    await harvestOnDemandRoutes(hashes);
  } catch (err) {
    // Never let a harvesting problem (sandboxed build container, a route
    // that started failing, anything) take the whole `npm run build` down
    // with it — kind-1 hashes alone still ship a working, if narrower, CSP.
    console.warn(
      `csp-hashes: harvest step failed, continuing with ${hashes.size} hash(es) so far: ${err.message}`,
    );
  }
}

const sorted = [...hashes].sort();
const banner = `/**\n * GENERATED FILE — do not edit by hand.\n * Run \`node scripts/generate-csp-hashes.mjs\` (also wired into \`build\`,\n * twice, around \`astro build\` — see this script's own header comment) to\n * refresh after changing any inline script body.\n */\n`;
// Each array entry's STRING VALUE must itself carry the single quotes CSP
// requires around a hash-source (`'sha256-...'`), not just look quoted in
// this file's source — otherwise the browser sees a bare, invalid token and
// silently drops it (caught live: dropped hashes blocked every is:inline
// script, which hid the world-filter chips behind their JS-only toggle).
const body = `${banner}export const INLINE_SCRIPT_HASHES: readonly string[] = [\n${sorted
  .map((h) => `  ${JSON.stringify(`'sha256-${h}'`)},`)
  .join('\n')}\n];\n`;

writeFileSync(OUT_FILE, body);
console.log(`csp-hashes: wrote ${sorted.length} hash(es) to ${OUT_FILE}`);
