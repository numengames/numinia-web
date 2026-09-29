/**
 * Cookie notice bootstrap (LEG-003 §4) — tiny on purpose: it rides in the
 * one inline module every page ships (BaseLayout, the Codex included), so
 * Layer 0 pages still reference no external JS in their HTML. The notice
 * itself (vanilla-cookieconsent + its stylesheet) is a separate classic
 * script, injected only when needed: on a visit that has not answered the
 * current notice, or when the visitor presses a "Change my cookie choice"
 * button (`[data-cookie-choice]`, in the footer and at the foot of the
 * Codex). A returning visitor who already answered downloads nothing.
 *
 * Bots get nothing either: the same test the library applies with its
 * default `hideFromBots: true` (user agent or navigator.webdriver), run
 * before the download instead of after it. Playwright checks set
 * `webdriver` to false with an init script to see the notice.
 */

// `?worker&url` only borrows Vite's standalone-bundle mode: the file is a
// self-contained classic script (no imports), loaded on the main thread.
import noticeUrl from './cookie-notice-run?worker&url';
import { needsNotice } from '../lib/consent';

declare global {
  interface Window {
    numiniaCookieNotice?: { preferences(): void };
    numiniaCookieNoticeWantsPreferences?: boolean;
  }
}

const isBot = (): boolean =>
  /bot|crawl|spider|slurp|teoma/i.test(navigator.userAgent) || navigator.webdriver;

let injected = false;

function open(preferences: boolean): void {
  if (window.numiniaCookieNotice) {
    if (preferences) window.numiniaCookieNotice.preferences();
    return;
  }
  if (preferences) window.numiniaCookieNoticeWantsPreferences = true;
  if (injected) return;
  injected = true;
  const script = document.createElement('script');
  script.src = noticeUrl;
  script.async = true;
  document.head.append(script);
}

if (needsNotice(document.cookie) && !isBot()) open(false);

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('[data-cookie-choice]')) open(true);
});
