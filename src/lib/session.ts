/**
 * HMAC-SHA256 signed session cookies + CSRF utilities.
 */

import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { env } from './env';

function getSecret(): Buffer {
  const secret = env.sessionSecret;
  if (!secret) {
    if (env.isProd) throw new Error('SESSION_SECRET is required in production');
    return Buffer.from('dev-insecure-fallback-do-not-use-in-prod');
  }
  return Buffer.from(secret, 'utf-8');
}

function toBase64Url(data: string): string {
  return Buffer.from(data, 'utf-8').toString('base64url');
}

function fromBase64Url(b64: string): string {
  return Buffer.from(b64, 'base64url').toString('utf-8');
}

function hmac(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function signSession(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const encoded = toBase64Url(json);
  const signature = hmac(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode a signed session cookie.
 * Returns the payload if valid, null if tampered or malformed.
 * NO FALLBACK for plain JSON — unsigned cookies are rejected.
 */
export function verifySession<T = Record<string, unknown>>(cookieValue: string): T | null {
  if (!cookieValue) return null;

  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex >= cookieValue.length - 1) return null;

  const encoded = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);
  const expected = hmac(encoded);

  try {
    const sigBuf = Buffer.from(signature, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const json = fromBase64Url(encoded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function generateCsrfToken(): string {
  return randomUUID();
}

/**
 * Verify CSRF: timing-safe compare of X-CSRF-Token header with csrf_token cookie.
 */
export function verifyCsrf(req: import('next/server').NextRequest): boolean {
  const headerToken = req.headers.get('x-csrf-token');
  const cookieToken = req.cookies.get('csrf_token')?.value;
  if (!headerToken || !cookieToken) return false;
  if (headerToken.length !== cookieToken.length) return false;
  try {
    return timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}
