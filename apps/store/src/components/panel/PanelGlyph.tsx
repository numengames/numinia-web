/**
 * The panel's Phosphor glyphs (regular weight, the self-hosted subset in
 * packages/ui/src/icons, MIT): the raw SVGs inlined at build, drawn through
 * the site's own `.icono` rules (Icon.astro's global CSS), always decorative
 * — the words beside them carry the meaning. An island cannot use
 * Icon.astro, so this is its React twin for the few icons the panel draws.
 */

import type { CSSProperties } from 'react';
import buildings from '../../../../../packages/ui/src/icons/buildings.svg?raw';
import calendarBlank from '../../../../../packages/ui/src/icons/calendar-blank.svg?raw';
import caretDown from '../../../../../packages/ui/src/icons/caret-down.svg?raw';
import coins from '../../../../../packages/ui/src/icons/coins.svg?raw';
import craneTower from '../../../../../packages/ui/src/icons/crane-tower.svg?raw';
import gear from '../../../../../packages/ui/src/icons/gear.svg?raw';
import house from '../../../../../packages/ui/src/icons/house.svg?raw';
import packageIcon from '../../../../../packages/ui/src/icons/package.svg?raw';
import planet from '../../../../../packages/ui/src/icons/planet.svg?raw';
import robot from '../../../../../packages/ui/src/icons/robot.svg?raw';
import scroll from '../../../../../packages/ui/src/icons/scroll.svg?raw';
import shieldCheck from '../../../../../packages/ui/src/icons/shield-check.svg?raw';
import squaresFour from '../../../../../packages/ui/src/icons/squares-four.svg?raw';
import users from '../../../../../packages/ui/src/icons/users.svg?raw';
import usersThree from '../../../../../packages/ui/src/icons/users-three.svg?raw';
import type { PieceIcon } from '../../lib/panel';

const GLYPHS: Readonly<Record<PieceIcon | 'caret-down' | 'crane-tower' | 'squares-four', string>> =
  {
    house,
    buildings,
    'calendar-blank': calendarBlank,
    'users-three': usersThree,
    'shield-check': shieldCheck,
    'squares-four': squaresFour,
    robot,
    scroll,
    package: packageIcon,
    coins,
    gear,
    users,
    planet,
    'caret-down': caretDown,
    'crane-tower': craneTower,
  };

export function PanelGlyph({
  name,
  size = 20,
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
