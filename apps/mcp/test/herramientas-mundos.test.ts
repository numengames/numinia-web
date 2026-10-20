/**
 * The relay's first tools (story W7), through the Worker as a client meets
 * them: a real grant made with the library's own helpers (props as
 * `/vuelta` writes them), its access token on `POST /mcp`, and a fake
 * numinia.com behind `GET /api/agents/me`. `tools/list` shows both first;
 * `mundos` gives what `/me` gives; `quien_soy`'s id is stable across calls
 * and reconnections; a switched-off AI is told so and gets no worlds;
 * numinia.com down is a tool error, not a protocol error; a `401` revokes
 * the grant so the client must connect again. The AI's token never shows in
 * a tool result, a response or a log line.
 */
import { getOAuthApi, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLimitsForTests } from '../src/limites';
import { RESOURCE } from '../src/config';
import {
  ENTER_TOOL,
  ERRORS,
  TOOLS,
  WHO_AM_I,
  WORLDS,
  callTool,
  type ToolCall,
} from '../src/herramientas';
import { askMe } from '../src/me';
import { handleMcp } from '../src/mcp';
import type { GrantProps } from '../src/vuelta';
import worker, { PROVIDER_OPTIONS, type Env } from '../src/worker';
import { MemoryKv } from './memory-kv';

const ORIGIN = 'https://mcp.numinia.com';
const STORE = 'https://numinia.com';
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const ORG = 'acc_team_numen_games';
const AGENT = 'claude-de-ana';
const TOKEN = `ntk_${'Tq9'.repeat(14)}x`;
const RENEWED = `ntk_${'Rn7'.repeat(14)}z`;

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
  worlds: { id: string; ws: string; name?: string; on?: boolean }[];
}

let kv: MemoryKv;
let env: Env;
/** The fake till: the token that is the agent's now, and what `/me` says of it. */
let current: { token: string; me: MeRecord };
/** What the fake store was asked. */
let storeCalls: { url: string; authorization: string | null }[];
/** How the fake store answers, when a test wants it to misbehave. */
let storeAnswer: (() => Promise<Response>) | null;
/** Every response body any test read. */
let seen: string[];
let consoleSpies: ReturnType<typeof vi.spyOn>[];

const torre = { id: 'torre', ws: 'wss://torre.numinia.world/ws' };
const plaza = { id: 'plaza', ws: 'wss://plaza.numinia.world/ws', name: 'La Plaza' };

function meRecord(over: Partial<MeRecord> = {}): MeRecord {
  return {
    org: ORG,
    id: AGENT,
    name: 'Claude de Ana',
    enabled: true,
    state: 'activa',
    eligible: true,
    permissions: ['enter-worlds', 'build'],
    worlds: [plaza, torre],
    ...over,
  };
}

async function fakeStore(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const authorization = new Headers(init?.headers).get('Authorization');
  storeCalls.push({ url: url.href, authorization });
  if (storeAnswer !== null) return storeAnswer();
  if (
    url.origin !== STORE ||
    url.pathname !== '/api/agents/me' ||
    authorization !== `Bearer ${current.token}` ||
    url.searchParams.get('org') !== current.me.org ||
    url.searchParams.get('agent') !== current.me.id
  ) {
    return Response.json({ error: 'token', texto: 'no' }, { status: 401 });
  }
  return Response.json(current.me);
}

beforeEach(() => {
  // The per-address limits of /register and /authorize (story W10) count every test as one address.
  resetLimitsForTests();
  kv = new MemoryKv();
  env = { OAUTH_KV: kv.asNamespace(), STORE_ORIGIN: STORE };
  current = { token: TOKEN, me: meRecord() };
  storeCalls = [];
  storeAnswer = null;
  seen = [];
  vi.stubGlobal('fetch', vi.fn(fakeStore));
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  // Whatever a test did: the AI's token in no log line, no response, no URL.
  const logged = JSON.stringify(consoleSpies.map((spy) => spy.mock.calls));
  for (const secret of [TOKEN, RENEWED]) {
    expect(logged).not.toContain(secret);
    for (const body of seen) expect(body).not.toContain(secret);
    for (const call of storeCalls) expect(call.url).not.toContain(secret);
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const helpers = (): OAuthHelpers => getOAuthApi(PROVIDER_OPTIONS, env);

async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: Buffer.from(digest).toString('base64url') };
}

interface Connection {
  readonly access: string;
  readonly refresh: string;
  readonly clientId: string;
}

/** A grant as `/vuelta` makes it (props with the AI's token), and its tokens. */
async function connect(token = TOKEN): Promise<Connection> {
  const api = helpers();
  const client = await api.createClient({
    redirectUris: [CALLBACK],
    clientName: 'Claude',
    tokenEndpointAuthMethod: 'none',
  });
  const { verifier, challenge } = await pkce();
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: CALLBACK,
    scope: 'mundos offline_access',
    state: 's',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: RESOURCE,
  });
  const request = await api.parseAuthRequest(new Request(`${ORIGIN}/authorize?${query}`));
  const props: GrantProps = {
    accountId: ORG,
    agentId: AGENT,
    token,
    via: 'mcp:claude.ai',
    hear: false,
    connectedAt: Math.floor(Date.now() / 1000),
  };
  const { redirectTo } = await api.completeAuthorization({
    request,
    userId: `${ORG}.${AGENT}`,
    metadata: { app: 'Claude', via: 'mcp:claude.ai' },
    scope: request.scope,
    props,
  });
  const code = new URL(redirectTo).searchParams.get('code') ?? '';
  const issued = await worker.fetch(
    new Request(`${ORIGIN}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK,
        client_id: client.clientId,
        code_verifier: verifier,
        resource: RESOURCE,
      }).toString(),
    }),
    env,
    ctx,
  );
  const tokens = (await issued.json()) as { access_token: string; refresh_token: string };
  return { access: tokens.access_token, refresh: tokens.refresh_token, clientId: client.clientId };
}

/** One JSON-RPC message to `/mcp` with an access token; the raw response. */
async function post(access: string, message: Record<string, unknown>): Promise<Response> {
  const response = await worker.fetch(
    new Request(`${ORIGIN}/mcp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...message }),
    }),
    env,
    ctx,
  );
  seen.push(await response.clone().text());
  return response;
}

interface ToolAnswer {
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** `tools/call` of a tool; the call's result (a protocol error fails the test). */
async function tool(access: string, name: string, args?: unknown): Promise<ToolAnswer> {
  const response = await post(access, {
    method: 'tools/call',
    params: { name, ...(args === undefined ? {} : { arguments: args }) },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result?: ToolAnswer; error?: unknown };
  expect(body.error).toBeUndefined();
  return body.result as ToolAnswer;
}

/** A successful tool answer: structured, and the same JSON as text. */
function structured(answer: ToolAnswer): Record<string, unknown> {
  expect(answer.isError).toBeUndefined();
  expect(answer.content).toEqual([
    { type: 'text', text: JSON.stringify(answer.structuredContent) },
  ]);
  return answer.structuredContent as Record<string, unknown>;
}

function errorText(answer: ToolAnswer): string {
  expect(answer.isError).toBe(true);
  expect(answer.structuredContent).toBeUndefined();
  return answer.content.map((part) => part.text).join('');
}

describe('tools/list', () => {
  it('shows quien_soy and mundos first, with no input and a short description for an AI', async () => {
    const { access } = await connect();
    const response = await post(access, { method: 'tools/list' });
    const { result } = (await response.json()) as {
      result: { tools: { name: string; description: string; inputSchema: unknown }[] };
    };
    // The body's tools follow (herramientas-cuerpo.test.ts).
    const own = result.tools.slice(0, 2);
    expect(own.map((listed) => listed.name)).toEqual(['quien_soy', 'mundos']);
    expect(own).toEqual(TOOLS);
    for (const listed of own) {
      expect(listed.inputSchema).toEqual({
        type: 'object',
        properties: {},
        additionalProperties: false,
      });
      expect(listed.description.length).toBeLessThan(320);
    }
    // Listing asks numinia.com once, for the AI's `hear` setting (whether `oir` is listed).
    expect(storeCalls).toHaveLength(1);
  });
});

describe('quien_soy', () => {
  it('says who the AI is, asking numinia.com with its token as the Bearer only', async () => {
    const { access } = await connect();
    const who = structured(await tool(access, WHO_AM_I));
    expect(who).toEqual({
      id: `${ORG}.${AGENT}`,
      agent: AGENT,
      organization: ORG,
      name: 'Claude de Ana',
      enabled: true,
      state: 'activa',
      standing: 'activa',
      canEnter: true,
      permissions: ['enter-worlds', 'build'],
      hear: false,
      note: expect.stringContaining('active') as unknown as string,
    });
    expect(storeCalls).toEqual([
      {
        url: `${STORE}/api/agents/me?org=${ORG}&agent=${AGENT}`,
        authorization: `Bearer ${TOKEN}`,
      },
    ]);
  });

  it('keeps the same id across calls and after the AI is connected again (token renewed)', async () => {
    const first = await connect();
    const a = structured(await tool(first.access, WHO_AM_I));
    const b = structured(await tool(first.access, WHO_AM_I, {}));
    // Reconnected: numinia.com renewed the token; a new grant carries it.
    current = { token: RENEWED, me: meRecord({ name: 'Claude de Ana (2)' }) };
    const second = await connect(RENEWED);
    const c = structured(await tool(second.access, WHO_AM_I));
    expect([a.id, b.id, c.id]).toEqual([`${ORG}.${AGENT}`, `${ORG}.${AGENT}`, `${ORG}.${AGENT}`]);
    expect(c.name).toBe('Claude de Ana (2)');
  });

  it('says so when the AI is switched off, has no one answering for it or no permission', async () => {
    const { access } = await connect();
    const cases: [Partial<MeRecord>, string, RegExp][] = [
      [{ enabled: false, worlds: [] }, 'apagada', /switched off/],
      [{ eligible: false, worlds: [] }, 'sin-responsable', /No one answers for you/],
      [{ permissions: ['build'], worlds: [] }, 'sin-permiso', /roles do not let you/],
      [{ state: 'dormida' }, 'dormida', /asleep/],
    ];
    for (const [over, standing, note] of cases) {
      current.me = meRecord(over);
      const who = structured(await tool(access, WHO_AM_I));
      expect(who.standing).toBe(standing);
      expect(who.canEnter).toBe(standing === 'dormida');
      expect(String(who.note)).toMatch(note);
      expect(who.hear).toBe(false);
    }
    current.me = meRecord({ enabled: false, worlds: [] });
    expect(structured(await tool(access, WHO_AM_I)).enabled).toBe(false);
  });
});

describe('mundos', () => {
  it('returns the worlds /me gives, on, with how to enter each, and never their address', async () => {
    current.me = meRecord({
      worlds: [plaza, torre, { id: 'cripta', ws: 'wss://c/ws', on: false }],
    });
    const { access } = await connect();
    const answer = await tool(access, WORLDS);
    expect(structured(answer)).toEqual({
      organization: ORG,
      worlds: [
        {
          id: 'plaza',
          name: 'La Plaza',
          on: true,
          enter: { tool: ENTER_TOOL, arguments: { mundo: 'plaza' } },
        },
        { id: 'torre', on: true, enter: { tool: ENTER_TOOL, arguments: { mundo: 'torre' } } },
        { id: 'cripta', on: false, enter: { tool: ENTER_TOOL, arguments: { mundo: 'cripta' } } },
      ],
      note: expect.stringContaining('«entrar»') as unknown as string,
    });
    expect(answer.content[0]?.text).not.toContain('wss://');
  });

  it('returns none, with the reason, when the AI may not enter or nothing is on', async () => {
    const { access } = await connect();
    const cases: [Partial<MeRecord>, string][] = [
      [{ enabled: false, worlds: [] }, 'apagada'],
      [{ eligible: false, worlds: [] }, 'sin-responsable'],
      [{ permissions: [], worlds: [] }, 'sin-permiso'],
      [{ worlds: [] }, 'sin-mundos'],
      [{ state: 'dormida', worlds: [] }, 'sin-mundos'],
    ];
    for (const [over, reason] of cases) {
      current.me = meRecord(over);
      const listed = structured(await tool(access, WORLDS));
      expect(listed.worlds).toEqual([]);
      expect(listed.reason).toBe(reason);
      expect(typeof listed.note).toBe('string');
    }
  });

  it('lists the worlds of an AI that is asleep (it may enter, at rest)', async () => {
    current.me = meRecord({ state: 'dormida', worlds: [torre] });
    const { access } = await connect();
    const listed = structured(await tool(access, WORLDS));
    expect(listed.reason).toBeUndefined();
    expect((listed.worlds as unknown[]).length).toBe(1);
  });
});

describe('when numinia.com does not answer well: a tool error, not a protocol error', () => {
  it.each([
    [
      'unreachable',
      async (): Promise<Response> => Promise.reject(new Error('offline')),
      ERRORS.down,
    ],
    ['a 500', async (): Promise<Response> => new Response('oops', { status: 500 }), ERRORS.down],
    [
      'a 503',
      async (): Promise<Response> => Response.json({ error: 'no-vinculado' }, { status: 503 }),
      ERRORS.down,
    ],
    [
      'busy (429)',
      async (): Promise<Response> => Response.json({ error: 'limite' }, { status: 429 }),
      ERRORS.busy,
    ],
    [
      'a 200 that is not JSON',
      async (): Promise<Response> => new Response('<html>', { status: 200 }),
      ERRORS.odd,
    ],
    [
      'a 200 off the contract',
      async (): Promise<Response> => Response.json({ org: ORG, id: AGENT }),
      ERRORS.odd,
    ],
    [
      'a 400',
      async (): Promise<Response> => Response.json({ error: 'peticion' }, { status: 400 }),
      ERRORS.odd,
    ],
  ])('%s', async (_name, answer, text) => {
    const { access } = await connect();
    storeAnswer = answer;
    for (const name of [WHO_AM_I, WORLDS]) expect(errorText(await tool(access, name))).toBe(text);
    // The grant is untouched: once numinia.com answers, the tools work again.
    storeAnswer = null;
    expect(structured(await tool(access, WHO_AM_I)).id).toBe(`${ORG}.${AGENT}`);
  });

  it('says the relay is not configured when it has no STORE_ORIGIN, and asks nobody', async () => {
    const { access } = await connect();
    delete env.STORE_ORIGIN;
    expect(errorText(await tool(access, WORLDS))).toBe(ERRORS.unconfigured);
    expect(storeCalls).toEqual([]);
  });
});

describe('a token revoked or renewed on numinia.com (401)', () => {
  it('revokes the grant: the tool says to connect again, and the client’s next call is a 401', async () => {
    const { access, refresh, clientId } = await connect();
    // The person pressed «Revocar» (or renewed the token) in Panel › Agents.
    current = { token: RENEWED, me: meRecord() };
    expect(errorText(await tool(access, WORLDS))).toBe(ERRORS.revoked);
    expect([...kv.values.keys()].filter((key) => key.startsWith('grant:'))).toEqual([]);

    const again = await post(access, { method: 'tools/list' });
    expect(again.status).toBe(401);
    expect(again.headers.get('WWW-Authenticate')).toContain('resource_metadata=');
    const refreshed = await worker.fetch(
      new Request(`${ORIGIN}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh,
          client_id: clientId,
        }).toString(),
      }),
      env,
      ctx,
    );
    expect(refreshed.status).toBe(400);
    expect(((await refreshed.json()) as { error: string }).error).toBe('invalid_grant');
  });

  it('revokes only that grant: the newer one of the same AI, reconnected, keeps working', async () => {
    const old = await connect(TOKEN);
    current = { token: RENEWED, me: meRecord() };
    const fresh = await connect(RENEWED);
    expect(errorText(await tool(old.access, WHO_AM_I))).toBe(ERRORS.revoked);
    expect(structured(await tool(fresh.access, WHO_AM_I)).id).toBe(`${ORG}.${AGENT}`);
  });

  it('still says to connect again when the grant cannot be found or revoked', async () => {
    current = { token: RENEWED, me: meRecord() };
    const props = { accountId: ORG, agentId: AGENT, token: TOKEN };
    // No library helpers, no access token, a token the library does not know, KV failing.
    const real = helpers();
    const failing = {
      ...real,
      unwrapToken: async () => Promise.reject(new Error('KV down')),
    } as OAuthHelpers;
    const bare: Env = { OAUTH_KV: env.OAUTH_KV, STORE_ORIGIN: STORE };
    const calls: ToolCall[] = [
      { env: bare, props, accessToken: 'a:b:c' },
      { env: { ...env, OAUTH_PROVIDER: real }, props, accessToken: null },
      { env: { ...env, OAUTH_PROVIDER: real }, props, accessToken: 'nobody:none:x' },
      { env: { ...env, OAUTH_PROVIDER: failing }, props, accessToken: 'a:b:c' },
    ];
    for (const call of calls) {
      const answer = await callTool(WHO_AM_I, undefined, call);
      seen.push(JSON.stringify(answer));
      expect(answer).toEqual({ content: [{ type: 'text', text: ERRORS.revoked }], isError: true });
    }
  });
});

describe('what a call brings', () => {
  it('takes no arguments: {} and none are fine, anything else is a tool error', async () => {
    const { access } = await connect();
    expect(structured(await tool(access, WHO_AM_I, null)).agent).toBe(AGENT);
    for (const args of [{ mundo: 'torre' }, ['x'], 'x', 1]) {
      expect(errorText(await tool(access, WORLDS, args))).toBe(ERRORS.arguments);
    }
  });

  it('answers an unknown tool or a call without a name with Invalid params', async () => {
    const { access } = await connect();
    const unknown = (await (
      await post(access, { method: 'tools/call', params: { name: 'volar' } })
    ).json()) as { error: { code: number; message: string } };
    expect(unknown.error).toEqual({ code: -32602, message: 'Unknown tool: volar' });
    for (const params of [undefined, { arguments: {} }, { name: 7 }, []]) {
      const body = (await (await post(access, { method: 'tools/call', params })).json()) as {
        error: { code: number };
      };
      expect(body.error.code).toBe(-32602);
    }
  });

  it('says the connection carries no AI when the grant has no props the tools read', async () => {
    const request = (): Request =>
      new Request(`${ORIGIN}/mcp`, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 9,
          method: 'tools/call',
          params: { name: WHO_AM_I },
        }),
      });
    for (const context of [
      {},
      { props: { connectedAt: 1 } },
      { props: null, auth: { token: 3 } },
    ]) {
      const body = (await (await handleMcp(request(), env, context)).json()) as {
        result: ToolAnswer;
      };
      expect(errorText(body.result)).toBe(ERRORS.noAi);
    }
    expect(storeCalls).toEqual([]);
  });

  it('asks /me for one agent and sorts a refusal that is not about the token', async () => {
    storeAnswer = async () => Response.json({ error: 'x' }, { status: 403 });
    expect(await askMe(STORE, { accountId: ORG, agentId: AGENT, token: TOKEN })).toEqual({
      kind: 'refused',
    });
  });
});
