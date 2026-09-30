/**
 * Season progress for the signed-in wallet: which doors are crossed, which
 * are in the fog, whether the pass is held — all read from what the wallet
 * holds on chain (lib/season-progress). The gated door's address travels
 * only in this answer, and only to a pass holder.
 *
 * No session → the newcomer's view (200, nothing held). A chain that cannot
 * be read grants nothing: fail closed in privilege terms.
 */

import type { APIRoute } from 'astro';
import { createPublicClient, defineChain, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { SEASON_ONE, type RewardToken } from '@numinia/domain';
import { viewerFrom } from '../../../lib/lap/gate';
import { runtimeEnv } from '../../../lib/runtime-env';
import {
  doorStates,
  GATED_WORLD_URLS,
  holdingsOf,
  NOBODY,
  passTokenFrom,
  type BalanceReader,
} from '../../../lib/season-progress';

export const prerender = false;

const ERC1155_BALANCE_OF_BATCH = [
  {
    type: 'function',
    name: 'balanceOfBatch',
    stateMutability: 'view',
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const;

function chainFor(id: number) {
  if (id === base.id) return base;
  if (id === baseSepolia.id) return baseSepolia;
  return defineChain({ ...base, id });
}

/** One multicall-free read per (chain, contract): balanceOfBatch. */
const readChain: BalanceReader = async (owner, tokens) => {
  const groups = new Map<string, { chainId: number; contract: `0x${string}`; idx: number[] }>();
  tokens.forEach((token: RewardToken, i) => {
    const key = `${token.chainId}:${token.contract.toLowerCase()}`;
    const group = groups.get(key) ?? { chainId: token.chainId, contract: token.contract, idx: [] };
    group.idx.push(i);
    groups.set(key, group);
  });
  const out: bigint[] = tokens.map(() => 0n);
  for (const group of groups.values()) {
    const client = createPublicClient({ chain: chainFor(group.chainId), transport: http() });
    const balances = await client.readContract({
      address: group.contract,
      abi: ERC1155_BALANCE_OF_BATCH,
      functionName: 'balanceOfBatch',
      args: [group.idx.map(() => owner), group.idx.map((i) => BigInt(tokens[i]!.tokenId))],
    });
    group.idx.forEach((i, k) => {
      out[i] = balances[k] ?? 0n;
    });
  }
  return out;
};

export const GET: APIRoute = async ({ cookies }) => {
  const viewer = await viewerFrom(cookies);
  const holdings =
    viewer && /^0x[0-9a-fA-F]{40}$/.test(viewer.address)
      ? await holdingsOf(
          viewer.address as `0x${string}`,
          SEASON_ONE,
          passTokenFrom(runtimeEnv()),
          readChain,
        )
      : NOBODY;
  const states = doorStates(SEASON_ONE, holdings);
  const gated = holdings.hasPass
    ? Object.fromEntries(
        SEASON_ONE.adventures
          .filter((door) => door.requiresPass && GATED_WORLD_URLS[door.id])
          .map((door) => [door.id, GATED_WORLD_URLS[door.id]]),
      )
    : {};
  return Response.json(
    {
      signedIn: viewer !== null,
      hasPass: holdings.hasPass,
      held: [...holdings.held],
      doors: SEASON_ONE.adventures.map((door, i) => ({ id: door.id, state: states[i] })),
      gated,
    },
    { headers: { 'cache-control': 'private, no-store' } },
  );
};
