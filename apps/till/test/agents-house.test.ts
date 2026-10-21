/**
 * «La casa conecta IAs» (D-078, 2026-10-20; migration 0025): the house may
 * connect an AI in any community that lets it in (ORG-007), answering for it
 * as the house. Created, renewed, switched, given roles and removed with its
 * mark in the log; only roles without Administrator or Manage roles; the
 * community's owners and managers see it and remove it like any other.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { AGENT_PROBLEMS, MAX_AGENTS } from '../src/lib/agents';
import { AccountDesk } from '../src/worker';
import { MIGRATIONS, migratedTill, migrationFiles, sqliteD1 } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const STRANGER = wallet('ef');
const ORACLE = wallet('99');
const OTHER_ORACLE = wallet('98');
const ctx = {} as ExecutionContext;

const HASH = 'a'.repeat(64);
const HASH_2 = 'b'.repeat(64);
const TOKEN = {
  id: 'claude-casa',
  name: 'Claude casa',
  auth: 'token' as const,
  tokenHash: HASH,
  tokenPrefix: 'ab12cd34',
  via: 'mcp:claude.ai',
};

function scene() {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}
type Scene = ReturnType<typeof scene>;

/** PABLO owns «Numen»; MARIA is a Steward (manage-roles); the roles on offer. */
async function team(s: Scene) {
  const made = await s.desk.createTeam(PABLO, 'Numen');
  if (!made.ok) throw new Error(made.problems.join());
  const id = made.account.id;
  await s.desk.setMember(PABLO, id, MARIA, 'member');
  const make = async (name: string, permissions: string[]): Promise<string> => {
    const answer = await s.desk.createRole(PABLO, id, {
      name,
      color: null,
      hoist: false,
      permissions: permissions as never,
    });
    if (!answer.ok) throw new Error(answer.problems.join());
    return answer.roles.find((r) => r.name === name)?.id as string;
  };
  const roles = {
    guest: await make('Guest', ['enter-worlds']),
    builder: await make('Builder', ['enter-worlds', 'build-in-worlds']),
    steward: await make('Steward', ['manage-roles', 'enter-worlds']),
    admin: await make('Boss', ['administrator']),
  };
  await s.desk.giveRole(PABLO, id, MARIA, roles.steward);
  return { id, roles };
}

const viewOf = (answer: Awaited<ReturnType<AccountDesk['agents']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};
const problems = (answer: { readonly ok: boolean; readonly problems?: readonly string[] }) =>
  answer.ok ? [] : [...(answer.problems as readonly string[])];
const lines = (s: Scene, id: string, act: string) =>
  s.sqlite
    .prepare('SELECT actor, as_house, subject FROM team_log WHERE account_id = ? AND act = ?')
    .all(id, act);
const setAccess = (s: Scene, access: string) =>
  s.sqlite.prepare('UPDATE team_profiles SET house_access = ?').run(access);

describe('the house connects an AI where it may enter', () => {
  it('creates it, answers for it as the house, and writes the line with the house’s mark', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    await s.desk.setProfile(ORACLE, { name: 'Ursa', avatar: null });
    const made = viewOf(
      await s.desk.createAgent(ORACLE, id, { ...TOKEN, roleIds: [roles.builder] }, true),
    );
    expect(made.as).toBe('house');
    expect(made.agents[0]).toMatchObject({
      id: 'claude-casa',
      responsible: ORACLE,
      responsibleHouse: true,
      responsibleName: 'Ursa',
      via: 'mcp:claude.ai',
      roleIds: [roles.builder],
      status: 'activa',
      mayEdit: true,
    });
    expect(lines(s, id, 'agent-created')).toEqual([
      { actor: ORACLE, as_house: 1, subject: 'claude-casa' },
    ]);
    expect(lines(s, id, 'agent-token-created')).toEqual([
      { actor: ORACLE, as_house: 1, subject: 'claude-casa' },
    ]);
    expect(s.sqlite.prepare('SELECT responsible_house FROM team_agents').get()).toEqual({
      responsible_house: 1,
    });
  });

  it('gives a pass while the community lets the house in, and none once it does not', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    await s.desk.createAgent(ORACLE, id, { ...TOKEN, roleIds: [roles.builder] }, true);
    const pass = await s.desk.agentPass(id, 'claude-casa');
    expect(pass).toMatchObject({ ok: true, eligible: true });
    expect(pass.ok && pass.permissions).toEqual(
      expect.arrayContaining(['enter-worlds', 'build-in-worlds']),
    );
    expect(pass.ok && pass.permissions).not.toContain('manage-roles');
    setAccess(s, 'never');
    const closed = await s.desk.agentPass(id, 'claude-casa');
    expect(closed).toMatchObject({ ok: true, eligible: false, permissions: [] });
    // The community still sees it, with no responsible, and its owner removes it.
    const seen = viewOf(await s.desk.agents(PABLO, id));
    expect(seen.agents[0]).toMatchObject({ status: 'sin-responsable', responsibleHouse: true });
    expect(viewOf(await s.desk.removeAgent(PABLO, id, 'claude-casa')).agents).toEqual([]);
  });

  it('is refused where the community does not let the house in', async () => {
    const s = scene();
    const { id } = await team(s);
    setAccess(s, 'never');
    expect(problems(await s.desk.createAgent(ORACLE, id, TOKEN, true))).toEqual([
      PROBLEMS.notMember,
    ]);
    expect(problems(await s.desk.agents(ORACLE, id, true))).toEqual([PROBLEMS.notMember]);
    setAccess(s, 'on-request');
    expect(problems(await s.desk.createAgent(ORACLE, id, TOKEN, true))).toEqual([
      PROBLEMS.notMember,
    ]);
    // Without the house's flag an Oracle who is no member is a stranger too.
    setAccess(s, 'alpha');
    expect(problems(await s.desk.createAgent(ORACLE, id, TOKEN))).toEqual([PROBLEMS.notMember]);
    expect(s.sqlite.prepare('SELECT count(*) AS n FROM team_agents').get()).toEqual({ n: 0 });
  });

  it('keeps the limit', async () => {
    const s = scene();
    const { id } = await team(s);
    for (let n = 0; n < MAX_AGENTS; n += 1) {
      const hash = n.toString(16).padStart(64, '0');
      const made = await s.desk.createAgent(
        ORACLE,
        id,
        { ...TOKEN, id: `ai-${n}`, name: `AI ${n}`, tokenHash: hash },
        true,
      );
      expect(made.ok).toBe(true);
    }
    expect(viewOf(await s.desk.agents(ORACLE, id, true)).mayCreate).toBe(false);
    expect(
      problems(
        await s.desk.createAgent(ORACLE, id, { ...TOKEN, id: 'one-more', tokenHash: HASH_2 }, true),
      ),
    ).toEqual([AGENT_PROBLEMS.limit]);
  });
});

describe('the house’s ceiling for the roles it gives', () => {
  it('lists every role but the ones holding Administrator or Manage roles', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    const view = viewOf(await s.desk.agents(ORACLE, id, true));
    const offered = view.assignableRoles.map((r) => r.id);
    expect(offered).toEqual(expect.arrayContaining([roles.guest, roles.builder]));
    expect(offered).not.toContain(roles.admin);
    expect(offered).not.toContain(roles.steward);
    // Whatever is offered holds neither of the two permissions.
    const all = await s.desk.roles(PABLO, id);
    if (!all.ok) throw new Error(all.problems.join());
    for (const role of all.roles.filter((r) => offered.includes(r.id))) {
      expect(role.permissions).not.toContain('administrator');
      expect(role.permissions).not.toContain('manage-roles');
    }
    // An owner (a person) has no such ceiling: it still stands above every role.
    expect(viewOf(await s.desk.agents(PABLO, id)).assignableRoles.map((r) => r.id)).toContain(
      roles.admin,
    );
  });

  it('refuses a role over the ceiling at creation, and writes nothing', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    for (const roleId of [roles.admin, roles.steward]) {
      expect(
        problems(await s.desk.createAgent(ORACLE, id, { ...TOKEN, roleIds: [roleId] }, true)),
      ).toEqual([AGENT_PROBLEMS.houseCeiling]);
    }
    expect(s.sqlite.prepare('SELECT count(*) AS n FROM team_agents').get()).toEqual({ n: 0 });
    // A role of another organization does not exist here.
    expect(
      problems(
        await s.desk.createAgent(
          ORACLE,
          id,
          { ...TOKEN, roleIds: ['role_ffffffffffffffff'] },
          true,
        ),
      ).length,
    ).toBe(1);
  });

  it('gives and takes roles later within the ceiling, and can still take one it holds above it', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    await s.desk.createAgent(ORACLE, id, TOKEN, true);
    const given = viewOf(
      await s.desk.giveAgentRole(ORACLE, id, 'claude-casa', roles.builder, true),
    );
    expect(given.agents[0]?.roleIds).toEqual([roles.builder]);
    const assignable = given.agents[0]?.assignable ?? [];
    expect(assignable).toEqual(expect.arrayContaining([roles.guest, roles.builder]));
    expect(assignable).not.toContain(roles.admin);
    expect(lines(s, id, 'agent-role-given')).toEqual([
      { actor: ORACLE, as_house: 1, subject: 'claude-casa' },
    ]);
    expect(
      problems(await s.desk.giveAgentRole(ORACLE, id, 'claude-casa', roles.admin, true)),
    ).toEqual([AGENT_PROBLEMS.houseCeiling]);
    // The owner hands it a Steward role; the house can take it away though it may not give it.
    await s.desk.giveAgentRole(PABLO, id, 'claude-casa', roles.steward);
    const withSteward = viewOf(await s.desk.agents(ORACLE, id, true));
    expect(withSteward.agents[0]?.assignable).toContain(roles.steward);
    const taken = viewOf(
      await s.desk.takeAgentRole(ORACLE, id, 'claude-casa', roles.steward, true),
    );
    expect(taken.agents[0]?.roleIds).toEqual([roles.builder]);
    expect(lines(s, id, 'agent-role-taken')).toHaveLength(1);
  });
});

describe('the house handles its AIs', () => {
  it('renews the token, switches it, sets state and hearing — every act marked', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(ORACLE, id, TOKEN, true);
    expect(
      (
        await s.desk.renewAgentToken(
          ORACLE,
          id,
          'claude-casa',
          HASH_2,
          'ef56ab78',
          true,
          'mcp:claude.ai',
        )
      ).ok,
    ).toBe(true);
    await s.desk.changeAgent(ORACLE, id, 'claude-casa', { enabled: false }, true);
    await s.desk.changeAgent(
      ORACLE,
      id,
      'claude-casa',
      { enabled: true, state: 'dormida', hears: true },
      true,
    );
    const marks = s.sqlite
      .prepare("SELECT act, as_house FROM team_log WHERE act LIKE 'agent-%' ORDER BY seq")
      .all();
    expect(marks.length).toBeGreaterThanOrEqual(6);
    expect(marks.every((row) => row['as_house'] === 1)).toBe(true);
    // Another Oracle handles it too: the house answers, not one person.
    const other = await s.desk.changeAgent(
      OTHER_ORACLE,
      id,
      'claude-casa',
      { state: 'activa' },
      true,
    );
    expect(other.ok).toBe(true);
    expect(viewOf(other).agents[0]).toMatchObject({ state: 'activa', hears: true });
  });

  it('is removed by it, with the house’s mark', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(ORACLE, id, TOKEN, true);
    expect(viewOf(await s.desk.removeAgent(ORACLE, id, 'claude-casa', true)).agents).toEqual([]);
    expect(lines(s, id, 'agent-removed')).toEqual([
      { actor: ORACLE, as_house: 1, subject: 'claude-casa' },
    ]);
  });
});

describe('the community sees and removes what the house connected', () => {
  it('lets an owner see it, change it and remove it', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(ORACLE, id, TOKEN, true);
    const seen = viewOf(await s.desk.agents(PABLO, id));
    expect(seen.agents[0]).toMatchObject({ responsibleHouse: true, mayEdit: true });
    const off = viewOf(await s.desk.changeAgent(PABLO, id, 'claude-casa', { enabled: false }));
    expect(off.agents[0]?.status).toBe('apagada');
    expect(lines(s, id, 'agent-disabled')).toEqual([
      { actor: PABLO, as_house: 0, subject: 'claude-casa' },
    ]);
    expect(viewOf(await s.desk.removeAgent(PABLO, id, 'claude-casa')).agents).toEqual([]);
  });

  it('lets a manager remove it when it stands above the AI, and not when it holds as much', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    await s.desk.createAgent(ORACLE, id, { ...TOKEN, roleIds: [roles.builder] }, true);
    // MARIA is a Steward: above Builder.
    expect(viewOf(await s.desk.agents(MARIA, id)).agents[0]?.mayEdit).toBe(true);
    // A manager who is no member of the house’s wallet does not answer for it by wallet…
    expect(MARIA).not.toBe(ORACLE);
    // …and a person whose wallet is the Oracle’s, acting as a member, gets no shortcut:
    await s.desk.setMember(PABLO, id, ORACLE, 'member');
    expect(
      problems(await s.desk.changeAgent(ORACLE, id, 'claude-casa', { enabled: false }))[0],
    ).toMatch(/manage-roles/);
    // Not a member, not the house: a stranger sees nothing.
    expect(problems(await s.desk.agents(STRANGER, id))).toEqual([PROBLEMS.notMember]);
    expect(viewOf(await s.desk.removeAgent(MARIA, id, 'claude-casa')).agents).toEqual([]);
  });

  it('keeps a member-made AI as it was: the member answers, not the house', async () => {
    const s = scene();
    const { id, roles } = await team(s);
    await s.desk.createAgent(MARIA, id, { ...TOKEN, roleIds: [roles.guest] });
    const seen = viewOf(await s.desk.agents(PABLO, id));
    expect(seen.agents[0]).not.toHaveProperty('responsibleHouse');
    expect(seen.agents[0]).toMatchObject({ responsible: MARIA, status: 'activa' });
    expect(s.sqlite.prepare('SELECT responsible_house FROM team_agents').get()).toEqual({
      responsible_house: 0,
    });
    // The house, entering, still handles it by height.
    expect(
      viewOf(await s.desk.changeAgent(ORACLE, id, 'claude-casa', { enabled: false }, true))
        .agents[0]?.status,
    ).toBe('apagada');
  });
});

describe('migration 0025', () => {
  it('adds the column without a rebuild: old AIs are answered by a member', async () => {
    const shim = sqliteD1();
    const names = migrationFiles();
    const at = names.indexOf('0025_agent_responsible_house.sql');
    expect(at).toBeGreaterThan(0);
    for (const name of names.slice(0, at)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
    const desk = new AccountDesk(ctx, { TILL_DB: shim.db });
    const made = await desk.createTeam(PABLO, 'Numen');
    if (!made.ok) throw new Error(made.problems.join());
    shim.sqlite
      .prepare(
        `INSERT INTO team_agents (account_id, agent_id, name, auth_kind, token_hash, token_prefix, token_created_at, responsible_wallet, created_by, created_at, updated_at)
         VALUES (?, 'old', 'Old', 'token', ?, 'ab12cd34', '2026-10-18T10:00:00.000Z', ?, ?, '2026-10-18T10:00:00.000Z', '2026-10-18T10:00:00.000Z')`,
      )
      .run(made.account.id, HASH, PABLO, PABLO);
    shim.sqlite.exec(readFileSync(join(MIGRATIONS, names[at] as string), 'utf8'));
    expect(shim.sqlite.prepare('SELECT responsible_house FROM team_agents').get()).toEqual({
      responsible_house: 0,
    });
    expect(() =>
      shim.sqlite.prepare('UPDATE team_agents SET responsible_house = 2').run(),
    ).toThrow();
    for (const name of names.slice(at + 1)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
  });
});
