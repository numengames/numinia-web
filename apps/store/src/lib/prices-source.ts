/**
 * The price room's door to the till (MIS-184). Server only — no island
 * imports it, so it may use zod.
 *
 * Trust model. The till (apps/till, Worker `numinia-till`) is reachable
 * from nowhere but this Worker's service binding `TILL_ORACLE` (root
 * wrangler.jsonc), bound to its named RPC entrypoint `OracleDesk`: an RPC
 * entrypoint has no URL, so the desk cannot be reached from the internet
 * even if the till gets a route one day. The API route checks the Oracle's
 * session first — our own signed cookie and the `edit-system-config`
 * permission, which only the Oracle rank holds — and passes the session's
 * wallet, lowercased, as `by`. The till trusts its one bound caller and
 * re-validates every field; it never trusts a browser, and neither does
 * this module: what the browser sends is checked for shape before the till
 * sees it, and what the till answers is checked before the browser sees it.
 * Logs name rules, never values.
 */

import { z } from 'zod';
import deskSeed from '../../fixtures/prices/desk.json';
import { createFixtureDesk, type FixtureSeed } from './prices-fixture';
import type { DeskDraft, DeskSchedule, OracleDesk } from './prices';
import { logEvent } from './telemetry';

/** The desk read off whatever workerd bound: its three methods, or null when it is not a desk. */
export function boundDesk(binding: unknown): OracleDesk | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<keyof OracleDesk, unknown>>;
  if (
    typeof desk.read !== 'function' ||
    typeof desk.check !== 'function' ||
    typeof desk.schedule !== 'function'
  ) {
    return null;
  }
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as OracleDesk;
  return {
    read: () => stub.read(),
    check: (draft) => stub.check(draft),
    schedule: (draft, by) => stub.schedule(draft, by),
  };
}

let fixture: OracleDesk | null = null;

/** The fixture desk, one per server process, so what the room publishes stays until it stops. */
export function fixtureDesk(): OracleDesk {
  fixture ??= createFixtureDesk(deskSeed as unknown as FixtureSeed);
  return fixture;
}

/** Test seam: a fresh fixture desk for the next scenario. */
export function resetFixtureDeskForTests(): void {
  fixture = null;
}

export interface DeskEnv {
  /** What workerd bound as TILL_ORACLE (runtimeBinding). */
  readonly binding: unknown;
  /** DATA_SOURCE, frozen at build: `fixture` in CI, acceptance and screenshots. */
  readonly dataSource: string | undefined;
}

/**
 * The desk to ask: the bound till first, then the fixture desk when the
 * build reads fixtures, else null — the route answers 503 `not-bound`.
 */
export function deskFrom(env: DeskEnv): OracleDesk | null {
  return boundDesk(env.binding) ?? (env.dataSource === 'fixture' ? fixtureDesk() : null);
}

// ---- Shapes (built on first use, never at import) ---------------------------

const SIZE_KEY = /^[a-z0-9][a-z0-9-]{0,31}$/;
const MAX_SIZES = 32;
const MAX_TOPUPS = 32;
/** Bytes a POST may carry: a draft with its basis is a few KB at most. */
export const MAX_BODY_BYTES = 65_536;

function buildSchemas() {
  // The shape only: whole cents, the notice and every other rule are the till's to judge.
  const price = z.object({ runningCentsPerDay: z.number(), stoppedCentsPerDay: z.number() });
  const rules = z.object({
    eventBoostCentsPerDay: z.number(),
    minTopupCents: z.number(),
    quickTopupsCents: z.array(z.number()).max(MAX_TOPUPS),
    minBalanceDaysRunning: z.number(),
    keepDaysAtZero: z.number(),
    noticeDaysForRise: z.number(),
    lowBalanceDaysDefault: z.number(),
  });
  const sizes = z
    .record(
      z.string().regex(SIZE_KEY, 'a size is named in lowercase letters and digits'),
      price.strict(),
    )
    .refine((all) => Object.keys(all).length <= MAX_SIZES, `at most ${MAX_SIZES} sizes`);
  const basis = z
    .object({ note: z.string(), assumptions: z.record(z.string(), z.unknown()).optional() })
    .strict()
    .nullable();
  const draft = z.object({ startsOn: z.string(), sizes, rules: rules.strict(), basis }).strict();
  const request = z.object({ action: z.enum(['check', 'schedule']), draft }).strict();
  // The till's answers: extra fields are dropped, missing or mistyped ones refused.
  const answerBasis = z
    .object({ note: z.string(), assumptions: z.record(z.string(), z.unknown()).optional() })
    .nullable();
  const version = z.object({
    id: z.number(),
    startsOn: z.string(),
    createdAt: z.string(),
    createdBy: z.string(),
    sizes: z.record(z.string(), price),
    rules,
    basis: answerBasis,
  });
  const view = z.object({
    today: z.string(),
    inForceId: z.number().nullable(),
    versions: z.array(version),
    sizesInUse: z.array(z.string()),
  });
  const check = z.object({
    today: z.string(),
    nextId: z.number(),
    replacedId: z.number().nullable(),
    isRise: z.boolean(),
    noticeDays: z.number(),
    earliestStart: z.string(),
    problems: z.array(z.string()),
  });
  const schedule = z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), version }),
    z.object({ ok: z.literal(false), problems: z.array(z.string()) }),
  ]);
  return { request, view, check, schedule };
}

let schemas: ReturnType<typeof buildSchemas> | null = null;
function shapes(): ReturnType<typeof buildSchemas> {
  schemas ??= buildSchemas();
  return schemas;
}

export type PricesRequest =
  | { readonly ok: true; readonly action: 'check' | 'schedule'; readonly draft: DeskDraft }
  | { readonly ok: false; readonly error: string };

/** The browser's POST body, read: an action and a draft shaped like the contract's, or the first issue. */
export function readPricesRequest(json: unknown): PricesRequest {
  const parsed = shapes().request.safeParse(json);
  if (!parsed.success) {
    // The first issue, with where it is when it is somewhere.
    const error = parsed.error.issues
      .slice(0, 1)
      .map((issue) => (issue.path.length === 0 ? '' : `${issue.path.join('.')}: `) + issue.message)
      .join('');
    return { ok: false, error };
  }
  return { ok: true, action: parsed.data.action, draft: parsed.data.draft as DeskDraft };
}

// ---- Answers ---------------------------------------------------------------

type Log = (event: Readonly<Record<string, unknown>>) => void;

const HEADERS = { 'cache-control': 'no-store' } as const;
const answer = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: HEADERS });
const notBound = (): Response => answer({ error: 'not-bound' }, 503);
const tillFailed = (): Response => answer({ error: 'till-failed' }, 502);

/** A desk that threw, or answered out of shape: logged by rule, never by value. */
function failed(log: Log, action: string, rule: string, error?: unknown): Response {
  log({
    level: 'error',
    kind: 'prices-till',
    action,
    rule,
    ...(error === undefined ? {} : { error: error instanceof Error ? error.name : typeof error }),
  });
  return tillFailed();
}

/** GET: the desk as the till sees it, with the session's wallet. */
export async function answerRead(
  desk: OracleDesk | null,
  wallet: string,
  log: Log = logEvent,
): Promise<Response> {
  if (desk === null) return notBound();
  let raw: unknown;
  try {
    raw = await desk.read();
  } catch (error) {
    return failed(log, 'read', 'threw', error);
  }
  const view = shapes().view.safeParse(raw);
  if (!view.success) return failed(log, 'read', 'answer-shape');
  return answer({ wallet, desk: view.data });
}

/** POST: check a draft with the desk, or schedule it as the session's wallet. */
export async function answerWrite(
  desk: OracleDesk | null,
  request: Request,
  wallet: string,
  log: Log = logEvent,
): Promise<Response> {
  const type = (request.headers.get('content-type') ?? '').trim().toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(type)) {
    return answer({ error: 'content-type must be application/json' }, 415);
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return answer({ error: 'body too large' }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return answer({ error: 'body too large' }, 413);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return answer({ error: 'body must be JSON' }, 400);
  }
  const read = readPricesRequest(json);
  if (!read.ok) return answer({ error: read.error }, 400);
  if (desk === null) return notBound();

  if (read.action === 'check') {
    let raw: unknown;
    try {
      raw = await desk.check(read.draft);
    } catch (error) {
      return failed(log, 'check', 'threw', error);
    }
    const check = shapes().check.safeParse(raw);
    if (!check.success) return failed(log, 'check', 'answer-shape');
    return answer({ check: check.data });
  }

  let raw: unknown;
  try {
    raw = await desk.schedule(read.draft, wallet.toLowerCase());
  } catch (error) {
    return failed(log, 'schedule', 'threw', error);
  }
  const schedule = shapes().schedule.safeParse(raw);
  if (!schedule.success) return failed(log, 'schedule', 'answer-shape');
  const result = schedule.data as DeskSchedule;
  log({
    level: 'info',
    kind: 'prices-schedule',
    outcome: result.ok ? 'scheduled' : 'refused',
    problems: result.ok ? 0 : result.problems.length,
  });
  return answer({ schedule: result });
}
