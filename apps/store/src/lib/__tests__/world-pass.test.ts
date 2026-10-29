/**
 * The world pass (cut 5): the Ed25519 compact JWS numinia.com signs for a
 * person entering a world. Tests inject a freshly generated key pair; the
 * verifier exported by the lib is the one the engine copies.
 */

import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AGENT_PASS_PERMISSIONS,
  PASS_TTL_SECONDS,
  WORLD_PASS_PERMISSIONS,
  WorldPassError,
  b64urlDecode,
  b64urlEncode,
  agentSub,
  buildAgentPassPayload,
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
/** Numen Games' till account: a public identifier, kept apart from SECRET. */
const NUMEN = 'acc_t_' + '2e2dd18c880ba974da1512dc7cde2431';
const WALLET = `0x${'AB'.repeat(20)}`;
const NOW = 1_800_000_000;

const payloadOf = (extra: Partial<PassPayload> = {}): PassPayload => ({
  v: 1,
  iss: 'numinia.com',
  aud: 'agora-plaza',
  sub: 'p_00000000000000000000000000000000',
  org: NUMEN,
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
    org: NUMEN,
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
      org: NUMEN,
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

describe("a person's pass stays byte for byte what it was", () => {
  it('writes the fields in the same order, with no kind and no state', async () => {
    const payload = await buildPassPayload({
      aud: 'agora-plaza',
      org: NUMEN,
      secret: SECRET,
      wallet: WALLET,
      now: NOW,
      access: { as: 'member', permissions: ['enter-worlds'], holders: {} },
      roles: {
        ok: true,
        accountId: 'acc',
        as: 'member',
        roles: [],
        members: [
          {
            wallet: WALLET.toLowerCase(),
            roleIds: [],
            name: 'Ada',
          },
        ],
      },
    });
    expect(JSON.stringify(payload)).toBe(
      `{"v":1,"iss":"numinia.com","aud":"agora-plaza","sub":"${await personSub(SECRET, WALLET)}","org":"${NUMEN}","perm":["enter-worlds"],"height":0,"roles":[],"name":"Ada","iat":${NOW},"exp":${NOW + 600}}`,
    );
  });
});

describe('agentSub', () => {
  it('is a_ + 32 hex, the first 16 bytes of the HMAC of org and agent, and never says either', async () => {
    const sub = await agentSub(SECRET, NUMEN, 'hermes-1');
    const expected = createHmac('sha256', SECRET)
      .update(`world-pass-agent:${NUMEN}:hermes-1`)
      .digest('hex')
      .slice(0, 32);
    expect(sub).toBe(`a_${expected}`);
    expect(sub).toMatch(/^a_[0-9a-f]{32}$/);
    expect(await agentSub(SECRET, NUMEN, 'hermes-2')).not.toBe(sub);
    expect(await agentSub(SECRET, 'acc_other', 'hermes-1')).not.toBe(sub);
    expect(await agentSub('b'.repeat(40), NUMEN, 'hermes-1')).not.toBe(sub);
    // Not the id of a person: a different prefix and a different message.
    expect(sub).not.toBe(await personSub(SECRET, NUMEN));
  });
});

describe('buildAgentPassPayload', () => {
  const base = {
    aud: 'agora-plaza',
    org: NUMEN,
    secret: SECRET,
    agent: 'hermes-1',
    name: 'Hermes',
    state: 'activa',
    access: {
      permissions: ['enter-worlds', 'build-in-worlds', 'manage-roles', 'ban-members'],
      height: 2,
    },
    roles: [{ name: 'Builders', color: '#112233' }],
    now: NOW,
  } as const;

  it('keeps entering and building of what the agent holds, and nothing else', async () => {
    const payload = await buildAgentPassPayload(base);
    expect(payload).toEqual({
      v: 1,
      iss: 'numinia.com',
      aud: 'agora-plaza',
      sub: await agentSub(SECRET, NUMEN, 'hermes-1'),
      org: NUMEN,
      perm: ['enter-worlds', 'build-in-worlds'],
      height: 2,
      roles: [{ name: 'Builders', color: '#112233' }],
      name: 'Hermes',
      kind: 'agent',
      state: 'activa',
      iat: NOW,
      exp: NOW + 600,
    });
    expect([...AGENT_PASS_PERMISSIONS]).toEqual(['enter-worlds', 'build-in-worlds']);
    expect(Object.keys(payload)).toEqual([
      'v',
      'iss',
      'aud',
      'sub',
      'org',
      'perm',
      'height',
      'roles',
      'name',
      'kind',
      'state',
      'iat',
      'exp',
    ]);
  });

  it('takes build-in-worlds from an agent that sleeps', async () => {
    const payload = await buildAgentPassPayload({ ...base, state: 'dormida' });
    expect(payload.perm).toEqual(['enter-worlds']);
    expect(payload.state).toBe('dormida');
  });

  it('leaves out what the agent does not hold', async () => {
    const payload = await buildAgentPassPayload({
      ...base,
      access: { permissions: ['build-in-worlds'], height: 0 },
    });
    expect(payload.perm).toEqual(['build-in-worlds']);
    const nothing = await buildAgentPassPayload({
      ...base,
      access: { permissions: [], height: 0 },
    });
    expect(nothing.perm).toEqual([]);
  });

  it('never stands as high as an owner or the house: anything but a role position falls to the lowest', async () => {
    for (const height of [
      Number.MAX_VALUE,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER,
      -1,
      1.5,
      Number.NaN,
    ]) {
      const payload = await buildAgentPassPayload({
        ...base,
        access: { permissions: ['enter-worlds'], height },
      });
      expect(payload.height).toBe(0);
    }
    expect(
      (await buildAgentPassPayload({ ...base, access: { permissions: [], height: 7 } })).height,
    ).toBe(7);
  });

  it('caps roles at five and names at 40 characters', async () => {
    const payload = await buildAgentPassPayload({
      ...base,
      name: 'N'.repeat(60),
      roles: Array.from({ length: 7 }, (_, n) => ({ name: `${n}`.repeat(50), color: null })),
    });
    expect(payload.roles).toHaveLength(5);
    expect(payload.roles[0]?.name).toBe('0'.repeat(40));
    expect(payload.name).toBe('N'.repeat(40));
  });
});

describe("verifyPass and an agent's pass", () => {
  const SUB = `a_${'0'.repeat(32)}`;
  const agent = (extra: Record<string, unknown> = {}): PassPayload =>
    ({
      ...payloadOf({ sub: SUB, name: 'Hermes' }),
      kind: 'agent',
      state: 'activa',
      ...extra,
    }) as PassPayload;
  const at = { aud: 'agora-plaza', now: NOW };

  it('accepts kind, state and an a_ sub, and still refuses any other extra', async () => {
    const keys = await keyPair();
    const ok = await verifyPass(await signPass(keys.privateKey, agent()), keys.publicKey, at);
    expect(ok).toEqual({ ok: true, payload: agent() });
    const asleep = await verifyPass(
      await signPass(keys.privateKey, agent({ state: 'dormida' })),
      keys.publicKey,
      at,
    );
    expect(asleep.ok && asleep.payload.state).toBe('dormida');
    const extra = await signPass(keys.privateKey, agent({ extra: 1 }));
    expect(await verifyPass(extra, keys.publicKey, at)).toEqual({ ok: false, why: 'payload' });
  });

  it('refuses a half-agent: a state with no kind, a kind with no state or name, a wrong kind, state or sub', async () => {
    const keys = await keyPair();
    const refused = async (payload: object) =>
      verifyPass(
        await signPass(keys.privateKey, payload as unknown as PassPayload),
        keys.publicKey,
        at,
      );
    const { kind: _kind, ...noKind } = agent() as unknown as Record<string, unknown>;
    const { state: _state, ...noState } = agent() as unknown as Record<string, unknown>;
    const { name: _name, ...noName } = agent() as unknown as Record<string, unknown>;
    for (const payload of [
      noKind,
      noState,
      noName,
      agent({ kind: 'person' }),
      agent({ state: 'ocupada' }),
      agent({ sub: `p_${'0'.repeat(32)}` }),
      agent({ sub: `a_${'0'.repeat(31)}` }),
      agent({ sub: `a_${'G'.repeat(32)}` }),
    ]) {
      expect(await refused(payload)).toEqual({ ok: false, why: 'payload' });
    }
  });
});
