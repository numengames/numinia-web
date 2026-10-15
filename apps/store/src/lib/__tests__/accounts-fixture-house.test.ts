/**
 * «La casa entra» in the fixture desk (QA 2026-10-15): the seed holds three
 * organizations — the session's wallet is a member of «Numen Games» only —
 * and the desk mimics the till's directory and the house's entry: the flag
 * `house` opens the other two as `house`, anything else gets the till's own
 * refusal, and everything the house does or reads is written down.
 */

import { describe, expect, it } from 'vitest';
import { ORGANIZATION_PERMISSIONS } from '@numinia/domain';
import deskSeed from '../../../fixtures/accounts/desk.json';
import {
  HOUSE_BOOLEAN,
  NOT_HOUSE,
  NOT_MEMBER,
  OWNER_ONLY,
  type AccountDesk,
  type DeskLogAnswer,
  type DeskRoles,
} from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;

const NUMEN = 'acc_team_numen_games';
const INSTITUTE = 'acc_team_active_inference';
const TARUGO = 'acc_team_la_tarugo';
const INSTITUTE_OWNER = '0x00000000000000000000000000000000000000c3';
const INSTITUTE_PLAIN = '0x00000000000000000000000000000000000000d4';
// The Team template's ids, from the top: Administración, Finanzas, Miembro, then the base role.
const FINANCE = 'role_0000000000000002';

/** The desk as the binding sees it: anything may arrive, so the tests send anything. */
type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const loose = (d: AccountDesk): Loose => d as unknown as Loose;
const desk = (): Loose => loose(createAccountsFixtureDesk(seed, () => NOW));

const problems = (answer: unknown): string[] =>
  (answer as { ok: false; problems: string[] }).problems;
const roles = (answer: unknown): DeskRoles => {
  if (typeof answer !== 'object' || answer === null || !('roles' in answer)) {
    throw new Error(`not a roles answer: ${JSON.stringify(answer)}`);
  }
  return answer as DeskRoles;
};
const lines = (answer: DeskLogAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.lines;
};

describe('the seed: three organizations', () => {
  it('holds Numen Games, Active Inference Institute and La Tarugo, and the wallet asking is in the first only', async () => {
    expect(seed.teams.map((team) => [team.id, team.name])).toEqual([
      [NUMEN, 'Numen Games'],
      [INSTITUTE, 'Active Inference Institute'],
      [TARUGO, 'La Tarugo'],
    ]);
    const mine = seed.teams.filter((team) =>
      team.members.some((member) => member.wallet === 'self'),
    );
    expect(mine.map((team) => team.id)).toEqual([NUMEN]);
    // Every organization has an owner of its own, so the house never stands in for one.
    for (const team of seed.teams) {
      expect(team.members.some((member) => member.role === 'admin')).toBe(true);
    }
    const overview = await desk().overview(ME);
    expect('accounts' in overview && overview.accounts.map((a) => a.name)).toEqual([
      null,
      'Numen Games',
    ]);
  });
});

describe('the directory', () => {
  it('lists every organization by name — ids and names only — to the house, the wallet in them or not', async () => {
    const d = desk();
    expect(await d.directory(ME, true)).toEqual({
      ok: true,
      accounts: [
        { id: INSTITUTE, kind: 'team', name: 'Active Inference Institute' },
        { id: TARUGO, kind: 'team', name: 'La Tarugo' },
        { id: NUMEN, kind: 'team', name: 'Numen Games' },
      ],
    });
    // An organization the wallet founds meanwhile joins the list, in its place by name.
    await d.createTeam(ME, 'Arcasiles');
    const again = await d.directory(ME, true);
    expect('accounts' in again && again.accounts.map((entry) => entry.name)).toEqual([
      'Active Inference Institute',
      'Arcasiles',
      'La Tarugo',
      'Numen Games',
    ]);
    expect(JSON.stringify(again)).not.toMatch(/balance|role|0x/i);
  });

  it('gives anyone else the till’s refusal: a missing flag is false, a flag that is no boolean is a problem', async () => {
    const d = desk();
    const refusal = { ok: false, problems: [NOT_HOUSE] };
    expect(await d.directory(ME)).toEqual(refusal);
    expect(await d.directory(ME, false)).toEqual(refusal);
    for (const flag of ['true', 1, null]) {
      expect(await d.directory(ME, flag)).toEqual({ ok: false, problems: [HOUSE_BOOLEAN] });
    }
    expect(await d.directory('nope', true)).toMatchObject({ ok: false });
    expect(await d.directory(7, true)).toMatchObject({ ok: false });
  });
});

describe('entering as the house', () => {
  it('answers the other two organizations as the house, with every permission but the owners’ own', async () => {
    const d = desk();
    for (const id of [INSTITUTE, TARUGO]) {
      const access = await d.access(ME, id, true);
      expect(access).toMatchObject({ ok: true, accountId: id, as: 'house' });
      expect('permissions' in access && access.permissions).toEqual([...ORGANIZATION_PERMISSIONS]);
      const view = roles(await d.roles(ME, id, true));
      expect(view.as).toBe('house');
      // The house stands above every role: it may edit all but the base role.
      expect(view.roles.map((role) => role.mayEdit)).toEqual([true, true, true, false]);
      const statement = await d.statement(ME, id, '30d', true);
      expect(statement).toMatchObject({ account: { id, kind: 'team', role: 'admin' } });
      const members = await d.members(ME, id, true);
      expect('members' in members && members.members?.length).toBeGreaterThan(0);
    }
  });

  it('leaves an owner who is also the house an owner, and the house’s flag alone opens no personal account', async () => {
    const d = desk();
    expect(roles(await d.roles(ME, NUMEN, true)).as).toBe('owner');
    expect(await d.access(ME, NUMEN, true)).toMatchObject({ as: 'owner' });
    // A member below the owners who is the house enters as the house (the till’s order: owner, house, member).
    const members = [
      { wallet: 'self', role: 'member', addedDaysAgo: 1 },
      { wallet: INSTITUTE_OWNER, role: 'admin', addedDaysAgo: 2 },
    ];
    const plain = { ...seed, teams: [{ ...(seed.teams[0] as object), members }] };
    const custom = loose(createAccountsFixtureDesk(plain as unknown as AccountsSeed, () => NOW));
    expect(roles(await custom.roles(ME, NUMEN)).as).toBe('member');
    expect(roles(await custom.roles(ME, NUMEN, true)).as).toBe('house');
    // The flag changes nothing for a personal account.
    expect(await d.statement(ME, 'acc_personal', '7d', true)).toMatchObject({
      account: { kind: 'personal' },
    });
    expect(await d.statement(ME, 'acc_missing', '7d', true)).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    expect(await d.roles(ME, 'acc_personal', true)).toEqual({
      ok: false,
      problems: ['not an organization'],
    });
  });

  it('refuses a stranger to the organization everywhere, in the till’s words — a missing flag is false', async () => {
    const d = desk();
    const gone = { ok: false, problems: [NOT_MEMBER] };
    const draft = { name: 'x', color: null, hoist: false, permissions: [] };
    for (const id of [INSTITUTE, TARUGO]) {
      expect(await d.statement(ME, id, '7d')).toEqual(gone);
      expect(await d.members(ME, id)).toEqual(gone);
      expect(await d.access(ME, id)).toEqual(gone);
      expect(await d.access(ME, id, false)).toEqual(gone);
      expect(await d.roles(ME, id)).toEqual(gone);
      expect(await d.log(ME, id)).toEqual(gone);
      expect(await d.renameTeam(ME, id, 'Mine')).toEqual(gone);
      expect(await d.setMember(ME, id, INSTITUTE_PLAIN, 'admin')).toEqual(gone);
      expect(await d.removeMember(ME, id, INSTITUTE_PLAIN)).toEqual(gone);
      expect(await d.createRole(ME, id, draft)).toEqual(gone);
      expect(await d.editRole(ME, id, FINANCE, {})).toEqual(gone);
      expect(await d.moveRole(ME, id, FINANCE, 1)).toEqual(gone);
      expect(await d.deleteRole(ME, id, FINANCE)).toEqual(gone);
      expect(await d.giveRole(ME, id, INSTITUTE_PLAIN, FINANCE)).toEqual(gone);
      expect(await d.takeRole(ME, id, INSTITUTE_PLAIN, FINANCE)).toEqual(gone);
      expect(await d.startTopup(ME, id, '10', 'http://localhost:4321/saldo/vuelta/')).toEqual(gone);
    }
  });

  it('refuses a flag that is no boolean, as the till does, before it opens anything', async () => {
    const d = desk();
    for (const flag of ['true', 'yes', 1, null]) {
      expect(await d.access(ME, INSTITUTE, flag)).toEqual({
        ok: false,
        problems: [HOUSE_BOOLEAN],
      });
      expect(await d.statement(ME, NUMEN, '7d', flag)).toEqual({
        ok: false,
        problems: [HOUSE_BOOLEAN],
      });
    }
  });

  it('acts as the house: renames, handles roles, adds and removes members, and tops up', async () => {
    const d = desk();
    expect(await d.renameTeam(ME, INSTITUTE, 'Instituto', true)).toMatchObject({
      ok: true,
      account: { id: INSTITUTE, name: 'Instituto', role: 'admin' },
    });
    // Roles: the house stands above them all and gives, takes and handles any but the base role.
    expect(roles(await d.giveRole(ME, INSTITUTE, INSTITUTE_PLAIN, FINANCE, true)).as).toBe('house');
    expect(roles(await d.takeRole(ME, INSTITUTE, INSTITUTE_PLAIN, FINANCE, true)).as).toBe('house');
    const draft = { name: 'Cartografía', color: null, hoist: false, permissions: ['enter-worlds'] };
    const made = roles(await d.createRole(ME, INSTITUTE, draft, true));
    const role = made.roles[0]?.id ?? '';
    expect([made.as, made.roles[0]?.name]).toEqual(['house', 'Cartografía']);
    expect(roles(await d.editRole(ME, INSTITUTE, role, { hoist: true }, true)).as).toBe('house');
    expect(roles(await d.moveRole(ME, INSTITUTE, role, 2, true)).as).toBe('house');
    expect(roles(await d.deleteRole(ME, INSTITUTE, role, true)).as).toBe('house');
    // Members: it makes a member an admin and sends them away; an owner it does not send away.
    const promoted = await d.setMember(ME, INSTITUTE, INSTITUTE_PLAIN, 'admin', true);
    expect(promoted).toMatchObject({ ok: true });
    const removed = await d.removeMember(ME, INSTITUTE, INSTITUTE_PLAIN, true);
    expect('members' in removed && removed.members?.map((member) => member.wallet)).toEqual([
      INSTITUTE_OWNER,
    ]);
    expect(await d.removeMember(ME, INSTITUTE, INSTITUTE_OWNER, true)).toEqual({
      ok: false,
      problems: [OWNER_ONLY],
    });
    expect(
      await d.startTopup(ME, TARUGO, '10', 'http://localhost:4321/es/saldo/vuelta/', true),
    ).toEqual({
      ok: true,
      url: 'http://localhost:4321/es/saldo/vuelta/?session_id=cs_test_fixture_1',
    });
  });
});

describe('the house is written down (ORG-009)', () => {
  it('keeps every read of the house in the log, and every role act marked as the house’s', async () => {
    const d = desk();
    await d.roles(ME, INSTITUTE, true);
    await d.statement(ME, INSTITUTE, '7d', true);
    await d.members(ME, INSTITUTE, true);
    await d.access(ME, INSTITUTE, true);
    const draft = { name: 'Cartografía', color: null, hoist: false, permissions: [] };
    await d.createRole(ME, INSTITUTE, draft, true);
    const written = lines(await d.log(ME, INSTITUTE, true));
    // Newest first, the log’s own read first of all — the till writes a read before it answers.
    expect(
      written.map((line) => [line.act, line.asHouse, line.actor, line.detail?.['what']]),
    ).toEqual([
      ['house-read', true, ME, 'log'],
      ['role-created', true, ME, undefined],
      ['house-read', true, ME, 'access'],
      ['house-read', true, ME, 'members'],
      ['house-read', true, ME, 'statement'],
      ['house-read', true, ME, 'roles'],
    ]);
  });

  it('writes nothing about an owner’s own reads and acts, and marks them as no one’s house', async () => {
    const d = desk();
    await d.roles(ME, NUMEN, true);
    await d.statement(ME, NUMEN, '7d', true);
    const draft = { name: 'Cartografía', color: null, hoist: false, permissions: [] };
    await d.createRole(ME, NUMEN, draft, true);
    const written = lines(await d.log(ME, NUMEN, true));
    expect(written.map((line) => [line.act, line.asHouse])).toEqual([['role-created', false]]);
    // And the log of a stranger’s organization is the house’s to read, not a citizen’s.
    expect(await d.log(ME, INSTITUTE)).toEqual({ ok: false, problems: [NOT_MEMBER] });
    expect(problems(await d.log(ME, INSTITUTE, 'yes'))).toEqual([HOUSE_BOOLEAN]);
  });
});
