import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const NEWCOMER = `0x${'cd'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;
const TEAM = seed.teams[0]?.id ?? '';

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const desk = (): Loose => createAccountsFixtureDesk(seed, () => NOW) as unknown as Loose;

describe('the fixture desk: the head count', () => {
  it('counts the seeded organization’s people with no wallet asked', async () => {
    expect(await desk().headcount(TEAM)).toEqual({
      ok: true,
      accountId: TEAM,
      members: seed.teams[0]?.members.length,
    });
  });

  it('follows the organization as a wallet has changed it', async () => {
    const fixture = desk();
    await fixture.overview(ME);
    await fixture.setMember(ME, TEAM, NEWCOMER, 'member');
    expect(await fixture.headcount(TEAM)).toEqual({
      ok: true,
      accountId: TEAM,
      members: (seed.teams[0]?.members.length ?? 0) + 1,
    });
  });

  it('refuses what is not an organization: unknown ids, personal accounts, anything else', async () => {
    const refusal = { ok: false, problems: ['not an organization'] };
    expect(await desk().headcount('acc_nobody')).toEqual(refusal);
    expect(await desk().headcount(seed.personal.id)).toEqual(refusal);
    expect(await desk().headcount(undefined)).toEqual(refusal);
  });
});
