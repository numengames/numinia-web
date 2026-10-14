import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AccountDesk } from '../accounts';
import {
  MAX_BODY_BYTES,
  accountsFrom,
  answerAction,
  answerOverview,
  answerStatement,
  boundAccounts,
  fixtureAccounts,
  readSaldoRequest,
  resetFixtureAccountsForTests,
} from '../accounts-source';

const ME = `0x${'ab'.repeat(20)}`;
const ACCOUNT = { id: 'acc', kind: 'team', name: 'Numen', role: 'admin', balanceCents: 88 };
const STATEMENT = {
  ok: true,
  account: ACCOUNT,
  balanceCents: 88,
  lowBalance: true,
  lots: [{ lineId: 'L1', at: 'a', amountCents: 100, remainderCents: 88 }],
  spend: [{ bucket: '2026-10-13', cents: 12 }],
  spendTotalCents: 12,
  lines: [{ id: 'L1', kind: 'topup', at: 'a', amountCents: 100, vatCents: 21 }],
  members: [{ wallet: ME, role: 'admin', addedAt: 'a' }],
};

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  const answer = (value: unknown) => vi.fn(async () => value);
  return {
    overview: answer({ ok: true, accounts: [ACCOUNT] }),
    createTeam: answer({ ok: true, account: ACCOUNT }),
    renameTeam: answer({ ok: true, account: ACCOUNT }),
    statement: answer(STATEMENT),
    members: answer({ ok: true, members: [] }),
    setMember: answer({ ok: true, members: [] }),
    removeMember: answer({ ok: true, members: [] }),
    startTopup: answer({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_1' }),
    confirmTopup: answer({ ok: true, state: 'paid', accountId: 'acc', balanceCents: 900 }),
    ...overrides,
  } as AccountDesk;
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://numinia.com/api/saldo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const quiet = vi.fn();

afterEach(() => {
  resetFixtureAccountsForTests();
  quiet.mockClear();
});

describe('finding the desk', () => {
  it('takes a bound stub with every method and calls it as methods', async () => {
    expect(boundAccounts(null)).toBeNull();
    expect(boundAccounts('numinia-till')).toBeNull();
    expect(boundAccounts({ overview: () => 1 })).toBeNull();
    const stub = fakeDesk();
    const bound = boundAccounts(stub);
    if (bound === null) throw new Error('not bound');
    await bound.overview(ME);
    await bound.createTeam(ME, 'n');
    await bound.renameTeam(ME, 'a', 'n');
    await bound.statement(ME, 'a', '7d');
    await bound.members(ME, 'a');
    await bound.setMember(ME, 'a', ME, 'admin');
    await bound.removeMember(ME, 'a', ME);
    await bound.startTopup(ME, 'a', '10', 'r');
    await bound.confirmTopup(ME, 'cs_1');
    expect(stub.confirmTopup).toHaveBeenCalledWith(ME, 'cs_1');
    expect(boundAccounts(Object.assign(() => 0, stub))).not.toBeNull();
  });

  it('falls back to the fixture desk only in fixture builds, one per process', () => {
    expect(accountsFrom({ binding: undefined, dataSource: 'live' })).toBeNull();
    const fixture = accountsFrom({ binding: undefined, dataSource: 'fixture' });
    expect(fixture).toBe(fixtureAccounts());
    resetFixtureAccountsForTests();
    expect(fixtureAccounts()).not.toBe(fixture);
    expect(accountsFrom({ binding: fakeDesk(), dataSource: 'fixture' })).not.toBe(
      fixtureAccounts(),
    );
  });
});

describe('reading the browser’s POST', () => {
  it('takes one action shaped like the contract, lowercasing wallets', () => {
    expect(
      readSaldoRequest({
        action: 'set-member',
        accountId: 'a',
        wallet: ME.toUpperCase().replace('0X', '0x'),
        role: 'member',
      }),
    ).toEqual({
      ok: true,
      request: { action: 'set-member', accountId: 'a', wallet: ME, role: 'member' },
    });
    expect(
      readSaldoRequest({ action: 'topup', accountId: 'a', amount: '20', locale: 'es' }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('amount'),
    });
    expect(readSaldoRequest({ action: 'confirm', sessionId: 'cs_1', extra: 1 })).toMatchObject({
      ok: false,
    });
    expect(readSaldoRequest(null)).toMatchObject({ ok: false });
  });
});

describe('GET /api/saldo', () => {
  it('needs a session and a desk, and answers the accounts', async () => {
    expect((await answerOverview(fakeDesk(), null, quiet)).status).toBe(401);
    expect((await answerOverview(null, ME, quiet)).status).toBe(503);
    const ok = await answerOverview(fakeDesk(), ME, quiet);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    expect(await ok.json()).toEqual({ accounts: [ACCOUNT] });
  });

  it('passes a refusal on as 403, and a broken desk as 502 logged by rule', async () => {
    const refused = await answerOverview(
      fakeDesk({ overview: async () => ({ ok: false, problems: ['wallet must be…'] }) }),
      ME,
      quiet,
    );
    expect(refused.status).toBe(403);
    const threw = await answerOverview(
      fakeDesk({
        overview: async () => {
          throw new TypeError('boom');
        },
      }),
      ME,
      quiet,
    );
    expect(threw.status).toBe(502);
    expect(quiet).toHaveBeenCalledWith(
      expect.objectContaining({ rule: 'threw', error: 'TypeError' }),
    );
    const shapeless = await answerOverview(
      fakeDesk({ overview: async () => ({ accounts: 'x' }) }),
      ME,
      quiet,
    );
    expect(shapeless.status).toBe(502);
    const thrownString = await answerOverview(
      fakeDesk({
        overview: async () => {
          throw 'plain';
        },
      }),
      ME,
      quiet,
    );
    expect(thrownString.status).toBe(502);
    expect(quiet).toHaveBeenLastCalledWith(expect.objectContaining({ error: 'string' }));
  });

  it('logs to telemetry by default', async () => {
    expect((await answerOverview(fakeDesk(), ME)).status).toBe(200);
  });
});

describe('GET /api/saldo/statement', () => {
  const url = (query: string) => new URL(`https://numinia.com/api/saldo/statement?${query}`);

  it('checks the query, then asks the desk as the session’s wallet', async () => {
    expect((await answerStatement(fakeDesk(), null, url('cuenta=a'), quiet)).status).toBe(401);
    expect((await answerStatement(fakeDesk(), ME, url(''), quiet)).status).toBe(400);
    expect(
      (await answerStatement(fakeDesk(), ME, url(`cuenta=${'a'.repeat(101)}`), quiet)).status,
    ).toBe(400);
    expect((await answerStatement(fakeDesk(), ME, url('cuenta=a&rango=1y'), quiet)).status).toBe(
      400,
    );
    expect((await answerStatement(null, ME, url('cuenta=a'), quiet)).status).toBe(503);
    const desk = fakeDesk();
    const ok = await answerStatement(
      desk,
      ME.toUpperCase().replace('0X', '0x'),
      url('cuenta=acc'),
      quiet,
    );
    expect(desk.statement).toHaveBeenCalledWith(ME, 'acc', '30d');
    const body = (await ok.json()) as { statement: { members: unknown[] }; you: string };
    expect(body.you).toBe(ME);
    expect(body.statement.members).toHaveLength(1);
  });

  it('passes refusals and failures on', async () => {
    const refused = await answerStatement(
      fakeDesk({ statement: async () => ({ ok: false, problems: ['not a member'] }) }),
      ME,
      url('cuenta=acc&rango=7d'),
      quiet,
    );
    expect(refused.status).toBe(403);
    const broken = await answerStatement(
      fakeDesk({ statement: async () => ({ nope: true }) }),
      ME,
      url('cuenta=acc&rango=12m'),
      quiet,
    );
    expect(broken.status).toBe(502);
  });
});

describe('POST /api/saldo', () => {
  it('needs a session, JSON, a small body and a known action', async () => {
    expect((await answerAction(fakeDesk(), null, post({}), quiet)).status).toBe(401);
    expect(
      (await answerAction(fakeDesk(), ME, post('x', { 'content-type': 'text/plain' }), quiet))
        .status,
    ).toBe(415);
    expect(
      (
        await answerAction(
          fakeDesk(),
          ME,
          post('{}', { 'content-length': String(MAX_BODY_BYTES + 1) }),
          quiet,
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await answerAction(
          fakeDesk(),
          ME,
          post({ action: 'create-team', name: 'x'.repeat(5000) }),
          quiet,
        )
      ).status,
    ).toBe(413);
    expect((await answerAction(fakeDesk(), ME, post('{not json'), quiet)).status).toBe(400);
    expect((await answerAction(fakeDesk(), ME, post({ action: 'pay' }), quiet)).status).toBe(400);
    expect(
      (await answerAction(null, ME, post({ action: 'create-team', name: 'X' }), quiet)).status,
    ).toBe(503);
  });

  it('opens a top-up with the way back built from the request’s own origin', async () => {
    const desk = fakeDesk();
    const response = await answerAction(
      desk,
      ME,
      post({ action: 'topup', accountId: 'acc', amount: '50', locale: 'es' }),
      quiet,
    );
    expect(desk.startTopup).toHaveBeenCalledWith(
      ME,
      'acc',
      '50',
      'https://numinia.com/es/saldo/vuelta/',
    );
    expect(await response.json()).toEqual({
      result: { ok: true, url: 'https://checkout.stripe.com/c/pay/cs_1' },
    });
  });

  it('never sends the new tab anywhere but Stripe or this site, and passes refusals on as values', async () => {
    const elsewhere = await answerAction(
      fakeDesk({ startTopup: async () => ({ ok: true, url: 'https://evil.example/' }) }),
      ME,
      post({ action: 'topup', accountId: 'acc', amount: '10', locale: 'en' }),
      quiet,
    );
    expect(elsewhere.status).toBe(502);
    const refused = await answerAction(
      fakeDesk({
        startTopup: async () => ({ ok: false, problems: ['payments are not configured'] }),
      }),
      ME,
      post({ action: 'topup', accountId: 'acc', amount: '10', locale: 'en' }),
      quiet,
    );
    expect(await refused.json()).toEqual({
      result: { ok: false, problems: ['payments are not configured'] },
    });
    const broken = await answerAction(
      fakeDesk({ startTopup: async () => ({}) }),
      ME,
      post({ action: 'topup', accountId: 'acc', amount: '10', locale: 'en' }),
      quiet,
    );
    expect(broken.status).toBe(502);
  });

  it('confirms a session, paid or refused', async () => {
    const paid = await answerAction(
      fakeDesk(),
      ME,
      post({ action: 'confirm', sessionId: 'cs_1' }),
      quiet,
    );
    expect(await paid.json()).toEqual({
      result: { ok: true, state: 'paid', accountId: 'acc', balanceCents: 900 },
    });
    const refused = await answerAction(
      fakeDesk({
        confirmTopup: async () => ({ ok: false, problems: ['not a checkout of this wallet'] }),
      }),
      ME,
      post({ action: 'confirm', sessionId: 'cs_1' }),
      quiet,
    );
    expect(((await refused.json()) as { result: { ok: boolean } }).result.ok).toBe(false);
    const broken = await answerAction(
      fakeDesk({ confirmTopup: async () => 'x' }),
      ME,
      post({ action: 'confirm', sessionId: 'cs_1' }),
      quiet,
    );
    expect(broken.status).toBe(502);
  });

  it('runs the organization’s actions as the session’s wallet', async () => {
    const desk = fakeDesk();
    for (const body of [
      { action: 'create-team', name: 'Arca' },
      { action: 'rename', accountId: 'acc', name: 'Arca' },
      { action: 'set-member', accountId: 'acc', wallet: ME, role: 'admin' },
      { action: 'remove-member', accountId: 'acc', wallet: ME },
    ]) {
      expect((await answerAction(desk, ME, post(body), quiet)).status).toBe(200);
    }
    expect(desk.createTeam).toHaveBeenCalledWith(ME, 'Arca');
    expect(desk.renameTeam).toHaveBeenCalledWith(ME, 'acc', 'Arca');
    expect(desk.setMember).toHaveBeenCalledWith(ME, 'acc', ME, 'admin');
    expect(desk.removeMember).toHaveBeenCalledWith(ME, 'acc', ME);
    const broken = await answerAction(
      fakeDesk({ removeMember: async () => ({ ok: 'maybe' }) }),
      ME,
      post({ action: 'remove-member', accountId: 'acc', wallet: ME }),
      quiet,
    );
    expect(broken.status).toBe(502);
  });

  it('works end to end against the fixture desk', async () => {
    const desk = fixtureAccounts();
    const local = new Request('http://localhost:4321/api/saldo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'topup',
        accountId: 'acc_personal',
        amount: '10',
        locale: 'es',
      }),
    });
    const opened = (await (await answerAction(desk, ME, local, quiet)).json()) as {
      result: { url: string };
    };
    expect(opened.result.url).toBe(
      'http://localhost:4321/es/saldo/vuelta/?session_id=cs_test_fixture_1',
    );
    const paid = (await (
      await answerAction(
        desk,
        ME,
        post({ action: 'confirm', sessionId: 'cs_test_fixture_1' }),
        quiet,
      )
    ).json()) as { result: { balanceCents: number } };
    expect(paid.result.balanceCents).toBe(1420);
  });
});
