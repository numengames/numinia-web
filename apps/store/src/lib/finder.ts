/**
 * Finder view-model (MISSION-003 P2) — the archive reshaped as a serializable
 * category → collection → item tree, resolved at build time so the island
 * ships plain data and no domain resolvers.
 */

import type { AssetFormat } from '@numinia/domain';
import { loadArchive, downloadUrl } from './archive';
import type { AssetCategory } from './data';

export interface FinderItem {
  readonly id: string;
  readonly name: string;
  readonly format: AssetFormat;
  readonly thumbnailUrl: string | null;
  /** Best binary URL from the storage chain; null when nothing is reachable. */
  readonly url: string | null;
}

export interface FinderCollection {
  readonly id: string;
  readonly items: readonly FinderItem[];
}

export interface FinderCategory {
  readonly id: AssetCategory;
  readonly collections: readonly FinderCollection[];
}

const UNGROUPED = 'uncollected';

export async function loadFinderTree(): Promise<readonly FinderCategory[]> {
  const archive = await loadArchive();
  const byCategory = new Map<AssetCategory, Map<string, FinderItem[]>>();
  for (const { asset, category } of archive) {
    const collections = byCategory.get(category) ?? new Map<string, FinderItem[]>();
    byCategory.set(category, collections);
    const key = asset.projectId || UNGROUPED;
    const items = collections.get(key) ?? [];
    collections.set(key, items);
    items.push({
      id: asset.id,
      name: asset.name,
      format: asset.format,
      thumbnailUrl: asset.thumbnailUrl,
      url: downloadUrl(asset),
    });
  }
  return [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, collections]) => ({
      id,
      collections: [...collections.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([collectionId, items]) => ({
          id: collectionId,
          items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }));
}
