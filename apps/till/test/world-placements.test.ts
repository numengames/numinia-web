/**
 * «Mundos ↔ organizaciones» (cut of 2026-10-16): the house alone places each
 * world in one organization, which pays for it and administers it. The pure
 * rules, migration 0008 on the D1 shim, and the account desk as numinia.com's
 * binding calls it. One describe per rule or per door.
 */

import { describe, expect, it } from 'vitest';
import type { PlaceAnswer, PlacementsAnswer } from '../src/db/world-placements';
import { PROBLEMS } from '../src/db/accounts';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import {
  PLACEMENT_PROBLEMS,
  WORLD_IDS_MAX,
  readWorldId,
  readWorldIds,
} from '../src/lib/world-placements';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

async function team(desk: AccountDesk, founder: string, name: string): Promise<string> {
  const made = await desk.createTeam(founder, name);
  if (!made.ok) throw new Error(made.problems.join());
  return made.account.id;
}

const placedOf = (answer: PlaceAnswer): number => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.placed;
};

const homesOf = (answer: PlacementsAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.homes;
};

const count = (sqlite: Shim['sqlite'], table: string): number =>
  Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']);

describe('the rules of a placement', () => {
  it('reads a world id the way the fleet writes it: lowercase, digits, single hyphens, 63 at most', () => {
    expect(readWorldId('reset')).toBe('reset');
    expect(readWorldId('active-inference-2')).toBe('active-inference-2');
    expect(readWorldId('a'.repeat(63))).toBe('a'.repeat(63));
    for (const value of [
      '',
      'a'.repeat(64),
      'Reset',
      '-reset',
      'reset-',
      're--set',
      're set',
      '../etc',
      7,
      null,
      undefined,
      {},
    ]) {
      expect(readWorldId(value), JSON.stringify(value)).toBeUndefined();
    }
  });

  it('reads 1 to 50 world ids, once each, and nothing else', () => {
    expect(WORLD_IDS_MAX).toBe(50);
    expect(readWorldIds(['reset', 'ai', 'reset'])).toEqual(['reset', 'ai']);
    const fifty = Array.from({ length: 50 }, (_, index) => `w${index}`);
    expect(readWorldIds(fifty)).toEqual(fifty);
    expect(readWorldIds([...fifty, 'w50'])).toBeUndefined();
    for (const value of [[], 'reset', ['Reset'], ['reset', 7], null, undefined, {}]) {
      expect(readWorldIds(value), JSON.stringify(value)).toBeUndefined();
    }
  });

  it('words its refusals plainly', () => {
    expect(PLACEMENT_PROBLEMS).toEqual({
      notHouse: 'only the house places a world in an organization',
      worlds: 'worldIds must be 1 to 50 world ids: lowercase letters, digits and single hyphens',
      world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
      account: 'accountId must be an organization id',
      noAccount: 'no such organization',
      notMember: 'only the organization’s members and the house see its worlds',
    });
  });
});

describe('migration 0008: one organization per world, and a log that is kept', () => {
  it('is a STRICT table with the world id as its key and no other id of the world', () => {
    const { sqlite } = migratedTill();
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('world_placements') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'world_id', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'account_id', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'placed_by', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'placed_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
  });

  it('leaves the billing table `worlds` of 0001 alone', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    expect(count(sqlite, 'worlds')).toBe(0);
  });

  it('refuses at the database an id or an organization out of shape', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    const insert = (id: string, account: string, by = HOUSE): void => {
      sqlite
        .prepare(
          'INSERT INTO world_placements (world_id, account_id, placed_by, placed_at) VALUES (?, ?, ?, ?)',
        )
        .run(id, account, by, '2026-10-16T09:30:00.000Z');
    };
    expect(() => insert('Reset', reset)).toThrow(/CHECK constraint failed/);
    expect(() => insert('re--set', reset)).toThrow(/CHECK constraint failed/);
    expect(() => insert('reset', reset, 'nobody')).toThrow(/CHECK constraint failed/);
    expect(() => insert('reset', 'no-such-account')).toThrow(/FOREIGN KEY/);
    expect(count(sqlite, 'world_placements')).toBe(0);
  });

  it('keeps the placement log: no line is changed or deleted', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    expect(() => sqlite.prepare('UPDATE world_placement_log SET world_id = ?').run('x')).toThrow(
      /placement log is kept/,
    );
    expect(() => sqlite.prepare('DELETE FROM world_placement_log').run()).toThrow(
      /placement log is kept/,
    );
  });
});

describe('the account desk: placing worlds', () => {
  it('places several worlds in one organization at once, for the house alone', async () => {
    const { desk, sqlite } = scene();
    const numen = await team(desk, PABLO, 'Numen Games');
    expect(
      placedOf(await desk.placeWorld(HOUSE, true, ['numinia', 'agora', 'taller'], numen)),
    ).toBe(3);
    expect(
      sqlite
        .prepare('SELECT world_id, account_id, placed_by FROM world_placements ORDER BY world_id')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { world_id: 'agora', account_id: numen, placed_by: HOUSE },
      { world_id: 'numinia', account_id: numen, placed_by: HOUSE },
      { world_id: 'taller', account_id: numen, placed_by: HOUSE },
    ]);
    expect(count(sqlite, 'world_placement_log')).toBe(3);
  });

  it('moves a world to another organization: one placement, two log lines saying where it left', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    const ai = await team(desk, MARIA, 'Active Inference');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], ai));
    expect(count(sqlite, 'world_placements')).toBe(1);
    expect(
      sqlite
        .prepare(
          'SELECT world_id, account_id, from_account_id FROM world_placement_log ORDER BY seq',
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { world_id: 'reset', account_id: reset, from_account_id: null },
      { world_id: 'reset', account_id: ai, from_account_id: reset },
    ]);
  });

  it('writes no log line when a world is placed where it already is', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    expect(placedOf(await desk.placeWorld(HOUSE, true, ['reset', 'reset'], reset))).toBe(1);
    expect(count(sqlite, 'world_placement_log')).toBe(1);
  });

  it('refuses anyone who is not the house, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    const notHouse = { ok: false, problems: [PLACEMENT_PROBLEMS.notHouse] };
    // The organization's own owner may not place a world, nor may a stranger.
    expect(await desk.placeWorld(PABLO, undefined, ['reset'], reset)).toEqual(notHouse);
    expect(await desk.placeWorld(PABLO, false, ['reset'], reset)).toEqual(notHouse);
    expect(await desk.placeWorld(STRANGER, false, ['reset'], reset)).toEqual(notHouse);
    expect(count(sqlite, 'world_placements')).toBe(0);
    expect(count(sqlite, 'world_placement_log')).toBe(0);
  });

  it('answers a bad argument in words, an unknown organization as such, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    expect(await desk.placeWorld('nobody', 'yes', [], 'no way!')).toEqual({
      ok: false,
      problems: [
        PROBLEMS.wallet,
        ORG_PROBLEMS.house,
        PLACEMENT_PROBLEMS.worlds,
        PLACEMENT_PROBLEMS.account,
      ],
    });
    expect(await desk.placeWorld(HOUSE, true, ['reset'], 'acct_unknown')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.noAccount],
    });
    expect(await desk.placeWorld(HOUSE, true, ['reset'], `${reset}-x`)).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.noAccount],
    });
    expect(count(sqlite, 'world_placements')).toBe(0);
  });

  it('writes no house-read line: placing belongs to the house, not to an organization’s log', async () => {
    const { desk, sqlite } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    const lines = count(sqlite, 'team_log');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    expect(count(sqlite, 'team_log')).toBe(lines);
  });
});

describe('the account desk: where every world is placed (the house)', () => {
  it('lists every placement with the organization’s name, by world', async () => {
    const { desk } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    const ai = await team(desk, MARIA, 'Active Inference');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset', 'reset-2'], reset));
    placedOf(await desk.placeWorld(HOUSE, true, ['ai'], ai));
    expect(
      homesOf(await desk.placements(HOUSE, true)).map((h) => [h.worldId, h.accountName]),
    ).toEqual([
      ['ai', 'Active Inference'],
      ['reset', 'Reset'],
      ['reset-2', 'Reset'],
    ]);
    const first = homesOf(await desk.placements(HOUSE, true))[0];
    expect(first).toEqual({
      worldId: 'ai',
      accountId: ai,
      accountName: 'Active Inference',
      placedAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/),
    });
  });

  it('answers an empty list before any placement, and refuses everyone but the house', async () => {
    const { desk } = scene();
    expect(await desk.placements(HOUSE, true)).toEqual({ ok: true, homes: [] });
    const notHouse = { ok: false, problems: [PLACEMENT_PROBLEMS.notHouse] };
    expect(await desk.placements(PABLO)).toEqual(notHouse);
    expect(await desk.placements(PABLO, false)).toEqual(notHouse);
    expect(await desk.placements('nobody', 1)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house],
    });
  });
});

describe('the account desk: the worlds of one organization', () => {
  it('answers a member or an owner, and the house, the organization’s worlds only', async () => {
    const { desk } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    const ai = await team(desk, MARIA, 'Active Inference');
    await desk.setMember(PABLO, reset, STRANGER, 'member');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset', 'reset-2'], reset));
    placedOf(await desk.placeWorld(HOUSE, true, ['ai'], ai));
    const expected = {
      ok: true,
      worlds: [
        { worldId: 'reset', accountId: reset },
        { worldId: 'reset-2', accountId: reset },
      ],
    };
    expect(await desk.worldsOf(PABLO, false, reset)).toEqual(expected);
    expect(await desk.worldsOf(STRANGER, undefined, reset)).toEqual(expected);
    expect(await desk.worldsOf(HOUSE, true, reset)).toEqual(expected);
    expect(await desk.worldsOf(HOUSE, true, ai)).toEqual({
      ok: true,
      worlds: [{ worldId: 'ai', accountId: ai }],
    });
  });

  it('refuses a wallet that is not in the organization, and an unknown organization', async () => {
    const { desk } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    expect(await desk.worldsOf(MARIA, false, reset)).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.notMember],
    });
    expect(await desk.worldsOf(HOUSE, true, 'acct_unknown')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.noAccount],
    });
    expect(await desk.worldsOf(MARIA, false, 'acct_unknown')).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.notMember],
    });
    expect(await desk.worldsOf('nobody', 'x', 7)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house, PLACEMENT_PROBLEMS.account],
    });
  });

  it('lists an organization with no world as an empty list', async () => {
    const { desk } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    expect(await desk.worldsOf(PABLO, false, reset)).toEqual({ ok: true, worlds: [] });
  });
});

describe('the account desk: the home of one world, public', () => {
  it('names the organization to anyone, and says who may manage', async () => {
    const { desk } = scene();
    const reset = await team(desk, PABLO, 'Reset');
    placedOf(await desk.placeWorld(HOUSE, true, ['reset'], reset));
    const home = {
      accountId: reset,
      accountName: 'Reset',
      placedAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/),
    };
    expect(await desk.homeOf('reset')).toEqual({ ok: true, home, manage: false });
    expect(await desk.homeOf('reset', null, null)).toEqual({ ok: true, home, manage: false });
    expect(await desk.homeOf('reset', MARIA, false)).toEqual({ ok: true, home, manage: false });
    expect(await desk.homeOf('reset', PABLO, false)).toEqual({ ok: true, home, manage: true });
    expect(await desk.homeOf('reset', HOUSE, true)).toEqual({ ok: true, home, manage: true });
  });

  it('answers a world no one has placed with no home; only the house manages it', async () => {
    const { desk } = scene();
    expect(await desk.homeOf('lost')).toEqual({ ok: true, home: null, manage: false });
    expect(await desk.homeOf('lost', PABLO, false)).toEqual({
      ok: true,
      home: null,
      manage: false,
    });
    expect(await desk.homeOf('lost', HOUSE, true)).toEqual({ ok: true, home: null, manage: true });
  });

  it('refuses a world id or a wallet out of shape', async () => {
    const { desk } = scene();
    expect(await desk.homeOf('Lost World', 'nobody', 7)).toEqual({
      ok: false,
      problems: [PLACEMENT_PROBLEMS.world, PROBLEMS.wallet, ORG_PROBLEMS.house],
    });
  });
});
