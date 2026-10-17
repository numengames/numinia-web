/**
 * «Hazla tuya» for real (cut G) in the fixture desk: a person claims a
 * community or asks to join it, the house or an owner decides, a claim
 * accepted makes a Titular. A fake of the till (apps/till), pinned here the
 * way the till pins its own.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskLogAnswer, DeskRequestAnswer } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { REQUEST_PROBLEMS } from '../community-requests';
import { communityAccountId } from '../community-teams';

const NOW = new Date('2026-10-17T09:30:00.000Z');
const HOUSE = `0x${'99'.repeat(20)}`;
const PABLO = `0x${'0a'.repeat(20)}`;
const MARIA = `0x${'0b'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const desk = (): Loose => createAccountsFixtureDesk(seed, () => NOW) as unknown as Loose;
const problems = (answer: unknown): string[] =>
  (answer as { ok: false; problems: string[] }).problems;
const requestOf = (answer: DeskRequestAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.request;
};
/** The log's acts oldest first, the house's own read of it left out. */
const acts = (answer: DeskLogAnswer): string[] => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.lines
    .map((line) => line.act)
    .filter((act) => act !== 'house-read')
    .reverse();
};

describe('asking', () => {
  it('records an open claim with its note and finds it again; a join is another request', async () => {
    const d = desk();
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim', ' Soy Pablo '));
    expect(claim).toMatchObject({
      communityId: 'merge',
      wallet: PABLO,
      kind: 'claim',
      note: 'Soy Pablo',
      state: 'open',
      createdAt: NOW.toISOString(),
      decidedAt: null,
      decidedBy: null,
    });
    expect(claim.id).toMatch(/^req_[0-9a-f]{32}$/);
    expect(requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'))).toEqual(claim);
    const join = requestOf(await d.requestCommunity(PABLO, 'merge', 'join'));
    expect(join.id).not.toBe(claim.id);
    const mine = await d.myCommunityRequests(PABLO, 'merge');
    expect(mine.ok && mine.requests.map((r) => r.id)).toEqual([join.id, claim.id]);
    expect(mine.ok && mine.standing).toEqual({ member: false, hasOwner: false });
    const all = await d.myCommunityRequests(PABLO);
    expect(all.ok && all.requests).toHaveLength(2);
    expect(all.ok && 'standing' in all).toBe(false);
    const none = await d.myCommunityRequests(MARIA);
    expect(none).toEqual({ ok: true, requests: [] });
  });

  it('refuses what it cannot read, a member, and a claim where there is a titular', async () => {
    const d = desk();
    expect(problems(await d.requestCommunity('x', 'Merge', 'owner', 'a'.repeat(300)))).toEqual([
      'wallet must be a lowercase 0x address',
      REQUEST_PROBLEMS.community,
      REQUEST_PROBLEMS.kind,
      REQUEST_PROBLEMS.note,
    ]);
    expect(problems(await d.myCommunityRequests(PABLO, 'Merge'))).toEqual([
      REQUEST_PROBLEMS.community,
    ]);
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'));
    expect((await d.decideCommunityRequest(HOUSE, claim.id, true, true, 'Merge')).ok).toBe(true);
    expect(problems(await d.requestCommunity(PABLO, 'merge', 'join'))).toEqual([
      REQUEST_PROBLEMS.member,
    ]);
    expect(problems(await d.requestCommunity(MARIA, 'merge', 'claim'))).toEqual([
      REQUEST_PROBLEMS.hasOwner,
    ]);
    expect((await d.requestCommunity(MARIA, 'merge', 'join')).ok).toBe(true);
    const pablo = await d.myCommunityRequests(PABLO, 'merge');
    expect(pablo.ok && pablo.standing).toEqual({ member: true, hasOwner: true });
    const maria = await d.myCommunityRequests(MARIA, 'merge');
    expect(maria.ok && maria.standing).toEqual({ member: false, hasOwner: true });
  });
});

describe('seeing', () => {
  it('lists the open ones of a community to the house or an owner, every one to the house alone', async () => {
    const d = desk();
    await d.setProfile(PABLO, { name: 'Pablo', avatar: null });
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim', 'Hola'));
    const other = requestOf(await d.requestCommunity(MARIA, 'reset', 'join'));
    const list = await d.communityRequests(HOUSE, true, 'merge');
    expect(list.ok && list.requests).toEqual([{ ...claim, name: 'Pablo', avatar: null }]);
    const every = await d.communityRequests(HOUSE, true);
    expect(every.ok && every.requests.map((r) => r.id).sort()).toEqual([claim.id, other.id].sort());
    expect(problems(await d.communityRequests(PABLO, false, 'merge'))).toEqual([
      REQUEST_PROBLEMS.notAllowed,
    ]);
    expect(problems(await d.communityRequests(PABLO, false))).toEqual([
      REQUEST_PROBLEMS.notAllowed,
    ]);
    expect(problems(await d.communityRequests(HOUSE, false, 'merge'))).toEqual([
      REQUEST_PROBLEMS.notAllowed,
    ]);
    expect(problems(await d.communityRequests('x', 'yes', 'Merge'))).toHaveLength(3);
    await d.decideCommunityRequest(HOUSE, claim.id, true, true, 'Merge');
    // The new titular sees them; a plain member does not.
    expect((await d.communityRequests(PABLO, false, 'merge')).ok).toBe(true);
    const join = requestOf(await d.requestCommunity(MARIA, 'merge', 'join'));
    await d.decideCommunityRequest(PABLO, join.id, true);
    expect(problems(await d.communityRequests(MARIA, false, 'merge'))).toEqual([
      REQUEST_PROBLEMS.notAllowed,
    ]);
  });
});

describe('deciding', () => {
  it('a claim accepted by the house opens the organization and makes the asker its titular, logged', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'));
    expect(problems(await d.decideCommunityRequest(HOUSE, claim.id, true, true))).toEqual([
      REQUEST_PROBLEMS.noOrganization,
      'name must be 1 to 60 characters',
    ]);
    const accepted = requestOf(
      await d.decideCommunityRequest(HOUSE, claim.id, true, true, 'Merge'),
    );
    expect(accepted).toMatchObject({
      state: 'accepted',
      decidedAt: NOW.toISOString(),
      decidedBy: HOUSE,
    });
    const view = await d.roles(PABLO, id, false);
    if (!view.ok) throw new Error('roles');
    const admin = view.roles.find((role) => role.permissions.includes('administrator'));
    expect(view.members.find((m) => m.wallet === PABLO)).toMatchObject({
      owner: true,
      roleIds: [admin?.id],
    });
    expect(acts(await d.log(HOUSE, id, true))).toEqual([
      'organization-created',
      'member-added',
      'role-given',
      'request-accepted',
    ]);
    expect(problems(await d.decideCommunityRequest(HOUSE, claim.id, true, true, 'Merge'))).toEqual([
      REQUEST_PROBLEMS.decided,
    ]);
  });

  it('a join accepted by the titular adds a member; a decline only writes it down; strangers may not', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'));
    await d.decideCommunityRequest(HOUSE, claim.id, true, true, 'Merge');
    const join = requestOf(await d.requestCommunity(MARIA, 'merge', 'join', 'Hola'));
    expect(problems(await d.decideCommunityRequest(MARIA, join.id, true))).toEqual([
      REQUEST_PROBLEMS.notAllowed,
    ]);
    const joined = requestOf(await d.decideCommunityRequest(PABLO, join.id, true));
    expect(joined.decidedBy).toBe(PABLO);
    const view = await d.roles(PABLO, id, false);
    expect(view.ok && view.members.find((m) => m.wallet === MARIA)).toMatchObject({
      owner: false,
      roleIds: [],
    });
    expect(acts(await d.log(PABLO, id, false)).slice(-2)).toEqual([
      'member-added',
      'request-accepted',
    ]);
    const third = `0x${'0c'.repeat(20)}`;
    const ask = requestOf(await d.requestCommunity(third, 'merge', 'join'));
    const declined = requestOf(await d.decideCommunityRequest(PABLO, ask.id, false));
    expect(declined.state).toBe('declined');
    expect(acts(await d.log(PABLO, id, false)).slice(-1)).toEqual(['request-declined']);
    const open = await d.communityRequests(PABLO, false, 'merge');
    expect(open.ok && open.requests).toEqual([]);
    const theirs = await d.myCommunityRequests(third, 'merge');
    expect(theirs.ok && theirs.requests[0]).toMatchObject({ state: 'declined', note: null });
  });

  it('declined before the organization is open: nothing opens, a new ask is possible; bad input refused', async () => {
    const d = desk();
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'));
    expect(problems(await d.decideCommunityRequest('x', 'nope', 'yes', 'maybe'))).toHaveLength(4);
    expect(
      problems(await d.decideCommunityRequest(HOUSE, `req_${'f'.repeat(32)}`, true, true)),
    ).toEqual([REQUEST_PROBLEMS.noSuchRequest]);
    expect(problems(await d.decideCommunityRequest(PABLO, claim.id, false))).toEqual([
      REQUEST_PROBLEMS.notAllowed,
    ]);
    const declined = requestOf(await d.decideCommunityRequest(HOUSE, claim.id, false, true));
    expect(declined.state).toBe('declined');
    const overview = await d.overview(HOUSE);
    expect('accounts' in overview && overview.accounts.map((a) => a.id)).not.toContain(
      await communityAccountId('merge'),
    );
    expect(requestOf(await d.requestCommunity(PABLO, 'merge', 'claim')).id).not.toBe(claim.id);
  });

  it('a claim accepted for someone added as a member meanwhile marks them owner', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const claim = requestOf(await d.requestCommunity(PABLO, 'merge', 'claim'));
    await d.setMember(HOUSE, id, PABLO, 'member', true);
    expect((await d.decideCommunityRequest(HOUSE, claim.id, true, true)).ok).toBe(true);
    const view = await d.roles(PABLO, id, false);
    expect(view.ok && view.members.find((m) => m.wallet === PABLO)?.owner).toBe(true);
    expect(acts(await d.log(HOUSE, id, true)).slice(-2)).toEqual([
      'role-given',
      'request-accepted',
    ]);
  });
});
