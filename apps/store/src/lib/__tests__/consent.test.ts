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
