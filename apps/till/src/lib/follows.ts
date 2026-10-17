/**
 * «Seguir» for real (cut «Seguir», 2026-10-17), the pure part: what
 * numinia.com sends to say someone follows a community — a community id, or
 * a list of them to count — read as untrusted, and the words of its refusals.
 * Pure — no database. A malformed field is a problem in words, never a throw.
 */

import { readCommunityId } from './community-teams';

/** The most community ids one count asks for at once: a page of cards, not the whole register. */
export const FOLLOW_COUNT_MAX = 100;

export const FOLLOW_PROBLEMS = {
  communityId:
    'communityId must be 1 to 63 characters: lowercase letters, digits and hyphens, not starting with a hyphen',
  communityIds: `communityIds must be a list of 0 to ${FOLLOW_COUNT_MAX} community ids`,
} as const;

/** A list of community ids to count, duplicates dropped, or undefined when any is not one. */
export function readCommunityIds(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length > FOLLOW_COUNT_MAX) return undefined;
  const ids: string[] = [];
  for (const entry of value) {
    const id = readCommunityId(entry);
    if (id === undefined) return undefined;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
