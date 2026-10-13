/**
 * The till's Worker (ADR-070 §8): a service apart from the website, with its
 * own database. Its work is the nightly close, fired by the one cron in
 * wrangler.jsonc at 00:30 UTC, the till's reference time, every night; the
 * default export answers only `GET /health`, and only in local runs, since
 * nothing routes to the deployed Worker.
 *
 * Its one door is the Oracle desk (MIS-184): `OracleDesk`, a named RPC
 * entrypoint. Only a Worker that declares a service binding to it can call
 * it — numinia.com's, as `TILL_ORACLE` (service `numinia-till`, entrypoint
 * `OracleDesk`) — and an RPC entrypoint answers no HTTP request at all, so
 * even a later route (a Stripe webhook) leaves the desk unreachable from the
 * internet. The trust model: numinia.com's API route checks the Oracle's
 * session (its own signed cookie, permission `edit-system-config`, which
 * only the Oracle rank holds) and passes the session's wallet as `by`; the
 * till trusts its one bound caller to have done so, and re-validates every
 * field it is sent. The till never trusts a browser.
 */

import { WorkerEntrypoint } from 'cloudflare:workers';
import meterFixture from '../fixtures/meter.json';
import { checkDraft, readDesk, scheduleDraft, type DeskSchedule, type DeskView } from './db/desk';
import { runClose, type CloseRun, type TillDatabase } from './db/repository';
import type { DeskCheck } from './lib/tariff';
import { FakeMeter, NoMeter, parseMeterReadings, type Meter } from './meter';

export interface Env {
  readonly TILL_DB: TillDatabase;
  /** Which meter the close reads: `none` (the default: every day pending) or `fake` (the fixture). */
  readonly TILL_METER?: string;
}

const HEALTH = JSON.stringify({ service: 'till', ok: true });

/** `GET /health` answers; everything else is not found. */
export function handleFetch(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (request.method === 'GET' && pathname === '/health') {
    return new Response(HEALTH, {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response('Not found', { status: 404 });
}

/** The meter `TILL_METER` names; an unknown name fails the run rather than guessing. */
export function meterFor(name: string | undefined): Meter {
  if (name === undefined || name === 'none') return new NoMeter();
  if (name === 'fake') return new FakeMeter(parseMeterReadings(meterFixture));
  throw new Error(`TILL_METER must be "none" or "fake", not ${JSON.stringify(name)}`);
}

/** The nightly close for the UTC date of the event's scheduled time. */
export async function handleScheduled(
  controller: Pick<ScheduledController, 'scheduledTime'>,
  env: Env,
): Promise<CloseRun> {
  return runClose(env.TILL_DB, meterFor(env.TILL_METER), new Date(controller.scheduledTime));
}

/**
 * The Oracle desk: read the tariff, check a draft of the next version, and
 * schedule it with who and why — each on the till's own clock (UTC). Its
 * arguments come from another Worker and are never trusted: a malformed
 * draft or author is answered with problems in words, never a throw; only a
 * failing database throws. Methods, not arrow properties: RPC exposes only
 * what the class's prototype declares.
 */
export class OracleDesk extends WorkerEntrypoint<Env> {
  /** Every version, the one in force today, and the sizes still charged to worlds. */
  async read(): Promise<DeskView> {
    return readDesk(this.env.TILL_DB, new Date());
  }

  /** What scheduling `draft` now would replace and refuse; writes nothing. */
  async check(draft: unknown): Promise<DeskCheck> {
    return checkDraft(this.env.TILL_DB, draft, new Date());
  }

  /** Schedules `draft` as the next version, published now by the wallet `by`, or says why not. */
  async schedule(draft: unknown, by: unknown): Promise<DeskSchedule> {
    return scheduleDraft(this.env.TILL_DB, draft, by, new Date());
  }
}

const worker = {
  fetch: (request: Request): Response => handleFetch(request),
  scheduled: async (controller: ScheduledController, env: Env): Promise<void> => {
    await handleScheduled(controller, env);
  },
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line no-restricted-syntax -- the Workers runtime calls the module's default export
export default worker;
