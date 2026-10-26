/**
 * «Rango» in the panel's Miembros (GET /api/saldo/ranks?cuenta=<id>): each
 * member's rank in the city — theirs, it travels with the person; no
 * organization gives it — for the members of ONE organization, to its
 * members and the house only. The wallets come from the till's answer about
 * that organization, never from the request; an Oracle is the allowlist's
 * word (no I/O), anyone else the census's, read in parallel, at most a
 * hundred, three seconds each, a failure a rank nobody can say (null).
 */

import { describe, expect, it, vi } from 'vitest';
import { CensusRecordSchema } from '@numinia/state';
import type { Rank } from '@numinia/domain';
import type { AccountDesk, Asker, DeskMembersAnswer } from '../accounts';
import {
  RANKED_MAX,
  RANK_READ_MS,
  answerRanks,
  censusOf,
  rankOf,
  ranksOf,
  type RankSources,
} from '../member-ranks';

const wallet = (pair: string) => `0x${pair.repeat(20)}`;
const ORACLE = wallet('ab');
const CITIZEN = wallet('c1');
const PILGRIM = wallet('d2');
const STRANGER = wallet('e3');
const ACCOUNT = 'acc_team_numen_games';

/** The allowlist names ORACLE; the census knows CITIZEN and PILGRIM. */
function sources(census: RankSources['census'] = recorded()): RankSources {
  return { isOracle: (who) => who === ORACLE, census };
}

function recorded(
  known: Readonly<Record<string, Rank>> = { [CITIZEN]: 'citizen', [PILGRIM]: 'pilgrim' },
) {
  return vi.fn(async (who: string): Promise<Rank | null> => known[who] ?? null);
}

/** A desk that answers `members` (and nothing else is asked of it). */
function deskAnswering(answer: () => Promise<unknown>) {
  const members = vi.fn(answer);
  return { desk: { members } as unknown as AccountDesk, members };
}

const membersOf = (...wallets: string[]): DeskMembersAnswer => ({
  ok: true,
  members: wallets.map((who) => ({
    wallet: who,
    role: 'member',
    addedAt: '2026-10-01T00:00:00.000Z',
  })),
});

const citizen: Asker = { wallet: CITIZEN, house: false };
const url = (search: string) => new URL(`https://numinia.com/api/saldo/ranks${search}`);

describe('one wallet’s rank', () => {
  it('an Oracle is the allowlist’s word: the census is never asked', async () => {
    const census = recorded();
    expect(await rankOf(ORACLE, sources(census))).toBe('oracle');
    expect(census).not.toHaveBeenCalled();
  });

  it('anyone else is what the census remembers, and a Nomad when it remembers nothing', async () => {
    expect(await rankOf(CITIZEN, sources())).toBe('citizen');
    expect(await rankOf(PILGRIM, sources())).toBe('pilgrim');
    expect(await rankOf(STRANGER, sources())).toBe('nomad');
  });

  it('a census Oracle is what censusOf says: an owner stands behind it or it is a Nomad', async () => {
    const record = (appointedBy?: string) => ({
      record: {
        wallet: STRANGER,
        rank: 'oracle',
        since: 's',
        updatedAt: 's',
        actor: ORACLE,
        appointedBy,
      },
      sha: 'x',
    });
    const read = vi
      .fn()
      .mockResolvedValueOnce(record(ORACLE))
      .mockResolvedValueOnce(record(CITIZEN));
    const census = censusOf({ read } as never, new Set([ORACLE]));
    expect(await rankOf(STRANGER, sources(census))).toBe('oracle');
    expect(await rankOf(STRANGER, sources(census))).toBe('nomad');
  });

  it('with no census here everyone but an Oracle is a Nomad, as the sign-in says', async () => {
    expect(await rankOf(CITIZEN, sources(null))).toBe('nomad');
    expect(await rankOf(ORACLE, sources(null))).toBe('oracle');
  });

  it('a census that fails, or takes longer than its time, says nothing (null)', async () => {
    const failing = vi.fn(async (): Promise<Rank | null> => {
      throw new Error('502');
    });
    expect(await rankOf(CITIZEN, sources(failing))).toBeNull();
    const never = vi.fn(() => new Promise<Rank | null>(() => undefined));
    expect(await rankOf(CITIZEN, { ...sources(never), readMs: 5 })).toBeNull();
    expect(RANK_READ_MS).toBe(3_000);
  });
});

describe('the ranks of many wallets', () => {
  it('asks once per wallet, in lower case, all at the same time', async () => {
    let started = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const census = vi.fn(async (who: string): Promise<Rank | null> => {
      started += 1;
      await gate;
      return who === CITIZEN ? 'citizen' : null;
    });
    const pending = ranksOf([CITIZEN.toUpperCase().replace('0X', '0x'), CITIZEN, STRANGER], {
      ...sources(census),
    });
    await vi.waitFor(() => expect(started).toBe(2));
    release();
    expect(await pending).toEqual({ [CITIZEN]: 'citizen', [STRANGER]: 'nomad' });
  });

  it('reads at most a hundred', async () => {
    const census = recorded({});
    const many = Array.from({ length: 150 }, (_, i) => `0x${i.toString(16).padStart(40, '0')}`);
    const ranks = await ranksOf(many, sources(census));
    expect(Object.keys(ranks)).toHaveLength(RANKED_MAX);
    expect(census).toHaveBeenCalledTimes(RANKED_MAX);
  });

  it('never reads something that is not a wallet', async () => {
    const census = recorded();
    expect(await ranksOf(['census/../secrets', CITIZEN], sources(census))).toEqual({
      'census/../secrets': null,
      [CITIZEN]: 'citizen',
    });
    expect(census).toHaveBeenCalledTimes(1);
  });
});

describe('the census as the state store keeps it', () => {
  it('reads one file per wallet with the census’s own shape', async () => {
    const read = vi.fn(async () => ({ record: { rank: 'citizen' as Rank }, sha: 'x' }));
    expect(await censusOf({ read } as never)(CITIZEN)).toBe('citizen');
    expect(read).toHaveBeenCalledWith(`census/${CITIZEN}.json`, CensusRecordSchema);
  });

  it('a wallet with no file has no record', async () => {
    const read = vi.fn(async () => null);
    expect(await censusOf({ read } as never)(CITIZEN)).toBeNull();
  });
});

describe('GET /api/saldo/ranks', () => {
  it('without a session: 401, and the till is not asked', async () => {
    const { desk, members } = deskAnswering(async () => membersOf(CITIZEN));
    const reply = await answerRanks(desk, null, url(`?cuenta=${ACCOUNT}`), sources());
    expect(reply.status).toBe(401);
    expect(await reply.json()).toEqual({ error: 'signed-out' });
    expect(reply.headers.get('cache-control')).toBe('no-store');
    expect(members).not.toHaveBeenCalled();
  });

  it('without an account, or with one too long to be one: 400', async () => {
    const { desk } = deskAnswering(async () => membersOf(CITIZEN));
    for (const search of ['', '?cuenta=', `?cuenta=${'a'.repeat(101)}`]) {
      const reply = await answerRanks(desk, citizen, url(search), sources());
      expect(reply.status, search).toBe(400);
    }
  });

  it('without a till: 503 not-bound', async () => {
    const reply = await answerRanks(null, citizen, url(`?cuenta=${ACCOUNT}`), sources());
    expect(reply.status).toBe(503);
    expect(await reply.json()).toEqual({ error: 'not-bound' });
  });

  it('asks the till for that organization’s members as the session, with the house’s flag from the session', async () => {
    const { desk, members } = deskAnswering(async () => membersOf(CITIZEN));
    await answerRanks(
      desk,
      { wallet: CITIZEN.toUpperCase().replace('0X', '0x'), house: false },
      url(`?cuenta=${ACCOUNT}`),
      sources(),
    );
    expect(members).toHaveBeenLastCalledWith(CITIZEN, ACCOUNT, false);
    await answerRanks(
      desk,
      { wallet: ORACLE, house: true },
      url(`?cuenta=${ACCOUNT}&house=false`),
      sources(),
    );
    expect(members).toHaveBeenLastCalledWith(ORACLE, ACCOUNT, true);
  });

  it('answers the rank of every member the till names, and of nobody else', async () => {
    const { desk } = deskAnswering(async () => membersOf(ORACLE, CITIZEN, STRANGER));
    const reply = await answerRanks(
      desk,
      citizen,
      url(`?cuenta=${ACCOUNT}&wallets=${PILGRIM}`),
      sources(),
    );
    expect(reply.status).toBe(200);
    expect(reply.headers.get('cache-control')).toBe('private, max-age=300');
    expect(await reply.json()).toEqual({
      ok: true,
      ranks: { [ORACLE]: 'oracle', [CITIZEN]: 'citizen', [STRANGER]: 'nomad' },
    });
  });

  it('an organization the till lists without people answers no ranks', async () => {
    const { desk } = deskAnswering(async () => ({ ok: true }));
    const reply = await answerRanks(desk, citizen, url(`?cuenta=${ACCOUNT}`), sources());
    expect(await reply.json()).toEqual({ ok: true, ranks: {} });
  });

  it('a rank the census could not say is null, and the log counts it without naming anyone', async () => {
    const log = vi.fn();
    const failing = vi.fn(async (): Promise<Rank | null> => {
      throw new Error('timeout');
    });
    const { desk } = deskAnswering(async () => membersOf(ORACLE, CITIZEN, PILGRIM));
    const reply = await answerRanks(
      desk,
      citizen,
      url(`?cuenta=${ACCOUNT}`),
      sources(failing),
      log,
    );
    expect(await reply.json()).toEqual({
      ok: true,
      ranks: { [ORACLE]: 'oracle', [CITIZEN]: null, [PILGRIM]: null },
    });
    expect(log).toHaveBeenCalledWith({
      level: 'warn',
      kind: 'member-ranks',
      rule: 'census-unread',
      count: 2,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(CITIZEN);
  });

  it('a stranger to the organization: 403 with the till’s words', async () => {
    const { desk } = deskAnswering(async () => ({ ok: false, problems: ['not a member'] }));
    const reply = await answerRanks(desk, citizen, url(`?cuenta=${ACCOUNT}`), sources());
    expect(reply.status).toBe(403);
    expect(await reply.json()).toEqual({ error: 'refused', problems: ['not a member'] });
  });

  it('an account that is not an organization (the personal one): 404', async () => {
    const { desk } = deskAnswering(async () => ({ ok: false, problems: ['not an organization'] }));
    const reply = await answerRanks(desk, citizen, url('?cuenta=acc_personal'), sources());
    expect(reply.status).toBe(404);
    expect(await reply.json()).toEqual({ error: 'no-team' });
  });

  it('a till that throws or answers out of shape: 502, logged by rule', async () => {
    const log = vi.fn();
    const threw = deskAnswering(async () => {
      throw new TypeError('rpc');
    });
    const first = await answerRanks(threw.desk, citizen, url(`?cuenta=${ACCOUNT}`), sources(), log);
    expect(first.status).toBe(502);
    expect(await first.json()).toEqual({ error: 'till-failed' });
    expect(log).toHaveBeenLastCalledWith({
      level: 'error',
      kind: 'saldo-till',
      action: 'ranks',
      rule: 'threw',
      error: 'TypeError',
    });
    const odd = deskAnswering(async () => ({ ok: true, members: [{ who: CITIZEN }] }));
    const second = await answerRanks(odd.desk, citizen, url(`?cuenta=${ACCOUNT}`), sources(), log);
    expect(second.status).toBe(502);
    expect(log).toHaveBeenLastCalledWith({
      level: 'error',
      kind: 'saldo-till',
      action: 'ranks',
      rule: 'answer-shape',
    });
    const thrownValue = deskAnswering(async () => {
      throw 'down';
    });
    await answerRanks(thrownValue.desk, citizen, url(`?cuenta=${ACCOUNT}`), sources(), log);
    expect(log).toHaveBeenLastCalledWith({
      level: 'error',
      kind: 'saldo-till',
      action: 'ranks',
      rule: 'threw',
      error: 'string',
    });
  });

  it('logs through the site’s telemetry when no log is handed over', async () => {
    const { desk } = deskAnswering(async () => membersOf(ORACLE));
    const reply = await answerRanks(desk, citizen, url(`?cuenta=${ACCOUNT}`), sources());
    expect(reply.status).toBe(200);
  });

  it('anything but members or a refusal from the till is out of shape: 502', async () => {
    const log = vi.fn();
    for (const odd of [
      undefined,
      'ok',
      {},
      { ok: 'yes' },
      { ok: false },
      { ok: false, problems: [404] },
      { ok: true, members: 'everyone' },
      { ok: true, members: [42] },
      { ok: true, members: [null] },
    ]) {
      const { desk } = deskAnswering(async () => odd);
      const reply = await answerRanks(desk, citizen, url(`?cuenta=${ACCOUNT}`), sources(), log);
      expect(reply.status, JSON.stringify(odd) ?? 'undefined').toBe(502);
    }
    expect(log).toHaveBeenCalledTimes(9);
  });
});
