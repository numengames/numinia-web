/**
 * The signed FleetSigners record (fleet signers, story B): the pure part.
 * The house publishes the Oracles' and Archons' wallets as one list its own
 * wallet signs — EIP-712, domain «Numinia Fleet» v1, the contract numinia-assets'
 * `signers.py` reads — and every machine follows it, trusting only the one
 * fixed `HOUSE_SIGNER` of its recipe.
 *
 * This is the only place that holds the house key (secret `FLEET_HOUSE_KEY`
 * on this Worker; numinia.com holds none, ADR-069). The list comes from
 * numinia.com and is read as untrusted: it is normalized (lower case,
 * unique, sorted) and bounded before anything is signed.
 */

import { privateKeyToAccount } from 'viem/accounts';

/** The same domain as FleetRelease's. */
const FLEET_DOMAIN = { name: 'Numinia Fleet', version: '1' } as const;
const FLEET_SIGNERS_TYPES = {
  FleetSigners: [
    { name: 'signers', type: 'string' },
    { name: 'seq', type: 'uint256' },
    { name: 'issuedAt', type: 'uint256' },
  ],
} as const;

/** The most wallets one list carries (the machines refuse more). */
export const SIGNERS_MAX = 200;
const WALLET = /^0x[0-9a-fA-F]{40}$/;
const KEY = /^0x[0-9a-fA-F]{64}$/;

export const SIGNERS_PROBLEMS = {
  notConfigured: 'not-configured',
  list: 'signers: 1 to 200 wallets, each 0x and forty hex digits',
} as const;

/** What the house signed. */
export interface SignersMessage {
  readonly signers: readonly string[];
  readonly seq: number;
  readonly issuedAt: number;
}

/** The record as machines read it from /fleet/signers.json. */
export interface SignedSigners {
  readonly message: SignersMessage;
  readonly signature: string;
}

/** The wallets as the contract wants them (lower case, unique, sorted), or undefined when the list is not one. */
export function readSigners(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > SIGNERS_MAX) return undefined;
  const wallets = new Set<string>();
  for (const wallet of value as unknown[]) {
    if (typeof wallet !== 'string' || !WALLET.test(wallet)) return undefined;
    wallets.add(wallet.toLowerCase());
  }
  return [...wallets].sort();
}

/**
 * Signs the list with the house key. `seq` is `issuedAt`, the second of
 * signing, so a later list always outranks an earlier one. A missing or
 * malformed key is `not-configured`: the desk is dormant, never a throw.
 */
export async function signSigners(
  key: string | undefined,
  value: unknown,
  nowSeconds: number,
): Promise<
  | { readonly ok: true; readonly record: SignedSigners }
  | { readonly ok: false; readonly problems: string[] }
> {
  if (key === undefined || !KEY.test(key)) {
    return { ok: false, problems: [SIGNERS_PROBLEMS.notConfigured] };
  }
  const signers = readSigners(value);
  if (signers === undefined) return { ok: false, problems: [SIGNERS_PROBLEMS.list] };
  const account = privateKeyToAccount(key as `0x${string}`);
  const seq = Math.floor(nowSeconds);
  const signature = await account.signTypedData({
    domain: FLEET_DOMAIN,
    types: FLEET_SIGNERS_TYPES,
    primaryType: 'FleetSigners',
    message: { signers: signers.join(','), seq: BigInt(seq), issuedAt: BigInt(seq) },
  });
  return { ok: true, record: { message: { signers, seq, issuedAt: seq }, signature } };
}
