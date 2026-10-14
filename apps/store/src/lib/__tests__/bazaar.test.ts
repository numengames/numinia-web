/**
 * Unit tests for the Bazaar: the build-time view-model (every public good,
 * once, serializable, the upload stamp silenced) and the island's pure
 * helpers (filters, orders, counts, queue, addresses, zip names).
 */

import { ASSET_FORMATS, type AssetFormat } from '@numinia/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BazaarItem } from '../bazaar';
import {
  BAZAAR_CATEGORIES,
  BAZAAR_FORMATS,
  NO_FILTER,
  PICTURE_FORMATS,
  bazaarHref,
  categoryFacets,
  countLabel,
  fetchUrlFor,
  fill,
  fold,
  formatFacets,
  isPicture,
  matches,
  objectHref,
  safeFileName,
  sortItems,
  toggleFormat,
  toggleQueued,
  ZIP_README,
  zipEntryNames,
  zipFileName,
  zipReadme,
} from '../bazaar-view';

async function importBazaar(): Promise<typeof import('../bazaar')> {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
  return import('../bazaar');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const item = (over: Partial<BazaarItem> & Pick<BazaarItem, 'id'>): BazaarItem => ({
  name: over.id,
  line: null,
  format: 'glb',
  category: 'models',
  collection: 'numinia-assets',
  license: 'CC0',
  thumbnailUrl: null,
  thumbnailSrcSet: null,
  url: null,
  sizeBytes: null,
  size: null,
  createdAt: '2026-03-01T00:00:00Z',
  ...over,
});

describe('loadBazaarItems', () => {
  it('lists every public good once, newest first, in a serializable shape', async () => {
    const { loadBazaarItems } = await importBazaar();
    const { loadArchive } = await import('../archive');
    const items = await loadBazaarItems('es');
    const archive = await loadArchive();
    expect(items.map((i) => i.id)).toEqual(archive.map((entry) => entry.asset.id));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(JSON.parse(JSON.stringify(items))).toEqual(items);
    const dates = items.map((i) => i.createdAt);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
    for (const good of items) {
      expect(good.name).toBeTruthy();
      expect(BAZAAR_CATEGORIES).toContain(good.category);
      expect(typeof good.url === 'string' || good.url === null).toBe(true);
      expect(good.line ?? '').not.toMatch(/uploaded via numinia admin/i);
    }
  });

  it('says how heavy a good is in the page language, only when the catalogue does', async () => {
    const { loadBazaarItems } = await importBazaar();
    const es = await loadBazaarItems('es');
    const en = await loadBazaarItems('en');
    // portfolio 0.1.4: the 63 MB scene the viewer once showed as an empty box.
    const portfolio = 'ndg-019d49ff-3146-7b5b-a890-79d4fbeb62f5';
    expect(es.find((i) => i.id === portfolio)).toMatchObject({
      sizeBytes: 63_005_556,
      size: '60,1 MB',
    });
    expect(en.find((i) => i.id === portfolio)?.size).toBe('60.1 MB');
    for (const good of es) expect(good.size === null).toBe(good.sizeBytes === null);
  });

  it('serves the baked thumbnail when there is one, and every fixture good is CC0', async () => {
    const { loadBazaarItems } = await importBazaar();
    const items = await loadBazaarItems('en');
    expect(items.find((i) => i.id === 'pot-vapor-02')?.thumbnailUrl).toBe(
      '/thumbs/pot-vapor-02.webp',
    );
    // A density-1 screen takes the 1x cut; a denser one the 480px picture.
    expect(items.find((i) => i.id === 'pot-vapor-02')?.thumbnailSrcSet).toBe(
      '/thumbs/1x/pot-vapor-02.webp 1x, /thumbs/pot-vapor-02.webp 2x',
    );
    expect(items.every((i) => i.license === 'CC0')).toBe(true);
  });

  it('paints every fixture picture with its own baked image, never the glyph', async () => {
    const { loadBazaarItems } = await importBazaar();
    const pictures = (await loadBazaarItems('es')).filter((i) => isPicture(i.format));
    expect(pictures.length).toBeGreaterThan(0);
    for (const picture of pictures) {
      expect(picture.thumbnailUrl).toBe(`/thumbs/${picture.id}.webp`);
    }
  });

  it('files a good without a project under "uncollected"', async () => {
    vi.stubEnv('GITHUB_REPO_OWNER', 'o');
    vi.stubEnv('GITHUB_REPO_NAME', 'r');
    vi.stubEnv('DATA_SOURCE', 'fixture');
    const { loadArchive } = await import('../archive');
    const template = (await loadArchive())[0]!.asset;
    vi.resetModules();
    vi.doMock('../archive', () => ({
      loadArchive: () =>
        Promise.resolve([
          { category: 'models', asset: { ...template, id: 'm1', projectId: '', sizeBytes: null } },
          { category: 'audio', asset: { ...template, id: 's1', projectId: 'sounds' } },
        ]),
      downloadUrl: () => null,
    }));
    const { loadBazaarItems, UNCOLLECTED } = await import('../bazaar');
    const items = await loadBazaarItems('en');
    vi.doUnmock('../archive');
    expect(items.map((i) => [i.id, i.collection, i.url])).toEqual([
      ['m1', UNCOLLECTED, null],
      ['s1', 'sounds', null],
    ]);
    expect(items[0]?.size).toBeNull();
  });
});

describe('lineOf', () => {
  it('keeps a real line and silences the upload stamp and blanks', async () => {
    const { lineOf } = await importBazaar();
    expect(lineOf('  Avatar VRM starter pack (CC0) ')).toBe('Avatar VRM starter pack (CC0)');
    expect(lineOf('GLB asset uploaded via Numinia Admin')).toBeNull();
    expect(lineOf('   ')).toBeNull();
  });
});

describe('pictures are pictures', () => {
  it('knows which formats are their own picture', () => {
    expect(PICTURE_FORMATS.every((format) => BAZAAR_FORMATS.includes(format))).toBe(true);
    expect(isPicture('png')).toBe(true);
    expect(isPicture('jpg')).toBe(true);
    expect(isPicture('glb')).toBe(false);
    expect(isPicture('mp4')).toBe(false);
  });

  it('gives a card the baked image, the thumbnail, the picture itself or nothing', async () => {
    const { cardPicture } = await importBazaar();
    const baked = 'ndg-019d408c-335a-79aa-901a-5118e55b9c4d';
    expect(cardPicture(baked, 'jpg', null, 'https://pub-x.r2.dev/a.jpg')).toBe(
      `/thumbs/${baked}.webp`,
    );
    // A picture added after the bake shows its own file.
    expect(cardPicture('new-picture', 'png', null, 'https://pub-x.r2.dev/new.png')).toBe(
      'https://pub-x.r2.dev/new.png',
    );
    // The catalogue's thumbnail wins over the full file.
    expect(cardPicture('new-picture', 'png', 'https://x/t.png', 'https://x/full.png')).toBe(
      'https://x/t.png',
    );
    // A model with no thumbnail keeps its kind's glyph; so does a picture with no file.
    expect(cardPicture('new-model', 'glb', null, 'https://x/m.glb')).toBeNull();
    expect(cardPicture('lost-picture', 'jpg', null, null)).toBeNull();
  });
});

describe('filters and orders', () => {
  const goods = [
    item({
      id: 'arla',
      name: 'Avatar Arla',
      format: 'vrm',
      category: 'avatars',
      collection: 'numinia-avatars',
      createdAt: '2026-03-29T00:00:00Z',
    }),
    item({
      id: 'chair',
      name: 'Starter Chair 01',
      line: 'Silla open source',
      createdAt: '2026-03-28T00:00:00Z',
    }),
    item({ id: 'pot', name: 'Pot Vapor 02', createdAt: '2026-03-28T00:00:00Z' }),
    item({
      id: 'img',
      name: 'Imágenes del Ágora',
      format: 'png',
      category: 'images',
      collection: 'numinia-images',
      createdAt: '2026-04-20T00:00:00Z',
    }),
    item({ id: 'snd', name: 'Ambient', format: 'mp3', category: 'audio', collection: 'b-sounds' }),
    item({ id: 'snd2', name: 'Veel', format: 'mp3', category: 'audio', collection: 'a-sounds' }),
  ];

  it('folds case and accents', () => {
    expect(fold('Imágenes ÁGORA')).toBe('imagenes agora');
  });

  it('narrows by kind, collection, formats and every word of the search', () => {
    const pass = (filter: typeof NO_FILTER, kind = '') =>
      goods.filter((g) => matches(g, filter, kind)).map((g) => g.id);
    expect(pass(NO_FILTER)).toEqual(goods.map((g) => g.id));
    expect(pass({ ...NO_FILTER, category: 'audio' })).toEqual(['snd', 'snd2']);
    expect(pass({ ...NO_FILTER, category: 'audio', collection: 'a-sounds' })).toEqual(['snd2']);
    expect(pass({ ...NO_FILTER, formats: ['vrm', 'png'] })).toEqual(['arla', 'img']);
    expect(pass({ ...NO_FILTER, query: 'imagenes agora' })).toEqual(['img']);
    expect(pass({ ...NO_FILTER, query: '  SILLA  ' })).toEqual(['chair']);
    expect(pass({ ...NO_FILTER, query: 'vrm' })).toEqual(['arla']);
    expect(pass({ ...NO_FILTER, query: 'chair zzz' })).toEqual([]);
    // The kind's label in the visitor's language is searchable too.
    expect(
      goods.filter((g) => matches(g, { ...NO_FILTER, query: 'sonido' }, 'Sonido')),
    ).toHaveLength(goods.length);
  });

  it('orders newest first with ties by name, or by name, without sorting in place', () => {
    const recent = sortItems(goods, 'recent', 'es').map((g) => g.id);
    expect(recent).toEqual(['img', 'arla', 'pot', 'chair', 'snd', 'snd2']);
    expect(sortItems(goods, 'name', 'es').map((g) => g.id)).toEqual([
      'snd',
      'arla',
      'img',
      'pot',
      'chair',
      'snd2',
    ]);
    expect(goods[0]!.id).toBe('arla');
  });

  it('counts kinds (in the column order, with their collections) and formats', () => {
    expect(categoryFacets(goods)).toEqual([
      { category: 'avatars', count: 1, collections: [{ id: 'numinia-avatars', count: 1 }] },
      { category: 'models', count: 2, collections: [{ id: 'numinia-assets', count: 2 }] },
      {
        category: 'audio',
        count: 2,
        collections: [
          { id: 'a-sounds', count: 1 },
          { id: 'b-sounds', count: 1 },
        ],
      },
      { category: 'images', count: 1, collections: [{ id: 'numinia-images', count: 1 }] },
    ]);
    expect(formatFacets(goods)).toEqual([
      { format: 'glb', count: 2 },
      { format: 'vrm', count: 1 },
      { format: 'mp3', count: 2 },
      { format: 'png', count: 1 },
    ]);
  });

  it('keeps its format order equal to the domain one', () => {
    expect([...BAZAAR_FORMATS]).toEqual([...ASSET_FORMATS]);
  });
});

describe('queue and format toggles', () => {
  it('adds unknown ids and removes known ones without mutating', () => {
    const empty: readonly string[] = [];
    const one = toggleQueued(empty, 'a');
    expect(one).toEqual(['a']);
    expect(empty).toEqual([]);
    expect(toggleQueued(one, 'b')).toEqual(['a', 'b']);
    expect(toggleQueued(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleQueued(['a'], 'a')).toEqual([]);
  });

  it('toggles formats and keeps the domain order', () => {
    const picked: readonly AssetFormat[] = toggleFormat(toggleFormat([], 'png'), 'glb');
    expect(picked).toEqual(['glb', 'png']);
    expect(toggleFormat(picked, 'png')).toEqual(['glb']);
  });
});

describe('addresses and words', () => {
  it('builds the Bazaar and object page addresses per locale', () => {
    expect(bazaarHref('en')).toBe('/bazaar/');
    expect(bazaarHref('pt-br')).toBe('/pt-br/bazaar/');
    expect(objectHref('en', 'avatar-arla')).toBe('/archive/avatar-arla/');
    expect(objectHref('es', 'avatar-arla')).toBe('/es/archive/avatar-arla/');
  });

  it('says one or many', () => {
    expect(countLabel(1, '1 objeto', '{n} objetos')).toBe('1 objeto');
    expect(countLabel(32, '1 objeto', '{n} objetos')).toBe('32 objetos');
    expect(countLabel(0, '1 objeto', '{n} objetos')).toBe('0 objetos');
  });

  it('fetches chain hosts through the same-origin proxy and anything else directly', () => {
    const r2 = 'https://pub-x.r2.dev/models/a.glb';
    expect(fetchUrlFor(r2)).toBe(`/api/media?src=${encodeURIComponent(r2)}`);
    expect(fetchUrlFor('https://example.org/a.glb')).toBe('https://example.org/a.glb');
  });
});

describe('zip names', () => {
  it('makes names every system takes', () => {
    expect(safeFileName('Avatar Arla', 'x')).toBe('Avatar Arla');
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j', 'x')).toBe('a-b-c-d-e-f-g-h-i-j');
    expect(safeFileName('..hidden  name.. ', 'x')).toBe('hidden name');
    expect(safeFileName('tab\tand\u0001control', 'x')).toBe('tab-and-control');
    expect(safeFileName('///', 'fallback')).toBe('fallback');
    expect(safeFileName('a'.repeat(200), 'x')).toHaveLength(120);
  });

  it('gives each queued good its own name, numbering repeats without case', () => {
    expect(
      zipEntryNames([
        { id: 'e1', name: 'Emotes', format: 'hyp' },
        { id: 'e2', name: 'emotes', format: 'hyp' },
        { id: 'e3', name: 'Emotes', format: 'hyp' },
        { id: 'k', name: 'Emotes', format: 'glb' },
        { id: 'blank-id', name: '...', format: 'png' },
      ]),
    ).toEqual(['Emotes.hyp', 'emotes (2).hyp', 'Emotes (3).hyp', 'Emotes.glb', 'blank-id.png']);
  });

  it('names the zip after the visitor day', () => {
    expect(zipFileName(new Date(2026, 9, 4, 23, 30))).toBe('numinia-bazaar-2026-10-04.zip');
    expect(zipFileName(new Date(2027, 0, 15))).toBe('numinia-bazaar-2027-01-15.zip');
  });

  it('writes the note that travels in the zip: a heading and one line per file', () => {
    expect(ZIP_README).toBe('README.txt');
    expect(
      zipReadme('Del Bazar de Numinia:', 'https://numinia.com', 'es', [
        { name: 'Avatar Arla.vrm', item: { id: 'avatar-arla', license: 'CC0' } },
        { name: 'Emotes.hyp', item: { id: 'emotes', license: 'CC0' } },
      ]),
    ).toBe(
      'Del Bazar de Numinia:\n\n' +
        '- Avatar Arla.vrm · CC0 · https://numinia.com/es/archive/avatar-arla/\n' +
        '- Emotes.hyp · CC0 · https://numinia.com/es/archive/emotes/\n',
    );
    expect(zipReadme('From the Bazaar:', '', 'en', [])).toBe('From the Bazaar:\n\n');
  });
});

describe('fill', () => {
  it('fills the placeholders it has values for and leaves the rest', () => {
    expect(fill('{n} de {total}…', { n: 2, total: 5 })).toBe('2 de 5…');
    expect(fill('Descargar {format}', { format: 'VRM' })).toBe('Descargar VRM');
    expect(fill('sin {names} ni {constructor}', {})).toBe('sin {names} ni {constructor}');
  });
});
