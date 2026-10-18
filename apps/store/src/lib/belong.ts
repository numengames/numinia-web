/**
 * «Tus comunidades» (/belong/, cut N): the three sections the page paints
 * once the session is in — «Las que llevas» (the organizations where you
 * hold an admin role), «A las que perteneces» (the rest you are in) and «Las
 * que sigues» (the follows the till keeps, minus the two above). Pure: the
 * page hands in the till's answers (`overview`, GET /api/follow, GET
 * /api/mundos/mine) and the facts it baked at build (`belongFacts`), and
 * paints what comes out. Anything out of shape reads as «nothing», never as
 * a wrong list.
 *
 * Imported by the page's script too, so: no zod, no import of server code.
 */

import type { Community, Ritual, World } from './communities';
import {
  monogram,
  nextRitualOf,
  pick,
  placesLine,
  published,
  sedeDomain,
  worldOf,
} from './communities';

/** What a card says about the person's standing in the community. */
export type BelongRole = 'admin' | 'member' | 'follow';

/** The next encounter as a card writes it. */
export interface BelongNext {
  readonly title: string;
  readonly href: string;
  /** `YYYY-MM-DD` or an ISO instant, as the register writes it. */
  readonly start: string;
}

/**
 * A community's static facts, baked into the page at build: one entry per
 * published community, keyed by the ids the till may know it by.
 */
export interface BelongFact {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly cover: { readonly src: string; readonly alt: string } | null;
  readonly monogram: string;
  /** Where it is from, in the page's language. */
  readonly place: string;
  /** The till account ids this community answers to (the register's `team`, and the derived one). */
  readonly accountIds: readonly string[];
  /** Its 3D home, when it has one to enter: the founder keeps the commons. */
  readonly world: World | null;
  /** Whether /api/live counts who is inside its home. */
  readonly counted: boolean;
  readonly next: BelongNext | null;
}

/** One organization of yours, as the till's `overview` lists it. */
export interface BelongOrg {
  readonly id: string;
  readonly name: string;
  readonly role: 'admin' | 'member';
}

/** One card of the page. */
export interface BelongCard {
  /** The community's id when the register knows it; else the organization's account id. */
  readonly key: string;
  readonly name: string;
  readonly role: BelongRole;
  /** The register community behind the card, or null for an organization the register lacks. */
  readonly community: BelongFact | null;
  /** The organization behind the card, or null for a plain follow. */
  readonly accountId: string | null;
  /** The ids of the organization's worlds, the first to «Entrar» through the pass flow. */
  readonly worldIds: readonly string[];
}

export interface BelongGroups {
  readonly lead: readonly BelongCard[];
  readonly member: readonly BelongCard[];
  readonly follow: readonly BelongCard[];
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

/**
 * The facts the page bakes: every published community, with its next
 * encounter when one is in sight, in the register's order. `accountIdOf`
 * is the till's formula for a community's account (lib/community-teams.ts).
 */
export async function belongFacts(
  communities: readonly Community[],
  rituals: readonly Ritual[],
  locale: string,
  prefix: string,
  commons: World,
  accountIdOf: (communityId: string) => Promise<string>,
): Promise<readonly BelongFact[]> {
  return Promise.all(
    published(communities).map(async (community) => {
      const next = nextRitualOf(community.id, rituals);
      const derived = await accountIdOf(community.id);
      const accountIds = community.team ? [community.team, derived] : [derived];
      return {
        id: community.id,
        name: community.name,
        href: `${prefix}/communities/${community.id}/`,
        cover: community.image
          ? { src: community.image.src, alt: pick(community.image.alt, locale) }
          : null,
        monogram: monogram(community.name),
        place: placesLine(community.places, locale),
        accountIds,
        world: worldOf(community, commons, locale) ?? null,
        counted: community.sede !== undefined && sedeDomain(community.sede.href) !== null,
        next: next
          ? {
              title: pick(next.title, locale),
              href: `${prefix}/rituals/${next.id}/`,
              start: next.start,
            }
          : null,
      };
    }),
  );
}

/**
 * The organizations the wallet is in, from GET /api/saldo's body: the teams,
 * never the personal account and never one entered as the house. Null when
 * the body is not an overview.
 */
export function readBelongOrgs(overview: unknown): readonly BelongOrg[] | null {
  if (!isRecord(overview) || !Array.isArray(overview['accounts'])) return null;
  const orgs: BelongOrg[] = [];
  for (const entry of overview['accounts'] as unknown[]) {
    if (!isRecord(entry) || entry['kind'] !== 'team' || entry['as'] === 'house') continue;
    if (!isText(entry['id'])) return null;
    orgs.push({
      id: entry['id'],
      name: isText(entry['name']) ? entry['name'] : entry['id'],
      role: entry['role'] === 'admin' ? 'admin' : 'member',
    });
  }
  return orgs;
}

/** GET /api/follow's body: the ids of the communities followed, or an empty list. */
export function readBelongFollows(body: unknown): readonly string[] {
  if (!isRecord(body) || !Array.isArray(body['mine'])) return [];
  return (body['mine'] as unknown[]).filter(isText);
}

/** GET /api/mundos/mine's body: the world ids by organization, or an empty map. */
export function readBelongWorlds(body: unknown): ReadonlyMap<string, readonly string[]> {
  const worlds = new Map<string, readonly string[]>();
  if (!isRecord(body) || body['ok'] !== true || !Array.isArray(body['communities'])) return worlds;
  for (const team of body['communities'] as unknown[]) {
    if (!isRecord(team) || !isText(team['accountId']) || !Array.isArray(team['worldIds'])) continue;
    worlds.set(team['accountId'], (team['worldIds'] as unknown[]).filter(isText));
  }
  return worlds;
}

const byName = (a: BelongCard, b: BelongCard): number => a.name.localeCompare(b.name, 'es');

/**
 * The three sections: the organizations you administer, the ones you are
 * only in, and the follows that are neither — each community once, the
 * organizations by name, the follows in the register's order.
 */
export function groupBelong(
  orgs: readonly BelongOrg[],
  follows: readonly string[],
  worlds: ReadonlyMap<string, readonly string[]>,
  facts: readonly BelongFact[],
): BelongGroups {
  const lead: BelongCard[] = [];
  const member: BelongCard[] = [];
  const taken = new Set<string>();
  const seenOrgs = new Set<string>();
  for (const org of orgs) {
    if (seenOrgs.has(org.id)) continue;
    seenOrgs.add(org.id);
    const community = facts.find((fact) => fact.accountIds.includes(org.id)) ?? null;
    if (community !== null) {
      if (taken.has(community.id)) continue;
      taken.add(community.id);
    }
    const card: BelongCard = {
      key: community?.id ?? org.id,
      name: community?.name ?? org.name,
      role: org.role,
      community,
      accountId: org.id,
      worldIds: worlds.get(org.id) ?? [],
    };
    (org.role === 'admin' ? lead : member).push(card);
  }
  const wanted = new Set(follows);
  const follow = facts
    .filter((fact) => wanted.has(fact.id) && !taken.has(fact.id))
    .map((fact): BelongCard => ({
      key: fact.id,
      name: fact.name,
      role: 'follow',
      community: fact,
      accountId: null,
      worldIds: [],
    }));
  return { lead: lead.sort(byName), member: member.sort(byName), follow };
}

/** The countdown's words (Countdown.astro's templates, "{n}" the number). */
export interface CountdownWords {
  readonly now: string;
  readonly tomorrow: string;
  readonly days: string;
  readonly weeks: string;
  readonly months: string;
  readonly held: string;
}

/** «ahora» / «mañana» / «en N días» / «en N semanas» / «en N meses» / «celebrado», as Countdown.astro says it. */
export function countdownLine(days: number, words: CountdownWords): string {
  if (days < 0) return words.held;
  if (days === 0) return words.now;
  if (days === 1) return words.tomorrow;
  if (days < 14) return words.days.replace('{n}', String(days));
  if (days < 60) return words.weeks.replace('{n}', String(Math.round(days / 7)));
  return words.months.replace('{n}', String(Math.round(days / 30)));
}

/**
 * Whole days from today to a start (`YYYY-MM-DD` or an ISO instant), on the
 * reader's clock, UTC day to UTC day as Countdown.astro counts; null when
 * the start cannot be read.
 */
export function daysUntil(start: string, now: Date): number | null {
  const ms = start.length === 10 ? Date.parse(`${start}T00:00:00Z`) : Date.parse(start);
  if (Number.isNaN(ms)) return null;
  const day = new Date(ms);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const then = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return Math.round((then - today) / 864e5);
}
