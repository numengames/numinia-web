#!/usr/bin/env node
/**
 * CSP inline-script hash generator (security hardening, 2026-10-18).
 *
 * `script-src 'unsafe-inline'` let ANY inline script run, including one
 * smuggled in through stored content. Astro's `is:inline` scripts are the
 * only ones that ship literally inside the HTML (plain `<script>` tags get
 * bundled by Vite into external, already-hashed-by-filename files, so they
 * never need an allowance here). Every `is:inline` script body in this app
 * is static source text — none of them interpolate per-request data into
 * the script BODY (data varies only in `data-*` attributes, which CSP
 * hashing ignores), so a build-time SHA-256 of each body is stable across
 * requests and locales. `type="application/json"` blocks are inert (the
 * browser never executes them) and are skipped — they don't need a hash.
 *
 * Run by `npm run build` and `npm test` (see package.json) so the hash list
 * in `src/lib/csp-hashes.generated.ts` never drifts from the source.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(here, '..', 'src');
const OUT_FILE = join(SRC_DIR, 'lib', 'csp-hashes.generated.ts');

/** Depth-first .astro file listing (node_modules and dist never appear under src/). */
function listAstroFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listAstroFiles(full));
    else if (name.endsWith('.astro')) out.push(full);
  }
  return out;
}

// Matches an is:inline script tag with a body (not self-closing), capturing
// its attributes and its literal body text.
const INLINE_SCRIPT_RE =
  /<script\s+((?:(?!\/?>)[^])*?is:inline(?:(?!\/?>)[^])*?)>([\s\S]*?)<\/script>/g;

function sha256Base64(text) {
  return createHash('sha256').update(text, 'utf8').digest('base64');
}

const hashes = new Set();

for (const file of listAstroFiles(SRC_DIR)) {
  const text = readFileSync(file, 'utf8');
  let match;
  while ((match = INLINE_SCRIPT_RE.exec(text))) {
    const [, attrs, body] = match;
    if (/type\s*=\s*["']application\/json["']/.test(attrs)) continue; // inert, no hash needed
    if (/set:html=/.test(attrs)) continue; // resolved separately below (raw-imported source)
    if (!body.trim()) continue;
    hashes.add(sha256Base64(body));
  }
}

// The one is:inline script set via `set:html={kitMotion}` (BaseLayout.astro):
// its body comes from a `?raw` import of src/scripts/sistema.js, so the hash
// is of that file's contents, not of anything in the .astro source text.
const sistemaJs = readFileSync(join(SRC_DIR, 'scripts', 'sistema.js'), 'utf8');
hashes.add(sha256Base64(sistemaJs));

const sorted = [...hashes].sort();
const banner = `/**\n * GENERATED FILE — do not edit by hand.\n * Run \`node scripts/generate-csp-hashes.mjs\` (also wired into \`build\`\n * and \`test\`) to refresh after changing any \`is:inline\` script body.\n */\n`;
const body = `${banner}export const INLINE_SCRIPT_HASHES: readonly string[] = [\n${sorted
  .map((h) => `  'sha256-${h}',`)
  .join('\n')}\n];\n`;

writeFileSync(OUT_FILE, body);
console.log(`csp-hashes: wrote ${sorted.length} hash(es) to ${OUT_FILE}`);
