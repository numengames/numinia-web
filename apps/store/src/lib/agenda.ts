/**
 * «Tu agenda» (cut F, 2026-10-17), the pure part: the encounters a person
 * said they are going to, split into what is still to come — soonest first —
 * and what already happened — latest first, folded on the page. An id the
 * register no longer has (a file renamed or withdrawn) is dropped: the page
 * shows real encounters or nothing, never an id.
 */

import { ritualEndMs, ritualStartMs, type Ritual } from './communities';

export interface Agenda {
  readonly upcoming: readonly Ritual[];
  readonly past: readonly Ritual[];
}

/** Over once it is marked held, or once its last instant is behind `now`. */
export function isPast(ritual: Ritual, now: Date): boolean {
  return ritual.status === 'held' || ritualEndMs(ritual) < now.getTime();
}

/** The agenda of the ids the till keeps for a wallet, against the register. */
export function agendaOf(
  ritualIds: readonly string[],
  rituals: readonly Ritual[],
  now: Date,
): Agenda {
  const wanted = new Set(ritualIds);
  const mine = rituals.filter((ritual) => wanted.has(ritual.id));
  const bySoonest = (a: Ritual, b: Ritual): number =>
    ritualStartMs(a) - ritualStartMs(b) || a.id.localeCompare(b.id);
  return {
    upcoming: mine.filter((ritual) => !isPast(ritual, now)).sort(bySoonest),
    past: mine.filter((ritual) => isPast(ritual, now)).sort((a, b) => bySoonest(b, a)),
  };
}
