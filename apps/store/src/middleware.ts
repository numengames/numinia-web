/**
 * Worker middleware (MISSION-021/025): every SSR response leaves with the
 * security walls up, every API request leaves a structured log line, and an
 * unhandled error becomes ONE honest 500 + one 'error' event instead of a
 * silent stack in the void. Static assets never reach this code.
 */

import { defineMiddleware } from 'astro:middleware';
import { checkRate } from './lib/rate-limit';
import { primeFromWorkerd } from './lib/runtime-env';
import { capMessage, logEvent } from './lib/telemetry';

/* MISSION-025: the walls. Static pages get these via public/_headers (the
   assets layer serves them before the Worker); SSR responses get them here.
   The login page keeps a relaxed connect/frame set: wallet SDKs talk to
   vendor hosts and user-configured RPCs that no allowlist survives. */
const CSP_STRICT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self'",
  // blob: because three.js fetches GLB-embedded textures via blob URLs
  // (connect-src governs fetch, not img-src — learned live, v0.38.1).
  "connect-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
const CSP_SESSION =
  CSP_STRICT.replace("connect-src 'self' blob: https:", "connect-src 'self' blob: https: wss:") +
  '; frame-src https:';

function isSessionPath(pathname: string): boolean {
  // One door only: /spike/auth was retired with MIS-078 — the login lives in
  // the L.A.P., and a second copy of it was a second surface to keep AA.
  return /^\/(es\/|ja\/|ko\/|pt-br\/)?lap\/session/.test(pathname);
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
  { test: (m, p) => m === 'POST' && p === '/api/auth/siwe', key: 'siwe', limit: 20 },
  { test: (m, p) => m === 'POST' && p === '/api/admin/census', key: 'census-write', limit: 20 },
  { test: (m, p) => m === 'GET' && p.startsWith('/api/admin/'), key: 'admin-read', limit: 60 },
  { test: (m, p) => m === 'POST' && p === '/api/telemetry', key: 'telemetry', limit: 10 },
  { test: (m, p) => m === 'GET' && p === '/api/media', key: 'media', limit: 120 },
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
