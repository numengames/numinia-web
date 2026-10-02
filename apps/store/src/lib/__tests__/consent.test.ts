/**
 * The cookie notice's record (LEG-003 §3.1): vanilla-cookieconsent writes
 * `numinia_consent` as URI-encoded JSON. Measurement counts only when the
 * `analytics` category is in it for the CURRENT policy revision; the old
 * date-stamped Terms+Cookies cookie counts as no answer.
 */

import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_CATEGORY,
  CONSENT_COOKIE,
  CONSENT_DAYS,
  POLICY_REVISION,
  hasLegacyConsent,
  measurementConsent,
  needsNotice,
  parseConsent,
} from '../consent';

/** A cookie exactly as the library serializes it. */
function jar(value: unknown): string {
  return `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}`;
}

const accepted = jar({ categories: ['necessary', 'analytics'], revision: POLICY_REVISION });
const rejected = jar({ categories: ['necessary'], revision: POLICY_REVISION });

describe('parseConsent', () => {
  it('reads the categories and revision the notice recorded', () => {
    expect(parseConsent(accepted)).toEqual({
      revision: POLICY_REVISION,
      categories: ['necessary', 'analytics'],
    });
    expect(parseConsent(`a=b;  ${rejected}; c=d`)?.categories).toEqual(['necessary']);
  });

  it('is null without an answer', () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent('')).toBeNull();
    expect(parseConsent('numinia_session=abc; other=1')).toBeNull();
    expect(parseConsent('garbage')).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=`)).toBeNull();
  });

  it('treats the retired Terms+Cookies cookie as no answer', () => {
    expect(parseConsent(`${CONSENT_COOKIE}=2026-08-18`)).toBeNull();
  });

  it('never throws on malformed values', () => {
    expect(parseConsent(`${CONSENT_COOKIE}=%E0%A4%A`)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=${encodeURIComponent('null')}`)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=${encodeURIComponent('"x"')}`)).toBeNull();
    expect(parseConsent(jar({ revision: POLICY_REVISION }))).toBeNull();
    expect(parseConsent(jar({ revision: POLICY_REVISION, categories: 'analytics' }))).toBeNull();
  });

  it('asks again after a policy revision', () => {
    expect(
      parseConsent(jar({ categories: ['analytics'], revision: POLICY_REVISION - 1 })),
    ).toBeNull();
    expect(parseConsent(jar({ categories: ['analytics'] }))).toBeNull();
  });

  it('keeps only string categories', () => {
    expect(
      parseConsent(jar({ categories: ['necessary', 3, null], revision: POLICY_REVISION }))
        ?.categories,
    ).toEqual(['necessary']);
  });

  /* The retired banner's host-only cookie and the library's domain cookie
     coexist in a returning visitor's jar, the old one listed first: the
     answer is the first VALID record, wherever it sits. */
  it('reads the valid record past a retired duplicate', () => {
    expect(parseConsent(`${CONSENT_COOKIE}=2026-08-18; ${accepted}`)?.categories).toEqual([
      'necessary',
      'analytics',
    ]);
    expect(parseConsent(`a=b; ${CONSENT_COOKIE}=2026-08-18; ${rejected}`)?.categories).toEqual([
      'necessary',
    ]);
    expect(parseConsent(`${CONSENT_COOKIE}=2026-08-18; ${CONSENT_COOKIE}=`)).toBeNull();
  });

  it('never matches on name prefixes or suffixes', () => {
    expect(parseConsent(`x${accepted}`)).toBeNull();
    expect(parseConsent(accepted.replace('=', 'x='))).toBeNull();
  });
});

describe('measurementConsent', () => {
  it('grants only when Measurement was accepted', () => {
    expect(measurementConsent(accepted)).toBe('granted');
  });
  it('denies after Reject all or a choice without Measurement', () => {
    expect(measurementConsent(rejected)).toBe('denied');
  });
  it('stays unknown — counting nothing — until the visitor answers', () => {
    expect(measurementConsent('')).toBe('unknown');
    expect(measurementConsent(`${CONSENT_COOKIE}=2026-08-18`)).toBe('unknown');
  });
});

describe('measurementConsent with the retired cookie still in the jar', () => {
  it('follows the valid answer, not the retired one', () => {
    expect(measurementConsent(`${CONSENT_COOKIE}=2026-08-18; ${accepted}`)).toBe('granted');
    expect(measurementConsent(`${CONSENT_COOKIE}=2026-08-18; ${rejected}`)).toBe('denied');
  });
});

describe('hasLegacyConsent', () => {
  it('spots a consent cookie that is not the notice record', () => {
    expect(hasLegacyConsent(`${CONSENT_COOKIE}=2026-08-18`)).toBe(true);
    expect(hasLegacyConsent(`${CONSENT_COOKIE}=2026-08-18; ${accepted}`)).toBe(true);
    expect(hasLegacyConsent(`a=b; ${CONSENT_COOKIE}=%E0%A4%A`)).toBe(true);
    expect(hasLegacyConsent(`${CONSENT_COOKIE}=${encodeURIComponent('null')}`)).toBe(true);
    expect(hasLegacyConsent(`${CONSENT_COOKIE}=`)).toBe(true);
  });

  it('leaves the notice record alone, whatever its revision', () => {
    expect(hasLegacyConsent(accepted)).toBe(false);
    expect(hasLegacyConsent(`a=b; ${rejected}`)).toBe(false);
    expect(hasLegacyConsent(jar({ categories: ['analytics'], revision: 1 }))).toBe(false);
  });

  it('is false without a consent cookie', () => {
    expect(hasLegacyConsent(null)).toBe(false);
    expect(hasLegacyConsent(undefined)).toBe(false);
    expect(hasLegacyConsent('')).toBe(false);
    expect(hasLegacyConsent('numinia_session=abc; garbage')).toBe(false);
    expect(hasLegacyConsent(`x${CONSENT_COOKIE}=2026-08-18`)).toBe(false);
  });
});

describe('needsNotice', () => {
  it('shows the notice until there is an answer for this revision', () => {
    expect(needsNotice(undefined)).toBe(true);
    expect(needsNotice(rejected)).toBe(false);
    expect(needsNotice(accepted)).toBe(false);
  });
});

describe('constants', () => {
  it('keeps the policy facts: name, half a year, the analytics category', () => {
    expect(CONSENT_COOKIE).toBe('numinia_consent');
    expect(CONSENT_DAYS).toBe(182);
    expect(ANALYTICS_CATEGORY).toBe('analytics');
    expect(POLICY_REVISION).toBe(2);
  });
});
