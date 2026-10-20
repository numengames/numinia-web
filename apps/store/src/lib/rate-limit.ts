/**
 * Rate limiting (MISSION-026) — a sliding-window counter per key, held in
 * isolate memory. HONEST LIMITS OF THIS DESIGN: each Worker isolate keeps
 * its own counters (a global burst across isolates multiplies the budget)
 * and recycling resets them. That still stops the only attacker this size
 * of city has today — a single loop hammering one colo — and the upgrade
 * path (KV or a Durable Object) is queued with the D23 infrastructure.
 * Fail closed is inverted here on purpose: when in doubt, we THROTTLE.
 *
 * The doorman's rules live here too (they were in middleware.ts), so who
 * is counted where can be tested without the Astro runtime.
 */

import { bearerOf } from './agents';

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

/** One of the doorman's rules: which requests, under which key, how many a minute per address. */
export interface DoormanRule {
  readonly methods: readonly string[];
  /** The path, exactly — or, with `prefix`, every path that starts with it. */
  readonly path: string;
  readonly prefix?: true;
  readonly key: string;
  readonly limit: number;
  /**
   * The token routes of an organization's AI («MCP remoto», story W10):
   * the relay's calls skip the per-address count here because the route
   * itself counts them per agent (`meterToken`, lib/agent-me.ts).
   */
  readonly perAgent?: true;
}

/* MISSION-026: the doorman. Only the endpoints worth abusing — mutations
   and gated data. Page loads and the session GET stay unmetered (every page
   asks who you are; throttling that would DoS ourselves). The first rule
   that matches decides. */
export const RATE_RULES: readonly DoormanRule[] = [
  { methods: ['POST'], path: '/api/auth/login', key: 'login', limit: 20 },
  { methods: ['POST'], path: '/api/admin/census', key: 'census-write', limit: 20 },
  // The price room checks each draft with the till as the Oracle types
  // (debounced) and schedules versions: generous, but metered like any write.
  { methods: ['POST'], path: '/api/admin/prices', key: 'prices-desk', limit: 120 },
  { methods: ['GET'], path: '/api/admin/', prefix: true, key: 'admin-read', limit: 60 },
  // The public reading of a community's rules (condiciones/w3): cached at the edge, this only stops a loop.
  { methods: ['GET'], path: '/api/community-terms', key: 'terms-public', limit: 120 },
  // «Saldo»: top-ups, organizations and members are writes on the till; the
  // screen re-reads the balance on every return to the tab, so reads get more.
  { methods: ['POST'], path: '/api/saldo', key: 'saldo-write', limit: 30 },
  // The lines a wallet signs before giving «Administrador» (ORG-008): the
  // desk is only read, but each answer is a token under the session secret.
  { methods: ['POST'], path: '/api/saldo/signature', key: 'saldo-sign', limit: 30 },
  // «IAs de organización»: creating, switching and removing an AI are writes on the till.
  {
    methods: ['POST', 'PATCH', 'DELETE'],
    path: '/api/saldo/agents',
    key: 'agents-write',
    limit: 30,
  },
  // «Conecta tu IA»: «Permitir» creates an AI or renews its token — a write on the till.
  { methods: ['POST'], path: '/api/conectar-ia', key: 'connect-ai', limit: 30 },
  // An AI's bridge renews its pass every ~8 minutes; the doorman only stops a loop.
  { methods: ['POST'], path: '/api/agents/pass', key: 'agent-pass', limit: 120, perAgent: true },
  // The relay asks who an AI is at most once a minute per AI while it works.
  { methods: ['GET'], path: '/api/agents/me', key: 'agent-me', limit: 120, perAgent: true },
  { methods: ['GET'], path: '/api/saldo', prefix: true, key: 'saldo-read', limit: 120 },
  { methods: ['POST'], path: '/api/telemetry', key: 'telemetry', limit: 10 },
  { methods: ['GET'], path: '/api/media', key: 'media', limit: 120 },
  // Who is inside each home: the answer is reused for 30 s per instance, so the worlds are knocked at
  // most twice a minute whatever the traffic. Since v0.114.0 every page asks (the city rail's «Ahora en
  // la ciudad»), so one person browsing — or an office behind one address — passes 60 a minute easily:
  // the meter only stops a loop.
  { methods: ['GET'], path: '/api/live', key: 'live', limit: 600 },
];

export const RATE_WINDOW_MS = 60_000;

/** The rule that meters a request, or undefined when nothing does. */
export function rateRuleFor(method: string, path: string): DoormanRule | undefined {
  return RATE_RULES.find(
    (rule) =>
      rule.methods.includes(method) &&
      (rule.prefix === true ? path.startsWith(rule.path) : path === rule.path),
  );
}

/**
 * Whether a request is the relay's (`numinia-mcp`, mcp.numinia.com) asking
 * for an organization's AI with its access token («MCP remoto», story W10,
 * DISENO-MCP-REMOTO §4 risk 3).
 *
 * The relay reaches numinia.com through a SERVICE BINDING (`STORE` in
 * apps/mcp/wrangler.jsonc), Worker to Worker, never over the internet, and
 * builds each request itself: it carries no `cf-connecting-ip`. Every
 * request from the internet does: Cloudflare's edge sets that header on
 * every request it proxies and overwrites whatever value the client sent,
 * so no client can make it disappear. Its ABSENCE is the one sign a caller
 * cannot forge, where any header the relay could add (`cf-worker`, a name
 * of its own) could be typed by anyone. Counted by address, the relay's
 * calls would all fall in one bucket (`local`), and one busy AI would
 * throttle every other.
 *
 * The exception is narrow: only on a rule marked `perAgent` (the two token
 * routes, whose handlers meter per agent with `meterToken`, 60 a minute),
 * and only with an `Authorization: Bearer ntk_…` of the right shape; the
 * handler still judges the token. Local runs (`astro dev`) have no
 * `cf-connecting-ip` either, where it changes nothing that matters. The zone
 * must never turn on the «Remove visitor IP headers» managed transform:
 * without the header every caller would look like the relay here (each
 * still held to its agent's 60 a minute) and every other rule would count
 * the whole internet as one address.
 */
export function fromRelay(rule: DoormanRule, headers: Headers): boolean {
  return (
    rule.perAgent === true &&
    !headers.has('cf-connecting-ip') &&
    bearerOf(headers.get('authorization')) !== null
  );
}

/** What the doorman decided for one request it meters. */
export interface DoormanVerdict extends RateVerdict {
  readonly rule: string;
}

/**
 * The doorman: null when no rule meters the request, or when it is the
 * relay's call for an AI (counted per agent by the route itself, see
 * {@link fromRelay}); otherwise the verdict for the caller's address.
 */
export function doorman(
  method: string,
  path: string,
  headers: Headers,
  now: number = Date.now(),
): DoormanVerdict | null {
  const rule = rateRuleFor(method, path);
  if (rule === undefined || fromRelay(rule, headers)) return null;
  const ip = headers.get('cf-connecting-ip') ?? 'local';
  return { rule: rule.key, ...checkRate(`${rule.key}:${ip}`, rule.limit, RATE_WINDOW_MS, now) };
}
