/**
 * condiciones/w5: the world pass says what the person already accepted on numinia.com. The field is `acepto: { casa }`, the legal
 * corpus the SIGNED SESSION accepted at sign-in, only when it is the current one; a person who did not accept (or an older corpus)
 * gets a pass byte for byte as before. It is covered by the signature, never on an AI's pass, and the Worker only adds it with
 * WORLD_PASS_ACEPTO=si. The session code is the real one (real tokens), as in session-asker.test.ts.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '@numinia/auth';
import type { AccountDesk, Asker } from '../accounts';
import { LEGAL_CORPUS_VERSION } from '../legal';
import {
  PASS_TTL_SECONDS,
  b64urlDecode,
  b64urlEncode,
  buildAgentPassPayload,
  buildPassPayload,
  signPass,
  verifyPass,
  type PassPayload,
} from '../world-pass';
import { answerPass, passSaysAccepted, type PassContext } from '../world-pass-answer';

const SECRET = 'a'.repeat(40);
const WALLET = `0x${'AB'.repeat(20)}`;
const NOW = 1_800_000_000;
const ORG = 'acc_team_reset';
const MEMBER: Asker = { wallet: WALLET, house: false };

let privateKey = '';
let publicKey = '';
beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  privateKey = btoa(String.fromCharCode(...pkcs8));
  publicKey = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
});

const at = { aud: 'bosque', now: NOW };
const access = { as: 'member' as const, permissions: ['enter-worlds'], holders: {} };
const roles = {
  ok: true as const,
  accountId: ORG,
  as: 'member' as const,
  roles: [{ id: 'r1', name: 'Builders', color: '#aabbcc', position: 2 }],
  members: [{ wallet: WALLET.toLowerCase(), roleIds: ['r1'], name: 'Ana' }],
};
const input = { aud: 'bosque', org: ORG, secret: SECRET, wallet: WALLET, access, roles, now: NOW };

describe('buildPassPayload and the accepted corpus', () => {
  it('adds acepto.casa when the session accepted the current corpus, and nothing else changes', async () => {
    const without = await buildPassPayload(input);
    const withIt = await buildPassPayload({ ...input, acceptedTerms: LEGAL_CORPUS_VERSION });
    expect(withIt.acepto).toEqual({ casa: LEGAL_CORPUS_VERSION });
    const { acepto: _acepto, ...rest } = withIt;
    expect(rest).toEqual(without);
    expect(withIt.exp).toBe(NOW + PASS_TTL_SECONDS);
  });

  it('leaves the pass exactly as before when the person has not accepted (none, null or empty)', async () => {
    const before = JSON.stringify(await buildPassPayload(input));
    for (const none of [undefined, null, '']) {
      const payload = await buildPassPayload({ ...input, acceptedTerms: none });
      expect('acepto' in payload).toBe(false);
      expect(JSON.stringify(payload)).toBe(before);
    }
  });

  it('never puts it on an AI’s pass', async () => {
    const agent = await buildAgentPassPayload({
      aud: 'bosque',
      org: ORG,
      secret: SECRET,
      agent: 'ag_1',
      name: 'Hermes',
      state: 'activa',
      access: { permissions: ['enter-worlds'], height: 1 },
      roles: [],
      now: NOW,
    });
    expect('acepto' in agent).toBe(false);
  });
});

describe('verifyPass and acepto', () => {
  const sign = (payload: object) => signPass(privateKey, payload as PassPayload);

  it('accepts a person’s pass with acepto.casa and hands it back', async () => {
    const payload = await buildPassPayload({ ...input, acceptedTerms: LEGAL_CORPUS_VERSION });
    const verdict = await verifyPass(await sign(payload), publicKey, at);
    expect(verdict).toEqual({ ok: true, payload });
  });

  it('refuses acepto of the wrong shape, and any acepto on an AI’s pass', async () => {
    const base = await buildPassPayload(input);
    for (const bad of ['terms', 3, null, [LEGAL_CORPUS_VERSION], {}, { casa: 3 }]) {
      const verdict = await verifyPass(await sign({ ...base, acepto: bad }), publicKey, at);
      expect(verdict, JSON.stringify(bad)).toEqual({ ok: false, why: 'payload' });
    }
    const agent = {
      ...base,
      sub: `a_${'0'.repeat(32)}`,
      name: 'Hermes',
      kind: 'agent',
      state: 'activa',
      acepto: { casa: LEGAL_CORPUS_VERSION },
    };
    expect(await verifyPass(await sign(agent), publicKey, at)).toEqual({
      ok: false,
      why: 'payload',
    });
  });

  it('covers the field with the signature: editing acepto after signing breaks it', async () => {
    const token = await sign(
      await buildPassPayload({ ...input, acceptedTerms: 'terms@0.0.1+privacy@0.0.1' }),
    );
    const [head, body, signature] = token.split('.') as [string, string, string];
    const edited = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body) as Uint8Array),
    ) as PassPayload;
    const forged = b64urlEncode(
      new TextEncoder().encode(
        JSON.stringify({ ...edited, acepto: { casa: LEGAL_CORPUS_VERSION } }),
      ),
    );
    expect(await verifyPass(`${head}.${forged}.${signature}`, publicKey, at)).toEqual({
      ok: false,
      why: 'signature',
    });
  });

  it('keeps the pass short: the field adds well under 100 bytes', async () => {
    const a = await sign(await buildPassPayload(input));
    const b = await sign(await buildPassPayload({ ...input, acceptedTerms: LEGAL_CORPUS_VERSION }));
    expect(b.length - a.length).toBeLessThan(100);
  });
});

describe('POST /api/mundos/<id>/pass and acepto', () => {
  const context = (extra: Partial<PassContext> = {}): PassContext => ({
    worldId: 'bosque',
    hosts: new Map([['bosque', 'bosque.numen.games']]),
    origin: 'https://numinia.com',
    requestOrigin: 'https://numinia.com',
    privateKey,
    secret: SECRET,
    now: NOW,
    ...extra,
  });
  const desk = (): AccountDesk =>
    ({
      homeOf: vi.fn(async () => ({ ok: true, home: { accountId: ORG }, manage: true })),
      access: vi.fn(async () => ({ ok: true, accountId: ORG, ...access })),
      roles: vi.fn(async () => roles),
    }) as unknown as AccountDesk;
  const payloadOf = async (response: Response): Promise<PassPayload> => {
    const body = (await response.json()) as { url: string };
    const token = new URL(body.url).hash.replace('#pass=', '');
    const verdict = await verifyPass(token, publicKey, at);
    if (!verdict.ok) throw new Error(`pass refused: ${verdict.why}`);
    return verdict.payload;
  };

  it('signs the accepted corpus into the pass of a member who accepted it', async () => {
    const out = await answerPass(
      desk(),
      MEMBER,
      context({ acceptedTerms: LEGAL_CORPUS_VERSION }),
      vi.fn(),
    );
    expect((await payloadOf(out)).acepto).toEqual({ casa: LEGAL_CORPUS_VERSION });
  });

  it('signs none when the route found none', async () => {
    for (const extra of [{}, { acceptedTerms: null }] as Partial<PassContext>[]) {
      const payload = await payloadOf(await answerPass(desk(), MEMBER, context(extra), vi.fn()));
      expect('acepto' in payload).toBe(false);
    }
  });

  it('a guest link carries no pass, so no acepto', async () => {
    const out = await answerPass(
      desk(),
      null,
      context({ acceptedTerms: LEGAL_CORPUS_VERSION }),
      vi.fn(),
    );
    expect(await out.json()).toEqual({ url: 'https://bosque.numen.games/', pass: false });
  });
});

describe('the switch: WORLD_PASS_ACEPTO=si', () => {
  it('is off unless the Worker says si', () => {
    expect(passSaysAccepted({})).toBe(false);
    for (const off of ['', 'no', '1', 'true', undefined]) {
      expect(passSaysAccepted({ WORLD_PASS_ACEPTO: off })).toBe(false);
    }
    for (const on of ['si', ' SI ']) expect(passSaysAccepted({ WORLD_PASS_ACEPTO: on })).toBe(true);
  });
});

describe('sessionAcceptedTerms (real session tokens)', () => {
  const SESSION_SECRET = 'y'.repeat(40);
  const EPOCH = Math.floor(Date.now() / 1000);
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('THIRDWEB_SECRET_KEY', 'x'.repeat(40));
    vi.stubEnv('AUTH_SESSION_SECRET', SESSION_SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const token = (terms: string | undefined, secret = SESSION_SECRET, exp = EPOCH + 3_600) =>
    createSessionToken(
      {
        sub: WALLET,
        rank: 'nomad',
        iat: EPOCH - 60,
        exp,
        ...(terms === undefined ? {} : { terms }),
      },
      secret,
    );
  const read = async (t: string | undefined) => {
    const { sessionAcceptedTerms } = await import('../auth/session-wallet');
    return sessionAcceptedTerms(t);
  };

  it('gives the current corpus of a valid session', async () => {
    expect(await read(await token(LEGAL_CORPUS_VERSION))).toBe(LEGAL_CORPUS_VERSION);
  });

  it('gives nothing for an older corpus, no terms, another secret, an expired session or no cookie', async () => {
    expect(await read(await token('terms@0.0.1+privacy@0.0.1'))).toBeNull();
    expect(await read(await token(undefined))).toBeNull();
    expect(await read(await token(LEGAL_CORPUS_VERSION, 'z'.repeat(40)))).toBeNull();
    expect(await read(await token(LEGAL_CORPUS_VERSION, SESSION_SECRET, EPOCH - 10))).toBeNull();
    expect(await read(undefined)).toBeNull();
    expect(await read('not-a-token')).toBeNull();
  });
});
