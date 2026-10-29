/**
 * The Bazaar's pure helpers (v0.83.0) — what the island does with the list
 * the build hands it: the filters (a kind of good, a collection, formats, a
 * search), the two orders, the counts beside each filter, the download
 * queue, the object page's address and the names the files take in the zip.
 *
 * Client-safe: type-only imports from the catalogue's modules, no zod and no
 * domain runtime — the island imports this file (bazaar.ts it must not).
 */

import type { AssetFormat } from '@numinia/domain';
import type { BazaarItem } from './bazaar';
import type { AssetCategory } from './data';
import { isProxyableMediaUrl, viewerProxyUrl } from './media-proxy';

/** The order the filter column lists the kinds of goods in. */
export const BAZAAR_CATEGORIES: readonly AssetCategory[] = [
  'avatars',
  'models',
  'worlds',
  'audio',
  'video',
  'images',
];

/** The formats in the domain's order (a test pins it to ASSET_FORMATS). */
export const BAZAAR_FORMATS: readonly AssetFormat[] = [
  'glb',
  'vrm',
  'hyp',
  'mp3',
  'mp4',
  'png',
  'jpg',
];

/**
 * The formats whose own file is their picture (v0.89.0, «si es un JPG
 * debería de tener el JPG pintado»): the card and the preview show the
 * picture itself, never the kind's glyph. The domain holds no WebP yet;
 * when it does, it joins here.
 */
export const PICTURE_FORMATS: readonly AssetFormat[] = ['png', 'jpg'];

/** Whether a good of this format is a picture. */
export function isPicture(format: AssetFormat): boolean {
  return PICTURE_FORMATS.includes(format);
}

export type BazaarSort = 'recent' | 'name';

export interface BazaarFilter {
  /** null: every kind of good. */
  readonly category: AssetCategory | null;
  /** null: every collection of that kind. */
  readonly collection: string | null;
  /** Empty: every format. */
  readonly formats: readonly AssetFormat[];
  readonly query: string;
}

export const NO_FILTER: BazaarFilter = { category: null, collection: null, formats: [], query: '' };

/**
 * The chips as a query string (MIS-268): ?category=, ?collection=, and one
 * ?format= per format, so a copied address repaints the same filters. The
 * search words stay out: they are typed, not chosen.
 */
export function filterToSearch(filter: BazaarFilter): string {
  const params = new URLSearchParams();
  if (filter.category !== null) params.set('category', filter.category);
  if (filter.collection !== null) params.set('collection', filter.collection);
  for (const format of filter.formats) params.append('format', format);
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

/**
 * The chips from a query string. Unknown kinds and formats are dropped, a
 * collection without a kind is ignored, and the formats keep the domain's
 * order whatever order the address gives them.
 */
export function filterFromSearch(search: string): BazaarFilter {
  const params = new URLSearchParams(search);
  const category = BAZAAR_CATEGORIES.find((c) => c === params.get('category')) ?? null;
  const collection = category === null ? null : params.get('collection') || null;
  const asked = params.getAll('format');
  const formats = BAZAAR_FORMATS.filter((format) => asked.includes(format));
  return { category, collection, formats, query: '' };
}

/** Lower case with the accents folded: «imágenes» finds «Imagenes», and the reverse. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Whether a good passes the filter. The search wants every word somewhere
 * in its name, its line, its format, its collection or its kind's label.
 */
export function matches(item: BazaarItem, filter: BazaarFilter, kindLabel: string): boolean {
  if (filter.category !== null && item.category !== filter.category) return false;
  if (filter.collection !== null && item.collection !== filter.collection) return false;
  if (filter.formats.length > 0 && !filter.formats.includes(item.format)) return false;
  const words = fold(filter.query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold([item.name, item.line, item.format, item.collection, kindLabel].join(' '));
  return words.every((word) => haystack.includes(word));
}

/** Newest first (ties by name), or by name; never sorts in place. */
export function sortItems(
  items: readonly BazaarItem[],
  sort: BazaarSort,
  locale: string,
): BazaarItem[] {
  const byName = (a: BazaarItem, b: BazaarItem): number =>
    a.name.localeCompare(b.name, locale, { numeric: true, sensitivity: 'base' });
  return [...items].sort(
    sort === 'name' ? byName : (a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b),
  );
}

export interface CategoryFacet {
  readonly category: AssetCategory;
  readonly count: number;
  /** Its collections, by id; the column lists them only when there are two or more. */
  readonly collections: readonly { readonly id: string; readonly count: number }[];
}

/** The kinds of goods present, in the column's order, each with its count and collections. */
export function categoryFacets(items: readonly BazaarItem[]): CategoryFacet[] {
  return BAZAAR_CATEGORIES.map((category) => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.category === category) {
        counts.set(item.collection, (counts.get(item.collection) ?? 0) + 1);
      }
    }
    const collections = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({ id, count }));
    return { category, count: collections.reduce((sum, c) => sum + c.count, 0), collections };
  }).filter((facet) => facet.count > 0);
}

/** The formats present, in the domain's order, each with its count. */
export function formatFacets(
  items: readonly BazaarItem[],
): { readonly format: AssetFormat; readonly count: number }[] {
  return BAZAAR_FORMATS.map((format) => ({
    format,
    count: items.filter((item) => item.format === format).length,
  })).filter((facet) => facet.count > 0);
}

/** Toggle an id in the download queue, preserving insertion order. */
export function toggleQueued(queue: readonly string[], id: string): readonly string[] {
  return queue.includes(id) ? queue.filter((queued) => queued !== id) : [...queue, id];
}

/** Toggle a format in the filter, keeping the domain's order. */
export function toggleFormat(
  formats: readonly AssetFormat[],
  format: AssetFormat,
): readonly AssetFormat[] {
  const next = formats.includes(format)
    ? formats.filter((f) => f !== format)
    : [...formats, format];
  return BAZAAR_FORMATS.filter((f) => next.includes(f));
}

const prefixOf = (locale: string): string => (locale === 'en' ? '' : `/${locale}`);

/** The Bazaar's own address in a locale. */
export function bazaarHref(locale: string): string {
  return `${prefixOf(locale)}/bazaar/`;
}

/**
 * A good's object page (its ficha). The ONE place that knows the address,
 * so the next cut can move the pages under /bazaar/ in one line.
 */
export function objectHref(locale: string, id: string): string {
  return `${prefixOf(locale)}/archive/${id}/`;
}

/** «{n} objetos», with its number. */
export function countLabel(n: number, one: string, other: string): string {
  return fill(n === 1 ? one : other, { n });
}

/**
 * A label with its {placeholders} filled — fill('{n} de {total}', { n: 1,
 * total: 3 }); a placeholder without a value stays as it is.
 */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : whole,
  );
}

/**
 * Where the island fetches a good's bytes for the zip: through the
 * same-origin media proxy when its host is on the storage chain (the R2
 * bucket sends no CORS headers), from the address itself otherwise.
 */
export function fetchUrlFor(url: string): string {
  return (isProxyableMediaUrl(url) ? viewerProxyUrl(url) : null) ?? url;
}

/**
 * A file name every system takes: no folder separators, reserved characters
 * or control codes, no leading dots, at most 120 characters; the fallback
 * when nothing is left.
 */
export function safeFileName(name: string, fallback: string): string {
  const clean = name
    // eslint-disable-next-line no-control-regex -- control codes are exactly what goes
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.]+$/g, '')
    .slice(0, 120)
    .trim();
  return clean === '' ? fallback : clean;
}

/**
 * The names the queued goods take inside the zip — «Avatar Arla.vrm»; a
 * second «Emotes.hyp» becomes «Emotes (2).hyp» (compared without case).
 */
export function zipEntryNames(
  items: readonly Pick<BazaarItem, 'id' | 'name' | 'format'>[],
): string[] {
  const taken = new Set<string>();
  return items.map((item) => {
    const stem = safeFileName(item.name, item.id);
    let name = `${stem}.${item.format}`;
    for (let n = 2; taken.has(name.toLowerCase()); n += 1) name = `${stem} (${n}).${item.format}`;
    taken.add(name.toLowerCase());
    return name;
  });
}

/** The zip's own name, on the visitor's day: numinia-bazaar-2026-10-14.zip. */
export function zipFileName(when: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `numinia-bazaar-${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}.zip`;
}

/** The note that travels inside every zip (no good can take its name: theirs end in a format). */
export const ZIP_README = 'README.txt';

/**
 * The note's text: the heading, then one line per file in the zip — its
 * name there, its licence and the address of its page on this site.
 */
export function zipReadme(
  heading: string,
  origin: string,
  locale: string,
  files: readonly { readonly name: string; readonly item: Pick<BazaarItem, 'id' | 'license'> }[],
): string {
  const lines = files.map(
    ({ name, item }) => `- ${name} · ${item.license} · ${origin}${objectHref(locale, item.id)}`,
  );
  return `${[heading, '', ...lines].join('\n')}\n`;
}
