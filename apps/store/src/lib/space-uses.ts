/**
 * What a community's space uses (the Oracle, 2026-10-14, on a community's
 * page: «aquí tendrías que poder ver las características de tu espacio, lo
 * que estás usando en tu espacio»). The pieces of Numinia a community can
 * use, in the order its page lists them, each with its honest state:
 *
 *   home        its 3D home to enter, and whether its engine answers who is
 *               inside; or no home yet, and whether the house is building it;
 *   gatherings  how many of its dated gatherings are coming;
 *   archive     what its own file says of its archive, or not built yet;
 *   members     what its own file says of its people, or not built yet;
 *   balance     not built yet: the site shows no community's balance.
 *
 * Pure: the page hands it the community, the register's gatherings and the
 * city's commons. Nothing is counted here that the register does not say;
 * who is inside a home is filled in the reader's browser from /api/live.
 */

import {
  ritualsOf,
  sedeDomain,
  upcoming,
  worldOf,
  type Community,
  type Localized,
  type Ritual,
  type World,
} from './communities';

export type PieceId = 'home' | 'gatherings' | 'archive' | 'members' | 'balance';

export type PieceState =
  /** A home to enter; `counted` when its engine answers who is inside. */
  | { readonly kind: 'world'; readonly world: World; readonly counted: boolean }
  /** No home yet; `building` while the house is making it. */
  | { readonly kind: 'no-home'; readonly building: boolean }
  /** How many of its dated gatherings are coming. */
  | { readonly kind: 'coming'; readonly count: number }
  /** What the community's own file says (the founder's archive, its people). */
  | { readonly kind: 'stated'; readonly text: Localized }
  /** Not built yet: the page marks it «en construcción». */
  | { readonly kind: 'building' };

export interface Piece {
  readonly id: PieceId;
  readonly state: PieceState;
}

/** A text the file states, or the mark of a piece not built yet. */
function statedOr(text: Localized | undefined): PieceState {
  return text === undefined ? { kind: 'building' } : { kind: 'stated', text };
}

/** The pieces a community's space uses, each with its state, in the page's order. */
export function spaceUses(
  community: Community,
  rituals: readonly Ritual[],
  commons: World,
  locale: string,
): readonly Piece[] {
  const world = worldOf(community, commons, locale);
  const home: PieceState = world
    ? {
        kind: 'world',
        world,
        counted: community.sede !== undefined && sedeDomain(community.sede.href) !== null,
      }
    : { kind: 'no-home', building: community.homeInProgress };
  return [
    { id: 'home', state: home },
    {
      id: 'gatherings',
      state: { kind: 'coming', count: upcoming(ritualsOf(community.id, rituals)).length },
    },
    { id: 'archive', state: statedOr(community.archive) },
    { id: 'members', state: statedOr(community.people) },
    { id: 'balance', state: { kind: 'building' } },
  ];
}
