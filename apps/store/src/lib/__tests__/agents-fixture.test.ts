/**
 * «IAs de organización» in the fixture desk (lib/agents-fixture.ts), told by a
 * stub what an organization is: the same rules as the till's
 * (apps/till/test/agents.test.ts), with the words the till writes.
 */

import {
  accessOf,
  rolesFromTemplate,
  type ActorAccess,
  type OrganizationState,
} from '@numinia/domain';
import { describe, expect, it } from 'vitest';
import {
  AGENT_PROBLEMS as TILL_PROBLEMS,
  MAX_AGENTS as TILL_MAX,
} from '../../../../till/src/lib/agents';
import type { DeskAgentsAnswer, DeskLogAct, DeskRefusal } from '../accounts';
import { AGENT_PROBLEMS } from '../agents';
import {
  MAX_AGENTS,
  createAgentsFixture,
  type AgentsHost,
  type HostEntry,
} from '../agents-fixture';

const roleId = (index: number): string => `role_${index.toString(16).padStart(16, '0')}`;
const state: OrganizationState = {
  roles: rolesFromTemplate('team', 'en', (index) => roleId(index + 1)),
  houseAccess: 'alpha',
  houseLeaveOpen: false,
};
const byName = (name: string): string =>
  state.roles.find((role) => role.name === name)?.id as string;
const ADMIN = byName('Administration');
const MEMBER = byName('Member');
const BASE = byName('@everyone');

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const OWNER = wallet('a1');
const MANAGER = wallet('b2'); // holds Administration, not an owner
const PLAIN = wallet('c3'); // holds Member
const HOUSE = wallet('99');
const ORG = 'acc_t';

const BOT = { id: 'hermes-1', name: 'Hermes', publicKey: `ed25519:${'A'.repeat(43)}` };
const keyOf = (n: number): string =>
  `ed25519:${btoa(String.fromCharCode(...new Uint8Array(32).fill(n)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;

const refusalSentence = (refusal: string, act: string): string => `${refusal}:${act}`;

interface Stage {
  readonly desk: ReturnType<typeof createAgentsFixture>;
  readonly log: {
    act: DeskLogAct;
    subject: string | null;
    detail: Record<string, string> | null;
  }[];
  readonly reads: string[];
  /** Wallets who answer for agents but are no longer members of the organization. */
  readonly gone: Set<string>;
  readonly held: Record<string, ActorAccess | null>;
  readonly names: Map<string, string>;
  setClock(at: string): void;
}

const access = (roleIds: readonly string[], isOwner = false): ActorAccess =>
  accessOf(state, {
    kind: 'member',
    member: { personId: 'person', kind: 'human', isOwner, roleIds },
  });
const houseAccess = (): ActorAccess => accessOf(state, { kind: 'house', personId: HOUSE });

function stage(people: Record<string, ActorAccess | null> = {}): Stage {
  const held: Record<string, ActorAccess | null> = {
    [OWNER]: access([], true),
    [MANAGER]: access([ADMIN]),
    [PLAIN]: access([MEMBER]),
    ...people,
  };
  const log: Stage['log'] = [];
  const reads: string[] = [];
  const gone = new Set<string>();
  const names = new Map<string, string>();
  let clock = '2026-10-17T10:00:00.000Z';
  const host: AgentsHost = {
    enter: (who, accountId, house): HostEntry | DeskRefusal => {
      if (who === 'bad') return { ok: false, problems: ['bad wallet'] };
      if (accountId !== ORG) return { ok: false, problems: ['not a member'] };
      if (house === true) {
        return { accountId: ORG, who: who as string, as: 'house', state, access: houseAccess() };
      }
      const mine = held[who as string];
      if (mine === undefined || mine === null) return { ok: false, problems: ['not a member'] };
      return {
        accountId: ORG,
        who: who as string,
        as: mine.isOwner ? 'owner' : 'member',
        state,
        access: mine,
      };
    },
    responsible: (accountId, who) =>
      accountId !== ORG ? null : { state, access: gone.has(who) ? null : (held[who] ?? null) },
    record: (_entry, act, subject, detail) => log.push({ act, subject, detail }),
    houseRead: (entry, what) => {
      if (entry.as === 'house') reads.push(what);
    },
    published: (who) => names.get(who),
    placedIn: (accountId) => (accountId === ORG ? ['torre', 'agora-plaza'] : []),
    refusalOf: (refusal, act) => ({ ok: false, problems: [refusalSentence(refusal, act)] }),
  };
  const desk = createAgentsFixture(host, () => new Date(clock));
  return {
    desk,
    log,
    reads,
    gone,
    held,
    names,
    setClock: (at) => {
      clock = at;
    },
  };
}

const view = (answer: DeskAgentsAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};
const problems = (answer: {
  readonly ok: boolean;
  readonly problems?: readonly string[];
}): string[] => (answer.ok ? [] : [...(answer.problems as readonly string[])]);

describe("the fixture's words are the till's", () => {
  it('uses the very sentences and the limit of apps/till', () => {
    expect(AGENT_PROBLEMS).toEqual(TILL_PROBLEMS);
    expect(MAX_AGENTS).toBe(TILL_MAX);
  });
});

describe('creating', () => {
  it('makes the creator responsible, keeps the roles given and writes the log', async () => {
    const s = stage();
    s.names.set(OWNER, 'Pablo');
    const made = view(await s.desk.createAgent(OWNER, ORG, { ...BOT, roleIds: [MEMBER, MEMBER] }));
    expect(made).toMatchObject({ as: 'owner', mayCreate: true });
    expect(made.assignableRoles.map((role) => role.name)).toContain('Member');
    expect(made.agents).toEqual([
      {
        id: 'hermes-1',
        name: 'Hermes',
        auth: 'key',
        publicKey: BOT.publicKey,
        enabled: true,
        state: 'activa',
        status: 'activa',
        responsible: OWNER,
        responsibleName: 'Pablo',
        createdAt: '2026-10-17T10:00:00.000Z',
        updatedAt: '2026-10-17T10:00:00.000Z',
        roleIds: [MEMBER],
        assignable: expect.arrayContaining([MEMBER]),
        mayEdit: true,
        via: 'panel',
      },
    ]);
    expect(s.log).toEqual([
      {
        act: 'agent-created',
        subject: 'hermes-1',
        detail: { name: 'Hermes', roles: MEMBER, via: 'panel' },
      },
    ]);
    // Without roles the line names none, and the responsible person has published no name.
    const plain = stage();
    const second = view(await plain.desk.createAgent(OWNER, ORG, BOT));
    expect(second.agents[0]).not.toHaveProperty('responsibleName');
    expect(plain.log[0]?.detail).toEqual({ name: 'Hermes', via: 'panel' });
  });

  it('reads the draft as the till does, in its words', async () => {
    const s = stage();
    for (const draft of [null, undefined, 'x', {}]) {
      expect(problems(await s.desk.createAgent(OWNER, ORG, draft as never))).toEqual([
        AGENT_PROBLEMS.agentId,
        AGENT_PROBLEMS.name,
        AGENT_PROBLEMS.publicKey,
      ]);
    }
    const bad = (roleIds: unknown) => s.desk.createAgent(OWNER, ORG, { ...BOT, roleIds } as never);
    expect(problems(await bad('x'))).toEqual([AGENT_PROBLEMS.roleIds]);
    expect(problems(await bad(['nope']))).toEqual([AGENT_PROBLEMS.roleIds]);
    expect(problems(await bad(Array.from({ length: 11 }, () => MEMBER)))).toEqual([
      AGENT_PROBLEMS.roleIds,
    ]);
    expect(problems(await s.desk.createAgent('bad', ORG, BOT))).toEqual(['bad wallet']);
  });

  it('refuses a stranger, a member without manage-roles, the house, a repeat, and a role that is not there', async () => {
    const s = stage();
    expect(problems(await s.desk.createAgent(wallet('ee'), ORG, BOT))).toEqual(['not a member']);
    expect(problems(await s.desk.createAgent(PLAIN, ORG, BOT))).toEqual([
      refusalSentence('missing-permission', 'manage-roles'),
    ]);
    expect(problems(await s.desk.createAgent(HOUSE, ORG, BOT, true))).toEqual([
      AGENT_PROBLEMS.houseCannot,
    ]);
    await s.desk.createAgent(OWNER, ORG, BOT);
    expect(problems(await s.desk.createAgent(OWNER, ORG, BOT))).toEqual([AGENT_PROBLEMS.taken]);
    expect(problems(await s.desk.createAgent(OWNER, ORG, { ...BOT, id: 'other' }))).toEqual([
      AGENT_PROBLEMS.taken,
    ]);
    expect(
      problems(
        await s.desk.createAgent(OWNER, ORG, {
          id: 'other',
          name: 'Other',
          publicKey: keyOf(5),
          roleIds: [roleId(99)],
        }),
      ),
    ).toEqual(['the organization has no such role']);
    expect(s.log).toHaveLength(1);
  });

  it('gives at creation only roles below the creator’s highest', async () => {
    const s = stage();
    const draft = { id: 'm-bot', name: 'M bot', publicKey: keyOf(3) };
    expect(
      problems(await s.desk.createAgent(MANAGER, ORG, { ...draft, roleIds: [ADMIN] })),
    ).toEqual([refusalSentence('not-below', 'manage-roles')]);
    expect(problems(await s.desk.createAgent(MANAGER, ORG, { ...draft, roleIds: [BASE] }))).toEqual(
      [refusalSentence('base-role', 'manage-roles')],
    );
    const ok = view(await s.desk.createAgent(MANAGER, ORG, { ...draft, roleIds: [MEMBER] }));
    expect(ok.agents[0]?.responsible).toBe(MANAGER);
    expect(ok.assignableRoles.map((role) => role.name)).not.toContain('Administration');
  });

  it('keeps at most MAX_AGENTS, and then says it cannot make more', async () => {
    const s = stage();
    for (let n = 0; n < MAX_AGENTS; n += 1) {
      expect(
        (
          await s.desk.createAgent(OWNER, ORG, {
            id: `bot-${n}`,
            name: `B${n}`,
            publicKey: keyOf(n + 1),
          })
        ).ok,
      ).toBe(true);
    }
    expect(
      problems(
        await s.desk.createAgent(OWNER, ORG, { id: 'more', name: 'M', publicKey: keyOf(200) }),
      ),
    ).toEqual([AGENT_PROBLEMS.limit]);
    expect(view(await s.desk.agents(OWNER, ORG)).mayCreate).toBe(false);
  });
});

describe('listing and the status of an agent', () => {
  it('shows the agents to a member, the house reads are noted, a stranger is refused', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    const seen = view(await s.desk.agents(PLAIN, ORG));
    expect(seen.mayCreate).toBe(false);
    expect(seen.assignableRoles).toEqual([]);
    expect(seen.agents[0]).toMatchObject({ mayEdit: false, assignable: [] });
    const house = view(await s.desk.agents(HOUSE, ORG, true));
    expect(house).toMatchObject({ as: 'house', mayCreate: false });
    expect(s.reads).toEqual(['agents']);
    expect(problems(await s.desk.agents(wallet('ee'), ORG))).toEqual(['not a member']);
  });

  it('is off, orphaned, without permission to enter, or its state', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, { ...BOT, roleIds: [MEMBER] });
    const status = async () => view(await s.desk.agents(OWNER, ORG)).agents[0]?.status;
    expect(await status()).toBe('activa');
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { state: 'dormida' });
    expect(await status()).toBe('dormida');
    await s.desk.takeAgentRole(OWNER, ORG, 'hermes-1', MEMBER);
    expect(await status()).toBe('sin-permiso');
    await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', MEMBER);
    s.gone.add(OWNER);
    expect(await status()).toBe('sin-responsable');
    s.gone.delete(OWNER);
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { enabled: false });
    expect(await status()).toBe('apagada');
  });
});

describe('switching, sleeping, removing', () => {
  it('writes a line for the switch and another for the state, none for a change that changes nothing', async () => {
    const s = stage();
    s.setClock('2026-10-17T10:00:00.000Z');
    await s.desk.createAgent(OWNER, ORG, BOT);
    s.log.length = 0;
    s.setClock('2026-10-17T10:05:00.000Z');
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { enabled: true, state: 'activa' });
    expect(s.log).toEqual([]);
    const off = view(await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { enabled: false }));
    expect(off.agents[0]).toMatchObject({ enabled: false, updatedAt: '2026-10-17T10:05:00.000Z' });
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { enabled: true, state: 'dormida' });
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { state: 'activa' });
    expect(s.log.map((line) => line.act)).toEqual([
      'agent-disabled',
      'agent-enabled',
      'agent-state',
      'agent-state',
    ]);
    expect(s.log[2]?.detail).toEqual({ name: 'Hermes', from: 'activa', to: 'dormida' });
  });

  it('reads the change as the till does', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    for (const change of [null, undefined, 'x', {}, { other: 1 }, { enabled: true, other: 1 }]) {
      expect(problems(await s.desk.changeAgent(OWNER, ORG, 'hermes-1', change as never))).toEqual([
        AGENT_PROBLEMS.change,
      ]);
    }
    expect(
      problems(
        await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { enabled: 'yes', state: 'x' } as never),
      ),
    ).toEqual([AGENT_PROBLEMS.enabled, AGENT_PROBLEMS.state]);
    expect(problems(await s.desk.changeAgent(OWNER, ORG, 'Bad!', { enabled: false }))).toEqual([
      AGENT_PROBLEMS.agentId,
    ]);
    expect(problems(await s.desk.changeAgent(OWNER, ORG, 'ghost', { enabled: false }))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.changeAgent('bad', ORG, 'hermes-1', { enabled: false }))).toEqual([
      'bad wallet',
    ]);
  });

  it('lets only a manager above the agent, or its responsible person, handle it; the house too', async () => {
    const s = stage();
    expect(problems(await s.desk.changeAgent(PLAIN, ORG, 'x', { enabled: false }))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    await s.desk.createAgent(OWNER, ORG, { ...BOT, roleIds: [ADMIN] });
    await s.desk.createAgent(OWNER, ORG, {
      id: 'small',
      name: 'Small',
      publicKey: keyOf(4),
      roleIds: [MEMBER],
    });
    const lacks = [refusalSentence('missing-permission', 'manage-roles')];
    expect(problems(await s.desk.changeAgent(PLAIN, ORG, 'small', { enabled: false }))).toEqual(
      lacks,
    );
    expect(problems(await s.desk.removeAgent(PLAIN, ORG, 'small'))).toEqual(lacks);
    // The manager (Administration) is as high as the first agent, above the second.
    const notBelow = [refusalSentence('not-below', 'manage-roles')];
    expect(
      problems(await s.desk.changeAgent(MANAGER, ORG, 'hermes-1', { enabled: false })),
    ).toEqual(notBelow);
    expect(problems(await s.desk.removeAgent(MANAGER, ORG, 'hermes-1'))).toEqual(notBelow);
    expect(problems(await s.desk.giveAgentRole(MANAGER, ORG, 'hermes-1', MEMBER))).toEqual(
      notBelow,
    );
    const listed = view(await s.desk.agents(MANAGER, ORG));
    expect(listed.agents.map((a) => [a.id, a.mayEdit])).toEqual([
      ['hermes-1', false],
      ['small', true],
    ]);
    expect((await s.desk.changeAgent(MANAGER, ORG, 'small', { state: 'dormida' })).ok).toBe(true);
    // The house is above everything, and its line says so.
    expect((await s.desk.changeAgent(HOUSE, ORG, 'hermes-1', { enabled: false }, true)).ok).toBe(
      true,
    );
  });

  it('lets the responsible person handle their own agent whatever it holds', async () => {
    const s = stage({ [MANAGER]: access([ADMIN]) });
    const made = view(await s.desk.createAgent(MANAGER, ORG, { ...BOT, roleIds: [MEMBER] }));
    expect(made.agents[0]?.mayEdit).toBe(true);
    // Even once it is as high as they are (an owner gave it Administration).
    await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', ADMIN);
    expect((await s.desk.changeAgent(MANAGER, ORG, 'hermes-1', { enabled: false })).ok).toBe(true);
  });

  it('removes an agent and writes the log; a refused removal leaves it', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    expect(problems(await s.desk.removeAgent(OWNER, ORG, 'ghost'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(view(await s.desk.removeAgent(OWNER, ORG, 'hermes-1')).agents).toEqual([]);
    expect(s.log.at(-1)).toEqual({
      act: 'agent-removed',
      subject: 'hermes-1',
      detail: { name: 'Hermes' },
    });
    expect((await s.desk.createAgent(OWNER, ORG, BOT)).ok).toBe(true);
  });
});

describe("an agent's roles", () => {
  it('gives and takes below one’s highest, a repeat writes nothing', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    s.log.length = 0;
    expect(
      view(await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', MEMBER)).agents[0]?.roleIds,
    ).toEqual([MEMBER]);
    await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', MEMBER);
    expect(
      view(await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', ADMIN)).agents[0]?.roleIds,
    ).toEqual([MEMBER, ADMIN]);
    expect(
      view(await s.desk.takeAgentRole(OWNER, ORG, 'hermes-1', ADMIN)).agents[0]?.roleIds,
    ).toEqual([MEMBER]);
    await s.desk.takeAgentRole(OWNER, ORG, 'hermes-1', ADMIN);
    expect(s.log.map((line) => line.act)).toEqual([
      'agent-role-given',
      'agent-role-given',
      'agent-role-taken',
    ]);
    expect(s.log[0]?.detail).toEqual({ role: MEMBER, name: 'Member' });
  });

  it('refuses the base role, a role out of shape, one that is not there, an agent that is not, a manager without the permission', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    expect(problems(await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', BASE))).toEqual([
      refusalSentence('base-role', 'manage-roles'),
    ]);
    expect(problems(await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', 'nope'))).toEqual([
      'roleId must be a role id',
    ]);
    expect(problems(await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', 7 as never))).toEqual([
      'roleId must be a role id',
    ]);
    expect(problems(await s.desk.giveAgentRole(OWNER, ORG, 'hermes-1', roleId(99)))).toEqual([
      'the organization has no such role',
    ]);
    expect(problems(await s.desk.giveAgentRole(OWNER, ORG, 'ghost', MEMBER))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.giveAgentRole(PLAIN, ORG, 'hermes-1', MEMBER))).toEqual([
      refusalSentence('missing-permission', 'manage-roles'),
    ]);
  });
});

describe('what a pass is made of', () => {
  it('answers the key, the switch, the state, what the agent holds and its roles', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, { ...BOT, roleIds: [MEMBER, ADMIN] });
    const pass = await s.desk.agentPass(ORG, 'hermes-1');
    if (!pass.ok) throw new Error(pass.problems.join());
    expect(pass).toMatchObject({
      accountId: ORG,
      agent: {
        id: 'hermes-1',
        name: 'Hermes',
        auth: 'key',
        publicKey: BOT.publicKey,
        enabled: true,
        state: 'activa',
      },
      eligible: true,
      height: 3,
    });
    expect(pass.permissions).toEqual(expect.arrayContaining(['enter-worlds', 'build-in-worlds']));
    expect(pass.roles.map((role) => role.name)).toEqual(['Administration', 'Member']);
  });

  it('is not eligible when the person who answers for it left or lost manage-roles, and then holds nothing', async () => {
    const s = stage({ [MANAGER]: access([ADMIN]) });
    await s.desk.createAgent(MANAGER, ORG, { ...BOT, roleIds: [MEMBER] });
    s.gone.add(MANAGER);
    expect(await s.desk.agentPass(ORG, 'hermes-1')).toMatchObject({
      ok: true,
      eligible: false,
      permissions: [],
      height: 0,
    });
  });

  it('is not eligible when the person who answers for it no longer holds manage-roles, and the agent is trimmed to them', async () => {
    const s = stage();
    await s.desk.createAgent(MANAGER, ORG, { ...BOT, roleIds: [MEMBER] });
    s.held[MANAGER] = access([MEMBER]);
    expect(await s.desk.agentPass(ORG, 'hermes-1')).toMatchObject({ ok: true, eligible: false });
    expect(view(await s.desk.agents(OWNER, ORG)).agents[0]?.status).toBe('sin-responsable');
  });

  it('refuses what is not an agent', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    expect(problems(await s.desk.agentPass(ORG, 'ghost'))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(problems(await s.desk.agentPass('acc_other', 'hermes-1'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.agentPass('no such!', 'Bad!'))).toEqual([
      'accountId must be an account id',
      AGENT_PROBLEMS.agentId,
    ]);
    expect(problems(await s.desk.agentPass(ORG, 'Bad!'))).toEqual([AGENT_PROBLEMS.agentId]);
    expect(problems(await s.desk.agentPass('no such!', 'ghost'))).toEqual([
      'accountId must be an account id',
    ]);
  });
});

describe('claiming a pass request', () => {
  it('lets a request be used once, and forgets it after two minutes', async () => {
    const s = stage();
    s.setClock('2026-10-17T10:00:00.000Z');
    const t = Math.floor(Date.parse('2026-10-17T10:00:00.000Z') / 1000);
    expect(await s.desk.claimAgentPass(ORG, 'hermes-1', 'agora-plaza', t)).toEqual({ ok: true });
    expect(problems(await s.desk.claimAgentPass(ORG, 'hermes-1', 'agora-plaza', t))).toEqual([
      AGENT_PROBLEMS.replayed,
    ]);
    expect((await s.desk.claimAgentPass(ORG, 'hermes-1', 'other-world', t)).ok).toBe(true);
    expect((await s.desk.claimAgentPass(ORG, 'hermes-1', 'agora-plaza', t + 1)).ok).toBe(true);
    s.setClock('2026-10-17T10:02:30.000Z');
    expect((await s.desk.claimAgentPass(ORG, 'hermes-1', 'agora-plaza', t)).ok).toBe(true);
  });

  it('refuses arguments out of shape', async () => {
    const s = stage();
    const calls: [string, string, string, number][] = [
      ['no such!', 'hermes-1', 'agora-plaza', 1],
      [ORG, 'Bad!', 'agora-plaza', 1],
      [ORG, 'hermes-1', 'Agora', 1],
      [ORG, 'hermes-1', 'agora-plaza', -1],
      [ORG, 'hermes-1', 'agora-plaza', 1.5],
    ];
    for (const args of calls) {
      expect(problems(await s.desk.claimAgentPass(...args))).toEqual([AGENT_PROBLEMS.moment]);
    }
  });
});

describe('by token: who may renew and revoke', () => {
  const TOKEN = { id: 'tok', name: 'Tok', auth: 'token' as const };
  const A = { tokenHash: 'a'.repeat(64), tokenPrefix: 'AAAAAAAA' };
  const B = { tokenHash: 'b'.repeat(64), tokenPrefix: 'BBBBBBBB' };

  it('refuses a stranger, and a member without manage-roles, as for any change', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A });
    for (const who of [wallet('ee'), PLAIN]) {
      expect(
        problems(await s.desk.renewAgentToken(who, ORG, 'tok', B.tokenHash, B.tokenPrefix)),
      ).toHaveLength(1);
      expect(problems(await s.desk.revokeAgentToken(who, ORG, 'tok'))).toHaveLength(1);
    }
    expect(problems(await s.desk.renewAgentToken(OWNER, ORG, 'tok', 'x', B.tokenPrefix))).toEqual([
      AGENT_PROBLEMS.tokenHash,
    ]);
    expect(problems(await s.desk.renewAgentToken(OWNER, ORG, 'tok', B.tokenHash, 'x'))).toEqual([
      AGENT_PROBLEMS.tokenPrefix,
    ]);
    expect(
      problems(await s.desk.renewAgentToken(OWNER, ORG, 'tok', A.tokenHash, A.tokenPrefix)),
    ).toEqual([AGENT_PROBLEMS.taken]);
  });

  it('writes the prefix, never the hash, in the log', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A });
    await s.desk.renewAgentToken(OWNER, ORG, 'tok', B.tokenHash, B.tokenPrefix);
    await s.desk.revokeAgentToken(OWNER, ORG, 'tok');
    expect(s.log.map((line) => line.act)).toEqual([
      'agent-created',
      'agent-token-created',
      'agent-token-renewed',
      'agent-token-revoked',
    ]);
    expect(JSON.stringify(s.log)).not.toContain(A.tokenHash);
    expect(JSON.stringify(s.log)).not.toContain(B.tokenHash);
    expect(s.log[2]?.detail).toEqual({ name: 'Tok', prefix: 'BBBBBBBB', via: 'panel' });
  });
});

describe('«MCP remoto» (W2): the way, the worlds, the token', () => {
  const TOKEN = { id: 'tok', name: 'Tok', auth: 'token' as const };
  const A = { tokenHash: 'a'.repeat(64), tokenPrefix: 'AAAAAAAA' };
  const B = { tokenHash: 'b'.repeat(64), tokenPrefix: 'BBBBBBBB' };

  it('keeps how an AI was connected, on create and on renewal, as detail.via', async () => {
    const s = stage();
    const made = view(
      await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A, via: 'mcp:claude.ai' }),
    );
    expect(made.agents[0]).toMatchObject({ via: 'mcp:claude.ai' });
    expect(s.log.map((line) => line.detail?.['via'])).toEqual(['mcp:claude.ai', 'mcp:claude.ai']);
    const renewed = view(
      await s.desk.renewAgentToken(
        OWNER,
        ORG,
        'tok',
        B.tokenHash,
        B.tokenPrefix,
        false,
        'mcp:chatgpt.com',
      ),
    );
    expect(renewed.agents[0]).toMatchObject({ via: 'mcp:chatgpt.com' });
    expect(s.log.at(-1)).toEqual({
      act: 'agent-token-renewed',
      subject: 'tok',
      detail: { name: 'Tok', prefix: 'BBBBBBBB', via: 'mcp:chatgpt.com' },
    });
    expect(JSON.stringify(s.log)).not.toContain(A.tokenHash);
    expect(JSON.stringify(s.log)).not.toContain(B.tokenHash);
  });

  it('refuses a way out of shape, in the till’s words', async () => {
    const s = stage();
    expect(
      problems(await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A, via: 'claude.ai' })),
    ).toEqual([AGENT_PROBLEMS.via]);
    await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A });
    expect(
      problems(
        await s.desk.renewAgentToken(OWNER, ORG, 'tok', B.tokenHash, B.tokenPrefix, false, 'x'),
      ),
    ).toEqual([AGENT_PROBLEMS.via]);
  });

  it('lists the worlds of an agent’s organization, and refuses an unknown agent', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A });
    expect(await s.desk.agentWorlds(ORG, 'tok')).toEqual({
      ok: true,
      accountId: ORG,
      agentId: 'tok',
      worldIds: ['agora-plaza', 'torre'],
    });
    expect(problems(await s.desk.agentWorlds(ORG, 'ghost'))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(problems(await s.desk.agentWorlds('acc_other', 'tok'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.agentWorlds('no such!', 'Bad!'))).toHaveLength(2);
    expect(problems(await s.desk.agentWorlds(ORG, 'Bad!'))).toEqual([AGENT_PROBLEMS.agentId]);
  });

  it('finds the agent a live token belongs to, and nobody for a revoked, unknown or malformed one', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...A });
    await s.desk.createAgent(OWNER, ORG, { ...TOKEN, ...B, id: 'gone' });
    await s.desk.revokeAgentToken(OWNER, ORG, 'gone');
    expect(await s.desk.agentByToken(A.tokenHash)).toEqual(await s.desk.agentPass(ORG, 'tok'));
    expect(problems(await s.desk.agentByToken(B.tokenHash))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(problems(await s.desk.agentByToken('c'.repeat(64)))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.agentByToken('ntk_x'))).toEqual([AGENT_PROBLEMS.tokenHash]);
  });
});
