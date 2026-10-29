import { describe, expect, it, vi } from 'vitest';
import { localeHref } from '../app-nav';
import {
  HOMES_API,
  counted,
  enterWorld,
  enterWorldInNewTab,
  enterWorldInTab,
  passApiUrl,
  PLACE_API,
  PLACE_MAX,
  RENAME_API,
  WORLD_ID_SHAPE,
  homesByWorld,
  loadHomes,
  loadOrgWorlds,
  loadWorldPage,
  namesByWorld,
  orgWorldsUrl,
  placeWorlds,
  readHomes,
  readNames,
  readOrgWorlds,
  readWorldPage,
  renameWorld,
  WORLD_DOOR_ATTRIBUTE,
  worldApiUrl,
  worldDoorClick,
  worldHref,
  worldPageStatus,
} from '../mundos';

const home = {
  worldId: 'agora-plaza',
  accountId: 'acc_t_2e2dd18c880ba974da1512dc7cde2431',
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
    // An older answer, with no name: the id read as words, and no picture.
    expect(readOrgWorlds({ worlds: [{ worldId: 'agora-plaza', accountId: 'a' }] })).toEqual([
      { worldId: 'agora-plaza', accountId: 'a', name: 'Agora Plaza', cover: null },
    ]);
    // MIS-265: the name and picture the API adds; a picture from elsewhere is dropped.
    expect(
      readOrgWorlds({
        worlds: [
          {
            worldId: 'w',
            accountId: 'a',
            name: 'Plaza del Ágora',
            cover: 'https://w.numinia.com/p.webp',
          },
          { worldId: 'x', accountId: 'a', name: 'X', cover: '/images/art/city.webp' },
          { worldId: 'y', accountId: 'a', name: '', cover: 'javascript:alert(1)' },
          { worldId: 'z', accountId: 'a', cover: '//evil.example/p.png' },
        ],
      }),
    ).toEqual([
      {
        worldId: 'w',
        accountId: 'a',
        name: 'Plaza del Ágora',
        cover: 'https://w.numinia.com/p.webp',
      },
      { worldId: 'x', accountId: 'a', name: 'X', cover: '/images/art/city.webp' },
      { worldId: 'y', accountId: 'a', name: 'Y', cover: null },
      { worldId: 'z', accountId: 'a', name: 'Z', cover: null },
    ]);
    expect(readOrgWorlds({ worlds: [] })).toEqual([]);
    expect(readOrgWorlds({})).toBeNull();
    expect(readOrgWorlds({ worlds: [{ worldId: 'w' }] })).toBeNull();
    expect(readOrgWorlds({ worlds: [null] })).toBeNull();
  });

  it('read the house’s own names for worlds, or say the body is not that', () => {
    expect(readNames({ names: [{ worldId: 'w', name: 'N', renamedAt: 't' }] })).toEqual([
      { worldId: 'w', name: 'N', renamedAt: 't' },
    ]);
    expect(readNames({ names: [] })).toEqual([]);
    expect(readNames({})).toBeNull();
    expect(readNames(null)).toBeNull();
    expect(readNames({ names: [null] })).toBeNull();
    expect(readNames({ names: [{ worldId: 'w', name: 'N' }] })).toBeNull();
    expect(readNames({ names: [{ worldId: 'w', name: 3, renamedAt: 't' }] })).toBeNull();
  });

  it('read a world’s page, placed or not', () => {
    expect(
      readWorldPage({
        worldId: 'w',
        home: { accountId: 'a', accountName: 'A', extra: 1 },
        manage: true,
      }),
    ).toEqual({
      worldId: 'w',
      home: { accountId: 'a', accountName: 'A' },
      manage: true,
      url: null,
    });
    expect(readWorldPage({ worldId: 'w', home: null, manage: false })).toEqual({
      worldId: 'w',
      home: null,
      manage: false,
      url: null,
    });
    expect(
      readWorldPage({ worldId: 'w', home: null, manage: false, url: 'https://w.numen.games/' }),
    ).toMatchObject({ url: 'https://w.numen.games/' });
    for (const url of ['http://w.numen.games/', 'javascript:alert(1)', 'https://a b', 7]) {
      expect(readWorldPage({ worldId: 'w', home: null, manage: false, url })).toMatchObject({
        url: null,
      });
    }
    expect(readWorldPage({ worldId: 'w', home: null })).toBeNull();
    expect(readWorldPage({ worldId: 'w', home: 'x', manage: false })).toBeNull();
    expect(readWorldPage({ worldId: 'w', home: { accountId: 'a' }, manage: false })).toBeNull();
    expect(readWorldPage(undefined)).toBeNull();
  });

  it('index the placements by world', () => {
    expect(homesByWorld([home]).get('agora-plaza')?.accountName).toBe('Numen Games');
    expect(homesByWorld([]).size).toBe(0);
  });

  it('index the renamed worlds by id', () => {
    const named = { worldId: 'agora-plaza', name: 'Ágora', renamedAt: 't' };
    expect(namesByWorld([named]).get('agora-plaza')).toBe('Ágora');
    expect(namesByWorld([]).size).toBe(0);
  });
});

describe('the loads', () => {
  it('load the placements, and the house’s own names along with them', async () => {
    const ok = vi.fn(async () =>
      answer(200, {
        homes: [home],
        names: [{ worldId: 'agora-plaza', name: 'Ágora', renamedAt: 't' }],
      }),
    );
    expect(await loadHomes(ok)).toEqual({
      homes: { at: 'ready', items: [home] },
      names: { at: 'ready', items: [{ worldId: 'agora-plaza', name: 'Ágora', renamedAt: 't' }] },
    });
    expect(ok).toHaveBeenCalledWith(HOMES_API, { headers: { accept: 'application/json' } });
    expect(await loadHomes(async () => answer(403, {}))).toEqual({
      homes: { at: 'forbidden' },
      names: { at: 'forbidden' },
    });
    expect(await loadHomes(async () => answer(401, {}))).toEqual({
      homes: { at: 'forbidden' },
      names: { at: 'forbidden' },
    });
    expect(await loadHomes(async () => answer(500, {}))).toEqual({
      homes: { at: 'failed' },
      names: { at: 'failed' },
    });
    expect(await loadHomes(async () => answer(200, 'not json'))).toEqual({
      homes: { at: 'failed' },
      names: { at: 'failed' },
    });
    expect(await loadHomes(async () => answer(200, { homes: 3, names: [] }))).toEqual({
      homes: { at: 'failed' },
      names: { at: 'ready', items: [] },
    });
    expect(
      await loadHomes(async () => {
        throw new Error('offline');
      }),
    ).toEqual({ homes: { at: 'failed' }, names: { at: 'failed' } });
  });

  it('load an organization’s worlds', async () => {
    const ok = vi.fn(async () => answer(200, { worlds: [{ worldId: 'w', accountId: 'a' }] }));
    expect(await loadOrgWorlds(ok, 'acc_1')).toEqual({
      at: 'ready',
      items: [{ worldId: 'w', accountId: 'a', name: 'W', cover: null }],
    });
    expect(ok).toHaveBeenCalledWith('/api/mundos?org=acc_1', expect.anything());
    expect(await loadOrgWorlds(async () => answer(403, {}), 'acc_1')).toEqual({ at: 'forbidden' });
    expect(await loadOrgWorlds(async () => answer(500, {}), 'acc_1')).toEqual({ at: 'failed' });
    expect(await loadOrgWorlds(async () => answer(200, 'not json'), 'acc_1')).toEqual({
      at: 'failed',
    });
    expect(
      await loadOrgWorlds(async () => {
        throw new Error('offline');
      }, 'acc_1'),
    ).toEqual({ at: 'failed' });
  });

  it('load a world’s page: found, unknown, or not answered', async () => {
    const page = { worldId: 'w', home: null, manage: false, url: null };
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

describe('entering a world', () => {
  it('asks the pass endpoint with a POST and goes where it says', async () => {
    const ask = vi.fn(async () =>
      answer(200, { url: 'https://w.numen.games/#pass=a.b.c', pass: true }),
    );
    expect(passApiUrl('a/b')).toBe('/api/mundos/a%2Fb/pass');
    expect(await enterWorld(ask, 'w', 'https://w.numen.games/')).toBe(
      'https://w.numen.games/#pass=a.b.c',
    );
    expect(ask).toHaveBeenCalledWith(
      '/api/mundos/w/pass',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to the guest address when the endpoint fails, answers oddly or is not there', async () => {
    const guest = 'https://w.numen.games/';
    const unavailable = async () => answer(503, { error: 'no-pass', url: guest });
    expect(await enterWorld(unavailable, 'w', null)).toBe(guest);
    expect(await enterWorld(async () => answer(500, 'oops'), 'w', guest)).toBe(guest);
    expect(await enterWorld(async () => answer(200, { url: 'http://x/' }), 'w', guest)).toBe(guest);
    expect(
      await enterWorld(async () => answer(200, { url: 'javascript:alert(1)' }), 'w', null),
    ).toBe(null);
    expect(
      await enterWorld(
        async () => {
          throw new Error('offline');
        },
        'w',
        guest,
      ),
    ).toBe(guest);
  });
});

describe('entering a world in a new tab, card t_677de28a', () => {
  it('sends the already-open tab to the address and returns it', async () => {
    const ask = vi.fn(async () => answer(200, { url: 'https://w.numen.games/#pass=a.b.c' }));
    const tab = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    expect(await enterWorldInTab(ask, 'w', null, tab)).toBe('https://w.numen.games/#pass=a.b.c');
    expect(tab.location.href).toBe('https://w.numen.games/#pass=a.b.c');
    expect(tab.close).not.toHaveBeenCalled();
  });

  it('closes the tab and answers null when there is no address at all', async () => {
    const down = async () => answer(500, 'oops');
    const tab = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    expect(await enterWorldInTab(down, 'w', null, tab)).toBe(null);
    expect(tab.close).toHaveBeenCalledOnce();
  });

  it('does nothing to a null tab (the popup blocker got it first)', async () => {
    const ask = vi.fn(async () => answer(200, { url: 'https://w.numen.games/' }));
    expect(await enterWorldInTab(ask, 'w', null, null)).toBe('https://w.numen.games/');
  });
});

describe('the one door into a world (enterWorldInNewTab, worldDoorClick)', () => {
  it('opens a blank tab cut from the page, then sends it to the pass address', async () => {
    const ask = vi.fn(async () => answer(200, { url: 'https://vic.numinia.com/#pass=a.b.c' }));
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() } as unknown as Window;
    const open = vi.fn(() => tab);
    expect(await enterWorldInNewTab(ask, 'vic', 'https://vic.numinia.com/', open)).toBe(
      'https://vic.numinia.com/#pass=a.b.c',
    );
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe('https://vic.numinia.com/#pass=a.b.c');
    expect(ask).toHaveBeenCalledWith(
      passApiUrl('vic'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('still answers the address when the popup blocker gave no tab', async () => {
    const down = async () => answer(503, {});
    expect(await enterWorldInNewTab(down, 'vic', 'https://vic.numinia.com/', () => null)).toBe(
      'https://vic.numinia.com/',
    );
  });

  const plain = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };
  const link = (attributes: Record<string, string>) => ({
    getAttribute: (name: string) => attributes[name] ?? null,
  });

  it('takes a plain left click on a world link, signed in, through the door', () => {
    const vic = link({ [WORLD_DOOR_ATTRIBUTE]: 'vic', href: 'https://vic.numinia.com/' });
    expect(worldDoorClick(plain, vic, true)).toEqual({
      worldId: 'vic',
      fallback: 'https://vic.numinia.com/',
    });
    expect(worldDoorClick(plain, link({ [WORLD_DOOR_ATTRIBUTE]: 'vic' }), true)).toEqual({
      worldId: 'vic',
      fallback: null,
    });
    expect(
      worldDoorClick(plain, link({ [WORLD_DOOR_ATTRIBUTE]: 'vic', href: 'javascript:x' }), true),
    ).toEqual({ worldId: 'vic', fallback: null });
  });

  it('leaves every other click to the plain link', () => {
    const vic = link({ [WORLD_DOOR_ATTRIBUTE]: 'vic', href: 'https://vic.numinia.com/' });
    expect(worldDoorClick(plain, vic, false)).toBeNull();
    expect(worldDoorClick(plain, null, true)).toBeNull();
    expect(worldDoorClick({ ...plain, defaultPrevented: true }, vic, true)).toBeNull();
    expect(worldDoorClick({ ...plain, button: 1 }, vic, true)).toBeNull();
    expect(worldDoorClick({ ...plain, metaKey: true }, vic, true)).toBeNull();
    expect(worldDoorClick({ ...plain, ctrlKey: true }, vic, true)).toBeNull();
    expect(worldDoorClick({ ...plain, shiftKey: true }, vic, true)).toBeNull();
    expect(worldDoorClick({ ...plain, altKey: true }, vic, true)).toBeNull();
    expect(worldDoorClick(plain, link({ href: 'https://vic.numinia.com/' }), true)).toBeNull();
    expect(worldDoorClick(plain, link({ [WORLD_DOOR_ATTRIBUTE]: 'Not An Id' }), true)).toBeNull();
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

describe('renaming a world (or server), card t_a856c570', () => {
  it('sends the world id and the new name, and answers it back', async () => {
    const fetcher = vi.fn(async () => answer(200, { worldId: 'w', name: 'La Reserva Nueva' }));
    expect(await renameWorld(fetcher, 'w', 'La Reserva Nueva')).toEqual({
      ok: true,
      name: 'La Reserva Nueva',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RENAME_API);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ worldId: 'w', name: 'La Reserva Nueva' });
  });

  it('says forbidden for 403, failed for anything else out of shape', async () => {
    expect(await renameWorld(async () => answer(403, {}), 'w', 'x')).toEqual({
      ok: false,
      why: 'forbidden',
    });
    expect(await renameWorld(async () => answer(400, {}), 'w', 'x')).toEqual({
      ok: false,
      why: 'failed',
    });
    expect(await renameWorld(async () => answer(200, { worldId: 'w' }), 'w', 'x')).toEqual({
      ok: false,
      why: 'failed',
    });
    expect(await renameWorld(async () => answer(200, 'no'), 'w', 'x')).toEqual({
      ok: false,
      why: 'failed',
    });
    expect(
      await renameWorld(
        async () => {
          throw new Error('offline');
        },
        'w',
        'x',
      ),
    ).toEqual({ ok: false, why: 'failed' });
  });
});

describe('the status of a world’s page', () => {
  const fleet = async () => new Set(['agora-plaza', 'pablofm-2']);

  it('is 200 for a world the fleet has and 404 for one it does not', async () => {
    expect(await worldPageStatus('agora-plaza', fleet)).toBe(200);
    expect(await worldPageStatus('no-such-world', fleet)).toBe(404);
  });

  it('is 404 for an id not shaped like a fleet’s, without asking the fleet', async () => {
    const asked = vi.fn(fleet);
    for (const id of ['', '..%2Fx', 'Agora', 'a--b', '-a', 'a'.repeat(64)]) {
      expect(await worldPageStatus(id, asked)).toBe(404);
    }
    expect(asked).not.toHaveBeenCalled();
  });

  it('serves the page when the fleet cannot be read: that proves nothing either way', async () => {
    const down = async (): Promise<ReadonlySet<string>> => {
      throw new Error('fleet unreachable');
    };
    expect(await worldPageStatus('agora-plaza', down)).toBe(200);
  });
});
