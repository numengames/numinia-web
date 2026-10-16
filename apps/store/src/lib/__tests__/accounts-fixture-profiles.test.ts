/**
 * The fixture desk keeps names and avatars in memory as the till keeps them
 * in D1 (cut «Tu nombre y tu cara», 2026-10-16): the same rules and words,
 * one row per wallet, replaced on change and gone on removal, shown in the
 * roles view to the organization's members and the house only — and two
 * of the seeded people have published, so fixture builds show names.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskMemberDetail, DeskRoles } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { PROFILE_AVATARS } from '../profile-avatars';
import {
  PROFILE_AVATAR_PROBLEM,
  PROFILE_CHANGE_PROBLEM,
  PROFILE_NAME_PROBLEM,
} from '../profile-name';

const NOW = new Date('2026-10-16T09:30:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const LUCIA = '0x00000000000000000000000000000000000000a1';
const MARCO = '0x00000000000000000000000000000000000000b2';
const ARLA = 'avatar-arla-mncdhz3l';
const seed = deskSeed as unknown as AccountsSeed;
const NUMEN = 'acc_team_numen_games';
const INSTITUTE = 'acc_team_active_inference';
const BAD_WALLET = 'wallet must be a lowercase 0x address';

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};

function desk(at: () => Date = () => NOW): Loose {
  return createAccountsFixtureDesk(seed, at) as unknown as Loose;
}

const viewOf = (answer: unknown): DeskRoles => {
  const view = answer as DeskRoles | { ok: false; problems: string[] };
  if (!view.ok) throw new Error(view.problems.join());
  return view;
};

const memberOf = (view: DeskRoles, wallet: string): DeskMemberDetail => {
  const found = view.members.find((member) => member.wallet === wallet);
  if (found === undefined) throw new Error(`no member ${wallet}`);
  return found;
};

describe('the fixture desk: one’s own name and avatar', () => {
  it('shows nobody before they choose, and publishes, replaces and removes for real', async () => {
    let now = NOW;
    const fixture = desk(() => now);
    expect(await fixture.profile(ME)).toEqual({ ok: true, profile: null });
    expect(await fixture.setProfile(ME, { name: '  Rima ', avatar: ARLA })).toEqual({
      ok: true,
      profile: { name: 'Rima', avatar: ARLA, updatedAt: NOW.toISOString() },
    });
    now = new Date('2026-10-16T10:00:00.000Z');
    expect(await fixture.setProfile(ME, { name: 'Rima Ferrán', avatar: null })).toEqual({
      ok: true,
      profile: { name: 'Rima Ferrán', avatar: null, updatedAt: now.toISOString() },
    });
    expect(await fixture.profile(ME)).toEqual({
      ok: true,
      profile: { name: 'Rima Ferrán', avatar: null, updatedAt: now.toISOString() },
    });
    expect(await fixture.setProfile(ME, null)).toEqual({ ok: true, profile: null });
    expect(await fixture.profile(ME)).toEqual({ ok: true, profile: null });
    expect(await fixture.setProfile(ME, null)).toEqual({ ok: true, profile: null });
  });

  it('refuses in the till’s own words, and keeps what was there', async () => {
    const fixture = desk();
    await fixture.setProfile(ME, { name: 'Rima', avatar: null });
    expect(await fixture.setProfile(ME, { name: 'Ri\u202ema', avatar: 'Bad Id' })).toEqual({
      ok: false,
      problems: [PROFILE_NAME_PROBLEM, PROFILE_AVATAR_PROBLEM],
    });
    expect(await fixture.setProfile(ME, { name: 'Rima' })).toEqual({
      ok: false,
      problems: [PROFILE_CHANGE_PROBLEM],
    });
    expect(await fixture.setProfile('0xAB', null)).toEqual({ ok: false, problems: [BAD_WALLET] });
    expect(await fixture.setProfile(1, 'x')).toEqual({
      ok: false,
      problems: [BAD_WALLET, PROFILE_CHANGE_PROBLEM],
    });
    expect(await fixture.profile(undefined)).toEqual({ ok: false, problems: [BAD_WALLET] });
    expect(await fixture.profile(ME)).toMatchObject({ ok: true, profile: { name: 'Rima' } });
  });
});

describe('the fixture desk: the seeded people who published', () => {
  it('names two of Numen Games’ people, one of them with an avatar of the Bazar', async () => {
    const seeded = seed.profiles ?? [];
    expect(seeded.map((profile) => profile.wallet)).toEqual([LUCIA, MARCO]);
    expect(seeded[0]?.avatar).toBe(ARLA);
    expect(seeded[1]?.avatar).toBeNull();
    for (const profile of seeded) {
      if (profile.avatar !== null) {
        expect(PROFILE_AVATARS.map((avatar) => avatar.id)).toContain(profile.avatar);
      }
    }
    const fixture = desk();
    expect(await fixture.profile(LUCIA)).toEqual({
      ok: true,
      profile: { name: 'Lucía Vidal', avatar: ARLA, updatedAt: NOW.toISOString() },
    });
  });

  it('shows them to a member in the roles view, and nothing for whoever published nothing', async () => {
    const view = viewOf(await desk().roles(ME, NUMEN));
    expect(memberOf(view, LUCIA)).toMatchObject({ name: 'Lucía Vidal', avatar: ARLA });
    expect(memberOf(view, MARCO)).toMatchObject({ name: 'Marco Ibáñez', avatar: null });
    expect(memberOf(view, ME)).not.toHaveProperty('name');
    expect(memberOf(view, ME)).not.toHaveProperty('avatar');
  });

  it('shows the house the names where it enters, and a stranger none', async () => {
    const fixture = desk();
    const ines = '0x00000000000000000000000000000000000000c3';
    await fixture.setProfile(ines, { name: 'Inés', avatar: null });
    expect(await fixture.roles(ME, INSTITUTE)).toEqual({ ok: false, problems: ['not a member'] });
    const entered = viewOf(await fixture.roles(ME, INSTITUTE, true));
    expect(entered.as).toBe('house');
    expect(memberOf(entered, ines)).toMatchObject({ name: 'Inés', avatar: null });
  });

  it('keeps the head count a number', async () => {
    expect(await desk().headcount(NUMEN)).toEqual({ ok: true, accountId: NUMEN, members: 3 });
  });
});
