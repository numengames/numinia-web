/**
 * Same-origin media proxy (3D fix, 2026-08-16). The R2 public bucket lacks
 * CORS, so the 3D viewer streams chain binaries through here instead of
 * fetching cross-origin. Host-allowlisted (never an open relay), type-
 * allowlisted (never a document on our origin: no HTML, no SVG, no script),
 * sandboxed by its own CSP, edge-cached a day, rate-limited by the doorman.
 */

import type { APIRoute } from 'astro';
import {
  isProxyableContentType,
  isProxyableMediaUrl,
  proxiedMediaHeaders,
} from '../../lib/media-proxy';
import { logEvent } from '../../lib/telemetry';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const src = url.searchParams.get('src');
  if (!src) return Response.json({ error: 'src required' }, { status: 400 });
  if (!isProxyableMediaUrl(src)) {
    logEvent({ level: 'warn', kind: 'media-refused', src: src.slice(0, 200) });
    return Response.json({ error: 'Host not in the storage chain' }, { status: 403 });
  }
  const upstream = await fetch(src);
  if (!upstream.ok || upstream.body === null) {
    return Response.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
  }
  const contentType = upstream.headers.get('content-type');
  if (!isProxyableContentType(contentType)) {
    await upstream.body.cancel();
    logEvent({
      level: 'warn',
      kind: 'media-type-refused',
      src: src.slice(0, 200),
      type: (contentType ?? '').slice(0, 100),
    });
    return Response.json({ error: 'Media type not served' }, { status: 415 });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: proxiedMediaHeaders(contentType),
  });
};
