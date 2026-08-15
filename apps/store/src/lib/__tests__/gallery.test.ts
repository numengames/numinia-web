/**
 * Unit tests for the gallery view-model: avatars only, grouped by collection,
 * deterministic ordering. Runs on the committed fixture (DATA_SOURCE=fixture).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function importGallery(): Promise<typeof import('../gallery')> {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
  return import('../gallery');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadGallery', () => {
  it('returns only avatar assets, all public', async () => {
    const { loadGallery } = await importGallery();
    const collections = await loadGallery();
    expect(collections.length).toBeGreaterThan(0);
    for (const collection of collections) {
      for (const asset of collection.avatars) {
        expect(asset.format).toBe('vrm');
        expect(asset.isPublic).toBe(true);
        expect(asset.isDraft).toBe(false);
      }
    }
  });

  it('groups by collection id with a stable, named order', async () => {
    const { loadGallery } = await importGallery();
    const collections = await loadGallery();
    const ids = collections.map((collection) => collection.id);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(new Set(ids).size).toBe(ids.length);
    for (const collection of collections) {
      expect(collection.id).toBeTruthy();
      expect(collection.avatars.length).toBeGreaterThan(0);
    }
  });

  it('buckets avatars without a collection under "uncollected"', async () => {
    vi.stubEnv('GITHUB_REPO_OWNER', 'o');
    vi.stubEnv('GITHUB_REPO_NAME', 'r');
    vi.stubEnv('DATA_SOURCE', 'fixture');
    const { loadArchive } = await import('../archive');
    const template = (await loadArchive())[0]!.asset;
    vi.resetModules();
    vi.doMock('../archive', () => ({
      loadArchive: () =>
        Promise.resolve([
          { category: 'avatars', asset: { ...template, id: 'b-av', projectId: '' } },
          { category: 'avatars', asset: { ...template, id: 'a-av', projectId: 'zeta' } },
          { category: 'avatars', asset: { ...template, id: 'c-av', projectId: 'zeta' } },
          { category: 'models', asset: { ...template, id: 'not-avatar', projectId: 'zeta' } },
        ]),
    }));
    const { loadGallery } = await import('../gallery');
    const collections = await loadGallery();
    vi.doUnmock('../archive');
    expect(collections.map((collection) => collection.id)).toEqual(['uncollected', 'zeta']);
    expect(collections[1]?.avatars.map((asset) => asset.id)).toEqual(['a-av', 'c-av']);
    expect(collections.flatMap((c) => c.avatars.map((a) => a.id))).not.toContain('not-avatar');
  });

  it('covers every public avatar of the archive exactly once', async () => {
    const { loadGallery } = await importGallery();
    const { loadArchive } = await import('../archive');
    const archiveAvatarIds = (await loadArchive())
      .filter((entry) => entry.category === 'avatars')
      .map((entry) => entry.asset.id)
      .sort();
    const galleryIds = (await loadGallery())
      .flatMap((collection) => collection.avatars.map((asset) => asset.id))
      .sort();
    expect(galleryIds).toEqual(archiveAvatarIds);
  });
});
