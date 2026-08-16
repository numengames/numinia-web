// Fetch the real seminal manual from the private lore repository into the
// gitignored apps/store/.lore/ directory (Oracle order 2026-08-16: lore left
// the code repo). Production deploys run this before building so the Codex
// ships the real corpus; hermetic/CI builds skip it and use the fixture.
// Fails loud: a deploy that cannot reach the lore must not silently ship
// the synthetic manual to citizens.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LORE_REPO = process.env.LORE_REPO ?? 'numengames/numinia-lore';
const LORE_REF = process.env.LORE_REF ?? 'main';
const MANUAL_PATH = 'seminal/Numinia__El_juego_de_rol__manual_completo_.md';
const TARGET = join('apps/store', '.lore', 'manual.md');

const token = process.env.LORE_TOKEN ?? process.env.GITHUB_TOKEN;
if (!token) {
  console.error('fetch-lore: no LORE_TOKEN or GITHUB_TOKEN in the environment.');
  console.error('The lore repository is private — a token with read access is required.');
  process.exit(1);
}

const url = `https://api.github.com/repos/${LORE_REPO}/contents/${MANUAL_PATH}?ref=${LORE_REF}`;
const response = await fetch(url, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github.raw+json',
    'user-agent': 'numinia-web-lore-fetch',
  },
});
if (!response.ok) {
  console.error(`fetch-lore: ${LORE_REPO}/${MANUAL_PATH}@${LORE_REF} → HTTP ${response.status}.`);
  process.exit(1);
}
const text = await response.text();
if (!text.includes('CAPÍTULO')) {
  console.error('fetch-lore: response does not look like the manual (no CAPÍTULO markers).');
  process.exit(1);
}
mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, text);
console.log(`fetch-lore: ${TARGET} written (${text.length} chars) from ${LORE_REPO}@${LORE_REF}.`);
