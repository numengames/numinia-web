/**
 * Story W10: per-address limits on the two doors anyone can knock without a
 * token — `/register` (dynamic client registration, 10 a minute) and
 * `/authorize` (30 a minute) — with Cloudflare's rate limiting binding, and
 * a counter in memory when the binding is missing or fails. And the way
 * back to numinia.com through its service binding, without an address, so
 * numinia.com counts each AI on its own meter (store: lib/rate-limit.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeFetch } from '../src/env';
import {
  AUTHORIZE_PER_MINUTE,
  LIMIT_WINDOW_SECONDS,
  LIMITS,
  REGISTER_PER_MINUTE,
  overLimit,
  resetLimitsForTests,
} from '../src/limites';
import { askMe } from '../src/me';
import worker, { type Env } from '../src/worker';
import { MemoryKv } from './memory-kv';

const ORIGIN = 'https://mcp.numinia.com';
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const NOW = Date.parse('2026-10-19T20:00:00.000Z');

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

let kv: MemoryKv;
let env: Env;

beforeEach(() => {
  resetLimitsForTests();
  kv = new MemoryKv();
  env = { OAUTH_KV: kv.asNamespace() };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function call(path: string, init: RequestInit = {}, ip: string | null = '203.0.113.7') {
  const headers = new Headers(init.headers);
  if (ip !== null) headers.set('cf-connecting-ip', ip);
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), env, ctx);
}

const register = (ip: string | null = '203.0.113.7') =>
  call(
    '/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Claude',
        redirect_uris: [CALLBACK],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    },
    ip,
  );

const authorize = (ip = '203.0.113.7', lang = 'es') =>
  call('/authorize?response_type=code', { headers: { 'Accept-Language': lang } }, ip);

const clientsKept = (): number =>
  [...kv.values.keys()].filter((key) => key.startsWith('client:')).length;

/** A rate limiting binding as Cloudflare's: says yes until `limit` per key, records the keys. */
function fakeLimiter(limit: number) {
  const keys: string[] = [];
  const counts = new Map<string, number>();
  const binding: RateLimit = {
    limit: async ({ key }) => {
      keys.push(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return { success: (counts.get(key) ?? 0) <= limit };
    },
  };
  return { binding, keys };
}

describe('/register: 10 a minute per address', () => {
  it('lets ten through and asks the eleventh to wait a minute, in the words a client reads', async () => {
    for (let i = 0; i < REGISTER_PER_MINUTE; i += 1) {
      expect((await register()).status).toBe(201);
    }
    const refused = await register();
    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe(String(LIMIT_WINDOW_SECONDS));
    expect(refused.headers.get('Cache-Control')).toBe('no-store');
    expect(await refused.json()).toEqual({
      error: 'too_many_requests',
      error_description: 'Too many registrations from this address: wait a minute.',
    });
    // The refused one never reached the library: no eleventh client.
    expect(clientsKept()).toBe(REGISTER_PER_MINUTE);
  });

  it('counts each address on its own', async () => {
    for (let i = 0; i <= REGISTER_PER_MINUTE; i += 1) await register('203.0.113.7');
    expect((await register('203.0.113.7')).status).toBe(429);
    expect((await register('198.51.100.4')).status).toBe(201);
  });

  it('counts a request with no address as one address, `local`', async () => {
    for (let i = 0; i < REGISTER_PER_MINUTE; i += 1) await register(null);
    expect((await register(null)).status).toBe(429);
  });
});

describe('/authorize: 30 a minute per address', () => {
  it('lets thirty through and shows the person a «wait a minute» page in their language', async () => {
    for (let i = 0; i < AUTHORIZE_PER_MINUTE; i += 1) {
      expect((await authorize()).status).not.toBe(429);
    }
    const refused = await authorize();
    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe(String(LIMIT_WINDOW_SECONDS));
    expect(refused.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(refused.headers.get('Cache-Control')).toBe('no-store');
    expect(refused.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    const page = await refused.text();
    expect(page).toContain('<h1>Espera un minuto</h1>');
    expect(page).toContain('Demasiados intentos desde tu conexión');
    // Another address is not held back.
    expect((await authorize('198.51.100.4')).status).not.toBe(429);
  });

  it('speaks the five languages', async () => {
    const titles = {
      en: 'Wait a minute',
      es: 'Espera un minuto',
      ja: '少しお待ちください',
      ko: '잠시 기다려 주세요',
      'pt-BR': 'Espere um minuto',
    };
    for (const [lang, title] of Object.entries(titles)) {
      const ip = `198.51.100.${lang.length}${lang.charCodeAt(0)}`;
      for (let i = 0; i < AUTHORIZE_PER_MINUTE; i += 1) await authorize(ip, lang);
      expect(await (await authorize(ip, lang)).text()).toContain(`<h1>${title}</h1>`);
    }
  });

  it('is counted apart from /register', async () => {
    for (let i = 0; i <= REGISTER_PER_MINUTE; i += 1) await register();
    expect((await authorize()).status).not.toBe(429);
  });
});

describe('the rest is not counted here', () => {
  it('never answers 429 on the discovery documents, /token, /mcp or /vuelta', async () => {
    const paths = [
      '/.well-known/oauth-authorization-server',
      '/.well-known/oauth-protected-resource/mcp',
      '/token',
      '/mcp',
      '/vuelta?req=x',
    ];
    for (const path of paths) {
      for (let i = 0; i <= AUTHORIZE_PER_MINUTE; i += 1) {
        expect(
          (await call(path, path === '/token' || path === '/mcp' ? { method: 'POST' } : {})).status,
        ).not.toBe(429);
      }
    }
  });
});

describe('the count itself', () => {
  const at = (path: string, ip = '203.0.113.7') =>
    new Request(`${ORIGIN}${path}`, { headers: { 'cf-connecting-ip': ip } });

  it('heals when the minute ends', async () => {
    for (let i = 0; i < REGISTER_PER_MINUTE; i += 1) {
      expect(await overLimit(at('/register'), env, NOW)).toBeNull();
    }
    expect((await overLimit(at('/register'), env, NOW))?.status).toBe(429);
    expect(await overLimit(at('/register'), env, NOW + LIMIT_WINDOW_SECONDS * 1000)).toBeNull();
  });

  it('uses the wall clock when no time is given', async () => {
    expect(await overLimit(at('/register'), env)).toBeNull();
  });

  it('forgets stale addresses when a thousand pile up, and keeps the live ones', async () => {
    for (let i = 0; i < REGISTER_PER_MINUTE + 1; i += 1) {
      await overLimit(at('/register', '192.0.2.1'), env, NOW + 30_000);
    }
    for (let i = 0; i < 1000; i += 1) {
      await overLimit(at('/register', `10.0.${Math.floor(i / 250)}.${i % 250}`), env, NOW);
    }
    // At NOW + 61 s the thousand early windows are stale; 192.0.2.1's is not.
    expect((await overLimit(at('/register', '192.0.2.1'), env, NOW + 61_000))?.status).toBe(429);
    expect(await overLimit(at('/register', '10.0.0.0'), env, NOW + 61_000)).toBeNull();
  });

  it("uses Cloudflare's binding when there is one, keyed by door and address", async () => {
    const register = fakeLimiter(REGISTER_PER_MINUTE);
    const authorizeLimiter = fakeLimiter(AUTHORIZE_PER_MINUTE);
    env = { ...env, LIMIT_REGISTER: register.binding, LIMIT_AUTHORIZE: authorizeLimiter.binding };
    expect(await overLimit(at('/register'), env, NOW)).toBeNull();
    expect(await overLimit(new Request(`${ORIGIN}/authorize`), env, NOW)).toBeNull();
    expect(register.keys).toEqual(['register:203.0.113.7']);
    expect(authorizeLimiter.keys).toEqual(['authorize:local']);
    for (let i = 1; i < REGISTER_PER_MINUTE; i += 1) await overLimit(at('/register'), env, NOW);
    expect((await overLimit(at('/register'), env, NOW))?.status).toBe(429);
  });

  it('the binding decides alone: what it allows, memory does not hold back', async () => {
    const generous = fakeLimiter(1000);
    env = { ...env, LIMIT_REGISTER: generous.binding };
    for (let i = 0; i < REGISTER_PER_MINUTE * 3; i += 1) {
      expect(await overLimit(at('/register'), env, NOW)).toBeNull();
    }
  });

  it('counts in memory when the binding fails, never not at all', async () => {
    env = {
      ...env,
      LIMIT_REGISTER: { limit: async () => Promise.reject(new Error('binding down')) },
    };
    for (let i = 0; i < REGISTER_PER_MINUTE; i += 1) {
      expect(await overLimit(at('/register'), env, NOW)).toBeNull();
    }
    expect((await overLimit(at('/register'), env, NOW))?.status).toBe(429);
  });

  it('names its two doors and their bindings', () => {
    expect(LIMITS).toEqual({
      '/register': { name: 'register', binding: 'LIMIT_REGISTER', limit: 10 },
      '/authorize': { name: 'authorize', binding: 'LIMIT_AUTHORIZE', limit: 30 },
    });
  });
});

describe("the way to numinia.com: its service binding, without the caller's address", () => {
  const TOKEN = `ntk_${'Tq9'.repeat(14)}x`;
  const me = {
    org: 'acc_team_numen_games',
    id: 'claude-de-ana',
    name: 'Claude de Ana',
    enabled: true,
    state: 'activa',
    hear: false,
    eligible: true,
    permissions: ['enter-worlds'],
    worlds: [],
  };

  it('asks /api/agents/me through STORE, with the token and no cf-connecting-ip', async () => {
    const seen: Request[] = [];
    const publicFetch = vi.fn(async () => new Response('no', { status: 500 }));
    vi.stubGlobal('fetch', publicFetch);
    env = {
      ...env,
      STORE: {
        fetch: async (request: Request) => {
          seen.push(request);
          return Response.json(me);
        },
      } as unknown as Fetcher,
    };
    const answer = await askMe(
      'https://numinia.com',
      { accountId: me.org, agentId: me.id, token: TOKEN },
      storeFetch(env),
    );
    expect(answer).toEqual({ kind: 'ok', me });
    expect(publicFetch).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
    const [request] = seen;
    expect(request?.url).toBe(
      'https://numinia.com/api/agents/me?org=acc_team_numen_games&agent=claude-de-ana',
    );
    expect(request?.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(request?.headers.has('cf-connecting-ip')).toBe(false);
    expect(request?.redirect).toBe('manual');
  });

  it('drops an address header that rode along, whatever the caller built', async () => {
    let forwarded: Request | undefined;
    env = {
      ...env,
      STORE: {
        fetch: async (request: Request) => {
          forwarded = request;
          return new Response(null, { status: 204 });
        },
      } as unknown as Fetcher,
    };
    await storeFetch(env)('https://numinia.com/api/agents/pass', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '203.0.113.7', 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(forwarded?.headers.has('cf-connecting-ip')).toBe(false);
    expect(forwarded?.headers.get('Content-Type')).toBe('application/json');
    expect(forwarded?.method).toBe('POST');
  });

  it('without the binding (tests, local runs), uses the public fetch', async () => {
    const publicFetch = vi.fn(async () => Response.json(me));
    vi.stubGlobal('fetch', publicFetch);
    const answer = await askMe('https://numinia.com', {
      accountId: me.org,
      agentId: me.id,
      token: TOKEN,
    });
    expect(answer.kind).toBe('ok');
    await storeFetch(env)('https://numinia.com/api/agents/me');
    expect(publicFetch).toHaveBeenCalledTimes(2);
  });
});
