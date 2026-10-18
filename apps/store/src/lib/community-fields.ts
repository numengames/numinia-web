/**
 * Card t_371c917d (2026-10-18): while a community of the register has no
 * titular yet, the house (an Oracle, from the community's own page) renames
 * it and fills in its summary — a house override that persists past a
 * reload, the same way a world's own name does (`world-homes.ts`
 * `renameWorld`). Reused, not duplicated: the till refuses the edit once
 * somebody is the titular (`hasOwner`, the same refusal «Hazla tuya» reads).
 *
 * Who asks is the session's, read from our own signed cookie
 * (lib/auth/session-wallet.ts `sessionAsker`), never from a body. The trust
 * model is lib/accounts-source.ts's.
 */

import { z } from 'zod';
import type { AccountDesk, Asker } from './accounts';
import { readCommunityId } from './community-teams';
import { logEvent } from './telemetry';
import { answer, ask, bodyOf, forbidden, lowercase, notBound, type Log } from './worlds-homes';

/** The till's own words (apps/till src/lib/community-fields.ts), which the route reads. */
export const COMMUNITY_FIELDS_PROBLEMS = {
  community: 'communityId must be a community id',
  name: 'name must be 1 to 80 characters, with no leading or trailing blank',
  summary: 'summary must be 1 to 600 characters, with no leading or trailing blank',
  nothing: 'body must send name and/or summary',
  notHouse: 'only the house edits a community’s card',
  hasOwner: 'that community has a titular already: ask the community to edit its own page',
} as const;

const NAME_MAX = 80;
const SUMMARY_MAX = 600;
// eslint-disable-next-line no-control-regex -- deliberately matches control characters to reject them
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed !== value || trimmed.length < 1 || trimmed.length > max) return undefined;
  return CONTROL_CHAR.test(trimmed) ? undefined : trimmed;
}

/** A community's new name as the Oracle sends it, or undefined when it is not that. */
export function communityFieldName(value: unknown): string | undefined {
  return cleanText(value, NAME_MAX);
}

/** A community's new summary as the Oracle sends it, or undefined when it is not that. */
export function communityFieldSummary(value: unknown): string | undefined {
  return cleanText(value, SUMMARY_MAX);
}

/** The body of an edit — `{ community, name?, summary? }`, at least one — or null. */
export function readEditBody(
  json: unknown,
): { readonly community: string; readonly name?: string; readonly summary?: string } | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const record = json as Readonly<Record<string, unknown>>;
  const community = readCommunityId(record['community']);
  const keys = Object.keys(record).filter((key) => key !== 'community');
  if (community === undefined || keys.length < 1 || keys.length > 2) return null;
  const name = record['name'] === undefined ? undefined : communityFieldName(record['name']);
  const summary =
    record['summary'] === undefined ? undefined : communityFieldSummary(record['summary']);
  if (('name' in record && name === undefined) || ('summary' in record && summary === undefined)) {
    return null;
  }
  if (!keys.every((key) => key === 'name' || key === 'summary')) return null;
  return {
    community,
    ...(name === undefined ? {} : { name }),
    ...(summary === undefined ? {} : { summary }),
  };
}

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const fields = z.object({
  communityId: z.string(),
  name: z.string().nullable(),
  summary: z.string().nullable(),
  editedBy: z.string().nullable(),
  editedAt: z.string(),
});
const SHAPES = {
  fields: z.union([z.object({ ok: z.literal(true), fields: fields.nullable() }), refusal]),
} as const;

function refused(problems: readonly string[]): Response {
  const status = problems.includes(COMMUNITY_FIELDS_PROBLEMS.notHouse)
    ? 403
    : problems.includes(COMMUNITY_FIELDS_PROBLEMS.hasOwner)
      ? 409
      : 400;
  return answer({ error: 'refused', problems }, status);
}

/**
 * POST /api/admin/community-fields/edit, JSON `{ community, name?, summary?
 * }`: the house renames a community of the register, or fills in its
 * summary, while it has no titular yet. 403 for any other session before
 * the body is read; 400 for a body out of shape.
 */
export async function answerEditCommunityFields(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null || !asker.house) return forbidden();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readEditBody(body.json);
  if (read === null) {
    return answer({ error: 'body: { community, name?, summary? }, at least one' }, 400);
  }
  if (desk === null) return notBound();
  const { community, ...change } = read;
  const asked = await ask(
    log,
    'editCommunityFields',
    () => desk.editCommunityFields(lowercase(asker), true, community, change),
    SHAPES.fields,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  log({ level: 'info', kind: 'community-fields', action: 'edited', community });
  return answer({ ok: true, fields: asked.value.fields });
}

/** GET /api/community-fields?comunidad=: the community's house override, public, or null. */
export async function answerCommunityFields(
  desk: AccountDesk | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  const community = readCommunityId(url.searchParams.get('comunidad'));
  if (community === undefined) return answer({ error: 'comunidad must be a community id' }, 400);
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'communityFields',
    () => desk.communityFields(community),
    SHAPES.fields,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ ok: true, fields: asked.value.fields });
}
