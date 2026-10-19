/**
 * «MCP remoto», story W3: the decision behind the «Conecta tu IA» consent
 * (lib/conectar-ia.ts) — create a new organization AI the token way, or renew
 * the token of one already made and switch it on, with the panel's own rules
 * (mayCreate, assignableRoles, mayEdit, assignable) and every refusal named;
 * then the same through the fixture desk, and every way the till can fail.
 */

import { describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import { NOT_IMPLEMENTED, type AccountDesk, type Asker, type DeskAgents } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { MAX_AGENTS, hashToken } from '../agents';
import {
  URL_AIS_HEAR,
  connectAi,
  decideConnection,
  isLoopback,
  reconnectable,
  type ConnectRequest,
  type ConnectView,
  type ViewAgent,
} from '../conectar-ia';

const ORG = 'acc_team_numen_games';
const OTHER = 'acc_team_reset';
const BUILD = `role_${(2).toString(16).padStart(16, '0')}`;
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const ME = `0x${'ab'.repeat(20)}`;
const NOW_MS = Date.parse('2026-10-19T19:00:00.000Z');
const CLAUDE = { name: 'Claude', redirectHost: 'claude.ai' } as const;
const quiet = vi.fn();

const agent = (over: Partial<ViewAgent> = {}): ViewAgent => ({
  id: 'claude-de-ana',
  name: 'Claude de Ana',
  auth: 'token',
  enabled: true,
  roleIds: [],
  assignable: [BUILD],
  mayEdit: true,
  ...over,
});

const view = (over: Partial<ConnectView> = {}): ConnectView => ({
  accountId: ORG,
  as: 'owner',
  mayCreate: true,
  assignableRoles: [{ id: BUILD }],
  agents: [],
  permissions: ['enter-worlds', 'manage-roles'],
  ...over,
});

const request = (over: Partial<ConnectRequest> = {}): ConnectRequest => ({
  accountId: ORG,
  client: CLAUDE,
  ai: { kind: 'new', name: 'Claude de Ana' },
  roleId: null,
  ...over,
});

const again = (agentId = 'claude-de-ana', accountId = ORG): ConnectRequest['ai'] => ({
  kind: 'again',
  accountId,
  agentId,
});

const refusalOf = (plan: ReturnType<typeof decideConnection>): string | null =>
  plan.ok ? null : plan.refusal;

describe('the house switch for hearing', () => {
  it('keeps `oir` off for AIs connected by URL until the lawyers validate it', () => {
    expect(URL_AIS_HEAR).toBe(false);
    const created = decideConnection(view(), request());
    const renewed = decideConnection(view({ agents: [agent()] }), request({ ai: again() }));
    expect(created.ok && created.hear).toBe(false);
    expect(renewed.ok && renewed.hear).toBe(false);
  });
});

describe('the client asking', () => {
  it('connects by `mcp:` and the host it returns to, read in lower case without the final dot', () => {
    const plan = decideConnection(
      view(),
      request({ client: { name: '  Claude  ', redirectHost: ' Claude.AI. ' } }),
    );
    expect(plan).toMatchObject({ ok: true, via: 'mcp:claude.ai', app: 'Claude', loopback: false });
  });

  it('shows the first 40 characters of a long registered name', () => {
    const plan = decideConnection(
      view(),
      request({ client: { name: 'A'.repeat(90), redirectHost: 'chatgpt.com' } }),
    );
    expect(plan.ok && plan.app).toBe('A'.repeat(40));
  });

  it('refuses a client with no readable name or a return host that is not a host name', () => {
    for (const client of [
      { name: '   ', redirectHost: 'claude.ai' },
      { name: 'Cla\u0007ude', redirectHost: 'claude.ai' },
      { name: 'Claude', redirectHost: 'claude.ai:443' },
      { name: 'Claude', redirectHost: 'https://claude.ai' },
      { name: 'Claude', redirectHost: '' },
    ]) {
      expect(refusalOf(decideConnection(view(), request({ client })))).toBe('client');
    }
  });

  it('marks a client that returns to this computer, for the consent to warn apart', () => {
    for (const host of ['localhost', 'hermes.localhost', '127.0.0.1']) {
      expect(isLoopback(host)).toBe(true);
      const plan = decideConnection(
        view(),
        request({ client: { name: 'Hermes', redirectHost: host } }),
      );
      expect(plan.ok && plan.loopback).toBe(true);
    }
    expect(isLoopback('claude.ai')).toBe(false);
    expect(isLoopback('127.0.0.1.example')).toBe(false);
  });
});

describe('a new AI', () => {
  it('is made the token way, its id from its name, with no role beyond the base one', () => {
    expect(decideConnection(view(), request())).toEqual({
      ok: true,
      action: 'create',
      accountId: ORG,
      agentId: 'claude-de-ana',
      name: 'Claude de Ana',
      roleIds: [],
      via: 'mcp:claude.ai',
      app: 'Claude',
      loopback: false,
      hear: false,
    });
  });

  it('carries the role picked when the person may give it', () => {
    const plan = decideConnection(view(), request({ roleId: BUILD }));
    expect(plan.ok && plan.action === 'create' && plan.roleIds).toEqual([BUILD]);
  });

  it('refuses a role the person cannot give (not in the till’s assignableRoles)', () => {
    expect(refusalOf(decideConnection(view(), request({ roleId: MEMBER_ROLE })))).toBe('role');
    expect(
      refusalOf(decideConnection(view({ assignableRoles: [] }), request({ roleId: BUILD }))),
    ).toBe('role');
  });

  it('refuses without manage-roles, naming that first', () => {
    const plan = decideConnection(
      view({ mayCreate: false, as: 'member', permissions: ['enter-worlds'] }),
      request(),
    );
    expect(refusalOf(plan)).toBe('no-permission');
  });

  it('refuses the house: it does not answer for an AI', () => {
    const plan = decideConnection(view({ mayCreate: false, as: 'house' }), request());
    expect(refusalOf(plan)).toBe('house');
  });

  it('refuses an organization that already keeps MAX_AGENTS', () => {
    const full = Array.from({ length: MAX_AGENTS }, (_, n) => agent({ id: `ia-${n}` }));
    expect(refusalOf(decideConnection(view({ mayCreate: false, agents: full }), request()))).toBe(
      'limit',
    );
    // Even if the till's flag was read before the last one was made.
    expect(refusalOf(decideConnection(view({ agents: full }), request()))).toBe('limit');
  });

  it('refuses a name that is not one', () => {
    for (const name of ['   ', 'x'.repeat(41), 'Cla\nude']) {
      expect(refusalOf(decideConnection(view(), request({ ai: { kind: 'new', name } })))).toBe(
        'name',
      );
    }
  });

  it('refuses a name the organization already has: that one is reconnected, not duplicated', () => {
    const plan = decideConnection(
      view({ agents: [agent()] }),
      request({ ai: { kind: 'new', name: 'CLAUDE DE ANA' } }),
    );
    expect(refusalOf(plan)).toBe('taken');
  });
});

describe('the same AI again', () => {
  it('renews its token and leaves an AI that is on as it is', () => {
    expect(decideConnection(view({ agents: [agent()] }), request({ ai: again() }))).toEqual({
      ok: true,
      action: 'renew',
      accountId: ORG,
      agentId: 'claude-de-ana',
      name: 'Claude de Ana',
      switchOn: false,
      giveRole: null,
      via: 'mcp:claude.ai',
      app: 'Claude',
      loopback: false,
      hear: false,
    });
  });

  it('switches on an AI that was off (revoked or switched off)', () => {
    const plan = decideConnection(
      view({ agents: [agent({ enabled: false })] }),
      request({ ai: again() }),
    );
    expect(plan.ok && plan.action === 'renew' && plan.switchOn).toBe(true);
  });

  it('is renewed even when the organization is full or the till says no new AI', () => {
    const full = [
      agent(),
      ...Array.from({ length: MAX_AGENTS - 1 }, (_, n) => agent({ id: `ia-${n}` })),
    ];
    const plan = decideConnection(
      view({ mayCreate: false, agents: full }),
      request({ ai: again() }),
    );
    expect(plan.ok && plan.action).toBe('renew');
  });

  it('gives the role picked when the person may give it to that AI', () => {
    const plan = decideConnection(
      view({ agents: [agent()] }),
      request({ ai: again(), roleId: BUILD }),
    );
    expect(plan.ok && plan.action === 'renew' && plan.giveRole).toBe(BUILD);
  });

  it('gives nothing when it already holds the role picked', () => {
    const plan = decideConnection(
      view({ agents: [agent({ roleIds: [MEMBER_ROLE], assignable: [] })] }),
      request({ ai: again(), roleId: MEMBER_ROLE }),
    );
    expect(plan.ok && plan.action === 'renew' && plan.giveRole).toBeNull();
  });

  it('refuses a role the person cannot give to that AI (not in its assignable)', () => {
    const plan = decideConnection(
      view({ agents: [agent({ assignable: [] })] }),
      request({ ai: again(), roleId: BUILD }),
    );
    expect(refusalOf(plan)).toBe('role');
  });

  it('refuses an AI of another organization', () => {
    const plan = decideConnection(
      view({ agents: [agent()] }),
      request({ ai: again('claude-de-ana', OTHER) }),
    );
    expect(refusalOf(plan)).toBe('other-organization');
  });

  it('refuses an AI the organization does not have', () => {
    expect(refusalOf(decideConnection(view(), request({ ai: again('nadie') })))).toBe(
      'no-such-agent',
    );
  });

  it('refuses without manage-roles, and when the person does not stand above it', () => {
    const locked = view({ agents: [agent({ mayEdit: false })] });
    expect(
      refusalOf(decideConnection({ ...locked, permissions: [] }, request({ ai: again() }))),
    ).toBe('no-permission');
    expect(refusalOf(decideConnection(locked, request({ ai: again() })))).toBe('not-below');
  });

  it('refuses an AI that connects with its own key', () => {
    const plan = decideConnection(
      view({ agents: [agent({ auth: 'key' })] }),
      request({ ai: again() }),
    );
    expect(refusalOf(plan)).toBe('not-token');
  });

  it('offers to reconnect only the token AIs the person may handle', () => {
    const list = reconnectable(
      view({
        agents: [
          agent(),
          agent({ id: 'llave', auth: 'key' }),
          agent({ id: 'ajena', mayEdit: false }),
        ],
      }),
    );
    expect(list.map((held) => held.id)).toEqual(['claude-de-ana']);
  });
});

// ---- Through a desk --------------------------------------------------------

const seed = deskSeed as unknown as AccountsSeed;
const fixture = (): AccountDesk => createAccountsFixtureDesk(seed, () => new Date(NOW_MS));
const asker = (house = false): Asker => ({ wallet: ME, house });

const TILL_VIEW: DeskAgents = {
  ok: true,
  accountId: ORG,
  as: 'owner',
  mayCreate: true,
  assignableRoles: [{ id: BUILD, name: 'Build', color: null, position: 2 }],
  agents: [
    {
      id: 'claude-de-ana',
      name: 'Claude de Ana',
      auth: 'token',
      tokenPrefix: 'abcdefgh',
      tokenCreatedAt: '2026-10-19T18:00:00.000Z',
      via: 'mcp:claude.ai',
      enabled: true,
      state: 'activa',
      status: 'activa',
      responsible: ME,
      createdAt: '2026-10-19T18:00:00.000Z',
      updatedAt: '2026-10-19T18:00:00.000Z',
      roleIds: [],
      assignable: [BUILD],
      mayEdit: true,
    },
  ],
};
const ACCESS = {
  ok: true,
  accountId: ORG,
  as: 'owner',
  permissions: ['manage-roles'],
  holders: {},
};
const NO = { ok: false, problems: ['the organization changed meanwhile'] };

/** A desk whose agent methods answer as told; the rest is never called. */
function stub(over: Partial<Record<keyof AccountDesk, ReturnType<typeof vi.fn>>> = {}) {
  const methods = {
    agents: vi.fn(async () => TILL_VIEW),
    access: vi.fn(async () => ACCESS),
    createAgent: vi.fn(async () => TILL_VIEW),
    renewAgentToken: vi.fn(async () => TILL_VIEW),
    changeAgent: vi.fn(async () => TILL_VIEW),
    giveAgentRole: vi.fn(async () => TILL_VIEW),
    ...over,
  };
  return { desk: methods as unknown as AccountDesk, methods };
}

const FRESH = { token: `ntk_${'x'.repeat(43)}`, hash: 'f'.repeat(64), prefix: 'xxxxxxxx' };
const draw = async () => FRESH;

describe('connecting through the fixture desk', () => {
  it('makes a new token AI connected from the client’s host, on, with its token hashed in the till', async () => {
    const desk = fixture();
    const done = await connectAi(desk, asker(), request({ roleId: MEMBER_ROLE }));
    expect(done).toMatchObject({
      ok: true,
      action: 'create',
      accountId: ORG,
      agentId: 'claude-de-ana',
      name: 'Claude de Ana',
      via: 'mcp:claude.ai',
      hear: false,
    });
    if (!done.ok) throw new Error('not connected');
    expect(done.token).toMatch(/^ntk_[A-Za-z0-9_-]{43}$/);
    const row = done.agents.agents.find((held) => held.id === 'claude-de-ana');
    expect(row).toMatchObject({ auth: 'token', enabled: true, roleIds: [MEMBER_ROLE] });
    const listed = await desk.agents(ME, ORG);
    expect(listed.ok && listed.agents.find((held) => held.id === 'claude-de-ana')?.via).toBe(
      'mcp:claude.ai',
    );
    const found = await desk.agentByToken(await hashToken(done.token));
    expect(found.ok && found.agent.id).toBe('claude-de-ana');
  });

  it('reconnecting renews the same AI (never a second one), kills the old token and switches it on', async () => {
    const desk = fixture();
    const first = await connectAi(desk, asker(), request(), quiet);
    if (!first.ok) throw new Error('not connected');
    expect((await desk.revokeAgentToken(ME, ORG, 'claude-de-ana')).ok).toBe(true);

    const second = await connectAi(
      desk,
      asker(),
      request({
        ai: again(),
        roleId: MEMBER_ROLE,
        client: { name: 'ChatGPT', redirectHost: 'chatgpt.com' },
      }),
      quiet,
    );
    expect(second).toMatchObject({ ok: true, action: 'renew', via: 'mcp:chatgpt.com' });
    if (!second.ok) throw new Error('not reconnected');
    expect(second.token).not.toBe(first.token);
    const rows = second.agents.agents.filter((held) => held.name === 'Claude de Ana');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ enabled: true, roleIds: [MEMBER_ROLE] });
    expect((await desk.agentByToken(await hashToken(first.token))).ok).toBe(false);
    const now = await desk.agentByToken(await hashToken(second.token));
    expect(now.ok && now.agent.enabled).toBe(true);
  });

  it('refuses the house, which does not answer for an AI', async () => {
    const done = await connectAi(fixture(), asker(true), request({ accountId: OTHER }), quiet);
    expect(done).toEqual({ ok: false, refusal: 'house' });
  });

  it('passes on the till’s refusal of an organization the person is not in', async () => {
    const done = await connectAi(fixture(), asker(), request({ accountId: OTHER }), quiet);
    expect(done.ok).toBe(false);
    expect(!done.ok && done.refusal).toBe('till');
  });
});

describe('connecting: who asks and what the till answers', () => {
  it('asks nothing without a session or a till', async () => {
    const { desk, methods } = stub();
    expect(await connectAi(desk, null, request(), quiet, draw)).toEqual({
      ok: false,
      refusal: 'signed-out',
    });
    expect(await connectAi(null, asker(), request(), quiet, draw)).toEqual({
      ok: false,
      refusal: 'unavailable',
    });
    expect(methods.agents).not.toHaveBeenCalled();
  });

  it('asks the till as the session’s wallet in lower case, with the session’s house flag', async () => {
    const { desk, methods } = stub();
    const otra = request({ ai: { kind: 'new', name: 'Otra' } });
    await connectAi(
      desk,
      { wallet: ME.toUpperCase().replace('0X', '0x'), house: false },
      otra,
      quiet,
      draw,
    );
    expect(methods.agents).toHaveBeenCalledWith(ME, ORG, false);
    expect(methods.access).toHaveBeenCalledWith(ME, ORG, false);
    expect(methods.createAgent).toHaveBeenCalledWith(
      ME,
      ORG,
      {
        id: 'otra',
        name: 'Otra',
        auth: 'token',
        tokenHash: FRESH.hash,
        tokenPrefix: FRESH.prefix,
        roleIds: [],
        via: 'mcp:claude.ai',
      },
      false,
    );
  });

  it('a till without the methods is unavailable; one that throws or answers out of shape failed', async () => {
    const missing = stub({
      agents: vi.fn(async () => {
        throw new Error(`AccountDesk ${NOT_IMPLEMENTED} agents`);
      }),
    });
    expect(await connectAi(missing.desk, asker(), request(), quiet, draw)).toEqual({
      ok: false,
      refusal: 'unavailable',
    });
    const throws = stub({
      access: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    expect(await connectAi(throws.desk, asker(), request(), quiet, draw)).toEqual({
      ok: false,
      refusal: 'failed',
    });
    const odd = stub({ agents: vi.fn(async () => ({ ok: true })) });
    expect(await connectAi(odd.desk, asker(), request(), quiet, draw)).toEqual({
      ok: false,
      refusal: 'failed',
    });
  });

  it('passes on a refusal of the agents or of the access', async () => {
    for (const over of [{ agents: vi.fn(async () => NO) }, { access: vi.fn(async () => NO) }]) {
      const { desk } = stub(over);
      expect(await connectAi(desk, asker(), request(), quiet, draw)).toEqual({
        ok: false,
        refusal: 'till',
        problems: NO.problems,
      });
    }
  });

  it('draws no token and writes nothing when the decision is no', async () => {
    const { desk, methods } = stub();
    const drawn = vi.fn(draw);
    const done = await connectAi(
      desk,
      asker(),
      request({ ai: { kind: 'new', name: 'Otra' }, roleId: MEMBER_ROLE }),
      quiet,
      drawn,
    );
    expect(done).toEqual({ ok: false, refusal: 'role' });
    expect(drawn).not.toHaveBeenCalled();
    expect(methods.createAgent).not.toHaveBeenCalled();
  });

  it('passes on the till’s refusal or failure of the creation', async () => {
    const refused = stub({ createAgent: vi.fn(async () => NO) });
    expect(
      await connectAi(
        refused.desk,
        asker(),
        request({ ai: { kind: 'new', name: 'Otra' } }),
        quiet,
        draw,
      ),
    ).toEqual({ ok: false, refusal: 'till', problems: NO.problems });
    const broken = stub({
      createAgent: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    expect(
      await connectAi(
        broken.desk,
        asker(),
        request({ ai: { kind: 'new', name: 'Otra' } }),
        quiet,
        draw,
      ),
    ).toEqual({ ok: false, refusal: 'failed' });
  });

  it('a renewal of an AI that is on, with no role picked, only renews', async () => {
    const { desk, methods } = stub();
    const done = await connectAi(desk, asker(), request({ ai: again() }), quiet, draw);
    expect(done).toMatchObject({ ok: true, action: 'renew', token: FRESH.token });
    expect(methods.renewAgentToken).toHaveBeenCalledWith(
      ME,
      ORG,
      'claude-de-ana',
      FRESH.hash,
      FRESH.prefix,
      false,
      'mcp:claude.ai',
    );
    expect(methods.changeAgent).not.toHaveBeenCalled();
    expect(methods.giveAgentRole).not.toHaveBeenCalled();
  });

  it('renews first, then switches on, then gives the role', async () => {
    const off: DeskAgents = {
      ...TILL_VIEW,
      agents: TILL_VIEW.agents.map((held) => ({ ...held, enabled: false })),
    };
    const order: string[] = [];
    const { desk, methods } = stub({
      agents: vi.fn(async () => off),
      renewAgentToken: vi.fn(async () => (order.push('renew'), off)),
      changeAgent: vi.fn(async () => (order.push('on'), TILL_VIEW)),
      giveAgentRole: vi.fn(async () => (order.push('role'), TILL_VIEW)),
    });
    const done = await connectAi(
      desk,
      asker(),
      request({ ai: again(), roleId: BUILD }),
      quiet,
      draw,
    );
    expect(done.ok).toBe(true);
    expect(order).toEqual(['renew', 'on', 'role']);
    expect(methods.changeAgent).toHaveBeenCalledWith(
      ME,
      ORG,
      'claude-de-ana',
      { enabled: true },
      false,
    );
    expect(methods.giveAgentRole).toHaveBeenCalledWith(ME, ORG, 'claude-de-ana', BUILD, false);
  });

  it('stops at the first write of a renewal the till refuses', async () => {
    const off: DeskAgents = {
      ...TILL_VIEW,
      agents: TILL_VIEW.agents.map((held) => ({ ...held, enabled: false })),
    };
    const cases = [
      { renewAgentToken: vi.fn(async () => NO) },
      { changeAgent: vi.fn(async () => NO) },
      { giveAgentRole: vi.fn(async () => NO) },
    ];
    for (const over of cases) {
      const { desk } = stub({ agents: vi.fn(async () => off), ...over });
      expect(
        await connectAi(desk, asker(), request({ ai: again(), roleId: BUILD }), quiet, draw),
      ).toEqual({ ok: false, refusal: 'till', problems: NO.problems });
    }
  });
});
