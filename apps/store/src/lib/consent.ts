/**
 * Combined Terms + Cookies acceptance (open-questions D12, first slice).
 *
 * One first-party cookie records that the visitor accepted the Terms and
 * the Cookies policy from the banner. The value is the VERSION of the legal
 * text (a date): when the wording changes, bump CONSENT_VERSION and every
 * previous acceptance stops counting — the banner asks again. The cookie is
 * set client-side by the banner and read client-side by the metrics
 * bootstrap (analytics consent stays 'unknown' until accepted — events are
 * dropped, never buffered).
 */

export const CONSENT_COOKIE = 'numinia_consent';

/** Date of the legal text the visitor accepts. Bump on every wording change. */
export const CONSENT_VERSION = '2026-08-17';

/** Half a year — re-ask afterwards even if the text never changed. */
export const CONSENT_MAX_AGE_S = 60 * 60 * 24 * 180;

/** True when the cookie header/jar carries an acceptance of the CURRENT text. */
export function parseConsent(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => {
    const eq = part.indexOf('=');
    if (eq === -1) return false;
    return part.slice(0, eq).trim() === CONSENT_COOKIE && part.slice(eq + 1) === CONSENT_VERSION;
  });
}

/** The exact string the banner assigns to document.cookie on accept. */
export function consentCookieValue(): string {
  return `${CONSENT_COOKIE}=${CONSENT_VERSION}; Max-Age=${CONSENT_MAX_AGE_S}; Path=/; SameSite=Lax`;
}
