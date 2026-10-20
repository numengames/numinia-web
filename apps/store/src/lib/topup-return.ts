/**
 * The way back from a top-up (QA 2026-10-20, 04:26–04:48 of Pablo's video):
 * he paid from the organization Numen Games, in the middle of creating a
 * world, and the return page brought him to his personal balance — with no
 * way back to the organization or to the world he was creating.
 *
 * Stripe's tab returns to a page the till builds (`?session_id=…` only), so
 * nothing about the origin survives the trip. What does come back is the paid
 * account, in the till's own answer to «did this payment land?»: a team
 * account goes to that organization's balance, and next to it the page offers
 * «Back to creating the world» (the wizard remembers its step). The reason the
 * person came from the wizard also travels in the address (`?desde=mundos`)
 * on the balance page. Every link is built on this site from shapes checked here.
 */

import type { SupportedLocale } from '@numinia/domain';
import { localeHref } from './app-nav';
import { ORG_PARAM } from './panel';

/** The address says why the person came to pay: `?desde=mundos` = in the middle of creating a world. */
export const FROM_PARAM = 'desde';
export type TopupFrom = 'worlds';

/** The worlds room opens the new-world wizard when its address says so. */
export const WIZARD_PARAM = 'nuevo';

/** A team (organization) account of the till: `acc_t_…`; a personal one never is. */
const TEAM_ACCOUNT = /^acc_t_[A-Za-z0-9_-]{1,56}$/;

/** `?desde=mundos` → the reason; anything else → none. */
export function fromSearch(search: string): TopupFrom | null {
  return new URLSearchParams(search).get(FROM_PARAM) === 'mundos' ? 'worlds' : null;
}

/**
 * Where the return page sends a paid top-up: the organization's own balance
 * for a team account, the personal balance (`personal`) for anything else.
 */
export function paidBalanceHref(
  locale: SupportedLocale,
  account: string | null,
  personal: string,
): string {
  return account !== null && TEAM_ACCOUNT.test(account)
    ? orgBalanceHref(locale, account)
    : personal;
}

/** The organization's own balance (the panel's, not the personal one). */
export function orgBalanceHref(locale: SupportedLocale, org: string): string {
  return `${localeHref(locale, '/panel/saldo/')}?${ORG_PARAM}=${encodeURIComponent(org)}`;
}

/** The worlds room with the new-world wizard open. */
export function worldsWizardHref(locale: SupportedLocale): string {
  return `${localeHref(locale, '/lap/admin/worlds/')}?${WIZARD_PARAM}=1`;
}

/** The top-up link of the wizard: the organization's balance, saying it was sent from creating a world. */
export function wizardTopupHref(locale: SupportedLocale, org: string): string {
  return `${orgBalanceHref(locale, org)}&${FROM_PARAM}=mundos`;
}

/** Whether an address (`location.search`) asks for the wizard to open. */
export function wantsWizard(search: string): boolean {
  return new URLSearchParams(search).get(WIZARD_PARAM) === '1';
}
