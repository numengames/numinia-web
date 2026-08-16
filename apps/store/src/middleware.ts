/**
 * Worker middleware (MISSION-021/025): every SSR response leaves with the
 * security walls up, every API request leaves a structured log line, and an
 * unhandled error becomes ONE honest 500 + one 'error' event instead of a
 * silent stack in the void. Static assets never reach this code.
 */

import { defineMiddleware } from 'astro:middleware';
import { capMessage, logEvent } from './lib/telemetry';

/* MISSION-025: the walls. Static pages get these via public/_headers (the
   assets layer serves them before the Worker); SSR responses get them here.
   The login page keeps a relaxed connect/frame set: wallet SDKs talk to
   vendor hosts and user-configured RPCs that no allowlist survives. */
const CSP_STRICT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "media-src 'self' https:",
  "font-src 'self'",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
const CSP_SESSION =
  CSP_STRICT.replace("connect-src 'self' https:", "connect-src 'self' https: wss:").replace(
    "img-src 'self' data: https:",
    "img-src 'self' data: https: blob:",
  ) + '; frame-src https:';

function isSessionPath(pathname: string): boolean {
  return /^\/(es\/|ja\/|ko\/|pt-br\/)?(lap\/session|spike\/auth)/.test(pathname);
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
  const started = Date.now();
  const { pathname } = context.url;
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
