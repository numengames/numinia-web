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
} from '../src/lib/accounts';

const WALLET = `0x${'ab'.repeat(20)}`;

describe('reading what numinia.com sends', () => {
  it('takes the session’s wallet in lowercase only', () => {
    expect(readWallet(WALLET)).toBe(WALLET);
    for (const refused of [WALLET.toUpperCase(), `0x${'AB'.repeat(20)}`, WALLET.slice(0, 41), `${WALLET}0`, 42, null]) {
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
      'https://user:pass@numinia.com/saldo/',
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
  const spends = [
    { day: '2026-10-14', cents: 60 },
    { day: '2026-10-14', cents: 5 },
    { day: '2026-10-08', cents: 60 },
    { day: '2026-10-07', cents: 33 },
    { day: '2025-11-30', cents: 7 },
    { day: '2025-10-31', cents: 9 },
  ];

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
    expect(month[0]).toEqual({ bucket: '2026-09-15', cents: 0 });
    expect(month.reduce((sum, bucket) => sum + bucket.cents, 0)).toBe(158);
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
    expect(year[0]).toEqual({ bucket: '2025-11', cents: 7 });
    expect(year[11]).toEqual({ bucket: '2026-10', cents: 158 });
    expect(spendBuckets('12m', '2027-01-01', [])[0]).toEqual({ bucket: '2026-02', cents: 0 });
  });
});
