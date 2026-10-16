/**
 * «Hazla tuya» for real (cut G, 2026-10-17): a person claims a community or
 * asks to join it, the house or an administrator decides, a claim accepted
 * makes an owner («Titular»). The pure rules, migration 0013 on the D1 shim,
 * and the account desk as numinia.com's binding calls it. One describe per
 * rule or per door.
 */

import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import {
  NOTE_MAX,
  REQUEST_PROBLEMS,
  readAccept,
  readKind,
  readNote,
  readRequestId,
  requestId,
} from '../src/lib/community-requests';
import { COMMUNITY_PROBLEMS } from '../src/lib/community-teams';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

function scene() {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

type Scene = ReturnType<typeof scene>;

const requestOf = (answer: Awaited<ReturnType<AccountDesk['requestCommunity']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.request;
};

const listOf = (answer: Awaited<ReturnType<AccountDesk['communityRequests']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.requests;
};

const acts = (s: Scene, id: string): string[] =>
  s.sqlite
    .prepare('SELECT act FROM team_log WHERE account_id = ? ORDER BY seq')
    .all(id)
    .map((row) => String(row['act']));

async function opened(s: Scene, community = 'numen-games'): Promise<string> {
  const answer = await s.desk.ensureCommunityTeam(HOUSE, true, community, 'Numen Games');
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.account.id;
}

describe('the rules of a request', () => {
  it('reads a kind, a decision and a request id', () => {
    expect(readKind('claim')).toBe('claim');
    expect(readKind('join')).toBe('join');
    for (const value of ['owner', '', null, 1]) expect(readKind(value)).toBeUndefined();
    expect(readAccept(true)).toBe(true);
    expect(readAccept(false)).toBe(false);
    for (const value of ['true', 1, null, undefined]) expect(readAccept(value)).toBeUndefined();
    const id = requestId();
    expect(id).toMatch(/^req_[0-9a-f]{32}$/);
    expect(readRequestId(id)).toBe(id);
    expect(requestId()).not.toBe(id);
    for (const value of ['req_', 'role_0123456789abcdef', `${id}0`, 7]) {
      expect(readRequestId(value)).toBeUndefined();
    }
  });

  it('reads the note: nothing is null, blank is null, 280 characters at most, no control characters', () => {
    expect(readNote(undefined)).toBeNull();
    expect(readNote(null)).toBeNull();
    expect(readNote('   ')).toBeNull();
    expect(readNote('  Soy Pablo, llevo la comunidad.  ')).toBe('Soy Pablo, llevo la comunidad.');
    expect(readNote('a'.repeat(NOTE_MAX))).toBe('a'.repeat(NOTE_MAX));
    expect(readNote('a'.repeat(NOTE_MAX + 1))).toBeUndefined();
    expect(readNote('line\nbreak')).toBeUndefined();
    expect(readNote(42)).toBeUndefined();
  });
});

describe('asking for a community', () => {
  it('refuses what it cannot read, every problem at once', async () => {
    const s = scene();
    const answer = await s.desk.requestCommunity('pablo', 'Numen Games', 'owner', 'x'.repeat(300));
    expect(answer).toEqual({
      ok: false,
      problems: [
        PROBLEMS.wallet,
        COMMUNITY_PROBLEMS.community,
        REQUEST_PROBLEMS.kind,
        REQUEST_PROBLEMS.note,
      ],
    });
  });

  it('records a claim, with the note, open, and finds it again instead of a second one', async () => {
    const s = scene();
    const first = requestOf(
      await s.desk.requestCommunity(PABLO, 'numen-games', 'claim', ' Soy Pablo '),
    );
    expect(first).toMatchObject({
      communityId: 'numen-games',
      wallet: PABLO,
      kind: 'claim',
      note: 'Soy Pablo',
      state: 'open',
      decidedAt: null,
      decidedBy: null,
    });
    expect(first.id).toMatch(/^req_[0-9a-f]{32}$/);
    const again = requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'claim'));
    expect(again).toEqual(first);
    const join = requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'join'));
    expect(join.id).not.toBe(first.id);
    expect(join.note).toBeNull();
    const mine = await s.desk.myCommunityRequests(PABLO, 'numen-games');
    expect(mine.ok && mine.requests.map((request) => request.kind)).toEqual(['join', 'claim']);
    expect(mine.ok && mine.standing).toEqual({ member: false, hasOwner: false });
    const all = await s.desk.myCommunityRequests(PABLO);
    expect(all.ok && all.requests.length).toBe(2);
    expect(all.ok && 'standing' in all).toBe(false);
    const none = await s.desk.myCommunityRequests(MARIA, 'numen-games');
    expect(none).toEqual({ ok: true, requests: [], standing: { member: false, hasOwner: false } });
    expect(await s.desk.myCommunityRequests('x', 'Numen')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, COMMUNITY_PROBLEMS.community],
    });
  });

  it('refuses a member, and a claim where the community has a titular already', async () => {
    const s = scene();
    const id = await opened(s);
    const claim = requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'claim'));
    const accepted = await s.desk.decideCommunityRequest(HOUSE, claim.id, true, true);
    expect(accepted.ok).toBe(true);
    expect(await s.desk.requestCommunity(PABLO, 'numen-games', 'join')).toEqual({
      ok: false,
      problems: [REQUEST_PROBLEMS.member],
    });
    expect(await s.desk.requestCommunity(MARIA, 'numen-games', 'claim')).toEqual({
      ok: false,
      problems: [REQUEST_PROBLEMS.hasOwner],
    });
    expect(requestOf(await s.desk.requestCommunity(MARIA, 'numen-games', 'join')).kind).toBe(
      'join',
    );
    expect(acts(s, id)).toContain('request-accepted');
  });
});

describe('seeing the requests', () => {
  it('lists the open ones of a community, newest first, with the name published, to the house', async () => {
    const s = scene();
    await s.desk.setProfile(PABLO, { name: 'Pablo', avatar: null });
    const first = requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'claim', 'Hola'));
    s.sqlite.prepare("UPDATE community_requests SET created_at = '2026-01-01T00:00:00.000Z'").run();
    const second = requestOf(await s.desk.requestCommunity(MARIA, 'numen-games', 'join'));
    s.sqlite
      .prepare("UPDATE community_requests SET created_at = '2026-02-01T00:00:00.000Z' WHERE id = ?")
      .run(second.id);
    await s.desk.requestCommunity(STRANGER, 'numinia', 'claim');
    const list = listOf(await s.desk.communityRequests(HOUSE, true, 'numen-games'));
    expect(list.map((request) => request.id)).toEqual([second.id, first.id]);
    expect(list[1]).toMatchObject({ name: 'Pablo', avatar: null, note: 'Hola' });
    expect(list[0]).toMatchObject({ name: null, avatar: null, note: null });
    const every = listOf(await s.desk.communityRequests(HOUSE, true));
    expect(every.map((request) => request.communityId)).toEqual([
      'numinia',
      'numen-games',
      'numen-games',
    ]);
    expect(await s.desk.communityRequests(HOUSE, true, 'Numen Games')).toEqual({
      ok: false,
      problems: [COMMUNITY_PROBLEMS.community],
    });
    expect(await s.desk.communityRequests('x', 'yes')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house],
    });
  });

  it('refuses anyone but the house or an administrator of the organization', async () => {
    const s = scene();
    await s.desk.requestCommunity(PABLO, 'numen-games', 'claim');
    const refused = { ok: false, problems: [REQUEST_PROBLEMS.notAllowed] };
    expect(await s.desk.communityRequests(PABLO, false, 'numen-games')).toEqual(refused);
    expect(await s.desk.communityRequests(PABLO, false)).toEqual(refused);
    expect(await s.desk.communityRequests(HOUSE, false, 'numen-games')).toEqual(refused);
    const id = await opened(s);
    expect(await s.desk.communityRequests(STRANGER, false, 'numen-games')).toEqual(refused);
    // A plain member sees nothing; an administrator sees the list.
    await s.desk.setMember(HOUSE, id, MARIA, 'member', true);
    expect(await s.desk.communityRequests(MARIA, false, 'numen-games')).toEqual(refused);
    await s.desk.setMember(HOUSE, id, MARIA, 'admin', true);
    expect(listOf(await s.desk.communityRequests(MARIA, false, 'numen-games')).length).toBe(1);
  });
});

describe('deciding', () => {
  it('refuses what it cannot read, a request that is not there, and one decided already', async () => {
    const s = scene();
    expect(await s.desk.decideCommunityRequest('x', 'nope', 'yes', 'maybe')).toEqual({
      ok: false,
      problems: [
        PROBLEMS.wallet,
        ORG_PROBLEMS.house,
        REQUEST_PROBLEMS.requestId,
        REQUEST_PROBLEMS.accept,
      ],
    });
    expect(await s.desk.decideCommunityRequest(HOUSE, requestId(), true, true)).toEqual({
      ok: false,
      problems: [REQUEST_PROBLEMS.noSuchRequest],
    });
    const claim = requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'claim'));
    expect(await s.desk.decideCommunityRequest(PABLO, claim.id, true)).toEqual({
      ok: false,
      problems: [REQUEST_PROBLEMS.notAllowed],
    });
    const declined = await s.desk.decideCommunityRequest(HOUSE, claim.id, false, true);
    expect(declined.ok && declined.request).toMatchObject({
      state: 'declined',
      decidedBy: HOUSE,
    });
    expect(await s.desk.decideCommunityRequest(HOUSE, claim.id, true, true)).toEqual({
      ok: false,
      problems: [REQUEST_PROBLEMS.decided],
    });
    // Declined before the organization was open: no organization, no log, and a new ask is possible.
    expect(s.sqlite.prepare('SELECT COUNT(*) AS n FROM team_profiles').get()).toEqual({ n: 0 });
    expect(requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'claim')).id).not.toBe(
      claim.id,
    );
  });

  it('a claim accepted by the house opens the organization and makes the asker its titular', async () => {
    const s = scene();
    const claim = requestOf(
      await s.desk.requestCommunity(PABLO, 'numen-games', 'claim', 'Soy Pablo'),
    );
    expect(await s.desk.decideCommunityRequest(HOUSE, claim.id, true, true)).toEqual({
      ok: false,
      problems: [REQUEST_PROBLEMS.noOrganization, PROBLEMS.name],
    });
    const accepted = await s.desk.decideCommunityRequest(
      HOUSE,
      claim.id,
      true,
      true,
      'Numen Games',
    );
    expect(accepted.ok && accepted.request.state).toBe('accepted');
    const id = await opened(s);
    const members = await s.desk.members(PABLO, id);
    expect(members.ok && members.members.map((member) => [member.wallet, member.role])).toEqual([
      [HOUSE, 'admin'],
      [PABLO, 'admin'],
    ]);
    const access = await s.desk.access(PABLO, id);
    expect(access.ok && access.as).toBe('owner');
    expect(access.ok && access.roles.map((role) => role.name)).toContain('Oracles');
    expect(acts(s, id)).toEqual([
      'organization-created',
      'member-added',
      'role-given',
      'member-added',
      'role-given',
      'request-accepted',
    ]);
    const line = s.sqlite
      .prepare(
        "SELECT actor, as_house, subject, detail FROM team_log WHERE act = 'request-accepted'",
      )
      .get() as Record<string, unknown>;
    expect(line).toEqual({
      actor: HOUSE,
      as_house: 1,
      subject: PABLO,
      detail: JSON.stringify({ kind: 'claim', request: claim.id }),
    });
    // The owner now sees and decides the community's requests.
    const join = requestOf(await s.desk.requestCommunity(MARIA, 'numen-games', 'join'));
    expect(listOf(await s.desk.communityRequests(PABLO, false, 'numen-games')).length).toBe(1);
    const joined = await s.desk.decideCommunityRequest(PABLO, join.id, true);
    expect(joined.ok && joined.request.decidedBy).toBe(PABLO);
    const after = await s.desk.members(PABLO, id);
    expect(after.ok && after.members.find((member) => member.wallet === MARIA)?.role).toBe(
      'member',
    );
    expect(acts(s, id).slice(-2)).toEqual(['member-added', 'request-accepted']);
    expect(listOf(await s.desk.communityRequests(PABLO, false, 'numen-games'))).toEqual([]);
  });

  it('a claim accepted for a member already in marks them owner; a join declined is only written down', async () => {
    const s = scene();
    const id = await opened(s);
    await s.desk.setMember(HOUSE, id, PABLO, 'member', true);
    s.sqlite.prepare('DELETE FROM team_members WHERE wallet = ?').run(PABLO);
    const claim = requestOf(await s.desk.requestCommunity(PABLO, 'numen-games', 'claim'));
    await s.desk.setMember(HOUSE, id, PABLO, 'admin', true);
    const accepted = await s.desk.decideCommunityRequest(HOUSE, claim.id, true, true);
    expect(accepted.ok).toBe(true);
    const access = await s.desk.access(PABLO, id);
    expect(access.ok && access.as).toBe('owner');
    expect(acts(s, id).slice(-1)).toEqual(['request-accepted']);
    const join = requestOf(await s.desk.requestCommunity(MARIA, 'numen-games', 'join', 'Hola'));
    const declined = await s.desk.decideCommunityRequest(HOUSE, join.id, false, true);
    expect(declined.ok && declined.request.state).toBe('declined');
    expect(acts(s, id).slice(-1)).toEqual(['request-declined']);
    const members = await s.desk.members(PABLO, id);
    expect(members.ok && members.members.some((member) => member.wallet === MARIA)).toBe(false);
    const kept = s.sqlite
      .prepare('SELECT state, note FROM community_requests WHERE id = ?')
      .get(join.id);
    expect(kept).toEqual({ state: 'declined', note: 'Hola' });
  });

  it('writes nothing when the organization changes meanwhile, after three tries', async () => {
    const s = scene();
    const id = await opened(s);
    const join = requestOf(await s.desk.requestCommunity(MARIA, 'numen-games', 'join'));
    const bump = s.sqlite.prepare(
      'UPDATE team_profiles SET revision = revision + 1 WHERE account_id = ?',
    );
    const { batch } = s.db;
    s.db.batch = ((statements: D1PreparedStatement[]) => {
      bump.run(id);
      return batch.call(s.db, statements);
    }) as typeof s.db.batch;
    expect(await s.desk.decideCommunityRequest(HOUSE, join.id, true, true)).toEqual({
      ok: false,
      problems: [PROBLEMS.meanwhile],
    });
    s.db.batch = batch;
    const still = s.sqlite
      .prepare('SELECT state FROM community_requests WHERE id = ?')
      .get(join.id);
    expect(still).toEqual({ state: 'open' });
  });
});
