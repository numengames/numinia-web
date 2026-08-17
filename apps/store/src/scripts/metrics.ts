/**
 * Page metrics bootstrap — one delegated listener for every data-metric
 * element plus an automatic page_view (funnel foundation, ADR-016).
 *
 * Consent now comes from the combined Terms+Cookies banner (D12 slice 1):
 * granted only when the versioned acceptance cookie is present, or the
 * moment the visitor accepts (the banner dispatches the event below).
 * Pre-consent events are DROPPED, never buffered (@numinia/analytics
 * design). Transport stays memory — nothing leaves the device; the
 * transport decision is the remaining half of D12.
 */

import {
  bindMetricClicks,
  createAnalytics,
  createConsent,
  memoryTransport,
  trackPageView,
  type AnalyticsContext,
} from '@numinia/analytics';
import { parseConsent } from '../lib/consent';

const transport = memoryTransport();
const consent = createConsent(parseConsent(document.cookie) ? 'granted' : 'unknown');
document.addEventListener('numinia:consent-granted', () => consent.set('granted'));
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
