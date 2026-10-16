/**
 * «Una comunidad ES una organización» (cut 6) in the fixture desk: the house
 * opens the till account of a community the first time it uses it. The id is
 * derived from the community's, the account has no member, it is opened
 * once whoever asks first, and the house reaches it like any organization.
 * It is a fake of the till (apps/till), pinned here the way the till pins its own.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskLogAnswer } from '../accounts';
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

  it('does not make the house a member, and no one else either', async () => {
    const d = desk();
    const id = await communityAccountId('merge');
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'Merge');
    const overview = await d.overview(HOUSE);
    expect('accounts' in overview && overview.accounts.map((a) => a.id)).not.toContain(id);
    const members = await d.members(HOUSE, id, true);
    expect(members).toMatchObject({ ok: true, members: [] });
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
