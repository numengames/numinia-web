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
import type { Rank } from '@numinia/domain';
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
  /** Oracle wallets (comma-separated). Absent = nobody is an Oracle. */
  ADMIN_WALLET_ADDRESSES: z.string().optional(),
});

/**
 * Config is read LAZILY: a missing secret must answer "not configured" on the
 * endpoint (fail closed, ADR-006) instead of throwing at module scope on
 * every request — which crashed the route and logged a stack per visit.
 */
let cached: {
  readonly secretKey: string;
  readonly sessionSecret: string;
  readonly oracles: ReadonlySet<string>;
} | null = null;

export function authConfigured(): boolean {
  return loadConfig() !== null;
}

function loadConfig(): typeof cached {
  if (cached) return cached;
  try {
    const vendor = envSchema.parse(process.env);
    const { sessionSecret } = parseAuthEnv(process.env);
    cached = {
      secretKey: vendor.THIRDWEB_SECRET_KEY,
      sessionSecret,
      oracles: new Set(
        (vendor.ADMIN_WALLET_ADDRESSES ?? '')
          .split(',')
          .map((address) => address.trim().toLowerCase())
          .filter(Boolean),
      ),
    };
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

/**
 * Rank at session time. Oracles are configured, never self-declared: the
 * address must appear in ADMIN_WALLET_ADDRESSES (server-side env). Everyone
 * else enters as a Nomad; the ladder between them belongs to Session Zero.
 */
export function rankForAddress(address: string): Rank {
  const config = loadConfig();
  return config?.oracles.has(address.toLowerCase()) ? 'oracle' : 'nomad';
}

/**
 * Full rank resolution (ADR-018): the allowlist Oracle wins; otherwise the
 * public census remembers what the city granted. Fail closed in privilege
 * terms — a census outage or absent record grants nothing above Nomad, and
 * a census can never mint an Oracle (that stays in the env allowlist).
 */
export async function resolveRank(address: string): Promise<Rank> {
  if (rankForAddress(address) === 'oracle') return 'oracle';
  const { getStateStore } = await import('../state/server');
  const store = getStateStore();
  if (!store) return 'nomad';
  try {
    const { censusPath, CensusRecordSchema } = await import('@numinia/state');
    const found = await store.read(censusPath(address.toLowerCase()), CensusRecordSchema);
    if (!found || found.record.rank === 'oracle') return 'nomad';
    return found.record.rank;
  } catch {
    return 'nomad';
  }
}

/** Issues our own vendor-independent session after thirdweb verified the address. */
export async function issueSession(address: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: address,
    rank: await resolveRank(address),
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
