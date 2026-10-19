/**
 * The relay's bindings and settings, validated where they are read and
 * failing closed: a missing or wrong setting means no authorization starts
 * and no code is issued, never a default guessed in its place.
 */
import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { z } from 'zod';

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
