/**
 * The meter: where the nightly close reads each world's UTC day
 * (MIS-178). One interface; this build has two implementations — `NoMeter`
 * (nothing measured: every day stays pending) and `FakeMeter`, a pretend
 * meter fed by test data. The machines' own count replaces them (MIS-185)
 * without touching the close.
 */

import type { MeterReading } from './lib/close';
import { isCents } from './lib/money';
import { isDay } from './lib/utc-day';

export interface MeterQuery {
  readonly worldIds: readonly string[];
  readonly days: readonly string[];
}

export interface Meter {
  /** The readings it has for those worlds and days; a missing one means "not measured (yet)". */
  read(query: MeterQuery): Promise<readonly MeterReading[]>;
}

/** No meter at all: nothing is ever measured, so nothing is charged and every day is pending. */
export class NoMeter implements Meter {
  async read(): Promise<readonly MeterReading[]> {
    return [];
  }
}

/** A pretend meter answering from fixed readings (a fixture, a test). */
export class FakeMeter implements Meter {
  readonly #readings: readonly MeterReading[];

  constructor(readings: readonly MeterReading[]) {
    this.#readings = readings;
  }

  async read(query: MeterQuery): Promise<readonly MeterReading[]> {
    const worlds = new Set(query.worldIds);
    const days = new Set(query.days);
    return this.#readings.filter((reading) => worlds.has(reading.worldId) && days.has(reading.day));
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isMinutes(value: unknown): value is number {
  return isCents(value) && value >= 0;
}

/** One reading of a fixture, checked field by field; throws naming the first fault. */
function readReading(value: unknown, index: number): MeterReading {
  const fault = (what: string): TypeError => new TypeError(`meter reading ${index}: ${what}`);
  if (!isRecord(value)) throw fault('not an object');
  const { worldId, machine, day, size, minutesRunning, minutesStopped, endState } = value;
  if (!isName(worldId) || !isName(machine) || !isName(size)) {
    throw fault('worldId, machine and size are required');
  }
  if (!isDay(day)) throw fault('day must be a YYYY-MM-DD day');
  if (!isMinutes(minutesRunning) || !isMinutes(minutesStopped)) {
    throw fault('minutes must be whole and ≥ 0');
  }
  if (endState !== 'running' && endState !== 'stopped') {
    throw fault('endState must be running or stopped');
  }
  return { worldId, machine, day, size, minutesRunning, minutesStopped, endState };
}

/**
 * Reads a pretend meter's readings, `{ "readings": [...] }`, checking every
 * field and refusing two readings of one world's day. Throws on any fault:
 * a bad fixture is a bug to fix, not data to charge.
 */
export function parseMeterReadings(json: unknown): MeterReading[] {
  const list: unknown = isRecord(json) ? json['readings'] : undefined;
  if (!Array.isArray(list)) {
    throw new TypeError('meter fixture: expected { "readings": [...] }');
  }
  const readings = list.map((value: unknown, index: number) => readReading(value, index));
  const seen = new Set<string>();
  for (const reading of readings) {
    const key = `${reading.worldId}\u0000${reading.day}`;
    if (seen.has(key)) {
      throw new TypeError(`meter fixture: two readings of ${reading.worldId} on ${reading.day}`);
    }
    seen.add(key);
  }
  return readings;
}
