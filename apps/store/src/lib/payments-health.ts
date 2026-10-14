/**
 * The Prices room's watch on the till's poll of Stripe (MIS-180). Server
 * only. Stripe keeps events 30 days; the till reads them every minute. If
 * the poll falls more than two days behind, a refund or a payment could be
 * lost, so the Oracle is told in the room — not only in Workers Logs.
 *
 * Trust model as lib/prices-source.ts: the till's Oracle desk is reached
 * only through the service binding TILL_ORACLE (no address); the API route
 * checks the Oracle's session first. What the till answers is checked for
 * shape before the browser sees it; logs name rules, never values.
 */

import { logEvent } from './telemetry';

export interface PaymentsHealth {
  /** Where the poll has read Stripe up to (an ISO instant); null before its first run. */
  readonly readThrough: string | null;
  /** More than two days behind now. */
  readonly lagging: boolean;
}

type Log = (event: Readonly<Record<string, unknown>>) => void;

/** The desk's `payments()` off whatever workerd bound, or null when it has none. */
export function boundPayments(binding: unknown): (() => Promise<unknown>) | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as { payments?: unknown };
  if (typeof desk.payments !== 'function') return null;
  // Called as a method of the stub (never detached): an RPC stub needs its receiver.
  return () => (desk as { payments: () => Promise<unknown> }).payments();
}

function isInstant(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** The till's answer, or null when it is not shaped as one. */
export function readPaymentsHealth(value: unknown): PaymentsHealth | null {
  if (typeof value !== 'object' || value === null) return null;
  const { readThrough, lagging } = value as Record<string, unknown>;
  if (typeof lagging !== 'boolean') return null;
  if (readThrough !== null && !isInstant(readThrough)) return null;
  return { readThrough, lagging };
}

const HEADERS = { 'cache-control': 'no-store' } as const;

/**
 * GET /api/admin/payments for an Oracle: the till's answer; under
 * DATA_SOURCE=fixture without a till, a poll that never ran and is not
 * behind; no till otherwise → 503 `not-bound`; a till that fails or answers
 * out of shape → 502 `till-failed`.
 */
export async function answerPaymentsHealth(
  binding: unknown,
  dataSource: string | undefined,
  log: Log = logEvent,
): Promise<Response> {
  const payments = boundPayments(binding);
  if (payments === null) {
    return dataSource === 'fixture'
      ? Response.json({ readThrough: null, lagging: false }, { headers: HEADERS })
      : Response.json({ error: 'not-bound' }, { status: 503, headers: HEADERS });
  }
  let raw: unknown;
  try {
    raw = await payments();
  } catch (error) {
    log({
      level: 'error',
      kind: 'payments-health',
      rule: 'threw',
      error: error instanceof Error ? error.name : typeof error,
    });
    return Response.json({ error: 'till-failed' }, { status: 502, headers: HEADERS });
  }
  const health = readPaymentsHealth(raw);
  if (health === null) {
    log({ level: 'error', kind: 'payments-health', rule: 'answer-shape' });
    return Response.json({ error: 'till-failed' }, { status: 502, headers: HEADERS });
  }
  return Response.json(health, { headers: HEADERS });
}
