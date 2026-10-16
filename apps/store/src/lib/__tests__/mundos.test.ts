import { describe, expect, it, vi } from 'vitest';
import { localeHref } from '../app-nav';
import {
  HOMES_API,
  counted,
  PLACE_API,
  PLACE_MAX,
  WORLD_ID_SHAPE,
  homesByWorld,
  loadHomes,
  loadOrgWorlds,
  loadWorldPage,
  orgWorldsUrl,
  placeWorlds,
  readHomes,
  readOrgWorlds,
  readWorldPage,
  worldApiUrl,
  worldHref,
} from '../mundos';

const home = {
  worldId: 'agora-plaza',
  accountId: 'acc_team_numen_games',
  accountName: 'Numen Games',
  placedAt: '2026-10-16T10:00:00Z',
};

const answer = (status: number, body: unknown): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('addresses', () => {
  it('keeps the API addresses in one place, ids encoded', () => {
    expect(HOMES_API).toBe('/api/admin/worlds/homes');
    expect(PLACE_API).toBe('/api/admin/worlds/place');
    expect(orgWorldsUrl('acc_t 1&x')).toBe('/api/mundos?org=acc_t%201%26x');
    expect(worldApiUrl('a/b')).toBe('/api/mundos/a%2Fb');
  });

  it('writes a world page as the nav writes any address, in every locale', () => {
    for (const locale of ['en', 'es', 'ja', 'ko', 'pt-br'] as const) {
      expect(worldHref(locale, 'agora-plaza')).toBe(localeHref(locale, '/mundos/agora-plaza/'));
    }
  });

  it('accepts the fleet’s ids and nothing that could climb out of the path', () => {
    for (const id of ['agora-plaza', 'pablofm-2', 'a', 'x'.repeat(63)]) {
      expect(WORLD_ID_SHAPE.test(id)).toBe(true);
    }
    for (const id of ['', '../x', 'a/b', '-x', 'x-', 'a--b', 'A', 'a b', 'v1.2', 'x'.repeat(64)]) {
      expect(WORLD_ID_SHAPE.test(id)).toBe(false);
    }
  });
});

describe('counts', () => {
  it('pick the singular for one and the plural for the rest, zero included', () => {
    const forms = { one: '{n} sede', other: '{n} sedes' };
    expect(counted(forms, 1)).toBe('{n} sede');
    expect(counted(forms, 0)).toBe('{n} sedes');
    expect(counted(forms, 3)).toBe('{n} sedes');
  });
});

describe('the readers', () => {
  it('read the house’s placements, or say the body is not that', () => {
    expect(readHomes({ homes: [home] })).toEqual([home]);
    expect(readHomes({ homes: [] })).toEqual([]);
    expect(readHomes(null)).toBeNull();
    expect(readHomes([])).toBeNull();
    expect(readHomes({})).toBeNull();
    expect(readHomes({ homes: [{ ...home, placedAt: '' }] })).toBeNull();
    expect(readHomes({ homes: ['x'] })).toBeNull();
    expect(readHomes({ homes: [{ ...home, accountName: 3 }] })).toBeNull();
  });

  it('read an organization’s worlds', () => {
    expect(readOrgWorlds({ worlds: [{ worldId: 'w', accountId: 'a' }] })).toEqual([
      { worldId: 'w', accountId: 'a' },
    ]);
    expect(readOrgWorlds({ worlds: [] })).toEqual([]);
    expect(readOrgWorlds({})).toBeNull();
    expect(readOrgWorlds({ worlds: [{ worldId: 'w' }] })).toBeNull();
    expect(readOrgWorlds({ worlds: [null] })).toBeNull();
  });

  it('read a world’s page, placed or not', () => {
    expect(
      readWorldPage({
        worldId: 'w',
        home: { accountId: 'a', accountName: 'A', extra: 1 },
        manage: true,
      }),
    ).toEqual({ worldId: 'w', home: { accountId: 'a', accountName: 'A' }, manage: true });
    expect(readWorldPage({ worldId: 'w', home: null, manage: false })).toEqual({
      worldId: 'w',
      home: null,
      manage: false,
    });
    expect(readWorldPage({ worldId: 'w', home: null })).toBeNull();
    expect(readWorldPage({ worldId: 'w', home: 'x', manage: false })).toBeNull();
    expect(readWorldPage({ worldId: 'w', home: { accountId: 'a' }, manage: false })).toBeNull();
    expect(readWorldPage(undefined)).toBeNull();
  });

  it('index the placements by world', () => {
    expect(homesByWorld([home]).get('agora-plaza')?.accountName).toBe('Numen Games');
    expect(homesByWorld([]).size).toBe(0);
  });
});

describe('the loads', () => {
  it('load the placements, and name each way it can fail', async () => {
    const ok = vi.fn(async () => answer(200, { homes: [home] }));
    expect(await loadHomes(ok)).toEqual({ at: 'ready', items: [home] });
    expect(ok).toHaveBeenCalledWith(HOMES_API, { headers: { accept: 'application/json' } });
    expect(await loadHomes(async () => answer(403, {}))).toEqual({ at: 'forbidden' });
    expect(await loadHomes(async () => answer(401, {}))).toEqual({ at: 'forbidden' });
    expect(await loadHomes(async () => answer(500, {}))).toEqual({ at: 'failed' });
    expect(await loadHomes(async () => answer(200, 'not json'))).toEqual({ at: 'failed' });
    expect(await loadHomes(async () => answer(200, { homes: 3 }))).toEqual({ at: 'failed' });
    expect(
      await loadHomes(async () => {
        throw new Error('offline');
      }),
    ).toEqual({ at: 'failed' });
  });

  it('load an organization’s worlds', async () => {
    const ok = vi.fn(async () => answer(200, { worlds: [{ worldId: 'w', accountId: 'a' }] }));
    expect(await loadOrgWorlds(ok, 'acc_1')).toEqual({
      at: 'ready',
      items: [{ worldId: 'w', accountId: 'a' }],
    });
    expect(ok).toHaveBeenCalledWith('/api/mundos?org=acc_1', expect.anything());
    expect(await loadOrgWorlds(async () => answer(403, {}), 'acc_1')).toEqual({ at: 'forbidden' });
  });

  it('load a world’s page: found, unknown, or not answered', async () => {
    const page = { worldId: 'w', home: null, manage: false };
    expect(await loadWorldPage(async () => answer(200, page), 'w')).toEqual({ at: 'ready', page });
    expect(await loadWorldPage(async () => answer(404, {}), 'w')).toEqual({ at: 'missing' });
    expect(await loadWorldPage(async () => answer(500, {}), 'w')).toEqual({ at: 'failed' });
    expect(await loadWorldPage(async () => answer(200, '{'), 'w')).toEqual({ at: 'failed' });
    expect(
      await loadWorldPage(async () => {
        throw new Error('offline');
      }, 'w'),
    ).toEqual({ at: 'failed' });
  });
});

describe('placing worlds', () => {
  it('sends the worlds and the organization, and counts what was placed', async () => {
    const fetcher = vi.fn(async () => answer(200, { placed: 2 }));
    expect(await placeWorlds(fetcher, ['a', 'b'], 'acc_1')).toEqual({ ok: true, placed: 2 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PLACE_API);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ worldIds: ['a', 'b'], accountId: 'acc_1' });
  });

  it('splits more than the API’s limit into as many requests, and adds them up', async () => {
    const ids = Array.from({ length: PLACE_MAX * 2 + 1 }, (_, index) => `w${index}`);
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
      answer(200, {
        placed: (JSON.parse(String(init?.body)) as { worldIds: string[] }).worldIds.length,
      }),
    );
    expect(await placeWorlds(fetcher, ids, 'acc_1')).toEqual({ ok: true, placed: ids.length });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('stops at the first refusal and says which', async () => {
    expect(await placeWorlds(async () => answer(403, {}), ['a'], 'x')).toEqual({
      ok: false,
      why: 'forbidden',
    });
    expect(await placeWorlds(async () => answer(404, {}), ['a'], 'x')).toEqual({
      ok: false,
      why: 'unknown-org',
    });
    expect(await placeWorlds(async () => answer(400, {}), ['a'], 'x')).toEqual({
      ok: false,
      why: 'failed',
    });
    expect(await placeWorlds(async () => answer(200, { placed: 'x' }), ['a'], 'x')).toEqual({
      ok: false,
      why: 'failed',
    });
    expect(await placeWorlds(async () => answer(200, 'no'), ['a'], 'x')).toEqual({
      ok: false,
      why: 'failed',
    });
    expect(
      await placeWorlds(
        async () => {
          throw new Error('offline');
        },
        ['a'],
        'x',
      ),
    ).toEqual({ ok: false, why: 'failed' });
  });

  it('with nothing to place asks for nothing', async () => {
    const fetcher = vi.fn();
    expect(await placeWorlds(fetcher, [], 'acc_1')).toEqual({ ok: true, placed: 0 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
