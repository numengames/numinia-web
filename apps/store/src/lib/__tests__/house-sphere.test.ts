/**
 * The sphere of Numen Games: the scale rule (at most twelve dots, the most
 * active communities) and the ring's geometry the built page and the island
 * share.
 */

import { describe, expect, it } from 'vitest';
import { parseCommunity, parseRitual } from '../communities';
import {
  clampPitch,
  communityActivity,
  dotAngle,
  dotPlace,
  FRAME,
  inertiaStep,
  keyTurn,
  MAX_RING_DOTS,
  PITCH_MAX,
  PITCH_MIN,
  REST,
  ringChoice,
  ringPaths,
  ringPoint,
  ringRadius,
  ringTilt,
  springStep,
  SPHERE_RADIUS,
  yawToFront,
  type Activity,
} from '../house-sphere';

interface Item {
  readonly name: string;
  readonly inside: number;
  readonly next?: number;
}

const items = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `C${String(i).padStart(2, '0')}`,
    inside: 0,
    next: 1000 + i,
  }));
const activity = (item: Item): Activity => ({ inside: item.inside, nextStartMs: item.next });

describe('ringChoice (the scale rule)', () => {
  it('keeps every community when there are twelve or fewer, none in «+N»', () => {
    const { shown, rest } = ringChoice(items(12), activity);
    expect(shown).toHaveLength(12);
    expect(rest).toEqual([]);
    expect(MAX_RING_DOTS).toBe(12);
  });

  it('puts the thirteenth and later in «+N», the soonest encounters on the ring', () => {
    const all = items(15).reverse();
    const { shown, rest } = ringChoice(all, activity);
    expect(shown.map((item) => item.name)).toEqual(items(12).map((item) => item.name));
    expect(rest.map((item) => item.name)).toEqual(['C12', 'C13', 'C14']);
  });

  it('ranks people inside first, then the soonest encounter, then none, then by name', () => {
    const list: Item[] = [
      { name: 'Zeta', inside: 0 },
      { name: 'Alfa', inside: 0 },
      { name: 'Soon', inside: 0, next: 5 },
      { name: 'Later', inside: 0, next: 50 },
      { name: 'Busy', inside: 3 },
      { name: 'Busier', inside: 9, next: 99 },
    ];
    const { shown } = ringChoice(list, activity);
    expect(shown.map((item) => item.name)).toEqual([
      'Busier',
      'Busy',
      'Soon',
      'Later',
      'Alfa',
      'Zeta',
    ]);
  });

  it('takes a smaller limit, and never a negative one', () => {
    expect(ringChoice(items(5), activity, 2).rest).toHaveLength(3);
    expect(ringChoice(items(5), activity, -4).shown).toEqual([]);
    expect(ringChoice(items(5), activity, 2.9).shown).toHaveLength(2);
  });
});

describe('communityActivity', () => {
  const community = parseCommunity('trgcon', {
    name: 'La Tarugo',
    kind: { en: 'Conference', es: 'Congreso' },
    places: ['madrid'],
    summary: { en: 'x', es: 'x' },
    links: [],
  });
  const base = {
    community: 'trgcon',
    title: 'TRG26',
    mode: 'in-person',
    where: { en: 'Madrid', es: 'Madrid' },
  };
  const coming = parseRitual('trg26', { ...base, start: '2026-10-22', end: '2026-10-24' });
  const past = parseRitual('trg25', {
    ...base,
    start: '2025-10-22',
    end: '2025-10-24',
    status: 'held',
  });

  it('reads the next encounter from the register and nobody inside by default', () => {
    expect(communityActivity(community, [past, coming])).toEqual({
      inside: 0,
      nextStartMs: Date.parse('2026-10-22T00:00:00Z'),
    });
  });

  it('has no next encounter when none is announced, and takes a count when one is handed in', () => {
    expect(communityActivity(community, [past], new Map([['trgcon', 4]]))).toEqual({
      inside: 4,
      nextStartMs: undefined,
    });
    expect(communityActivity(community, [], new Map([['other', 4]])).inside).toBe(0);
  });
});

describe('the ring geometry', () => {
  it('clamps the tip and the tilt', () => {
    expect(clampPitch(9)).toBe(PITCH_MAX);
    expect(clampPitch(-9)).toBe(PITCH_MIN);
    expect(clampPitch(0.3)).toBe(0.3);
    expect(ringTilt(REST.pitch)).toBeCloseTo(0.36);
    expect(ringTilt(-10)).toBe(0.12);
    expect(ringTilt(10)).toBe(0.85);
  });

  it('draws the big ring a little wider than the small one', () => {
    expect(ringRadius(false)).toBeCloseTo(SPHERE_RADIUS * 1.3);
    expect(ringRadius(true)).toBeCloseTo(SPHERE_RADIUS * 1.34);
  });

  it('puts a point in front at a quarter turn and behind at three quarters', () => {
    const front = ringPoint(Math.PI / 2, 100, 0.4);
    expect(front.x).toBeCloseTo(FRAME.width / 2);
    expect(front.z).toBeGreaterThan(0);
    expect(ringPoint(-Math.PI / 2, 100, 0.4).z).toBeLessThan(0);
  });

  it('cuts the ring into a back and a front half, each with its marks', () => {
    const paths = ringPaths(REST.yaw, ringTilt(REST.pitch), ringRadius(false));
    for (const part of [paths.back, paths.front, paths.backTicks, paths.frontTicks]) {
      expect(part.startsWith('M')).toBe(true);
    }
    expect(paths.front).toContain(' L');
    // Sixty marks in all, split between the halves.
    const marks = (paths.backTicks + ' ' + paths.frontTicks).match(/M/g);
    expect(marks).toHaveLength(60);
  });

  it('spreads the dots evenly and survives a ring of none', () => {
    expect(dotAngle(0, 4)).toBeCloseTo(Math.PI / 2);
    expect(dotAngle(1, 4)).toBeCloseTo(Math.PI);
    expect(dotAngle(0, 0)).toBeCloseTo(Math.PI / 2);
  });

  it('places a dot in front, centred, with its name under it', () => {
    const place = dotPlace(0, 4, 0, ringTilt(REST.pitch), ringRadius(false));
    expect(place.left).toBeCloseTo(50);
    expect(place.top).toBeGreaterThan(50);
    expect(place).toMatchObject({ behind: false, hidden: false, front: true });
  });

  it('hides a dot behind the disc, and points the names inward', () => {
    const tilt = ringTilt(PITCH_MAX);
    const behind = dotPlace(0, 4, Math.PI, tilt, ringRadius(false));
    expect(behind.behind).toBe(true);
    expect(behind.hidden).toBe(true);
    const left = dotPlace(1, 4, 0, ringTilt(REST.pitch), ringRadius(false));
    expect(left.onLeft).toBe(true);
    expect(left.front).toBe(false);
    const right = dotPlace(3, 4, 0, ringTilt(REST.pitch), ringRadius(false));
    expect(right.onLeft).toBe(false);
    // On the side of the ring, behind but outside the disc: dimmed, still a link.
    const side = dotPlace(0, 4, Math.PI / 2 + 0.2, ringTilt(REST.pitch), ringRadius(false));
    expect(side.behind).toBe(true);
    expect(side.hidden).toBe(false);
  });

  it('brings a dot to the front the shortest way', () => {
    const target = yawToFront(2, 4, 0);
    expect(dotPlace(2, 4, target, ringTilt(REST.pitch), ringRadius(false)).front).toBe(true);
    expect(Math.abs(target)).toBeLessThanOrEqual(Math.PI);
    expect(Math.abs(yawToFront(2, 4, 20) - 20)).toBeLessThanOrEqual(Math.PI);
    expect(Math.abs(yawToFront(2, 4, -20) + 20)).toBeLessThanOrEqual(Math.PI);
  });
});

describe('moving the sphere', () => {
  const from = { yaw: 1, pitch: 0.5 };

  it('turns with the arrows, tips within limits and rests on Home', () => {
    expect(keyTurn('ArrowLeft', from)?.yaw).toBeCloseTo(1.35);
    expect(keyTurn('ArrowRight', from)?.yaw).toBeCloseTo(0.65);
    expect(keyTurn('ArrowUp', from)?.pitch).toBeCloseTo(0.35);
    expect(keyTurn('ArrowDown', from)?.pitch).toBeCloseTo(0.65);
    expect(keyTurn('ArrowDown', { yaw: 0, pitch: PITCH_MAX })?.pitch).toBe(PITCH_MAX);
    expect(keyTurn('Home', from)).toEqual(REST);
    expect(keyTurn('Enter', from)).toBeNull();
  });

  it('springs towards a turn and stops when it is there', () => {
    const step = springStep(from, REST);
    expect(step.done).toBe(false);
    expect(step.turn.yaw).toBeLessThan(from.yaw);
    expect(springStep({ yaw: 0.2501, pitch: 0.5501 }, REST)).toEqual({ turn: REST, done: true });
  });

  it('lets a flick decay and stop by itself', () => {
    let velocity = 0.2;
    let frames = 0;
    for (;;) {
      const step = inertiaStep(velocity);
      velocity = step.velocity;
      if (step.done) break;
      frames += 1;
    }
    expect(velocity).toBe(0);
    expect(frames).toBeGreaterThan(10);
    expect(frames).toBeLessThan(200);
  });
});
