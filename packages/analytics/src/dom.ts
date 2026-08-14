/**
 * DOM wiring — one delegated click listener for the whole page.
 *
 * Convention (ADR-016): every interactive element carries `data-metric="<id>"`.
 * Buttons ship zero extra JavaScript; the single listener reads the attribute
 * and emits `cta_click`. Structural typing keeps this package DOM-lib-free
 * and the binding testable without jsdom.
 */

import type { Analytics } from './emitter.js';
import type { AnalyticsContext } from './events.js';

interface MetricElementLike {
  closest(selector: string): MetricElementLike | null;
  getAttribute(name: string): string | null;
}

interface ClickEventLike {
  readonly target: unknown;
}

interface RootLike {
  addEventListener(type: 'click', listener: (event: ClickEventLike) => void): void;
}

function isMetricElement(value: unknown): value is MetricElementLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'closest' in value &&
    typeof (value as MetricElementLike).closest === 'function'
  );
}

export function bindMetricClicks(
  root: RootLike,
  analytics: Analytics,
  context: AnalyticsContext,
): void {
  root.addEventListener('click', (event) => {
    if (!isMetricElement(event.target)) return;
    const element = event.target.closest('[data-metric]');
    const metricId = element?.getAttribute('data-metric');
    if (!metricId) return;
    analytics.track('cta_click', context, { metricId });
  });
}

/** Reduce a referrer URL to its host — full URLs never travel. */
export function referrerHost(referrer: string): string | null {
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

export function trackPageView(
  analytics: Analytics,
  context: AnalyticsContext,
  referrer: string,
): void {
  const host = referrer ? referrerHost(referrer) : null;
  analytics.track('page_view', context, host === null ? {} : { referrerHost: host });
}
