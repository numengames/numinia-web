import { describe, expect, it, vi } from 'vitest';
import { createThirdwebClient } from 'thirdweb';
import { verifyEOASignature } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { hmacSha256, toBase64Url, verifySessionToken } from '@numinia/auth';
import { SUPPORTED_LOCALES } from '@numinia/domain';
import {
  FRESH_TTL_MS,
  actDigest,
  canonicalAct,
  checkFresh,
  freshMessage,
  issueFreshToken,
  readFreshToken,
  type FreshClaims,
  type FreshDeps,
} from '../fresh-signature';
import { FRESH_SIGNATURE_WORDS } from '../../i18n/fresh-signature';

const SECRET = 'z'.repeat(40);
const NOW = Date.parse('2026-10-15T18:30:00.000Z');
const ACT = { action: 'give-role', accountId: 'acc', wallet: `0x${'cd'.repeat(20)}`, roleId: 'r' };

/** A wallet of its own for each test: a random key, never one written down. */
function testWallet() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return privateKeyToAccount({ client: createThirdwebClient({ clientId: 'test' }), privateKey });
}

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/** A token our secret signed around any body at all: what only a bug of ours could write. */
async function mint(body: string): Promise<string> {
  return `f1.${body}.${toBase64Url(await hmacSha256(SECRET, encode(`f1.${body}`)))}`;
}

function deps(overrides: Partial<FreshDeps> = {}): FreshDeps {
  return {
    secret: SECRET,
    verify: async ({ message, signature, address }) =>
      verifyEOASignature({ message, signature, address }),
    now: () => NOW,
    ...overrides,
  };
}

async function claimsFor(wallet: string, message = 'Numinia · Numen'): Promise<FreshClaims> {
  return {
    wallet,
    act: await actDigest(ACT),
    message,
    chainId: null,
    expiresAt: NOW + FRESH_TTL_MS,
  };
}

describe('the act, in one canonical text', () => {
  it('sorts the keys at every depth and keeps lists in their order', () => {
    expect(canonicalAct({ b: 1, a: { d: [2, 1], c: 'x', e: null, f: true } })).toBe(
      '{"a":{"c":"x","d":[2,1],"e":null,"f":true},"b":1}',
    );
  });

  it('hashes the same act the same, whatever order it came in, and another act otherwise', async () => {
    const reordered = { roleId: 'r', wallet: ACT.wallet, accountId: 'acc', action: 'give-role' };
    expect(await actDigest(reordered)).toBe(await actDigest(ACT));
    expect(await actDigest({ ...ACT, roleId: 's' })).not.toBe(await actDigest(ACT));
    expect(await actDigest(ACT)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('the token', () => {
  it('carries its claims under our secret, and gives them back', async () => {
    const claims = await claimsFor(`0x${'ab'.repeat(20)}`, 'Numinia · «Señal» 管理者');
    const token = await issueFreshToken(SECRET, claims);
    expect(token).toMatch(/^f1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    expect(await readFreshToken(SECRET, token)).toEqual(claims);
  });

  it('is worth nothing touched, under another secret or in another shape', async () => {
    const token = await issueFreshToken(SECRET, await claimsFor(`0x${'ab'.repeat(20)}`));
    const [, body = '', mac = ''] = token.split('.');
    const flipped = `${body.slice(0, 5)}${body[5] === 'A' ? 'B' : 'A'}${body.slice(6)}`;
    expect(await readFreshToken(SECRET, `f1.${flipped}.${mac}`)).toBeNull();
    expect(await readFreshToken('y'.repeat(40), token)).toBeNull();
    expect(await readFreshToken(SECRET, `v1.${body}.${mac}`)).toBeNull();
    expect(await readFreshToken(SECRET, `f1.${body}`)).toBeNull();
    expect(await readFreshToken(SECRET, `f1.${body}.${mac}!`)).toBeNull();
  });

  it('refuses a body our secret signed that is not claims', async () => {
    expect(await readFreshToken(SECRET, await mint('!!'))).toBeNull();
    expect(await readFreshToken(SECRET, await mint(toBase64Url(encode('not json'))))).toBeNull();
    const wrong = { wallet: 1, act: 'a', message: 'm', chainId: null, expiresAt: NOW };
    expect(
      await readFreshToken(SECRET, await mint(toBase64Url(encode(JSON.stringify(wrong))))),
    ).toBe(null);
  });

  it('never passes for a session, however it is presented', async () => {
    const token = await issueFreshToken(SECRET, await claimsFor(`0x${'ab'.repeat(20)}`));
    const clock = () => Math.floor(NOW / 1000);
    expect((await verifySessionToken(token, SECRET, clock)).valid).toBe(false);
    const dressed = token.replace(/^f1\./, 'v1.');
    expect(await verifySessionToken(dressed, SECRET, clock)).toEqual({
      valid: false,
      reason: 'signature',
    });
  });
});

describe('checking a proof', () => {
  it('passes when the session’s wallet signed the very sentence the token carries, for this act', async () => {
    const wallet = testWallet();
    const you = wallet.address.toLowerCase();
    const claims = await claimsFor(you);
    const token = await issueFreshToken(SECRET, claims);
    const signature = await wallet.signMessage({ message: claims.message });
    expect(await checkFresh(deps(), you, ACT, { token, signature })).toBe('ok');
  });

  it('says a proof is late once its two minutes are over', async () => {
    const wallet = testWallet();
    const you = wallet.address.toLowerCase();
    const claims = await claimsFor(you);
    const token = await issueFreshToken(SECRET, claims);
    const signature = await wallet.signMessage({ message: claims.message });
    const late = deps({ now: () => NOW + FRESH_TTL_MS + 1 });
    expect(await checkFresh(late, you, ACT, { token, signature })).toBe('expired');
    const last = deps({ now: () => NOW + FRESH_TTL_MS });
    expect(await checkFresh(last, you, ACT, { token, signature })).toBe('ok');
  });

  it('refuses a token not ours, another wallet, another act, another sentence or another signer', async () => {
    const wallet = testWallet();
    const you = wallet.address.toLowerCase();
    const claims = await claimsFor(you);
    const token = await issueFreshToken(SECRET, claims);
    const signature = await wallet.signMessage({ message: claims.message });
    const check = (proof: { token: string; signature: string }, who = you, act: unknown = ACT) =>
      checkFresh(deps(), who, act, proof);
    expect(await check({ token: 'f1.x.y', signature })).toBe('mismatch');
    expect(await check({ token, signature }, `0x${'ef'.repeat(20)}`)).toBe('mismatch');
    expect(await check({ token, signature }, you, { ...ACT, roleId: 's' })).toBe('mismatch');
    const otherSentence = await wallet.signMessage({ message: 'something else' });
    expect(await check({ token, signature: otherSentence })).toBe('mismatch');
    const stranger = await testWallet().signMessage({ message: claims.message });
    expect(await check({ token, signature: stranger })).toBe('mismatch');
    expect(await check({ token, signature: 'not a signature' })).toBe('mismatch');
  });

  it('hands the chain the wallet named to the check, and counts a check that breaks as a refusal', async () => {
    const you = `0x${'ab'.repeat(20)}`;
    const token = await issueFreshToken(SECRET, { ...(await claimsFor(you)), chainId: 137 });
    const verify = vi.fn(async () => true);
    expect(await checkFresh(deps({ verify }), you, ACT, { token, signature: '0x01' })).toBe('ok');
    expect(verify).toHaveBeenCalledWith({
      message: 'Numinia · Numen',
      signature: '0x01',
      address: you,
      chainId: 137,
    });
    const broken = deps({
      verify: async () => {
        throw new Error('rpc down');
      },
    });
    expect(await checkFresh(broken, you, ACT, { token, signature: '0x01' })).toBe('mismatch');
  });
});

describe('the sentence the wallet signs', () => {
  const at = NOW + FRESH_TTL_MS;

  it('names the organization, the act, what it gives and until when, in the page’s language', () => {
    const es = FRESH_SIGNATURE_WORDS.es;
    expect(
      freshMessage(es, 'es', at, {
        kind: 'give',
        organization: 'Numen Games',
        role: 'Administración',
        permissions: ['Administrador'],
        who: '0xcdcd…cdcd',
      }),
    ).toBe(
      [
        'Numinia · Numen Games',
        'Das el rol «Administración», con Administrador, a 0xcdcd…cdcd.',
        'Esta firma vale hasta las 18:32 UTC y solo para este cambio. No es una transacción ni cuesta nada.',
      ].join('\n'),
    );
    expect(
      freshMessage(es, 'es', at, {
        kind: 'create',
        organization: 'Numen Games',
        role: 'Ops',
        permissions: ['Administrador', 'Gestionar roles'],
        who: '',
      }).split('\n')[1],
    ).toBe('Creas el rol «Ops» y le das: Administrador y Gestionar roles.');
    expect(
      freshMessage(FRESH_SIGNATURE_WORDS.en, 'en', at, {
        kind: 'edit',
        organization: 'Numen Games',
        role: 'Ops',
        permissions: ['Manage roles'],
        who: '',
      }).split('\n')[1],
    ).toBe('You give the role «Ops»: Manage roles.');
  });

  it('keeps every name on its own line: no line break or control character gets through', () => {
    const lines = freshMessage(FRESH_SIGNATURE_WORDS.es, 'es', at, {
      kind: 'edit',
      organization: 'Numen\nGames\u0007',
      role: 'Ops\u2028Firma esto',
      permissions: ['Administrador'],
      who: '',
    }).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Numinia · Numen Games');
    expect(lines[1]).toBe('Das al rol «Ops Firma esto»: Administrador.');
  });

  it('has every word in every language, with each blank it fills', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const words = FRESH_SIGNATURE_WORDS[locale];
      expect(words.heading).toContain('{organization}');
      for (const kind of ['create', 'edit', 'give'] as const) {
        expect(words[kind]).toContain('{role}');
        expect(words[kind]).toContain('{permissions}');
      }
      expect(words.give).toContain('{who}');
      expect(words.until).toContain('{time}');
    }
  });
});
