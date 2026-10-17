/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17): the encounters
 * published from numinia.com, in migration 0015's `rituals`.
 *
 * - `createRitual`: the house, or an administrator of the community's
 *   organization, publishes an encounter of that community. Logged in the
 *   organization's «Qué ha pasado» (`ritual-created`).
 * - `cancelRitual`: the same people cancel it; the row stays with
 *   `cancelled_at`, logged (`ritual-cancelled`). Cancelling twice is refused.
 * - `ritualsOf`: public — the published, not cancelled encounters of the
 *   communities named (or of all), those ending today or later when
 *   `upcoming` is asked; with an id, that one encounter, cancelled or not,
 *   for its page to say so.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { readWallet } from '../lib/accounts';
import { COMMUNITY_PROBLEMS, communityAccountId, readCommunityId } from '../lib/community-teams';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import {
  RITUAL_PROBLEMS,
  readCommunityIds,
  readMode,
  readRitualNote,
  readTillRitualId,
  readTitle,
  readWhen,
  readWhere,
  readWorldId,
  tillRitualId,
  type RitualMode,
  type TillRitual,
} from '../lib/rituals';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import {
  actingIn,
  commit,
  loadOrganization,
  logLine,
  whole,
  type Acting,
  type Organization,
} from './organizations';
import { column, instant, text, type Row, type TillDatabase } from './repository';

export type RitualAnswer = { readonly ok: true; readonly ritual: TillRitual } | Refusal;
export type RitualsAnswer =
  { readonly ok: true; readonly rituals: readonly TillRitual[] } | Refusal;

const COLUMNS = `id, community_id, title, starts, ends, all_day, mode, where_text, note, world_id,
  created_by, created_at, cancelled_at`;

const INSERT_RITUAL = `
  INSERT INTO rituals (${COLUMNS})
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, NULL)`;

const SELECT_ONE = `SELECT ${COLUMNS} FROM rituals WHERE id = ?1`;

/** Not cancelled; of the communities in ?1 (a JSON list) or all when ?1 is NULL; ending on ?2 or later when ?2 is given. */
const SELECT_OPEN = `
  SELECT ${COLUMNS} FROM rituals
   WHERE cancelled_at IS NULL
     AND (?1 IS NULL OR community_id IN (SELECT value FROM json_each(?1)))
     AND (?2 IS NULL OR substr(ends, 1, 10) >= ?2)
   ORDER BY starts, id`;

/** Cancelled once, while the organization ?3 still holds revision ?4. */
const CANCEL = `
  UPDATE rituals SET cancelled_at = ?2
   WHERE id = ?1 AND cancelled_at IS NULL
     AND (SELECT revision FROM team_profiles WHERE account_id = ?3) = ?4`;

function ritualOf(row: Row): TillRitual {
  const note = column(row, 'note');
  const worldId = column(row, 'world_id');
  const cancelledAt = column(row, 'cancelled_at');
  return {
    id: text(row, 'id'),
    communityId: text(row, 'community_id'),
    title: text(row, 'title'),
    start: text(row, 'starts'),
    end: text(row, 'ends'),
    allDay: whole(row, 'all_day') === 1,
    mode: text(row, 'mode') as RitualMode,
    where: text(row, 'where_text'),
    note: note === null ? null : text(row, 'note'),
    worldId: worldId === null ? null : text(row, 'world_id'),
    createdBy: text(row, 'created_by'),
    createdAt: instant(row, 'created_at'),
    cancelledAt: cancelledAt === null ? null : instant(row, 'cancelled_at'),
  };
}

type Runner = { readonly ok: true; readonly org: Organization; readonly acting: Acting } | Refusal;

/**
 * Who runs a community's encounters: an owner or a holder of `administrator`
 * of its organization, or the house where the organization lets it in. An
 * organization not open yet has nobody: the house opens it first.
 */
async function runnerFor(
  db: TillDatabase,
  wallet: string,
  house: boolean,
  community: string,
): Promise<Runner> {
  const org = await loadOrganization(db, await communityAccountId(community));
  if (org === null) return refuse(RITUAL_PROBLEMS.noOrganization);
  const acting = actingIn(org, wallet, house);
  if (acting === null || !acting.access.permissions.has('administrator')) {
    return refuse(RITUAL_PROBLEMS.notAllowed);
  }
  return { ok: true, org, acting };
}

/** What `createRitual` is sent, as one record. */
interface RitualDraft {
  readonly communityId?: unknown;
  readonly title?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
  readonly mode?: unknown;
  readonly where?: unknown;
  readonly note?: unknown;
  readonly worldId?: unknown;
}

/** `AccountDesk.createRitual`: the house or an administrator publishes an encounter. */
export async function createRitual(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentDraft: unknown,
  now: Date,
): Promise<RitualAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const draft: RitualDraft =
    typeof sentDraft === 'object' && sentDraft !== null ? (sentDraft as RitualDraft) : {};
  const community = readCommunityId(draft.communityId);
  const title = readTitle(draft.title);
  const when = readWhen(draft.start, draft.end);
  const mode = readMode(draft.mode);
  const where = readWhere(draft.where);
  const note = readRitualNote(draft.note);
  const worldId = readWorldId(draft.worldId);
  if (
    wallet === undefined ||
    house === undefined ||
    community === undefined ||
    title === undefined ||
    when === undefined ||
    mode === undefined ||
    where === undefined ||
    note === undefined ||
    worldId === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(community === undefined ? [COMMUNITY_PROBLEMS.community] : []),
      ...(title === undefined ? [RITUAL_PROBLEMS.title] : []),
      ...(when === undefined ? [RITUAL_PROBLEMS.when] : []),
      ...(mode === undefined ? [RITUAL_PROBLEMS.mode] : []),
      ...(where === undefined ? [RITUAL_PROBLEMS.where] : []),
      ...(note === undefined ? [RITUAL_PROBLEMS.note] : []),
      ...(worldId === undefined ? [RITUAL_PROBLEMS.worldId] : []),
    );
  }
  const runner = await runnerFor(db, wallet, house, community);
  if (!runner.ok) return runner;
  const { org, acting } = runner;
  const id = tillRitualId();
  const at = now.toISOString();
  const written = await commit(db, org, [
    db
      .prepare(INSERT_RITUAL)
      .bind(
        id,
        community,
        title,
        when.start,
        when.end,
        when.allDay ? 1 : 0,
        mode,
        where,
        note,
        worldId,
        wallet,
        at,
      ),
    logLine(db, org.accountId, now, acting, 'ritual-created', id, { title }, org.revision),
  ]);
  if (!written) return refuse(PROBLEMS.meanwhile);
  const row = await db.prepare(SELECT_ONE).bind(id).first<Row>();
  if (row === null) throw new Error('till database: an encounter just published is not there');
  return { ok: true, ritual: ritualOf(row) };
}

/** `AccountDesk.cancelRitual`: the house or an administrator cancels an encounter; once. */
export async function cancelRitual(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentId: unknown,
  now: Date,
): Promise<RitualAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const id = readTillRitualId(sentId);
  if (wallet === undefined || house === undefined || id === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(id === undefined ? [RITUAL_PROBLEMS.ritualId] : []),
    );
  }
  const row = await db.prepare(SELECT_ONE).bind(id).first<Row>();
  if (row === null) return refuse(RITUAL_PROBLEMS.noSuchRitual);
  const ritual = ritualOf(row);
  if (ritual.cancelledAt !== null) return refuse(RITUAL_PROBLEMS.cancelled);
  const runner = await runnerFor(db, wallet, house, ritual.communityId);
  if (!runner.ok) return runner;
  const { org, acting } = runner;
  const at = now.toISOString();
  const written = await commit(db, org, [
    db.prepare(CANCEL).bind(id, at, org.accountId, org.revision),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'ritual-cancelled',
      id,
      { title: ritual.title },
      org.revision,
    ),
  ]);
  if (!written) return refuse(PROBLEMS.meanwhile);
  return { ok: true, ritual: { ...ritual, cancelledAt: at } };
}

/**
 * `AccountDesk.ritualsOf`: public. The not cancelled encounters of the
 * communities named (null: all), soonest first; `upcoming` keeps those
 * ending today (UTC) or later.
 */
export async function ritualsOf(
  db: TillDatabase,
  sentCommunityIds: unknown,
  sentUpcoming: unknown,
  now: Date,
): Promise<RitualsAnswer> {
  const communities = readCommunityIds(sentCommunityIds, readCommunityId);
  if (communities === undefined) return refuse(RITUAL_PROBLEMS.communityIds);
  if (communities !== null && communities.length === 0) return { ok: true, rituals: [] };
  const today = sentUpcoming === true ? now.toISOString().slice(0, 10) : null;
  const { results } = await db
    .prepare(SELECT_OPEN)
    .bind(communities === null ? null : JSON.stringify(communities), today)
    .all<Row>();
  return { ok: true, rituals: results.map(ritualOf) };
}

/** `AccountDesk.ritual`: public — one encounter by its till id, cancelled or not; null when there is none. */
export async function ritualById(
  db: TillDatabase,
  sentId: unknown,
): Promise<{ readonly ok: true; readonly ritual: TillRitual | null } | Refusal> {
  const id = readTillRitualId(sentId);
  if (id === undefined) return refuse(RITUAL_PROBLEMS.ritualId);
  const row = await db.prepare(SELECT_ONE).bind(id).first<Row>();
  return { ok: true, ritual: row === null ? null : ritualOf(row) };
}
