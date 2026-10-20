/**
 * «Normas de vuestros espacios» (condiciones/w1, 2026-10-20): the terms a
 * community writes for its worlds, kept in migration 0024's
 * `community_terms` — one row per published version, never changed or
 * deleted. The format and its rules are @numinia/domain's
 * (`validateCommunityTerms`, `publishCommunityTerms`): the same
 * `condiciones@1` layer a world's own file carries, where a point of type
 * `datos` can never be mandatory.
 *
 * - `communityTerms`: the version in force and the whole history, to any
 *   member and the house, and whether the asker may publish.
 * - `publishTerms`: only whoever holds `administrator` (the notes for an
 *   organization's AIs follow the same rule, D-073). The new version needs a
 *   `version` no earlier one had; the earlier ones stay.
 *
 * This cut is the domain and its storage only: no screen (w2) and no
 * `AccountDesk` method yet — the Ajustes cut wires these two functions to
 * the desk with its screen. Every argument is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import {
  currentCommunityTerms,
  publishCommunityTerms,
  validateCommunityTerms,
  type PublishedCommunityTerms,
} from '@numinia/domain';
import { readAccountId, readWallet } from '../lib/accounts';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PROBLEMS, enter, houseRead, lacking, refuse, type Refusal } from './accounts';
import { cents, instant, text, type Row, type TillDatabase } from './repository';

/** A community's terms as the asker sees them: oldest version first, the last one in force. */
interface TermsView {
  readonly ok: true;
  readonly accountId: string;
  /** The version in force, or null while the community has published none. */
  readonly current: PublishedCommunityTerms | null;
  /** Every version ever published, oldest first. */
  readonly history: readonly PublishedCommunityTerms[];
  /** The asker may publish a new version (`administrator`). */
  readonly mayEdit: boolean;
}

export type TermsAnswer = TermsView | Refusal;

const SELECT_TERMS = `
  SELECT seq, version, points, published_by, published_at
    FROM community_terms WHERE account_id = ?1 ORDER BY seq`;

/** The next number is taken inside the statement, so two publications at once never share one. */
const INSERT_TERMS = `
  INSERT INTO community_terms (account_id, seq, version, points, published_by, published_at)
  SELECT ?1, COALESCE(MAX(seq), 0) + 1, ?2, ?3, ?4, ?5 FROM community_terms WHERE account_id = ?1`;

/** A stored row back into a version; a throw when what was stored no longer passes the domain. */
function publishedOf(row: Row): PublishedCommunityTerms {
  const points: unknown = JSON.parse(text(row, 'points'));
  const checked = validateCommunityTerms({ version: text(row, 'version'), puntos: points });
  if (!checked.ok) {
    throw new TypeError(
      `till database: community terms ${cents(row, 'seq')} no longer pass the domain`,
    );
  }
  return {
    terms: checked.value,
    publishedAt: instant(row, 'published_at'),
    publishedBy: text(row, 'published_by'),
  };
}

async function historyOf(db: TillDatabase, accountId: string): Promise<PublishedCommunityTerms[]> {
  const { results } = await db.prepare(SELECT_TERMS).bind(accountId).all<Row>();
  return results.map(publishedOf);
}

/** Reads the arguments every method takes, or the refusal of what it cannot read. */
function readAsker(
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
): { readonly wallet: string; readonly accountId: string; readonly house: boolean } | Refusal {
  const wallet = readWallet(sentWallet);
  const accountId = readAccountId(sentAccount);
  const house = readHouse(sentHouse);
  if (wallet === undefined || accountId === undefined || house === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  return { wallet, accountId, house };
}

/** The community's terms: the version in force and the history, to a member or the house. */
export async function communityTerms(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<TermsAnswer> {
  const asker = readAsker(sentWallet, sentAccount, sentHouse);
  if ('problems' in asker) return asker;
  const entered = await enter(db, asker.wallet, asker.accountId, asker.house);
  if ('problems' in entered) return entered;
  await houseRead(entered, db, now, 'community-terms');
  const history = await historyOf(db, asker.accountId);
  return {
    ok: true,
    accountId: asker.accountId,
    current: currentCommunityTerms(history) ?? null,
    history,
    mayEdit: entered.acting.access.permissions.has('administrator'),
  };
}

/**
 * Publish a new version of the community's terms. The draft is the domain's
 * (`{version, puntos}`); every problem of it comes back in words, each with
 * its path, and nothing is written. The earlier versions stay.
 */
export async function publishTerms(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentDraft: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<TermsAnswer> {
  const asker = readAsker(sentWallet, sentAccount, sentHouse);
  if ('problems' in asker) return asker;
  const entered = await enter(db, asker.wallet, asker.accountId, asker.house);
  if ('problems' in entered) return entered;
  const refused = lacking(entered, 'administrator');
  if (refused !== null) return refused;
  const history = await historyOf(db, asker.accountId);
  const publication = publishCommunityTerms(history, sentDraft, asker.wallet, now);
  if (!publication.ok) {
    return refuse(...publication.issues.map((issue) => `${issue.path}: ${issue.message}`));
  }
  const { terms, publishedAt, publishedBy } = publication.published;
  try {
    await db
      .prepare(INSERT_TERMS)
      .bind(asker.accountId, terms.version, JSON.stringify(terms.puntos), publishedBy, publishedAt)
      .run();
  } catch {
    // Another administrator published the same version (or the next number) at that very moment.
    return refuse(PROBLEMS.meanwhile);
  }
  return {
    ok: true,
    accountId: asker.accountId,
    current: publication.published,
    history: publication.history,
    mayEdit: true,
  };
}
