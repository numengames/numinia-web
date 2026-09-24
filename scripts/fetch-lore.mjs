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
// reads twenty-one files).
const rawUrl = (path) => `https://raw.githubusercontent.com/${LORE_REPO}/${LORE_REF}/${path}`;

// `optional`: an HTTP 404 returns null instead of failing, for the one file
// that may not have landed in the archive yet (see MANUAL_PARTS_EN).
async function read(path, marker, { optional = false } = {}) {
  const response = await fetch(rawUrl(path), {
    headers: { 'user-agent': 'numinia-web-lore-fetch' },
  });
  if (optional && response.status === 404) return null;
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

// The English edition (lore/game/manual/en/), joined the same way into
// .lore/manual-v0_6_0.en.md: numinia.com reads the manual in English on
// every locale but /es, which keeps the Spanish original. The Broken Mirror
// is still being translated: until lore/adventures/the-broken-mirror.md
// exists (HTTP 404) the English manual carries the Spanish module, with a
// warning. Any other missing file is fatal.
const MANUAL_PARTS_EN = [
  ['lore/game/manual/en/00-introduction.md', 'INTRODUCTION'],
  ['lore/game/manual/en/01-welcome-to-numinia.md', 'CHAPTER 1'],
  ['lore/game/manual/en/02-history-and-legends-of-numinia.md', 'CHAPTER 2'],
  ['lore/game/manual/en/03-character-creation.md', 'CHAPTER 3'],
  ['lore/game/manual/en/04-game-system.md', 'CHAPTER 4'],
  ['lore/game/manual/en/05-geography-and-culture-of-numinia.md', 'CHAPTER 5'],
  ['lore/game/manual/en/06-inventory-and-bestiary.md', 'CHAPTER 6'],
  ['lore/game/manual/en/07-building-the-adventure.md', 'CHAPTER 7'],
];
const MODULE_EN = ['lore/adventures/the-broken-mirror.md', 'THE BROKEN MIRROR'];

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

const partsEn = [];
for (const [path, marker] of MANUAL_PARTS_EN) {
  partsEn.push(withoutSpdx(await read(path, marker)).replace(/\n+$/, ''));
}
const moduleEn = await read(MODULE_EN[0], MODULE_EN[1], { optional: true });
if (moduleEn === null) {
  console.warn(
    `fetch-lore: ${MODULE_EN[0]} not in the archive yet (HTTP 404); the English manual carries the Spanish module.`,
  );
  partsEn.push(parts.at(-1));
} else {
  partsEn.push(withoutSpdx(moduleEn).replace(/\n+$/, ''));
}
write(
  join('apps/store', '.lore', 'manual-v0_6_0.en.md'),
  `${partsEn.join('\n\n\n')}\n`,
  `${partsEn.length} files, ${LORE_REPO}@${LORE_REF}`,
);

for (const file of FILES) {
  write(file.target, await read(file.path, file.marker), `${LORE_REPO}@${LORE_REF}`);
}
