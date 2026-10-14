/**
 * What the sign-in island needs from the page, without importing the
 * chrome's session module (which must stay the chrome's alone, so the
 * bundler inlines it — see lib/session-client.ts):
 *
 * - the page's session client, published by the chrome on
 *   `window.numiniaSession` (waited for if the island wakes first);
 * - what the sign-in page was asked to do: `?vuelta=` (where the door was
 *   opened from, only ever a path on this site) and `?salir=1`;
 * - where a fresh sign-in lands: your profile, or the room of the player
 *   area you opened the door from (`landingAfterSignIn`).
 */

import type { SessionClient } from './session-client';

/** Same string as session-client's SESSION_READY (a test pins them equal). */
export const PAGE_SESSION_READY = 'numinia:session-ready';

interface SessionWindow extends EventTarget {
  numiniaSession?: SessionClient;
}

/** The page's client, now or as soon as the chrome publishes it. */
export function pageSessionClient(win: SessionWindow): Promise<SessionClient> {
  const ready = win.numiniaSession;
  if (ready) return Promise.resolve(ready);
  return new Promise((resolve) => {
    win.addEventListener(
      PAGE_SESSION_READY,
      () => {
        if (win.numiniaSession) resolve(win.numiniaSession);
      },
      { once: true },
    );
  });
}

/**
 * Where to go after signing in: only a path on this site, never another
 * origin (`//evil.example`, `/\evil`, `javascript:` all refuse). Returns
 * null when the value is not one.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }
  // Resolved against a placeholder origin: a path that is truly a path
  // stays on it (a relative reference against a valid base never throws).
  const url = new URL(value, 'https://numinia.invalid');
  if (url.origin !== 'https://numinia.invalid') return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** What the sign-in page was asked to do, read from its query string. */
export interface DoorParams {
  /** `?vuelta=`: where the door was opened from (a path on this site, or null). */
  readonly returnTo: string | null;
  /** `?salir=1`: sign out and go home. */
  readonly signOutAsked: boolean;
}

export const NO_DOOR_PARAMS: DoorParams = { returnTo: null, signOutAsked: false };

export function doorParams(search: string): DoorParams {
  const query = new URLSearchParams(search);
  return {
    returnTo: safeReturnPath(query.get('vuelta')),
    signOutAsked: query.get('salir') === '1',
  };
}

/**
 * A room of the player area — `/lap/…` in any of the site's locales — but
 * never the sign-in page itself: landing there again would only show who
 * you are, or, with `?salir=1`, sign you straight out.
 */
const LAP_ROOM = /^\/(?:(?:es|ja|ko|pt-br)\/)?lap\/(?!session(?:[/?#]|$))/;

/**
 * Where a fresh sign-in lands. Pablo (video walkthrough, 2026-10-14): «me
 * saca de aquí, que no debería; me debería de mantener en el perfil». So it
 * is your profile — Resumen, in the page's language (`profileHref`) —
 * unless the door was opened from inside the player area (the sheet, an
 * Oracle's room): then that room, which is where you were working.
 */
export function landingAfterSignIn(returnTo: string | null, profileHref: string): string {
  return returnTo !== null && LAP_ROOM.test(returnTo) ? returnTo : profileHref;
}
