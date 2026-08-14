import { describe, expect, it } from 'vitest';
import { createAnalytics } from '../src/emitter.js';
import { createConsent } from '../src/consent.js';
import { beaconTransport, memoryTransport, noopTransport } from '../src/transports.js';
import { ANALYTICS_EVENT_NAMES, buildEvent } from '../src/events.js';

const ctx = { path: '/es/archive', locale: 'es', now: () => 1_755_000_000_000 };

describe('event taxonomy (funnel backbone)', () => {
  it('exposes the frozen event catalog', () => {
    expect(ANALYTICS_EVENT_NAMES).toEqual([
      'page_view',
      'cta_click',
      'download_click',
      'wallet_connect_start',
      'wallet_connect_success',
      'session_zero_start',
      'seal_earned',
    ]);
  });

  it('builds a valid enveloped event', () => {
    const event = buildEvent('cta_click', ctx, { metricId: 'hero-download' });
    expect(event).toEqual({
      name: 'cta_click',
      path: '/es/archive',
      locale: 'es',
      ts: 1_755_000_000_000,
      props: { metricId: 'hero-download' },
    });
  });

  it('omits locale from the envelope when the context has none', () => {
    const event = buildEvent('page_view', { path: '/', now: () => 5 }, {});
    expect(event).toEqual({ name: 'page_view', path: '/', ts: 5, props: {} });
    expect('locale' in event).toBe(false);
  });

  it('rejects unknown event names', () => {
    expect(() => buildEvent('made_up' as never, ctx, {} as never)).toThrowError(
      /unknown analytics event/i,
    );
  });

  it('rejects malformed props for a known event', () => {
    expect(() => buildEvent('download_click', ctx, { assetId: 'a1' } as never)).toThrowError();
    expect(() => buildEvent('cta_click', ctx, { metricId: '' } as never)).toThrowError();
  });

  it('rejects an empty optional prop', () => {
    expect(() => buildEvent('page_view', ctx, { referrerHost: '' } as never)).toThrowError(
      /non-empty string/,
    );
  });

  it('strips unexpected props — nothing undeclared travels (privacy by design)', () => {
    expect(() =>
      buildEvent('wallet_connect_success', ctx, { address: '0xabc' } as never),
    ).toThrowError();
  });
});

describe('consent gating (GDPR: drop, never buffer, before consent)', () => {
  it('starts unknown and drops events', () => {
    const transport = memoryTransport();
    const consent = createConsent();
    const analytics = createAnalytics({ transport, consent });
    const result = analytics.track('page_view', ctx, {});
    expect(result).toEqual({ accepted: false, reason: 'consent' });
    expect(transport.events).toHaveLength(0);
  });

  it('accepts after grant, drops again after deny', () => {
    const transport = memoryTransport();
    const consent = createConsent();
    const analytics = createAnalytics({ transport, consent });

    consent.set('granted');
    expect(analytics.track('page_view', ctx, {}).accepted).toBe(true);
    expect(transport.events).toHaveLength(1);

    consent.set('denied');
    expect(analytics.track('page_view', ctx, {}).accepted).toBe(false);
    expect(transport.events).toHaveLength(1);
  });
});

describe('emitter robustness (analytics must never break the app)', () => {
  it('returns invalid instead of throwing on bad input', () => {
    const analytics = createAnalytics({
      transport: memoryTransport(),
      consent: createConsent('granted'),
    });
    const result = analytics.track('download_click', ctx, {} as never);
    expect(result.accepted).toBe(false);
    expect(result.accepted === false && result.reason).toBe('invalid');
  });

  it('survives a transport that throws', () => {
    const consent = createConsent('granted');
    const analytics = createAnalytics({
      transport: {
        send: () => {
          throw new Error('network down');
        },
        flush: () => {
          throw new Error('network down');
        },
      },
      consent,
    });
    expect(analytics.track('page_view', ctx, {}).accepted === false).toBe(true);
    expect(() => analytics.flush()).not.toThrow();
  });
});

describe('transports', () => {
  it('memory transport records and clears on flush', () => {
    const transport = memoryTransport();
    transport.send(buildEvent('page_view', ctx, {}));
    expect(transport.events).toHaveLength(1);
    transport.flush();
    expect(transport.events).toHaveLength(0);
  });

  it('noop transport swallows everything', () => {
    expect(() => {
      noopTransport.send(buildEvent('page_view', ctx, {}));
      noopTransport.flush();
    }).not.toThrow();
  });

  it('beacon transport batches and flushes through the injected sender', () => {
    const sent: { url: string; payload: string }[] = [];
    const transport = beaconTransport('/metrics', (url, payload) => {
      sent.push({ url, payload });
      return true;
    });
    transport.send(buildEvent('page_view', ctx, {}));
    transport.send(buildEvent('cta_click', ctx, { metricId: 'x' }));
    expect(sent).toHaveLength(0);
    transport.flush();
    expect(sent).toHaveLength(1);
    const batch = JSON.parse(sent[0]?.payload ?? '[]');
    expect(batch).toHaveLength(2);
    transport.flush();
    expect(sent).toHaveLength(1);
  });

  it('beacon transport auto-flushes at the batch limit', () => {
    const sent: string[] = [];
    const transport = beaconTransport(
      '/metrics',
      (_url, payload) => {
        sent.push(payload);
        return true;
      },
      { maxBatch: 2 },
    );
    transport.send(buildEvent('page_view', ctx, {}));
    transport.send(buildEvent('page_view', ctx, {}));
    expect(sent).toHaveLength(1);
  });
});
