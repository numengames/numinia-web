/**
 * Managing roles in the till (numinia-archive ADR-071: the rules are STD-051
 * ORG-003 and ORG-004, the register is STD-052): the real migrations on the
 * D1 shim, and the account desk as numinia.com's binding calls it. One
 * describe per rule or per door.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import type { RolesAnswer, RolesView } from '../src/db/roles';
import { ORG_PROBLEMS, needs } from '../src/lib/organizations';
import { ROLE_PROBLEMS } from '../src/lib/roles';
import { AccountDesk } from '../src/worker';
import { migratedTill, migrationFiles, sqliteD1 } from './sqlite-d1';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ANA = wallet('56');
const FER = wallet('12');
const MEMO = wallet('34');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

const viewOf = (answer: RolesAnswer): RolesView => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};

/** Lucía's studio of MIS-179 with the Team template: Pablo owns it, María administers, Fer keeps the money, Memo works. */
async function studio(desk: AccountDesk, sqlite: Shim['sqlite']): Promise<string> {
  const created = await desk.createTeam(PABLO, 'Estudio Lucía');
  if (!created.ok) throw new Error(created.problems.join());
  const id = created.account.id;
  for (const [who, role] of [
    [MARIA, 'admin'],
    [FER, 'member'],
    [MEMO, 'member'],
    [ANA, 'member'],
  ] as const) {
    const added = await desk.setMember(PABLO, id, who, role);
    if (!added.ok) throw new Error(added.problems.join());
  }
  for (const [who, role] of [
    [FER, 'Finance'],
    [MEMO, 'Member'],
  ] as const) {
    sqlite
      .prepare(
        `INSERT INTO team_member_roles (account_id, wallet, role_id)
         SELECT ?1, ?2, id FROM team_roles WHERE account_id = ?1 AND name = ?3`,
      )
      .run(id, who, role);
  }
  return id;
}

const idOf = (view: RolesView, name: string): string => {
  const role = view.roles.find((candidate) => candidate.name === name);
  if (role === undefined) throw new Error(`no role ${name}`);
  return role.id;
};

const order = (view: RolesView): string[] =>
  view.roles.map((role) => `${role.position}:${role.name}`);

function logOf(sqlite: Shim['sqlite'], accountId: string, acts: readonly string[]): unknown[] {
  return sqlite
    .prepare(
      `SELECT actor, as_house, act, subject, detail FROM team_log
        WHERE account_id = ? ORDER BY seq`,
    )
    .all(accountId)
    .map((row) => ({ ...row }))
    .filter((row) => acts.includes(String((row as { act: string }).act)));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('reading the roles', () => {
  it('shows every member the roles top down, who holds them, and which ones they may handle', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const owner = viewOf(await desk.roles(PABLO, id));
    expect(owner.as).toBe('owner');
    expect(order(owner)).toEqual(['3:Administration', '2:Finance', '1:Member', '0:@everyone']);
    expect(owner.roles.map((role) => [role.name, role.members, role.mayEdit])).toEqual([
      ['Administration', 1, true],
      ['Finance', 1, true],
      ['Member', 1, true],
      ['@everyone', 5, false],
    ]);
    expect(owner.members.map((member) => [member.wallet, member.owner])).toEqual([
      [PABLO, true],
      [FER, false],
      [MEMO, false],
      [ANA, false],
      [MARIA, false],
    ]);
    // The owner may give every role to everyone but themselves and… no owner: an owner is never given a role.
    expect(owner.members.find((member) => member.wallet === PABLO)?.assignable).toEqual([]);
    expect(owner.members.find((member) => member.wallet === ANA)?.assignable).toHaveLength(3);

    const maria = viewOf(await desk.roles(MARIA, id));
    expect(maria.as).toBe('member');
    // María stands at Administration: everything below is hers, Administration and the owner are not.
    expect(maria.roles.map((role) => [role.name, role.mayEdit])).toEqual([
      ['Administration', false],
      ['Finance', true],
      ['Member', true],
      ['@everyone', false],
    ]);
    expect(maria.members.find((member) => member.wallet === PABLO)?.assignable).toEqual([]);
    expect(maria.members.find((member) => member.wallet === MEMO)?.assignable).toHaveLength(2);

    // A plain member sees the list but may handle nothing.
    const memo = viewOf(await desk.roles(MEMO, id));
    expect(memo.roles.every((role) => !role.mayEdit)).toBe(true);
    expect(memo.members.every((member) => member.assignable.length === 0)).toBe(true);
  });

  it('keeps one organization from another, and strangers out', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.roles(STRANGER, id)).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
    expect(await desk.roles(PABLO, 'acc_t_missing')).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    expect(await desk.roles(1, 2, 'yes')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, ORG_PROBLEMS.house],
    });
  });

  it('lets the house read in the alpha, and writes that it did', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(HOUSE, id, true));
    expect(view.as).toBe('house');
    expect(logOf(sqlite, id, ['house-read'])).toEqual([
      { actor: HOUSE, as_house: 1, act: 'house-read', subject: null, detail: '{"what":"roles"}' },
    ]);
  });
});

describe('ORG-003: a role is created just below the creator’s highest', () => {
  it('puts it at the creator’s place and lifts the roles from there up by one', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(
      await desk.createRole(MARIA, id, {
        name: '  Moderación ',
        color: '#aa3300',
        hoist: true,
        permissions: ['mute-members', 'ban-members', 'mute-members'],
      }),
    );
    expect(order(view)).toEqual([
      '4:Administration',
      '3:Moderación',
      '2:Finance',
      '1:Member',
      '0:@everyone',
    ]);
    const made = view.roles.find((role) => role.name === 'Moderación');
    expect(made).toMatchObject({
      color: '#aa3300',
      hoist: true,
      permissions: ['ban-members', 'mute-members'],
      members: 0,
    });
    expect(logOf(sqlite, id, ['role-created'])).toEqual([
      {
        actor: MARIA,
        as_house: 0,
        act: 'role-created',
        subject: null,
        detail: JSON.stringify({ role: made?.id, name: 'Moderación' }),
      },
    ]);
  });

  it('puts an owner’s role at the very top, and a quiet one with no colour and nothing in it', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.createRole(PABLO, id, { name: 'Invitadas' }));
    expect(order(view)[0]).toBe('4:Invitadas');
    expect(view.roles[0]).toMatchObject({ color: null, hoist: false, permissions: [] });
  });

  it('asks for manage-roles, and names who holds it', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.createRole(MEMO, id, { name: 'X' })).toEqual({
      ok: false,
      problems: [needs('manage-roles', ['Administration'])],
    });
    expect(await desk.createRole(STRANGER, id, { name: 'X' })).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
  });

  it('gives only what the creator holds', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    // Pablo gives Memo a role that can manage roles but not ban.
    const made = viewOf(
      await desk.createRole(PABLO, id, { name: 'Gestión', permissions: ['manage-roles'] }),
    );
    expect(await desk.giveRole(PABLO, id, MEMO, idOf(made, 'Gestión'))).toMatchObject({ ok: true });
    expect(
      await desk.createRole(MEMO, id, { name: 'Vetos', permissions: ['ban-members'] }),
    ).toEqual({
      ok: false,
      problems: ['you may grant or take away only the permissions you hold'],
    });
    expect(
      await desk.createRole(MEMO, id, { name: 'Gestoras', permissions: ['manage-roles'] }),
    ).toMatchObject({
      ok: true,
    });
  });

  it('stops at the cap of roles', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const insert = sqlite.prepare(
      `INSERT INTO team_roles (account_id, id, name, position, hoist, permissions)
       VALUES (?1, ?2, ?3, ?4, 0, '[]')`,
    );
    // Three template roles besides the base one: 247 more fill the 250.
    for (let n = 0; n < 247; n++) {
      insert.run(id, `role_${n.toString(16).padStart(16, '0')}`, `R${n}`, 10 + n);
    }
    expect(await desk.createRole(PABLO, id, { name: 'One too many' })).toEqual({
      ok: false,
      problems: ['an organization holds at most 250 roles besides the base role'],
    });
  });

  it('reads what it is sent as untrusted', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const refused = (problems: string[]) => ({ ok: false, problems });
    expect(await desk.createRole(PABLO, id, null)).toEqual(refused([ROLE_PROBLEMS.role]));
    expect(await desk.createRole(PABLO, id, { name: '' })).toEqual(refused([ROLE_PROBLEMS.name]));
    expect(await desk.createRole(PABLO, id, { color: '#aabbcc' })).toEqual(
      refused([ROLE_PROBLEMS.name]),
    );
    expect(
      await desk.createRole(PABLO, id, {
        name: 'X',
        color: 'red',
        hoist: 'yes',
        permissions: ['fly'],
      }),
    ).toEqual(refused([ROLE_PROBLEMS.color, ROLE_PROBLEMS.hoist, ROLE_PROBLEMS.permissions]));
    expect(await desk.createRole(PABLO, id, { name: 'X', owner: true })).toEqual(
      refused([ROLE_PROBLEMS.change]),
    );
    expect(await desk.createRole(1, 5, {})).toEqual(
      refused([PROBLEMS.wallet, PROBLEMS.accountId, ROLE_PROBLEMS.change]),
    );
  });
});

describe('ORG-003: a role below you is edited, and only with permissions you hold', () => {
  it('changes the name, the colour, whether it is shown apart and what it carries, and logs what changed', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(MARIA, id)), 'Finance');
    const view = viewOf(
      await desk.editRole(MARIA, id, finance, {
        name: 'Tesorería',
        color: '#00ff00',
        hoist: true,
        permissions: ['manage-balance', 'view-organization-log'],
      }),
    );
    expect(view.roles.find((role) => role.id === finance)).toMatchObject({
      name: 'Tesorería',
      color: '#00ff00',
      hoist: true,
      permissions: ['view-organization-log', 'manage-balance'],
    });
    expect(logOf(sqlite, id, ['role-edited'])).toEqual([
      {
        actor: MARIA,
        as_house: 0,
        act: 'role-edited',
        subject: null,
        detail: JSON.stringify({
          role: finance,
          name: 'Tesorería',
          fields: 'name,color,hoist,permissions',
          added: 'view-organization-log',
        }),
      },
    ]);
    // Taking the colour away is a change too.
    const plain = viewOf(await desk.editRole(MARIA, id, finance, { color: null }));
    expect(plain.roles.find((role) => role.id === finance)?.color).toBeNull();
  });

  it('writes nothing when nothing changes', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(MARIA, id)), 'Finance');
    const before = sqlite.prepare('SELECT revision FROM team_profiles').get();
    expect(
      await desk.editRole(MARIA, id, finance, { name: 'Finance', hoist: false }),
    ).toMatchObject({
      ok: true,
    });
    expect(sqlite.prepare('SELECT revision FROM team_profiles').get()).toEqual(before);
    expect(logOf(sqlite, id, ['role-edited'])).toEqual([]);
  });

  it('refuses a role at or above the editor’s own, and permissions the editor lacks', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(MARIA, id));
    expect(await desk.editRole(MARIA, id, idOf(view, 'Administration'), { name: 'Jefas' })).toEqual(
      {
        ok: false,
        problems: [ORG_PROBLEMS.notBelow],
      },
    );
    // Memo manages roles through a role of their own, and lacks ban-members.
    const gestion = viewOf(
      await desk.createRole(PABLO, id, { name: 'Gestión', permissions: ['manage-roles'] }),
    );
    await desk.giveRole(PABLO, id, MEMO, idOf(gestion, 'Gestión'));
    expect(
      await desk.editRole(MEMO, id, idOf(gestion, 'Member'), { permissions: ['ban-members'] }),
    ).toEqual({
      ok: false,
      problems: ['you may grant or take away only the permissions you hold'],
    });
    expect(await desk.editRole(FER, id, idOf(view, 'Member'), { name: 'X' })).toEqual({
      ok: false,
      problems: [needs('manage-roles', ['Gestión', 'Administration'])],
    });
  });

  it('lets an owner change what everyone holds, but never the base role’s name or place', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const base = idOf(viewOf(await desk.roles(PABLO, id)), '@everyone');
    const view = viewOf(await desk.editRole(PABLO, id, base, { permissions: ['view-balance'] }));
    expect(view.roles.at(-1)?.permissions).toEqual(['view-balance']);
    for (const change of [{ name: 'Todas' }, { color: '#112233' }, { hoist: true }]) {
      expect(await desk.editRole(PABLO, id, base, change)).toEqual({
        ok: false,
        problems: [ROLE_PROBLEMS.baseFixed],
      });
    }
  });

  it('reads the role and the change as untrusted', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.editRole(PABLO, id, 'role_x', { name: 'X' })).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.roleId],
    });
    expect(await desk.editRole(PABLO, id, `role_${'0'.repeat(16)}`, { name: 'X' })).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.noSuchRole],
    });
    const finance = idOf(viewOf(await desk.roles(PABLO, id)), 'Finance');
    expect(await desk.editRole(PABLO, id, finance, {})).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.change],
    });
    expect(await desk.editRole(PABLO, id, finance, { name: 1 })).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.name],
    });
  });
});

describe('ORG-003: a role moves, and so does everything between', () => {
  it('moves a role up, the roles it passes stepping down', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const member = idOf(viewOf(await desk.roles(PABLO, id)), 'Member');
    const view = viewOf(await desk.moveRole(PABLO, id, member, 2));
    expect(order(view)).toEqual(['3:Administration', '2:Member', '1:Finance', '0:@everyone']);
    expect(logOf(sqlite, id, ['role-moved'])).toEqual([
      {
        actor: PABLO,
        as_house: 0,
        act: 'role-moved',
        subject: null,
        detail: JSON.stringify({ role: member, name: 'Member', from: '1', to: '2' }),
      },
    ]);
  });

  it('moves a role down, the roles it passes stepping up', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(PABLO, id)), 'Finance');
    const view = viewOf(await desk.moveRole(PABLO, id, finance, 1));
    expect(order(view)).toEqual(['3:Administration', '2:Member', '1:Finance', '0:@everyone']);
  });

  it('stops at the top of the list and does nothing to a role already there', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(PABLO, id)), 'Finance');
    const view = viewOf(await desk.moveRole(PABLO, id, finance, 1000));
    expect(order(view)).toEqual(['3:Finance', '2:Administration', '1:Member', '0:@everyone']);
    const before = sqlite.prepare('SELECT revision FROM team_profiles').get();
    await desk.moveRole(PABLO, id, finance, 1000);
    expect(sqlite.prepare('SELECT revision FROM team_profiles').get()).toEqual(before);
  });

  it('keeps the mover and the place below the mover’s highest role', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(MARIA, id));
    expect(await desk.moveRole(MARIA, id, idOf(view, 'Finance'), 3)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    expect(await desk.moveRole(MARIA, id, idOf(view, 'Administration'), 1)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    expect(await desk.moveRole(MARIA, id, idOf(view, '@everyone'), 2)).toEqual({
      ok: false,
      problems: ['everyone holds the base role: it is neither given nor taken away'],
    });
    expect(await desk.moveRole(PABLO, id, idOf(view, 'Finance'), 0)).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.position],
    });
    expect(await desk.moveRole(MEMO, id, idOf(view, 'Finance'), 1)).toEqual({
      ok: false,
      problems: [needs('manage-roles', ['Administration'])],
    });
  });
});

describe('ORG-003: a role below you is deleted, and its holders lose it', () => {
  it('removes the role and what members held of it, and writes it down', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const member = idOf(viewOf(await desk.roles(MARIA, id)), 'Member');
    const view = viewOf(await desk.deleteRole(MARIA, id, member));
    expect(order(view)).toEqual(['3:Administration', '2:Finance', '0:@everyone']);
    expect(
      sqlite.prepare('SELECT count(*) AS n FROM team_member_roles WHERE role_id = ?').get(member),
    ).toEqual({ n: 0 });
    expect(logOf(sqlite, id, ['role-deleted'])).toEqual([
      {
        actor: MARIA,
        as_house: 0,
        act: 'role-deleted',
        subject: null,
        detail: JSON.stringify({ role: member, name: 'Member' }),
      },
    ]);
  });

  it('keeps the base role and the roles at or above the deleter’s own', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(MARIA, id));
    expect(await desk.deleteRole(MARIA, id, idOf(view, 'Administration'))).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    expect(await desk.deleteRole(PABLO, id, idOf(view, '@everyone'))).toEqual({
      ok: false,
      problems: ['everyone holds the base role: it is neither given nor taken away'],
    });
    expect(await desk.deleteRole(FER, id, idOf(view, 'Member'))).toEqual({
      ok: false,
      problems: [needs('manage-roles', ['Administration'])],
    });
  });
});

describe('ORG-003 and ORG-004: a role is given to a member below you, and taken back', () => {
  it('gives and takes, once each, and writes both', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(MARIA, id)), 'Finance');
    const given = viewOf(
      await desk.giveRole(MARIA, id, MEMO.toUpperCase().replace('0X', '0x'), finance),
    );
    expect(given.members.find((member) => member.wallet === MEMO)?.roleIds).toContain(finance);
    // Giving again changes nothing and writes nothing more.
    await desk.giveRole(MARIA, id, MEMO, finance);
    const taken = viewOf(await desk.takeRole(MARIA, id, MEMO, finance));
    expect(taken.members.find((member) => member.wallet === MEMO)?.roleIds).not.toContain(finance);
    await desk.takeRole(MARIA, id, MEMO, finance);
    expect(
      logOf(sqlite, id, ['role-given', 'role-taken']).filter(
        (line) => (line as { actor: string }).actor === MARIA,
      ),
    ).toEqual([
      {
        actor: MARIA,
        as_house: 0,
        act: 'role-given',
        subject: MEMO,
        detail: JSON.stringify({ role: finance }),
      },
      {
        actor: MARIA,
        as_house: 0,
        act: 'role-taken',
        subject: MEMO,
        detail: JSON.stringify({ role: finance }),
      },
    ]);
  });

  it('never to oneself, an owner, a role at or above one’s own, or the base role', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(MARIA, id));
    expect(await desk.giveRole(MARIA, id, MARIA, idOf(view, 'Finance'))).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.ownRoles],
    });
    expect(await desk.giveRole(MARIA, id, PABLO, idOf(view, 'Finance'))).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.owner],
    });
    expect(await desk.giveRole(MARIA, id, ANA, idOf(view, 'Administration'))).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    expect(await desk.giveRole(MARIA, id, ANA, idOf(view, '@everyone'))).toEqual({
      ok: false,
      problems: ['everyone holds the base role: it is neither given nor taken away'],
    });
    // Nor above the one who holds it: Fer, who keeps the money, cannot hand out roles at all.
    expect(await desk.giveRole(FER, id, ANA, idOf(view, 'Member'))).toEqual({
      ok: false,
      problems: [needs('manage-roles', ['Administration'])],
    });
  });

  it('reads the member and the role as untrusted', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(PABLO, id)), 'Finance');
    expect(await desk.giveRole(PABLO, id, 'nope', finance)).toEqual({
      ok: false,
      problems: [PROBLEMS.memberWallet],
    });
    expect(await desk.giveRole(PABLO, id, STRANGER, finance)).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.noSuchMember],
    });
    expect(await desk.giveRole(PABLO, id, MEMO, 'role_x')).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.roleId],
    });
  });

  it('gives a role with administrator and the Saldo screen calls its holder an admin', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(PABLO, id));
    await desk.giveRole(PABLO, id, ANA, idOf(view, 'Administration'));
    const overview = await desk.overview(ANA);
    expect('accounts' in overview && overview.accounts.at(-1)?.role).toBe('admin');
  });
});

describe('every door', () => {
  it('keeps a stranger out and a made-up role unknown', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(PABLO, id)), 'Finance');
    const notMember = { ok: false, problems: [PROBLEMS.notMember] };
    expect(await desk.editRole(STRANGER, id, finance, { name: 'X' })).toEqual(notMember);
    expect(await desk.moveRole(STRANGER, id, finance, 1)).toEqual(notMember);
    expect(await desk.deleteRole(STRANGER, id, finance)).toEqual(notMember);
    expect(await desk.giveRole(STRANGER, id, MEMO, finance)).toEqual(notMember);
    expect(await desk.takeRole(STRANGER, id, MEMO, finance)).toEqual(notMember);
    expect(await desk.log(STRANGER, id)).toEqual(notMember);
    const unknown = { ok: false, problems: [ROLE_PROBLEMS.noSuchRole] };
    const nobody = `role_${'0'.repeat(16)}`;
    expect(await desk.moveRole(PABLO, id, nobody, 1)).toEqual(unknown);
    expect(await desk.deleteRole(PABLO, id, nobody)).toEqual(unknown);
    expect(await desk.giveRole(PABLO, id, MEMO, nobody)).toEqual(unknown);
    expect(await desk.moveRole(PABLO, id, finance, 'top')).toEqual({
      ok: false,
      problems: [ROLE_PROBLEMS.position],
    });
    expect(await desk.deleteRole(1, 2, 3, 4)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, ORG_PROBLEMS.house],
    });
  });

  it('refuses a list of permissions longer than the register', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(
      await desk.createRole(PABLO, id, { name: 'X', permissions: Array(18).fill('top-up') }),
    ).toEqual({ ok: false, problems: [ROLE_PROBLEMS.permissions] });
  });

  it('lets the house handle roles as the organization lets it, and writes it as the house', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const finance = idOf(viewOf(await desk.roles(PABLO, id)), 'Finance');
    const view = viewOf(await desk.editRole(HOUSE, id, finance, { name: 'Tesorería' }, true));
    expect(view.as).toBe('house');
    expect(logOf(sqlite, id, ['role-edited'])).toMatchObject([{ actor: HOUSE, as_house: 1 }]);
  });
});

describe('ORG-009: the log is read by whoever may view it', () => {
  it('lists the changes newest first, with who did them and whether as the house', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    await desk.createRole(PABLO, id, { name: 'Invitadas' });
    const log = await desk.log(PABLO, id);
    if (!log.ok) throw new Error(log.problems.join());
    expect(log.lines[0]).toMatchObject({ actor: PABLO, asHouse: false, act: 'role-created' });
    expect(log.lines.at(-1)).toMatchObject({ act: 'organization-created', subject: null });
    expect(log.lines.map((line) => line.seq)).toEqual(
      [...log.lines.map((line) => line.seq)].sort((a, b) => b - a),
    );
    expect(log.lines.at(-1)?.detail).toEqual({ name: 'Estudio Lucía', template: 'team' });
  });

  it('refuses whoever lacks view-organization-log and writes what the house read', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.log(MEMO, id)).toEqual({
      ok: false,
      problems: [needs('view-organization-log', ['Administration'])],
    });
    const log = await desk.log(HOUSE, id, true);
    expect(log.ok).toBe(true);
    expect(logOf(sqlite, id, ['house-read'])).toEqual([
      { actor: HOUSE, as_house: 1, act: 'house-read', subject: null, detail: '{"what":"log"}' },
    ]);
  });
});

describe('every change is guarded by the revision it read', () => {
  it('writes nothing, in any door, when the organization changed meanwhile', async () => {
    const { desk, db, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = viewOf(await desk.roles(PABLO, id));
    const racing: typeof db = {
      ...db,
      batch: async <T = unknown>(statements: D1PreparedStatement[]) => {
        sqlite.exec('UPDATE team_profiles SET revision = revision + 1');
        return db.batch<T>(statements);
      },
    };
    const raced = new AccountDesk(ctx, { TILL_DB: racing });
    const before = sqlite.prepare('SELECT * FROM team_roles ORDER BY position, id').all();
    const held = sqlite.prepare('SELECT * FROM team_member_roles').all();
    const finance = idOf(view, 'Finance');
    const meanwhile = { ok: false, problems: [PROBLEMS.meanwhile] };
    expect(await raced.createRole(PABLO, id, { name: 'Invitadas' })).toEqual(meanwhile);
    expect(await raced.editRole(PABLO, id, finance, { name: 'X' })).toEqual(meanwhile);
    expect(await raced.moveRole(PABLO, id, finance, 1)).toEqual(meanwhile);
    expect(await raced.giveRole(PABLO, id, ANA, finance)).toEqual(meanwhile);
    expect(await raced.takeRole(PABLO, id, FER, finance)).toEqual(meanwhile);
    expect(await raced.deleteRole(PABLO, id, finance)).toEqual(meanwhile);
    expect(sqlite.prepare('SELECT * FROM team_roles ORDER BY position, id').all()).toEqual(before);
    expect(sqlite.prepare('SELECT * FROM team_member_roles').all()).toEqual(held);
    expect(
      logOf(sqlite, id, ['role-created', 'role-edited', 'role-moved', 'role-deleted']),
    ).toEqual([]);
  });
});

describe('migration 0005: the log learns the acts of roles and keeps its lines', () => {
  it('copies every line, accepts the new acts and stays append-only', () => {
    const { sqlite } = sqliteD1();
    const files = migrationFiles();
    const index = files.indexOf('0005_role_log_acts.sql');
    expect(index).toBeGreaterThan(0);
    const run = (name: string | undefined): void => {
      sqlite.exec(
        readFileSync(
          fileURLToPath(new URL(`../migrations/${name ?? ''}`, import.meta.url).href),
          'utf8',
        ),
      );
    };
    for (const name of files.slice(0, index)) run(name);
    const at = '2026-10-14T12:00:00.000Z';
    sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc_t_one', 'team', '${at}');
      INSERT INTO team_profiles (account_id, name, created_by, created_at)
        VALUES ('acc_t_one', 'One', '${PABLO}', '${at}');
      INSERT INTO team_log (account_id, at, actor, as_house, act, subject, detail)
        VALUES ('acc_t_one', '${at}', '${PABLO}', 0, 'member-added', '${MARIA}', NULL);
    `);
    run(files[index]);
    expect(
      sqlite
        .prepare('SELECT act, subject FROM team_log')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ act: 'member-added', subject: MARIA }]);
    for (const act of ['role-created', 'role-edited', 'role-moved', 'role-deleted']) {
      sqlite
        .prepare(
          `INSERT INTO team_log (account_id, at, actor, as_house, act) VALUES ('acc_t_one', ?, ?, 0, ?)`,
        )
        .run(at, PABLO, act);
    }
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO team_log (account_id, at, actor, as_house, act) VALUES ('acc_t_one', ?, ?, 0, 'role-flew')`,
        )
        .run(at, PABLO),
    ).toThrow();
    expect(() => sqlite.exec(`UPDATE team_log SET actor = actor`)).toThrow(/log is kept/);
    expect(() => sqlite.exec(`DELETE FROM team_log`)).toThrow(/log is kept/);
  });
});
