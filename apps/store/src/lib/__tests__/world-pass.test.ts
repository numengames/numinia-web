/**
 * The world pass (cut 5): the Ed25519 compact JWS numinia.com signs for a
 * person entering a world. Tests inject a freshly generated key pair; the
 * verifier exported by the lib is the one the engine copies.
 */

import { describe, expect, it } from 'vitest';
import {
  PASS_TTL_SECONDS,
  WORLD_PASS_PERMISSIONS,
  WorldPassError,
  b64urlDecode,
  b64urlEncode,
  buildPassPayload,
  personSub,
  publicKeyDocument,
  signPass,
  verifyPass,
  type PassPayload,
} from '../world-pass';

async function keyPair(): Promise<{ privateKey: string; publicKey: string }> {
  const pair = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { privateKey: btoa(String.fromCharCode(...pkcs8)), publicKey: b64urlEncode(raw) };
}

const SECRET = 'a'.repeat(40);
const WALLET = `0x${'AB'.repeat(20)}`;
const NOW = 1_800_000_000;

const payloadOf = (extra: Partial<PassPayload> = {}): PassPayload => ({
  v: 1,
  iss: 'numinia.com',
  aud: 'agora-plaza',
  sub: 'p_00000000000000000000000000000000',
  org: 'acc_team_numen_games',
  perm: ['enter-worlds'],
  height: 3,
  roles: [],
  iat: NOW,
  exp: NOW + PASS_TTL_SECONDS,
  ...extra,
});

describe('base64url', () => {
  it('round-trips bytes, with no padding and no + or /', () => {
    const bytes = new Uint8Array([251, 255, 254, 0, 1]);
    const text = b64urlEncode(bytes);
    expect(text).not.toMatch(/[+/=]/);
    expect([...(b64urlDecode(text) as Uint8Array)]).toEqual([...bytes]);
  });
  it('refuses text that is not base64url', () => {
    expect(b64urlDecode('a b')).toBeNull();
    expect(b64urlDecode('a')).toBeNull();
  });
});

describe('personSub', () => {
  it('is p_ + 32 hex, stable, case-insensitive on the wallet, and never the wallet', async () => {
    const a = await personSub(SECRET, WALLET);
    expect(a).toMatch(/^p_[0-9a-f]{32}$/);
    expect(await personSub(SECRET, WALLET.toLowerCase())).toBe(a);
    expect(a).not.toContain(WALLET.slice(2, 12).toLowerCase());
    expect(await personSub('b'.repeat(40), WALLET)).not.toBe(a);
    expect(await personSub(SECRET, `0x${'cd'.repeat(20)}`)).not.toBe(a);
  });
});

describe('signPass and verifyPass', () => {
  it('signs a pass the public key verifies, with a JWS header naming the key', async () => {
    const keys = await keyPair();
    const token = await signPass(keys.privateKey, payloadOf());
    const header = JSON.parse(
      new TextDecoder().decode(b64urlDecode(token.split('.')[0] as string) as Uint8Array),
    );
    expect(header).toMatchObject({ alg: 'EdDSA', typ: 'numinia-world-pass' });
    expect(header.kid).toMatch(/^[0-9a-f]{8}$/);
    const document = await publicKeyDocument(keys.privateKey);
    expect(document).toEqual({ alg: 'Ed25519', kid: header.kid, publicKey: keys.publicKey });
    const verdict = await verifyPass(token, document.publicKey, {
      aud: 'agora-plaza',
      now: NOW + 5,
    });
    expect(verdict).toEqual({ ok: true, payload: payloadOf() });
  });

  it('refuses a tampered payload, a tampered signature and a wrong key', async () => {
    const keys = await keyPair();
    const other = await keyPair();
    const token = await signPass(keys.privateKey, payloadOf());
    const [h, p, s] = token.split('.') as [string, string, string];
    const forged = b64urlEncode(
      new TextEncoder().encode(JSON.stringify(payloadOf({ perm: ['manage-organization'] }))),
    );
    const at = { aud: 'agora-plaza', now: NOW };
    expect(await verifyPass(`${h}.${forged}.${s}`, keys.publicKey, at)).toEqual({
      ok: false,
      why: 'signature',
    });
    const flipped = `${s[0] === 'A' ? 'B' : 'A'}${s.slice(1)}`;
    expect(await verifyPass(`${h}.${p}.${flipped}`, keys.publicKey, at)).toEqual({
      ok: false,
      why: 'signature',
    });
    expect(await verifyPass(token, other.publicKey, at)).toEqual({ ok: false, why: 'signature' });
  });

  it('refuses an expired pass, one not yet issued, and one for another world', async () => {
    const keys = await keyPair();
    const token = await signPass(keys.privateKey, payloadOf());
    expect(
      await verifyPass(token, keys.publicKey, {
        aud: 'agora-plaza',
        now: NOW + PASS_TTL_SECONDS + 1,
      }),
    ).toEqual({ ok: false, why: 'expired' });
    expect(await verifyPass(token, keys.publicKey, { aud: 'agora-plaza', now: NOW - 120 })).toEqual(
      { ok: false, why: 'early' },
    );
    expect(await verifyPass(token, keys.publicKey, { aud: 'other-world', now: NOW })).toEqual({
      ok: false,
      why: 'audience',
    });
  });

  it('refuses what is not a pass: shape, header, payload, extra fields', async () => {
    const keys = await keyPair();
    const at = { aud: 'agora-plaza', now: NOW };
    expect(await verifyPass('nope', keys.publicKey, at)).toEqual({ ok: false, why: 'shape' });
    expect(await verifyPass('a.b.c', keys.publicKey, at)).toEqual({ ok: false, why: 'shape' });
    expect(await verifyPass('a b.c.d', keys.publicKey, at)).toEqual({ ok: false, why: 'shape' });
    // A header that is not ours, signed properly.
    const sign = async (header: object | string, body: unknown): Promise<string> => {
      const json = (value: unknown): string =>
        typeof value === 'string' && value.startsWith('RAW:')
          ? value.slice(4)
          : JSON.stringify(value);
      const head = b64urlEncode(new TextEncoder().encode(json(header)));
      const text = b64urlEncode(new TextEncoder().encode(json(body)));
      const { privateKey } = keys;
      const key = await crypto.subtle.importKey(
        'pkcs8',
        Uint8Array.from(atob(privateKey), (c) => c.charCodeAt(0)),
        'Ed25519',
        false,
        ['sign'],
      );
      const sig = new Uint8Array(
        await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(`${head}.${text}`)),
      );
      return `${head}.${text}.${b64urlEncode(sig)}`;
    };
    const good = { alg: 'EdDSA', typ: 'numinia-world-pass', kid: 'x' };
    expect(
      await verifyPass(await sign({ ...good, alg: 'none' }, payloadOf()), keys.publicKey, at),
    ).toEqual({ ok: false, why: 'header' });
    expect(
      await verifyPass(await sign(good, { ...payloadOf(), extra: 1 }), keys.publicKey, at),
    ).toEqual({ ok: false, why: 'payload' });
    expect(
      await verifyPass(await sign(good, { ...payloadOf(), v: 2 }), keys.publicKey, at),
    ).toEqual({ ok: false, why: 'payload' });
    expect(await verifyPass(await sign(good, [1]), keys.publicKey, at)).toEqual({
      ok: false,
      why: 'payload',
    });
    expect(await verifyPass(await sign(good, 'text'), keys.publicKey, at)).toEqual({
      ok: false,
      why: 'payload',
    });
    expect(
      await verifyPass(
        await sign(good, { ...payloadOf(), perm: 'enter-worlds' }),
        keys.publicKey,
        at,
      ),
    ).toEqual({ ok: false, why: 'payload' });
    expect(
      await verifyPass(
        await sign(good, { ...payloadOf(), iss: 'evil.example' }),
        keys.publicKey,
        at,
      ),
    ).toEqual({ ok: false, why: 'payload' });
    expect(await verifyPass(await sign('RAW:{', payloadOf()), keys.publicKey, at)).toEqual({
      ok: false,
      why: 'header',
    });
    expect(await verifyPass(await sign(good, 'RAW:{'), keys.publicKey, at)).toEqual({
      ok: false,
      why: 'payload',
    });
    for (const roles of [[null], ['x'], [{ name: 3, color: null }], [{ name: 'a', color: 5 }]]) {
      expect(
        await verifyPass(await sign(good, { ...payloadOf(), roles }), keys.publicKey, at),
      ).toEqual({ ok: false, why: 'payload' });
    }
    const notJson = `${b64urlEncode(new TextEncoder().encode(JSON.stringify(good)))}.${b64urlEncode(new TextEncoder().encode('{'))}.AAAA`;
    expect(await verifyPass(notJson, keys.publicKey, at)).toEqual({ ok: false, why: 'signature' });
  });

  it('keeps an optional name; a name of the wrong type is refused', async () => {
    const keys = await keyPair();
    const token = await signPass(keys.privateKey, payloadOf({ name: 'Ada' }));
    const verdict = await verifyPass(token, keys.publicKey, { aud: 'agora-plaza', now: NOW });
    expect(verdict.ok && verdict.payload.name).toBe('Ada');
    const bad = await signPass(keys.privateKey, {
      ...payloadOf(),
      name: 3,
    } as unknown as PassPayload);
    expect(await verifyPass(bad, keys.publicKey, { aud: 'agora-plaza', now: NOW })).toEqual({
      ok: false,
      why: 'payload',
    });
  });
});

describe('the key fails closed', () => {
  it('throws a typed error when the secret is missing or not a PKCS8 Ed25519 key', async () => {
    for (const bad of [undefined, '', '   ', 'not base64 !!', btoa('short')]) {
      await expect(signPass(bad, payloadOf())).rejects.toBeInstanceOf(WorldPassError);
      await expect(publicKeyDocument(bad)).rejects.toBeInstanceOf(WorldPassError);
    }
    await expect(signPass(undefined, payloadOf())).rejects.toMatchObject({ code: 'no-key' });
    await expect(signPass('@@', payloadOf())).rejects.toMatchObject({ code: 'bad-key' });
    expect(new WorldPassError('no-key').message).toContain('no-key');
  });

  it('refuses a key of another algorithm', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
    ])) as CryptoKeyPair;
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    await expect(signPass(btoa(String.fromCharCode(...pkcs8)), payloadOf())).rejects.toMatchObject({
      code: 'bad-key',
    });
  });
});

describe('buildPassPayload', () => {
  const base = {
    aud: 'agora-plaza',
    org: 'acc_team_numen_games',
    secret: SECRET,
    wallet: WALLET,
    now: NOW,
  } as const;
  const role = (id: string, name: string, color: string | null, position: number) => ({
    id,
    name,
    color,
    position,
    hoist: false,
    permissions: [],
    members: 1,
    mayEdit: false,
  });
  const roles = (held: string[], name?: string | null) => ({
    ok: true as const,
    accountId: 'acc',
    as: 'member' as const,
    roles: [
      role('r3', 'Builders', '#112233', 3),
      role('r2', 'Guides', null, 2),
      role('r0', 'Everyone', null, 0),
    ],
    members: [
      {
        wallet: WALLET.toLowerCase(),
        owner: false,
        addedAt: '',
        roleIds: held,
        assignable: [],
        ...(name === undefined ? {} : { name }),
      },
    ],
  });

  it('gives a member the world permissions they hold, their height, visible roles and chosen name', async () => {
    const payload = await buildPassPayload({
      ...base,
      access: {
        as: 'member',
        permissions: ['enter-worlds', 'view-balance', 'ban-members', 'download-world'],
        holders: {},
      },
      roles: roles(['r2', 'r3'], 'Ada'),
    });
    expect(payload).toEqual({
      v: 1,
      iss: 'numinia.com',
      aud: 'agora-plaza',
      sub: await personSub(SECRET, WALLET),
      org: 'acc_team_numen_games',
      perm: ['enter-worlds', 'ban-members'],
      height: 3,
      roles: [
        { name: 'Builders', color: '#112233' },
        { name: 'Guides', color: null },
      ],
      name: 'Ada',
      iat: NOW,
      exp: NOW + 600,
    });
  });

  it('omits the name nobody chose, and sits at the base role with no roles', async () => {
    const payload = await buildPassPayload({
      ...base,
      access: { as: 'member', permissions: ['enter-worlds'], holders: {} },
      roles: roles([], null),
    });
    expect('name' in payload).toBe(false);
    expect(payload.height).toBe(0);
    expect(payload.roles).toEqual([]);
  });

  it('caps roles at five and their names at 40 characters, tallest first', async () => {
    const many = {
      ...roles(['a', 'b', 'c', 'd', 'e', 'f']),
      roles: ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) =>
        role(id, id.repeat(50), null, index + 1),
      ),
    };
    const payload = await buildPassPayload({
      ...base,
      access: { as: 'member', permissions: [], holders: {} },
      roles: many,
    });
    expect(payload.roles).toHaveLength(5);
    expect(payload.roles[0]?.name).toBe('f'.repeat(40));
    expect(payload.height).toBe(6);
  });

  it('gives owners download-world and a height above the house; the house stands above every role', async () => {
    const owner = await buildPassPayload({
      ...base,
      access: {
        as: 'owner',
        permissions: ['enter-worlds', 'download-world', 'delete-world'],
        holders: {},
      },
      roles: { ...roles([]), as: 'owner' },
    });
    const house = await buildPassPayload({
      ...base,
      access: { as: 'house', permissions: ['enter-worlds', 'manage-roles'], holders: {} },
      roles: { ...roles([]), as: 'house', members: [] },
    });
    expect(owner.perm).toEqual(['enter-worlds', 'download-world']);
    expect(house.perm).toEqual(['enter-worlds', 'manage-roles', 'download-world']);
    expect(house.height).toBe(Number.MAX_SAFE_INTEGER);
    expect(owner.height).toBeGreaterThan(house.height);
    expect(Number.isFinite(owner.height)).toBe(true);
    expect(house.roles).toEqual([]);
  });

  it('only names permissions of the contract', () => {
    expect([...WORLD_PASS_PERMISSIONS]).toEqual([
      'enter-worlds',
      'build-in-worlds',
      'mute-members',
      'remove-members',
      'ban-members',
      'manage-roles',
      'manage-organization',
      'download-world',
    ]);
  });
});
