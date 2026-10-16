/**
 * «Hazla tuya» for real (cut G, 2026-10-17), the store's half: a signed-in
 * person claims a community of the register («Es mi comunidad»: they run it
 * and would be its Titular) or asks to join it («Quiero entrar»), with an
 * optional line about themselves. The request stays open until the house or
 * an administrator of the community's organization accepts or declines it;
 * every one is kept — the claim rate is the beta's measure.
 *
 * Three doors, each answered here from the till's desk:
 * - POST /api/community-request `{ community, kind, note? }` and GET
 *   `?comunidad=` for the signed-in person's own.
 * - GET /api/admin/community-requests `?comunidad=` (the house or an
 *   administrator) or none (the house: every open one of the register).
 * - POST /api/admin/community-request/decide `{ request, accept }`.
 *
 * Who asks is the session's, read from our own signed cookie
 * (lib/auth/session-wallet.ts `sessionAsker`), never from a body. The trust
 * model is lib/accounts-source.ts's. Server only, except the readers and
 * words at the top, which the fixture desk and the screen share.
 */

import { z } from 'zod';
import type { AccountDesk, Asker, DeskRequestKind } from './accounts';
import type { Community } from './communities';
import { readCommunityId } from './community-teams';
import { logEvent } from './telemetry';
import { answer, ask, bodyOf, forbidden, lowercase, notBound, type Log } from './worlds-homes';

export const REQUEST_KINDS = ['claim', 'join'] as const satisfies readonly DeskRequestKind[];

/** «Cuéntanos quién eres» is this long at most — the till's limit too. */
export const NOTE_MAX = 280;

const REQUEST_ID = /^req_[0-9a-f]{32}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** The till's words for each refusal (apps/till lib/community-requests.ts REQUEST_PROBLEMS), which the routes read. */
export const REQUEST_PROBLEMS = {
  community: 'communityId must be a community id',
  kind: `kind must be one of: ${REQUEST_KINDS.join(', ')}`,
  note: `note must be text of ${NOTE_MAX} characters at most, none of them a control character, or null`,
  requestId: 'requestId must be a request id',
  accept: 'accept must be true or false',
  member: 'already a member of that community',
  hasOwner: 'that community has a titular already: ask to join it',
  notAllowed: 'only the house or an administrator of the community sees and decides its requests',
  noSuchRequest: 'no such request',
  decided: 'that request is decided already',
  noOrganization: 'the organization of that community is not open: the house opens it with a name',
} as const;

export function readRequestKind(value: unknown): DeskRequestKind | undefined {
  return REQUEST_KINDS.some((kind) => kind === value) ? (value as DeskRequestKind) : undefined;
}

/** The note: null for nothing or blank, the trimmed text up to 280 clean characters, undefined otherwise. */
export function readRequestNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || CONTROL.test(value)) return undefined;
  const note = value.trim();
  if (note.length === 0) return null;
  return note.length <= NOTE_MAX ? note : undefined;
}

export function readRequestId(value: unknown): string | undefined {
  return typeof value === 'string' && REQUEST_ID.test(value) ? value : undefined;
}

/** The body of a request — `{ community, kind, note? }` — or null. */
export function readRequestBody(json: unknown): {
  readonly community: string;
  readonly kind: DeskRequestKind;
  readonly note: string | null;
} | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const record = json as Readonly<Record<string, unknown>>;
  const community = readCommunityId(record.community);
  const kind = readRequestKind(record.kind);
  const note = readRequestNote(record.note);
  const keys = Object.keys(record).filter((key) => key !== 'note');
  if (keys.length !== 2 || community === undefined || kind === undefined || note === undefined) {
    return null;
  }
  return { community, kind, note };
}

/** The body of a decision — `{ request, accept, community }` — or null. */
export function readDecideBody(
  json: unknown,
): { readonly request: string; readonly accept: boolean; readonly community: string } | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const record = json as Readonly<Record<string, unknown>>;
  const request = readRequestId(record.request);
  const community = readCommunityId(record.community);
  if (
    Object.keys(record).length !== 3 ||
    request === undefined ||
    community === undefined ||
    typeof record.accept !== 'boolean'
  ) {
    return null;
  }
  return { request, accept: record.accept, community };
}

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const request = z.object({
  id: z.string(),
  communityId: z.string(),
  wallet: z.string(),
  kind: z.enum(REQUEST_KINDS),
  note: z.string().nullable(),
  state: z.enum(['open', 'accepted', 'declined']),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  decidedBy: z.string().nullable(),
});
const entry = request.extend({ name: z.string().nullable(), avatar: z.string().nullable() });

const SHAPES = {
  one: z.union([z.object({ ok: z.literal(true), request }), refusal]),
  mine: z.union([
    z.object({
      ok: z.literal(true),
      requests: z.array(request),
      standing: z.object({ member: z.boolean(), hasOwner: z.boolean() }).optional(),
    }),
    refusal,
  ]),
  open: z.union([z.object({ ok: z.literal(true), requests: z.array(entry) }), refusal]),
} as const;

/** The till's refusal as the browser gets it: 403 for the door, 404 for a request not there, 409 for one decided or a claim of a community with a titular, else 400. */
function refused(problems: readonly string[]): Response {
  const status = problems.includes(REQUEST_PROBLEMS.notAllowed)
    ? 403
    : problems.includes(REQUEST_PROBLEMS.noSuchRequest)
      ? 404
      : problems.includes(REQUEST_PROBLEMS.decided) ||
          problems.includes(REQUEST_PROBLEMS.hasOwner) ||
          problems.includes(REQUEST_PROBLEMS.member)
        ? 409
        : 400;
  return answer({ error: 'refused', problems }, status);
}

/** `?comunidad=` as a community id, null when absent, undefined when malformed. */
function communityParam(url: URL): string | null | undefined {
  const raw = url.searchParams.get('comunidad');
  return raw === null ? null : readCommunityId(raw);
}

/**
 * POST /api/community-request: the signed-in person claims a community or
 * asks to join it. 401 with no session; 404 for a community the register
 * lacks; 400 for a body out of shape; the till's refusals with their status.
 */
export async function answerRequestCommunity(
  desk: AccountDesk | null,
  asker: Asker | null,
  register: readonly Community[],
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return answer({ error: 'sign-in' }, 401);
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readRequestBody(body.json);
  if (read === null) return answer({ error: 'body: { community, kind, note? }' }, 400);
  if (!register.some((community) => community.id === read.community)) {
    return answer({ error: 'no-community' }, 404);
  }
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'requestCommunity',
    () => desk.requestCommunity(lowercase(asker), read.community, read.kind, read.note),
    SHAPES.one,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  log({ level: 'info', kind: 'community-request', action: read.kind, community: read.community });
  return answer({ ok: true, request: asked.value.request });
}

/** GET /api/community-request?comunidad=: the signed-in person's own requests, newest first. */
export async function answerMyRequests(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return answer({ error: 'sign-in' }, 401);
  const community = communityParam(url);
  if (community === undefined) return answer({ error: 'comunidad must be a community id' }, 400);
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'myCommunityRequests',
    () => desk.myCommunityRequests(lowercase(asker), community),
    SHAPES.mine,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  const { requests, standing } = asked.value;
  return answer({ ok: true, requests, ...(standing === undefined ? {} : { standing }) });
}

/**
 * GET /api/admin/community-requests[?comunidad=]: the open requests of a
 * community to the house or an administrator of it; every open one to the
 * house. 403 with no session; the till says who else may not.
 */
export async function answerCommunityRequests(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return forbidden();
  const community = communityParam(url);
  if (community === undefined) return answer({ error: 'comunidad must be a community id' }, 400);
  if (community === null && !asker.house) return forbidden();
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'communityRequests',
    () => desk.communityRequests(lowercase(asker), asker.house, community),
    SHAPES.open,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ ok: true, requests: asked.value.requests });
}

/**
 * POST /api/admin/community-request/decide `{ request, accept, community }`:
 * the house or an administrator accepts or declines. `community` is the
 * request's, as the list showed it; the register's name of it goes to the
 * till, for the house to open the organization when a claim is accepted
 * before it is open (only the house can, and the house is trusted with the
 * name). 404 for a community the register lacks.
 */
export async function answerDecide(
  desk: AccountDesk | null,
  asker: Asker | null,
  register: readonly Community[],
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return forbidden();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readDecideBody(body.json);
  if (read === null) return answer({ error: 'body: { request, accept, community }' }, 400);
  const community = register.find((entry) => entry.id === read.community);
  if (community === undefined) return answer({ error: 'no-community' }, 404);
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'decideCommunityRequest',
    () =>
      desk.decideCommunityRequest(
        lowercase(asker),
        read.request,
        read.accept,
        asker.house,
        community.name,
      ),
    SHAPES.one,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  const { kind, communityId } = asked.value.request;
  log({
    level: 'info',
    kind: 'community-request',
    action: read.accept ? `${kind}-accepted` : `${kind}-declined`,
    community: communityId,
  });
  return answer({ ok: true, request: asked.value.request });
}
