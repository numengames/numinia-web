/**
 * Archive data access — one build-time load, memoized across every route
 * module (index + detail × 5 locales would otherwise refetch the catalogs).
 */

import { resolveAssetUrl, type Asset } from '@numinia/domain';
import { env } from './env';
import { fetchAllCatalogs, loadFixtureCatalogs, publicAssets, type CatalogedAsset } from './data';

let archivePromise: Promise<readonly CatalogedAsset[]> | null = null;

export function loadArchive(): Promise<readonly CatalogedAsset[]> {
  archivePromise ??= (
    env.dataSource === 'fixture'
      ? loadFixtureCatalogs()
      : fetchAllCatalogs({
          owner: env.githubRepoOwner,
          repo: env.githubRepoName,
          branch: env.githubBranch,
        })
  ).then((all) =>
    [...publicAssets(all)].sort((a, b) => b.asset.createdAt.localeCompare(a.asset.createdAt)),
  );
  return archivePromise;
}

export async function findArchivedAsset(id: string): Promise<CatalogedAsset | undefined> {
  const archive = await loadArchive();
  return archive.find((entry) => entry.asset.id === id);
}

/** Best-available binary URL: storage chain first, catalog URL as last resort. */
export function downloadUrl(asset: Asset): string | null {
  return resolveAssetUrl(asset.storage) ?? (asset.modelFileUrl ? asset.modelFileUrl : null);
}
