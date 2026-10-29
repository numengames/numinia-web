/**
 * «MCP remoto», story W11: GET /api/agents/me with the token alone
 * (lib/agent-me.ts) — what the relay asks for a client that holds nothing
 * but the `ntk_` token the panel showed (the static bearer). The till finds
 * the agent by the token's hash (`agentByToken`, W2); the answer is the one
 * the query way gives; every wrong credential is the same generic 401; and
 * the request counts in the agent's own bucket, the one /pass and the query
 * share.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import { NOT_IMPLEMENTED, type AccountDesk, type Asker } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { TOKEN_REQUESTS_PER_MINUTE, answerAgentMe, type AgentMeContext } from '../agent-me';
import { answerAgentPass } from '../agent-pass';
import { newToken } from '../agents';
import { answerAgentWrite } from '../agents-source';
import { resetRateLimitsForTests } from '../rate-limit';
import { b64urlEncode } from '../world-pass';

const NOW_MS = Date.parse('2026-10-19T18:00:00.000Z');
const NOW = Math.floor(NOW_MS / 1000);
const ME = `0x${'ab'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const seed = deskSeed as unknown as AccountsSeed;
const HOSTS = new Map([
  ['torre', 'torre.example'],
  ['agora-plaza', 'agora.example'],
  ['bosque', 'bosque.example'],
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
        { worldId: 'bosque', accountId: 'acc_team_reset', placedDaysAgo: 1 },
      ],
    },
    () => new Date(NOW_MS),
  );

/* eslint-disable @typescript-eslint/no-explicit-any -- a test reads loosely shaped JSON */
const json = async (response: Response): Promise<Record<string, any>> =>
  (await response.json()) as Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Makes a token agent through the route, as the panel does, and returns the secret. */
async function made(desk: AccountDesk, id = 'hermes-1'): Promise<string> {
  const response = await answerAgentWrite(
    desk,
    asker(),
    new Request('https://numinia.test/api/saldo/agents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accountId: NUMEN,
        id,
        name: 'Hermes',
        auth: 'token',
        roleIds: [MEMBER_ROLE],
      }),
    }),
    quiet,
  );
  expect(response.status).toBe(200);
  return (await json(response))['token'] as string;
}

/** The token-alone request: no query at all. */
const alone = (authorization: string | null): Request =>
  new Request('https://numinia.test/api/agents/me', {
    headers: authorization === null ? {} : { authorization },
  });
const withQuery = (authorization: string, agent = 'hermes-1'): Request =>
  new Request(`https://numinia.test/api/agents/me?org=${NUMEN}&agent=${agent}`, {
    headers: { authorization },
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

describe('GET /api/agents/me with the token alone', () => {
  it('finds the agent by its token and answers what the query way answers', async () => {
    const desk = fresh();
    const token = await made(desk);
    const byToken = await answerAgentMe(desk, alone(bearer(token)), contextOf(), quiet);
    expect(byToken.status).toBe(200);
    expect(byToken.headers.get('cache-control')).toBe('no-store');
    const body = await json(byToken);
    expect(body).toMatchObject({
      org: NUMEN,
      id: 'hermes-1',
      name: 'Hermes',
      enabled: true,
      state: 'activa',
      eligible: true,
      worlds: [
        { id: 'agora-plaza', ws: 'wss://agora.example/ws' },
        { id: 'torre', ws: 'wss://torre.example/ws' },
      ],
    });
    resetRateLimitsForTests();
    const byQuery = await answerAgentMe(desk, withQuery(bearer(token)), contextOf(), quiet);
    expect(body).toEqual(await json(byQuery));
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(token);
  });

  it('tells a switched-off AI who it is, with no worlds and without reading the fleet', async () => {
    const desk = fresh();
    const token = await made(desk);
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: false });
    const context = contextOf();
    const body = await json(await answerAgentMe(desk, alone(bearer(token)), context, quiet));
    expect(body).toMatchObject({ id: 'hermes-1', enabled: false, worlds: [] });
    expect(context.reads()).toBe(0);
  });

  it('follows a renewal: the old token is refused the moment the new one is given', async () => {
    const desk = fresh();
    const token = await made(desk);
    const renewed = await newToken();
    await desk.renewAgentToken(ME, NUMEN, 'hermes-1', renewed.hash, renewed.prefix);
    expect((await answerAgentMe(desk, alone(bearer(token)), contextOf(), quiet)).status).toBe(401);
    const now = await answerAgentMe(desk, alone(bearer(renewed.token)), contextOf(), quiet);
    expect(now.status).toBe(200);
    expect(await json(now)).toMatchObject({ id: 'hermes-1' });
  });
});

describe('every wrong credential, by the token alone', () => {
  it('is the same generic 401 as the query way, and the fleet is never read', async () => {
    const desk = fresh();
    const token = await made(desk);
    const stranger = await newToken();
    const revoked = await made(desk, 'revocada-2');
    await desk.revokeAgentToken(ME, NUMEN, 'revocada-2');
    const agentByToken = vi.fn(desk.agentByToken);
    const counted: AccountDesk = { ...desk, agentByToken };
    const context = contextOf();
    const seen: string[] = [];
    for (const authorization of [
      null, // no header
      'Basic abc', // not a bearer
      bearer(`ntk_${'A'.repeat(42)}`), // not shaped like a token
      `Bearer ${token} extra`, // not only the token
    ]) {
      const response = await answerAgentMe(counted, alone(authorization), context, quiet);
      expect(response.status).toBe(401);
      seen.push(JSON.stringify(await response.json()));
    }
    // Refused before the till is asked anything.
    expect(agentByToken).not.toHaveBeenCalled();
    for (const unknown of [stranger.token, revoked]) {
      const response = await answerAgentMe(counted, alone(bearer(unknown)), context, quiet);
      expect(response.status).toBe(401);
      seen.push(JSON.stringify(await response.json()));
    }
    // A wrong one by the query way, for the comparison.
    seen.push(
      JSON.stringify(
        await (await answerAgentMe(desk, withQuery(bearer(stranger.token)), context, quiet)).json(),
      ),
    );
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toContain('"token"');
    expect(context.reads()).toBe(0);
    const logged = JSON.stringify(quiet.mock.calls);
    for (const secret of [token, stranger.token, revoked]) expect(logged).not.toContain(secret);
  });

  it('is the 401 too when the till names an agent the token is not', async () => {
    const desk = fresh();
    const token = await made(desk);
    await made(desk, 'otra');
    // A till that answers with another agent's record: the token is still judged against it.
    const confused: AccountDesk = {
      ...desk,
      agentByToken: () => desk.agentPass(NUMEN, 'otra'),
    };
    const response = await answerAgentMe(confused, alone(bearer(token)), contextOf(), quiet);
    expect(response.status).toBe(401);
    expect(await json(response)).toMatchObject({ error: 'token' });
  });

  it('is the 401 for a key agent the till would hand back', async () => {
    const desk = fresh();
    const token = await made(desk);
    await desk.createAgent(ME, NUMEN, {
      id: 'keyed',
      name: 'Keyed',
      publicKey: `ed25519:${b64urlEncode(new Uint8Array(32).fill(9))}`,
      roleIds: [MEMBER_ROLE],
    });
    const keyed: AccountDesk = { ...desk, agentByToken: () => desk.agentPass(NUMEN, 'keyed') };
    expect((await answerAgentMe(keyed, alone(bearer(token)), contextOf(), quiet)).status).toBe(401);
  });
});

describe('the meter, by the token alone', () => {
  it('counts in the agent’s own bucket, shared with the query way and /api/agents/pass', async () => {
    const desk = fresh();
    const token = await made(desk);
    const pass = new Request('https://numinia.test/api/agents/pass', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: bearer(token) },
      body: JSON.stringify({ org: NUMEN, agent: 'hermes-1', aud: 'agora-plaza' }),
    });
    const passContext = { hosts: HOSTS, privateKey: undefined, secret: undefined, now: NOW };
    for (let i = 0; i < TOKEN_REQUESTS_PER_MINUTE / 3; i += 1) {
      expect((await answerAgentMe(desk, alone(bearer(token)), contextOf(), quiet)).status).toBe(
        200,
      );
      expect((await answerAgentMe(desk, withQuery(bearer(token)), contextOf(), quiet)).status).toBe(
        200,
      );
      // No signing key here: refused after the meter, which is what counts.
      expect((await answerAgentPass(desk, pass.clone(), passContext, quiet)).status).not.toBe(429);
    }
    const limited = await answerAgentMe(desk, alone(bearer(token)), contextOf(), quiet);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('cache-control')).toBe('no-store');
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await json(limited)).toMatchObject({ error: 'limite' });
    expect((await answerAgentMe(desk, withQuery(bearer(token)), contextOf(), quiet)).status).toBe(
      429,
    );
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ kind: 'throttled' }));
    // Another agent's token is not touched by it.
    const other = await made(desk, 'hermes-2');
    expect((await answerAgentMe(desk, alone(bearer(other)), contextOf(), quiet)).status).toBe(200);
  });
});

describe('the rest of the road, by the token alone', () => {
  it('answers 503 with no till, and when the till is older than agentByToken', async () => {
    const desk = fresh();
    const token = await made(desk);
    const none = await answerAgentMe(null, alone(bearer(token)), contextOf(), quiet);
    expect(none.status).toBe(503);
    expect(await json(none)).toMatchObject({ error: 'no-vinculado' });
    const older = {
      ...desk,
      agentByToken: async () => {
        throw new Error(NOT_IMPLEMENTED);
      },
    } as AccountDesk;
    const answer = await answerAgentMe(older, alone(bearer(token)), contextOf(), quiet);
    expect(answer.status).toBe(503);
    expect(await json(answer)).toMatchObject({ error: 'no-vinculado' });
  });

  it('answers 502 when the till fails or answers out of shape', async () => {
    const desk = fresh();
    const token = await made(desk);
    const broken: AccountDesk[] = [
      {
        ...desk,
        agentByToken: async () => {
          throw new Error('boom');
        },
      },
      { ...desk, agentByToken: async () => ({ ok: true }) } as unknown as AccountDesk,
    ];
    for (const one of broken) {
      const response = await answerAgentMe(one, alone(bearer(token)), contextOf(), quiet);
      expect(response.status).toBe(502);
      expect(await json(response)).toMatchObject({ error: 'caja' });
    }
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(token);
  });

  it('still refuses half a query with 400: the token alone means no org and no agent', async () => {
    const desk = fresh();
    const token = await made(desk);
    for (const query of [`org=${NUMEN}`, 'agent=hermes-1', 'org=', 'agent=']) {
      const request = new Request(`https://numinia.test/api/agents/me?${query}`, {
        headers: { authorization: bearer(token) },
      });
      const response = await answerAgentMe(desk, request, contextOf(), quiet);
      expect(response.status).toBe(400);
      expect(await json(response)).toMatchObject({ error: 'peticion' });
    }
  });
});
