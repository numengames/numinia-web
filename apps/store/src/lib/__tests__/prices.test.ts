/**
 * The price room's pure model (MIS-184): the calculator ported from the
 * pricing study (calculadora.html, modelo.py) with its default figures
 * pinned, money in whole cents, VAT for display, the draft and what it
 * changes, and the till's problems read back.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BASIS_PROBLEM,
  BY_PROBLEM,
  MEANWHILE_PROBLEM,
  RULE_KEYS,
  addDays,
  assumptionsFrom,
  centsText,
  changesFrom,
  daysOfTopup,
  decimalMark,
  draftFrom,
  fill,
  fleetProfit,
  formFrom,
  formatCents,
  formatDay,
  formatDayStart,
  formatInstant,
  formatMoney,
  formatNumber,
  formatShare,
  grossCents,
  isDay,
  isRise,
  isWallet,
  machineOf,
  marginOf,
  newestFirst,
  nothingChanges,
  parseEuros,
  parseEurosList,
  parseWhole,
  readAnswer,
  readCheckAnswer,
  readProblem,
  readScheduleAnswer,
  ruleText,
  s3EurPerGbMonth,
  scheduledVersions,
  shortWallet,
  sizeOrder,
  sizeSpec,
  snapshotOf,
  stripeFee,
  supportMinutesOf,
  unitCost,
  utcDay,
  versionFor,
  versionState,
  withSizesInUse,
  worldsPerMachine,
  type Assumptions,
  type DeskRules,
  type DeskVersion,
  type DeskView,
  type DraftForm,
} from '../prices';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_RULES,
  JUDGEMENT,
  DECISION,
  MACHINES,
  MARKET,
  SIZE_CATALOG,
  STRIPE,
  type SizeSpec,
} from '../prices-data';

const spec = (key: string): SizeSpec => {
  const found = sizeSpec(key);
  if (found === undefined) throw new Error(`no size ${key}`);
  return found;
};

const RULES: DeskRules = {
  ...DEFAULT_RULES,
  quickTopupsCents: [...DEFAULT_RULES.quickTopupsCents],
};

const version = (
  over: Partial<DeskVersion> & Pick<DeskVersion, 'id' | 'startsOn'>,
): DeskVersion => ({
  createdAt: '2026-10-13T00:00:00.000Z',
  createdBy: 'seed: example figures (DBT-026)',
  sizes: { '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 } },
  rules: RULES,
  basis: null,
  ...over,
});

const SEED = version({ id: 1, startsOn: '2026-10-13' });
const spaced = (text: string): string => text.replace(/\s/g, ' ');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the figures', () => {
  it('every figure carries the day it was read and a source page or the house’s word', () => {
    const readings = [...MACHINES, ...SIZE_CATALOG, ...MARKET, ...Object.values(STRIPE)];
    for (const reading of readings) {
      expect(isDay(reading.readOn)).toBe(true);
      expect(
        reading.source.startsWith('https://') ||
          reading.source === JUDGEMENT ||
          reading.source === DECISION,
      ).toBe(true);
    }
  });

  it('the catalog sells the approved sizes at their starting prices', () => {
    expect(
      SIZE_CATALOG.map((size) => [
        size.key,
        size.people,
        size.startRunningCents,
        size.startStoppedCents,
      ]),
    ).toEqual([
      ['small', 20, 20, 2],
      ['medium', 50, 75, 5],
      ['large', 100, 180, 10],
      ['2g', null, null, null],
    ]);
  });
});

describe('the calculator, pinned to the study’s defaults', () => {
  const a = DEFAULT_ASSUMPTIONS;
  const vps3 = machineOf('VPS-3');

  it('fits 22 small, 11 medium, 5 large and 3 of the 2 GB size on a VPS-3', () => {
    expect(
      ['small', 'medium', 'large', '2g'].map((key) => worldsPerMachine(vps3, spec(key), 1)),
    ).toEqual([22, 11, 5, 3]);
  });

  it('promising the processor twice fits more of the CPU-bound sizes', () => {
    expect(worldsPerMachine(vps3, spec('large'), 2)).toBe(10);
    expect(worldsPerMachine(machineOf('VPS-4'), spec('small'), 1)).toBe(30);
  });

  it('costs 0.0571 / 0.2344 / 0.6459 / 0.4229 € a day, margins 71.4 / 68.7 / 64.1 / 29.5 %', () => {
    const rows = [
      ['small', 20, 0.0571, 0.714],
      ['medium', 75, 0.2344, 0.687],
      ['large', 180, 0.6459, 0.641],
      ['2g', 60, 0.4229, 0.295],
    ] as const;
    for (const [key, cents, cost, margin] of rows) {
      const unit = unitCost(spec(key), cents, a);
      expect(unit.total).toBeCloseTo(cost, 4);
      expect(marginOf(cents, unit)).toBeCloseTo(margin, 3);
    }
    expect(
      ['small', 'medium', 'large'].map((key, i) => {
        const unit = unitCost(spec(key), [20, 75, 180][i] as number, a);
        return spaced(formatShare(marginOf([20, 75, 180][i] as number, unit) as number, 'es'));
      }),
    ).toEqual(['71 %', '69 %', '64 %']);
  });

  it('splits a small world’s day into its four pieces', () => {
    const unit = unitCost(spec('small'), 20, a);
    expect(unit.fit).toBe(22);
    expect(unit.machine).toBeCloseTo(12.24 / 11 / 30, 10);
    expect(unit.copies).toBeCloseTo((0.5 * 21 * (0.024 / 1.1181)) / 30, 10);
    expect(unit.support).toBe(0);
    expect(unit.stripe).toBeCloseTo(0.2 * (1.25 / 20), 10);
  });

  it('gives the example fleet 507 € of revenue, 5 machines and 327.27 € of profit (65 %)', () => {
    const fleet = fleetProfit(
      {
        small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
        medium: { runningCentsPerDay: 75, stoppedCentsPerDay: 5 },
        large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 },
      },
      a,
    );
    expect(fleet.revenue).toBeCloseTo(507, 6);
    expect(fleet.machines).toBe(5);
    expect(fleet.machineCost).toBeCloseTo(61.2, 6);
    expect(fleet.copies).toBeCloseTo(24.34, 2);
    expect(fleet.support).toBeCloseTo(47.5, 6);
    expect(fleet.stripe).toBeCloseTo(31.69, 2);
    expect(fleet.fixed).toBe(15);
    expect(fleet.extras).toBe(0);
    expect(fleet.profit).toBeCloseTo(327.27, 2);
    expect(spaced(formatShare(fleet.share as number, 'es'))).toBe('65 %');
    expect(fleet.lines.map((line) => [line.key, line.priced, Math.round(line.revenue)])).toEqual([
      ['small', true, 120],
      ['medium', true, 225],
      ['large', true, 162],
    ]);
  });

  it('moving the occupancy moves the margins', () => {
    const full = { ...a, occupancyPct: 90 };
    expect(marginOf(20, unitCost(spec('small'), 20, full)) as number).toBeGreaterThan(
      marginOf(20, unitCost(spec('small'), 20, a)) as number,
    );
  });

  it('counts a stopped share of the month at the stopped price', () => {
    const half = { ...a, fleet: { small: { worlds: 10, runningPct: 50 } } };
    const fleet = fleetProfit({ small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 } }, half);
    expect(fleet.lines[0]?.revenue).toBeCloseTo(10 * 30 * (0.2 * 0.5 + 0.02 * 0.5), 10);
    // Sizes the assumptions leave out count as no worlds, and earn nothing unpriced.
    expect(fleet.lines.slice(1).map((line) => [line.worlds, line.priced])).toEqual([
      [0, false],
      [0, false],
    ]);
  });

  it('a fleet with no worlds needs no machine, and a fleet that earns nothing has no share', () => {
    const empty = { ...a, fleet: { small: { worlds: 0, runningPct: 100 } } };
    const fleet = fleetProfit({ small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 } }, empty);
    expect(fleet.machines).toBe(0);
    expect(fleet.revenue).toBe(0);
    expect(fleet.share).toBeNull();
    expect(fleet.profit).toBeCloseTo(-15, 10);
  });

  it('a world that fits on no machine leaves the machines and the profit unknown', () => {
    const tiny = { ...a, machine: 'VPS-2', cpuPromised: 1 };
    const huge: SizeSpec = { ...spec('large'), ramReservedGb: 64 };
    expect(worldsPerMachine(machineOf(tiny.machine), huge, 1)).toBe(0);
    const unit = unitCost(huge, 180, tiny);
    expect(unit.machine).toBe(Infinity);
    expect(marginOf(180, unit)).toBeNull();
    const catalog = SIZE_CATALOG as SizeSpec[];
    const index = catalog.findIndex((size) => size.key === 'large');
    const kept = catalog[index] as SizeSpec;
    catalog[index] = huge;
    try {
      const fleet = fleetProfit(
        { large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 } },
        tiny,
      );
      expect(fleet.machines).toBeNull();
      expect(fleet.machineCost).toBeNull();
      expect(fleet.profit).toBeNull();
      expect(fleet.share).toBeNull();
    } finally {
      catalog[index] = kept;
    }
  });

  it('incremental copies hold 1.05 copies instead of 21', () => {
    const inc = unitCost(spec('large'), 180, { ...a, copies: 'incremental' });
    expect(inc.copies).toBeCloseTo((8 * 1.05 * s3EurPerGbMonth()) / 30, 10);
  });

  it('Stripe takes 1.25 € of a 20 € top-up as the seller, 0.73 € when Numen sells', () => {
    expect(stripeFee(20, 'stripe')).toBeCloseTo(1.25, 10);
    expect(stripeFee(20, 'numen')).toBeCloseTo(0.73, 10);
    // The invoice fee stops at $2.
    expect(stripeFee(1000, 'numen')).toBeCloseTo(15 + 0.25 + 2 / 1.1181 + 5, 10);
  });

  it('support minutes come from the calculator for medium and large, from the catalog otherwise', () => {
    const custom: Assumptions = { ...a, supportMinutes: { medium: 7, large: 9 } };
    expect(supportMinutesOf(spec('medium'), custom)).toBe(7);
    expect(supportMinutesOf(spec('large'), custom)).toBe(9);
    expect(supportMinutesOf(spec('2g'), custom)).toBe(5);
  });

  it('a free price has no margin', () => {
    expect(marginOf(0, unitCost(spec('small'), 0, a))).toBeNull();
  });

  it('an unknown machine reads as the VPS-3', () => {
    expect(machineOf('VPS-9').key).toBe('VPS-3');
  });
});

describe('money', () => {
  it('reads euros as whole cents, with a comma or a point', () => {
    expect(['0,20', '0.2', ' 12 ', '1,5', '0', '9999999,99'].map(parseEuros)).toEqual([
      20, 20, 1200, 150, 0, 999999999,
    ]);
  });

  it('refuses more than two decimals, negatives, words and nothing', () => {
    expect(['0,205', '0.205', '-1', 'abc', '', ',5', '5,', '1e3', 'NaN'].map(parseEuros)).toEqual(
      Array(9).fill(null),
    );
  });

  it('reads whole days and lists of euros', () => {
    expect(parseWhole(' 30 ')).toBe(30);
    expect(parseWhole('3.5')).toBeNull();
    expect(parseEurosList('10 · 20 · 50 · 100')).toEqual([1000, 2000, 5000, 10000]);
    expect(parseEurosList('10, 20; 50/100,5')).toEqual([1000, 2000, 5000, 10050]);
    expect(parseEurosList(' ')).toBeNull();
    expect(parseEurosList('10 · x')).toBeNull();
  });

  it('writes cents back as a person types them', () => {
    expect(centsText(20, ',')).toBe('0,20');
    expect(centsText(1000, '.', true)).toBe('10');
    expect(centsText(1050, ',', true)).toBe('10,50');
  });

  it('knows each language’s decimal mark, and falls back to a point', () => {
    expect(decimalMark('es')).toBe(',');
    expect(decimalMark('en')).toBe('.');
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (this: unknown) {
      return {
        formatToParts: () => [{ type: 'integer', value: '15' }],
      } as unknown as Intl.NumberFormat;
    } as unknown as typeof Intl.NumberFormat);
    expect(decimalMark('xx')).toBe('.');
  });

  it('adds 21 % VAT rounding half up, in cents', () => {
    expect([20, 75, 180, 2, 5, 10, 60, 50].map(grossCents)).toEqual([
      24, 91, 218, 2, 6, 12, 73, 61,
    ]);
  });

  it('formats money, shares and numbers in the page’s language', () => {
    expect(spaced(formatMoney(0.2, 'es'))).toBe('0,20 €');
    expect(spaced(formatCents(18000, 'es'))).toBe('180,00 €');
    expect(formatMoney(0.057, 'en', 3)).toBe('€0.057');
    expect(spaced(formatShare(0.645, 'es'))).toBe('65 %');
    expect(formatNumber(0.25, 'es')).toBe('0,25');
  });

  it('says how long a top-up lasts a world running, none when running is free', () => {
    expect([20, 75, 180].map((cents) => daysOfTopup(1000, cents))).toEqual([41, 11, 4]);
    expect(daysOfTopup(1000, 0)).toBeNull();
  });
});

describe('days, dates and words', () => {
  it('reads real days only', () => {
    expect(isDay('2026-10-14')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-13-45')).toBe(false);
    expect(isDay('14/10/2026')).toBe(false);
  });

  it('moves days in UTC', () => {
    expect(addDays('2026-10-13', 30)).toBe('2026-11-12');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(utcDay(new Date('2026-10-13T23:59:59.999Z'))).toBe('2026-10-13');
  });

  it('writes a day long, its start on the reader’s clock, and an instant', () => {
    expect(formatDay('2026-10-14', 'es')).toBe('14 de octubre de 2026');
    expect(spaced(formatDayStart('2026-10-14', 'es', 'Europe/Madrid'))).toBe(
      '14 de octubre de 2026 a las 2:00',
    );
    expect(formatDayStart('2026-10-14', 'en')).toContain('2026');
    expect(spaced(formatInstant('2026-10-13T00:00:00.000Z', 'es', 'UTC'))).toBe(
      '13 oct 2026, 0:00',
    );
    expect(formatInstant('2026-10-13T00:00:00.000Z', 'en')).toContain('2026');
    expect(formatInstant('not a time', 'es')).toBe('not a time');
  });

  it('shortens wallets, tells a wallet from the seed, fills blanks', () => {
    expect(shortWallet('0x42e6bd5c8c74f8c7c35f8a1ba3bbf02e7df0ca26')).toBe('0x42e6…ca26');
    expect(shortWallet('seed')).toBe('seed');
    expect(isWallet('0x42e6bd5c8c74f8c7c35f8a1ba3bbf02e7df0ca26')).toBe(true);
    expect(isWallet('seed: example figures (DBT-026)')).toBe(false);
    expect(fill('Versión {n} desde el {d}{x}', { n: 2, d: 'hoy' })).toBe(
      'Versión 2 desde el hoy{x}',
    );
  });
});

describe('the tariff’s rules', () => {
  const v2 = version({ id: 2, startsOn: '2026-10-20' });
  const v3 = version({ id: 3, startsOn: '2026-10-20' });
  const v4 = version({ id: 4, startsOn: '2026-11-01' });

  it('finds the version in force on a day: latest start, then greatest id', () => {
    expect(versionFor([SEED, v2, v3, v4], '2026-10-12')).toBeUndefined();
    expect(versionFor([SEED, v2, v3, v4], '2026-10-13')?.id).toBe(1);
    expect(versionFor([SEED, v3, v2, v4], '2026-10-25')?.id).toBe(3);
    expect(versionFor([v4, SEED], '2026-12-01')?.id).toBe(4);
  });

  it('a rise is any price above the one it replaces; a new size is not one', () => {
    const next = (over: Partial<DeskVersion>): DeskVersion => ({ ...SEED, ...over });
    expect(
      isRise(next({ sizes: { '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } } }), SEED),
    ).toBe(true);
    expect(
      isRise(next({ sizes: { '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 6 } } }), SEED),
    ).toBe(true);
    expect(isRise(next({ rules: { ...RULES, eventBoostCentsPerDay: 200 } }), SEED)).toBe(true);
    expect(
      isRise(
        next({
          sizes: {
            '2g': { runningCentsPerDay: 50, stoppedCentsPerDay: 5 },
            small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
          },
        }),
        SEED,
      ),
    ).toBe(false);
  });

  it('says how each version stands today, and lists the ones to come', () => {
    const view: DeskView = {
      today: '2026-10-14',
      inForceId: 1,
      versions: [SEED, v2, v3, v4, version({ id: 5, startsOn: '2026-10-14' })],
      sizesInUse: [],
    };
    // A version that started but is not in force is earlier (5 is the clock's oddity here).
    expect(view.versions.map((each) => versionState(view, each))).toEqual([
      'in-force',
      'replaced',
      'scheduled',
      'scheduled',
      'earlier',
    ]);
    expect(scheduledVersions(view).map((each) => each.id)).toEqual([3, 4]);
    expect(scheduledVersions({ ...view, versions: [v4, v3] }).map((each) => each.id)).toEqual([
      3, 4,
    ]);
    expect(newestFirst(view.versions).map((each) => each.id)).toEqual([5, 4, 3, 2, 1]);
  });
});

describe('reading the room’s own answers', () => {
  const view: DeskView = { today: '2026-10-13', inForceId: 1, versions: [SEED], sizesInUse: [] };

  it('reads the GET answer, with or without a wallet', () => {
    expect(readAnswer({ wallet: '0xabc', desk: view })).toEqual({ wallet: '0xabc', desk: view });
    expect(readAnswer({ desk: { ...view, inForceId: null } })?.wallet).toBeNull();
  });

  it('refuses anything else', () => {
    for (const bad of [
      null,
      [],
      { desk: [] },
      { desk: { ...view, today: 1 } },
      { desk: { ...view, versions: {} } },
      { desk: { ...view, sizesInUse: null } },
      { desk: { ...view, inForceId: '1' } },
    ]) {
      expect(readAnswer(bad)).toBeNull();
    }
  });

  it('reads a check and a schedule, and nothing else', () => {
    const check = {
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [],
    };
    expect(readCheckAnswer({ check })).toEqual(check);
    expect(readCheckAnswer({ check: { ...check, problems: 'none' } })).toBeNull();
    expect(readCheckAnswer({ check: null })).toBeNull();
    expect(readCheckAnswer('check')).toBeNull();
    expect(readScheduleAnswer({ schedule: { ok: true, version: SEED } })).toEqual({
      ok: true,
      version: SEED,
    });
    expect(readScheduleAnswer({ schedule: { ok: false, problems: ['x'] } })).toEqual({
      ok: false,
      problems: ['x'],
    });
    expect(readScheduleAnswer({ schedule: { ok: true } })).toBeNull();
    expect(readScheduleAnswer({ schedule: { ok: false } })).toBeNull();
    expect(readScheduleAnswer({ schedule: 1 })).toBeNull();
    expect(readScheduleAnswer(undefined)).toBeNull();
  });
});

describe('the assumptions a version carries', () => {
  it('a snapshot is a plain copy with the figures’ day', () => {
    const snap = snapshotOf(DEFAULT_ASSUMPTIONS);
    expect(snap['machine']).toBe('VPS-3');
    expect(snap['readOn']).toBe('2026-10-13');
    expect(assumptionsFrom(snap, { ...DEFAULT_ASSUMPTIONS, machine: 'VPS-4' })).toEqual(
      DEFAULT_ASSUMPTIONS,
    );
  });

  it('reads every field that reads well, and keeps the base for the rest', () => {
    const stored = {
      machine: 'VPS-4',
      occupancyPct: 80,
      cpuPromised: 2,
      copies: 'incremental',
      topupEur: 50,
      seller: 'numen',
      teamHourEur: 40,
      supportMinutes: { medium: 6, large: 20 },
      fixedEurMonth: 25,
      extrasEurMonth: 10,
      fleet: { small: { worlds: 5, runningPct: 50 }, medium: 'x' },
    };
    const read = assumptionsFrom(stored, DEFAULT_ASSUMPTIONS);
    expect(read).toEqual({
      ...stored,
      fleet: {
        small: { worlds: 5, runningPct: 50 },
        medium: { worlds: 10, runningPct: 100 },
        large: { worlds: 3, runningPct: 100 },
      },
    });
  });

  it('ignores what does not read', () => {
    const stored = {
      machine: 'VPS-9',
      occupancyPct: 5,
      cpuPromised: 'x',
      copies: 'weekly',
      topupEur: 30,
      seller: 'paypal',
      teamHourEur: -1,
      supportMinutes: 'none',
      fixedEurMonth: Infinity,
      extrasEurMonth: null,
      fleet: { small: { worlds: 2.5, runningPct: 150 } },
    };
    expect(assumptionsFrom(stored, DEFAULT_ASSUMPTIONS)).toEqual(DEFAULT_ASSUMPTIONS);
    expect(assumptionsFrom(['x'], DEFAULT_ASSUMPTIONS)).toBe(DEFAULT_ASSUMPTIONS);
    expect(assumptionsFrom({ fleet: [] }, { ...DEFAULT_ASSUMPTIONS, fleet: {} }).fleet).toEqual({
      small: { worlds: 0, runningPct: 100 },
      medium: { worlds: 0, runningPct: 100 },
      large: { worlds: 0, runningPct: 100 },
    });
  });
});

describe('the draft', () => {
  const opening = formFrom(SEED, ',', '2026-10-14', '', true);

  it('opens from the version in force plus the catalog’s sizes at their starting prices', () => {
    expect(Object.keys(opening.sizes)).toEqual(['small', 'medium', 'large', '2g']);
    expect(opening.sizes).toEqual({
      small: { running: '0,20', stopped: '0,02', included: true },
      medium: { running: '0,75', stopped: '0,05', included: true },
      large: { running: '1,80', stopped: '0,10', included: true },
      '2g': { running: '0,60', stopped: '0,05', included: true },
    });
    expect(opening.rules).toEqual({
      eventBoostCentsPerDay: '1,80',
      minTopupCents: '10,00',
      quickTopupsCents: '10 · 20 · 50 · 100',
      minBalanceDaysRunning: '2',
      keepDaysAtZero: '90',
      noticeDaysForRise: '30',
      lowBalanceDaysDefault: '3',
    });
    const { draft } = draftFrom(opening, DEFAULT_ASSUMPTIONS);
    expect(draft?.sizes).toEqual({
      small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
      medium: { runningCentsPerDay: 75, stoppedCentsPerDay: 5 },
      large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 },
      '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 },
    });
    expect(draft?.rules).toEqual(RULES);
    expect(draft?.basis?.note).toBe('');
    expect(draft?.basis?.assumptions?.['occupancyPct']).toBe(50);
  });

  it('a version taken to the calculator brings only its own sizes into the tariff', () => {
    const taken = formFrom(SEED, '.', '2026-10-14', 'why', false);
    expect(Object.values(taken.sizes).map((size) => size.included)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(taken.sizes['small']?.running).toBe('0.20');
    expect(taken.note).toBe('why');
  });

  it('with no version at all, starts from the seed’s rules; a size with no start price starts empty', () => {
    const blank = formFrom(null, ',', '2026-10-14', '', true);
    expect(blank.sizes['2g']).toEqual({ running: '', stopped: '', included: false });
    expect(blank.rules.noticeDaysForRise).toBe('30');
    expect(RULE_KEYS.map((key) => ruleText(key, DEFAULT_RULES, '.'))).toEqual([
      '1.80',
      '10.00',
      '10 · 20 · 50 · 100',
      '2',
      '90',
      '30',
      '3',
    ]);
  });

  it('keeps a size the catalog does not know, after the catalog’s', () => {
    const odd = formFrom(
      version({
        id: 2,
        startsOn: '2026-10-20',
        sizes: { xl: { runningCentsPerDay: 300, stoppedCentsPerDay: 20 } },
      }),
      ',',
      '2026-10-21',
      '',
      true,
    );
    expect(Object.keys(odd.sizes)).toEqual(['small', 'medium', 'large', '2g', 'xl']);
    expect(sizeOrder(['zz', 'large', 'aa', 'small'])).toEqual(['small', 'large', 'aa', 'zz']);
  });

  it('a size still charged to worlds stays in the tariff', () => {
    const taken = formFrom(SEED, ',', '2026-10-14', '', false);
    expect(withSizesInUse(taken, [])).toBe(taken);
    const kept = withSizesInUse(taken, ['small', 'xl']);
    expect(kept.sizes['small']).toEqual({ running: '0,20', stopped: '0,02', included: true });
    expect(kept.sizes['xl']).toEqual({ running: '', stopped: '', included: true });
    expect(withSizesInUse(kept, ['small'])).toBe(kept);
  });

  it('marks what does not read, and makes no draft of it', () => {
    const broken: DraftForm = {
      ...opening,
      sizes: {
        ...opening.sizes,
        small: { running: '0,205', stopped: '0,02', included: true },
        medium: { running: '0,75', stopped: '-1', included: true },
        large: { running: 'x', stopped: 'y', included: false },
      },
      rules: { ...opening.rules, noticeDaysForRise: 'treinta', quickTopupsCents: '' },
      startsOn: '2026-02-30',
    };
    const { draft, problems } = draftFrom(broken, DEFAULT_ASSUMPTIONS);
    expect(draft).toBeNull();
    expect(problems.sizes).toEqual({
      small: { running: true, stopped: false },
      medium: { running: false, stopped: true },
    });
    expect(problems.rules).toEqual(['quickTopupsCents', 'noticeDaysForRise']);
    expect(problems.startsOn).toBe(true);
    expect(problems.empty).toBe(false);
  });

  it('a tariff with no size is no draft', () => {
    const none: DraftForm = {
      ...opening,
      sizes: Object.fromEntries(
        Object.entries(opening.sizes).map(([key, size]) => [key, { ...size, included: false }]),
      ),
    };
    const { draft, problems } = draftFrom(none, DEFAULT_ASSUMPTIONS);
    expect(draft).toBeNull();
    expect(problems.empty).toBe(true);
  });

  it('trims the why it carries', () => {
    const { draft } = draftFrom({ ...opening, note: '  porque sí  ' }, DEFAULT_ASSUMPTIONS);
    expect(draft?.basis?.note).toBe('porque sí');
  });
});

describe('what a draft changes', () => {
  it('lists the sizes and rules that differ from the version replaced', () => {
    const draft = {
      sizes: {
        small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
        '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 },
      },
      rules: { ...RULES, noticeDaysForRise: 15, quickTopupsCents: [1000, 2000] },
    };
    const before = version({
      id: 1,
      startsOn: '2026-10-13',
      sizes: {
        '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 },
        large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 },
      },
    });
    const changes = changesFrom(draft, before);
    expect(changes.sizes).toEqual([
      { key: 'small', before: null, after: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 } },
      { key: 'large', before: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 }, after: null },
      {
        key: '2g',
        before: { runningCentsPerDay: 60, stoppedCentsPerDay: 5 },
        after: { runningCentsPerDay: 70, stoppedCentsPerDay: 5 },
      },
    ]);
    expect(changes.rules.map((change) => [change.key, change.before, change.after])).toEqual([
      ['quickTopupsCents', [1000, 2000, 5000, 10000], [1000, 2000]],
      ['noticeDaysForRise', 30, 15],
    ]);
    expect(nothingChanges(changes)).toBe(false);
  });

  it('nothing changes when prices and rules are the same', () => {
    expect(nothingChanges(changesFrom({ sizes: SEED.sizes, rules: RULES }, SEED))).toBe(true);
  });

  it('against no version, everything is new', () => {
    const changes = changesFrom({ sizes: SEED.sizes, rules: RULES }, null);
    expect(changes.sizes).toHaveLength(1);
    expect(changes.rules).toHaveLength(RULE_KEYS.length);
    expect(changes.rules.every((change) => change.before === null)).toBe(true);
  });
});

describe('the till’s problems, read back', () => {
  it('recognises each problem the room words', () => {
    expect(
      readProblem("a rise needs 30 days' notice: it starts on 2026-11-12 at the earliest"),
    ).toEqual({
      kind: 'notice',
      days: 30,
      day: '2026-11-12',
    });
    expect(
      readProblem('a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest'),
    ).toEqual({
      kind: 'tomorrow',
      day: '2026-10-14',
    });
    expect(
      readProblem('size 2g is still charged to worlds: a version must keep pricing it'),
    ).toEqual({
      kind: 'in-use',
      size: '2g',
    });
    expect(readProblem(BASIS_PROBLEM)).toEqual({ kind: 'basis' });
    expect(readProblem(BY_PROBLEM)).toEqual({ kind: 'by' });
    expect(readProblem(MEANWHILE_PROBLEM)).toEqual({ kind: 'meanwhile' });
    expect(readProblem('sizes must price at least one size')).toEqual({
      kind: 'other',
      text: 'sizes must price at least one size',
    });
  });
});
