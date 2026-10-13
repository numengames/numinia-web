/**
 * The tariff as data with a date (ADR-070 §3, MIS-177): each version has
 * per-size prices per day running and stopped, and the rules; it starts on
 * a UTC date, and every charged line keeps the version it was charged
 * with, so history never changes. The figures are examples (DBT-026).
 *
 * The Oracle desk (MIS-184) reads and checks drafts of the next version
 * here, as pure functions: `readDraft` turns whatever a caller sent into a
 * typed draft or the problems with it, never a throw; `draftCheck` says what
 * the draft would replace, whether it is a rise, the first day it may start
 * and exactly what scheduling it would refuse. The desk's shapes are the
 * contract numinia.com copies: `TariffVersion` is its `DeskVersion`,
 * `SizePrice` its `DeskSizePrice`, `TariffRules` its `DeskRules`,
 * `TariffBasis` its `DeskBasis`.
 */

import { divideHalfUp, isCents } from './money';
import { MINUTES_PER_DAY, addDays, isDay, isInstant, startOfDay } from './utc-day';

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

/**
 * Why a version was published (MIS-184): the Oracle's note and, optionally,
 * the price calculator's assumptions at that moment. The till stores it as
 * it is given and never interprets `assumptions`: nothing is charged from it.
 */
export interface TariffBasis {
  readonly note: string;
  /** Plain JSON data, kept as given. */
  readonly assumptions?: Readonly<Record<string, unknown>>;
}

export interface TariffVersion {
  /** Increasing: among versions starting the same day, the greatest id wins. */
  readonly id: number;
  /** The UTC date the version starts. */
  readonly startsOn: string;
  readonly createdAt: string;
  /** Who scheduled it: a lowercase 0x wallet from the Oracle desk, or the seed's text. */
  readonly createdBy: string;
  readonly sizes: TariffSizes;
  readonly rules: TariffRules;
  /** Why it was published; null for the seed and for a version published without one. */
  readonly basis: TariffBasis | null;
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
  basis: null,
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

/** A basis's note: 500 UTF-16 code units at most, as JavaScript's `length` and HTML's `maxlength` count. */
const BASIS_NOTE_MAX_LENGTH = 500;
/**
 * A whole basis: 16 KB of JSON at most, counted in bytes of UTF-8 — never
 * fewer than the characters the column's CHECK counts, so the desk refuses
 * before the database would.
 */
const BASIS_MAX_BYTES = 16_384;
/** How deep a basis may nest: more than any calculator needs, far below SQLite's JSON limit (1000). */
const BASIS_MAX_DEPTH = 32;

const BASIS_PROBLEM =
  'basis must be a note of at most 500 characters and an object of assumptions, 16 KB in all';

/** An object made by `{}` or by JSON, or with no prototype: no array, Date, Map or class instance. */
function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** What an array or a plain object holds; undefined for what JSON would not give back as it was. */
function childrenOf(value: unknown): readonly unknown[] | undefined {
  if (Array.isArray(value)) {
    // A hole, or a key that is not an index, would not come back from JSON as it went.
    return value.length <= BASIS_MAX_BYTES && Object.keys(value).length === value.length
      ? value
      : undefined;
  }
  return isPlainObject(value) ? Object.values(value) : undefined;
}

/**
 * True when `root` is plain JSON data — plain objects, arrays without holes,
 * strings, finite numbers, booleans and null, which JSON.stringify writes and
 * JSON.parse gives back as they were — nesting at most BASIS_MAX_DEPTH levels
 * and holding at most BASIS_MAX_BYTES values (each takes a byte of JSON at
 * least), so a cycle or a huge value ends the walk early and nothing throws.
 */
function isJsonData(root: unknown): boolean {
  const stack: [unknown, number][] = [[root, 0]];
  let seen = 1;
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const [value, depth] = next;
    if (depth > BASIS_MAX_DEPTH) return false;
    if (value === null || typeof value === 'string' || typeof value === 'boolean') continue;
    if (typeof value === 'number') {
      if (Number.isFinite(value)) continue;
      return false;
    }
    const children = childrenOf(value);
    if (children === undefined) return false;
    seen += children.length;
    if (seen > BASIS_MAX_BYTES) return false;
    for (const child of children) stack.push([child, depth + 1]);
  }
  return true;
}

/** True for null, or a note with assumptions within the desk's bounds (see `basisProblems`). */
function isBasis(value: unknown): value is TariffBasis | null {
  if (value === null) return true;
  if (!isPlainObject(value)) return false;
  const { note, assumptions } = value;
  return (
    Object.keys(value).every((key) => key === 'note' || key === 'assumptions') &&
    typeof note === 'string' &&
    note.length <= BASIS_NOTE_MAX_LENGTH &&
    (assumptions === undefined || isPlainObject(assumptions)) &&
    isJsonData(value) &&
    new TextEncoder().encode(JSON.stringify(value)).byteLength <= BASIS_MAX_BYTES
  );
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

/** Reads a version's `basis` column (parsed JSON) into a basis, or throws with what is wrong. */
export function parseBasis(json: unknown): TariffBasis | null {
  if (!isBasis(json)) throw new TypeError(`tariff basis: ${BASIS_PROBLEM}`);
  return json;
}

/**
 * The version in force on `day`: the greatest `startsOn` ≤ day, ties broken
 * by the greatest id — so a future version is superseded by scheduling
 * another with the same start. Undefined when none has started yet. Any
 * list of dated versions will do: the close's carry no basis.
 */
export function versionFor<Version extends Pick<TariffVersion, 'id' | 'startsOn'>>(
  versions: readonly Version[],
  day: string,
): Version | undefined {
  let best: Version | undefined;
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
 * The notice a rise against `replaced`, scheduled on `scheduledOn`, needs:
 * the strictest of the version in force that day (the replaced one when none
 * is in force yet) and the replaced one.
 */
function riseNoticeDays(
  versions: readonly TariffVersion[],
  replaced: TariffVersion,
  scheduledOn: string,
): number {
  const inForce = versionFor(versions, scheduledOn) ?? replaced;
  return Math.max(inForce.rules.noticeDaysForRise, replaced.rules.noticeDaysForRise);
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
    const notice = riseNoticeDays(versions, replaced, scheduledOn);
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
 * What is wrong with a basis, in words; empty when it is null, or a note of
 * at most 500 characters (UTF-16 code units) with, optionally, an object of
 * assumptions — all of it plain JSON data (objects, arrays, strings, finite
 * numbers, booleans, null; no undefined), nesting at most 32 levels, and its
 * JSON at most 16384 bytes of UTF-8 in all.
 */
export function basisProblems(basis: unknown): string[] {
  return isBasis(basis) ? [] : [BASIS_PROBLEM];
}

/** The sizes still charged to worlds (`inUse`) that `sizes` does not price: each once, sorted. */
export function missingSizes(sizes: TariffSizes, inUse: readonly string[]): string[] {
  return [...new Set(inUse)].filter((size) => !Object.hasOwn(sizes, size)).sort();
}

/** The id the next version takes: one more than the greatest (ids only grow), 1 for none. */
export function nextVersionId(versions: readonly Pick<TariffVersion, 'id'>[]): number {
  return versions.reduce((greatest, version) => Math.max(greatest, version.id), 0) + 1;
}

/**
 * A version the Oracle desk is asked to check or to schedule: what the Oracle
 * chose (the contract's `DeskDraft`). The till adds the id, the instant and who.
 */
export interface DeskDraft {
  readonly startsOn: string;
  readonly sizes: TariffSizes;
  readonly rules: TariffRules;
  readonly basis: TariffBasis | null;
}

/** What the desk says of a draft before anything is written (the contract's `DeskCheck`). */
export interface DeskCheck {
  /** The till's UTC date. */
  readonly today: string;
  /** The id the draft would take: one more than the greatest now. */
  readonly nextId: number;
  /** The version in force on the draft's start: the one it would replace from then. */
  readonly replacedId: number | null;
  readonly isRise: boolean;
  /** For a rise, the strictest notice of the version in force today and the replaced one; else 0. */
  readonly noticeDays: number;
  /** The first day the draft may start: tomorrow, or the day the notice allows for a rise. */
  readonly earliestStart: string;
  /** Exactly what scheduling the draft would refuse, in words; empty when it would be accepted. */
  readonly problems: readonly string[];
}

/** Anything a caller sent as a draft, read: the typed draft, or every problem found in it. */
export type DraftReading =
  | { readonly draft: DeskDraft; readonly problems: readonly [] }
  | { readonly draft: undefined; readonly problems: readonly string[] };

const DRAFT_PROBLEM = 'a draft must be an object of startsOn, sizes, rules and basis';

const DRAFT_KEYS: readonly string[] = ['startsOn', 'sizes', 'rules', 'basis'];

/**
 * Reads anything a caller sent as a draft — the desk re-validates every
 * field and trusts no shape — into a typed draft, or the problems with it in
 * words, never a throw: a key a draft does not have, and each field missing
 * or wrong (startsOn a YYYY-MM-DD day; sizes and rules as a version holds
 * them, no unknown rule and nothing but the two prices per size; basis null
 * or as `basisProblems` says).
 */
export function readDraft(sent: unknown): DraftReading {
  if (!isPlainObject(sent)) return { draft: undefined, problems: [DRAFT_PROBLEM] };
  const problems: string[] = [];
  const unknownKeys = Object.keys(sent).filter((key) => !DRAFT_KEYS.includes(key));
  if (unknownKeys.length > 0) problems.push(`unknown draft keys: ${unknownKeys.join(', ')}`);
  const { startsOn, basis } = sent;
  const dayRead = isDay(startsOn);
  if (!dayRead) problems.push('startsOn must be a YYYY-MM-DD day');
  const sizes = readSizes(sent['sizes'], problems);
  const rules = readRules(sent['rules'], problems);
  const basisRead = isBasis(basis);
  if (!basisRead) problems.push(BASIS_PROBLEM);
  if (!dayRead || rules === undefined || !basisRead || problems.length > 0) {
    return { draft: undefined, problems };
  }
  return { draft: { startsOn, sizes, rules, basis }, problems: [] };
}

/** Who the version a check builds names: a check publishes nothing. */
const CHECKED_BY = 'the Oracle desk, checking';

/**
 * What the desk answers about a draft on `today` (the contract's
 * `DeskCheck`), from every version and the sizes still charged to worlds:
 * the version the draft would replace from its start, whether it is a rise
 * against that one (`isRise`), the notice and the first day that allows,
 * and exactly the problems scheduling it would refuse with — those of
 * `scheduleProblems` (the start, the notice, the ids), a size still charged
 * that the draft stops pricing, and a basis out of bounds.
 */
export function draftCheck(
  versions: readonly TariffVersion[],
  draft: DeskDraft,
  today: string,
  sizesInUse: readonly string[],
): DeskCheck {
  const nextId = nextVersionId(versions);
  const replaced = versionFor(versions, draft.startsOn);
  const rise = replaced !== undefined && isRise(draft, replaced);
  const noticeDays = rise ? riseNoticeDays(versions, replaced, today) : 0;
  const tomorrow = addDays(today, 1);
  const afterNotice = earliestStart(today, noticeDays);
  // A check writes nothing: a well-formed instant and author stand in for the real ones.
  const next: TariffVersion = {
    ...draft,
    id: nextId,
    createdAt: startOfDay(today).toISOString(),
    createdBy: CHECKED_BY,
  };
  return {
    today,
    nextId,
    replacedId: replaced === undefined ? null : replaced.id,
    isRise: rise,
    noticeDays,
    earliestStart: afterNotice > tomorrow ? afterNotice : tomorrow,
    problems: [
      ...scheduleProblems(versions, next, today),
      ...missingSizes(draft.sizes, sizesInUse).map(
        (size) => `size ${size} is still charged to worlds: a version must keep pricing it`,
      ),
      ...basisProblems(draft.basis),
    ],
  };
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
