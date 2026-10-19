/**
 * The relay's bindings and settings, validated where they are read and
 * failing closed: a missing or wrong setting means no authorization starts
 * and no code is issued, never a default guessed in its place.
 */
import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { z } from 'zod';
import type { Cuerpo } from './cuerpo';
import type { Plazas } from './plazas';

/** The relay's bindings. `OAUTH_PROVIDER` is set by the library for the default handler. */
export interface Env {
  /** The OAuth library's store, and the relay's pending requests and sealed hand-offs. */
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER?: OAuthHelpers;
  /**
   * numinia.com's origin (`https://numinia.com`): where the consent page
   * lives and where the relay asks `GET /api/agents/me` who a token is.
   * A var of wrangler.jsonc, not a secret.
   */
  STORE_ORIGIN?: string;
  /** The AIs' bodies in worlds, one Durable Object per AI (story W8, cuerpo.ts). */
  CUERPO?: DurableObjectNamespace<Cuerpo>;
  /** Each organization's seats and body time, one Durable Object per organization (plazas.ts). */
  PLAZAS?: DurableObjectNamespace<Plazas>;
  /**
   * numinia.com's Worker (`numinia-web`) through a service binding (story
   * W10): how the relay asks `/api/agents/me` and `/api/agents/pass`. Worker
   * to Worker, with no address of the caller, so numinia.com counts each AI
   * on its own meter instead of all of them in one address. Unbound (tests,
   * local runs), the relay uses the public fetch to {@link Env.STORE_ORIGIN}.
   */
  STORE?: Fetcher;
  /** Cloudflare's rate limiting binding for `/register`, per address (story W10, limites.ts). */
  LIMIT_REGISTER?: RateLimit;
  /** Cloudflare's rate limiting binding for `/authorize`, per address (story W10, limites.ts). */
  LIMIT_AUTHORIZE?: RateLimit;
  /** Cloudflare's rate limiting binding for panel tokens checked at `/mcp`, per address (story W11). */
  LIMIT_BEARER?: RateLimit;
}

/** How the relay sends a request to numinia.com. */
export type StoreFetch = typeof fetch;

/**
 * The way to numinia.com: the service binding `STORE` when there is one,
 * else the public fetch (called as a function: workerd refuses it detached
 * from globalThis). Through the binding the request is the relay's own,
 * built here; the address header is dropped in case one ever rode along,
 * since its absence is what tells numinia.com the call is the relay's
 * (store: lib/rate-limit.ts `fromRelay`).
 */
export function storeFetch(env: Env): StoreFetch {
  const bound = env.STORE;
  if (bound === undefined) return (input, init) => fetch(input, init);
  return (input, init) => {
    const request = new Request(input, init);
    request.headers.delete('cf-connecting-ip');
    return bound.fetch(request);
  };
}

/** An https origin and nothing else: no path, query, fragment or credentials. */
const httpsOrigin = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value;
  } catch {
    return false;
  }
});

/** numinia.com's origin, or null when it is missing or not a bare https origin. */
export function storeOrigin(env: Env): string | null {
  const parsed = httpsOrigin.safeParse(env.STORE_ORIGIN);
  return parsed.success ? parsed.data : null;
}
