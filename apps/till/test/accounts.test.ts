import { describe, expect, it } from 'vitest';
import {
  AMOUNT_KEYS,
  LOW_BALANCE_CENTS,
  RANGES,
  parseTopupPrices,
  readAccountId,
  readAmountKey,
  readMemberWallet,
  readRange,
  readReturnBase,
  readRole,
  readSessionId,
  readTeamName,
  readWallet,
  spendBuckets,
  worldsOver,
} from '../src/lib/accounts';

const WALLET = `0x${'ab'.repeat(20)}`;

describe('reading what numinia.com sends', () => {
  it('takes the session’s wallet in lowercase only', () => {
    expect(readWallet(WALLET)).toBe(WALLET);
    for (const refused of [
      WALLET.toUpperCase(),
      `0x${'AB'.repeat(20)}`,
      WALLET.slice(0, 41),
      `${WALLET}0`,
      42,
      null,
    ]) {
      expect(readWallet(refused)).toBeUndefined();
    }
  });

  it('takes a member’s wallet in any case, and keeps it in lowercase', () => {
    expect(readMemberWallet(`0x${'AB'.repeat(20)}`)).toBe(WALLET);
    expect(readMemberWallet(`0X${'ab'.repeat(20)}`)).toBeUndefined();
    expect(readMemberWallet(undefined)).toBeUndefined();
  });

  it('takes account ids, names, roles, amounts, ranges and session ids', () => {
    expect(readAccountId('acc_t_0f')).toBe('acc_t_0f');
    expect(readAccountId('a'.repeat(65))).toBeUndefined();
    expect(readAccountId('acc lumen')).toBeUndefined();
    expect(readAccountId(7)).toBeUndefined();
    expect(readTeamName('  Numen Games ')).toBe('Numen Games');
    expect(readTeamName('é'.repeat(60))).toBe('é'.repeat(60));
    for (const refused of ['', '   ', 'é'.repeat(61), 'tab\there', 'line\nbreak', 3]) {
      expect(readTeamName(refused)).toBeUndefined();
    }
    expect(readRole('admin')).toBe('admin');
    expect(readRole('owner')).toBeUndefined();
    expect(AMOUNT_KEYS.map(readAmountKey)).toEqual(['10', '50', '100']);
    expect(readAmountKey(10)).toBeUndefined();
    expect(RANGES.map(readRange)).toEqual(['7d', '30d', '12m']);
    expect(readRange('1y')).toBeUndefined();
    expect(readSessionId('cs_test_a1B2')).toBe('cs_test_a1B2');
    for (const refused of ['pi_1', 'cs_', 'cs_a/b', `cs_${'a'.repeat(251)}`, null]) {
      expect(readSessionId(refused)).toBeUndefined();
    }
    expect(LOW_BALANCE_CENTS).toBe(1000);
  });

  it('lets Stripe send the buyer back to numinia.com or a local run only, whole and plain', () => {
    for (const allowed of [
      'https://numinia.com/saldo/vuelta/',
      'https://numinia.com/es/saldo/vuelta/',
      'http://localhost:4321/saldo/vuelta/',
      'http://127.0.0.1/saldo/vuelta/',
    ]) {
      expect(readReturnBase(allowed)).toBe(allowed);
    }
    for (const refused of [
      'http://numinia.com/saldo/vuelta/',
      'https://www.numinia.com/saldo/vuelta/',
      'https://numinia.com.evil.example/saldo/',
      'https://numinia.com:8443/saldo/',
      'https://localhost/saldo/',
      'https://numinia.com/saldo/vuelta/?x=1',
      'https://numinia.com/saldo/vuelta/#top',
      // Credentials in the URL, each half on its own (secretlint refuses a user:password pair even in a test).
      'https://user@numinia.com/saldo/',
      'https://:pass@numinia.com/saldo/',
      'https://NUMINIA.com/saldo/',
      'https://numinia.com/a b',
      'javascript:alert(1)',
      'not a url',
      null,
    ]) {
      expect(readReturnBase(refused)).toBeUndefined();
    }
  });

  it('reads TILL_TOPUP_PRICES whole, or not at all', () => {
    const prices = { '10': 'price_ten', '50': 'price_fifty', '100': 'price_hundred' };
    expect(parseTopupPrices(JSON.stringify(prices))).toEqual(prices);
    for (const refused of [
      undefined,
      '',
      '{',
      '[]',
      'null',
      JSON.stringify({ ...prices, '100': undefined }),
      JSON.stringify({ ...prices, '50': 'prod_x' }),
      JSON.stringify({ ...prices, '10': 1000 }),
    ]) {
      expect(parseTopupPrices(refused)).toBeUndefined();
    }
  });
});

describe('the spend of a range', () => {
  /** A day's spend, all of it running unless said otherwise. */
  const day = (on: string, cents: number, stoppedCents = 0) => ({
    day: on,
    cents,
    runningCents: cents - stoppedCents,
    stoppedCents,
  });
  const spends = [
    day('2026-10-14', 60),
    day('2026-10-14', 5, 5),
    day('2026-10-08', 60),
    day('2026-10-07', 33, 3),
    day('2025-11-30', 7, 2),
    day('2025-10-31', 9),
  ];
  const empty = (bucket: string) => ({ bucket, cents: 0, runningCents: 0, stoppedCents: 0 });

  it('buckets the last 7 or 30 UTC days, today included, oldest first', () => {
    const week = spendBuckets('7d', '2026-10-14', spends);
    expect(week.map((bucket) => bucket.bucket)).toEqual([
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
    expect(week.map((bucket) => bucket.cents)).toEqual([60, 0, 0, 0, 0, 0, 65]);
    const month = spendBuckets('30d', '2026-10-14', spends);
    expect(month).toHaveLength(30);
    expect(month[0]).toEqual(empty('2026-09-15'));
    expect(month.reduce((sum, bucket) => sum + bucket.cents, 0)).toBe(158);
  });

  it('splits every bucket between the minutes the worlds ran and the minutes they were stopped', () => {
    const week = spendBuckets('7d', '2026-10-14', spends);
    expect(week[6]).toEqual({ bucket: '2026-10-14', cents: 65, runningCents: 60, stoppedCents: 5 });
    expect(week[1]).toEqual(empty('2026-10-09'));
    for (const bucket of spendBuckets('30d', '2026-10-14', spends)) {
      expect(bucket.runningCents + bucket.stoppedCents).toBe(bucket.cents);
    }
    expect(spendBuckets('30d', '2026-10-14', spends)[22]).toEqual({
      bucket: '2026-10-07',
      cents: 33,
      runningCents: 30,
      stoppedCents: 3,
    });
  });

  it('buckets the last 12 months across a new year', () => {
    const year = spendBuckets('12m', '2026-10-14', spends);
    expect(year.map((bucket) => bucket.bucket)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(year[0]).toEqual({ bucket: '2025-11', cents: 7, runningCents: 5, stoppedCents: 2 });
    expect(year[11]).toEqual({ bucket: '2026-10', cents: 158, runningCents: 150, stoppedCents: 8 });
    expect(spendBuckets('12m', '2027-01-01', [])[0]).toEqual(empty('2026-02'));
  });
});

describe('each world over a range', () => {
  const use = (
    worldId: string,
    day: string,
    size: string,
    minutesRunning: number,
    cents: number,
  ) => ({
    worldId,
    day,
    size,
    minutesRunning,
    cents,
  });
  const days = [
    use('agora', '2026-10-13', '4g', 720, 65),
    use('agora', '2026-10-12', '4g', 1440, 120),
    use('agora', '2026-09-20', '2g', 1440, 60),
    use('taller', '2026-10-13', '1g', 0, 3),
    use('taller', '2026-10-11', '1g', 0, 0),
    use('biblioteca', '2026-10-01', '1g', 300, 9),
    use('puertas', '2026-10-10', '2g', 1440, 120),
    use('archivo', '2025-09-30', '2g', 1440, 60),
  ];

  it('gives its size, the days it ran at all and what it cost, the most expensive first', () => {
    expect(worldsOver('30d', '2026-10-14', days)).toEqual([
      { worldId: 'agora', size: '4g', daysRunning: 3, cents: 245 },
      { worldId: 'puertas', size: '2g', daysRunning: 1, cents: 120 },
      { worldId: 'biblioteca', size: '1g', daysRunning: 1, cents: 9 },
      { worldId: 'taller', size: '1g', daysRunning: 0, cents: 3 },
    ]);
  });

  it('counts only the days of the range, and its latest size there', () => {
    expect(worldsOver('7d', '2026-10-14', days)).toEqual([
      { worldId: 'agora', size: '4g', daysRunning: 2, cents: 185 },
      { worldId: 'puertas', size: '2g', daysRunning: 1, cents: 120 },
      { worldId: 'taller', size: '1g', daysRunning: 0, cents: 3 },
    ]);
    // A world that changed size: the size of its latest day in the range, whatever order the days come in.
    expect(worldsOver('30d', '2026-10-14', [...days].reverse())[0]?.size).toBe('4g');
    expect(worldsOver('12m', '2026-10-14', days).map((world) => world.worldId)).toEqual([
      'agora',
      'puertas',
      'biblioteca',
      'taller',
    ]);
    expect(worldsOver('7d', '2026-10-14', [])).toEqual([]);
  });

  it('orders worlds of the same cost by id', () => {
    expect(
      worldsOver('7d', '2026-10-14', [
        use('zeta', '2026-10-13', '2g', 1440, 60),
        use('alfa', '2026-10-13', '2g', 1440, 60),
        use('mitad', '2026-10-13', '2g', 1440, 60),
      ]).map((world) => world.worldId),
    ).toEqual(['alfa', 'mitad', 'zeta']);
  });
});
