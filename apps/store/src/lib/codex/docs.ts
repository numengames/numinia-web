/**
 * Codex edition documents (MIS-085): glossary and acknowledgments live in
 * numinia-lore/codex/ and arrive via `npm run lore:fetch`, same two-source
 * pattern as the manual — committed fixtures keep hermetic builds honest.
 * Authoring comments (HTML comments in the MD) never reach the page.
 *
 * Two editions, like the manual: the Spanish documents (.lore/codex/*.md)
 * and the English ones (.lore/codex/en/*.md, English file names). Until an
 * English document lands in the archive the English edition carries the
 * Spanish one — never an empty page.
 */
import type { CodexLang } from './source.js';

const loreFiles = import.meta.glob('../../../.lore/codex/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const loreFilesEn = import.meta.glob('../../../.lore/codex/en/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureFiles = import.meta.glob('../../../fixtures/codex/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureFilesEn = import.meta.glob('../../../fixtures/codex/en/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export type CodexDocName = 'glosario' | 'agradecimientos' | 'hoja-de-personaje';

/** The English edition's file name for each document (lore/codex/en/). */
export const CODEX_DOC_EN: Readonly<Record<CodexDocName, string>> = {
  glosario: 'glossary',
  agradecimientos: 'acknowledgments',
  'hoja-de-personaje': 'character-sheet',
};

function pick(files: Record<string, string>, name: string): string | undefined {
  const entry = Object.entries(files).find(([path]) => path.endsWith(`/${name}.md`));
  return entry?.[1];
}

export function loadCodexDoc(name: CodexDocName, lang: CodexLang = 'es'): string {
  const fixture = process.env.DATA_SOURCE === 'fixture';
  // English first when asked for; the Spanish document is its fallback.
  const english =
    lang === 'en' ? pick(fixture ? fixtureFilesEn : loreFilesEn, CODEX_DOC_EN[name]) : undefined;
  const real = fixture ? undefined : pick(loreFiles, name);
  const resolved = english ?? real ?? pick(fixtureFiles, name);
  if (resolved === undefined) {
    throw new Error(`Codex doc missing: neither .lore/codex/${name}.md nor its fixture resolved.`);
  }
  return resolved.replaceAll(/<!--[\s\S]*?-->/g, '').trim();
}
