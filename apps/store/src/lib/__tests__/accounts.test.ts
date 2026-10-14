import { describe, expect, it } from 'vitest';
import {
  ADMIN_ONLY,
  LAST_ADMIN,
  NOT_CONFIGURED,
  NOT_MEMBER,
  bucketsOf,
  chartBars,
  checkoutTarget,
  fill,
  formatAt,
  formatBucket,
  formatEuros,
  formatTopup,
  isCheckoutId,
  isSpendRange,
  isTopupKey,
  isWallet,
  lineLabel,
  problemOf,
  readOverview,
  readResult,
  readStatement,
  readYou,
  shortWallet,
  signedEuros,
  spendSeries,
  teamName,
  vueltaBase,
  vueltaParams,
  walletOf,
} from '../accounts';

const WALLET = `0x${'Ab'.repeat(20)}`;
const ACCOUNT = { id: 'acc', kind: 'personal', name: null, role: 'owner', balanceCents: 420 };

describe('small checks', () => {
  it('reads wallets, names, ranges, amounts and checkout ids', () => {
    expect(isWallet(WALLET)).toBe(true);
    expect(walletOf(`  ${WALLET} `)).toBe(WALLET.toLowerCase());
    expect(walletOf('0x12')).toBeNull();
    expect(shortWallet(WALLET.toLowerCase())).toBe('0xabab…abab');
    expect(shortWallet('0x12')).toBe('0x12');
    expect(teamName('  Numen Games ')).toBe('Numen Games');
    expect(teamName('   ')).toBeNull();
    expect(teamName('x'.repeat(61))).toBeNull();
    expect(isSpendRange('30d')).toBe(true);
    expect(isSpendRange('1y')).toBe(false);
    expect(isSpendRange(7)).toBe(false);
    expect(isTopupKey('50')).toBe(true);
    expect(isTopupKey('20')).toBe(false);
    expect(isTopupKey(10)).toBe(false);
    expect(isCheckoutId('cs_test_a1')).toBe(true);
    expect(isCheckoutId('pi_1')).toBe(false);
    expect(fill('Saldo {b} · {x}', { b: '4,20 €' })).toBe('Saldo 4,20 € · {x}');
  });
});

describe('money, days and months for people', () => {
  it('writes euros and top-ups in the reader’s language', () => {
    expect(formatEuros(420, 'es')).toMatch(/^4,20\s€$/);
    expect(formatEuros(420, 'en')).toBe('€4.20');
    expect(formatEuros(-0, 'en')).toBe('€0.00');
    expect(formatTopup('100', 'es')).toMatch(/^100\s€$/);
    expect(signedEuros(1000, 'en')).toBe('+€10.00');
    expect(signedEuros(-20, 'en')).toBe('-€0.20');
    expect(signedEuros(0, 'en')).toBe('€0.00');
  });

  it('labels days and months, and instants on a given clock', () => {
    expect(formatBucket('2026-10-14', 'en')).toBe('Oct 14');
    expect(formatBucket('2026-10', 'en')).toBe('Oct 2026');
    expect(formatAt('2026-10-14T10:00:00.000Z', 'en', 'UTC')).toBe('Oct 14, 2026, 10:00 AM');
    expect(formatAt('2026-10-14T10:00:00.000Z', 'en')).toContain('2026');
    expect(formatAt('not a date', 'en')).toBe('not a date');
  });

  it('covers every bucket of a range, filling the ones the till did not name', () => {
    const now = new Date('2026-01-03T12:00:00.000Z');
    expect(bucketsOf('7d', now)).toEqual([
      '2025-12-28',
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ]);
    expect(bucketsOf('30d', now)).toHaveLength(30);
    expect(bucketsOf('12m', now)[0]).toBe('2025-02');
    expect(bucketsOf('12m', now).at(-1)).toBe('2026-01');
    const series = spendSeries(
      [
        { bucket: '2026-01-02', cents: 60 },
        { bucket: '2026-01-02', cents: 20 },
        { bucket: '2026-01-03', cents: -5 },
        { bucket: '2025-01-01', cents: 99 },
      ],
      '7d',
      now,
    );
    expect(series.at(-2)).toEqual({ bucket: '2026-01-02', cents: 80 });
    expect(series.at(-1)).toEqual({ bucket: '2026-01-03', cents: 0 });
    expect(series.reduce((sum, entry) => sum + entry.cents, 0)).toBe(80);
  });

  it('draws bars: the tallest full height, a small cost still visible, nothing for nothing', () => {
    const bars = chartBars(
      [
        { bucket: 'a', cents: 0 },
        { bucket: 'b', cents: 1 },
        { bucket: 'c', cents: 1000 },
      ],
      300,
      100,
    );
    expect(bars.map((bar) => bar.height)).toEqual([0, 1, 100]);
    expect(bars[2]).toMatchObject({ x: 210, y: 0, width: 80 });
    expect(chartBars([{ bucket: 'a', cents: 0 }], 300, 100)[0]?.height).toBe(0);
    expect(chartBars([], 300, 100)).toEqual([]);
  });

  it('names lines as a person reads them', () => {
    expect(lineLabel('world_day')).toBe('world');
    expect(lineLabel('chargeback')).toBe('refund');
    expect(lineLabel('refund')).toBe('refund');
    expect(lineLabel('topup')).toBe('topup');
  });
});

describe('the till’s refusals', () => {
  it('tells apart the ones the screen has words for', () => {
    expect(problemOf([NOT_CONFIGURED])).toBe('notConfigured');
    expect(problemOf([NOT_MEMBER])).toBe('notMember');
    expect(problemOf([ADMIN_ONLY])).toBe('adminOnly');
    expect(problemOf([LAST_ADMIN])).toBe('lastAdmin');
    expect(problemOf(['something else'])).toBe('other');
  });
});

describe('Stripe in a new tab and the way back', () => {
  it('builds the way back per locale and lets the tab reach Stripe or this site only', () => {
    expect(vueltaBase('https://numinia.com', 'es')).toBe('https://numinia.com/es/saldo/vuelta/');
    expect(vueltaBase('https://numinia.com', 'en')).toBe('https://numinia.com/saldo/vuelta/');
    const origin = 'https://numinia.com';
    expect(checkoutTarget('https://checkout.stripe.com/c/pay/cs_1', origin)).toBe(
      'https://checkout.stripe.com/c/pay/cs_1',
    );
    expect(checkoutTarget('https://numinia.com/saldo/vuelta/?session_id=cs_1', origin)).toBe(
      'https://numinia.com/saldo/vuelta/?session_id=cs_1',
    );
    expect(checkoutTarget('http://checkout.stripe.com/x', origin)).toBeNull();
    expect(checkoutTarget('https://evil.example/', origin)).toBeNull();
    expect(checkoutTarget('not a url', origin)).toBeNull();
    expect(checkoutTarget(42, origin)).toBeNull();
  });

  it('reads what Stripe hands the way back', () => {
    expect(vueltaParams('?session_id=cs_test_1')).toEqual({
      sessionId: 'cs_test_1',
      cancelled: false,
    });
    expect(vueltaParams('?session_id=evil&cancelled=1')).toEqual({
      sessionId: null,
      cancelled: true,
    });
    expect(vueltaParams('')).toEqual({ sessionId: null, cancelled: false });
  });
});

describe('reading the API in the browser', () => {
  it('reads an overview, or nothing', () => {
    expect(readOverview({ accounts: [ACCOUNT] })).toEqual([ACCOUNT]);
    expect(readOverview({ accounts: [{ ...ACCOUNT, kind: 'shop' }] })).toBeNull();
    expect(readOverview({ accounts: [{ ...ACCOUNT, balanceCents: '4' }] })).toBeNull();
    expect(readOverview({ accounts: 'x' })).toBeNull();
    expect(readOverview([])).toBeNull();
    expect(readOverview(null)).toBeNull();
  });

  it('reads a statement and who is asking, or nothing', () => {
    const statement = {
      account: ACCOUNT,
      balanceCents: 420,
      lowBalance: true,
      lots: [],
      spend: [],
      spendTotalCents: 0,
      lines: [],
    };
    expect(readStatement({ statement })).toEqual(statement);
    expect(readStatement({ statement: { ...statement, members: [] } })).not.toBeNull();
    expect(readStatement({ statement: { ...statement, members: 'x' } })).toBeNull();
    expect(readStatement({ statement: { ...statement, lowBalance: 'yes' } })).toBeNull();
    expect(readStatement({ statement: null })).toBeNull();
    expect(readStatement('x')).toBeNull();
    expect(readYou({ you: '0xab' })).toBe('0xab');
    expect(readYou({})).toBeNull();
    expect(readYou(null)).toBeNull();
  });

  it('reads a POST’s result, or nothing', () => {
    expect(readResult({ result: { ok: true, url: 'u' } })).toEqual({ ok: true, url: 'u' });
    expect(readResult({ result: { ok: false, problems: ['a', 1] } })).toEqual({
      ok: false,
      problems: ['a', '1'],
    });
    expect(readResult({ result: { ok: false } })).toBeNull();
    expect(readResult({ result: 'x' })).toBeNull();
    expect(readResult(null)).toBeNull();
  });
});
