import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import {
  BASE_ROLE,
  GRANT_EXCEEDS,
  NOT_BELOW,
  NOT_MEMBER,
  OWNER_ONLY,
  OWN_ROLES,
  type AccountDesk,
  type DeskLogAnswer,
  type DeskRoles,
} from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const OWNER = '0x00000000000000000000000000000000000000a1';
const PLAIN = '0x00000000000000000000000000000000000000b2';
const seed = deskSeed as unknown as AccountsSeed;
const TEAM = seed.teams[0]?.id ?? '';

/** The desk as the binding sees it: anything may arrive, so the tests send anything. */
type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const loose = (d: AccountDesk): Loose => d as unknown as Loose;
const desk = (): Loose => loose(createAccountsFixtureDesk(seed, () => NOW));

// The Team template's ids, from the top: Administración, Finanzas, Miembro, then the base role.
const ADMINISTRATION = 'role_0000000000000001';
const FINANCE = 'role_0000000000000002';
const MEMBER = 'role_0000000000000003';
const BASE = 'role_0000000000000004';

/** A desk where the wallet asking is not an owner but holds the given template roles. */
function memberDesk(roles: readonly number[]): Loose {
  const members = [
    { wallet: 'self', role: 'member', roles, addedDaysAgo: 3 },
    { wallet: OWNER, role: 'admin', addedDaysAgo: 9 },
    { wallet: PLAIN, role: 'member', addedDaysAgo: 2 },
  ];
  const custom = { ...seed, teams: [{ ...(seed.teams[0] as object), members }] };
  return loose(createAccountsFixtureDesk(custom as unknown as AccountsSeed, () => NOW));
}

const roles = (answer: unknown): DeskRoles => {
  if (typeof answer !== 'object' || answer === null || !('roles' in answer)) {
    throw new Error(`not a roles answer: ${JSON.stringify(answer)}`);
  }
  return answer as DeskRoles;
};
const problems = (answer: unknown): string[] =>
  (answer as { ok: false; problems: string[] }).problems;

describe('the fixture desk: roles', () => {
  it('shows the Team template from the top down, and who may do what with each', async () => {
    const view = roles(await desk().roles(ME, TEAM));
    expect(view.as).toBe('owner');
    expect(view.roles.map((role) => [role.id, role.position, role.members, role.mayEdit])).toEqual([
      [ADMINISTRATION, 3, 0, true],
      [FINANCE, 2, 0, true],
      [MEMBER, 1, 1, true],
      [BASE, 0, 3, false],
    ]);
    // Owners first; an owner may give any role but the base role to a member, to an owner none.
    expect(view.members.map((member) => [member.wallet, member.owner])).toEqual([
      [ME, true],
      [OWNER, true],
      [PLAIN, false],
    ]);
    expect(view.members[0]?.assignable).toEqual([]);
    expect(view.members[2]?.assignable).toEqual([ADMINISTRATION, FINANCE, MEMBER]);
    expect(view.members[2]?.roleIds).toEqual([MEMBER]);
  });

  it('refuses a stranger, a personal account and a wallet that is not one', async () => {
    const d = desk();
    expect(await d.roles(ME, 'acc_missing')).toEqual({ ok: false, problems: [NOT_MEMBER] });
    expect(await d.roles(ME, 'acc_personal')).toEqual({
      ok: false,
      problems: ['not an organization'],
    });
    expect(await d.roles('nope', TEAM)).toMatchObject({ ok: false });
    // Every method asks first whether the wallet belongs.
    const stranger = ['acc_missing'];
    const gone = { ok: false, problems: [NOT_MEMBER] };
    expect(await d.createRole(ME, ...stranger, {})).toEqual(gone);
    expect(await d.editRole(ME, ...stranger, FINANCE, {})).toEqual(gone);
    expect(await d.moveRole(ME, ...stranger, FINANCE, 2)).toEqual(gone);
    expect(await d.deleteRole(ME, ...stranger, FINANCE)).toEqual(gone);
    expect(await d.giveRole(ME, ...stranger, PLAIN, FINANCE)).toEqual(gone);
    expect(await d.takeRole(ME, ...stranger, PLAIN, FINANCE)).toEqual(gone);
    expect(await d.log(ME, ...stranger)).toEqual(gone);
  });

  it('knows an organization’s founder before they are given a role', async () => {
    const d = desk();
    const made = await d.createTeam(ME, 'Arca');
    if (!made.ok) throw new Error('no team');
    const view = roles(await d.roles(ME, made.account.id));
    expect(view.members).toMatchObject([{ wallet: ME, owner: true, roleIds: [] }]);
  });

  it('creates a role at the top for an owner, below the highest for a member, and logs it', async () => {
    const d = desk();
    const made = roles(
      await d.createRole(ME, TEAM, {
        name: '  Cartografía ',
        color: '#aabbcc',
        hoist: true,
        permissions: ['enter-worlds'],
      }),
    );
    expect(made.roles[0]).toMatchObject({
      name: 'Cartografía',
      color: '#aabbcc',
      hoist: true,
      position: 4,
      permissions: ['enter-worlds'],
    });
    const log = (await d.log(ME, TEAM)) as Extract<DeskLogAnswer, { ok: true }>;
    expect(log.lines[0]).toMatchObject({ act: 'role-created', actor: ME, asHouse: false });

    // An administrator who is not an owner creates just below their own role, which rises by one.
    const m = memberDesk([1]);
    const below = roles(
      await m.createRole(ME, TEAM, { name: 'Café', color: null, hoist: false, permissions: [] }),
    );
    expect(below.roles.map((role) => [role.name, role.position])).toContainEqual(['Café', 3]);
    expect(below.roles.find((role) => role.id === ADMINISTRATION)?.position).toBe(4);
  });

  it('refuses a role that is blank, over the limit of the asker’s own permissions or from a plain member', async () => {
    expect(
      problems(
        await desk().createRole(ME, TEAM, {
          name: '   ',
          color: null,
          hoist: false,
          permissions: [],
        }),
      ),
    ).toEqual(['name must be 1 to 100 characters, none of them a control character']);
    const plain = memberDesk([3]);
    expect(
      problems(
        await plain.createRole(ME, TEAM, { name: 'x', color: null, hoist: false, permissions: [] }),
      ),
    ).toEqual(['this needs manage-roles, which the owners hold, and the role Administración']);
    // A holder of manage-roles only (no administrator) cannot hand out what they lack.
    const self = memberDesk([1]);
    const edited = roles(
      await self.editRole(ME, TEAM, FINANCE, { permissions: ['manage-roles', 'view-balance'] }),
    );
    expect(edited.roles.find((role) => role.id === FINANCE)?.permissions).toEqual([
      'manage-roles',
      'view-balance',
    ]);
  });

  it('edits a role below the asker, never the base role’s name, never one above', async () => {
    const d = desk();
    const edited = roles(
      await d.editRole(ME, TEAM, MEMBER, {
        name: 'Gente',
        color: '#112233',
        hoist: true,
        permissions: ['top-up'],
      }),
    );
    expect(edited.roles.find((role) => role.id === MEMBER)).toMatchObject({
      name: 'Gente',
      color: '#112233',
      hoist: true,
      permissions: ['top-up'],
    });
    // Only some fields sent: the rest stays.
    const kept = roles(await d.editRole(ME, TEAM, MEMBER, { color: null }));
    expect(kept.roles.find((role) => role.id === MEMBER)).toMatchObject({
      name: 'Gente',
      color: null,
      hoist: true,
    });
    expect(
      roles(await d.editRole(ME, TEAM, BASE, { permissions: ['top-up'] })).roles[3],
    ).toMatchObject({
      permissions: ['top-up'],
    });
    expect(problems(await d.editRole(ME, TEAM, BASE, { name: 'x' }))).toEqual([
      'the base role keeps its name and its place: only what it carries changes',
    ]);
    expect(problems(await d.editRole(ME, TEAM, MEMBER, { name: ' ' }))).toHaveLength(1);
    expect(problems(await d.editRole(ME, TEAM, 'role_ffffffffffffffff', { hoist: true }))).toEqual([
      'the organization has no such role',
    ]);
    expect(
      problems(await memberDesk([1]).editRole(ME, TEAM, ADMINISTRATION, { hoist: false })),
    ).toEqual([NOT_BELOW]);
    expect(problems(await memberDesk([3]).editRole(ME, TEAM, MEMBER, { hoist: false }))[0]).toMatch(
      /^this needs manage-roles/,
    );
  });

  it('moves a role to a place of the list, and the places stay one each', async () => {
    const d = desk();
    const moved = roles(await d.moveRole(ME, TEAM, MEMBER, 3));
    expect(moved.roles.map((role) => [role.id, role.position])).toEqual([
      [MEMBER, 3],
      [ADMINISTRATION, 2],
      [FINANCE, 1],
      [BASE, 0],
    ]);
    // Past the end of the list it goes to the top; down to the last place it goes below the rest.
    expect(roles(await d.moveRole(ME, TEAM, FINANCE, 50)).roles[0]?.id).toBe(FINANCE);
    expect(roles(await d.moveRole(ME, TEAM, FINANCE, 1)).roles[2]?.id).toBe(FINANCE);
    expect(problems(await d.moveRole(ME, TEAM, BASE, 2))).toEqual([BASE_ROLE]);
    expect(problems(await d.moveRole(ME, TEAM, 'role_ffffffffffffffff', 2))).toEqual([
      'the organization has no such role',
    ]);
    expect(problems(await memberDesk([1]).moveRole(ME, TEAM, FINANCE, 3))).toEqual([NOT_BELOW]);
  });

  it('deletes a role, takes it from its holders, and keeps the base role', async () => {
    const d = desk();
    const gone = roles(await d.deleteRole(ME, TEAM, FINANCE));
    expect(gone.roles.map((role) => [role.id, role.position])).toEqual([
      [ADMINISTRATION, 2],
      [MEMBER, 1],
      [BASE, 0],
    ]);
    const without = roles(await d.deleteRole(ME, TEAM, MEMBER));
    expect(without.members.find((member) => member.wallet === PLAIN)?.roleIds).toEqual([]);
    expect(problems(await d.deleteRole(ME, TEAM, BASE))).toEqual([BASE_ROLE]);
    expect(problems(await d.deleteRole(ME, TEAM, 'role_ffffffffffffffff'))).toEqual([
      'the organization has no such role',
    ]);
    expect(problems(await memberDesk([1]).deleteRole(ME, TEAM, ADMINISTRATION))).toEqual([
      NOT_BELOW,
    ]);
  });

  it('gives and takes one role of a member below the asker, never one’s own, never an owner’s', async () => {
    const d = desk();
    const given = roles(
      await d.giveRole(ME, TEAM, PLAIN.toUpperCase().replace('0X', '0x'), FINANCE),
    );
    expect(given.members.find((member) => member.wallet === PLAIN)?.roleIds).toEqual([
      MEMBER,
      FINANCE,
    ]);
    // Giving it again changes nothing.
    expect(
      roles(await d.giveRole(ME, TEAM, PLAIN, FINANCE)).members.find((m) => m.wallet === PLAIN)
        ?.roleIds,
    ).toEqual([MEMBER, FINANCE]);
    const taken = roles(await d.takeRole(ME, TEAM, PLAIN, FINANCE));
    expect(taken.members.find((member) => member.wallet === PLAIN)?.roleIds).toEqual([MEMBER]);
    expect(problems(await d.giveRole(ME, TEAM, ME, FINANCE))).toEqual([OWN_ROLES]);
    expect(problems(await d.giveRole(ME, TEAM, OWNER, FINANCE))).toEqual([OWNER_ONLY]);
    expect(problems(await d.giveRole(ME, TEAM, PLAIN, BASE))).toEqual([BASE_ROLE]);
    expect(problems(await d.giveRole(ME, TEAM, `0x${'01'.repeat(20)}`, FINANCE))).toEqual([
      'that wallet is not a member of the organization',
    ]);
    expect(problems(await d.giveRole(ME, TEAM, 7, FINANCE))).toHaveLength(1);
    expect(problems(await d.takeRole(ME, TEAM, PLAIN, 'role_ffffffffffffffff'))).toEqual([
      'the organization has no such role',
    ]);
    expect(problems(await memberDesk([2]).giveRole(ME, TEAM, PLAIN, FINANCE))[0]).toMatch(
      /^this needs manage-roles/,
    );
    expect(GRANT_EXCEEDS).toMatch(/permissions you hold/);
  });

  it('keeps the log newest first, for whoever may view it', async () => {
    const d = desk();
    await d.giveRole(ME, TEAM, PLAIN, FINANCE);
    await d.takeRole(ME, TEAM, PLAIN, FINANCE);
    const log = (await d.log(ME, TEAM)) as Extract<DeskLogAnswer, { ok: true }>;
    expect(log.lines.map((line) => [line.seq, line.act, line.subject])).toEqual([
      [2, 'role-taken', PLAIN],
      [1, 'role-given', PLAIN],
    ]);
    expect(log.lines[0]?.detail).toMatchObject({ role: FINANCE });
    expect(await d.log(ME, 'acc_personal')).toMatchObject({ ok: false });
    // A plain member of the organization is told who may.
    expect(problems(await memberDesk([3]).log(ME, TEAM))).toEqual([
      'this needs view-organization-log, which the owners hold, and the role Administración',
    ]);
  });
});
