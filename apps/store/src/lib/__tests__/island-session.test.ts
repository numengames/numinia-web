/**
 * What the sign-in island takes from the page: the chrome's client (now or
 * once it is published), the way back (only ever a path on this site) and
 * the way out.
 */

import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES } from '@numinia/domain';
import {
  NO_DOOR_PARAMS,
  PAGE_SESSION_READY,
  closeTarget,
  doorParams,
  landingAfterSignIn,
  pageSessionClient,
  safeReturnPath,
} from '../island-session';
import { SESSION_READY, createSessionClient, type SessionClient } from '../session-client';

const client = (): SessionClient =>
  createSessionClient(async () => new Response('{}', { status: 401 }), new EventTarget());

describe('the page client, seen from the island', () => {
  it('names the same ready signal the chrome fires', () => {
    expect(PAGE_SESSION_READY).toBe(SESSION_READY);
  });

  it('is the published client when the chrome came first', async () => {
    const published = client();
    const win = Object.assign(new EventTarget(), { numiniaSession: published });
    expect(await pageSessionClient(win)).toBe(published);
  });

  it('waits for the chrome when the island woke first', async () => {
    const win: EventTarget & { numiniaSession?: SessionClient } = new EventTarget();
    const waiting = pageSessionClient(win);
    const published = client();
    win.numiniaSession = published;
    win.dispatchEvent(new Event(PAGE_SESSION_READY));
    expect(await waiting).toBe(published);
  });

  it('keeps waiting through a ready signal that carried nothing', async () => {
    const win: EventTarget & { numiniaSession?: SessionClient } = new EventTarget();
    let resolved = false;
    void pageSessionClient(win).then(() => {
      resolved = true;
    });
    win.dispatchEvent(new Event(PAGE_SESSION_READY));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(resolved).toBe(false);
  });
});

describe('where the door may send you back', () => {
  it('keeps a path on this site, with its query and its anchor', () => {
    expect(safeReturnPath('/es/communities/trgcon/')).toBe('/es/communities/trgcon/');
    expect(safeReturnPath('/es/calendar/?mes=11#dia-2')).toBe('/es/calendar/?mes=11#dia-2');
    expect(safeReturnPath('/')).toBe('/');
  });

  it('refuses every other origin and anything that is not a path', () => {
    for (const value of [
      null,
      undefined,
      '',
      'https://evil.example/',
      '//evil.example/',
      '/\\evil.example/',
      'javascript:alert(1)',
      'es/communities/',
      '/\t/evil.example/',
    ]) {
      expect(safeReturnPath(value)).toBeNull();
    }
  });
});

describe('what the sign-in page was asked', () => {
  it('reads the way back and the way out from the query string', () => {
    expect(doorParams('?vuelta=%2Fes%2Fbelong%2F')).toEqual({
      returnTo: '/es/belong/',
      signOutAsked: false,
    });
    expect(doorParams('?salir=1')).toEqual({ returnTo: null, signOutAsked: true });
  });

  it('asks nothing by default, and never trusts a foreign way back', () => {
    expect(doorParams('')).toEqual(NO_DOOR_PARAMS);
    expect(doorParams('?vuelta=https%3A%2F%2Fevil.example%2F&salir=0')).toEqual(NO_DOOR_PARAMS);
  });
});

/* Pablo, 2026-10-14: «me saca de aquí, que no debería; me debería de
   mantener en el perfil» — a sign-in from a community page took him back to
   it. The door now lands on your profile, unless it was opened from inside
   the player area. */
describe('where a fresh sign-in lands', () => {
  const PROFILE = '/es/lap/';

  it('is your profile, in the page’s language, whatever page the door was opened from', () => {
    for (const from of [
      null,
      '/es/communities/active-inference/',
      '/es/',
      '/',
      '/es/belong/',
      '/es/lapis/',
      '/es/updates/?lap=1',
    ]) {
      expect(landingAfterSignIn(from, PROFILE)).toBe(PROFILE);
    }
    expect(landingAfterSignIn('/communities/', '/lap/')).toBe('/lap/');
  });

  it('keeps a room of the player area, in any locale, with its query and anchor', () => {
    for (const room of [
      '/es/lap/',
      '/es/lap/character/',
      '/es/lap/admin/worlds/',
      '/lap/admin/prices/?tamano=s#tabla',
      '/ja/lap/seasons/',
      '/ko/lap/codex/ficha/',
      '/pt-br/lap/settings/',
    ]) {
      expect(landingAfterSignIn(room, PROFILE)).toBe(room);
    }
  });

  it('never lands back on the door itself, nor on its way out', () => {
    for (const door of [
      '/es/lap/session/',
      '/lap/session/?salir=1',
      '/es/lap/session?salir=1',
      '/es/lap/session',
      '/es/lap/session#x',
    ]) {
      expect(landingAfterSignIn(door, PROFILE)).toBe(PROFILE);
    }
    // A room whose name only starts like the door's is still a room.
    expect(landingAfterSignIn('/es/lap/sessions-log/', PROFILE)).toBe('/es/lap/sessions-log/');
  });

  it('reads what doorParams kept: a foreign way back was already gone', () => {
    const { returnTo } = doorParams('?vuelta=https%3A%2F%2Fevil.example%2Flap%2F');
    expect(landingAfterSignIn(returnTo, PROFILE)).toBe(PROFILE);
  });

  it('knows the player area in every language the site serves', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const room = `${locale === 'en' ? '' : `/${locale}`}/lap/character/`;
      expect(landingAfterSignIn(room, PROFILE), locale).toBe(room);
    }
  });
});

/* QA 2026-10-15: the door is a modal over the app, and its × (or Escape)
   goes back to where it was opened from — like closing TikTok's sign-in. */
describe('where the door’s close button leads', () => {
  const HOME = '/es/';

  it('is the page the door was opened from, with its query and anchor', () => {
    for (const from of [
      '/es/communities/trgcon/',
      '/es/calendar/?mes=11#dia-2',
      '/es/lap/admin/worlds/',
      '/',
    ]) {
      expect(closeTarget(from, HOME)).toBe(from);
    }
  });

  it('is home when the door was opened from nowhere', () => {
    expect(closeTarget(null, HOME)).toBe(HOME);
    expect(closeTarget(doorParams('?vuelta=https%3A%2F%2Fevil.example%2F').returnTo, HOME)).toBe(
      HOME,
    );
  });

  it('never reopens the door, nor its way out, in any locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const prefix = locale === 'en' ? '' : `/${locale}`;
      for (const door of [
        `${prefix}/lap/session/`,
        `${prefix}/lap/session/?salir=1`,
        `${prefix}/lap/session`,
        `${prefix}/lap/session#x`,
      ]) {
        expect(closeTarget(door, HOME), door).toBe(HOME);
      }
    }
    // A room whose name only starts like the door's is still a room.
    expect(closeTarget('/es/lap/sessions-log/', HOME)).toBe('/es/lap/sessions-log/');
  });
});
