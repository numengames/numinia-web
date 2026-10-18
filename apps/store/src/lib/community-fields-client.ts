/**
 * Card t_371c917d (2026-10-18) in the browser: the Oracle's two one-step
 * actions on a community's page while it has no titular yet — rename it
 * (or fill in its summary) and add themself as its first member. Pure: the
 * fetch comes in, nothing here touches the DOM.
 */

import { decide, sendRequest } from './community-requests-client';

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };
const FIELDS_API = '/api/community-fields';
const EDIT_API = '/api/admin/community-fields/edit';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type Fetch = typeof fetch;

/** A community's house override, as the till answers it. */
export interface FieldsOverride {
  readonly name: string | null;
  readonly summary: string | null;
}

function readFields(value: unknown): FieldsOverride | null | undefined {
  if (!isRecord(value) || value['ok'] !== true) return undefined;
  const fields = value['fields'];
  if (fields === null) return null;
  if (!isRecord(fields)) return undefined;
  const { name, summary } = fields;
  if (
    (name !== null && typeof name !== 'string') ||
    (summary !== null && typeof summary !== 'string')
  ) {
    return undefined;
  }
  return { name, summary };
}

/** GET the community's house override, or null when there is none or the till cannot say. */
export async function loadFields(
  fetchFn: Fetch,
  community: string,
): Promise<FieldsOverride | null> {
  try {
    const response = await fetchFn(`${FIELDS_API}?comunidad=${encodeURIComponent(community)}`, {
      headers: { accept: 'application/json' },
    });
    const json: unknown = await response.json().catch(() => null);
    return readFields(json) ?? null;
  } catch {
    return null;
  }
}

export type FieldsSaved =
  | { readonly ok: true; readonly fields: FieldsOverride }
  | { readonly ok: false; readonly problems: readonly string[] };

/** POST the Oracle's edit: at least one of a new name or a new summary. */
export async function saveFields(
  fetchFn: Fetch,
  community: string,
  change: { readonly name?: string; readonly summary?: string },
): Promise<FieldsSaved> {
  try {
    const response = await fetchFn(EDIT_API, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ community, ...change }),
    });
    const json: unknown = await response.json().catch(() => null);
    const fields = response.ok ? readFields(json) : undefined;
    if (fields !== undefined && fields !== null) return { ok: true, fields };
    const problems = isRecord(json) && Array.isArray(json['problems']) ? json['problems'] : [];
    return {
      ok: false,
      problems: problems.filter((item): item is string => typeof item === 'string'),
    };
  } catch {
    return { ok: false, problems: [] };
  }
}

export type OracleJoined =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly why: 'signed-out' | 'other';
      readonly problems: readonly string[];
    };

/**
 * The Oracle's one-step «Añadirme como Titular»: a claim, chained straight
 * into its own acceptance — the same two doors «Hazla tuya» already uses,
 * one tap instead of two. Only a house session's claim is ever accepted
 * before the community has an organization (the till's `deciderFor`), so
 * this does nothing for anyone else.
 */
export async function oracleClaim(fetchFn: Fetch, community: string): Promise<OracleJoined> {
  const sent = await sendRequest(fetchFn, community, 'claim', '');
  if (!sent.ok) {
    return sent.why === 'signed-out'
      ? { ok: false, why: 'signed-out', problems: [] }
      : { ok: false, why: 'other', problems: [] };
  }
  const decided = await decide(fetchFn, sent.request.id, true, community);
  if (!decided.ok) return { ok: false, why: 'other', problems: decided.problems };
  return { ok: true };
}
