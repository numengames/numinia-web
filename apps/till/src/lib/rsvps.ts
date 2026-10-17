/**
 * «Me apunto» for real (cut «Tu agenda», 2026-10-17), the pure part: what
 * numinia.com sends to say someone is going to an encounter («encuentro»,
 * code `ritual`) — a ritual id, or a list of them to count — read as
 * untrusted, and the words of its refusals. Pure — no database. A malformed
 * field is a problem in words, never a throw.
 */

/** The longest ritual id: the slug of the encounter's file on numinia.com. */
export const RITUAL_ID_MAX = 100;

/** The most ritual ids one count asks for at once: a month list, not the whole archive. */
export const RSVP_COUNT_MAX = 100;

export const RSVP_PROBLEMS = {
  ritualId: `ritualId must be a lowercase slug of ${RITUAL_ID_MAX} characters at most`,
  ritualIds: `ritualIds must be a list of 0 to ${RSVP_COUNT_MAX} lowercase slugs`,
} as const;

const RITUAL_ID = /^[a-z0-9-]{1,100}$/;

/** A ritual id as numinia.com names its files, or undefined when it is not one. */
export function readRitualId(value: unknown): string | undefined {
  return typeof value === 'string' && RITUAL_ID.test(value) ? value : undefined;
}

/** A list of ritual ids to count, duplicates dropped, or undefined when any is not one. */
export function readRitualIds(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length > RSVP_COUNT_MAX) return undefined;
  const ids: string[] = [];
  for (const entry of value) {
    const id = readRitualId(entry);
    if (id === undefined) return undefined;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
