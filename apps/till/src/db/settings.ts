/**
 * «Ajustes de la comunidad» and «Qué ha pasado» (cut 8, 2026-10-16), in
 * migration 0010's `organization_settings` and the organization's log.
 *
 * - `settings`: which pieces of the panel are on and which preset names the
 *   things, to any member (the panel's rail needs it) and the house. No row
 *   is today's behaviour. It says whether the asker may change them.
 * - `changeSettings`: whoever holds `manage-organization` (the permission
 *   that renames the organization; an administrator holds it too). Every
 *   change is a line of the log (`settings-changed`) and raises the
 *   revision; one made meanwhile writes nothing.
 * - `happenings`: the log as a readable list — 30 lines a page, newest first,
 *   each with the name its author published — to any member and the house,
 *   like the members list.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { readAccountId, readWallet } from '../lib/accounts';
import { DEFAULT_AI_MODEL, DEFAULT_AI_TRIAL_CAP_CENTS } from '../lib/ai-brain';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import {
  DEFAULT_VOCABULARY,
  HAPPENINGS_PAGE,
  SETTINGS_PROBLEMS,
  readBefore,
  readChange,
  storedOff,
  type SettingsChange,
  type SwitchablePiece,
  type Vocabulary,
} from '../lib/settings';
import { PROBLEMS, enter, houseRead, lacking, refuse, type Refusal } from './accounts';
import { commit, logLine, type LogAct } from './organizations';
import { cents, column, instant, text, type Row, type TillDatabase } from './repository';

/** An organization's settings as the asker sees them. */
interface SettingsView {
  readonly ok: true;
  readonly accountId: string;
  readonly off: readonly SwitchablePiece[];
  readonly vocabulary: Vocabulary;
  /** The asker may change them (`manage-organization`). */
  readonly mayEdit: boolean;
  /**
   * «El cerebro barato de cada comunidad» (Historia 1): the organization's
   * built-in AI agent, read-only here (the switch is a later story). Every
   * organization shows one, stored or (for one founded by hand, not yet
   * wired to insert a row) the same default computed on read.
   */
  readonly aiAgent: AiBrainView;
}

/** The organization's built-in AI agent as the panel shows it (Historia 1: read-only). */
interface AiBrainView {
  readonly enabled: boolean;
  readonly model: string;
  readonly trialCapCents: number;
}

export type SettingsAnswer = SettingsView | Refusal;

/** A line of the log for «Qué ha pasado»: the author's published name, if any. */
interface Happening {
  readonly seq: number;
  readonly at: string;
  readonly actor: string;
  readonly actorName: string | null;
  readonly asHouse: boolean;
  readonly act: LogAct;
  readonly subject: string | null;
  readonly detail: Readonly<Record<string, string>> | null;
}

export type HappeningsAnswer =
  | {
      readonly ok: true;
      readonly accountId: string;
      readonly lines: readonly Happening[];
      /** There are older lines: ask again with `before` = the last line's `seq`. */
      readonly more: boolean;
    }
  | Refusal;

const SELECT_SETTINGS =
  'SELECT pieces_off, vocabulary FROM organization_settings WHERE account_id = ?1';

const SELECT_AI_BRAIN =
  'SELECT enabled, model, trial_cap_cents FROM organization_ai_brain WHERE account_id = ?1';

/** The row is written only while the organization still holds the revision that was read. */
const UPSERT_SETTINGS = `
  INSERT INTO organization_settings (account_id, pieces_off, vocabulary, updated_at)
  SELECT ?1, ?2, ?3, ?4
   WHERE (SELECT revision FROM team_profiles WHERE account_id = ?1) = ?5
  ON CONFLICT (account_id) DO UPDATE
     SET pieces_off = excluded.pieces_off, vocabulary = excluded.vocabulary,
         updated_at = excluded.updated_at`;

const SELECT_HAPPENINGS = `
  SELECT l.seq, l.at, l.actor, l.as_house, l.act, l.subject, l.detail,
         (SELECT p.name FROM wallet_profiles AS p WHERE p.wallet = l.actor) AS actor_name
    FROM team_log AS l
   WHERE l.account_id = ?1 AND (?2 IS NULL OR l.seq < ?2)
   ORDER BY l.seq DESC LIMIT ${HAPPENINGS_PAGE + 1}`;

async function settingsRow(
  db: TillDatabase,
  accountId: string,
): Promise<{ off: SwitchablePiece[]; vocabulary: Vocabulary }> {
  const row = await db.prepare(SELECT_SETTINGS).bind(accountId).first<Row>();
  if (row === null) return { off: [], vocabulary: DEFAULT_VOCABULARY };
  return {
    off: storedOff(text(row, 'pieces_off')),
    vocabulary: text(row, 'vocabulary') as Vocabulary,
  };
}

/**
 * «El cerebro barato de cada comunidad» (Historia 1): the organization's
 * built-in AI agent, stored (every community from `ensureCommunityTeam` on,
 * and every organization the backfill of migration 0016 reached) or, when
 * there is no row yet, the same house-wide default — so a screen never
 * tells the two apart.
 */
async function aiBrainRow(db: TillDatabase, accountId: string): Promise<AiBrainView> {
  const row = await db.prepare(SELECT_AI_BRAIN).bind(accountId).first<Row>();
  if (row === null) {
    return { enabled: true, model: DEFAULT_AI_MODEL, trialCapCents: DEFAULT_AI_TRIAL_CAP_CENTS };
  }
  return {
    enabled: cents(row, 'enabled') === 1,
    model: text(row, 'model'),
    trialCapCents: cents(row, 'trial_cap_cents'),
  };
}

/** Reads the three arguments every method takes, or the refusal of what it cannot read. */
function readAsker(
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  found: readonly string[] = [],
): { readonly wallet: string; readonly accountId: string; readonly house: boolean } | Refusal {
  const wallet = readWallet(sentWallet);
  const accountId = readAccountId(sentAccount);
  const house = readHouse(sentHouse);
  if (wallet === undefined || accountId === undefined || house === undefined || found.length > 0) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...found,
    );
  }
  return { wallet, accountId, house };
}

/** `AccountDesk.settings`: the pieces that are off and the preset of the words, to a member or the house. */
export async function settings(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<SettingsAnswer> {
  const asker = readAsker(sentWallet, sentAccount, sentHouse);
  if ('problems' in asker) return asker;
  const entered = await enter(db, asker.wallet, asker.accountId, asker.house);
  if ('problems' in entered) return entered;
  await houseRead(entered, db, now, 'settings');
  return {
    ok: true,
    accountId: asker.accountId,
    ...(await settingsRow(db, asker.accountId)),
    mayEdit: entered.acting.access.permissions.has('manage-organization'),
    aiAgent: await aiBrainRow(db, asker.accountId),
  };
}

/** `AccountDesk.changeSettings`: whoever may manage the organization turns pieces on or off and picks the words. */
export async function changeSettings(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentChange: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<SettingsAnswer> {
  const read = readChange(sentChange);
  const asker = readAsker(
    sentWallet,
    sentAccount,
    sentHouse,
    'problems' in read ? read.problems : [],
  );
  if ('problems' in asker) return asker;
  // A change with problems is already refused above, by the asker's reading.
  const { change } = read as { readonly change: SettingsChange };
  const entered = await enter(db, asker.wallet, asker.accountId, asker.house);
  if ('problems' in entered) return entered;
  const refused = lacking(entered, 'manage-organization');
  if (refused !== null) return refused;
  const { org, acting } = entered;
  const before = await settingsRow(db, org.accountId);
  const off = change.off ?? before.off;
  const vocabulary = change.vocabulary ?? before.vocabulary;
  const piecesChanged = off.join() !== before.off.join();
  const wordsChanged = vocabulary !== before.vocabulary;
  if (piecesChanged || wordsChanged) {
    const written = await commit(db, org, [
      db
        .prepare(UPSERT_SETTINGS)
        .bind(org.accountId, JSON.stringify(off), vocabulary, now.toISOString(), org.revision),
      logLine(
        db,
        org.accountId,
        now,
        acting,
        'settings-changed',
        null,
        {
          ...(piecesChanged ? { off: off.join(',') } : {}),
          ...(wordsChanged ? { vocabulary } : {}),
        },
        org.revision,
      ),
    ]);
    if (!written) return refuse(PROBLEMS.meanwhile);
  }
  return {
    ok: true,
    accountId: org.accountId,
    off,
    vocabulary,
    mayEdit: true,
    aiAgent: await aiBrainRow(db, org.accountId),
  };
}

/** A `team_log` row joined with its author's published name. */
function happeningOf(row: Row): Happening {
  const detail = column(row, 'detail');
  const subject = column(row, 'subject');
  const name = column(row, 'actor_name');
  return {
    seq: cents(row, 'seq'),
    at: instant(row, 'at'),
    actor: text(row, 'actor'),
    actorName: typeof name === 'string' ? name : null,
    asHouse: cents(row, 'as_house') === 1,
    act: text(row, 'act') as LogAct,
    subject: subject === null ? null : text(row, 'subject'),
    detail: typeof detail === 'string' ? (JSON.parse(detail) as Record<string, string>) : null,
  };
}

/**
 * `AccountDesk.happenings`: the organization's log, newest first, 30 lines
 * and whether there are older ones; `before` asks for the page after a line.
 * The house's first page is written down as a read (ORG-009); the following
 * pages are not, so «ver más» does not fill the log it shows.
 */
export async function happenings(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentBefore: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<HappeningsAnswer> {
  const before = readBefore(sentBefore);
  const asker = readAsker(
    sentWallet,
    sentAccount,
    sentHouse,
    before === undefined ? [SETTINGS_PROBLEMS.before] : [],
  );
  if ('problems' in asker) return asker;
  const entered = await enter(db, asker.wallet, asker.accountId, asker.house);
  if ('problems' in entered) return entered;
  if (before === null) await houseRead(entered, db, now, 'happenings');
  const { results } = await db
    .prepare(SELECT_HAPPENINGS)
    .bind(asker.accountId, before ?? null)
    .all<Row>();
  return {
    ok: true,
    accountId: asker.accountId,
    lines: results.slice(0, HAPPENINGS_PAGE).map(happeningOf),
    more: results.length > HAPPENINGS_PAGE,
  };
}
