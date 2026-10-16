/**
 * The rails' behaviour, pure (v3, «La ciudad y tú»): the folds, the «/»
 * shortcut and where a rail menu floats. Only the rails' inline script
 * imports this module: it must not share a chunk with anything else, or
 * the bundler would turn the script into an external file (the landing
 * page ships no external JavaScript). The places and their addresses live
 * in lib/app-nav.ts.
 */

// ---------------------------------------------------------------------------
// The folds. Each rail folds on its own and the choice is kept on the device
// (LEG-003 §3.1, decision D17). BaseLayout's boot script applies the same
// rule before the first paint (it cannot import this module: it is inline).

export type RailSide = 'city' | 'you';
/** The values today's sidebar already kept under `numinia-sidebar`. */
export type RailState = 'expanded' | 'collapsed';

/**
 * Both folds live under the old sidebar's key (the one the cookie policy
 * names: «whether you folded the side bar»). Its old bare value
 * (`collapsed` / `expanded`) is the city's; v3 writes `city=…;you=…`.
 */
export const FOLD_KEY = 'numinia-sidebar';

const isState = (value: string | undefined): value is RailState =>
  value === 'expanded' || value === 'collapsed';

/** What the kept value says of one rail: its state, or null (no choice: the width decides). */
export function keptFold(stored: string | null, side: RailSide): RailState | null {
  if (stored === null) return null;
  if (isState(stored)) return side === 'city' ? stored : null;
  const found = new RegExp(`(?:^|;)${side}=(\\w+)`).exec(stored)?.[1];
  return isState(found) ? found : null;
}

/** The kept value once one rail has been folded or unfolded (the other keeps its choice). */
export function keepFold(stored: string | null, side: RailSide, state: RailState): string {
  const other: RailSide = side === 'city' ? 'you' : 'city';
  const kept = keptFold(stored, other);
  const parts = { [side]: state, ...(kept === null ? {} : { [other]: kept }) };
  return (['city', 'you'] as const)
    .filter((name) => parts[name] !== undefined)
    .map((name) => `${name}=${parts[name]}`)
    .join(';');
}

/** A phone on its side: both rails stay icon edges whatever was chosen. */
const LANDSCAPE_MAX_HEIGHT = 540;

/** No choice kept: ≥ 1440 both open; 1024–1439 yours folded; below, both folded. */
export function autoRail(side: RailSide, width: number): RailState {
  if (width >= 1440) return 'expanded';
  if (width >= 1024) return side === 'city' ? 'expanded' : 'collapsed';
  return 'collapsed';
}

/** What a rail shows: a phone on its side folds both; else the kept choice, else the width's. */
export function railState(
  side: RailSide,
  stored: string | null,
  width: number,
  height: number,
): RailState {
  if (height <= LANDSCAPE_MAX_HEIGHT && width > height) return 'collapsed';
  return keptFold(stored, side) ?? autoRail(side, width);
}

// ---------------------------------------------------------------------------
// The «/» shortcut.

/** The parts of a keydown the «/» shortcut looks at. */
export interface ShortcutKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/** The parts of the focused element the shortcut looks at. */
export interface ShortcutTarget {
  readonly tagName: string;
  readonly isContentEditable: boolean;
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** «/» opens the search — unless the person is typing or holds a modifier. */
export function opensSearch(event: ShortcutKey, target: ShortcutTarget | null): boolean {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (target === null) return true;
  return !target.isContentEditable && !TYPING_TAGS.has(target.tagName.toUpperCase());
}

// ---------------------------------------------------------------------------
// Placing what floats: the rail menus live outside the scrolling rails,
// fixed to the window, next to their button.

export interface Rect {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly top: number;
  readonly left: number;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(value, high));

/**
 * A menu under its button, its right edge on the button's (the menus open
 * from the right rail), never past the window; above the button when there
 * is no room below.
 */
export function placeMenu(anchor: Rect, menu: Size, viewport: Size, margin = 8): Point {
  const left = clamp(anchor.right - menu.width, margin, viewport.width - menu.width - margin);
  const below = anchor.bottom + margin;
  const top =
    below + menu.height > viewport.height - margin
      ? Math.max(margin, anchor.top - menu.height - margin)
      : below;
  return { top, left };
}
