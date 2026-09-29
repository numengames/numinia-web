/**
 * The cookie notice (LEG-003 §4), shared shape across the four sites of
 * Numen Games; only the SITE block differs. Library: vanilla-cookieconsent
 * (MIT, orestbida/cookieconsent) — Accept all and Reject all side by side,
 * equal weight, as the AEPD cookie guide asks; browsing accepts nothing.
 *
 * This module only BUILDS the configuration (pure, unit-tested); the
 * library itself is loaded by src/scripts/cookie-notice-run.ts, and only
 * when it is needed: on a visit without an answer, or when the visitor
 * presses "Change my cookie choice".
 *
 * numinia.com has ONE optional category, `analytics` ("Measurement"): the
 * click counting of scripts/metrics.ts, kept in memory on the device. It is
 * off until the visitor accepts it. What the site stores is listed in
 * LEG-003 §3.1 and mirrored in STORED_KEYS (lib/consent.ts).
 */

import type { CookieConsentConfig } from 'vanilla-cookieconsent';
// Type-only: the domain package's runtime (zod) must not ride into the
// notice's standalone bundle.
import type { SupportedLocale } from '@numinia/domain';
import { COOKIE_NOTICE_UI } from '../i18n/cookie-notice';
import { ANALYTICS_CATEGORY, CONSENT_COOKIE, CONSENT_DAYS, POLICY_REVISION } from './consent';

/** English: the unprefixed default locale. */
const DEFAULT_LOCALE: SupportedLocale = 'en';

/** The UI language of a page's `<html lang>`, falling back to English. */
export function noticeLocale(lang: string | null | undefined): SupportedLocale {
  const known = Object.keys(COOKIE_NOTICE_UI) as SupportedLocale[];
  return known.find((locale) => locale === lang?.toLowerCase()) ?? DEFAULT_LOCALE;
}

/** The path prefix of a locale's pages: none for English. */
function prefixOf(locale: SupportedLocale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

export function cookieNoticeConfig(locale: SupportedLocale): CookieConsentConfig {
  const t = COOKIE_NOTICE_UI[locale];
  const prefix = prefixOf(locale);
  const SITE = {
    policyHref: `${prefix}/legal/cookies/`,
    noticeHref: `${prefix}/legal/legal-notice/`,
    privacyHref: `${prefix}/legal/privacy/`,
  };
  return {
    revision: POLICY_REVISION,
    cookie: { name: CONSENT_COOKIE, expiresAfterDays: CONSENT_DAYS, sameSite: 'Lax' },
    guiOptions: {
      consentModal: {
        layout: 'box',
        position: 'bottom right',
        equalWeightButtons: true,
        flipButtons: false,
      },
      preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      [ANALYTICS_CATEGORY]: { enabled: false, readOnly: false },
    },
    language: {
      default: locale,
      translations: {
        [locale]: {
          consentModal: {
            title: t.title,
            description: `${t.description} <a href="${SITE.policyHref}">${t.policyLink}</a>`,
            acceptAllBtn: t.acceptAll,
            acceptNecessaryBtn: t.rejectAll,
            showPreferencesBtn: t.preferences,
            footer: `<a href="${SITE.noticeHref}">${t.noticeLink}</a><a href="${SITE.privacyHref}">${t.privacyLink}</a>`,
          },
          preferencesModal: {
            title: t.preferencesTitle,
            acceptAllBtn: t.acceptAll,
            acceptNecessaryBtn: t.rejectAll,
            savePreferencesBtn: t.save,
            closeIconLabel: t.close,
            sections: [
              { title: t.neededTitle, description: t.neededText, linkedCategory: 'necessary' },
              {
                title: t.measurementTitle,
                description: t.measurementText,
                linkedCategory: ANALYTICS_CATEGORY,
              },
              {
                title: t.moreTitle,
                description: `${t.moreText} <a href="${SITE.policyHref}">${t.policyLink}</a>.`,
              },
            ],
          },
        },
      },
    },
  };
}
