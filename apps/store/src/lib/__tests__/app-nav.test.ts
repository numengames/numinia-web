/**
 * The app's navigation: the five places in order, what Explorar holds, the
 * «Más» list, and which place a page lights — its own address ("page") or
 * a page inside it ("section"), drawn with the fill icon either way.
 */

import { describe, expect, it } from 'vitest';
import {
  EXPLORE_ITEMS,
  MORE_ITEMS,
  NAV_ITEMS,
  NOTIFICATIONS_PATH,
  SEARCH_PATH,
  SETTINGS_PATH,
  SIDEBAR_KEY,
  SIGN_IN_PATH,
  ariaCurrent,
  exploreState,
  localeHref,
  navIcon,
  navState,
  opensSearch,
  popoverTop,
  signInHref,
  signOutHref,
  type ExploreId,
  type NavId,
} from '../app-nav';

const place = (id: NavId) => NAV_ITEMS.find((item) => item.id === id)!;
const explore = (id: ExploreId) => EXPLORE_ITEMS.find((item) => item.id === id)!;

/** The place a page lights, or null. */
const lit = (path: string): NavId | null =>
  NAV_ITEMS.find((item) => navState(item, path) !== null)?.id ?? null;

describe('the places', () => {
  it('are the five of the design, in the sidebar order, with their routes', () => {
    expect(NAV_ITEMS.map((item) => [item.id, item.path])).toEqual([
      ['for-you', '/'],
      ['explore', '/communities/'],
      ['belong', '/belong/'],
      ['live', '/live/'],
      ['profile', '/lap/'],
    ]);
  });

  it('each has its own Phosphor icon', () => {
    const icons = NAV_ITEMS.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('Explorar always holds the communities, the calendar and the Bazar', () => {
    expect(EXPLORE_ITEMS.map((item) => [item.id, item.path])).toEqual([
      ['communities', '/communities/'],
      ['calendar', '/calendar/'],
      ['bazaar', '/bazaar/'],
    ]);
  });

  it('«Más» opens with how the city works, then the house doors after a line', () => {
    expect(MORE_ITEMS.map((item) => [item.id, item.path, item.group])).toEqual([
      ['how', '/how-it-works/', 'city'],
      ['open', '/how-it-works/#open', 'city'],
      ['back', '/back/', 'house'],
      ['notifications', '/notifications/', 'house'],
      ['support', '/support/', 'house'],
    ]);
  });

  it('the bell is the notifications, never the updates (their one door is the version)', () => {
    const bell = MORE_ITEMS.find((item) => item.icon === 'bell');
    expect(bell?.id).toBe('notifications');
    expect(bell?.path).toBe(NOTIFICATIONS_PATH);
    expect(NOTIFICATIONS_PATH).toBe('/notifications/');
    expect(MORE_ITEMS.some((item) => item.path.startsWith('/updates/'))).toBe(false);
  });

  it('keeps the analytics names of the links that survive from the old footer', () => {
    const metrics = Object.fromEntries(MORE_ITEMS.map((item) => [item.id, item.metric]));
    expect(metrics['back']).toBe('footer-back');
    expect(metrics['notifications']).toBe('nav-more-notifications');
    for (const metric of Object.values(metrics)) expect(metric).toMatch(/^(nav|footer)-/);
  });

  it('names the doors of the chrome', () => {
    expect(SEARCH_PATH).toBe('/communities/');
    expect(SIGN_IN_PATH).toBe('/lap/session/');
    expect(SETTINGS_PATH).toBe('/lap/settings/');
  });
});

describe('which place a page lights', () => {
  it('the home is Para ti, on its own address only', () => {
    expect(navState(place('for-you'), '/')).toBe('page');
    expect(navState(place('for-you'), '/updates/')).toBeNull();
  });

  it('rituals, communities, the calendar and the Bazar light Explorar', () => {
    expect(navState(place('explore'), '/communities/')).toBe('page');
    for (const path of [
      '/communities/trgcon/',
      '/calendar/',
      '/rituals/trg26/',
      '/bazaar/',
      '/archive/avatar-arla/',
    ]) {
      expect(lit(path), path).toBe('explore');
      expect(navState(place('explore'), path), path).toBe('section');
    }
  });

  it('Perteneces, Live and every LAP room light their own place', () => {
    expect(navState(place('belong'), '/belong/')).toBe('page');
    expect(navState(place('live'), '/live/')).toBe('page');
    expect(navState(place('profile'), '/lap/')).toBe('page');
    expect(lit('/lap/settings/')).toBe('profile');
    expect(lit('/lap/session/')).toBe('profile');
  });

  it('pages outside the five light none', () => {
    for (const path of [
      '/updates/',
      '/notifications/',
      '/legal/privacy/',
      '/support/',
      '/how-it-works/',
      '/back/',
    ]) {
      expect(lit(path), path).toBeNull();
    }
  });

  it('inside Explorar, each page lights its own entry', () => {
    expect(exploreState(explore('communities'), '/communities/')).toBe('page');
    expect(exploreState(explore('communities'), '/communities/trgcon/')).toBe('section');
    expect(exploreState(explore('calendar'), '/calendar/')).toBe('page');
    expect(exploreState(explore('bazaar'), '/bazaar/')).toBe('page');
    expect(exploreState(explore('bazaar'), '/archive/avatar-arla/')).toBe('section');
    expect(exploreState(explore('calendar'), '/rituals/trg26/')).toBeNull();
    expect(exploreState(explore('communities'), '/')).toBeNull();
  });
});

describe('ariaCurrent', () => {
  it('is "page" on the address, "true" inside the section, absent elsewhere', () => {
    expect(ariaCurrent('page')).toBe('page');
    expect(ariaCurrent('section')).toBe('true');
    expect(ariaCurrent(null)).toBeUndefined();
  });
});

describe('navIcon', () => {
  it('draws the fill while the page is in the place, the regular icon elsewhere', () => {
    expect(navIcon(place('explore'), 'page')).toBe('compass-fill');
    expect(navIcon(place('explore'), 'section')).toBe('compass-fill');
    expect(navIcon(place('explore'), null)).toBe('compass');
    expect(navIcon(place('for-you'), null)).toBe('house');
  });
});

describe('localeHref', () => {
  it('serves English at the root and every other locale under its prefix', () => {
    expect(localeHref('en', '/communities/')).toBe('/communities/');
    expect(localeHref('es', '/communities/')).toBe('/es/communities/');
    expect(localeHref('pt-br', '/')).toBe('/pt-br/');
    expect(localeHref('ja', '/how-it-works/#open')).toBe('/ja/how-it-works/#open');
  });
});

describe('the door and the way out', () => {
  it('asks the door to bring the person back to the page it was opened from', () => {
    expect(signInHref('es', '/communities/trgcon/')).toBe(
      '/es/lap/session/?vuelta=%2Fes%2Fcommunities%2Ftrgcon%2F',
    );
    expect(signInHref('en', '/')).toBe('/lap/session/?vuelta=%2F');
  });

  it('needs no way back to itself', () => {
    expect(signInHref('ko', SIGN_IN_PATH)).toBe('/ko/lap/session/');
  });

  it('signs out through the sign-in page, the one that holds the wallet code', () => {
    expect(signOutHref('es')).toBe('/es/lap/session/?salir=1');
    expect(signOutHref('en')).toBe('/lap/session/?salir=1');
  });
});

describe('the sidebar fold', () => {
  it('is kept under the key the cookie policy names', () => {
    expect(SIDEBAR_KEY).toBe('numinia-sidebar');
  });
});

describe('the «/» shortcut', () => {
  const key = (
    k: string,
    mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {},
  ) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...mods,
  });
  const on = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable });

  it('opens the search from the page', () => {
    expect(opensSearch(key('/'), null)).toBe(true);
    expect(opensSearch(key('/'), on('BODY'))).toBe(true);
    expect(opensSearch(key('/'), on('a'))).toBe(true);
  });

  it('never steals a slash from someone typing', () => {
    expect(opensSearch(key('/'), on('INPUT'))).toBe(false);
    expect(opensSearch(key('/'), on('textarea'))).toBe(false);
    expect(opensSearch(key('/'), on('SELECT'))).toBe(false);
    expect(opensSearch(key('/'), on('DIV', true))).toBe(false);
  });

  it('ignores other keys and modified slashes', () => {
    expect(opensSearch(key('s'), null)).toBe(false);
    expect(opensSearch(key('/', { ctrlKey: true }), null)).toBe(false);
    expect(opensSearch(key('/', { metaKey: true }), null)).toBe(false);
    expect(opensSearch(key('/', { altKey: true }), null)).toBe(false);
  });
});

describe('popoverTop', () => {
  it('sits level with its button when there is room', () => {
    expect(popoverTop(400, 200, 900)).toBe(392);
  });

  it('rises so it never passes the bottom edge', () => {
    expect(popoverTop(800, 240, 900)).toBe(652);
  });

  it('never goes above the top edge, whatever the room', () => {
    expect(popoverTop(4, 100, 900)).toBe(8);
    expect(popoverTop(300, 1000, 900)).toBe(8);
    expect(popoverTop(300, 100, 900, 16)).toBe(284);
  });
});
