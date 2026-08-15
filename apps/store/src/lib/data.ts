/**
 * Build-time data access — MISSION-000 data spike.
 * Fetches the public data repo catalog and validates it with the domain
 * schema. A mismatch fails the build loudly (never assume the repo shape).
 */

import { parseAssetCatalog, type Asset } from '@numinia/domain';

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
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  // Resolve from the app root (build cwd), not import.meta.url — prerender
  // relocates modules into dist/ and would break relative resolution.
  const resolved = fixturePath ?? join(process.cwd(), 'fixtures', 'avatar-catalog.json');
  const raw = await readFile(resolved, 'utf8');
  return parseAssetCatalog(JSON.parse(raw));
}
