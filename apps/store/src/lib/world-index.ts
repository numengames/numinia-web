/**
 * The index of the city's 3D worlds (/mundos/, v3 «Ahora y Mundos», cut C):
 * which worlds it lists and what each world card says — the one card every
 * screen shares (the index, a world's own page). Only what the data holds:
 * the fleet says a world's phase and address, the till says whose it is
 * (lib/worlds-homes.ts, the public `homeOf`), each world's own `/status`
 * says how many are inside and its own page its title and picture
 * (lib/worlds-source.ts). A fact nobody said is left out, never guessed:
 * no capacity (no source has it), no «who may enter» (only the world's
 * organization reads its roles).
 *
 * A world is public here once the house has placed it in a community
 * (cut «Mundos ↔ organizaciones»); one nobody has placed yet, or one being
 * deleted, is not listed. Pure: the page hands in what it read.
 */

import type { DoorPhase } from './fleet';
import type { WorldFace } from './worlds';

/** A world's state on its card: on, off or under works — only these three. */
export type WorldState = 'on' | 'off' | 'works';

/** A world as the fleet lists it; `phase` is null for a world run by hand (it says none). */
export interface FleetEntry {
  readonly id: string;
  readonly phase: DoorPhase | null;
  readonly domain: string | null;
}

/** Whose a world is, as the till answers it. */
export interface WorldOwner {
  readonly accountId: string;
  readonly accountName: string;
}

/** A community of the register as the index matches it: the till accounts that are its own. */
export interface CommunityAccounts {
  readonly id: string;
  readonly name: string;
  readonly founder: boolean;
  /** Its `team:` and the account the till derives from its id. */
  readonly accounts: readonly string[];
  /** Its own picture (the register's `image`), worn by its worlds that serve none. */
  readonly image?: string | null;
}

/** What a world card draws. */
export interface WorldCard {
  readonly id: string;
  readonly name: string;
  readonly state: WorldState | null;
  /** People inside now, as the world itself counts them; null when it did not say. */
  readonly inside: number | null;
  /** AIs inside now, as the world itself counts them; null when it did not say (an older engine). */
  readonly ais: number | null;
  /** The world's own picture (served by the world), or null: the card draws the placeholder scene. */
  readonly cover: string | null;
  /** Where the world is served, the guest link «Entrar» falls back to; null when unknown. */
  readonly url: string | null;
  /** The community it belongs to: always one of the register's, with its page. */
  readonly community: { readonly id: string; readonly name: string };
  /** A world of the city: the founder's, kept for everyone. */
  readonly city: boolean;
}

/** The index's filters, in the order the chips show them. */
export type WorldFilter = 'all' | 'people' | 'city' | 'communities';

const WORKS: readonly DoorPhase[] = ['creating', 'importing', 'uploading', 'updating'];

/**
 * The state a card says. A world run by hand names no phase: it is «on» only
 * when its own `/status` answered; a world starting or stopping says none.
 */
export function worldState(phase: DoorPhase | null, inside: number | null): WorldState | null {
  if (phase === 'running') return 'on';
  if (phase === 'stopped') return 'off';
  if (phase !== null && WORKS.includes(phase)) return 'works';
  return phase === null && inside !== null ? 'on' : null;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';

/**
 * The till's public `homeOf` answer → the world's owner, null for a world
 * nobody placed, undefined for an answer that is not that (a refusal, a
 * wrong shape): the index then leaves the world out.
 */
export function readOwner(raw: unknown): WorldOwner | null | undefined {
  if (!isRecord(raw) || raw.ok !== true) return undefined;
  if (raw.home === null) return null;
  if (!isRecord(raw.home) || !isText(raw.home.accountId) || !isText(raw.home.accountName)) {
    return undefined;
  }
  return { accountId: raw.home.accountId, accountName: raw.home.accountName };
}

/** A picture the world serves itself, or a title it states; anything else is dropped. */
function faceOf(face: WorldFace | undefined, domain: string | null): WorldFace {
  if (face === undefined || domain === null) return { title: null, image: null };
  const image = face.image?.startsWith(`https://${domain}/`) === true ? face.image : null;
  return { title: face.title, image };
}

/**
 * The picture a world of the room wears when it has none of its own: the
 * one of the community whose account holds it (`covers`: account id →
 * picture, from the register), else none.
 */
export function communityCover(
  accountId: string | null | undefined,
  covers: Readonly<Record<string, string>> | undefined,
): string | null {
  if (accountId === null || accountId === undefined || covers === undefined) return null;
  return Object.hasOwn(covers, accountId) ? (covers[accountId] ?? null) : null;
}

/**
 * A world's name when no better one was said: its own id read as words
 * («agora-plaza» → «Agora Plaza», «alchemiststower» → «Alchemiststower»).
 * A screen never prints a raw slug; an id with nothing to read in it keeps
 * its id, which is still better than an empty heading.
 */
export function readableWorldName(id: string): string {
  const words = id
    .split(/[-_]+/)
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.length === 0 ? id : words.join(' ');
}

/**
 * A world's name as every screen says it: the title the world states of
 * itself, else its id read as words — the index's card and the world's own
 * heading say the same thing, because both ask this.
 */
export function worldName(title: string | null, id: string): string {
  return title ?? readableWorldName(id);
}

/**
 * The cards of the index: every placed world the fleet has (once each, the
 * first listing wins), never one being deleted — the ones that are off go
 * last; among the rest, the ones with people first, then the city's, then
 * by name.
 *
 * Public means placed in a community of the register: a world the till
 * gives no owner, or whose owner is no community of the city, is an
 * internal one and is left out.
 */
export function worldCards(input: {
  readonly fleet: readonly FleetEntry[];
  readonly owners: ReadonlyMap<string, WorldOwner | null>;
  readonly communities: readonly CommunityAccounts[];
  readonly inside?: Readonly<Record<string, number | null>>;
  readonly ais?: Readonly<Record<string, number | null>>;
  readonly faces?: Readonly<Record<string, WorldFace>>;
}): readonly WorldCard[] {
  const seen = new Set<string>();
  const cards: WorldCard[] = [];
  for (const entry of input.fleet) {
    if (seen.has(entry.id) || entry.phase === 'deleting') continue;
    seen.add(entry.id);
    const owner = input.owners.get(entry.id);
    if (owner === null || owner === undefined) continue;
    const community = input.communities.find((candidate) =>
      candidate.accounts.includes(owner.accountId),
    );
    if (community === undefined) continue;
    const counted = input.inside?.[entry.id];
    const inside = typeof counted === 'number' ? counted : null;
    const aisCounted = input.ais?.[entry.id];
    const face = faceOf(input.faces?.[entry.id], entry.domain);
    cards.push({
      id: entry.id,
      name: worldName(face.title, entry.id),
      state: worldState(entry.phase, inside),
      inside,
      ais: inside !== null && typeof aisCounted === 'number' ? aisCounted : null,
      cover: face.image ?? community.image ?? null,
      url: entry.domain === null ? null : `https://${entry.domain}/`,
      community: { id: community.id, name: community.name },
      city: community.founder,
    });
  }
  return cards.sort(
    (a, b) =>
      Number(a.state === 'off') - Number(b.state === 'off') ||
      (b.inside ?? 0) - (a.inside ?? 0) ||
      Number(b.city) - Number(a.city) ||
      a.name.localeCompare(b.name, 'es'),
  );
}

/**
 * «3 dentro ahora» → «3 dentro ahora · 1 IA»: the AIs inside, after the
 * people. Nothing is added while there are none or the world did not say
 * (an older engine): the line stays as it was.
 */
export function withAis(
  text: string,
  ais: number | null,
  words: { readonly one: string; readonly many: string },
): string {
  if (ais === null || ais <= 0) return text;
  return `${text} · ${ais === 1 ? words.one : words.many.replace('{n}', String(ais))}`;
}

/** The filters a card answers to (always «all»). */
export function filtersOf(card: WorldCard): readonly WorldFilter[] {
  return [
    'all',
    ...((card.inside ?? 0) > 0 ? (['people'] as const) : []),
    card.city ? ('city' as const) : ('communities' as const),
  ];
}

/**
 * The index's chips with their counts: «all» always; each other only when
 * some card answers to it — a chip of nothing is never drawn.
 */
export function worldFilters(
  cards: readonly WorldCard[],
): readonly { readonly id: WorldFilter; readonly count: number }[] {
  const order: readonly WorldFilter[] = ['all', 'people', 'city', 'communities'];
  return order
    .map((id) => ({ id, count: cards.filter((card) => filtersOf(card).includes(id)).length }))
    .filter((chip) => chip.id === 'all' || chip.count > 0);
}
