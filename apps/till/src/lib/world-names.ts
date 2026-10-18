/**
 * A world's own display name (card t_a856c570, 2026-10-18): the pure part.
 * Read as untrusted; a malformed field is a problem in words, never a
 * throw. Pure — no database.
 */

/** A name trimmed of surrounding blanks, 1 to 80 characters, with no control character. */
// eslint-disable-next-line no-control-regex -- deliberately matches control characters to reject them
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;
export const WORLD_NAME_MAX = 80;

export const NAME_PROBLEMS = {
  notHouse: 'only the house renames a world',
  world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
  name: `name must be 1 to ${WORLD_NAME_MAX} characters, with no leading or trailing blank`,
} as const;

/** A world's new name as the Lab sends it, or undefined when it is not that. */
export function readWorldName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed !== value) return undefined;
  if (trimmed.length < 1 || trimmed.length > WORLD_NAME_MAX) return undefined;
  return CONTROL_CHAR.test(trimmed) ? undefined : trimmed;
}
