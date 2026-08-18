/**
 * Codex edition documents (MIS-085): glossary and acknowledgments live in
 * numinia-lore/codex/ and arrive via `npm run lore:fetch`, same two-source
 * pattern as the manual — committed fixtures keep hermetic builds honest.
 * Authoring comments (HTML comments in the MD) never reach the page.
 */

const loreFiles = import.meta.glob('../../../.lore/codex/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureFiles = import.meta.glob('../../../fixtures/codex/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export type CodexDocName = 'glosario' | 'agradecimientos' | 'hoja-de-personaje';

function pick(files: Record<string, string>, name: CodexDocName): string | undefined {
  const entry = Object.entries(files).find(([path]) => path.endsWith(`/${name}.md`));
  return entry?.[1];
}

export function loadCodexDoc(name: CodexDocName): string {
  const real = process.env.DATA_SOURCE === 'fixture' ? undefined : pick(loreFiles, name);
  const resolved = real ?? pick(fixtureFiles, name);
  if (resolved === undefined) {
    throw new Error(`Codex doc missing: neither .lore/codex/${name}.md nor its fixture resolved.`);
  }
  return resolved.replaceAll(/<!--[\s\S]*?-->/g, '').trim();
}
