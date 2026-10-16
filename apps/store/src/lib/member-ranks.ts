/**
 * «Rango» in the panel's Miembros (GET /api/saldo/ranks?cuenta=<id>): each
 * member's rank in the city — theirs, it travels with the person; no
 * organization gives it — for the members of ONE organization, to its
 * members and the house only.
 *
 * The wallets come from the till's answer about that organization (its
 * `members`, asked as the session — the till refuses a stranger), never from
 * the request. Each rank is worked out as the sign-in does (lib/auth/server.ts
 * `resolveRank`): an Oracle is the allowlist's word, with no I/O; anyone else
 * is what the census remembers — a census never makes an Oracle — and a
 * Nomad when it remembers nothing or there is no census here. The census is
 * git-backed, so every read is a network call: they go in parallel, a
 * hundred at most, three seconds each, and a read that fails or takes longer
 * is a rank nobody can say (null), never a guess.
 *
 * Server only (zod lives in @numinia/state): pages/api/saldo/ranks.ts hands
 * it the desk, the session's asker and the two sources.
 */

import type { Rank } from '@numinia/domain';
import { CensusRecordSchema, censusPath, type GitStateStore } from '@numinia/state';
import type { AccountDesk, Asker } from './accounts';
import { logEvent } from './telemetry';

/** The most members whose ranks one answer reads. */
export const RANKED_MAX = 100;
/** How long one census read may take before its rank is left unsaid. */
export const RANK_READ_MS = 3_000;

/** What a rank is read from: the allowlist (no I/O) and the census, absent where it is not configured. */
export interface RankSources {
  readonly isOracle: (wallet: string) => boolean;
  readonly census: ((wallet: string) => Promise<Rank | null>) | null;
  /** The time one census read may take (RANK_READ_MS unless a test says otherwise). */
  readonly readMs?: number;
}

type Log = (event: Readonly<Record<string, unknown>>) => void;

/** A wallet as the till keeps it: lower case 0x and forty hex. */
const WALLET = /^0x[0-9a-f]{40}$/;
/** As the sibling routes measure an account id (lib/accounts-source.ts). */
const ID_MAX = 100;

/** The census as the state store keeps it: one file per wallet. */
export function censusOf(
  store: Pick<GitStateStore, 'read'>,
): (wallet: string) => Promise<Rank | null> {
  return async (wallet) => {
    const found = await store.read(censusPath(wallet), CensusRecordSchema);
    return found?.record.rank ?? null;
  };
}

/** The census's answer, or a failure once `ms` have gone by. */
function within<T>(read: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('census read timed out')), ms);
  });
  return Promise.race([read, late]).finally(() => clearTimeout(timer));
}

/** One wallet's rank in the city; null when the census could not say it. */
export async function rankOf(wallet: string, sources: RankSources): Promise<Rank | null> {
  if (sources.isOracle(wallet)) return 'oracle';
  if (sources.census === null) return 'nomad';
  try {
    const recorded = await within(sources.census(wallet), sources.readMs ?? RANK_READ_MS);
    return recorded === null || recorded === 'oracle' ? 'nomad' : recorded;
  } catch {
    return null;
  }
}

/** The ranks of many wallets, each read once, in lower case, all at the same time, a hundred at most. */
export async function ranksOf(
  wallets: readonly string[],
  sources: RankSources,
): Promise<Record<string, Rank | null>> {
  const unique = [...new Set(wallets.map((wallet) => wallet.toLowerCase()))].slice(0, RANKED_MAX);
  const ranks = await Promise.all(
    unique.map((wallet) => (WALLET.test(wallet) ? rankOf(wallet, sources) : null)),
  );
  return Object.fromEntries(unique.map((wallet, index) => [wallet, ranks[index] ?? null]));
}

/** The till's `members` answer: who is in, or its refusal; null when it is out of shape. */
function readMembers(
  value: unknown,
): { readonly wallets: string[] } | { readonly problems: string[] } | null {
  if (typeof value !== 'object' || value === null) return null;
  const answer = value as Readonly<Record<string, unknown>>;
  if (answer['ok'] === false) {
    const { problems } = answer;
    return Array.isArray(problems) && problems.every((problem) => typeof problem === 'string')
      ? { problems: problems as string[] }
      : null;
  }
  if (answer['ok'] !== true) return null;
  const members = answer['members'] ?? [];
  if (!Array.isArray(members)) return null;
  const wallets: string[] = [];
  for (const member of members) {
    const wallet: unknown =
      typeof member === 'object' && member !== null
        ? (member as Readonly<Record<string, unknown>>)['wallet']
        : undefined;
    if (typeof wallet !== 'string') return null;
    wallets.push(wallet);
  }
  return { wallets };
}

const NO_STORE = { 'cache-control': 'no-store' } as const;
const reply = (body: unknown, status: number, headers: Record<string, string> = NO_STORE) =>
  Response.json(body, { status, headers });

/** A till that threw or answered out of shape: logged by rule, never by value. */
function failed(log: Log, rule: string, error?: unknown): Response {
  log({
    level: 'error',
    kind: 'saldo-till',
    action: 'ranks',
    rule,
    ...(error === undefined ? {} : { error: error instanceof Error ? error.name : typeof error }),
  });
  return reply({ error: 'till-failed' }, 502);
}

/**
 * GET /api/saldo/ranks?cuenta=: the city rank of every member of one
 * organization, to its members and the house. The same answers as its
 * siblings: 401 without a session, 400 without an account, 503 without a
 * till, 403 with the till's words to a stranger, 404 for an account that is
 * not an organization, 502 when the till fails. Ranks change seldom: the
 * browser may keep the answer five minutes, for itself only.
 */
export async function answerRanks(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  sources: RankSources,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return reply({ error: 'signed-out' }, 401);
  const account = url.searchParams.get('cuenta') ?? '';
  if (account.length === 0 || account.length > ID_MAX) {
    return reply({ error: 'cuenta: an account id is required' }, 400);
  }
  if (desk === null) return reply({ error: 'not-bound' }, 503);
  let raw: unknown;
  try {
    // The house's flag is the session's (lib/auth/session-wallet.ts), never the request's.
    raw = await desk.members(asker.wallet.toLowerCase(), account, asker.house);
  } catch (error) {
    return failed(log, 'threw', error);
  }
  const answer = readMembers(raw);
  if (answer === null) return failed(log, 'answer-shape');
  if ('problems' in answer) {
    return answer.problems.includes('not an organization')
      ? reply({ error: 'no-team' }, 404)
      : reply({ error: 'refused', problems: answer.problems }, 403);
  }
  const ranks = await ranksOf(answer.wallets, sources);
  const unread = Object.values(ranks).filter((rank) => rank === null).length;
  if (unread > 0)
    log({ level: 'warn', kind: 'member-ranks', rule: 'census-unread', count: unread });
  return reply({ ok: true, ranks }, 200, { 'cache-control': 'private, max-age=300' });
}
