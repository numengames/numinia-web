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
const ALLOWED_HOSTS: readonly string[] = [
  'arweave.net',
  'dweb.link',
  'ipfs.io',
  'raw.githubusercontent.com',
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
  return (
    ALLOWED_HOSTS.includes(host) || ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

/** The viewer's same-origin URL for a chain binary; null passes through. */
export function viewerProxyUrl(directUrl: string | null): string | null {
  if (directUrl === null) return null;
  return `/api/media?src=${encodeURIComponent(directUrl)}`;
}
