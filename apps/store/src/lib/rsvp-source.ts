/**
 * «Me apunto» for real (cut «Tu agenda», 2026-10-17): the store's side of
 * the till's RSVPs. Until now the button only downloaded an `.ics` file and
 * nobody remembered who was coming; now the till does (migration 0012,
 * `ritual_rsvps`), through four RPCs of the account desk — `rsvp`,
 * `unrsvp`, `myRsvps`, `rsvpCounts` — read here off whatever workerd bound
 * as TILL_ACCOUNTS, or answered by an in-memory desk when the build reads
 * fixtures (`DATA_SOURCE=fixture`: deterministic, empty at start, kept per
 * server process so a toggle stays until the server stops).
 *
 * The routes fail closed like their siblings (lib/worlds-homes.ts): 401
 * without a session, 503 without a till (or one older than the RPCs), 502
 * when it fails, 404 for an encounter the register lacks. The till trusts
 * the store for WHO (the session's wallet) and decides itself WHAT.
 *
 * Since cut O (2026-10-18) an encounter published from the city (cut M, a
 * `rit_` id in the till's own table) takes «Me apunto» too: the store never
 * keeps a static set of those ids — it lets a well-formed `rit_` id through
 * and trusts the till, which answers «no such encounter» (→ 404) for one it
 * does not have or has cancelled. The fixture desk asks the fixture
 * accounts desk the same question, so a fixture build behaves alike.
 */

import { z } from 'zod';
import type { Asker } from './accounts';
import { fixtureAccounts } from './accounts-source';
import { isTillRitualId } from './rituals-till';
import { logEvent } from './telemetry';
import { answer, ask, bodyOf, notBound, type Log } from './worlds-homes';

/** The four RPCs of the desk this cut uses, as the Worker declares them. */
export interface RsvpDesk {
  rsvp(wallet: string, ritualId: string): Promise<unknown>;
  unrsvp(wallet: string, ritualId: string): Promise<unknown>;
  myRsvps(wallet: string): Promise<unknown>;
  rsvpCounts(ritualIds: readonly string[]): Promise<unknown>;
}

const RSVP_METHODS = ['rsvp', 'unrsvp', 'myRsvps', 'rsvpCounts'] as const;

/** The desk read off whatever workerd bound: its four RPCs, or null when it is not one (a till older than this cut). */
export function boundRsvps(binding: unknown): RsvpDesk | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<(typeof RSVP_METHODS)[number], unknown>>;
  if (!RSVP_METHODS.every((method) => typeof desk[method] === 'function')) return null;
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as RsvpDesk;
  return {
    rsvp: (wallet, ritualId) => stub.rsvp(wallet, ritualId),
    unrsvp: (wallet, ritualId) => stub.unrsvp(wallet, ritualId),
    myRsvps: (wallet) => stub.myRsvps(wallet),
    rsvpCounts: (ritualIds) => stub.rsvpCounts(ritualIds),
  };
}

/** The words the till uses to refuse a `rit_` id it has no live encounter for (apps/till/src/lib/rsvps.ts). */
export const NO_SUCH_RITUAL = 'no such encounter in the till, or it is cancelled';

/** Whether a `rit_` id names an encounter one can still go to; a fixture build asks its fixture accounts desk. */
export type TillRitualCheck = (ritualId: string) => Promise<boolean>;

/** The fixture accounts desk's answer: the row is there and not cancelled. */
export const fixtureTillRitualCheck: TillRitualCheck = async (ritualId) => {
  const asked = await fixtureAccounts().ritual(ritualId);
  return asked.ok && asked.ritual !== null && asked.ritual.cancelledAt === null;
};

/**
 * The in-memory desk of a fixture build: who said «voy» to what, per wallet,
 * nothing else — and, like the till, a refusal for a `rit_` id that names no
 * live encounter (`isOpen`, the fixture accounts desk by default).
 */
export function createRsvpFixtureDesk(isOpen: TillRitualCheck = fixtureTillRitualCheck): RsvpDesk {
  const going = new Map<string, Set<string>>();
  const mine = (wallet: string): { ok: true; ritualIds: string[] } => ({
    ok: true,
    ritualIds: [...(going.get(wallet) ?? [])],
  });
  return {
    rsvp: async (wallet, ritualId) => {
      if (isTillRitualId(ritualId) && !(await isOpen(ritualId))) {
        return { ok: false, problems: [NO_SUCH_RITUAL] };
      }
      const set = going.get(wallet) ?? new Set<string>();
      set.add(ritualId);
      going.set(wallet, set);
      return mine(wallet);
    },
    unrsvp: async (wallet, ritualId) => {
      going.get(wallet)?.delete(ritualId);
      return mine(wallet);
    },
    myRsvps: async (wallet) => mine(wallet),
    rsvpCounts: async (ritualIds) => ({
      ok: true,
      counts: Object.fromEntries(
        ritualIds.map((id) => [id, [...going.values()].filter((set) => set.has(id)).length]),
      ),
    }),
  };
}

let fixture: RsvpDesk | null = null;

/** The fixture desk, one per server process, so a toggle stays until it stops. */
export function fixtureRsvps(): RsvpDesk {
  fixture ??= createRsvpFixtureDesk();
  return fixture;
}

/** Test seam: a fresh fixture desk for the next scenario. */
export function resetFixtureRsvpsForTests(): void {
  fixture = null;
}

export interface RsvpEnv {
  /** What workerd bound as TILL_ACCOUNTS (runtimeBinding). */
  readonly binding: unknown;
  /** DATA_SOURCE, frozen at build: `fixture` in CI, acceptance and screenshots. */
  readonly dataSource: string | undefined;
}

/** The desk to ask: the bound till first, then the fixture desk when the build reads fixtures, else null (503). */
export function rsvpsFrom(env: RsvpEnv): RsvpDesk | null {
  return boundRsvps(env.binding) ?? (env.dataSource === 'fixture' ? fixtureRsvps() : null);
}

// ---- What the browser sends -----------------------------------------------

/** The most encounters one GET asks the count of (the till's own bound). */
export const RSVP_IDS_MAX = 100;

const RITUAL_ID = /^[a-z0-9-]{1,100}$/;

/** A file slug the register knows, or a well-formed id of the till's own table (the till vouches for those). */
export function isRsvpRitualId(id: string, known: ReadonlySet<string>): boolean {
  return (RITUAL_ID.test(id) && known.has(id)) || isTillRitualId(id);
}

/** `?ids=a,b,c`: the ritual ids to count, each a slug the register knows or a till id; null when any is not. */
export function readRsvpIds(
  value: string | null,
  known: ReadonlySet<string>,
): readonly string[] | null {
  if (value === null || value === '') return [];
  const ids = [...new Set(value.split(','))];
  if (ids.length > RSVP_IDS_MAX) return null;
  return ids.every((id) => isRsvpRitualId(id, known)) ? ids : null;
}

export interface RsvpChange {
  readonly ritualId: string;
  readonly on: boolean;
}

/** `{ ritualId, on }` as POSTed, or null when it is out of shape (the register check comes after). */
export function readRsvpBody(json: unknown): RsvpChange | null {
  if (typeof json !== 'object' || json === null) return null;
  const { ritualId, on } = json as Record<string, unknown>;
  if (
    typeof ritualId !== 'string' ||
    !(RITUAL_ID.test(ritualId) || isTillRitualId(ritualId)) ||
    typeof on !== 'boolean'
  ) {
    return null;
  }
  return { ritualId, on };
}

// ---- The answers ----------------------------------------------------------

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const SHAPES = {
  mine: z.union([z.object({ ok: z.literal(true), ritualIds: z.array(z.string()) }), refusal]),
  counts: z.union([
    z.object({ ok: z.literal(true), counts: z.record(z.string(), z.number().int().nonnegative()) }),
    refusal,
  ]),
} as const;

const signedOut = (): Response => answer({ error: 'signed-out' }, 401);
const unknownRitual = (): Response => answer({ error: 'unknown-ritual' }, 404);
const refused = (problems: readonly string[]): Response =>
  answer({ error: 'refused', problems }, 400);

/** The answer both routes give: the wallet's own ids, and the count of each id asked. */
interface RsvpView {
  readonly mine: readonly string[];
  readonly counts: Readonly<Record<string, number>>;
}

async function viewOf(
  desk: RsvpDesk,
  wallet: string,
  ids: readonly string[],
  log: Log,
  mineCall: () => Promise<unknown>,
): Promise<Response> {
  const mine = await ask(log, 'myRsvps', mineCall, SHAPES.mine);
  if (!mine.ok) return mine.response;
  if ('problems' in mine.value) {
    // The till has no live encounter under that `rit_` id: for the page it is as if the register lacked it.
    return mine.value.problems.includes(NO_SUCH_RITUAL)
      ? unknownRitual()
      : refused(mine.value.problems);
  }
  const counted = await ask(log, 'rsvpCounts', () => desk.rsvpCounts(ids), SHAPES.counts);
  if (!counted.ok) return counted.response;
  if ('problems' in counted.value) return refused(counted.value.problems);
  const view: RsvpView = { mine: mine.value.ritualIds, counts: counted.value.counts };
  return answer(view);
}

/**
 * GET /api/rsvp?ids=a,b: the encounters the session's wallet is going to
 * (`mine`) and how many are going to each id asked (`counts`). 401 without
 * a session, 400 for an id the register lacks, 503 without a till, 502 when
 * it fails.
 */
export async function answerRsvps(
  desk: RsvpDesk | null,
  asker: Asker | null,
  url: URL,
  known: ReadonlySet<string>,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (desk === null) return notBound();
  const ids = readRsvpIds(url.searchParams.get('ids'), known);
  if (ids === null)
    return answer({ error: 'ids must name encounters of the register or the till' }, 400);
  const wallet = asker.wallet.toLowerCase();
  return viewOf(desk, wallet, ids, log, () => desk.myRsvps(wallet));
}

/**
 * POST /api/rsvp, JSON `{ ritualId, on }`: the session's wallet says it is
 * going (`on: true`) or no longer going. Answers the same view as GET, with
 * the count of that very encounter. 401 without a session, 404 for an
 * encounter neither the register nor the till has, 400 for a body out of
 * shape, 503 without a till, 502 when it fails.
 */
export async function answerRsvpChange(
  desk: RsvpDesk | null,
  asker: Asker | null,
  request: Request,
  known: ReadonlySet<string>,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (desk === null) return notBound();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const change = readRsvpBody(body.json);
  if (change === null) return answer({ error: 'body must be { ritualId, on }' }, 400);
  if (!isRsvpRitualId(change.ritualId, known)) return unknownRitual();
  const wallet = asker.wallet.toLowerCase();
  return viewOf(desk, wallet, [change.ritualId], log, () =>
    change.on ? desk.rsvp(wallet, change.ritualId) : desk.unrsvp(wallet, change.ritualId),
  );
}
