/**
 * The Oracle desk's database work (MIS-184): what numinia.com's Prices room
 * reads, checks and schedules through the till's `OracleDesk` entrypoint
 * (src/worker.ts). Each call reads the tariff in ONE batch — every version
 * with why it was published, and the sizes charged to worlds in the close's
 * window — so it answers from one consistent snapshot; `scheduleDraft` then
 * writes one row with one guarded insert. Whatever the caller sends is read
 * as untrusted (`readDraft`): a malformed draft or author is answered with
 * problems in words, never with a throw; only a database failure throws.
 */

import { CLOSE_WINDOW_DAYS } from '../lib/close';
import {
  draftCheck,
  nextVersionId,
  parseBasis,
  readDraft,
  versionFor,
  type DeskCheck,
  type DraftReading,
  type TariffVersion,
} from '../lib/tariff';
import { addDays, dayOf } from '../lib/utc-day';
import { SELECT_VERSIONS, text, versionOf, type Row, type TillDatabase } from './repository';

/** The tariff as the desk shows it (the contract's `DeskView`). */
export interface DeskView {
  /** The till's UTC date. */
  readonly today: string;
  /** The version in force today; null while none has started. */
  readonly inForceId: number | null;
  /** Every version, ascending id. */
  readonly versions: readonly TariffVersion[];
  /**
   * The sizes on any world-day line of the close's window (a day within the
   * last 35 days), sorted: a new version must keep pricing them.
   */
  readonly sizesInUse: readonly string[];
}

/** What scheduling answers (the contract's `DeskSchedule`). */
export type DeskSchedule =
  | { readonly ok: true; readonly version: TariffVersion }
  | { readonly ok: false; readonly problems: readonly string[] };

/** A version's author: a wallet in lowercase, as numinia.com's session holds it. */
const WALLET = /^0x[0-9a-f]{40}$/;

const BY_PROBLEM = 'by must be a lowercase 0x wallet';

const PUBLISHED_MEANWHILE = 'another version was published meanwhile: read the desk again';

const SIZES_IN_USE =
  "SELECT DISTINCT size FROM ledger_lines WHERE kind = 'world_day' AND day >= ?1";

/**
 * The next version, written only while no version holds its id or a greater
 * one: when another was published after this call read the tariff, the
 * insert writes nothing (no error text to parse) and the caller is told to
 * read again. The table's own triggers — no REPLACE, ids only grow — stay
 * the backstop.
 */
const INSERT_VERSION = `
  INSERT INTO tariff_versions (id, starts_on, created_at, created_by, sizes, rules, basis)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
   WHERE NOT EXISTS (SELECT 1 FROM tariff_versions WHERE id >= ?1)`;

interface DeskState {
  readonly today: string;
  readonly versions: readonly TariffVersion[];
  readonly sizesInUse: readonly string[];
}

/** The tariff and the sizes in use, on the UTC date of `now`, read in one batch. */
async function deskState(db: TillDatabase, now: Date): Promise<DeskState> {
  const today = dayOf(now);
  const statements = [
    db.prepare(SELECT_VERSIONS),
    db.prepare(SIZES_IN_USE).bind(addDays(today, -CLOSE_WINDOW_DAYS)),
  ];
  const results = await db.batch<Row>(statements);
  if (results.length !== statements.length) {
    throw new Error(`till database: ${statements.length} reads, ${results.length} answers`);
  }
  const [versionRows, sizeRows] = results.map((result) => result.results) as [Row[], Row[]];
  return {
    today,
    versions: versionRows.map(versionOf),
    sizesInUse: sizeRows.map((row) => text(row, 'size')).sort(),
  };
}

/**
 * The desk's check of what was sent: `draftCheck` for a draft; for anything
 * else, what is wrong with it, with no version replaced and no rise.
 */
function checkOf(state: DeskState, reading: DraftReading): DeskCheck {
  if (reading.draft !== undefined) {
    return draftCheck(state.versions, reading.draft, state.today, state.sizesInUse);
  }
  return {
    today: state.today,
    nextId: nextVersionId(state.versions),
    replacedId: null,
    isRise: false,
    noticeDays: 0,
    earliestStart: addDays(state.today, 1),
    problems: reading.problems,
  };
}

/** The tariff as the till holds it on the UTC date of `now`. */
export async function readDesk(db: TillDatabase, now: Date): Promise<DeskView> {
  const { today, versions, sizesInUse } = await deskState(db, now);
  return { today, inForceId: versionFor(versions, today)?.id ?? null, versions, sizesInUse };
}

/**
 * What scheduling `sent` at `now` would do — the version it would replace,
 * whether it is a rise, the notice and first day, and every problem — with
 * nothing written.
 */
export async function checkDraft(db: TillDatabase, sent: unknown, now: Date): Promise<DeskCheck> {
  return checkOf(await deskState(db, now), readDraft(sent));
}

/**
 * Schedules `sent` as the next version, published by `by` at `now`, when the
 * check finds no problem and `by` is a lowercase wallet: one row with the
 * next id, `now` as its instant, `by` as its author and its basis as JSON
 * text (NULL without one). Otherwise — or when another version was published
 * meanwhile — it writes nothing and answers the problems.
 */
export async function scheduleDraft(
  db: TillDatabase,
  sent: unknown,
  by: unknown,
  now: Date,
): Promise<DeskSchedule> {
  const state = await deskState(db, now);
  const reading = readDraft(sent);
  const check = checkOf(state, reading);
  const author = typeof by === 'string' && WALLET.test(by) ? by : undefined;
  const problems = author === undefined ? [...check.problems, BY_PROBLEM] : check.problems;
  if (reading.draft === undefined || author === undefined || problems.length > 0) {
    return { ok: false, problems };
  }
  const { startsOn, sizes, rules, basis } = reading.draft;
  const basisJson = basis === null ? null : JSON.stringify(basis);
  const createdAt = now.toISOString();
  const { meta } = await db
    .prepare(INSERT_VERSION)
    .bind(
      check.nextId,
      startsOn,
      createdAt,
      author,
      JSON.stringify(sizes),
      JSON.stringify(rules),
      basisJson,
    )
    .run();
  if (meta.changes !== 1) return { ok: false, problems: [PUBLISHED_MEANWHILE] };
  return {
    ok: true,
    version: {
      id: check.nextId,
      startsOn,
      createdAt,
      createdBy: author,
      sizes,
      rules,
      // What a later read gives back: the basis as the column holds it.
      basis: basisJson === null ? null : parseBasis(JSON.parse(basisJson)),
    },
  };
}
