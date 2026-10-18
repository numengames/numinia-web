/**
 * «Poder y saldo» (MVL-B): the rule itself, so the Worlds wizard and any
 * later flow that reuses it (Numen Games) agree on the same boundary.
 */

import { describe, expect, it } from 'vitest';
import { hasBalanceToPowerOn } from '../world-power';

describe('hasBalanceToPowerOn', () => {
  it('blocks a world starting on when the balance is zero or negative', () => {
    expect(hasBalanceToPowerOn(0)).toBe(false);
    expect(hasBalanceToPowerOn(-1)).toBe(false);
  });

  it('allows it as soon as there is any positive balance', () => {
    expect(hasBalanceToPowerOn(1)).toBe(true);
    expect(hasBalanceToPowerOn(500_00)).toBe(true);
  });
});
