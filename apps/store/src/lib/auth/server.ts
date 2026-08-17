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
  verifySessionTokenWithRotation,
  type SessionPayload,
  type VerifyResult,
} from '@numinia/auth';

const envSchema = z.object({
  THIRDWEB_SECRET_KEY: z.string().min(32, 'THIRDWEB_SECRET_KEY looks truncated'),
  /** Oracle wallets (comma-separated). Absent = nobody is an Oracle. */
  ADMIN_WALLET_ADDRESSES: z.string().optional(),
  /** Rotation overlap (MISSION-027): sessions signed with the previous
      secret stay valid until their own TTL. Drop the var to end the grace. */
  AUTH_SESSION_SECRET_PREVIOUS: z.string().min(32).optional(),
});

/**
 * Config is read LAZILY: a missing secret must answer "not configured" on the
 * endpoint (fail closed, ADR-006) instead of throwing at module scope on
 * every request — which crashed the route and logged a stack per visit.
 */
let cached: {
  readonly secretKey: string;
  readonly sessionSecret: string;
  readonly previousSecret: string | undefined;
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
      previousSecret: vendor.AUTH_SESSION_SECRET_PREVIOUS,
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

/**
 * SIWE domain must match the host the browser shows, or wallets flag the
 * signature request as phishing. The same deploy answers on more than one
 * public host (numinia.com today, numinia.store until MISSION-030 retires
 * it), so the domain follows the request Host — but only through this
 * allowlist: an arbitrary Host header must never reach the message a wallet
 * asks a human to sign.
 */
const PRODUCTION_AUTH_DOMAINS: ReadonlySet<string> = new Set([
  'numinia.com',
  'www.numinia.com',
  'numinia.store',
  'www.numinia.store',
]);

export class AuthDomainError extends Error {
  constructor(host: string) {
    super(`Host is not a recognized auth domain: "${host}"`);
    this.name = 'AuthDomainError';
  }
}

export function resolveAuthDomain(host: string, dev: boolean = import.meta.env.DEV): string {
  if (PRODUCTION_AUTH_DOMAINS.has(host)) return host;
  if (dev && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return host;
  throw new AuthDomainError(host);
}

const SESSION_TTL_SECONDS = 60 * 60;
const NONCE_TTL_MS = 5 * 60 * 1000;

export const SESSION_COOKIE = 'numinia_session';

/** Single-use TTL nonces (in-memory: dev server / single instance only).
    Shared across domains: a nonce is single-use citywide. */
const nonces = createNonceStore({ ttlMs: NONCE_TTL_MS, now: Date.now });

const authInstances = new Map<string, ReturnType<typeof createAuth>>();

/** The vendor layer, built on first use (never at import time), one instance
    per allowlisted domain. Throws AuthDomainError on unrecognized hosts. */
export function getAuth(host: string): ReturnType<typeof createAuth> {
  const domain = resolveAuthDomain(host);
  const existing = authInstances.get(domain);
  if (existing) return existing;
  const client = createThirdwebClient({ secretKey: requireConfig().secretKey });
  const authInstance = createAuth({
    domain,
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
  authInstances.set(domain, authInstance);
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
  const config = requireConfig();
  return verifySessionTokenWithRotation(token, config.sessionSecret, config.previousSecret, () =>
    Math.floor(Date.now() / 1000),
  );
}
