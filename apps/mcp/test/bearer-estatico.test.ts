/**
 * The static bearer (story W11): a client that cannot do OAuth pastes the
 * relay's URL and the AI's `ntk_` token from Panel › Agents, and calls
 * `/mcp` with `Authorization: Bearer ntk_…` — through the Worker as such a
 * client meets it, with a fake numinia.com that finds an agent by its token
 * alone (`GET /api/agents/me`, no query), the Durable Objects `Cuerpo` and
 * `Plazas` in memory and a fake world behind the global `WebSocket`
 * (test/fake-world.ts), on vitest's clock.
 *
 * A good token lists and calls the tools — quien_soy, mundos, entrar into
 * the world, a world tool, salir — under the same body name a grant would
 * use, `<org>.<agent>`. A bad one is the library's ordinary 401 with its
 * challenge. A token revoked mid-session takes the body out at its next
 * check, and the next call is a 401; there is no grant to revoke, and the
 * tools say so in words for whoever pasted it. The token never shows in a
 * response, a log line, a body's storage or its status, and never in a URL.
 */
import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATIC_REVOKED, STATIC_VIA, isStaticBearer, resolveStaticBearer } from '../src/bearer';
import { RESOURCE } from '../src/config';
import { Cuerpo, REFUSALS } from '../src/cuerpo';
import { ERRORS, TOOLS, callTool } from '../src/herramientas';
import { LEAVE_TOOL, bodyTools, callBodyTool } from '../src/herramientas-cuerpo';
import { BEARER_PER_MINUTE, resetLimitsForTests } from '../src/limites';
import { askMeByToken } from '../src/me';
import { handleMcp } from '../src/mcp';
import { Plazas } from '../src/plazas';
import worker, { type Env } from '../src/worker';
import { FakeWorld } from './fake-world';
import { MemoryKv } from './memory-kv';
import { MemoryNamespace, MemoryStorage, durableState } from './memory-durable';

const ORIGIN = 'https://mcp.numinia.com';
const STORE = 'https://numinia.com';
const ORG = 'acc_team_numen_games';
const AGENT = 'hermes-de-ana';
const TORRE = { id: 'torre', ws: 'wss://torre.numinia.world/ws' };

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

interface MeRecord {
  org: string;
  id: string;
  name: string;
  enabled: boolean;
  state: 'activa' | 'dormida';
  eligible: boolean;
  permissions: string[];
  worlds: { id: string; ws: string }[];
}

let kv: MemoryKv;
let env: Env;
let world: FakeWorld;
let bodies: MemoryNamespace<Cuerpo>;
let made: { body: Cuerpo; storage: MemoryStorage }[];
/** The fake till: the panel token that is each agent's now, and what `/me` says of it. */
let tokens: Map<string, MeRecord>;
/** What the fake numinia.com was asked: the URL and the Authorization header. */
let asked: { url: string; authorization: string | null }[];
/** How the fake numinia.com answers `/me`, when a test wants it to misbehave. */
let storeAnswer: (() => Promise<Response>) | null;
let seen: string[];
let secrets: string[];
let consoleSpies: ReturnType<typeof vi.spyOn>[];
let passCount: number;

const tokenFor = (seed: string): string => `ntk_${seed.repeat(43).slice(0, 43)}`;

function me(over: Partial<MeRecord> = {}): MeRecord {
  return {
    org: ORG,
    id: AGENT,
    name: 'Hermes de Ana',
    enabled: true,
    state: 'activa',
    eligible: true,
    permissions: ['enter-worlds', 'build'],
    worlds: [TORRE],
    ...over,
  };
}

/** A panel token for an agent, as Panel › Agents shows it once. */
function panelToken(seed: string, record: MeRecord = me()): string {
  const token = tokenFor(seed);
  tokens.set(token, record);
  secrets.push(token);
  return token;
}

/** The panel's «Renovar»: the old token stops working, a new one is the agent's. */
function renew(old: string, seed: string): string {
  const record = tokens.get(old) as MeRecord;
  tokens.delete(old);
  return panelToken(seed, record);
}

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : new Request(String(input), init);
  const url = new URL(request.url);
  if (url.origin !== STORE) return Response.json({ nombre: 'La Torre' }); // a world's /status
  const authorization = request.headers.get('Authorization');
  asked.push({ url: request.url, authorization });
  const token = authorization?.replace(/^Bearer /, '') ?? '';
  if (url.pathname === '/api/agents/me') {
    if (storeAnswer !== null) return storeAnswer();
    // The token alone (W11) or, from the body's checks, with its org and agent (W1).
    const record = tokens.get(token);
    const named = url.searchParams.get('agent');
    if (record === undefined || (named !== null && named !== record.id)) {
      return Response.json({ error: 'token', texto: 'no' }, { status: 401 });
    }
    return Response.json(record);
  }
  const body = JSON.parse(await request.text()) as { agent: string; aud: string };
  const record = tokens.get(token);
  if (record === undefined || record.id !== body.agent) {
    return Response.json({ error: 'token', texto: 'no' }, { status: 401 });
  }
  passCount += 1;
  const exp = Math.floor(Date.now() / 1000) + 600;
  const pass = `${b64({ alg: 'EdDSA' })}.${b64({ kind: 'agent', sub: record.id, aud: body.aud, state: record.state, exp, n: passCount })}.c2ln`;
  secrets.push(pass);
  return Response.json({ pass, exp });
}

beforeEach(() => {
  resetLimitsForTests();
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    now: new Date('2026-10-19T10:00:00Z'),
  });
  tokens = new Map();
  asked = [];
  storeAnswer = null;
  made = [];
  seen = [];
  secrets = [];
  passCount = 0;
  kv = new MemoryKv();
  const desks = new MemoryNamespace(() => new Plazas(durableState(), {} as Env));
  bodies = new MemoryNamespace(() => {
    const storage = new MemoryStorage();
    const body = new Cuerpo(durableState(storage), env);
    storage.ring = () => body.alarm();
    made.push({ body, storage });
    return body;
  });
  env = {
    OAUTH_KV: kv.asNamespace(),
    STORE_ORIGIN: STORE,
    CUERPO: bodies.as<DurableObjectNamespace<Cuerpo>>(),
    PLAZAS: desks.as<DurableObjectNamespace<Plazas>>(),
  };
  world = new FakeWorld();
  world.name = 'Hermes de Ana · IA';
  vi.stubGlobal('WebSocket', world.socketClass());
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(async () => {
  const everything = JSON.stringify({
    console: consoleSpies.map((spy) => spy.mock.calls),
    seen,
    storage: made.map(({ storage }) => [...storage.values]),
    status: await Promise.all(made.map(({ body }) => body.estado())),
    kv: [...kv.values.entries()],
    urls: asked.map((one) => one.url),
  });
  for (const secret of secrets) expect(everything).not.toContain(secret);
  for (const { body } of made) await body.salir();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function post(
  authorization: string | null,
  message: Record<string, unknown>,
  ip = '203.0.113.9',
): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'cf-connecting-ip': ip });
  if (authorization !== null) headers.set('Authorization', authorization);
  const response = await worker.fetch(
    new Request(`${ORIGIN}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...message }),
    }),
    env,
    ctx,
  );
  seen.push(await response.clone().text());
  return response;
}

const bearer = (token: string): string => `Bearer ${token}`;

interface ToolAnswer {
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

async function tool(token: string, name: string, args?: unknown): Promise<ToolAnswer> {
  const response = await post(bearer(token), {
    method: 'tools/call',
    params: { name, ...(args === undefined ? {} : { arguments: args }) },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result?: ToolAnswer; error?: unknown };
  expect(body.error).toBeUndefined();
  return body.result as ToolAnswer;
}

/** What a tool answers, read through the endpoint or straight from the relay's functions. */
interface Readable {
  readonly content: readonly { readonly text: string }[];
  readonly isError?: boolean | undefined;
}

const textOf = (answer: Readable): string => answer.content.map((part) => part.text).join('');

function structured(answer: ToolAnswer): Record<string, unknown> {
  expect(answer.isError, textOf(answer)).toBeUndefined();
  return answer.structuredContent as Record<string, unknown>;
}

function failed(answer: Readable): string {
  expect(answer.isError).toBe(true);
  return textOf(answer);
}

/** The library's ordinary refusal: 401 `invalid_token` with the challenge naming the metadata. */
async function expectRefused(response: Response): Promise<void> {
  expect(response.status).toBe(401);
  const challenge = response.headers.get('WWW-Authenticate') ?? '';
  expect(challenge).toMatch(/^Bearer /);
  expect(challenge).toContain(
    'resource_metadata="https://mcp.numinia.com/.well-known/oauth-protected-resource/mcp"',
  );
}

describe('a good panel token', () => {
  it('lists the tools and calls quien_soy and mundos, asking numinia.com with the token alone', async () => {
    const token = panelToken('Hm1');
    const init = await post(bearer(token), {
      method: 'initialize',
      params: { protocolVersion: '2025-06-18' },
    });
    expect(init.status).toBe(200);
    const listed = (await (await post(bearer(token), { method: 'tools/list' })).json()) as {
      result: { tools: { name: string }[] };
    };
    expect(listed.result.tools.map((one) => one.name)).toEqual([
      ...TOOLS.map((one) => one.name),
      ...bodyTools('llamada').map((one) => one.name),
    ]);

    const who = structured(await tool(token, 'quien_soy'));
    expect(who).toMatchObject({
      id: `${ORG}.${AGENT}`,
      agent: AGENT,
      organization: ORG,
      standing: 'activa',
      canEnter: true,
      hear: false,
    });
    expect(structured(await tool(token, 'mundos'))).toMatchObject({
      organization: ORG,
      worlds: [{ id: 'torre', on: true, enter: { tool: 'entrar', arguments: { mundo: 'torre' } } }],
    });

    // Each request is checked by the token alone: GET /api/agents/me, no query, the token in the header only.
    const byToken = asked.filter((one) => one.url === `${STORE}/api/agents/me`);
    expect(byToken.length).toBeGreaterThanOrEqual(4);
    for (const one of asked) expect(one.authorization).toBe(bearer(token));
    // No grant, no token, nothing written for a pasted token.
    expect([...kv.values.keys()]).toEqual([]);
  });

  it('enters the world under <org>.<agent>, uses a world tool and leaves', async () => {
    const token = panelToken('Hm2');
    expect(structured(await tool(token, 'entrar', { mundo: 'torre' }))).toMatchObject({
      world: 'torre',
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(bodies.asked).toEqual([`${ORG}.${AGENT}`]);
    expect(world.sockets).toHaveLength(1);
    expect(world.passes()).toHaveLength(1);

    const look = textOf(await tool(token, 'mirar', {}));
    expect(look).toContain('<material fiable="no">');
    expect(textOf(await tool(token, 'decir', { texto: 'Hola' }))).toBe('Dicho (cerca).');
    expect(world.intents()).toEqual([
      { feature: 'chat', name: 'decir', fields: { texto: 'Hola' } },
    ]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(structured(await tool(token, LEAVE_TOOL, {}))).toMatchObject({
      left: true,
      world: 'torre',
    });
    expect(bodies.asked.every((name) => name === `${ORG}.${AGENT}`)).toBe(true);
  });
});

describe('a bad token', () => {
  it('is the library’s ordinary 401 with the challenge, whatever is wrong with it', async () => {
    const good = panelToken('Hm3');
    const stranger = tokenFor('Zz9');
    secrets.push(stranger);
    for (const authorization of [
      null, // no header
      `Basic ${btoa('a:b')}`, // not a bearer
      bearer(`ntk_${'A'.repeat(42)}`), // not shaped like a panel token
      bearer(`ntk_${'A'.repeat(43)}!`), // nor this
      bearer('opaque-token'), // nor any other bearer
      bearer(stranger), // shaped like one, but no agent's
      `Bearer ${good} ${good}`, // two of them
    ]) {
      await expectRefused(await post(authorization, { method: 'tools/list' }));
    }
    // Only the well-shaped unknown one reached numinia.com.
    expect(asked).toEqual([{ url: `${STORE}/api/agents/me`, authorization: bearer(stranger) }]);
    const refused = await post(bearer(stranger), { method: 'tools/list' });
    expect(refused.headers.get('WWW-Authenticate')).toContain('error="invalid_token"');
    expect(await refused.json()).toEqual({
      error: 'invalid_token',
      error_description: 'Invalid access token',
    });
  });

  it('a renewed token is refused on the very next call, and the new one works', async () => {
    const token = panelToken('Hm4');
    expect(structured(await tool(token, 'quien_soy'))).toMatchObject({ agent: AGENT });
    const renewed = renew(token, 'Rn4');
    await expectRefused(await post(bearer(token), { method: 'tools/list' }));
    expect(structured(await tool(renewed, 'quien_soy'))).toMatchObject({ agent: AGENT });
  });
});

describe('a token revoked mid-session', () => {
  it('takes the body out at its next check, and the next call is a 401', async () => {
    const token = panelToken('Hm5');
    structured(await tool(token, 'entrar', { mundo: 'torre' }));
    await vi.advanceTimersByTimeAsync(300);
    const socket = world.sockets[0];
    expect(socket?.readyState).toBe(1);

    tokens.delete(token); // Panel › Agents › Revocar
    await vi.advanceTimersByTimeAsync(61_000); // the body's beat asks /me again
    const body = made[0]?.body as Cuerpo;
    expect((await body.estado()).inside).toBeNull();
    expect((await body.estado()).left?.reason).toBe('revoked');
    expect(socket?.closedBy).toBe('client');

    await expectRefused(await post(bearer(token), { method: 'tools/list' }));
    await expectRefused(
      await post(bearer(token), { method: 'tools/call', params: { name: 'mirar' } }),
    );
    // There was no grant to revoke, and none was made.
    expect([...kv.values.keys()]).toEqual([]);
  });

  it('when numinia.com refuses it between the check and the tool: words for whoever pasted it, nothing to revoke', async () => {
    const token = panelToken('Hm6');
    const props = { accountId: ORG, agentId: AGENT, token, via: STATIC_VIA, hear: false };
    const unwrapToken = vi.fn();
    const revokeGrant = vi.fn();
    const helpers = { unwrapToken, revokeGrant } as unknown as OAuthHelpers;
    const quiet: Env = { ...env, OAUTH_PROVIDER: helpers };
    tokens.delete(token);

    // The relay's own tools, through the MCP handler as the library hands it a resolved token.
    const reply = await handleMcp(
      new Request(`${ORIGIN}/mcp`, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'quien_soy' },
        }),
      }),
      quiet,
      { props, auth: { token } },
    );
    const answer = ((await reply.json()) as { result: ToolAnswer }).result;
    seen.push(JSON.stringify(answer));
    expect(failed(answer)).toBe(STATIC_REVOKED);
    expect(failed(await callTool('mundos', {}, { env: quiet, props, accessToken: null }))).toBe(
      STATIC_REVOKED,
    );
    // The body's tools: entrar is refused with the same words, and nothing is revoked.
    expect(
      failed(
        await callBodyTool('entrar', { mundo: 'torre' }, { env: quiet, props, accessToken: null }),
      ),
    ).toBe(STATIC_REVOKED);
    expect(unwrapToken).not.toHaveBeenCalled();
    expect(revokeGrant).not.toHaveBeenCalled();
    // A grant's AI still reads the grant's words.
    const granted = { ...props, via: 'mcp:claude.ai' };
    expect(
      failed(
        await callBodyTool(
          'entrar',
          { mundo: 'torre' },
          { env: quiet, props: granted, accessToken: null },
        ),
      ),
    ).toBe(REFUSALS.revoked);
    expect(
      failed(await callTool('mundos', {}, { env: quiet, props: granted, accessToken: null })),
    ).toBe(ERRORS.revoked);
  });

  it('after a renewal the body is out, and entering again with the old token says why', async () => {
    const token = panelToken('Hm7');
    const props = { accountId: ORG, agentId: AGENT, token, via: STATIC_VIA, hear: false };
    const call = { env, props, accessToken: null };
    structured(await tool(token, 'entrar', { mundo: 'torre' }));
    await vi.advanceTimersByTimeAsync(300);
    renew(token, 'Rn7');
    await vi.advanceTimersByTimeAsync(61_000);
    // The body left; a call that still carried the old token: not inside, and entrar says why.
    const answer = await callBodyTool('mirar', {}, call);
    seen.push(JSON.stringify(answer));
    expect(failed(answer)).toBe(REFUSALS['not-inside']);
    expect(failed(await callBodyTool('entrar', { mundo: 'torre' }, call))).toBe(STATIC_REVOKED);
  });
});

describe('numinia.com unavailable, and the per-address count', () => {
  it('busy is a 429 to wait a minute, down or not understood a 503: neither a 401', async () => {
    const token = panelToken('Hm8');
    storeAnswer = () => Promise.resolve(Response.json({ error: 'limite' }, { status: 429 }));
    const busy = await post(bearer(token), { method: 'tools/list' });
    expect(busy.status).toBe(429);
    expect(busy.headers.get('Retry-After')).toBe('60');
    expect(await busy.json()).toMatchObject({ error: 'temporarily_unavailable' });
    for (const answer of [
      () => Promise.reject(new TypeError('fetch failed')),
      () => Promise.resolve(new Response('oops', { status: 502 })),
      () => Promise.resolve(Response.json({ id: AGENT })), // not the contract
      () => Promise.resolve(Response.json({ error: 'peticion' }, { status: 400 })), // an older store
    ]) {
      storeAnswer = answer;
      const down = await post(bearer(token), { method: 'tools/list' });
      expect(down.status).toBe(503);
      expect(down.headers.get('WWW-Authenticate')).toBeNull();
      expect(await down.json()).toMatchObject({ error: 'temporarily_unavailable' });
    }
    storeAnswer = null;
    const unconfigured = { ...env, STORE_ORIGIN: 'http://numinia.com' };
    const response = await worker.fetch(
      new Request(`${ORIGIN}/mcp`, {
        method: 'POST',
        headers: { Authorization: bearer(token) },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
      unconfigured,
      ctx,
    );
    seen.push(await response.clone().text());
    expect(response.status).toBe(503);
  });

  it('counts panel tokens checked per address: past the limit a 429, another address untouched', async () => {
    const token = panelToken('Hm9');
    for (let i = 0; i < BEARER_PER_MINUTE; i += 1) {
      expect((await post(bearer(token), { method: 'ping' }, '198.51.100.1')).status).toBe(200);
    }
    const over = await post(bearer(token), { method: 'ping' }, '198.51.100.1');
    expect(over.status).toBe(429);
    expect(over.headers.get('Retry-After')).toBe('60');
    expect((await post(bearer(token), { method: 'ping' }, '198.51.100.2')).status).toBe(200);
    // Not shaped like a panel token: refused before it is counted or numinia.com is asked.
    const calls = asked.length;
    await expectRefused(await post(bearer('nope'), { method: 'ping' }, '198.51.100.1'));
    expect(asked.length).toBe(calls);
    await vi.advanceTimersByTimeAsync(60_000);
    expect((await post(bearer(token), { method: 'ping' }, '198.51.100.1')).status).toBe(200);
  });
});

describe('the pieces', () => {
  it('resolves a panel token to a grant’s props, bound to the resource', async () => {
    const token = panelToken('Hp1');
    const request = new Request(`${ORIGIN}/mcp`);
    expect(await resolveStaticBearer({ token, request, env })).toEqual({
      props: { accountId: ORG, agentId: AGENT, token, via: 'panel', hear: false },
      audience: RESOURCE,
    });
    expect(await resolveStaticBearer({ token: tokenFor('Unk'), request, env })).toBeNull();
    expect(await resolveStaticBearer({ token: 'a:b:c', request, env })).toBeNull();
  });

  it('tells a pasted token’s props from a grant’s', () => {
    expect(isStaticBearer({ via: STATIC_VIA })).toBe(true);
    for (const props of [{ via: 'mcp:claude.ai' }, {}, null, undefined, 'panel']) {
      expect(isStaticBearer(props)).toBe(false);
    }
  });

  it('asks /me with the token alone, by the public fetch when no way is given', async () => {
    const token = panelToken('Hp2');
    expect(await askMeByToken(STORE, token)).toMatchObject({ kind: 'ok', me: { id: AGENT } });
    expect(asked.at(-1)).toEqual({ url: `${STORE}/api/agents/me`, authorization: bearer(token) });
  });
});
