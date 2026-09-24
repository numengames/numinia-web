// Fetch the manual and the Codex matter from the archive into the
// gitignored apps/store/.lore/ directory. The lore lives in
// numengames/numinia-archive under lore/. Production deploys run this before
// building so the Codex ships the real corpus; hermetic/CI builds skip it
// and use the fixtures. Fails loud: a deploy that cannot reach the lore
// must not silently ship the synthetic manual to citizens.
//
// The archive is a PUBLIC repository (its lore/ is CC0 since 2026-09-24),
// so NO token is needed. None is sent, either:
// on 2026-09-16 a stale LORE_TOKEN turned a public read into HTTP 401 and
// blocked every deploy for a day.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LORE_REPO = process.env.LORE_REPO ?? 'numengames/numinia-archive';
const LORE_REF = process.env.LORE_REF ?? 'main';

// Plain file reads from raw.githubusercontent.com: the archive is public,
// and these do not spend the API's 60-requests/hour budget (this script
// reads twelve files).
const rawUrl = (path) => `https://raw.githubusercontent.com/${LORE_REPO}/${LORE_REF}/${path}`;

async function read(path, marker) {
  const response = await fetch(rawUrl(path), {
    headers: { 'user-agent': 'numinia-web-lore-fetch' },
  });
  if (!response.ok) {
    console.error(`fetch-lore: ${LORE_REPO}/${path}@${LORE_REF} → HTTP ${response.status}.`);
    process.exit(1);
  }
  const text = await response.text();
  if (!text.includes(marker)) {
    console.error(`fetch-lore: ${path} does not look right (marker "${marker}" missing).`);
    process.exit(1);
  }
  return text;
}

function write(target, text, from) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
  console.log(`fetch-lore: ${target} written (${text.length} chars) from ${from}.`);
}

// Each lore file opens with its own licence comment (<!-- SPDX-… -->,
// CC0-1.0). It is the file's licence, not the book's text: dropped when
// the chapters are joined into one manual.
const withoutSpdx = (text) =>
  text.startsWith('<!--') ? text.slice(text.indexOf('-->') + 3).replace(/^\n+/, '') : text;

// The v0.6.0 manual, one file per chapter in the archive since 2026-09-24
// (lore/game/manual/es/). The Codex pipeline (MIS-085) still reads ONE
// manual and splits it on the chapter markers, so the chapters are joined
// here, in order, into .lore/manual-v0_6_0.md. El Espejo Roto is no longer
// part of the manual — it is a module of its own (lore/adventures/) — and
// is appended after chapter 7 so the Codex keeps offering it as its module.
const MANUAL_PARTS = [
  ['lore/game/manual/es/00-introduccion.md', 'INTRODUCCIÓN'],
  ['lore/game/manual/es/01-bienvenidos-a-numinia.md', 'CAPÍTULO 1'],
  ['lore/game/manual/es/02-historia-y-leyendas-de-numinia.md', 'CAPÍTULO 2'],
  ['lore/game/manual/es/03-creacion-del-personaje.md', 'CAPÍTULO 3'],
  ['lore/game/manual/es/04-sistema-de-juego.md', 'CAPÍTULO 4'],
  ['lore/game/manual/es/05-geografia-y-cultura-de-numinia.md', 'CAPÍTULO 5'],
  ['lore/game/manual/es/06-inventario-y-bestiario.md', 'CAPÍTULO 6'],
  ['lore/game/manual/es/07-construyendo-la-aventura.md', 'CAPÍTULO 7'],
  ['lore/adventures/el-espejo-roto.md', 'EL ESPEJO ROTO'],
];

// The codex/ docs are the edition matter (glossary, acknowledgments,
// character sheet) rendered around the manual.
const FILES = [
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

const parts = [];
for (const [path, marker] of MANUAL_PARTS) {
  parts.push(withoutSpdx(await read(path, marker)).replace(/\n+$/, ''));
}
write(
  join('apps/store', '.lore', 'manual-v0_6_0.md'),
  `${parts.join('\n\n\n')}\n`,
  `${MANUAL_PARTS.length} files, ${LORE_REPO}@${LORE_REF}`,
);

for (const file of FILES) {
  write(file.target, await read(file.path, file.marker), `${LORE_REPO}@${LORE_REF}`);
}
