/**
 * Codex source resolution (MIS-085 Phase A), same two-source pattern as the
 * legacy reader: the real v0.6.0 manual arrives via `npm run lore:fetch`
 * into the gitignored .lore/ directory; hermetic/CI builds use the committed
 * synthetic fixture. Both are bundle-embedded (Workers have no node:fs).
 * DATA_SOURCE=fixture forces the fixture even when the real corpus exists.
 *
 * Two editions: the Spanish original (.lore/manual-v0_6_0.md) and the
 * English one (.lore/manual-v0_6_0.en.md). numinia.com reads the English on
 * every locale but /es. With no English source (fixture/CI builds, or a
 * corpus fetched before it existed) the English reader falls back to the
 * Spanish text — never an empty Códex.
 */
import { buildManifest, type CodexManifest } from './manifest.js';
import { splitManual, type CodexChapter } from './parse.js';

const loreFiles = import.meta.glob('../../../.lore/manual-v0_6_0.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const loreFilesEn = import.meta.glob('../../../.lore/manual-v0_6_0.en.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureFiles = import.meta.glob('../../../fixtures/manual/manual-v0_6_0-fixture.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const realManual = Object.values(loreFiles)[0];
const fixtureManual = Object.values(fixtureFiles)[0];
// Direct property read on purpose (see src/lib/env.ts): bundlers replace
// `process.env.DATA_SOURCE`, which keeps this Worker-safe.
const resolved = (process.env.DATA_SOURCE === 'fixture' ? undefined : realManual) ?? fixtureManual;
if (resolved === undefined) {
  // Fail closed and loud: the fixture is committed, so this only fires if
  // the repo itself is broken — never silently render an empty Códex.
  throw new Error('Codex source missing: neither .lore/manual-v0_6_0.md nor the fixture resolved.');
}
const codexRaw: string = resolved;
const realManualEn = Object.values(loreFilesEn)[0];
const codexRawEn: string =
  (process.env.DATA_SOURCE === 'fixture' ? undefined : realManualEn) ?? codexRaw;

/** The manual's language: the Spanish original or the English edition. */
export type CodexLang = 'es' | 'en';

/** /es reads the Spanish original; every other locale the English. */
export function codexLang(locale: string): CodexLang {
  return locale === 'es' ? 'es' : 'en';
}

export interface Codex {
  readonly chapters: readonly CodexChapter[];
  readonly manifest: CodexManifest;
}

/** The whole canonical file, verbatim — the free .md download (D6). */
export function codexSourceText(lang: CodexLang = 'es'): string {
  return lang === 'en' ? codexRawEn : codexRaw;
}

const cache = new Map<CodexLang, Codex>();

/** The v0.6.0 manual, split once per build from the canonical single file. */
export function loadCodex(lang: CodexLang = 'es'): Codex {
  let codex = cache.get(lang);
  if (codex === undefined) {
    const chapters = splitManual(codexSourceText(lang));
    codex = { chapters, manifest: buildManifest(chapters) };
    cache.set(lang, codex);
  }
  return codex;
}
