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
  // Strict fakes: they verify the exact event type, selector and attribute
  // name — a drifted string literal in the implementation must fail here.
  function fakeRoot() {
    let handler: ((event: { target: unknown }) => void) | null = null;
    return {
      addEventListener: (type: 'click', cb: (event: { target: unknown }) => void) => {
        if ((type as string) !== 'click') throw new Error(`unexpected event type "${type}"`);
        handler = cb;
      },
      click: (target: unknown) => handler?.({ target }),
    };
  }

  function elementWithMetric(metricId: string | null) {
    const element = {
      closest: (selector: string) => {
        if (selector !== '[data-metric]') throw new Error(`unexpected selector "${selector}"`);
        return metricId === null ? null : element;
      },
      getAttribute: (name: string) => {
        if (name !== 'data-metric') throw new Error(`unexpected attribute "${name}"`);
        return metricId;
      },
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

  it('never calls track for hostile or empty targets (guard clauses hold)', () => {
    const calls: unknown[] = [];
    const spy = {
      track: (...args: unknown[]) => {
        calls.push(args);
        return { accepted: true as const };
      },
      flush: () => undefined,
    };
    const root = fakeRoot();
    bindMetricClicks(root, spy, ctx);
    root.click('a primitive string'); // typeof guard: 'in' on a primitive would throw
    root.click({ closest: 'not-a-function' }); // closest-type guard
    root.click(elementWithMetric('')); // empty metric id must not reach track
    expect(calls).toHaveLength(0);
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
