import { describe, expect, it } from 'vitest';
import {
  CLOSE_WINDOW_DAYS,
  closeDays,
  type CloseAccount,
  type CloseInput,
  type CloseOutput,
  type KnownWorld,
  type MeterReading,
} from '../src/lib/close';
import { SEED_TARIFF, type TariffVersion } from '../src/lib/tariff';
import { MINUTES_PER_DAY, addDays, daysFrom } from '../src/lib/utc-day';

/** The run's instant: 00:30 UTC on `today`, when the cron fires. */
function runAt(today: string): string {
  return `${today}T00:30:00.000Z`;
}

function reading(
  worldId: string,
  day: string,
  minutesRunning: number,
  minutesStopped: number,
  overrides: Partial<MeterReading> = {},
): MeterReading {
  return {
    worldId,
    machine: 'vps-2-a',
    day,
    size: '2g',
    minutesRunning,
    minutesStopped,
    endState: minutesStopped === 0 ? 'running' : 'stopped',
    ...overrides,
  };
}

function world(worldId: string, firstSeenOn: string): KnownWorld {
  return { worldId, firstSeenOn };
}

function account(
  accountId: string,
  balanceCents: number,
  worlds: readonly KnownWorld[],
  extra: Partial<CloseAccount> = {},
): CloseAccount {
  return { accountId, balanceCents, worlds, periods: [], lotAfterOpen: null, ...extra };
}

function run(today: string, overrides: Partial<CloseInput> = {}): CloseOutput {
  return closeDays({
    today,
    versions: [SEED_TARIFF],
    accounts: [],
    readings: [],
    closed: [],
    reported: [],
    marks: [],
    ...overrides,
    now: overrides.now ?? runAt(today),
  });
}

function charged(output: CloseOutput): [string, string, number][] {
  return output.lines.map((line) => [line.worldId, line.day, line.amountCents]);
}

const NOTHING: CloseOutput = {
  lines: [],
  stopForBalance: [],
  keep: [],
  cleared: [],
  pending: [],
  reports: [],
  periodsOpened: [],
  periodsEnded: [],
};

describe('a run over a day (MIS-178)', () => {
  const worlds = [world('w-a', '2026-10-26'), world('w-b', '2026-10-26')];
  const readings = [reading('w-a', '2026-10-26', 1440, 0), reading('w-b', '2026-10-26', 0, 1440)];

  it('writes exactly one line per world, priced at the day’s tariff for the world’s size', () => {
    const output = run('2026-10-27', { accounts: [account('acc', 10_000, worlds)], readings });
    expect(charged(output)).toEqual([
      ['w-a', '2026-10-26', -60],
      ['w-b', '2026-10-26', -5],
    ]);
    expect(output.lines[0]).toMatchObject({
      accountId: 'acc',
      kind: 'world_day',
      at: '2026-10-27T00:30:00.000Z',
      machine: 'vps-2-a',
      minutesRunning: 1440,
      minutesStopped: 0,
      size: '2g',
      tariffVersionId: 1,
    });
    expect({ ...output, lines: [] }).toEqual(NOTHING);
  });

  it('writes nothing when run again over the same day', () => {
    const first = run('2026-10-27', { accounts: [account('acc', 10_000, worlds)], readings });
    const again = run('2026-10-27', {
      accounts: [account('acc', 10_000 - 65, worlds)],
      readings,
      closed: first.lines.map(({ worldId, day }) => ({ worldId, day })),
    });
    expect(again).toEqual(NOTHING);
  });

  it('closes every day of the window not yet closed, oldest first, with ids that sort so', () => {
    const output = run('2026-10-27', {
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-23')])],
      readings: daysFrom('2026-10-23', '2026-10-26').map((day) => reading('w-a', day, 1440, 0)),
      closed: [{ worldId: 'w-a', day: '2026-10-24' }],
    });
    expect(output.lines.map((line) => line.day)).toEqual([
      '2026-10-23',
      '2026-10-25',
      '2026-10-26',
    ]);
    const ids = output.lines.map((line) => line.id);
    expect([...ids].sort()).toEqual(ids);
    expect(
      run('2026-10-27', {
        accounts: [account('acc', 10_000, [world('w-a', '2026-10-23')])],
        readings: daysFrom('2026-10-23', '2026-10-26').map((day) => reading('w-a', day, 1440, 0)),
        closed: [{ worldId: 'w-a', day: '2026-10-24' }],
      }).lines.map((line) => line.id),
    ).toEqual(ids);
  });

  it('closes nothing for a world first seen today, and nothing before a world was first seen', () => {
    const output = run('2026-10-27', {
      accounts: [
        account('acc', 10_000, [world('w-new', '2026-10-27'), world('w-young', '2026-10-25')]),
      ],
    });
    expect(output.pending).toEqual([
      { worldId: 'w-young', day: '2026-10-25' },
      { worldId: 'w-young', day: '2026-10-26' },
    ]);
  });
});

describe('every UTC day has 1440 minutes, Spain’s clock changes included (MIS-178)', () => {
  it('charges 1440 minutes on 25 October 2026 as a whole day', () => {
    const output = run('2026-10-26', {
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-25')])],
      readings: [reading('w-a', '2026-10-25', 1440, 0)],
    });
    expect(output.lines).toHaveLength(1);
    expect(output.lines[0]).toMatchObject({
      day: '2026-10-25',
      minutesRunning: 1440,
      amountCents: -60,
    });
  });

  it('charges 1440 minutes on 28 March 2027 as a whole day', () => {
    const output = run('2027-03-29', {
      accounts: [account('acc', 10_000, [world('w-a', '2027-03-28')])],
      readings: [reading('w-a', '2027-03-28', 1440, 0)],
    });
    expect(output.lines).toHaveLength(1);
    expect(output.lines[0]).toMatchObject({
      day: '2027-03-28',
      minutesRunning: 1440,
      amountCents: -60,
    });
  });

  it('refuses a reading longer than a day, 25 October included: pending, reported, never charged', () => {
    const output = run('2026-10-27', {
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-25')])],
      readings: [
        // A day and an hour, as a wall clock in Spain counts 25 October: not a UTC day.
        reading('w-a', '2026-10-25', MINUTES_PER_DAY + 60, 0),
        reading('w-a', '2026-10-26', MINUTES_PER_DAY + 1, 0),
      ],
    });
    expect(output.lines).toEqual([]);
    expect(output.pending).toEqual([
      { worldId: 'w-a', day: '2026-10-25' },
      { worldId: 'w-a', day: '2026-10-26' },
    ]);
    expect(output.reports).toEqual([
      { worldId: 'w-a', accountId: 'acc', day: '2026-10-25', reason: 'invalid_reading' },
      { worldId: 'w-a', accountId: 'acc', day: '2026-10-26', reason: 'invalid_reading' },
    ]);
  });
});

describe('a day nobody measured (MIS-178)', () => {
  // The seed tariff starts on 13 October 2026: the whole window is priced.
  const today = '2026-11-30';
  const accounts = [account('acc', 10_000, [world('w-a', '2026-10-14')])];

  it('stays pending, never estimated, and older than 35 days is reported once', () => {
    expect(CLOSE_WINDOW_DAYS).toBe(35);
    const output = run(today, { accounts });
    expect(output.lines).toEqual([]);
    expect(output.pending).toEqual(
      daysFrom('2026-10-26', '2026-11-29').map((day) => ({ worldId: 'w-a', day })),
    );
    expect(output.reports).toEqual(
      daysFrom('2026-10-14', '2026-10-25').map((day) => ({
        worldId: 'w-a',
        accountId: 'acc',
        day,
        reason: 'unmeasured',
      })),
    );
    const again = run(today, { accounts, reported: output.reports });
    expect(again.reports).toEqual([]);
    expect(again.pending).toEqual(output.pending);
  });

  it('is charged by the first run that reads it, up to 35 days later, and never after', () => {
    const late = run(today, {
      accounts,
      readings: [reading('w-a', '2026-10-26', 1440, 0), reading('w-a', '2026-10-25', 1440, 0)],
    });
    expect(charged(late)).toEqual([['w-a', '2026-10-26', -60]]);
    expect(late.reports.map((report) => report.day)).toContain('2026-10-25');
    expect(late.pending).not.toContainEqual({ worldId: 'w-a', day: '2026-10-26' });
  });

  it('is not reported when it was closed', () => {
    const output = run(today, {
      accounts,
      closed: daysFrom('2026-10-14', '2026-10-24').map((day) => ({ worldId: 'w-a', day })),
    });
    expect(output.reports.map((report) => report.day)).toEqual(['2026-10-25']);
  });
});

describe('readings the close cannot charge', () => {
  const today = '2026-10-27';

  it('treats two readings of one day, or impossible minutes, as invalid: pending and reported', () => {
    const output = run(today, {
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-23')])],
      readings: [
        reading('w-a', '2026-10-23', 1440, 0),
        reading('w-a', '2026-10-23', 0, 1440),
        reading('w-a', '2026-10-24', -1, 1440),
        reading('w-a', '2026-10-25', 1439.5, 0),
        reading('w-a', '2026-10-26', 0, 0.5),
      ],
    });
    expect(output.lines).toEqual([]);
    expect(output.reports.map((report) => [report.day, report.reason])).toEqual([
      ['2026-10-23', 'invalid_reading'],
      ['2026-10-24', 'invalid_reading'],
      ['2026-10-25', 'invalid_reading'],
      ['2026-10-26', 'invalid_reading'],
    ]);
    expect(output.pending).toHaveLength(4);
  });

  it('reports a size or a day no tariff version prices', () => {
    const output = run(today, {
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-12'), world('w-b', '2026-10-26')])],
      readings: [
        reading('w-a', '2026-10-12', 1440, 0),
        reading('w-b', '2026-10-26', 1440, 0, { size: '8g' }),
      ],
      closed: daysFrom('2026-10-13', '2026-10-26').map((day) => ({ worldId: 'w-a', day })),
    });
    expect(output.lines).toEqual([]);
    expect(output.reports).toEqual([
      { worldId: 'w-a', accountId: 'acc', day: '2026-10-12', reason: 'unpriced' },
      { worldId: 'w-b', accountId: 'acc', day: '2026-10-26', reason: 'unpriced' },
    ]);
    const again = run(today, {
      accounts: [account('acc', 10_000, [world('w-b', '2026-10-26')])],
      readings: [reading('w-b', '2026-10-26', 1440, 0, { size: '8g' })],
      reported: output.reports,
    });
    expect(again.reports).toEqual([]);
    expect(again.pending).toEqual([{ worldId: 'w-b', day: '2026-10-26' }]);
  });
});

describe('the tariff a day is charged at (MIS-177)', () => {
  const rise: TariffVersion = {
    ...SEED_TARIFF,
    id: 2,
    startsOn: '2026-10-26',
    createdAt: '2026-09-20T10:00:00.000Z',
    sizes: { '2g': { runningCentsPerDay: 70, stoppedCentsPerDay: 5 } },
  };

  it('is the version in force on that day: a line charged before a new version keeps its own', () => {
    const before = run('2026-10-26', {
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-25')])],
      readings: [reading('w-a', '2026-10-25', 1440, 0)],
    });
    expect(before.lines[0]).toMatchObject({
      day: '2026-10-25',
      amountCents: -60,
      tariffVersionId: 1,
    });

    const after = run('2026-10-27', {
      versions: [SEED_TARIFF, rise],
      accounts: [account('acc', 10_000 - 60, [world('w-a', '2026-10-25')])],
      readings: [reading('w-a', '2026-10-25', 1440, 0), reading('w-a', '2026-10-26', 1440, 0)],
      closed: [{ worldId: 'w-a', day: '2026-10-25' }],
    });
    expect(after.lines.map((line) => [line.day, line.amountCents, line.tariffVersionId])).toEqual([
      ['2026-10-26', -70, 2],
    ]);
    // A day closed late is still priced at the version of its own date.
    const late = run('2026-10-27', {
      versions: [SEED_TARIFF, rise],
      accounts: [account('acc', 10_000, [world('w-a', '2026-10-25')])],
      readings: [reading('w-a', '2026-10-25', 1440, 0)],
    });
    expect(late.lines[0]).toMatchObject({
      day: '2026-10-25',
      amountCents: -60,
      tariffVersionId: 1,
    });
  });
});

describe('at zero (MIS-178)', () => {
  const today = '2026-10-27';
  const worlds = [
    world('w-run', '2026-10-26'),
    world('w-stop', '2026-10-26'),
    world('w-silent', '2026-10-26'),
  ];
  const readings = [
    reading('w-run', '2026-10-26', 1440, 0),
    reading('w-stop', '2026-10-26', 0, 1440),
  ];

  it('lists the running worlds to stop, keeps every world with a deletion date, and leaves the overshoot', () => {
    const output = run(today, { accounts: [account('acc', 50, worlds)], readings });
    expect(charged(output)).toEqual([
      ['w-run', '2026-10-26', -60],
      ['w-stop', '2026-10-26', -5],
    ]);
    expect(output.periodsOpened).toEqual([
      { accountId: 'acc', startsOn: today, startedAt: '2026-10-27T00:30:00.000Z', endsOn: null },
    ]);
    expect(output.stopForBalance).toEqual([
      { accountId: 'acc', worldId: 'w-run', machine: 'vps-2-a' },
    ]);
    // 90 days by the tariff's rule.
    expect(output.keep).toEqual([
      { worldId: 'w-run', accountId: 'acc', deleteOn: '2027-01-25' },
      { worldId: 'w-silent', accountId: 'acc', deleteOn: '2027-01-25' },
      { worldId: 'w-stop', accountId: 'acc', deleteOn: '2027-01-25' },
    ]);
    expect(output.pending).toEqual([{ worldId: 'w-silent', day: '2026-10-26' }]);
  });

  it('counts a balance of exactly zero as at zero', () => {
    const output = run(today, { accounts: [account('acc', 65, worlds)], readings });
    expect(output.periodsOpened).toHaveLength(1);
  });

  it('leaves an account with no worlds out of the state: there is nothing to stop or keep', () => {
    const output = run(today, { accounts: [account('acc-empty', 0, [])] });
    expect(output.periodsOpened).toEqual([]);
    expect(output.stopForBalance).toEqual([]);
    expect(output.keep).toEqual([]);
  });

  it('charges stopped minutes nothing from the state’s start, running minutes still', () => {
    const open = { accountId: 'acc', startsOn: today, startedAt: runAt(today), endsOn: null };
    const marks = worlds.map(({ worldId }) => ({
      worldId,
      accountId: 'acc',
      deleteOn: '2027-01-25',
    }));
    const next = run('2026-10-28', {
      accounts: [account('acc', -15, worlds, { periods: [open] })],
      readings: [
        reading('w-run', '2026-10-27', 30, 1410, { endState: 'stopped' }),
        reading('w-stop', '2026-10-27', 0, 1440),
      ],
      closed: worlds.map(({ worldId }) => ({ worldId, day: '2026-10-26' })),
      marks,
    });
    expect(
      next.lines.map((line) => [
        line.worldId,
        line.minutesRunning,
        line.minutesStopped,
        line.amountCents,
      ]),
    ).toEqual([
      ['w-run', 30, 1410, -1],
      ['w-stop', 0, 1440, 0],
    ]);
    expect(next.periodsOpened).toEqual([]);
    expect(next.keep).toEqual([]);
    expect(next.stopForBalance).toEqual([]);
    expect(next.cleared).toEqual([]);
  });

  it('keeps listing a world that still ends its days running, and marks a world new to the account', () => {
    const open = { accountId: 'acc', startsOn: today, startedAt: runAt(today), endsOn: null };
    const next = run('2026-10-28', {
      accounts: [
        account('acc', -60, [...worlds, world('w-late', '2026-10-28')], { periods: [open] }),
      ],
      readings: [reading('w-run', '2026-10-27', 1440, 0)],
      closed: worlds.map(({ worldId }) => ({ worldId, day: '2026-10-26' })),
      marks: worlds.map(({ worldId }) => ({ worldId, accountId: 'acc', deleteOn: '2027-01-25' })),
    });
    expect(next.stopForBalance).toEqual([
      { accountId: 'acc', worldId: 'w-run', machine: 'vps-2-a' },
    ]);
    expect(next.keep).toEqual([{ worldId: 'w-late', accountId: 'acc', deleteOn: '2027-01-26' }]);
  });
});

describe('a top-up after zero (MIS-178)', () => {
  const open = {
    accountId: 'acc',
    startsOn: '2026-10-27',
    startedAt: '2026-10-27T00:30:00.000Z',
    endsOn: null,
  };
  const worlds = [world('w-stop', '2026-10-28'), world('w-run', '2026-10-28')];
  const marks = worlds.map(({ worldId }) => ({
    worldId,
    accountId: 'acc',
    deleteOn: '2027-01-25',
  }));
  const readings = [
    ...daysFrom('2026-10-28', '2026-10-30').map((day) => reading('w-stop', day, 0, 1440)),
    reading('w-run', '2026-10-30', 0, 1440),
  ];
  // The lot is written on 29 October at 10:00 UTC.
  const lot = { lineId: 'L-topup', at: '2026-10-29T10:00:00.000Z' };

  it('ends the keeping-for-free from the following day, clears the dates and starts no world', () => {
    const output = run('2026-10-31', {
      accounts: [account('acc', 984, worlds, { periods: [open], lotAfterOpen: lot })],
      readings,
      marks,
    });
    expect(output.periodsEnded).toEqual([
      {
        accountId: 'acc',
        startedAt: open.startedAt,
        endsOn: '2026-10-29',
        endedByLineId: 'L-topup',
      },
    ]);
    expect(charged(output)).toEqual([
      ['w-run', '2026-10-30', -5],
      ['w-stop', '2026-10-28', 0],
      ['w-stop', '2026-10-29', 0],
      ['w-stop', '2026-10-30', -5],
    ]);
    expect(output.cleared).toEqual(['w-run', 'w-stop']);
    expect(output.periodsOpened).toEqual([]);
    expect(output.keep).toEqual([]);
    expect(output.stopForBalance).toEqual([]);
    expect(Object.keys(output).sort()).toEqual(Object.keys(NOTHING).sort());
  });

  it('ends the stretch on the lot’s UTC date, also when a clock in Spain already reads the next day', () => {
    // 23:45 UTC on 29 October is 00:45 on the 30th in Spain (CET): the UTC date wins.
    const lateLot = { lineId: 'L-late', at: '2026-10-29T23:45:00.000Z' };
    const output = run('2026-10-31', {
      accounts: [account('acc', 984, worlds, { periods: [open], lotAfterOpen: lateLot })],
      readings,
      marks,
    });
    expect(output.periodsEnded).toEqual([
      {
        accountId: 'acc',
        startedAt: open.startedAt,
        endsOn: '2026-10-29',
        endedByLineId: 'L-late',
      },
    ]);
    // 29 October is still kept for free; 30 October is charged.
    expect(charged(output)).toEqual([
      ['w-run', '2026-10-30', -5],
      ['w-stop', '2026-10-28', 0],
      ['w-stop', '2026-10-29', 0],
      ['w-stop', '2026-10-30', -5],
    ]);
  });

  it('starts a new stretch, with fresh dates, when the lot leaves the balance at or below zero', () => {
    const output = run('2026-10-31', {
      accounts: [account('acc', 5, worlds, { periods: [open], lotAfterOpen: lot })],
      readings,
      marks,
    });
    expect(output.periodsEnded).toHaveLength(1);
    expect(output.periodsOpened).toEqual([
      { accountId: 'acc', startsOn: '2026-10-31', startedAt: runAt('2026-10-31'), endsOn: null },
    ]);
    expect(output.keep).toEqual([
      { worldId: 'w-run', accountId: 'acc', deleteOn: '2027-01-29' },
      { worldId: 'w-stop', accountId: 'acc', deleteOn: '2027-01-29' },
    ]);
    expect(output.cleared).toEqual([]);
  });

  it('ends only the open stretch, and an earlier one still keeps its own days free', () => {
    const earlier = {
      accountId: 'acc',
      startsOn: '2026-10-20',
      startedAt: '2026-10-20T00:30:00.000Z',
      endsOn: '2026-10-22',
    };
    const output = run('2026-10-31', {
      accounts: [
        account('acc', 984, [world('w-stop', '2026-10-21'), world('w-run', '2026-10-28')], {
          periods: [earlier, open],
          lotAfterOpen: lot,
        }),
      ],
      readings: [
        ...readings,
        reading('w-stop', '2026-10-22', 0, 1440),
        reading('w-stop', '2026-10-23', 0, 1440),
      ],
      closed: [
        { worldId: 'w-stop', day: '2026-10-21' },
        ...daysFrom('2026-10-24', '2026-10-27').map((day) => ({ worldId: 'w-stop', day })),
      ],
      marks,
    });
    expect(output.periodsEnded).toEqual([
      {
        accountId: 'acc',
        startedAt: open.startedAt,
        endsOn: '2026-10-29',
        endedByLineId: 'L-topup',
      },
    ]);
    expect(charged(output).filter(([worldId]) => worldId === 'w-stop')).toEqual([
      ['w-stop', '2026-10-22', 0],
      ['w-stop', '2026-10-23', -5],
      ['w-stop', '2026-10-28', 0],
      ['w-stop', '2026-10-29', 0],
      ['w-stop', '2026-10-30', -5],
    ]);
  });

  it('ignores a lot written before the stretch began, or with no stretch open', () => {
    const before = { lineId: 'L-old', at: '2026-10-26T23:00:00.000Z' };
    const stays = run('2026-10-31', {
      accounts: [account('acc', -20, worlds, { periods: [open], lotAfterOpen: before })],
      readings,
      marks,
    });
    expect(stays.periodsEnded).toEqual([]);
    expect(stays.periodsOpened).toEqual([]);
    expect(charged(stays).every(([, , amount]) => amount === 0)).toBe(true);

    const closedStretch = { ...open, endsOn: '2026-10-28' };
    const none = run('2026-10-31', {
      accounts: [account('acc', 984, worlds, { periods: [closedStretch], lotAfterOpen: lot })],
      readings,
    });
    expect(none.periodsEnded).toEqual([]);
    // Still free on the days the ended stretch covers, and only those.
    expect(charged(none)).toEqual([
      ['w-run', '2026-10-30', -5],
      ['w-stop', '2026-10-28', 0],
      ['w-stop', '2026-10-29', -5],
      ['w-stop', '2026-10-30', -5],
    ]);
  });
});

describe('deletion dates', () => {
  it('end for an account back above zero and for a world no account claims', () => {
    const output = run('2026-10-27', {
      accounts: [account('acc', 500, [world('w-a', '2026-10-27')])],
      marks: [
        { worldId: 'w-a', accountId: 'acc', deleteOn: '2027-01-01' },
        { worldId: 'w-gone', accountId: 'acc-old', deleteOn: '2027-01-01' },
      ],
    });
    expect(output.cleared).toEqual(['w-a', 'w-gone']);
  });
});

describe('the run itself', () => {
  it('sorts accounts and worlds whatever order they come in', () => {
    const output = run('2026-10-27', {
      accounts: [
        account('acc-b', 10_000, [world('w-b2', '2026-10-26'), world('w-b1', '2026-10-26')]),
        account('acc-a', 10_000, [world('w-a', '2026-10-26')]),
      ],
      readings: ['w-a', 'w-b1', 'w-b2'].map((worldId) => reading(worldId, '2026-10-26', 1440, 0)),
    });
    expect(output.lines.map((line) => [line.accountId, line.worldId])).toEqual([
      ['acc-a', 'w-a'],
      ['acc-b', 'w-b1'],
      ['acc-b', 'w-b2'],
    ]);
  });

  it('refuses a date, an instant or a tariff it cannot trust', () => {
    expect(() => run('2026-02-30', { now: '2026-03-02T00:30:00.000Z' })).toThrow(
      /today is not a day/,
    );
    // The run's instant falls on its own UTC date: the millisecond before it or after it does not.
    expect(() => run('2026-10-27', { now: '2026-10-26T23:59:59.999Z' })).toThrow(
      'closeDays: now (2026-10-26T23:59:59.999Z) is not an instant of 2026-10-27',
    );
    expect(() => run('2026-10-27', { now: '2026-10-28T00:00:00.000Z' })).toThrow(
      /is not an instant of 2026-10-27$/,
    );
    expect(() => run('2026-10-27', { now: 'tonight' })).toThrow(/is not an instant/);
    expect(() => run('2026-10-12')).toThrow(/no tariff version is in force on 2026-10-12/);
  });

  it('takes any instant of its UTC date, from its first millisecond to its last', () => {
    for (const now of [
      '2026-10-27T00:00:00.000Z',
      '2026-10-27T13:45:00.000Z',
      '2026-10-27T23:59:59.999Z',
    ]) {
      expect(run('2026-10-27', { now })).toEqual(NOTHING);
    }
  });

  it('reads the window from 35 days back to yesterday', () => {
    const output = run('2026-10-27', {
      accounts: [account('acc', 10_000, [world('w-a', '2020-01-01')])],
      reported: [],
    });
    expect(output.pending[0]).toEqual({ worldId: 'w-a', day: addDays('2026-10-27', -35) });
    expect(output.pending.at(-1)).toEqual({ worldId: 'w-a', day: '2026-10-26' });
  });
});
