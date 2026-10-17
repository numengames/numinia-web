/**
 * The footer's epitaph bubble floats fixed in the window, right-aligned on
 * its skull, above it.
 */

import { describe, expect, it } from 'vitest';
import { placeEpitaph } from '../epitaph-tip';

describe('placeEpitaph', () => {
  const viewport = { width: 1440, height: 900 };

  it('right-aligned on the skull, above it', () => {
    const skull = { top: 500, bottom: 532, left: 596, right: 628 };
    expect(placeEpitaph(skull, { width: 224, height: 164 }, viewport)).toEqual({
      top: 328,
      left: 404,
    });
  });

  it('never past the left edge of the window (the folded rail is narrower than the bubble)', () => {
    // A 72px-wide folded rail: the skull sits far left, the 224px bubble
    // would overhang past x=0 if simply right-aligned on it.
    const skull = { top: 844, bottom: 876, left: 20, right: 52 };
    expect(placeEpitaph(skull, { width: 224, height: 164 }, viewport)).toEqual({
      top: 672,
      left: 8,
    });
  });

  it('never past the top of the window when the skull sits near it', () => {
    const skull = { top: 4, bottom: 36, left: 596, right: 628 };
    expect(placeEpitaph(skull, { width: 224, height: 164 }, viewport)).toEqual({
      top: 8,
      left: 404,
    });
  });

  it('never past the right edge of the window', () => {
    const skull = { top: 844, bottom: 876, left: 1600, right: 1632 };
    expect(placeEpitaph(skull, { width: 224, height: 164 }, viewport)).toEqual({
      top: 672,
      left: 1208,
    });
  });
});
