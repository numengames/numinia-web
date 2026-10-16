/**
 * «El panel» (/panel/): an organization's panel — the pieces of its rail,
 * the organization chosen in the address (`?org=<account id>`: nothing is
 * stored, so a link carries the choice) and what the person is in it.
 *
 * Pure: no fetch, no env, no zod, no DOM. The island imports it, and zod in
 * an island breaks the bundle budget; the till's answers are read by
 * lib/accounts.ts, this only shapes what the panel draws from them.
 *
 * It does not import lib/app-nav.ts, on purpose: the sidebar's inline script
 * does, and a module that an island shares with an inline script is split
 * into a chunk of its own — which takes that script out of the landing's
 * HTML (scripts/bundle-budget.mjs: the landing ships no external JS). So
 * the two paths this needs are stated here, and panel.test.ts holds them to
 * app-nav's (PANEL_PATH, localeHref).
 */

import type { SupportedLocale } from '@numinia/domain';
import type { DeskRole, DeskRoles } from './accounts';

/** The panel's root (lib/app-nav.ts's PANEL_PATH: a test keeps them one). */
const ROOT = '/panel/';

/** A locale-free path as the visitor's locale serves it, English at the root (app-nav's localeHref). */
function localized(locale: SupportedLocale, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

/** Phosphor regular icons the pieces draw (all of them already in the site's icon set). */
export type PieceIcon =
  | 'house'
  | 'buildings'
  | 'calendar-blank'
  | 'users-three'
  | 'shield-check'
  | 'robot'
  | 'scroll'
  | 'package'
  | 'coins'
  | 'gear'
  | 'users'
  | 'planet';

/** A screen of the panel, one of the rooms of the LAP, or a piece still to be built. */
type PieceKind = 'built' | 'soon' | 'room';

/** The screens that exist: the face a page of the panel draws. */
export type BuiltPiece =
  'summary' | 'venues' | 'members' | 'gente' | 'roles' | 'agents' | 'balance' | 'settings';
/** The pieces still to be built: drawn under construction, never a link. */
export type SoonPiece = 'gatherings' | 'memory' | 'bazaar';
/** The Oracle's rooms, the LAP's own. */
export type RoomPiece = 'census' | 'worlds' | 'prices' | 'assets';
/** The organization's own eleven pieces. */
export type OrgPiece = BuiltPiece | SoonPiece;
type PieceId = OrgPiece | RoomPiece;

export interface Piece {
  readonly id: PieceId;
  readonly kind: PieceKind;
  /** Without the locale prefix; null while the piece is not built, so there is no link to fail. */
  readonly path: string | null;
  readonly icon: PieceIcon;
}

/**
 * One of the organization's eleven pieces: a built one has its address, one
 * not built has none — so narrowing on `kind` also names the words that
 * describe it (a built screen's lead, a coming piece's note).
 */
export type OrgEntry =
  | (Piece & { readonly id: BuiltPiece; readonly kind: 'built'; readonly path: string })
  | (Piece & { readonly id: SoonPiece; readonly kind: 'soon'; readonly path: null });

/** One of the Oracle's four rooms. */
export interface RoomEntry extends Piece {
  readonly id: RoomPiece;
}

/**
 * The organization's eleven pieces, in the order of the prototype (the working
 * ones are drawn among the rest). Eight are built, with Spanish slugs like
 * Saldo's — Roles right under Miembros, as the prototype has them, Ajustes
 * last; three are drawn under construction and lead nowhere.
 */
export const PIECES: readonly OrgEntry[] = [
  { id: 'summary', kind: 'built', path: ROOT, icon: 'house' },
  { id: 'venues', kind: 'built', path: `${ROOT}sedes/`, icon: 'buildings' },
  { id: 'gatherings', kind: 'soon', path: null, icon: 'calendar-blank' },
  { id: 'members', kind: 'built', path: `${ROOT}miembros/`, icon: 'users-three' },
  { id: 'roles', kind: 'built', path: `${ROOT}roles/`, icon: 'shield-check' },
  { id: 'gente', kind: 'built', path: `${ROOT}gente/`, icon: 'users' },
  { id: 'agents', kind: 'built', path: `${ROOT}agentes/`, icon: 'robot' },
  { id: 'memory', kind: 'soon', path: null, icon: 'scroll' },
  { id: 'bazaar', kind: 'soon', path: null, icon: 'package' },
  { id: 'balance', kind: 'built', path: `${ROOT}saldo/`, icon: 'coins' },
  { id: 'settings', kind: 'built', path: `${ROOT}ajustes/`, icon: 'gear' },
];

/**
 * The Oracle's rooms: the LAP's own, signposted from here and shown only to
 * the Oracle (the endpoint behind each one is the lock). They belong to the
 * city, not to an organization, so their addresses carry no `?org=`.
 */
export const ROOMS: readonly RoomEntry[] = [
  { id: 'census', kind: 'room', path: '/lap/admin/census/', icon: 'users' },
  { id: 'worlds', kind: 'room', path: '/lap/admin/worlds/', icon: 'planet' },
  { id: 'prices', kind: 'room', path: '/lap/admin/prices/', icon: 'coins' },
  { id: 'assets', kind: 'room', path: '/lap/admin/assets/', icon: 'package' },
];

/** The address names the organization here. */
export const ORG_PARAM = 'org';

/** What an account id looks like (`acc_t_…`): anything else in the address is not one. */
const ORG_SHAPE = /^[A-Za-z0-9_-]{1,64}$/;

/** The organization the address (`location.search`) names, or null. */
export function orgFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get(ORG_PARAM);
  return value !== null && ORG_SHAPE.test(value) ? value : null;
}

/** An address's query with the organization set, the rest of it kept (leading `?`). */
export function searchWithOrg(search: string, org: string): string {
  const params = new URLSearchParams(search);
  params.set(ORG_PARAM, org);
  return `?${params.toString()}`;
}

/**
 * Where a piece leads, under the visitor's locale: a screen of the panel
 * keeps the organization, a room of the LAP does not, a piece not built
 * leads nowhere. One helper for every link, the organization encoded.
 */
export function pieceHref(
  locale: SupportedLocale,
  piece: Piece,
  org: string | null,
): string | null {
  if (piece.path === null) return null;
  const href = localized(locale, piece.path);
  return piece.kind === 'built' && org !== null
    ? `${href}?${ORG_PARAM}=${encodeURIComponent(org)}`
    : href;
}

/** The organization to show: the one asked for if it is among the person's, else the first, else none. */
export function chooseTeam<T extends { readonly id: string }>(
  teams: readonly T[],
  wanted: string | null,
): T | null {
  return teams.find((team) => team.id === wanted) ?? teams[0] ?? null;
}

/** The letters of an organization's avatar: the first of its first two words, or two of one word. */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/u).filter((word) => word !== '');
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((word) => Array.from(word)[0])
      : Array.from(words.join('')).slice(0, 2);
  return letters.join('').toUpperCase();
}

/** What the person is in an organization, as the desk says it, and the roles they hold there. */
export interface Standing {
  readonly as: DeskRoles['as'];
  /** Besides the base role every member has, from the top down. */
  readonly roles: readonly DeskRole[];
}

export function standingIn(view: DeskRoles, you: string | null): Standing {
  const wallet = you?.toLowerCase();
  const member = view.members.find((entry) => entry.wallet.toLowerCase() === wallet);
  return {
    as: view.as,
    roles:
      member === undefined ? [] : view.roles.filter((role) => member.roleIds.includes(role.id)),
  };
}
