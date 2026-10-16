import { afterEach, describe, expect, it, vi } from 'vitest';
import { createThirdwebClient } from 'thirdweb';
import { verifyEOASignature } from 'thirdweb/auth';
import { privateKeyToAccount, type Account } from 'thirdweb/wallets';
import {
  FRESH_SIGNATURE,
  SIGNATURE_EXPIRED,
  SIGNATURE_MISMATCH,
  type AccountDesk,
  type Asker,
} from '../accounts';
import {
  MAX_BODY_BYTES,
  accountsFrom,
  answerAction as answerActionAs,
  answerLog as answerLogAs,
  answerOverview as answerOverviewAs,
  answerPeople,
  answerRoles as answerRolesAs,
  answerSignature as answerSignatureAs,
  answerStatement as answerStatementAs,
  boundAccounts,
  fixtureAccounts,
  readSaldoRequest,
  resetFixtureAccountsForTests,
} from '../accounts-source';
import { FRESH_TTL_MS, actDigest, readFreshToken, type FreshDeps } from '../fresh-signature';

// The desk is asked on behalf of an `Asker`: the session's wallet and whether it is the house's.
// Most of what follows asks as a citizen — a session that is not an Oracle's, so never the
// house — with the wallet alone; the tests of the house hand over an `Asker` of their own.
const citizen = (wallet: string | null): Asker | null =>
  wallet === null ? null : { wallet, house: false };
type Log = Parameters<typeof answerOverviewAs>[2];
const answerOverview = (desk: AccountDesk | null, wallet: string | null, log?: Log) =>
  answerOverviewAs(desk, citizen(wallet), log);
const answerStatement = (desk: AccountDesk | null, wallet: string | null, url: URL, log?: Log) =>
  answerStatementAs(desk, citizen(wallet), url, log);
const answerRoles = (desk: AccountDesk | null, wallet: string | null, url: URL, log?: Log) =>
  answerRolesAs(desk, citizen(wallet), url, log);
const answerLog = (desk: AccountDesk | null, wallet: string | null, url: URL, log?: Log) =>
  answerLogAs(desk, citizen(wallet), url, log);
const answerAction = (
  desk: AccountDesk | null,
  wallet: string | null,
  request: Request,
  log?: Log,
  fresh?: FreshDeps | null,
) => answerActionAs(desk, citizen(wallet), request, log, fresh);
const answerSignature = (
  desk: AccountDesk | null,
  wallet: string | null,
  request: Request,
  fresh: FreshDeps | null,
  log?: Log,
) => answerSignatureAs(desk, citizen(wallet), request, fresh, log);

const ME = `0x${'ab'.repeat(20)}`;
/** The Oracle's session: the house. */
const oracle = (wallet: string = ME): Asker => ({ wallet, house: true });
const ACCOUNT = { id: 'acc', kind: 'team', name: 'Numen', role: 'admin', balanceCents: 88 };
// The directory lists every organization by name — the wallet's own among them.
const INSTITUTE = { id: 'acc_t_institute', kind: 'team', name: 'Active Inference Institute' };
const TARUGO = { id: 'acc_t_tarugo', kind: 'team', name: 'La Tarugo' };
const DIRECTORY = {
  ok: true,
  accounts: [INSTITUTE, TARUGO, { id: 'acc', kind: 'team', name: 'Numen' }],
};
/** An organization the wallet enters only as the house, as the overview lists it. */
const entered = (entry: typeof INSTITUTE) => ({
  ...entry,
  role: 'admin',
  balanceCents: 0,
  as: 'house',
});
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
    directory: answer(DIRECTORY),
    createTeam: answer({ ok: true, account: ACCOUNT }),
    renameTeam: answer({ ok: true, account: ACCOUNT }),
    statement: answer(STATEMENT),
    members: answer({ ok: true, members: [] }),
    access: answer(ACCESS),
    setMember: answer({ ok: true, members: [] }),
    removeMember: answer({ ok: true, members: [] }),
    roles: answer(ROLES),
    headcount: answer({ ok: true, accountId: 'acc', members: 7 }),
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

function signatureRequest(body: unknown, query = 'locale=es'): Request {
  return new Request(`https://numinia.com/api/saldo/signature?${query}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const SECRET = 'z'.repeat(40);
const NOW = Date.parse('2026-10-15T18:30:00.000Z');

function freshDeps(overrides: Partial<FreshDeps> = {}): FreshDeps {
  return {
    secret: SECRET,
    verify: async ({ message, signature, address }) =>
      verifyEOASignature({ message, signature, address }),
    now: () => NOW,
    ...overrides,
  };
}

/** A wallet of its own for each test: a random key, never one written down. */
function testWallet(): Account {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return privateKeyToAccount({ client: createThirdwebClient({ clientId: 'test' }), privateKey });
}

/** What the screen does: ask for the sentence of this very act, have the wallet sign it. */
async function signedBy(
  wallet: Account,
  desk: AccountDesk,
  body: unknown,
): Promise<{ readonly token: string; readonly signature: string }> {
  const you = wallet.address.toLowerCase();
  const asked = await answerSignature(desk, you, signatureRequest(body), freshDeps(), quiet);
  const { sign } = (await asked.json()) as { sign: { message: string; token: string } };
  return { token: sign.token, signature: await wallet.signMessage({ message: sign.message }) };
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
    // A till that has not learned the directory yet (the minutes between two deploys) is still a desk.
    const { directory: _directory, ...older } = fakeDesk();
    expect(boundAccounts(older)).not.toBeNull();
    // Any other missing method is not.
    const { overview: _overview, ...broken } = fakeDesk();
    expect(boundAccounts(broken)).toBeNull();
    const stub = fakeDesk();
    const bound = boundAccounts(stub);
    if (bound === null) throw new Error('not bound');
    await bound.overview(ME);
    await bound.directory(ME, true);
    await bound.createTeam(ME, 'n');
    await bound.renameTeam(ME, 'a', 'n', true);
    await bound.statement(ME, 'a', '7d', true);
    await bound.members(ME, 'a', true);
    await bound.access(ME, 'a', true);
    expect(stub.directory).toHaveBeenCalledWith(ME, true);
    expect(stub.renameTeam).toHaveBeenCalledWith(ME, 'a', 'n', true);
    expect(stub.statement).toHaveBeenCalledWith(ME, 'a', '7d', true);
    expect(stub.members).toHaveBeenCalledWith(ME, 'a', true);
    expect(stub.access).toHaveBeenCalledWith(ME, 'a', true);
    await bound.setMember(ME, 'a', ME, 'admin', true);
    await bound.removeMember(ME, 'a', ME, true);
    expect(stub.setMember).toHaveBeenCalledWith(ME, 'a', ME, 'admin', true);
    expect(stub.removeMember).toHaveBeenCalledWith(ME, 'a', ME, true);
    const draft = { name: 'n', color: null, hoist: false, permissions: [] };
    await bound.roles(ME, 'a', true);
    await bound.headcount('a');
    expect(stub.headcount).toHaveBeenCalledWith('a');
    await bound.createRole(ME, 'a', draft, true);
    await bound.editRole(ME, 'a', ROLE_ID, { hoist: true }, true);
    await bound.moveRole(ME, 'a', ROLE_ID, 2, true);
    await bound.deleteRole(ME, 'a', ROLE_ID, true);
    await bound.giveRole(ME, 'a', ME, ROLE_ID, true);
    await bound.takeRole(ME, 'a', ME, ROLE_ID, true);
    await bound.log(ME, 'a', true);
    expect(stub.roles).toHaveBeenCalledWith(ME, 'a', true);
    expect(stub.createRole).toHaveBeenCalledWith(ME, 'a', draft, true);
    expect(stub.editRole).toHaveBeenCalledWith(ME, 'a', ROLE_ID, { hoist: true }, true);
    expect(stub.moveRole).toHaveBeenCalledWith(ME, 'a', ROLE_ID, 2, true);
    expect(stub.deleteRole).toHaveBeenCalledWith(ME, 'a', ROLE_ID, true);
    expect(stub.giveRole).toHaveBeenCalledWith(ME, 'a', ME, ROLE_ID, true);
    expect(stub.takeRole).toHaveBeenCalledWith(ME, 'a', ME, ROLE_ID, true);
    expect(stub.log).toHaveBeenCalledWith(ME, 'a', true);
    await bound.startTopup(ME, 'a', '10', 'r', true);
    expect(stub.startTopup).toHaveBeenCalledWith(ME, 'a', '10', 'r', true);
    // The flag is the caller's to give: a call without one passes none on, and the till reads it as false.
    await bound.access(ME, 'a');
    expect(stub.access).toHaveBeenLastCalledWith(ME, 'a', undefined);
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
    expect(desk.statement).toHaveBeenCalledWith(ME, 'acc', '30d', false);
    const body = (await ok.json()) as {
      statement: { members: unknown[] };
      you: string;
      access: unknown;
    };
    expect(body.you).toBe(ME);
    expect(body.statement.members).toHaveLength(1);
    // What the wallet may do travels with the statement, trimmed to what the screen reads.
    expect(desk.access).toHaveBeenCalledWith(ME, 'acc', false);
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

  it('carries what a till of this cut adds: the split, each world, the minutes, the pace and the tariff', async () => {
    const added = {
      spend: [{ bucket: '2026-10-13', cents: 12, runningCents: 10, stoppedCents: 2 }],
      lines: [
        {
          id: 'L2',
          kind: 'world_day',
          at: 'a',
          amountCents: -12,
          day: '2026-10-13',
          worldId: 'agora',
          size: '2g',
          minutesRunning: 960,
          minutesStopped: 480,
        },
      ],
      worlds: [{ worldId: 'agora', size: '2g', daysRunning: 1, cents: 12 }],
      pace: { sevenDaysCents: 12, monthCents: 12, monthWorlds: 1 },
      tariff: {
        startsOn: '2026-10-13',
        sizes: { '2g': { runningCentsPerDay: 60, stoppedCentsPerDay: 5 } },
        rules: { keepDaysAtZero: 90, noticeDaysForRise: 30 },
      },
    };
    const desk = fakeDesk({ statement: async () => ({ ...STATEMENT, ...added }) });
    const body = (await (await answerStatement(desk, ME, url('cuenta=acc'), quiet)).json()) as {
      statement: Record<string, unknown>;
    };
    expect(body.statement['spend']).toEqual(added.spend);
    expect(body.statement['worlds']).toEqual(added.worlds);
    expect(body.statement['pace']).toEqual(added.pace);
    expect(body.statement['tariff']).toEqual(added.tariff);
    expect(body.statement['lines']).toEqual([
      {
        kind: 'world_day',
        at: 'a',
        amountCents: -12,
        day: '2026-10-13',
        worldId: 'agora',
        size: '2g',
        minutesRunning: 960,
        minutesStopped: 480,
      },
    ]);
    // A till before this cut: none of it, and the answer is the same as ever.
    const before = (await (
      await answerStatement(fakeDesk(), ME, url('cuenta=acc'), quiet)
    ).json()) as {
      statement: Record<string, unknown>;
    };
    expect(before.statement).not.toHaveProperty('worlds');
    expect(before.statement).not.toHaveProperty('pace');
    expect(before.statement).not.toHaveProperty('tariff');
    // Mistyped, the answer is out of shape, as any other field would be.
    const mistyped = await answerStatement(
      fakeDesk({
        statement: async () => ({ ...STATEMENT, ...added, pace: { sevenDaysCents: '12' } }),
      }),
      ME,
      url('cuenta=acc'),
      quiet,
    );
    expect(mistyped.status).toBe(502);
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
    expect(desk.roles).toHaveBeenCalledWith(ME, 'acc', false);
    expect(await roles.json()).toMatchObject({ you: ME, roles: { as: 'owner' } });
    const log = await answerLog(desk, ME, at('log', 'cuenta=acc'), quiet);
    expect(desk.log).toHaveBeenCalledWith(ME, 'acc', false);
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

describe('GET /api/people: the list of a community’s people, or only how many (PRS-004)', () => {
  it('has nothing to say for a community with no organization, or with no desk', async () => {
    const none = await answerPeople(fakeDesk(), ME, null, quiet);
    expect(none.status).toBe(404);
    expect(await none.json()).toEqual({ error: 'no-team' });
    expect((await answerPeople(null, ME, 'acc', quiet)).status).toBe(503);
  });

  it('shows someone with no session, or who is not a member, how many and no one', async () => {
    const desk = fakeDesk();
    const stranger = await answerPeople(desk, null, 'acc', quiet);
    expect(desk.headcount).toHaveBeenCalledWith('acc');
    expect(desk.roles).not.toHaveBeenCalled();
    expect(stranger.headers.get('cache-control')).toBe('no-store');
    expect(await stranger.json()).toEqual({ view: 'count', members: 7 });

    const outsider = fakeDesk({
      roles: vi.fn(async () => ({ ok: false, problems: ['not a member'] })),
    });
    const refused = await answerPeople(outsider, ME, 'acc', quiet);
    expect(outsider.roles).toHaveBeenCalledWith(ME, 'acc');
    expect(await refused.json()).toEqual({ view: 'count', members: 7 });
  });

  it('shows a member the groups, with the session’s wallet lowercased and never sent back whole', async () => {
    const desk = fakeDesk();
    const members = await answerPeople(desk, ME.toUpperCase().replace('0X', '0x'), 'acc', quiet);
    expect(desk.roles).toHaveBeenCalledWith(ME, 'acc');
    expect(desk.headcount).not.toHaveBeenCalled();
    const body = await members.json();
    expect(body).toEqual({
      view: 'list',
      members: 1,
      groups: [
        {
          id: 'rest',
          name: '',
          color: null,
          people: [{ short: '0xabab…abab', owner: true, you: true, color: null }],
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain(ME);
  });

  it('says there is no such community when the organization is nobody’s', async () => {
    const desk = fakeDesk({
      roles: async () => ({ ok: false, problems: ['not an organization'] }),
      headcount: async () => ({ ok: false, problems: ['not an organization'] }),
    });
    const missing = await answerPeople(desk, ME, 'acc', quiet);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'no-team' });
  });

  it('fails as a gateway when the desk throws or answers out of shape', async () => {
    const broken = fakeDesk({ roles: async () => ({ ok: 1 }) });
    expect((await answerPeople(broken, ME, 'acc', quiet)).status).toBe(502);
    const thrown = fakeDesk({
      headcount: async () => {
        throw new Error('down');
      },
    });
    expect((await answerPeople(thrown, null, 'acc', quiet)).status).toBe(502);
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ action: 'headcount' }));
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
    expect(desk.createRole).toHaveBeenCalledWith(ME, 'acc', draft, false);
    expect(desk.editRole).toHaveBeenCalledWith(
      ME,
      'acc',
      ROLE_ID,
      { name: 'Otra', color: null },
      false,
    );
    expect(desk.moveRole).toHaveBeenCalledWith(ME, 'acc', ROLE_ID, 2, false);
    expect(desk.deleteRole).toHaveBeenCalledWith(ME, 'acc', ROLE_ID, false);
    expect(desk.giveRole).toHaveBeenCalledWith(ME, 'acc', ME, ROLE_ID, false);
    expect(desk.takeRole).toHaveBeenCalledWith(ME, 'acc', ME, ADMIN_ID, false);
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

  it('asks for a fresh signature before handing out administrator or manage-roles (ORG-008)', async () => {
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
      // Unsigned, the act never reaches the till: with the secret at hand or without it.
      for (const deps of [null, freshDeps()]) {
        const response = await answerAction(desk, ME, post(body), quiet, deps);
        expect(await response.json()).toEqual({
          result: { ok: false, problems: [FRESH_SIGNATURE] },
        });
      }
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

describe('POST /api/saldo/signature: the sentence a wallet signs (ORG-008)', () => {
  const draft = { name: 'Ops', color: null, hoist: false, permissions: ['enter-worlds'] };
  const grant = { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID };

  it('needs a session, the secret, the page’s language and an act that asks for a signature', async () => {
    const desk = fakeDesk();
    const status = async (
      body: unknown,
      query = 'locale=es',
      who: string | null = ME,
      deps: FreshDeps | null = freshDeps(),
      on: AccountDesk | null = desk,
    ) => (await answerSignature(on, who, signatureRequest(body, query), deps, quiet)).status;
    expect(await status(grant, 'locale=es', null)).toBe(401);
    expect(await status(grant, 'locale=es', ME, null)).toBe(503);
    expect(await status('{nope')).toBe(400);
    expect(await status({ action: 'pay' })).toBe(400);
    expect(await status(grant, '')).toBe(400);
    expect(await status(grant, 'locale=fr')).toBe(400);
    for (const chain of ['x', '0', '-1', '1.5', '9007199254740993', '']) {
      expect(await status(grant, `locale=es&chain=${chain}`)).toBe(400);
    }
    // Nothing to sign: acts that never grant, and grants of nothing dangerous.
    expect(
      await status({ action: 'take-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID }),
    ).toBe(400);
    expect(await status({ action: 'create-team', name: 'X' })).toBe(400);
    expect(await status({ action: 'create-role', accountId: 'acc', role: draft })).toBe(400);
    expect(await status({ ...grant, roleId: ROLE_ID })).toBe(400);
    expect(
      await status({
        action: 'edit-role',
        accountId: 'acc',
        roleId: ADMIN_ID,
        change: { permissions: ['administrator'] },
      }),
    ).toBe(400);
    expect(
      await status({ action: 'edit-role', accountId: 'acc', roleId: ROLE_ID, change: {} }),
    ).toBe(400);
    expect(await status(grant, 'locale=es', ME, freshDeps(), null)).toBe(503);
    // Asking for the sentence never acts.
    expect(desk.giveRole).not.toHaveBeenCalled();
  });

  it('names the organization, the role, the person and the time, in the page’s language', async () => {
    const desk = fakeDesk();
    const response = await answerSignature(desk, ME, signatureRequest(grant), freshDeps(), quiet);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const { sign } = (await response.json()) as {
      sign: { message: string; token: string; expiresAt: string };
    };
    expect(sign.message).toBe(
      [
        'Numinia · Numen',
        'Das el rol «Administración», con Administrador, a 0xabab…abab.',
        'Esta firma vale hasta las 18:32 UTC y solo para este cambio. No es una transacción ni cuesta nada.',
      ].join('\n'),
    );
    expect(sign.expiresAt).toBe('2026-10-15T18:32:00.000Z');
    expect(await readFreshToken(SECRET, sign.token)).toEqual({
      wallet: ME,
      act: await actDigest(grant),
      message: sign.message,
      chainId: null,
      expiresAt: NOW + FRESH_TTL_MS,
    });
    expect(quiet).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'saldo-signature', action: 'give-role', outcome: 'issued' }),
    );

    const created = await answerSignature(
      desk,
      ME,
      signatureRequest(
        {
          action: 'create-role',
          accountId: 'acc',
          role: { ...draft, permissions: ['enter-worlds', 'manage-roles'] },
        },
        'locale=en&chain=137',
      ),
      freshDeps(),
      quiet,
    );
    const made = ((await created.json()) as { sign: { message: string; token: string } }).sign;
    expect(made.message.split('\n')[1]).toBe(
      'You create the role «Ops» and give it: Manage roles.',
    );
    expect((await readFreshToken(SECRET, made.token))?.chainId).toBe(137);

    const edited = await answerSignature(
      desk,
      ME,
      signatureRequest(
        {
          action: 'edit-role',
          accountId: 'acc',
          roleId: ROLE_ID,
          change: { permissions: ['enter-worlds', 'administrator', 'manage-roles'] },
        },
        'locale=ja',
      ),
      freshDeps(),
      quiet,
    );
    const changed = ((await edited.json()) as { sign: { message: string } }).sign;
    expect(changed.message.split('\n')[1]).toBe(
      'ロール「Gente」に管理者、ロールの管理を付与します。',
    );
  });

  it('names the organization by its id when the wallet’s accounts do not list it', async () => {
    for (const overview of [{ accounts: [] }, { ok: false, problems: ['not a member'] }]) {
      const desk = fakeDesk({ overview: async () => overview });
      const response = await answerSignature(desk, ME, signatureRequest(grant), freshDeps(), quiet);
      const { sign } = (await response.json()) as { sign: { message: string } };
      expect(sign.message.split('\n')[0]).toBe('Numinia · acc');
    }
  });

  it('passes the desk’s refusals on as 403, and a broken desk as 502', async () => {
    const closed = fakeDesk({ roles: async () => ({ ok: false, problems: ['not a member'] }) });
    const refused = await answerSignature(closed, ME, signatureRequest(grant), freshDeps(), quiet);
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: 'refused', problems: ['not a member'] });
    const brokenRoles = fakeDesk({ roles: async () => ({ nonsense: true }) });
    expect(
      (await answerSignature(brokenRoles, ME, signatureRequest(grant), freshDeps(), quiet)).status,
    ).toBe(502);
    const brokenOverview = fakeDesk({ overview: async () => ({ nonsense: true }) });
    expect(
      (await answerSignature(brokenOverview, ME, signatureRequest(grant), freshDeps(), quiet))
        .status,
    ).toBe(502);
  });

  it('logs to telemetry by default', async () => {
    const response = await answerSignature(null, null, signatureRequest(grant), null);
    expect(response.status).toBe(401);
  });
});

describe('POST /api/saldo with a fresh signature (ORG-008)', () => {
  const grant = { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID };

  it('carries out the grant once the session’s wallet has signed this very act', async () => {
    const wallet = testWallet();
    const you = wallet.address.toLowerCase();
    const desk = fakeDesk();
    const fresh = await signedBy(wallet, desk, grant);
    const response = await answerAction(desk, you, post({ ...grant, fresh }), quiet, freshDeps());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { ok: true, accountId: 'acc' } });
    expect(desk.giveRole).toHaveBeenCalledWith(you, 'acc', ME, ADMIN_ID, false);
    expect(quiet).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'saldo-role', action: 'give-role', outcome: 'done' }),
    );

    const role = {
      name: 'Ops',
      color: null,
      hoist: true,
      permissions: ['manage-roles', 'enter-worlds'],
    };
    const create = { action: 'create-role', accountId: 'acc', role };
    const signed = await signedBy(wallet, desk, create);
    // The same act, its keys in another order: still the act that was signed.
    const reordered = { role: { ...role }, accountId: 'acc', action: 'create-role', fresh: signed };
    const made = await answerAction(desk, you, post(reordered), quiet, freshDeps());
    expect(made.status).toBe(200);
    expect(desk.createRole).toHaveBeenCalledWith(you, 'acc', role, false);
  });

  it('refuses a late proof, a proof for another act or from another wallet, and writes nothing', async () => {
    const wallet = testWallet();
    const you = wallet.address.toLowerCase();
    const desk = fakeDesk();
    const fresh = await signedBy(wallet, desk, grant);
    const answerOf = async (body: unknown, who: string, deps = freshDeps()) =>
      (await answerAction(desk, who, post(body), quiet, deps)).json();
    const late = freshDeps({ now: () => NOW + FRESH_TTL_MS + 1 });
    expect(await answerOf({ ...grant, fresh }, you, late)).toEqual({
      result: { ok: false, problems: [SIGNATURE_EXPIRED] },
    });
    const elsewhere = { ...grant, wallet: `0x${'ef'.repeat(20)}`, fresh };
    expect(await answerOf(elsewhere, you)).toEqual({
      result: { ok: false, problems: [SIGNATURE_MISMATCH] },
    });
    const stranger = testWallet().address.toLowerCase();
    expect(await answerOf({ ...grant, fresh }, stranger)).toEqual({
      result: { ok: false, problems: [SIGNATURE_MISMATCH] },
    });
    expect(desk.giveRole).not.toHaveBeenCalled();
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'signature-expired' }));
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'signature-mismatch' }));
  });

  it('without the secret nothing dangerous passes, signed or not', async () => {
    const desk = fakeDesk();
    const fresh = { token: 'f1.a.b', signature: '0x01' };
    const response = await answerAction(desk, ME, post({ ...grant, fresh }), quiet, null);
    expect(await response.json()).toEqual({ result: { ok: false, problems: [FRESH_SIGNATURE] } });
    expect(desk.giveRole).not.toHaveBeenCalled();
  });

  it('refuses a proof out of shape before anything else, and ignores one where nothing asks for it', async () => {
    const desk = fakeDesk();
    for (const fresh of [
      'x',
      null,
      { token: 'f1.a.b' },
      { token: '', signature: '0x01' },
      { token: 'f1.a.b', signature: 'zz' },
      { token: 'f1.a.b', signature: '0x01', extra: 1 },
      { token: 't'.repeat(5000), signature: '0x01' },
    ]) {
      const response = await answerAction(desk, ME, post({ ...grant, fresh }), quiet, freshDeps());
      expect(response.status).toBe(400);
    }
    const fresh = { token: 'f1.a.b', signature: '0x01' };
    const plain = { ...grant, roleId: ROLE_ID, fresh };
    expect((await answerAction(desk, ME, post(plain), quiet, freshDeps())).status).toBe(200);
    expect(desk.giveRole).toHaveBeenCalledTimes(1);
    expect(desk.giveRole).toHaveBeenCalledWith(ME, 'acc', ME, ROLE_ID, false);
    const team = { action: 'create-team', name: 'Numen', fresh };
    expect((await answerAction(desk, ME, post(team), quiet, freshDeps())).status).toBe(200);
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
          post({ action: 'create-team', name: 'x'.repeat(MAX_BODY_BYTES) }),
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
      false,
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
    expect(desk.renameTeam).toHaveBeenCalledWith(ME, 'acc', 'Arca', false);
    expect(desk.setMember).toHaveBeenCalledWith(ME, 'acc', ME, 'admin', false);
    expect(desk.removeMember).toHaveBeenCalledWith(ME, 'acc', ME, false);
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

describe('the house: an Oracle’s session lists and enters every organization (QA 2026-10-15)', () => {
  const urlOf = (path: string, query: string) =>
    new URL(`https://numinia.com/api/saldo/${path}?${query}`);
  const draft = { name: 'Gente', color: '#aabbcc', hoist: false, permissions: ['enter-worlds'] };
  /** Every act on an organization the desk knows the house flag for, with the arguments before it. */
  const ACTS = [
    [{ action: 'rename', accountId: 'acc', name: 'Arca' }, 'renameTeam', ['acc', 'Arca']],
    [
      { action: 'set-member', accountId: 'acc', wallet: ME, role: 'admin' },
      'setMember',
      ['acc', ME, 'admin'],
    ],
    [{ action: 'remove-member', accountId: 'acc', wallet: ME }, 'removeMember', ['acc', ME]],
    [{ action: 'create-role', accountId: 'acc', role: draft }, 'createRole', ['acc', draft]],
    [
      { action: 'edit-role', accountId: 'acc', roleId: ROLE_ID, change: { hoist: true } },
      'editRole',
      ['acc', ROLE_ID, { hoist: true }],
    ],
    [
      { action: 'move-role', accountId: 'acc', roleId: ROLE_ID, position: 2 },
      'moveRole',
      ['acc', ROLE_ID, 2],
    ],
    [{ action: 'delete-role', accountId: 'acc', roleId: ROLE_ID }, 'deleteRole', ['acc', ROLE_ID]],
    [
      { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ROLE_ID },
      'giveRole',
      ['acc', ME, ROLE_ID],
    ],
    [
      { action: 'take-role', accountId: 'acc', wallet: ME, roleId: ROLE_ID },
      'takeRole',
      ['acc', ME, ROLE_ID],
    ],
    [
      { action: 'topup', accountId: 'acc', amount: '50', locale: 'es' },
      'startTopup',
      ['acc', '50', 'https://numinia.com/es/saldo/vuelta/'],
    ],
  ] as const;
  const CALLED = [
    'statement',
    'access',
    'roles',
    'log',
    ...ACTS.map(([, method]) => method),
  ] as const;

  it('lists the wallet’s own accounts first and, marked as the house’s, the organizations it is not in', async () => {
    const desk = fakeDesk();
    const reply = await answerOverviewAs(desk, oracle(), quiet);
    expect(reply.status).toBe(200);
    // Additive: the till’s own list as it was, then the others by name — the wallet’s own never twice.
    expect(await reply.json()).toEqual({
      accounts: [ACCOUNT, entered(INSTITUTE), entered(TARUGO)],
    });
    expect(desk.overview).toHaveBeenCalledWith(ME);
    expect(desk.directory).toHaveBeenCalledWith(ME, true);
    // The directory names no money, so the entry carries none: a zero that means «not read here».
    expect(entered(INSTITUTE)).toMatchObject({ role: 'admin', balanceCents: 0, as: 'house' });
  });

  it('asks the directory as the same lowercase wallet the overview was asked with', async () => {
    const desk = fakeDesk();
    await answerOverviewAs(desk, oracle(ME.toUpperCase().replace('0X', '0x')), quiet);
    expect(desk.overview).toHaveBeenCalledWith(ME);
    expect(desk.directory).toHaveBeenCalledWith(ME, true);
  });

  it('keeps the list as it was when the directory adds no organization', async () => {
    for (const accounts of [[{ id: 'acc', kind: 'team', name: 'Numen' }], []]) {
      const desk = fakeDesk({ directory: async () => ({ ok: true, accounts }) });
      const reply = await answerOverviewAs(desk, oracle(), quiet);
      expect(await reply.json()).toEqual({ accounts: [ACCOUNT] });
    }
  });

  it('answers a refusal or a failure of the till’s overview as it always did, before it asks the directory', async () => {
    const refusing = fakeDesk({ overview: async () => ({ ok: false, problems: ['wallet…'] }) });
    expect((await answerOverviewAs(refusing, oracle(), quiet)).status).toBe(403);
    const broken = fakeDesk({ overview: async () => ({ accounts: 'x' }) });
    expect((await answerOverviewAs(broken, oracle(), quiet)).status).toBe(502);
    expect(refusing.directory).not.toHaveBeenCalled();
    expect(broken.directory).not.toHaveBeenCalled();
    expect((await answerOverviewAs(null, oracle(), quiet)).status).toBe(503);
    expect((await answerOverviewAs(fakeDesk(), null, quiet)).status).toBe(401);
  });

  it('keeps the wallet’s own accounts, and logs by rule why, when the directory fails or refuses', async () => {
    const entry = { id: 'acc_t_x', kind: 'team', name: 'X' };
    const failures: [() => Promise<unknown>, string][] = [
      [
        async () => {
          throw new TypeError('boom');
        },
        'threw',
      ],
      [async () => ({ ok: true, accounts: 'x' }), 'answer-shape'],
      // A directory lists organizations: a personal account in it is out of shape.
      [async () => ({ ok: true, accounts: [{ ...entry, kind: 'personal' }] }), 'answer-shape'],
      [async () => ({ ok: false, problems: ['only the house reads…'] }), 'refused'],
    ];
    for (const [directory, rule] of failures) {
      quiet.mockClear();
      const reply = await answerOverviewAs(fakeDesk({ directory }), oracle(), quiet);
      expect(reply.status).toBe(200);
      expect(await reply.json()).toEqual({ accounts: [ACCOUNT] });
      expect(quiet).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'saldo-till', action: 'directory', rule }),
      );
    }
  });

  it('keeps an Oracle’s own accounts when the till is older and has no directory yet', async () => {
    const { directory: _directory, ...older } = fakeDesk();
    const reply = await answerOverviewAs(boundAccounts(older), oracle(), quiet);
    expect(reply.status).toBe(200);
    expect(await reply.json()).toEqual({ accounts: [ACCOUNT] });
    expect(quiet).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'saldo-till', action: 'directory', rule: 'threw' }),
    );
  });

  it('never asks the directory for a citizen, whose list is the till’s own', async () => {
    const desk = fakeDesk();
    const reply = await answerOverview(desk, ME, quiet);
    expect(await reply.json()).toEqual({ accounts: [ACCOUNT] });
    expect(desk.directory).not.toHaveBeenCalled();
  });

  it('keeps a mark on the till’s own accounts, and refuses any other', async () => {
    const marked = fakeDesk({
      overview: async () => ({ accounts: [{ ...ACCOUNT, as: 'house' }] }),
    });
    const kept = await answerOverview(marked, ME, quiet);
    expect(await kept.json()).toEqual({ accounts: [{ ...ACCOUNT, as: 'house' }] });
    const other = fakeDesk({ overview: async () => ({ accounts: [{ ...ACCOUNT, as: 'owner' }] }) });
    expect((await answerOverview(other, ME, quiet)).status).toBe(502);
  });

  it.each([true, false])(
    'sends house=%s with every read and every act on an organization',
    async (flag) => {
      const desk = fakeDesk();
      const asker: Asker = { wallet: ME, house: flag };
      await answerStatementAs(desk, asker, urlOf('statement', 'cuenta=acc'), quiet);
      await answerRolesAs(desk, asker, urlOf('roles', 'cuenta=acc'), quiet);
      await answerLogAs(desk, asker, urlOf('log', 'cuenta=acc'), quiet);
      expect(desk.statement).toHaveBeenCalledWith(ME, 'acc', '30d', flag);
      expect(desk.access).toHaveBeenCalledWith(ME, 'acc', flag);
      expect(desk.roles).toHaveBeenCalledWith(ME, 'acc', flag);
      expect(desk.log).toHaveBeenCalledWith(ME, 'acc', flag);
      for (const [body, method, args] of ACTS) {
        const reply = await answerActionAs(desk, asker, post(body), quiet);
        expect(reply.status).toBe(200);
        expect(desk[method]).toHaveBeenLastCalledWith(ME, ...args, flag);
      }
      // No organization yet and no checkout yet: nothing there for the house to enter.
      await answerActionAs(desk, asker, post({ action: 'create-team', name: 'Arca' }), quiet);
      await answerActionAs(desk, asker, post({ action: 'confirm', sessionId: 'cs_1' }), quiet);
      expect(desk.createTeam).toHaveBeenCalledWith(ME, 'Arca');
      expect(desk.confirmTopup).toHaveBeenCalledWith(ME, 'cs_1');
    },
  );

  it('ignores a `house` the browser sends: in a body it is an unknown key, refused; in a query it is never read', async () => {
    const desk = fakeDesk();
    const asker: Asker = { wallet: ME, house: false };
    const bodies = [
      ...ACTS.map(([body]) => body),
      { action: 'create-team', name: 'Arca' },
      { action: 'confirm', sessionId: 'cs_1' },
    ];
    for (const body of bodies) {
      for (const claim of [true, 'true', 1]) {
        const reply = await answerActionAs(desk, asker, post({ ...body, house: claim }), quiet);
        expect(reply.status).toBe(400);
        expect(((await reply.json()) as { error: string }).error).toContain('house');
      }
    }
    const grant = { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID };
    const signing = signatureRequest({ ...grant, house: true });
    expect((await answerSignatureAs(desk, asker, signing, freshDeps(), quiet)).status).toBe(400);
    expect(readSaldoRequest({ action: 'rename', accountId: 'a', name: 'n', house: true }).ok).toBe(
      false,
    );
    // A query string is not read for it either: the desk is asked with the session’s flag alone.
    await answerStatementAs(
      desk,
      asker,
      urlOf('statement', 'cuenta=acc&house=true&rango=7d'),
      quiet,
    );
    await answerRolesAs(desk, asker, urlOf('roles', 'cuenta=acc&house=1'), quiet);
    await answerLogAs(desk, asker, urlOf('log', 'house=true&cuenta=acc'), quiet);
    expect(desk.statement).toHaveBeenCalledWith(ME, 'acc', '7d', false);
    expect(desk.roles).toHaveBeenCalledWith(ME, 'acc', false);
    expect(desk.log).toHaveBeenCalledWith(ME, 'acc', false);
    // So no call of a citizen’s session ever carried a true flag, and none reached the directory.
    for (const method of CALLED) {
      for (const call of vi.mocked(desk[method]).mock.calls) expect(call).not.toContain(true);
    }
    expect(desk.directory).not.toHaveBeenCalled();
  });

  it('asks the house for the fresh signature all the same: ORG-008 stays as it is', async () => {
    const desk = fakeDesk();
    const grant = { action: 'give-role', accountId: 'acc', wallet: ME, roleId: ADMIN_ID };
    for (const deps of [null, freshDeps()]) {
      const reply = await answerActionAs(desk, oracle(), post(grant), quiet, deps);
      expect(await reply.json()).toEqual({ result: { ok: false, problems: [FRESH_SIGNATURE] } });
    }
    expect(desk.giveRole).not.toHaveBeenCalled();
    // And once the Oracle’s wallet has signed this very act, it goes through as the house.
    const wallet = testWallet();
    const you = wallet.address.toLowerCase();
    const asked = await answerSignatureAs(
      desk,
      oracle(you),
      signatureRequest(grant),
      freshDeps(),
      quiet,
    );
    const { sign } = (await asked.json()) as { sign: { message: string; token: string } };
    const fresh = {
      token: sign.token,
      signature: await wallet.signMessage({ message: sign.message }),
    };
    const done = await answerActionAs(
      desk,
      oracle(you),
      post({ ...grant, fresh }),
      quiet,
      freshDeps(),
    );
    expect(done.status).toBe(200);
    expect(desk.giveRole).toHaveBeenCalledWith(you, 'acc', ME, ADMIN_ID, true);
  });

  it('names an organization entered as the house by its name in the sentence the wallet signs', async () => {
    const grant = { action: 'give-role', accountId: INSTITUTE.id, wallet: ME, roleId: ADMIN_ID };
    const sentence = async (desk: AccountDesk, asker: Asker | null) => {
      const reply = await answerSignatureAs(
        desk,
        asker,
        signatureRequest(grant),
        freshDeps(),
        quiet,
      );
      return ((await reply.json()) as { sign: { message: string } }).sign.message.split('\n')[0];
    };
    const desk = fakeDesk();
    expect(await sentence(desk, oracle())).toBe('Numinia · Active Inference Institute');
    expect(desk.roles).toHaveBeenCalledWith(ME, INSTITUTE.id, true);
    // A citizen is told what its own accounts list — here, only the id — and asks no directory.
    const plain = fakeDesk();
    expect(await sentence(plain, citizen(ME))).toBe(`Numinia · ${INSTITUTE.id}`);
    expect(plain.directory).not.toHaveBeenCalled();
    // A directory that fails never stops the sentence: the id stands in for the name.
    const blind = fakeDesk({ directory: async () => ({ nonsense: true }) });
    expect(await sentence(blind, oracle())).toBe(`Numinia · ${INSTITUTE.id}`);
  });

  it('works end to end against the fixture desk: four organizations for the Oracle, one for a citizen', async () => {
    const desk = fixtureAccounts();
    const listed = async (asker: Asker) =>
      (
        (await (await answerOverviewAs(desk, asker, quiet)).json()) as {
          accounts: { name: string | null; as?: string }[];
        }
      ).accounts.map((account) => [account.name, account.as ?? null]);
    expect(await listed(oracle())).toEqual([
      [null, null],
      ['Numen Games', null],
      ['Active Inference Institute', 'house'],
      ['La Tarugo', 'house'],
      ['Reset', 'house'],
    ]);
    expect(await listed({ wallet: ME, house: false })).toEqual([
      [null, null],
      ['Numen Games', null],
    ]);
    const rolesOf = (asker: Asker) =>
      answerRolesAs(desk, asker, urlOf('roles', 'cuenta=acc_team_la_tarugo'), quiet);
    const entering = await rolesOf(oracle());
    expect(await entering.json()).toMatchObject({ roles: { as: 'house' } });
    const refused = await rolesOf({ wallet: ME, house: false });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({ error: 'refused', problems: ['not a member'] });
  });
});
