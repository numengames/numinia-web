/**
 * The ledger (ADR-070 §8, MIS-177): each account's balance is the sum of
 * lines that are only ever added — one per top-up, per world and day, per
 * adjustment, per refund or chargeback. Amounts are integer euro cents as
 * paid, VAT included (a top-up keeps its VAT beside it, for the books). Positive lines are lots, spent oldest first, so the remainder of
 * every top-up is known at any instant — what a refund on request or an
 * expiry would need one day (DBT-026).
 */

import { isCents } from './money';
import { isDay, isInstant } from './utc-day';

export const LINE_KINDS = ['topup', 'world_day', 'adjustment', 'refund', 'chargeback'] as const;

interface LineBase {
  /** Sortable and unique: see `lineId`. */
  readonly id: string;
  readonly accountId: string;
  /** Signed, euro cents as paid (VAT included). */
  readonly amountCents: number;
  /** When the line was written, as an ISO instant (`Date#toISOString`). */
  readonly at: string;
}

/** A top-up: a lot, with its VAT and its Stripe payment and invoice (MIS-180). */
export interface TopupLine extends LineBase {
  readonly kind: 'topup';
  readonly vatCents: number;
  readonly stripePaymentId: string | null;
  readonly stripeInvoiceId: string | null;
}

/** One world's UTC day, priced at the tariff version in force that day. */
export interface WorldDayLine extends LineBase {
  readonly kind: 'world_day';
  readonly worldId: string;
  readonly machine: string;
  readonly day: string;
  readonly minutesRunning: number;
  readonly minutesStopped: number;
  readonly size: string;
  readonly tariffVersionId: number;
}

/** A correction by hand: who and why, and the line it corrects if any. Positive, it is a lot. */
export interface AdjustmentLine extends LineBase {
  readonly kind: 'adjustment';
  readonly by: string;
  readonly reason: string;
  readonly correctsLineId: string | null;
}

/** Money taken back from a lot: by an Oracle's refund or by the bank's chargeback. */
export interface RefundLine extends LineBase {
  readonly kind: 'refund' | 'chargeback';
  readonly lotLineId: string;
  readonly stripeEventId: string | null;
}

export type LedgerLine = TopupLine | WorldDayLine | AdjustmentLine | RefundLine;

/** A lot: a positive line, and how much of it is left. */
interface Lot {
  readonly lineId: string;
  readonly at: string;
  readonly amountCents: number;
  readonly remainderCents: number;
}

/** Every lot's remainder at an instant, oldest first, and the debt no lot covered. */
export interface LotsState {
  readonly lots: readonly Lot[];
  readonly overshootCents: number;
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const MAX_TIME_MS = 2 ** 48 - 1;
const MAX_ORDER = 32 ** 4 - 1;

function nonEmpty(value: string | null): boolean {
  return value !== null && value.trim() !== '';
}

/** Everything wrong with a line, in words; empty when it may be written. */
export function lineProblems(line: LedgerLine): string[] {
  const problems: string[] = [];
  if (!nonEmpty(line.id)) problems.push('id is required');
  if (!nonEmpty(line.accountId)) problems.push('accountId is required');
  if (!isCents(line.amountCents)) problems.push('amountCents must be whole cents');
  if (!isInstant(line.at)) problems.push('at must be an ISO instant');
  switch (line.kind) {
    case 'topup':
      if (!(line.amountCents > 0)) problems.push('a top-up is positive');
      if (!isCents(line.vatCents) || line.vatCents < 0)
        problems.push('vatCents must be whole cents ≥ 0');
      if (line.stripePaymentId !== null && !nonEmpty(line.stripePaymentId)) {
        problems.push('stripePaymentId is null or an id');
      }
      if (line.stripeInvoiceId !== null && !nonEmpty(line.stripeInvoiceId)) {
        problems.push('stripeInvoiceId is null or an id');
      }
      break;
    case 'world_day':
      if (!(line.amountCents <= 0)) problems.push('a world-day is zero or negative');
      if (!nonEmpty(line.worldId) || !nonEmpty(line.machine) || !nonEmpty(line.size)) {
        problems.push('worldId, machine and size are required');
      }
      if (!isDay(line.day)) problems.push('day must be a YYYY-MM-DD day');
      if (
        !isCents(line.minutesRunning) ||
        !isCents(line.minutesStopped) ||
        line.minutesRunning < 0 ||
        line.minutesStopped < 0
      ) {
        problems.push('minutes must be whole and ≥ 0');
      }
      if (!isCents(line.tariffVersionId) || line.tariffVersionId < 1) {
        problems.push('tariffVersionId is required');
      }
      break;
    case 'adjustment':
      if (line.amountCents === 0) problems.push('an adjustment is not zero');
      if (!nonEmpty(line.by) || !nonEmpty(line.reason)) problems.push('by and reason are required');
      break;
    case 'refund':
    case 'chargeback':
      if (!(line.amountCents < 0)) problems.push(`a ${line.kind} is negative`);
      if (!nonEmpty(line.lotLineId)) problems.push('lotLineId is required');
      if (line.stripeEventId !== null && !nonEmpty(line.stripeEventId)) {
        problems.push('stripeEventId is null or an id');
      }
      break;
  }
  return problems;
}

/** A balance is the sum of an account's lines. */
export function balanceCents(lines: readonly LedgerLine[]): number {
  return lines.reduce((sum, line) => sum + line.amountCents, 0);
}

/** True for a line that opens a lot: a top-up, or a positive adjustment (a lot with no Stripe ids). */
export function isLot(line: LedgerLine): boolean {
  return (line.kind === 'topup' || line.kind === 'adjustment') && line.amountCents > 0;
}

/** The ledger's order: by instant, then by id. */
export function compareLines(a: LedgerLine, b: LedgerLine): number {
  const byTime = Date.parse(a.at) - Date.parse(b.at);
  return byTime !== 0 ? byTime : Number(a.id > b.id) - Number(a.id < b.id);
}

/**
 * Draws `cents` from the oldest lots that still hold money; returns what no
 * lot covered, which the caller turns into overshoot.
 */
function drawOldestFirst(lots: readonly { remainderCents: number }[], cents: number): number {
  let need = cents;
  for (const lot of lots) {
    if (need === 0) break;
    const taken = Math.min(need, lot.remainderCents);
    lot.remainderCents -= taken;
    need -= taken;
  }
  return need;
}

/**
 * Every lot's remainder counting only the lines written at or before
 * `instant`, plus the overshoot. Walking the lines in order: a positive line
 * opens a lot, which first pays any outstanding overshoot; a consumption (a
 * world's day, a negative adjustment) draws from the oldest lot with a
 * remainder, and what no lot covers becomes overshoot — a debt; a refund or
 * chargeback on lot L takes what is left of L, and what had already been
 * spent from L is drawn again from the oldest lots that still hold money,
 * so a debt exists only when no lot holds any. Lines of one account only.
 */
export function lotsAt(lines: readonly LedgerLine[], instant: string): LotsState {
  if (!isInstant(instant)) throw new RangeError(`lotsAt: not an ISO instant: ${instant}`);
  const accounts = new Set(lines.map((line) => line.accountId));
  if (accounts.size > 1) throw new Error('lotsAt: lines of more than one account');
  for (const line of lines) {
    const problems = lineProblems(line);
    if (problems.length > 0) throw new Error(`lotsAt: line ${line.id}: ${problems.join('; ')}`);
  }
  const until = Date.parse(instant);
  const walked = lines.filter((line) => Date.parse(line.at) <= until).sort(compareLines);

  const lots: { lineId: string; at: string; amountCents: number; remainderCents: number }[] = [];
  const lotsById = new Map<string, (typeof lots)[number]>();
  let overshootCents = 0;

  for (const line of walked) {
    if (isLot(line)) {
      const paid = Math.min(overshootCents, line.amountCents);
      overshootCents -= paid;
      const lot = {
        lineId: line.id,
        at: line.at,
        amountCents: line.amountCents,
        remainderCents: line.amountCents - paid,
      };
      lots.push(lot);
      lotsById.set(line.id, lot);
    } else if (line.kind === 'refund' || line.kind === 'chargeback') {
      const lot = lotsById.get(line.lotLineId);
      if (lot === undefined) {
        throw new Error(
          `lotsAt: ${line.kind} ${line.id} names ${line.lotLineId}, not an earlier lot`,
        );
      }
      const taken = Math.min(-line.amountCents, lot.remainderCents);
      lot.remainderCents -= taken;
      // What was already spent from this lot was paid by money now returned:
      // it is spent again from the oldest lots that still hold some.
      overshootCents += drawOldestFirst(lots, -line.amountCents - taken);
    } else {
      // A consumption: a world's day or a negative adjustment, oldest lot first.
      overshootCents += drawOldestFirst(lots, -line.amountCents);
    }
  }
  return { lots, overshootCents };
}

function hash32(text: string, seed: number): number {
  // FNV-1a, 32 bits, seeded: a stable fingerprint, not a secret.
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * A sortable unique line id, ULID-shaped (26 Crockford base-32 characters):
 * 10 for the instant in ms, 4 for an order within that instant (a world
 * day's line uses its day number, so one run's lines sort oldest day first),
 * 12 from a fingerprint of `key` — the line's natural key, so two runs that
 * write the same fact at the same instant write the same id.
 */
export function lineId(atMs: number, key: string, order = 0): string {
  if (!Number.isSafeInteger(atMs) || atMs < 0 || atMs > MAX_TIME_MS) {
    throw new RangeError(`lineId: instant out of range: ${atMs}`);
  }
  if (!Number.isSafeInteger(order) || order < 0 || order > MAX_ORDER) {
    throw new RangeError(`lineId: order out of range: ${order}`);
  }
  let id = '';
  let time = atMs;
  for (let i = 0; i < 10; i += 1) {
    id = CROCKFORD.charAt(time % 32) + id;
    time = Math.floor(time / 32);
  }
  let rank = '';
  let rest = order;
  for (let i = 0; i < 4; i += 1) {
    rank = CROCKFORD.charAt(rest % 32) + rank;
    rest = Math.floor(rest / 32);
  }
  const words = [hash32(key, 0x811c9dc5), hash32(key, 0x01234567), hash32(key, 0x89abcdef)];
  let tail = '';
  for (const word of words) {
    for (let shift = 0; shift < 20; shift += 5) tail += CROCKFORD.charAt((word >>> shift) & 31);
  }
  return id + rank + tail;
}
