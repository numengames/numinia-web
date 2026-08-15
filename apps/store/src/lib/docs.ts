/**
 * Docs view-model (MISSION-003 P4) — pure helpers for the resources section.
 * Content files live in src/content/docs/{en,ja}/**; slugs mirror the
 * original site: `about/glb`, section indexes collapse (`about/readme` → `about`,
 * the root `readme` → '').
 */

export type DocsContentLocale = 'en' | 'ja';

export interface DocNavEntry {
  readonly slug: string;
  readonly title: string;
}

/** `…/docs/en/about/glb.md` → locale + slug; null for paths outside the tree. */
export function slugFromFile(file: string): { locale: DocsContentLocale; slug: string } | null {
  const match = /\/docs\/(en|ja)\/(.+)\.md$/.exec(file);
  if (!match) return null;
  const locale = match[1] as DocsContentLocale;
  const path = match[2] as string;
  if (path === 'readme') return { locale, slug: '' };
  return { locale, slug: path.endsWith('/readme') ? path.slice(0, -'/readme'.length) : path };
}

const SECTION_ORDER = ['', 'about', 'avatar-collections', 'developers', 'help'];

function sectionOf(slug: string): string {
  return slug.includes('/') ? (slug.split('/')[0] as string) : slug;
}

function sectionRank(slug: string): number {
  const index = SECTION_ORDER.indexOf(sectionOf(slug));
  return index === -1 ? SECTION_ORDER.length : index;
}

/** Stable sidebar order: known sections first, index before children, then alpha. */
export function sortNav(entries: readonly DocNavEntry[]): readonly DocNavEntry[] {
  return [...entries].sort((a, b) => {
    const bySection = sectionRank(a.slug) - sectionRank(b.slug);
    if (bySection !== 0) return bySection;
    return a.slug.localeCompare(b.slug);
  });
}

/** Previous/next entries around `slug` in nav order; null at the edges. */
export function prevNext(
  nav: readonly DocNavEntry[],
  slug: string,
): { prev: DocNavEntry | null; next: DocNavEntry | null } {
  const index = nav.findIndex((entry) => entry.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return { prev: nav[index - 1] ?? null, next: nav[index + 1] ?? null };
}
