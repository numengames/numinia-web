/**
 * «Seguir» for real (cut «Seguir», 2026-10-17): the store's side of the
 * till's follows. Until now the button on a community's page wrote the id
 * into this browser's `numinia-follows` and nobody else knew; now the till
 * does (migration 0014, `community_follows`), through four RPCs of the
 * account desk — `follow`, `unfollow`, `myFollows`, `followCounts` — read
 * here off whatever workerd bound as TILL_ACCOUNTS, or answered by an
 * in-memory desk when the build reads fixtures (`DATA_SOURCE=fixture`:
 * deterministic, empty at start, kept per server process so a toggle stays
 * until the server stops). The same shape as lib/rsvp-source.ts.
 *
 * The routes fail closed like their siblings: 401 without a session, 503
 * without a till (or one older than the RPCs), 502 when it fails, 404 for a
 * community the register lacks, 400 for a body or a query out of shape. The
 * till trusts the store for WHO (the session's wallet) and decides itself
 * WHAT.
 */

import { z } from 'zod';
import type { Asker } from './accounts';
import { logEvent } from './telemetry';
import { answer, ask, bodyOf, notBound, type Log } from './worlds-homes';

/** The four RPCs of the desk this cut uses, as the Worker declares them. */
export interface FollowDesk {
  follow(wallet: string, communityId: string): Promise<unknown>;
  unfollow(wallet: string, communityId: string): Promise<unknown>;
  myFollows(wallet: string): Promise<unknown>;
  followCounts(communityIds: readonly string[]): Promise<unknown>;
}

const FOLLOW_METHODS = ['follow', 'unfollow', 'myFollows', 'followCounts'] as const;

/** The desk read off whatever workerd bound: its four RPCs, or null when it is not one (a till older than this cut). */
export function boundFollows(binding: unknown): FollowDesk | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<(typeof FOLLOW_METHODS)[number], unknown>>;
  if (!FOLLOW_METHODS.every((method) => typeof desk[method] === 'function')) return null;
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as FollowDesk;
  return {
    follow: (wallet, communityId) => stub.follow(wallet, communityId),
    unfollow: (wallet, communityId) => stub.unfollow(wallet, communityId),
    myFollows: (wallet) => stub.myFollows(wallet),
    followCounts: (communityIds) => stub.followCounts(communityIds),
  };
}

/** The in-memory desk of a fixture build: who follows what, per wallet, nothing else. */
export function createFollowFixtureDesk(): FollowDesk {
  const following = new Map<string, Set<string>>();
  const mine = (wallet: string): { ok: true; communityIds: string[] } => ({
    ok: true,
    communityIds: [...(following.get(wallet) ?? [])],
  });
  return {
    follow: async (wallet, communityId) => {
      const set = following.get(wallet) ?? new Set<string>();
      set.add(communityId);
      following.set(wallet, set);
      return mine(wallet);
    },
    unfollow: async (wallet, communityId) => {
      following.get(wallet)?.delete(communityId);
      return mine(wallet);
    },
    myFollows: async (wallet) => mine(wallet),
    followCounts: async (communityIds) => ({
      ok: true,
      counts: Object.fromEntries(
        communityIds.map((id) => [id, [...following.values()].filter((set) => set.has(id)).length]),
      ),
    }),
  };
}

let fixture: FollowDesk | null = null;

/** The fixture desk, one per server process, so a toggle stays until it stops. */
export function fixtureFollows(): FollowDesk {
  fixture ??= createFollowFixtureDesk();
  return fixture;
}

/** Test seam: a fresh fixture desk for the next scenario. */
export function resetFixtureFollowsForTests(): void {
  fixture = null;
}

export interface FollowEnv {
  /** What workerd bound as TILL_ACCOUNTS (runtimeBinding). */
  readonly binding: unknown;
  /** DATA_SOURCE, frozen at build: `fixture` in CI, acceptance and screenshots. */
  readonly dataSource: string | undefined;
}

/** The desk to ask: the bound till first, then the fixture desk when the build reads fixtures, else null (503). */
export function followsFrom(env: FollowEnv): FollowDesk | null {
  return boundFollows(env.binding) ?? (env.dataSource === 'fixture' ? fixtureFollows() : null);
}

// ---- What the browser sends -----------------------------------------------

/** The most communities one GET asks the count of (the till's own bound). */
export const FOLLOW_IDS_MAX = 100;

/** A community id as the register writes it (the till checks the same shape). */
const COMMUNITY_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** `?ids=a,b,c`: the community ids to count, each one the register knows; null when any is not. */
export function readFollowIds(
  value: string | null,
  known: ReadonlySet<string>,
): readonly string[] | null {
  if (value === null || value === '') return [];
  const ids = [...new Set(value.split(','))];
  if (ids.length > FOLLOW_IDS_MAX) return null;
  return ids.every((id) => COMMUNITY_ID.test(id) && known.has(id)) ? ids : null;
}

export interface FollowChange {
  readonly communityId: string;
  readonly on: boolean;
}

/** `{ communityId, on }` as POSTed, or null when it is out of shape (the register check comes after). */
export function readFollowBody(json: unknown): FollowChange | null {
  if (typeof json !== 'object' || json === null) return null;
  const { communityId, on } = json as Record<string, unknown>;
  if (
    typeof communityId !== 'string' ||
    !COMMUNITY_ID.test(communityId) ||
    typeof on !== 'boolean'
  ) {
    return null;
  }
  return { communityId, on };
}

// ---- The answers ----------------------------------------------------------

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const SHAPES = {
  mine: z.union([z.object({ ok: z.literal(true), communityIds: z.array(z.string()) }), refusal]),
  counts: z.union([
    z.object({ ok: z.literal(true), counts: z.record(z.string(), z.number().int().nonnegative()) }),
    refusal,
  ]),
} as const;

const signedOut = (): Response => answer({ error: 'signed-out' }, 401);
const unknownCommunity = (): Response => answer({ error: 'unknown-community' }, 404);
const refused = (problems: readonly string[]): Response =>
  answer({ error: 'refused', problems }, 400);

/** The answer both routes give: the wallet's own ids, and the count of each id asked. */
export interface FollowView {
  readonly mine: readonly string[];
  readonly counts: Readonly<Record<string, number>>;
}

async function viewOf(
  desk: FollowDesk,
  ids: readonly string[],
  log: Log,
  mineCall: () => Promise<unknown>,
): Promise<Response> {
  const mine = await ask(log, 'myFollows', mineCall, SHAPES.mine);
  if (!mine.ok) return mine.response;
  if ('problems' in mine.value) return refused(mine.value.problems);
  const counted = await ask(log, 'followCounts', () => desk.followCounts(ids), SHAPES.counts);
  if (!counted.ok) return counted.response;
  if ('problems' in counted.value) return refused(counted.value.problems);
  const view: FollowView = { mine: mine.value.communityIds, counts: counted.value.counts };
  return answer(view);
}

/**
 * GET /api/follow?ids=a,b: the communities the session's wallet follows
 * (`mine`) and how many follow each id asked (`counts`). 401 without a
 * session, 400 for an id the register lacks, 503 without a till, 502 when
 * it fails.
 */
export async function answerFollows(
  desk: FollowDesk | null,
  asker: Asker | null,
  url: URL,
  known: ReadonlySet<string>,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (desk === null) return notBound();
  const ids = readFollowIds(url.searchParams.get('ids'), known);
  if (ids === null) return answer({ error: 'ids must name communities of the register' }, 400);
  const wallet = asker.wallet.toLowerCase();
  return viewOf(desk, ids, log, () => desk.myFollows(wallet));
}

/**
 * POST /api/follow, JSON `{ communityId, on }`: the session's wallet follows
 * (`on: true`) or no longer follows. Answers the same view as GET, with the
 * count of that very community. 401 without a session, 404 for a community
 * the register lacks, 400 for a body out of shape, 503 without a till, 502
 * when it fails.
 */
export async function answerFollowChange(
  desk: FollowDesk | null,
  asker: Asker | null,
  request: Request,
  known: ReadonlySet<string>,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (desk === null) return notBound();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const change = readFollowBody(body.json);
  if (change === null) return answer({ error: 'body must be { communityId, on }' }, 400);
  if (!known.has(change.communityId)) return unknownCommunity();
  const wallet = asker.wallet.toLowerCase();
  return viewOf(desk, [change.communityId], log, () =>
    change.on ? desk.follow(wallet, change.communityId) : desk.unfollow(wallet, change.communityId),
  );
}
