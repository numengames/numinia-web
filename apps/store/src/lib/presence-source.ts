/**
 * «Presencia»'s door (MIS-266): POST /api/presencia is the heartbeat — a
 * page in view with a session says «still here» once a minute, and whether
 * the person touched anything. Server only.
 *
 * Trust model, as ./accounts-source.ts: the wallet is the session's, read
 * from our signed cookie and lowercased; the body can name nobody (it is
 * `{ active: boolean }` and nothing else). Only members count (STD-053
 * PRS-004): a person with an organization of their own (a team account the
 * till lists for the wallet) — the house entering an organization as the
 * house is not in it. The answer is the state the others read for that
 * person (PRS-002/003: invisible, or not yet answered, reads offline) and
 * nothing more: no «last seen» (PRS-005). Logs name rules, never wallets.
 *
 * The plaza is the bound `PLAZA` service when there is one, else the
 * in-memory fixture when the build reads fixtures; none → 503 `not-bound`.
 */

import type { AccountDesk, Asker } from './accounts';
import { answer, notBound, signedOut, type Log } from './accounts-source';
import { createPlaza, type Choice, type Plaza, type Seen } from './presence-plaza';
import { logEvent } from './telemetry';

/** The plaza as a caller sees it: every call may cross a service binding. */
export interface PlazaClient {
  beat(person: string, active: boolean): Promise<void> | void;
  choose(person: string, choice: Choice): Promise<void> | void;
  states(people: readonly string[]): Promise<Record<string, Seen>> | Record<string, Seen>;
}

/** The plaza read off whatever workerd bound, or null when it is not one. */
export function boundPlaza(binding: unknown): PlazaClient | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const stub = binding as Partial<Record<keyof PlazaClient, unknown>>;
  if (
    typeof stub.beat !== 'function' ||
    typeof stub.choose !== 'function' ||
    typeof stub.states !== 'function'
  ) {
    return null;
  }
  const plaza = binding as PlazaClient;
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  return {
    beat: (person, active) => plaza.beat(person, active),
    choose: (person, choice) => plaza.choose(person, choice),
    states: (people) => plaza.states(people),
  };
}

let fixture: Plaza | null = null;

/** Test seam: a fresh fixture plaza for the next scenario. */
export function resetFixturePlazaForTests(): void {
  fixture = null;
}

export interface PlazaEnv {
  /** What workerd bound as PLAZA (runtimeBinding). */
  readonly binding: unknown;
  /** DATA_SOURCE, frozen at build. */
  readonly dataSource: string | undefined;
}

/** The plaza to ask: the bound one, else the fixture's when the build reads fixtures, else null. */
export function plazaFrom(env: PlazaEnv): PlazaClient | null {
  const bound = boundPlaza(env.binding);
  if (bound !== null) return bound;
  if (env.dataSource !== 'fixture') return null;
  fixture ??= createPlaza(Date.now);
  return fixture;
}

/** A beat is this small: `{"active":true}`. */
const MAX_BEAT_BYTES = 128;

/** The body, read: exactly `{ active: boolean }`, or null. */
async function readBeat(request: Request): Promise<boolean | null> {
  const text = await request.text();
  if (text.length > MAX_BEAT_BYTES) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const keys = Object.keys(json);
  const active = (json as Record<string, unknown>)['active'];
  return keys.length === 1 && typeof active === 'boolean' ? active : null;
}

function note(log: Log, rule: string): void {
  log({ level: 'error', kind: 'presence', rule });
}

/** Whether the till lists a team of its own for the wallet: `true`, `false`, or `null` when it cannot say. */
async function isMember(desk: AccountDesk, wallet: string, log: Log): Promise<boolean | null> {
  let raw: unknown;
  try {
    raw = await desk.overview(wallet);
  } catch {
    note(log, 'threw');
    return null;
  }
  if (typeof raw !== 'object' || raw === null) {
    note(log, 'answer-shape');
    return null;
  }
  const body = raw as { accounts?: unknown; problems?: unknown };
  if (Array.isArray(body.problems)) return false;
  if (!Array.isArray(body.accounts)) {
    note(log, 'answer-shape');
    return null;
  }
  return (body.accounts as unknown[]).some((entry) => {
    const account = entry as { kind?: unknown; as?: unknown } | null;
    return account !== null && account.kind === 'team' && account.as !== 'house';
  });
}

/** POST /api/presencia: one heartbeat. */
export async function answerBeat(
  plaza: PlazaClient | null,
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (plaza === null || desk === null) return notBound();
  const active = await readBeat(request);
  if (active === null) return answer({ error: 'bad-beat' }, 400);
  const you = asker.wallet.toLowerCase();
  const member = await isMember(desk, you, log);
  if (member === null) return answer({ error: 'till-failed' }, 502);
  if (!member) return answer({ error: 'not-member' }, 403);
  await plaza.beat(you, active);
  return answer({ state: (await plaza.states([you]))[you] });
}
