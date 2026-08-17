/**
 * Glossary term linking (MIS-085 B §4.8): every chapter may link its terms
 * to the glossary. Print convention: only the FIRST occurrence per chapter
 * links — a reference mark, not confetti. Pure string-in/string-out (no
 * Vite APIs) so tests and future export editions can reuse it. The text is
 * sacred: linking wraps occurrences, it never rewrites one character.
 */

import type { GlossaryEntry } from './glossary.js';
import { slugify } from './parse.js';

export interface TermTarget {
  /** Surface form as it reads in prose (case-sensitive). */
  readonly pattern: string;
  /** Anchor slug of the glossary entry the form belongs to. */
  readonly slug: string;
}

/**
 * Surface forms of each entry: the plain term, both halves of a
 * «X (Y)» pair, and «X, El» read as «El X». Longest first, so compound
 * terms always win over their fragments.
 */
export function glossaryVariants(entries: readonly GlossaryEntry[]): readonly TermTarget[] {
  const targets: TermTarget[] = [];
  for (const entry of entries) {
    const slug = slugify(entry.term);
    const parenthetical = /^(.+?)\s*\((.+)\)$/.exec(entry.term);
    const inverted = /^(.+), (El|La|Los|Las)$/.exec(entry.term);
    const forms = parenthetical
      ? [parenthetical[1]!, parenthetical[2]!]
      : inverted
        ? [`${inverted[2]!} ${inverted[1]!}`]
        : [entry.term];
    for (const pattern of forms) targets.push({ pattern: pattern.trim(), slug });
  }
  return targets.sort((a, b) => b.pattern.length - a.pattern.length);
}

const escapeRegExp = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tags whose text content never links: headings read as structure. */
const SKIP_TAGS = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'sup']);

/**
 * Wrap the first occurrence of each glossary term in the HTML's TEXT
 * nodes with a link to `${hrefBase}#slug`. Markup, attributes, headings
 * and existing anchors are never touched.
 */
export function linkGlossaryTerms(
  html: string,
  targets: readonly TermTarget[],
  hrefBase: string,
): string {
  if (targets.length === 0) return html;
  const alternation = targets.map((target) => escapeRegExp(target.pattern)).join('|');
  const matcher = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, 'gu');
  const bySurface = new Map(targets.map((target) => [target.pattern, target] as const));
  const linked = new Set<string>();

  const segments = html.split(/(<[^>]+>)/);
  let skipDepth = 0;
  return segments
    .map((segment) => {
      if (segment.startsWith('<')) {
        const tag = /^<\/?([a-z][a-z0-9]*)/i.exec(segment)?.[1]?.toLowerCase();
        if (tag && SKIP_TAGS.has(tag) && !segment.endsWith('/>')) {
          skipDepth += segment.startsWith('</') ? -1 : 1;
          if (skipDepth < 0) skipDepth = 0;
        }
        return segment;
      }
      if (skipDepth > 0 || segment === '') return segment;
      return segment.replaceAll(matcher, (occurrence) => {
        const target = bySurface.get(occurrence);
        if (!target || linked.has(target.slug)) return occurrence;
        linked.add(target.slug);
        return `<a class="termino" href="${hrefBase}#${target.slug}">${occurrence}</a>`;
      });
    })
    .join('');
}
