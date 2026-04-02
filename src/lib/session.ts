/**
 * CSRF utilities for admin API protection.
 *
 * CSRF token is set during Thirdweb login (non-httpOnly cookie),
 * sent by client as X-CSRF-Token header, verified server-side with
 * timing-safe comparison.
 */

import { timingSafeEqual, randomUUID } from 'crypto';

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
