/**
 * The Bazaar's Phosphor glyphs (regular weight, the self-hosted subset in
 * packages/ui/src/icons, MIT): the raw SVGs inlined at build, sized by their
 * slot, always decorative — the text beside them carries the meaning.
 */

import check from '../../../../../packages/ui/src/icons/check.svg?raw';
import cube from '../../../../../packages/ui/src/icons/cube.svg?raw';
import downloadSimple from '../../../../../packages/ui/src/icons/download-simple.svg?raw';
import imageSquare from '../../../../../packages/ui/src/icons/image-square.svg?raw';
import listPlus from '../../../../../packages/ui/src/icons/list-plus.svg?raw';
import magnifyingGlass from '../../../../../packages/ui/src/icons/magnifying-glass.svg?raw';
import musicNotes from '../../../../../packages/ui/src/icons/music-notes.svg?raw';
import planet from '../../../../../packages/ui/src/icons/planet.svg?raw';
import squaresFour from '../../../../../packages/ui/src/icons/squares-four.svg?raw';
import user from '../../../../../packages/ui/src/icons/user.svg?raw';
import videoCamera from '../../../../../packages/ui/src/icons/video-camera.svg?raw';
import x from '../../../../../packages/ui/src/icons/x.svg?raw';
import type { AssetCategory } from '../../lib/data';

const GLYPHS = {
  check,
  cube,
  downloadSimple,
  imageSquare,
  listPlus,
  magnifyingGlass,
  musicNotes,
  planet,
  squaresFour,
  user,
  videoCamera,
  x,
} as const;

type GlyphName = keyof typeof GLYPHS;

/** Each kind of good's glyph: in the filter column and on a card without a picture. */
export const KIND_GLYPH: Readonly<Record<AssetCategory, GlyphName>> = {
  avatars: 'user',
  models: 'cube',
  worlds: 'planet',
  audio: 'musicNotes',
  video: 'videoCamera',
  images: 'imageSquare',
};

export function Glyph({ name, size = 18 }: { name: GlyphName; size?: number }) {
  return (
    <span
      className="glyph"
      aria-hidden="true"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: GLYPHS[name] }}
    />
  );
}
