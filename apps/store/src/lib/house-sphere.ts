/**
 * The sphere of Numen Games (v3 «La esfera y la casa»): the oracle in a 3D
 * sphere, a tilted graduated ring around it (the instrument of 1920) and one
 * dot per community on the ring. This module is the pure part — which
 * communities get a dot (the scale rule) and where everything sits for a
 * given turn — so the built page can draw the sphere at rest without
 * JavaScript and the island only redraws it when someone turns it.
 *
 * Everything is laid out in one fixed frame (FRAME, wider than tall: the
 * tilted ring barely rises or falls); the page scales the frame with CSS,
 * so nothing here measures the screen.
 */

import { nextRitualOf, ritualStartMs, type Community, type Ritual } from './communities';

/** The drawing frame, in its own units. */
export const FRAME = { width: 500, height: 400 } as const;

/** The sphere's radius in frame units: its disc is 62 % of the frame's width. */
export const SPHERE_RADIUS = 155;

/** At most this many dots on the ring; the rest go in a «+N» chip. */
export const MAX_RING_DOTS = 12;

/** The turn the sphere rests at (radians). */
export const REST = { yaw: 0.25, pitch: 0.55 } as const;

/** How far up or down the sphere can be tipped. */
export const PITCH_MIN = -0.25;
export const PITCH_MAX = 1.15;

/** How far one arrow key turns it: a side step, and a smaller tip. */
const KEY_YAW = 0.35;
const KEY_PITCH = 0.15;

const TAU = Math.PI * 2;
const CX = FRAME.width / 2;
const CY = FRAME.height / 2;

// ---------------------------------------------------------------------------
// The scale rule
// ---------------------------------------------------------------------------

/** What makes a community «active» for the ring: people inside now, then its next encounter. */
export interface Activity {
  /** People inside its worlds right now (0 when the page cannot know it). */
  readonly inside: number;
  /** When its next encounter starts (UTC ms); undefined when none is announced. */
  readonly nextStartMs: number | undefined;
}

export interface RingChoice<T> {
  /** The ones with a dot, the most active first. */
  readonly shown: readonly T[];
  /** The ones left for the «+N» chip, in the same order. */
  readonly rest: readonly T[];
}

/**
 * The ring holds at most `max` dots: the most active communities — most
 * people inside first, then the soonest next encounter, then by name, so the
 * same register always draws the same ring.
 */
export function ringChoice<T extends { readonly name: string }>(
  items: readonly T[],
  activity: (item: T) => Activity,
  max: number = MAX_RING_DOTS,
): RingChoice<T> {
  const scored = items.map((item) => ({ item, a: activity(item) }));
  scored.sort((x, y) => {
    if (x.a.inside !== y.a.inside) return y.a.inside - x.a.inside;
    const xs = x.a.nextStartMs ?? Number.POSITIVE_INFINITY;
    const ys = y.a.nextStartMs ?? Number.POSITIVE_INFINITY;
    if (xs !== ys) return xs < ys ? -1 : 1;
    return x.item.name.localeCompare(y.item.name, 'en');
  });
  const ordered = scored.map((entry) => entry.item);
  const keep = Math.max(0, Math.floor(max));
  return { shown: ordered.slice(0, keep), rest: ordered.slice(keep) };
}

/**
 * A community's activity as a built page can know it cheaply: its next
 * encounter from the register, and people inside only when a count is
 * handed in (the page is static: by default nobody is counted).
 */
export function communityActivity(
  community: Community,
  rituals: readonly Ritual[],
  inside?: ReadonlyMap<string, number>,
): Activity {
  const next = nextRitualOf(community.id, rituals);
  return {
    inside: inside?.get(community.id) ?? 0,
    nextStartMs: next === undefined ? undefined : ritualStartMs(next),
  };
}

// ---------------------------------------------------------------------------
// The ring's geometry
// ---------------------------------------------------------------------------

const round = (value: number): number => Math.round(value * 100) / 100;

/** Keep a tip inside what the sphere allows. */
export function clampPitch(pitch: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
}

/** How tilted the ring's plane looks for a tip of the sphere. */
export function ringTilt(pitch: number): number {
  return Math.min(0.85, Math.max(0.12, 0.36 + (pitch - REST.pitch) * 0.5));
}

/** The ring's radius: a little wider round the big sphere of the house's page. */
export function ringRadius(big: boolean): number {
  return SPHERE_RADIUS * (big ? 1.34 : 1.3);
}

export interface RingPoint {
  readonly x: number;
  readonly y: number;
  /** Positive in front of the sphere, negative behind it. */
  readonly z: number;
}

/** A point of the ring at angle `theta` (radians), on a plane tilted by `tilt`. */
export function ringPoint(theta: number, radius: number, tilt: number): RingPoint {
  const depth = radius * Math.sin(theta);
  return {
    x: CX + radius * Math.cos(theta),
    y: CY + depth * Math.sin(tilt),
    z: depth * Math.cos(tilt),
  };
}

export interface RingPaths {
  /** The ring's half behind the sphere, and its marks. */
  readonly back: string;
  readonly backTicks: string;
  /** The half in front, and its marks. */
  readonly front: string;
  readonly frontTicks: string;
}

const xy = (point: RingPoint): string => `${round(point.x)} ${round(point.y)}`;

/**
 * The SVG paths of the ring for a turn: the circle cut into what is behind
 * the sphere and what is in front, and its graduation — sixty marks, every
 * fifth one long.
 */
export function ringPaths(yaw: number, tilt: number, radius: number): RingPaths {
  const steps = 120;
  let back = '';
  let front = '';
  let previous: { point: RingPoint; front: boolean } | undefined;
  for (let k = 0; k <= steps; k += 1) {
    const point = ringPoint((k / steps) * TAU + yaw, radius, tilt);
    const isFront = point.z >= 0;
    let segment: string;
    if (previous !== undefined && previous.front === isFront) segment = ` L${xy(point)}`;
    else if (previous !== undefined) segment = ` M${xy(previous.point)} L${xy(point)}`;
    else segment = ` M${xy(point)}`;
    if (isFront) front += segment;
    else back += segment;
    previous = { point, front: isFront };
  }
  let backTicks = '';
  let frontTicks = '';
  for (let k = 0; k < 60; k += 1) {
    const theta = (k / 60) * TAU + yaw;
    const length = k % 5 === 0 ? 9 : 4;
    const from = ringPoint(theta, radius + 3, tilt);
    const to = ringPoint(theta, radius + 3 + length, tilt);
    const tick = ` M${xy(from)} L${xy(to)}`;
    if (from.z >= 0) frontTicks += tick;
    else backTicks += tick;
  }
  return {
    back: back.trim(),
    backTicks: backTicks.trim(),
    front: front.trim(),
    frontTicks: frontTicks.trim(),
  };
}

/** Where on the ring the i-th of `count` dots sits, before any turn. */
export function dotAngle(index: number, count: number): number {
  return Math.PI / 2 + index * (TAU / Math.max(1, count));
}

export interface DotPlace {
  /** Its centre, in percent of the frame (so CSS scales it with the frame). */
  readonly left: number;
  readonly top: number;
  /** Behind the sphere: dimmed. */
  readonly behind: boolean;
  /** Behind the sphere's disc itself: not drawn and not clickable. */
  readonly hidden: boolean;
  /** On the left half: its name points right, towards the centre. */
  readonly onLeft: boolean;
  /** In front and near the middle: its name sits under it. */
  readonly front: boolean;
}

/** Where a dot is drawn for a turn of the sphere. */
export function dotPlace(
  index: number,
  count: number,
  yaw: number,
  tilt: number,
  radius: number,
): DotPlace {
  const point = ringPoint(dotAngle(index, count) + yaw, radius, tilt);
  const behind = point.z < 0;
  const inDisc = Math.hypot(point.x - CX, point.y - CY) < SPHERE_RADIUS;
  return {
    left: round((point.x / FRAME.width) * 100),
    top: round((point.y / FRAME.height) * 100),
    behind,
    hidden: behind && inDisc,
    onLeft: point.x < CX,
    front: !behind && Math.abs(point.x - CX) < SPHERE_RADIUS * 0.6,
  };
}

/** The turn that brings the i-th dot to the front, the shortest way from `yaw`. */
export function yawToFront(index: number, count: number, yaw: number): number {
  // The front of the ring is +z, sin(theta) = 1: the dot's angle after the turn is PI/2.
  let target = Math.PI / 2 - dotAngle(index, count);
  while (target - yaw > Math.PI) target -= TAU;
  while (target - yaw < -Math.PI) target += TAU;
  return target;
}

export interface Turn {
  readonly yaw: number;
  readonly pitch: number;
}

/** The turn a key asks for from where the sphere is; null when the key turns nothing. */
export function keyTurn(key: string, from: Turn): Turn | null {
  switch (key) {
    case 'ArrowLeft':
      return { yaw: from.yaw + KEY_YAW, pitch: from.pitch };
    case 'ArrowRight':
      return { yaw: from.yaw - KEY_YAW, pitch: from.pitch };
    case 'ArrowUp':
      return { yaw: from.yaw, pitch: clampPitch(from.pitch - KEY_PITCH) };
    case 'ArrowDown':
      return { yaw: from.yaw, pitch: clampPitch(from.pitch + KEY_PITCH) };
    case 'Home':
      return { yaw: REST.yaw, pitch: REST.pitch };
    default:
      return null;
  }
}

/**
 * One frame of the spring towards a target turn: a fraction of the way
 * each frame, and `done` once close enough — then it snaps and stops. The
 * sphere never moves on its own after that.
 */
export function springStep(from: Turn, to: Turn): { readonly turn: Turn; readonly done: boolean } {
  const dy = to.yaw - from.yaw;
  const dp = to.pitch - from.pitch;
  if (Math.abs(dy) < 0.002 && Math.abs(dp) < 0.002) return { turn: to, done: true };
  return { turn: { yaw: from.yaw + dy * 0.14, pitch: from.pitch + dp * 0.14 }, done: false };
}

/** One frame of the drag's inertia: the spin decays and stops by itself. */
export function inertiaStep(velocity: number): {
  readonly velocity: number;
  readonly done: boolean;
} {
  if (Math.abs(velocity) <= 0.0006) return { velocity: 0, done: true };
  return { velocity: velocity * 0.93, done: false };
}
