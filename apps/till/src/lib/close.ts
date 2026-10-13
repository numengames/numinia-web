/**
 * The nightly close (MIS-178) as a pure function. Each night closes every
 * UTC day that has ended and is not closed yet, up to 35 days back: one
 * world-day line per world and day the meter measured, priced at the tariff
 * version in force THAT day for the size the world reserved. A day nobody
 * measured stays pending and is never estimated; older than the window it
 * is reported. After the day's lines, an account at or below zero enters
 * the at-zero state: its running worlds are listed to stop for balance, its
 * stopped worlds are kept for free with a deletion date, and a later lot
 * ends the state from the day after it. The repository loads the input and
 * writes the output; nothing here reads a clock or a database.
 */

import { lineId, type WorldDayLine } from './ledger';
import { isCents } from './money';
import { versionFor, worldDayCostCents, type TariffVersion } from './tariff';
import {
  MINUTES_PER_DAY,
  addDays,
  dayOf,
  daysBetween,
  daysFrom,
  isDay,
  isInstant,
} from './utc-day';

/** How far back a day is still charged when its reading arrives late (ADR-070 §2). */
export const CLOSE_WINDOW_DAYS = 35;

/** Line ids order one run's lines by their day: days since this one. */
const EPOCH_DAY = '1970-01-01';

/** One world's measured UTC day, as a meter reads it (MIS-185 replaces the pretend one). */
export interface MeterReading {
  readonly worldId: string;
  readonly machine: string;
  readonly day: string;
  /** The size the world reserved that day: what is charged, never what it used. */
  readonly size: string;
  readonly minutesRunning: number;
  readonly minutesStopped: number;
  /** The world's state when the day ended. */
  readonly endState: 'running' | 'stopped';
}

/** A world the till knows, from the first UTC day it was seen. */
export interface KnownWorld {
  readonly worldId: string;
  readonly firstSeenOn: string;
}

/**
 * A stretch of the at-zero state: it starts on the date of the run that
 * found the balance at or below zero, at that run's instant, and ends on the
 * UTC date of the first lot written after that instant (that day included).
 * Open while `endsOn` is null.
 */
export interface AtZeroPeriod {
  readonly accountId: string;
  readonly startsOn: string;
  readonly startedAt: string;
  readonly endsOn: string | null;
}

/** A lot written after the open period began: it ends the period. */
export interface LotArrival {
  readonly lineId: string;
  readonly at: string;
}

export interface CloseAccount {
  readonly accountId: string;
  /** The sum of every line already written. */
  readonly balanceCents: number;
  readonly worlds: readonly KnownWorld[];
  /** Its at-zero periods that touch the window, the open one included. */
  readonly periods: readonly AtZeroPeriod[];
  /** The first lot written after the open period's start, if any. */
  readonly lotAfterOpen: LotArrival | null;
}

interface WorldDay {
  readonly worldId: string;
  readonly day: string;
}

/**
 * Why a day is reported to the Oracle, never estimated: nobody measured it
 * within 35 days; the meter's reading cannot be a day; or no tariff version
 * prices that size on that day.
 */
export type ReportReason = 'unmeasured' | 'invalid_reading' | 'unpriced';

interface CloseReport extends WorldDay {
  readonly accountId: string;
  readonly reason: ReportReason;
}

/** A world kept for free while its account is at zero, until its deletion date. */
export interface KeepMark {
  readonly worldId: string;
  readonly accountId: string;
  readonly deleteOn: string;
}

interface StopForBalance {
  readonly accountId: string;
  readonly worldId: string;
  readonly machine: string;
}

interface PeriodEnd {
  readonly accountId: string;
  readonly startedAt: string;
  readonly endsOn: string;
  readonly endedByLineId: string;
}

export interface CloseInput {
  /** The run's UTC date: the days before it have ended. */
  readonly today: string;
  /** The run's instant, on `today` in UTC; every new line's `at`. */
  readonly now: string;
  readonly versions: readonly TariffVersion[];
  readonly accounts: readonly CloseAccount[];
  /** The meter's readings for the days in the window. */
  readonly readings: readonly MeterReading[];
  /** The (world, day) pairs that already have their line. */
  readonly closed: readonly WorldDay[];
  /** What was already reported, so each report is made once. */
  readonly reported: readonly Pick<CloseReport, 'worldId' | 'day' | 'reason'>[];
  /** The deletion dates already set. */
  readonly marks: readonly KeepMark[];
}

export interface CloseOutput {
  readonly lines: readonly WorldDayLine[];
  readonly stopForBalance: readonly StopForBalance[];
  /** Deletion dates to set, new or replacing an ended stretch's. */
  readonly keep: readonly KeepMark[];
  /** Worlds whose deletion date ends. */
  readonly cleared: readonly string[];
  readonly pending: readonly WorldDay[];
  readonly reports: readonly CloseReport[];
  readonly periodsOpened: readonly AtZeroPeriod[];
  readonly periodsEnded: readonly PeriodEnd[];
}

function worldDayKey(worldId: string, day: string): string {
  return `${worldId}\u0000${day}`;
}

function reportKey(report: Pick<CloseReport, 'worldId' | 'day' | 'reason'>): string {
  return `${worldDayKey(report.worldId, report.day)}\u0000${report.reason}`;
}

/** A reading that can be a day: whole minutes, none negative, no more than a day's 1440. */
function isSound(reading: MeterReading | null): reading is MeterReading {
  return (
    reading !== null &&
    isCents(reading.minutesRunning) &&
    isCents(reading.minutesStopped) &&
    reading.minutesRunning >= 0 &&
    reading.minutesStopped >= 0 &&
    reading.minutesRunning + reading.minutesStopped <= MINUTES_PER_DAY
  );
}

function byId<T>(id: (item: T) => string): (a: T, b: T) => number {
  // Code-point order, the same in every runtime.
  return (a, b) => Number(id(a) > id(b)) - Number(id(a) < id(b));
}

/** The nightly close: what to write and what to do, from what the till knows. */
export function closeDays(input: CloseInput): CloseOutput {
  const { today, now } = input;
  if (!isDay(today)) throw new RangeError(`closeDays: today is not a day: ${today}`);
  if (!isInstant(now) || dayOf(new Date(now)) !== today) {
    throw new RangeError(`closeDays: now (${now}) is not an instant of ${today}`);
  }
  const inForce = versionFor(input.versions, today);
  if (inForce === undefined)
    throw new Error(`closeDays: no tariff version is in force on ${today}`);

  const nowMs = Date.parse(now);
  const firstDay = addDays(today, -CLOSE_WINDOW_DAYS);
  const lastDay = addDays(today, -1);
  const closed = new Set(input.closed.map((done) => worldDayKey(done.worldId, done.day)));
  const reported = new Set(input.reported.map(reportKey));
  const marked = new Set(input.marks.map((mark) => mark.worldId));

  // Two readings of one world's day are a meter fault, never a choice: null.
  const readings = new Map<string, MeterReading | null>();
  const latest = new Map<string, MeterReading>();
  for (const reading of input.readings) {
    const key = worldDayKey(reading.worldId, reading.day);
    readings.set(key, readings.has(key) ? null : reading);
    const seen = latest.get(reading.worldId);
    if (seen === undefined || reading.day > seen.day) latest.set(reading.worldId, reading);
  }

  const lines: WorldDayLine[] = [];
  const stopForBalance: StopForBalance[] = [];
  const keep: KeepMark[] = [];
  const cleared: string[] = [];
  const pending: WorldDay[] = [];
  const reports: CloseReport[] = [];
  const periodsOpened: AtZeroPeriod[] = [];
  const periodsEnded: PeriodEnd[] = [];
  const knownWorlds = new Set<string>();

  for (const account of [...input.accounts].sort(byId((a) => a.accountId))) {
    const { accountId } = account;
    const report = (worldId: string, day: string, reason: ReportReason): void => {
      if (!reported.has(reportKey({ worldId, day, reason }))) {
        reports.push({ worldId, accountId, day, reason });
      }
    };

    // A lot written after the open period began ends it on that lot's UTC date.
    const open = account.periods.find((period) => period.endsOn === null);
    const lot = account.lotAfterOpen;
    let periods = account.periods;
    let ended = false;
    if (open !== undefined && lot !== null && Date.parse(lot.at) > Date.parse(open.startedAt)) {
      const endsOn = dayOf(new Date(lot.at));
      periodsEnded.push({
        accountId,
        startedAt: open.startedAt,
        endsOn,
        endedByLineId: lot.lineId,
      });
      periods = periods.map((period) => (period === open ? { ...period, endsOn } : period));
      ended = true;
    }
    const keptForFree = (day: string): boolean =>
      periods.some(
        (period) => period.startsOn <= day && (period.endsOn === null || day <= period.endsOn),
      );

    let balance = account.balanceCents;
    const worlds = [...account.worlds].sort(byId((world) => world.worldId));
    for (const world of worlds) {
      const { worldId } = world;
      knownWorlds.add(worldId);

      // Older than the window and never closed: reported once, never estimated.
      for (const day of daysFrom(world.firstSeenOn, addDays(firstDay, -1))) {
        if (!closed.has(worldDayKey(worldId, day))) report(worldId, day, 'unmeasured');
      }

      const from = world.firstSeenOn > firstDay ? world.firstSeenOn : firstDay;
      for (const day of daysFrom(from, lastDay)) {
        if (closed.has(worldDayKey(worldId, day))) continue;
        const reading = readings.get(worldDayKey(worldId, day));
        if (reading === undefined) {
          pending.push({ worldId, day });
          continue;
        }
        if (!isSound(reading)) {
          pending.push({ worldId, day });
          report(worldId, day, 'invalid_reading');
          continue;
        }
        const version = versionFor(input.versions, day);
        const price = version?.sizes[reading.size];
        if (version === undefined || price === undefined) {
          pending.push({ worldId, day });
          report(worldId, day, 'unpriced');
          continue;
        }
        // While the account is kept at zero, a stopped minute costs nothing.
        const cost = worldDayCostCents(
          {
            runningCentsPerDay: price.runningCentsPerDay,
            stoppedCentsPerDay: keptForFree(day) ? 0 : price.stoppedCentsPerDay,
          },
          reading.minutesRunning,
          reading.minutesStopped,
        );
        lines.push({
          id: lineId(nowMs, `world_day|${worldId}|${day}`, daysBetween(EPOCH_DAY, day)),
          accountId,
          kind: 'world_day',
          amountCents: cost === 0 ? 0 : -cost,
          at: now,
          worldId,
          machine: reading.machine,
          day,
          minutesRunning: reading.minutesRunning,
          minutesStopped: reading.minutesStopped,
          size: reading.size,
          tariffVersionId: version.id,
        });
        balance -= cost;
      }
    }

    // Only an account with worlds has anything to stop or keep: a new account
    // that has not topped up yet is not "at zero".
    if (balance <= 0 && worlds.length > 0) {
      // Enters the state today, or stays in it; a stretch just ended starts a new one.
      const entering = open === undefined || ended;
      if (entering)
        periodsOpened.push({ accountId, startsOn: today, startedAt: now, endsOn: null });
      const deleteOn = addDays(today, inForce.rules.keepDaysAtZero);
      for (const { worldId } of worlds) {
        const last = latest.get(worldId);
        if (last?.endState === 'running') {
          stopForBalance.push({ accountId, worldId, machine: last.machine });
        }
        if (entering || !marked.has(worldId)) keep.push({ worldId, accountId, deleteOn });
      }
    } else {
      for (const { worldId } of worlds) if (marked.has(worldId)) cleared.push(worldId);
    }
  }

  // A deletion date whose world no account claims is not the close's to keep.
  for (const mark of input.marks) if (!knownWorlds.has(mark.worldId)) cleared.push(mark.worldId);

  return { lines, stopForBalance, keep, cleared, pending, reports, periodsOpened, periodsEnded };
}
