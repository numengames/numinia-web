/**
 * The money Stripe takes back (refunds and disputes) and the poll's lag:
 * the real migration on the D1 shim, the desk as numinia.com calls it, a
 * pretend Stripe in place of the runtime's fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAG_SECONDS, applyTakeBack, pollState, pollStripe } from '../src/db/accounts';
import { Stripe, parseCharge, parseDispute } from '../src/lib/stripe';
import { AccountDesk, OracleDesk, handleMinute } from '../src/worker';
import { FAKE_PRICES, FakeStripe } from './fake-stripe';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const T = Math.floor(NOW.getTime() / 1000);
const PABLO = `0x${'ab'.repeat(20)}`;
const RETURN = 'https://numinia.com/es/saldo/vuelta/';
const ctx = {} as ExecutionContext;

function scene() {
  const { db, sqlite } = migratedTill();
  const stripe = new FakeStripe();
  vi.stubGlobal('fetch', stripe.fetch);
  const env = {
    TILL_DB: db,
    STRIPE_KEY: 'rk_test_pretend',
    TILL_TOPUP_PRICES: JSON.stringify(FAKE_PRICES),
  };
  const desk = new AccountDesk(ctx, env);
  const poll = () => pollStripe(db, new Stripe('rk_test_pretend', stripe.fetch), NOW);
  const balance = (account: string): number =>
    Number(
      (
        sqlite
          .prepare(
            'SELECT coalesce(SUM(amount_cents), 0) AS b FROM ledger_lines WHERE account_id = ?',
          )
          .get(account) as { b: number }
      ).b,
    );
  const lines = (kind: string) =>
    sqlite
      .prepare(
        'SELECT amount_cents, stripe_event_id, corrects_line_id, "by", reason FROM ledger_lines WHERE kind = ? ORDER BY at, id',
      )
      .all(kind)
      .map((row) => ({ ...row }));
  return { db, sqlite, stripe, desk, env, poll, balance, lines };
}

/** One paid 10 € top-up of Pablo's own account, credited by the poll. */
async function paidTopup(s: ReturnType<typeof scene>): Promise<string> {
  const overview = await s.desk.overview(PABLO);
  if (!overview.ok) throw new Error('no overview');
  const own = (overview.accounts[0] as { id: string }).id;
  await s.desk.startTopup(PABLO, own, '10', RETURN);
  s.stripe.pay('cs_test_0001', { created: T - 600 });
  await s.poll();
  expect(s.balance(own)).toBe(1000);
  return own;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('refunds', () => {
  it('takes a full refund back once, however often the event is read', async () => {
    const s = scene();
    const own = await paidTopup(s);
    s.stripe.refund('cs_test_0001', 1000, T - 300);
    const run = await s.poll();
    expect(run).toMatchObject({ takenBack: 1, unapplied: 0, complete: true, lagging: false });
    expect(s.balance(own)).toBe(0);
    await s.poll();
    expect(s.lines('refund')).toEqual([
      expect.objectContaining({ amount_cents: -1000, stripe_event_id: 'evt_test_0002' }),
    ]);
  });

  it('takes partial refunds back one by one, from the charge’s cumulative total', async () => {
    const s = scene();
    const own = await paidTopup(s);
    s.stripe.refund('cs_test_0001', 300, T - 300);
    s.stripe.refund('cs_test_0001', 200, T - 200);
    await s.poll();
    expect(s.lines('refund').map((line) => line.amount_cents)).toEqual([-300, -200]);
    expect(s.balance(own)).toBe(500);
  });

  it('lets the balance go below zero when the top-up was already spent', async () => {
    const s = scene();
    const own = await paidTopup(s);
    s.sqlite.exec(`
      INSERT INTO worlds (id, account_id, first_seen_on) VALUES ('w', '${own}', '2026-10-13');
      INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, world_id, machine, day,
                                minutes_running, minutes_stopped, size, tariff_version_id)
        VALUES ('D1', '${own}', 'world_day', -800, '2026-10-14T00:30:00.000Z', 'w', 'vps', '2026-10-13', 1440, 0, '2g', 1);
    `);
    s.stripe.refund('cs_test_0001', 1000, T - 300);
    await s.poll();
    expect(s.balance(own)).toBe(-800);
  });
});

describe('disputes', () => {
  it('takes a disputed amount back, and gives it back once when the dispute is won', async () => {
    const s = scene();
    const own = await paidTopup(s);
    s.stripe.dispute('cs_test_0001', 1000, 'charge.dispute.created', 'needs_response', T - 300);
    await s.poll();
    expect(s.balance(own)).toBe(0);
    s.stripe.dispute('cs_test_0001', 1000, 'charge.dispute.closed', 'won', T - 200);
    await s.poll();
    await s.poll();
    expect(s.balance(own)).toBe(1000);
    const [giveBack] = s.lines('adjustment');
    expect(giveBack).toMatchObject({
      amount_cents: 1000,
      by: 'stripe',
      reason: 'dispute du_test_0001 won',
    });
    const [chargeback] = s.sqlite
      .prepare("SELECT id FROM ledger_lines WHERE kind = 'chargeback'")
      .all() as {
      id: string;
    }[];
    expect(giveBack?.corrects_line_id).toBe(chargeback?.id);
  });

  it('keeps the money taken when a dispute is lost', async () => {
    const s = scene();
    const own = await paidTopup(s);
    s.stripe.dispute('cs_test_0001', 1000, 'charge.dispute.created', 'needs_response', T - 300);
    s.stripe.dispute('cs_test_0001', 1000, 'charge.dispute.closed', 'lost', T - 200);
    await s.poll();
    expect(s.balance(own)).toBe(0);
    expect(s.lines('adjustment')).toEqual([]);
  });
});

describe('what is not the till’s, or not in euros', () => {
  it('skips refunds of payments it never credited, and reports one not in euros', async () => {
    const s = scene();
    const own = await paidTopup(s);
    s.stripe.refund('cs_test_0001', 100, T - 300, 'usd');
    const run = await s.poll();
    expect(run).toMatchObject({ takenBack: 0, unapplied: 1 });
    expect(s.balance(own)).toBe(1000);
    await expect(
      handleMinute({ scheduledTime: NOW.getTime() }, s.env, s.stripe.fetch),
    ).rejects.toThrow(/refund\(s\) or dispute\(s\) of the till's top-ups not applied/);
    const foreign = {
      id: 'evt_x',
      type: 'charge.refunded',
      created: T,
      session: null,
      charge: { id: 'ch_x', paymentIntent: 'pi_other', amountRefunded: 500, currency: 'eur' },
      dispute: null,
    };
    expect(await applyTakeBack(s.db, foreign)).toBe('skipped');
    expect(
      await applyTakeBack(s.db, { ...foreign, charge: { ...foreign.charge, paymentIntent: null } }),
    ).toBe('skipped');
    expect(await applyTakeBack(s.db, { ...foreign, charge: null })).toBe('skipped');
  });

  it('ignores a refund that adds nothing, a dispute of nothing, and other dispute events', async () => {
    const s = scene();
    await paidTopup(s);
    const base = { id: 'evt_y', created: T, session: null };
    const charge = { id: 'ch', paymentIntent: 'pi_test_0001', amountRefunded: 0, currency: 'eur' };
    const dispute = {
      id: 'du',
      paymentIntent: 'pi_test_0001',
      amount: 1000,
      currency: 'eur',
      status: 'won',
    };
    expect(
      await applyTakeBack(s.db, { ...base, type: 'charge.refunded', charge, dispute: null }),
    ).toBe('applied');
    expect(
      await applyTakeBack(s.db, {
        ...base,
        type: 'charge.dispute.created',
        charge: null,
        dispute: { ...dispute, amount: 0 },
      }),
    ).toBe('skipped');
    expect(
      await applyTakeBack(s.db, { ...base, type: 'charge.dispute.updated', charge: null, dispute }),
    ).toBe('skipped');
    // A won dispute with no chargeback to give back writes nothing.
    expect(
      await applyTakeBack(s.db, { ...base, type: 'charge.dispute.closed', charge: null, dispute }),
    ).toBe('applied');
    expect(s.lines('adjustment')).toEqual([]);
  });

  it('marks a checkout expired when its late payment fails', async () => {
    const s = scene();
    const overview = await s.desk.overview(PABLO);
    const own = overview.ok ? (overview.accounts[0] as { id: string }).id : '';
    await s.desk.startTopup(PABLO, own, '10', RETURN);
    s.stripe.failAsync('cs_test_0001', T - 100);
    await s.poll();
    expect(s.sqlite.prepare('SELECT state FROM checkouts').get()).toEqual({ state: 'expired' });
  });
});

describe('the poll’s lag', () => {
  it('is told when the cursor was more than two days behind, and the Oracle’s desk sees it', async () => {
    const s = scene();
    const oracle = new OracleDesk(ctx, { TILL_DB: s.db });
    expect(await oracle.payments()).toEqual({ readThrough: null, lagging: false });
    s.sqlite.exec(
      `INSERT INTO stripe_cursor (id, last_created) VALUES (1, ${T - LAG_SECONDS - 60})`,
    );
    expect(await oracle.payments()).toEqual({
      readThrough: new Date((T - LAG_SECONDS - 60) * 1000).toISOString(),
      lagging: true,
    });
    await expect(
      handleMinute({ scheduledTime: NOW.getTime() }, s.env, s.stripe.fetch),
    ).rejects.toThrow(/more than two days behind/);
    // That run read the window and moved the cursor: the lag is over.
    expect(await pollState(s.db, NOW)).toMatchObject({ lagging: false });
  });
});

describe('reading charges and disputes', () => {
  it('reads what the till uses, ids of expanded objects included, and refuses the rest', () => {
    expect(
      parseCharge({
        object: 'charge',
        id: 'ch_1',
        payment_intent: { id: 'pi_1' },
        amount_refunded: 5,
        currency: 'eur',
      }),
    ).toEqual({ id: 'ch_1', paymentIntent: 'pi_1', amountRefunded: 5, currency: 'eur' });
    expect(
      parseCharge({
        object: 'charge',
        id: 'ch_1',
        payment_intent: null,
        amount_refunded: 5,
        currency: 'eur',
      }),
    ).toMatchObject({ paymentIntent: null });
    for (const bad of [
      null,
      { object: 'refund' },
      { object: 'charge', id: 'ch_1', amount_refunded: 1.5, currency: 'eur' },
      {
        object: 'charge',
        id: 'ch_1',
        payment_intent: { id: 3 },
        amount_refunded: 1,
        currency: 'eur',
      },
    ]) {
      expect(parseCharge(bad)).toBeNull();
    }
    expect(
      parseDispute({
        object: 'dispute',
        id: 'du_1',
        payment_intent: 'pi_1',
        amount: 9,
        currency: 'eur',
        status: 'won',
      }),
    ).toEqual({ id: 'du_1', paymentIntent: 'pi_1', amount: 9, currency: 'eur', status: 'won' });
    for (const bad of [
      'x',
      { object: 'charge' },
      { object: 'dispute', id: 'du_1', payment_intent: 'pi_1', amount: 9, currency: 'eur' },
      {
        object: 'dispute',
        id: 'du_1',
        payment_intent: { id: 3 },
        amount: 9,
        currency: 'eur',
        status: 'won',
      },
    ]) {
      expect(parseDispute(bad)).toBeNull();
    }
  });
});
