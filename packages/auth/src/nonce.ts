/**
 * Nonce store — single-use, TTL-bound (the spike's lifecycle, packaged).
 * Injectable clock for testability; in-memory by design for now (sessions are
 * stateless; nonces only live seconds between issue and consume).
 */

import { toBase64Url } from './encoding.js';

export interface NonceStore {
  issue(): string;
  /** True exactly once per issued, unexpired nonce. */
  consume(nonce: string): boolean;
}

export interface NonceStoreOptions {
  readonly ttlMs: number;
  readonly now: () => number;
}

export function createNonceStore(options: NonceStoreOptions): NonceStore {
  const { ttlMs, now } = options;
  const issued = new Map<string, number>();
  return {
    issue() {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const nonce = toBase64Url(bytes);
      issued.set(nonce, now() + ttlMs);
      return nonce;
    },
    consume(nonce) {
      const expiresAt = issued.get(nonce);
      if (expiresAt === undefined) return false;
      issued.delete(nonce);
      return now() <= expiresAt;
    },
  };
}
