/**
 * Client-side CSRF utility.
 * Reads the csrf_token cookie (set at login, non-httpOnly) and
 * returns headers to include in admin fetch requests.
 */

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

/**
 * Fetch wrapper that automatically includes CSRF token.
 */
export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getCsrfToken();
  if (token) headers.set('X-CSRF-Token', token);
  return fetch(url, { ...options, headers });
}
