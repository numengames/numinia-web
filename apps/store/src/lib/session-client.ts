/**
 * Who is here — the page's one answer, read once.
 *
 * Every page is prerendered for everyone, so the browser asks
 * `/api/auth/session` after load. Before this module five components each
 * asked on their own and the chrome never asked, so a signed-in person still
 * saw «Iniciar sesión» everywhere. Now the chrome (TopBar's script) is the
 * one reader: it paints every session-dependent mark of the page and
 * publishes its client on `window.numiniaSession` for the sign-in island.
 *
 * Only the chrome imports this module, on purpose: the bundler then inlines
 * it into the chrome's script, so the front door keeps its promise of no
 * external JavaScript (scripts/bundle-budget.mjs, e2e/perf.spec.ts). Other
 * code reaches the client through the window (lib/island-session.ts), never
 * by importing this file.
 *
 * Fail closed: anything but a well-formed 200 reads as «out». The page only
 * ever shows the short form of the wallet (STD-035: no address in the DOM,
 * telemetry or URLs); the full one stays in memory for the sign-in island,
 * which compares it with the connected wallet.
 *
 * Zod-free on purpose: this runs in the chrome of every page (bundle rule).
 */

import { announceSessionChange, onSessionChange } from './session-signal';

export type SessionView =
  | {
      readonly status: 'in';
      readonly rank: string;
      /** For the page: `0x42e6…ca26`. */
      readonly short: string;
      /** Lowercase, for comparing with a connected wallet; never written to the DOM. */
      readonly address: string;
    }
  | { readonly status: 'out' };

export const SIGNED_OUT: SessionView = { status: 'out' };

/** The event the chrome fires once its client is on `window.numiniaSession`. */
export const SESSION_READY = 'numinia:session-ready';

declare global {
  interface Window {
    /** The page's session client, published by the chrome. */
    numiniaSession?: SessionClient;
  }
}

/** `0x42e6…ca26`: enough to recognise, too little to copy. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The session endpoint's body, checked by hand. Anything odd reads as out. */
export function sessionFromBody(body: unknown): SessionView {
  if (!isRecord(body)) return SIGNED_OUT;
  const { address, rank } = body;
  if (typeof address !== 'string' || typeof rank !== 'string' || !address || !rank) {
    return SIGNED_OUT;
  }
  return { status: 'in', rank, short: shortAddress(address), address: address.toLowerCase() };
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** One read of the endpoint; never throws. 401, 503 or a network error = out. */
export async function readSession(fetcher: Fetch): Promise<SessionView> {
  try {
    const response = await fetcher('/api/auth/session', { credentials: 'same-origin' });
    // Read the body whatever the status: an unread body keeps the request
    // open in the browser (the page never goes idle).
    const body = await response.text();
    if (!response.ok) return SIGNED_OUT;
    return sessionFromBody(JSON.parse(body));
  } catch {
    return SIGNED_OUT;
  }
}

export interface SessionClient {
  /** The page's current answer (one request, shared by every caller). */
  current(): Promise<SessionView>;
  /** A fresh read, straight from the endpoint (the island's «is this wallet in?»). */
  fresh(): Promise<SessionView>;
  /** Hear every answer: the first one, and each one after a change. */
  subscribe(listener: (session: SessionView) => void): () => void;
  /** Tell the page the session changed (after a sign-in or a sign-out). */
  changed(): void;
}

/** A client bound to a fetch and to the page's event target. */
export function createSessionClient(fetcher: Fetch, target: EventTarget): SessionClient {
  const listeners = new Set<(session: SessionView) => void>();
  let pending: Promise<SessionView> | null = null;
  const read = (): Promise<SessionView> => {
    pending = readSession(fetcher);
    void pending.then((session) => listeners.forEach((listener) => listener(session)));
    return pending;
  };
  onSessionChange(target, () => void read());
  return {
    current: () => pending ?? read(),
    fresh: () => readSession(fetcher),
    subscribe(listener) {
      listeners.add(listener);
      // A read in flight (or done) answers the newcomer; else the first
      // read starts now and tells every listener, this one included.
      if (pending) void pending.then(listener);
      else void read();
      return () => {
        listeners.delete(listener);
      };
    },
    changed: () => announceSessionChange(target),
  };
}

/**
 * The one client of this page: made on first use, published on the window
 * for the sign-in island, which hears `SESSION_READY` if it woke first.
 */
export function pageSession(): SessionClient {
  if (!window.numiniaSession) {
    window.numiniaSession = createSessionClient((input, init) => fetch(input, init), window);
    window.dispatchEvent(new Event(SESSION_READY));
  }
  return window.numiniaSession;
}

/** The rank order the page's ladder draws, read from its rows (`data-rank`). */
export function rankLevel(order: readonly string[], session: SessionView): number {
  return session.status === 'in' ? order.indexOf(session.rank) : -1;
}
