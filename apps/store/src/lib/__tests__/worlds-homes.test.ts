/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16) at the store's door to the
 * till: which organization each world belongs to. The house alone places
 * worlds and reads every placement; an organization's members read its
 * worlds; the home of one world is public, with a flag for who may manage it.
 * The session decides — never the request — and a till older than the store
 * answers 503.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountDesk, Asker } from '../accounts';
import { boundAccounts, resetFixtureAccountsForTests } from '../accounts-source';
import {
  PLACEMENT_PROBLEMS,
  NAME_PROBLEMS,
  answerHomes,
  answerOrgWorlds,
  answerPlace,
  answerRename,
  answerWorld,
  fleetWorldHosts,
  fleetWorldIds,
  readAccountId,
  readPlaceBody,
  readRenameBody,
  readWorldIds,
  readWorldId,
  readWorldName,
} from '../worlds-homes';

const HOUSE: Asker = { wallet: `0x${'99'.repeat(20)}`, house: true };
const ADMIN: Asker = { wallet: `0x${'AB'.repeat(20)}`, house: false };
const RESET = 'acc_team_reset';
const PLACED_AT = '2026-10-16T09:30:00.000Z';

const answering = (value: unknown) => vi.fn(async () => value);

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  return {
    overview: answering({ ok: true, accounts: [] }),
    directory: answering({ ok: true, accounts: [] }),
    createTeam: answering({ ok: false, problems: ['x'] }),
    renameTeam: answering({ ok: false, problems: ['x'] }),
    statement: answering({ ok: false, problems: ['x'] }),
    members: answering({ ok: true, members: [] }),
    access: answering({ ok: false, problems: ['x'] }),
    setMember: answering({ ok: true, members: [] }),
    removeMember: answering({ ok: true, members: [] }),
    roles: answering({ ok: false, problems: ['x'] }),
    headcount: answering({ ok: true, accountId: 'acc', members: 4 }),
    createRole: answering({ ok: false, problems: ['x'] }),
    editRole: answering({ ok: false, problems: ['x'] }),
    moveRole: answering({ ok: false, problems: ['x'] }),
    deleteRole: answering({ ok: false, problems: ['x'] }),
    giveRole: answering({ ok: false, problems: ['x'] }),
    takeRole: answering({ ok: false, problems: ['x'] }),
    log: answering({ ok: true, accountId: 'acc', lines: [] }),
    startTopup: answering({ ok: false, problems: ['x'] }),
    confirmTopup: answering({ ok: false, problems: ['x'] }),
    profile: answering({ ok: true, profile: null }),
    setProfile: answering({ ok: true, profile: null }),
    signedIn: answering({ ok: true }),
    citizens: answering({ ok: true, people: [], total: 0, next: null }),
    placeWorld: answering({ ok: true, placed: 2 }),
    placements: answering({
      ok: true,
      homes: [{ worldId: 'bosque', accountId: RESET, accountName: 'Reset', placedAt: PLACED_AT }],
    }),
    worldsOf: answering({ ok: true, worlds: [{ worldId: 'bosque', accountId: RESET }] }),
    homeOf: answering({
      ok: true,
      home: { accountId: RESET, accountName: 'Reset', placedAt: PLACED_AT },
      manage: true,
    }),
    renameWorld: answering({ ok: true, worldId: 'bosque', name: 'La Reserva Nueva' }),
    worldNames: answering({
      ok: true,
      names: [{ worldId: 'bosque', name: 'La Reserva Nueva', renamedAt: PLACED_AT }],
    }),
    ...overrides,
  } as AccountDesk;
}

const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();
const notImplemented = (method: string) =>
  vi.fn(async () => {
    throw new TypeError(`The desk does not implement the method "${method}".`);
  });

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://numinia.com/api/admin/worlds/place', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  resetFixtureAccountsForTests();
  quiet.mockClear();
});

describe('the words of the placement', () => {
  it('reads a world id as the fleet writes it', () => {
    expect(readWorldId('old-plaza')).toBe('old-plaza');
    for (const value of ['', 'Old', 'a--b', '-a', 'a'.repeat(64), 7, null]) {
      expect(readWorldId(value), String(value)).toBeUndefined();
    }
  });

  it('reads 1 to 50 world ids, once each, and an organization id as the till writes it', () => {
    expect(readWorldIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
    for (const value of [[], 'a', ['A'], ['a', 1], null]) {
      expect(readWorldIds(value), JSON.stringify(value)).toBeUndefined();
    }
    expect(readAccountId(RESET)).toBe(RESET);
    for (const value of ['', 'a b', 'x'.repeat(65), 7, null]) {
      expect(readAccountId(value), String(value)).toBeUndefined();
    }
  });

  it('reads a body of 1 to 50 world ids and an organization, nothing else', () => {
    expect(readPlaceBody({ worldIds: ['a', 'b'], accountId: RESET })).toEqual({
      worldIds: ['a', 'b'],
      accountId: RESET,
    });
    const fifty = Array.from({ length: 50 }, (_, index) => `w${index}`);
    expect(readPlaceBody({ worldIds: fifty, accountId: RESET })?.worldIds).toHaveLength(50);
    for (const body of [
      null,
      'x',
      [],
      {},
      { worldIds: [], accountId: RESET },
      { worldIds: [...fifty, 'w50'], accountId: RESET },
      { worldIds: ['Bad'], accountId: RESET },
      { worldIds: 'a', accountId: RESET },
      { worldIds: ['a'] },
      { worldIds: ['a'], accountId: '' },
      { worldIds: ['a'], accountId: 'x'.repeat(101) },
      { worldIds: ['a'], accountId: RESET, house: true },
    ]) {
      expect(readPlaceBody(body), JSON.stringify(body)).toBeNull();
    }
  });

  it('knows the till’s refusals in its own words', () => {
    expect(PLACEMENT_PROBLEMS).toEqual({
      notHouse: 'only the house places a world in an organization',
      worlds: 'worldIds must be 1 to 50 world ids: lowercase letters, digits and single hyphens',
      world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
      account: 'accountId must be an organization id',
      noAccount: 'no such organization',
      notMember: 'only the organization’s members and the house see its worlds',
    });
    expect(NAME_PROBLEMS).toEqual({
      notHouse: 'only the house renames a world',
      world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
      name: 'name must be 1 to 80 characters, with no leading or trailing blank',
    });
  });

  it('reads a world’s new name, 1 to 80 characters, no leading, trailing or control characters', () => {
    expect(readWorldName('La Reserva Nueva')).toBe('La Reserva Nueva');
    expect(readWorldName('x'.repeat(80))).toHaveLength(80);
    for (const value of ['', ' x', 'x ', 'x'.repeat(81), 'bad\u0007name', 7, null, undefined]) {
      expect(readWorldName(value), JSON.stringify(value)).toBeUndefined();
    }
  });

  it('reads a rename body of exactly a world id and a name, nothing else', () => {
    expect(readRenameBody({ worldId: 'bosque', name: 'La Reserva Nueva' })).toEqual({
      worldId: 'bosque',
      name: 'La Reserva Nueva',
    });
    for (const body of [
      null,
      'x',
      [],
      {},
      { worldId: 'bosque' },
      { name: 'La Reserva Nueva' },
      { worldId: 'Bad', name: 'La Reserva Nueva' },
      { worldId: 'bosque', name: '' },
      { worldId: 'bosque', name: 'La Reserva Nueva', house: true },
    ]) {
      expect(readRenameBody(body), JSON.stringify(body)).toBeNull();
    }
  });

  it('lists the ids of the fleet’s open machines and of the worlds run by hand', () => {
    const ids = fleetWorldIds(
      [
        { open: true, worlds: [{ id: 'bosque' }, { id: 'forge' }] },
        { open: false },
        { open: true, worlds: [] },
      ],
      [{ id: 'hive' }],
    );
    expect([...ids].sort()).toEqual(['bosque', 'forge', 'hive']);
  });

  it('maps each world to the host it is served at, the machines first, skipping worlds without one', () => {
    const hosts = fleetWorldHosts(
      [
        {
          open: true,
          worlds: [
            { id: 'bosque', domain: 'bosque.numen.games' },
            { id: 'forge', domain: null },
            { id: 'atrium' },
          ],
        },
        { open: false },
      ],
      [
        { id: 'bosque', domain: 'old.numinia.com' },
        { id: 'hive', domain: 'hive.numinia.com' },
        { id: 'blank', domain: '' },
      ],
    );
    expect([...hosts]).toEqual([
      ['bosque', 'bosque.numen.games'],
      ['hive', 'hive.numinia.com'],
    ]);
  });
});

describe('GET /api/admin/worlds/homes: where every world stands, to the house alone', () => {
  it('refuses with 403 whoever is not the house, signed out included, and never asks the till', async () => {
    const desk = fakeDesk();
    for (const asker of [null, ADMIN]) {
      const out = await answerHomes(desk, asker, quiet);
      expect(out.status).toBe(403);
      expect(await json(out)).toEqual({ error: 'forbidden' });
      expect(out.headers.get('cache-control')).toBe('private, no-store');
    }
    expect((await answerHomes(null, ADMIN, quiet)).status).toBe(403);
    expect(desk.placements).not.toHaveBeenCalled();
  });

  it('answers the house the till’s placements, asked as the house with its own wallet', async () => {
    const desk = fakeDesk();
    const out = await answerHomes(desk, HOUSE, quiet);
    expect(out.status).toBe(200);
    expect(await json(out)).toEqual({
      homes: [{ worldId: 'bosque', accountId: RESET, accountName: 'Reset', placedAt: PLACED_AT }],
      names: [{ worldId: 'bosque', name: 'La Reserva Nueva', renamedAt: PLACED_AT }],
    });
    expect(desk.placements).toHaveBeenCalledWith(HOUSE.wallet, true);
  });

  it('says 503 without a till or with one older than the store, 502 when it fails', async () => {
    expect((await answerHomes(null, HOUSE, quiet)).status).toBe(503);
    const older = fakeDesk({ placements: notImplemented('placements') });
    const out = await answerHomes(older, HOUSE, quiet);
    expect(out.status).toBe(503);
    expect(await json(out)).toEqual({ error: 'not-bound' });
    const broken = fakeDesk({ placements: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await answerHomes(broken, HOUSE, quiet)).status).toBe(502);
    const odd = fakeDesk({ placements: answering({ ok: true, homes: 'many' }) });
    expect((await answerHomes(odd, HOUSE, quiet)).status).toBe(502);
    expect(quiet).toHaveBeenCalled();
  });

  it('turns the till’s refusals into 403 for the house’s word and 400 for the rest', async () => {
    const notHouse = fakeDesk({
      placements: answering({ ok: false, problems: [PLACEMENT_PROBLEMS.notHouse] }),
    });
    expect((await answerHomes(notHouse, HOUSE, quiet)).status).toBe(403);
    const other = fakeDesk({ placements: answering({ ok: false, problems: ['other'] }) });
    const out = await answerHomes(other, HOUSE, quiet);
    expect(out.status).toBe(400);
    expect(await json(out)).toEqual({ error: 'refused', problems: ['other'] });
  });

  it('answers an empty list of names, never failing, when the till cannot say', async () => {
    const { worldNames: _omit, ...rest } = fakeDesk() as unknown as Record<string, unknown>;
    const older = rest as unknown as AccountDesk;
    expect(await json(await answerHomes(older, HOUSE, quiet))).toMatchObject({ names: [] });
    const refusing = fakeDesk({
      worldNames: answering({ ok: false, problems: ['other'] }),
    });
    expect(await json(await answerHomes(refusing, HOUSE, quiet))).toMatchObject({ names: [] });
    const broken = fakeDesk({ worldNames: vi.fn().mockRejectedValue(new Error('boom')) });
    expect(await json(await answerHomes(broken, HOUSE, quiet))).toMatchObject({ names: [] });
  });
});

describe('POST /api/admin/worlds/rename: the house renames an existing world (or server)', () => {
  it('refuses with 403 whoever is not the house, before reading the body', async () => {
    const desk = fakeDesk();
    for (const asker of [null, ADMIN]) {
      const out = await answerRename(desk, asker, post('not json'), quiet);
      expect(out.status).toBe(403);
      expect(await json(out)).toEqual({ error: 'forbidden' });
    }
    expect(desk.renameWorld).not.toHaveBeenCalled();
  });

  it('renames as the house with its own wallet and answers the new name', async () => {
    const desk = fakeDesk();
    const out = await answerRename(
      desk,
      HOUSE,
      post({ worldId: 'bosque', name: 'La Reserva Nueva' }),
      quiet,
    );
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    expect(await json(out)).toEqual({ worldId: 'bosque', name: 'La Reserva Nueva' });
    expect(desk.renameWorld).toHaveBeenCalledWith(HOUSE.wallet, true, 'bosque', 'La Reserva Nueva');
  });

  it('answers 400 for a body out of shape', async () => {
    const desk = fakeDesk();
    expect((await answerRename(desk, HOUSE, post('{oops'), quiet)).status).toBe(400);
    expect(
      (await answerRename(desk, HOUSE, post({ worldId: 'bosque', name: '' }), quiet)).status,
    ).toBe(400);
    expect(desk.renameWorld).not.toHaveBeenCalled();
  });

  it('says 503 without a till, 502 when it fails', async () => {
    const body = { worldId: 'bosque', name: 'La Reserva Nueva' };
    expect((await answerRename(null, HOUSE, post(body), quiet)).status).toBe(503);
    const broken = fakeDesk({ renameWorld: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await answerRename(broken, HOUSE, post(body), quiet)).status).toBe(502);
    const odd = fakeDesk({ renameWorld: answering({ ok: true, worldId: 1, name: 'x' }) });
    expect((await answerRename(odd, HOUSE, post(body), quiet)).status).toBe(502);
  });

  it('turns the till’s refusals into 403 for the house’s word and 400 for the rest', async () => {
    const body = { worldId: 'bosque', name: 'La Reserva Nueva' };
    const notHouse = fakeDesk({
      renameWorld: answering({ ok: false, problems: [NAME_PROBLEMS.notHouse] }),
    });
    expect((await answerRename(notHouse, HOUSE, post(body), quiet)).status).toBe(403);
    const other = fakeDesk({ renameWorld: answering({ ok: false, problems: ['other'] }) });
    const out = await answerRename(other, HOUSE, post(body), quiet);
    expect(out.status).toBe(400);
    expect(await json(out)).toEqual({ error: 'refused', problems: ['other'] });
  });
});

describe('POST /api/admin/worlds/place: the house places worlds in one organization', () => {
  it('refuses with 403 whoever is not the house, before reading the body', async () => {
    const desk = fakeDesk();
    for (const asker of [null, ADMIN]) {
      const out = await answerPlace(desk, asker, post('not json'), quiet);
      expect(out.status).toBe(403);
      expect(await json(out)).toEqual({ error: 'forbidden' });
    }
    expect(desk.placeWorld).not.toHaveBeenCalled();
  });

  it('places the worlds as the house with its own wallet and answers how many', async () => {
    const desk = fakeDesk();
    const out = await answerPlace(
      desk,
      HOUSE,
      post({ worldIds: ['bosque', 'old-plaza'], accountId: RESET }),
      quiet,
    );
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    expect(await json(out)).toEqual({ placed: 2 });
    expect(desk.placeWorld).toHaveBeenCalledWith(
      HOUSE.wallet,
      true,
      ['bosque', 'old-plaza'],
      RESET,
    );
  });

  it('never reads a house flag from the body', async () => {
    const desk = fakeDesk();
    const out = await answerPlace(
      desk,
      ADMIN,
      post({ worldIds: ['bosque'], accountId: RESET, house: true }),
      quiet,
    );
    expect(out.status).toBe(403);
    expect(desk.placeWorld).not.toHaveBeenCalled();
  });

  it('answers 400 for a body out of shape, 415 for another type, 413 for a large one', async () => {
    const desk = fakeDesk();
    expect((await answerPlace(desk, HOUSE, post('{oops'), quiet)).status).toBe(400);
    expect(
      (await answerPlace(desk, HOUSE, post({ worldIds: [], accountId: RESET }), quiet)).status,
    ).toBe(400);
    const plain = post({ worldIds: ['a'], accountId: RESET }, { 'content-type': 'text/plain' });
    expect((await answerPlace(desk, HOUSE, plain, quiet)).status).toBe(415);
    const declared = post({ worldIds: ['a'], accountId: RESET }, { 'content-length': '9000' });
    expect((await answerPlace(desk, HOUSE, declared, quiet)).status).toBe(413);
    const big = post(`{"pad":"${'x'.repeat(9000)}"}`);
    expect((await answerPlace(desk, HOUSE, big, quiet)).status).toBe(413);
    expect(desk.placeWorld).not.toHaveBeenCalled();
  });

  it('says 503 without a till or with one older than the store, 502 when it fails', async () => {
    const body = { worldIds: ['bosque'], accountId: RESET };
    expect((await answerPlace(null, HOUSE, post(body), quiet)).status).toBe(503);
    const older = fakeDesk({ placeWorld: notImplemented('placeWorld') });
    expect((await answerPlace(older, HOUSE, post(body), quiet)).status).toBe(503);
    const broken = fakeDesk({ placeWorld: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await answerPlace(broken, HOUSE, post(body), quiet)).status).toBe(502);
    const odd = fakeDesk({ placeWorld: answering({ ok: true, placed: 'two' }) });
    expect((await answerPlace(odd, HOUSE, post(body), quiet)).status).toBe(502);
  });

  it('turns the till’s refusals into 404 for an unknown organization, 403 for the house’s word, 400 for the rest', async () => {
    const body = { worldIds: ['bosque'], accountId: RESET };
    const refusing = (problem: string) =>
      fakeDesk({ placeWorld: answering({ ok: false, problems: [problem] }) });
    expect(
      (await answerPlace(refusing(PLACEMENT_PROBLEMS.noAccount), HOUSE, post(body), quiet)).status,
    ).toBe(404);
    expect(
      (await answerPlace(refusing(PLACEMENT_PROBLEMS.notHouse), HOUSE, post(body), quiet)).status,
    ).toBe(403);
    const out = await answerPlace(refusing('other'), HOUSE, post(body), quiet);
    expect(out.status).toBe(400);
    expect(await json(out)).toEqual({ error: 'refused', problems: ['other'] });
  });
});

describe('GET /api/mundos?org=: the worlds of one organization, to its members and the house', () => {
  const url = (query: string): URL => new URL(`https://numinia.com/api/mundos${query}`);

  it('refuses with 403 a signed-out caller, and never asks the till', async () => {
    const desk = fakeDesk();
    const out = await answerOrgWorlds(desk, null, url(`?org=${RESET}`), quiet);
    expect(out.status).toBe(403);
    expect(await json(out)).toEqual({ error: 'forbidden' });
    expect(desk.worldsOf).not.toHaveBeenCalled();
  });

  it('asks the till as the session, the house flag from the session alone', async () => {
    const desk = fakeDesk();
    const out = await answerOrgWorlds(desk, ADMIN, url(`?org=${RESET}&house=true`), quiet);
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    expect(await json(out)).toEqual({ worlds: [{ worldId: 'bosque', accountId: RESET }] });
    expect(desk.worldsOf).toHaveBeenCalledWith(ADMIN.wallet.toLowerCase(), false, RESET);
    await answerOrgWorlds(desk, HOUSE, url(`?org=${RESET}`), quiet);
    expect(desk.worldsOf).toHaveBeenLastCalledWith(HOUSE.wallet, true, RESET);
  });

  it('answers 400 without an organization or with one out of shape', async () => {
    const desk = fakeDesk();
    for (const query of ['', '?org=', '?org=a b', `?org=${'x'.repeat(101)}`]) {
      expect((await answerOrgWorlds(desk, HOUSE, url(query), quiet)).status, query).toBe(400);
    }
    expect(desk.worldsOf).not.toHaveBeenCalled();
  });

  it('says 503 without a till or with one older, 502 when it fails', async () => {
    expect((await answerOrgWorlds(null, HOUSE, url(`?org=${RESET}`), quiet)).status).toBe(503);
    const older = fakeDesk({ worldsOf: notImplemented('worldsOf') });
    expect((await answerOrgWorlds(older, HOUSE, url(`?org=${RESET}`), quiet)).status).toBe(503);
    const broken = fakeDesk({ worldsOf: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await answerOrgWorlds(broken, HOUSE, url(`?org=${RESET}`), quiet)).status).toBe(502);
    const odd = fakeDesk({ worldsOf: answering({ ok: true, worlds: [{ worldId: 1 }] }) });
    expect((await answerOrgWorlds(odd, HOUSE, url(`?org=${RESET}`), quiet)).status).toBe(502);
  });

  it('turns the till’s refusals into 403 for a stranger, 404 for an unknown organization, 400 for the rest', async () => {
    const refusing = (problem: string) =>
      fakeDesk({ worldsOf: answering({ ok: false, problems: [problem] }) });
    const ask = (desk: AccountDesk) => answerOrgWorlds(desk, ADMIN, url(`?org=${RESET}`), quiet);
    expect((await ask(refusing(PLACEMENT_PROBLEMS.notMember))).status).toBe(403);
    expect((await ask(refusing(PLACEMENT_PROBLEMS.noAccount))).status).toBe(404);
    const out = await ask(refusing('other'));
    expect(out.status).toBe(400);
    expect(await json(out)).toEqual({ error: 'refused', problems: ['other'] });
  });
});

describe('GET /api/mundos/<id>: one world, public, with a flag for who may manage it', () => {
  const known = new Set(['bosque', 'forge']);

  it('answers a signed-out caller the home and manage false, asking the till for nobody', async () => {
    const desk = fakeDesk({
      homeOf: answering({
        ok: true,
        home: { accountId: RESET, accountName: 'Reset', placedAt: PLACED_AT },
        manage: false,
      }),
    });
    const out = await answerWorld(desk, null, 'bosque', known, quiet);
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    expect(await json(out)).toEqual({
      worldId: 'bosque',
      home: { accountId: RESET, accountName: 'Reset', placedAt: PLACED_AT },
      manage: false,
      url: null,
    });
    expect(desk.homeOf).toHaveBeenCalledWith('bosque', null, false);
  });

  it('adds the address the world is served at when the fleet knows its host', async () => {
    const out = await answerWorld(
      fakeDesk(),
      null,
      'bosque',
      known,
      quiet,
      new Map([['bosque', 'bosque.numen.games']]),
    );
    expect(await json(out)).toMatchObject({ url: 'https://bosque.numen.games/' });
  });

  it('asks as the session’s wallet and as the house only when the session is the house’s', async () => {
    const desk = fakeDesk();
    const out = await answerWorld(desk, ADMIN, 'bosque', known, quiet);
    expect((await json(out)) as { manage: boolean }).toMatchObject({ manage: true });
    expect(desk.homeOf).toHaveBeenCalledWith('bosque', ADMIN.wallet.toLowerCase(), false);
    await answerWorld(desk, HOUSE, 'forge', known, quiet);
    expect(desk.homeOf).toHaveBeenLastCalledWith('forge', HOUSE.wallet, true);
  });

  it('answers a world no one has placed with a null home', async () => {
    const desk = fakeDesk({ homeOf: answering({ ok: true, home: null, manage: false }) });
    const out = await answerWorld(desk, null, 'forge', known, quiet);
    expect(await json(out)).toEqual({ worldId: 'forge', home: null, manage: false, url: null });
  });

  it('answers 404 for an id the fleet does not have or one out of shape, without asking the till', async () => {
    const desk = fakeDesk();
    for (const id of ['nowhere', 'Forge', '../etc', '']) {
      const out = await answerWorld(desk, HOUSE, id, known, quiet);
      expect(out.status, id).toBe(404);
      expect(await json(out)).toEqual({ error: 'not-found' });
    }
    expect(desk.homeOf).not.toHaveBeenCalled();
  });

  it('says 503 without a till or with one older, 502 when it fails', async () => {
    expect((await answerWorld(null, null, 'forge', known, quiet)).status).toBe(503);
    const older = fakeDesk({ homeOf: notImplemented('homeOf') });
    expect((await answerWorld(older, null, 'forge', known, quiet)).status).toBe(503);
    const broken = fakeDesk({ homeOf: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await answerWorld(broken, null, 'forge', known, quiet)).status).toBe(502);
    const odd = fakeDesk({ homeOf: answering({ ok: true, home: 'x', manage: 1 }) });
    expect((await answerWorld(odd, null, 'forge', known, quiet)).status).toBe(502);
  });

  it('answers 400 when the till refuses what the store sent', async () => {
    const desk = fakeDesk({ homeOf: answering({ ok: false, problems: ['other'] }) });
    const out = await answerWorld(desk, null, 'forge', known, quiet);
    expect(out.status).toBe(400);
    expect(await json(out)).toEqual({ error: 'refused', problems: ['other'] });
  });
});

describe('a till older than the store (boundAccounts)', () => {
  /** Every method but the six of this cut. */
  function older(): Record<string, unknown> {
    const {
      placeWorld: _a,
      placements: _b,
      worldsOf: _c,
      homeOf: _d,
      renameWorld: _e,
      worldNames: _f,
      ...rest
    } = fakeDesk() as unknown as Record<string, unknown>;
    return rest;
  }

  it('is still a desk, and says it does not implement the six new methods', async () => {
    const desk = boundAccounts(older());
    expect(desk).not.toBeNull();
    await expect(desk?.placements(HOUSE.wallet, true)).rejects.toThrow(/does not implement/);
    await expect(desk?.placeWorld(HOUSE.wallet, true, ['a'], RESET)).rejects.toThrow(
      /does not implement/,
    );
    await expect(desk?.worldsOf(HOUSE.wallet, true, RESET)).rejects.toThrow(/does not implement/);
    await expect(desk?.homeOf('a', null, false)).rejects.toThrow(/does not implement/);
    await expect(desk?.renameWorld(HOUSE.wallet, true, 'a', 'x')).rejects.toThrow(
      /does not implement/,
    );
    await expect(desk?.worldNames(HOUSE.wallet, true)).rejects.toThrow(/does not implement/);
  });

  it('passes the six calls through to a till that has them, as methods of the stub', async () => {
    const stub = fakeDesk();
    const desk = boundAccounts(stub);
    await desk?.placeWorld(HOUSE.wallet, true, ['a'], RESET);
    await desk?.placements(HOUSE.wallet, true);
    await desk?.worldsOf(HOUSE.wallet, true, RESET);
    await desk?.homeOf('a', HOUSE.wallet, true);
    await desk?.renameWorld(HOUSE.wallet, true, 'a', 'x');
    await desk?.worldNames(HOUSE.wallet, true);
    expect(stub.placeWorld).toHaveBeenCalledWith(HOUSE.wallet, true, ['a'], RESET);
    expect(stub.placements).toHaveBeenCalledWith(HOUSE.wallet, true);
    expect(stub.worldsOf).toHaveBeenCalledWith(HOUSE.wallet, true, RESET);
    expect(stub.homeOf).toHaveBeenCalledWith('a', HOUSE.wallet, true);
    expect(stub.renameWorld).toHaveBeenCalledWith(HOUSE.wallet, true, 'a', 'x');
    expect(stub.worldNames).toHaveBeenCalledWith(HOUSE.wallet, true);
  });
});
