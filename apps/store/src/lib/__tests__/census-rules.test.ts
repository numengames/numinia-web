import { describe, expect, it } from 'vitest';
import type { Rank } from '@numinia/domain';
import {
  appointedOracles,
  judgeGrant,
  MAX_ORACLES,
  oracleActMessage,
  rankFromRecord,
  type GrantQuery,
} from '../census-rules';

const w = (n: number) => `0x${n.toString(16).padStart(40, '0')}`;
const OWNER = w(1);
const OTHER_OWNER = w(2);
const owners = new Set([OWNER, OTHER_OWNER]);

function query(over: {
  actor?: Rank;
  actorWallet?: string;
  target?: Rank;
  targetWallet?: string;
  rank: Rank;
  appointed?: number;
}): GrantQuery {
  return {
    actor: { wallet: over.actorWallet ?? w(10), rank: over.actor ?? 'archon' },
    target: { wallet: over.targetWallet ?? w(20), rank: over.target ?? 'nomad' },
    rank: over.rank,
    owners,
    appointed: over.appointed ?? 0,
  };
}

describe('rankFromRecord', () => {
  it('passes every rank but oracle through', () => {
    expect(rankFromRecord({ rank: 'archon' }, owners)).toBe('archon');
  });
  it('honours an Oracle only while the appointing owner is an owner', () => {
    expect(rankFromRecord({ rank: 'oracle', appointedBy: OWNER }, owners)).toBe('oracle');
    expect(rankFromRecord({ rank: 'oracle', appointedBy: w(99) }, owners)).toBe('nomad');
    expect(rankFromRecord({ rank: 'oracle' }, owners)).toBe('nomad');
  });
});

describe('judgeGrant', () => {
  it('refuses a rank without manage-users', () => {
    expect(judgeGrant(query({ actor: 'vernacular', rank: 'citizen' }))).toMatchObject({
      status: 403,
    });
  });
  it('never changes an owner, nor your own rank', () => {
    expect(
      judgeGrant(
        query({ actor: 'oracle', actorWallet: OWNER, targetWallet: OTHER_OWNER, rank: 'nomad' }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      judgeGrant(
        query({
          actor: 'oracle',
          actorWallet: w(5),
          targetWallet: w(5),
          target: 'oracle',
          rank: 'nomad',
        }),
      ),
    ).toMatchObject({ error: 'Nobody changes their own rank' });
  });
  it('lets only an owner appoint or remove an Oracle, signed again', () => {
    expect(judgeGrant(query({ actor: 'oracle', rank: 'oracle' }))).toMatchObject({
      ok: false,
      error: 'Only an owner appoints or removes an Oracle',
    });
    expect(judgeGrant(query({ actor: 'oracle', target: 'oracle', rank: 'archon' }))).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(judgeGrant(query({ actor: 'oracle', actorWallet: OWNER, rank: 'oracle' }))).toEqual({
      ok: true,
      fresh: true,
    });
    expect(
      judgeGrant(query({ actor: 'oracle', actorWallet: OWNER, target: 'oracle', rank: 'archon' })),
    ).toEqual({ ok: true, fresh: true });
  });
  it('stops at four Oracles, owners included, but lets an existing one be re-appointed', () => {
    const full = MAX_ORACLES - owners.size;
    expect(
      judgeGrant(query({ actor: 'oracle', actorWallet: OWNER, rank: 'oracle', appointed: full })),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      judgeGrant(
        query({ actor: 'oracle', actorWallet: OWNER, rank: 'oracle', appointed: full - 1 }),
      ),
    ).toMatchObject({ ok: true });
    expect(
      judgeGrant(
        query({
          actor: 'oracle',
          actorWallet: OWNER,
          target: 'oracle',
          rank: 'oracle',
          appointed: full,
        }),
      ),
    ).toMatchObject({ ok: true });
  });
  it('an Archon cannot act on another Archon or an Oracle, nor give a rank at or above their own', () => {
    expect(judgeGrant(query({ actor: 'archon', target: 'archon', rank: 'nomad' }))).toMatchObject({
      error: 'Nobody acts upward',
    });
    expect(judgeGrant(query({ actor: 'archon', rank: 'archon' }))).toMatchObject({
      error: 'Promoting an Archon takes an Oracle',
    });
    expect(judgeGrant(query({ actor: 'archon', target: 'vernacular', rank: 'citizen' }))).toEqual({
      ok: true,
      fresh: false,
    });
  });
  it('an Oracle moves anyone up to Archon without a new signature', () => {
    expect(judgeGrant(query({ actor: 'oracle', target: 'archon', rank: 'vernacular' }))).toEqual({
      ok: true,
      fresh: false,
    });
    expect(judgeGrant(query({ actor: 'oracle', rank: 'archon' }))).toEqual({
      ok: true,
      fresh: false,
    });
  });
});

describe('oracleActMessage', () => {
  it('words the appointment and the removal in three lines', () => {
    const at = Date.UTC(2026, 9, 26, 12, 34);
    expect(oracleActMessage({ wallet: w(20), rank: 'oracle' }, true, at).split('\n')).toHaveLength(
      3,
    );
    expect(oracleActMessage({ wallet: w(20), rank: 'archon' }, false, at)).toContain(
      'becomes archon',
    );
    expect(oracleActMessage({ wallet: w(20), rank: 'archon' }, false, at)).toContain('12:34 UTC');
  });
});

describe('appointedOracles', () => {
  it('counts the census records that still hold the Oracle rank', async () => {
    const records = new Map<string, unknown>([
      [w(20), { rank: 'oracle', appointedBy: OWNER }],
      [w(21), { rank: 'oracle', appointedBy: w(99) }],
      [w(22), { rank: 'archon' }],
    ]);
    const census = {
      list: async () => [...records.keys()].map((k) => `${k}.json`).concat('README.md'),
      read: async (path: string) => {
        const wallet = path.slice('census/'.length, -'.json'.length);
        const rec = records.get(wallet) as { rank: Rank; appointedBy?: string };
        return {
          record: {
            wallet,
            since: '2026-10-26T00:00:00.000Z',
            updatedAt: '2026-10-26T00:00:00.000Z',
            actor: OWNER,
            ...rec,
          },
          sha: 's',
        };
      },
    };
    expect(await appointedOracles(census as never, owners)).toBe(1);
  });
  it('counts a missing record as nobody', async () => {
    const census = { list: async () => [`${w(20)}.json`], read: async () => null };
    expect(await appointedOracles(census as never, owners)).toBe(0);
  });
});
