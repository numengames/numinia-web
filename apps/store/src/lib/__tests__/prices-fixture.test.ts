/**
 * The fixture desk (MIS-184) answers the contract's three calls the way the
 * till does (SPEC §1): the version in force, rises and their notice, the
 * earliest start, sizes still charged to worlds, the basis limits and the
 * wallet that publishes, in the till's own words.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/prices/desk.json';
import { BASIS_PROBLEM, BY_PROBLEM, type DeskDraft, type DeskVersion } from '../prices';
import { DEFAULT_RULES } from '../prices-data';
import { basisProblem, checkDraft, createFixtureDesk, type FixtureSeed } from '../prices-fixture';

const SEED = deskSeed as unknown as FixtureSeed;
const V1 = SEED.versions[0] as DeskVersion;
const WALLET = '0x42e6bd5c8c74f8c7c35f8a1ba3bbf02e7df0ca26';
const at = (iso: string) => () => new Date(iso);
const ON_13 = at('2026-10-13T10:00:00.000Z');

const draft = (over: Partial<DeskDraft> = {}): DeskDraft => ({
  startsOn: '2026-10-14',
  sizes: {
    small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 },
    medium: { runningCentsPerDay: 75, stoppedCentsPerDay: 5 },
    large: { runningCentsPerDay: 180, stoppedCentsPerDay: 10 },
    '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 },
  },
  rules: { ...DEFAULT_RULES, quickTopupsCents: [...DEFAULT_RULES.quickTopupsCents] },
  basis: { note: 'tres tamaños', assumptions: { occupancyPct: 50 } },
  ...over,
});

describe('the seed', () => {
  it('is the till’s seed exactly', () => {
    expect(SEED.sizesInUse).toEqual([]);
    expect(V1).toEqual({
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
    expect(V1.rules).toEqual(DEFAULT_RULES);
  });
});

describe('read', () => {
  it('shows the seed in force on the real UTC day', async () => {
    const desk = createFixtureDesk(SEED, at('2026-10-13T23:30:00.000Z'));
    expect(await desk.read()).toEqual({
      today: '2026-10-13',
      inForceId: 1,
      versions: [V1],
      sizesInUse: [],
    });
  });

  it('has nothing in force before the seed starts, and runs on the real clock by default', async () => {
    expect(
      (await createFixtureDesk(SEED, at('2026-10-12T12:00:00.000Z')).read()).inForceId,
    ).toBeNull();
    const today = new Date().toISOString().slice(0, 10);
    expect((await createFixtureDesk(SEED).read()).today).toBe(today);
  });

  it('hands out copies: what a caller changes never reaches the desk', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    const view = await desk.read();
    (view.versions[0] as { id: number }).id = 99;
    view.sizesInUse.push('x');
    expect((await desk.read()).versions[0]?.id).toBe(1);
    expect((await desk.read()).sizesInUse).toEqual([]);
  });
});

describe('check — the SPEC’s example', () => {
  it('a draft adding three sizes and keeping 2g is no rise, from tomorrow', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    expect(await desk.check(draft())).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: false,
      noticeDays: 0,
      earliestStart: '2026-10-14',
      problems: [],
    });
  });

  it('the same draft with 2g at 70/5 is a rise: 30 days of notice', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    const rise = draft({
      sizes: { ...draft().sizes, '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } },
    });
    expect(await desk.check(rise)).toEqual({
      today: '2026-10-13',
      nextId: 2,
      replacedId: 1,
      isRise: true,
      noticeDays: 30,
      earliestStart: '2026-11-12',
      problems: ["a rise needs 30 days' notice: it starts on 2026-11-12 at the earliest"],
    });
    expect((await desk.check({ ...rise, startsOn: '2026-11-12' })).problems).toEqual([]);
  });
});

describe('check — the rules', () => {
  it('refuses today and before: tomorrow at the earliest', () => {
    expect(checkDraft([V1], draft({ startsOn: '2026-10-13' }), '2026-10-13', []).problems).toEqual([
      'a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest',
    ]);
  });

  it('a draft before any version replaces nothing and is never a rise', () => {
    const check = checkDraft([V1], draft({ startsOn: '2026-10-12' }), '2026-10-11', []);
    expect(check.replacedId).toBeNull();
    expect(check.isRise).toBe(false);
    expect(check.problems).toEqual([]);
  });

  it('the notice is the stricter of the version in force and the one replaced', () => {
    const v2: DeskVersion = {
      ...V1,
      id: 2,
      startsOn: '2026-11-01',
      rules: { ...V1.rules, noticeDaysForRise: 45 },
    };
    const rise = draft({
      startsOn: '2026-11-05',
      sizes: { '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } },
    });
    const check = checkDraft([V1, v2], rise, '2026-10-13', []);
    expect(check.replacedId).toBe(2);
    expect(check.noticeDays).toBe(45);
    expect(check.earliestStart).toBe('2026-11-27');
    // With nothing in force today the replaced version's notice counts alone.
    expect(checkDraft([v2], rise, '2026-10-13', []).noticeDays).toBe(45);
  });

  it('a rise with no notice starts tomorrow', () => {
    const quiet: DeskVersion = { ...V1, rules: { ...V1.rules, noticeDaysForRise: 0 } };
    const rise = draft({ sizes: { '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } } });
    const check = checkDraft([quiet], { ...rise, rules: quiet.rules }, '2026-10-13', []);
    expect([check.isRise, check.noticeDays, check.earliestStart, check.problems]).toEqual([
      true,
      0,
      '2026-10-14',
      [],
    ]);
  });

  it('a size still charged to worlds must stay priced', () => {
    const without = draft({ sizes: { small: { runningCentsPerDay: 20, stoppedCentsPerDay: 2 } } });
    expect(checkDraft([V1], without, '2026-10-13', ['2g']).problems).toEqual([
      'size 2g is still charged to worlds: a version must keep pricing it',
    ]);
    expect(checkDraft([V1], draft(), '2026-10-13', ['2g']).problems).toEqual([]);
  });

  it('reports what is not a tariff, and leaves the date rules for later', () => {
    const broken = draft({
      startsOn: '2026-10-13',
      sizes: {
        'Bad Name': { runningCentsPerDay: 20.5, stoppedCentsPerDay: -1 },
      },
      rules: {
        ...draft().rules,
        keepDaysAtZero: 0,
        minTopupCents: 1500,
        quickTopupsCents: [1000, 1000],
      },
    });
    expect(checkDraft([V1], broken, '2026-10-13', []).problems).toEqual([
      '"Bad Name" is not a size name',
      'size Bad Name: needs runningCentsPerDay and stoppedCentsPerDay, whole cents ≥ 0',
      'keepDaysAtZero must be a whole number ≥ 1',
      'quickTopupsCents must be ascending whole cents, none below minTopupCents',
    ]);
    expect(
      checkDraft([V1], draft({ sizes: {}, startsOn: 'mañana' }), '2026-10-13', []).problems,
    ).toEqual(['startsOn must be a YYYY-MM-DD day', 'sizes must price at least one size']);
    expect(
      checkDraft(
        [V1],
        draft({ rules: { ...draft().rules, quickTopupsCents: [] } }),
        '2026-10-13',
        [],
      ).problems,
    ).toEqual(['quickTopupsCents must be ascending whole cents, none below minTopupCents']);
    expect(
      checkDraft([V1], draft({ basis: { note: 'x'.repeat(501) } }), '2026-10-13', []).problems,
    ).toEqual([BASIS_PROBLEM]);
  });

  it('counts the next id from the highest one held', () => {
    const v7: DeskVersion = { ...V1, id: 7, startsOn: '2026-10-01' };
    expect(checkDraft([v7, V1], draft(), '2026-10-13', []).nextId).toBe(8);
    expect(checkDraft([], draft(), '2026-10-13', []).nextId).toBe(1);
  });
});

describe('the basis limits', () => {
  it('accepts no basis, a note, and a note with plain assumptions', () => {
    expect(basisProblem(null)).toBeNull();
    expect(basisProblem({ note: '' })).toBeNull();
    expect(basisProblem({ note: 'x'.repeat(500), assumptions: { a: 1 } })).toBeNull();
  });

  it('refuses a long note, extra keys, odd assumptions and a basis over 16 KB', () => {
    const odd = [
      { note: 'x'.repeat(501) },
      { note: 'x', extra: true },
      { note: 'x', assumptions: [] },
      { note: 'x', assumptions: new Date() },
      { note: 3 },
      { note: 'x', assumptions: { big: 'y'.repeat(16_384) } },
      Object.assign(Object.create(null) as object, { note: 'x' }),
    ];
    for (const basis of odd) {
      expect(basisProblem(basis as never)).toBe(BASIS_PROBLEM);
    }
  });
});

describe('schedule', () => {
  it('publishes as the wallet given, with the next id, and the room reads it back', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    const result = await desk.schedule(draft(), WALLET);
    expect(result).toEqual({
      ok: true,
      version: {
        id: 2,
        startsOn: '2026-10-14',
        createdAt: '2026-10-13T10:00:00.000Z',
        createdBy: WALLET,
        sizes: draft().sizes,
        rules: draft().rules,
        basis: { note: 'tres tamaños', assumptions: { occupancyPct: 50 } },
      },
    });
    const view = await desk.read();
    expect(view.versions.map((version) => version.id)).toEqual([1, 2]);
    // v2 starts tomorrow: v1 is still in force today.
    expect(view.inForceId).toBe(1);
    expect((await desk.check(draft())).nextId).toBe(3);
  });

  it('stores a version without a basis as null', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    const result = await desk.schedule(draft({ basis: null }), WALLET);
    expect(result.ok && result.version.basis).toBeNull();
  });

  it('refuses what check refuses, and a wallet that is not one, adding nothing', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    expect(await desk.schedule(draft({ startsOn: '2026-10-13' }), WALLET.toUpperCase())).toEqual({
      ok: false,
      problems: [
        'a version scheduled on 2026-10-13 starts on 2026-10-14 at the earliest',
        BY_PROBLEM,
      ],
    });
    expect(await desk.schedule(draft(), 'Oracle')).toEqual({ ok: false, problems: [BY_PROBLEM] });
    expect((await desk.read()).versions).toHaveLength(1);
  });

  it('keeps its own copy of what it stored', async () => {
    const desk = createFixtureDesk(SEED, ON_13);
    const mine = draft();
    await desk.schedule(mine, WALLET);
    (mine.sizes['small'] as { runningCentsPerDay: number }).runningCentsPerDay = 1;
    expect((await desk.read()).versions[1]?.sizes['small']?.runningCentsPerDay).toBe(20);
  });
});
