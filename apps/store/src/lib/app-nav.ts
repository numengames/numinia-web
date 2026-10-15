/**
 * The app's navigation (numinia.com's shell, the Oracle's design of
 * 2026-10-14): the places the sidebar and the phone's tab bar offer, in
 * their order, and which of them the page in view belongs to. Pure — a path
 * in, an answer out; the chrome components only draw it.
 *
 * Paths are written without the locale prefix (BaseLayout's `basePath`);
 * `localeHref` adds it. The sidebar and the tab bar read the same list, so
 * a place can never be in one and missing from the other.
 */

import type { SupportedLocale } from '@numinia/domain';

/** The five places of the app, in the sidebar's (and the tab bar's) order. */
export type NavId = 'for-you' | 'explore' | 'belong' | 'live' | 'profile';

/** What Explorar holds, always shown below it in the sidebar. */
export type ExploreId = 'communities' | 'calendar' | 'bazaar';

/** The «Más» list: how the city works, then the house's quieter doors. */
export type MoreId = 'how' | 'open' | 'back' | 'notifications' | 'support';

/** Phosphor regular icons the places use; the current one draws its fill. */
export type NavIcon = 'house' | 'compass' | 'users-three' | 'broadcast' | 'user-circle';

/** Phosphor regular icons of the «Más» list. */
type MoreIcon = 'question' | 'house' | 'coffee' | 'bell' | 'info';

export interface NavItem {
  readonly id: NavId;
  readonly path: string;
  readonly icon: NavIcon;
}

export interface ExploreItem {
  readonly id: ExploreId;
  readonly path: string;
}

export interface MoreItem {
  readonly id: MoreId;
  readonly path: string;
  readonly icon: MoreIcon;
  /** Analytics id: today's name where the link survives (footer-back). */
  readonly metric: string;
  /** The «Más» list draws a line before the house's own doors. */
  readonly group: 'city' | 'house';
}

/** The notifications page: the «Más» bell (its sign-in door comes back here). */
export const NOTIFICATIONS_PATH = '/notifications/';

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'for-you', path: '/', icon: 'house' },
  { id: 'explore', path: '/communities/', icon: 'compass' },
  { id: 'belong', path: '/belong/', icon: 'users-three' },
  { id: 'live', path: '/live/', icon: 'broadcast' },
  { id: 'profile', path: '/lap/', icon: 'user-circle' },
];

export const EXPLORE_ITEMS: readonly ExploreItem[] = [
  { id: 'communities', path: '/communities/' },
  { id: 'calendar', path: '/calendar/' },
  { id: 'bazaar', path: '/bazaar/' },
];

export const MORE_ITEMS: readonly MoreItem[] = [
  { id: 'how', path: '/how-it-works/', icon: 'question', metric: 'nav-more-how', group: 'city' },
  {
    id: 'open',
    path: '/how-it-works/#open',
    icon: 'house',
    metric: 'nav-more-open',
    group: 'city',
  },
  { id: 'back', path: '/back/', icon: 'coffee', metric: 'footer-back', group: 'house' },
  // The bell is the notifications' (the Oracle, 2026-10-15). The updates keep
  // one door only: the version in the footer (and its twin in Settings).
  {
    id: 'notifications',
    path: NOTIFICATIONS_PATH,
    icon: 'bell',
    metric: 'nav-more-notifications',
    group: 'house',
  },
  { id: 'support', path: '/support/', icon: 'info', metric: 'nav-more-support', group: 'house' },
];

/** The search lives on the communities index until the global search dialog. */
export const SEARCH_PATH = '/communities/';

/** The door: the LAP's sign-in page. */
export const SIGN_IN_PATH = '/lap/session/';

/** The person's settings (the ⋮ menu's last entry). */
export const SETTINGS_PATH = '/lap/settings/';

/** The organization panel (the account menu's «Paneles»): Perteneces' section. */
export const PANEL_PATH = '/panel/';

/**
 * The addresses each place lights beyond its own: ritual and community
 * pages belong to Explorar, and so do the object pages of the Bazar
 * (`/archive/<id>/` until they move); every LAP room belongs to Perfil;
 * the organization panel belongs to Perteneces (the prototype lights it
 * there: it is where the organizations one belongs to are handled).
 */
const SECTIONS: Readonly<Record<NavId, readonly string[]>> = {
  'for-you': [],
  explore: ['/communities/', '/calendar/', '/bazaar/', '/rituals/', '/archive/'],
  belong: ['/belong/', PANEL_PATH],
  live: ['/live/'],
  profile: ['/lap/'],
};

const EXPLORE_SECTIONS: Readonly<Record<ExploreId, readonly string[]>> = {
  communities: ['/communities/'],
  calendar: ['/calendar/'],
  bazaar: ['/bazaar/', '/archive/'],
};

/**
 * Where a place stands from a page: `page` on its own address, `section`
 * when the page sits inside it, `null` elsewhere. The chrome draws the
 * fill icon for both and sets aria-current to "page" or "true".
 */
export type NavState = 'page' | 'section' | null;

function stateFor(path: string, own: string, sections: readonly string[]): NavState {
  if (path === own) return 'page';
  return sections.some((prefix) => path.startsWith(prefix)) ? 'section' : null;
}

export function navState(item: NavItem, path: string): NavState {
  return stateFor(path, item.path, SECTIONS[item.id]);
}

export function exploreState(item: ExploreItem, path: string): NavState {
  return stateFor(path, item.path, EXPLORE_SECTIONS[item.id]);
}

/** The aria-current value of a state (undefined drops the attribute). */
export function ariaCurrent(state: NavState): 'page' | 'true' | undefined {
  if (state === 'page') return 'page';
  return state === 'section' ? 'true' : undefined;
}

/** The icon a place draws: its fill while the page is in it, else the regular one. */
export function navIcon(item: NavItem, state: NavState): NavIcon | `${NavIcon}-fill` {
  return state === null ? item.icon : `${item.icon}-fill`;
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

/** The sidebar's fold, kept on the device (LEG-003 §3.1): `collapsed` or
    `expanded`; anything else reads as open. */
export const SIDEBAR_KEY = 'numinia-sidebar';

/** The parts of a keydown the «/» shortcut looks at. */
export interface ShortcutKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}

/** The parts of the focused element the shortcut looks at. */
export interface ShortcutTarget {
  readonly tagName: string;
  readonly isContentEditable: boolean;
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** «/» opens the search — unless the person is typing or holds a modifier. */
export function opensSearch(event: ShortcutKey, target: ShortcutTarget | null): boolean {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return false;
  if (target === null) return true;
  return !target.isContentEditable && !TYPING_TAGS.has(target.tagName.toUpperCase());
}

/**
 * The top of a popover drawn beside its button: level with it, but never
 * past the window's bottom edge nor above its top (an 8 px margin).
 */
export function popoverTop(
  anchorTop: number,
  popoverHeight: number,
  viewportHeight: number,
  margin = 8,
): number {
  return Math.max(margin, Math.min(anchorTop - margin, viewportHeight - popoverHeight - margin));
}
