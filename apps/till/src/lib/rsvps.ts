/**
 * «Me apunto» for real (cut «Tu agenda», 2026-10-17), the pure part: what
 * numinia.com sends to say someone is going to an encounter («encuentro»,
 * code `ritual`) — a ritual id, or a list of them to count — read as
 * untrusted, and the words of its refusals. Pure — no database. A malformed
 * field is a problem in words, never a throw.
 *
 * Since cut O (2026-10-18) an id is either the slug of the encounter's file
 * on numinia.com or the id of an encounter published from the city into the
 * till's own table (`rit_` + 16 hex, migration 0015). Which one it is
 * matters to the database layer: a till id must name a live encounter.
 */

import { readTillRitualId } from './rituals';

/** The longest ritual id: the slug of the encounter's file on numinia.com. */
export const RITUAL_ID_MAX = 100;

/** The most ritual ids one count asks for at once: a month list, not the whole archive. */
export const RSVP_COUNT_MAX = 100;

export const RSVP_PROBLEMS = {
  ritualId: `ritualId must be a lowercase slug of ${RITUAL_ID_MAX} characters at most, or an encounter id of the till (rit_ and 16 hex)`,
  ritualIds: `ritualIds must be a list of 0 to ${RSVP_COUNT_MAX} lowercase slugs or till encounter ids`,
  noSuchRitual: 'no such encounter in the till, or it is cancelled',
} as const;

const FILE_RITUAL_ID = /^[a-z0-9-]{1,100}$/;

/** A ritual id as numinia.com names its files or as the till names its own, or undefined when it is neither. */
export function readRitualId(value: unknown): string | undefined {
  if (typeof value === 'string' && FILE_RITUAL_ID.test(value)) return value;
  return readTillRitualId(value);
}

/** Whether a ritual id (already read) names an encounter of the till's own table rather than a file. */
export function isTillRitualId(id: string): boolean {
  return readTillRitualId(id) !== undefined;
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
