/**
 * Page metrics bootstrap — one delegated listener for every data-metric
 * element plus an automatic page_view.
 *
 * Consent comes from the cookie notice (LEG-003 §3.1 "Measurement"):
 * granted ONLY when the `analytics` category is accepted in the notice's
 * cookie for the current policy revision; `denied` after a rejection;
 * `unknown` until the visitor answers. The notice announces every answer
 * and every change with `cc:onConsent` / `cc:onChange` on window, and the
 * state follows it both ways. Pre-consent events are DROPPED, never
 * buffered (@numinia/analytics design). Transport stays memory — nothing
 * leaves the device.
 */

import {
  bindMetricClicks,
  createAnalytics,
  createConsent,
  memoryTransport,
  trackPageView,
  type AnalyticsContext,
} from '@numinia/analytics';
import { measurementConsent } from '../lib/consent';

const transport = memoryTransport();
const consent = createConsent(measurementConsent(document.cookie));
const follow = (): void => consent.set(measurementConsent(document.cookie));
window.addEventListener('cc:onConsent', follow);
window.addEventListener('cc:onChange', follow);
const analytics = createAnalytics({ transport, consent });

const lang = document.documentElement.lang;
const context: AnalyticsContext = {
  path: window.location.pathname,
  now: () => Date.now(),
  ...(lang ? { locale: lang } : {}),
};

trackPageView(analytics, context, document.referrer);
bindMetricClicks(document, analytics, context);
window.addEventListener('pagehide', () => analytics.flush());
