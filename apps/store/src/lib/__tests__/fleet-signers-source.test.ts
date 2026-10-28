import { recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answerSigners,
  archonsOf,
  boundSignersDesk,
  createFixtureSignersDesk,
  resetSignersMemoForTests,
  signersDeskFrom,
  signersList,
  type SignersDeskApi,
  type SignersSources,
} from '../fleet-signers-source';

const ORACLE = '0xF688e4d5f07e5d0b80d83f201e13cf42d721b489';
const ARCHON = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const NOMAD = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
const lower = (wallet: string) => wallet.toLowerCase();
const SIGNATURE = `0x${'ab'.repeat(65)}`;
const FIXTURE_HOUSE = lower(
  privateKeyToAccount(
    ['0xac0974bec39a17e3', '6ba4a6b4d238ff94', '4bacb478cbed5efc', 'ae784d7bf4f2ff80'].join(
      '',
    ) as `0x${string}`,
  ).address,
);

type Census = NonNullable<SignersSources['census']>;
const rec = (rank: string) => ({ record: { rank }, sha: 'x' });

/** A census of three files, a stray one, and a rank for each wallet. */
function censusOf(overrides: Partial<Census> = {}): Census {
  const ranks: Record<string, string> = { [ARCHON]: 'archon', [NOMAD]: 'citizen' };
  return {
    list: async () => [
      `${ARCHON}.json`,
      `${NOMAD}.json`,
      'README.md',
      'ABC.json',
      `${ORACLE}.json`,
      `${lower(ORACLE)}.json`,
    ],
    read: (async (path: string) => {
      const wallet = path.replace('census/', '').replace('.json', '');
      return ranks[wallet] === undefined ? null : rec(ranks[wallet]!);
    }) as unknown as Census['read'],
    ...overrides,
  };
}

const okDesk = (): SignersDeskApi & { calls: string[][] } => {
  const calls: string[][] = [];
  return {
    calls,
    async signSigners(wallets) {
      calls.push(wallets);
      return {
        ok: true,
        record: {
          message: { signers: wallets, seq: 1893456000, issuedAt: 1893456000 },
          signature: SIGNATURE,
        },
      };
    },
  };
};

beforeEach(() => resetSignersMemoForTests());

describe('the desk the route asks', () => {
  it('reads a bound desk as a method of the stub, and nothing else', async () => {
    const binding = {
      seen: 0,
      async signSigners(this: { seen: number }, wallets: string[]) {
        this.seen += 1;
        return wallets;
      },
    };
    const desk = boundSignersDesk(binding);
    expect(await desk?.signSigners(['x'])).toEqual(['x']);
    expect(binding.seen).toBe(1);
    expect(boundSignersDesk(null)).toBeNull();
    expect(boundSignersDesk('desk')).toBeNull();
    expect(boundSignersDesk({})).toBeNull();
    expect(boundSignersDesk(Object.assign(() => 1, { signSigners: () => 1 }))).not.toBeNull();
  });

  it('falls to the fixture desk only under DATA_SOURCE=fixture', () => {
    expect(signersDeskFrom({ binding: undefined, dataSource: undefined })).toBeNull();
    expect(signersDeskFrom({ binding: undefined, dataSource: 'github' })).toBeNull();
    expect(signersDeskFrom({ binding: undefined, dataSource: 'fixture' })).not.toBeNull();
    const bound = { signSigners: async () => 1 };
    expect(signersDeskFrom({ binding: bound, dataSource: 'fixture' })).not.toBeNull();
  });

  it('has a fixture desk whose signature recovers to its public test wallet', async () => {
    const desk = createFixtureSignersDesk(() => 1_893_456_000_900);
    const answer = (await desk.signSigners([ARCHON, lower(ORACLE)])) as {
      record: {
        message: { signers: string[]; seq: number; issuedAt: number };
        signature: `0x${string}`;
      };
    };
    expect(answer.record.message).toEqual({
      signers: [ARCHON, lower(ORACLE)],
      seq: 1893456000,
      issuedAt: 1893456000,
    });
    const recovered = await recoverTypedDataAddress({
      domain: { name: 'Numinia Fleet', version: '1' },
      types: {
        FleetSigners: [
          { name: 'signers', type: 'string' },
          { name: 'seq', type: 'uint256' },
          { name: 'issuedAt', type: 'uint256' },
        ],
      },
      primaryType: 'FleetSigners',
      message: { signers: `${ARCHON},${lower(ORACLE)}`, seq: 1893456000n, issuedAt: 1893456000n },
      signature: answer.record.signature,
    });
    expect(lower(recovered)).toBe(FIXTURE_HOUSE);
    // And with the real clock by default.
    const live = (await createFixtureSignersDesk().signSigners([ARCHON])) as {
      record: { message: { seq: number } };
    };
    expect(live.record.message.seq).toBeGreaterThan(1_700_000_000);
  });
});

describe('the list', () => {
  it('joins Oracles and Archons in lower case, unique, sorted, only well-formed wallets', () => {
    expect(signersList([ORACLE, 'junk'], [ARCHON, lower(ORACLE)])).toEqual([ARCHON, lower(ORACLE)]);
    expect(signersList([], [])).toEqual([]);
  });

  it('reads the Archons off the census: listed once, each file read, other ranks and strays ignored', async () => {
    const census = censusOf();
    const read = vi.spyOn(census, 'read');
    expect(await archonsOf(census, 1000)).toEqual([ARCHON]);
    // The archon, the nomad and a file with no record are read; README.md, ABC.json and a mixed-case name are not.
    expect(read).toHaveBeenCalledTimes(3);
    expect(await archonsOf(null, 1000)).toEqual([]);
  });

  it('adds the Oracles an owner appointed, and only while that owner is one', async () => {
    const appointed = `0x${'77'.repeat(20)}`;
    const orphan = `0x${'88'.repeat(20)}`;
    const records: Record<string, { rank: string; appointedBy?: string }> = {
      [appointed]: { rank: 'oracle', appointedBy: lower(ORACLE) },
      [orphan]: { rank: 'oracle', appointedBy: `0x${'99'.repeat(20)}` },
    };
    const census = {
      list: async () => Object.keys(records).map((wallet) => `${wallet}.json`),
      read: async (path: string) => {
        const wallet = path.slice('census/'.length, -'.json'.length);
        return { record: { wallet, ...records[wallet] }, sha: 's' };
      },
    } as unknown as Census;
    expect(await archonsOf(census, 1000, new Set([lower(ORACLE)]))).toEqual([appointed]);
  });

  it('fails (never answers short) when a read fails, the listing fails, or it takes too long', async () => {
    const broken = censusOf({
      read: (async () => Promise.reject(new Error('503'))) as Census['read'],
    });
    await expect(archonsOf(broken, 1000)).rejects.toThrow('503');
    const noList = censusOf({ list: async () => Promise.reject(new Error('down')) });
    await expect(archonsOf(noList, 1000)).rejects.toThrow('down');
    const slow = censusOf({ list: () => new Promise(() => undefined) });
    await expect(archonsOf(slow, 5)).rejects.toThrow('timed out');
  });
});

describe('the route’s answer', () => {
  const sources = (census: SignersSources['census'] = censusOf()): SignersSources => ({
    oracles: () => [ORACLE],
    census,
  });

  it('is a 503 not-configured with no desk bound (dormant)', async () => {
    const response = await answerSigners(null, sources());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'not-configured' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('is a 503 not-configured when the till has no key', async () => {
    const desk = { signSigners: async () => ({ ok: false, problems: ['not-configured'] }) };
    const response = await answerSigners(desk, sources());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'not-configured' });
  });

  it('serves the signed record for Oracles + Archons, public and cached a minute', async () => {
    const desk = okDesk();
    const response = await answerSigners(desk, sources());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.json()).toEqual({
      message: { signers: [ARCHON, lower(ORACLE)], seq: 1893456000, issuedAt: 1893456000 },
      signature: SIGNATURE,
    });
    expect(desk.calls).toEqual([[ARCHON, lower(ORACLE)]]);
  });

  it('serves Oracles alone where there is no census, and signs once a minute', async () => {
    const desk = okDesk();
    let t = 0;
    const now = () => t;
    const first = await answerSigners(desk, sources(null), now);
    expect((await first.json()).message.signers).toEqual([lower(ORACLE)]);
    t = 59_999;
    await answerSigners(desk, sources(null), now);
    expect(desk.calls).toHaveLength(1);
    t = 60_000;
    await answerSigners(desk, sources(null), now);
    expect(desk.calls).toHaveLength(2);
  });

  it('is a 503 when the census cannot be read in full — the machines keep their list', async () => {
    const census = censusOf({ list: async () => Promise.reject(new Error('rate limit')) });
    const response = await answerSigners(okDesk(), sources(census));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'census-unavailable' });
  });

  it('is a 503 when nobody is to be listed', async () => {
    const response = await answerSigners(okDesk(), { oracles: () => [], census: null });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'no-signers' });
  });

  it('is a 502 when the till throws, refuses otherwise, or answers nonsense', async () => {
    const good = {
      message: { signers: [ARCHON, lower(ORACLE)], seq: 5, issuedAt: 5 },
      signature: SIGNATURE,
    };
    const answers: unknown[] = [
      null,
      'ok',
      { ok: false, problems: ['signers: 1 to 200'] },
      { ok: false },
      { ok: true },
      { ok: true, record: null },
      { ok: true, record: { message: null, signature: SIGNATURE } },
      { ok: true, record: { ...good, signature: 'nope' } },
      { ok: true, record: { ...good, signature: 7 } },
      { ok: true, record: { ...good, message: { ...good.message, signers: [ARCHON] } } },
      { ok: true, record: { ...good, message: { ...good.message, signers: 'x' } } },
      { ok: true, record: { ...good, message: { ...good.message, seq: 0 } } },
      { ok: true, record: { ...good, message: { ...good.message, seq: '5' } } },
      { ok: true, record: { ...good, message: { ...good.message, issuedAt: '5' } } },
    ];
    for (const answer of answers) {
      const response = await answerSigners({ signSigners: async () => answer }, sources());
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: 'till-unreachable' });
    }
    const throwing = { signSigners: async () => Promise.reject(new Error('rpc')) };
    expect((await answerSigners(throwing, sources())).status).toBe(502);
  });
});
