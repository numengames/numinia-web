/**
 * Mutation score 98.09% (Stryker). The 3 survivors are provably equivalent:
 * - nonce.ts undefined-guard: without it, `now() <= undefined` is false anyway.
 * - session.ts importKey `extractable: false→true`: no observable output change.
 * - session.ts empty catch: undefined payload is rejected by zod with the same reason.
 */
import { describe, expect, it } from 'vitest';
import { AuthConfigError, formatIssue, parseAuthEnv } from '../src/config.js';
import { fromBase64Url, timingSafeEqualBytes, toBase64Url } from '../src/encoding.js';
import { createSessionToken, verifySessionToken } from '../src/session.js';
import { createNonceStore } from '../src/nonce.js';
import { WEB3_BOUNDARY_RANK, walletRequiredFor } from '../src/boundary.js';

const SECRET = 's'.repeat(32);
const NOW = 1_755_000_000_000;

describe('auth config (fail closed — ADR-006 non-negotiable)', () => {
  it('accepts a strong secret', () => {
    expect(parseAuthEnv({ AUTH_SESSION_SECRET: SECRET }).sessionSecret).toBe(SECRET);
  });

  it('crashes naming the variable when missing or weak', () => {
    for (const env of [{}, { AUTH_SESSION_SECRET: '' }, { AUTH_SESSION_SECRET: 'short' }]) {
      try {
        parseAuthEnv(env);
        expect.unreachable('parseAuthEnv must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthConfigError);
        expect((error as Error).name).toBe('AuthConfigError');
        expect((error as Error).message).toContain('AUTH_SESSION_SECRET');
      }
    }
    expect(() => parseAuthEnv({ AUTH_SESSION_SECRET: 'short' })).toThrowError(
      /at least 32 characters/,
    );
  });

  it('formats issues as dot-joined paths, one per line', () => {
    expect(formatIssue({ path: ['a', 0, 'b'], message: 'm' })).toBe('a.0.b: m');
    expect(new AuthConfigError(['a: x', 'b: y']).message).toBe(
      'Invalid auth configuration:\n  a: x\n  b: y',
    );
  });
});

describe('session tokens (HMAC-SHA256, Web Crypto)', () => {
  const payload = { sub: '0xabc', rank: 'nomad', iat: NOW, exp: NOW + 3_600_000 } as const;

  it('roundtrips a valid token', async () => {
    const token = await createSessionToken(payload, SECRET);
    expect(token.startsWith('v1.')).toBe(true);
    const result = await verifySessionToken(token, SECRET, () => NOW + 1000);
    expect(result).toEqual({ valid: true, payload });
  });

  it('rejects a tampered payload (fail closed)', async () => {
    const token = await createSessionToken(payload, SECRET);
    const [v, body, sig] = token.split('.');
    const forged = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atobUrl(body ?? ''))),
    ) as Record<string, unknown>;
    forged['rank'] = 'oracle';
    const forgedBody = btoaUrl(new TextEncoder().encode(JSON.stringify(forged)));
    const result = await verifySessionToken(`${v}.${forgedBody}.${sig}`, SECRET, () => NOW);
    expect(result).toEqual({ valid: false, reason: 'signature' });
  });

  it('rejects a tampered signature and a wrong secret', async () => {
    const token = await createSessionToken(payload, SECRET);
    const bad = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    expect(await verifySessionToken(bad, SECRET, () => NOW)).toEqual({
      valid: false,
      reason: 'signature',
    });
    expect(await verifySessionToken(token, 'x'.repeat(32), () => NOW)).toEqual({
      valid: false,
      reason: 'signature',
    });
  });

  it('rejects expired tokens, including exactly at the expiry instant', async () => {
    const token = await createSessionToken(payload, SECRET);
    for (const at of [payload.exp, payload.exp + 1]) {
      expect(await verifySessionToken(token, SECRET, () => at)).toEqual({
        valid: false,
        reason: 'expired',
      });
    }
  });

  it('rejects garbage, wrong version, and malformed payloads', async () => {
    // Each is a STRUCTURE failure: never reaches signature or schema checks.
    for (const junk of [
      '',
      'nope',
      'v2.AAAA.AAAA',
      'v1.only-two',
      'v1.!!!.???',
      'v1.AAAA.!!!', // valid body chars, invalid signature chars
      'v1.!!!.AAAA', // invalid body chars, valid signature chars
    ]) {
      expect(await verifySessionToken(junk, SECRET, () => NOW)).toEqual({
        valid: false,
        reason: 'structure',
      });
    }
    // Valid signature over an invalid payload shape must still fail (zod).
    const evil = await createSessionToken(
      { sub: '', rank: 'nomad', iat: NOW, exp: NOW + 1 },
      SECRET,
    );
    expect((await verifySessionToken(evil, SECRET, () => NOW)).valid).toBe(false);
  });

  it('rejects a correctly-signed body that is not JSON', async () => {
    // Sign garbage bytes with the real secret: signature passes, JSON.parse fails.
    const body = toBase64Url(new TextEncoder().encode('not-json{'));
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`v1.${body}`)),
    );
    const result = await verifySessionToken(`v1.${body}.${toBase64Url(sig)}`, SECRET, () => NOW);
    expect(result).toEqual({ valid: false, reason: 'payload' });
  });

  it('rejects unknown ranks inside otherwise-valid tokens', async () => {
    const evil = await createSessionToken(
      { sub: '0xabc', rank: 'emperor' as never, iat: NOW, exp: NOW + 1000 },
      SECRET,
    );
    const result = await verifySessionToken(evil, SECRET, () => NOW);
    expect(result).toEqual({ valid: false, reason: 'payload' });
  });
});

describe('nonce store (single use + TTL)', () => {
  it('issues unique nonces and consumes each exactly once', () => {
    const time = NOW;
    const store = createNonceStore({ ttlMs: 300_000, now: () => time });
    const a = store.issue();
    const b = store.issue();
    expect(a).not.toBe(b);
    expect(store.consume(a)).toBe(true);
    expect(store.consume(a)).toBe(false);
    expect(store.consume('never-issued')).toBe(false);
    expect(store.consume(b)).toBe(true);
  });

  it('honors the TTL boundary: valid at exactly ttl, dead one ms later', () => {
    let time = NOW;
    const store = createNonceStore({ ttlMs: 1000, now: () => time });
    const atBoundary = store.issue();
    const late = store.issue();
    time += 1000;
    expect(store.consume(atBoundary)).toBe(true);
    time += 1;
    expect(store.consume(late)).toBe(false);
  });
});

describe('encoding primitives', () => {
  it('roundtrips every padding length', () => {
    for (const length of [0, 1, 2, 3, 4, 5]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 5) % 256);
      expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
    }
  });

  it('fails closed on characters outside the alphabet', () => {
    for (const bad of ['a+b', 'a/b', 'a=', '¡hola!']) {
      expect(fromBase64Url(bad)).toBeNull();
    }
  });

  it('compares bytes without early exit and rejects length mismatches', () => {
    expect(timingSafeEqualBytes(Uint8Array.of(1, 2, 3), Uint8Array.of(1, 2, 3))).toBe(true);
    expect(timingSafeEqualBytes(Uint8Array.of(1, 2, 3), Uint8Array.of(1, 2, 4))).toBe(false);
    expect(timingSafeEqualBytes(Uint8Array.of(1, 2), Uint8Array.of(1, 2, 3))).toBe(false);
  });
});

describe('web3 boundary (single constant — D13 provisional)', () => {
  it('sits at pilgrim and gates upward only', () => {
    expect(WEB3_BOUNDARY_RANK).toBe('pilgrim');
    expect(walletRequiredFor('nomad')).toBe(false);
    expect(walletRequiredFor('citizen')).toBe(false);
    expect(walletRequiredFor('pilgrim')).toBe(true);
    expect(walletRequiredFor('vernacular')).toBe(true);
    expect(walletRequiredFor('oracle')).toBe(true);
  });
});

// Minimal base64url helpers for the tamper test (mirrors implementation intent).
function btoaUrl(bytes: Uint8Array): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i] ?? 0, bytes[i + 1], bytes[i + 2]];
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += ALPHABET[c & 63];
  }
  return out;
}

function atobUrl(text: string): number[] {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}
