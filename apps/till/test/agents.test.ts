/**
 * «IAs de organización» (2026-10-17): the pure rules, migration 0011 on the D1
 * shim, and the account desk's agent methods as numinia.com's binding calls
 * them. One describe per rule or per door.
 */

import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { ROLE_PROBLEMS } from '../src/lib/roles';
import {
  AGENT_PROBLEMS,
  AGENT_STATES,
  MAX_AGENTS,
  readAgentChange,
  readAgentDraft,
  readAgentId,
  readAgentName,
  readMoment,
  readPublicKey,
  readState,
  readWorldAudience,
} from '../src/lib/agents';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const keyOf = (fill: number): string => `ed25519:${b64url(new Uint8Array(32).fill(fill))}`;

function scene() {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}
type Scene = ReturnType<typeof scene>;

/** PABLO owns «Numen»; MARIA is a plain member; a «Steward» role holds manage-roles. */
async function team(s: Scene) {
  const made = await s.desk.createTeam(PABLO, 'Numen');
  if (!made.ok) throw new Error(made.problems.join());
  const id = made.account.id;
  await s.desk.setMember(PABLO, id, MARIA, 'member');
  const roles = await s.desk.roles(PABLO, id);
  if (!roles.ok) throw new Error(roles.problems.join());
  const byName = (name: string): string => roles.roles.find((r) => r.name === name)?.id as string;
  const steward = await s.desk.createRole(PABLO, id, {
    name: 'Steward',
    color: null,
    hoist: false,
    permissions: ['manage-roles', 'enter-worlds', 'build-in-worlds'],
  });
  if (!steward.ok) throw new Error(steward.problems.join());
  const stewardId = steward.roles.find((r) => r.name === 'Steward')?.id as string;
  return { id, member: byName('Member'), base: byName('@everyone'), steward: stewardId };
}

const viewOf = (answer: Awaited<ReturnType<AccountDesk['agents']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};
const problems = (answer: {
  readonly ok: boolean;
  readonly problems?: readonly string[];
}): string[] => (answer.ok ? [] : [...(answer.problems as readonly string[])]);

const acts = (s: Scene, id: string): string[] =>
  s.sqlite
    .prepare('SELECT act FROM team_log WHERE account_id = ? ORDER BY seq')
    .all(id)
    .map((row) => String(row['act']));

const BOT = { id: 'hermes-1', name: 'Hermes', publicKey: keyOf(7) };

describe('the rules of the agents', () => {
  it('reads an id: a slug of 1 to 32 characters', () => {
    expect(readAgentId('a')).toBe('a');
    expect(readAgentId('hermes-1')).toBe('hermes-1');
    expect(readAgentId('a'.repeat(32))).toBe('a'.repeat(32));
    for (const value of ['', '-a', 'a-', 'A', 'a b', 'a'.repeat(33), 'a:b', 7, null]) {
      expect(readAgentId(value)).toBeUndefined();
    }
  });

  it('reads a name: trimmed, 1 to 40 characters, no control character', () => {
    expect(readAgentName('  Hermes ')).toBe('Hermes');
    expect(readAgentName('x'.repeat(40))).toBe('x'.repeat(40));
    for (const value of ['', '   ', 'x'.repeat(41), 'a\nb', 4]) {
      expect(readAgentName(value)).toBeUndefined();
    }
  });

  it('reads a public key: ed25519: and 43 canonical base64url characters', () => {
    expect(readPublicKey(keyOf(7))).toBe(keyOf(7));
    const high = keyOf(255);
    expect(readPublicKey(high)).toBe(high);
    // The last character's spare bits must be zero: 'B' is not what 32 bytes encode to.
    expect(readPublicKey(`${keyOf(0).slice(0, -1)}B`)).toBeUndefined();
    for (const value of [
      'ed25519:abc',
      keyOf(1).slice(1),
      `ed25519:${'*'.repeat(43)}`,
      `${keyOf(1)}A`,
      5,
    ]) {
      expect(readPublicKey(value)).toBeUndefined();
    }
  });

  it('reads a state, a world, a moment', () => {
    expect(AGENT_STATES).toEqual(['activa', 'dormida']);
    expect(readState('dormida')).toBe('dormida');
    expect(readState('ocupada')).toBeUndefined();
    expect(readWorldAudience('agora-plaza')).toBe('agora-plaza');
    for (const value of ['Agora', 'a'.repeat(65), '', 3])
      expect(readWorldAudience(value)).toBeUndefined();
    expect(readMoment(0)).toBe(0);
    expect(readMoment(1_800_000_000)).toBe(1_800_000_000);
    for (const value of [-1, 1.5, '3', Number.NaN]) expect(readMoment(value)).toBeUndefined();
  });

  it('reads a draft: exactly id, name, publicKey and roleIds, each valid', () => {
    expect(readAgentDraft(BOT)).toEqual({ ...BOT, roleIds: [] });
    expect(
      readAgentDraft({
        ...BOT,
        name: ' Hermes ',
        roleIds: ['role_0123456789abcdef', 'role_0123456789abcdef'],
      }),
    ).toEqual({
      ...BOT,
      roleIds: ['role_0123456789abcdef'],
    });
    for (const value of [null, 'x', [], { ...BOT, extra: 1 }]) {
      expect(readAgentDraft(value)).toEqual([AGENT_PROBLEMS.draft]);
    }
    expect(readAgentDraft({})).toEqual([
      AGENT_PROBLEMS.agentId,
      AGENT_PROBLEMS.name,
      AGENT_PROBLEMS.publicKey,
    ]);
    expect(readAgentDraft({ ...BOT, roleIds: 'x' })).toEqual([AGENT_PROBLEMS.roleIds]);
    expect(readAgentDraft({ ...BOT, roleIds: ['nope'] })).toEqual([AGENT_PROBLEMS.roleIds]);
    expect(
      readAgentDraft({
        ...BOT,
        roleIds: Array.from({ length: 11 }, () => 'role_0123456789abcdef'),
      }),
    ).toEqual([AGENT_PROBLEMS.roleIds]);
  });

  it('reads a change: enabled and/or state, at least one, each valid', () => {
    expect(readAgentChange({ enabled: false })).toEqual({ enabled: false });
    expect(readAgentChange({ state: 'dormida' })).toEqual({ state: 'dormida' });
    expect(readAgentChange({ enabled: true, state: 'activa' })).toEqual({
      enabled: true,
      state: 'activa',
    });
    for (const value of [null, 'x', [], {}, { other: 1 }, { enabled: true, other: 1 }]) {
      expect(readAgentChange(value)).toEqual([AGENT_PROBLEMS.change]);
    }
    expect(readAgentChange({ enabled: 'yes', state: 'x' })).toEqual([
      AGENT_PROBLEMS.enabled,
      AGENT_PROBLEMS.state,
    ]);
  });
});

describe('migration 0011', () => {
  it('keeps the log append-only and knows the new acts', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    expect(acts(s, id)).toContain('agent-created');
    expect(() => s.sqlite.prepare('DELETE FROM team_log').run()).toThrow(/log is kept/);
    expect(() => s.sqlite.prepare("UPDATE team_log SET act = 'house-read'").run()).toThrow(
      /log is kept/,
    );
  });

  it('holds only well-formed agents, and never gives the base role', async () => {
    const s = scene();
    const { id, base } = await team(s);
    const insert = (agent: string, key: string, state = 'activa', enabled = 1) =>
      s.sqlite
        .prepare(
          `INSERT INTO team_agents (account_id, agent_id, name, public_key, responsible_wallet, enabled, state, created_by, created_at, updated_at)
           VALUES (?, ?, 'X', ?, ?, ?, ?, ?, '2026-10-17T10:00:00.000Z', '2026-10-17T10:00:00.000Z')`,
        )
        .run(id, agent, key, PABLO, enabled, state, PABLO);
    expect(() => insert('a', keyOf(1))).not.toThrow();
    expect(() => insert('Bad', keyOf(2))).toThrow();
    expect(() => insert('-bad', keyOf(2))).toThrow();
    expect(() => insert('b', 'ed25519:short')).toThrow();
    expect(() => insert('b', keyOf(2), 'ocupada')).toThrow();
    expect(() => insert('b', keyOf(2), 'activa', 2)).toThrow();
    expect(() => insert('b', keyOf(1))).toThrow();
    expect(() =>
      s.sqlite
        .prepare('INSERT INTO team_agent_roles (account_id, agent_id, role_id) VALUES (?, ?, ?)')
        .run(id, 'a', base),
    ).toThrow(/base role/);
  });
});

describe('creating an agent', () => {
  it('makes the creator its responsible person and writes the log', async () => {
    const s = scene();
    const { id, member } = await team(s);
    const made = viewOf(await s.desk.createAgent(PABLO, id, { ...BOT, roleIds: [member] }));
    expect(made.agents).toHaveLength(1);
    const [agent] = made.agents;
    expect(agent).toMatchObject({
      id: 'hermes-1',
      name: 'Hermes',
      publicKey: BOT.publicKey,
      enabled: true,
      state: 'activa',
      status: 'activa',
      responsible: PABLO,
      roleIds: [member],
      mayEdit: true,
    });
    expect(made.as).toBe('owner');
    expect(made.mayCreate).toBe(true);
    expect(
      s.sqlite
        .prepare('SELECT act, subject, detail FROM team_log WHERE act = ?')
        .get('agent-created'),
    ).toMatchObject({
      subject: 'hermes-1',
      detail: JSON.stringify({ name: 'Hermes', roles: member }),
    });
  });

  it('refuses a draft out of shape, a repeat, a stranger, a member without manage-roles and the house', async () => {
    const s = scene();
    const { id } = await team(s);
    expect(problems(await s.desk.createAgent(PABLO, id, { nope: 1 }))).toEqual([
      AGENT_PROBLEMS.draft,
    ]);
    expect(problems(await s.desk.createAgent('x', id, BOT))).toContain(PROBLEMS.wallet);
    expect(problems(await s.desk.createAgent(STRANGER, id, BOT))).toEqual([PROBLEMS.notMember]);
    expect(problems(await s.desk.createAgent(MARIA, id, BOT))[0]).toMatch(/manage-roles/);
    expect(problems(await s.desk.createAgent(HOUSE, id, BOT, true))).toEqual([
      AGENT_PROBLEMS.houseCannot,
    ]);
    await s.desk.createAgent(PABLO, id, BOT);
    expect(problems(await s.desk.createAgent(PABLO, id, BOT))).toEqual([AGENT_PROBLEMS.taken]);
    expect(problems(await s.desk.createAgent(PABLO, id, { ...BOT, id: 'other' }))).toEqual([
      AGENT_PROBLEMS.taken,
    ]);
    expect(
      problems(
        await s.desk.createAgent(PABLO, id, {
          ...BOT,
          id: 'other',
          publicKey: keyOf(9),
          roleIds: ['role_ffffffffffffffff'],
        }),
      ),
    ).toEqual([ROLE_PROBLEMS.noSuchRole]);
    // Nothing of the refused ones was written.
    expect(acts(s, id).filter((act) => act === 'agent-created')).toHaveLength(1);
  });

  it('gives at creation only roles below the creator’s own', async () => {
    const s = scene();
    const { id, member, base, steward } = await team(s);
    await s.desk.giveRole(PABLO, id, MARIA, steward);
    const draft = { id: 'maria-bot', name: 'Maria bot', publicKey: keyOf(3) };
    // MARIA's own highest is Steward: she may not hand out Steward, nor the base role.
    expect(problems(await s.desk.createAgent(MARIA, id, { ...draft, roleIds: [steward] }))).toEqual(
      [ORG_PROBLEMS.notBelow],
    );
    expect(problems(await s.desk.createAgent(MARIA, id, { ...draft, roleIds: [base] }))[0]).toMatch(
      /base role/,
    );
    const ok = viewOf(await s.desk.createAgent(MARIA, id, { ...draft, roleIds: [member] }));
    expect(ok.agents[0]?.responsible).toBe(MARIA);
    expect(ok.assignableRoles.map((r) => r.name)).toContain('Member');
    expect(ok.assignableRoles.map((r) => r.name)).not.toContain('Steward');
  });

  it('keeps at most MAX_AGENTS', async () => {
    const s = scene();
    const { id } = await team(s);
    for (let n = 0; n < MAX_AGENTS; n += 1) {
      const key = b64url(new Uint8Array(32).fill(n + 1));
      expect(
        (
          await s.desk.createAgent(PABLO, id, {
            id: `bot-${n}`,
            name: `Bot ${n}`,
            publicKey: `ed25519:${key}`,
          })
        ).ok,
      ).toBe(true);
    }
    expect(
      problems(
        await s.desk.createAgent(PABLO, id, { id: 'one-more', name: 'Z', publicKey: keyOf(200) }),
      ),
    ).toEqual([AGENT_PROBLEMS.limit]);
    expect(viewOf(await s.desk.agents(PABLO, id)).mayCreate).toBe(false);
  });
});

describe('listing', () => {
  it('shows the agents to any member, not to a stranger; the house is logged reading', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    const seen = viewOf(await s.desk.agents(MARIA, id));
    expect(seen.agents[0]).toMatchObject({ mayEdit: false, assignable: [] });
    expect(seen.mayCreate).toBe(false);
    expect(seen.assignableRoles).toEqual([]);
    expect(problems(await s.desk.agents(STRANGER, id))).toEqual([PROBLEMS.notMember]);
    expect(problems(await s.desk.agents(PABLO, 'no such!'))).toContain(PROBLEMS.accountId);
    const before = acts(s, id).length;
    const house = viewOf(await s.desk.agents(HOUSE, id, true));
    expect(house.as).toBe('house');
    expect(house.mayCreate).toBe(false);
    expect(acts(s, id).slice(before)).toEqual(['house-read']);
  });

  it('adds the name the responsible person published', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    expect(viewOf(await s.desk.agents(PABLO, id)).agents[0]).not.toHaveProperty('responsibleName');
    await s.desk.setProfile(PABLO, { name: 'Pablo', avatar: null });
    expect(viewOf(await s.desk.agents(PABLO, id)).agents[0]?.responsibleName).toBe('Pablo');
  });
});

describe('switching, sleeping and removing', () => {
  it('turns an agent off and on, and every change is a line of the log', async () => {
    const s = scene();
    const { id, member } = await team(s);
    await s.desk.createAgent(PABLO, id, { ...BOT, roleIds: [member] });
    const off = viewOf(await s.desk.changeAgent(PABLO, id, 'hermes-1', { enabled: false }));
    expect(off.agents[0]).toMatchObject({ enabled: false, status: 'apagada' });
    const on = viewOf(await s.desk.changeAgent(PABLO, id, 'hermes-1', { enabled: true }));
    expect(on.agents[0]).toMatchObject({ enabled: true, status: 'activa' });
    const asleep = viewOf(await s.desk.changeAgent(PABLO, id, 'hermes-1', { state: 'dormida' }));
    expect(asleep.agents[0]).toMatchObject({ state: 'dormida', status: 'dormida' });
    expect(acts(s, id).filter((a) => a.startsWith('agent-'))).toEqual([
      'agent-created',
      'agent-disabled',
      'agent-enabled',
      'agent-state',
    ]);
    expect(
      s.sqlite.prepare("SELECT detail FROM team_log WHERE act = 'agent-state'").get(),
    ).toMatchObject({ detail: JSON.stringify({ name: 'Hermes', from: 'activa', to: 'dormida' }) });
  });

  it('changes the switch and the state together as two lines, and nothing when nothing changes', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    const before = acts(s, id).length;
    await s.desk.changeAgent(PABLO, id, 'hermes-1', { enabled: true, state: 'activa' });
    expect(acts(s, id)).toHaveLength(before);
    await s.desk.changeAgent(PABLO, id, 'hermes-1', { enabled: false, state: 'dormida' });
    expect(acts(s, id).slice(before)).toEqual(['agent-disabled', 'agent-state']);
  });

  it('refuses a change out of shape, an unknown agent, a stranger and a member without manage-roles', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    expect(problems(await s.desk.changeAgent(PABLO, id, 'hermes-1', {}))).toEqual([
      AGENT_PROBLEMS.change,
    ]);
    expect(problems(await s.desk.changeAgent(PABLO, id, 'Hermes!', { enabled: false }))).toEqual([
      AGENT_PROBLEMS.agentId,
    ]);
    expect(problems(await s.desk.changeAgent(PABLO, id, 'ghost', { enabled: false }))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(
      problems(await s.desk.changeAgent(STRANGER, id, 'hermes-1', { enabled: false })),
    ).toEqual([PROBLEMS.notMember]);
    expect(
      problems(await s.desk.changeAgent(MARIA, id, 'hermes-1', { enabled: false }))[0],
    ).toMatch(/manage-roles/);
  });

  it('lets a manager handle only agents below them, unless they answer for it; the house is marked', async () => {
    const s = scene();
    const { id, member, steward } = await team(s);
    await s.desk.giveRole(PABLO, id, MARIA, steward);
    // PABLO's agent holds Steward: as high as MARIA, so she may not handle it.
    await s.desk.createAgent(PABLO, id, { ...BOT, roleIds: [steward] });
    expect(problems(await s.desk.changeAgent(MARIA, id, 'hermes-1', { enabled: false }))).toEqual([
      ORG_PROBLEMS.notBelow,
    ]);
    expect(problems(await s.desk.removeAgent(MARIA, id, 'hermes-1'))).toEqual([
      ORG_PROBLEMS.notBelow,
    ]);
    // PABLO's other agent is only a Member: below MARIA.
    await s.desk.createAgent(PABLO, id, {
      id: 'small',
      name: 'Small',
      publicKey: keyOf(4),
      roleIds: [member],
    });
    const down = viewOf(await s.desk.changeAgent(MARIA, id, 'small', { state: 'dormida' }));
    expect(down.agents.find((a) => a.id === 'small')).toMatchObject({
      state: 'dormida',
      mayEdit: true,
    });
    expect(down.agents.find((a) => a.id === 'hermes-1')?.mayEdit).toBe(false);
    // The one who answers for an agent handles it whatever it holds.
    await s.desk.createAgent(MARIA, id, {
      id: 'hers',
      name: 'Hers',
      publicKey: keyOf(5),
      roleIds: [member],
    });
    await s.desk.takeRole(PABLO, id, MARIA, steward);
    // The house acts on any agent, and its line carries its mark.
    await s.desk.changeAgent(HOUSE, id, 'small', { enabled: false }, true);
    expect(
      s.sqlite.prepare("SELECT as_house FROM team_log WHERE act = 'agent-disabled'").get(),
    ).toMatchObject({ as_house: 1 });
  });

  it('removes an agent with its roles, and writes the log', async () => {
    const s = scene();
    const { id, member } = await team(s);
    await s.desk.createAgent(PABLO, id, { ...BOT, roleIds: [member] });
    expect(problems(await s.desk.removeAgent(PABLO, id, 'ghost'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    const gone = viewOf(await s.desk.removeAgent(PABLO, id, 'hermes-1'));
    expect(gone.agents).toEqual([]);
    expect(s.sqlite.prepare('SELECT count(*) AS n FROM team_agent_roles').get()).toMatchObject({
      n: 0,
    });
    expect(acts(s, id).at(-1)).toBe('agent-removed');
    // The same id and key can come back.
    expect((await s.desk.createAgent(PABLO, id, BOT)).ok).toBe(true);
  });
});

describe("an agent's roles", () => {
  it('gives and takes a role below one’s own, with a line each; a repeat writes nothing', async () => {
    const s = scene();
    const { id, member, base } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    const given = viewOf(await s.desk.giveAgentRole(PABLO, id, 'hermes-1', member));
    expect(given.agents[0]?.roleIds).toEqual([member]);
    const n = acts(s, id).length;
    await s.desk.giveAgentRole(PABLO, id, 'hermes-1', member);
    expect(acts(s, id)).toHaveLength(n);
    const taken = viewOf(await s.desk.takeAgentRole(PABLO, id, 'hermes-1', member));
    expect(taken.agents[0]?.roleIds).toEqual([]);
    await s.desk.takeAgentRole(PABLO, id, 'hermes-1', member);
    expect(acts(s, id).slice(n)).toEqual(['agent-role-taken']);
    expect(acts(s, id).filter((a) => a === 'agent-role-given')).toHaveLength(1);
    expect(problems(await s.desk.giveAgentRole(PABLO, id, 'hermes-1', base))[0]).toMatch(
      /base role/,
    );
    expect(problems(await s.desk.giveAgentRole(PABLO, id, 'hermes-1', 'nope'))).toEqual([
      ROLE_PROBLEMS.roleId,
    ]);
    expect(
      problems(await s.desk.giveAgentRole(PABLO, id, 'hermes-1', 'role_ffffffffffffffff')),
    ).toEqual([ROLE_PROBLEMS.noSuchRole]);
    expect(problems(await s.desk.giveAgentRole(PABLO, id, 'ghost', member))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.giveAgentRole(MARIA, id, 'hermes-1', member))[0]).toMatch(
      /manage-roles/,
    );
  });

  it('does not let a manager give a role as high as their own', async () => {
    const s = scene();
    const { id, steward } = await team(s);
    await s.desk.giveRole(PABLO, id, MARIA, steward);
    await s.desk.createAgent(MARIA, id, BOT);
    expect(problems(await s.desk.giveAgentRole(MARIA, id, 'hermes-1', steward))).toEqual([
      ORG_PROBLEMS.notBelow,
    ]);
  });
});

describe('what a pass is made of', () => {
  it('answers the key, the switch, the state, the permissions and the roles', async () => {
    const s = scene();
    const { id, member, steward } = await team(s);
    await s.desk.createAgent(PABLO, id, { ...BOT, roleIds: [member, steward] });
    const pass = await s.desk.agentPass(id, 'hermes-1');
    if (!pass.ok) throw new Error(pass.problems.join());
    expect(pass.agent).toEqual({
      id: 'hermes-1',
      name: 'Hermes',
      publicKey: BOT.publicKey,
      enabled: true,
      state: 'activa',
    });
    expect(pass.eligible).toBe(true);
    expect(pass.permissions).toEqual(
      expect.arrayContaining(['enter-worlds', 'build-in-worlds', 'manage-roles']),
    );
    expect(pass.height).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(pass.height)).toBe(true);
    expect(pass.roles.map((r) => r.name)).toEqual(['Steward', 'Member']);
  });

  it('never goes beyond the person who answers for it (ORG-011)', async () => {
    const s = scene();
    const { id, member, steward } = await team(s);
    await s.desk.giveRole(PABLO, id, MARIA, steward);
    // MARIA holds enter + build + manage-roles; the agent holds Member (enter, build, start-stop).
    await s.desk.createAgent(MARIA, id, { ...BOT, roleIds: [member] });
    const pass = await s.desk.agentPass(id, 'hermes-1');
    if (!pass.ok) throw new Error(pass.problems.join());
    expect(pass.permissions).toContain('build-in-worlds');
    expect(pass.permissions).not.toContain('start-stop-worlds');
    // MARIA drops to a member without manage-roles: no longer eligible.
    await s.desk.takeRole(PABLO, id, MARIA, steward);
    const orphan = await s.desk.agentPass(id, 'hermes-1');
    if (!orphan.ok) throw new Error(orphan.problems.join());
    expect(orphan.eligible).toBe(false);
    expect(viewOf(await s.desk.agents(PABLO, id)).agents[0]?.status).toBe('sin-responsable');
  });

  it('is orphaned when the responsible person leaves, and shows no permission to enter without a role', async () => {
    const s = scene();
    const { id, steward } = await team(s);
    await s.desk.giveRole(PABLO, id, MARIA, steward);
    await s.desk.createAgent(MARIA, id, BOT);
    const bare = await s.desk.agentPass(id, 'hermes-1');
    if (!bare.ok) throw new Error(bare.problems.join());
    expect(bare.permissions).not.toContain('enter-worlds');
    expect(viewOf(await s.desk.agents(PABLO, id)).agents[0]?.status).toBe('sin-permiso');
    await s.desk.removeMember(PABLO, id, MARIA);
    const orphan = await s.desk.agentPass(id, 'hermes-1');
    if (!orphan.ok) throw new Error(orphan.problems.join());
    expect(orphan).toMatchObject({ eligible: false, permissions: [], height: 0 });
    expect(viewOf(await s.desk.agents(PABLO, id)).agents[0]?.status).toBe('sin-responsable');
  });

  it('refuses what is not an agent', async () => {
    const s = scene();
    const { id } = await team(s);
    expect(problems(await s.desk.agentPass(id, 'ghost'))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(problems(await s.desk.agentPass('nobody', 'ghost'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.agentPass('no such!', 'Ghost!'))).toEqual([
      PROBLEMS.accountId,
      AGENT_PROBLEMS.agentId,
    ]);
  });
});

describe('claiming a pass request', () => {
  it('lets a signed request be used once, and sweeps the old ones', async () => {
    const s = scene();
    const { id } = await team(s);
    const t = Math.floor(Date.now() / 1000);
    expect(await s.desk.claimAgentPass(id, 'hermes-1', 'agora-plaza', t)).toEqual({ ok: true });
    expect(problems(await s.desk.claimAgentPass(id, 'hermes-1', 'agora-plaza', t))).toEqual([
      AGENT_PROBLEMS.replayed,
    ]);
    // Another world, another second, another agent: each is its own request.
    expect((await s.desk.claimAgentPass(id, 'hermes-1', 'other-world', t)).ok).toBe(true);
    expect((await s.desk.claimAgentPass(id, 'hermes-1', 'agora-plaza', t + 1)).ok).toBe(true);
    expect((await s.desk.claimAgentPass(id, 'hermes-2', 'agora-plaza', t)).ok).toBe(true);
    // A row from long ago is swept by the next claim, and its second can be used again.
    s.sqlite
      .prepare('INSERT INTO team_agent_passes (account_id, agent_id, aud, t) VALUES (?, ?, ?, ?)')
      .run(id, 'old', 'agora-plaza', t - 1000);
    await s.desk.claimAgentPass(id, 'hermes-1', 'agora-plaza', t + 2);
    expect(
      s.sqlite.prepare("SELECT count(*) AS n FROM team_agent_passes WHERE agent_id = 'old'").get(),
    ).toMatchObject({ n: 0 });
  });

  it('refuses arguments out of shape and writes nothing', async () => {
    const s = scene();
    expect(problems(await s.desk.claimAgentPass('no such!', 'Bad!', 'Agora', -1))).toEqual([
      PROBLEMS.accountId,
      AGENT_PROBLEMS.agentId,
      AGENT_PROBLEMS.audience,
      AGENT_PROBLEMS.moment,
    ]);
    expect(s.sqlite.prepare('SELECT count(*) AS n FROM team_agent_passes').get()).toMatchObject({
      n: 0,
    });
  });
});
