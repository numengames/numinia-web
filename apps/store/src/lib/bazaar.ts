/**
 * The Bazaar's view-model (v0.83.0) — the Finder rethought: every public
 * good of the city as one flat, serializable list, resolved at build time so
 * the island ships plain data and no domain resolvers (and no zod).
 *
 * Server side only: it reads the catalogue. The island imports
 * bazaar-view.ts, never this file.
 */

import type { AssetFormat } from '@numinia/domain';
import { downloadUrl, loadArchive } from './archive';
import type { AssetCategory } from './data';
import { thumbSrc } from './thumbs';

export interface BazaarItem {
  readonly id: string;
  readonly name: string;
  /** The catalogue's one line about it; null when it has only the upload tool's stamp. */
  readonly line: string | null;
  readonly format: AssetFormat;
  readonly category: AssetCategory;
  /** The catalogue's collection (its project id); `uncollected` when it has none. */
  readonly collection: string;
  readonly license: string;
  /** The card's picture: the baked local WebP when there is one, the catalogue's otherwise. */
  readonly thumbnailUrl: string | null;
  /** Best binary URL from the storage chain; null when nothing is reachable. */
  readonly url: string | null;
  /** When the good entered the catalogue (ISO 8601): the «newest first» order. */
  readonly createdAt: string;
}

export const UNCOLLECTED = 'uncollected';

/**
 * The catalogue's own line about a good — but not the upload tool's stamp
 * («GLB asset uploaded via Numinia Admin»), which says nothing about it.
 */
export function lineOf(description: string): string | null {
  const text = description.trim();
  if (text === '' || /uploaded via numinia admin/i.test(text)) return null;
  return text;
}

/** Every public good, newest first (the archive's order). */
export async function loadBazaarItems(): Promise<readonly BazaarItem[]> {
  const archive = await loadArchive();
  return archive.map(({ asset, category }) => ({
    id: asset.id,
    name: asset.name,
    line: lineOf(asset.description),
    format: asset.format,
    category,
    collection: asset.projectId || UNCOLLECTED,
    license: asset.license,
    thumbnailUrl: thumbSrc(asset.id, asset.thumbnailUrl),
    url: downloadUrl(asset),
    createdAt: asset.createdAt,
  }));
}
