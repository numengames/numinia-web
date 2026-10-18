/**
 * Worker middleware (MISSION-021/025): every SSR response leaves with the
 * security walls up, every API request leaves a structured log line, and an
 * unhandled error becomes ONE honest 500 + one 'error' event instead of a
 * silent stack in the void. Static assets never reach this code.
 */

import { defineMiddleware } from 'astro:middleware';
import { INLINE_SCRIPT_HASHES } from './lib/csp-hashes.generated';
import { checkRate } from './lib/rate-limit';
import { primeFromWorkerd } from './lib/runtime-env';
import { capMessage, logEvent } from './lib/telemetry';

/* MISSION-025 + security hardening (2026-10-18): the walls. Static pages get
   these via public/_headers (the assets layer serves them before the
   Worker); SSR responses get them here. The pages where a wallet signs keep
   a relaxed connect/frame set: wallet SDKs talk to vendor hosts and
   user-configured RPCs that no allowlist survives. Those are the login, the
   worlds room, where an Oracle signs each request to a fleet machine, and
   Saldo's members tab, where giving «Administrador» or «Gestionar roles» is
   signed again (STD-051 ORG-008).
   `script-src` no longer carries 'unsafe-inline': every page's only inline
   scripts are the small `is:inline` boot/telemetry ones, whose BODY text is
   static (their per-page data travels in a `data-*` attribute, which CSP
   hashing never looks at) — scripts/generate-csp-hashes.mjs hashes them at
   build time. `connect-src` drops the open `https:` too: the client never
   fetches an external host directly — every chain/CDN binary goes through
   the same-origin `/api/media` proxy (src/lib/media-proxy.ts) precisely so
   pages never need that allowance; `blob:` stays for three.js's
   GLB-embedded-texture fetches (connect-src governs fetch, not img-src —
   learned live, v0.38.1). The relaxed CSP_SESSION keeps `https:` because a
   wallet SDK's RPC host is the user's own choice, not ours to allowlist. */
const CSP_STRICT = [
  "default-src 'self'",
  `script-src 'self' ${INLINE_SCRIPT_HASHES.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self'",
  "connect-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
const CSP_SESSION =
  CSP_STRICT.replace("connect-src 'self' blob:", "connect-src 'self' blob: https: wss:") +
  '; frame-src https:';

function isSessionPath(pathname: string): boolean {
  // One door only: /spike/auth was retired with MIS-078 — the login lives in
  // the LAP, and a second copy of it was a second surface to keep AA. The
  // worlds room and the organization panel's people screens (Miembros and
  // Roles: giving «Administrador» asks the wallet to sign) sign with the same
  // wallet, so they get the same walls. Saldo's old members address only
  // sends on now, and keeps the strict ones.
  return /^\/(es\/|ja\/|ko\/|pt-br\/)?(lap\/(session|admin\/worlds)|panel\/(miembros|roles))/.test(
    pathname,
  );
}

export function securityHeaders(
  pathname: string,
  contentType: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  };
  if (contentType?.includes('text/html')) {
    headers['content-security-policy'] = isSessionPath(pathname) ? CSP_SESSION : CSP_STRICT;
  }
  return headers;
}

/* MISSION-026: the doorman. Only the endpoints worth abusing — mutations
   and gated data. Page loads and the session GET stay unmetered (every page
   asks who you are; throttling that would DoS ourselves). */
const RATE_RULES: ReadonlyArray<{
  test: (method: string, path: string) => boolean;
  key: string;
  limit: number;
}> = [
  { test: (m, p) => m === 'POST' && p === '/api/auth/login', key: 'login', limit: 20 },
  { test: (m, p) => m === 'POST' && p === '/api/admin/census', key: 'census-write', limit: 20 },
  // The price room checks each draft with the till as the Oracle types
  // (debounced) and schedules versions: generous, but metered like any write.
  { test: (m, p) => m === 'POST' && p === '/api/admin/prices', key: 'prices-desk', limit: 120 },
  { test: (m, p) => m === 'GET' && p.startsWith('/api/admin/'), key: 'admin-read', limit: 60 },
  // «Saldo»: top-ups, organizations and members are writes on the till; the
  // screen re-reads the balance on every return to the tab, so reads get more.
  { test: (m, p) => m === 'POST' && p === '/api/saldo', key: 'saldo-write', limit: 30 },
  // The lines a wallet signs before giving «Administrador» (ORG-008): the
  // desk is only read, but each answer is a token under the session secret.
  { test: (m, p) => m === 'POST' && p === '/api/saldo/signature', key: 'saldo-sign', limit: 30 },
  // «IAs de organización»: creating, switching and removing an AI are writes on the till.
  {
    test: (m, p) => (m === 'POST' || m === 'PATCH' || m === 'DELETE') && p === '/api/saldo/agents',
    key: 'agents-write',
    limit: 30,
  },
  // An AI's bridge renews its pass every ~8 minutes; the doorman only stops a loop.
  { test: (m, p) => m === 'POST' && p === '/api/agents/pass', key: 'agent-pass', limit: 120 },
  { test: (m, p) => m === 'GET' && p.startsWith('/api/saldo'), key: 'saldo-read', limit: 120 },
  { test: (m, p) => m === 'POST' && p === '/api/telemetry', key: 'telemetry', limit: 10 },
  { test: (m, p) => m === 'GET' && p === '/api/media', key: 'media', limit: 120 },
  // Who is inside each home: the answer is reused for 30 s per instance, so the worlds are knocked at
  // most twice a minute whatever the traffic. Since v0.114.0 every page asks (the city rail's «Ahora en
  // la ciudad»), so one person browsing — or an office behind one address — passes 60 a minute easily:
  // the meter only stops a loop.
  { test: (m, p) => m === 'GET' && p === '/api/live', key: 'live', limit: 600 },
];
const RATE_WINDOW_MS = 60_000;

export const onRequest = defineMiddleware(async (context, next) => {
  // Cloudflare: vars and secrets only exist on cloudflare:workers' env —
  // the bundler freezes every process.env expression (lib/runtime-env.ts).
  await primeFromWorkerd();
  const started = Date.now();
  const { pathname } = context.url;
  const method = context.request.method;
  const rule = RATE_RULES.find((candidate) => candidate.test(method, pathname));
  if (rule) {
    const ip = context.request.headers.get('cf-connecting-ip') ?? 'local';
    const verdict = checkRate(`${rule.key}:${ip}`, rule.limit, RATE_WINDOW_MS);
    if (!verdict.allowed) {
      logEvent({ level: 'warn', kind: 'throttled', path: pathname, rule: rule.key });
      return Response.json(
        { error: 'Too many requests — the doorman asks for a pause' },
        { status: 429, headers: { 'retry-after': String(verdict.retryAfterS) } },
      );
    }
  }
  try {
    const response = await next();
    for (const [name, value] of Object.entries(
      securityHeaders(pathname, response.headers.get('content-type')),
    )) {
      response.headers.set(name, value);
    }
    if (pathname.startsWith('/api/')) {
      logEvent({
        level: 'info',
        kind: 'api',
        method: context.request.method,
        path: pathname,
        status: response.status,
        ms: Date.now() - started,
      });
    }
    return response;
  } catch (error) {
    logEvent({
      level: 'error',
      kind: 'unhandled',
      method: context.request.method,
      path: pathname,
      ms: Date.now() - started,
      message: capMessage(error instanceof Error ? error.message : String(error)),
      stack: capMessage(error instanceof Error ? (error.stack ?? '') : ''),
    });
    // §9.7 would demand cause+exit for humans; an API caller gets the honest
    // minimum and the cause lives in the log line above.
    return Response.json({ error: 'Internal error — logged' }, { status: 500 });
  }
});
