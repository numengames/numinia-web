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
import moon from '../../../../../packages/ui/src/icons/moon.svg?raw';
import packageIcon from '../../../../../packages/ui/src/icons/package.svg?raw';
import planet from '../../../../../packages/ui/src/icons/planet.svg?raw';
import robot from '../../../../../packages/ui/src/icons/robot.svg?raw';
import scroll from '../../../../../packages/ui/src/icons/scroll.svg?raw';
import shieldCheck from '../../../../../packages/ui/src/icons/shield-check.svg?raw';
import squaresFour from '../../../../../packages/ui/src/icons/squares-four.svg?raw';
import users from '../../../../../packages/ui/src/icons/users.svg?raw';
import usersThree from '../../../../../packages/ui/src/icons/users-three.svg?raw';
import arrowsClockwise from '../../../../../packages/ui/src/icons/arrows-clockwise.svg?raw';
import chatCircleDots from '../../../../../packages/ui/src/icons/chat-circle-dots.svg?raw';
import dotsThree from '../../../../../packages/ui/src/icons/dots-three.svg?raw';
import hourglass from '../../../../../packages/ui/src/icons/hourglass.svg?raw';
import info from '../../../../../packages/ui/src/icons/info.svg?raw';
import key from '../../../../../packages/ui/src/icons/key.svg?raw';
import lightning from '../../../../../packages/ui/src/icons/lightning.svg?raw';
import link from '../../../../../packages/ui/src/icons/link.svg?raw';
import plug from '../../../../../packages/ui/src/icons/plug.svg?raw';
import plugsConnected from '../../../../../packages/ui/src/icons/plugs-connected.svg?raw';
import plus from '../../../../../packages/ui/src/icons/plus.svg?raw';
import sparkle from '../../../../../packages/ui/src/icons/sparkle.svg?raw';
import trash from '../../../../../packages/ui/src/icons/trash.svg?raw';
import arrowRight from '../../../../../packages/ui/src/icons/arrow-right.svg?raw';
import caretLeft from '../../../../../packages/ui/src/icons/caret-left.svg?raw';
import check from '../../../../../packages/ui/src/icons/check.svg?raw';
import cloud from '../../../../../packages/ui/src/icons/cloud.svg?raw';
import copy from '../../../../../packages/ui/src/icons/copy.svg?raw';
import desktop from '../../../../../packages/ui/src/icons/desktop.svg?raw';
import ear from '../../../../../packages/ui/src/icons/ear.svg?raw';
import lockKey from '../../../../../packages/ui/src/icons/lock-key.svg?raw';
import prohibit from '../../../../../packages/ui/src/icons/prohibit.svg?raw';
import question from '../../../../../packages/ui/src/icons/question.svg?raw';
import terminalWindow from '../../../../../packages/ui/src/icons/terminal-window.svg?raw';
import warning from '../../../../../packages/ui/src/icons/warning.svg?raw';
import type { PieceIcon } from '../../lib/panel';

const GLYPHS: Readonly<
  Record<
    | PieceIcon
    | 'caret-down'
    | 'arrow-right'
    | 'caret-left'
    | 'check'
    | 'cloud'
    | 'copy'
    | 'desktop'
    | 'ear'
    | 'lock-key'
    | 'prohibit'
    | 'question'
    | 'terminal-window'
    | 'warning'
    | 'crane-tower'
    | 'moon'
    | 'squares-four'
    | 'arrows-clockwise'
    | 'chat-circle-dots'
    | 'dots-three'
    | 'hourglass'
    | 'info'
    | 'key'
    | 'lightning'
    | 'link'
    | 'plug'
    | 'plugs-connected'
    | 'plus'
    | 'sparkle'
    | 'trash',
    string
  >
> = {
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
  moon,
  'arrows-clockwise': arrowsClockwise,
  'chat-circle-dots': chatCircleDots,
  'dots-three': dotsThree,
  hourglass: hourglass,
  info: info,
  key: key,
  lightning: lightning,
  link: link,
  plug: plug,
  'plugs-connected': plugsConnected,
  plus: plus,
  sparkle: sparkle,
  trash: trash,
  'arrow-right': arrowRight,
  'caret-left': caretLeft,
  check: check,
  cloud: cloud,
  copy: copy,
  desktop: desktop,
  ear: ear,
  'lock-key': lockKey,
  prohibit: prohibit,
  question: question,
  'terminal-window': terminalWindow,
  warning: warning,
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
