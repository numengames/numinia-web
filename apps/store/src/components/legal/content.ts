/**
 * Legal corpus registry — the Vite glob lives here (outside src/lib)
 * because markdown modules only exist inside the Astro/Vite build, not in
 * vitest. Same pattern as components/docs/content.ts.
 *
 * The files are verbatim copies of the numinia-archive masters (LEG-001…
 * LEG-004): read-only here. Astro renders only the Markdown body; the
 * frontmatter (review flags included) never reaches the page.
 */

import type { MarkdownInstance } from 'astro';
import { LEGAL_DOC_SLUG, legalDocForSlug, type LegalDoc } from '../../lib/legal';

export interface LegalEntry {
  readonly title: string;
  readonly version: string | undefined;
  readonly updated: string | undefined;
  readonly module: MarkdownInstance<Record<string, unknown>>;
}

const modules = import.meta.glob<MarkdownInstance<Record<string, unknown>>>(
  '../../content/legal/*.md',
  { eager: true },
);

const entries = new Map<LegalDoc, LegalEntry>();
for (const [file, module] of Object.entries(modules)) {
  const doc = legalDocForSlug(file.slice(file.lastIndexOf('/') + 1, -'.md'.length));
  if (!doc) continue;
  const frontmatter = module.frontmatter;
  entries.set(doc, {
    title: String(frontmatter['title'] ?? doc),
    version: typeof frontmatter['version'] === 'string' ? frontmatter['version'] : undefined,
    updated: typeof frontmatter['updated'] === 'string' ? frontmatter['updated'] : undefined,
    module,
  });
}

/** Throws at build time when a doc has no copy — never a blank page. */
export function legalEntry(doc: LegalDoc): LegalEntry {
  const entry = entries.get(doc);
  if (!entry) {
    throw new Error(`Missing legal corpus file "${LEGAL_DOC_SLUG[doc]}.md" (src/content/legal/)`);
  }
  return entry;
}
