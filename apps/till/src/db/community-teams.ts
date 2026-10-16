/**
 * «Una comunidad ES una organización» (cut 6, 2026-10-16): a community of the
 * register has a till account — an organization — that the house opens the
 * first time it uses it (assigning a world, adding a person). Nobody founds
 * it by hand in Saldo.
 *
 * The account id is derived from the community id (`communityAccountId`), so
 * two first calls at once make one account and the register never stores it.
 * The organization is born as `createTeam` makes one — the Team template's
 * roles, coloured, the default language's names (Numen Games names its
 * administrators «Oracles», `communityRoles`) — except that it has no founder
 * and does not count against `TEAMS_PER_FOUNDER`.
 *
 * Cut 7 (2026-10-16) reverses the first rule on membership: the Oracle wallet
 * that opens it (or calls again later) becomes a member of it holding the
 * administrator role — not an owner — so the house is visible in the member
 * list and not only let in through `accessOf`. Once, however many calls.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { DEFAULT_LOCALE } from '@numinia/domain';
import { readWallet, readTeamName } from '../lib/accounts';
import {
  COMMUNITY_PROBLEMS,
  communityAccountId,
  communityRoles,
  readCommunities,
  readCommunityId,
} from '../lib/community-teams';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PROBLEMS, joinAsAdministrator, refuse, roleId, type Refusal } from './accounts';
import { actingIn, loadOrganization, memberIn } from './organizations';
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
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
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
  const roles = communityRoles(community, DEFAULT_LOCALE, roleId);
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
          role.color,
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
  const refused = await houseJoins(db, id, wallet, now);
  if (refused !== null) return refused;
  return { ok: true, account: { id, name: text(stored, 'name'), created } };
}

/** Tries this often when another call changes the organization between reading it and writing. */
const JOIN_ATTEMPTS = 3;

/**
 * Makes the calling Oracle a member holding the administrator role, if it is
 * not one: nothing at all when it is, or when the house may not enter the
 * organization (the account is still answered). Null when done.
 */
async function houseJoins(
  db: TillDatabase,
  accountId: string,
  wallet: string,
  now: Date,
): Promise<Refusal | null> {
  let refused: Refusal | null = null;
  for (let attempt = 0; attempt < JOIN_ATTEMPTS; attempt += 1) {
    const org = await loadOrganization(db, accountId);
    if (org === null || memberIn(org, wallet) !== undefined) return null;
    const acting = actingIn(org, wallet, true);
    if (acting === null) return null;
    refused = await joinAsAdministrator(db, org, acting, now);
    if (refused === null) return null;
  }
  return refused;
}

/** `AccountDesk.openAllCommunities`: the account of each community, in the order sent. */
export type OpenAllAnswer =
  { readonly ok: true; readonly accounts: readonly CommunityAccount[] } | Refusal;

/**
 * The house opens the organization of 1 to 50 communities in one call, each
 * as `ensureCommunityTeam` would — the house becomes the administrator of
 * every one. Nothing is opened when any argument is out of shape.
 */
export async function openAllCommunities(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentCommunities: unknown,
  now: Date,
): Promise<OpenAllAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const communities = readCommunities(sentCommunities);
  if (wallet === undefined || house === undefined || communities === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(communities === undefined ? [COMMUNITY_PROBLEMS.communities] : []),
    );
  }
  if (!house) return refuse(COMMUNITY_PROBLEMS.notHouse);
  const accounts: CommunityAccount[] = [];
  for (const community of communities) {
    const answer = await ensureCommunityTeam(db, wallet, true, community.id, community.name, now);
    if (!answer.ok) return answer;
    accounts.push(answer.account);
  }
  return { ok: true, accounts };
}
