/**
 * The build-time map the panel's Resumen reads for «Lo próximo» (cut
 * 2026-10-16 «el dinero»): for every organization named in the `team:` of a
 * published community, that community's upcoming encounters, nearest first.
 * Run when the site is built (components/panel/PanelSummary.astro), never in
 * the browser: the island gets the map, not lib/communities.ts.
 */

import {
  pick,
  published,
  ritualEndMs,
  ritualStartMs,
  ritualsOf,
  upcoming,
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
