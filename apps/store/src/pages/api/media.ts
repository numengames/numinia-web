/**
 * Same-origin media proxy (3D fix, 2026-08-16). The R2 public bucket lacks
 * CORS, so the 3D viewer streams chain binaries through here instead of
 * fetching cross-origin. Host-allowlisted (never an open relay), edge-cached
 * a day, rate-limited by the doorman.
 */

import type { APIRoute } from 'astro';
import { isProxyableMediaUrl } from '../../lib/media-proxy';
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
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
};
