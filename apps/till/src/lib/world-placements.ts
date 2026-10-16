/**
 * Which organization a world belongs to (cut «Mundos ↔ organizaciones»,
 * 2026-10-16), the pure part: the world ids and the list of them that
 * numinia.com sends, read as untrusted, and the words of the refusals.
 * Pure — no database. A malformed field is a problem in words, never a throw.
 */

/** The most worlds one placement carries. */
export const WORLD_IDS_MAX = 50;

/** A fleet order's id: lowercase letters and digits in groups split by single hyphens. */
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORLD_ID_MAX = 63;

export const PLACEMENT_PROBLEMS = {
  notHouse: 'only the house places a world in an organization',
  worlds: `worldIds must be 1 to ${WORLD_IDS_MAX} world ids: lowercase letters, digits and single hyphens`,
  world: 'worldId must be a world id: lowercase letters, digits and single hyphens',
  account: 'accountId must be an organization id',
  noAccount: 'no such organization',
  notMember: 'only the organization’s members and the house see its worlds',
} as const;

/** A world id as the fleet writes it, or undefined. */
export function readWorldId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= WORLD_ID_MAX && WORLD_ID.test(value)
    ? value
    : undefined;
}

/** 1 to 50 world ids, each once, in the order sent; or undefined when it is not that. */
export function readWorldIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > WORLD_IDS_MAX) return undefined;
  const ids = value.map(readWorldId);
  return ids.every((id) => id !== undefined) ? [...new Set(ids)] : undefined;
}
