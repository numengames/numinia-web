/**
 * The cookie notice itself: vanilla-cookieconsent with the configuration
 * built (and unit-tested) in lib/cookie-notice.ts. Bundled standalone and
 * injected on demand by scripts/cookie-notice.ts — never on a page whose
 * visitor already answered, unless they ask to change their choice.
 *
 * `hideFromBots` stays at the library default (true).
 */

import * as CookieConsent from 'vanilla-cookieconsent';
import stylesheet from 'vanilla-cookieconsent/dist/cookieconsent.css?url';
import { cookieNoticeConfig, noticeLocale } from '../lib/cookie-notice';

function linkStylesheet(): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.onload = link.onerror = () => resolve();
    document.head.append(link);
  });
}

const running = linkStylesheet().then(() =>
  CookieConsent.run(cookieNoticeConfig(noticeLocale(document.documentElement.lang))),
);

window.numiniaCookieNotice = {
  preferences: () => void running.then(() => CookieConsent.showPreferences()),
};
if (window.numiniaCookieNoticeWantsPreferences) window.numiniaCookieNotice.preferences();
