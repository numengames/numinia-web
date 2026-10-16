/**
 * «El censo» (cut of 2026-10-16): each sign-in to numinia.com is recorded as
 * two instants per wallet — the first time and the last — and only the
 * house reads the list of everyone who has signed in, to add them to an
 * organization (numinia-archive STD-053: «Only fellow members see who it
 * is»). The pure rules, migration 0007 on the D1 shim, and the account desk
 * as numinia.com's binding calls it. One describe per rule or per door.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import type { CitizensAnswer, CitizensList } from '../src/db/census';
import {
  CENSUS_PAGE,
  CENSUS_PROBLEMS,
  CENSUS_QUERY_MAX,
  cursorOf,
  readCensusCursor,
  readCensusQuery,
} from '../src/lib/census';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-16T09:30:00.000Z');
const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ANA = wallet('56');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ARLA = 'avatar-arla-mncdhz3l';
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

const listOf = (answer: CitizensAnswer): CitizensList => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};

function signInRows(sqlite: Shim['sqlite']): Record<string, unknown>[] {
  return sqlite
    .prepare('SELECT wallet, first_seen_at, last_seen_at FROM wallet_sign_ins ORDER BY wallet')
    .all()
    .map((row) => ({ ...row }));
}

const count = (sqlite: Shim['sqlite'], table: string): number =>
  Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']);

/** Signs `who` in at the instant `at`. */
async function signInAt(desk: AccountDesk, who: string, at: string): Promise<void> {
  vi.setSystemTime(new Date(at));
  expect(await desk.signedIn(who)).toEqual({ ok: true });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the rules of the list', () => {
  it('reads a search: absent is everyone, a string is trimmed, 100 characters at most', () => {
    expect(CENSUS_QUERY_MAX).toBe(100);
    expect(readCensusQuery(undefined)).toBe('');
    expect(readCensusQuery(null)).toBe('');
    expect(readCensusQuery('')).toBe('');
    expect(readCensusQuery('  Rima ')).toBe('Rima');
    expect(readCensusQuery('a'.repeat(100))).toBe('a'.repeat(100));
    expect(readCensusQuery('a'.repeat(101))).toBeUndefined();
    expect(readCensusQuery('Ri\u0000ma')).toBeUndefined();
    for (const value of [1, true, {}, ['Rima']]) expect(readCensusQuery(value)).toBeUndefined();
  });

  it('reads a cursor it wrote: the last instant and the wallet of the page before', () => {
    const cursor = cursorOf({ lastSeenAt: NOW.toISOString(), wallet: PABLO });
    expect(readCensusCursor(cursor)).toEqual({ lastSeenAt: NOW.toISOString(), wallet: PABLO });
    expect(readCensusCursor(undefined)).toBeNull();
    expect(readCensusCursor(null)).toBeNull();
    for (const value of [
      '',
      'nonsense',
      `${NOW.toISOString()}~`,
      `2026-10-16~${PABLO}`,
      `${NOW.toISOString()}~${PABLO.toUpperCase()}`,
      `${NOW.toISOString()}~${PABLO}~more`,
      7,
      {},
    ]) {
      expect(readCensusCursor(value), JSON.stringify(value)).toBeUndefined();
    }
  });

  it('pages 200 people at most and words its refusals plainly', () => {
    expect(CENSUS_PAGE).toBe(200);
    expect(CENSUS_PROBLEMS).toEqual({
      notHouse: 'only the house reads the list of who has signed in',
      query: 'query must be text of 100 characters at most, none of them a control character',
      cursor: 'cursor must be one this list gave',
    });
  });
});

describe('migration 0007: two instants per wallet, and nothing else', () => {
  it('is a STRICT table of a wallet, the first time and the last, ordered by the last', () => {
    const { sqlite } = migratedTill();
    expect(
      sqlite
        .prepare("SELECT strict FROM pragma_table_list WHERE name = 'wallet_sign_ins'")
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ strict: 1 }]);
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('wallet_sign_ins') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'wallet', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'first_seen_at', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'last_seen_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'index' AND tbl_name = 'wallet_sign_ins' AND sql IS NOT NULL",
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ name: 'wallet_sign_ins_by_last_seen' }]);
  });

  it('refuses at the database a wallet out of shape, an instant that is not one, or a last before the first', () => {
    const { sqlite } = migratedTill();
    const insert = (row: { wallet?: string; first?: string; last?: string }): void => {
      sqlite
        .prepare(
          'INSERT INTO wallet_sign_ins (wallet, first_seen_at, last_seen_at) VALUES (?, ?, ?)',
        )
        .run(row.wallet ?? PABLO, row.first ?? NOW.toISOString(), row.last ?? NOW.toISOString());
      sqlite.prepare('DELETE FROM wallet_sign_ins').run();
    };
    insert({});
    insert({ first: '2026-10-01T00:00:00.000Z' });
    const refused = [
      { wallet: PABLO.toUpperCase().replace('0X', '0x') },
      { wallet: PABLO.slice(0, 41) },
      { wallet: `1x${'ab'.repeat(20)}` },
      { first: '2026-10-16' },
      { last: '2026-10-16 09:30:00' },
      { first: 'now' },
      { first: '2026-10-17T00:00:00.000Z' },
    ];
    for (const row of refused) {
      expect(() => insert(row), JSON.stringify(row)).toThrow(
        /CHECK constraint failed|non-deterministic use of strftime/,
      );
    }
    expect(signInRows(sqlite)).toEqual([]);
  });
});

describe('the account desk: a sign-in recorded', () => {
  it('keeps the first time and moves the last, one row per wallet', async () => {
    const { desk, sqlite } = scene();
    await signInAt(desk, PABLO, '2026-10-10T08:00:00.000Z');
    expect(signInRows(sqlite)).toEqual([
      {
        wallet: PABLO,
        first_seen_at: '2026-10-10T08:00:00.000Z',
        last_seen_at: '2026-10-10T08:00:00.000Z',
      },
    ]);
    await signInAt(desk, PABLO, '2026-10-16T09:30:00.000Z');
    expect(signInRows(sqlite)).toEqual([
      {
        wallet: PABLO,
        first_seen_at: '2026-10-10T08:00:00.000Z',
        last_seen_at: '2026-10-16T09:30:00.000Z',
      },
    ]);
  });

  it('never moves the last time back, whatever a clock says', async () => {
    const { desk, sqlite } = scene();
    await signInAt(desk, PABLO, '2026-10-16T09:30:00.000Z');
    await signInAt(desk, PABLO, '2026-10-15T09:30:00.000Z');
    expect(signInRows(sqlite)).toEqual([
      {
        wallet: PABLO,
        first_seen_at: '2026-10-16T09:30:00.000Z',
        last_seen_at: '2026-10-16T09:30:00.000Z',
      },
    ]);
  });

  it('records nothing else: no account, no organization, no log line', async () => {
    const { desk, sqlite } = scene();
    await signInAt(desk, MARIA, NOW.toISOString());
    for (const table of ['accounts', 'account_wallets', 'team_members', 'team_log']) {
      expect(count(sqlite, table), table).toBe(0);
    }
  });

  it('refuses a wallet that is not the session’s shape, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    for (const bad of [PABLO.toUpperCase(), 'nobody', undefined, null, 7]) {
      expect(await desk.signedIn(bad)).toEqual({ ok: false, problems: [PROBLEMS.wallet] });
    }
    expect(signInRows(sqlite)).toEqual([]);
  });
});

/** Pablo founds Estudio Lucía with María in it; María and Ana found one more each. */
async function city(desk: AccountDesk): Promise<void> {
  const lucia = await desk.createTeam(PABLO, 'Estudio Lucía');
  if (!lucia.ok) throw new Error(lucia.problems.join());
  const added = await desk.setMember(PABLO, lucia.account.id, MARIA, 'member');
  if (!added.ok) throw new Error(added.problems.join());
  await desk.createTeam(MARIA, 'Taller');
  await signInAt(desk, PABLO, '2026-10-12T10:00:00.000Z');
  await signInAt(desk, MARIA, '2026-10-14T10:00:00.000Z');
  await signInAt(desk, ANA, '2026-10-15T10:00:00.000Z');
  await signInAt(desk, PABLO, '2026-10-16T08:00:00.000Z');
  const named = await desk.setProfile(MARIA, { name: 'María Ferrán', avatar: ARLA });
  if (!named.ok) throw new Error(named.problems.join());
  vi.setSystemTime(NOW);
}

describe('the account desk: the list of who has signed in', () => {
  it('answers the house everyone, newest last time first, with names and how many organizations', async () => {
    const { desk } = scene();
    await city(desk);
    expect(await desk.citizens(HOUSE, true)).toEqual({
      ok: true,
      people: [
        {
          wallet: PABLO,
          firstSeenAt: '2026-10-12T10:00:00.000Z',
          lastSeenAt: '2026-10-16T08:00:00.000Z',
          organizations: 1,
        },
        {
          wallet: ANA,
          firstSeenAt: '2026-10-15T10:00:00.000Z',
          lastSeenAt: '2026-10-15T10:00:00.000Z',
          organizations: 0,
        },
        {
          wallet: MARIA,
          firstSeenAt: '2026-10-14T10:00:00.000Z',
          lastSeenAt: '2026-10-14T10:00:00.000Z',
          name: 'María Ferrán',
          avatar: ARLA,
          organizations: 2,
        },
      ],
      total: 3,
      next: null,
    });
  });

  it('refuses anyone who is not the house, in the directory’s words, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    await city(desk);
    const logLines = count(sqlite, 'team_log');
    const notHouse = { ok: false, problems: [CENSUS_PROBLEMS.notHouse] };
    // Not an organization's owner, not a member, not a stranger.
    expect(await desk.citizens(PABLO)).toEqual(notHouse);
    expect(await desk.citizens(MARIA, false)).toEqual(notHouse);
    expect(await desk.citizens(STRANGER, false, 'María')).toEqual(notHouse);
    expect(await desk.citizens(HOUSE, 'true')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.house],
    });
    expect(await desk.citizens('nobody', 1, 7, 'x')).toEqual({
      ok: false,
      problems: [
        PROBLEMS.wallet,
        ORG_PROBLEMS.house,
        CENSUS_PROBLEMS.query,
        CENSUS_PROBLEMS.cursor,
      ],
    });
    expect(count(sqlite, 'team_log')).toBe(logLines);
  });

  it('writes no house-read line: the list belongs to no organization', async () => {
    const { desk, sqlite } = scene();
    await city(desk);
    const logLines = count(sqlite, 'team_log');
    listOf(await desk.citizens(HOUSE, true));
    listOf(await desk.citizens(HOUSE, true, 'ana'));
    expect(count(sqlite, 'team_log')).toBe(logLines);
  });

  it('searches a piece of the wallet or of the published name, in any case', async () => {
    const { desk } = scene();
    await city(desk);
    const wallets = async (query: unknown): Promise<string[]> =>
      listOf(await desk.citizens(HOUSE, true, query)).people.map((person) => person.wallet);
    expect(await wallets('maría')).toEqual([MARIA]);
    expect(await wallets('FERR')).toEqual([MARIA]);
    expect(await wallets('5656')).toEqual([ANA]);
    expect(await wallets('0XABAB')).toEqual([PABLO]);
    expect(await wallets('  ')).toEqual([PABLO, ANA, MARIA]);
    expect(await wallets('nobody at all')).toEqual([]);
    // A search reads as text, never as a pattern.
    expect(await wallets('%')).toEqual([]);
    expect(await wallets('_')).toEqual([]);
    const searched = listOf(await desk.citizens(HOUSE, true, 'maría'));
    expect(searched.total).toBe(1);
  });

  it('pages 200 at a time with a cursor, and the last page says there is no next', async () => {
    const { desk, sqlite } = scene();
    const insert = sqlite.prepare(
      'INSERT INTO wallet_sign_ins (wallet, first_seen_at, last_seen_at) VALUES (?, ?, ?)',
    );
    // 205 people, three of them signed in at the very same instant.
    for (let index = 0; index < 205; index += 1) {
      const at = new Date(Date.UTC(2026, 9, 1) + Math.max(index, 2) * 60_000).toISOString();
      insert.run(`0x${index.toString(16).padStart(40, '0')}`, at, at);
    }
    const first = listOf(await desk.citizens(HOUSE, true));
    expect(first.people).toHaveLength(200);
    expect(first.total).toBe(205);
    expect(first.next).not.toBeNull();
    const second = listOf(await desk.citizens(HOUSE, true, undefined, first.next));
    expect(second.people).toHaveLength(5);
    expect(second.total).toBe(205);
    expect(second.next).toBeNull();
    const all = [...first.people, ...second.people].map((person) => person.wallet);
    expect(new Set(all).size).toBe(205);
    // Newest first; the same instant in wallet order.
    expect(all.slice(-3)).toEqual([
      `0x${'0'.repeat(39)}0`,
      `0x${'0'.repeat(39)}1`,
      `0x${'0'.repeat(39)}2`,
    ]);
    expect(all[0]).toBe(`0x${(204).toString(16).padStart(40, '0')}`);
  });

  it('names nobody who signed in before the list existed, nor anyone never signed in', async () => {
    const { desk } = scene();
    await desk.createTeam(STRANGER, 'Nunca entró');
    expect(await desk.citizens(HOUSE, true)).toEqual({
      ok: true,
      people: [],
      total: 0,
      next: null,
    });
  });

  it('follows the person: a name removed leaves the list at once', async () => {
    const { desk } = scene();
    await city(desk);
    await desk.setProfile(MARIA, null);
    const maria = listOf(await desk.citizens(HOUSE, true)).people.find(
      (person) => person.wallet === MARIA,
    );
    expect(maria).toEqual({
      wallet: MARIA,
      firstSeenAt: '2026-10-14T10:00:00.000Z',
      lastSeenAt: '2026-10-14T10:00:00.000Z',
      organizations: 2,
    });
  });
});
