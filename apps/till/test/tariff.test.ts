import { describe, expect, it } from 'vitest';
import {
  MINUTES_PER_PRICED_DAY,
  SEED_TARIFF,
  basisProblems,
  draftCheck,
  earliestStart,
  isRise,
  missingSizes,
  nextVersionId,
  parseBasis,
  parseRules,
  parseSizes,
  readDraft,
  scheduleProblems,
  tariffProblems,
  versionFor,
  worldDayCostCents,
  type DeskDraft,
  type TariffBasis,
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
      basis: null,
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

  it('turns its basis back into the note and assumptions, or fails closed', () => {
    const basis = { note: 'three sizes', assumptions: { occupancy: 0.5, fleet: [20, 10, 3] } };
    expect(parseBasis(JSON.parse(JSON.stringify(basis)))).toEqual(basis);
    expect(parseBasis(null)).toBeNull();
    expect(() => parseBasis({ why: 'no note' })).toThrow(`tariff basis: ${BASIS_PROBLEM}`);
  });
});

const BASIS_PROBLEM =
  'basis must be a note of at most 500 characters and an object of assumptions, 16 KB in all';
const DRAFT_PROBLEM = 'a draft must be an object of startsOn, sizes, rules and basis';

/** The SPEC's example draft (MIS-184): small, medium and large added, 2g kept at 60/5. */
const THREE_SIZES = {
  '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 },
  small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
  medium: { runningCentsPerDay: 75, stoppedCentsPerDay: 5 },
  large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 },
};

function deskDraft(overrides: Partial<DeskDraft> = {}): DeskDraft {
  return {
    startsOn: '2026-10-14',
    sizes: THREE_SIZES,
    rules: SEED_TARIFF.rules,
    basis: null,
    ...overrides,
  };
}

/** `levels` objects, one inside the other, around a 1. */
function nested(levels: number): unknown {
  let value: unknown = 1;
  for (let level = 0; level < levels; level += 1) value = { a: value };
  return value;
}

describe('why a version was published (MIS-184)', () => {
  it('is null, or a note of at most 500 characters with assumptions of plain JSON', () => {
    const accepted: unknown[] = [
      null,
      { note: '' },
      { note: 'x'.repeat(500) },
      { note: 'three sizes', assumptions: {} },
      {
        note: 'the calculator’s defaults',
        assumptions: { machine: 'VPS-3', occupancy: 0.5, fleet: [20, 10, 3], full: true, ai: null },
      },
      { assumptions: { occupancy: 0.5 }, note: 'keys in any order' },
      Object.assign(Object.create(null) as object, { note: 'made with no prototype' }),
      { note: 'nesting 32 levels deep', assumptions: nested(31) },
    ];
    for (const basis of accepted) expect(basisProblems(basis)).toEqual([]);
  });

  it('refuses anything else with one sentence, and never throws', () => {
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    let laughs: unknown = 'lol';
    for (let level = 0; level < 20; level += 1) laughs = Array.from({ length: 10 }, () => laughs);
    const holes: unknown[] = [];
    holes[2] = 3;
    const labelled = Object.assign([1, 2], { label: 'not an index' });
    const refused: unknown[] = [
      undefined,
      'a note',
      ['a note'],
      {},
      { note: 5 },
      { note: 'x'.repeat(501) },
      { note: 'why', author: 'me' },
      { note: 'why', assumptions: [] },
      { note: 'why', assumptions: 'none' },
      { note: 'why', assumptions: null },
      { note: 'why', assumptions: undefined },
      { note: 'why', assumptions: new Map([['occupancy', 0.5]]) },
      { note: 'why', assumptions: { at: new Date('2026-10-13T00:00:00.000Z') } },
      { note: 'why', assumptions: { occupancy: Number.NaN } },
      { note: 'why', assumptions: { occupancy: Number.POSITIVE_INFINITY } },
      { note: 'why', assumptions: { occupancy: undefined } },
      { note: 'why', assumptions: { occupancy: () => 0.5 } },
      { note: 'why', assumptions: { occupancy: 5n } },
      { note: 'why', assumptions: { list: holes } },
      { note: 'why', assumptions: { list: labelled } },
      { note: 'why', assumptions: cycle },
      { note: 'why', assumptions: { laughs } },
      { note: 'why', assumptions: nested(32) },
      { note: 'why', assumptions: { list: Array.from({ length: 16_385 }, () => 0) } },
      { note: 'why', assumptions: { list: Array.from({ length: 16_000 }, () => 0) } },
      { note: 'why', assumptions: { text: 'x'.repeat(16_384) } },
    ];
    for (const basis of refused) expect(basisProblems(basis)).toEqual([BASIS_PROBLEM]);
  });

  it('counts its 16 KB in bytes of UTF-8, never fewer than the characters its column counts', () => {
    const basis = (text: string): TariffBasis => ({ note: '', assumptions: { text } });
    const overhead = JSON.stringify(basis('')).length;
    expect(basisProblems(basis('x'.repeat(16_384 - overhead)))).toEqual([]);
    expect(basisProblems(basis('x'.repeat(16_384 - overhead + 1)))).toEqual([BASIS_PROBLEM]);
    // «é» takes two bytes: the column alone would take this one, the desk does not.
    const accented = basis('é'.repeat(Math.floor((16_384 - overhead) / 2) + 1));
    expect(JSON.stringify(accented).length).toBeLessThanOrEqual(16_384);
    expect(basisProblems(accented)).toEqual([BASIS_PROBLEM]);
  });
});

describe('the sizes a new version must keep pricing (MIS-184)', () => {
  it('are those charged to worlds that the draft does not price, each once, sorted', () => {
    expect(missingSizes(THREE_SIZES, [])).toEqual([]);
    expect(missingSizes(THREE_SIZES, ['2g', 'large'])).toEqual([]);
    expect(
      missingSizes({ small: THREE_SIZES.small }, ['large', '2g', 'large', 'medium', 'small']),
    ).toEqual(['2g', 'large', 'medium']);
    // A name every object inherits is still not a price.
    expect(missingSizes(THREE_SIZES, ['constructor', '__proto__'])).toEqual([
      '__proto__',
      'constructor',
    ]);
  });

  it('come after the next id, one more than the greatest', () => {
    expect(nextVersionId([])).toBe(1);
    expect(nextVersionId([{ id: 1 }, { id: 7 }, { id: 3 }])).toBe(8);
  });
});

describe('a draft, read from whatever the caller sent (MIS-184)', () => {
  const sent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    startsOn: '2026-10-14',
    sizes: THREE_SIZES,
    rules: SEED_TARIFF.rules,
    basis: null,
    ...overrides,
  });

  it('is typed when it is shaped as a draft, its basis as given', () => {
    expect(readDraft(sent())).toEqual({ draft: deskDraft(), problems: [] });
    const basis = { note: 'three sizes', assumptions: { occupancy: 0.5 } };
    expect(readDraft(sent({ basis }))).toEqual({ draft: deskDraft({ basis }), problems: [] });
  });

  it('is answered with what is wrong when it is not, never with a throw', () => {
    for (const nothing of [undefined, null, 'draft', 42, [], [sent()], new Date(), new Map()]) {
      expect(readDraft(nothing)).toEqual({ draft: undefined, problems: [DRAFT_PROBLEM] });
    }
    expect(readDraft({}).problems).toEqual([
      'startsOn must be a YYYY-MM-DD day',
      'sizes must be an object',
      'rules must be an object',
      BASIS_PROBLEM,
    ]);
    const { basis: _basis, ...withoutBasis } = sent();
    expect(readDraft(withoutBasis).problems).toEqual([BASIS_PROBLEM]);
    expect(readDraft(sent({ action: 'schedule', by: '0x42' })).problems).toEqual([
      'unknown draft keys: action, by',
    ]);
    for (const startsOn of ['2026-02-30', '14/10/2026', 20261014]) {
      expect(readDraft(sent({ startsOn })).problems).toEqual(['startsOn must be a YYYY-MM-DD day']);
    }
    expect(
      readDraft(
        sent({ sizes: { ...THREE_SIZES, small: { ...THREE_SIZES.small, currency: 'EUR' } } }),
      ).problems,
    ).toEqual(['size small: needs runningCentsPerDay and stoppedCentsPerDay, whole cents ≥ 0']);
    expect(readDraft(sent({ sizes: { Small: THREE_SIZES.small } })).problems).toEqual([
      '"Small" is not a size name',
    ]);
    expect(
      readDraft(sent({ rules: { ...SEED_TARIFF.rules, refunds: 'on request' } })).problems,
    ).toEqual(['unknown rules: refunds']);
    const { noticeDaysForRise: _notice, ...withoutNotice } = SEED_TARIFF.rules;
    expect(readDraft(sent({ rules: withoutNotice })).problems).toEqual([
      'noticeDaysForRise must be a whole number ≥ 0',
    ]);
    expect(readDraft(sent({ basis: { note: 'x'.repeat(501) } })).problems).toEqual([BASIS_PROBLEM]);
    expect(readDraft(sent({ startsOn: 'soon', basis: 'why', extra: true }))).toEqual({
      draft: undefined,
      problems: ['unknown draft keys: extra', 'startsOn must be a YYYY-MM-DD day', BASIS_PROBLEM],
    });
  });
});

describe('the desk’s check of a draft (MIS-184)', () => {
  it('answers the example: three sizes added from tomorrow, then the same with 2g dearer', () => {
    expect(draftCheck([SEED_TARIFF], deskDraft(), '2026-10-13', [])).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [],
    });
    const dearer = deskDraft({
      sizes: { ...THREE_SIZES, '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } },
    });
    expect(draftCheck([SEED_TARIFF], dearer, '2026-10-13', [])).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: true,
      noticeDays: 30,
      earliestStart: '2026-11-12',
      problems: ["a rise needs 30 days' notice: it starts on 2026-11-12 at the earliest"],
    });
    // The rise's first allowed day.
    expect(
      draftCheck([SEED_TARIFF], { ...dearer, startsOn: '2026-11-12' }, '2026-10-13', []),
    ).toMatchObject({ isRise: true, earliestStart: '2026-11-12', problems: [] });
  });

  it('takes a cut from tomorrow, and nothing earlier', () => {
    const cut = deskDraft({ sizes: priced(50, 5).sizes });
    expect(draftCheck([SEED_TARIFF], cut, '2026-10-13', [])).toMatchObject({
      replacedId: 1,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [],
    });
    expect(
      draftCheck([SEED_TARIFF], { ...cut, startsOn: '2026-10-13' }, '2026-10-13', []),
    ).toMatchObject({
      replacedId: 1,
      problems: ['a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest'],
    });
    // Before every version nothing is replaced, so nothing rises.
    expect(draftCheck([SEED_TARIFF], { ...cut, startsOn: '2026-10-12' }, '2026-10-13', [])).toEqual(
      {
        today: '2026-10-13',
        nextId: 2,
        replacedId: null,
        isRise: false,
        noticeDays: 0,
        earliestStart: '2026-10-14',
        problems: ['a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest'],
      },
    );
  });

  it('counts the strictest notice: today’s, or the replaced version’s when it asks more', () => {
    // A cut from 1 November drops the notice to 0; a rise against it still needs today's 30 days.
    const lowerNotice = version({
      id: 2,
      startsOn: '2026-11-01',
      ...priced(50, 5),
      rules: { ...SEED_TARIFF.rules, noticeDaysForRise: 0 },
    });
    const rise = deskDraft({ startsOn: '2026-11-05', sizes: priced(55, 5).sizes });
    expect(draftCheck([SEED_TARIFF, lowerNotice], rise, '2026-10-13', [])).toEqual({
      today: '2026-10-13',
      nextId: 3,
      replacedId: 2,
      isRise: true,
      noticeDays: 30,
      earliestStart: '2026-11-12',
      problems: ["a rise needs 30 days' notice: it starts on 2026-11-12 at the earliest"],
    });
    // A version from 20 October asks 45 days: a rise against it waits 45.
    const longerNotice = version({
      id: 2,
      startsOn: '2026-10-20',
      rules: { ...SEED_TARIFF.rules, noticeDaysForRise: 45 },
    });
    const later = deskDraft({ startsOn: '2026-11-27', sizes: priced(61, 5).sizes });
    expect(draftCheck([SEED_TARIFF, longerNotice], later, '2026-10-13', [])).toMatchObject({
      replacedId: 2,
      isRise: true,
      noticeDays: 45,
      earliestStart: '2026-11-27',
      problems: [],
    });
  });

  it('dates a rise with no notice from tomorrow, and counts a dearer event boost as a rise', () => {
    const noNotice = { ...SEED_TARIFF, rules: { ...SEED_TARIFF.rules, noticeDaysForRise: 0 } };
    const dearer = deskDraft({ sizes: priced(70, 5).sizes, rules: noNotice.rules });
    expect(draftCheck([noNotice], dearer, '2026-10-13', [])).toMatchObject({
      isRise: true,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [],
    });
    const boost = deskDraft({ rules: { ...SEED_TARIFF.rules, eventBoostCentsPerDay: 200 } });
    expect(draftCheck([SEED_TARIFF], boost, '2026-10-13', [])).toMatchObject({
      isRise: true,
      noticeDays: 30,
      earliestStart: '2026-11-12',
    });
  });

  it('replaces a version scheduled for the same day, with the next id', () => {
    const scheduled = version({ id: 2, startsOn: '2026-11-01', ...priced(50, 5) });
    const again = deskDraft({ startsOn: '2026-11-01', sizes: priced(45, 5).sizes });
    expect(draftCheck([SEED_TARIFF, scheduled], again, '2026-10-13', [])).toMatchObject({
      nextId: 3,
      replacedId: 2,
      isRise: false,
      problems: [],
    });
  });

  it('refuses to stop pricing a size still charged to worlds', () => {
    const onlySmall = deskDraft({ sizes: { small: THREE_SIZES.small } });
    expect(draftCheck([SEED_TARIFF], onlySmall, '2026-10-13', ['2g', 'medium']).problems).toEqual([
      'size 2g is still charged to worlds: a version must keep pricing it',
      'size medium is still charged to worlds: a version must keep pricing it',
    ]);
    expect(draftCheck([SEED_TARIFF], deskDraft(), '2026-10-13', ['2g', 'small']).problems).toEqual(
      [],
    );
  });

  it('names every problem at once, of a typed draft too, and never throws', () => {
    const everything = deskDraft({
      startsOn: '2026-10-13',
      sizes: { small: THREE_SIZES.small },
      basis: { note: 'x'.repeat(501) },
    });
    expect(draftCheck([SEED_TARIFF], everything, '2026-10-13', ['2g']).problems).toEqual([
      'a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest',
      'size 2g is still charged to worlds: a version must keep pricing it',
      BASIS_PROBLEM,
    ]);
    const malformed = deskDraft({
      sizes: { '2g': { runningCentsPerDay: 0.5, stoppedCentsPerDay: 5 } },
    });
    expect(draftCheck([SEED_TARIFF], malformed, '2026-10-13', []).problems).toEqual([
      'size 2g: needs runningCentsPerDay and stoppedCentsPerDay, whole cents ≥ 0',
    ]);
  });
});
