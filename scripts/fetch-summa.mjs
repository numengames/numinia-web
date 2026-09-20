// Fetch the Summa's entity cards from the archive into the gitignored
// apps/store/.lore/summa/ directory: objects/catalogue.json (the index the
// archive generates from its cards) and each card's Markdown body. Same
// two-source pattern as fetch-lore.mjs — production deploys run this before
// building; hermetic/CI builds (DATA_SOURCE=fixture) use fixtures/summa/.
//
// Fails loud when the catalogue cannot be read: a deploy must not silently
// ship the snapshot as the live registry. A card body that cannot be read
// is a warning, not a failure — the catalogue still renders the licences,
// copies and download; only the description and history go missing.
//
// The archive is PUBLIC: no token is sent (a stale token turned a public
// read into HTTP 401 on 2026-09-16 and blocked every deploy for a day).
// Unauthenticated GitHub allows 60 requests/hour per IP; this makes one
// per card plus one.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ARCHIVE_REPO = process.env.LORE_REPO ?? 'numengames/numinia-archive';
const ARCHIVE_REF = process.env.LORE_REF ?? 'main';
const OUT = join('apps/store', '.lore', 'summa');

const headers = {
  accept: 'application/vnd.github.raw+json',
  'user-agent': 'numinia-web-summa-fetch',
};

const rawUrl = (path) =>
  `https://api.github.com/repos/${ARCHIVE_REPO}/contents/${path}?ref=${ARCHIVE_REF}`;

const catalogueResponse = await fetch(rawUrl('objects/catalogue.json'), { headers });
if (!catalogueResponse.ok) {
  console.error(
    `fetch-summa: ${ARCHIVE_REPO}/objects/catalogue.json@${ARCHIVE_REF} → HTTP ${catalogueResponse.status}.`,
  );
  process.exit(1);
}
const catalogueText = await catalogueResponse.text();
let catalogue;
try {
  catalogue = JSON.parse(catalogueText);
} catch {
  console.error('fetch-summa: objects/catalogue.json is not JSON.');
  process.exit(1);
}
if (!Array.isArray(catalogue.entities)) {
  console.error('fetch-summa: objects/catalogue.json has no `entities` list.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'catalogue.json'), catalogueText);
console.log(
  `fetch-summa: ${OUT}/catalogue.json written (${catalogue.entities.length} card(s)) from ${ARCHIVE_REPO}@${ARCHIVE_REF}.`,
);

for (const card of catalogue.entities) {
  const response = await fetch(rawUrl(card.path), { headers });
  if (!response.ok) {
    console.warn(`fetch-summa: ${card.path} → HTTP ${response.status}; the card renders without its body.`);
    continue;
  }
  const text = await response.text();
  writeFileSync(join(OUT, `${card.slug}.md`), text);
  console.log(`fetch-summa: ${OUT}/${card.slug}.md written (${text.length} chars).`);
}
