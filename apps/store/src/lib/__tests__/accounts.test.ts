import { describe, expect, it } from 'vitest';
import { ORGANIZATION_PERMISSIONS, type OrganizationRefusal } from '@numinia/domain';
import { ORG_PROBLEMS, refusalOf } from '../../../../till/src/lib/organizations';
import { PROBLEMS } from '../../../../till/src/db/accounts';
import {
  LAST_OWNER,
  MEANWHILE,
  NO_ADMIN_ROLE,
  NOT_BELOW,
  NOT_CONFIGURED,
  NOT_MEMBER,
  OWNER_ONLY,
  OWN_ROLES,
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
  can,
  holdersOf,
  needsSentence,
  readAccess,
  needsSignature,
  readLog,
  readOverview,
  readProblem,
  readRoles,
  readRolesView,
  stepPosition,
  FRESH_SIGNATURE,
  SIGNATURE_EXPIRED,
  SIGNATURE_MISMATCH,
  readSign,
  type DeskRole,
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
    expect(readProblem([NOT_CONFIGURED])).toEqual({ key: 'notConfigured' });
    expect(readProblem([NOT_MEMBER])).toEqual({ key: 'notMember' });
    expect(readProblem([LAST_OWNER])).toEqual({ key: 'lastOwner' });
    expect(readProblem([OWN_ROLES])).toEqual({ key: 'ownRoles' });
    expect(readProblem([NOT_BELOW])).toEqual({ key: 'notBelow' });
    expect(readProblem([OWNER_ONLY])).toEqual({ key: 'ownerOnly' });
    expect(readProblem([NO_ADMIN_ROLE])).toEqual({ key: 'noAdminRole' });
    expect(readProblem([MEANWHILE])).toEqual({ key: 'meanwhile' });
    expect(readProblem(['something else'])).toEqual({ key: 'other' });
    expect(readProblem([])).toEqual({ key: 'other' });
    expect(readProblem(['something else', NOT_BELOW])).toEqual({ key: 'notBelow' });
  });

  it('says which permission is missing and who holds it', () => {
    expect(
      readProblem([
        'this needs invite-members, which the owners hold, and the role Administration',
      ]),
    ).toEqual({ key: 'needs', act: 'invite-members', holders: 'Administration' });
    expect(
      readProblem([
        'this needs manage-roles, which the owners hold, and the roles Sales and Marketing, Finance and Administration',
      ]),
    ).toEqual({
      key: 'needs',
      act: 'manage-roles',
      holders: 'Sales and Marketing, Finance and Administration',
    });
    expect(readProblem(['this needs top-up, which only the owners hold'])).toEqual({
      key: 'needs',
      act: 'top-up',
    });
    // An act only owners do has no label of its own.
    expect(readProblem(['this needs delete-world, which only the owners hold'])).toEqual({
      key: 'ownersOnly',
    });
  });

  it('knows every sentence the till writes (apps/till), so none falls to «other»', () => {
    expect(NOT_MEMBER).toBe(PROBLEMS.notMember);
    expect(NOT_CONFIGURED).toBe(PROBLEMS.notConfigured);
    expect(MEANWHILE).toBe(PROBLEMS.meanwhile);
    expect(LAST_OWNER).toBe(ORG_PROBLEMS.lastOwner);
    expect(OWN_ROLES).toBe(ORG_PROBLEMS.ownRoles);
    expect(NOT_BELOW).toBe(ORG_PROBLEMS.notBelow);
    expect(OWNER_ONLY).toBe(ORG_PROBLEMS.owner);
    expect(NO_ADMIN_ROLE).toBe(ORG_PROBLEMS.noAdministratorRole);
    const refusals: OrganizationRefusal[] = [
      'missing-permission',
      'not-below',
      'own-roles',
      'self',
      'owner',
      'base-role',
      'grant-exceeds',
      'role-limit',
      'owners-only',
      'last-owner',
      'alpha',
    ];
    for (const refusal of refusals) {
      for (const act of ORGANIZATION_PERMISSIONS) {
        const roles = [
          {
            id: 'r',
            name: 'Sales, and more',
            position: 1,
            permissions: [act],
            color: null,
            hoist: false,
          },
        ];
        const read = readProblem([refusalOf(refusal, act, roles)]);
        expect(read.key, `${refusal} / ${act}`).not.toBe('other');
        if (refusal === 'missing-permission') {
          expect(read).toEqual({ key: 'needs', act, holders: 'Sales, and more' });
        }
      }
    }
  });
});

describe('what a wallet may do in an organization', () => {
  const access = {
    as: 'member' as const,
    permissions: ['enter-worlds', 'top-up'] as const,
    holders: { 'invite-members': ['Administration', 'Finance'], 'manage-roles': [] },
  };
  const here = { ...access, permissions: [...access.permissions] };

  it('shows every control while the till has not said, and only the allowed ones after', () => {
    expect(can(null, 'invite-members')).toBe(true);
    expect(can(here, 'top-up')).toBe(true);
    expect(can(here, 'invite-members')).toBe(false);
  });

  it('lists the roles that could open a door, in the reader’s language', () => {
    expect(holdersOf(here, 'invite-members', 'en')).toBe('Administration and Finance');
    expect(holdersOf(here, 'invite-members', 'es')).toBe('Administration y Finance');
    expect(holdersOf(here, 'manage-roles', 'en')).toBeNull();
    expect(holdersOf(here, 'remove-members', 'en')).toBeNull();
    expect(holdersOf(null, 'invite-members', 'en')).toBeNull();
  });

  it('writes the sentence from the page’s words', () => {
    const words = {
      needs: 'Needs “{act}”: {holders}.',
      needsOwners: 'Needs “{act}”, owners only.',
    };
    expect(needsSentence(words, 'Invite', 'Administration')).toBe(
      'Needs “Invite”: Administration.',
    );
    expect(needsSentence(words, 'Invite', null)).toBe('Needs “Invite”, owners only.');
  });

  it('reads the access the API carries, or null', () => {
    expect(readAccess({ access: here })).toEqual(here);
    expect(readAccess({ access: { ...here, as: 'house' } })).toMatchObject({ as: 'house' });
    expect(readAccess({ access: { ...here, as: 'owner' } })).toMatchObject({ as: 'owner' });
    expect(readAccess({ access: null })).toBeNull();
    expect(readAccess({})).toBeNull();
    expect(readAccess('x')).toBeNull();
    expect(readAccess({ access: { ...here, as: 'nobody' } })).toBeNull();
    expect(readAccess({ access: { ...here, permissions: 'all' } })).toBeNull();
    expect(readAccess({ access: { ...here, holders: [] } })).toBeNull();
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

describe('members and roles', () => {
  const role = (id: string, position: number): DeskRole => ({
    id,
    name: id,
    color: null,
    position,
    hoist: false,
    permissions: [],
    members: 0,
    mayEdit: true,
  });
  const member = { wallet: WALLET, owner: true, addedAt: 'a', roleIds: [], assignable: [] };
  const view = {
    ok: true,
    accountId: 'acc',
    as: 'owner',
    roles: [role('a', 2), role('b', 1), role('base', 0)],
    members: [member],
  };

  it('reads an organization as the desk answers it, or nothing', () => {
    expect(readRolesView(view)).toEqual(view);
    expect(readRoles({ roles: view, you: WALLET })).toEqual({ roles: view, you: WALLET });
    expect(readRoles({ roles: view })?.you).toBeNull();
    expect(readRoles({ roles: { ...view, as: 'god' } })).toBeNull();
    expect(readRoles([])).toBeNull();
    expect(readRolesView(null)).toBeNull();
    expect(readRolesView({ ...view, ok: false })).toBeNull();
    expect(readRolesView({ ...view, accountId: 1 })).toBeNull();
    expect(readRolesView({ ...view, roles: [{ id: 'x' }] })).toBeNull();
    expect(readRolesView({ ...view, roles: 'none' })).toBeNull();
    expect(readRolesView({ ...view, members: [{ wallet: 'x' }] })).toBeNull();
    expect(readRolesView({ ...view, members: {} })).toBeNull();
  });

  it('reads the log, or nothing', () => {
    const line = {
      seq: 1,
      at: 'a',
      actor: WALLET,
      asHouse: false,
      act: 'role-given',
      subject: null,
      detail: null,
    };
    expect(readLog({ log: { lines: [line] } })).toEqual([line]);
    expect(readLog({ log: { lines: [] } })).toEqual([]);
    expect(readLog({ log: { lines: [{ ...line, seq: 'x' }] } })).toBeNull();
    expect(readLog({ log: { lines: [{ ...line, subject: 4 }] } })).toBeNull();
    expect(readLog({ log: { lines: [4] } })).toBeNull();
    expect(readLog({ log: {} })).toBeNull();
    expect(readLog({ log: null })).toBeNull();
    expect(readLog(null)).toBeNull();
  });

  it('knows which permissions ask for a fresh signature, and says so in the till’s words', () => {
    expect(needsSignature('administrator')).toBe(true);
    expect(needsSignature('manage-roles')).toBe(true);
    expect(needsSignature('enter-worlds')).toBe(false);
    expect(readProblem([FRESH_SIGNATURE])).toEqual({ key: 'freshSignature' });
    expect(readProblem([SIGNATURE_EXPIRED])).toEqual({ key: 'signatureExpired' });
    expect(readProblem([SIGNATURE_MISMATCH])).toEqual({ key: 'signatureMismatch' });
  });

  it('reads the sentence to sign and its token, or nothing when the body is not that', () => {
    const sign = { message: 'Numinia · Numen', token: 'f1.a.b', expiresAt: '2026-10-15T18:32:00Z' };
    expect(readSign({ sign })).toEqual({ message: 'Numinia · Numen', token: 'f1.a.b' });
    expect(readSign({ sign: { ...sign, message: 4 } })).toBeNull();
    expect(readSign({ sign: { ...sign, token: null } })).toBeNull();
    expect(readSign({ sign: { ...sign, message: '' } })).toBeNull();
    expect(readSign({ sign: { ...sign, token: '' } })).toBeNull();
    expect(readSign({ sign: 'x' })).toBeNull();
    expect(readSign(null)).toBeNull();
  });

  it('moves a role one step inside the places above the base role', () => {
    const roles = view.roles as DeskRole[];
    expect(stepPosition(roles, roles[0] as DeskRole, 1)).toBeNull();
    expect(stepPosition(roles, roles[0] as DeskRole, -1)).toBe(1);
    expect(stepPosition(roles, roles[1] as DeskRole, 1)).toBe(2);
    expect(stepPosition(roles, roles[1] as DeskRole, -1)).toBeNull();
  });
});
