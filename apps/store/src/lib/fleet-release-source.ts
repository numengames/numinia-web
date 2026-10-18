/**
 * The signed FleetRelease record, served in public (fleet auto-update, story
 * S4): `GET /fleet/release.json`, which every machine's release timer asks
 * and checks again. Server only.
 *
 * Trust model, as the DNS desk's (lib/dns-source.ts): the till's `FleetDesk`
 * is reachable from nowhere but this Worker's service binding `TILL_FLEET`
 * (root wrangler.jsonc), an RPC entrypoint with no URL. This Worker holds no
 * key and writes nothing here: it passes along what the till stored, which
 * an Oracle's wallet signed. The machine does not have to trust this answer —
 * it verifies the signature against its own signers and keeps the highest
 * `seq` it has seen — so a lying or broken answer changes nothing there.
 *
 * Under DATA_SOURCE=fixture the desk is empty (no release), so CI never
 * serves a made-up record.
 */

import { logEvent } from './telemetry';

/** What the route needs of the till's `FleetDesk.latest` (apps/till/src/db/fleet-release.ts). */
export interface FleetReleaseDeskApi {
  latest(): Promise<unknown>;
}

/** The desk read off whatever workerd bound, or null when it is not one. */
export function boundReleaseDesk(binding: unknown): FleetReleaseDeskApi | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  if (typeof (binding as Partial<Record<'latest', unknown>>).latest !== 'function') return null;
  // Called as a method of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as FleetReleaseDeskApi;
  return { latest: () => stub.latest() };
}

/** The desk to ask: the bound till, else an empty one under DATA_SOURCE=fixture, else null. */
export function releaseDeskFrom(env: {
  readonly binding: unknown;
  readonly dataSource: string | undefined;
}): FleetReleaseDeskApi | null {
  const bound = boundReleaseDesk(env.binding);
  if (bound !== null) return bound;
  if (env.dataSource !== 'fixture') return null;
  return { latest: async () => ({ ok: true, release: null, publishedAt: null }) };
}

const ENGINE = 'numinia-engine';
const SIGNATURE = /^0x[0-9a-f]{130}$/;

/** The record as the till gives it, or null when it is not one (the till checked it on the way in). */
function readStored(
  answer: unknown,
): { message: Record<string, unknown>; signature: string } | null {
  if (typeof answer !== 'object' || answer === null) return null;
  const { message, signature } = answer as { message?: unknown; signature?: unknown };
  if (typeof message !== 'object' || message === null) return null;
  const { engine, seq } = message as Record<string, unknown>;
  if (engine !== ENGINE || typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1) {
    return null;
  }
  if (typeof signature !== 'string' || !SIGNATURE.test(signature)) return null;
  return { message: message as Record<string, unknown>, signature };
}

const CACHE = 'public, max-age=60, s-maxage=60';

const failure = (status: 404 | 502 | 503, error: string): Response =>
  Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

/**
 * The route's answer: the stored record exactly as the machines read it —
 * `{ message, signature }` — cached a minute, tagged with its `seq` (a 304
 * to a machine that already has it). Nothing published yet is a 404; no
 * desk, 503; a desk that fails or answers nonsense, 502 (logged by rule,
 * never by value).
 */
export async function answerRelease(
  desk: FleetReleaseDeskApi | null,
  ifNoneMatch: string | null,
): Promise<Response> {
  if (desk === null) return failure(503, 'not-bound');
  let answer: unknown;
  try {
    answer = await desk.latest();
  } catch {
    logEvent({ event: 'fleet.release.failed', act: 'latest' });
    return failure(502, 'till-unreachable');
  }
  const stored =
    typeof answer === 'object' && answer !== null && (answer as { ok?: unknown }).ok === true
      ? (answer as { release?: unknown }).release
      : undefined;
  if (stored === null) return failure(404, 'no-release');
  const record = readStored(stored);
  if (record === null) {
    logEvent({ event: 'fleet.release.failed', act: 'shape' });
    return failure(502, 'till-unreachable');
  }
  const etag = `"${String(record.message['seq'])}"`;
  const headers = {
    'cache-control': CACHE,
    etag,
    'access-control-allow-origin': '*',
  };
  if (ifNoneMatch === etag) return new Response(null, { status: 304, headers });
  return Response.json({ message: record.message, signature: record.signature }, { headers });
}
