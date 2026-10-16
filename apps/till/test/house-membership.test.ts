/**
 * «La casa es administradora, y Numen Games tiene sus roles» (cut 7,
 * 2026-10-16): the house adds ITSELF to an organization as its administrator,
 * opening a community makes the opening Oracle one, the Team roles are born
 * coloured, Numen Games calls its administrators «Oracles», migration 0009
 * brings the already-open Numen Games account along, and the house opens
 * every community in one call. One describe per rule.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import type { EnsureAnswer, OpenAllAnswer } from '../src/db/community-teams';
import { COMMUNITY_PROBLEMS, communityRoles } from '../src/lib/community-teams';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const HOUSE = wallet('99');
const ORACLE = wallet('98');
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

const idOf = (answer: EnsureAnswer): string => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.account.id;
};

const rolesOf = (sqlite: Shim['sqlite'], account: string) =>
  sqlite
    .prepare(
      'SELECT name, color, position, permissions FROM team_roles WHERE account_id = ? ORDER BY position DESC',
    )
    .all(account)
    .map((row) => ({ ...row }));

const logOf = (sqlite: Shim['sqlite'], account: string, ...acts: string[]) =>
  sqlite
    .prepare('SELECT actor, as_house, act, subject FROM team_log WHERE account_id = ? ORDER BY seq')
    .all(account)
    .map((row) => ({ ...row }))
    .filter((line) => acts.includes(String(line['act'])));

const heldRoles = (sqlite: Shim['sqlite'], account: string, member: string): string[] =>
  sqlite
    .prepare(
      `SELECT r.name AS name FROM team_member_roles AS h
         JOIN team_roles AS r ON r.account_id = h.account_id AND r.id = h.role_id
        WHERE h.account_id = ? AND h.wallet = ?`,
    )
    .all(account, member)
    .map((row) => String(row['name']));

describe('setMember: the house adds itself', () => {
  it('becomes a member with the administrator role, whatever role it asked for', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'other', 'Other'));
    // The Oracle that opened it is a member already; another Oracle is not.
    expect(await desk.setMember(ORACLE, id, ORACLE, 'member', true)).toMatchObject({
      ok: true,
      members: expect.arrayContaining([expect.objectContaining({ wallet: ORACLE, role: 'admin' })]),
    });
    expect(heldRoles(sqlite, id, ORACLE)).toEqual(['Administration']);
    expect(
      logOf(sqlite, id, 'member-added', 'role-given').filter((l) => l['subject'] === ORACLE),
    ).toEqual([
      { actor: ORACLE, as_house: 1, act: 'member-added', subject: ORACLE },
      { actor: ORACLE, as_house: 1, act: 'role-given', subject: ORACLE },
    ]);
  });

  it('reproduces Pablo’s toast: ensure the team, then the house adds itself — it was refused before', async () => {
    const { desk } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    const added = await desk.setMember(HOUSE, id, HOUSE, 'member', true);
    expect(added).toMatchObject({ ok: true, members: [{ wallet: HOUSE, role: 'admin' }] });
  });

  it('is a no-op when the house is already an administrator member: no second row, no log line', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    const before = logOf(sqlite, id, 'member-added', 'role-given').length;
    await desk.setMember(HOUSE, id, HOUSE, 'admin', true);
    await desk.setMember(HOUSE, id, HOUSE, 'member', true);
    expect(logOf(sqlite, id, 'member-added', 'role-given')).toHaveLength(before);
    expect(heldRoles(sqlite, id, HOUSE)).toEqual(['Oracles']);
  });

  it('still refuses a member changing their own roles, the house included', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    sqlite
      .prepare('DELETE FROM team_member_roles WHERE account_id = ? AND wallet = ?')
      .run(id, HOUSE);
    expect(await desk.setMember(HOUSE, id, HOUSE, 'member', true)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.ownRoles],
    });
    const made = await desk.createTeam(PABLO, 'Mine');
    if (!made.ok) throw new Error(made.problems.join());
    expect(await desk.setMember(PABLO, made.account.id, PABLO, 'member')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.ownRoles],
    });
  });

  it('does not let a person add themselves: only the house’s word counts', async () => {
    const { desk } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    expect(await desk.setMember(MARIA, id, MARIA, 'admin', false)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
  });

  it('answers a refusal in words when the organization has no administrator role to give', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'other', 'Other'));
    sqlite.prepare("UPDATE team_roles SET permissions = '[]' WHERE account_id = ?").run(id);
    expect(await desk.setMember(ORACLE, id, ORACLE, 'member', true)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.noAdministratorRole],
    });
  });
});

describe('ensureCommunityTeam: the calling Oracle becomes an administrator member', () => {
  it('joins the organization it opens, as the house, with the administrator role', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    expect(await desk.members(HOUSE, id, true)).toMatchObject({
      ok: true,
      members: [{ wallet: HOUSE, role: 'admin' }],
    });
    expect(sqlite.prepare('SELECT owner FROM team_members WHERE account_id = ?').all(id)).toEqual([
      { owner: 0 },
    ]);
    expect(logOf(sqlite, id, 'member-added', 'role-given')).toEqual([
      { actor: HOUSE, as_house: 1, act: 'member-added', subject: HOUSE },
      { actor: HOUSE, as_house: 1, act: 'role-given', subject: HOUSE },
    ]);
  });

  it('joins an organization that was open already, on a later call, once', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    await desk.ensureCommunityTeam(ORACLE, true, 'numen-games', 'Numen Games');
    await desk.ensureCommunityTeam(ORACLE, true, 'numen-games', 'Numen Games');
    await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games');
    const members = await desk.members(HOUSE, id, true);
    if (!members.ok) throw new Error(members.problems.join());
    expect(members.members.map((m) => m.wallet).sort()).toEqual([HOUSE, ORACLE].sort());
    expect(logOf(sqlite, id, 'member-added')).toHaveLength(2);
    expect(logOf(sqlite, id, 'role-given')).toHaveLength(2);
    expect(heldRoles(sqlite, id, ORACLE)).toHaveLength(1);
  });

  it('is not an owner and not a founding: the founder bound is untouched', async () => {
    const { desk, sqlite } = scene();
    for (let n = 0; n < 25; n += 1)
      idOf(await desk.ensureCommunityTeam(HOUSE, true, `community-${n}`, `Community ${n}`));
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_members WHERE owner = 1').get()).toEqual({
      n: 0,
    });
    expect((await desk.createTeam(HOUSE, 'By hand')).ok).toBe(true);
  });

  it('survives two first calls at once: one account, one member', async () => {
    const { desk, sqlite } = scene();
    const answers = await Promise.all([
      desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'),
      desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'),
    ]);
    expect(answers.every((answer) => answer.ok)).toBe(true);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_members').get()).toEqual({ n: 1 });
  });

  it('leaves the account alone when the house may not enter it', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    sqlite.prepare('DELETE FROM team_member_roles').run();
    sqlite.prepare('DELETE FROM team_members').run();
    sqlite.prepare("UPDATE team_profiles SET house_access = 'never' WHERE account_id = ?").run(id);
    expect((await desk.ensureCommunityTeam(ORACLE, true, 'numen-games', 'Numen')).ok).toBe(true);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_members').get()).toEqual({ n: 0 });
  });
});

describe('colours: the Team roles are born coloured', () => {
  const COLOURS = ['#d98324', '#2f7fa8', '#3d8b5f', null];

  it('createTeam: Administration orange, Finance blue, Member green, the base role none', async () => {
    const { desk, sqlite } = scene();
    const made = await desk.createTeam(PABLO, 'Mine');
    if (!made.ok) throw new Error(made.problems.join());
    const roles = rolesOf(sqlite, made.account.id);
    expect(roles.map((role) => role['name'])).toEqual([
      'Administration',
      'Finance',
      'Member',
      '@everyone',
    ]);
    expect(roles.map((role) => role['color'])).toEqual(COLOURS);
  });

  it('ensureCommunityTeam: the same colours on an ordinary community', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numinia', 'Numinia'));
    expect(rolesOf(sqlite, id).map((role) => role['color'])).toEqual(COLOURS);
    expect(rolesOf(sqlite, id).map((role) => role['name'])).toEqual([
      'Administration',
      'Finance',
      'Member',
      '@everyone',
    ]);
  });
});

describe('Numen Games: the Oracles are the administrators', () => {
  it('names the administrator role «Oracles», orange, with the administrator permission', async () => {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    const roles = rolesOf(sqlite, id);
    expect(roles[0]).toEqual({
      name: 'Oracles',
      color: '#d98324',
      position: 3,
      permissions: JSON.stringify(['administrator']),
    });
    expect(roles.slice(1).map((role) => [role['name'], role['color']])).toEqual([
      ['Finance', '#2f7fa8'],
      ['Member', '#3d8b5f'],
      ['@everyone', null],
    ]);
    expect(heldRoles(sqlite, id, HOUSE)).toEqual(['Oracles']);
  });
});

describe('migration 0009: the Numen Games account that is already open', () => {
  const MIGRATION = readFileSync(
    fileURLToPath(new URL('../migrations/0009_numen_games_roles.sql', import.meta.url).href),
    'utf8',
  );
  const NUMEN_GAMES = `acc_t_${createHash('sha256')
    .update('numinia-till community numen-games')
    .digest('hex')
    .slice(0, 32)}`;

  it('targets the account id the till derives for numen-games', () => {
    expect(NUMEN_GAMES).toBe('acc_t_2e2dd18c880ba974da1512dc7cde2431');
    expect(MIGRATION).toContain(NUMEN_GAMES);
  });

  /** An account as cut 6 left it: English names, no colours. */
  async function liveBefore() {
    const { desk, sqlite } = scene();
    const id = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    sqlite
      .prepare(
        "UPDATE team_roles SET name = 'Administration', color = NULL WHERE account_id = ?1 AND position = 3",
      )
      .run(id);
    sqlite.prepare('UPDATE team_roles SET color = NULL WHERE account_id = ?1').run(id);
    return { sqlite, id };
  }

  it('renames the administrator role and colours the three roles that have none', async () => {
    const { sqlite, id } = await liveBefore();
    sqlite.exec(MIGRATION);
    expect(rolesOf(sqlite, id).map((role) => [role['name'], role['color']])).toEqual([
      ['Oracles', '#d98324'],
      ['Finance', '#2f7fa8'],
      ['Member', '#3d8b5f'],
      ['@everyone', null],
    ]);
  });

  it('keeps a colour somebody chose, and runs twice without harm', async () => {
    const { sqlite, id } = await liveBefore();
    sqlite
      .prepare("UPDATE team_roles SET color = '#6b5ca5' WHERE account_id = ?1 AND position = 2")
      .run(id);
    sqlite.exec(MIGRATION);
    const once = rolesOf(sqlite, id);
    sqlite.exec(MIGRATION);
    expect(rolesOf(sqlite, id)).toEqual(once);
    expect(once.map((role) => role['color'])).toEqual(['#d98324', '#6b5ca5', '#3d8b5f', null]);
  });

  it('does not touch another organization, nor a role somebody already renamed', async () => {
    const { desk, sqlite } = scene();
    const other = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numinia', 'Numinia'));
    const mine = idOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen Games'));
    sqlite
      .prepare("UPDATE team_roles SET name = 'Wardens' WHERE account_id = ?1 AND position = 3")
      .run(mine);
    sqlite.prepare('UPDATE team_roles SET color = NULL WHERE account_id = ?1').run(other);
    sqlite.exec(MIGRATION);
    expect(rolesOf(sqlite, mine)[0]?.['name']).toBe('Wardens');
    expect(rolesOf(sqlite, other).map((role) => role['color'])).toEqual([null, null, null, null]);
  });

  it('is harmless when the account does not exist', () => {
    const { sqlite } = scene();
    expect(() => sqlite.exec(MIGRATION)).not.toThrow();
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_roles').get()).toEqual({ n: 0 });
  });
});

describe('openAllCommunities', () => {
  const communities = [
    { id: 'numen-games', name: 'Numen Games' },
    { id: 'numinia', name: 'Numinia' },
  ];
  const accountsOf = (answer: OpenAllAnswer) => {
    if (!answer.ok) throw new Error(answer.problems.join());
    return answer.accounts;
  };

  it('opens each one, makes the house their administrator, and answers {id,name,created}', async () => {
    const { desk, sqlite } = scene();
    const accounts = accountsOf(await desk.openAllCommunities(HOUSE, true, communities));
    expect(accounts.map((a) => [a.name, a.created])).toEqual([
      ['Numen Games', true],
      ['Numinia', true],
    ]);
    expect(accounts[0]?.id).toMatch(/^acc_t_[0-9a-f]{32}$/);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_members').get()).toEqual({ n: 2 });
    const again = accountsOf(await desk.openAllCommunities(HOUSE, true, communities));
    expect(again.map((a) => a.created)).toEqual([false, false]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_members').get()).toEqual({ n: 2 });
  });

  it('is for the house alone', async () => {
    const { desk, sqlite } = scene();
    expect(await desk.openAllCommunities(PABLO, false, communities)).toEqual({
      ok: false,
      problems: [COMMUNITY_PROBLEMS.notHouse],
    });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 0 });
  });

  it('reads everything as untrusted and names the problems', async () => {
    const { desk, sqlite } = scene();
    expect(await desk.openAllCommunities('nobody', 'yes', 'x')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house, COMMUNITY_PROBLEMS.communities],
    });
    for (const bad of [
      [],
      Array.from({ length: 51 }, (_, n) => ({ id: `c-${n}`, name: 'N' })),
      [{ id: 'Bad Id', name: 'N' }],
      [{ id: 'ok', name: '' }],
      [null],
      ['ok'],
      [{ id: 'ok' }],
    ]) {
      expect(await desk.openAllCommunities(HOUSE, true, bad), JSON.stringify(bad)).toEqual({
        ok: false,
        problems: [COMMUNITY_PROBLEMS.communities],
      });
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM accounts').get()).toEqual({ n: 0 });
  });

  it('accepts fifty', async () => {
    const { desk } = scene();
    const fifty = Array.from({ length: 50 }, (_, n) => ({ id: `c-${n}`, name: `C ${n}` }));
    expect(accountsOf(await desk.openAllCommunities(HOUSE, true, fifty))).toHaveLength(50);
  });
});

describe('communityRoles: the override table', () => {
  it('names the Oracles in the five languages, and leaves the other communities the template', () => {
    const names = (community: string, locale: Parameters<typeof communityRoles>[1]) =>
      communityRoles(community, locale, (i) => `r${i}`)[0]?.name;
    expect(
      (['es', 'en', 'ja', 'ko', 'pt-br'] as const).map((locale) => names('numen-games', locale)),
    ).toEqual(['Oráculos', 'Oracles', 'オラクル', '오라클', 'Oráculos']);
    expect(names('numinia', 'es')).toBe('Administración');
    expect(communityRoles('numen-games', 'en', (i) => `r${i}`).map((role) => role.name)).toEqual([
      'Oracles',
      'Finance',
      'Member',
      '@everyone',
    ]);
  });
});
