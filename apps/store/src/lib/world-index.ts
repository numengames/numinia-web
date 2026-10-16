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
}

/** What a world card draws. */
export interface WorldCard {
  readonly id: string;
  readonly name: string;
  readonly state: WorldState | null;
  /** People inside now, as the world itself counts them; null when it did not say. */
  readonly inside: number | null;
  /** The world's own picture (served by the world), or null: the card draws the placeholder scene. */
  readonly cover: string | null;
  /** Where the world is served, the guest link «Entrar» falls back to; null when unknown. */
  readonly url: string | null;
  /** The community it belongs to: its register id when the register has it. */
  readonly community: { readonly id: string | null; readonly name: string };
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
 * The cards of the index: every placed world the fleet has (once each, the
 * first listing wins), never one being deleted — the ones with people
 * first, then the city's, then by name.
 */
export function worldCards(input: {
  readonly fleet: readonly FleetEntry[];
  readonly owners: ReadonlyMap<string, WorldOwner | null>;
  readonly communities: readonly CommunityAccounts[];
  readonly inside?: Readonly<Record<string, number | null>>;
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
    const counted = input.inside?.[entry.id];
    const inside = typeof counted === 'number' ? counted : null;
    const face = faceOf(input.faces?.[entry.id], entry.domain);
    cards.push({
      id: entry.id,
      name: face.title ?? entry.id,
      state: worldState(entry.phase, inside),
      inside,
      cover: face.image,
      url: entry.domain === null ? null : `https://${entry.domain}/`,
      community: community
        ? { id: community.id, name: community.name }
        : { id: null, name: owner.accountName },
      city: community?.founder === true,
    });
  }
  return cards.sort(
    (a, b) =>
      (b.inside ?? 0) - (a.inside ?? 0) ||
      Number(b.city) - Number(a.city) ||
      a.name.localeCompare(b.name, 'es'),
  );
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
