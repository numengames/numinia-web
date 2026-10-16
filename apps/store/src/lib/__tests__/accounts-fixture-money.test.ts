/**
 * The fixture desk's money (cut 2026-10-16 «el dinero»): the seed carries
 * about 35 days of worlds' days for every account — two or three worlds of
 * different sizes, some days stopped all day and some mixed — a top-up and an
 * adjustment, so every chart, table and CSV of the Saldo screen has data in
 * screenshots and e2e; and the statement answers what a till of this cut
 * answers: the split of each bucket, each world, the minutes, the pace and the
 * tariff, with the till's own arithmetic.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskStatement } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;

type Loose = { [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]> };
const desk = (): Loose => createAccountsFixtureDesk(seed, () => NOW) as unknown as Loose;

/** `worldDayCostCents` of the till: round half up once, per minute of a 1440-minute day. */
const cost = (running: number, stopped: number, price: { r: number; s: number }): number =>
  Math.floor((running * price.r + stopped * price.s + 720) / 1440);

describe('the seed', () => {
  const accounts = [
    { id: seed.personal.id, lines: seed.personal.lines },
    ...seed.teams.map((team) => ({ id: team.id, lines: team.lines })),
  ];

  it('prices three sizes and states the two rules a person reads', () => {
    expect(seed.tariff).toBeDefined();
    expect(Object.keys(seed.tariff?.sizes ?? {}).sort()).toEqual(['1g', '2g', '4g']);
    expect(seed.tariff?.rules).toEqual({ keepDaysAtZero: 90, noticeDaysForRise: 30 });
  });

  it('gives every account about 35 days over two or three worlds of different sizes, a top-up and an adjustment', () => {
    for (const { id, lines } of accounts) {
      const days = lines.filter((line) => line.kind === 'world_day');
      const worlds = new Set(days.map((line) => line.worldId));
      const sizes = new Set(days.map((line) => line.size));
      const dates = new Set(days.map((line) => line.daysAgo));
      expect(worlds.size, id).toBeGreaterThanOrEqual(2);
      expect(worlds.size, id).toBeLessThanOrEqual(3);
      expect(sizes.size, id).toBeGreaterThanOrEqual(2);
      expect(Math.max(...dates), id).toBeGreaterThanOrEqual(34);
      expect(dates.size, id).toBeGreaterThanOrEqual(34);
      expect(
        lines.some((line) => line.kind === 'topup'),
        id,
      ).toBe(true);
      expect(
        lines.some((line) => line.kind === 'adjustment' && line.reason),
        id,
      ).toBe(true);
      // Some days stopped all day, some mixed.
      expect(
        days.some((line) => line.minutesRunning === 0),
        id,
      ).toBe(true);
      expect(
        days.some((line) => (line.minutesRunning ?? 0) > 0 && (line.minutesRunning ?? 0) < 1440),
        id,
      ).toBe(true);
    }
  });

  it('charges each world’s day what its minutes cost at the seed’s price, never more than a day', () => {
    for (const { lines } of accounts) {
      for (const line of lines.filter((entry) => entry.kind === 'world_day')) {
        const price = seed.tariff?.sizes[line.size ?? ''];
        expect(price).toBeDefined();
        const running = line.minutesRunning ?? -1;
        const stopped = line.minutesStopped ?? -1;
        expect(running + stopped).toBe(1440);
        expect(-line.amountCents).toBe(
          cost(running, stopped, {
            r: price?.runningCentsPerDay ?? 0,
            s: price?.stoppedCentsPerDay ?? 0,
          }),
        );
      }
    }
  });

  it('keeps the balances the other suites read: 4,20 €, 0,88 €, 14,26 € and 2,50 €', () => {
    const balance = (lines: readonly { amountCents: number }[]) =>
      lines.reduce((sum, line) => sum + line.amountCents, 0);
    expect(balance(seed.personal.lines)).toBe(420);
    expect(seed.teams.map((team) => balance(team.lines))).toEqual([88, 1426, 250]);
  });
});

describe('the fixture statement, as a till of this cut answers it', () => {
  it('splits every bucket between running and stopped, the halves adding up', async () => {
    for (const range of ['7d', '30d', '12m']) {
      const statement = (await desk().statement(ME, seed.teams[0]?.id, range)) as DeskStatement;
      expect(statement.spend.length).toBeGreaterThan(0);
      for (const bucket of statement.spend) {
        expect((bucket.runningCents ?? -1) + (bucket.stoppedCents ?? -1)).toBe(bucket.cents);
      }
      expect(statement.spend.some((bucket) => (bucket.stoppedCents ?? 0) > 0)).toBe(true);
    }
  });

  it('lists each world over the range, the most expensive first', async () => {
    const statement = (await desk().statement(ME, seed.teams[0]?.id, '30d')) as DeskStatement;
    const worlds = statement.worlds ?? [];
    expect(worlds.length).toBeGreaterThanOrEqual(2);
    expect(worlds.map((world) => world.cents)).toEqual(
      [...worlds.map((world) => world.cents)].sort((a, b) => b - a),
    );
    expect(worlds.reduce((sum, world) => sum + world.cents, 0)).toBe(statement.spendTotalCents);
    for (const world of worlds) {
      expect(world.daysRunning).toBeGreaterThanOrEqual(0);
      expect(world.daysRunning).toBeLessThanOrEqual(30);
      expect(['1g', '2g', '4g']).toContain(world.size);
    }
  });

  it('gives each world’s day its minutes, and the tariff in force for the sizes in use', async () => {
    const statement = (await desk().statement(ME, 'acc_personal', '7d')) as DeskStatement;
    const day = statement.lines.find((line) => line.kind === 'world_day');
    expect(typeof day?.minutesRunning).toBe('number');
    expect(typeof day?.minutesStopped).toBe('number');
    const inUse = new Set(
      statement.lines.filter((line) => line.kind === 'world_day').map((line) => line.size),
    );
    expect(statement.tariff?.rules).toEqual({ keepDaysAtZero: 90, noticeDaysForRise: 30 });
    expect(new Set(Object.keys(statement.tariff?.sizes ?? {}))).toEqual(inUse);
    expect(statement.tariff?.startsOn).toBe('2026-08-15');
  });

  it('gives the pace whatever the range: the 7 complete days before today and the month so far', async () => {
    const d = desk();
    const week = (await d.statement(ME, seed.teams[0]?.id, '7d')) as DeskStatement;
    const month = (await d.statement(ME, seed.teams[0]?.id, '30d')) as DeskStatement;
    expect(week.pace).toEqual(month.pace);
    // Today is the 14th: the seven days are the 7th to the 13th, the month the 1st to today.
    const daily = month.spend;
    const sum = (from: string, to: string) =>
      daily
        .filter((bucket) => bucket.bucket >= from && bucket.bucket <= to)
        .reduce((total, bucket) => total + bucket.cents, 0);
    expect(month.pace?.sevenDaysCents).toBe(sum('2026-10-07', '2026-10-13'));
    expect(month.pace?.monthCents).toBe(sum('2026-10-01', '2026-10-14'));
    expect(month.pace?.monthWorlds).toBeGreaterThanOrEqual(2);
  });

  it('answers as an older till would for a seed without a tariff: every day running whole, no tariff', async () => {
    const plain = createAccountsFixtureDesk(
      {
        personal: {
          id: 'acc_p',
          lines: [
            { kind: 'world_day', daysAgo: 1, amountCents: -60, worldId: 'w', size: '2g' },
            { kind: 'topup', daysAgo: 3, amountCents: 1000, vatCents: 210 },
          ],
        },
        teams: [],
      },
      () => NOW,
    ) as unknown as Loose;
    const statement = (await plain.statement(ME, 'acc_p', '7d')) as DeskStatement;
    expect(statement.spend).toEqual([
      { bucket: '2026-10-13', cents: 60, runningCents: 60, stoppedCents: 0 },
    ]);
    expect(statement.worlds).toEqual([{ worldId: 'w', size: '2g', daysRunning: 1, cents: 60 }]);
    expect(statement).not.toHaveProperty('tariff');
    expect(statement.pace).toEqual({ sevenDaysCents: 60, monthCents: 60, monthWorlds: 1 });
    expect(statement.lines[0]).not.toHaveProperty('minutesRunning');
  });
});
