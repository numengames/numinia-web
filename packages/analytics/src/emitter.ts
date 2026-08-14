/**
 * Emitter — validates, gates on consent, and hands events to the transport.
 * Analytics must NEVER break the app: `track` reports failures as values and
 * swallows transport errors.
 */

import {
  buildEvent,
  type AnalyticsContext,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from './events.js';
import type { ConsentStore } from './consent.js';
import type { AnalyticsTransport } from './transports.js';

export type TrackResult =
  { accepted: true } | { accepted: false; reason: 'consent' | 'invalid' | 'transport' };

export interface Analytics {
  track<Name extends AnalyticsEventName>(
    name: Name,
    context: AnalyticsContext,
    props: AnalyticsEventProps<Name>,
  ): TrackResult;
  flush(): void;
}

export interface AnalyticsOptions {
  readonly transport: AnalyticsTransport;
  readonly consent: ConsentStore;
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  const { transport, consent } = options;
  return {
    track(name, context, props) {
      if (consent.get() !== 'granted') {
        return { accepted: false, reason: 'consent' };
      }
      let event;
      try {
        event = buildEvent(name, context, props);
      } catch {
        return { accepted: false, reason: 'invalid' };
      }
      try {
        transport.send(event);
      } catch {
        return { accepted: false, reason: 'transport' };
      }
      return { accepted: true };
    },
    flush() {
      try {
        transport.flush();
      } catch {
        // Losing a batch is acceptable; breaking the page is not.
      }
    },
  };
}
