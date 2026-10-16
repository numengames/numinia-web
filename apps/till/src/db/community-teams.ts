/**
 * «Una comunidad ES una organización» (cut 6, 2026-10-16): a community of the
 * register has a till account — an organization — that the house opens the
 * first time it uses it (assigning a world, adding a person). Nobody founds
 * it by hand in Saldo.
 *
 * The account id is derived from the community id (`communityAccountId`), so
 * two first calls at once make one account and the register never stores it.
 * The organization is born as `createTeam` makes one — the Team template's
 * roles, the default language's names — except that it has no founder: the
 * house wallet that opened it is not made a member (the house reaches every
 * organization through `accessOf` already; it is opened by the house and
 * claimed later), and it does not count against `TEAMS_PER_FOUNDER`.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { DEFAULT_LOCALE, rolesFromTemplate } from '@numinia/domain';
import { readWallet, readTeamName } from '../lib/accounts';
import { COMMUNITY_PROBLEMS, communityAccountId, readCommunityId } from '../lib/community-teams';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PROBLEMS, refuse, roleId, type Refusal } from './accounts';
import { text, type Row, type TillDatabase } from './repository';

/** The community's account, whether this call opened it (`created`) or it was open already. */
interface CommunityAccount {
  readonly id: string;
  readonly name: string;
  readonly created: boolean;
}

export type EnsureAnswer = { readonly ok: true; readonly account: CommunityAccount } | Refusal;

const INSERT_ACCOUNT = `
  INSERT INTO accounts (id, kind, created_at) VALUES (?1, 'team', ?2) ON CONFLICT DO NOTHING`;

const INSERT_PROFILE = `
  INSERT INTO team_profiles (account_id, name, created_by, created_at)
  SELECT ?1, ?2, ?3, ?4
   WHERE NOT EXISTS (SELECT 1 FROM team_profiles WHERE account_id = ?1)`;

/** The birth line is written last, so the roles, written before it, are written only while there is none. */
const OPENED = `NOT EXISTS (SELECT 1 FROM team_log WHERE account_id = ?1 AND act = 'organization-created')`;

const INSERT_ROLE = `
  INSERT INTO team_roles (account_id, id, name, color, position, hoist, permissions)
  SELECT ?1, ?2, ?3, NULL, ?4, ?5, ?6
   WHERE EXISTS (SELECT 1 FROM team_profiles WHERE account_id = ?1) AND ${OPENED}`;

/** By the house (`as_house` 1) and only once: the line is the proof that the organization was opened. */
const INSERT_CREATED = `
  INSERT INTO team_log (account_id, at, actor, as_house, act, subject, detail)
  SELECT ?1, ?2, ?3, 1, 'organization-created', NULL, ?4
   WHERE EXISTS (SELECT 1 FROM team_profiles WHERE account_id = ?1) AND ${OPENED}`;

const SELECT_NAME = 'SELECT name FROM team_profiles WHERE account_id = ?1';

/**
 * `AccountDesk.ensureCommunityTeam`: the house opens the organization of a
 * community if it is not open yet, and answers it either way. An account
 * already open keeps its name: the name sent only names a new one.
 */
export async function ensureCommunityTeam(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentCommunity: unknown,
  sentName: unknown,
  now: Date,
): Promise<EnsureAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const community = readCommunityId(sentCommunity);
  const name = readTeamName(sentName);
  if (
    wallet === undefined ||
    house === undefined ||
    community === undefined ||
    name === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(community === undefined ? [COMMUNITY_PROBLEMS.community] : []),
      ...(name === undefined ? [PROBLEMS.name] : []),
    );
  }
  if (!house) return refuse(COMMUNITY_PROBLEMS.notHouse);
  const id = await communityAccountId(community);
  const at = now.toISOString();
  const roles = rolesFromTemplate('team', DEFAULT_LOCALE, roleId);
  const results = await db.batch<Row>([
    db.prepare(INSERT_ACCOUNT).bind(id, at),
    db.prepare(INSERT_PROFILE).bind(id, name, wallet, at),
    ...roles.map((role) =>
      db
        .prepare(INSERT_ROLE)
        .bind(
          id,
          role.id,
          role.name,
          role.position,
          role.hoist ? 1 : 0,
          JSON.stringify(role.permissions),
        ),
    ),
    db
      .prepare(INSERT_CREATED)
      .bind(id, at, wallet, JSON.stringify({ name, template: 'team', community })),
    db.prepare(SELECT_NAME).bind(id),
  ]);
  const created = results.at(-2)?.meta.changes === 1;
  const stored = results.at(-1)?.results[0];
  if (stored === undefined)
    throw new Error('till database: a community’s organization is not there');
  return { ok: true, account: { id, name: text(stored, 'name'), created } };
}
