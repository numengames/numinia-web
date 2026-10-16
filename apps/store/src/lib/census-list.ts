/**
 * «El censo» (cut of 2026-10-16) in the browser: what the Census page's
 * list of who has signed in and the panel's «Add member» suggestions share.
 * Zod-free (islands import it). The list itself is the house's alone: the
 * server refuses anyone else (lib/accounts-source.ts `answerCitizens`), and
 * these helpers never ask for it unless the session is the house's — an
 * Oracle's, the same rank the server reads from the signed cookie.
 */

import {
  readCitizens,
  readProblem,
  shortWallet,
  type Citizen,
  type DeskAccount,
  type ProblemKey,
} from './accounts';

/** The list's one address: islands reach it only through this module. */
export const CITIZENS_API = '/api/admin/citizens';

/** Characters typed before «Add member» suggests anyone. */
export const SUGGEST_MIN = 2;
/** The most people one suggestion list shows. */
export const SUGGEST_MAX = 8;

/** The rank that is the house's staff while the alpha lasts (lib/auth/session-wallet.ts). */
const HOUSE_RANK = 'oracle';

const FULL_WALLET = /^0x[0-9a-fA-F]{40}$/;

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** The list's address for a search and a cursor. */
export function citizensUrl(query: string, cursor: string | null = null): string {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q !== '') params.set('q', q);
  if (cursor !== null) params.set('cursor', cursor);
  const search = params.toString();
  return search === '' ? CITIZENS_API : `${CITIZENS_API}?${search}`;
}

/** Whether the page's session is the house: signed in with the Oracle rank, and nothing else. */
export function isHouseSession(view: { readonly status: string; readonly rank?: string }): boolean {
  return view.status === 'in' && view.rank === HOUSE_RANK;
}

/** The list as a screen draws it: a page, or why there is none. */
export type CitizensSheet =
  | {
      readonly at: 'ready';
      readonly people: readonly Citizen[];
      readonly total: number;
      readonly next: string | null;
    }
  | { readonly at: 'forbidden' }
  | { readonly at: 'not-bound' }
  | { readonly at: 'failed' };

/** One read of the list; never throws. */
export async function loadCitizens(
  fetcher: Fetch,
  query: string,
  cursor: string | null = null,
): Promise<CitizensSheet> {
  try {
    const response = await fetcher(citizensUrl(query, cursor), {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    });
    const json: unknown = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) return { at: 'forbidden' };
    if (response.status === 503) return { at: 'not-bound' };
    const page = response.ok ? readCitizens(json) : null;
    return page === null ? { at: 'failed' } : { at: 'ready', ...page };
  } catch {
    return { at: 'failed' };
  }
}

/**
 * The people «Add member» suggests for what was typed: for the house alone
 * — anyone else is never asked about, not even once — and only once a
 * couple of characters are typed that are not already a whole wallet.
 */
export async function suggestCitizens(
  house: boolean,
  typed: string,
  fetcher: Fetch,
): Promise<readonly Citizen[]> {
  const query = typed.trim();
  if (!house || query.length < SUGGEST_MIN || FULL_WALLET.test(query)) return [];
  const sheet = await loadCitizens(fetcher, query);
  return sheet.at === 'ready' ? sheet.people.slice(0, SUGGEST_MAX) : [];
}

/** A person's two lines: the name they published over the short wallet, or the short wallet alone. */
export function personLines(person: Citizen): {
  readonly title: string;
  readonly sub: string | null;
} {
  const short = shortWallet(person.wallet);
  return person.name === null ? { title: short, sub: null } : { title: person.name, sub: short };
}

/** An instant kept in UTC, as the visitor reads it in their own zone (or `timeZone`). */
export function seenAt(instant: string, locale: string, timeZone?: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone === undefined ? {} : { timeZone }),
  }).format(date);
}

/** The organizations someone may be added to: the overview's teams, by name. */
export function teamsToJoin(
  accounts: readonly DeskAccount[],
): readonly { readonly id: string; readonly name: string }[] {
  return accounts
    .filter((account) => account.kind === 'team')
    .map((account) => ({ id: account.id, name: account.name ?? account.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Why the till refused an add, in the person's words: the Saldo panel's
 * sentences for the till's refusals. A refusal that needs a permission, or
 * the till not being set up, has no sentence of its own here: it is told
 * in the one line («La caja no lo ha permitido»).
 */
export function refusalWords(
  problems: readonly string[],
  sentences: Readonly<Record<Exclude<ProblemKey, 'needs' | 'notConfigured'>, string>> & {
    readonly other: string;
  },
): string {
  const { key } = readProblem(problems);
  return key === 'needs' || key === 'notConfigured' ? sentences.other : sentences[key];
}

/** The option a listbox's key moves to (ARIA combobox pattern): -1 for none. */
export function listboxStep(current: number, length: number, key: string): number {
  if (length === 0) return -1;
  if (key === 'ArrowDown') return current < 0 || current >= length - 1 ? 0 : current + 1;
  if (key === 'ArrowUp') return current <= 0 ? length - 1 : current - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return current;
}
