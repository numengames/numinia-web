/**
 * «Seguir» for real (cut «Seguir», 2026-10-17): a person follows a
 * community and the city remembers it in migration 0014's
 * `community_follows` — one row per (community, wallet). The pure rules,
 * the table on the D1 shim, and the account desk as numinia.com's binding
 * calls it. One describe per rule or per door.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { FOLLOW_COUNT_MAX, FOLLOW_PROBLEMS, readCommunityIds } from '../src/lib/follows';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-17T09:30:00.000Z');
const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const TARUGO = 'la-tarugo';
const MERGE = 'merge';
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

function rows(sqlite: Shim['sqlite']): Record<string, unknown>[] {
  return sqlite
    .prepare(
      'SELECT community_id, wallet, created_at FROM community_follows ORDER BY community_id, wallet',
    )
    .all()
    .map((row) => ({ ...row }));
}

const count = (sqlite: Shim['sqlite'], table: string): number =>
  Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the rules of a follow', () => {
  it('reads a list of community ids to count, duplicates dropped, 100 at most', () => {
    expect(FOLLOW_COUNT_MAX).toBe(100);
    expect(readCommunityIds([])).toEqual([]);
    expect(readCommunityIds([TARUGO, MERGE, TARUGO])).toEqual([TARUGO, MERGE]);
    expect(readCommunityIds(Array.from({ length: 100 }, (_, index) => `c${index}`))).toHaveLength(
      100,
    );
    for (const bad of [
      Array.from({ length: 101 }, (_, index) => `c${index}`),
      [TARUGO, 'La-Tarugo'],
      [TARUGO, '-x'],
      [TARUGO, 7],
      TARUGO,
      undefined,
      null,
      {},
    ]) {
      expect(readCommunityIds(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it('words its refusals plainly', () => {
    expect(FOLLOW_PROBLEMS).toEqual({
      communityId:
        'communityId must be 1 to 63 characters: lowercase letters, digits and hyphens, not starting with a hyphen',
      communityIds: 'communityIds must be a list of 0 to 100 community ids',
    });
  });
});

describe('migration 0014: one row per community and wallet, and nothing else', () => {
  it('is a STRICT table keyed by (community_id, wallet), indexed by wallet', () => {
    const { sqlite } = migratedTill();
    expect(
      sqlite
        .prepare("SELECT strict FROM pragma_table_list WHERE name = 'community_follows'")
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ strict: 1 }]);
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('community_follows') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'community_id', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'wallet', type: 'TEXT', notnull: 1, pk: 2 },
      { name: 'created_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'index' AND tbl_name = 'community_follows' AND sql IS NOT NULL",
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ name: 'community_follows_by_wallet' }]);
  });

  it('refuses at the database an id out of shape, a wallet out of shape, or an instant that is not one', () => {
    const { sqlite } = migratedTill();
    const insert = (row: { id?: string; wallet?: string; at?: string }): void => {
      sqlite
        .prepare(
          'INSERT INTO community_follows (community_id, wallet, created_at) VALUES (?, ?, ?)',
        )
        .run(row.id ?? TARUGO, row.wallet ?? PABLO, row.at ?? NOW.toISOString());
      sqlite.prepare('DELETE FROM community_follows').run();
    };
    insert({});
    for (const row of [
      { id: '' },
      { id: 'La-Tarugo' },
      { id: '-tarugo' },
      { id: 'a'.repeat(64) },
      { wallet: PABLO.toUpperCase().replace('0X', '0x') },
      { wallet: PABLO.slice(0, 41) },
      { at: '2026-10-17' },
      { at: 'now' },
    ]) {
      expect(() => insert(row), JSON.stringify(row)).toThrow(
        /CHECK constraint failed|non-deterministic use of strftime/,
      );
    }
    expect(rows(sqlite)).toEqual([]);
  });
});

describe('the account desk: «seguir» and «dejar de seguir»', () => {
  it('starts with nobody following anything', async () => {
    const { desk, sqlite } = scene();
    expect(await desk.myFollows(PABLO)).toEqual({ ok: true, communityIds: [] });
    expect(await desk.followCounts([TARUGO])).toEqual({ ok: true, counts: { [TARUGO]: 0 } });
    expect(rows(sqlite)).toEqual([]);
  });

  it('remembers who follows, once per community however many times they say it', async () => {
    const { desk, sqlite } = scene();
    expect(await desk.follow(PABLO, TARUGO)).toEqual({ ok: true, communityIds: [TARUGO] });
    vi.setSystemTime(new Date('2026-10-17T10:00:00.000Z'));
    expect(await desk.follow(PABLO, MERGE)).toEqual({ ok: true, communityIds: [TARUGO, MERGE] });
    expect(await desk.follow(PABLO, TARUGO)).toEqual({ ok: true, communityIds: [TARUGO, MERGE] });
    expect(rows(sqlite)).toEqual([
      { community_id: TARUGO, wallet: PABLO, created_at: NOW.toISOString() },
      { community_id: MERGE, wallet: PABLO, created_at: '2026-10-17T10:00:00.000Z' },
    ]);
  });

  it('forgets on «dejar de seguir», keeps the rest, and forgetting twice is fine', async () => {
    const { desk, sqlite } = scene();
    await desk.follow(PABLO, TARUGO);
    await desk.follow(PABLO, MERGE);
    await desk.follow(MARIA, TARUGO);
    expect(await desk.unfollow(PABLO, TARUGO)).toEqual({ ok: true, communityIds: [MERGE] });
    expect(await desk.unfollow(PABLO, TARUGO)).toEqual({ ok: true, communityIds: [MERGE] });
    expect(rows(sqlite).map((row) => [row['community_id'], row['wallet']])).toEqual([
      [TARUGO, MARIA],
      [MERGE, PABLO],
    ]);
  });

  it('answers each wallet its own follows and nobody else’s', async () => {
    const { desk } = scene();
    await desk.follow(PABLO, TARUGO);
    await desk.follow(MARIA, MERGE);
    expect(await desk.myFollows(PABLO)).toEqual({ ok: true, communityIds: [TARUGO] });
    expect(await desk.myFollows(MARIA)).toEqual({ ok: true, communityIds: [MERGE] });
    expect(await desk.myFollows(wallet('ef'))).toEqual({ ok: true, communityIds: [] });
  });

  it('records nothing else: no account, no organization, no log line', async () => {
    const { desk, sqlite } = scene();
    await desk.follow(PABLO, TARUGO);
    for (const table of ['accounts', 'account_wallets', 'team_members', 'team_log']) {
      expect(count(sqlite, table), table).toBe(0);
    }
  });

  it('refuses a wallet or an id out of shape, naming every problem, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    const badWallet = { ok: false, problems: [PROBLEMS.wallet] };
    const badId = { ok: false, problems: [FOLLOW_PROBLEMS.communityId] };
    for (const bad of [PABLO.toUpperCase(), 'nobody', undefined, null, 7]) {
      expect(await desk.follow(bad, TARUGO)).toEqual(badWallet);
      expect(await desk.unfollow(bad, TARUGO)).toEqual(badWallet);
      expect(await desk.myFollows(bad)).toEqual(badWallet);
    }
    for (const bad of ['La-Tarugo', '', '-x', 7, undefined]) {
      expect(await desk.follow(PABLO, bad)).toEqual(badId);
      expect(await desk.unfollow(PABLO, bad)).toEqual(badId);
    }
    expect(await desk.follow('nobody', 'X')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, FOLLOW_PROBLEMS.communityId],
    });
    expect(await desk.unfollow(7, {})).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, FOLLOW_PROBLEMS.communityId],
    });
    expect(rows(sqlite)).toEqual([]);
  });
});

describe('the account desk: how many follow', () => {
  it('counts per community asked, zero for one nobody follows, and names nobody', async () => {
    const { desk } = scene();
    await desk.follow(PABLO, TARUGO);
    await desk.follow(MARIA, TARUGO);
    await desk.follow(MARIA, MERGE);
    const answer = await desk.followCounts([TARUGO, MERGE, 'tetuan-valley', TARUGO]);
    expect(answer).toEqual({
      ok: true,
      counts: { [TARUGO]: 2, [MERGE]: 1, 'tetuan-valley': 0 },
    });
    expect(JSON.stringify(answer)).not.toMatch(/0x/);
    expect(await desk.followCounts([])).toEqual({ ok: true, counts: {} });
  });

  it('refuses a list that is not one', async () => {
    const { desk } = scene();
    for (const bad of [TARUGO, [TARUGO, 'La-Tarugo'], undefined, [7]]) {
      expect(await desk.followCounts(bad)).toEqual({
        ok: false,
        problems: [FOLLOW_PROBLEMS.communityIds],
      });
    }
  });
});
