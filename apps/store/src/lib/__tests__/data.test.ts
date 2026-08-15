/**
 * Unit tests for the build-time data layer. The network is always stubbed;
 * fixture paths exercise the same schema as production (anti-tautology:
 * fixtures are snapshots of the real data repo, validated by @numinia/domain).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ASSET_CATEGORIES,
  fetchAllCatalogs,
  fetchAvatarCatalog,
  loadFixtureCatalog,
  loadFixtureCatalogs,
  publicAssets,
  type CatalogedAsset,
} from '../data';

const CONFIG = { owner: 'o', repo: 'r', branch: 'b' } as const;

async function fixtureJson(name: string): Promise<unknown> {
  return JSON.parse(await readFile(join(process.cwd(), 'fixtures', name), 'utf8'));
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

function errorResponse(status: number): Response {
  return { ok: false, status, json: () => Promise.reject(new Error('no body')) } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAvatarCatalog', () => {
  it('builds the raw.githubusercontent URL from config and parses the catalog', async () => {
    const catalog = await fixtureJson('avatar-catalog.json');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(catalog));
    vi.stubGlobal('fetch', fetchMock);
    const assets = await fetchAvatarCatalog(CONFIG);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/o/r/b/data/avatars/numinia-avatars.json',
    );
    expect(assets.length).toBeGreaterThan(0);
    expect(assets[0]?.id).toBeTruthy();
  });

  it('fails loudly with status and URL on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(503)));
    await expect(fetchAvatarCatalog(CONFIG)).rejects.toThrow(
      /Failed to fetch avatar catalog: HTTP 503 \(.*numinia-avatars\.json\)/,
    );
  });

  it('fails loudly when the payload does not match the domain schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ nonsense: true }])));
    await expect(fetchAvatarCatalog(CONFIG)).rejects.toThrow();
  });
});

describe('loadFixtureCatalog', () => {
  it('loads and validates the committed snapshot from the app root by default', async () => {
    const assets = await loadFixtureCatalog();
    expect(assets.length).toBeGreaterThan(0);
  });

  it('accepts an explicit path', async () => {
    const explicit = join(process.cwd(), 'fixtures', 'avatar-catalog.json');
    const assets = await loadFixtureCatalog(explicit);
    expect(assets.length).toBeGreaterThan(0);
  });

  it('fails loudly on a file that is valid JSON but not a catalog', async () => {
    await expect(loadFixtureCatalog(join(process.cwd(), 'package.json'))).rejects.toThrow();
  });
});

describe('fetchAllCatalogs', () => {
  it('fetches every category and tags each asset with it', async () => {
    const byCategory = (await fixtureJson('catalogs.json')) as Record<string, unknown[]>;
    const fetchMock = vi.fn((url: string) => {
      const category = ASSET_CATEGORIES.find((c) => {
        const dir = c === 'models' ? 'assets' : c;
        return url.includes(`/data/${dir}/`);
      });
      return Promise.resolve(jsonResponse(byCategory[category ?? ''] ?? []));
    });
    vi.stubGlobal('fetch', fetchMock);
    const all = await fetchAllCatalogs(CONFIG);
    expect(fetchMock).toHaveBeenCalledTimes(ASSET_CATEGORIES.length);
    const seenCategories = new Set(all.map((entry) => entry.category));
    for (const category of ASSET_CATEGORIES) {
      if ((byCategory[category] ?? []).length > 0) {
        expect(seenCategories.has(category)).toBe(true);
      }
    }
    const total = ASSET_CATEGORIES.reduce((n, c) => n + (byCategory[c]?.length ?? 0), 0);
    expect(all).toHaveLength(total);
  });

  it('names the failing category and URL on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(404)));
    await expect(fetchAllCatalogs(CONFIG)).rejects.toThrow(
      /Failed to fetch models catalog: HTTP 404/,
    );
  });
});

describe('loadFixtureCatalogs', () => {
  it('loads every category from the committed multi-catalog snapshot', async () => {
    const all = await loadFixtureCatalogs();
    expect(all.length).toBeGreaterThan(0);
    for (const entry of all) {
      expect(ASSET_CATEGORIES).toContain(entry.category);
      expect(entry.asset.id).toBeTruthy();
    }
  });
});

describe('publicAssets', () => {
  it('keeps only published, non-draft assets', async () => {
    const all = await loadFixtureCatalogs();
    const template = all[0] as CatalogedAsset;
    const variant = (patch: Partial<CatalogedAsset['asset']>): CatalogedAsset => ({
      category: template.category,
      asset: { ...template.asset, ...patch },
    });
    const mixed = [
      variant({ id: 'keep', isPublic: true, isDraft: false }),
      variant({ id: 'private', isPublic: false, isDraft: false }),
      variant({ id: 'draft', isPublic: true, isDraft: true }),
      variant({ id: 'both', isPublic: false, isDraft: true }),
    ];
    expect(publicAssets(mixed).map((entry) => entry.asset.id)).toEqual(['keep']);
  });
});
