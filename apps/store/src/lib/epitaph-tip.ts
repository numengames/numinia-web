/**
 * Where the footer's epitaph bubble floats (bug fix, v3 «La ciudad y tú»):
 * the skull sits at the foot of a rail that scrolls and clips its own box
 * (`.rail` in shell.css), so the bubble can no longer be `position:
 * absolute` inside it — the rail's own edge would cut it off whenever the
 * rail's content is taller than its own viewport slice. The footer's
 * script places it `fixed` in the window instead, right-aligned on the
 * skull, above it (there is rarely room below, the skull sits at the very
 * foot of the page), never past the window on any side.
 *
 * Its own module on purpose, like rail-tip.ts: the footer's script is
 * inlined into every page (including the landing page, which ships no
 * external JavaScript), and sharing a module with the rails' own script
 * (lib/rails.ts) would turn both into a shared external chunk.
 */

import type { Point, Rect, Size } from './rails';

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(value, high));

export function placeEpitaph(anchor: Rect, tip: Size, viewport: Size, gap = 8, margin = 8): Point {
  const left = clamp(anchor.right - tip.width, margin, viewport.width - tip.width - margin);
  const top = clamp(anchor.top - tip.height - gap, margin, viewport.height - tip.height - margin);
  return { top, left };
}
