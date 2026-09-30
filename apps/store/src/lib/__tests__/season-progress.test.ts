import { describe, expect, it } from 'vitest';
import { SEASON_ONE, type Season } from '@numinia/domain';
import {
  doorStates,
  GATED_WORLD_URLS,
  holdingsOf,
  NOBODY,
  passTokenFrom,
  tokensToRead,
  type BalanceReader,
  type Holdings,
} from '../season-progress';

const C = '0x1111111111111111111111111111111111111111' as const;
const OWNER = '0x2222222222222222222222222222222222222222' as const;

/** Season I with every reward minted as token N of one contract. */
const MINTED: Season = {
  ...SEASON_ONE,
  adventures: SEASON_ONE.adventures.map((adventure, a) => ({
    ...adventure,
    rewards: adventure.rewards.map((reward, r) => ({
      ...reward,
      token: { chainId: 8453, contract: C, tokenId: String(a * 2 + r + 1) },
    })),
  })),
};

const holding = (ids: string[], hasPass = false): Holdings => ({ held: new Set(ids), hasPass });

describe('doorStates — the wallet is the proof', () => {
  it('shows every door while no reward is minted yet, the last one locked without the pass', () => {
    expect(doorStates(SEASON_ONE, NOBODY)).toEqual([
      'current',
      'current',
      'current',
      'current',
      'current',
      'current',
      'current',
      'locked',
    ]);
  });

  it('once minted, a newcomer sees the first door and fog after it', () => {
    expect(doorStates(MINTED, NOBODY)).toEqual([
      'current',
      'fog',
      'fog',
      'fog',
      'fog',
      'fog',
      'fog',
      'fog',
    ]);
  });

  it('holding a door’s free reward crosses it and reveals the next', () => {
    expect(doorStates(MINTED, holding(['loot-f-001', 'loot-f-002']))).toEqual([
      'done',
      'done',
      'current',
      'fog',
      'fog',
      'fog',
      'fog',
      'fog',
    ]);
  });

  it('reaching the last door without the pass shows the lock; with it, the door', () => {
    const seven = ['1', '2', '3', '4', '5', '6', '7'].map((n) => `loot-f-00${n}`);
    expect(doorStates(MINTED, holding(seven)).at(-1)).toBe('locked');
    expect(doorStates(MINTED, holding(seven, true)).at(-1)).toBe('current');
    expect(doorStates(MINTED, holding([...seven, 'loot-f-008'], true)).at(-1)).toBe('done');
  });

  it('a door with no free reward never proves a crossing', () => {
    const bare: Season = {
      ...MINTED,
      adventures: MINTED.adventures.map((a, i) => (i === 0 ? { ...a, rewards: [] } : a)),
    };
    expect(doorStates(bare, NOBODY).slice(0, 2)).toEqual(['current', 'current']);
  });
});

describe('the gated door', () => {
  it('keeps its address on the server, never in the shared season', () => {
    expect(SEASON_ONE.adventures.find((a) => a.requiresPass)?.worldUrl).toBeNull();
    expect(GATED_WORLD_URLS['adv-008']).toMatch(/^https:\/\//);
  });
});

describe('tokensToRead / passTokenFrom', () => {
  it('asks the chain only about minted rewards', () => {
    expect(tokensToRead(SEASON_ONE)).toEqual([]);
    expect(tokensToRead(MINTED)).toHaveLength(16);
  });

  it('reads the pass token from the Worker’s public vars, and refuses a bad one', () => {
    expect(passTokenFrom({})).toBeNull();
    expect(passTokenFrom({ SEASON_PASS_CONTRACT: 'nope' })).toBeNull();
    expect(passTokenFrom({ SEASON_PASS_CONTRACT: C, SEASON_PASS_CHAIN_ID: 'x' })).toBeNull();
    expect(passTokenFrom({ SEASON_PASS_CONTRACT: C })).toEqual({
      chainId: 8453,
      contract: C,
      tokenId: '0',
    });
    expect(
      passTokenFrom({
        SEASON_PASS_CONTRACT: C,
        SEASON_PASS_CHAIN_ID: '84532',
        SEASON_PASS_TOKEN_ID: '3',
      }),
    ).toEqual({ chainId: 84532, contract: C, tokenId: '3' });
  });
});

describe('holdingsOf', () => {
  const pass = { chainId: 8453, contract: C, tokenId: '0' };

  it('asks nothing when nothing is minted and there is no pass token', async () => {
    const read: BalanceReader = () => Promise.reject(new Error('must not be called'));
    expect(await holdingsOf(OWNER, SEASON_ONE, null, read)).toBe(NOBODY);
  });

  it('turns balances into held rewards and the pass', async () => {
    const read: BalanceReader = (_, tokens) =>
      Promise.resolve(tokens.map((t) => (['1', '0'].includes(t.tokenId) ? 1n : 0n)));
    const result = await holdingsOf(OWNER, MINTED, pass, read);
    expect([...result.held]).toEqual(['loot-f-001']);
    expect(result.hasPass).toBe(true);
  });

  it('reads the pass alone before any reward is minted', async () => {
    const read: BalanceReader = () => Promise.resolve([1n]);
    expect((await holdingsOf(OWNER, SEASON_ONE, pass, read)).hasPass).toBe(true);
  });

  it('grants nothing when the chain cannot be read, or answers short', async () => {
    expect(await holdingsOf(OWNER, MINTED, pass, () => Promise.reject(new Error('rpc down')))).toBe(
      NOBODY,
    );
    const short = await holdingsOf(OWNER, MINTED, pass, () => Promise.resolve([]));
    expect(short.held.size).toBe(0);
    expect(short.hasPass).toBe(false);
  });
});
