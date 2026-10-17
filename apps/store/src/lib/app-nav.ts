/**
 * The app's navigation (numinia.com v3, «La ciudad y tú»): two mirrored
 * rails — on the left the city (what is everyone's), on the right you (what
 * is yours), each item with its twin on the other side — and, on a phone,
 * a bottom bar with four places of the city and «Tú». Pure: a path in, an
 * answer out; the chrome components only draw it.
 *
 * Paths are written without the locale prefix (BaseLayout's `basePath`);
 * `localeHref` adds it. Both rails and the phone's bar read these lists, so
 * a place can never be in one and missing from another.
 */

import type { SupportedLocale } from '@numinia/domain';

/** The city's five places, in the left rail's order. */
export type CityId = 'now' | 'communities' | 'encounters' | 'worlds' | 'bazaar';

/** What is yours, in the right rail's order (each the twin of a city place). */
export type YouId = 'notices' | 'your-communities' | 'agenda' | 'worlds' | 'balance' | 'loot';

/** Phosphor regular icons the places use; the current one draws its fill. */
export type PlaceIcon =
  | 'broadcast'
  | 'users-three'
  | 'calendar-blank'
  | 'planet'
  | 'storefront'
  | 'bell'
  | 'coins'
  | 'backpack';

export interface Place<Id extends string> {
  readonly id: Id;
  readonly path: string;
  readonly icon: PlaceIcon;
  /** The addresses this place lights beyond its own (as a section). */
  readonly sections: readonly string[];
  /** Shown only with a session (the balance: in v3 it moves into «Tus mundos»). */
  readonly signedInOnly?: boolean;
}

/** The notifications page: «Avisos» in the right rail. */
export const NOTIFICATIONS_PATH = '/notifications/';

/** The organization panel (the face menu's «Paneles»): «Tus comunidades»' section. */
export const PANEL_PATH = '/panel/';

/** «Tu agenda»: the encounters you said you are going to. */
export const AGENDA_PATH = '/agenda/';

/** «Tus mundos»: the worlds of the communities you belong to. */
export const MY_WORLDS_PATH = '/mis-mundos/';

export const CITY_ITEMS: readonly Place<CityId>[] = [
  // «Ahora» is the front page; /live/ (the homes with people in) belongs to it.
  { id: 'now', path: '/', icon: 'broadcast', sections: ['/live/'] },
  { id: 'communities', path: '/communities/', icon: 'users-three', sections: ['/communities/'] },
  {
    id: 'encounters',
    path: '/calendar/',
    icon: 'calendar-blank',
    sections: ['/calendar/', '/rituals/'],
  },
  { id: 'worlds', path: '/mundos/', icon: 'planet', sections: ['/mundos/'] },
  // The object pages of the Bazar still live under /archive/<id>/.
  { id: 'bazaar', path: '/bazaar/', icon: 'storefront', sections: ['/bazaar/', '/archive/'] },
];

export const YOU_ITEMS: readonly Place<YouId>[] = [
  { id: 'notices', path: NOTIFICATIONS_PATH, icon: 'bell', sections: [NOTIFICATIONS_PATH] },
  {
    id: 'your-communities',
    path: '/belong/',
    icon: 'users-three',
    sections: ['/belong/', PANEL_PATH],
  },
  // «Tu agenda» and «Tus mundos» (cut I): the twins of Encuentros and Mundos, with their icons.
  { id: 'agenda', path: AGENDA_PATH, icon: 'calendar-blank', sections: [AGENDA_PATH] },
  { id: 'worlds', path: MY_WORLDS_PATH, icon: 'planet', sections: [MY_WORLDS_PATH] },
  { id: 'balance', path: '/saldo/', icon: 'coins', sections: ['/saldo/'], signedInOnly: true },
  { id: 'loot', path: '/lap/loot/', icon: 'backpack', sections: ['/lap/loot/'] },
];

/** The phone's bottom bar: four places of the city, then «Tú» (the Bazar goes up to the header). */
export const PHONE_ITEMS: readonly Place<CityId>[] = CITY_ITEMS.filter(
  (item) => item.id !== 'bazaar',
);

/** «Crear», the twin of «Buscar»: only destinations that exist. */
export type CreateId = 'community';

export interface CreateItem {
  readonly id: CreateId;
  readonly path: string;
  readonly icon: 'house';
}

/** Encounters (the panel's piece is `soon`) and worlds (no create page) are not here yet. */
export const CREATE_ITEMS: readonly CreateItem[] = [
  { id: 'community', path: '/how-it-works/#open', icon: 'house' },
];

/** The search lives on the communities index until the global search dialog. */
export const SEARCH_PATH = '/communities/';

/** The door: the LAP's sign-in page. */
export const SIGN_IN_PATH = '/lap/session/';

/** The person's settings (the right rail's foot). */
export const SETTINGS_PATH = '/lap/settings/';

/** Your card (the face menu's «Perfil», the phone sheet's head). */
export const PROFILE_PATH = '/lap/';

/** «Cómo funciona», at the left rail's foot. */
export const HOW_PATH = '/how-it-works/';

/**
 * Where a place stands from a page: `page` on its own address, `section`
 * when the page sits inside it, `null` elsewhere. The chrome draws the
 * fill icon for both and sets aria-current to "page" or "true".
 */
export type NavState = 'page' | 'section' | null;

export function navState(item: Place<string>, path: string): NavState {
  if (path === item.path) return 'page';
  return item.sections.some((prefix) => path.startsWith(prefix)) ? 'section' : null;
}

/** The aria-current value of a state (undefined drops the attribute). */
export function ariaCurrent(state: NavState): 'page' | 'true' | undefined {
  if (state === 'page') return 'page';
  return state === 'section' ? 'true' : undefined;
}

/** The icon a place draws: its fill while the page is in it, else the regular one. */
export function navIcon(item: Place<string>, state: NavState): PlaceIcon | `${PlaceIcon}-fill` {
  return state === null ? item.icon : `${item.icon}-fill`;
}

/** The pages that are yours: the phone marks «Tú» current on them. */
const PERSONAL_PATHS: readonly string[] = [
  NOTIFICATIONS_PATH,
  '/belong/',
  AGENDA_PATH,
  MY_WORLDS_PATH,
  '/saldo/',
  PROFILE_PATH,
  PANEL_PATH,
];

export function isPersonal(path: string): boolean {
  return PERSONAL_PATHS.some((prefix) => path.startsWith(prefix));
}

/** A locale-free path as the visitor's locale serves it (English at the root). */
export function localeHref(locale: SupportedLocale, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

/** The door, asking to come back to the page it was opened from
    (`?vuelta=`; the sign-in page itself needs no way back to itself). */
export function signInHref(locale: SupportedLocale, basePath: string): string {
  const door = localeHref(locale, SIGN_IN_PATH);
  if (basePath === SIGN_IN_PATH) return door;
  return `${door}?vuelta=${encodeURIComponent(localeHref(locale, basePath))}`;
}

/** The one way out: the sign-in page signs out (it alone holds the wallet
    code that must disconnect first) and takes the person home. */
export function signOutHref(locale: SupportedLocale): string {
  return `${localeHref(locale, SIGN_IN_PATH)}?salir=1`;
}
