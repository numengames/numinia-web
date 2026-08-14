/**
 * Page metrics bootstrap — one delegated listener for every data-metric
 * element plus an automatic page_view (funnel foundation, ADR-016).
 *
 * Phase 0 posture: memory transport + granted consent. Nothing leaves the
 * device — there is no backend and no deploy. Before ANY public deploy this
 * must switch to a consent banner + the chosen transport (open-questions D12).
 */

import {
  bindMetricClicks,
  createAnalytics,
  createConsent,
  memoryTransport,
  trackPageView,
  type AnalyticsContext,
} from '@numinia/analytics';

const transport = memoryTransport();
const analytics = createAnalytics({ transport, consent: createConsent('granted') });

const lang = document.documentElement.lang;
const context: AnalyticsContext = {
  path: window.location.pathname,
  now: () => Date.now(),
  ...(lang ? { locale: lang } : {}),
};

trackPageView(analytics, context, document.referrer);
bindMetricClicks(document, analytics, context);
window.addEventListener('pagehide', () => analytics.flush());
