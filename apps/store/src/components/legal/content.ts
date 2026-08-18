/**
 * Legal corpus registry (MIS-086) — the Vite glob lives here (outside
 * src/lib) because markdown modules only exist inside the Astro/Vite build,
 * not in vitest. Same pattern as components/docs/content.ts.
 *
 * The files are verbatim copies of the numinia-nwos masters: read-only here.
 */

import type { MarkdownInstance } from 'astro';
import { PUBLISHED_LEGAL_DOCS, type PublishedLegalDoc } from '../../lib/legal';

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

const entries = new Map<PublishedLegalDoc, LegalEntry>();
for (const [file, module] of Object.entries(modules)) {
  const slug = file.slice(file.lastIndexOf('/') + 1, -'.md'.length);
  if (!(PUBLISHED_LEGAL_DOCS as readonly string[]).includes(slug)) continue;
  const frontmatter = module.frontmatter;
  entries.set(slug as PublishedLegalDoc, {
    title: String(frontmatter['title'] ?? slug),
    version: typeof frontmatter['version'] === 'string' ? frontmatter['version'] : undefined,
    updated: typeof frontmatter['updated'] === 'string' ? frontmatter['updated'] : undefined,
    module,
  });
}

/** Throws at build time when a published doc has no copy — never a blank page. */
export function legalEntry(doc: PublishedLegalDoc): LegalEntry {
  const entry = entries.get(doc);
  if (!entry) throw new Error(`Missing legal corpus file for "${doc}" (src/content/legal/)`);
  return entry;
}
