/**
 * The account desk (cut «Saldo», MIS-179, MIS-180) end to end: the real
 * migration on the D1 shim, the desk as numinia.com's binding calls it, and
 * a pretend Stripe in place of the runtime's fetch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROBLEMS,
  TEAMS_PER_FOUNDER,
  applySession,
  checkoutOf,
  creditOf,
  ledgerLineOf,
  memberOf,
  personalAccountId,
  pollStripe,
  summaryOf,
} from '../src/db/accounts';
import { Stripe } from '../src/lib/stripe';
import {
  AccountDesk,
  MINUTE_CRON,
  NIGHTLY_CRON,
  dispatchScheduled,
  handleMinute,
  paymentsFor,
} from '../src/worker';
import { WorkerEntrypoint } from './cloudflare-workers';
import { FAKE_PRICES, FakeStripe } from './fake-stripe';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const PABLO = `0x${'ab'.repeat(20)}`;
const MARIA = `0x${'cd'.repeat(20)}`;
const STRANGER = `0x${'ef'.repeat(20)}`;
const RETURN = 'https://numinia.com/es/saldo/vuelta/';
const ctx = {} as ExecutionContext;

interface Scene {
  readonly desk: AccountDesk;
  readonly stripe: FakeStripe;
  readonly sqlite: ReturnType<typeof migratedTill>['sqlite'];
  readonly db: ReturnType<typeof migratedTill>['db'];
}

function scene(configured = true): Scene {
  const { db, sqlite } = migratedTill();
  const stripe = new FakeStripe();
  vi.stubGlobal('fetch', stripe.fetch);
  const env = configured
    ? { TILL_DB: db, STRIPE_KEY: 'rk_test_pretend', TILL_TOPUP_PRICES: JSON.stringify(FAKE_PRICES) }
    : { TILL_DB: db };
  return { desk: new AccountDesk(ctx, env), stripe, sqlite, db };
}

async function personal(desk: AccountDesk, wallet = PABLO): Promise<string> {
  const answer = await desk.overview(wallet);
  if (!answer.ok) throw new Error('no overview');
  return (answer.accounts[0] as { id: string }).id;
}

async function team(desk: AccountDesk, name = 'Numen Games', wallet = PABLO): Promise<string> {
  const answer = await desk.createTeam(wallet, name);
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.account.id;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the desk', () => {
  it('is a WorkerEntrypoint whose prototype declares its methods, and no fetch', () => {
    const { desk } = scene();
    expect(desk).toBeInstanceOf(WorkerEntrypoint);
    expect(Object.getOwnPropertyNames(AccountDesk.prototype).sort()).toEqual([
      'confirmTopup',
      'constructor',
      'createTeam',
      'members',
      'overview',
      'removeMember',
      'renameTeam',
      'setMember',
      'startTopup',
      'statement',
    ]);
  });

  it('refuses a wallet that is not the session’s shape, everywhere', async () => {
    const { desk } = scene();
    const bad = PABLO.toUpperCase();
    const refusal = { ok: false, problems: [PROBLEMS.wallet] };
    expect(await desk.overview(bad)).toEqual(refusal);
    expect(await desk.createTeam(bad, 'X')).toEqual(refusal);
    expect(await desk.renameTeam(bad, 'acc_x', 'X')).toEqual(refusal);
    expect(await desk.statement(bad, 'acc_x', '7d')).toEqual(refusal);
    expect(await desk.members(bad, 'acc_x')).toEqual(refusal);
    expect(await desk.setMember(bad, 'acc_x', MARIA, 'member')).toEqual(refusal);
    expect(await desk.removeMember(bad, 'acc_x', MARIA)).toEqual(refusal);
    expect(await desk.startTopup(bad, 'acc_x', '10', RETURN)).toEqual(refusal);
    expect(await desk.confirmTopup(bad, 'cs_test_1')).toEqual(refusal);
  });

  it('names every other bad field at once', async () => {
    const { desk } = scene();
    expect(await desk.createTeam(PABLO, '')).toEqual({ ok: false, problems: [PROBLEMS.name] });
    expect(await desk.createTeam(1, '')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.name],
    });
    expect(await desk.renameTeam(1, 'a b', '')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, PROBLEMS.name],
    });
    expect(await desk.statement(1, 'a b', '1y')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, PROBLEMS.range],
    });
    expect(await desk.members(1, 'a b')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId],
    });
    expect(await desk.setMember(1, 'a b', 'x', 'owner')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, PROBLEMS.memberWallet, PROBLEMS.role],
    });
    expect(await desk.removeMember(1, 'a b', 'x')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, PROBLEMS.memberWallet],
    });
    expect(await desk.startTopup(1, 'a b', '20', 'https://evil.example/')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, PROBLEMS.amountKey, PROBLEMS.returnBase],
    });
    expect(await desk.confirmTopup(1, 'pi_1')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.sessionId],
    });
  });
});

describe('accounts and organizations', () => {
  it('opens a wallet’s own account the first time, once, with an id that does not hold the wallet', async () => {
    const { desk, sqlite } = scene();
    const first = await desk.overview(PABLO);
    const again = await desk.overview(PABLO);
    const id = await personalAccountId(PABLO);
    expect(id).toMatch(/^acc_p_[0-9a-f]{24}$/);
    expect(id).not.toContain(PABLO.slice(2, 10));
    expect(first).toEqual({
      ok: true,
      accounts: [{ id, kind: 'personal', name: null, role: 'owner', balanceCents: 0 }],
    });
    expect(again).toEqual(first);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 1 });
  });

  it('founds organizations with the founder as admin, lists them by name after one’s own', async () => {
    const { desk } = scene();
    const numen = await team(desk, 'Numen Games');
    const arca = await team(desk, 'arcasiles');
    const answer = await desk.overview(PABLO);
    expect(answer.ok && answer.accounts.map((a) => [a.kind, a.name, a.role])).toEqual([
      ['personal', null, 'owner'],
      ['team', 'arcasiles', 'admin'],
      ['team', 'Numen Games', 'admin'],
    ]);
    expect(numen).toMatch(/^acc_t_[0-9a-f]{32}$/);
    expect(arca).not.toBe(numen);
  });

  it('bounds how many organizations one wallet founds', async () => {
    const { desk } = scene();
    for (let n = 0; n < TEAMS_PER_FOUNDER; n += 1) await team(desk, `Org ${n}`);
    expect(await desk.createTeam(PABLO, 'One more')).toEqual({
      ok: false,
      problems: [PROBLEMS.teamsPerFounder],
    });
  });

  it('lets admins rename, members not, strangers not, and a personal account is no organization', async () => {
    const { desk } = scene();
    const numen = await team(desk);
    await desk.setMember(PABLO, numen, MARIA, 'member');
    expect(await desk.renameTeam(PABLO, numen, '  Numen  ')).toEqual({
      ok: true,
      account: { id: numen, kind: 'team', name: 'Numen', role: 'admin', balanceCents: 0 },
    });
    expect(await desk.renameTeam(MARIA, numen, 'Mine')).toEqual({
      ok: false,
      problems: [PROBLEMS.adminsOnly],
    });
    expect(await desk.renameTeam(STRANGER, numen, 'Mine')).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    const own = await personal(desk);
    expect(await desk.renameTeam(PABLO, own, 'Mine')).toEqual({
      ok: false,
      problems: [PROBLEMS.notTeam],
    });
  });

  it('adds members, changes roles, removes them, and never leaves an organization without an admin', async () => {
    const { desk } = scene();
    const numen = await team(desk);
    const added = await desk.setMember(
      PABLO,
      numen,
      MARIA.toUpperCase().replace('0X', '0x'),
      'member',
    );
    expect(added.ok && added.members.map((m) => [m.wallet, m.role])).toEqual([
      [PABLO, 'admin'],
      [MARIA, 'member'],
    ]);
    expect(await desk.members(MARIA, numen)).toEqual({
      ok: false,
      problems: [PROBLEMS.adminsOnly],
    });
    expect(await desk.setMember(PABLO, numen, PABLO, 'member')).toEqual({
      ok: false,
      problems: [PROBLEMS.lastAdmin],
    });
    expect(await desk.removeMember(PABLO, numen, PABLO)).toEqual({
      ok: false,
      problems: [PROBLEMS.lastAdmin],
    });
    expect(await desk.removeMember(PABLO, numen, STRANGER)).toEqual({
      ok: false,
      problems: [PROBLEMS.noSuchMember],
    });
    await desk.setMember(PABLO, numen, MARIA, 'admin');
    const stepped = await desk.setMember(PABLO, numen, PABLO, 'member');
    expect(stepped.ok && stepped.members.map((m) => [m.wallet, m.role])).toEqual([
      [MARIA, 'admin'],
      [PABLO, 'member'],
    ]);
    const removed = await desk.removeMember(MARIA, numen, PABLO);
    expect(removed.ok && removed.members.map((m) => m.wallet)).toEqual([MARIA]);
    const read = await desk.members(MARIA, numen);
    expect(read.ok && read.members.length).toBe(1);
  });

  it('keeps an admin even when a write slips past the desk', () => {
    const { sqlite } = scene();
    sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc_t_x', 'team', '2026-10-14T12:00:00.000Z');
      INSERT INTO team_profiles VALUES ('acc_t_x', 'X', '${PABLO}', '2026-10-14T12:00:00.000Z');
      INSERT INTO team_members VALUES ('acc_t_x', '${PABLO}', 'admin', '${PABLO}', '2026-10-14T12:00:00.000Z');
    `);
    expect(() => sqlite.exec("DELETE FROM team_members WHERE account_id = 'acc_t_x'")).toThrow(
      /admin/,
    );
    expect(() => sqlite.exec("UPDATE team_members SET role = 'member'")).toThrow(/admin/);
  });
});

describe('the statement', () => {
  it('shows balance, lots, spend per day, newest lines first and, for an organization, its members', async () => {
    const { desk, sqlite } = scene();
    const numen = await team(desk);
    sqlite.exec(`
      INSERT INTO worlds (id, account_id, first_seen_on) VALUES ('w-agora', '${numen}', '2026-10-10');
      INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents)
        VALUES ('L1', '${numen}', 'topup', 1000, '2026-10-10T09:00:00.000Z', 210);
      INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, world_id, machine, day,
                                minutes_running, minutes_stopped, size, tariff_version_id)
        VALUES ('L2', '${numen}', 'world_day', -60, '2026-10-13T00:30:00.000Z', 'w-agora', 'vps-3-a',
                '2026-10-12', 1440, 0, '2g', 1);
      INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, "by", reason)
        VALUES ('L3', '${numen}', 'adjustment', 25, '2026-10-13T10:00:00.000Z', '${PABLO}', 'a gift');
    `);
    const answer = await desk.statement(PABLO, numen, '7d');
    if (!answer.ok) throw new Error(answer.problems.join());
    expect(answer.balanceCents).toBe(965);
    expect(answer.lowBalance).toBe(true);
    expect(answer.lots).toEqual([
      { lineId: 'L1', at: '2026-10-10T09:00:00.000Z', amountCents: 1000, remainderCents: 940 },
      { lineId: 'L3', at: '2026-10-13T10:00:00.000Z', amountCents: 25, remainderCents: 25 },
    ]);
    expect(answer.spend).toHaveLength(7);
    expect(answer.spend.find((b) => b.bucket === '2026-10-12')?.cents).toBe(60);
    expect(answer.spendTotalCents).toBe(60);
    expect(answer.lines.map((l) => l.kind)).toEqual(['adjustment', 'world_day', 'topup']);
    expect(answer.lines[0]).toMatchObject({ reason: 'a gift' });
    expect(answer.lines[1]).toMatchObject({ day: '2026-10-12', worldId: 'w-agora', size: '2g' });
    expect(answer.lines[2]).toMatchObject({ vatCents: 210 });
    expect(answer.members?.map((m) => m.wallet)).toEqual([PABLO]);
  });

  it('shows one’s own account without members, and nothing to a stranger', async () => {
    const { desk } = scene();
    const own = await personal(desk);
    const answer = await desk.statement(PABLO, own, '12m');
    expect(answer.ok && answer.members).toBeUndefined();
    expect(answer.ok && answer.spend).toHaveLength(12);
    expect(await desk.statement(STRANGER, own, '30d')).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
  });
});

describe('top-ups through Stripe Managed Payments Checkout', () => {
  it('opens a payment-mode Checkout with Managed Payments for an account the wallet belongs to', async () => {
    const { desk, stripe, sqlite } = scene();
    const numen = await team(desk);
    await desk.setMember(PABLO, numen, MARIA, 'member');
    const answer = await desk.startTopup(MARIA, numen, '50', RETURN);
    expect(answer).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_0001' });
    const form = stripe.requests[0]?.form;
    expect(Object.fromEntries(form ?? [])).toEqual({
      mode: 'payment',
      'line_items[0][price]': 'price_fifty',
      'line_items[0][quantity]': '1',
      'managed_payments[enabled]': 'true',
      client_reference_id: numen,
      'metadata[account]': numen,
      'metadata[wallet]': MARIA,
      success_url: `${RETURN}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${RETURN}?cancelled=1`,
    });
    expect(
      sqlite.prepare('SELECT account_id, wallet, amount_key, state FROM checkouts').all(),
    ).toEqual([{ account_id: numen, wallet: MARIA, amount_key: '50', state: 'open' }]);
  });

  it('refuses a stranger’s account, and says when payments are not configured', async () => {
    const { desk } = scene();
    const own = await personal(desk);
    expect(await desk.startTopup(STRANGER, own, '10', RETURN)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    const bare = scene(false);
    const bareOwn = await personal(bare.desk);
    expect(await bare.desk.startTopup(PABLO, bareOwn, '10', RETURN)).toEqual({
      ok: false,
      problems: [PROBLEMS.notConfigured],
    });
    expect(paymentsFor({ STRIPE_KEY: 'rk', TILL_TOPUP_PRICES: '{}' })).toBeNull();
    expect(
      paymentsFor({ STRIPE_KEY: '', TILL_TOPUP_PRICES: JSON.stringify(FAKE_PRICES) }),
    ).toBeNull();
  });

  it('credits a paid session once on return: the amount paid, the tax Stripe collected beside it', async () => {
    const { desk, stripe, sqlite } = scene();
    const own = await personal(desk);
    await desk.startTopup(PABLO, own, '10', RETURN);
    expect(await desk.confirmTopup(PABLO, 'cs_test_0001')).toEqual({
      ok: true,
      state: 'open',
      accountId: own,
      balanceCents: 0,
    });
    stripe.pay('cs_test_0001', { amountTotal: 1000, amountTax: 174 });
    const paid = await desk.confirmTopup(PABLO, 'cs_test_0001');
    expect(paid).toEqual({ ok: true, state: 'paid', accountId: own, balanceCents: 1000 });
    const asked = stripe.requests.length;
    expect(await desk.confirmTopup(PABLO, 'cs_test_0001')).toEqual(paid);
    expect(stripe.requests.length).toBe(asked);
    expect(
      sqlite
        .prepare(
          'SELECT kind, amount_cents, vat_cents, stripe_payment_id, stripe_invoice_id FROM ledger_lines',
        )
        .all(),
    ).toEqual([
      {
        kind: 'topup',
        amount_cents: 1000,
        vat_cents: 174,
        stripe_payment_id: 'pi_test_0001',
        stripe_invoice_id: 'in_test_0001',
      },
    ]);
  });

  it('marks an expired session, refuses someone else’s, and refuses what it cannot credit', async () => {
    const { desk, stripe } = scene();
    const own = await personal(desk);
    await desk.startTopup(PABLO, own, '10', RETURN);
    await desk.startTopup(PABLO, own, '10', RETURN);
    stripe.expire('cs_test_0001');
    expect(await desk.confirmTopup(PABLO, 'cs_test_0001')).toMatchObject({ state: 'expired' });
    expect(await desk.confirmTopup(MARIA, 'cs_test_0002')).toEqual({
      ok: false,
      problems: [PROBLEMS.notOurs],
    });
    expect(await desk.confirmTopup(PABLO, 'cs_test_9999')).toEqual({
      ok: false,
      problems: [PROBLEMS.notOurs],
    });
    stripe.pay('cs_test_0002', { currency: 'usd' });
    expect(await desk.confirmTopup(PABLO, 'cs_test_0002')).toEqual({
      ok: false,
      problems: [PROBLEMS.uncreditable],
    });
  });

  it('cannot confirm an open checkout once payments are switched off', async () => {
    const { db, stripe } = scene();
    const on = new AccountDesk(ctx, {
      TILL_DB: db,
      STRIPE_KEY: 'rk_test_pretend',
      TILL_TOPUP_PRICES: JSON.stringify(FAKE_PRICES),
    });
    const own = await personal(on);
    await on.startTopup(PABLO, own, '10', RETURN);
    stripe.pay('cs_test_0001');
    const off = new AccountDesk(ctx, { TILL_DB: db });
    expect(await off.confirmTopup(PABLO, 'cs_test_0001')).toEqual({
      ok: false,
      problems: [PROBLEMS.notConfigured],
    });
  });
});

describe('the minute’s poll of Stripe’s events', () => {
  it('credits paid checkouts it finds, skips sessions that are not the till’s, and moves its cursor', async () => {
    const { desk, stripe, db, sqlite } = scene();
    const own = await personal(desk);
    await desk.startTopup(PABLO, own, '100', RETURN);
    await desk.startTopup(PABLO, own, '10', RETURN);
    stripe.pay('cs_test_0001', { created: NOW_SECONDS - 30 });
    stripe.pay('cs_test_0002', { created: NOW_SECONDS - 20, async: true });
    stripe.foreign(NOW_SECONDS - 10);
    const run = await pollStripe(db, new Stripe('rk_test_pretend', stripe.fetch), NOW);
    expect(run).toEqual({
      events: 4,
      applied: 2,
      uncreditable: 0,
      takenBack: 0,
      unapplied: 0,
      cursor: NOW_SECONDS - 10,
      complete: true,
      lagging: false,
    });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM ledger_lines WHERE kind = 'topup'").get(),
    ).toEqual({ n: 2 });
    // A second run over the same window writes nothing new.
    const again = await pollStripe(db, new Stripe('rk_test_pretend', stripe.fetch), NOW);
    expect(again.applied).toBe(2);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM ledger_lines WHERE kind = 'topup'").get(),
    ).toEqual({ n: 2 });
    expect(stripe.requests.at(-1)?.form.get('created[gte]')).toBe(String(NOW_SECONDS - 10 - 300));
  });

  it('reads the last day the first time, and moves the cursor even with no event', async () => {
    const { db, stripe } = scene();
    const run = await pollStripe(db, new Stripe('rk_test_pretend', stripe.fetch), NOW);
    expect(stripe.requests[0]?.form.get('created[gte]')).toBe(String(NOW_SECONDS - 86_400 - 300));
    expect(run).toEqual({
      events: 0,
      applied: 0,
      uncreditable: 0,
      takenBack: 0,
      unapplied: 0,
      cursor: NOW_SECONDS - 300,
      complete: true,
      lagging: false,
    });
  });

  it('runs on the minute cron only with a key, fails loudly on what it cannot credit, and dispatches by cron', async () => {
    const { db, stripe, desk } = scene();
    expect(await handleMinute({ scheduledTime: NOW.getTime() }, { TILL_DB: db })).toBeNull();
    const env = { TILL_DB: db, STRIPE_KEY: 'rk_test_pretend' };
    expect(await handleMinute({ scheduledTime: NOW.getTime() }, env, stripe.fetch)).toMatchObject({
      complete: true,
    });
    const own = await personal(desk);
    await desk.startTopup(PABLO, own, '10', RETURN);
    stripe.pay('cs_test_0001', { currency: 'usd', created: NOW_SECONDS });
    await expect(handleMinute({ scheduledTime: NOW.getTime() }, env, stripe.fetch)).rejects.toThrow(
      /1 paid session\(s\) not credited/,
    );
    await expect(
      dispatchScheduled({ scheduledTime: NOW.getTime(), cron: '0 * * * *' }, env),
    ).rejects.toThrow(/no run for the cron/);
    await dispatchScheduled({ scheduledTime: NOW.getTime(), cron: MINUTE_CRON }, { TILL_DB: db });
    await dispatchScheduled({ scheduledTime: NOW.getTime(), cron: NIGHTLY_CRON }, { TILL_DB: db });
  });

  it('leaves the cursor when more pages remain than one run reads', async () => {
    const { db, stripe } = scene();
    stripe.answerWith = {
      object: 'list',
      data: [
        {
          id: 'evt_1',
          object: 'event',
          type: 'checkout.session.completed',
          created: NOW_SECONDS,
          data: { object: { id: 'cs_test_x', object: 'checkout.session' } },
        },
      ],
      has_more: true,
    };
    const run = await pollStripe(db, new Stripe('rk_test_pretend', stripe.fetch), NOW);
    expect(run.complete).toBe(false);
    expect(run.cursor).toBe(NOW_SECONDS - 86_400);
    await expect(
      handleMinute(
        { scheduledTime: NOW.getTime() },
        { TILL_DB: db, STRIPE_KEY: 'rk' },
        stripe.fetch,
      ),
    ).rejects.toThrow(/cursor did not move/);
  });
});

describe('reading rows and sessions', () => {
  it('throws on rows the database should never hold', () => {
    expect(() =>
      summaryOf({ id: 'a', kind: 'personal', name: null, role: 'king', balance_cents: 0 }),
    ).toThrow(/unknown role/);
    expect(() =>
      summaryOf({ id: 'a', kind: 'shop', name: null, role: 'owner', balance_cents: 0 }),
    ).toThrow();
    expect(() => memberOf({ wallet: PABLO, role: 'owner', added_at: NOW.toISOString() })).toThrow();
    expect(() => checkoutOf({ id: 'cs_1', account_id: 'a', wallet: PABLO, state: 'lost' })).toThrow(
      /unknown checkout state/,
    );
    expect(() => ledgerLineOf({ id: 'x', kind: 'gift' })).toThrow();
  });

  it('credits only the checkout’s own session, in euros, with a payment and a positive net', () => {
    const checkout = { id: 'cs_1', accountId: 'acc' };
    const session = {
      id: 'cs_1',
      status: 'complete',
      paymentStatus: 'paid',
      amountTotal: 1000,
      amountTax: 174,
      currency: 'eur',
      paymentIntent: 'pi_1',
      invoice: null,
      clientReferenceId: 'acc',
      url: null,
    } as const;
    expect(creditOf(checkout, session)).toEqual({
      paidCents: 1000,
      vatCents: 174,
      paymentId: 'pi_1',
    });
    expect(creditOf(checkout, { ...session, id: 'cs_2' })).toBeNull();
    expect(creditOf(checkout, { ...session, clientReferenceId: 'other' })).toBeNull();
    expect(creditOf(checkout, { ...session, paymentIntent: null })).toBeNull();
    expect(creditOf(checkout, { ...session, amountTax: null })).toBeNull();
    expect(creditOf(checkout, { ...session, amountTax: -1 })).toBeNull();
    expect(creditOf(checkout, { ...session, amountTotal: 174 })).toBeNull();
    expect(creditOf(checkout, { ...session, amountTotal: 0, amountTax: 0 })).toBeNull();
    expect(typeof applySession).toBe('function');
  });
});
