/**
 * Unit tests for the memoized archive loader. `../env` parses process.env at
 * module scope, so each test that needs different env re-imports the module
 * graph with vi.resetModules() after stubbing the environment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function stubFixtureEnv(): void {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
}

async function importArchive(): Promise<typeof import('../archive')> {
  return import('../archive');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('loadArchive (DATA_SOURCE=fixture)', () => {
  it('returns only public non-draft assets, newest first', async () => {
    stubFixtureEnv();
    const { loadArchive } = await importArchive();
    const archive = await loadArchive();
    expect(archive.length).toBeGreaterThan(0);
    for (const { asset } of archive) {
      expect(asset.isPublic).toBe(true);
      expect(asset.isDraft).toBe(false);
    }
    const dates = archive.map(({ asset }) => asset.createdAt);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });

  it('memoizes: repeated calls share one load', async () => {
    stubFixtureEnv();
    const { loadArchive } = await importArchive();
    expect(loadArchive()).toBe(loadArchive());
  });
});

describe('loadArchive (DATA_SOURCE=network)', () => {
  it('fetches from the configured repo coordinates', async () => {
    vi.stubEnv('GITHUB_REPO_OWNER', 'net-owner');
    vi.stubEnv('GITHUB_REPO_NAME', 'net-repo');
    vi.stubEnv('GITHUB_BRANCH', 'net-branch');
    vi.stubEnv('DATA_SOURCE', 'network');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { loadArchive } = await importArchive();
    expect(await loadArchive()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('raw.githubusercontent.com/net-owner/net-repo/net-branch/'),
    );
  });
});

describe('findArchivedAsset', () => {
  it('finds a known id and returns undefined for an unknown one', async () => {
    stubFixtureEnv();
    const { loadArchive, findArchivedAsset } = await importArchive();
    const [first] = await loadArchive();
    expect(first).toBeDefined();
    expect((await findArchivedAsset(first!.asset.id))?.asset.id).toBe(first!.asset.id);
    expect(await findArchivedAsset('no-such-id')).toBeUndefined();
  });
});

describe('downloadUrl', () => {
  it('prefers the storage chain and falls back to modelFileUrl, else null', async () => {
    stubFixtureEnv();
    const { loadArchive, downloadUrl } = await importArchive();
    const [first] = await loadArchive();
    const asset = first!.asset;

    const chained = {
      ...asset,
      storage: { ...asset.storage, arweaveTx: 'TX123' },
    };
    expect(downloadUrl(chained)).toBe('https://arweave.net/TX123');

    const emptyStorage = { r2Url: null, ipfsCid: null, arweaveTx: null, githubRawUrl: null };
    const fallback = {
      ...asset,
      storage: emptyStorage,
      modelFileUrl: 'https://example.com/file.vrm',
    };
    expect(downloadUrl(fallback)).toBe('https://example.com/file.vrm');

    const nothing = { ...asset, storage: emptyStorage, modelFileUrl: '' };
    expect(downloadUrl(nothing)).toBeNull();
  });
});
