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
   * «El cerebro barato de cada comunidad» (Historia 1) and «Existe un
   * interruptor funcional para apagar el agente» (Historia 4, which adds
   * `changeSettings`'s `aiAgentEnabled`): the organization's built-in AI
   * agent. Every organization shows one, stored or (for one founded by
   * hand, not yet wired to insert a row) the same default computed on read.
   */
  readonly aiAgent: AiBrainView;
}

/**
 * The organization's built-in AI agent as the panel shows it.
 *
 * `spentCents` (Historia 2, kanban t_ec70b2e3) is how much of the trial the
 * agent has used so far — always `<= trialCapCents` once `enabled` turns
 * false on its own account of it; a manual switch-off (Historia 4) can
 * still leave `spentCents` short of the cap.
 */
interface AiBrainView {
  readonly enabled: boolean;
  readonly model: string;
  readonly trialCapCents: number;
  readonly spentCents: number;
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
  'SELECT enabled, model, trial_cap_cents, spent_cents FROM organization_ai_brain WHERE account_id = ?1';

/** The row is written only while the organization still holds the revision that was read. */
const UPSERT_SETTINGS = `
  INSERT INTO organization_settings (account_id, pieces_off, vocabulary, updated_at)
  SELECT ?1, ?2, ?3, ?4
   WHERE (SELECT revision FROM team_profiles WHERE account_id = ?1) = ?5
  ON CONFLICT (account_id) DO UPDATE
     SET pieces_off = excluded.pieces_off, vocabulary = excluded.vocabulary,
         updated_at = excluded.updated_at`;

/**
 * «Existe un interruptor funcional para apagar el agente» (Historia 4): the
 * row is written only while the organization still holds the revision that
 * was read, exactly like `UPSERT_SETTINGS`. `model` and `trial_cap_cents`
 * are bound from what was just read (stored, or the house-wide default) so
 * a flip never invents a model or a cap — it only ever touches `enabled`;
 * `created_at` is used only the first time a row is born this way.
 */
const UPSERT_AI_BRAIN = `
  INSERT INTO organization_ai_brain (account_id, enabled, model, trial_cap_cents, created_at)
  SELECT ?1, ?2, ?3, ?4, ?5
   WHERE (SELECT revision FROM team_profiles WHERE account_id = ?1) = ?6
  ON CONFLICT (account_id) DO UPDATE
     SET enabled = excluded.enabled`;

/**
 * «El cerebro barato de cada comunidad» (Historia 2): adds `?2` cents to
 * `spent_cents` and, the instant the new total reaches the trial cap, turns
 * `enabled` off in the same write — the agent stops itself without a
 * second query. A row born here (an organization with none yet) starts
 * already spent by `?2`, never below zero and never past the cap unnoticed.
 * No revision guard: unlike `UPSERT_SETTINGS`/`UPSERT_AI_BRAIN`, this is not
 * a person's edit racing another person's edit — it is usage accumulating,
 * so every call must land, including two in-flight at once.
 */
const RECORD_AI_SPEND = `
  INSERT INTO organization_ai_brain (account_id, enabled, model, trial_cap_cents, spent_cents, created_at)
  VALUES (?1, (?2 < ?3), ?4, ?3, MIN(?2, ?3), ?5)
  ON CONFLICT (account_id) DO UPDATE
     SET spent_cents = MIN(spent_cents + ?2, trial_cap_cents),
         enabled = enabled AND (spent_cents + ?2 < trial_cap_cents)`;

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
    return {
      enabled: true,
      model: DEFAULT_AI_MODEL,
      trialCapCents: DEFAULT_AI_TRIAL_CAP_CENTS,
      spentCents: 0,
    };
  }
  return {
    enabled: cents(row, 'enabled') === 1,
    model: text(row, 'model'),
    trialCapCents: cents(row, 'trial_cap_cents'),
    spentCents: cents(row, 'spent_cents'),
  };
}

/**
 * «El cerebro barato de cada comunidad» (Historia 2): meters `costCents` of
 * usage against the organization's trial and, the instant the running total
 * reaches the cap, turns the agent off — the agent stops itself, the
 * community stays connected (ACC-02's own call, not this one, decides who
 * may still read/write the rest of the organization). No wallet, no house:
 * the caller is the engine's own AI run-time, already holding the
 * organization's AI access token (numinia-engine#19) by the time it calls
 * this — a server-to-server act, not a person's, so there is nothing here
 * for a browser argument to misread.
 */
export async function recordAiSpend(
  db: TillDatabase,
  accountId: string,
  costCents: number,
  now: Date,
): Promise<AiBrainView> {
  await db
    .prepare(RECORD_AI_SPEND)
    .bind(accountId, costCents, DEFAULT_AI_TRIAL_CAP_CENTS, DEFAULT_AI_MODEL, now.toISOString())
    .run();
  return aiBrainRow(db, accountId);
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
  const beforeAiAgent = await aiBrainRow(db, org.accountId);
  const off = change.off ?? before.off;
  const vocabulary = change.vocabulary ?? before.vocabulary;
  const aiAgentEnabled = change.aiAgentEnabled ?? beforeAiAgent.enabled;
  const piecesChanged = off.join() !== before.off.join();
  const wordsChanged = vocabulary !== before.vocabulary;
  const aiAgentChanged = aiAgentEnabled !== beforeAiAgent.enabled;
  const statements: D1PreparedStatement[] = [];
  if (piecesChanged || wordsChanged) {
    statements.push(
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
    );
  }
  if (aiAgentChanged) {
    statements.push(
      db
        .prepare(UPSERT_AI_BRAIN)
        .bind(
          org.accountId,
          aiAgentEnabled ? 1 : 0,
          beforeAiAgent.model,
          beforeAiAgent.trialCapCents,
          now.toISOString(),
          org.revision,
        ),
      logLine(
        db,
        org.accountId,
        now,
        acting,
        'settings-changed',
        null,
        { aiAgentEnabled: aiAgentEnabled ? 'true' : 'false' },
        org.revision,
      ),
    );
  }
  // Both pieces of the write happen under the same guard-and-raise: `commit`
  // raises the organization's revision once, so two separate calls here
  // (one per table) would make the second always lose the race against
  // its own first write — this is why both go in a single `commit`.
  if (statements.length > 0) {
    const written = await commit(db, org, statements);
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
