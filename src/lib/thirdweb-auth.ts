/**
 * Thirdweb Auth — server-side SIWE authentication.
 *
 * Uses thirdweb v5 createAuth() to generate/verify JWTs for wallet-based auth.
 * The JWT is stored in an httpOnly cookie (tw_jwt) and verified on each request.
 *
 * This replaces the custom SIWE implementation (siwe v3 + manual cookie signing).
 * Only activates when THIRDWEB_AUTH_DOMAIN + THIRDWEB_AUTH_ADMIN_KEY are configured.
 *
 * Used by:
 *   - ConnectButton's auth callbacks (client-side)
 *   - getSession() verification (server-side)
 */

import { createAuth } from 'thirdweb/auth';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { createThirdwebClient } from 'thirdweb';
import { createLogger } from './logger';

const log = createLogger('lib/thirdweb-auth');

let authInstance: ReturnType<typeof createAuth> | null = null;

/**
 * Returns true if Thirdweb Auth is configured.
 */
export function isThirdwebAuthConfigured(): boolean {
  return !!(
    process.env.THIRDWEB_AUTH_DOMAIN &&
    process.env.THIRDWEB_AUTH_ADMIN_KEY &&
    process.env.THIRDWEB_SECRET_KEY
  );
}

/**
 * Get or create the thirdweb auth instance.
 * Returns null if not configured.
 */
export function getThirdwebAuth() {
  if (authInstance) return authInstance;
  if (!isThirdwebAuthConfigured()) return null;

  try {
    const client = createThirdwebClient({
      secretKey: process.env.THIRDWEB_SECRET_KEY!,
    });

    authInstance = createAuth({
      domain: process.env.THIRDWEB_AUTH_DOMAIN!,
      client,
      adminAccount: privateKeyToAccount({
        client,
        privateKey: process.env.THIRDWEB_AUTH_ADMIN_KEY!,
      }),
    });

    return authInstance;
  } catch (err) {
    log.error({ err }, 'Failed to initialize Thirdweb Auth');
    return null;
  }
}

/** Cookie name for the Thirdweb JWT */
export const TW_JWT_COOKIE = 'tw_jwt';

/** Cookie options for the JWT */
export const TW_JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
