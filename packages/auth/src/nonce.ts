/**
 * Login nonces that need no memory.
 *
 * The spike kept issued nonces in a Map. On Workers the request that issues
 * a nonce and the one that spends it may land on different isolates, and the
 * second then refused a good login. A signed nonce carries its own expiry
 * under an HMAC of the session secret (`n1.<random>.<expiresAtMs>.<mac>`),
 * so any instance can check it. Single use comes from the caller, who binds
 * the nonce to the browser that asked for it (an HttpOnly cookie, spent on
 * the first login) — the SIWE ecosystem's pattern (EIP-4361 §Security
 * Considerations: the nonce is tied to the session that requested it).
 */

import { fromBase64Url, hmacSha256, timingSafeEqualBytes, toBase64Url } from './encoding.js';

const NONCE_VERSION = 'n1';

/** Domain-separated MAC input: a nonce can never verify as a session. */
function macInput(random: string, expiresAt: number): Uint8Array {
  return new TextEncoder().encode(`${NONCE_VERSION}.${random}.${expiresAt}`);
}

export async function issueSignedNonce(
  secret: string,
  ttlMs: number,
  now: number,
): Promise<string> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const random = toBase64Url(bytes);
  const expiresAt = now + ttlMs;
  const mac = await hmacSha256(secret, macInput(random, expiresAt));
  return `${NONCE_VERSION}.${random}.${expiresAt}.${toBase64Url(mac)}`;
}

/** True when the nonce was signed with `secret` and has not expired. Fail closed. */
export async function verifySignedNonce(
  nonce: string,
  secret: string,
  now: number,
): Promise<boolean> {
  const parts = nonce.split('.');
  if (parts.length !== 4 || parts[0] !== NONCE_VERSION) return false;
  const [, random, expiry, mac] = parts as [string, string, string, string];
  if (!/^\d{1,16}$/.test(expiry)) return false;
  const given = fromBase64Url(mac);
  if (given === null) return false;
  const expiresAt = Number(expiry);
  const expected = await hmacSha256(secret, macInput(random, expiresAt));
  if (!timingSafeEqualBytes(given, expected)) return false;
  return now <= expiresAt;
}
