/**
 * The till's Worker (ADR-070 §8): a service apart from the website, with its
 * own database. This build exposes no data — who may read what is MIS-179 —
 * only `GET /health`; its work is the nightly close, fired by the one cron in
 * wrangler.jsonc at 00:30 UTC, the till's reference time, every night.
 */

import meterFixture from '../fixtures/meter.json';
import { runClose, type CloseRun, type TillDatabase } from './db/repository';
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

const worker = {
  fetch: (request: Request): Response => handleFetch(request),
  scheduled: async (controller: ScheduledController, env: Env): Promise<void> => {
    await handleScheduled(controller, env);
  },
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line no-restricted-syntax -- the Workers runtime calls the module's default export
export default worker;
