/**
 * Same-origin media proxy rules (3D fix, 2026-08-16): the R2 public bucket
 * sends no CORS headers, so the viewer's fetch dies cross-origin. Binaries
 * for the VIEWER route through /api/media on our own origin instead; plain
 * downloads and native <img>/<audio>/<video> stay direct (media elements
 * are not CORS-bound). Only the storage chain's own hosts may be proxied —
 * this endpoint must never become an open relay.
 */

const ALLOWED_HOST_SUFFIXES: readonly string[] = [
  '.r2.dev',
  '.r2.cloudflarestorage.com',
  '.dweb.link',
  '.ipfs.io',
];
const ALLOWED_HOSTS: readonly string[] = ['arweave.net', 'dweb.link', 'ipfs.io'];

/* raw.githubusercontent.com serves ANY public repo, so the host alone is not
   the storage chain (2026-10-02): only the data repository and the studio's
   own repos pass. Compared lower-cased — GitHub owners and repos are
   case-insensitive. The URL parser has already resolved dot segments. */
const GITHUB_RAW_HOST = 'raw.githubusercontent.com';
const GITHUB_RAW_PATH_PREFIXES: readonly string[] = [
  '/pablofmm/numinia-digital-goods-data/',
  '/numengames/',
];

/** True only for https URLs on the storage chain's hosts. */
export function isProxyableMediaUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === GITHUB_RAW_HOST) {
    const path = url.pathname.toLowerCase();
    return GITHUB_RAW_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  }
  return (
    ALLOWED_HOSTS.includes(host) || ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

/** The viewer's same-origin URL for a chain binary; null passes through. */
export function viewerProxyUrl(directUrl: string | null): string | null {
  if (directUrl === null) return null;
  return `/api/media?src=${encodeURIComponent(directUrl)}`;
}

/* Stored XSS guard (2026-10-02): anyone can host a file on an allowlisted
   host (a fresh *.r2.dev bucket, any GitHub repo), and the proxy re-serves it
   under numinia.com, whose page CSP allows inline script. So the TYPE decides
   what may pass, and only what the viewer loads does: the chain serves its
   GLB/VRM as octet-stream, glTF may name textures (raster images), and the
   catalog's media is audio/video. Never text, never XML (SVG is XML). */
const PROXYABLE_EXACT_TYPES: readonly string[] = [
  'application/octet-stream',
  'model/gltf-binary',
  'model/gltf+json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
];
const PROXYABLE_TYPE_PREFIXES: readonly string[] = ['video/', 'audio/'];

/** True when an upstream content-type is safe to re-serve on our origin. */
export function isProxyableContentType(raw: string | null): boolean {
  // No type: re-served as octet-stream with nosniff — inert.
  if (raw === null) return true;
  const type = raw.replace(/;.*$/s, '').trim().toLowerCase();
  if (PROXYABLE_EXACT_TYPES.includes(type)) return true;
  return PROXYABLE_TYPE_PREFIXES.some(
    (prefix) => type.startsWith(prefix) && type.length > prefix.length,
  );
}

/** Headers for a proxied body: its vetted type, sandboxed, never sniffed. */
export function proxiedMediaHeaders(contentType: string | null): Record<string, string> {
  return {
    'content-type': contentType ?? 'application/octet-stream',
    'content-security-policy': "default-src 'none'; sandbox",
    'x-content-type-options': 'nosniff',
    'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
  };
}
