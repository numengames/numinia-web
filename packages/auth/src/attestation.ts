/**
 * Attestations (ADR-018, option C) — permanent signed statements the citizen
 * keeps in their own file: a seal earned, a rank granted, a threshold
 * crossed. The platform verifies by signature, never by lookup.
 *
 * Format: `na1.<base64url(payloadJson)>.<base64url(hmac)>`
 * Deliberately NOT the session format: the `na1` prefix is inside the HMAC
 * input, so an attestation can never verify as a session nor a session as
 * an attestation, even under a shared secret (domain separation).
 * No expiry by design — the city said it; the citizen carries it.
 */

import { z } from 'zod';
import { RANKS, SEAL_IDS, THRESHOLD_IDS } from '@numinia/domain';
import { fromBase64Url, timingSafeEqualBytes, toBase64Url } from './encoding.js';

const VERSION = 'na1';

/** One wallet, one spelling: lowercase hex, like the census (ADR-018). */
const wallet = z.string().regex(/^0x[0-9a-f]{40}$/);

const payloadSchema = z.discriminatedUnion('typ', [
  z.strictObject({
    typ: z.literal('seal-earned'),
    sub: wallet,
    seal: z.enum(SEAL_IDS),
    iat: z.number().int().nonnegative(),
  }),
  z.strictObject({
    typ: z.literal('rank-granted'),
    sub: wallet,
    // An Oracle is never attestable: the allowlist is its only source (ADR-011).
    rank: z.enum(RANKS.filter((rank) => rank !== 'oracle') as [string, ...string[]]),
    iat: z.number().int().nonnegative(),
  }),
  z.strictObject({
    typ: z.literal('threshold-crossed'),
    sub: wallet,
    threshold: z.enum(THRESHOLD_IDS),
    iat: z.number().int().nonnegative(),
  }),
]);

export type AttestationPayload = z.infer<typeof payloadSchema>;

export type AttestationResult =
  | { valid: true; payload: AttestationPayload }
  | { valid: false; reason: 'structure' | 'signature' | 'payload' };

async function hmac(secret: string, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    // Non-extractable by hygiene. Documented equivalent mutant: flipping this
    // is unobservable (we never export the key), so no test can kill it.
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

/** Throws on an invalid payload — the city never signs what it cannot say. */
export async function createAttestation(
  payload: AttestationPayload,
  secret: string,
): Promise<string> {
  const checked = payloadSchema.parse(payload);
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(checked)));
  const signature = await hmac(secret, new TextEncoder().encode(`${VERSION}.${body}`));
  return `${VERSION}.${body}.${toBase64Url(signature)}`;
}

export async function verifyAttestation(text: string, secret: string): Promise<AttestationResult> {
  const parts = text.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { valid: false, reason: 'structure' };
  }
  const [, body, signature] = parts as [string, string, string];
  const given = fromBase64Url(signature);
  if (given === null) return { valid: false, reason: 'structure' };
  const expected = await hmac(secret, new TextEncoder().encode(`${VERSION}.${body}`));
  if (!timingSafeEqualBytes(given, expected)) return { valid: false, reason: 'signature' };
  const bytes = fromBase64Url(body);
  if (bytes === null) return { valid: false, reason: 'structure' };
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success
      ? { valid: true, payload: parsed.data }
      : { valid: false, reason: 'payload' };
  } catch {
    return { valid: false, reason: 'payload' };
  }
}
