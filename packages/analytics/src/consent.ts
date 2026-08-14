/**
 * Consent state — GDPR posture: events are DROPPED (never buffered) unless
 * consent is granted. There is no pre-consent queue by design.
 */

export type ConsentState = 'unknown' | 'granted' | 'denied';

export interface ConsentStore {
  get(): ConsentState;
  set(state: ConsentState): void;
}

export function createConsent(initial: ConsentState = 'unknown'): ConsentStore {
  let state = initial;
  return {
    get: () => state,
    set: (next) => {
      state = next;
    },
  };
}
