/**
 * «MCP remoto», story W1: GET /api/agents/me (lib/agent-me.ts) — an AI's
 * access token says who the AI is and which worlds of ITS organization it may
 * reach, each with its WebSocket address; every wrong credential is the same
 * generic 401; a switched-off AI is told so and gets no worlds; and the
 * metering is one bucket per agent shared with POST /api/agents/pass.
 */

import { DEFAULT_AGENT_PRESENCE, type AgentPresence } from '@numinia/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import { NOT_IMPLEMENTED, type AccountDesk, type Asker } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import {
  TOKEN_REQUESTS_PER_MINUTE,
  answerAgentMe,
  worldSocket,
  type AgentMeContext,
} from '../agent-me';
import { answerAgentPass } from '../agent-pass';
import { hashToken, isConnectedVia, newToken } from '../agents';
import { boundAccounts } from '../accounts-source';
import { answerAgentWrite } from '../agents-source';
import { resetRateLimitsForTests } from '../rate-limit';
import { b64urlEncode } from '../world-pass';

const NOW_MS = Date.parse('2026-10-19T18:00:00.000Z');
const NOW = Math.floor(NOW_MS / 1000);
const ME = `0x${'ab'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';
const RESET = 'acc_team_reset';
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const seed = deskSeed as unknown as AccountsSeed;
// Served by the fleet: two of Numen Games', one of Reset's, one placed nowhere.
const HOSTS = new Map([
  ['torre', 'torre.example'],
  ['agora-plaza', 'agora.example'],
  ['bosque', 'bosque.example'],
  ['suelto', 'suelto.example'],
]);
const quiet = vi.fn();

beforeEach(() => {
  resetRateLimitsForTests();
  quiet.mockClear();
});

const asker = (): Asker => ({ wallet: ME, house: false });
const fresh = (): AccountDesk =>
  createAccountsFixtureDesk(
    {
      ...seed,
      homes: [
        { worldId: 'agora-plaza', accountId: NUMEN, placedDaysAgo: 5 },
        { worldId: 'torre', accountId: NUMEN, placedDaysAgo: 3 },
        // Numen Games' too, but the fleet serves it nowhere: no address, not listed.
        { worldId: 'sotano', accountId: NUMEN, placedDaysAgo: 2 },
        { worldId: 'bosque', accountId: RESET, placedDaysAgo: 1 },
      ],
    },
    () => new Date(NOW_MS),
  );

/* eslint-disable @typescript-eslint/no-explicit-any -- a test reads loosely shaped JSON */
const json = async (response: Response): Promise<Record<string, any>> =>
  (await response.json()) as Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Makes a token agent through the route, as the panel does, and returns the secret. */
async function made(desk: AccountDesk, id = 'hermes-1', roles: string[] = [MEMBER_ROLE]) {
  const response = await answerAgentWrite(
    desk,
    asker(),
    new Request('https://numinia.test/api/saldo/agents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: NUMEN, id, name: 'Hermes', auth: 'token', roleIds: roles }),
    }),
    quiet,
  );
  expect(response.status).toBe(200);
  return (await json(response))['token'] as string;
}

const me = (authorization: string | null, query = `org=${NUMEN}&agent=hermes-1`): Request =>
  new Request(`https://numinia.test/api/agents/me?${query}`, {
    headers: authorization === null ? {} : { authorization },
  });
const bearer = (token: string): string => `Bearer ${token}`;

function contextOf(): AgentMeContext & { readonly reads: () => number } {
  let reads = 0;
  return {
    hosts: async () => {
      reads += 1;
      return HOSTS;
    },
    now: NOW,
    reads: () => reads,
  };
}

describe('GET /api/agents/me with its token', () => {
  it('says who the AI is and lists only its organization’s served worlds, each with its ws', async () => {
    const desk = fresh();
    const token = await made(desk);
    const context = contextOf();
    const response = await answerAgentMe(desk, me(bearer(token)), context, quiet);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await json(response);
    expect(body).toEqual({
      org: NUMEN,
      id: 'hermes-1',
      name: 'Hermes',
      enabled: true,
      state: 'activa',
      hear: false,
      oye: 'llamada',
      vive: 'todos',
      presence: DEFAULT_AGENT_PRESENCE,
      eligible: true,
      permissions: expect.arrayContaining(['enter-worlds']),
      worlds: [
        { id: 'agora-plaza', ws: 'wss://agora.example/ws' },
        { id: 'torre', ws: 'wss://torre.example/ws' },
      ],
    });
    // Reset's world, a world placed nowhere and one the fleet does not serve stay out.
    const text = JSON.stringify(body);
    for (const absent of ['bosque', 'suelto', 'sotano', 'tokenHash', token]) {
      expect(text).not.toContain(absent);
    }
    expect(context.reads()).toBe(1);
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(token);
  });

  it('says whether the AI may hear nearby chat: off until someone who may edit it turns it on', async () => {
    const desk = fresh();
    const token = await made(desk);
    const off = await json(await answerAgentMe(desk, me(bearer(token)), contextOf(), quiet));
    expect(off['hear']).toBe(false);
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { hears: true });
    const on = await json(await answerAgentMe(desk, me(bearer(token)), contextOf(), quiet));
    expect(on['hear']).toBe(true);
    expect(on['oye']).toBe('todo');
    expect(on['presence']).toMatchObject({ oye: 'todo' });
  });

  describe('where the AI lives and how it is present (S19)', () => {
    const BUBBLE: AgentPresence = {
      ...DEFAULT_AGENT_PRESENCE,
      burbuja: { forma: 'cilindro', radio: 6, visible: 'siempre' },
      llamada: { ...DEFAULT_AGENT_PRESENCE.llamada, frase: 'agente, responde' },
      oye: 'burbuja',
      quedarse_h: 4,
    };

    /** A desk whose till says the AI lives in `worlds` with this presence (as migration 0026 does). */
    function livingIn(
      desk: AccountDesk,
      worlds: unknown,
      worldIds: string[],
      presence: unknown,
    ): AccountDesk {
      return {
        ...desk,
        agentPass: async (org, agent) => {
          const pass = await desk.agentPass(org, agent);
          return pass.ok ? { ...pass, agent: { ...pass.agent, worlds, presence } } : pass;
        },
        agentWorlds: async (org, agent) => {
          const placed = await desk.agentWorlds(org, agent);
          return placed.ok ? { ...placed, worldIds, worlds, presence } : placed;
        },
      } as AccountDesk;
    }

    it('lists only the worlds it lives in and says so, with its presence and what it hears', async () => {
      const desk = fresh();
      const token = await made(desk);
      const chosen = livingIn(desk, { mundos: ['torre'] }, ['torre'], BUBBLE);
      const body = await json(await answerAgentMe(chosen, me(bearer(token)), contextOf(), quiet));
      expect(body).toMatchObject({
        worlds: [{ id: 'torre', ws: 'wss://torre.example/ws' }],
        vive: 'elegidos',
        oye: 'burbuja',
        hear: false,
        presence: BUBBLE,
      });
      expect(JSON.stringify(body)).not.toContain('agora-plaza');
      expect(JSON.stringify(body)).not.toContain('tokenHash');
      expect(JSON.stringify(body)).not.toContain(token);
    });

    it('lists none of the worlds it does not live in even when its organization has them served', async () => {
      const desk = fresh();
      const token = await made(desk);
      // Chosen into a world the fleet does not serve: nothing to list, but still told where it lives.
      const sotano = livingIn(desk, { mundos: ['sotano'] }, ['sotano'], BUBBLE);
      expect(
        await json(await answerAgentMe(sotano, me(bearer(token)), contextOf(), quiet)),
      ).toMatchObject({ worlds: [], vive: 'elegidos' });
    });

    it('keeps `hear` true only on the last rung, whatever rung the till stored beside its switch', async () => {
      const desk = fresh();
      const token = await made(desk);
      const asked = async (hears: boolean, oye: AgentPresence['oye']) => {
        const held = livingIn(desk, { todos: true }, ['torre'], { ...BUBBLE, oye });
        if (hears) await desk.changeAgent(ME, NUMEN, 'hermes-1', { hears: true });
        const body = await json(await answerAgentMe(held, me(bearer(token)), contextOf(), quiet));
        return [body['hear'], body['oye']];
      };
      expect(await asked(false, 'todo')).toEqual([false, 'llamada']);
      expect(await asked(false, 'burbuja')).toEqual([false, 'burbuja']);
      expect(await asked(true, 'burbuja')).toEqual([true, 'todo']);
    });

    it('answers for a till older than migration 0026: lives everywhere, default presence', async () => {
      const desk = fresh();
      const token = await made(desk);
      const bare = (hears: boolean): AccountDesk =>
        ({
          ...desk,
          agentPass: async (org, agent) => {
            const pass = await desk.agentPass(org, agent);
            if (!pass.ok) return pass;
            const { presence: _presence, worlds: _worlds, ...rest } = pass.agent;
            return { ...pass, agent: { ...rest, hears } };
          },
          agentWorlds: async (org, agent) => {
            const placed = await desk.agentWorlds(org, agent);
            if (!placed.ok) return placed;
            const { presence: _presence, worlds: _worlds, ...rest } = placed;
            return rest;
          },
        }) as AccountDesk;
      const quietOne = await json(
        await answerAgentMe(bare(false), me(bearer(token)), contextOf(), quiet),
      );
      expect(quietOne).toMatchObject({
        vive: 'todos',
        oye: 'llamada',
        hear: false,
        presence: DEFAULT_AGENT_PRESENCE,
      });
      expect(quietOne['worlds']).toHaveLength(2);
      const hearing = await json(
        await answerAgentMe(bare(true), me(bearer(token)), contextOf(), quiet),
      );
      expect(hearing).toMatchObject({ oye: 'todo', hear: true });
    });

    it('does not fail on a presence or a choice of worlds it cannot read: default and everywhere', async () => {
      const desk = fresh();
      const token = await made(desk);
      for (const odd of [{ cuerpo: 'robot' }, 'x', null, 7]) {
        const held = livingIn(desk, odd, ['torre'], odd);
        const body = await json(await answerAgentMe(held, me(bearer(token)), contextOf(), quiet));
        expect(body).toMatchObject({
          vive: 'todos',
          oye: 'llamada',
          presence: DEFAULT_AGENT_PRESENCE,
        });
        expect(body['worlds']).toHaveLength(1);
      }
    });

    it('says where an AI that may not enter lives, with no worlds', async () => {
      const desk = fresh();
      const token = await made(desk);
      await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: false });
      const off = livingIn(desk, { mundos: ['torre'] }, ['torre'], BUBBLE);
      expect(
        await json(await answerAgentMe(off, me(bearer(token)), contextOf(), quiet)),
      ).toMatchObject({ enabled: false, worlds: [], vive: 'elegidos', oye: 'burbuja' });
    });
  });

  it('tells an AI that sleeps its state and still lists its worlds', async () => {
    const desk = fresh();
    const token = await made(desk);
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { state: 'dormida' });
    const body = await json(await answerAgentMe(desk, me(bearer(token)), contextOf(), quiet));
    expect(body).toMatchObject({ state: 'dormida', enabled: true });
    expect(body['worlds']).toHaveLength(2);
  });

  it('answers a switched-off AI enabled:false with no worlds, without reading the fleet', async () => {
    const desk = fresh();
    const token = await made(desk);
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: false });
    const context = contextOf();
    const response = await answerAgentMe(desk, me(bearer(token)), context, quiet);
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ id: 'hermes-1', enabled: false, worlds: [] });
    expect(context.reads()).toBe(0);
  });

  it('lists no worlds when its roles do not let it enter or its person no longer answers for it', async () => {
    const desk = fresh();
    const token = await made(desk);
    const trimmed = (change: object): AccountDesk => ({
      ...desk,
      agentPass: async (org, agent) => ({ ...(await desk.agentPass(org, agent)), ...change }),
    });
    for (const change of [{ permissions: [] }, { eligible: false }]) {
      const context = contextOf();
      const body = await json(
        await answerAgentMe(trimmed(change), me(bearer(token)), context, quiet),
      );
      expect(body).toMatchObject({ enabled: true, worlds: [] });
      expect(context.reads()).toBe(0);
    }
  });
});

describe('every wrong credential', () => {
  it('is the same generic 401, and the fleet is never read', async () => {
    const desk = fresh();
    const token = await made(desk);
    const other = await newToken();
    await desk.createAgent(ME, NUMEN, {
      id: 'keyed',
      name: 'Keyed',
      publicKey: `ed25519:${b64urlEncode(new Uint8Array(32).fill(9))}`,
      roleIds: [MEMBER_ROLE],
    });
    await made(desk, 'revocada');
    await desk.revokeAgentToken(ME, NUMEN, 'revocada');
    const attempts: Request[] = [
      me(null), // no header
      me('Basic abc'), // not a bearer
      me(bearer(`ntk_${'A'.repeat(42)}`)), // not shaped like a token
      me(bearer(other.token)), // a token that is not its own
      me(bearer(token), `org=${NUMEN}&agent=nobody`), // unknown agent
      me(bearer(token), `org=${NUMEN}&agent=keyed`), // a key agent
      me(bearer(token), `org=${RESET}&agent=hermes-1`), // its token, another organization
      me(bearer(token), `org=${NUMEN}&agent=revocada`), // a revoked token
    ];
    const context = contextOf();
    const seen: string[] = [];
    for (const attempt of attempts) {
      const response = await answerAgentMe(desk, attempt, context, quiet);
      expect(response.status).toBe(401);
      seen.push(JSON.stringify(await response.json()));
    }
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toContain('"token"');
    expect(context.reads()).toBe(0);
    const logged = JSON.stringify(quiet.mock.calls);
    expect(logged).not.toContain(token);
    expect(logged).not.toContain(other.token);
  });

  it('refuses the old token the moment it is renewed', async () => {
    const desk = fresh();
    const token = await made(desk);
    const renewed = await newToken();
    await desk.renewAgentToken(ME, NUMEN, 'hermes-1', renewed.hash, renewed.prefix);
    expect((await answerAgentMe(desk, me(bearer(token)), contextOf(), quiet)).status).toBe(401);
    expect((await answerAgentMe(desk, me(bearer(renewed.token)), contextOf(), quiet)).status).toBe(
      200,
    );
  });
});

describe('the meter', () => {
  it('is one bucket per agent with /api/agents/pass: sixty a minute together, then 429', async () => {
    const desk = fresh();
    const bad = await newToken();
    const pass = (agent: string) =>
      new Request('https://numinia.test/api/agents/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: bearer(bad.token) },
        body: JSON.stringify({ org: NUMEN, agent, aud: 'agora-plaza' }),
      });
    const passContext = { hosts: HOSTS, privateKey: undefined, secret: undefined, now: NOW };
    for (let i = 0; i < TOKEN_REQUESTS_PER_MINUTE / 2; i += 1) {
      expect((await answerAgentPass(desk, pass('hermes-1'), passContext, quiet)).status).toBe(401);
      expect((await answerAgentMe(desk, me(bearer(bad.token)), contextOf(), quiet)).status).toBe(
        401,
      );
    }
    const limited = await answerAgentMe(desk, me(bearer(bad.token)), contextOf(), quiet);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('cache-control')).toBe('no-store');
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await json(limited)).toMatchObject({ error: 'limite' });
    expect((await answerAgentPass(desk, pass('hermes-1'), passContext, quiet)).status).toBe(429);
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ kind: 'throttled' }));
    // Another agent is not touched by it.
    const stranger = me(bearer(bad.token), `org=${NUMEN}&agent=someone-else`);
    expect((await answerAgentMe(desk, stranger, contextOf(), quiet)).status).toBe(401);
  });
});

describe('the rest of the road', () => {
  it('refuses a query that is not the contract’s with 400, before the meter', async () => {
    const desk = fresh();
    const token = await made(desk);
    // No query at all is the token-alone way (story W11, agent-me-token.test.ts).
    for (const query of [
      `org=${NUMEN}`,
      'agent=hermes-1',
      'org=&agent=',
      `org=no such!&agent=hermes-1`,
    ]) {
      const response = await answerAgentMe(desk, me(bearer(token), query), contextOf(), quiet);
      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({ error: 'peticion' });
    }
    expect(
      (await answerAgentMe(desk, me(bearer(token), `org=${NUMEN}&agent=Bad!`), contextOf(), quiet))
        .status,
    ).toBe(400);
  });

  it('answers 503 with no till, and when the till is older than the route', async () => {
    const desk = fresh();
    const token = await made(desk);
    const none = await answerAgentMe(null, me(bearer(token)), contextOf(), quiet);
    expect(none.status).toBe(503);
    expect(await json(none)).toMatchObject({ error: 'no-vinculado' });
    const older = {
      ...desk,
      agentPass: async () => {
        throw new Error(NOT_IMPLEMENTED);
      },
    } as AccountDesk;
    expect((await answerAgentMe(older, me(bearer(token)), contextOf(), quiet)).status).toBe(503);
  });

  it('answers 502 when the till fails, out of shape or while reading the worlds', async () => {
    const desk = fresh();
    const token = await made(desk);
    const broken: AccountDesk[] = [
      {
        ...desk,
        agentPass: async () => {
          throw new Error('boom');
        },
      },
      { ...desk, agentPass: async () => ({ ok: true }) } as unknown as AccountDesk,
      {
        ...desk,
        agentWorlds: async () => {
          throw new Error('boom');
        },
      },
      {
        ...desk,
        agentWorlds: async () => ({ ok: true, worldIds: 'torre' }),
      } as unknown as AccountDesk,
    ];
    for (const one of broken) {
      const response = await answerAgentMe(one, me(bearer(token)), contextOf(), quiet);
      expect(response.status).toBe(502);
      expect(await json(response)).toMatchObject({ error: 'caja' });
    }
  });

  it('asks the till for the worlds once, never world by world', async () => {
    const desk = fresh();
    const token = await made(desk);
    const agentWorlds = vi.fn(desk.agentWorlds);
    const homeOf = vi.fn(desk.homeOf);
    const counted: AccountDesk = { ...desk, agentWorlds, homeOf };
    const body = await json(await answerAgentMe(counted, me(bearer(token)), contextOf(), quiet));
    expect(body['worlds']).toHaveLength(2);
    expect(agentWorlds).toHaveBeenCalledTimes(1);
    expect(agentWorlds).toHaveBeenCalledWith(NUMEN, 'hermes-1');
    expect(homeOf).not.toHaveBeenCalled();
  });

  it('lists no worlds when the till no longer finds the agent between the two calls', async () => {
    const desk = fresh();
    const token = await made(desk);
    const gone: AccountDesk = {
      ...desk,
      agentWorlds: async () => ({ ok: false, problems: ['the organization has no such agent'] }),
    };
    const body = await json(await answerAgentMe(gone, me(bearer(token)), contextOf(), quiet));
    expect(body).toMatchObject({ id: 'hermes-1', worlds: [] });
  });

  it('answers 503 when the till is older than agentWorlds', async () => {
    const desk = fresh();
    const token = await made(desk);
    const older = {
      ...desk,
      agentWorlds: async () => {
        throw new Error(NOT_IMPLEMENTED);
      },
    } as AccountDesk;
    const response = await answerAgentMe(older, me(bearer(token)), contextOf(), quiet);
    expect(response.status).toBe(503);
    expect(await json(response)).toMatchObject({ error: 'no-vinculado' });
  });

  it('writes a world’s socket address from its host', () => {
    expect(worldSocket('torre.numinia.com')).toBe('wss://torre.numinia.com/ws');
  });
});

describe('«MCP remoto» W2 at the store', () => {
  it('reads how an AI was connected as the till does', () => {
    for (const via of ['panel', 'mcp:claude.ai', 'mcp:localhost', 'mcp:127.0.0.1']) {
      expect(isConnectedVia(via)).toBe(true);
    }
    for (const via of [
      undefined,
      7,
      'Panel',
      'mcp:',
      'mcp:Claude.ai',
      'mcp:claude.ai:443',
      'mcp:[::1]',
      `mcp:${Array.from({ length: 64 }, () => 'abc').join('.')}`,
    ]) {
      expect(isConnectedVia(via)).toBe(false);
    }
  });

  it('passes agentWorlds, agentByToken and a renewal’s way through a bound till, and says when it is older', async () => {
    const desk = fresh();
    const token = await made(desk);
    const bound = boundAccounts(desk) as AccountDesk;
    expect(await bound.agentWorlds(NUMEN, 'hermes-1')).toMatchObject({
      ok: true,
      worldIds: ['agora-plaza', 'sotano', 'torre'],
    });
    expect(await bound.agentByToken(await hashToken(token))).toMatchObject({
      ok: true,
      accountId: NUMEN,
      agent: { id: 'hermes-1' },
    });
    const renewed = await newToken();
    const answer = await bound.renewAgentToken(
      ME,
      NUMEN,
      'hermes-1',
      renewed.hash,
      renewed.prefix,
      false,
      'mcp:claude.ai',
    );
    expect(answer.ok && answer.agents.find((agent) => agent.id === 'hermes-1')).toMatchObject({
      via: 'mcp:claude.ai',
    });
    const old = boundAccounts({
      ...desk,
      agentWorlds: undefined,
      agentByToken: undefined,
    } as never) as AccountDesk;
    await expect(old.agentWorlds(NUMEN, 'hermes-1')).rejects.toThrow(NOT_IMPLEMENTED);
    await expect(old.agentByToken(renewed.hash)).rejects.toThrow(NOT_IMPLEMENTED);
  });
});
