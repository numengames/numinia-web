/**
 * The avatars a person may show beside their name (cut «Tu nombre y tu
 * cara», 2026-10-16): the Bazar's own — the public, published avatars of the
 * committed catalogue (fixtures/catalogs.json, the snapshot the thumbnails
 * are baked from: scripts/build-thumbs.mjs) — that have a baked thumbnail.
 * Never an uploaded picture: the site hosts nobody's photos.
 *
 * A build-time list. The settings section draws it as radio cards, and
 * POST /api/profile refuses any avatar outside it — the Worker reads it
 * from the bundle, never from the network. Server only: the section's
 * script is handed what it needs, not this module.
 */

import catalogs from '../../fixtures/catalogs.json';
import { faceSrc } from './thumbs';

export interface ProfileAvatar {
  /** The asset's id, as the Bazar and the till keep it. */
  readonly id: string;
  /** Its name in the catalogue, as the Bazar shows it. */
  readonly name: string;
  /** The baked 1x thumbnail: `/thumbs/1x/<id>.webp`. */
  readonly face: string;
}

/** What this module reads of a catalogue entry (the committed file, checked by its own tests). */
interface CatalogueEntry {
  readonly id: string;
  readonly name: string;
  readonly is_public: boolean;
  readonly is_draft?: boolean;
}

const entries = (catalogs as unknown as { readonly avatars: readonly CatalogueEntry[] }).avatars;

/** In the catalogue's order. */
export const PROFILE_AVATARS: readonly ProfileAvatar[] = entries
  .filter((entry) => entry.is_public && entry.is_draft !== true)
  .map((entry) => ({ id: entry.id, name: entry.name, face: faceSrc(entry.id) }))
  .filter((avatar): avatar is ProfileAvatar => avatar.face !== null);

const IDS: ReadonlySet<string> = new Set(PROFILE_AVATARS.map((avatar) => avatar.id));

/** Whether a person may choose this id. */
export function isProfileAvatar(id: string): boolean {
  return IDS.has(id);
}
