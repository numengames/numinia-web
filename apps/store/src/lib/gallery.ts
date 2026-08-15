/**
 * Gallery view-model (MISSION-003 P1) — the avatar-first storefront.
 * Derives from the memoized archive: avatars only, grouped by collection
 * (projectId), collections and members in deterministic order.
 */

import type { Asset } from '@numinia/domain';
import { loadArchive } from './archive';

export interface GalleryCollection {
  readonly id: string;
  readonly avatars: readonly Asset[];
}

const UNGROUPED = 'uncollected';

export async function loadGallery(): Promise<readonly GalleryCollection[]> {
  const archive = await loadArchive();
  const byCollection = new Map<string, Asset[]>();
  for (const { asset, category } of archive) {
    if (category !== 'avatars') continue;
    const key = asset.projectId || UNGROUPED;
    const group = byCollection.get(key);
    if (group) {
      group.push(asset);
    } else {
      byCollection.set(key, [asset]);
    }
  }
  return [...byCollection.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, avatars]) => ({
      id,
      avatars: [...avatars].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
