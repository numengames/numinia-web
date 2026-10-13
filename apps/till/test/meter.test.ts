import { describe, expect, it } from 'vitest';
import meterFixture from '../fixtures/meter.json';
import { MINUTES_PER_DAY } from '../src/lib/utc-day';
import { FakeMeter, NoMeter, parseMeterReadings } from '../src/meter';

const valid = {
  worldId: 'w-a',
  machine: 'vps-2-a',
  day: '2026-10-26',
  size: '2g',
  minutesRunning: 1440,
  minutesStopped: 0,
  endState: 'running',
};

describe('the meters', () => {
  it('NoMeter measures nothing, so every day stays pending', async () => {
    expect(await new NoMeter().read()).toEqual([]);
  });

  it('FakeMeter answers only for the worlds and days it is asked about', async () => {
    const readings = parseMeterReadings({
      readings: [valid, { ...valid, day: '2026-10-25' }, { ...valid, worldId: 'w-b' }],
    });
    const meter = new FakeMeter(readings);
    expect(await meter.read({ worldIds: ['w-a'], days: ['2026-10-26'] })).toEqual([valid]);
    expect(
      await meter.read({ worldIds: ['w-a', 'w-b'], days: ['2026-10-26', '2026-10-25'] }),
    ).toHaveLength(3);
    expect(await meter.read({ worldIds: [], days: ['2026-10-26'] })).toEqual([]);
  });
});

describe('the pretend meter’s fixture', () => {
  it('parses, and every reading fits a UTC day of MINUTES_PER_DAY minutes', () => {
    const readings = parseMeterReadings(meterFixture);
    expect(readings).toHaveLength(6);
    for (const reading of readings) {
      expect(reading.minutesRunning + reading.minutesStopped).toBeLessThanOrEqual(MINUTES_PER_DAY);
    }
  });

  it('measures 25 October 2026 and 28 March 2027, the days Spain moves its clock, as whole days', () => {
    const readings = parseMeterReadings(meterFixture);
    expect(
      readings
        .filter((r) => r.day === '2026-10-25' || r.day === '2027-03-28')
        .map((r) => [r.worldId, r.day, r.minutesRunning + r.minutesStopped]),
    ).toEqual([
      ['w-lumen-plaza', '2026-10-25', MINUTES_PER_DAY],
      ['w-leo-friends', '2026-10-25', MINUTES_PER_DAY],
      ['w-lumen-plaza', '2027-03-28', MINUTES_PER_DAY],
    ]);
  });

  it('keeps its variety: a full running day, a partial day, a stopped world, a day left pending', () => {
    const readings = parseMeterReadings(meterFixture);
    expect(readings.some((r) => r.minutesRunning === MINUTES_PER_DAY)).toBe(true);
    expect(readings.some((r) => r.minutesRunning > 0 && r.minutesStopped > 0)).toBe(true);
    expect(readings.some((r) => r.minutesRunning === 0 && r.endState === 'stopped')).toBe(true);
    expect(readings.some((r) => r.worldId === 'w-leo-friends' && r.day === '2026-10-26')).toBe(
      false,
    );
  });
});

describe('reading a fixture', () => {
  it('refuses anything that is not a list of readings', () => {
    expect(() => parseMeterReadings(null)).toThrow(/expected \{ "readings": \[...\] \}/);
    expect(() => parseMeterReadings([valid])).toThrow(/expected/);
    expect(() => parseMeterReadings({ readings: 'none' })).toThrow(/expected/);
    expect(parseMeterReadings({ readings: [] })).toEqual([]);
  });

  it('names the first faulty reading and its fault', () => {
    const fault =
      (reading: unknown): (() => unknown) =>
      () =>
        parseMeterReadings({ readings: [valid, reading] });
    expect(fault('w-a')).toThrow('meter reading 1: not an object');
    expect(fault({ ...valid, worldId: '' })).toThrow(
      'meter reading 1: worldId, machine and size are required',
    );
    expect(fault({ ...valid, machine: 7 })).toThrow('worldId, machine and size are required');
    expect(fault({ ...valid, size: ' ' })).toThrow('worldId, machine and size are required');
    expect(fault({ ...valid, day: '2026-02-30' })).toThrow(
      'meter reading 1: day must be a YYYY-MM-DD day',
    );
    expect(fault({ ...valid, minutesRunning: -1 })).toThrow(
      'meter reading 1: minutes must be whole and ≥ 0',
    );
    expect(fault({ ...valid, minutesStopped: 1.5 })).toThrow('minutes must be whole and ≥ 0');
    expect(fault({ ...valid, endState: 'paused' })).toThrow(
      'meter reading 1: endState must be running or stopped',
    );
  });

  it('refuses two readings of one world’s day', () => {
    expect(() =>
      parseMeterReadings({ readings: [valid, { ...valid, minutesRunning: 0 }] }),
    ).toThrow('meter fixture: two readings of w-a on 2026-10-26');
  });

  it('keeps a stopped day as stopped', () => {
    expect(parseMeterReadings({ readings: [{ ...valid, endState: 'stopped' }] })[0]?.endState).toBe(
      'stopped',
    );
  });
});
