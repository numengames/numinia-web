/**
 * «Me apunto» for real (cut «Tu agenda», 2026-10-17): a person says they
 * are going to an encounter and the city remembers it in migration 0012's
 * `ritual_rsvps` — one row per (ritual, wallet). The pure rules, the table
 * on the D1 shim, and the account desk as numinia.com's binding calls it.
 * One describe per rule or per door.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import {
  RITUAL_ID_MAX,
  RSVP_COUNT_MAX,
  RSVP_PROBLEMS,
  readRitualId,
  readRitualIds,
} from '../src/lib/rsvps';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-17T09:30:00.000Z');
const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const TRG = 'trg26';
const MERGE = 'merge-madrid-2026';
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

function rows(sqlite: Shim['sqlite']): Record<string, unknown>[] {
  return sqlite
    .prepare('SELECT ritual_id, wallet, created_at FROM ritual_rsvps ORDER BY ritual_id, wallet')
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

describe('the rules of an RSVP', () => {
  it('reads a ritual id as numinia.com names its files: a lowercase slug, 100 characters at most', () => {
    expect(RITUAL_ID_MAX).toBe(100);
    expect(readRitualId(TRG)).toBe(TRG);
    expect(readRitualId(MERGE)).toBe(MERGE);
    expect(readRitualId('a'.repeat(100))).toBe('a'.repeat(100));
    for (const bad of [
      '',
      'a'.repeat(101),
      'TRG26',
      'trg 26',
      'trg_26',
      '../x',
      7,
      null,
      undefined,
      {},
    ]) {
      expect(readRitualId(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it('reads a list of ids to count, duplicates dropped, 100 at most', () => {
    expect(RSVP_COUNT_MAX).toBe(100);
    expect(readRitualIds([])).toEqual([]);
    expect(readRitualIds([TRG, MERGE, TRG])).toEqual([TRG, MERGE]);
    expect(readRitualIds(Array.from({ length: 100 }, (_, index) => `r${index}`))).toHaveLength(100);
    for (const bad of [
      Array.from({ length: 101 }, (_, index) => `r${index}`),
      [TRG, 'TRG26'],
      [TRG, 7],
      TRG,
      undefined,
      null,
      {},
    ]) {
      expect(readRitualIds(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it('words its refusals plainly', () => {
    expect(RSVP_PROBLEMS).toEqual({
      ritualId: 'ritualId must be a lowercase slug of 100 characters at most',
      ritualIds: 'ritualIds must be a list of 0 to 100 lowercase slugs',
    });
  });
});

describe('migration 0012: one row per encounter and wallet, and nothing else', () => {
  it('is a STRICT table keyed by (ritual_id, wallet), indexed by wallet', () => {
    const { sqlite } = migratedTill();
    expect(
      sqlite
        .prepare("SELECT strict FROM pragma_table_list WHERE name = 'ritual_rsvps'")
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ strict: 1 }]);
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('ritual_rsvps') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'ritual_id', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'wallet', type: 'TEXT', notnull: 1, pk: 2 },
      { name: 'created_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'index' AND tbl_name = 'ritual_rsvps' AND sql IS NOT NULL",
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ name: 'ritual_rsvps_by_wallet' }]);
  });

  it('refuses at the database an id out of shape, a wallet out of shape, or an instant that is not one', () => {
    const { sqlite } = migratedTill();
    const insert = (row: { id?: string; wallet?: string; at?: string }): void => {
      sqlite
        .prepare('INSERT INTO ritual_rsvps (ritual_id, wallet, created_at) VALUES (?, ?, ?)')
        .run(row.id ?? TRG, row.wallet ?? PABLO, row.at ?? NOW.toISOString());
      sqlite.prepare('DELETE FROM ritual_rsvps').run();
    };
    insert({});
    for (const row of [
      { id: '' },
      { id: 'TRG26' },
      { id: 'trg 26' },
      { id: 'a'.repeat(101) },
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

describe('the account desk: «me apunto» and «ya no voy»', () => {
  it('remembers who is going, once per encounter however many times they say it', async () => {
    const { desk, sqlite } = scene();
    expect(await desk.rsvp(PABLO, TRG)).toEqual({ ok: true, ritualIds: [TRG] });
    vi.setSystemTime(new Date('2026-10-17T10:00:00.000Z'));
    expect(await desk.rsvp(PABLO, MERGE)).toEqual({ ok: true, ritualIds: [TRG, MERGE] });
    expect(await desk.rsvp(PABLO, TRG)).toEqual({ ok: true, ritualIds: [TRG, MERGE] });
    expect(rows(sqlite)).toEqual([
      { ritual_id: MERGE, wallet: PABLO, created_at: '2026-10-17T10:00:00.000Z' },
      { ritual_id: TRG, wallet: PABLO, created_at: NOW.toISOString() },
    ]);
  });

  it('forgets on «ya no voy», keeps the rest, and forgetting twice is fine', async () => {
    const { desk, sqlite } = scene();
    await desk.rsvp(PABLO, TRG);
    await desk.rsvp(PABLO, MERGE);
    await desk.rsvp(MARIA, TRG);
    expect(await desk.unrsvp(PABLO, TRG)).toEqual({ ok: true, ritualIds: [MERGE] });
    expect(await desk.unrsvp(PABLO, TRG)).toEqual({ ok: true, ritualIds: [MERGE] });
    expect(rows(sqlite).map((row) => [row['ritual_id'], row['wallet']])).toEqual([
      [MERGE, PABLO],
      [TRG, MARIA],
    ]);
  });

  it('answers each wallet its own agenda and nobody else’s', async () => {
    const { desk } = scene();
    await desk.rsvp(PABLO, TRG);
    await desk.rsvp(MARIA, MERGE);
    expect(await desk.myRsvps(PABLO)).toEqual({ ok: true, ritualIds: [TRG] });
    expect(await desk.myRsvps(MARIA)).toEqual({ ok: true, ritualIds: [MERGE] });
    expect(await desk.myRsvps(wallet('ef'))).toEqual({ ok: true, ritualIds: [] });
  });

  it('records nothing else: no account, no organization, no log line', async () => {
    const { desk, sqlite } = scene();
    await desk.rsvp(PABLO, TRG);
    for (const table of ['accounts', 'account_wallets', 'team_members', 'team_log']) {
      expect(count(sqlite, table), table).toBe(0);
    }
  });

  it('refuses a wallet or an id out of shape, naming every problem, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    const badWallet = { ok: false, problems: [PROBLEMS.wallet] };
    const badId = { ok: false, problems: [RSVP_PROBLEMS.ritualId] };
    for (const bad of [PABLO.toUpperCase(), 'nobody', undefined, null, 7]) {
      expect(await desk.rsvp(bad, TRG)).toEqual(badWallet);
      expect(await desk.unrsvp(bad, TRG)).toEqual(badWallet);
      expect(await desk.myRsvps(bad)).toEqual(badWallet);
    }
    for (const bad of ['TRG26', '', 7, undefined]) {
      expect(await desk.rsvp(PABLO, bad)).toEqual(badId);
      expect(await desk.unrsvp(PABLO, bad)).toEqual(badId);
    }
    expect(await desk.rsvp('nobody', 'X')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, RSVP_PROBLEMS.ritualId],
    });
    expect(await desk.unrsvp(7, {})).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, RSVP_PROBLEMS.ritualId],
    });
    expect(rows(sqlite)).toEqual([]);
  });
});

describe('the account desk: how many are going', () => {
  it('counts per encounter asked, zero for one nobody goes to, and names nobody', async () => {
    const { desk } = scene();
    await desk.rsvp(PABLO, TRG);
    await desk.rsvp(MARIA, TRG);
    await desk.rsvp(MARIA, MERGE);
    expect(await desk.rsvpCounts([TRG, MERGE, 'cpslive-2026', TRG])).toEqual({
      ok: true,
      counts: { [TRG]: 2, [MERGE]: 1, 'cpslive-2026': 0 },
    });
    expect(await desk.rsvpCounts([])).toEqual({ ok: true, counts: {} });
  });

  it('refuses a list that is not one', async () => {
    const { desk } = scene();
    for (const bad of [TRG, [TRG, 'TRG26'], undefined, [7]]) {
      expect(await desk.rsvpCounts(bad)).toEqual({
        ok: false,
        problems: [RSVP_PROBLEMS.ritualIds],
      });
    }
  });
});
