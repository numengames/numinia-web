/**
 * «La gente»'s Phosphor glyphs (regular weight, the self-hosted subset in
 * packages/ui/src/icons, MIT), drawn like ./PanelGlyph.tsx draws the rail's:
 * the raw SVGs inlined at build through the site's `.icono` rules, always
 * decorative — the words beside them (or the button's label) carry the
 * meaning. Apart from the rail's, so the Summary and the balance, which
 * share the frame, carry none of them.
 */

import type { CSSProperties } from 'react';
import crown from '../../../../../packages/ui/src/icons/crown.svg?raw';
import dotsThree from '../../../../../packages/ui/src/icons/dots-three.svg?raw';
import lockKey from '../../../../../packages/ui/src/icons/lock-key.svg?raw';
import magnifyingGlass from '../../../../../packages/ui/src/icons/magnifying-glass.svg?raw';
import plus from '../../../../../packages/ui/src/icons/plus.svg?raw';
import user from '../../../../../packages/ui/src/icons/user.svg?raw';
import usersThree from '../../../../../packages/ui/src/icons/users-three.svg?raw';
import x from '../../../../../packages/ui/src/icons/x.svg?raw';

const GLYPHS = {
  crown,
  'dots-three': dotsThree,
  'lock-key': lockKey,
  'magnifying-glass': magnifyingGlass,
  plus,
  user,
  'users-three': usersThree,
  x,
} as const satisfies Readonly<Record<string, string>>;

export function PeopleGlyph({
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
