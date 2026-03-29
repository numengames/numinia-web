/**
 * URL/path helpers for asset filenames and extensions (avoids host dots breaking split('.').pop()).
 */

/** Strip query/hash, then return the last path segment (filename). */
export function basenameFromUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop() || '';
    return seg.split(/[?#]/)[0] || '';
  } catch {
    const noHash = url.split('#')[0] ?? '';
    const noQuery = noHash.split('?')[0] ?? '';
    return noQuery.split('/').pop() || '';
  }
}

/** File extension (lowercase) from a URL or path; ignores hostname dots. */
export function getExtensionFromUrl(url: string): string {
  const base = basenameFromUrl(url);
  const i = base.lastIndexOf('.');
  if (i <= 0 || i === base.length - 1) return '';
  return base.slice(i + 1).toLowerCase();
}
