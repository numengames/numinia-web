/**
 * The home's Bazar block (the app shell, v0.83.0): which goods it shows and
 * what each card says — only what the catalogue holds, never a guess. Reads
 * the committed fixture catalogue, the one CI builds from.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogedAsset } from '../data';
import {
  catalogueLine,
  communityShelves,
  goodCard,
  newestGoods,
  objectHref,
  sizeText,
} from '../goods';

async function fixtureArchive(): Promise<readonly CatalogedAsset[]> {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
  const { loadArchive } = await import('../archive');
  return loadArchive();
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A catalogued good built from a real one, with the facts a test needs. */
function good(
  template: CatalogedAsset,
  patch: Partial<CatalogedAsset['asset']>,
  category: CatalogedAsset['category'] = 'models',
): CatalogedAsset {
  return { category, asset: { ...template.asset, ...patch } };
}

describe('objectHref', () => {
  it('builds an object page address in one place, per locale', () => {
    expect(objectHref('pot-vapor-02', '')).toBe('/archive/pot-vapor-02/');
    expect(objectHref('pot-vapor-02', '/es')).toBe('/es/archive/pot-vapor-02/');
  });
});

describe('communityShelves', () => {
  const founder = { id: 'numen-games', name: 'Numen Games', state: 'founder' as const };
  const other = { id: 'trgcon', name: 'La Tarugo · TRGCON', state: 'opened' as const };

  it('shows only the communities with goods: today the founder, with the whole archive', () => {
    expect(communityShelves([other, founder], 32)).toEqual([
      { id: 'numen-games', name: 'Numen Games', count: 32 },
    ]);
  });

  it('never draws a shelf of nothing', () => {
    expect(communityShelves([other, founder], 0)).toEqual([]);
    expect(communityShelves([other], 32)).toEqual([]);
  });
});

describe('newestGoods', () => {
  it('shows the four newest goods by their upload date, newest first', async () => {
    const archive = await fixtureArchive();
    const shown = newestGoods(archive);
    expect(shown).toHaveLength(4);
    const dates = shown.map((entry) => entry.asset.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('keeps the archive order between equal dates, and an empty count is empty', async () => {
    const [template] = await fixtureArchive();
    const at = (id: string, createdAt: string): CatalogedAsset =>
      good(template!, { id, createdAt, license: 'CC0', thumbnailUrl: `https://x/${id}.png` });
    const shelf = [at('a', '2026-01-01'), at('b', '2026-03-01'), at('c', '2026-01-01')];
    expect(newestGoods(shelf, 99).map((entry) => entry.asset.id)).toEqual(['b', 'a', 'c']);
    expect(newestGoods(shelf, 0)).toEqual([]);
    expect(newestGoods(shelf, -2)).toEqual([]);
  });

  it('shows only goods the city can give away as they are: CC0, with a picture', async () => {
    const [template] = await fixtureArchive();
    const free = good(template!, {
      id: 'free',
      license: 'CC0-1.0',
      thumbnailUrl: 'https://x/free.png',
    });
    const lower = good(template!, {
      id: 'lower',
      license: ' cc0 ',
      thumbnailUrl: 'https://x/l.png',
    });
    const credited = good(template!, {
      id: 'credited',
      license: 'CC-BY-4.0',
      thumbnailUrl: 'https://x/c.png',
    });
    const blind = good(template!, { id: 'blind', license: 'CC0', thumbnailUrl: null });
    expect(newestGoods([free, credited, blind, lower], 8).map((entry) => entry.asset.id)).toEqual([
      'free',
      'lower',
    ]);
  });
});

describe('catalogueLine', () => {
  it('keeps the object own line, tidied', () => {
    expect(catalogueLine('  Lyra is an exegete\n who works at the  Library ')).toBe(
      'Lyra is an exegete who works at the Library',
    );
  });

  it('shows no line where the catalogue has none worth showing', () => {
    expect(catalogueLine('')).toBeNull();
    expect(catalogueLine('   ')).toBeNull();
    expect(catalogueLine('GLB asset uploaded via Numinia Admin')).toBeNull();
    expect(catalogueLine('vrm asset uploaded via numinia admin.')).toBeNull();
  });
});

describe('sizeText', () => {
  it('says a size the way a reader does, in the page language', () => {
    expect(sizeText(200_676, 'en')).toBe('196 KB');
    expect(sizeText(9_311_896, 'en')).toBe('8.9 MB');
    expect(sizeText(9_311_896, 'es')).toBe('8,9 MB');
    expect(sizeText(9_311_896, 'pt-br')).toBe('8,9 MB');
    expect(sizeText(1_048_576, 'ja')).toBe('1 MB');
    expect(sizeText(12, 'ko')).toBe('1 KB');
    expect(sizeText(2_048, 'xx')).toBe('2 KB');
  });
});

describe('goodCard', () => {
  it('states the size and the version only when the catalogue does', async () => {
    const archive = await fixtureArchive();
    const byId = (id: string): CatalogedAsset =>
      archive.find((entry) => entry.asset.id === id) as CatalogedAsset;

    const lyra = goodCard(byId('ndg-019d3e6c-129a-701e-95fc-ce1754d5c917'), 'es');
    expect(lyra).toEqual({
      id: 'ndg-019d3e6c-129a-701e-95fc-ce1754d5c917',
      name: 'Avatar Lyra',
      category: 'avatars',
      format: 'VRM',
      line: 'Lyra is an exegete who works at the Atlantis Library',
      facts: ['8,9 MB', 'v0.1.0'],
      collection: 'numinia-avatars',
      thumb: '/thumbs/ndg-019d3e6c-129a-701e-95fc-ce1754d5c917.webp',
      thumbSrcSet:
        '/thumbs/1x/ndg-019d3e6c-129a-701e-95fc-ce1754d5c917.webp 1x, /thumbs/ndg-019d3e6c-129a-701e-95fc-ce1754d5c917.webp 2x',
    });

    // The admin's placeholder is no line; a version without a size is just the version.
    const arla = goodCard(byId('avatar-arla-mncdhz3l'), 'en');
    expect(arla.line).toBeNull();
    expect(arla.facts).toEqual(['v1.0.0']);
  });

  it('never doubles the v, and says nothing it was not told', async () => {
    const [template] = await fixtureArchive();
    const tagged = goodCard(good(template!, { version: 'V2.1', sizeBytes: null }), 'en');
    expect(tagged.facts).toEqual(['v2.1']);
    const bare = goodCard(
      good(template!, { version: null, sizeBytes: null, projectId: '  ', format: 'hyp' }),
      'en',
    );
    expect(bare.facts).toEqual([]);
    expect(bare.collection).toBe('');
    expect(bare.format).toBe('HYP');
  });
});
