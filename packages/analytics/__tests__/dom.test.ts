import { describe, expect, it } from 'vitest';
import { bindMetricClicks, referrerHost, trackPageView } from '../src/dom.js';
import { createAnalytics } from '../src/emitter.js';
import { createConsent } from '../src/consent.js';
import { memoryTransport } from '../src/transports.js';

function makeAnalytics() {
  const transport = memoryTransport();
  const analytics = createAnalytics({ transport, consent: createConsent('granted') });
  return { transport, analytics };
}

const ctx = { path: '/', locale: 'en', now: () => 1 };

describe('bindMetricClicks (one delegated listener, zero JS per button)', () => {
  function fakeRoot() {
    let handler: ((event: { target: unknown }) => void) | null = null;
    return {
      addEventListener: (_type: 'click', cb: (event: { target: unknown }) => void) => {
        handler = cb;
      },
      click: (target: unknown) => handler?.({ target }),
    };
  }

  function elementWithMetric(metricId: string | null) {
    const element = {
      closest: (_selector: string) => (metricId === null ? null : element),
      getAttribute: (_name: string) => metricId,
    };
    return element;
  }

  it('emits cta_click with the data-metric id', () => {
    const { transport, analytics } = makeAnalytics();
    const root = fakeRoot();
    bindMetricClicks(root, analytics, ctx);
    root.click(elementWithMetric('spike-enter'));
    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]?.props).toEqual({ metricId: 'spike-enter' });
  });

  it('ignores clicks outside data-metric elements', () => {
    const { transport, analytics } = makeAnalytics();
    const root = fakeRoot();
    bindMetricClicks(root, analytics, ctx);
    root.click(elementWithMetric(null));
    root.click(null);
    root.click({});
    expect(transport.events).toHaveLength(0);
  });
});

describe('trackPageView', () => {
  it('emits page_view with the referrer host only (no full URLs)', () => {
    const { transport, analytics } = makeAnalytics();
    trackPageView(analytics, ctx, 'https://search.example.com/results?q=numinia+cc0');
    expect(transport.events[0]?.name).toBe('page_view');
    expect(transport.events[0]?.props).toEqual({ referrerHost: 'search.example.com' });
  });

  it('omits the referrer when absent or unparsable', () => {
    const { transport, analytics } = makeAnalytics();
    trackPageView(analytics, ctx, '');
    trackPageView(analytics, ctx, 'not a url');
    expect(transport.events).toHaveLength(2);
    expect(transport.events[0]?.props).toEqual({});
    expect(transport.events[1]?.props).toEqual({});
  });

  it('referrerHost is null for garbage', () => {
    expect(referrerHost('::::')).toBeNull();
    expect(referrerHost('https://a.example.org/x')).toBe('a.example.org');
  });
});
