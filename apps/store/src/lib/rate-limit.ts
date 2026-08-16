/**
 * Rate limiting (MISSION-026) — a sliding-window counter per key, held in
 * isolate memory. HONEST LIMITS OF THIS DESIGN: each Worker isolate keeps
 * its own counters (a global burst across isolates multiplies the budget)
 * and recycling resets them. That still stops the only attacker this size
 * of city has today — a single loop hammering one colo — and the upgrade
 * path (KV or a Durable Object) is queued with the D23 infrastructure.
 * Fail closed is inverted here on purpose: when in doubt, we THROTTLE.
 */

interface Window {
  count: number;
  resetAt: number;
}

export interface RateVerdict {
  readonly allowed: boolean;
  /** Seconds until the window resets — the Retry-After value. */
  readonly retryAfterS: number;
}

const windows = new Map<string, Window>();

/** Opportunistic prune so the map never grows unbounded in a hot isolate. */
function prune(now: number): void {
  if (windows.size < 1000) return;
  for (const [key, value] of windows) {
    if (value.resetAt <= now) windows.delete(key);
  }
}

export function checkRate(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateVerdict {
  prune(now);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterS: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return { allowed: false, retryAfterS: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterS: 0 };
}

/** Test seam: counters are process state; suites reset between scenarios. */
export function resetRateLimitsForTests(): void {
  windows.clear();
}
