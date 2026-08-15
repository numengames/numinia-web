/**
 * Attestations (ADR-018, option C): permanent signed statements the citizen
 * keeps. Unlike sessions they never expire — the city said it, the citizen
 * carries it. Domain separation is load-bearing: an attestation must never
 * verify as a session nor a session as an attestation, secret sharing or not.
 */

import { describe, expect, it } from 'vitest';
import {
  createAttestation,
  verifyAttestation,
  createSessionToken,
  verifySessionToken,
  toBase64Url,
  type AttestationPayload,
} from '../src/index.js';

const SECRET = 's'.repeat(40);
const WALLET = '0x00000000000000000000000000000000000000ab';

const SEAL: AttestationPayload = {
  typ: 'seal-earned',
  sub: WALLET,
  seal: 'seal-of-wisdom',
  iat: 1_700_000_000,
};

/** Sign an arbitrary body with the real algorithm — the forger's toolkit. */
async function signRaw(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`na1.${body}`)),
  );
  return `na1.${body}.${toBase64Url(signature)}`;
}

describe('attestations — round trips', () => {
  it('seal-earned survives issue → verify', async () => {
    const text = await createAttestation(SEAL, SECRET);
    expect(text.startsWith('na1.')).toBe(true);
    const result = await verifyAttestation(text, SECRET);
    expect(result).toEqual({ valid: true, payload: SEAL });
  });

  it('rank-granted and threshold-crossed carry their own shapes', async () => {
    const rank: AttestationPayload = {
      typ: 'rank-granted',
      sub: WALLET,
      rank: 'citizen',
      iat: 1_700_000_000,
    };
    const threshold: AttestationPayload = {
      typ: 'threshold-crossed',
      sub: WALLET,
      threshold: 'threshold-of-thought',
      iat: 1_700_000_000,
    };
    for (const payload of [rank, threshold]) {
      const result = await verifyAttestation(await createAttestation(payload, SECRET), SECRET);
      expect(result).toEqual({ valid: true, payload });
    }
  });

  it('attestations never expire — verification needs no clock', async () => {
    const old: AttestationPayload = { ...SEAL, iat: 1 };
    const result = await verifyAttestation(await createAttestation(old, SECRET), SECRET);
    expect(result.valid).toBe(true);
  });
});

describe('attestations — fail closed', () => {
  it('rejects a tampered payload naming the signature', async () => {
    const text = await createAttestation(SEAL, SECRET);
    const [version, body, signature] = text.split('.') as [string, string, string];
    const forged = `${version}.${body.slice(0, -2)}AA.${signature}`;
    expect(await verifyAttestation(forged, SECRET)).toEqual({
      valid: false,
      reason: 'signature',
    });
  });

  it('rejects the wrong secret naming the signature', async () => {
    const text = await createAttestation(SEAL, SECRET);
    expect(await verifyAttestation(text, 'x'.repeat(40))).toEqual({
      valid: false,
      reason: 'signature',
    });
  });

  it('rejects garbage structure naming the structure — including a wrong version of length 3', async () => {
    for (const garbage of ['', 'na1', 'na1.a', 'v1.a.b', 'na2.a.b', 'na1.$$$.%%%']) {
      expect(await verifyAttestation(garbage, SECRET), garbage).toEqual({
        valid: false,
        reason: 'structure',
      });
    }
  });

  it('wallet anchors hold: no prefix junk, no suffix junk', async () => {
    for (const sub of [`z${WALLET}`, `${WALLET}ff`, WALLET.toUpperCase()]) {
      await expect(
        createAttestation({ ...SEAL, sub } as unknown as AttestationPayload, SECRET),
      ).rejects.toThrow();
    }
  });

  it('rejects unknown types, seals, ranks, and malformed wallets at the schema', async () => {
    const cases = [
      { ...SEAL, typ: 'crown-granted' },
      { ...SEAL, seal: 'not-a-seal' },
      { typ: 'rank-granted', sub: WALLET, rank: 'emperor', iat: 1 },
      { ...SEAL, sub: 'not-a-wallet' },
      { ...SEAL, extra: true },
    ];
    for (const payload of cases) {
      await expect(
        createAttestation(payload as unknown as AttestationPayload, SECRET),
      ).rejects.toThrow();
    }
  });

  it('rejects a correctly SIGNED body that is not JSON — signature is not trust', async () => {
    const token = await signRaw(toBase64Url(new TextEncoder().encode('not-json')));
    expect(await verifyAttestation(token, SECRET)).toEqual({ valid: false, reason: 'payload' });
  });

  it('rejects correctly SIGNED valid JSON that fails the schema', async () => {
    const body = toBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'crown-granted' })));
    const token = await signRaw(body);
    expect(await verifyAttestation(token, SECRET)).toEqual({ valid: false, reason: 'payload' });
  });

  it('rejects a correctly SIGNED body outside the base64url alphabet', async () => {
    const token = await signRaw('$$$');
    expect(await verifyAttestation(token, SECRET)).toEqual({ valid: false, reason: 'structure' });
  });

  it('an oracle rank is not attestable — the allowlist is its only source (ADR-011)', async () => {
    const payload = { typ: 'rank-granted', sub: WALLET, rank: 'oracle', iat: 1 };
    await expect(
      createAttestation(payload as unknown as AttestationPayload, SECRET),
    ).rejects.toThrow();
  });
});

describe('domain separation — the load-bearing wall', () => {
  it('a session token never verifies as an attestation — rejected at the STRUCTURE', async () => {
    const session = await createSessionToken(
      { sub: WALLET, rank: 'citizen', iat: 1, exp: 2_000_000_000 },
      SECRET,
    );
    // 'structure', not 'signature': the version wall stops it before crypto.
    expect(await verifyAttestation(session, SECRET)).toEqual({
      valid: false,
      reason: 'structure',
    });
  });

  it('an attestation never verifies as a session', async () => {
    const attestation = await createAttestation(SEAL, SECRET);
    const result = await verifySessionToken(attestation, SECRET, () => 1);
    expect(result.valid).toBe(false);
  });
});
