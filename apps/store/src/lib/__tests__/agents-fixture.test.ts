/**
 * «IAs de organización» in the fixture desk (lib/agents-fixture.ts), told by a
 * stub what an organization is: the same rules as the till's
 * (apps/till/test/agents.test.ts), with the words the till writes.
 */

import {
  DEFAULT_AGENT_PRESENCE,
  accessOf,
  rolesFromTemplate,
  type ActorAccess,
  type OrganizationState,
} from '@numinia/domain';
import { describe, expect, it } from 'vitest';
import {
  AGENT_PROBLEMS as TILL_PROBLEMS,
  MAX_AGENTS as TILL_MAX,
  PRESENCE_PROBLEMS as TILL_PRESENCE_PROBLEMS,
} from '../../../../till/src/lib/agents';
import type { DeskAgentsAnswer, DeskLogAct, DeskRefusal } from '../accounts';
import { AGENT_PROBLEMS, PRESENCE_PROBLEMS } from '../agents';
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

function stage(
  people: Record<string, ActorAccess | null> = {},
  placed: readonly string[] = ['torre', 'agora-plaza'],
): Stage {
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
    placedIn: (accountId) => (accountId === ORG ? placed : []),
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
    expect(PRESENCE_PROBLEMS).toEqual(TILL_PRESENCE_PROBLEMS);
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
        hears: false,
        presence: DEFAULT_AGENT_PRESENCE,
        worlds: { todos: true },
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

  it('lives where the draft says; unsaid, in the one world of a community that has just one, else in all', async () => {
    const lives = async (s: Stage, extra: Record<string, unknown>, id = 'hermes-1') =>
      view(await s.desk.createAgent(OWNER, ORG, { ...BOT, ...extra } as never)).agents.find(
        (held) => held.id === id,
      )?.worlds;
    expect(await lives(stage(), {})).toEqual({ todos: true });
    expect(await lives(stage({}, ['torre']), {})).toEqual({ mundos: ['torre'] });
    expect(await lives(stage({}, []), {})).toEqual({ todos: true });
    expect(await lives(stage(), { worlds: { todos: true } })).toEqual({ todos: true });
    expect(await lives(stage(), { worlds: { mundos: ['torre', 'agora-plaza'] } })).toEqual({
      mundos: ['agora-plaza', 'torre'],
    });
    expect(await lives(stage({}, ['torre']), { worlds: { todos: true } })).toEqual({
      todos: true,
    });
  });

  it('refuses a place to live that is out of shape or not in the community, making nothing', async () => {
    const s = stage();
    expect(
      problems(await s.desk.createAgent(OWNER, ORG, { ...BOT, worlds: { mundos: [] } } as never))
        .length,
    ).toBeGreaterThan(0);
    expect(
      problems(await s.desk.createAgent(OWNER, ORG, { ...BOT, worlds: 'todos' } as never))[0],
    ).toMatch(/^worlds: /);
    expect(
      problems(
        await s.desk.createAgent(OWNER, ORG, { ...BOT, worlds: { mundos: ['ghost'] } } as never),
      ),
    ).toEqual([PRESENCE_PROBLEMS.worldsNotHere]);
    expect(view(await s.desk.agents(OWNER, ORG)).agents).toEqual([]);
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

  it('refuses a stranger, a member without manage-roles, a repeat, and a role that is not there', async () => {
    const s = stage();
    expect(problems(await s.desk.createAgent(wallet('ee'), ORG, BOT))).toEqual(['not a member']);
    expect(problems(await s.desk.createAgent(PLAIN, ORG, BOT))).toEqual([
      refusalSentence('missing-permission', 'manage-roles'),
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
    // The house holds every permission where it may enter (D-078): it may connect an AI.
    expect(house).toMatchObject({ as: 'house', mayCreate: true });
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

  it('flips whether an AI hears nearby chat: off by default, a log line for each change, none when nothing changes', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    s.log.length = 0;
    expect(view(await s.desk.agents(OWNER, ORG)).agents[0]?.hears).toBe(false);
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { hears: false });
    expect(s.log).toEqual([]);
    const on = view(await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { hears: true }));
    expect(on.agents[0]?.hears).toBe(true);
    await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { hears: false });
    expect(s.log.map((line) => [line.act, line.detail])).toEqual([
      ['agent-state', { name: 'Hermes', hears: 'on' }],
      ['agent-state', { name: 'Hermes', hears: 'off' }],
    ]);
    expect(
      problems(await s.desk.changeAgent(OWNER, ORG, 'hermes-1', { hears: 'yes' } as never)),
    ).toEqual([AGENT_PROBLEMS.hears]);
    const made = view(await stage().desk.createAgent(OWNER, ORG, { ...BOT, hears: true }));
    expect(made.agents[0]?.hears).toBe(true);
    expect(
      problems(
        await s.desk.createAgent(OWNER, ORG, { ...BOT, id: 'other', hears: 'yes' } as never),
      ),
    ).toEqual([AGENT_PROBLEMS.hears]);
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

  it('says where an AI lives: all, or chosen worlds placed in the community; a log line for each change', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    s.log.length = 0;
    const live = async (worlds: unknown, who = OWNER) =>
      s.desk.setAgentWorlds(who, ORG, 'hermes-1', worlds as never);
    const first = view(await s.desk.agents(OWNER, ORG)).agents[0];
    expect(first?.worlds).toEqual({ todos: true });
    await live({ todos: true });
    expect(s.log).toEqual([]);
    const chosen = view(await live({ mundos: ['torre', 'agora-plaza'] })).agents[0];
    expect(chosen?.worlds).toEqual({ mundos: ['agora-plaza', 'torre'] });
    expect(problems(await live({ mundos: ['torre', 'torre'] })).length).toBe(1);
    await live({ mundos: ['agora-plaza', 'torre'] });
    expect(s.log.map((line) => [line.act, line.detail])).toEqual([
      ['agent-state', { name: 'Hermes', worlds: 'agora-plaza,torre' }],
    ]);
    expect(view(await live({ todos: true })).agents[0]?.worlds).toEqual({ todos: true });
    expect(problems(await live({ mundos: ['nowhere'] }))).toEqual([
      PRESENCE_PROBLEMS.worldsNotHere,
    ]);
    expect(problems(await live({ mundos: [] })).length).toBe(1);
    expect(problems(await live('all')).length).toBe(1);
    expect(problems(await s.desk.setAgentWorlds(OWNER, ORG, 'ghost', { todos: true }))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.setAgentWorlds(OWNER, ORG, 7 as never, { todos: true }))).toEqual([
      AGENT_PROBLEMS.agentId,
    ]);
    expect(problems(await live({ todos: true }, PLAIN))).toEqual([
      refusalSentence('missing-permission', 'manage-roles'),
    ]);
    expect((await s.desk.setAgentWorlds(HOUSE, ORG, 'hermes-1', { todos: true }, true)).ok).toBe(
      true,
    );
  });

  it('says how an AI is present: any part of any group, one log line, and the last rung is the hears switch', async () => {
    const s = stage();
    await s.desk.createAgent(OWNER, ORG, BOT);
    s.log.length = 0;
    const set = async (change: unknown, who = OWNER) =>
      s.desk.changeAgentPresence(who, ORG, 'hermes-1', change as never);
    const now = async () => view(await s.desk.agents(OWNER, ORG)).agents[0];
    expect((await now())?.presence).toEqual(DEFAULT_AGENT_PRESENCE);

    // a part of a group moves; the rest stays; one line for what moved
    const moved = view(await set({ burbuja: { forma: 'cilindro', radio: 9 }, quedarse_h: 4 }));
    expect(moved.agents[0]?.presence).toEqual({
      ...DEFAULT_AGENT_PRESENCE,
      burbuja: { ...DEFAULT_AGENT_PRESENCE.burbuja, forma: 'cilindro', radio: 9 },
      quedarse_h: 4,
    });
    expect(s.log.map((line) => [line.act, line.detail])).toEqual([
      [
        'agent-state',
        { name: 'Hermes', presence: 'burbuja.forma=cilindro;burbuja.radio=9;quedarse_h=4' },
      ],
    ]);

    // the phrase: set, then cleared with null
    await set({ llamada: { frase: 'ven' } });
    expect((await now())?.presence?.llamada.frase).toBe('ven');
    await set({ llamada: { frase: null } });
    expect((await now())?.presence?.llamada).not.toHaveProperty('frase');

    // nothing moved: no line, no change
    s.log.length = 0;
    await set({ burbuja: { radio: 9 } });
    expect(s.log).toEqual([]);

    // «todo» is the hears switch's: both move together, and both are logged
    await set({ oye: 'todo' });
    expect(view(await s.desk.agents(OWNER, ORG)).agents[0]).toMatchObject({
      hears: true,
      presence: { oye: 'todo' },
    });
    expect(s.log.map((line) => line.detail)).toEqual([
      { name: 'Hermes', presence: 'oye=todo' },
      { name: 'Hermes', hears: 'on' },
    ]);
    await set({ oye: 'burbuja' });
    expect(view(await s.desk.agents(OWNER, ORG)).agents[0]).toMatchObject({
      hears: false,
      presence: { oye: 'burbuja' },
    });
    // a rung that is not the last, moved while it hears nothing, leaves the switch alone
    s.log.length = 0;
    await set({ oye: 'llamada' });
    expect(s.log.map((line) => line.detail)).toEqual([{ name: 'Hermes', presence: 'oye=llamada' }]);

    // what is not valid is refused in the domain’s words, nothing written
    s.log.length = 0;
    expect(problems(await set({})).length).toBe(1);
    expect(problems(await set({ burbuja: { radio: 99 } })).length).toBe(1);
    expect(problems(await set('todo')).length).toBe(1);
    expect(s.log).toEqual([]);
    expect(
      problems(await s.desk.changeAgentPresence(OWNER, ORG, 'ghost', { oye: 'llamada' })),
    ).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(
      problems(await s.desk.changeAgentPresence(OWNER, ORG, 7 as never, { oye: 'llamada' })),
    ).toEqual([AGENT_PROBLEMS.agentId]);
    expect(problems(await set({ oye: 'llamada' }, PLAIN))).toEqual([
      refusalSentence('missing-permission', 'manage-roles'),
    ]);
    expect(
      (await s.desk.changeAgentPresence(HOUSE, ORG, 'hermes-1', { quedarse_h: 1 }, true)).ok,
    ).toBe(true);
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
      worlds: { todos: true },
      presence: DEFAULT_AGENT_PRESENCE,
    });
    // The same presence rides on the pass, with its switch: hearing everything nearby is the last rung.
    await s.desk.changeAgent(OWNER, ORG, 'tok', { hears: true });
    expect(await s.desk.agentWorlds(ORG, 'tok')).toMatchObject({ presence: { oye: 'todo' } });
    expect(await s.desk.agentPass(ORG, 'tok')).toMatchObject({
      agent: { worlds: { todos: true }, presence: { oye: 'todo' } },
    });
    // Where it lives narrows the worlds it sees and its pass says so.
    await s.desk.setAgentWorlds(OWNER, ORG, 'tok', { mundos: ['torre'] });
    expect(await s.desk.agentWorlds(ORG, 'tok')).toMatchObject({
      worldIds: ['torre'],
      worlds: { mundos: ['torre'] },
    });
    expect(await s.desk.agentPass(ORG, 'tok')).toMatchObject({
      agent: { worlds: { mundos: ['torre'] } },
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

describe('the house connects an AI (D-078)', () => {
  const FLAT = {
    id: 'claude-casa',
    name: 'Claude casa',
    auth: 'token' as const,
    tokenHash: 'a'.repeat(64),
    tokenPrefix: 'ab12cd34',
    via: 'mcp:claude.ai',
  };

  it('answers for it as the house, marked on the row and the log, with the name it published', async () => {
    const s = stage();
    s.names.set(HOUSE, 'Ursa');
    const made = view(
      await s.desk.createAgent(HOUSE, ORG, { ...FLAT, roleIds: [MEMBER] } as never, true),
    );
    expect(made.as).toBe('house');
    expect(made.agents[0]).toMatchObject({
      responsible: HOUSE,
      responsibleHouse: true,
      responsibleName: 'Ursa',
      status: 'activa',
      mayEdit: true,
    });
    expect(s.log.map((line) => line.act)).toEqual(['agent-created', 'agent-token-created']);
    // A member-made AI carries no such mark.
    const mine = view(await s.desk.createAgent(OWNER, ORG, BOT));
    expect(mine.agents.find((agent) => agent.id === 'hermes-1')).not.toHaveProperty(
      'responsibleHouse',
    );
  });

  it('keeps the ceiling: no role that holds Administrator or Manage roles', async () => {
    const s = stage();
    const offered = view(await s.desk.agents(HOUSE, ORG, true)).assignableRoles.map(
      (role) => role.id,
    );
    expect(offered).toContain(MEMBER);
    expect(offered).not.toContain(ADMIN);
    expect(
      problems(await s.desk.createAgent(HOUSE, ORG, { ...FLAT, roleIds: [ADMIN] } as never, true)),
    ).toEqual([AGENT_PROBLEMS.houseCeiling]);
    await s.desk.createAgent(HOUSE, ORG, FLAT as never, true);
    expect(problems(await s.desk.giveAgentRole(HOUSE, ORG, 'claude-casa', ADMIN, true))).toEqual([
      AGENT_PROBLEMS.houseCeiling,
    ]);
    // A role the AI holds above the ceiling (the owner gave it) can still be taken by the house.
    await s.desk.giveAgentRole(OWNER, ORG, 'claude-casa', ADMIN);
    const seen = view(await s.desk.agents(HOUSE, ORG, true)).agents[0];
    expect(seen?.assignable).toContain(ADMIN);
    expect(
      view(await s.desk.takeAgentRole(HOUSE, ORG, 'claude-casa', ADMIN, true)).agents[0]?.roleIds,
    ).toEqual([]);
  });

  it('is eligible for a pass while the house answers, and handled by the owner like any other', async () => {
    const s = stage();
    await s.desk.createAgent(HOUSE, ORG, { ...FLAT, roleIds: [MEMBER] } as never, true);
    const pass = await s.desk.agentPass(ORG, 'claude-casa');
    expect(pass).toMatchObject({ ok: true, eligible: true });
    // The owner sees it, switches it off, and removes it.
    expect(view(await s.desk.agents(OWNER, ORG)).agents[0]).toMatchObject({ mayEdit: true });
    await s.desk.changeAgent(OWNER, ORG, 'claude-casa', { enabled: false });
    expect(view(await s.desk.removeAgent(OWNER, ORG, 'claude-casa')).agents).toEqual([]);
  });

  it('is not handled by wallet when an Oracle acts as a member of the community', async () => {
    const s = stage({ [HOUSE]: access([MEMBER]) });
    await s.desk.createAgent(HOUSE, ORG, FLAT as never, true);
    // As a plain member (no house flag) the Oracle holds no manage-roles: no shortcut by wallet.
    expect(
      problems(await s.desk.changeAgent(HOUSE, ORG, 'claude-casa', { enabled: false }))[0],
    ).toMatch(/missing-permission/);
  });
});
