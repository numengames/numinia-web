/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17), the form's pure part:
 * which communities of the register the signed-in person runs (from the
 * desk's overview), and how the fields of /crear/encuentro/ become the
 * draft POST /api/ritual takes. Shared by the page (server) and its script
 * (browser): no zod, no fetch.
 */

import type { DeskAccount, DeskRitualDraft, DeskRitualMode } from './accounts';
import type { Community } from './communities';

/** A community of the register with the account that runs it, as the form lists them. */
export interface RunCommunity {
  readonly id: string;
  readonly name: string;
  readonly accountId: string;
}

/**
 * The communities the wallet administers: those whose organization — the
 * one the register's file links (`team`) or the one the house opened under
 * the derived id (`derived`) — lists the wallet as owner or admin.
 */
export function administered(
  accounts: readonly DeskAccount[],
  communities: readonly Community[],
  derived: ReadonlyMap<string, string>,
): readonly RunCommunity[] {
  const run = new Map(
    accounts
      .filter((account) => account.kind === 'team' && account.role !== 'member')
      .map((account) => [account.id, account] as const),
  );
  return communities.flatMap((community) => {
    const ids = [community.team, derived.get(community.id)].filter(
      (id): id is string => id !== undefined,
    );
    const account = ids.map((id) => run.get(id)).find((found) => found !== undefined);
    return account === undefined
      ? []
      : [{ id: community.id, name: community.name, accountId: account.id }];
  });
}

/** How people meet, as the form's radios say it: `world` is online in the community's world. */
export type MeetHow = 'in-person' | 'online' | 'world';

/** The form's fields as the browser reads them, every one a string (empty for nothing). */
export interface EncounterFields {
  readonly community: string;
  readonly title: string;
  readonly day: string;
  readonly time: string;
  readonly endDay: string;
  readonly endTime: string;
  readonly how: string;
  readonly world: string;
  readonly where: string;
  readonly note: string;
}

/** Which field is wrong, for the form to say it under that field. */
export type FieldProblem =
  'community' | 'title' | 'day' | 'end' | 'how' | 'world' | 'where' | 'note';

export type DraftOutcome =
  | { readonly ok: true; readonly draft: DeskRitualDraft }
  | { readonly ok: false; readonly problem: FieldProblem };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
export const TITLE_MAX = 120;
export const WHERE_MAX = 200;
export const NOTE_MAX = 600;

/** A local day and time (the browser's zone) as a UTC instant, via the browser's own Date. */
export type ToInstant = (day: string, time: string) => string;

/** The browser's: `new Date('YYYY-MM-DDTHH:MM')` reads local time. */
export const localInstant: ToInstant = (day, time) => new Date(`${day}T${time}`).toISOString();

const MODE_OF: Readonly<Record<MeetHow, DeskRitualMode>> = {
  'in-person': 'in-person',
  online: 'online',
  world: 'online',
};

/**
 * The draft from the fields: a whole-day encounter when no time is given
 * (the end day optional, not before the day), a timed one when it is (the
 * end time on the same or the end day, after the start). «In its world»
 * needs a world. Trimming is the till's; lengths are checked here so the
 * form says which field.
 */
export function draftFrom(fields: EncounterFields, toInstant: ToInstant): DraftOutcome {
  if (fields.community === '') return { ok: false, problem: 'community' };
  const title = fields.title.trim();
  if (title.length === 0 || title.length > TITLE_MAX) return { ok: false, problem: 'title' };
  if (!DAY.test(fields.day) || Number.isNaN(Date.parse(`${fields.day}T00:00:00Z`))) {
    return { ok: false, problem: 'day' };
  }
  if (fields.time !== '' && !TIME.test(fields.time)) return { ok: false, problem: 'day' };
  if (fields.endDay !== '' && (!DAY.test(fields.endDay) || fields.endDay < fields.day)) {
    return { ok: false, problem: 'end' };
  }
  if (fields.endTime !== '' && !TIME.test(fields.endTime)) return { ok: false, problem: 'end' };
  const how = (['in-person', 'online', 'world'] as const).find((value) => value === fields.how);
  if (how === undefined) return { ok: false, problem: 'how' };
  if (how === 'world' && fields.world === '') return { ok: false, problem: 'world' };
  const where = fields.where.trim();
  if (where.length === 0 || where.length > WHERE_MAX) return { ok: false, problem: 'where' };
  const note = fields.note.trim();
  if (note.length > NOTE_MAX) return { ok: false, problem: 'note' };
  let start = fields.day;
  let end: string | null = fields.endDay === '' ? null : fields.endDay;
  if (fields.time !== '') {
    start = toInstant(fields.day, fields.time);
    if (fields.endTime !== '') {
      end = toInstant(fields.endDay === '' ? fields.day : fields.endDay, fields.endTime);
      if (Date.parse(end) < Date.parse(start)) return { ok: false, problem: 'end' };
    } else if (fields.endDay !== '') {
      // A timed start with an end day and no end time: the end is that day's same time.
      end = toInstant(fields.endDay, fields.time);
    } else {
      end = null;
    }
  }
  return {
    ok: true,
    draft: {
      communityId: fields.community,
      title,
      start,
      end,
      mode: MODE_OF[how],
      where,
      note: note.length === 0 ? null : note,
      worldId: how === 'world' ? fields.world : null,
    },
  };
}
