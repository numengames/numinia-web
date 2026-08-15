/**
 * Docs content registry — the Vite glob lives here (outside src/lib) because
 * markdown modules only exist inside the Astro/Vite build, not in vitest.
 */

import type { MarkdownInstance } from 'astro';
import { slugFromFile, sortNav, type DocNavEntry, type DocsContentLocale } from '../../lib/docs';

export interface DocPage {
  readonly slug: string;
  readonly title: string;
  readonly legacy: boolean;
  readonly module: MarkdownInstance<Record<string, unknown>>;
}

const modules = import.meta.glob<MarkdownInstance<Record<string, unknown>>>(
  '../../content/docs/**/*.md',
  { eager: true },
);

const byLocale = new Map<DocsContentLocale, Map<string, DocPage>>();
for (const [file, module] of Object.entries(modules)) {
  const parsed = slugFromFile(file);
  if (!parsed) continue;
  const pages = byLocale.get(parsed.locale) ?? new Map<string, DocPage>();
  byLocale.set(parsed.locale, pages);
  pages.set(parsed.slug, {
    slug: parsed.slug,
    title: String(module.frontmatter['title'] ?? parsed.slug),
    legacy: module.frontmatter['legacy'] === true,
    module,
  });
}

export function docsNav(locale: DocsContentLocale): readonly DocNavEntry[] {
  const pages = byLocale.get(locale);
  if (!pages) return [];
  return sortNav([...pages.values()].map(({ slug, title }) => ({ slug, title })));
}

export function docPage(locale: DocsContentLocale, slug: string): DocPage | null {
  return byLocale.get(locale)?.get(slug) ?? null;
}
