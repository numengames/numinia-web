/**
 * Per-address limits on the two doors anyone can knock without a token
 * (DISENO-MCP-REMOTO §2 (e), story W10):
 * - `/register`, dynamic client registration: each call writes a client to
 *   KV that lives 90 days. A real client registers once per install, so
 *   {@link REGISTER_PER_MINUTE} a minute per address is plenty and a loop
 *   cannot fill the store.
 * - `/authorize`: each call writes a pending request to KV and makes a P-256
 *   key pair. A person retries a few times, an office shares one address,
 *   so {@link AUTHORIZE_PER_MINUTE}.
 * The address is `cf-connecting-ip`, which Cloudflare's edge sets on every
 * request and a client cannot change; without it (a local run) the key is
 * `local`. `/token`, `/mcp` and `/vuelta` are not counted here: the first
 * two need a credential the library checks, the last one a one-time request.
 *
 * One more count (story W11), inside `/mcp`: a panel token pasted as a
 * static bearer (bearer.ts) is checked by asking numinia.com, one call per
 * request, and numinia.com counts the relay's calls only per agent — which
 * an unknown token has not. So each address may have
 * {@link BEARER_PER_MINUTE} panel tokens checked a minute
 * ({@link bearerAllowed}): far above what one client sends (numinia.com
 * allows an AI 60), low enough that guessing tokens costs numinia.com little.
 *
 * The count is Cloudflare's rate limiting binding (`ratelimits` in
 * wrangler.jsonc, {@link LIMITS}: a namespace id the house picks, no
 * resource to create; windows of 60 s). It counts per Cloudflare location
 * and is eventually consistent, so it stops a loop, not a spread-out swarm
 * — the right size for these doors. When a binding is missing (tests, a
 * local run without it) or fails, a counter in this isolate's memory takes
 * its place with the same limit: never no limit at all.
 */
import { AUTHORIZE_PATH, REGISTER_PATH } from './config';
import type { Env } from './env';
import { stopPage } from './pages';

/** Registrations a minute per address. */
export const REGISTER_PER_MINUTE = 10;
/** Authorization starts a minute per address. */
export const AUTHORIZE_PER_MINUTE = 30;
/** Panel tokens checked a minute per address (story W11). */
export const BEARER_PER_MINUTE = 300;
/** The binding's window (it allows only 10 or 60 seconds). */
export const LIMIT_WINDOW_SECONDS = 60;

interface Door {
  readonly name: 'register' | 'authorize' | 'bearer';
  readonly binding: 'LIMIT_REGISTER' | 'LIMIT_AUTHORIZE' | 'LIMIT_BEARER';
  readonly limit: number;
}

/** The counted doors, as wrangler.jsonc declares their bindings. */
export const LIMITS: Readonly<Record<string, Door>> = {
  [REGISTER_PATH]: { name: 'register', binding: 'LIMIT_REGISTER', limit: REGISTER_PER_MINUTE },
  [AUTHORIZE_PATH]: { name: 'authorize', binding: 'LIMIT_AUTHORIZE', limit: AUTHORIZE_PER_MINUTE },
};

interface Window {
  count: number;
  resetAt: number;
}

/** The count of panel tokens checked at `/mcp` (story W11, bearer.ts). */
export const BEARER_DOOR: Door = {
  name: 'bearer',
  binding: 'LIMIT_BEARER',
  limit: BEARER_PER_MINUTE,
};

/** The fallback counter: per isolate, per door and address. */
const windows = new Map<string, Window>();

/** The fallback: true while the address is within the door's limit. */
function countInMemory(key: string, limit: number, now: number): boolean {
  if (windows.size >= 1000) {
    for (const [stale, window] of windows) {
      if (window.resetAt <= now) windows.delete(stale);
    }
  }
  const current = windows.get(key);
  if (current === undefined || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + LIMIT_WINDOW_SECONDS * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

/** Test seam: the fallback's counters are isolate state. */
export function resetLimitsForTests(): void {
  windows.clear();
}

/** Whether this request may go on through its door: the binding, or the fallback. */
async function allowed(door: Door, address: string, env: Env, now: number): Promise<boolean> {
  const key = `${door.name}:${address}`;
  const binding = env[door.binding];
  if (binding !== undefined) {
    try {
      return (await binding.limit({ key })).success;
    } catch {
      // The binding failed: count here rather than not at all.
    }
  }
  return countInMemory(key, door.limit, now);
}

/** The caller's address: Cloudflare's, or `local` on a run without the edge. */
const addressOf = (request: Request): string => request.headers.get('cf-connecting-ip') ?? 'local';

/** Whether this address may have one more panel token checked this minute (story W11). */
export function bearerAllowed(
  request: Request,
  env: Env,
  now: number = Date.now(),
): Promise<boolean> {
  return allowed(BEARER_DOOR, addressOf(request), env, now);
}

/**
 * Null when the request may go on (any path but the two doors, or within the
 * limit); else the answer that asks it to wait a minute: for `/register` the
 * JSON error a client reads, for `/authorize` the plain page a person sees.
 */
export async function overLimit(
  request: Request,
  env: Env,
  now: number = Date.now(),
): Promise<Response | null> {
  const door = LIMITS[new URL(request.url).pathname];
  if (door === undefined) return null;
  if (await allowed(door, addressOf(request), env, now)) return null;
  const wait = { 'Retry-After': String(LIMIT_WINDOW_SECONDS) };
  if (door.name === 'authorize') return stopPage(request, 'busy', 429, wait);
  return Response.json(
    {
      error: 'too_many_requests',
      error_description: 'Too many registrations from this address: wait a minute.',
    },
    { status: 429, headers: { ...wait, 'Cache-Control': 'no-store' } },
  );
}
