/**
 * Build-time data access — MISSION-000 data spike.
 * Fetches the public data repo catalog and validates it with the domain
 * schema. A mismatch fails the build loudly (never assume the repo shape).
 */

import { parseAssetCatalog, type Asset } from '@numinia/domain';

// Committed fixtures travel as imports: hermetic builds on any runtime.
import avatarCatalogFixture from '../../fixtures/avatar-catalog.json';
import catalogsFixture from '../../fixtures/catalogs.json';

const RAW_BASE = 'https://raw.githubusercontent.com';

export interface DataSourceConfig {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
}

function catalogUrl(config: DataSourceConfig, path: string): string {
  return `${RAW_BASE}/${config.owner}/${config.repo}/${config.branch}/${path}`;
}

export async function fetchAvatarCatalog(config: DataSourceConfig): Promise<readonly Asset[]> {
  const url = catalogUrl(config, 'data/avatars/numinia-avatars.json');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch avatar catalog: HTTP ${response.status} (${url})`);
  }
  return parseAssetCatalog(await response.json());
}

/**
 * Hermetic alternative (DATA_SOURCE=fixture): a committed snapshot of the real
 * catalog, validated by the exact same schema — offline dev and deterministic
 * CI without weakening the loud-failure guarantee of the network path.
 */
export async function loadFixtureCatalog(fixturePath?: string): Promise<readonly Asset[]> {
  // A path argument still reads the disk (tests use it); the default path is
  // the IMPORTED snapshot, so the build graph carries no node:fs — Cloudflare
  // Workers have none, and the prerender runs inside one.
  if (fixturePath) {
    const { readFile } = await import('node:fs/promises');
    return parseAssetCatalog(JSON.parse(await readFile(fixturePath, 'utf8')));
  }
  return parseAssetCatalog(avatarCatalogFixture);
}

// ---------------------------------------------------------------------------
// Multi-catalog archive (MISSION-001)
// ---------------------------------------------------------------------------

export const ASSET_CATEGORIES = [
  'models',
  'avatars',
  'worlds',
  'audio',
  'video',
  'images',
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

const CATALOG_PATHS: Readonly<Record<AssetCategory, string>> = {
  models: 'data/assets/numinia-assets.json',
  avatars: 'data/avatars/numinia-avatars.json',
  worlds: 'data/worlds/numinia-worlds.json',
  audio: 'data/audio/numinia-audio.json',
  video: 'data/video/numinia-video.json',
  images: 'data/images/numinia-images.json',
  // 3dprint deliberately absent: the catalog is 404 (data-doctor report).
};

export interface CatalogedAsset {
  readonly asset: Asset;
  readonly category: AssetCategory;
}

export async function fetchAllCatalogs(
  config: DataSourceConfig,
): Promise<readonly CatalogedAsset[]> {
  const results: CatalogedAsset[] = [];
  for (const category of ASSET_CATEGORIES) {
    const url = catalogUrl(config, CATALOG_PATHS[category]);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${category} catalog: HTTP ${response.status} (${url})`);
    }
    for (const asset of parseAssetCatalog(await response.json())) {
      results.push({ asset, category });
    }
  }
  return results;
}

export async function loadFixtureCatalogs(): Promise<readonly CatalogedAsset[]> {
  const raw = catalogsFixture as Record<string, unknown>;
  const results: CatalogedAsset[] = [];
  for (const category of ASSET_CATEGORIES) {
    for (const asset of parseAssetCatalog(raw[category])) {
      results.push({ asset, category });
    }
  }
  return results;
}

/** The public archive shows only published, non-draft assets. */
export function publicAssets(all: readonly CatalogedAsset[]): readonly CatalogedAsset[] {
  return all.filter(({ asset }) => asset.isPublic && !asset.isDraft);
}
