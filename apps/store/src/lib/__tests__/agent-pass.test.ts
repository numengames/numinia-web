/**
 * «IAs de organización»: POST /api/agents/pass (lib/agent-pass.ts) against the
 * fixture desk, with real Ed25519 keys: the agent signs, numinia.com answers a
 * pass the world's verifier accepts — or a refusal in words.
 */

import { describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { answerAgentPass, type AgentPassContext } from '../agent-pass';
import { passMessage } from '../agents';
import { agentSub, b64urlEncode, publicKeyDocument, verifyPass } from '../world-pass';

const NOW_MS = Date.parse('2026-10-17T10:00:00.000Z');
const NOW = Math.floor(NOW_MS / 1000);
const ME = `0x${'ab'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';
const SECRET = 'secret-of-the-session-'.repeat(2);
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const seed = deskSeed as unknown as AccountsSeed;
const quiet = vi.fn();

const HOSTS = new Map([
  ['agora-plaza', 'agora.example'],
  ['bosque', 'bosque.example'],
  ['cielo', 'cielo.example'],
]);

interface Keys {
  readonly secretKey: CryptoKey;
  readonly publicKey: string;
}

async function agentKeys(): Promise<Keys> {
  const pair = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { secretKey: pair.privateKey, publicKey: `ed25519:${b64urlEncode(raw)}` };
}

async function worldKey(): Promise<string> {
  const pair = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  return btoa(
    String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))),
  );
}

const sign = async (keys: Keys, org: string, agent: string, aud: string, t: number) =>
  b64urlEncode(
    new Uint8Array(
      await crypto.subtle.sign(
        'Ed25519',
        keys.secretKey,
        new TextEncoder().encode(passMessage(org, agent, aud, t)),
      ),
    ),
  );

async function setUp() {
  const desk = createAccountsFixtureDesk(
    {
      ...seed,
      homes: [
        { worldId: 'agora-plaza', accountId: NUMEN, placedDaysAgo: 5 },
        { worldId: 'bosque', accountId: 'acc_team_reset', placedDaysAgo: 3 },
      ],
    },
    () => new Date(NOW_MS),
  );
  const keys = await agentKeys();
  const created = await desk.createAgent(ME, NUMEN, {
    id: 'hermes-1',
    name: 'Hermes',
    publicKey: keys.publicKey,
    roleIds: [MEMBER_ROLE],
  });
  if (!created.ok) throw new Error(created.problems.join());
  const privateKey = await worldKey();
  const context: AgentPassContext = { hosts: HOSTS, privateKey, secret: SECRET, now: NOW };
  return { desk, keys, privateKey, context };
}

const bodyFor = async (
  keys: Keys,
  over: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  const base = { org: NUMEN, agent: 'hermes-1', aud: 'agora-plaza', t: NOW };
  const merged = { ...base, ...over };
  return {
    ...merged,
    sig: await sign(
      keys,
      merged.org as string,
      merged.agent as string,
      merged.aud as string,
      merged.t as number,
    ),
    ...over,
  };
};

const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request('https://numinia.test/api/agents/pass', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const read = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe('POST /api/agents/pass: an agent gets its pass', () => {
  it('answers a pass of ten minutes the world accepts, with the agent’s own fields', async () => {
    const { desk, keys, privateKey, context } = await setUp();
    const response = await answerAgentPass(desk, post(await bodyFor(keys)), context, quiet);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    const { pass, exp } = (await read(response)) as { pass: string; exp: number };
    expect(exp).toBe(NOW + 600);
    const document = await publicKeyDocument(privateKey);
    const verdict = await verifyPass(pass, document.publicKey, { aud: 'agora-plaza', now: NOW });
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;
    expect(verdict.payload).toMatchObject({
      aud: 'agora-plaza',
      org: NUMEN,
      kind: 'agent',
      state: 'activa',
      name: 'Hermes',
      sub: await agentSub(SECRET, NUMEN, 'hermes-1'),
      perm: ['enter-worlds', 'build-in-worlds'],
      iat: NOW,
      exp: NOW + 600,
    });
    expect(verdict.payload.roles.map((role) => role.name)).toEqual(['Miembro']);
  });

  it('takes build-in-worlds from an agent that sleeps', async () => {
    const { desk, keys, privateKey, context } = await setUp();
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { state: 'dormida' });
    const response = await answerAgentPass(desk, post(await bodyFor(keys)), context, quiet);
    const { pass } = (await read(response)) as { pass: string };
    const verdict = await verifyPass(pass, (await publicKeyDocument(privateKey)).publicKey, {
      aud: 'agora-plaza',
      now: NOW,
    });
    expect(verdict.ok && verdict.payload).toMatchObject({
      state: 'dormida',
      perm: ['enter-worlds'],
    });
  });

  it('is good for sixty seconds either side of t, and no more', async () => {
    const { desk, keys, context } = await setUp();
    for (const t of [NOW - 60, NOW + 60]) {
      expect(
        (await answerAgentPass(desk, post(await bodyFor(keys, { t })), context, quiet)).status,
      ).toBe(200);
    }
    for (const t of [NOW - 61, NOW + 61]) {
      const late = await answerAgentPass(desk, post(await bodyFor(keys, { t })), context, quiet);
      expect(late.status).toBe(400);
      expect(await read(late)).toMatchObject({ error: 'hora' });
    }
  });

  it('uses a request once: the same one again is repeated', async () => {
    const { desk, keys, context } = await setUp();
    const body = await bodyFor(keys);
    expect((await answerAgentPass(desk, post(body), context, quiet)).status).toBe(200);
    const again = await answerAgentPass(desk, post(body), context, quiet);
    expect(again.status).toBe(409);
    expect(await read(again)).toMatchObject({ error: 'repetida', texto: expect.any(String) });
    // Another second, another world: each is its own request.
    expect(
      (await answerAgentPass(desk, post(await bodyFor(keys, { t: NOW + 1 })), context, quiet))
        .status,
    ).toBe(200);
  });
});

describe('POST /api/agents/pass: refusals', () => {
  it('refuses a signature that is not the agent’s, in any shape', async () => {
    const { desk, keys, context } = await setUp();
    const other = await agentKeys();
    const expectFirma = async (sig: string) => {
      const response = await answerAgentPass(
        desk,
        post({ ...(await bodyFor(keys)), sig }),
        context,
        quiet,
      );
      expect(response.status).toBe(401);
      expect(await read(response)).toMatchObject({ error: 'firma' });
    };
    await expectFirma(await sign(other, NUMEN, 'hermes-1', 'agora-plaza', NOW));
    // The right key, but over another world, agent, organization or second.
    await expectFirma(await sign(keys, NUMEN, 'hermes-1', 'bosque', NOW));
    await expectFirma(await sign(keys, 'acc_other', 'hermes-1', 'agora-plaza', NOW));
    await expectFirma(await sign(keys, NUMEN, 'hermes-1', 'agora-plaza', NOW - 1));
    await expectFirma('not base64url!');
    await expectFirma('AAAA');
  });

  it('refuses a key the till keeps that is not a key', async () => {
    const { desk, keys, context } = await setUp();
    const odd: AccountDesk = {
      ...desk,
      agentPass: async (org, agent) => {
        const pass = await desk.agentPass(org, agent);
        return pass.ok ? { ...pass, agent: { ...pass.agent, publicKey: 'junk' } } : pass;
      },
    };
    const response = await answerAgentPass(odd, post(await bodyFor(keys)), context, quiet);
    expect(response.status).toBe(401);
  });

  it('says why: off, nobody answers for it, it may not enter', async () => {
    const { desk, keys, context } = await setUp();
    const fresh = async (t: number) =>
      answerAgentPass(desk, post(await bodyFor(keys, { t })), { ...context, now: t }, quiet);
    await desk.takeAgentRole(ME, NUMEN, 'hermes-1', MEMBER_ROLE);
    const noEnter = await fresh(NOW + 10);
    expect(noEnter.status).toBe(403);
    expect(await read(noEnter)).toMatchObject({ error: 'sin-permiso' });
    await desk.giveAgentRole(ME, NUMEN, 'hermes-1', MEMBER_ROLE);
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: false });
    const off = await fresh(NOW + 20);
    expect(off.status).toBe(403);
    expect(await read(off)).toMatchObject({
      error: 'apagada',
      texto: expect.stringContaining('apagada'),
    });
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: true });
    expect((await fresh(NOW + 30)).status).toBe(200);
    await desk.removeMember(ME, NUMEN, ME);
    const orphan = await fresh(NOW + 40);
    expect(orphan.status).toBe(403);
    expect(await read(orphan)).toMatchObject({ error: 'sin-responsable' });
  });

  it('says 404 for an agent or a world that is not there, 403 for a world of another organization', async () => {
    const { desk, keys, context } = await setUp();
    const ghost = await answerAgentPass(
      desk,
      post(await bodyFor(keys, { agent: 'ghost' })),
      context,
      quiet,
    );
    expect(ghost.status).toBe(404);
    expect(await read(ghost)).toMatchObject({ error: 'no-existe' });
    const nowhere = await answerAgentPass(
      desk,
      post(await bodyFor(keys, { aud: 'atlantis' })),
      context,
      quiet,
    );
    expect(nowhere.status).toBe(404);
    expect(await read(nowhere)).toMatchObject({ error: 'mundo' });
    for (const aud of ['bosque', 'cielo']) {
      const foreign = await answerAgentPass(
        desk,
        post(await bodyFor(keys, { aud })),
        context,
        quiet,
      );
      expect(foreign.status).toBe(403);
      expect(await read(foreign)).toMatchObject({ error: 'otra-organizacion' });
    }
    const elsewhere = await answerAgentPass(
      desk,
      post(await bodyFor(keys, { org: 'acc_team_reset' })),
      context,
      quiet,
    );
    expect(elsewhere.status).toBe(404);
  });

  it('refuses a body that is not the contract’s', async () => {
    const { desk, keys, context } = await setUp();
    const good = await bodyFor(keys);
    const bad = async (request: Request) => {
      const response = await answerAgentPass(desk, request, context, quiet);
      expect(response.status).toBe(400);
      expect(await read(response)).toMatchObject({ error: 'peticion' });
    };
    await bad(post(good, { 'content-type': 'text/plain' }));
    await bad(post('{'));
    await bad(post(JSON.stringify([good])));
    await bad(post({ ...good, extra: 1 }));
    await bad(post({ ...good, t: 1.5 }));
    await bad(post({ ...good, t: '1' }));
    await bad(post({ ...good, agent: 'Bad!' }));
    await bad(post({ ...good, org: 'no such!' }));
    await bad(post({ ...good, aud: 'Agora' }));
    await bad(post({ ...good, sig: '' }));
    await bad(post({ ...good, sig: 'x'.repeat(200) }));
    await bad(post(good, { 'content-length': '5000' }));
    await bad(post({ ...good, sig: 'x'.repeat(100), pad: 'y'.repeat(2000) }));
  });
});

describe('POST /api/agents/pass: fails closed', () => {
  it('is a 503 without a till, and the till’s failures are told apart', async () => {
    const { desk, keys, context } = await setUp();
    const body = await bodyFor(keys);
    const none = await answerAgentPass(null, post(body), context, quiet);
    expect(none.status).toBe(503);
    expect(await read(none)).toMatchObject({ error: 'no-vinculado' });
    const throwing = (method: keyof AccountDesk, message = 'boom'): AccountDesk =>
      ({ ...desk, [method]: async () => Promise.reject(new Error(message)) }) as AccountDesk;
    for (const method of ['agentPass', 'homeOf', 'claimAgentPass'] as const) {
      const failed = await answerAgentPass(throwing(method), post(body), context, quiet);
      expect(failed.status).toBe(502);
      expect(await read(failed)).toMatchObject({ error: 'caja' });
      const older = await answerAgentPass(
        throwing(method, 'The desk does not implement the method "x".'),
        post(body),
        context,
        quiet,
      );
      expect(older.status).toBe(503);
      expect(await read(older)).toMatchObject({ error: 'no-vinculado' });
    }
    const shapeless = { ...desk, agentPass: async () => ({ ok: true }) } as unknown as AccountDesk;
    expect((await answerAgentPass(shapeless, post(body), context, quiet)).status).toBe(502);
  });

  it('is a 503 without a signing key, and a request that finds none burns no nonce', async () => {
    const { desk, keys, privateKey, context } = await setUp();
    const body = await bodyFor(keys);
    for (const broken of [
      { ...context, secret: undefined },
      { ...context, secret: '' },
      { ...context, privateKey: undefined },
      { ...context, privateKey: 'not a key' },
    ]) {
      const response = await answerAgentPass(desk, post(body), broken, quiet);
      expect(response.status).toBe(503);
      expect(await read(response)).toMatchObject({ error: 'sin-clave' });
    }
    expect(quiet).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'agent-pass', rule: 'no-key' }),
    );
    expect(quiet).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'agent-pass', rule: 'bad-key' }),
    );
    // The same request, with the key back, still goes through: nothing was spent.
    expect(
      (await answerAgentPass(desk, post(body), { ...context, privateKey }, quiet)).status,
    ).toBe(200);
  });

  it('logs a signing failure that is not the key’s as «threw»', async () => {
    const { desk, keys, context } = await setUp();
    const body = await bodyFor(keys);
    const spy = vi.spyOn(crypto.subtle, 'sign').mockRejectedValueOnce(new Error('odd'));
    const response = await answerAgentPass(desk, post(body), context, quiet);
    spy.mockRestore();
    expect(response.status).toBe(503);
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ rule: 'threw' }));
  });
});

describe('POST /api/agents/pass: the ia block (S18, D-084)', () => {
  const RESPONDE = { comunidad: 'Numen Games', nombre: 'Pablo' };

  /** The fixture desk, speaking as a till that says who answers for the AI. */
  const talking = (desk: AccountDesk, responde: unknown): AccountDesk => ({
    ...desk,
    agentPass: async (accountId, agentId) => {
      const answer = await desk.agentPass(accountId, agentId);
      return answer.ok ? ({ ...answer, responde } as typeof answer) : answer;
    },
  });

  const passOf = async (desk: AccountDesk, context: AgentPassContext, keys: Keys) => {
    const response = await answerAgentPass(desk, post(await bodyFor(keys)), context, quiet);
    expect(response.status).toBe(200);
    const { pass } = (await read(response)) as { pass: string };
    const verdict = await verifyPass(
      pass,
      (await publicKeyDocument(context.privateKey)).publicKey,
      {
        aud: 'agora-plaza',
        now: NOW,
      },
    );
    if (!verdict.ok) throw new Error(verdict.why);
    return verdict.payload;
  };

  it('puts it on the pass of a world that takes it, with who answers for the AI', async () => {
    const { desk, keys, context } = await setUp();
    const asked: string[] = [];
    const payload = await passOf(
      talking(desk, RESPONDE),
      {
        ...context,
        takesIa: async (aud) => {
          asked.push(aud);
          return true;
        },
      },
      keys,
    );
    expect(asked).toEqual(['agora-plaza']);
    expect(payload.ia?.responde).toEqual(RESPONDE);
  });

  it('names the person by wallet when they published no name', async () => {
    const { desk, keys, context } = await setUp();
    const responde = { comunidad: 'Numen Games', cartera: ME };
    const payload = await passOf(
      talking(desk, responde),
      { ...context, takesIa: async () => true },
      keys,
    );
    expect(payload.ia?.responde).toEqual(responde);
  });

  it('leaves it out for a world whose engine does not take it, or that cannot be asked', async () => {
    const refusing: AgentPassContext['takesIa'][] = [
      async () => false,
      async () => {
        throw new Error('the world did not answer');
      },
      undefined,
    ];
    for (const takesIa of refusing) {
      // A request is used once: each case is its own AI.
      const { desk, keys, context } = await setUp();
      const talker = talking(desk, RESPONDE);
      const payload = await passOf(talker, { ...context, ...(takesIa ? { takesIa } : {}) }, keys);
      expect('ia' in payload).toBe(false);
      expect(payload).toMatchObject({ kind: 'agent', name: 'Hermes' });
    }
  });

  it('leaves it out when the till names no one, or names them in a form the pass does not take', async () => {
    const nothing = [undefined, null, {}, { nombre: 'Pablo' }, { comunidad: 'x', cartera: '0xAB' }];
    for (const responde of nothing) {
      const { desk, keys, context } = await setUp();
      const asked = vi.fn(async () => true);
      const payload = await passOf(talking(desk, responde), { ...context, takesIa: asked }, keys);
      expect('ia' in payload, JSON.stringify(responde)).toBe(false);
      expect(asked).not.toHaveBeenCalled();
    }
  });

  it('carries the AI’s own presence: how it looks and is called, and how long it stays', async () => {
    const { desk, keys, context } = await setUp();
    const changed = await desk.changeAgentPresence?.(ME, NUMEN, 'hermes-1', {
      quedarse_h: 4,
      oye: 'burbuja',
    });
    expect(changed?.ok).toBe(true);
    const payload = await passOf(
      talking(desk, RESPONDE),
      { ...context, takesIa: async () => true },
      keys,
    );
    expect(payload.ia).toMatchObject({
      responde: RESPONDE,
      quedarse_h: 4,
    });
  });
});
