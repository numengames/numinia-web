import { describe, expect, it } from 'vitest';
import type { DeskAccess, DeskLine, DeskTariff } from '../accounts';
import {
  csvFileName,
  csvText,
  euroText,
  hoursAndMinutes,
  lineDay,
  runningBalances,
  runwayOf,
  sizesOf,
  splitSeries,
  stackedBars,
  topupRoles,
  worldsTotal,
} from '../saldo-view';

const NOW = new Date('2026-10-14T12:00:00.000Z');

describe('the runway: how many days the balance lasts at the pace of the last 7 complete days', () => {
  const pace = (sevenDaysCents: number) => ({ sevenDaysCents, monthCents: 0, monthWorlds: 0 });

  it('is the balance over the mean day of those seven, rounded down', () => {
    // 7 days at 1,64 € a day: 11,48 €; 50 € last 30 days and a half.
    expect(runwayOf(5000, pace(1148))).toEqual({ kind: 'days', days: 30 });
    expect(runwayOf(88, pace(1148))).toEqual({ kind: 'days', days: 0 });
    expect(runwayOf(420, pace(140))).toEqual({ kind: 'days', days: 21 });
  });

  it('says the balance does not go down when nothing was spent, and is empty at zero or below', () => {
    expect(runwayOf(420, pace(0))).toEqual({ kind: 'still' });
    expect(runwayOf(0, pace(140))).toEqual({ kind: 'empty' });
    expect(runwayOf(-25, pace(0))).toEqual({ kind: 'empty' });
  });

  it('is unknown when the till does not send its pace', () => {
    expect(runwayOf(420, undefined)).toBeNull();
  });
});

describe('the split series of the chart', () => {
  it('has every bucket of the range, running and stopped adding up to each', () => {
    const series = splitSeries(
      [
        { bucket: '2026-10-13', cents: 68, runningCents: 60, stoppedCents: 8 },
        { bucket: '2026-10-08', cents: 5, runningCents: 0, stoppedCents: 5 },
        { bucket: '2026-09-01', cents: 99, runningCents: 99, stoppedCents: 0 },
      ],
      '7d',
      NOW,
    );
    expect(series?.map((entry) => entry.bucket)).toEqual([
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
    expect(series?.[0]).toEqual({
      bucket: '2026-10-08',
      cents: 5,
      runningCents: 0,
      stoppedCents: 5,
    });
    expect(series?.[1]).toEqual({
      bucket: '2026-10-09',
      cents: 0,
      runningCents: 0,
      stoppedCents: 0,
    });
    expect(series?.[5]).toEqual({
      bucket: '2026-10-13',
      cents: 68,
      runningCents: 60,
      stoppedCents: 8,
    });
  });

  it('is absent when a bucket comes without its split (a till before this cut), or a split that does not add up', () => {
    expect(splitSeries([{ bucket: '2026-10-13', cents: 60 }], '7d', NOW)).toBeNull();
    expect(
      splitSeries([{ bucket: '2026-10-13', cents: 60, runningCents: 60 }], '7d', NOW),
    ).toBeNull();
    expect(
      splitSeries(
        [{ bucket: '2026-10-13', cents: 60, runningCents: 50, stoppedCents: 5 }],
        '7d',
        NOW,
      ),
    ).toBeNull();
    // Nothing spent in the range: every bucket is an empty split.
    expect(splitSeries([], '12m', NOW)).toHaveLength(12);
  });

  it('never draws a negative half', () => {
    expect(
      splitSeries(
        [{ bucket: '2026-10-13', cents: -5, runningCents: -5, stoppedCents: 0 }],
        '7d',
        NOW,
      )?.[5],
    ).toEqual({ bucket: '2026-10-13', cents: 0, runningCents: 0, stoppedCents: 0 });
  });
});

describe('the stacked bars', () => {
  it('stack running at the base and stopped above it, the tallest day full height', () => {
    const bars = stackedBars(
      [
        { bucket: 'a', cents: 80, runningCents: 60, stoppedCents: 20 },
        { bucket: 'b', cents: 40, runningCents: 0, stoppedCents: 40 },
        { bucket: 'c', cents: 0, runningCents: 0, stoppedCents: 0 },
        { bucket: 'd', cents: 1, runningCents: 1, stoppedCents: 0 },
      ],
      400,
      160,
    );
    expect(bars[0]).toEqual({
      bucket: 'a',
      cents: 80,
      runningCents: 60,
      stoppedCents: 20,
      x: 10,
      width: 80,
      runningY: 40,
      runningHeight: 120,
      stoppedY: 0,
      stoppedHeight: 40,
    });
    expect(bars[1]).toMatchObject({
      runningHeight: 0,
      runningY: 160,
      stoppedHeight: 80,
      stoppedY: 80,
    });
    expect(bars[2]).toMatchObject({
      runningHeight: 0,
      stoppedHeight: 0,
      runningY: 160,
      stoppedY: 160,
    });
    // A day that cost something never vanishes: at least one unit tall.
    expect(bars[3]).toMatchObject({ runningHeight: 2, stoppedHeight: 0 });
  });

  it('draws nothing tall when nothing was spent, and nothing at all for no buckets', () => {
    const flat = stackedBars(
      [{ bucket: 'a', cents: 0, runningCents: 0, stoppedCents: 0 }],
      100,
      50,
    );
    expect(flat[0]).toMatchObject({ runningHeight: 0, stoppedHeight: 0, runningY: 50 });
    expect(stackedBars([], 100, 50)).toEqual([]);
  });
});

describe('the balance after each line', () => {
  it('counts back from today’s balance over the newest lines, newest first', () => {
    const lines: DeskLine[] = [
      { kind: 'world_day', at: '2026-10-14T00:30:00.000Z', amountCents: -164, day: '2026-10-13' },
      { kind: 'adjustment', at: '2026-10-12T10:00:00.000Z', amountCents: 25, reason: 'gift' },
      { kind: 'topup', at: '2026-10-01T10:00:00.000Z', amountCents: 5000, vatCents: 1050 },
    ];
    expect(runningBalances(lines, 88)).toEqual([88, 252, 227]);
    expect(runningBalances([], 88)).toEqual([]);
  });
});

describe('the UTC day a line is listed under', () => {
  it('is a world’s own day, and the day any other line was written', () => {
    expect(
      lineDay({
        kind: 'world_day',
        at: '2026-10-14T00:30:00.000Z',
        amountCents: -60,
        day: '2026-10-13',
      }),
    ).toBe('2026-10-13');
    expect(lineDay({ kind: 'topup', at: '2026-10-01T23:30:00.000Z', amountCents: 1000 })).toBe(
      '2026-10-01',
    );
    expect(lineDay({ kind: 'world_day', at: '2026-10-02T00:30:00.000Z', amountCents: -60 })).toBe(
      '2026-10-02',
    );
  });
});

describe('the CSV of the movements', () => {
  const header = {
    day: 'Día (UTC)',
    what: 'Qué',
    detail: 'Detalle',
    amount: 'Importe',
    balance: 'Saldo',
  };

  it('writes euros with a dot decimal, whatever the language', () => {
    expect(euroText(-164)).toBe('-1.64');
    expect(euroText(5000)).toBe('50.00');
    expect(euroText(-5)).toBe('-0.05');
    expect(euroText(0)).toBe('0.00');
  });

  it('starts with the header in the visitor’s language, one row per line, quoted where needed', () => {
    const text = csvText(header, [
      {
        day: '2026-10-13',
        what: 'Día de sede',
        detail: 'agora · 2g',
        amountCents: -164,
        balanceCents: 88,
      },
      {
        day: '2026-10-12',
        what: 'Ajuste',
        detail: 'a "gift", by hand',
        amountCents: 25,
        balanceCents: 252,
      },
      {
        day: '2026-10-11',
        what: 'Ajuste',
        detail: '=HYPERLINK("x")',
        amountCents: -1,
        balanceCents: 227,
      },
    ]);
    expect(text.startsWith('\uFEFF')).toBe(true);
    expect(text.slice(1).split('\r\n')).toEqual([
      'Día (UTC),Qué,Detalle,Importe,Saldo',
      '2026-10-13,Día de sede,agora · 2g,-1.64,0.88',
      '2026-10-12,Ajuste,"a ""gift"", by hand",0.25,2.52',
      // A text cell that a spreadsheet would read as a formula is kept as text.
      `2026-10-11,Ajuste,"'=HYPERLINK(""x"")",-0.01,2.27`,
      '',
    ]);
  });

  it('is named after the UTC day it was made', () => {
    expect(csvFileName(NOW)).toBe('numinia-saldo-2026-10-14.csv');
  });
});

describe('the little figures the screen prints', () => {
  it('turns minutes into hours and minutes', () => {
    expect(hoursAndMinutes(1440)).toEqual({ hours: 24, minutes: 0 });
    expect(hoursAndMinutes(90)).toEqual({ hours: 1, minutes: 30 });
    expect(hoursAndMinutes(0)).toEqual({ hours: 0, minutes: 0 });
  });

  it('adds up the worlds of the period', () => {
    expect(
      worldsTotal([
        { worldId: 'a', size: '4g', daysRunning: 3, cents: 285 },
        { worldId: 'b', size: '1g', daysRunning: 0, cents: 3 },
      ]),
    ).toBe(288);
    expect(worldsTotal([])).toBe(0);
  });

  it('lists the tariff’s sizes from the cheapest day running, then by name', () => {
    const tariff: DeskTariff = {
      startsOn: '2026-10-13',
      sizes: {
        '4g': { runningCentsPerDay: 120, stoppedCentsPerDay: 10 },
        '1g': { runningCentsPerDay: 30, stoppedCentsPerDay: 3 },
        small: { runningCentsPerDay: 30, stoppedCentsPerDay: 2 },
      },
      rules: { keepDaysAtZero: 90, noticeDaysForRise: 30 },
    };
    expect(sizesOf(tariff)).toEqual([
      { size: '1g', runningCentsPerDay: 30, stoppedCentsPerDay: 3 },
      { size: 'small', runningCentsPerDay: 30, stoppedCentsPerDay: 2 },
      { size: '4g', runningCentsPerDay: 120, stoppedCentsPerDay: 10 },
    ]);
  });

  it('names the roles that hold the top-up, or nothing when the till did not say', () => {
    const access: DeskAccess = {
      as: 'owner',
      permissions: ['top-up'],
      holders: { 'top-up': ['Administración', 'Finanzas'] },
    };
    expect(topupRoles(access)).toEqual(['Administración', 'Finanzas']);
    expect(topupRoles({ ...access, holders: {} })).toEqual([]);
    expect(topupRoles(null)).toBeNull();
  });
});
