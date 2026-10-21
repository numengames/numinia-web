/**
 * The house's generated cover: same id, same scene; every kind and hue is
 * reachable; the numbers stay on the canvas; a world and a place differ.
 */

import { describe, expect, it } from 'vitest';
import {
  COVER_HEIGHT,
  COVER_HUES,
  COVER_KINDS,
  COVER_WIDTH,
  coverScene,
  hashOf,
  seeded,
  type CoverFamily,
  type CoverKind,
} from '../cover-art';

const ids = Array.from({ length: 400 }, (_, i) => `community-${i}`);

/** The first id whose scene is of the given kind. */
function idOfKind(kind: CoverKind, family: CoverFamily = 'place'): string {
  const found = ids.find((id) => coverScene(id, family).kind === kind);
  if (found === undefined) throw new Error(`no ${family} id draws ${kind}`);
  return found;
}

describe('hashOf and seeded', () => {
  it('hash is stable and tells texts apart', () => {
    expect(hashOf('trgcon')).toBe(hashOf('trgcon'));
    expect(hashOf('trgcon')).not.toBe(hashOf('merge'));
  });

  it('the generator repeats for a seed and stays in [0, 1)', () => {
    const a = seeded(7);
    const b = seeded(7);
    const first = Array.from({ length: 50 }, () => a());
    expect(first).toEqual(Array.from({ length: 50 }, () => b()));
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
  });
});

describe('coverScene', () => {
  it('is the same picture for the same id, a different one for another', () => {
    expect(coverScene('trgcon')).toEqual(coverScene('trgcon'));
    expect(coverScene('trgcon')).not.toEqual(coverScene('merge'));
  });

  it('every hue and every kind is reachable', () => {
    const scenes = ids.map((id) => coverScene(id));
    const worlds = ids.map((id) => coverScene(id, 'world'));
    for (const hue of COVER_HUES)
      expect(
        scenes.some((scene) => scene.hue === hue),
        hue,
      ).toBe(true);
    for (const kind of COVER_KINDS) {
      expect(
        [...scenes, ...worlds].some((scene) => scene.kind === kind),
        kind,
      ).toBe(true);
    }
  });

  it('a place never draws a planet; a world often does', () => {
    expect(ids.some((id) => coverScene(id).kind === 'orbits')).toBe(false);
    const worldKinds = new Set(ids.map((id) => coverScene(id, 'world').kind));
    expect(worldKinds.has('orbits')).toBe(true);
    expect(worldKinds.has('skyline')).toBe(false);
  });

  it('a world and a community of the same id are not the same picture', () => {
    expect(coverScene('agora', 'world')).not.toEqual(coverScene('agora', 'place'));
  });

  it('keeps every star, the sun and the layers on the canvas', () => {
    for (const id of ids.slice(0, 80)) {
      for (const family of ['place', 'world'] as const) {
        const scene = coverScene(id, family);
        expect(scene.sun.cx).toBeGreaterThanOrEqual(0);
        expect(scene.sun.cx).toBeLessThanOrEqual(COVER_WIDTH);
        expect(scene.sun.cy).toBeLessThan(COVER_HEIGHT);
        expect(scene.stars.length).toBeGreaterThanOrEqual(16);
        for (const star of scene.stars) {
          expect(star.x).toBeLessThanOrEqual(COVER_WIDTH);
          expect(star.y).toBeLessThan(COVER_HEIGHT);
        }
        expect(scene.layers.length).toBeGreaterThan(0);
        for (const layer of scene.layers) {
          expect(layer.d.startsWith('M0 90')).toBe(true);
          expect(layer.d.endsWith('Z')).toBe(true);
        }
      }
    }
  });

  it('peaks, dunes and waves draw three layers, near ones darker', () => {
    for (const kind of ['peaks', 'dunes', 'waves'] as const) {
      const scene = coverScene(idOfKind(kind));
      expect(scene.layers.map((layer) => layer.depth)).toEqual([0, 0.5, 1]);
      expect(scene.rings).toEqual([]);
      expect(scene.windows).toEqual([]);
    }
  });

  it('a skyline has three layers of towers and lit windows on the nearest', () => {
    const scene = coverScene(idOfKind('skyline'));
    expect(scene.layers).toHaveLength(3);
    expect(scene.windows.length).toBeGreaterThan(0);
  });

  it('an orbital world has rings around its planet and a single ground', () => {
    const scene = coverScene(idOfKind('orbits', 'world'), 'world');
    expect(scene.rings.length).toBeGreaterThanOrEqual(2);
    expect(scene.layers).toHaveLength(1);
    for (const ring of scene.rings) expect(ring.rx).toBeGreaterThan(ring.ry);
  });
});
