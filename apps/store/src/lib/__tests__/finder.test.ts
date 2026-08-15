/**
 * Unit tests for the finder view-model: serializable tree (category →
 * collection → items) and the pure queue helpers used by the island.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toggleQueued } from '../finder-state';

async function importFinder(): Promise<typeof import('../finder')> {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
  return import('../finder');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadFinderTree', () => {
  it('covers every public asset exactly once, in a serializable shape', async () => {
    const { loadFinderTree } = await importFinder();
    const { loadArchive } = await import('../archive');
    const tree = await loadFinderTree();
    const archiveIds = (await loadArchive()).map((entry) => entry.asset.id).sort();
    const treeItems = tree
      .flatMap((category) => category.collections.flatMap((collection) => collection.items))
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(treeItems.map((item) => item.id)).toEqual(archiveIds);
    // Serializable: plain data only, survives a JSON round-trip intact.
    expect(JSON.parse(JSON.stringify(tree))).toEqual(tree);
    for (const item of treeItems) {
      expect(item.name).toBeTruthy();
      expect(item.format).toBeTruthy();
      expect(typeof item.url === 'string' || item.url === null).toBe(true);
    }
  });

  it('orders categories, collections, and items deterministically', async () => {
    const { loadFinderTree } = await importFinder();
    const tree = await loadFinderTree();
    expect(tree.length).toBeGreaterThan(0);
    for (const category of tree) {
      const collectionIds = category.collections.map((collection) => collection.id);
      expect(collectionIds).toEqual([...collectionIds].sort((a, b) => a.localeCompare(b)));
      for (const collection of category.collections) {
        expect(collection.items.length).toBeGreaterThan(0);
        const names = collection.items.map((item) => item.name);
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      }
    }
  });
});

describe('loadFinderTree (edge shapes)', () => {
  it('buckets missing collections under "uncollected" and merges repeated keys', async () => {
    vi.stubEnv('GITHUB_REPO_OWNER', 'o');
    vi.stubEnv('GITHUB_REPO_NAME', 'r');
    vi.stubEnv('DATA_SOURCE', 'fixture');
    const { loadArchive } = await import('../archive');
    const template = (await loadArchive())[0]!.asset;
    vi.resetModules();
    vi.doMock('../archive', () => ({
      loadArchive: () =>
        Promise.resolve([
          { category: 'models', asset: { ...template, id: 'm1', name: 'B', projectId: '' } },
          { category: 'models', asset: { ...template, id: 'm2', name: 'A', projectId: '' } },
          { category: 'audio', asset: { ...template, id: 's1', name: 'S', projectId: 'sounds' } },
          { category: 'models', asset: { ...template, id: 'm3', name: 'C', projectId: 'aaa' } },
        ]),
      downloadUrl: () => null,
    }));
    const { loadFinderTree } = await import('../finder');
    const tree = await loadFinderTree();
    vi.doUnmock('../archive');
    expect(tree.map((category) => category.id)).toEqual(['audio', 'models']);
    const models = tree[1]!.collections;
    expect(models.map((collection) => collection.id)).toEqual(['aaa', 'uncollected']);
    expect(models[1]!.items.map((item) => item.name)).toEqual(['A', 'B']);
    expect(models[1]!.items.every((item) => item.url === null)).toBe(true);
  });
});

describe('toggleQueued', () => {
  it('adds unknown ids and removes known ones without mutating', () => {
    const empty: readonly string[] = [];
    const one = toggleQueued(empty, 'a');
    expect(one).toEqual(['a']);
    expect(empty).toEqual([]);
    expect(toggleQueued(one, 'b')).toEqual(['a', 'b']);
    expect(toggleQueued(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleQueued(['a'], 'a')).toEqual([]);
  });
});
