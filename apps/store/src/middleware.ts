/**
 * Worker middleware (MISSION-021/025): every SSR response leaves with the
 * security walls up, every API request leaves a structured log line, and an
 * unhandled error becomes ONE honest 500 + one 'error' event instead of a
 * silent stack in the void. Static assets never reach this code.
 */

import { defineMiddleware } from 'astro:middleware';
import { doorman } from './lib/rate-limit';
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
   `script-src` keeps 'unsafe-inline': a hash list cannot work here — the
   Cloudflare build wraps every island bootstrap in a shim (`globalThis.
   process??={}`) that a Node-built hash never sees, so one missed hash
   blocked every script, the sign-in included (2026-10-18).
   `connect-src` drops the open `https:` too: the client never
   fetches an external host directly — every chain/CDN binary goes through
   the same-origin `/api/media` proxy (src/lib/media-proxy.ts) precisely so
   pages never need that allowance; `blob:` stays for three.js's
   GLB-embedded-texture fetches (connect-src governs fetch, not img-src —
   learned live, v0.38.1). The relaxed CSP_SESSION keeps `https:` because a
   wallet SDK's RPC host is the user's own choice, not ours to allowlist. */
const CSP_STRICT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
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

export const onRequest = defineMiddleware(async (context, next) => {
  // Cloudflare: vars and secrets only exist on cloudflare:workers' env —
  // the bundler freezes every process.env expression (lib/runtime-env.ts).
  await primeFromWorkerd();
  const started = Date.now();
  const { pathname } = context.url;
  const method = context.request.method;
  // MISSION-026: the doorman (lib/rate-limit.ts, its rules there too). The
  // relay's calls for an AI are counted per agent by their route instead.
  const verdict = doorman(method, pathname, context.request.headers);
  if (verdict !== null && !verdict.allowed) {
    logEvent({ level: 'warn', kind: 'throttled', path: pathname, rule: verdict.rule });
    return Response.json(
      { error: 'Too many requests — the doorman asks for a pause' },
      { status: 429, headers: { 'retry-after': String(verdict.retryAfterS) } },
    );
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
