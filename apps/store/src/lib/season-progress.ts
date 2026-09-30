/**
 * Season progress — what a wallet has crossed, read from what it holds.
 *
 * The Oracle's rule (2026-09-30): a door counts as crossed when the wallet
 * holds that door's free reward. No form, no admin marking by hand: the
 * digital good is the proof. The pass is proven the same way — holding the
 * season pass token.
 *
 * A door is REVEALED (out of the fog) when it is the first one, or when the
 * door before it was crossed. A reward that has not been minted yet cannot be
 * proven, so it never holds a door back: until the season's rewards exist as
 * tokens every door shows, and the fog turns on by itself as they are minted.
 *
 * Pure except for the injected reader, so every rule here is tested; the
 * chain call itself lives in the API route.
 */

import type { Adventure, RewardToken, Season } from '@numinia/domain';

export type DoorState = 'done' | 'current' | 'fog' | 'locked';

export interface Holdings {
  /** Ids of the rewards the wallet holds. */
  readonly held: ReadonlySet<string>;
  readonly hasPass: boolean;
}

export const NOBODY: Holdings = { held: new Set(), hasPass: false };

/**
 * The addresses of doors behind the pass. Server-only: this module is never
 * imported by a page that renders HTML, and the API gives the address to pass
 * holders alone. The real lock is the world's own (oncyber), which the Oracle
 * closes; this keeps the address out of every static page.
 */
export const GATED_WORLD_URLS: Readonly<Record<string, string>> = {
  'adv-008': 'https://oo.oncyber.io/door_of_thoth',
};

function freeToken(adventure: Adventure): RewardToken | undefined {
  return adventure.rewards.find((reward) => reward.track === 'free')?.token;
}

function crossed(adventure: Adventure, holdings: Holdings): boolean {
  const free = adventure.rewards.find((reward) => reward.track === 'free');
  return free !== undefined && holdings.held.has(free.id);
}

/** Whether the door before this one lets it out of the fog. */
function opensNext(adventure: Adventure, holdings: Holdings): boolean {
  return crossed(adventure, holdings) || freeToken(adventure) === undefined;
}

/** The state of every door, in order. */
export function doorStates(season: Season, holdings: Holdings): readonly DoorState[] {
  const doors = [...season.adventures].sort((a, b) => a.order - b.order);
  return doors.map((door, index) => {
    const previous = doors[index - 1];
    const revealed = previous === undefined || opensNext(previous, holdings);
    if (!revealed) return 'fog';
    if (door.requiresPass && !holdings.hasPass) return 'locked';
    return crossed(door, holdings) ? 'done' : 'current';
  });
}

/** Every token worth asking the chain about for this season: the minted rewards. */
export function tokensToRead(
  season: Season,
): ReadonlyArray<{ rewardId: string; token: RewardToken }> {
  return season.adventures.flatMap((adventure) =>
    adventure.rewards.flatMap((reward) =>
      reward.token ? [{ rewardId: reward.id, token: reward.token }] : [],
    ),
  );
}

/** Reads ERC-1155 balances; the route wires it to the chain, tests to a table. */
export type BalanceReader = (
  owner: `0x${string}`,
  tokens: readonly RewardToken[],
) => Promise<readonly bigint[]>;

/** The pass token, from the Worker's public configuration; null when not set. */
export function passTokenFrom(
  env: Readonly<Record<string, string | undefined>>,
): RewardToken | null {
  const contract = env.SEASON_PASS_CONTRACT;
  if (!contract || !/^0x[0-9a-fA-F]{40}$/.test(contract)) return null;
  const chainId = Number(env.SEASON_PASS_CHAIN_ID ?? '8453');
  if (!Number.isInteger(chainId) || chainId <= 0) return null;
  return { chainId, contract: contract as `0x${string}`, tokenId: env.SEASON_PASS_TOKEN_ID ?? '0' };
}

/** What a wallet holds of this season. A failed read grants nothing (fail closed). */
export async function holdingsOf(
  owner: `0x${string}`,
  season: Season,
  passToken: RewardToken | null,
  read: BalanceReader,
): Promise<Holdings> {
  const rewards = tokensToRead(season);
  const tokens = [...rewards.map((entry) => entry.token), ...(passToken ? [passToken] : [])];
  if (tokens.length === 0) return NOBODY;
  try {
    const balances = await read(owner, tokens);
    const held = new Set(
      rewards.filter((_, i) => (balances[i] ?? 0n) > 0n).map((entry) => entry.rewardId),
    );
    const hasPass = passToken !== null && (balances[rewards.length] ?? 0n) > 0n;
    return { held, hasPass };
  } catch {
    return NOBODY;
  }
}
