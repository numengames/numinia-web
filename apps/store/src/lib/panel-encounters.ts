/**
 * The build-time map the panel's Resumen reads for «Lo próximo» (cut
 * 2026-10-16 «el dinero»): for every organization named in the `team:` of a
 * published community, that community's upcoming encounters, nearest first.
 * Run when the site is built (components/panel/PanelSummary.astro), never in
 * the browser: the island gets the map, not lib/communities.ts.
 *
 * And the lists of the panel's «Encuentros» (v3, carril 5): every encounter
 * of the organization's community, upcoming and held, as its page already
 * shows them — made the same way, for components/panel/PanelGatherings.astro.
 */

import {
  held,
  pick,
  published,
  ritualEndMs,
  ritualStartMs,
  ritualsOf,
  upcoming,
  whenShort,
  yearOf,
  type Community,
  type Ritual,
} from './communities';
import type { EncounterMap } from './panel-summary';

/**
 * The map for one locale: titles in its language, links from `hrefOf`, and
 * only encounters not over at `now` (the day the site is built), `limit` per
 * organization so the island can skip one that ends after the build.
 */
export function encounterMap(
  communities: readonly Community[],
  rituals: readonly Ritual[],
  locale: string,
  hrefOf: (id: string) => string,
  now: Date,
  limit = 3,
): EncounterMap {
  const map: Record<string, EncounterMap[string]> = {};
  for (const community of published(communities)) {
    if (community.team === undefined) continue;
    const ahead = upcoming(ritualsOf(community.id, rituals))
      .filter((ritual) => ritualEndMs(ritual) > now.getTime())
      .slice(0, limit)
      .map((ritual) => ({
        title: pick(ritual.title, locale),
        href: hrefOf(ritual.id),
        startsAt: new Date(ritualStartMs(ritual)).toISOString(),
        endsAt: new Date(ritualEndMs(ritual)).toISOString(),
      }));
    if (ahead.length > 0) map[community.team] = ahead;
  }
  return map;
}

/** One encounter as the panel's «Encuentros» lists it: words already in the page's language. */
export interface GatheringRow {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  /** The community page's own short date (lib/communities.ts `whenShort`). */
  readonly when: string;
  readonly year: number;
  readonly where: string;
}

/** An organization's community and its encounters, upcoming nearest first, held latest first. */
export interface Gatherings {
  readonly community: {
    readonly id: string;
    readonly name: string;
    readonly href: string;
    /** Its calendar to subscribe to (the feed has no locale). */
    readonly calendar: string;
  };
  readonly upcoming: readonly GatheringRow[];
  readonly held: readonly GatheringRow[];
}

/** Per till account, the community it is the organization of. */
export type GatheringsMap = Readonly<Record<string, Gatherings>>;

/**
 * The lists for one locale. Every published community is reached by the
 * account in its `team:` and by the ones `accountsOf` names (the account the
 * house opens for it on first use, lib/community-teams.ts), so a community
 * opened either way finds its encounters. Its upcoming and held are split
 * by the file's `status`, as its own page splits them.
 */
export function gatheringsMap(
  communities: readonly Community[],
  rituals: readonly Ritual[],
  locale: string,
  hrefs: { readonly ritual: (id: string) => string; readonly community: (id: string) => string },
  accountsOf: (communityId: string) => readonly string[],
): GatheringsMap {
  const row = (ritual: Ritual): GatheringRow => ({
    id: ritual.id,
    title: pick(ritual.title, locale),
    href: hrefs.ritual(ritual.id),
    when: whenShort(ritual, locale),
    year: yearOf(ritual),
    where: pick(ritual.where, locale),
  });
  const map: Record<string, Gatherings> = {};
  for (const community of published(communities)) {
    const own = ritualsOf(community.id, rituals);
    const entry: Gatherings = {
      community: {
        id: community.id,
        name: community.name,
        href: hrefs.community(community.id),
        calendar: `/communities/${community.id}/calendar.ics`,
      },
      upcoming: upcoming(own).map(row),
      held: held(own).map(row),
    };
    const accounts = [
      ...(community.team === undefined ? [] : [community.team]),
      ...accountsOf(community.id),
    ];
    for (const account of accounts) map[account] = entry;
  }
  return map;
}
