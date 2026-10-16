/**
 * «Hazla tuya» for real (cut G, 2026-10-17): the requests for a community of
 * the register, in migration 0013's `community_requests`.
 *
 * - `requestCommunity`: a signed-in wallet claims a community (`claim`: it
 *   runs it and would be its owner, «Titular») or asks to join it (`join`),
 *   with an optional note. One open request per (community, wallet, kind):
 *   asking again finds the first. A member of the community asks nothing; a
 *   claim is refused where the community has an owner already.
 * - `myCommunityRequests`: the wallet's own requests, newest first, for one
 *   community or all — what the community page shows after «Pedido».
 * - `communityRequests`: the open requests of one community, to the house or
 *   an administrator of its organization; with no community, every open one
 *   across the register, to the house alone (the Census).
 * - `decideCommunityRequest`: the same people accept or decline. Accepting a
 *   claim opens the organization if needed (the house, with the name
 *   numinia.com sends) and makes the wallet a member with the owner mark
 *   holding the administrator role; accepting a join makes it a member with
 *   the base role. Declining records the decision only. Every decision is a
 *   line of the organization's log («Qué ha pasado»); nothing else happens
 *   on its own.
 *
 * Every argument comes from numinia.com and is read as untrusted; a refusal
 * is an answer with problems in words, never a throw.
 */

import { readWallet } from '../lib/accounts';
import {
  REQUEST_PROBLEMS,
  readAccept,
  readKind,
  readNote,
  readRequestId,
  requestId,
  type CommunityRequest,
  type CommunityRequestEntry,
  type RequestKind,
  type RequestState,
} from '../lib/community-requests';
import { COMMUNITY_PROBLEMS, communityAccountId, readCommunityId } from '../lib/community-teams';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import { ensureCommunityTeam } from './community-teams';
import {
  ADD_MEMBER,
  GIVE_ROLE,
  actingIn,
  commit,
  loadOrganization,
  logLine,
  memberIn,
  type Acting,
  type Organization,
} from './organizations';
import { column, instant, text, type Row, type TillDatabase } from './repository';

export type RequestAnswer = { readonly ok: true; readonly request: CommunityRequest } | Refusal;

export type MyRequestsAnswer =
  { readonly ok: true; readonly requests: readonly CommunityRequest[] } | Refusal;

export type RequestsAnswer =
  { readonly ok: true; readonly requests: readonly CommunityRequestEntry[] } | Refusal;

const COLUMNS =
  'r.id, r.community_id, r.wallet, r.kind, r.note, r.state, r.created_at, r.decided_at, r.decided_by';

const PUBLISHED = `
  (SELECT p.name FROM wallet_profiles AS p WHERE p.wallet = r.wallet) AS name,
  (SELECT p.avatar FROM wallet_profiles AS p WHERE p.wallet = r.wallet) AS avatar`;

/** Written only while no open request of the same (community, wallet, kind) exists. */
const INSERT_REQUEST = `
  INSERT INTO community_requests (id, community_id, wallet, kind, note, state, created_at)
  SELECT ?1, ?2, ?3, ?4, ?5, 'open', ?6
   WHERE NOT EXISTS (
     SELECT 1 FROM community_requests
      WHERE community_id = ?2 AND wallet = ?3 AND kind = ?4 AND state = 'open'
   )`;

const SELECT_OPEN_OF = `
  SELECT ${COLUMNS} FROM community_requests AS r
   WHERE r.community_id = ?1 AND r.wallet = ?2 AND r.kind = ?3 AND r.state = 'open'`;

const SELECT_MINE = `
  SELECT ${COLUMNS} FROM community_requests AS r
   WHERE r.wallet = ?1 AND (?2 IS NULL OR r.community_id = ?2)
   ORDER BY r.created_at DESC, r.id`;

const SELECT_OPEN = `
  SELECT ${COLUMNS}, ${PUBLISHED} FROM community_requests AS r
   WHERE r.state = 'open' AND (?1 IS NULL OR r.community_id = ?1)
   ORDER BY r.created_at DESC, r.id`;

const SELECT_ONE = `SELECT ${COLUMNS} FROM community_requests AS r WHERE r.id = ?1`;

/** An open request is decided once: a decision taken meanwhile changes nothing. */
const DECIDE = `
  UPDATE community_requests SET state = ?2, decided_at = ?3, decided_by = ?4
   WHERE id = ?1 AND state = 'open'`;

/** The same, while the organization ?5 still holds revision ?6: decided in one batch with the joining. */
const DECIDE_GUARDED = `${DECIDE}
     AND (SELECT revision FROM team_profiles WHERE account_id = ?5) = ?6`;

/** The wallet ?2 joins ?1 as an owner («Titular»), while the organization still holds revision ?5. */
const ADD_OWNER = `
  INSERT INTO team_members (account_id, wallet, role, added_by, added_at, owner)
  SELECT ?1, ?2, 'admin', ?3, ?4, 1
   WHERE (SELECT revision FROM team_profiles WHERE account_id = ?1) = ?5`;

/** A member already in: given the owner mark. */
const MARK_OWNER = `
  UPDATE team_members SET owner = 1, role = 'admin'
   WHERE account_id = ?1 AND wallet = ?2
     AND (SELECT revision FROM team_profiles WHERE account_id = ?1) = ?3`;

function requestOf(row: Row): CommunityRequest {
  const note = column(row, 'note');
  const decidedAt = column(row, 'decided_at');
  const decidedBy = column(row, 'decided_by');
  return {
    id: text(row, 'id'),
    communityId: text(row, 'community_id'),
    wallet: text(row, 'wallet'),
    kind: text(row, 'kind') as RequestKind,
    note: note === null ? null : text(row, 'note'),
    state: text(row, 'state') as RequestState,
    createdAt: instant(row, 'created_at'),
    decidedAt: decidedAt === null ? null : instant(row, 'decided_at'),
    decidedBy: decidedBy === null ? null : text(row, 'decided_by'),
  };
}

function entryOf(row: Row): CommunityRequestEntry {
  const name = column(row, 'name');
  const avatar = column(row, 'avatar');
  return {
    ...requestOf(row),
    name: typeof name === 'string' ? name : null,
    avatar: typeof avatar === 'string' ? avatar : null,
  };
}

/** `AccountDesk.requestCommunity`: the signed-in wallet asks for a community. */
export async function requestCommunity(
  db: TillDatabase,
  sentWallet: unknown,
  sentCommunity: unknown,
  sentKind: unknown,
  sentNote: unknown,
  now: Date,
): Promise<RequestAnswer> {
  const wallet = readWallet(sentWallet);
  const community = readCommunityId(sentCommunity);
  const kind = readKind(sentKind);
  const note = readNote(sentNote);
  if (wallet === undefined || community === undefined || kind === undefined || note === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(community === undefined ? [COMMUNITY_PROBLEMS.community] : []),
      ...(kind === undefined ? [REQUEST_PROBLEMS.kind] : []),
      ...(note === undefined ? [REQUEST_PROBLEMS.note] : []),
    );
  }
  const org = await loadOrganization(db, await communityAccountId(community));
  if (org !== null) {
    if (memberIn(org, wallet) !== undefined) return refuse(REQUEST_PROBLEMS.member);
    if (kind === 'claim' && org.members.some((member) => member.isOwner)) {
      return refuse(REQUEST_PROBLEMS.hasOwner);
    }
  }
  const [, found] = await db.batch<Row>([
    db.prepare(INSERT_REQUEST).bind(requestId(), community, wallet, kind, note, now.toISOString()),
    db.prepare(SELECT_OPEN_OF).bind(community, wallet, kind),
  ]);
  const row = found?.results[0];
  if (row === undefined) throw new Error('till database: a request just asked is not there');
  return { ok: true, request: requestOf(row) };
}

/** `AccountDesk.myCommunityRequests`: the wallet's own requests, newest first; `community` narrows them. */
export async function myCommunityRequests(
  db: TillDatabase,
  sentWallet: unknown,
  sentCommunity: unknown,
): Promise<MyRequestsAnswer> {
  const wallet = readWallet(sentWallet);
  const community =
    sentCommunity === undefined || sentCommunity === null ? null : readCommunityId(sentCommunity);
  if (wallet === undefined || community === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(community === undefined ? [COMMUNITY_PROBLEMS.community] : []),
    );
  }
  const { results } = await db.prepare(SELECT_MINE).bind(wallet, community).all<Row>();
  return { ok: true, requests: results.map(requestOf) };
}

/** Who decides, and on whose behalf; `org` is null while the organization is not open yet. */
type Decider =
  | { readonly ok: true; readonly org: Organization; readonly acting: Acting }
  | { readonly ok: true; readonly org: null }
  | Refusal;

/**
 * The house (numinia.com vouches, and the organization — if open — lets it
 * in during the alpha), or an owner or a holder of `administrator` of the
 * community's organization. An organization not open yet has only the house.
 */
async function deciderFor(
  db: TillDatabase,
  wallet: string,
  house: boolean,
  community: string,
): Promise<Decider> {
  const org = await loadOrganization(db, await communityAccountId(community));
  if (org === null) return house ? { ok: true, org } : refuse(REQUEST_PROBLEMS.notAllowed);
  const acting = actingIn(org, wallet, house);
  if (acting === null || !acting.access.permissions.has('administrator')) {
    return refuse(REQUEST_PROBLEMS.notAllowed);
  }
  return { ok: true, org, acting };
}

/**
 * `AccountDesk.communityRequests`: the open requests of a community, newest
 * first, each with what the asker published, to the house or an
 * administrator of the organization. With no community, every open request
 * of the register, to the house alone.
 */
export async function communityRequests(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentCommunity: unknown,
): Promise<RequestsAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const community =
    sentCommunity === undefined || sentCommunity === null ? null : readCommunityId(sentCommunity);
  if (wallet === undefined || house === undefined || community === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(community === undefined ? [COMMUNITY_PROBLEMS.community] : []),
    );
  }
  if (community === null) {
    if (!house) return refuse(REQUEST_PROBLEMS.notAllowed);
  } else {
    const decider = await deciderFor(db, wallet, house, community);
    if (!decider.ok) return decider;
  }
  const { results } = await db.prepare(SELECT_OPEN).bind(community).all<Row>();
  return { ok: true, requests: results.map(entryOf) };
}

/** Tries this often when another call changes the organization between reading it and writing. */
const ATTEMPTS = 3;

/**
 * `AccountDesk.decideCommunityRequest`: accepts or declines an open request.
 * `name` is the community's name as the register has it: the house needs it
 * to open the organization when a claim is accepted before it is open.
 */
export async function decideCommunityRequest(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentId: unknown,
  sentAccept: unknown,
  sentName: unknown,
  now: Date,
): Promise<RequestAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const id = readRequestId(sentId);
  const accept = readAccept(sentAccept);
  if (wallet === undefined || house === undefined || id === undefined || accept === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(id === undefined ? [REQUEST_PROBLEMS.requestId] : []),
      ...(accept === undefined ? [REQUEST_PROBLEMS.accept] : []),
    );
  }
  const row = await db.prepare(SELECT_ONE).bind(id).first<Row>();
  if (row === null) return refuse(REQUEST_PROBLEMS.noSuchRequest);
  const request = requestOf(row);
  if (request.state !== 'open') return refuse(REQUEST_PROBLEMS.decided);
  let decider = await deciderFor(db, wallet, house, request.communityId);
  if (!decider.ok) return decider;
  if (accept && decider.org === null) {
    // A claim (or a join) accepted by the house before the organization is open: open it now.
    const opened = await ensureCommunityTeam(db, wallet, true, request.communityId, sentName, now);
    if (!opened.ok) {
      return refuse(REQUEST_PROBLEMS.noOrganization, ...opened.problems);
    }
    decider = await deciderFor(db, wallet, house, request.communityId);
    if (!decider.ok) return decider;
  }
  const state: RequestState = accept ? 'accepted' : 'declined';
  const decided = { ...request, state, decidedAt: now.toISOString(), decidedBy: wallet };
  if (decider.org === null) {
    // Declined before the organization exists: there is no log to write to yet.
    const result = await db.prepare(DECIDE).bind(id, state, now.toISOString(), wallet).run();
    return result.meta.changes === 1
      ? { ok: true, request: decided }
      : refuse(REQUEST_PROBLEMS.decided);
  }
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const { org, acting } = decider;
    const written = await commit(db, org, [
      ...(accept ? joining(db, org, acting, request, now) : []),
      logLine(
        db,
        org.accountId,
        now,
        acting,
        accept ? 'request-accepted' : 'request-declined',
        request.wallet,
        { kind: request.kind, request: request.id },
        org.revision,
      ),
      db
        .prepare(DECIDE_GUARDED)
        .bind(id, state, now.toISOString(), wallet, org.accountId, org.revision),
    ]);
    if (written) return { ok: true, request: decided };
    decider = await deciderFor(db, wallet, house, request.communityId);
    if (!decider.ok) return decider;
    if (decider.org === null) throw new Error('till database: a community’s organization is gone');
  }
  return refuse(PROBLEMS.meanwhile);
}

/**
 * The statements that make the asker a member: with the owner mark and the
 * administrator role for a claim, with the base role for a join. A member
 * already in keeps their place (a join), or is marked an owner (a claim).
 */
function joining(
  db: TillDatabase,
  org: Organization,
  acting: Acting,
  request: CommunityRequest,
  now: Date,
): D1PreparedStatement[] {
  const { accountId, revision } = org;
  const { wallet } = request;
  const at = now.toISOString();
  const existing = memberIn(org, wallet);
  if (request.kind === 'join') {
    if (existing !== undefined) return [];
    return [
      db.prepare(ADD_MEMBER).bind(accountId, wallet, 'member', acting.wallet, at, revision),
      logLine(db, accountId, now, acting, 'member-added', wallet, null, revision),
    ];
  }
  const statements: D1PreparedStatement[] = [];
  if (existing === undefined) {
    statements.push(
      db.prepare(ADD_OWNER).bind(accountId, wallet, acting.wallet, at, revision),
      logLine(db, accountId, now, acting, 'member-added', wallet, { owner: 'yes' }, revision),
    );
  } else if (!existing.isOwner) {
    statements.push(db.prepare(MARK_OWNER).bind(accountId, wallet, revision));
  }
  const administrator = org.state.roles.find((role) => role.permissions.includes('administrator'));
  if (administrator !== undefined && existing?.roleIds.includes(administrator.id) !== true) {
    statements.push(
      db.prepare(GIVE_ROLE).bind(accountId, wallet, administrator.id, revision),
      logLine(
        db,
        accountId,
        now,
        acting,
        'role-given',
        wallet,
        { role: administrator.id },
        revision,
      ),
    );
  }
  return statements;
}
