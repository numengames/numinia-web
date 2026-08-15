/**
 * Internal link integrity gate (MISSION-004) — crawls the built site and
 * fails on any internal href/src that does not resolve to a built file.
 *
 * Usage: node scripts/link-check.mjs   (requires apps/store/dist to exist)
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.join('apps', 'store', 'dist', 'client');

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

function isInternal(url) {
  if (!url || url.startsWith('#')) return false;
  return !/^(https?:|mailto:|data:|javascript:)/i.test(url);
}

async function exists(candidate) {
  try {
    const info = await stat(candidate);
    return info.isFile();
  } catch {
    return false;
  }
}

/**
 * Routes rendered ON DEMAND leave no file in dist/client, so a file check
 * would call them broken. They are real routes served by the worker: the
 * session-gated Codex (its text must never be a static file) and the API.
 */
function isOnDemand(clean) {
  const withoutLocale = clean.replace(/^\/(es|ja|ko|pt-br)\//, '/');
  return (
    /^\/lap\/codex\/?$/.test(withoutLocale) ||
    /^\/lap\/codex\/[^/]+\/?$/.test(withoutLocale) ||
    withoutLocale.startsWith('/api/')
  );
}

async function resolves(target) {
  // /path/ -> /path/index.html ; /file.ext -> as-is ; /path -> try both.
  const clean = target.split(/[?#]/)[0];
  if (isOnDemand(clean)) return true;
  const rel = clean.replace(/^\//, '');
  if (clean.endsWith('/')) return exists(path.join(DIST, rel, 'index.html'));
  if (path.extname(clean)) return exists(path.join(DIST, rel));
  return (
    (await exists(path.join(DIST, rel, 'index.html'))) || exists(path.join(DIST, `${rel}.html`))
  );
}

const failures = [];
let pages = 0;
let checked = 0;
const cache = new Map();

for await (const file of htmlFiles(DIST)) {
  pages += 1;
  const html = await readFile(file, 'utf8');
  const page = `/${path.relative(DIST, file).replace(/\\/g, '/')}`;
  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (!isInternal(url)) continue;
    // Resolve relative URLs against the page's directory.
    const target = url.startsWith('/')
      ? url
      : `/${path.posix.normalize(path.posix.join(path.posix.dirname(page), url))}`;
    checked += 1;
    if (!cache.has(target)) cache.set(target, await resolves(target));
    if (!cache.get(target)) failures.push(`${page} -> ${url}`);
  }
}

const unique = [...new Set(failures)];
if (unique.length > 0) {
  console.error(`link-check: ${unique.length} broken internal link(s):`);
  for (const failure of unique) console.error('  ' + failure);
  process.exit(1);
}
console.log(`link-check OK: ${checked} internal links across ${pages} pages, 0 broken`);
