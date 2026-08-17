/**
 * Combined Terms + Cookies acceptance (D12 first slice): the cookie is the
 * single record of acceptance, versioned by legal-text date — when the text
 * changes, CONSENT_VERSION bumps and every old acceptance stops counting.
 */

import { describe, expect, it } from 'vitest';
import { CONSENT_COOKIE, CONSENT_VERSION, consentCookieValue, parseConsent } from '../consent';

describe('parseConsent', () => {
  it('accepts a cookie header carrying the current version', () => {
    expect(parseConsent(`${CONSENT_COOKIE}=${CONSENT_VERSION}`)).toBe(true);
    expect(parseConsent(`a=b; ${CONSENT_COOKIE}=${CONSENT_VERSION}; c=d`)).toBe(true);
    expect(parseConsent(`a=b;   ${CONSENT_COOKIE}=${CONSENT_VERSION}`)).toBe(true);
  });

  it('rejects absence, emptiness and foreign cookies', () => {
    expect(parseConsent(null)).toBe(false);
    expect(parseConsent(undefined)).toBe(false);
    expect(parseConsent('')).toBe(false);
    expect(parseConsent('numinia_session=abc; other=1')).toBe(false);
  });

  it('ignores malformed jar fragments without an equals sign', () => {
    expect(parseConsent('garbage')).toBe(false);
    expect(parseConsent(`garbage; ${CONSENT_COOKIE}=${CONSENT_VERSION}`)).toBe(true);
  });

  it('rejects stale versions — a legal-text change re-asks', () => {
    expect(parseConsent(`${CONSENT_COOKIE}=2020-01-01`)).toBe(false);
    expect(parseConsent(`${CONSENT_COOKIE}=`)).toBe(false);
  });

  it('never matches on name prefixes or suffixes', () => {
    expect(parseConsent(`x${CONSENT_COOKIE}=${CONSENT_VERSION}`)).toBe(false);
    expect(parseConsent(`${CONSENT_COOKIE}x=${CONSENT_VERSION}`)).toBe(false);
  });
});

describe('consentCookieValue', () => {
  it('serializes name, version, half-year expiry, site path and Lax', () => {
    const value = consentCookieValue();
    expect(value).toContain(`${CONSENT_COOKIE}=${CONSENT_VERSION}`);
    expect(value).toContain(`Max-Age=${60 * 60 * 24 * 180}`);
    expect(value).toContain('Path=/');
    expect(value).toContain('SameSite=Lax');
  });

  it('round-trips through the parser', () => {
    const jar = consentCookieValue().split(';')[0]!;
    expect(parseConsent(jar)).toBe(true);
  });
});
