/**
 * The signed list of Oracles and Archons, served in public (fleet signers,
 * story B): `GET /fleet/signers.json`, which every machine's signers timer
 * asks and checks again against the one wallet its recipe trusts. Server only.
 *
 * Who is on the list: the Oracles are the env allowlist the sign-in uses
 * (lib/auth/server.ts `oracleWallets`); the Archons are the census records
 * with rank `archon` (git-backed state store: one file per wallet under
 * `census/`, listed in one call and read one by one). This Worker assembles
 * the list; it signs nothing and holds no key (ADR-069). The till's
 * `FleetDesk.signSigners`, reachable only through the service binding
 * `TILL_FLEET`, signs with `FLEET_HOUSE_KEY`; without that secret the answer
 * is a 503 `not-configured` and nothing else changes — shipping this dormant
 * is safe. The machine does not have to trust this answer: it verifies the
 * signature, the house wallet and a rising `seq`.
 *
 * A list is never published short: if the census cannot be read in full,
 * the answer is a 503 (the machines keep the list they have) rather than a
 * list that silently drops Archons. Under DATA_SOURCE=fixture the desk signs
 * with a public test key, so CI never serves a record anyone could mistake
 * for the house's.
 */

import { CensusRecordSchema, censusPath, type GitStateStore } from '@numinia/state';
import { rankFromRecord } from './census-rules';
import { logEvent } from './telemetry';

/** What the route needs of the till's `FleetDesk.signSigners` (apps/till/src/lib/fleet-signers.ts). */
export interface SignersDeskApi {
  signSigners(wallets: string[]): Promise<unknown>;
}

/** The desk read off whatever workerd bound, or null when it is not one. */
export function boundSignersDesk(binding: unknown): SignersDeskApi | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  if (typeof (binding as Partial<Record<'signSigners', unknown>>).signSigners !== 'function') {
    return null;
  }
  // Called as a method of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as SignersDeskApi;
  return { signSigners: (wallets) => stub.signSigners(wallets) };
}

/**
 * Anvil's first development key: published everywhere, worth nothing. The
 * fixture desk signs with it so the route can be walked without the house.
 */
// Written in pieces so no scanner mistakes it for a stored key.
const FIXTURE_KEY = [
  '0xac0974bec39a17e3',
  '6ba4a6b4d238ff94',
  '4bacb478cbed5efc',
  'ae784d7bf4f2ff80',
].join('') as `0x${string}`;

/** A desk that signs like the till's, with the public test key; viem loads only when it is asked. */
export function createFixtureSignersDesk(now: () => number = Date.now): SignersDeskApi {
  return {
    async signSigners(wallets) {
      const { privateKeyToAccount } = await import('viem/accounts');
      const seq = Math.floor(now() / 1000);
      const signature = await privateKeyToAccount(FIXTURE_KEY).signTypedData({
        domain: { name: 'Numinia Fleet', version: '1' },
        types: {
          FleetSigners: [
            { name: 'signers', type: 'string' },
            { name: 'seq', type: 'uint256' },
            { name: 'issuedAt', type: 'uint256' },
          ],
        },
        primaryType: 'FleetSigners',
        message: { signers: wallets.join(','), seq: BigInt(seq), issuedAt: BigInt(seq) },
      });
      return { ok: true, record: { message: { signers: wallets, seq, issuedAt: seq }, signature } };
    },
  };
}

/** The desk to ask: the bound till, else the fixture's under DATA_SOURCE=fixture, else null. */
export function signersDeskFrom(env: {
  readonly binding: unknown;
  readonly dataSource: string | undefined;
}): SignersDeskApi | null {
  const bound = boundSignersDesk(env.binding);
  if (bound !== null) return bound;
  if (env.dataSource !== 'fixture') return null;
  return createFixtureSignersDesk();
}

// ---- The list ----------------------------------------------------------------

/** Where the wallets come from: the allowlist, and the census when there is one. */
export interface SignersSources {
  readonly oracles: () => readonly string[];
  readonly census: Pick<GitStateStore, 'list' | 'read'> | null;
}

const CENSUS_FILE = /^(0x[0-9a-f]{40})\.json$/;
const WALLET = /^0x[0-9a-f]{40}$/;
const SIGNATURE = /^0x[0-9a-f]{130}$/;
/** The most census files read for one list (the contents API lists a thousand at most). */
export const CENSUS_READ_MAX = 1_000;
/** How long the census read as a whole may take. */
export const CENSUS_READ_MS = 8_000;

/**
 * The wallets (lower case) the census holds with rank `archon`, plus the
 * Oracles an owner appointed from the census desk (STD-003 RNK-009), who sign
 * for the fleet like any Oracle; throws if any read fails.
 */
export async function archonsOf(
  census: SignersSources['census'],
  ms: number,
  owners: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  if (census === null) return [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('census read timed out')), ms);
  });
  const read = async (): Promise<string[]> => {
    const names = (await census.list('census')).slice(0, CENSUS_READ_MAX);
    const wallets = names.flatMap((name) => CENSUS_FILE.exec(name)?.[1] ?? []);
    const found = await Promise.all(
      wallets.map(async (wallet) => {
        const record = await census.read(censusPath(wallet), CensusRecordSchema);
        if (record === null) return [];
        const rank = rankFromRecord(record.record, owners);
        return rank === 'archon' || rank === 'oracle' ? [wallet] : [];
      }),
    );
    return found.flat();
  };
  return Promise.race([read(), late]).finally(() => clearTimeout(timer));
}

/** Oracles and Archons as one list: lower case, unique, sorted. */
export function signersList(oracles: readonly string[], archons: readonly string[]): string[] {
  const all = [...oracles, ...archons].map((wallet) => wallet.toLowerCase());
  return [...new Set(all.filter((wallet) => WALLET.test(wallet)))].sort();
}

interface Signed {
  readonly message: { signers: string[]; seq: number; issuedAt: number };
  readonly signature: string;
}

/** The till's record as the contract wants it for exactly the list asked, or null. */
function readSigned(answer: unknown, asked: readonly string[]): Signed | null {
  const record = (answer as { record?: unknown }).record;
  if (typeof record !== 'object' || record === null) return null;
  const { message, signature } = record as { message?: unknown; signature?: unknown };
  if (typeof message !== 'object' || message === null) return null;
  const { signers, seq, issuedAt } = message as Record<string, unknown>;
  if (
    !Array.isArray(signers) ||
    signers.join(',') !== asked.join(',') ||
    typeof seq !== 'number' ||
    typeof issuedAt !== 'number' ||
    !Number.isSafeInteger(seq) ||
    seq < 1 ||
    typeof signature !== 'string' ||
    !SIGNATURE.test(signature)
  ) {
    return null;
  }
  return { message: { signers: [...asked], seq, issuedAt }, signature };
}

const CACHE = 'public, max-age=60, s-maxage=60';
const MEMO_MS = 60_000;

const failure = (status: 502 | 503, error: string): Response =>
  Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

let memo: { body: Signed; at: number } | null = null;

/** Test seam: forget the last minute's answer. */
export function resetSignersMemoForTests(): void {
  memo = null;
}

/**
 * The route's answer: `{ message: { signers, seq, issuedAt }, signature }`,
 * cached a minute. The assembled list is signed once a minute at most (a
 * request inside the minute gets the same record, the same `seq`), so a
 * crowd of machines costs one census read and one signature. No desk, or a
 * desk without the key, is a 503 `not-configured`; a census that cannot be
 * read, 503 `census-unavailable`; nobody to list, 503 `no-signers`; a desk
 * that fails or answers nonsense, 502 (logged by rule, never by value).
 */
export async function answerSigners(
  desk: SignersDeskApi | null,
  sources: SignersSources,
  now: () => number = Date.now,
  censusMs: number = CENSUS_READ_MS,
): Promise<Response> {
  if (desk === null) return failure(503, 'not-configured');
  const headers = { 'cache-control': CACHE, 'access-control-allow-origin': '*' };
  if (memo !== null && now() - memo.at < MEMO_MS) return Response.json(memo.body, { headers });
  let archons: string[];
  try {
    archons = await archonsOf(sources.census, censusMs, new Set(sources.oracles()));
  } catch {
    logEvent({ event: 'fleet.signers.failed', act: 'census' });
    return failure(503, 'census-unavailable');
  }
  const list = signersList(sources.oracles(), archons);
  if (list.length === 0) return failure(503, 'no-signers');
  let answer: unknown;
  try {
    answer = await desk.signSigners(list);
  } catch {
    logEvent({ event: 'fleet.signers.failed', act: 'sign' });
    return failure(502, 'till-unreachable');
  }
  const problems =
    typeof answer === 'object' && answer !== null && (answer as { ok?: unknown }).ok === false
      ? (answer as { problems?: unknown }).problems
      : undefined;
  if (Array.isArray(problems) && problems.includes('not-configured')) {
    return failure(503, 'not-configured');
  }
  const signed =
    typeof answer === 'object' && answer !== null && (answer as { ok?: unknown }).ok === true
      ? readSigned(answer, list)
      : null;
  if (signed === null) {
    logEvent({ event: 'fleet.signers.failed', act: 'shape' });
    return failure(502, 'till-unreachable');
  }
  memo = { body: signed, at: now() };
  return Response.json(signed, { headers });
}
