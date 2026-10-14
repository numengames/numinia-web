/**
 * The app shell's sprite: an icon drawn in two places of the chrome (the
 * Khepri in the sidebar and the phone's top bar, each place in the sidebar
 * and the tab bar, the magnifier) travels once per page as a <symbol> and
 * every place draws it with <use> — the approved prototype's own technique,
 * which keeps the chrome's weight off every page.
 */

/** What a <symbol> needs from an inline SVG: its viewBox and its children. */
export interface SvgParts {
  readonly viewBox: string;
  readonly body: string;
}

/** Split a self-hosted inline SVG (one root <svg> with a viewBox). */
export function svgParts(raw: string): SvgParts {
  const open = /<svg\b[^>]*>/.exec(raw);
  const close = raw.lastIndexOf('</svg>');
  if (!open || close < open.index) throw new Error('not an inline SVG');
  const viewBox = /\bviewBox="([^"]+)"/.exec(open[0])?.[1];
  if (!viewBox) throw new Error('an SVG without a viewBox cannot become a symbol');
  return { viewBox, body: raw.slice(open.index + open[0].length, close).trim() };
}

/** The id of a symbol in the page's sprite. */
export function symbolId(name: string): string {
  return `i-${name}`;
}
