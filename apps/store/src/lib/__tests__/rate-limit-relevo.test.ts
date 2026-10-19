/**
 * «MCP remoto», story W10 (DISENO-MCP-REMOTO §4 risk 3): the relay asks
 * numinia.com for every AI through one service binding, with no
 * `cf-connecting-ip`. Counted by address, all of them would share the
 * doorman's `local` bucket; instead each AI counts in its own per-agent
 * bucket (`meterToken`, the routes' own meter). From the internet nothing
 * changes: the doorman counts by address, and no header a caller can type
 * takes it out of that count.
 *
 * Each call goes the way a real one does: the doorman first (as
 * middleware.ts calls it), then the route's own handler, with no till bound
 * — a 503 or 404 there means the call got past both meters.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_REQUESTS_PER_MINUTE, answerAgentMe } from '../agent-me';
import { answerAgentPass } from '../agent-pass';
import { newToken } from '../agents';
import {
  RATE_RULES,
  RATE_WINDOW_MS,
  doorman,
  fromRelay,
  rateRuleFor,
  resetRateLimitsForTests,
  type DoormanRule,
} from '../rate-limit';

const NOW_MS = Date.parse('2026-10-19T19:00:00.000Z');
const NOW = NOW_MS / 1000;
const NUMEN = 'acc_team_numen_games';
const RESET = 'acc_team_reset';
const quiet = vi.fn();

beforeEach(() => {
  resetRateLimitsForTests();
  quiet.mockClear();
});

type Outcome = 'through' | 'doorman' | 'agent';

/** Headers of a relay call: a token, and no address (a service binding). */
const relay = (token: string): Headers => new Headers({ authorization: `Bearer ${token}` });

/** Headers of a call from the internet: the edge always adds the caller's address. */
const internet = (ip: string, token: string, extra: Record<string, string> = {}): Headers =>
  new Headers({ ...extra, authorization: `Bearer ${token}`, 'cf-connecting-ip': ip });

/** GET /api/agents/me, doorman then route, as the Worker runs it. */
async function me(headers: Headers, org: string, agent: string, at = NOW_MS): Promise<Outcome> {
  const verdict = doorman('GET', '/api/agents/me', headers, at);
  if (verdict !== null && !verdict.allowed) return 'doorman';
  const response = await answerAgentMe(
    null,
    new Request(`https://numinia.test/api/agents/me?org=${org}&agent=${agent}`, { headers }),
    { hosts: async () => new Map(), now: at / 1000 },
    quiet,
  );
  if (response.status === 429) return 'agent';
  expect(response.status).toBe(503);
  return 'through';
}

/** POST /api/agents/pass, doorman then route. */
async function pass(headers: Headers, org: string, agent: string): Promise<Outcome> {
  const verdict = doorman('POST', '/api/agents/pass', headers, NOW_MS);
  if (verdict !== null && !verdict.allowed) return 'doorman';
  const response = await answerAgentPass(
    null,
    new Request('https://numinia.test/api/agents/pass', {
      method: 'POST',
      headers: { ...Object.fromEntries(headers), 'content-type': 'application/json' },
      body: JSON.stringify({ org, agent, aud: 'torre' }),
    }),
    {
      hosts: new Map([['torre', 'torre.example']]),
      privateKey: undefined,
      secret: undefined,
      now: NOW,
    },
    quiet,
  );
  if (response.status === 429) return 'agent';
  expect(response.status).toBe(503);
  return 'through';
}

async function times(n: number, call: () => Promise<Outcome>): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  for (let i = 0; i < n; i += 1) outcomes.push(await call());
  return outcomes;
}

const all = (outcomes: Outcome[], expected: Outcome): boolean =>
  outcomes.every((outcome) => outcome === expected);

describe('the relay: one bucket per agent, never one for all', () => {
  it('two agents through the relay do not share a bucket', async () => {
    const a = (await newToken()).token;
    const b = (await newToken()).token;
    expect(
      all(await times(TOKEN_REQUESTS_PER_MINUTE, () => me(relay(a), NUMEN, 'hermes-a')), 'through'),
    ).toBe(true);
    // The first agent is spent — by its own meter, not the doorman's…
    expect(await me(relay(a), NUMEN, 'hermes-a')).toBe('agent');
    // …and the second one, also through the relay, starts fresh.
    expect(await me(relay(b), NUMEN, 'hermes-b')).toBe('through');
    // Another organization's AI too.
    expect(await me(relay(b), RESET, 'hermes-a')).toBe('through');
  });

  it('many AIs through the relay together go past what one address would get', async () => {
    const token = (await newToken()).token;
    const agents = ['uno', 'dos', 'tres'];
    const outcomes: Outcome[] = [];
    for (const agent of agents) {
      outcomes.push(
        ...(await times(TOKEN_REQUESTS_PER_MINUTE, () => me(relay(token), NUMEN, agent))),
      );
    }
    // 180 calls in one minute, more than the doorman's 120 for one address.
    const doormanLimit = rateRuleFor('GET', '/api/agents/me')?.limit ?? 0;
    expect(outcomes.length).toBeGreaterThan(doormanLimit);
    expect(all(outcomes, 'through')).toBe(true);
  });

  it("an agent's passes and its questions through the relay share its one meter", async () => {
    const token = (await newToken()).token;
    const half = TOKEN_REQUESTS_PER_MINUTE / 2;
    expect(all(await times(half, () => pass(relay(token), NUMEN, 'hermes-a')), 'through')).toBe(
      true,
    );
    expect(all(await times(half, () => me(relay(token), NUMEN, 'hermes-a')), 'through')).toBe(true);
    expect(await pass(relay(token), NUMEN, 'hermes-a')).toBe('agent');
    expect(await pass(relay(token), NUMEN, 'hermes-b')).toBe('through');
  });

  it('the agent heals when its minute ends', async () => {
    const token = (await newToken()).token;
    await times(TOKEN_REQUESTS_PER_MINUTE + 1, () => me(relay(token), NUMEN, 'hermes-a'));
    expect(await me(relay(token), NUMEN, 'hermes-a')).toBe('agent');
    expect(await me(relay(token), NUMEN, 'hermes-a', NOW_MS + RATE_WINDOW_MS)).toBe('through');
  });

  it('without a token of the right shape a call with no address is counted as one address', async () => {
    const noToken = new Headers();
    const notAToken = new Headers({ authorization: 'Bearer abc' });
    const limit = rateRuleFor('GET', '/api/agents/me')?.limit ?? 0;
    const agents = Array.from({ length: limit }, (_, i) => `ia-${i}`);
    for (const [i, agent] of agents.entries()) {
      // Each agent once: never its own meter that stops them.
      await me(i % 2 === 0 ? noToken : notAToken, NUMEN, agent);
    }
    expect(await me(noToken, NUMEN, 'otra')).toBe('doorman');
    expect(await me(notAToken, NUMEN, 'otra-mas')).toBe('doorman');
  });
});

describe('the internet: still one bucket per address', () => {
  it('counts every agent asked from one address in that address', async () => {
    const token = (await newToken()).token;
    const limit = rateRuleFor('GET', '/api/agents/me')?.limit ?? 0;
    const outcomes: Outcome[] = [];
    for (let i = 0; i < limit; i += 1) {
      outcomes.push(await me(internet('203.0.113.7', token), NUMEN, `ia-${i % 3}`));
    }
    expect(all(outcomes, 'through')).toBe(true);
    // A fresh agent does not help: the address is spent.
    expect(await me(internet('203.0.113.7', token), NUMEN, 'nueva')).toBe('doorman');
    // Another address is not.
    expect(await me(internet('198.51.100.4', token), NUMEN, 'nueva')).toBe('through');
  });

  it('still meters each agent too', async () => {
    const token = (await newToken()).token;
    await times(TOKEN_REQUESTS_PER_MINUTE, () =>
      me(internet('203.0.113.7', token), NUMEN, 'hermes-a'),
    );
    expect(await me(internet('198.51.100.4', token), NUMEN, 'hermes-a')).toBe('agent');
  });

  it('a request that dresses as the relay does not escape its address', async () => {
    const token = (await newToken()).token;
    // Whatever a caller types, the edge adds its real address: it cannot take that away.
    const disguise = {
      'cf-worker': 'numinia.com',
      'x-real-ip': '10.0.0.1',
      'x-forwarded-for': '10.0.0.1',
      'x-relay': 'numinia-mcp',
      'user-agent': 'numinia-mcp',
    };
    const limit = rateRuleFor('POST', '/api/agents/pass')?.limit ?? 0;
    const outcomes: Outcome[] = [];
    for (let i = 0; i < limit; i += 1) {
      outcomes.push(await pass(internet('203.0.113.9', token, disguise), NUMEN, `ia-${i % 3}`));
    }
    expect(all(outcomes, 'through')).toBe(true);
    expect(await pass(internet('203.0.113.9', token, disguise), NUMEN, 'otra')).toBe('doorman');
    expect(await me(internet('203.0.113.9', token, disguise), NUMEN, 'otra')).toBe('through');
    // An empty address is still an address the edge wrote: counted, not waved through.
    const empty = rateRuleFor('GET', '/api/agents/me') as DoormanRule;
    expect(fromRelay(empty, internet('', token))).toBe(false);
  });
});

describe('the doorman rules', () => {
  const token = 'ntk_' + 'a'.repeat(43);

  it('lets the relay skip the address count only on the two token routes', () => {
    const marked = RATE_RULES.filter((rule) => rule.perAgent === true).map((rule) => rule.key);
    expect(marked).toEqual(['agent-pass', 'agent-me']);
    const agentsWrite = rateRuleFor('POST', '/api/saldo/agents') as DoormanRule;
    expect(fromRelay(agentsWrite, relay(token))).toBe(false);
    expect(doorman('POST', '/api/saldo/agents', relay(token), NOW_MS)?.rule).toBe('agents-write');
    expect(doorman('GET', '/api/agents/me', relay(token), NOW_MS)).toBeNull();
  });

  it('matches each route to the rule it had, the first that fits deciding', () => {
    const cases: Array<[string, string, string | undefined]> = [
      ['POST', '/api/auth/login', 'login'],
      ['POST', '/api/admin/census', 'census-write'],
      ['POST', '/api/admin/prices', 'prices-desk'],
      ['GET', '/api/admin/prices', 'admin-read'],
      ['GET', '/api/admin/anything/else', 'admin-read'],
      ['POST', '/api/saldo', 'saldo-write'],
      ['POST', '/api/saldo/signature', 'saldo-sign'],
      ['POST', '/api/saldo/agents', 'agents-write'],
      ['PATCH', '/api/saldo/agents', 'agents-write'],
      ['DELETE', '/api/saldo/agents', 'agents-write'],
      ['POST', '/api/conectar-ia', 'connect-ai'],
      ['POST', '/api/agents/pass', 'agent-pass'],
      ['GET', '/api/agents/me', 'agent-me'],
      ['GET', '/api/saldo', 'saldo-read'],
      ['GET', '/api/saldo/agents', 'saldo-read'],
      ['POST', '/api/telemetry', 'telemetry'],
      ['GET', '/api/media', 'media'],
      ['GET', '/api/live', 'live'],
      // Unmetered: the session GET, pages, other methods.
      ['GET', '/api/auth/session', undefined],
      ['GET', '/', undefined],
      ['GET', '/api/agents/pass', undefined],
      ['POST', '/api/agents/me', undefined],
      ['PUT', '/api/saldo/agents', undefined],
      ['POST', '/api/saldo/other', undefined],
    ];
    for (const [method, path, key] of cases) {
      expect(rateRuleFor(method, path)?.key, `${method} ${path}`).toBe(key);
    }
    expect(doorman('GET', '/', new Headers({ 'cf-connecting-ip': '203.0.113.7' }))).toBeNull();
  });

  it('counts on the wall clock when no time is given', () => {
    const verdict = doorman(
      'POST',
      '/api/telemetry',
      new Headers({ 'cf-connecting-ip': '203.0.113.7' }),
    );
    expect(verdict).toEqual({ rule: 'telemetry', allowed: true, retryAfterS: 0 });
  });
});
