/**
 * «Una comunidad ES una organización» (cut 6) in the fixture desk: the house
 * opens the till account of a community the first time it uses it. The id is
 * derived from the community's, the account has no member, it is opened
 * once whoever asks first, and the house reaches it like any organization.
 * It is a fake of the till (apps/till), pinned here the way the till pins its own.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import { OWN_ROLES, type AccountDesk, type DeskLogAnswer } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { communityAccountId } from '../community-teams';

const NOW = new Date('2026-10-16T09:30:00.000Z');
const HOUSE = `0x${'99'.repeat(20)}`;
const OTHER_HOUSE = `0x${'98'.repeat(20)}`;
const ME = `0x${'ab'.repeat(20)}`;
const NEWCOMER = `0x${'0a'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const desk = (): Loose => createAccountsFixtureDesk(seed, () => NOW) as unknown as Loose;
const problems = (answer: unknown): string[] =>
  (answer as { ok: false; problems: string[] }).problems;
const lines = (answer: DeskLogAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.lines;
};

describe('opening a community’s account', () => {
  it('creates it the first time, under the derived id, named after the community', async () => {
    const id = await communityAccountId('reset');
    expect(await desk().ensureCommunityTeam(HOUSE, true, 'reset', 'Reset Community')).toEqual({
      ok: true,
      account: { id, name: 'Reset Community', created: true },
    });
  });

  it('finds the same account the second time, whoever asks, and keeps its first name', async () => {
    const d = desk();
    const first = await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const again = await d.ensureCommunityTeam(OTHER_HOUSE, true, 'merge', 'Another name');
    expect(first).toMatchObject({ ok: true, account: { created: true } });
    expect(again).toEqual({
      ok: true,
      account: { id: await communityAccountId('merge'), name: 'Merge', created: false },
    });
  });

  it('writes one line in the log, the house’s, only the first time', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const written = lines(await d.log(HOUSE, id, true));
    expect(
      written.filter((line) => line.act === 'organization-created').map((line) => line.asHouse),
    ).toEqual([true]);
  });

  it('makes the house a member of it, an administrator, and no one else', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const overview = await d.overview(HOUSE);
    expect('accounts' in overview && overview.accounts.map((a) => a.id)).toContain(id);
    const view = await d.roles(HOUSE, id, true);
    if (!view.ok) throw new Error('roles');
    const admin = view.roles.find((role) => role.permissions.includes('administrator'));
    expect(view.members.map((m) => [m.wallet, m.owner, m.roleIds])).toEqual([
      [HOUSE, false, [admin?.id]],
    ]);
  });

  it('adds the house to an account already open that it was not in, once, with no new log line', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const again = await d.ensureCommunityTeam(OTHER_HOUSE, true, 'merge', 'Merge');
    expect(again).toMatchObject({ ok: true, account: { created: false } });
    const twice = await d.ensureCommunityTeam(OTHER_HOUSE, true, 'merge', 'Merge');
    expect(twice).toEqual(again);
    const members = await d.members(HOUSE, id, true);
    expect(members).toMatchObject({ ok: true });
    expect('members' in members && members.members.map((m) => m.wallet)).toEqual([
      HOUSE,
      OTHER_HOUSE,
    ]);
    expect(lines(await d.log(HOUSE, id, true)).filter((l) => l.act !== 'house-read')).toHaveLength(
      1,
    );
  });

  it('is shared by every wallet’s copy: the house lists it from any, a stranger does not enter it', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    // A wallet already in the desk when the account is opened, and one that arrives after.
    await d.overview(ME);
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const before = await d.directory(ME, true);
    expect('accounts' in before && before.accounts.map((a) => a.id)).toContain(id);
    // A wallet that asks for the first time after it still sees it, as the house.
    const directory = await d.directory(NEWCOMER, true);
    expect(directory).toMatchObject({ ok: true });
    expect('accounts' in directory && directory.accounts.map((a) => a.id)).toContain(id);
    const stranger = await d.statement(ME, id, '30d', false);
    expect(stranger).toMatchObject({ ok: false });
  });

  it('is an organization the house works in: it places worlds there and adds a person', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    expect(await d.placeWorld(HOUSE, true, ['agora-plaza'], id)).toEqual({ ok: true, placed: 1 });
    expect(await d.worldsOf(HOUSE, true, id)).toEqual({
      ok: true,
      worlds: [{ worldId: 'agora-plaza', accountId: id }],
    });
    const added = await d.setMember(HOUSE, id, NEWCOMER, 'member', true);
    expect(added).toMatchObject({ ok: true });
    expect(await d.roles(HOUSE, id, true)).toMatchObject({ ok: true });
    // The person is in it now: it shows in their own overview.
    const theirs = await d.overview(NEWCOMER);
    expect('accounts' in theirs && theirs.accounts.map((a) => a.id)).toContain(id);
  });

  it('refuses a wallet that is not the house, and opens nothing', async () => {
    const d = desk();
    const refused = await d.ensureCommunityTeam(ME, false, 'merge', 'Merge');
    expect(problems(refused).join(' ')).toMatch(/house/);
    const directory = await d.directory(HOUSE, true);
    expect('accounts' in directory && directory.accounts).toHaveLength(seed.teams.length);
  });

  it('answers a bad wallet, flag, community id or name in words', async () => {
    const d = desk();
    expect(problems(await d.ensureCommunityTeam('nope', true, 'merge', 'Merge'))).toEqual([
      'wallet must be a lowercase 0x address',
    ]);
    expect(problems(await d.ensureCommunityTeam(HOUSE, 'yes', 'merge', 'Merge'))).toHaveLength(1);
    expect(problems(await d.ensureCommunityTeam(HOUSE, true, 'No Good', 'Merge'))).toEqual([
      'communityId must be a community id',
    ]);
    expect(problems(await d.ensureCommunityTeam(HOUSE, true, 'merge', ''))).toEqual([
      'name must be 1 to 60 characters',
    ]);
    expect(problems(await d.ensureCommunityTeam(HOUSE, true, 'merge', 7))).toEqual([
      'name must be 1 to 60 characters',
    ]);
  });
});

describe('the default colours and Numen Games’ own roles', () => {
  const colours = async (d: Loose, community: string, name: string) => {
    await d.ensureCommunityTeam(HOUSE, true, community, name);
    const view = await d.roles(HOUSE, await communityAccountId(community), true);
    if (!view.ok) throw new Error('roles');
    return view.roles.map((role) => [role.name, role.color]);
  };

  it('opens a community with Administration orange, Finance blue, Member green and a base role with none', async () => {
    expect(await colours(desk(), 'merge', 'Merge')).toEqual([
      ['Administración', '#d98324'],
      ['Finanzas', '#2f7fa8'],
      ['Miembro', '#3d8b5f'],
      ['@todos', null],
    ]);
  });

  it('names the administrators of Numen Games the Oracles, still orange', async () => {
    expect(await colours(desk(), 'numen-games', 'Numen Games')).toEqual([
      ['Oráculos', '#d98324'],
      ['Finanzas', '#2f7fa8'],
      ['Miembro', '#3d8b5f'],
      ['@todos', null],
    ]);
  });

  it('gives an organization created from now on the same colours', async () => {
    const d = desk();
    const made = await d.createTeam(ME, 'Mine');
    if (!made.ok || !('account' in made)) throw new Error('team');
    const view = await d.roles(ME, made.account.id, false);
    if (!view.ok) throw new Error('roles');
    expect(view.roles.map((role) => role.color)).toEqual(['#d98324', '#2f7fa8', '#3d8b5f', null]);
  });
});

describe('the house adding itself (the case behind «No se ha podido añadir»)', () => {
  it('joins an organization it is not in as an administrator, with the two log lines', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(OTHER_HOUSE, true, 'merge', 'Merge');
    const added = await d.setMember(HOUSE, id, HOUSE, 'member', true);
    expect(added).toMatchObject({ ok: true });
    const view = await d.roles(HOUSE, id, true);
    if (!view.ok) throw new Error('roles');
    expect(view.members.map((m) => m.wallet)).toContain(HOUSE);
    const acts = lines(await d.log(HOUSE, id, true))
      .filter((line) => line.subject === HOUSE)
      .map((line) => [line.act, line.asHouse]);
    expect(acts).toEqual([
      ['role-given', true],
      ['member-added', true],
    ]);
  });

  it('is a no-op once it is an administrator there: no new row, no new line', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const written = async () =>
      lines(await d.log(HOUSE, id, true)).filter((line) => line.act !== 'house-read').length;
    const before = await written();
    expect(await d.setMember(HOUSE, id, HOUSE, 'member', true)).toMatchObject({ ok: true });
    const view = await d.roles(HOUSE, id, true);
    if (!view.ok) throw new Error('roles');
    expect(view.members).toHaveLength(1);
    expect(await written()).toBe(before);
  });

  it('still refuses to change one’s own roles as a plain member, and a non-house self-add', async () => {
    const d = desk();
    const B2 = '0x00000000000000000000000000000000000000b2';
    expect(problems(await d.setMember(B2, 'acc_team_numen_games', B2, 'admin', true))).toEqual([
      OWN_ROLES,
    ]);
    const mine = await d.createTeam(ME, 'Mine');
    if (!mine.ok || !('account' in mine)) throw new Error('team');
    expect(problems(await d.setMember(ME, mine.account.id, ME, 'member', false))).toEqual([
      OWN_ROLES,
    ]);
  });
});

describe('opening every community at once', () => {
  const some = [
    { id: 'merge', name: 'Merge' },
    { id: 'reset', name: 'Reset' },
  ];

  it('opens them all, answers each account, and makes the house an administrator of each', async () => {
    const d = desk();
    const answer = await d.openAllCommunities(HOUSE, true, some);
    expect(answer).toEqual({
      ok: true,
      accounts: [
        { id: await communityAccountId('merge'), name: 'Merge', created: true },
        { id: await communityAccountId('reset'), name: 'Reset', created: true },
      ],
    });
    for (const { id } of some) {
      const members = await d.members(HOUSE, await communityAccountId(id), true);
      expect('members' in members && members.members.map((m) => m.wallet)).toEqual([HOUSE]);
    }
  });

  it('is repeatable: the second time opens nothing new', async () => {
    const d = desk();
    await d.openAllCommunities(HOUSE, true, some);
    const again = await d.openAllCommunities(HOUSE, true, some);
    expect(again).toMatchObject({ ok: true });
    expect('accounts' in again && again.accounts.map((a) => a.created)).toEqual([false, false]);
  });

  it('refuses a wallet that is not the house, a bad flag, and a list out of shape', async () => {
    const d = desk();
    expect(problems(await d.openAllCommunities(ME, false, some)).join(' ')).toMatch(/house/);
    expect(problems(await d.openAllCommunities('nope', true, some))).toHaveLength(1);
    expect(problems(await d.openAllCommunities(HOUSE, true, []))).toEqual([
      'communities must be 1 to 50 communities',
    ]);
    const many = Array.from({ length: 51 }, (_, i) => ({ id: `c${i}`, name: `C ${i}` }));
    expect(problems(await d.openAllCommunities(HOUSE, true, many))).toHaveLength(1);
    expect(problems(await d.openAllCommunities(HOUSE, true, 'merge'))).toHaveLength(1);
    expect(
      problems(await d.openAllCommunities(HOUSE, true, [{ id: 'No Good', name: 'x' }])),
    ).toEqual(['each community needs a community id and a name of 1 to 60 characters']);
    expect(problems(await d.openAllCommunities(HOUSE, true, [{ id: 'ok', name: 3 }]))).toHaveLength(
      1,
    );
    expect(problems(await d.openAllCommunities(HOUSE, true, [null]))).toHaveLength(1);
  });
});
