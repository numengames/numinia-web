import { describe, expect, it } from 'vitest';
import {
  MINUTES_PER_PRICED_DAY,
  SEED_TARIFF,
  earliestStart,
  isRise,
  parseRules,
  parseSizes,
  scheduleProblems,
  tariffProblems,
  versionFor,
  worldDayCostCents,
  type TariffVersion,
} from '../src/lib/tariff';
import { MINUTES_PER_DAY } from '../src/lib/utc-day';

function version(
  overrides: Partial<TariffVersion> & Pick<TariffVersion, 'id' | 'startsOn'>,
): TariffVersion {
  return { ...SEED_TARIFF, ...overrides };
}

function priced(
  running: number,
  stopped: number,
  boost = 180,
): Pick<TariffVersion, 'sizes' | 'rules'> {
  return {
    sizes: { '2g': { runningCentsPerDay: running, stoppedCentsPerDay: stopped } },
    rules: { ...SEED_TARIFF.rules, eventBoostCentsPerDay: boost },
  };
}

describe('the seed version', () => {
  it("carries the design's example figures (DBT-026)", () => {
    expect(SEED_TARIFF).toEqual({
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
    });
    expect(tariffProblems(SEED_TARIFF)).toEqual([]);
  });
});

describe('what a world-day costs', () => {
  it('is the daily price per minute of a 1440-minute day, rounded half up once', () => {
    const price = SEED_TARIFF.sizes['2g'];
    expect(price).toBeDefined();
    if (price === undefined) return;
    expect(MINUTES_PER_PRICED_DAY).toBe(1440);
    // A priced day is a UTC day: the same 1440 minutes the close allows a reading.
    expect(MINUTES_PER_PRICED_DAY).toBe(MINUTES_PER_DAY);
    expect(worldDayCostCents(price, 1440, 0)).toBe(60);
    expect(worldDayCostCents(price, 23 * 60, 0)).toBe(58); // 23 hours running: 57.5 → 58
    expect(worldDayCostCents(price, 11 * 60, 0)).toBe(28); // 11 hours running: 27.5 → 28
    expect(worldDayCostCents(price, 0, 1440)).toBe(5);
    expect(worldDayCostCents(price, 720, 720)).toBe(33); // 32.5 → 33
    expect(worldDayCostCents(price, 0, 0)).toBe(0);
    // Kept at zero, a stopped minute costs nothing.
    expect(worldDayCostCents({ ...price, stoppedCentsPerDay: 0 }, 30, 1410)).toBe(1); // 1.25 → 1
  });
});

describe('the version in force on a day', () => {
  const v1 = version({ id: 1, startsOn: '2026-10-13' });
  const v2 = version({ id: 2, startsOn: '2026-12-01' });
  const v3 = version({ id: 3, startsOn: '2026-12-01' });

  it('is the greatest start on or before the day', () => {
    expect(versionFor([v2, v1], '2026-10-12')).toBeUndefined();
    expect(versionFor([v2, v1], '2026-10-13')).toBe(v1);
    expect(versionFor([v2, v1], '2026-11-30')).toBe(v1);
    expect(versionFor([v2, v1], '2026-12-01')).toBe(v2);
    expect(versionFor([v1, v2], '2027-06-01')).toBe(v2);
  });

  it('breaks a tie by the greatest id, so scheduling again on the same start supersedes', () => {
    expect(versionFor([v1, v3, v2], '2026-12-01')).toBe(v3);
    expect(versionFor([v3, v2, v1], '2026-12-02')).toBe(v3);
  });
});

describe('a rise', () => {
  it('is any price above the same price before', () => {
    expect(isRise(priced(61, 5), priced(60, 5))).toBe(true);
    expect(isRise(priced(60, 6), priced(60, 5))).toBe(true);
    expect(isRise(priced(60, 5, 181), priced(60, 5))).toBe(true);
  });

  it('is not a cut, an equal price, or a size that was not priced before', () => {
    expect(isRise(priced(50, 5), priced(60, 5))).toBe(false);
    expect(isRise(priced(60, 5), priced(60, 5))).toBe(false);
    const newSize = {
      sizes: { '8g': { runningCentsPerDay: 200, stoppedCentsPerDay: 10 } },
      rules: SEED_TARIFF.rules,
    };
    expect(isRise(newSize, priced(60, 5))).toBe(false);
  });

  it('starts no earlier than the scheduling date plus the notice', () => {
    expect(earliestStart('2026-10-13', 30)).toBe('2026-11-12');
    expect(earliestStart('2026-10-13', 0)).toBe('2026-10-13');
  });
});

describe('scheduling a version', () => {
  const versions = [SEED_TARIFF];

  it('takes a cut from the next day', () => {
    const cut = version({ id: 2, startsOn: '2026-10-21', ...priced(50, 5) });
    expect(scheduleProblems(versions, cut, '2026-10-20')).toEqual([]);
  });

  it('refuses a start on the scheduling day or before it', () => {
    const cut = version({ id: 2, startsOn: '2026-10-20', ...priced(50, 5) });
    expect(scheduleProblems(versions, cut, '2026-10-20')).toEqual([
      'a version scheduled on 2026-10-20 starts on 2026-10-21 at the earliest',
    ]);
  });

  it('refuses a rise before the notice, and takes it on the first day the notice allows', () => {
    const early = version({ id: 2, startsOn: '2026-11-18', ...priced(70, 5) });
    expect(scheduleProblems(versions, early, '2026-10-20')).toEqual([
      "a rise needs 30 days' notice: it starts on 2026-11-19 at the earliest",
    ]);
    const onTime = version({ id: 2, startsOn: '2026-11-19', ...priced(70, 5) });
    expect(scheduleProblems(versions, onTime, '2026-10-20')).toEqual([]);
  });

  it('counts the strictest notice: a cut that lowers the notice does not shorten it', () => {
    const lowerNotice = version({
      id: 2,
      startsOn: '2026-10-25',
      ...priced(50, 5),
      rules: { ...SEED_TARIFF.rules, noticeDaysForRise: 0 },
    });
    expect(scheduleProblems(versions, lowerNotice, '2026-10-20')).toEqual([]);
    const quickRise = version({ id: 3, startsOn: '2026-10-26', ...priced(70, 5) });
    expect(scheduleProblems([...versions, lowerNotice], quickRise, '2026-10-20')).toEqual([
      "a rise needs 30 days' notice: it starts on 2026-11-19 at the earliest",
    ]);
  });

  it('compares a rise with the version it replaces, also when none is in force yet', () => {
    const future = version({ id: 1, startsOn: '2026-12-01' });
    const higher = version({ id: 2, startsOn: '2026-12-02', ...priced(61, 5) });
    expect(scheduleProblems([future], higher, '2026-11-15')).toEqual([
      "a rise needs 30 days' notice: it starts on 2026-12-15 at the earliest",
    ]);
    const first = version({ id: 1, startsOn: '2026-10-14' });
    expect(scheduleProblems([], first, '2026-10-13')).toEqual([]);
  });

  it('refuses an id that does not grow, and a malformed version before anything else', () => {
    const sameId = version({ id: 1, startsOn: '2026-10-21', ...priced(50, 5) });
    expect(scheduleProblems(versions, sameId, '2026-10-20')).toEqual([
      "id 1 must be greater than every scheduled version's id",
    ]);
    const malformed = version({ id: 0, startsOn: '2026-10-21' });
    expect(scheduleProblems(versions, malformed, '2026-10-20')).toEqual([
      'id must be a whole number ≥ 1',
    ]);
  });
});

describe('a well-formed version', () => {
  it('names each fault of its header', () => {
    expect(
      tariffProblems({
        ...SEED_TARIFF,
        id: 1.5,
        startsOn: '2026-02-30',
        createdAt: 'today',
        createdBy: ' ',
      }),
    ).toEqual([
      'id must be a whole number ≥ 1',
      'startsOn must be a YYYY-MM-DD day',
      'createdAt must be an ISO instant',
      'createdBy is required',
    ]);
  });

  it('prices at least one well-named size with whole cents', () => {
    const problemsOf = (sizes: unknown): string[] =>
      tariffProblems({ ...SEED_TARIFF, sizes: sizes as TariffVersion['sizes'] });
    expect(problemsOf([])).toEqual(['sizes must be an object']);
    expect(problemsOf(null)).toEqual(['sizes must be an object']);
    expect(problemsOf({})).toEqual(['sizes must price at least one size']);
    expect(problemsOf({ '2 GB': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 } })).toEqual([
      '"2 GB" is not a size name',
    ]);
    const malformed = 'size 2g: needs runningCentsPerDay and stoppedCentsPerDay, whole cents ≥ 0';
    expect(problemsOf({ '2g': 60 })).toEqual([malformed]);
    expect(problemsOf({ '2g': { runningCentsPerDay: 60 } })).toEqual([malformed]);
    expect(problemsOf({ '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5, x: 1 } })).toEqual([
      malformed,
    ]);
    expect(problemsOf({ '2g': { runningCentsPerDay: 0.6, stoppedCentsPerDay: 5 } })).toEqual([
      malformed,
    ]);
    expect(problemsOf({ '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: -5 } })).toEqual([
      malformed,
    ]);
  });

  it('has every rule, whole, and quick top-ups ascending from the minimum', () => {
    const problemsOf = (rules: unknown): string[] =>
      tariffProblems({ ...SEED_TARIFF, rules: rules as TariffVersion['rules'] });
    const base: Record<string, unknown> = { ...SEED_TARIFF.rules };
    const quickFault = 'quickTopupsCents must be ascending whole cents, none below minTopupCents';
    expect(problemsOf('rules')).toEqual(['rules must be an object']);
    expect(problemsOf({ ...base, refunds: 'on request' })).toEqual(['unknown rules: refunds']);
    expect(problemsOf({ ...base, keepDaysAtZero: 0 })).toEqual([
      'keepDaysAtZero must be a whole number ≥ 1',
    ]);
    expect(problemsOf({ ...base, noticeDaysForRise: -1 })).toEqual([
      'noticeDaysForRise must be a whole number ≥ 0',
    ]);
    expect(problemsOf({ ...base, eventBoostCentsPerDay: '180' })).toEqual([
      'eventBoostCentsPerDay must be a whole number ≥ 0',
    ]);
    expect(problemsOf({ ...base, quickTopupsCents: 'many' })).toEqual([quickFault]);
    expect(problemsOf({ ...base, quickTopupsCents: [] })).toEqual([quickFault]);
    expect(problemsOf({ ...base, quickTopupsCents: [1000, 1000] })).toEqual([quickFault]);
    expect(problemsOf({ ...base, quickTopupsCents: [500, 1000] })).toEqual([quickFault]);
    expect(problemsOf({ ...base, quickTopupsCents: [1000, 20.5] })).toEqual([quickFault]);
    // A broken minimum is named once; the quick amounts are then held to zero.
    expect(problemsOf({ ...base, minTopupCents: -1 })).toEqual([
      'minTopupCents must be a whole number ≥ 0',
    ]);
  });
});

describe('reading a version from the database', () => {
  it('turns its JSON columns back into prices and rules', () => {
    expect(parseSizes(JSON.parse(JSON.stringify(SEED_TARIFF.sizes)))).toEqual(SEED_TARIFF.sizes);
    expect(parseRules(JSON.parse(JSON.stringify(SEED_TARIFF.rules)))).toEqual(SEED_TARIFF.rules);
  });

  it('throws on anything malformed rather than charging from it', () => {
    expect(() => parseSizes({})).toThrow(/tariff sizes: sizes must price at least one size/);
    expect(() => parseRules([])).toThrow(/tariff rules: rules must be an object/);
    expect(() => parseRules({ ...SEED_TARIFF.rules, keepDaysAtZero: 0 })).toThrow(
      /keepDaysAtZero must be a whole number ≥ 1/,
    );
  });
});
