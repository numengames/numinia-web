import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRESH_SIGNATURE, type AccountDesk } from '../accounts';
import {
  MAX_BODY_BYTES,
  accountsFrom,
  answerAction,
  answerLog,
  answerOverview,
  answerRoles,
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

const ROLE_ID = 'role_00000000000000a1';
const ADMIN_ID = 'role_00000000000000a2';
const ROLES = {
  ok: true,
  accountId: 'acc',
  as: 'owner',
  roles: [
    {
      id: ADMIN_ID,
      name: 'Administración',
      color: null,
      position: 2,
      hoist: true,
      permissions: ['administrator'],
      members: 1,
      mayEdit: true,
    },
    {
      id: ROLE_ID,
      name: 'Gente',
      color: '#aabbcc',
      position: 1,
      hoist: false,
      permissions: ['enter-worlds'],
      members: 2,
      mayEdit: true,
    },
  ],
  members: [{ wallet: ME, owner: true, addedAt: 'a', roleIds: [], assignable: [ROLE_ID] }],
};
const LOG = {
  ok: true,
  accountId: 'acc',
  lines: [
    {
      seq: 1,
      at: 'a',
      actor: ME,
      asHouse: false,
      act: 'role-created',
      subject: null,
      detail: { name: 'x' },
    },
  ],
};

const ACCESS = {
  ok: true,
  accountId: 'acc',
  as: 'member',
  permissions: ['enter-worlds', 'top-up'],
  roles: [],
  holders: { 'invite-members': ['Administration'] },
  houseAccess: 'alpha',
};

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  const answer = (value: unknown) => vi.fn(async () => value);
  return {
    overview: answer({ ok: true, accounts: [ACCOUNT] }),
    createTeam: answer({ ok: true, account: ACCOUNT }),
    renameTeam: answer({ ok: true, account: ACCOUNT }),
    statement: answer(STATEMENT),
    members: answer({ ok: true, members: [] }),
    access: answer(ACCESS),
    setMember: answer({ ok: true, members: [] }),
    removeMember: answer({ ok: true, members: [] }),
    roles: answer(ROLES),
    createRole: answer(ROLES),
    editRole: answer(ROLES),
    moveRole: answer(ROLES),
    deleteRole: answer(ROLES),
    giveRole: answer(ROLES),
    takeRole: answer(ROLES),
    log: answer(LOG),
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
    await bound.access(ME, 'a');
    expect(stub.access).toHaveBeenCalledWith(ME, 'a');
    await bound.setMember(ME, 'a', ME, 'admin');
    await bound.removeMember(ME, 'a', ME);
    const draft = { name: 'n', color: null, hoist: false, permissions: [] };
    await bound.roles(ME, 'a');
    await bound.createRole(ME, 'a', draft);
    await bound.editRole(ME, 'a', ROLE_ID, { hoist: true });
    await bound.moveRole(ME, 'a', ROLE_ID, 2);
    await bound.deleteRole(ME, 'a', ROLE_ID);
    await bound.giveRole(ME, 'a', ME, ROLE_ID);
    await bound.takeRole(ME, 'a', ME, ROLE_ID);
    await bound.log(ME, 'a');
    expect(stub.createRole).toHaveBeenCalledWith(ME, 'a', draft);
    expect(stub.editRole).toHaveBeenCalledWith(ME, 'a', ROLE_ID, { hoist: true });
    expect(stub.moveRole).toHaveBeenCalledWith(ME, 'a', ROLE_ID, 2);
    expect(stub.giveRole).toHaveBeenCalledWith(ME, 'a', ME, ROLE_ID);
    expect(stub.takeRole).toHaveBeenCalledWith(ME, 'a', ME, ROLE_ID);
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
    const body = (await ok.json()) as {
      statement: { members: unknown[] };
      you: string;
      access: unknown;
    };
    expect(body.you).toBe(ME);
    expect(body.statement.members).toHaveLength(1);
    // What the wallet may do travels with the statement, trimmed to what the screen reads.
    expect(desk.access).toHaveBeenCalledWith(ME, 'acc');
    expect(body.access).toEqual({
      as: 'member',
      permissions: ['enter-worlds', 'top-up'],
      holders: { 'invite-members': ['Administration'] },
    });
  });

  it('asks nothing of a personal account, and shows every control if the desk cannot say', async () => {
    const personal = fakeDesk({
      statement: async () => ({ ...STATEMENT, account: { ...ACCOUNT, kind: 'personal' } }),
    });
    const mine = (await (await answerStatement(personal, ME, url('cuenta=acc'), quiet)).json()) as {
      access: unknown;
    };
    expect(mine.access).toBeNull();
    expect(personal.access).not.toHaveBeenCalled();
    for (const access of [
      async () => ({ ok: false, problems: ['not an organization'] }),
      async () => ({ ok: 'maybe' }),
      async () => {
        throw new TypeError('boom');
      },
    ]) {
      const reply = await answerStatement(fakeDesk({ access }), ME, url('cuenta=acc'), quiet);
      expect(reply.status).toBe(200);
      expect(((await reply.json()) as { access: unknown }).access).toBeNull();
    }
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

describe('GET /api/saldo/roles and /api/saldo/log', () => {
  const at = (path: string, query: string) =>
    new URL(`https://numinia.com/api/saldo/${path}?${query}`);

  it('asks the desk as the session’s wallet and answers what it said', async () => {
    const desk = fakeDesk();
    const roles = await answerRoles(
      desk,
      ME.toUpperCase().replace('0X', '0x'),
      at('roles', 'cuenta=acc'),
      quiet,
    );
    expect(desk.roles).toHaveBeenCalledWith(ME, 'acc');
    expect(await roles.json()).toMatchObject({ you: ME, roles: { as: 'owner' } });
    const log = await answerLog(desk, ME, at('log', 'cuenta=acc'), quiet);
    expect(desk.log).toHaveBeenCalledWith(ME, 'acc');
    expect(await log.json()).toMatchObject({ log: { lines: [{ act: 'role-created' }] } });
  });

  it('needs a session, a query and a desk, and passes refusals and failures on', async () => {
    for (const answerOf of [answerRoles, answerLog]) {
      const path = answerOf === answerRoles ? 'roles' : 'log';
      expect((await answerOf(fakeDesk(), null, at(path, 'cuenta=a'), quiet)).status).toBe(401);
      expect((await answerOf(fakeDesk(), ME, at(path, ''), quiet)).status).toBe(400);
      expect(
        (await answerOf(fakeDesk(), ME, at(path, `cuenta=${'a'.repeat(101)}`), quiet)).status,
      ).toBe(400);
      expect((await answerOf(null, ME, at(path, 'cuenta=a'), quiet)).status).toBe(503);
      expect(
        (
          await answerOf(
            fakeDesk({ roles: async () => ({ ok: 1 }), log: async () => ({ ok: 1 }) }),
            ME,
            at(path, 'cuenta=a'),
            quiet,
          )
        ).status,
      ).toBe(502);
      const refused = await answerOf(
        fakeDesk({
          roles: async () => ({ ok: false, problems: ['not a member'] }),
          log: async () => ({ ok: false, problems: ['not a member'] }),
        }),
        ME,
        at(path, 'cuenta=a'),
        quiet,
      );
      expect(refused.status).toBe(403);
      expect(await refused.json()).toEqual({ error: 'refused', problems: ['not a member'] });
    }
  });
});

describe('POST /api/saldo: roles', () => {
  const draft = { name: 'Gente', color: '#aabbcc', hoist: false, permissions: ['enter-worlds'] };

  it('runs each role action as the session’s wallet and answers the organization as it is now', async () => {
    const desk = fakeDesk();
    for (const body of [
      { action: 'create-role', accountId: 'acc', role: draft },
      {
        action: 'edit-role',
        accountId: 'acc',
        roleId: ROLE_ID,
        change: { name: 'Otra', color: null },
      },
      { action: 'move-role', accountId: 'acc', roleId: ROLE_ID, position: 2 },
      { action: 'delete-role', accountId: 'acc', roleId: ROLE_ID },
      {
        action: 'give-role',
        accountId: 'acc',
        wallet: ME.toUpperCase().replace('0X', '0x'),
        roleId: ROLE_ID,
      },
      { action: 'take-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID },
    ]) {
      const response = await answerAction(desk, ME, post(body), quiet);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ result: { ok: true, accountId: 'acc' } });
    }
    expect(desk.createRole).toHaveBeenCalledWith(ME, 'acc', draft);
    expect(desk.editRole).toHaveBeenCalledWith(ME, 'acc', ROLE_ID, { name: 'Otra', color: null });
    expect(desk.moveRole).toHaveBeenCalledWith(ME, 'acc', ROLE_ID, 2);
    expect(desk.deleteRole).toHaveBeenCalledWith(ME, 'acc', ROLE_ID);
    expect(desk.giveRole).toHaveBeenCalledWith(ME, 'acc', ME, ROLE_ID);
    expect(desk.takeRole).toHaveBeenCalledWith(ME, 'acc', ME, ADMIN_ID);
  });

  it('passes the desk’s refusals on as values, and a broken desk as 502', async () => {
    const refusal = async () => ({
      ok: false,
      problems: ['you may act only on roles and members below your own highest role'],
    });
    const desk = fakeDesk({ moveRole: refusal, deleteRole: refusal });
    const refused = await answerAction(
      desk,
      ME,
      post({ action: 'move-role', accountId: 'acc', roleId: ROLE_ID, position: 2 }),
      quiet,
    );
    expect(await refused.json()).toEqual({
      result: { ok: false, problems: [(await refusal()).problems[0]] },
    });
    const broken = await answerAction(
      fakeDesk({ deleteRole: async () => ({ ok: 'maybe' }) }),
      ME,
      post({ action: 'delete-role', accountId: 'acc', roleId: ROLE_ID }),
      quiet,
    );
    expect(broken.status).toBe(502);
  });

  it('checks the shape of a role before the till sees it', () => {
    const bad = (body: unknown) => readSaldoRequest(body).ok;
    const good = { action: 'create-role', accountId: 'acc', role: draft };
    expect(bad(good)).toBe(true);
    expect(bad({ ...good, role: { ...draft, color: 'red' } })).toBe(false);
    expect(bad({ ...good, role: { ...draft, permissions: ['everything'] } })).toBe(false);
    expect(bad({ ...good, role: { ...draft, extra: 1 } })).toBe(false);
    expect(bad({ action: 'edit-role', accountId: 'acc', roleId: 'nope', change: {} })).toBe(false);
    expect(
      bad({ action: 'edit-role', accountId: 'acc', roleId: ROLE_ID, change: { hoist: 'yes' } }),
    ).toBe(false);
    expect(bad({ action: 'move-role', accountId: 'acc', roleId: ROLE_ID, position: 0 })).toBe(
      false,
    );
    expect(bad({ action: 'move-role', accountId: 'acc', roleId: ROLE_ID, position: 1.5 })).toBe(
      false,
    );
    expect(bad({ action: 'give-role', accountId: 'acc', wallet: 'nope', roleId: ROLE_ID })).toBe(
      false,
    );
  });

  it('refuses to hand out administrator or manage-roles until a fresh signature can be asked (ORG-008)', async () => {
    const desk = fakeDesk();
    const sensitive = [
      {
        action: 'create-role',
        accountId: 'acc',
        role: { ...draft, permissions: ['manage-roles'] },
      },
      {
        action: 'edit-role',
        accountId: 'acc',
        roleId: ROLE_ID,
        change: { permissions: ['enter-worlds', 'administrator'] },
      },
      // Giving a member the role that carries administrator is a grant too.
      { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID },
    ];
    for (const body of sensitive) {
      const response = await answerAction(desk, ME, post(body), quiet);
      expect(await response.json()).toEqual({ result: { ok: false, problems: [FRESH_SIGNATURE] } });
    }
    expect(desk.createRole).not.toHaveBeenCalled();
    expect(desk.editRole).not.toHaveBeenCalled();
    expect(desk.giveRole).not.toHaveBeenCalled();
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'needs-signature' }));
  });

  it('lets through what is no grant: ordinary permissions, a change without permissions, taking a role, one already held', async () => {
    const desk = fakeDesk();
    const ok = async (body: unknown) => (await answerAction(desk, ME, post(body), quiet)).status;
    expect(
      await ok({ action: 'edit-role', accountId: 'acc', roleId: ROLE_ID, change: { hoist: true } }),
    ).toBe(200);
    expect(
      await ok({
        action: 'edit-role',
        accountId: 'acc',
        roleId: ROLE_ID,
        change: { permissions: ['enter-worlds', 'top-up'] },
      }),
    ).toBe(200);
    // Keeping administrator on the role that already carries it is no new grant.
    expect(
      await ok({
        action: 'edit-role',
        accountId: 'acc',
        roleId: ADMIN_ID,
        change: { permissions: ['administrator'] },
      }),
    ).toBe(200);
    expect(await ok({ action: 'take-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID })).toBe(
      200,
    );
    expect(await ok({ action: 'give-role', accountId: 'acc', wallet: ME, roleId: ROLE_ID })).toBe(
      200,
    );
    // A role the desk does not list adds nothing to check; the till answers for it.
    expect(
      await ok({
        action: 'edit-role',
        accountId: 'acc',
        roleId: 'role_00000000000000ff',
        change: { permissions: ['top-up'] },
      }),
    ).toBe(200);
    expect(desk.editRole).toHaveBeenCalledTimes(4);
  });

  it('lets the till answer when it will not list the roles, and fails when that answer is broken', async () => {
    const closed = fakeDesk({ roles: async () => ({ ok: false, problems: ['not a member'] }) });
    const body = { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID };
    expect((await answerAction(closed, ME, post(body), quiet)).status).toBe(200);
    expect(closed.giveRole).toHaveBeenCalled();
    const broken = fakeDesk({ roles: async () => ({ nonsense: true }) });
    expect((await answerAction(broken, ME, post(body), quiet)).status).toBe(502);
    expect(broken.giveRole).not.toHaveBeenCalled();
  });

  it('works end to end against the fixture desk', async () => {
    const desk = fixtureAccounts();
    const team = 'acc_team_numen_games';
    const made = (await (
      await answerAction(
        desk,
        ME,
        post({ action: 'create-role', accountId: team, role: draft }),
        quiet,
      )
    ).json()) as { result: { roles: { name: string }[] } };
    expect(made.result.roles[0]?.name).toBe('Gente');
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
