/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17): encounters
 * («encuentros», code `ritual`) published from the site by someone who runs
 * a community, kept in the till (apps/till migration 0015), shown next to
 * the register's files everywhere the files are shown.
 *
 * - The pure part (top): a till row turned into the same `Ritual` shape the
 *   pages read (`ritualFromTill`), the merge of files and rows
 *   (`allRituals`), the readers of what a browser sends and the words of
 *   the till's refusals. The fixture desk and the pages share these.
 * - The doors (bottom, server only): POST /api/ritual (publish), POST
 *   /api/ritual/cancel, GET /api/rituals?upcoming=1 (public, cached 60 s),
 *   each answered from the till's desk. Who asks is the session's, read
 *   from our own signed cookie, never from a body; the trust model is
 *   lib/accounts-source.ts's.
 */

import { z } from 'zod';
import type { AccountDesk, Asker, DeskRitual, DeskRitualDraft, DeskRitualMode } from './accounts';
import {
  byStart,
  type Community,
  type Localized,
  type Ritual,
  type RitualStatus,
} from './communities';
import { readCommunityId } from './community-teams';
import { logEvent } from './telemetry';
import { answer, ask, bodyOf, lowercase, notBound, type Log } from './worlds-homes';

const RITUAL_MODES = ['in-person', 'online', 'mixed'] as const satisfies readonly DeskRitualMode[];

/** The lengths the till holds too (apps/till lib/rituals.ts). */
export const RITUAL_TITLE_MAX = 120;
export const RITUAL_WHERE_MAX = 200;
export const RITUAL_NOTE_MAX = 600;

const TILL_RITUAL_ID = /^rit_[0-9a-f]{16}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const WORLD_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** The till's words for each refusal (apps/till lib/rituals.ts RITUAL_PROBLEMS), which the routes read. */
export const RITUAL_PROBLEMS = {
  draft: 'draft: { communityId, title, start, end?, mode, where, note?, worldId? }',
  ritualId: 'ritualId must be an encounter id of the till (rit_ and 16 hex)',
  notAllowed:
    'only the house or an administrator of the community publishes and cancels its encounters',
  noSuchRitual: 'no such encounter',
  cancelled: 'that encounter is cancelled already',
  noOrganization: 'the organization of that community is not open: nobody runs it yet',
} as const;

/** A till id (`rit_` and 16 hex) tells a till encounter from a file's (a slug). */
export function isTillRitualId(id: string): boolean {
  return TILL_RITUAL_ID.test(id);
}

export function readTillRitualId(value: unknown): string | undefined {
  return typeof value === 'string' && TILL_RITUAL_ID.test(value) ? value : undefined;
}

/** Trimmed text of 1 to `max` characters without control characters, or undefined. */
function readText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || CONTROL.test(value)) return undefined;
  const text = value.trim();
  return text.length >= 1 && text.length <= max ? text : undefined;
}

/** The note: null for nothing or blank, the trimmed text up to 600 clean characters, undefined otherwise. */
export function readRitualNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || CONTROL.test(value)) return undefined;
  const note = value.trim();
  if (note.length === 0) return null;
  return note.length <= RITUAL_NOTE_MAX ? note : undefined;
}

function readMode(value: unknown): DeskRitualMode | undefined {
  return RITUAL_MODES.some((mode) => mode === value) ? (value as DeskRitualMode) : undefined;
}

/** When: both days (the end its inclusive last day, absent = the start) or both UTC instants, the end not before the start. */
function readWhen(start: unknown, end: unknown): { start: string; end: string | null } | undefined {
  if (typeof start !== 'string') return undefined;
  if (end !== undefined && end !== null && typeof end !== 'string') return undefined;
  const last = typeof end === 'string' ? end : null;
  const asDay = DAY.test(start);
  if (!asDay && !INSTANT.test(start)) return undefined;
  if (Number.isNaN(Date.parse(asDay ? `${start}T00:00:00Z` : start))) return undefined;
  if (last === null) return { start, end: null };
  if (asDay ? !DAY.test(last) : !INSTANT.test(last)) return undefined;
  if (Number.isNaN(Date.parse(asDay ? `${last}T00:00:00Z` : last)) || last < start)
    return undefined;
  return { start, end: last };
}

/** What a browser sends to publish — `{ communityId, title, start, end?, mode, where, note?, worldId? }` — or null. */
export function readRitualDraft(json: unknown): DeskRitualDraft | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const record = json as Readonly<Record<string, unknown>>;
  const communityId = readCommunityId(record.communityId);
  const title = readText(record.title, RITUAL_TITLE_MAX);
  const when = readWhen(record.start, record.end);
  const mode = readMode(record.mode);
  const where = readText(record.where, RITUAL_WHERE_MAX);
  const note = readRitualNote(record.note);
  const worldId =
    record.worldId === undefined || record.worldId === null
      ? null
      : typeof record.worldId === 'string' && WORLD_ID.test(record.worldId)
        ? record.worldId
        : undefined;
  const known = ['communityId', 'title', 'start', 'end', 'mode', 'where', 'note', 'worldId'];
  if (
    Object.keys(record).some((key) => !known.includes(key)) ||
    communityId === undefined ||
    title === undefined ||
    when === undefined ||
    mode === undefined ||
    where === undefined ||
    note === undefined ||
    worldId === undefined
  ) {
    return null;
  }
  return { communityId, title, start: when.start, end: when.end, mode, where, note, worldId };
}

/** The same text in every locale: a published title or place is a proper name, as TRG26 is. */
function everywhere(text: string): Localized {
  return { en: text, es: text, ja: text, ko: text, 'pt-br': text };
}

const DAY_MS = 86_400_000;

/** Upcoming until the encounter is over (the day after its last day, or its end instant); held after. */
export function tillStatus(row: Pick<DeskRitual, 'end' | 'allDay'>, nowMs: number): RitualStatus {
  const over = row.allDay ? Date.parse(`${row.end}T00:00:00Z`) + DAY_MS : Date.parse(row.end);
  return nowMs < over ? 'upcoming' : 'held';
}

/**
 * A till row as the pages read a file: title and place in every locale,
 * the note as a note, `source` naming the community (what the page shows
 * under «Leído en»), no programme, no image, never of the whole city.
 */
export function ritualFromTill(row: DeskRitual, communityName: string, nowMs: number): Ritual {
  return {
    id: row.id,
    community: row.communityId,
    title: everywhere(row.title),
    start: row.start,
    end: row.end,
    allDay: row.allDay,
    mode: row.mode,
    status: tillStatus(row, nowMs),
    city: false,
    where: everywhere(row.where),
    programme: undefined,
    note: row.note === null ? undefined : everywhere(row.note),
    source: { name: communityName, date: row.createdAt.slice(0, 10) },
    image: undefined,
  };
}

/**
 * Every encounter: the register's files and the till's rows of published
 * communities (a row of a community the register lacks is dropped), by
 * start. The pages that cannot ask the till (static ones) pass no rows and
 * fetch them in the browser into their `data-rituals-live` slot.
 */
export function allRituals(
  files: readonly Ritual[],
  rows: readonly DeskRitual[],
  communities: readonly Community[],
  nowMs: number,
): readonly Ritual[] {
  const fromTill = rows.flatMap((row) => {
    const community = communities.find((entry) => entry.id === row.communityId);
    return community === undefined ? [] : [ritualFromTill(row, community.name, nowMs)];
  });
  return [...files, ...fromTill].sort(byStart);
}

// ---- The doors (server only) -------------------------------------------------

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const ritual = z.object({
  id: z.string(),
  communityId: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
  mode: z.enum(RITUAL_MODES),
  where: z.string(),
  note: z.string().nullable(),
  worldId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  cancelledAt: z.string().nullable(),
});

const SHAPES = {
  one: z.union([z.object({ ok: z.literal(true), ritual }), refusal]),
  maybe: z.union([z.object({ ok: z.literal(true), ritual: ritual.nullable() }), refusal]),
  list: z.union([z.object({ ok: z.literal(true), rituals: z.array(ritual) }), refusal]),
} as const;

/** The till's refusal as the browser gets it: 403 for the door, 404 for an encounter not there, 409 for one cancelled, else 400. */
function refused(problems: readonly string[]): Response {
  const status =
    problems.includes(RITUAL_PROBLEMS.notAllowed) ||
    problems.includes(RITUAL_PROBLEMS.noOrganization)
      ? 403
      : problems.includes(RITUAL_PROBLEMS.noSuchRitual)
        ? 404
        : problems.includes(RITUAL_PROBLEMS.cancelled)
          ? 409
          : 400;
  return answer({ error: 'refused', problems }, status);
}

/**
 * POST /api/ritual: the signed-in person publishes an encounter of a
 * community they run. 401 with no session; 404 for a community the register
 * lacks; 400 for a body out of shape; the till's refusals with their status.
 */
export async function answerCreateRitual(
  desk: AccountDesk | null,
  asker: Asker | null,
  register: readonly Community[],
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return answer({ error: 'sign-in' }, 401);
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const draft = readRitualDraft(body.json);
  if (draft === null) return answer({ error: RITUAL_PROBLEMS.draft }, 400);
  if (!register.some((community) => community.id === draft.communityId)) {
    return answer({ error: 'no-community' }, 404);
  }
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'createRitual',
    () => desk.createRitual(lowercase(asker), draft, asker.house),
    SHAPES.one,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  log({ level: 'info', kind: 'ritual', action: 'created', community: draft.communityId });
  return answer({ ok: true, ritual: asked.value.ritual });
}

/** POST /api/ritual/cancel `{ ritualId }`: the same people cancel; once. */
export async function answerCancelRitual(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return answer({ error: 'sign-in' }, 401);
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const record =
    typeof body.json === 'object' && body.json !== null && !Array.isArray(body.json)
      ? (body.json as Readonly<Record<string, unknown>>)
      : {};
  const ritualId = readTillRitualId(record.ritualId);
  if (ritualId === undefined || Object.keys(record).length !== 1) {
    return answer({ error: 'body: { ritualId }' }, 400);
  }
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'cancelRitual',
    () => desk.cancelRitual(lowercase(asker), ritualId, asker.house),
    SHAPES.one,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  log({
    level: 'info',
    kind: 'ritual',
    action: 'cancelled',
    community: asked.value.ritual.communityId,
  });
  return answer({ ok: true, ritual: asked.value.ritual });
}

/** The public list is the same for everyone: a minute in any cache. */
const PUBLIC_HEADERS = { 'cache-control': 'public, max-age=60' } as const;

/** What the public list carries: the row and the community's name, for a browser to draw a row. */
export interface PublicRitual extends DeskRitual {
  readonly communityName: string;
}

/**
 * GET /api/rituals?upcoming=1&comunidad=a,b: the not cancelled encounters of
 * the till for the published communities, soonest first, each with its
 * community's name. Public, cached a minute; 503 without a till or with one
 * older than the method — the lists then show the files alone.
 */
export async function answerRituals(
  desk: AccountDesk | null,
  communities: readonly Community[],
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  const upcoming = url.searchParams.get('upcoming') === '1';
  const asked = url.searchParams.get('comunidad');
  const ids = asked === null ? null : asked.split(',').map(readCommunityId);
  if (ids !== null && ids.some((id) => id === undefined)) {
    return answer({ error: 'comunidad must be community ids' }, 400);
  }
  if (desk === null) return notBound();
  const listed = await ask(
    log,
    'ritualsOf',
    () => desk.ritualsOf(ids as readonly string[] | null, upcoming),
    SHAPES.list,
  );
  if (!listed.ok) return listed.response;
  if ('problems' in listed.value) return refused(listed.value.problems);
  const rituals: PublicRitual[] = listed.value.rituals.flatMap((row) => {
    const community = communities.find((entry) => entry.id === row.communityId);
    return community === undefined ? [] : [{ ...row, communityName: community.name }];
  });
  return Response.json({ ok: true, rituals }, { headers: PUBLIC_HEADERS });
}

/** One till encounter for its page, cancelled or not: null when the till has none or is not there. */
export async function tillRitual(
  desk: AccountDesk | null,
  id: string,
  log: Log = logEvent,
): Promise<DeskRitual | null> {
  if (desk === null) return null;
  const asked = await ask(log, 'ritual', () => desk.ritual(id), SHAPES.maybe);
  if (!asked.ok || 'problems' in asked.value) return null;
  return asked.value.ritual;
}

/** The till's rows for a page rendered on demand: empty when the till is not there or refuses. */
export async function tillRituals(
  desk: AccountDesk | null,
  communityIds: readonly string[] | null,
  upcoming: boolean,
  log: Log = logEvent,
): Promise<readonly DeskRitual[]> {
  if (desk === null) return [];
  const asked = await ask(
    log,
    'ritualsOf',
    () => desk.ritualsOf(communityIds, upcoming),
    SHAPES.list,
  );
  if (!asked.ok || 'problems' in asked.value) return [];
  return asked.value.rituals;
}
