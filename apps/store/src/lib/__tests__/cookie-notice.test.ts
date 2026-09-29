/**
 * The notice's configuration (LEG-003 §4): the non-negotiables of the
 * shared shape — revision, cookie, equal-weight buttons side by side,
 * Measurement off by default, never a word about accepting the Terms.
 */

import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@numinia/domain';
import { cookieNoticeConfig, noticeLocale } from '../cookie-notice';
import { COOKIE_NOTICE_UI } from '../../i18n/cookie-notice';

describe('cookieNoticeConfig', () => {
  const config = cookieNoticeConfig('en');

  it('records the choice in numinia_consent for half a year, Lax', () => {
    expect(config.revision).toBe(2);
    expect(config.cookie).toEqual({
      name: 'numinia_consent',
      expiresAfterDays: 182,
      sameSite: 'Lax',
    });
  });

  it('gives Accept all and Reject all equal weight, in a fixed order', () => {
    for (const modal of [config.guiOptions?.consentModal, config.guiOptions?.preferencesModal]) {
      expect(modal?.equalWeightButtons).toBe(true);
      expect(modal?.flipButtons).toBe(false);
    }
  });

  it('keeps necessary read-only and Measurement off until accepted', () => {
    expect(config.categories['necessary']).toEqual({ enabled: true, readOnly: true });
    expect(config.categories['analytics']).toEqual({ enabled: false, readOnly: false });
  });

  it('keeps hideFromBots at the library default (true)', () => {
    expect('hideFromBots' in config).toBe(false);
  });

  it.each(SUPPORTED_LOCALES)('speaks %s and links that locale’s legal pages', (locale) => {
    const localized = cookieNoticeConfig(locale);
    const prefix = locale === 'en' ? '' : `/${locale}`;
    expect(localized.language.default).toBe(locale);
    const translation = localized.language.translations[locale];
    expect(typeof translation).toBe('object');
    const text = JSON.stringify(translation);
    expect(text).toContain(`href=\\"${prefix}/legal/cookies/\\"`);
    expect(text).toContain(`href=\\"${prefix}/legal/legal-notice/\\"`);
    expect(text).toContain(`href=\\"${prefix}/legal/privacy/\\"`);
    // The Terms are accepted at sign-in, never from this notice.
    expect(text).not.toMatch(/terms|términos|termos|利用規約|이용약관/i);
  });
});

describe('noticeLocale', () => {
  it('follows the page language and falls back to English', () => {
    expect(noticeLocale('es')).toBe('es');
    expect(noticeLocale('pt-BR')).toBe('pt-br');
    expect(noticeLocale('fr')).toBe('en');
    expect(noticeLocale('')).toBe('en');
    expect(noticeLocale(null)).toBe('en');
    expect(noticeLocale(undefined)).toBe('en');
  });
});

describe('COOKIE_NOTICE_UI', () => {
  it('covers every UI language', () => {
    expect(Object.keys(COOKIE_NOTICE_UI).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });
});
