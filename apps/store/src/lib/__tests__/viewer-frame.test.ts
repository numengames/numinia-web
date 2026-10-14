/**
 * The 3D viewer's framing (v0.89.0): the camera sees the whole model and its
 * clipping planes bracket it at any size — the regression behind «the GLB
 * shows nothing» (a fixed far plane of 100 against 150–450-unit scenes).
 */

import { describe, expect, it } from 'vitest';
import { clipPlanes, frameSphere, loadedShare } from '../viewer-frame';

/** The closest and farthest a point of the sphere can come to the camera. */
function reach(radius: number, fov: number) {
  const frame = frameSphere(radius, fov);
  const distance = Math.hypot(frame.y, frame.z);
  return { frame, closest: distance - radius, farthest: distance + radius, distance };
}

describe('frameSphere', () => {
  it('keeps the measured live scenes inside the clipping planes', () => {
    // Bounding-sphere radii of the live GLBs that drew nothing (half their
    // diagonals: portfolio 149, Nerdearla 231, Symposyum Space 453 units),
    // and of a chair-sized model.
    for (const radius of [74.65, 115.41, 226.59, 0.6]) {
      const { frame, closest, farthest } = reach(radius, 30);
      expect(frame.near).toBeGreaterThan(0);
      expect(frame.near).toBeLessThan(closest);
      expect(frame.far).toBeGreaterThan(farthest);
    }
  });

  it('fits the whole sphere in the field of view', () => {
    const { distance } = reach(10, 30);
    // The sphere's apparent half-angle equals half the field of view.
    expect(Math.asin(10 / distance)).toBeCloseTo((15 * Math.PI) / 180, 10);
  });

  it('looks from slightly above, by the elevation asked for', () => {
    const frame = frameSphere(5, 30, 12);
    expect(Math.atan2(frame.y, frame.z)).toBeCloseTo((12 * Math.PI) / 180, 10);
    const level = frameSphere(5, 30, 0);
    expect(level.y).toBe(0);
  });

  it('frames a unit sphere when the model measures nothing usable', () => {
    const unit = frameSphere(1, 30);
    for (const radius of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(frameSphere(radius, 30)).toEqual(unit);
    }
  });
});

describe('clipPlanes', () => {
  it('brackets a model seen from a fixed distance', () => {
    const planes = clipPlanes(0.9, 3.2);
    expect(planes.near).toBeCloseTo(1.15, 10);
    expect(planes.far).toBeCloseTo(8.2, 10);
  });

  it('never lets the near plane reach zero, even inside the model', () => {
    expect(clipPlanes(2, 1).near).toBeCloseTo(0.002, 10);
    expect(clipPlanes(Number.NaN, 0.5).near).toBeCloseTo(0.001, 10);
  });
});

describe('loadedShare', () => {
  it('reads the response length when it states one', () => {
    expect(loadedShare(25, 100, 999)).toBe(25);
  });

  it('falls back to the catalogue size, then to nothing', () => {
    expect(loadedShare(31_502_778, 0, 63_005_556)).toBe(50);
    expect(loadedShare(10, 0, null)).toBeNull();
    expect(loadedShare(10, 0, 0)).toBeNull();
  });

  it('stops at 99: the last step is drawing, not loading', () => {
    expect(loadedShare(100, 100, null)).toBe(99);
    expect(loadedShare(150, 100, null)).toBe(99);
  });

  it('says nothing for an impossible count', () => {
    expect(loadedShare(-1, 100, null)).toBeNull();
    expect(loadedShare(Number.NaN, 100, null)).toBeNull();
  });
});
