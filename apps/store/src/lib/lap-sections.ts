/**
 * The LAP's sections as the person sees them in the rail and keeps them in
 * Ajustes → «Secciones del panel». Pure: no storage, no DOM — the shell,
 * the settings page and BaseLayout's boot script read the same lists.
 *
 * A quiet panel by default (the Oracle, 2026-10-14: «por defecto hay muchas
 * cosas que no deberían de venirles»): whoever never chose starts with
 * DEFAULT_HIDDEN hidden. Any choice made in the settings is stored, even one
 * that shows everything (an empty value), and wins over the default from
 * then on. The page in view is never hidden (the shell's CSS).
 *
 * Under construction (the Oracle, 2026-10-14): «todo lo que no esté
 * funcionando debería salir con "está en construcción" o con un iconito».
 * A section listed in UNDER_CONSTRUCTION carries the crane mark in the rail
 * and in the settings, and its page opens with a banner saying what does
 * not work yet and when it comes.
 */

/** The sections a person may hide from the rail (the rest always show). */
export const HIDEABLE_SECTIONS = [
  'character',
  'codex',
  'portals',
  'loot',
  'seasons',
  'stats',
] as const;

export type HideableSection = (typeof HIDEABLE_SECTIONS)[number];

/**
 * Where the choice lives: a chrome preference in the browser (decision D17,
 * LEG-003 §3.1), a comma list of hidden sections. BaseLayout's boot script
 * reads it before the first paint.
 */
export const LAP_HIDDEN_KEY = 'numinia-lap-hidden';

/** What a person who never chose finds hidden: the Codex, the portals, the loot and the stats. */
export const DEFAULT_HIDDEN: readonly HideableSection[] = ['codex', 'portals', 'loot', 'stats'];

/** The sections that do not work yet: the loot (Season I) and the portals' map (Phase 5). */
export const UNDER_CONSTRUCTION: readonly HideableSection[] = ['portals', 'loot'];

export function isHideable(section: string | undefined): section is HideableSection {
  return (HIDEABLE_SECTIONS as readonly (string | undefined)[]).includes(section);
}

/** Whether a section (any rail id) is still being built. */
export function isUnderConstruction(section: string): boolean {
  return (UNDER_CONSTRUCTION as readonly string[]).includes(section);
}

/**
 * The hidden sections for a stored value: nothing stored (null) means the
 * person never chose, so the default; anything stored is their choice — an
 * empty value shows everything. Unknown ids are dropped; the rail's order.
 */
export function hiddenSections(stored: string | null): readonly HideableSection[] {
  if (stored === null) return DEFAULT_HIDDEN;
  const listed = new Set(stored.split(','));
  return HIDEABLE_SECTIONS.filter((section) => listed.has(section));
}

/** The hidden sections after one switch moves: shown (on) or hidden (off). */
export function withSection(
  hidden: readonly HideableSection[],
  section: HideableSection,
  shown: boolean,
): readonly HideableSection[] {
  return HIDEABLE_SECTIONS.filter((id) => (id === section ? !shown : hidden.includes(id)));
}

/** The value to store: the comma list, empty when everything shows (still a choice). */
export function storedValue(hidden: readonly HideableSection[]): string {
  return hidden.join(',');
}
