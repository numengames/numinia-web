// Fetch the seminal manual(s) from the lore repository into the gitignored
// apps/store/.lore/ directory (Oracle order 2026-08-16: lore left the code
// repo). Production deploys run this before building so the Codex ships the
// real corpus; hermetic/CI builds skip it and use the fixtures. Fails loud:
// a deploy that cannot reach the lore must not silently ship the synthetic
// manual to citizens.
//
// The lore repo went PUBLIC on 2026-08-17 (MIS-085 D1, all rights reserved),
// so a token is no longer required — but one is still used when present
// (higher rate limits, and resilience if visibility ever changes back).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LORE_REPO = process.env.LORE_REPO ?? 'numengames/numinia-lore';
const LORE_REF = process.env.LORE_REF ?? 'main';

// The v0.6.0 manual feeds the Codex pipeline (MIS-085); the codex/ docs are
// the edition matter (glossary, acknowledgments) rendered around it.
const FILES = [
  {
    path: 'seminal/Numinia_Manual_del_juego_de_rol_v0_6_0.md',
    target: join('apps/store', '.lore', 'manual-v0_6_0.md'),
    marker: 'CAPÍTULO',
  },
  {
    path: 'codex/glosario.md',
    target: join('apps/store', '.lore', 'codex', 'glosario.md'),
    marker: '# Glosario',
  },
  {
    path: 'codex/agradecimientos.md',
    target: join('apps/store', '.lore', 'codex', 'agradecimientos.md'),
    marker: '# Agradecimientos',
  },
];

const token = process.env.LORE_TOKEN ?? process.env.GITHUB_TOKEN;
const headers = {
  accept: 'application/vnd.github.raw+json',
  'user-agent': 'numinia-web-lore-fetch',
  ...(token ? { authorization: `Bearer ${token}` } : {}),
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
