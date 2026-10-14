/**
 * The home's Bazar block (the app shell, v0.83.0): a handful of the city's
 * digital goods, each card saying only what the catalogue says — its
 * picture, kind and format, its name, its own line, its size and version
 * when stated, its shelf, and the licence. Nothing here is invented: a fact
 * the catalogue does not hold is left out, never filled with a guess.
 *
 * Pure: the page hands in the archive (lib/archive.ts loads it once).
 */

import type { AssetCategory, CatalogedAsset } from './data';
import { thumbSrc, thumbSrcSet } from './thumbs';

/**
 * The house's pick for the home, in order: the eight of the approved
 * wireframe (the Oracle, 2026-10-14). A pick the catalogue no longer holds
 * is skipped and the newest goods fill its place.
 */
export const HOME_GOODS: readonly string[] = [
  'avatar-arla-mncdhz3l',
  'ndg-019d3e6c-129a-701e-95fc-ce1754d5c917',
  'starter-avatar-01',
  'pot-vapor-02',
  'starter-chair-01',
  'ndg-019d3ded-a1dd-7e0e-aeff-cb155bdff3d8',
  'ndg-019d3e66-c8d0-7fd2-b5a8-fca1af183e43',
  'ndg-019d3e75-7731-7261-913d-842515f90190',
];

/**
 * Where an object's page lives. One helper, so the cut that moves the big
 * layered page under the Bazar changes one line.
 */
export function objectHref(id: string, prefix: string): string {
  return `${prefix}/archive/${id}/`;
}

/** Only goods the city can give away as they are: CC0, with a picture to show. */
function showable(entry: CatalogedAsset): boolean {
  return (
    /^cc0\b/i.test(entry.asset.license.trim()) &&
    thumbSrc(entry.asset.id, entry.asset.thumbnailUrl) !== null
  );
}

/**
 * The goods the home shows: the house's picks first, in their order, then
 * the rest of the archive in its own order (the newest first), up to
 * `count`, each once.
 */
export function homeGoods(
  archive: readonly CatalogedAsset[],
  count = 8,
  picks: readonly string[] = HOME_GOODS,
): readonly CatalogedAsset[] {
  const pool = archive.filter(showable);
  const chosen: CatalogedAsset[] = [];
  for (const id of picks) {
    const entry = pool.find((candidate) => candidate.asset.id === id);
    if (entry && !chosen.includes(entry)) chosen.push(entry);
  }
  for (const entry of pool) {
    if (!chosen.includes(entry)) chosen.push(entry);
  }
  return chosen.slice(0, Math.max(0, count));
}

/**
 * The admin tool writes "GLB asset uploaded via Numinia Admin" when nobody
 * wrote a line: that says nothing about the object, so the card shows none.
 */
const PLACEHOLDER = /^\w+ asset uploaded via numinia admin\.?$/i;

/** The object's own line, or null when the catalogue has none worth showing. */
export function catalogueLine(description: string): string | null {
  const line = description.trim().replace(/\s+/g, ' ');
  return line === '' || PLACEHOLDER.test(line) ? null : line;
}

const NUMBER_LOCALE: Readonly<Record<string, string>> = {
  es: 'es-ES',
  ja: 'ja-JP',
  ko: 'ko-KR',
  'pt-br': 'pt-BR',
};

/** A file size as a reader says it: "196 KB", "8,9 MB". */
export function sizeText(bytes: number, locale: string): string {
  const format = new Intl.NumberFormat(NUMBER_LOCALE[locale] ?? 'en-GB', {
    maximumFractionDigits: 1,
  });
  if (bytes < 1_048_576) return `${format.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${format.format(Math.round((bytes / 1_048_576) * 10) / 10)} MB`;
}

/** What one card of the block shows, already in the page's language where it can be. */
export interface GoodCard {
  readonly id: string;
  readonly name: string;
  readonly category: AssetCategory;
  /** The format as a label: VRM, GLB, HYP… */
  readonly format: string;
  readonly line: string | null;
  /** The size and the version, when the catalogue states them — nothing else. */
  readonly facts: readonly string[];
  /** The shelf it sits on (the catalogue's project), or '' when it has none. */
  readonly collection: string;
  readonly thumb: string | null;
  /** The baked picture's 1x/2x srcset (v0.89.0); null for a remote one. */
  readonly thumbSrcSet: string | null;
}

export function goodCard(entry: CatalogedAsset, locale: string): GoodCard {
  const { asset } = entry;
  const facts: string[] = [];
  if (asset.sizeBytes !== null) facts.push(sizeText(asset.sizeBytes, locale));
  if (asset.version !== null) facts.push(`v${asset.version.replace(/^v/i, '')}`);
  return {
    id: asset.id,
    name: asset.name,
    category: entry.category,
    format: asset.format.toUpperCase(),
    line: catalogueLine(asset.description),
    facts,
    collection: asset.projectId.trim(),
    thumb: thumbSrc(asset.id, asset.thumbnailUrl),
    thumbSrcSet: thumbSrcSet(asset.id),
  };
}
