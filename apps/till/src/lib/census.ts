/**
 * The list of who has signed in (cut «El censo», 2026-10-16), the pure
 * part: what numinia.com sends to read it — a search and a cursor — read as
 * untrusted, and the words of its refusals. Pure — no database. A malformed
 * field is a problem in words, never a throw.
 */

import { readWallet } from './accounts';
import { isInstant } from './utc-day';

/** The most people one page of the list carries. */
export const CENSUS_PAGE = 200;

/** The longest search, in UTF-16 units once trimmed. */
export const CENSUS_QUERY_MAX = 100;

export const CENSUS_PROBLEMS = {
  notHouse: 'only the house reads the list of who has signed in',
  query: `query must be text of ${CENSUS_QUERY_MAX} characters at most, none of them a control character`,
  cursor: 'cursor must be one this list gave',
} as const;

/** C0, DEL and C1: nothing a search holds. */
// eslint-disable-next-line no-control-regex -- a search never holds a control character
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** Where one page ended: its last person's last time and wallet. */
export interface CensusCursor {
  readonly lastSeenAt: string;
  readonly wallet: string;
}

/** A search, trimmed ('' for everyone), or undefined when it is not one. */
export function readCensusQuery(value: unknown): string | undefined {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return undefined;
  const query = value.trim();
  return query.length <= CENSUS_QUERY_MAX && !CONTROL.test(query) ? query : undefined;
}

const SEPARATOR = '~';

/** The cursor the list hands out after a page ending with `last`. */
export function cursorOf(last: CensusCursor): string {
  return `${last.lastSeenAt}${SEPARATOR}${last.wallet}`;
}

/** A cursor this list gave, null for the first page, undefined when it is neither. */
export function readCensusCursor(value: unknown): CensusCursor | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  const [lastSeenAt, wallet, ...rest] = value.split(SEPARATOR);
  if (rest.length > 0 || lastSeenAt === undefined || !isInstant(lastSeenAt)) return undefined;
  const read = readWallet(wallet);
  return read === undefined ? undefined : { lastSeenAt, wallet: read };
}
