/**
 * The signed FleetRelease record (fleet auto-update, story S4): the pure
 * part. A record is what an Oracle's wallet signed — EIP-712, domain
 * «Numinia Fleet» v1, the type numinia-assets' `walletsig.py` and
 * numinia.com's `lib/fleet.ts` share, proved by the same vectors — and the
 * machines' `release.py` reads: `{ message, signature }`.
 *
 * The rules mirror `release.py::read_override` (engine, `seq` an integer,
 * `image` empty for a pause or the engine's image by digest, a commit when
 * there is an image). The till holds no key and no list of Oracles: the
 * authority is the signature, which every machine checks again against its
 * own signers. Everything here is read as untrusted; a malformed field is a
 * problem in words, never a throw.
 */

import { recoverTypedDataAddress } from 'viem';

export const RELEASE_ENGINE = 'numinia-engine';

/** The engine's image by digest, never a movable tag. */
const RELEASE_IMAGE = /^ghcr\.io\/numengames\/numinia-engine@sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{7,40}$/;
const SIGNATURE = /^0x[0-9a-f]{130}$/;

/** The typed data the wallet signed: field for field, in order. */
const FLEET_DOMAIN = { name: 'Numinia Fleet', version: '1' } as const;
const FLEET_RELEASE_TYPES = {
  FleetRelease: [
    { name: 'engine', type: 'string' },
    { name: 'image', type: 'string' },
    { name: 'commit', type: 'string' },
    { name: 'seq', type: 'uint256' },
    { name: 'issuedAt', type: 'uint256' },
  ],
} as const;

export const RELEASE_PROBLEMS = {
  notHouse: 'only the house publishes a fleet release',
  record:
    'release: { message: { engine, image, commit, seq, issuedAt }, signature } — the engine numinia-engine, a whole seq from 1, an image by digest (empty to pause) with its commit in lower case, and a 0x signature',
  signer: 'the signature is not the publishing wallet’s',
  stale: 'seq must be greater than the latest published',
} as const;

/** What the Oracle signed. */
export interface ReleaseMessage {
  readonly engine: string;
  readonly image: string;
  readonly commit: string;
  readonly seq: number;
  readonly issuedAt: number;
}

/** The record as machines read it from the file and from /fleet/release.json. */
export interface SignedRelease {
  readonly message: ReleaseMessage;
  readonly signature: string;
}

const wholeNumber = (value: unknown, least: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= least;

/** A signed release as a caller sends it, or undefined when it is not one. */
export function readRelease(value: unknown): SignedRelease | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { message, signature } = value as { message?: unknown; signature?: unknown };
  if (typeof message !== 'object' || message === null) return undefined;
  const { engine, image, commit, seq, issuedAt } = message as Record<string, unknown>;
  if (engine !== RELEASE_ENGINE || !wholeNumber(seq, 1) || !wholeNumber(issuedAt, 0)) {
    return undefined;
  }
  if (typeof image !== 'string' || typeof commit !== 'string') return undefined;
  // An empty image is a pause (and carries no commit); otherwise a digest and its commit.
  if (image === '' ? commit !== '' : !RELEASE_IMAGE.test(image) || !COMMIT.test(commit)) {
    return undefined;
  }
  if (typeof signature !== 'string' || !SIGNATURE.test(signature)) return undefined;
  return { message: { engine, image, commit, seq, issuedAt }, signature };
}

/** The wallet (lower case) the signature recovers to; undefined when it recovers to nothing. */
export async function releaseSigner(record: SignedRelease): Promise<string | undefined> {
  try {
    const address = await recoverTypedDataAddress({
      domain: FLEET_DOMAIN,
      types: FLEET_RELEASE_TYPES,
      primaryType: 'FleetRelease',
      message: {
        engine: record.message.engine,
        image: record.message.image,
        commit: record.message.commit,
        seq: BigInt(record.message.seq),
        issuedAt: BigInt(record.message.issuedAt),
      },
      signature: record.signature as `0x${string}`,
    });
    return address.toLowerCase();
  } catch {
    return undefined;
  }
}
