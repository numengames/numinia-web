/**
 * Glossary parsing (MIS-085): the glossary MD's ## Término / prose /
 * _Fuente: …._ shape becomes structured entries. Pure text-in, data-out —
 * no Vite APIs — so the export pipeline (scripts/build-exports.mjs) can run
 * it under plain Node alongside the site build.
 */

export interface GlossaryEntry {
  readonly term: string;
  readonly definition: string;
  readonly source: string;
}

/** The glossary MD (## Término / prose / _Fuente: …._) as structured entries. */
export function parseGlossary(raw: string): readonly GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  const sections = raw.split(/^## /m).slice(1);
  for (const section of sections) {
    const [head, ...rest] = section.split('\n');
    const term = (head ?? '').trim();
    if (!term || term.startsWith('Términos sin fuente')) continue;
    const body = rest.join('\n').trim();
    const sourceMatch = /_Fuente: ([\s\S]+?)_\s*$/.exec(body);
    const definition = (sourceMatch ? body.slice(0, sourceMatch.index) : body)
      .replaceAll('\n', ' ')
      .trim();
    entries.push({
      term,
      definition,
      source: sourceMatch ? `Fuente: ${sourceMatch[1]!.replaceAll('\n', ' ').trim()}` : '',
    });
  }
  return entries;
}
