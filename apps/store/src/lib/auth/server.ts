/**
 * Server-side auth wiring for the MISSION-002 Step 0 spike (gate D14).
 *
 * Layering per ADR-006: thirdweb only PROVES wallet ownership (SIWE payload
 * verification, incl. smart accounts via RPC). The session itself is ours —
 * an HMAC token from @numinia/auth, so the vendor never holds our trust root.
 *
 * Fail closed: importing this module without the required env crashes loudly
 * (AuthConfigError names the missing variable). No fallbacks, no defaults.
 */

import { createThirdwebClient } from 'thirdweb';
import { createAuth } from 'thirdweb/auth';
import { z } from 'zod';
import {
  createNonceStore,
  createSessionToken,
  parseAuthEnv,
  verifySessionToken,
  type SessionPayload,
  type VerifyResult,
} from '@numinia/auth';

const envSchema = z.object({
  THIRDWEB_SECRET_KEY: z.string().min(32, 'THIRDWEB_SECRET_KEY looks truncated'),
});

/**
 * Config is read LAZILY: a missing secret must answer "not configured" on the
 * endpoint (fail closed, ADR-006) instead of throwing at module scope on
 * every request — which crashed the route and logged a stack per visit.
 */
let cached: { readonly secretKey: string; readonly sessionSecret: string } | null = null;

export function authConfigured(): boolean {
  return loadConfig() !== null;
}

function loadConfig(): typeof cached {
  if (cached) return cached;
  try {
    const vendor = envSchema.parse(process.env);
    const { sessionSecret } = parseAuthEnv(process.env);
    cached = { secretKey: vendor.THIRDWEB_SECRET_KEY, sessionSecret };
    return cached;
  } catch {
    return null;
  }
}

function requireConfig(): NonNullable<typeof cached> {
  const config = loadConfig();
  if (!config) throw new Error('Auth is not configured');
  return config;
}

/** SIWE domain must match what the browser shows, or wallets warn the user. */
const AUTH_DOMAIN = import.meta.env.DEV ? 'localhost:4321' : 'numinia.store';

const SESSION_TTL_SECONDS = 60 * 60;
const NONCE_TTL_MS = 5 * 60 * 1000;

export const SESSION_COOKIE = 'numinia_session';

/** Single-use TTL nonces (in-memory: dev server / single instance only). */
const nonces = createNonceStore({ ttlMs: NONCE_TTL_MS, now: Date.now });

let authInstance: ReturnType<typeof createAuth> | null = null;

/** The vendor layer, built on first use (never at import time). */
export function getAuth(): ReturnType<typeof createAuth> {
  if (authInstance) return authInstance;
  const client = createThirdwebClient({ secretKey: requireConfig().secretKey });
  authInstance = createAuth({
    domain: AUTH_DOMAIN,
    client,
    login: {
      payloadExpirationTimeSeconds: NONCE_TTL_MS / 1000,
      statement: 'Numinia: prove you hold this address. No transaction, no cost.',
      nonce: {
        generate: () => nonces.issue(),
        // Consuming on validate makes every login payload strictly single-use.
        validate: (nonce) => nonces.consume(nonce),
      },
    },
  });
  return authInstance;
}

/** Issues our own vendor-independent session after thirdweb verified the address. */
export async function issueSession(address: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: address,
    rank: 'nomad',
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  };
  return createSessionToken(payload, requireConfig().sessionSecret);
}

export async function verifySession(token: string): Promise<VerifyResult> {
  return verifySessionToken(token, requireConfig().sessionSecret, () =>
    Math.floor(Date.now() / 1000),
  );
}
