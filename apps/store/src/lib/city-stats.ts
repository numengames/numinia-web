/**
 * «La ciudad» in the LAP's statistics (the Oracle, 2026-10-14: «las
 * estadísticas… deberían de ser las de Numinia»): the city's own figures,
 * counted when the site is built from the same register the communities
 * pages read (components/communities/register.ts), plus how many people are
 * inside the homes right now, summed in the browser from /api/live — the
 * answer the communities pages already use for their «N dentro».
 *
 * Pure: no glob, no fetch. No invented numbers: a count is what the register
 * holds, and «inside» is only what the homes answered.
 */

import { published, upcoming, type Community, type Ritual } from './communities';

export interface CityStats {
  /** Communities on the site. */
  readonly communities: number;
  /** Encounters still to come, across the published communities. */
  readonly upcoming: number;
  /** Published communities with a 3D home of their own (a `sede`). */
  readonly sedes: number;
}

/** The city's figures from the register (communities and their encounters). */
export function cityStats(register: readonly Community[], rituals: readonly Ritual[]): CityStats {
  const shown = published(register);
  const shownIds = new Set(shown.map((community) => community.id));
  return {
    communities: shown.length,
    upcoming: upcoming(rituals).filter((ritual) => shownIds.has(ritual.community)).length,
    sedes: shown.filter((community) => community.sede !== undefined).length,
  };
}

/**
 * Everyone inside the homes right now, from /api/live's `inside` map (a
 * number per home, null when a home did not answer). A home that did not
 * answer adds nothing; when no home answered at all the total is unknown
 * (null), never a made-up zero.
 */
export function insideTotal(inside: unknown): number | null {
  if (typeof inside !== 'object' || inside === null) return null;
  const counts = Object.values(inside).filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  );
  return counts.length === 0 ? null : counts.reduce((sum, n) => sum + n, 0);
}
