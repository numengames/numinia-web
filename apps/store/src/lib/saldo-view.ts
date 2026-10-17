/**
 * «Saldo y consumo»'s figures (cut 2026-10-16 «el dinero»): what the screen
 * works out from the statement the till answered — how long the balance
 * lasts, the stacked bars of running and stopped days, the balance after each
 * line, the CSV of the movements, the sizes of the tariff, who tops up.
 * Pure: no fetch, no DOM, no zod, no words (the island passes its own), so the
 * island imports it and it is tested to the per-file bar.
 */

import {
  bucketsOf,
  type DeskAccess,
  type DeskLine,
  type DeskPace,
  type DeskSizePrice,
  type DeskSpend,
  type DeskTariff,
  type DeskWorld,
  type SpendRange,
} from './accounts';

/** What the balance card says under the amount. */
export type Runway =
  /** At the pace of the last 7 complete UTC days, about `days` days (0: less than one). */
  | { readonly kind: 'days'; readonly days: number }
  /** Nothing was spent in those days: the balance does not go down. */
  | { readonly kind: 'still' }
  /** Nothing left: the screen says what it already says of a low balance. */
  | { readonly kind: 'empty' };

/**
 * How many days the balance lasts at the mean daily spend of the 7 complete
 * UTC days before today: `floor(balance ÷ (spent ÷ 7))`, worked in whole
 * cents. Null when the till does not send its pace (one before this cut).
 */
export function runwayOf(balanceCents: number, pace: DeskPace | undefined): Runway | null {
  if (pace === undefined) return null;
  if (balanceCents <= 0) return { kind: 'empty' };
  if (pace.sevenDaysCents <= 0) return { kind: 'still' };
  return { kind: 'days', days: Math.floor((balanceCents * 7) / pace.sevenDaysCents) };
}

/** One bucket of the chart with its two halves. */
export interface SplitSpend {
  readonly bucket: string;
  readonly cents: number;
  readonly runningCents: number;
  readonly stoppedCents: number;
}

/**
 * Every bucket of the range up to `now`, in order, with what its worlds'
 * running and stopped minutes cost; a bucket the till did not name costs
 * nothing, and no half is drawn below zero. Null when any bucket comes
 * without its two halves, or with halves that do not add up to it: the
 * screen then draws the one-colour bars of a till before this cut.
 */
export function splitSeries(
  spend: readonly DeskSpend[],
  range: SpendRange,
  now: Date,
): SplitSpend[] | null {
  const counted = new Map<string, SplitSpend>();
  for (const entry of spend) {
    const { runningCents, stoppedCents } = entry;
    if (runningCents === undefined || stoppedCents === undefined) return null;
    if (runningCents + stoppedCents !== entry.cents) return null;
    const before = counted.get(entry.bucket);
    counted.set(entry.bucket, {
      bucket: entry.bucket,
      cents: (before?.cents ?? 0) + Math.max(0, entry.cents),
      runningCents: (before?.runningCents ?? 0) + Math.max(0, runningCents),
      stoppedCents: (before?.stoppedCents ?? 0) + Math.max(0, stoppedCents),
    });
  }
  return bucketsOf(range, now).map(
    (bucket) => counted.get(bucket) ?? { bucket, cents: 0, runningCents: 0, stoppedCents: 0 },
  );
}

/** One stacked bar in the chart's own units: running at the base, stopped above it. */
export interface StackedBar extends SplitSpend {
  readonly x: number;
  readonly width: number;
  readonly runningY: number;
  readonly runningHeight: number;
  readonly stoppedY: number;
  readonly stoppedHeight: number;
}

/**
 * The bars of a split series in a `width` × `height` box: one slot per
 * bucket, a fifth of it as a gap, the costliest bucket full height, a bucket
 * that cost something at least one unit tall; inside each, running at the
 * base and stopped on top, in proportion to what each cost.
 */
export function stackedBars(
  series: readonly SplitSpend[],
  width: number,
  height: number,
): StackedBar[] {
  const max = series.reduce((top, entry) => Math.max(top, entry.cents), 0);
  const slot = series.length === 0 ? 0 : width / series.length;
  return series.map((entry, i) => {
    const tall = max === 0 ? 0 : Math.max(entry.cents > 0 ? 1 : 0, (entry.cents / max) * height);
    const runningHeight = entry.cents === 0 ? 0 : (tall * entry.runningCents) / entry.cents;
    const runningY = height - runningHeight;
    const stoppedHeight = tall - runningHeight;
    return {
      ...entry,
      x: i * slot + slot * 0.1,
      width: slot * 0.8,
      runningY,
      runningHeight,
      stoppedY: runningY - stoppedHeight,
      stoppedHeight,
    };
  });
}

/**
 * The balance right after each line, newest first: today's balance after
 * the newest, and each older one the next one's minus what the next line
 * moved. Exact for the lines the till sends (its newest 100).
 */
export function runningBalances(lines: readonly DeskLine[], balanceCents: number): number[] {
  const after: number[] = [];
  let balance = balanceCents;
  for (const line of lines) {
    after.push(balance);
    balance -= line.amountCents;
  }
  return after;
}

/** The UTC day a line is listed under: a world's own day, or the day any other line was written. */
export function lineDay(line: DeskLine): string {
  return line.kind === 'world_day' && typeof line.day === 'string'
    ? line.day
    : line.at.slice(0, 10);
}

/** Euros as a spreadsheet reads them in any language: a dot decimal, two places, a minus when negative. */
export function euroText(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const whole = Math.abs(cents);
  return `${sign}${Math.floor(whole / 100)}.${String(whole % 100).padStart(2, '0')}`;
}

/** The header of the CSV, in the visitor's language. */
export interface CsvHeader {
  readonly day: string;
  readonly what: string;
  readonly detail: string;
  readonly amount: string;
  readonly balance: string;
}

/** One movement as the CSV writes it. */
export interface CsvRow {
  readonly day: string;
  readonly what: string;
  readonly detail: string;
  readonly amountCents: number;
  readonly balanceCents: number;
}

/** A text cell: quoted when it holds a comma, a quote or a line break; a would-be formula kept as text. */
function cell(text: string): string {
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) || safe !== text ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * The movements as a CSV a spreadsheet opens in any language: a byte-order
 * mark (so accents survive), the header in the visitor's language, one row
 * per line with its UTC day, euros with a dot decimal, CRLF line ends.
 */
export function csvText(header: CsvHeader, rows: readonly CsvRow[]): string {
  const lines = [
    [header.day, header.what, header.detail, header.amount, header.balance].map(cell).join(','),
    ...rows.map((row) =>
      [
        row.day,
        cell(row.what),
        cell(row.detail),
        euroText(row.amountCents),
        euroText(row.balanceCents),
      ].join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** The file's name: the UTC day it was made. */
export function csvFileName(now: Date): string {
  return `numinia-saldo-${now.toISOString().slice(0, 10)}.csv`;
}

/** Minutes as whole hours and the minutes left over. */
export function hoursAndMinutes(minutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/** What the worlds of the period cost in all. */
export function worldsTotal(worlds: readonly DeskWorld[]): number {
  return worlds.reduce((sum, world) => sum + world.cents, 0);
}

/** One world's bar in the per-world chart's own units (0..width, 0..height). */
export interface WorldBar {
  readonly worldId: string;
  readonly cents: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The bars of the per-world chart in a `width` × `height` box: the worlds of
 * the period, costliest first, one slot each, a fifth of it as a gap, the
 * costliest world full height and a world that cost something at least one
 * unit tall so it never vanishes. Real figures only — the same `DeskWorld[]`
 * the numeric table beside it reads, never invented.
 */
export function worldBars(worlds: readonly DeskWorld[], width: number, height: number): WorldBar[] {
  const sorted = [...worlds].sort((a, b) => b.cents - a.cents);
  const max = sorted.reduce((top, world) => Math.max(top, world.cents), 0);
  const slot = sorted.length === 0 ? 0 : width / sorted.length;
  return sorted.map((world, i) => {
    const tall = max === 0 ? 0 : Math.max(world.cents > 0 ? 1 : 0, (world.cents / max) * height);
    return {
      worldId: world.worldId,
      cents: world.cents,
      x: i * slot + slot * 0.1,
      y: height - tall,
      width: slot * 0.8,
      height: tall,
    };
  });
}

/** A size of the tariff with its two prices. */
export interface PricedSize extends DeskSizePrice {
  readonly size: string;
}

/** The tariff's sizes, the cheapest day running first, then by name. */
export function sizesOf(tariff: DeskTariff): PricedSize[] {
  return Object.entries(tariff.sizes)
    .map(([size, price]) => ({ size, ...price }))
    .sort(
      (a, b) => a.runningCentsPerDay - b.runningCentsPerDay || a.size.localeCompare(b.size, 'en'),
    );
}

/** The roles that hold the top-up, as the till names them; null when it did not say. */
export function topupRoles(access: DeskAccess | null): readonly string[] | null {
  return access === null ? null : (access.holders['top-up'] ?? []);
}
