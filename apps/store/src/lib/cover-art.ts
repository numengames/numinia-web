/**
 * The house's own picture for anything that has none: a community, a
 * gathering or a world without a cover is drawn here, from its id, as a
 * small scene in the house palette (a sky, a sun or a planet, stars and a
 * landscape). Same id, same picture, always; two ids almost never share one.
 * Pure and dependency-free: no file to host, no third party's photo, nothing
 * added to the image budget — the component only prints these numbers.
 */

/** The house colours a scene can be tinted with (CSS variables of the design system). */
export const COVER_HUES = ['turquesa', 'ambar', 'coral', 'verdemar', 'grana'] as const;
export type CoverHue = (typeof COVER_HUES)[number];

/** What the landscape is: peaks, a skyline, dunes, waves — or, for a world, a planet with rings. */
export const COVER_KINDS = ['peaks', 'skyline', 'dunes', 'waves', 'orbits'] as const;
export type CoverKind = (typeof COVER_KINDS)[number];

/** A place (a community, a gathering) draws a landscape; a world draws a planet or one of three landscapes. */
export type CoverFamily = 'place' | 'world';
const PLACE_KINDS: readonly CoverKind[] = ['peaks', 'skyline', 'dunes', 'waves'];
const WORLD_KINDS: readonly CoverKind[] = ['orbits', 'orbits', 'peaks', 'dunes'];

/** The scene is drawn on a 160 × 90 canvas (16:9). */
export const COVER_WIDTH = 160;
export const COVER_HEIGHT = 90;

export interface CoverLayer {
  /** SVG path data. */
  readonly d: string;
  /** 0 = far and faint, 1 = near and dark. */
  readonly depth: number;
}

export interface CoverScene {
  readonly hue: CoverHue;
  readonly kind: CoverKind;
  readonly sun: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly stars: readonly { readonly x: number; readonly y: number; readonly r: number }[];
  readonly layers: readonly CoverLayer[];
  /** Orbit ellipses around the sun (only for «orbits»). */
  readonly rings: readonly { readonly rx: number; readonly ry: number; readonly tilt: number }[];
  /** Lit windows (only for «skyline»). */
  readonly windows: readonly { readonly x: number; readonly y: number }[];
}

/** FNV-1a: a stable 32-bit hash of a string. */
export function hashOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded generator, 0 ≤ n < 1. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number): number => Math.round(n * 10) / 10;

/** A ridge of straight peaks across the width, `base` high on average. */
function peaks(rand: () => number, base: number, spread: number): string {
  const steps = 7 + Math.floor(rand() * 3);
  const points: string[] = [`M0 ${COVER_HEIGHT}`];
  for (let i = 0; i <= steps; i++) {
    const x = round((COVER_WIDTH / steps) * i);
    const y = round(base - rand() * spread);
    points.push(`L${x} ${y}`);
  }
  points.push(`L${COVER_WIDTH} ${COVER_HEIGHT}Z`);
  return points.join(' ');
}

/** A row of towers of different heights. */
function skyline(
  rand: () => number,
  base: number,
  spread: number,
): { d: string; tops: { x: number; y: number; w: number }[] } {
  const tops: { x: number; y: number; w: number }[] = [];
  const parts: string[] = [`M0 ${COVER_HEIGHT}`];
  let x = 0;
  while (x < COVER_WIDTH) {
    const w = round(7 + rand() * 11);
    const y = round(base - rand() * spread);
    parts.push(`L${x} ${y} L${round(x + w)} ${y}`);
    tops.push({ x, y, w });
    x = round(x + w);
  }
  parts.push(`L${COVER_WIDTH} ${COVER_HEIGHT}Z`);
  return { d: parts.join(' '), tops };
}

/** Soft rolling dunes: one smooth curve. */
function dunes(rand: () => number, base: number, spread: number): string {
  const y0 = round(base - rand() * spread);
  const y1 = round(base - rand() * spread);
  const y2 = round(base - rand() * spread);
  const c = round(COVER_WIDTH / 2);
  return `M0 ${COVER_HEIGHT} L0 ${y0} Q${round(c / 2)} ${round(y0 - spread)} ${c} ${y1} T${COVER_WIDTH} ${y2} L${COVER_WIDTH} ${COVER_HEIGHT}Z`;
}

/** Waves: a row of arches. */
function waves(rand: () => number, base: number, spread: number): string {
  const count = 4 + Math.floor(rand() * 3);
  const width = COVER_WIDTH / count;
  const parts: string[] = [`M0 ${COVER_HEIGHT} L0 ${base}`];
  for (let i = 0; i < count; i++) {
    const high = round(base - spread * (0.4 + rand() * 0.6));
    parts.push(`Q${round(width * i + width / 2)} ${high} ${round(width * (i + 1))} ${base}`);
  }
  parts.push(`L${COVER_WIDTH} ${COVER_HEIGHT}Z`);
  return parts.join(' ');
}

/**
 * The scene of an id. `family` decides which landscapes are possible
 * (a world draws a planet with rings more often than a community does).
 */
export function coverScene(id: string, family: CoverFamily = 'place'): CoverScene {
  const hash = hashOf(`${family}:${id}`);
  const rand = seeded(hash);
  const hue = COVER_HUES[hash % COVER_HUES.length] as CoverHue;
  const kinds = family === 'world' ? WORLD_KINDS : PLACE_KINDS;
  const kind = kinds[Math.floor(rand() * kinds.length)] as CoverKind;

  const orbital = kind === 'orbits';
  const sun = {
    cx: round(30 + rand() * 100),
    cy: round(orbital ? 36 + rand() * 18 : 18 + rand() * 24),
    r: round(orbital ? 12 + rand() * 8 : 7 + rand() * 7),
  };
  const stars = Array.from({ length: 16 + Math.floor(rand() * 14) }, () => ({
    x: round(rand() * COVER_WIDTH),
    y: round(rand() * 50),
    r: round(0.3 + rand() * 0.7),
  }));

  const layers: CoverLayer[] = [];
  const windows: { x: number; y: number }[] = [];
  const rings: { rx: number; ry: number; tilt: number }[] = [];

  if (kind === 'orbits') {
    const count = 2 + Math.floor(rand() * 2);
    const tilt = round(-25 + rand() * 50);
    for (let i = 0; i < count; i++) {
      rings.push({
        rx: round(sun.r * (1.7 + i * 0.7)),
        ry: round(sun.r * (0.45 + i * 0.15)),
        tilt,
      });
    }
    layers.push({ d: dunes(rand, 82, 5), depth: 1 });
  } else {
    const draw = { peaks, dunes, waves } as const;
    for (let i = 0; i < 3; i++) {
      const depth = round(i / 2);
      const base = 62 + i * 9;
      const spread = 16 - i * 3;
      if (kind === 'skyline') {
        const { d, tops } = skyline(rand, base, spread);
        layers.push({ d, depth });
        if (i === 2) {
          for (const top of tops) {
            if (rand() > 0.4)
              windows.push({ x: round(top.x + top.w / 2 - 0.6), y: round(top.y + 3) });
          }
        }
      } else {
        layers.push({ d: draw[kind](rand, base, spread), depth });
      }
    }
  }
  return { hue, kind, sun, stars, layers, rings, windows };
}
