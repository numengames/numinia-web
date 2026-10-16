/**
 * «Hazla tuya» for real (cut G) in the browser: what the strip on a
 * community's page and the «Peticiones» lists (the panel's Members, the
 * Census) ask the store's routes, read back strictly, and decide to show.
 * Pure: the fetch comes in, nothing here touches the DOM. The server-side
 * readers (lib/community-requests.ts) stay out of the bundle.
 */

import type {
  DeskCommunityRequest,
  DeskCommunityRequestEntry,
  DeskCommunityStanding,
  DeskRequestKind,
} from './accounts';
import { shortWallet } from './accounts';

export const REQUEST_API = '/api/community-request';
export const REQUESTS_ADMIN_API = '/api/admin/community-requests';
export const DECIDE_API = '/api/admin/community-request/decide';
/** The note's bound, the same the till keeps. */
export const NOTE_MAX = 280;

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };
const WALLET = /^0x[0-9a-f]{40}$/;
const ID = /^req_[0-9a-f]{32}$/;
const COMMUNITY = /^[a-z0-9][a-z0-9-]{0,62}$/;

type Fetch = typeof fetch;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null | undefined =>
  value === null ? null : typeof value === 'string' ? value : undefined;

/** One request as the till answers it, or null when the shape is not that. */
export function readRequest(value: unknown): DeskCommunityRequest | null {
  if (!isRecord(value)) return null;
  const { id, communityId, wallet, kind, note, state, createdAt, decidedAt, decidedBy } = value;
  if (typeof id !== 'string' || !ID.test(id)) return null;
  if (typeof communityId !== 'string' || !COMMUNITY.test(communityId)) return null;
  if (typeof wallet !== 'string' || !WALLET.test(wallet)) return null;
  if (kind !== 'claim' && kind !== 'join') return null;
  if (state !== 'open' && state !== 'accepted' && state !== 'declined') return null;
  if (typeof createdAt !== 'string') return null;
  const readNote = text(note);
  const readAt = text(decidedAt);
  const readBy = text(decidedBy);
  if (readNote === undefined || readAt === undefined || readBy === undefined) return null;
  return {
    id,
    communityId,
    wallet,
    kind,
    note: readNote,
    state,
    createdAt,
    decidedAt: readAt,
    decidedBy: readBy,
  };
}

/** A request with what the asker published, for whoever decides. */
export function readEntry(value: unknown): DeskCommunityRequestEntry | null {
  const request = readRequest(value);
  if (request === null || !isRecord(value)) return null;
  const name = text(value['name']);
  const avatar = text(value['avatar']);
  if (name === undefined || avatar === undefined) return null;
  return { ...request, name, avatar };
}

function readStanding(value: unknown): DeskCommunityStanding | undefined {
  if (!isRecord(value)) return undefined;
  const { member, hasOwner } = value;
  if (typeof member !== 'boolean' || typeof hasOwner !== 'boolean') return undefined;
  return { member, hasOwner };
}

function readList<T>(value: unknown, one: (item: unknown) => T | null): T[] | null {
  if (!isRecord(value) || value['ok'] !== true || !Array.isArray(value['requests'])) return null;
  const items = value['requests'].map(one);
  return items.every((item): item is T => item !== null) ? items : null;
}

/** The refusal's words in a body, or an empty list. */
export function readProblems(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value['problems'])) return [];
  return value['problems'].filter((item): item is string => typeof item === 'string');
}

// ---- The strip -------------------------------------------------------------

/** Where the person stands towards the community, as the strip needs it. */
export interface Mine {
  readonly requests: readonly DeskCommunityRequest[];
  readonly standing: DeskCommunityStanding;
}

export type MineSheet =
  | { readonly at: 'ready'; readonly mine: Mine }
  | { readonly at: 'signed-out' }
  /** The till does not know this door, or the store has no till. */
  | { readonly at: 'unavailable' }
  | { readonly at: 'failed' };

/** GET the person's own requests for one community, with their standing. */
export async function loadMine(fetchFn: Fetch, community: string): Promise<MineSheet> {
  try {
    const response = await fetchFn(`${REQUEST_API}?comunidad=${encodeURIComponent(community)}`, {
      headers: { accept: 'application/json' },
    });
    if (response.status === 401) return { at: 'signed-out' };
    if (response.status === 503) return { at: 'unavailable' };
    const json: unknown = await response.json().catch(() => null);
    const requests = response.ok ? readList(json, readRequest) : null;
    const standing = isRecord(json) ? readStanding(json['standing']) : undefined;
    if (requests === null || standing === undefined) return { at: 'failed' };
    return { at: 'ready', mine: { requests, standing } };
  } catch {
    return { at: 'failed' };
  }
}

/** What the strip shows: which ask it offers, or that one is already open, or nothing. */
export type StripFace =
  | { readonly face: 'claim' }
  | { readonly face: 'join' }
  | { readonly face: 'sent'; readonly kind: DeskRequestKind }
  | { readonly face: 'none' };

/**
 * A member sees nothing. An open ask shows as sent (a claim before a join).
 * Otherwise: a claim while nobody is the titular, a join once somebody is.
 * A declined ask is over: the strip offers the ask again.
 */
export function stripFace(mine: Mine): StripFace {
  if (mine.standing.member) return { face: 'none' };
  const open = (kind: DeskRequestKind) =>
    mine.requests.some((request) => request.kind === kind && request.state === 'open');
  if (open('claim')) return { face: 'sent', kind: 'claim' };
  if (open('join')) return { face: 'sent', kind: 'join' };
  return { face: mine.standing.hasOwner ? 'join' : 'claim' };
}

export type Sent =
  | { readonly ok: true; readonly request: DeskCommunityRequest }
  | { readonly ok: false; readonly why: 'note' | 'signed-out' | 'unavailable' | 'other' };

/** The note as the dialog sends it: trimmed, null when empty, undefined when it cannot go. */
export function noteToSend(typed: string): string | null | undefined {
  const note = typed.trim();
  if (note === '') return null;
  // eslint-disable-next-line no-control-regex -- a line holds no control character
  if (note.length > NOTE_MAX || /[\u0000-\u001f\u007f]/.test(note)) return undefined;
  return note;
}

/** POST one ask. */
export async function sendRequest(
  fetchFn: Fetch,
  community: string,
  kind: DeskRequestKind,
  typed: string,
): Promise<Sent> {
  const note = noteToSend(typed);
  if (note === undefined) return { ok: false, why: 'note' };
  try {
    const response = await fetchFn(REQUEST_API, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ community, kind, ...(note === null ? {} : { note }) }),
    });
    if (response.status === 401) return { ok: false, why: 'signed-out' };
    if (response.status === 503) return { ok: false, why: 'unavailable' };
    const json: unknown = await response.json().catch(() => null);
    const request = response.ok && isRecord(json) ? readRequest(json['request']) : null;
    return request === null ? { ok: false, why: 'other' } : { ok: true, request };
  } catch {
    return { ok: false, why: 'other' };
  }
}

// ---- The lists -------------------------------------------------------------

export type OpenSheet =
  | { readonly at: 'ready'; readonly requests: readonly DeskCommunityRequestEntry[] }
  | { readonly at: 'forbidden' }
  | { readonly at: 'unavailable' }
  | { readonly at: 'failed' };

/** GET the open requests of one community, or of every one (the house, `null`). */
export async function loadOpen(fetchFn: Fetch, community: string | null): Promise<OpenSheet> {
  const url =
    community === null
      ? REQUESTS_ADMIN_API
      : `${REQUESTS_ADMIN_API}?comunidad=${encodeURIComponent(community)}`;
  try {
    const response = await fetchFn(url, { headers: { accept: 'application/json' } });
    if (response.status === 401 || response.status === 403) return { at: 'forbidden' };
    if (response.status === 503) return { at: 'unavailable' };
    const json: unknown = await response.json().catch(() => null);
    const requests = response.ok ? readList(json, readEntry) : null;
    return requests === null ? { at: 'failed' } : { at: 'ready', requests };
  } catch {
    return { at: 'failed' };
  }
}

export type Decided =
  | { readonly ok: true; readonly request: DeskCommunityRequest }
  | { readonly ok: false; readonly why: 'unavailable' | 'other'; readonly problems: string[] };

/** POST one decision; `community` names the community for the organization the house may open. */
export async function decide(
  fetchFn: Fetch,
  request: string,
  accept: boolean,
  community: string,
): Promise<Decided> {
  try {
    const response = await fetchFn(DECIDE_API, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ request, accept, community }),
    });
    if (response.status === 503) return { ok: false, why: 'unavailable', problems: [] };
    const json: unknown = await response.json().catch(() => null);
    const decided = response.ok && isRecord(json) ? readRequest(json['request']) : null;
    if (decided !== null) return { ok: true, request: decided };
    return { ok: false, why: 'other', problems: readProblems(json) };
  } catch {
    return { ok: false, why: 'other', problems: [] };
  }
}

/** The asker as a list names them: the name they published, else the short wallet. */
export function askerOf(entry: DeskCommunityRequestEntry): string {
  return entry.name ?? shortWallet(entry.wallet);
}

/** «{who}» filled in. */
export function withWho(sentence: string, who: string): string {
  return sentence.replace('{who}', who);
}

/** When it was asked, in the visitor's zone. */
export function askedAt(instant: string, locale: string, timeZone?: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone === undefined ? {} : { timeZone }),
  }).format(date);
}
