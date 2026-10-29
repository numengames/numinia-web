/**
 * The fixture desk keeps which organization each world belongs to as the
 * till keeps it in D1 (cut «Mundos ↔ organizaciones», 2026-10-16): one
 * organization per world, placed by the house alone, read by an
 * organization’s members, and the home of one world public with a flag for
 * who may manage it — seeded from fixtures/worlds/homes.json, so fixture
 * builds show a real story.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import homesSeed from '../../../fixtures/worlds/homes.json';
import type { AccountDesk, DeskHome } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { PLACEMENT_PROBLEMS, NAME_PROBLEMS } from '../worlds-homes';

const NOW = new Date('2026-10-16T09:30:00.000Z');
const HOUSE = `0x${'99'.repeat(20)}`;
const ME = `0x${'ab'.repeat(20)}`;
const AE = '0x00000000000000000000000000000000000000ae';
const STRANGER = '0x00000000000000000000000000000000000000f9';
const RESET = 'acc_team_reset';
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';
const BAD_WALLET = 'wallet must be a lowercase 0x address';
const seed = { ...deskSeed, homes: homesSeed.homes } as unknown as AccountsSeed;

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};

function desk(from: AccountsSeed = seed): Loose {
  return createAccountsFixtureDesk(from, () => NOW) as unknown as Loose;
}

async function homes(on: Loose): Promise<DeskHome[]> {
  const answer = await on.placements(HOUSE, true);
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.homes;
}

describe('the seeded placements', () => {
  it('put two worlds in Reset, three in Numen Games, and leave the rest unplaced', async () => {
    const list = await homes(desk());
    const by = (name: string) => list.filter((home) => home.accountName === name);
    expect(by('Reset').map((home) => home.worldId)).toEqual(['bosque', 'old-plaza']);
    expect(by('Numen Games')).toHaveLength(3);
    expect(list).toHaveLength(5);
    expect(list.map((home) => home.worldId)).toEqual([...list.map((home) => home.worldId)].sort());
    for (const home of list) expect(home.placedAt).toMatch(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/);
  });

  it('name organizations the desk has, and Reset has an administrator of its own', async () => {
    const reset = await desk().worldsOf(AE, false, RESET);
    expect(reset).toEqual({
      ok: true,
      worlds: [
        { worldId: 'bosque', accountId: RESET },
        { worldId: 'old-plaza', accountId: RESET },
      ],
    });
  });
});

describe('a seeded home whose organization the seed lacks', () => {
  it('is not kept', async () => {
    const odd = desk({
      ...seed,
      homes: [{ worldId: 'forge', accountId: 'acc_nowhere', placedDaysAgo: 1 }],
    });
    expect(await odd.placements(HOUSE, true)).toEqual({ ok: true, homes: [] });
  });
});

describe('placing worlds', () => {
  it('lets the house place several worlds at once, and moves one that was placed elsewhere', async () => {
    const on = desk();
    expect(await on.placeWorld(HOUSE, true, ['forge', 'akasha-museum', 'bosque'], NUMEN)).toEqual({
      ok: true,
      placed: 3,
    });
    const list = await homes(on);
    expect(list).toHaveLength(7);
    expect(list.find((home) => home.worldId === 'bosque')?.accountId).toBe(NUMEN);
    expect(list.find((home) => home.worldId === 'forge')?.accountName).toBe('Numen Games');
    // One organization per world: Reset lost the one that moved.
    expect(await on.worldsOf(HOUSE, true, RESET)).toEqual({
      ok: true,
      worlds: [{ worldId: 'old-plaza', accountId: RESET }],
    });
  });

  it('counts a repeated id once and keeps a placement where it already is', async () => {
    const on = desk();
    expect(await on.placeWorld(HOUSE, true, ['bosque', 'bosque'], RESET)).toEqual({
      ok: true,
      placed: 1,
    });
    expect(await homes(on)).toHaveLength(5);
  });

  it('refuses anyone who is not the house, and changes nothing', async () => {
    const on = desk();
    const notHouse = { ok: false, problems: [PLACEMENT_PROBLEMS.notHouse] };
    expect(await on.placeWorld(ME, undefined, ['forge'], NUMEN)).toEqual(notHouse);
    expect(await on.placeWorld(ME, false, ['forge'], NUMEN)).toEqual(notHouse);
    expect(await homes(on)).toHaveLength(5);
  });

  it('answers an unknown organization and a bad argument in words', async () => {
    const on = desk();
    expect(await on.placeWorld(HOUSE, true, ['forge'], 'acc_nowhere')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.noAccount],
    });
    expect(await on.placeWorld('nobody', 'yes', [], 7)).toEqual({
      ok: false,
      problems: [
        BAD_WALLET,
        'house must be true or false',
        'worldIds must be 1 to 50 world ids: lowercase letters, digits and single hyphens',
        'accountId must be an organization id',
      ],
    });
    expect(await homes(on)).toHaveLength(5);
  });
});

describe('listing placements', () => {
  it('answers the house alone', async () => {
    const on = desk();
    const notHouse = { ok: false, problems: [PLACEMENT_PROBLEMS.notHouse] };
    expect(await on.placements(ME)).toEqual(notHouse);
    expect(await on.placements(ME, false)).toEqual(notHouse);
    expect(await on.placements('nobody', 1)).toEqual({
      ok: false,
      problems: [BAD_WALLET, 'house must be true or false'],
    });
  });

  it('answers an empty list from a seed with no homes', async () => {
    const bare = desk({ ...seed, homes: undefined });
    expect(await bare.placements(HOUSE, true)).toEqual({ ok: true, homes: [] });
  });
});

describe('the worlds of one organization', () => {
  it('answers its members and the house, and refuses a stranger and an unknown organization', async () => {
    const on = desk();
    const numen = {
      ok: true,
      worlds: [
        { worldId: 'agora-plaza', accountId: NUMEN },
        { worldId: 'alchemists-tower', accountId: NUMEN },
        { worldId: 'atlantis-library', accountId: NUMEN },
      ],
    };
    // "ME" is the seed's `self` admin of Numen Games.
    expect(await on.worldsOf(ME, false, NUMEN)).toEqual(numen);
    expect(await on.worldsOf(HOUSE, true, NUMEN)).toEqual(numen);
    // Every wallet asking is the seed's `self`, an administrator of Numen Games alone.
    expect(await on.worldsOf(STRANGER, false, 'acc_team_active_inference')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.notMember],
    });
    expect(await on.worldsOf(HOUSE, true, 'acc_nowhere')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.noAccount],
    });
    expect(await on.worldsOf(STRANGER, false, 'acc_nowhere')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.notMember],
    });
    expect(await on.worldsOf('nobody', 'x', 7)).toEqual({
      ok: false,
      problems: [BAD_WALLET, 'house must be true or false', 'accountId must be an organization id'],
    });
  });
});

describe('the home of one world', () => {
  it('is public, and says who may manage it', async () => {
    const on = desk();
    const home = { accountId: RESET, accountName: 'Reset', placedAt: expect.any(String) };
    expect(await on.homeOf('bosque')).toEqual({ ok: true, home, manage: false });
    expect(await on.homeOf('bosque', null, null)).toEqual({ ok: true, home, manage: false });
    expect(await on.homeOf('bosque', STRANGER, false)).toEqual({ ok: true, home, manage: false });
    expect(await on.homeOf('bosque', AE, false)).toEqual({ ok: true, home, manage: true });
    expect(await on.homeOf('bosque', HOUSE, true)).toEqual({ ok: true, home, manage: true });
  });

  it('answers a world no one has placed with no home; only the house manages it', async () => {
    const on = desk();
    expect(await on.homeOf('forge')).toEqual({ ok: true, home: null, manage: false });
    expect(await on.homeOf('forge', AE, false)).toEqual({ ok: true, home: null, manage: false });
    expect(await on.homeOf('forge', HOUSE, true)).toEqual({ ok: true, home: null, manage: true });
  });

  it('refuses a world id or a wallet out of shape', async () => {
    expect(await desk().homeOf('Bad Id', 'nobody', 7)).toEqual({
      ok: false,
      problems: [
        'worldId must be a world id: lowercase letters, digits and single hyphens',
        BAD_WALLET,
        'house must be true or false',
      ],
    });
  });
});

describe('renaming a world (or server), card t_a856c570', () => {
  it('lets the house rename, and the name rides along on every later read', async () => {
    const on = desk();
    expect(await on.renameWorld(HOUSE, true, 'bosque', 'La Reserva Nueva')).toEqual({
      ok: true,
      worldId: 'bosque',
      name: 'La Reserva Nueva',
    });
    expect(await on.worldNames(HOUSE, true)).toEqual({
      ok: true,
      names: [{ worldId: 'bosque', name: 'La Reserva Nueva', renamedAt: NOW.toISOString() }],
    });
  });

  it('keeps one name per world: renaming again replaces it, not adds to it', async () => {
    const on = desk();
    await on.renameWorld(HOUSE, true, 'bosque', 'First');
    await on.renameWorld(HOUSE, true, 'bosque', 'Second');
    const out = await on.worldNames(HOUSE, true);
    expect(out).toEqual({
      ok: true,
      names: [{ worldId: 'bosque', name: 'Second', renamedAt: NOW.toISOString() }],
    });
  });

  it('sorts several names by world id', async () => {
    const on = desk();
    await on.renameWorld(HOUSE, true, 'forge', 'Forge Renamed');
    await on.renameWorld(HOUSE, true, 'bosque', 'Bosque Renamed');
    const out = await on.worldNames(HOUSE, true);
    expect(out.ok && out.names.map((n) => n.worldId)).toEqual(['bosque', 'forge']);
  });

  it('refuses anyone who is not the house, and changes nothing', async () => {
    const on = desk();
    const notHouse = { ok: false, problems: [NAME_PROBLEMS.notHouse] };
    expect(await on.renameWorld(ME, undefined, 'bosque', 'Nope')).toEqual(notHouse);
    expect(await on.renameWorld(ME, false, 'bosque', 'Nope')).toEqual(notHouse);
    expect(await on.worldNames(ME, false)).toEqual(notHouse);
    expect((await on.worldNames(HOUSE, true)) as { names: unknown[] }).toEqual({
      ok: true,
      names: [],
    });
  });

  it('answers a world id or a name out of shape in words', async () => {
    const on = desk();
    expect(await on.renameWorld(HOUSE, true, 'Bad Id', 'ok')).toEqual({
      ok: false,
      problems: ['worldId must be a world id: lowercase letters, digits and single hyphens'],
    });
    expect(await on.renameWorld(HOUSE, true, 'bosque', '')).toEqual({
      ok: false,
      problems: ['name must be 1 to 80 characters, with no leading or trailing blank'],
    });
    expect(await on.renameWorld('nobody', 'yes', 7, 1)).toEqual({
      ok: false,
      problems: [
        BAD_WALLET,
        'house must be true or false',
        'worldId must be a world id: lowercase letters, digits and single hyphens',
        'name must be 1 to 80 characters, with no leading or trailing blank',
      ],
    });
    expect(await on.worldNames('nobody', 'x')).toEqual({
      ok: false,
      problems: [BAD_WALLET, 'house must be true or false'],
    });
  });
});
