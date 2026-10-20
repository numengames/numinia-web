/**
 * «Saldo» › where the buyer goes after Stripe. A top-up started from an
 * organization's balance (`/panel/saldo/?org=…`, often sent there by the new
 * world wizard) opens Stripe in a NEW tab, and Stripe sends that tab to
 * `/saldo/vuelta/`, a page that knows nothing of where the buyer came from
 * (the till's return address cannot carry a query). The tab the buyer left
 * is still open, so the way back asks it, over a same-origin
 * BroadcastChannel — nothing is stored in the browser, so nothing new for
 * the cookie policy (LEG-003): «which organization was this, and which page
 * should I resume (`?volver=` on the balance address)?». Pablo's QA of
 * 2026-10-20 (04:26–04:48): «me ha traído aquí, que esta es mi cartera
 * personal… no hay para volver al sitio donde yo estaba haciendo la
 * operación».
 */

import { safeReturnPath } from './island-session';

/** Name of the channel the way back and the organization's balance talk on. */
export const VOLVER_CHANNEL = 'numinia-saldo-volver';

/** What the way back asks. */
export const VOLVER_ASK = { type: 'ask' } as const;

export interface VolverNote {
  /** The organization whose balance was being topped up. */
  readonly org: string;
  /** The page the buyer was working on (a path on this site), or null. */
  readonly back: string | null;
}

/** `?volver=` of the balance address: a path of this site, never the way back itself. */
export function volverParam(search: string): string | null {
  const path = safeReturnPath(new URLSearchParams(search).get('volver'));
  return path !== null && !/\/saldo\/vuelta(?:[/?#]|$)/.test(path) ? path : null;
}

/** True for the question the way back sends. */
export function isAsk(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'ask';
}

/** The answer an organization's balance gives to the question. */
export function noteMessage(org: string, back: string | null): Record<string, unknown> {
  return { type: 'note', org, back };
}

/** The answer read back, or null when it is not one (or names no organization). */
export function readNote(data: unknown): VolverNote | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, org, back } = data as Record<string, unknown>;
  if (type !== 'note' || typeof org !== 'string' || org === '') return null;
  return { org, back: typeof back === 'string' ? safeReturnPath(back) : null };
}

/**
 * Where the way back leads: the organization's balance when the payment was
 * its own (the account Stripe confirmed matches the note, or none is known
 * yet), otherwise the personal Saldo.
 */
export function backTarget(
  note: VolverNote | null,
  paidAccount: string | null,
  panelSaldoHref: string,
  saldoHref: string,
): { readonly saldo: string; readonly resume: string | null } {
  if (note === null || (paidAccount !== null && paidAccount !== note.org)) {
    return { saldo: saldoHref, resume: null };
  }
  return {
    saldo: `${panelSaldoHref}?org=${encodeURIComponent(note.org)}`,
    resume: note.back,
  };
}
