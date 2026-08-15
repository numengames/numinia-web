/**
 * Session tokens — HMAC-SHA256 over a versioned base64url payload, verified
 * with constant-time comparison and a strict Zod payload schema.
 *
 * Format: `v1.<base64url(payloadJson)>.<base64url(hmac)>`
 * Fail closed everywhere: any structural, cryptographic, schema or expiry
 * problem yields { valid: false } — never a partial trust.
 */

import { z } from 'zod';
import { RANKS, type Rank } from '@numinia/domain';
import { fromBase64Url, timingSafeEqualBytes, toBase64Url } from './encoding.js';

const VERSION = 'v1';

export interface SessionPayload {
  /** Wallet address (embedded or external). Never forwarded to analytics. */
  readonly sub: string;
  readonly rank: Rank;
  readonly iat: number;
  readonly exp: number;
}

const payloadSchema = z.strictObject({
  sub: z.string().min(1),
  rank: z.enum(RANKS),
  iat: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative(),
});

export type VerifyResult =
  | { valid: true; payload: SessionPayload }
  | { valid: false; reason: 'structure' | 'signature' | 'payload' | 'expired' };

async function hmac(secret: string, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

export async function createSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(secret, new TextEncoder().encode(`${VERSION}.${body}`));
  return `${VERSION}.${body}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  now: () => number,
): Promise<VerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { valid: false, reason: 'structure' };
  }
  const [, body, signaturePart] = parts as [string, string, string];
  const claimed = fromBase64Url(signaturePart);
  const bodyBytes = fromBase64Url(body);
  if (claimed === null || bodyBytes === null) {
    return { valid: false, reason: 'structure' };
  }
  const expected = await hmac(secret, new TextEncoder().encode(`${VERSION}.${body}`));
  if (!timingSafeEqualBytes(claimed, expected)) {
    return { valid: false, reason: 'signature' };
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return { valid: false, reason: 'payload' };
  }
  const parsed = payloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { valid: false, reason: 'payload' };
  }
  if (now() >= parsed.data.exp) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, payload: parsed.data };
}
