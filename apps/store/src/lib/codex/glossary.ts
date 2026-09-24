/**
 * Glossary parsing (MIS-085): the glossary MD's ## Término / prose /
 * _Fuente: …._ shape becomes structured entries. Pure text-in, data-out —
 * no Vite APIs — so the export pipeline (scripts/build-exports.mjs) can run
 * it under plain Node alongside the site build.
 *
 * The English glossary (lore/codex/en/glossary.md) has the same shape with
 * translated headwords — ## Term / prose / _Source: …._ — and its closing
 * note on unsourced terms is skipped the same way as the Spanish one.
 */

export interface GlossaryEntry {
  readonly term: string;
  readonly definition: string;
  readonly source: string;
}

/** The closing «terms without a source» note: a remark, not an entry. */
const UNSOURCED_RE = /^(?:Términos sin fuente|Terms? (?:without|with no|lacking)\b|Unsourced\b)/i;
/** The source line, Spanish or English; the label keeps its own word. */
const SOURCE_RE = /_(Fuente|Source): ([\s\S]+?)_\s*$/;

/** The glossary MD (## Término / prose / _Fuente: …._) as structured entries. */
export function parseGlossary(raw: string): readonly GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  const sections = raw.split(/^## /m).slice(1);
  for (const section of sections) {
    const [head, ...rest] = section.split('\n');
    const term = (head ?? '').trim();
    if (!term || UNSOURCED_RE.test(term)) continue;
    const body = rest.join('\n').trim();
    const sourceMatch = SOURCE_RE.exec(body);
    const definition = (sourceMatch ? body.slice(0, sourceMatch.index) : body)
      .replaceAll('\n', ' ')
      .trim();
    entries.push({
      term,
      definition,
      source: sourceMatch
        ? `${sourceMatch[1]!}: ${sourceMatch[2]!.replaceAll('\n', ' ').trim()}`
        : '',
    });
  }
  return entries;
}
