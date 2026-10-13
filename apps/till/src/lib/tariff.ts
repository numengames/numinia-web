/**
 * The tariff as data with a date (ADR-070 §3, MIS-177): each version has
 * per-size prices per day running and stopped, and the rules; it starts on
 * a UTC date, and every charged line keeps the version it was charged
 * with, so history never changes. The figures are examples (DBT-026).
 */

import { divideHalfUp, isCents } from './money';
import { MINUTES_PER_DAY, addDays, isDay, isInstant } from './utc-day';

/** Prices are per day; the till charges per minute of a day, every day 1440 minutes (UTC). */
export const MINUTES_PER_PRICED_DAY = MINUTES_PER_DAY;

/** What one day of a size costs, net of VAT, running or stopped. */
export interface SizePrice {
  readonly runningCentsPerDay: number;
  readonly stoppedCentsPerDay: number;
}

/** Prices by the size a world reserves (`2g`, …), never by what it used. */
export type TariffSizes = Readonly<Record<string, SizePrice>>;

export interface TariffRules {
  /** Price of an event boost day (a one-day size change). */
  readonly eventBoostCentsPerDay: number;
  /** Smallest top-up accepted. */
  readonly minTopupCents: number;
  /** The quick top-up buttons, ascending, none below the minimum. */
  readonly quickTopupsCents: readonly number[];
  /** Balance needed to create a world, in days of running it. */
  readonly minBalanceDaysRunning: number;
  /** Days a world stopped for balance is kept for free before its deletion date. */
  readonly keepDaysAtZero: number;
  /** Days between scheduling a rise and its start. */
  readonly noticeDaysForRise: number;
  /** The low-balance warning's default, in days left. */
  readonly lowBalanceDaysDefault: number;
}

export interface TariffVersion {
  /** Increasing: among versions starting the same day, the greatest id wins. */
  readonly id: number;
  /** The UTC date the version starts. */
  readonly startsOn: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly sizes: TariffSizes;
  readonly rules: TariffRules;
}

const RULE_KEYS: readonly string[] = [
  'eventBoostCentsPerDay',
  'minTopupCents',
  'quickTopupsCents',
  'minBalanceDaysRunning',
  'keepDaysAtZero',
  'noticeDaysForRise',
  'lowBalanceDaysDefault',
];

const SIZE_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;

/**
 * The seed version: the design's EXAMPLE figures (DBT-026), the same row the
 * first migration inserts. A 2 GB world: 0.60 € a day running, 0.05 € stopped.
 */
export const SEED_TARIFF: TariffVersion = {
  id: 1,
  startsOn: '2026-10-13',
  createdAt: '2026-10-13T00:00:00.000Z',
  createdBy: 'seed: example figures (DBT-026)',
  sizes: { '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 } },
  rules: {
    eventBoostCentsPerDay: 180,
    minTopupCents: 1000,
    quickTopupsCents: [1000, 2000, 5000, 10000],
    minBalanceDaysRunning: 2,
    keepDaysAtZero: 90,
    noticeDaysForRise: 30,
    lowBalanceDaysDefault: 3,
  },
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isWholeAtLeast(value: unknown, minimum: number): value is number {
  return isCents(value) && value >= minimum;
}

/** Reads `sizes` (parsed JSON), pushing what is wrong into `problems`. */
function readSizes(json: unknown, problems: string[]): TariffSizes {
  const sizes: Record<string, SizePrice> = {};
  if (!isRecord(json)) {
    problems.push('sizes must be an object');
    return sizes;
  }
  if (Object.keys(json).length === 0) problems.push('sizes must price at least one size');
  for (const [name, price] of Object.entries(json)) {
    if (!SIZE_NAME.test(name)) problems.push(`${JSON.stringify(name)} is not a size name`);
    const running = isRecord(price) ? price['runningCentsPerDay'] : undefined;
    const stopped = isRecord(price) ? price['stoppedCentsPerDay'] : undefined;
    if (
      !isRecord(price) ||
      Object.keys(price).length !== 2 ||
      !isWholeAtLeast(running, 0) ||
      !isWholeAtLeast(stopped, 0)
    ) {
      problems.push(
        `size ${name}: needs runningCentsPerDay and stoppedCentsPerDay, whole cents ≥ 0`,
      );
      continue;
    }
    sizes[name] = { runningCentsPerDay: running, stoppedCentsPerDay: stopped };
  }
  return sizes;
}

/** One whole-number rule, at least `minimum`; a problem otherwise. */
function wholeRule(
  json: Readonly<Record<string, unknown>>,
  key: string,
  minimum: number,
  problems: string[],
): number {
  const value = json[key];
  if (isWholeAtLeast(value, minimum)) return value;
  problems.push(`${key} must be a whole number ≥ ${minimum}`);
  return minimum;
}

/** Reads `rules` (parsed JSON), pushing what is wrong into `problems`. */
function readRules(json: unknown, problems: string[]): TariffRules | undefined {
  if (!isRecord(json)) {
    problems.push('rules must be an object');
    return undefined;
  }
  const unknownKeys = Object.keys(json).filter((key) => !RULE_KEYS.includes(key));
  if (unknownKeys.length > 0) problems.push(`unknown rules: ${unknownKeys.join(', ')}`);
  const minTopupCents = wholeRule(json, 'minTopupCents', 0, problems);
  const quick = json['quickTopupsCents'];
  const quickTopupsCents = isList(quick) ? quick.filter(isCents) : [];
  if (
    !isList(quick) ||
    quick.length === 0 ||
    quickTopupsCents.length !== quick.length ||
    !quickTopupsCents.every(
      (amount, i, all) => amount >= minTopupCents && (i === 0 || amount > Number(all[i - 1])),
    )
  ) {
    problems.push('quickTopupsCents must be ascending whole cents, none below minTopupCents');
  }
  return {
    eventBoostCentsPerDay: wholeRule(json, 'eventBoostCentsPerDay', 0, problems),
    minTopupCents,
    quickTopupsCents,
    minBalanceDaysRunning: wholeRule(json, 'minBalanceDaysRunning', 0, problems),
    // A world is kept at least one day; every other rule may be zero.
    keepDaysAtZero: wholeRule(json, 'keepDaysAtZero', 1, problems),
    noticeDaysForRise: wholeRule(json, 'noticeDaysForRise', 0, problems),
    lowBalanceDaysDefault: wholeRule(json, 'lowBalanceDaysDefault', 0, problems),
  };
}

/** Everything wrong with a version, in words; empty when it is well formed. */
export function tariffProblems(version: TariffVersion): string[] {
  const problems: string[] = [];
  if (!isWholeAtLeast(version.id, 1)) problems.push('id must be a whole number ≥ 1');
  if (!isDay(version.startsOn)) problems.push('startsOn must be a YYYY-MM-DD day');
  if (!isInstant(version.createdAt)) problems.push('createdAt must be an ISO instant');
  if (version.createdBy.trim() === '') problems.push('createdBy is required');
  readSizes(version.sizes, problems);
  readRules(version.rules, problems);
  return problems;
}

/** Reads a version's `sizes` column (parsed JSON) into prices, or throws with what is wrong. */
export function parseSizes(json: unknown): TariffSizes {
  const problems: string[] = [];
  const sizes = readSizes(json, problems);
  if (problems.length > 0) throw new TypeError(`tariff sizes: ${problems.join('; ')}`);
  return sizes;
}

/** Reads a version's `rules` column (parsed JSON) into rules, or throws with what is wrong. */
export function parseRules(json: unknown): TariffRules {
  const problems: string[] = [];
  const rules = readRules(json, problems);
  if (rules === undefined || problems.length > 0) {
    throw new TypeError(`tariff rules: ${problems.join('; ')}`);
  }
  return rules;
}

/**
 * The version in force on `day`: the greatest `startsOn` ≤ day, ties broken
 * by the greatest id — so a future version is superseded by scheduling
 * another with the same start. Undefined when none has started yet.
 */
export function versionFor(
  versions: readonly TariffVersion[],
  day: string,
): TariffVersion | undefined {
  let best: TariffVersion | undefined;
  for (const version of versions) {
    if (version.startsOn > day) continue;
    if (
      best === undefined ||
      version.startsOn > best.startsOn ||
      (version.startsOn === best.startsOn && version.id > best.id)
    ) {
      best = version;
    }
  }
  return best;
}

/**
 * True when any price in `next` is above the same price in `current`: a
 * size's running or stopped day, or the event boost. A size `current` does
 * not price is a new product, not a rise; rules that are not prices (the
 * minimum top-up, the notice…) are not either.
 */
export function isRise(
  next: Pick<TariffVersion, 'sizes' | 'rules'>,
  current: Pick<TariffVersion, 'sizes' | 'rules'>,
): boolean {
  if (next.rules.eventBoostCentsPerDay > current.rules.eventBoostCentsPerDay) return true;
  return Object.entries(next.sizes).some(([size, price]) => {
    const before = current.sizes[size];
    return (
      before !== undefined &&
      (price.runningCentsPerDay > before.runningCentsPerDay ||
        price.stoppedCentsPerDay > before.stoppedCentsPerDay)
    );
  });
}

/** The first day a rise scheduled on `scheduledOn` may start: the scheduling date plus the notice. */
export function earliestStart(scheduledOn: string, noticeDays: number): string {
  return addDays(scheduledOn, noticeDays);
}

/**
 * Why `next` may not be scheduled on `scheduledOn`; empty when it may. Any
 * version starts the next day at the earliest (a cut applies from the next
 * day); a rise — against the version it replaces — starts no earlier than
 * the notice allows, the strictest of the notice in force when it is
 * scheduled and the one of the version it replaces. Ids only grow.
 */
export function scheduleProblems(
  versions: readonly TariffVersion[],
  next: TariffVersion,
  scheduledOn: string,
): string[] {
  const problems = tariffProblems(next);
  if (problems.length > 0) return problems;
  if (versions.some((version) => version.id >= next.id)) {
    problems.push(`id ${next.id} must be greater than every scheduled version's id`);
  }
  if (next.startsOn <= scheduledOn) {
    problems.push(
      `a version scheduled on ${scheduledOn} starts on ${addDays(scheduledOn, 1)} at the earliest`,
    );
  }
  const replaced = versionFor(versions, next.startsOn);
  if (replaced !== undefined && isRise(next, replaced)) {
    const inForce = versionFor(versions, scheduledOn) ?? replaced;
    const notice = Math.max(inForce.rules.noticeDaysForRise, replaced.rules.noticeDaysForRise);
    const earliest = earliestStart(scheduledOn, notice);
    if (next.startsOn < earliest) {
      problems.push(
        `a rise needs ${notice} days' notice: it starts on ${earliest} at the earliest`,
      );
    }
  }
  return problems;
}

/**
 * What a world's day costs at a price: per minute, a day's price / 1440, so
 * `round_half_up((running × runningPerDay + stopped × stoppedPerDay) / 1440)`
 * in integers. 23 hours running at 60 c/day cost 58 c (57.5 → 58); 11 hours
 * cost 28 c (27.5 → 28).
 */
export function worldDayCostCents(
  price: SizePrice,
  minutesRunning: number,
  minutesStopped: number,
): number {
  return divideHalfUp(
    minutesRunning * price.runningCentsPerDay + minutesStopped * price.stoppedCentsPerDay,
    MINUTES_PER_PRICED_DAY,
  );
}
