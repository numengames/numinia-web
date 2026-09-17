// Fetch the manual and the Codex matter from the archive into the
// gitignored apps/store/.lore/ directory. The lore lives in
// numengames/numinia-nwos under lore/ (Oracle, 2026-09-17: the separate
// numinia-lore repository retires; before that, 2026-08-16, it had left
// this code repo — ADR-020 here). Production deploys run this before
// building so the Codex ships the real corpus; hermetic/CI builds skip it
// and use the fixtures. Fails loud: a deploy that cannot reach the lore
// must not silently ship the synthetic manual to citizens.
//
// The archive is a PUBLIC repository (its lore/ is all rights reserved —
// readable is not licensed), so NO token is needed. None is sent, either:
// on 2026-09-16 a stale LORE_TOKEN turned a public read into HTTP 401 and
// blocked every deploy for a day. Unauthenticated GitHub API allows 60
// requests/hour per IP; this script makes four.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LORE_REPO = process.env.LORE_REPO ?? 'numengames/numinia-nwos';
const LORE_REF = process.env.LORE_REF ?? 'main';

// The v0.6.0 manual feeds the Codex pipeline (MIS-085); the codex/ docs are
// the edition matter (glossary, acknowledgments) rendered around it.
const FILES = [
  {
    path: 'lore/game/manual-v0.6.0.md',
    target: join('apps/store', '.lore', 'manual-v0_6_0.md'),
    marker: 'CAPÍTULO',
  },
  {
    path: 'lore/codex/glosario.md',
    target: join('apps/store', '.lore', 'codex', 'glosario.md'),
    marker: '# Glosario',
  },
  {
    path: 'lore/codex/agradecimientos.md',
    target: join('apps/store', '.lore', 'codex', 'agradecimientos.md'),
    marker: '# Agradecimientos',
  },
  {
    path: 'lore/codex/hoja-de-personaje.md',
    target: join('apps/store', '.lore', 'codex', 'hoja-de-personaje.md'),
    marker: '# Hoja de Personaje',
  },
];

const headers = {
  accept: 'application/vnd.github.raw+json',
  'user-agent': 'numinia-web-lore-fetch',
};

for (const file of FILES) {
  const url = `https://api.github.com/repos/${LORE_REPO}/contents/${file.path}?ref=${LORE_REF}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    console.error(`fetch-lore: ${LORE_REPO}/${file.path}@${LORE_REF} → HTTP ${response.status}.`);
    process.exit(1);
  }
  const text = await response.text();
  if (!text.includes(file.marker)) {
    console.error(
      `fetch-lore: ${file.path} does not look right (marker "${file.marker}" missing).`,
    );
    process.exit(1);
  }
  mkdirSync(dirname(file.target), { recursive: true });
  writeFileSync(file.target, text);
  console.log(
    `fetch-lore: ${file.target} written (${text.length} chars) from ${LORE_REPO}@${LORE_REF}.`,
  );
}
