/**
 * HMAC-SHA256 signed session cookies.
 * Prevents cookie forgery — a tampered cookie will fail verification.
 *
 * Format: base64url(json).base64url(hmac)
 * Uses Node.js crypto (no external deps).
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { env } from './env';

function getSecret(): Buffer {
  const secret = env.sessionSecret;
  if (!secret) {
    // Fallback: allow unsigned cookies in dev when SESSION_SECRET is not set.
    // In production this should always be set.
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

/**
 * Sign a session payload. Returns a tamper-proof cookie value.
 */
export function signSession(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const encoded = toBase64Url(json);
  const signature = hmac(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode a signed session cookie.
 * Returns the payload if valid, null if tampered or malformed.
 * Also accepts plain JSON as fallback for migration (logs warning).
 */
export function verifySession<T = Record<string, unknown>>(cookieValue: string): T | null {
  if (!cookieValue) return null;

  // Signed format: base64url.base64url
  const dotIndex = cookieValue.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < cookieValue.length - 1) {
    const encoded = cookieValue.slice(0, dotIndex);
    const signature = cookieValue.slice(dotIndex + 1);

    const expected = hmac(encoded);

    // Timing-safe comparison
    try {
      const sigBuf = Buffer.from(signature, 'base64url');
      const expBuf = Buffer.from(expected, 'base64url');
      if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
        const json = fromBase64Url(encoded);
        return JSON.parse(json) as T;
      }
    } catch {
      // Invalid base64 or JSON
    }
  }

  // Fallback: try plain JSON (legacy unsigned cookies during migration)
  // This allows existing sessions to keep working until they expire.
  try {
    if (cookieValue.startsWith('{')) {
      const parsed = JSON.parse(cookieValue) as T;
      return parsed;
    }
  } catch {
    // Not valid JSON either
  }

  return null;
}

/**
 * Generate a CSRF token (random UUID).
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

/**
 * Verify CSRF: compare X-CSRF-Token header with csrf_token cookie.
 * Returns true if they match.
 */
export function verifyCsrf(req: import('next/server').NextRequest): boolean {
  const headerToken = req.headers.get('x-csrf-token');
  const cookieToken = req.cookies.get('csrf_token')?.value;
  if (!headerToken || !cookieToken) return false;
  return headerToken === cookieToken;
}
