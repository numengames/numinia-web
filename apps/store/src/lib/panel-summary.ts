/**
 * The panel's Resumen (cut 2026-10-16 «el dinero»): what its four cards and
 * «Lo último» work out from the answers they read — the next encounter of
 * the organization's community (from a map built with the site), the worlds
 * with a charge, the people and the roles shown apart, and the newest
 * entries of the log merged with the top-ups. Pure: no fetch, no DOM, no
 * zod, so the island imports it and it is tested to the per-file bar.
 */

import type { DeskLine, DeskLogLine, DeskRoles, DeskWorld } from './accounts';

/** An encounter as the Resumen is handed it when the site is built. */
interface Encounter {
  readonly title: string;
  readonly href: string;
  /** Instants in UTC (ISO 8601); a whole-day encounter starts at 00:00 and ends the day after its last. */
  readonly startsAt: string;
  readonly endsAt: string;
}

/** Per organization id, its community's upcoming encounters, nearest first. */
export type EncounterMap = Readonly<Record<string, readonly Encounter[]>>;

/** The next encounter, and when: going on now, or in so many days (at least one). */
export type NextEncounter =
  | { readonly encounter: Encounter; readonly when: 'now' }
  | { readonly encounter: Encounter; readonly when: 'soon'; readonly days: number };

const DAY_MS = 86_400_000;

/**
 * The first of the organization's encounters not over yet at `now` — the
 * map was built with the site, so one that has ended since never shows —
 * or null when none is in sight.
 */
export function nextEncounter(map: EncounterMap, team: string, now: Date): NextEncounter | null {
  const at = now.getTime();
  const encounter = (map[team] ?? []).find((entry) => Date.parse(entry.endsAt) > at);
  if (encounter === undefined) return null;
  const start = Date.parse(encounter.startsAt);
  return start <= at
    ? { encounter, when: 'now' }
    : { encounter, when: 'soon', days: Math.ceil((start - at) / DAY_MS) };
}

/** One entry of «Lo último»: a line of the organization's log, or a top-up of its statement. */
export type LatestEntry =
  | { readonly kind: 'log'; readonly at: string; readonly line: DeskLogLine }
  | { readonly kind: 'topup'; readonly at: string; readonly amountCents: number };

/**
 * The newest `limit` entries, newest first, merging the log (null when the
 * person may not read it) and the statement's top-ups (null when the person
 * may not read the balance).
 */
export function latestOf(
  log: readonly DeskLogLine[] | null,
  lines: readonly DeskLine[] | null,
  limit = 5,
): LatestEntry[] {
  const entries: LatestEntry[] = [
    ...(log ?? []).map((line): LatestEntry => ({ kind: 'log', at: line.at, line })),
    ...(lines ?? [])
      .filter((line) => line.kind === 'topup')
      .map((line): LatestEntry => ({ kind: 'topup', at: line.at, amountCents: line.amountCents })),
  ];
  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

/** How many worlds cost something in the statement's range; null when the till does not say. */
export function chargedWorlds(worlds: readonly DeskWorld[] | undefined): number | null {
  return worlds === undefined ? null : worlds.filter((world) => world.cents > 0).length;
}

/** A role shown apart in the list of people, with how many hold it. */
interface HoistedRole {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly members: number;
}

/** The people of an organization: how many, and the roles shown apart, top down. */
export interface People {
  readonly members: number;
  readonly hoisted: readonly HoistedRole[];
}

export function peopleOf(view: DeskRoles): People {
  return {
    members: view.members.length,
    hoisted: view.roles
      .filter((role) => role.hoist)
      .map(({ id, name, color, members }) => ({ id, name, color, members })),
  };
}
