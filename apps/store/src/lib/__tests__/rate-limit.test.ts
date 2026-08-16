/**
 * The doorman (MISSION-026): N requests pass, N+1 waits, the window heals,
 * keys never bleed into each other, and the map cannot grow unbounded.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { checkRate, resetRateLimitsForTests } from '../rate-limit';

beforeEach(() => resetRateLimitsForTests());

describe('checkRate', () => {
  it('allows up to the limit and throttles the next with a Retry-After', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(checkRate('k', 5, 60_000, 1_000).allowed).toBe(true);
    }
    const verdict = checkRate('k', 5, 60_000, 31_000);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterS).toBe(30);
  });

  it('heals when the window expires', () => {
    for (let i = 0; i < 6; i += 1) checkRate('k', 5, 60_000, 1_000);
    expect(checkRate('k', 5, 60_000, 61_001).allowed).toBe(true);
  });

  it('keys are independent', () => {
    for (let i = 0; i < 6; i += 1) checkRate('a', 5, 60_000, 1_000);
    expect(checkRate('b', 5, 60_000, 1_000).allowed).toBe(true);
  });

  it('uses the wall clock when no time is injected', () => {
    expect(checkRate('wall-clock', 5, 60_000).allowed).toBe(true);
  });

  it('the prune spares windows that are still alive', () => {
    for (let i = 0; i < 999; i += 1) checkRate(`old-${i}`, 5, 1_000, 0);
    for (let i = 0; i < 6; i += 1) checkRate('alive', 5, 60_000, 500);
    // Trigger the prune at now=2000: the expired 999 go, 'alive' survives
    // with its count intact — the very next call is still throttled.
    checkRate('trigger', 5, 60_000, 2_000);
    expect(checkRate('alive', 5, 60_000, 2_100).allowed).toBe(false);
  });

  it('prunes expired windows once the map grows large', () => {
    for (let i = 0; i < 1000; i += 1) checkRate(`old-${i}`, 5, 1_000, 0);
    // All 1000 windows expired by now=2000; the next call prunes them.
    checkRate('fresh', 5, 60_000, 2_000);
    for (let i = 0; i < 3; i += 1) {
      expect(checkRate(`old-${i}`, 5, 1_000, 2_500).allowed).toBe(true);
    }
  });
});
