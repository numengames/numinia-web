/**
 * The home's Bazar block (the app shell, v0.83.0; «Recién llegado al Bazar»
 * since v3): a handful of the city's
 * digital goods, each card saying only what the catalogue says — its
 * picture, kind and format, its name, its own line, its size and version
 * when stated, its shelf, and the licence. Nothing here is invented: a fact
 * the catalogue does not hold is left out, never filled with a guess.
 *
 * Pure: the page hands in the archive (lib/archive.ts loads it once).
 */

import type { Community } from './communities';
import type { AssetCategory, CatalogedAsset } from './data';
import { thumbSrc, thumbSrcSet } from './thumbs';

/** One community's shelf on the Bazar: who, and how many goods it has uploaded. */
interface CommunityShelf {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}

/**
 * The Bazar's line of shelves per community (v3): only the communities that
 * have uploaded something — never a «· 0». Every good of the archive comes
 * from the house's own data repository, so today they are all the founder's
 * (Numen Games: and the house's are everyone's); a community gets its own
 * shelf the day the catalogue says it uploaded something.
 */
export function communityShelves(
  communities: readonly Pick<Community, 'id' | 'name' | 'state'>[],
  archiveSize: number,
): readonly CommunityShelf[] {
  return communities
    .map((community) => ({
      id: community.id,
      name: community.name,
      count: community.state === 'founder' ? archiveSize : 0,
    }))
    .filter((shelf) => shelf.count > 0);
}

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
 * «Recién llegado al Bazar» (v3, «Ahora»): the newest goods the city can
 * give away as they are, by the catalogue's own upload date, newest first
 * (equal dates keep the archive's order), up to `count`.
 */
export function newestGoods(
  archive: readonly CatalogedAsset[],
  count = 4,
): readonly CatalogedAsset[] {
  return archive
    .filter(showable)
    .map((entry, index) => ({ entry, index }))
    .sort(
      (a, b) => b.entry.asset.createdAt.localeCompare(a.entry.asset.createdAt) || a.index - b.index,
    )
    .slice(0, Math.max(0, count))
    .map(({ entry }) => entry);
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
