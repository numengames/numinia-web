/**
 * The authorization hand-off (story W6), end to end with a fake numinia.com:
 * a client registers, `/authorize` sends the browser to the consent page
 * with a one-time `req` and its own cookie, numinia.com hands the AI's
 * token over through the relay's `HandOffDesk` (sealed at once), `/vuelta`
 * checks the cookie and the token with the store's `/api/agents/me` and
 * issues the code, the code becomes tokens and `/mcp` answers. And every
 * way it must NOT issue a code: no cookie, a reused or unknown request, a
 * token the till does not know. The AI's token is never in a URL, a page,
 * a header to the browser, a log line or KV in clear.
 */
import { getOAuthApi, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLimitsForTests } from '../src/limites';
import { clientDisplayName, handleDefault } from '../src/authorize';
import {
  CONNECTION_MAX_SECONDS,
  REFRESH_TOKEN_IDLE_TTL_SECONDS,
  REQUEST_TTL_SECONDS,
} from '../src/config';
import { storeOrigin } from '../src/env';
import { askRequest, cookieName, keepHandOff, readPending } from '../src/handoff';
import { consentPath, localeOf, stopPage } from '../src/pages';
import { fromBase64Url, open, seal, toBase64Url } from '../src/seal';
import { grantUserId, readCookie, type GrantProps } from '../src/vuelta';
import worker, { capRefresh, HandOffDesk, PROVIDER_OPTIONS, type Env } from '../src/worker';
import { MemoryKv } from './memory-kv';

const ORIGIN = 'https://mcp.numinia.com';
const STORE = 'https://numinia.com';
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const ORG = 'acc_team_numen_games';
const AGENT = 'claude-de-ana';
const TOKEN = `ntk_${'Tq9'.repeat(14)}x`;
const OTHER_TOKEN = `ntk_${'Zz8'.repeat(14)}y`;
const DAY = 24 * 60 * 60;

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

let kv: MemoryKv;
let env: Env;
/** The tokens the fake till knows, by token: its agent. */
let till: Map<string, { org: string; id: string }>;
/** What the fake store was asked, URL and Authorization, in order. */
let storeCalls: { url: string; authorization: string | null }[];
/** How the fake store answers, when a test wants it to misbehave. */
let storeAnswer: ((url: URL) => Promise<Response>) | null;
/** Every URL any response sent a browser to. */
let locations: string[];
let consoleSpies: ReturnType<typeof vi.spyOn>[];

async function fakeStore(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const authorization = new Headers(init?.headers).get('Authorization');
  storeCalls.push({ url: url.href, authorization });
  if (storeAnswer !== null) return storeAnswer(url);
  if (url.origin !== STORE || url.pathname !== '/api/agents/me') {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  const agent = till.get((authorization ?? '').replace(/^Bearer /, ''));
  if (
    agent === undefined ||
    agent.org !== url.searchParams.get('org') ||
    agent.id !== url.searchParams.get('agent')
  ) {
    return Response.json({ error: 'token', texto: 'no' }, { status: 401 });
  }
  return Response.json(meOf(agent.org, agent.id));
}

/** numinia.com's whole `GET /api/agents/me` answer (W1's contract) for an agent. */
function meOf(org: string, id: string): Record<string, unknown> {
  return {
    org,
    id,
    name: 'Claude de Ana',
    enabled: true,
    state: 'activa',
    eligible: true,
    permissions: ['enter-worlds'],
    worlds: [],
  };
}

beforeEach(() => {
  // The per-address limits of /register and /authorize (story W10) count every test as one address.
  resetLimitsForTests();
  kv = new MemoryKv();
  env = { OAUTH_KV: kv.asNamespace(), STORE_ORIGIN: STORE };
  till = new Map([[TOKEN, { org: ORG, id: AGENT }]]);
  storeCalls = [];
  storeAnswer = null;
  locations = [];
  vi.stubGlobal('fetch', vi.fn(fakeStore));
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  // Whatever a test did, the token never reached a log line or a browser's address.
  const logged = JSON.stringify(consoleSpies.map((spy) => spy.mock.calls));
  expect(logged).not.toContain(TOKEN);
  for (const location of locations) expect(location).not.toContain(TOKEN);
  for (const call of storeCalls) expect(call.url).not.toContain(TOKEN);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function call(path: string, init?: RequestInit): Promise<Response> {
  const response = await worker.fetch(new Request(`${ORIGIN}${path}`, init), env, ctx);
  const location = response.headers.get('Location');
  if (location !== null) locations.push(location);
  return response;
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(digest) };
}

/** A public client registered as Claude does when it does not use CIMD. */
async function register(name: string | null = 'Claude'): Promise<string> {
  const response = await call('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(name === null ? {} : { client_name: name }),
      redirect_uris: [CALLBACK],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  expect(response.status).toBe(201);
  return String((await json(response)).client_id);
}

function authorizeQuery(clientId: string, challenge: string, over: Record<string, string> = {}) {
  return new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CALLBACK,
    scope: 'mundos offline_access',
    state: 'state-1',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: `${ORIGIN}/mcp`,
    ...over,
  }).toString();
}

interface Started {
  readonly clientId: string;
  readonly verifier: string;
  readonly req: string;
  /** `name=value`, as the browser sends it back. */
  readonly cookie: string;
  readonly consent: URL;
}

/** /authorize, as the client opens it in the browser. */
async function start(
  options: { lang?: string; scope?: string; name?: string | null } = {},
): Promise<Started> {
  const clientId = await register(options.name === undefined ? 'Claude' : options.name);
  const { verifier, challenge } = await pkce();
  const response = await call(
    `/authorize?${authorizeQuery(clientId, challenge, options.scope === undefined ? {} : { scope: options.scope })}`,
    { headers: { 'Accept-Language': options.lang ?? 'en' } },
  );
  expect(response.status).toBe(302);
  const consent = new URL(response.headers.get('Location') ?? '');
  const req = consent.searchParams.get('req') ?? '';
  const setCookie = response.headers.get('Set-Cookie') ?? '';
  const cookie = setCookie.split(';')[0] ?? '';
  return { clientId, verifier, req, cookie, consent };
}

const desk = (): HandOffDesk => new HandOffDesk(ctx, env);

/** numinia.com's side once the person pressed «Conectar»: the store's hand-off. */
function handOff(req: string, over: Record<string, unknown> = {}) {
  return {
    req,
    accountId: ORG,
    agentId: AGENT,
    via: 'mcp:claude.ai',
    hear: false,
    token: TOKEN,
    ...over,
  };
}

function vuelta(req: string, cookie: string | null): Promise<Response> {
  return call(`/vuelta?req=${req}`, {
    headers: { ...(cookie === null ? {} : { Cookie: cookie }), 'Accept-Language': 'es' },
  });
}

function tokenRequest(fields: Record<string, string>): Promise<Response> {
  return call('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
}

/** Nothing in KV holds the token in clear. */
function expectKvClean(): void {
  for (const value of kv.values.values()) expect(value).not.toContain(TOKEN);
}

/** A plain page and no code: no redirect, nothing of the request echoed. */
async function expectNoCode(response: Response, status = 400): Promise<void> {
  expect(response.status).toBe(status);
  expect(response.headers.get('Location')).toBeNull();
  expect(response.headers.get('Content-Type')).toContain('text/html');
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const page = await response.text();
  expect(page).not.toContain('code=');
  expect(page).not.toContain(TOKEN);
}

describe('the whole flow, with PKCE', () => {
  it('authorize → consent with req → sealed hand-off → vuelta → code → token → /mcp 200', async () => {
    const started = await start({ lang: 'es-ES,es;q=0.9,en;q=0.8' });
    // The consent page in Spanish, with the client's name, its host and the request.
    expect(`${started.consent.origin}${started.consent.pathname}`).toBe(
      'https://numinia.com/es/conectar-ia/',
    );
    expect(started.consent.searchParams.get('app')).toBe('Claude');
    expect(started.consent.searchParams.get('host')).toBe('claude.ai');
    expect(started.req).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    expect(started.cookie.startsWith(`${cookieName(started.req)}=`)).toBe(true);

    // numinia.com checks what the page showed, then hands the token over.
    expect(await desk().ask(started.req)).toEqual({ ok: true, app: 'Claude', host: 'claude.ai' });
    const kept = await desk().keep(handOff(started.req));
    expect(kept).toEqual({ ok: true, next: `${ORIGIN}/vuelta?req=${started.req}` });
    expectKvClean();

    // Back at the relay with the cookie: the code goes to the client.
    const back = await vuelta(started.req, started.cookie);
    expect(back.status).toBe(302);
    const to = new URL(back.headers.get('Location') ?? '');
    expect(`${to.origin}${to.pathname}`).toBe(CALLBACK);
    expect(to.searchParams.get('state')).toBe('state-1');
    expect(to.searchParams.get('iss')).toBe(ORIGIN);
    const code = to.searchParams.get('code') ?? '';
    expect(code).not.toBe('');
    expect(back.headers.get('Set-Cookie')).toContain(`${cookieName(started.req)}=; Max-Age=0`);
    // The till was asked once, with the token as the Bearer and never in the URL.
    expect(storeCalls).toEqual([
      {
        url: `${STORE}/api/agents/me?org=${ORG}&agent=${AGENT}`,
        authorization: `Bearer ${TOKEN}`,
      },
    ]);

    const issued = await tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK,
      client_id: started.clientId,
      code_verifier: started.verifier,
      resource: `${ORIGIN}/mcp`,
    });
    expect(issued.status).toBe(200);
    const tokens = await json(issued);
    expect(tokens.scope).toBe('mundos offline_access');
    expect(typeof tokens.refresh_token).toBe('string');

    const listed = await call('/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${String(tokens.access_token)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'quien_soy' },
      }),
    });
    expect(listed.status).toBe(200);
    // The tool reads the grant's props and asks numinia.com with the AI's token.
    const who = (await json(listed)) as { result: { structuredContent: Record<string, unknown> } };
    expect(who.result.structuredContent).toMatchObject({ id: `${ORG}.${AGENT}`, enabled: true });
    expect(storeCalls.at(-1)?.authorization).toBe(`Bearer ${TOKEN}`);

    // The grant: the agent in its organization, the token inside the props (encrypted).
    const helpers = getOAuthApi(PROVIDER_OPTIONS, env);
    const grants = await helpers.listUserGrants(grantUserId(ORG, AGENT));
    expect(grants.items).toHaveLength(1);
    expect(grants.items[0]?.scope).toEqual(['mundos', 'offline_access']);
    expect(grants.items[0]?.metadata).toEqual({ app: 'Claude', via: 'mcp:claude.ai' });
    const summary = await helpers.unwrapToken<GrantProps>(String(tokens.access_token));
    expect(summary?.grant.props).toMatchObject({
      accountId: ORG,
      agentId: AGENT,
      token: TOKEN,
      via: 'mcp:claude.ai',
      hear: false,
    });
    expect(typeof summary?.grant.props.connectedAt).toBe('number');
    expectKvClean();

    // The request was used: the same link again gives no code.
    await expectNoCode(await vuelta(started.req, started.cookie));
    expect(await desk().ask(started.req)).toEqual({ ok: false });
  });

  it('asks only for mundos when the client did not ask for offline_access', async () => {
    const started = await start({ scope: 'mundos' });
    await desk().keep(handOff(started.req));
    const back = await vuelta(started.req, started.cookie);
    const code = new URL(back.headers.get('Location') ?? '').searchParams.get('code') ?? '';
    const issued = await tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK,
      client_id: started.clientId,
      code_verifier: started.verifier,
    });
    expect((await json(issued)).scope).toBe('mundos');
  });
});

describe('/vuelta issues no code', () => {
  it('without the request’s cookie — and the request is burnt, even for its own browser', async () => {
    const started = await start();
    await desk().keep(handOff(started.req));
    await expectNoCode(await vuelta(started.req, null));
    await expectNoCode(await vuelta(started.req, started.cookie));
    expect(storeCalls).toEqual([]);
  });

  it('with another request’s cookie, or an empty one', async () => {
    const first = await start();
    const second = await start();
    await desk().keep(handOff(first.req));
    const theirs = `${cookieName(first.req)}=${second.cookie.split('=').slice(1).join('=')}`;
    await expectNoCode(await vuelta(first.req, theirs));
    await desk().keep(handOff(second.req));
    await expectNoCode(await vuelta(second.req, `${cookieName(second.req)}=`));
  });

  it('for a reused request', async () => {
    const started = await start();
    await desk().keep(handOff(started.req));
    expect((await vuelta(started.req, started.cookie)).status).toBe(302);
    await expectNoCode(await vuelta(started.req, started.cookie));
  });

  it('for an unknown, malformed or expired request, or one never consented', async () => {
    await expectNoCode(await vuelta('unknown_request_id_0000', 'a=b'));
    const malformed = await call('/vuelta?req=short');
    await expectNoCode(malformed);
    expect(malformed.headers.get('Set-Cookie')).toBeNull();
    await expectNoCode(await call('/vuelta'));

    const never = await start();
    await expectNoCode(await vuelta(never.req, never.cookie));

    vi.useFakeTimers({ toFake: ['Date'] });
    const late = await start();
    await desk().keep(handOff(late.req));
    vi.setSystemTime(Date.now() + (REQUEST_TTL_SECONDS + 1) * 1000);
    await expectNoCode(await vuelta(late.req, late.cookie));
  });

  it('for a token whose hash the till does not know', async () => {
    const started = await start();
    await desk().keep(handOff(started.req, { token: OTHER_TOKEN }));
    await expectNoCode(await vuelta(started.req, started.cookie));
    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]?.authorization).toBe(`Bearer ${OTHER_TOKEN}`);
    expect(storeCalls[0]?.url).not.toContain(OTHER_TOKEN);
    const helpers = getOAuthApi(PROVIDER_OPTIONS, env);
    expect((await helpers.listUserGrants(grantUserId(ORG, AGENT))).items).toEqual([]);
  });

  it('when the till answers for another agent, or not in JSON', async () => {
    const first = await start();
    await desk().keep(handOff(first.req));
    storeAnswer = async () => Response.json(meOf(ORG, 'otra-ia'));
    await expectNoCode(await vuelta(first.req, first.cookie));
    const second = await start();
    await desk().keep(handOff(second.req));
    storeAnswer = async () => new Response('<html>', { status: 200 });
    await expectNoCode(await vuelta(second.req, second.cookie));
  });

  it('when the till is down or busy: «not now» (502)', async () => {
    for (const answer of [
      async (): Promise<Response> => Promise.reject(new Error('offline')),
      async (): Promise<Response> => new Response(null, { status: 500 }),
      async (): Promise<Response> => new Response(null, { status: 429 }),
    ]) {
      const started = await start();
      await desk().keep(handOff(started.req));
      storeAnswer = answer;
      await expectNoCode(await vuelta(started.req, started.cookie), 502);
      storeAnswer = null;
    }
  });

  it('when the setting or the library helpers are missing (503)', async () => {
    const started = await start();
    await desk().keep(handOff(started.req));
    env.STORE_ORIGIN = 'http://numinia.com';
    await expectNoCode(await vuelta(started.req, started.cookie), 503);

    env.STORE_ORIGIN = STORE;
    const again = await start();
    await desk().keep(handOff(again.req));
    const request = new Request(`${ORIGIN}/vuelta?req=${again.req}`, {
      headers: { Cookie: again.cookie },
    });
    await expectNoCode(
      await handleDefault(request, { OAUTH_KV: env.OAUTH_KV, STORE_ORIGIN: STORE }),
      503,
    );
  });

  it('when the library cannot complete the authorization (502)', async () => {
    const started = await start();
    await desk().keep(handOff(started.req));
    const real = getOAuthApi(PROVIDER_OPTIONS, env);
    env.OAUTH_PROVIDER = {
      ...real,
      completeAuthorization: async () => Promise.reject(new Error('KV down')),
    } as OAuthHelpers;
    await expectNoCode(await vuelta(started.req, started.cookie), 502);
  });

  it('when the sealed hand-off is not what the relay sealed for this request', async () => {
    const cases: ((publicKey: string, req: string) => Promise<string>)[] = [
      // Not sealed at all.
      async () => JSON.stringify({ epk: 'AA', iv: 'AA', data: 'AA' }),
      // Sealed, but not JSON.
      async (publicKey, req) => JSON.stringify(await seal(publicKey, 'not json', req)),
      // Sealed JSON of another shape.
      async (publicKey, req) => JSON.stringify(await seal(publicKey, '{"req":1}', req)),
      // Sealed for this request but naming another.
      async (publicKey, req) =>
        JSON.stringify(
          await seal(publicKey, JSON.stringify(handOff('another_request_id_00')), req),
        ),
    ];
    for (const sealed of cases) {
      const started = await start();
      const pending = await readPending(env, started.req);
      await kv.put(
        `vuelta:sealed:${started.req}`,
        await sealed(pending?.publicKey ?? '', started.req),
      );
      await expectNoCode(await vuelta(started.req, started.cookie));
    }
    expect(storeCalls).toEqual([]);
  });
});

describe('the hand-off desk (numinia.com’s service binding)', () => {
  it('answers what the consent page was told, and nothing for a request it is not waiting for', async () => {
    const started = await start({ name: `  ${'Ñ'.repeat(50)}  ` });
    expect(await askRequest(env, started.req)).toEqual({
      ok: true,
      app: 'Ñ'.repeat(40),
      host: 'claude.ai',
    });
    expect(started.consent.searchParams.get('app')).toBe('Ñ'.repeat(40));
    for (const req of [42, null, 'short', 'unknown_request_id_0000']) {
      expect(await desk().ask(req)).toEqual({ ok: false });
    }
  });

  it('refuses a malformed hand-off, an unknown request, another host, or a second hand-off', async () => {
    const started = await start();
    for (const wrong of [
      null,
      handOff(started.req, { token: 'ntk_short' }),
      handOff(started.req, { agentId: 'Not An Id' }),
      handOff(started.req, { hear: 'no' }),
      handOff('unknown_request_id_0000'),
      handOff(started.req, { via: 'mcp:evil.example' }),
    ]) {
      expect(await keepHandOff(env, wrong)).toEqual({ ok: false });
    }
    expect(await desk().keep(handOff(started.req))).toMatchObject({ ok: true });
    expect(await desk().keep(handOff(started.req, { token: OTHER_TOKEN }))).toEqual({ ok: false });
    // The first hand-off stands: the code is for the token handed over first.
    const back = await vuelta(started.req, started.cookie);
    expect(back.status).toBe(302);
  });

  it('refuses a request past its 10 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const started = await start();
    vi.setSystemTime(Date.now() + (REQUEST_TTL_SECONDS + 1) * 1000);
    expect(await desk().keep(handOff(started.req))).toEqual({ ok: false });
    expect(await desk().ask(started.req)).toEqual({ ok: false });
  });

  it('keeps the sealed hand-off no longer than its request, and at least KV’s minute', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const started = await start();
    vi.setSystemTime(Date.now() + (REQUEST_TTL_SECONDS - 10) * 1000);
    await desk().keep(handOff(started.req));
    expect(kv.lastWrite('vuelta:sealed:')?.options?.expirationTtl).toBe(60);
    expect(kv.lastWrite('vuelta:req:')?.options?.expirationTtl).toBe(REQUEST_TTL_SECONDS);
  });
});

describe('/authorize', () => {
  it('sets the request’s own cookie: host-only, HttpOnly, Secure, Lax, 10 minutes', async () => {
    const clientId = await register();
    const { challenge } = await pkce();
    const response = await call(`/authorize?${authorizeQuery(clientId, challenge)}`);
    const setCookie = response.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toMatch(/^__Host-vuelta-[A-Za-z0-9_-]{43}=[A-Za-z0-9_-]+; /);
    expect(setCookie).toContain('Max-Age=600; Path=/; Secure; HttpOnly; SameSite=Lax');
    expect(setCookie).not.toContain('Domain');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    // Without Accept-Language: English, no prefix.
    expect(new URL(response.headers.get('Location') ?? '').pathname).toBe('/conectar-ia/');
    // KV keeps the cookie's hash, never the cookie.
    const value = setCookie.split(';')[0]?.split('=')[1] ?? '';
    for (const stored of kv.values.values()) expect(stored).not.toContain(value);
  });

  it('names a client that gave no name by its id, as the library describes it', async () => {
    const started = await start({ name: null });
    expect(started.consent.searchParams.get('app')).toBe(started.clientId.slice(0, 40));
  });

  it('names a client whose name is a URL by its host, and numinia.com is told the same', async () => {
    const started = await start({ name: 'https://tool.example/oauth/client-metadata.json' });
    expect(started.consent.searchParams.get('app')).toBe('tool.example');
    expect(await desk().ask(started.req)).toEqual({
      ok: true,
      app: 'tool.example',
      host: 'claude.ai',
    });
  });

  it('names a metadata-document client without a name by its id’s host, not the URL', async () => {
    // The library's fallback when a client has no name: its id, here a CIMD URL.
    const clientId = await register();
    const { challenge } = await pkce();
    const real = getOAuthApi(PROVIDER_OPTIONS, env);
    const cimdId = 'https://agent.example.org/.well-known/oauth-client.json';
    env.OAUTH_PROVIDER = {
      ...real,
      parseAuthRequest: (request: Request) => real.parseAuthRequest(request),
      describeConsent: async (request) => ({
        ...(await real.describeConsent(request)),
        clientId: cimdId,
        clientName: cimdId,
        clientDomain: 'agent.example.org',
      }),
    } as OAuthHelpers;
    const response = await call(`/authorize?${authorizeQuery(clientId, challenge)}`);
    expect(response.status).toBe(302);
    const consent = new URL(response.headers.get('Location') ?? '');
    expect(consent.searchParams.get('app')).toBe('agent.example.org');
  });

  it('shows a real metadata document’s name; a document without one is refused by the library', async () => {
    const cimdId = 'https://agent.example.org/oauth/client.json';
    let document: Record<string, unknown> = {};
    storeAnswer = async (url) =>
      url.href === cimdId
        ? Response.json(document, { headers: { 'Cache-Control': 'no-store' } })
        : Response.json(meOf(ORG, AGENT));
    const { challenge } = await pkce();
    const base = {
      client_id: cimdId,
      redirect_uris: [CALLBACK],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    };
    document = { ...base, client_name: 'Agent Example' };
    const named = await call(`/authorize?${authorizeQuery(cimdId, challenge)}`);
    expect(named.status).toBe(302);
    expect(new URL(named.headers.get('Location') ?? '').searchParams.get('app')).toBe(
      'Agent Example',
    );
    document = base;
    await expectNoCode(await call(`/authorize?${authorizeQuery(cimdId, challenge)}`));
  });

  it('cuts a display name to 40 characters and keeps names that are not web URLs', () => {
    expect(clientDisplayName({ clientName: '  Claude  ' })).toBe('Claude');
    expect(clientDisplayName({ clientName: 'x'.repeat(50) })).toBe('x'.repeat(40));
    expect(clientDisplayName({ clientName: 'http://127.0.0.1:8765/client' })).toBe('127.0.0.1');
    expect(clientDisplayName({ clientName: 'mailto:ana@example.org' })).toBe(
      'mailto:ana@example.org',
    );
  });

  it('sends a validated client’s error back to it, and shows the page for the rest', async () => {
    const clientId = await register();
    const plain = await call(
      `/authorize?${authorizeQuery(clientId, 'x'.repeat(43), { code_challenge_method: 'plain' })}`,
    );
    expect(plain.status).toBe(302);
    const back = new URL(plain.headers.get('Location') ?? '');
    expect(`${back.origin}${back.pathname}`).toBe(CALLBACK);
    expect(back.searchParams.get('error')).toBe('invalid_request');

    await expectNoCode(await call(`/authorize?${authorizeQuery('nobody', 'x'.repeat(43))}`));
    await expectNoCode(
      await call(
        `/authorize?${authorizeQuery(clientId, 'x'.repeat(43), { redirect_uri: 'https://evil.example/cb' })}`,
      ),
    );
    // A helper that fails with something else than an authorization error.
    const real = getOAuthApi(PROVIDER_OPTIONS, env);
    env.OAUTH_PROVIDER = {
      ...real,
      parseAuthRequest: async () => Promise.reject(new Error('KV down')),
    } as OAuthHelpers;
    await expectNoCode(await call(`/authorize?${authorizeQuery(clientId, 'x'.repeat(43))}`));
  });

  it('shows the page when the client cannot be described (a CIMD document that fails)', async () => {
    const clientId = await register();
    const { challenge } = await pkce();
    const real = getOAuthApi(PROVIDER_OPTIONS, env);
    env.OAUTH_PROVIDER = {
      ...real,
      parseAuthRequest: (request: Request) => real.parseAuthRequest(request),
      describeConsent: async () => Promise.reject(new Error('fetch failed')),
    } as OAuthHelpers;
    await expectNoCode(await call(`/authorize?${authorizeQuery(clientId, challenge)}`));
    expect([...kv.values.keys()].filter((key) => key.startsWith('vuelta:'))).toEqual([]);
  });

  it('fails closed without a well-formed STORE_ORIGIN or the library helpers (503)', async () => {
    const clientId = await register();
    const { challenge } = await pkce();
    for (const origin of [null, '', 'http://numinia.com', 'https://numinia.com/', 'nope']) {
      if (origin === null) delete env.STORE_ORIGIN;
      else env.STORE_ORIGIN = origin;
      await expectNoCode(await call(`/authorize?${authorizeQuery(clientId, challenge)}`), 503);
    }
    const request = new Request(`${ORIGIN}/authorize?${authorizeQuery(clientId, challenge)}`);
    await expectNoCode(
      await handleDefault(request, { OAUTH_KV: env.OAUTH_KV, STORE_ORIGIN: STORE }),
      503,
    );
  });

  it('answers 404 for anything else', async () => {
    const response = await handleDefault(new Request(`${ORIGIN}/`), env);
    expect(response.status).toBe(404);
  });
});

describe('locales, pages and settings', () => {
  it('picks the consent page’s locale from Accept-Language, by quality, or English', () => {
    expect(localeOf(null)).toBe('en');
    expect(localeOf('')).toBe('en');
    expect(localeOf('ja')).toBe('ja');
    expect(localeOf('pt-PT,pt;q=0.9')).toBe('pt-br');
    expect(localeOf('ko;q=0.5, es-419;q=0.9')).toBe('es');
    expect(localeOf('fr-FR, de;q=0.8')).toBe('en');
    expect(localeOf('es;q=0, ko')).toBe('ko');
    expect(localeOf('ko;level=1;q=0.4, ja;q=0.4')).toBe('ko');
    expect(consentPath('en')).toBe('/conectar-ia/');
    expect(consentPath('pt-br')).toBe('/pt-br/conectar-ia/');
  });

  it('writes the plain page in the browser’s language, with no script allowed', async () => {
    const page = stopPage(
      new Request(`${ORIGIN}/vuelta`, { headers: { 'Accept-Language': 'ko' } }),
      'unavailable',
      503,
    );
    expect(page.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    const html = await page.text();
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('지금은 AI를 연결할 수 없습니다');
  });

  it('reads STORE_ORIGIN only as a bare https origin', () => {
    expect(storeOrigin({ ...env, STORE_ORIGIN: 'https://numinia.com' })).toBe(STORE);
    expect(storeOrigin({ ...env, STORE_ORIGIN: 'https://numinia.com/x' })).toBeNull();
  });

  it('reads one cookie among several', () => {
    expect(readCookie('a=1; __Host-vuelta-r=xy=z; b=2', '__Host-vuelta-r')).toBe('xy=z');
    expect(readCookie(null, 'a')).toBeNull();
  });

  it('opens only with the request’s own key, for the request it was sealed to', async () => {
    const pending = await start().then((started) => readPending(env, started.req));
    const sealed = await seal(pending?.publicKey ?? '', 'secret', 'req-a');
    const other = await start();
    const otherKey = other.cookie.split('=').slice(1).join('=');
    expect(await open(otherKey, sealed, 'req-a')).toBeNull();
    expect(Array.from(fromBase64Url(toBase64Url(new Uint8Array([251, 255, 0]))))).toEqual([
      251, 255, 0,
    ]);
  });
});

describe('refresh lifetimes: 30 days from last use, never past 90 days', () => {
  it('slides 30 days at each refresh and ends the connection at 90 days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const started = await start();
    await desk().keep(handOff(started.req));
    const back = await vuelta(started.req, started.cookie);
    const code = new URL(back.headers.get('Location') ?? '').searchParams.get('code') ?? '';
    const issued = await json(
      await tokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK,
        client_id: started.clientId,
        code_verifier: started.verifier,
      }),
    );
    const connectedAt = Math.floor(Date.now() / 1000);
    let refresh = String(issued.refresh_token);
    const grantExpiry = (): number => {
      const write = kv.lastWrite('grant:');
      return write?.options?.expiration ?? 0;
    };

    // Used every 29 days: each refresh moves the end to 30 days after it.
    for (const day of [29, 58, 87]) {
      vi.setSystemTime((connectedAt + day * DAY) * 1000);
      const response = await tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: started.clientId,
      });
      expect(response.status).toBe(200);
      refresh = String((await json(response)).refresh_token);
      const now = connectedAt + day * DAY;
      expect(grantExpiry()).toBe(
        Math.min(now + REFRESH_TOKEN_IDLE_TTL_SECONDS, connectedAt + CONNECTION_MAX_SECONDS),
      );
    }
    // Day 90: the connection is over, however recently it was used.
    vi.setSystemTime((connectedAt + 90 * DAY) * 1000);
    const over = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: started.clientId,
    });
    expect(over.status).toBe(400);
    expect((await json(over)).error).toBe('invalid_grant');
  });

  it('a refresh token left idle for 30 days is dead', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const started = await start();
    await desk().keep(handOff(started.req));
    const back = await vuelta(started.req, started.cookie);
    const code = new URL(back.headers.get('Location') ?? '').searchParams.get('code') ?? '';
    const issued = await json(
      await tokenRequest({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK,
        client_id: started.clientId,
        code_verifier: started.verifier,
      }),
    );
    vi.setSystemTime(Date.now() + (30 * DAY + 1) * 1000);
    const idle = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(issued.refresh_token),
      client_id: started.clientId,
    });
    expect((await json(idle)).error).toBe('invalid_grant');
  });

  it('capRefresh: nothing at the code exchange; a grant without its date is refused', () => {
    expect(capRefresh({ grantType: 'authorization_code' as never, props: {} })).toBeUndefined();
    expect(() => capRefresh({ grantType: 'refresh_token' as never, props: {} })).toThrow(/90 days/);
    expect(() => capRefresh({ grantType: 'refresh_token' as never, props: null })).toThrow(
      /90 days/,
    );
    const now = Math.floor(Date.now() / 1000);
    expect(
      capRefresh({ grantType: 'refresh_token' as never, props: { connectedAt: now } }),
    ).toEqual({ refreshTokenIdleTTL: REFRESH_TOKEN_IDLE_TTL_SECONDS });
    expect(
      capRefresh({
        grantType: 'refresh_token' as never,
        props: { connectedAt: now - 80 * DAY },
      })?.refreshTokenIdleTTL,
    ).toBeLessThanOrEqual(10 * DAY);
  });
});
