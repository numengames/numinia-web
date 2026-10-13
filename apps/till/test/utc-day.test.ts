import { describe, expect, it } from 'vitest';
import {
  MINUTES_PER_DAY,
  addDays,
  dayOf,
  daysBetween,
  daysFrom,
  isDay,
  isInstant,
  startOfDay,
} from '../src/lib/utc-day';

/** Minutes from the start of `day` to the start of the next day. */
function minutesIn(day: string): number {
  return (startOfDay(addDays(day, 1)).getTime() - startOfDay(day).getTime()) / 60_000;
}

describe('the minutes of a UTC day', () => {
  it('are 1440', () => {
    expect(MINUTES_PER_DAY).toBe(1440);
    expect(minutesIn('2026-10-13')).toBe(MINUTES_PER_DAY);
  });

  it('are 1440 on the days Spain changes its clock: 25 October 2026 and 28 March 2027', () => {
    expect(minutesIn('2026-10-25')).toBe(MINUTES_PER_DAY);
    expect(minutesIn('2027-03-28')).toBe(MINUTES_PER_DAY);
  });

  it('are 1440 on every day from 2026 to 2028, its leap day included: no day of another length', () => {
    const days = daysFrom('2026-01-01', '2028-12-31');
    expect(days).toHaveLength(365 + 365 + 366);
    expect(days).toContain('2028-02-29');
    expect(days.filter((day) => minutesIn(day) !== MINUTES_PER_DAY)).toEqual([]);
  });
});

describe('the UTC date of an instant', () => {
  it('is the date of its ISO form: the last millisecond is that date, midnight the next', () => {
    expect(dayOf(new Date('2026-10-25T23:59:59.999Z'))).toBe('2026-10-25');
    expect(dayOf(new Date('2026-10-26T00:00:00.000Z'))).toBe('2026-10-26');
    expect(dayOf(new Date('2027-03-28T23:59:59.999Z'))).toBe('2027-03-28');
    expect(dayOf(new Date('2027-03-29T00:00:00.000Z'))).toBe('2027-03-29');
    expect(dayOf(new Date('2026-10-27T00:30:00.000Z'))).toBe('2026-10-27');
  });

  it('is read in UTC whatever offset the time was written with', () => {
    // 01:15 at UTC+02:00 on 2 July is 23:15 UTC on 1 July.
    expect(dayOf(new Date('2026-07-02T01:15:00+02:00'))).toBe('2026-07-01');
    expect(dayOf(new Date('2026-07-01T20:00:00-05:00'))).toBe('2026-07-02');
  });

  it('refuses an invalid instant', () => {
    expect(() => dayOf(new Date('not a time'))).toThrow(RangeError);
  });
});

describe('the start of a UTC day', () => {
  it('is 00:00:00.000Z of its date, on the days Spain changes its clock too', () => {
    expect(startOfDay('2026-10-13').toISOString()).toBe('2026-10-13T00:00:00.000Z');
    expect(startOfDay('2026-10-25').toISOString()).toBe('2026-10-25T00:00:00.000Z');
    expect(startOfDay('2026-10-26').toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(startOfDay('2027-03-28').toISOString()).toBe('2027-03-28T00:00:00.000Z');
    expect(startOfDay('2028-02-29').toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  it('round-trips with dayOf: it belongs to its own date, the millisecond before it to the day before', () => {
    for (const day of daysFrom('2026-01-01', '2027-12-31')) {
      const start = startOfDay(day);
      expect(dayOf(start)).toBe(day);
      expect(dayOf(new Date(start.getTime() - 1))).toBe(addDays(day, -1));
    }
  });
});

describe('calendar arithmetic', () => {
  it('adds and counts days across months, years and leap days', () => {
    expect(addDays('2026-10-13', 1)).toBe('2026-10-14');
    expect(addDays('2026-10-13', -35)).toBe('2026-09-08');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-10-13', 0)).toBe('2026-10-13');
    expect(daysBetween('2026-10-13', '2026-11-12')).toBe(30);
    expect(daysBetween('2026-11-12', '2026-10-13')).toBe(-30);
    expect(daysBetween('1970-01-01', '2026-10-13')).toBe(20_739);
  });

  it('lists days oldest first, both ends included, and nothing when the end comes first', () => {
    expect(daysFrom('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(daysFrom('2026-10-13', '2026-10-13')).toEqual(['2026-10-13']);
    expect(daysFrom('2026-10-14', '2026-10-13')).toEqual([]);
  });

  it('refuses what is not a day or not a whole count', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    expect(() => addDays('2026-10-13', 1.5)).toThrow(RangeError);
    expect(() => daysBetween('13/10/2026', '2026-10-13')).toThrow(RangeError);
    expect(() => daysFrom('2026-10-13', '2026-10-32')).toThrow(RangeError);
    expect(() => startOfDay('2026-13-01')).toThrow(RangeError);
    expect(() => startOfDay('2026-10-13T00:00:00.000Z')).toThrow(RangeError);
  });
});

describe('validators', () => {
  it('know a real calendar day', () => {
    expect(isDay('2026-10-13')).toBe(true);
    expect(isDay('2028-02-29')).toBe(true);
    expect(isDay('2027-02-29')).toBe(false);
    expect(isDay('2026-13-01')).toBe(false);
    expect(isDay('2026-1-1')).toBe(false);
    expect(isDay('2026-10-13T00:00:00.000Z')).toBe(false);
    expect(isDay(20261013)).toBe(false);
    expect(isDay(null)).toBe(false);
  });

  it('know an instant written as Date#toISOString writes it', () => {
    expect(isInstant('2026-10-13T08:24:00.000Z')).toBe(true);
    expect(isInstant(new Date('2026-10-25T01:30:00Z').toISOString())).toBe(true);
    expect(isInstant('2026-10-13T08:24:00Z')).toBe(false);
    expect(isInstant('2026-10-13T08:24:00.000+02:00')).toBe(false);
    expect(isInstant('2026-13-45T00:00:00.000Z')).toBe(false);
    expect(isInstant('2026-02-30T00:00:00.000Z')).toBe(false);
    expect(isInstant('yesterday')).toBe(false);
    expect(isInstant(1_760_000_000_000)).toBe(false);
  });
});
