/**
 * «Token de acceso» (cut 2 of the AIs of an organization), at the store: the
 * token's own helpers (lib/agents.ts), the fixture desk's create / renew /
 * revoke, /api/saldo/agents with `auth: 'token'`, and POST /api/agents/pass
 * with `Authorization: Bearer ntk_…` — including that the secret appears in no
 * log line, no error and no list, and that every wrong credential is the same
 * generic 401.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, Asker } from '../accounts';
import { boundAccounts } from '../accounts-source';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { TOKEN_REQUESTS_PER_MINUTE } from '../agent-me';
import { answerAgentPass, type AgentPassContext } from '../agent-pass';
import { AGENT_PROBLEMS, bearerOf, hashToken, newToken, sameSecret } from '../agents';
import { answerAgentWrite, answerAgents } from '../agents-source';
import { resetRateLimitsForTests } from '../rate-limit';
import { b64urlEncode, publicKeyDocument, verifyPass } from '../world-pass';

const NOW_MS = Date.parse('2026-10-17T10:00:00.000Z');
const NOW = Math.floor(NOW_MS / 1000);
const ME = `0x${'ab'.repeat(20)}`;
const NUMEN = 'acc_team_numen_games';
const SECRET = 'secret-of-the-session-'.repeat(2);
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const seed = deskSeed as unknown as AccountsSeed;
const HOSTS = new Map([['agora-plaza', 'agora.example']]);
const quiet = vi.fn();

beforeEach(() => {
  resetRateLimitsForTests();
  quiet.mockClear();
});

const asker = (): Asker => ({ wallet: ME, house: false });
const fresh = (): AccountDesk =>
  createAccountsFixtureDesk(
    { ...seed, homes: [{ worldId: 'agora-plaza', accountId: NUMEN, placedDaysAgo: 5 }] },
    () => new Date(NOW_MS),
  );
const send = (method: string, body: unknown): Request =>
  new Request('https://numinia.test/api/saldo/agents', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
/* eslint-disable @typescript-eslint/no-explicit-any -- a test reads loosely shaped JSON */
const json = async (response: Response): Promise<Record<string, any>> =>
  (await response.json()) as Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

async function worldKey(): Promise<string> {
  const pair = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  return btoa(
    String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))),
  );
}

/** Makes a token agent through the route, as the panel does, and returns the secret. */
async function made(desk: AccountDesk, id = 'hermes-1', roles: string[] = [MEMBER_ROLE]) {
  const response = await answerAgentWrite(
    desk,
    asker(),
    send('POST', { accountId: NUMEN, id, name: 'Hermes', auth: 'token', roleIds: roles }),
    quiet,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const body = await json(response);
  return { token: body['token'] as string, agents: body['agents'] };
}

describe('the token and its helpers', () => {
  it('is ntk_ and 43 base64url characters from 32 random bytes, with its hash and prefix', async () => {
    const one = await newToken();
    const two = await newToken();
    expect(one.token).toMatch(/^ntk_[A-Za-z0-9_-]{43}$/);
    expect(one.token).not.toBe(two.token);
    expect(one.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(one.hash).toBe(await hashToken(one.token));
    expect(one.prefix).toBe(one.token.slice(4, 12));
    expect(one.token).not.toContain(one.hash);
  });

  it('takes a bearer only when it is shaped like a token', () => {
    const token = `ntk_${'A'.repeat(43)}`;
    expect(bearerOf(`Bearer ${token}`)).toBe(token);
    for (const bad of [
      null,
      '',
      token,
      `bearer ${token}`,
      `Bearer ${token}x`,
      `Bearer ntk_${'A'.repeat(42)}`,
      `Bearer ${token} extra`,
      'Bearer ',
    ]) {
      expect(bearerOf(bad)).toBeNull();
    }
  });

  it('compares equal secrets as equal and every difference, of any length, as different', () => {
    expect(sameSecret('abc', 'abc')).toBe(true);
    expect(sameSecret('', '')).toBe(true);
    expect(sameSecret('abc', 'abd')).toBe(false);
    expect(sameSecret('abc', 'abcd')).toBe(false);
    expect(sameSecret('abcd', 'abc')).toBe(false);
    expect(sameSecret('', 'a')).toBe(false);
  });
});

describe('POST /api/saldo/agents by token', () => {
  it('draws the token, answers it once and lists only its prefix and day', async () => {
    const desk = fresh();
    const { token, agents } = await made(desk);
    expect(token).toMatch(/^ntk_[A-Za-z0-9_-]{43}$/);
    expect(agents.agents).toHaveLength(1);
    expect(agents.agents[0]).toMatchObject({
      id: 'hermes-1',
      auth: 'token',
      tokenPrefix: token.slice(4, 12),
      tokenCreatedAt: NOW_MS ? new Date(NOW_MS).toISOString() : '',
    });
    expect(agents.agents[0]).not.toHaveProperty('publicKey');
    // A list read later never has the secret nor its hash.
    const listed = await answerAgents(
      desk,
      asker(),
      new URL(`https://numinia.test/api/saldo/agents?cuenta=${NUMEN}`),
      quiet,
    );
    const text = await listed.text();
    expect(text).not.toContain(token);
    expect(text).not.toContain(await hashToken(token));
    expect(text).not.toContain('tokenHash');
    expect(text).toContain(token.slice(4, 12));
    // The organization's log names the prefix and never the secret.
    const view = await desk.happenings(ME, NUMEN, undefined);
    expect(JSON.stringify(view)).not.toContain(token);
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(token);
  });

  it('refuses a body that mixes the ways, a duplicate and a key draft with a token field', async () => {
    const desk = fresh();
    await made(desk);
    const mixed = await answerAgentWrite(
      desk,
      asker(),
      send('POST', { accountId: NUMEN, id: 'x', name: 'X', auth: 'token', publicKey: 'ed25519:x' }),
      quiet,
    );
    expect(mixed.status).toBe(400);
    const wrongAuth = await answerAgentWrite(
      desk,
      asker(),
      send('POST', { accountId: NUMEN, id: 'x', name: 'X', auth: 'key' }),
      quiet,
    );
    expect(wrongAuth.status).toBe(400);
    const again = await answerAgentWrite(
      desk,
      asker(),
      send('POST', { accountId: NUMEN, id: 'hermes-1', name: 'H', auth: 'token' }),
      quiet,
    );
    expect(again.status).toBe(403);
    expect(await again.text()).not.toContain('ntk_');
  });

  it('renews: a new secret and prefix, the old hash gone; refuses a key agent', async () => {
    const desk = fresh();
    const first = await made(desk);
    const renewed = await answerAgentWrite(
      desk,
      asker(),
      send('PATCH', { accountId: NUMEN, id: 'hermes-1', renewToken: true }),
      quiet,
    );
    expect(renewed.status).toBe(200);
    expect(renewed.headers.get('cache-control')).toBe('no-store');
    const body = await json(renewed);
    expect(body['token']).toMatch(/^ntk_/);
    expect(body['token']).not.toBe(first.token);
    expect(body['agents'].agents[0].tokenPrefix).toBe(body['token'].slice(4, 12));
    // A key agent has no token to renew or revoke.
    await desk.createAgent(ME, NUMEN, {
      id: 'keyed',
      name: 'Keyed',
      publicKey: `ed25519:${b64urlEncode(new Uint8Array(32).fill(9))}`,
    });
    for (const change of [{ renewToken: true }, { revokeToken: true }]) {
      const refused = await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'keyed', ...change }),
        quiet,
      );
      expect(refused.status).toBe(403);
      expect(await json(refused)).toMatchObject({ problems: [AGENT_PROBLEMS.notToken] });
    }
    const missing = await answerAgentWrite(
      desk,
      asker(),
      send('PATCH', { accountId: NUMEN, id: 'nobody', renewToken: true }),
      quiet,
    );
    expect(missing.status).toBe(403);
  });

  it('revokes: no token left, switched off, and revoking twice is quiet', async () => {
    const desk = fresh();
    await made(desk);
    for (let i = 0; i < 2; i += 1) {
      const response = await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', revokeToken: true }),
        quiet,
      );
      expect(response.status).toBe(200);
      const row = (await json(response))['agents'].agents[0];
      expect(row).toMatchObject({ auth: 'token', enabled: false });
      expect(row).not.toHaveProperty('tokenPrefix');
    }
  });

  it('is told to the till as hash and prefix only, never the secret', async () => {
    const calls: unknown[][] = [];
    const real = fresh();
    const spy = {
      ...real,
      createAgent: vi.fn((...args: Parameters<AccountDesk['createAgent']>) => {
        calls.push(args);
        return real.createAgent(...args);
      }),
      renewAgentToken: vi.fn((...args: Parameters<AccountDesk['renewAgentToken']>) => {
        calls.push(args);
        return real.renewAgentToken(...args);
      }),
    } as AccountDesk;
    const { token } = await made(spy);
    await answerAgentWrite(
      spy,
      asker(),
      send('PATCH', { accountId: NUMEN, id: 'hermes-1', renewToken: true }),
      quiet,
    );
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(calls)).not.toContain(token);
    expect(JSON.stringify(calls)).not.toContain('ntk_');
  });
});

describe('the fixture desk by token', () => {
  it('refuses a malformed hash or prefix and a hash already in use', async () => {
    const desk = fresh();
    const base = { id: 'a', name: 'A', auth: 'token' as const };
    const good = await newToken();
    const bad = await desk.createAgent(ME, NUMEN, {
      ...base,
      tokenHash: 'nope',
      tokenPrefix: 'short',
    });
    expect(bad).toMatchObject({ ok: false });
    if (!('problems' in bad)) throw new Error('expected problems');
    expect(bad.problems).toEqual(
      expect.arrayContaining([AGENT_PROBLEMS.tokenHash, AGENT_PROBLEMS.tokenPrefix]),
    );
    const mixed = await desk.createAgent(ME, NUMEN, {
      ...base,
      tokenHash: good.hash,
      tokenPrefix: good.prefix,
      publicKey: 'ed25519:x',
    } as never);
    expect(mixed).toMatchObject({ ok: false });
    const bare = await desk.createAgent(ME, NUMEN, { ...base } as never);
    expect(bare).toMatchObject({ ok: false });
    const keyWithHash = await desk.createAgent(ME, NUMEN, {
      id: 'k',
      name: 'K',
      publicKey: 'ed25519:x',
      tokenHash: good.hash,
    } as never);
    expect(keyWithHash).toMatchObject({ ok: false });
    expect(
      await desk.createAgent(ME, NUMEN, {
        ...base,
        tokenHash: good.hash,
        tokenPrefix: good.prefix,
      }),
    ).toMatchObject({ ok: true });
    const same = await desk.createAgent(ME, NUMEN, {
      id: 'b',
      name: 'B',
      auth: 'token',
      tokenHash: good.hash,
      tokenPrefix: good.prefix,
    });
    expect(same).toMatchObject({ ok: false });
    // Renewing with a malformed value, or the same hash, is refused too.
    expect(await desk.renewAgentToken(ME, NUMEN, 'a', 'x', 'y')).toMatchObject({ ok: false });
    expect(await desk.renewAgentToken(ME, NUMEN, 'a', good.hash, good.prefix)).toMatchObject({
      ok: false,
    });
    expect(await desk.revokeAgentToken(ME, NUMEN, 'nobody')).toMatchObject({ ok: false });
  });

  it('gives the pass route the token’s hash, and only to the pass route', async () => {
    const desk = fresh();
    const { token } = await made(desk);
    const pass = await desk.agentPass(NUMEN, 'hermes-1');
    expect(pass).toMatchObject({ agent: { auth: 'token', tokenHash: await hashToken(token) } });
  });
});

describe('through a bound till', () => {
  it('passes renew and revoke on, and says when the till is older', async () => {
    const desk = fresh();
    const bound = boundAccounts(desk) as AccountDesk;
    const one = await newToken();
    await made(desk);
    expect(await bound.renewAgentToken(ME, NUMEN, 'hermes-1', one.hash, one.prefix)).toMatchObject({
      ok: true,
    });
    expect(await bound.revokeAgentToken(ME, NUMEN, 'hermes-1')).toMatchObject({ ok: true });
    const old = boundAccounts({
      ...desk,
      renewAgentToken: undefined,
      revokeAgentToken: undefined,
    } as never) as AccountDesk;
    await expect(
      old.renewAgentToken(ME, NUMEN, 'hermes-1', one.hash, one.prefix),
    ).rejects.toThrow();
    await expect(old.revokeAgentToken(ME, NUMEN, 'hermes-1')).rejects.toThrow();
  });
});

describe('POST /api/agents/pass with a bearer', () => {
  async function setUp() {
    const desk = fresh();
    const { token } = await made(desk);
    const privateKey = await worldKey();
    const context: AgentPassContext = { hosts: HOSTS, privateKey, secret: SECRET, now: NOW };
    return { desk, token, privateKey, context };
  }
  const post = (
    token: string | null,
    body: unknown = { org: NUMEN, agent: 'hermes-1', aud: 'agora-plaza' },
  ) =>
    new Request('https://numinia.test/api/agents/pass', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('answers a pass the world accepts, without a nonce: the same request twice works', async () => {
    const { desk, token, privateKey, context } = await setUp();
    for (let i = 0; i < 2; i += 1) {
      const response = await answerAgentPass(desk, post(token), context, quiet);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const { pass, exp } = (await json(response)) as { pass: string; exp: number };
      expect(exp).toBe(NOW + 600);
      const verdict = await verifyPass(pass, (await publicKeyDocument(privateKey)).publicKey, {
        aud: 'agora-plaza',
        now: NOW,
      });
      expect(verdict.ok).toBe(true);
      if (verdict.ok)
        expect(verdict.payload).toMatchObject({ org: NUMEN, kind: 'agent', name: 'Hermes' });
    }
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(token);
  });

  it('answers the same generic 401 to every wrong credential, and never repeats it', async () => {
    const { desk, token, context } = await setUp();
    const other = await newToken();
    // A key agent too, to say a bearer to it is the same refusal.
    await desk.createAgent(ME, NUMEN, {
      id: 'keyed',
      name: 'Keyed',
      publicKey: `ed25519:${b64urlEncode(new Uint8Array(32).fill(9))}`,
      roleIds: [MEMBER_ROLE],
    });
    const attempts: Request[] = [
      post(other.token), // a token that is not its own
      post(token, { org: NUMEN, agent: 'nobody', aud: 'agora-plaza' }), // unknown agent
      post(token, { org: NUMEN, agent: 'keyed', aud: 'agora-plaza' }), // a key agent
      post(`ntk_${'A'.repeat(42)}`), // not shaped like a token
      new Request('https://numinia.test/api/agents/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Basic abc' },
        body: JSON.stringify({ org: NUMEN, agent: 'hermes-1', aud: 'agora-plaza' }),
      }),
    ];
    const seen: string[] = [];
    for (const attempt of attempts) {
      const response = await answerAgentPass(desk, attempt, context, quiet);
      expect(response.status).toBe(401);
      seen.push(JSON.stringify(await response.json()));
    }
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toContain('"token"');
    expect(seen[0]).not.toContain(token);
    expect(JSON.stringify(quiet.mock.calls)).not.toContain(other.token);
  });

  it('refuses a revoked token, a token agent that signs, and honours the switch', async () => {
    const { desk, token, context } = await setUp();
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: false });
    expect((await answerAgentPass(desk, post(token), context, quiet)).status).toBe(403);
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: true });
    // A signature to a token agent: a refusal of the key way.
    const signed = await answerAgentPass(
      desk,
      new Request('https://numinia.test/api/agents/pass', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          org: NUMEN,
          agent: 'hermes-1',
          aud: 'agora-plaza',
          t: NOW,
          sig: 'A'.repeat(86),
        }),
      }),
      context,
      quiet,
    );
    expect(signed.status).toBe(401);
    expect(await json(signed)).toMatchObject({ error: 'firma' });
    await desk.revokeAgentToken(ME, NUMEN, 'hermes-1');
    expect((await answerAgentPass(desk, post(token), context, quiet)).status).toBe(401);
  });

  it('stops working the moment it is renewed', async () => {
    const { desk, token, context } = await setUp();
    const renewed = await newToken();
    await desk.renewAgentToken(ME, NUMEN, 'hermes-1', renewed.hash, renewed.prefix);
    expect((await answerAgentPass(desk, post(token), context, quiet)).status).toBe(401);
    expect((await answerAgentPass(desk, post(renewed.token), context, quiet)).status).toBe(200);
  });

  it('limits each agent to sixty requests a minute, existing or not, with retry-after', async () => {
    const { desk, context } = await setUp();
    const bad = await newToken();
    for (let i = 0; i < TOKEN_REQUESTS_PER_MINUTE; i += 1) {
      expect((await answerAgentPass(desk, post(bad.token), context, quiet)).status).toBe(401);
    }
    const limited = await answerAgentPass(desk, post(bad.token), context, quiet);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await json(limited)).toMatchObject({ error: 'limite' });
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ kind: 'throttled' }));
    // Another agent is not touched by it.
    const stranger = await answerAgentPass(
      desk,
      post(bad.token, { org: NUMEN, agent: 'someone-else', aud: 'agora-plaza' }),
      context,
      quiet,
    );
    expect(stranger.status).toBe(401);
  });

  it('keeps the rest of the road: a world that is not there, no till, a body that is not the contract’s', async () => {
    const { desk, token, context } = await setUp();
    expect(
      (
        await answerAgentPass(
          desk,
          post(token, { org: NUMEN, agent: 'hermes-1', aud: 'bosque' }),
          context,
          quiet,
        )
      ).status,
    ).toBe(404);
    expect((await answerAgentPass(null, post(token), context, quiet)).status).toBe(503);
    expect((await answerAgentPass(desk, post(token, 'nope'), context, quiet)).status).toBe(400);
    expect(
      (
        await answerAgentPass(
          desk,
          post(token, { org: NUMEN, agent: 'hermes-1', aud: 'agora-plaza', t: 1 }),
          context,
          quiet,
        )
      ).status,
    ).toBe(400);
    const unsigned = { ...context, secret: '' };
    expect((await answerAgentPass(desk, post(token), unsigned, quiet)).status).toBe(503);
  });
});
