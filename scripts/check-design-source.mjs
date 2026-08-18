/**
 * Drift guard for the design source (ADR-022).
 *
 * The Sistema de Diseño lives in numinia-nwos; this repo pins its version and
 * digest in design-source.json. This script fetches the published master and
 * says, out loud, whether what governs our design has moved. It is NOT part of
 * the hermetic CI suite — it needs the network on purpose.
 *
 *   npm run design:check
 *
 * Exit 0 = in sync · 1 = drift (a new version is out, or the pin is stale).
 */

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(
  await readFile(new URL('../design-source.json', import.meta.url), 'utf8'),
);
const { published, version, sha256, repo, path } = manifest.source;

console.log(`Pinned: ${repo} · ${path} · v${version}`);
console.log(`Fetching ${published}`);

const response = await fetch(published);
if (!response.ok) {
  console.error(`✗ Could not read the published master: HTTP ${response.status}`);
  process.exit(1);
}
const upstream = Buffer.from(await response.arrayBuffer());
const digest = createHash('sha256').update(upstream).digest('hex');

if (digest === sha256) {
  console.log(`✓ In sync — the governing document is byte-identical to the pin.`);
  process.exit(0);
}

console.error(`✗ DRIFT: the published master no longer matches the pin.`);
console.error(`  pinned   ${sha256}`);
console.error(`  upstream ${digest}`);
const declared = /^version:\s*([0-9.]+)/m.exec(upstream.toString('utf8'));
if (declared) console.error(`  upstream declares version ${declared[1]}`);
console.error(`\nThe design system is governed by ${repo}: do not patch it here.`);
console.error(`Re-pin by copying the regenerated kit and updating design-source.json.`);
process.exit(1);
