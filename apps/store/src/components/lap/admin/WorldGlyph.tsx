/**
 * The admin worlds room's Phosphor glyphs (regular weight, the self-hosted
 * subset in packages/ui/src/icons, MIT): the raw SVGs inlined at build,
 * drawn through the site's own `.icono` rules (Icon.astro's global CSS,
 * already on this page through LapShell) — React's twin of Icon.astro for
 * an island, same pattern as the panel's PanelGlyph. Decorative by default
 * (aria-hidden); the button around it carries the accessible name via
 * aria-label, and the house's own `[data-tip]` (sistema.css) shows it on
 * hover/focus — no new tooltip markup, no new JS.
 */

import type { CSSProperties } from 'react';
import arrowSquareOut from '../../../../../../packages/ui/src/icons/arrow-square-out.svg?raw';
import arrowsClockwise from '../../../../../../packages/ui/src/icons/arrows-clockwise.svg?raw';
import downloadSimple from '../../../../../../packages/ui/src/icons/download-simple.svg?raw';
import eye from '../../../../../../packages/ui/src/icons/eye.svg?raw';
import mapPin from '../../../../../../packages/ui/src/icons/map-pin.svg?raw';
import packageGlyph from '../../../../../../packages/ui/src/icons/package.svg?raw';
import play from '../../../../../../packages/ui/src/icons/play.svg?raw';
import stop from '../../../../../../packages/ui/src/icons/stop.svg?raw';
import trash from '../../../../../../packages/ui/src/icons/trash.svg?raw';
import userPlus from '../../../../../../packages/ui/src/icons/user-plus.svg?raw';
import x from '../../../../../../packages/ui/src/icons/x.svg?raw';

const GLYPHS = {
  'arrow-square-out': arrowSquareOut,
  'arrows-clockwise': arrowsClockwise,
  'download-simple': downloadSimple,
  eye,
  'map-pin': mapPin,
  package: packageGlyph,
  play,
  stop,
  trash,
  'user-plus': userPlus,
  x,
} as const;

export function WorldGlyph({
  name,
  size = 16,
}: {
  readonly name: keyof typeof GLYPHS;
  readonly size?: number;
}) {
  const style = { '--icono-size': `${size}px` } as CSSProperties;
  return (
    <span
      className="icono"
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: GLYPHS[name] }}
    />
  );
}
