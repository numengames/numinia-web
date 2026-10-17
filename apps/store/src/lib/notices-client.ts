/**
 * «Avisos» (cut J, 2026-10-17) in the browser: what the page and the bell
 * ask /api/notices, read back strictly, and what «seen» is — the newest
 * moment of the list, kept in localStorage when the page opens, so the dot
 * shows for what is newer and goes after a visit. Pure: the fetch and the
 * storage come in, nothing here touches the DOM.
 */

import type { NoticeAction, NoticeKind } from './notices';
import type { NoticeRow, NoticesAnswer } from './notices-source';

export const NOTICES_API = '/api/notices';
/** Where the browser keeps the newest moment it saw. */
export const SEEN_KEY = 'numinia-notices-seen';

type Fetch = typeof fetch;
type Store = Pick<Storage, 'getItem' | 'setItem'>;

const KINDS: readonly NoticeKind[] = ['encounter', 'world', 'community'];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readAction(value: unknown): NoticeAction | null {
  if (!isRecord(value)) return null;
  const { id, href, request, community } = value;
  if ((id === 'calendar' || id === 'enter') && typeof href === 'string') return { id, href };
  if (
    (id === 'accept' || id === 'later') &&
    typeof request === 'string' &&
    typeof community === 'string'
  ) {
    return { id, request, community };
  }
  return null;
}

/** One row as the route answers it, or null when the shape is not that. */
export function readRow(value: unknown): NoticeRow | null {
  if (!isRecord(value)) return null;
  const { id, kind, at, text, href, when, actions } = value;
  if (typeof id !== 'string' || typeof at !== 'string' || typeof when !== 'string') return null;
  if (!KINDS.some((known) => known === kind)) return null;
  if (!isRecord(text)) return null;
  const { before, subject, after } = text;
  if (typeof before !== 'string' || typeof subject !== 'string' || typeof after !== 'string') {
    return null;
  }
  if (href !== undefined && typeof href !== 'string') return null;
  const read = actions === undefined ? [] : Array.isArray(actions) ? actions.map(readAction) : null;
  if (read === null || read.some((action) => action === null)) return null;
  return {
    id,
    kind: kind as NoticeKind,
    at,
    text: { before, subject, after },
    when,
    ...(href === undefined ? {} : { href }),
    ...(read.length === 0 ? {} : { actions: read as NoticeAction[] }),
  };
}

/** The answer as the route gives it, or null when it is not that. */
export function readAnswer(value: unknown): NoticesAnswer | null {
  if (!isRecord(value) || value['ok'] !== true) return null;
  const { notices, unseen } = value;
  if (!Array.isArray(notices) || typeof unseen !== 'number') return null;
  const rows = notices.map(readRow);
  if (rows.some((row) => row === null)) return null;
  return { ok: true, notices: rows as NoticeRow[], unseen };
}

export type Loaded =
  | { readonly ok: true; readonly answer: NoticesAnswer }
  | { readonly ok: false; readonly why: 'signed-out' | 'other' };

/** GET /api/notices for the locale, with the moment last seen; never throws. */
export async function loadNotices(
  fetchFn: Fetch,
  locale: string,
  since: string | null,
): Promise<Loaded> {
  const query = new URLSearchParams({ locale });
  if (since !== null) query.set('since', since);
  try {
    const response = await fetchFn(`${NOTICES_API}?${query.toString()}`, {
      headers: { accept: 'application/json' },
    });
    if (response.status === 401) return { ok: false, why: 'signed-out' };
    const answer = response.ok ? readAnswer(await response.json().catch(() => null)) : null;
    return answer === null ? { ok: false, why: 'other' } : { ok: true, answer };
  } catch {
    return { ok: false, why: 'other' };
  }
}

/** The moment last seen, or null when none was kept (or the storage is closed). */
export function readSeen(store: Store | null): string | null {
  try {
    const value = store?.getItem(SEEN_KEY) ?? null;
    return value !== null && !Number.isNaN(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

/** Keeps the newest moment of the list as seen; an empty list keeps what was. */
export function markSeen(store: Store | null, rows: readonly NoticeRow[]): string | null {
  const newest = rows.reduce<string | null>(
    (best, row) => (best === null || Date.parse(row.at) > Date.parse(best) ? row.at : best),
    null,
  );
  if (newest === null) return readSeen(store);
  try {
    store?.setItem(SEEN_KEY, newest);
  } catch {
    // A closed storage keeps nothing: the dot shows again next time, and that is all.
  }
  return newest;
}
