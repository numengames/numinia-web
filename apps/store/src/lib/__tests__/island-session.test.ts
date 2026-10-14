/**
 * What the sign-in island takes from the page: the chrome's client (now or
 * once it is published), the way back (only ever a path on this site) and
 * the way out.
 */

import { describe, expect, it } from 'vitest';
import {
  NO_DOOR_PARAMS,
  PAGE_SESSION_READY,
  doorParams,
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
