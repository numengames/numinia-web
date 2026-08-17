/**
 * Server-side state wiring (ADR-018): git as the database, lazily configured.
 * Same doctrine as auth: a missing env answers "not configured" on the
 * endpoint (503, fail closed) instead of crashing at module scope. Until the
 * Oracle creates the private state repo and mints its token (D23), every
 * census feature waits behind stateConfigured() === false.
 */

import { GitStateStore, parseStateEnv } from '@numinia/state';
import { runtimeEnv } from '../runtime-env';

let cached: GitStateStore | null = null;

export function stateConfigured(): boolean {
  return getStateStore() !== null;
}

export function getStateStore(): GitStateStore | null {
  if (cached) return cached;
  try {
    // runtimeEnv, not process.env: the Cloudflare build freezes the bare
    // expression to {} — the census token only exists behind globalThis.
    cached = new GitStateStore(parseStateEnv(runtimeEnv()));
    return cached;
  } catch {
    return null;
  }
}

/** Test seam: config is cached for the process; tests reset between envs. */
export function resetStateStoreForTests(): void {
  cached = null;
}
