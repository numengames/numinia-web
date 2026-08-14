/**
 * Transports — where validated events go. Pluggable so the backend decision
 * (open-questions D12) never touches call sites.
 */

import type { AnalyticsEvent } from './events.js';

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): void;
  flush(): void;
}

export interface MemoryTransport extends AnalyticsTransport {
  readonly events: readonly AnalyticsEvent[];
}

/** Default until a backend exists: events stay on the device, readable in tests. */
export function memoryTransport(): MemoryTransport {
  const buffer: AnalyticsEvent[] = [];
  return {
    get events(): readonly AnalyticsEvent[] {
      return buffer;
    },
    send: (event) => {
      buffer.push(event);
    },
    flush: () => {
      buffer.length = 0;
    },
  };
}

export const noopTransport: AnalyticsTransport = {
  send: () => undefined,
  flush: () => undefined,
};

type BeaconSender = (url: string, payload: string) => boolean;

/**
 * Batching transport over `navigator.sendBeacon` (injected for testability).
 * Auto-flushes at `maxBatch`; call `flush()` on pagehide.
 */
export function beaconTransport(
  url: string,
  sender: BeaconSender,
  options?: { maxBatch?: number },
): AnalyticsTransport {
  const maxBatch = options?.maxBatch ?? 20;
  let batch: AnalyticsEvent[] = [];
  const flush = (): void => {
    if (batch.length === 0) return;
    const payload = JSON.stringify(batch);
    batch = [];
    sender(url, payload);
  };
  return {
    send: (event) => {
      batch.push(event);
      if (batch.length >= maxBatch) flush();
    },
    flush,
  };
}
