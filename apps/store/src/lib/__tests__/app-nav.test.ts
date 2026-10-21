/**
 * The app's navigation (v3, «La ciudad y tú»): the city's five places on
 * the left, yours on the right, the phone's four and «Tú», what «Crear»
 * offers, which place a page lights, the folds and where menus and
 * tooltips float.
 */

import { describe, expect, it } from 'vitest';
import {
  BAZAAR_ITEM,
  BAZAAR_VISIBLE,
  CITY_ITEMS,
  cityItems,
  CREATE_ITEMS,
  HOW_PATH,
  NOTIFICATIONS_PATH,
  PANEL_PATH,
  PHONE_ITEMS,
  PROFILE_PATH,
  SEARCH_PATH,
  SETTINGS_PATH,
  SIGN_IN_PATH,
  YOU_ITEMS,
  ariaCurrent,
  isPersonal,
  localeHref,
  navIcon,
  navState,
  signInHref,
  signOutHref,
  type CityId,
  type YouId,
} from '../app-nav';

const city = (id: CityId) => CITY_ITEMS.find((item) => item.id === id)!;
const yours = (id: YouId) => YOU_ITEMS.find((item) => item.id === id)!;

/** The city place a page lights, or null. */
const litCity = (path: string): CityId | null =>
  CITY_ITEMS.find((item) => navState(item, path) !== null)?.id ?? null;
const litYou = (path: string): YouId | null =>
  YOU_ITEMS.find((item) => navState(item, path) !== null)?.id ?? null;

describe('the places', () => {
  it('the city: Ahora, Comunidades, Encuentros, Mundos (the Bazar is hidden), with their routes', () => {
    expect(CITY_ITEMS.map((item) => [item.id, item.path])).toEqual([
      ['now', '/'],
      ['communities', '/communities/'],
      ['encounters', '/calendar/'],
      ['worlds', '/mundos/'],
    ]);
    expect(BAZAAR_VISIBLE).toBe(false);
    expect(CITY_ITEMS).not.toContain(BAZAAR_ITEM);
  });

  it('switching the Bazar on puts it last, after Mundos', () => {
    expect(cityItems(true).map((item) => item.id)).toEqual([
      'now',
      'communities',
      'encounters',
      'worlds',
      'bazaar',
    ]);
    expect(cityItems(false)).toEqual(CITY_ITEMS);
  });

  it('yours: Avisos, Tus comunidades, Tu agenda, Tus mundos, Tu saldo (signed in only), Tu botín', () => {
    expect(YOU_ITEMS.map((item) => [item.id, item.path, item.signedInOnly === true])).toEqual([
      ['notices', '/notifications/', false],
      ['your-communities', '/belong/', false],
      ['agenda', '/agenda/', false],
      ['worlds', '/mis-mundos/', false],
      ['balance', '/saldo/', true],
      ['loot', '/lap/loot/', false],
    ]);
  });

  it('Tu agenda and Tus mundos wear the icons of their twins, Encuentros and Mundos', () => {
    expect(yours('agenda').icon).toBe(city('encounters').icon);
    expect(yours('worlds').icon).toBe(city('worlds').icon);
  });

  it('each city place has its own Phosphor icon', () => {
    const icons = CITY_ITEMS.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('the phone keeps four of the city (the Bazar goes up to the header)', () => {
    expect(PHONE_ITEMS.map((item) => item.id)).toEqual([
      'now',
      'communities',
      'encounters',
      'worlds',
    ]);
  });

  it('«Crear» offers only what exists: a community', () => {
    expect(CREATE_ITEMS).toEqual([
      { id: 'community', path: '/how-it-works/#open', icon: 'house' },
      { id: 'encounter', path: '/crear/encuentro/', icon: 'calendar-plus' },
    ]);
  });

  it('names the doors of the chrome', () => {
    expect(SEARCH_PATH).toBe('/communities/');
    expect(SIGN_IN_PATH).toBe('/lap/session/');
    expect(SETTINGS_PATH).toBe('/lap/settings/');
    expect(PANEL_PATH).toBe('/panel/');
    expect(PROFILE_PATH).toBe('/lap/');
    expect(HOW_PATH).toBe('/how-it-works/');
    expect(NOTIFICATIONS_PATH).toBe('/notifications/');
  });
});

describe('which place a page lights', () => {
  it('Ahora is the front page, and /live/ inside it', () => {
    expect(navState(city('now'), '/')).toBe('page');
    expect(navState(city('now'), '/live/')).toBe('section');
    expect(litCity('/updates/')).toBeNull();
  });

  it('communities, encounters (calendar and rituals), worlds and the Bazar', () => {
    expect(navState(city('communities'), '/communities/trgcon/')).toBe('section');
    expect(litCity('/calendar/')).toBe('encounters');
    expect(litCity('/rituals/trg26/')).toBe('encounters');
    expect(litCity('/mundos/agora/')).toBe('worlds');
    // The Bazar is hidden: no place lights, but its own place still reads its pages.
    expect(litCity('/bazaar/')).toBeNull();
    expect(navState(BAZAAR_ITEM, '/bazaar/')).toBe('page');
    expect(navState(BAZAAR_ITEM, '/archive/avatar-arla/')).toBe('section');
  });

  it('yours: the panel belongs to Tus comunidades; the loot to Tu botín', () => {
    expect(navState(yours('your-communities'), '/belong/')).toBe('page');
    for (const path of ['/panel/', '/panel/miembros/']) {
      expect(litYou(path), path).toBe('your-communities');
    }
    expect(litYou('/notifications/')).toBe('notices');
    expect(litYou('/agenda/')).toBe('agenda');
    expect(litYou('/mis-mundos/')).toBe('worlds');
    expect(litYou('/saldo/')).toBe('balance');
    expect(litYou('/lap/loot/')).toBe('loot');
    expect(litYou('/lap/settings/')).toBeNull();
  });

  it('pages outside the places light none', () => {
    for (const path of ['/updates/', '/legal/privacy/', '/support/', '/how-it-works/', '/back/']) {
      expect(litCity(path), path).toBeNull();
      expect(litYou(path), path).toBeNull();
    }
  });

  it('«Tú» is current on the pages that are yours', () => {
    for (const path of [
      '/notifications/',
      '/belong/',
      '/agenda/',
      '/mis-mundos/',
      '/saldo/',
      '/lap/',
      '/lap/loot/',
      '/panel/',
    ]) {
      expect(isPersonal(path), path).toBe(true);
    }
    for (const path of ['/', '/communities/', '/bazaar/', '/how-it-works/']) {
      expect(isPersonal(path), path).toBe(false);
    }
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
    expect(navIcon(city('worlds'), 'page')).toBe('planet-fill');
    expect(navIcon(city('worlds'), 'section')).toBe('planet-fill');
    expect(navIcon(city('worlds'), null)).toBe('planet');
    expect(navIcon(yours('loot'), null)).toBe('backpack');
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
