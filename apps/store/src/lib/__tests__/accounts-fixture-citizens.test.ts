/**
 * The fixture desk keeps who has signed in as the till keeps it in D1 (cut
 * «El censo», 2026-10-16): the first and the last time per wallet, the list
 * for the house alone, newest first, with the names people published and how
 * many organizations each is in — and six seeded people, so fixture builds
 * show a real list.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskCitizen } from '../accounts';
import { HOUSE_BOOLEAN, NOT_HOUSE_CENSUS } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';

const NOW = new Date('2026-10-16T09:30:00.000Z');
const HOUSE = `0x${'99'.repeat(20)}`;
const ME = `0x${'ab'.repeat(20)}`;
const LUCIA = '0x00000000000000000000000000000000000000a1';
const MARCO = '0x00000000000000000000000000000000000000b2';
const NUEVA = '0x0000000000000000000000000000000000000a07';
const ARLA = 'avatar-arla-mncdhz3l';
const NUMEN = 'acc_team_numen_games';
const BAD_WALLET = 'wallet must be a lowercase 0x address';
const seed = deskSeed as unknown as AccountsSeed;

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};

function desk(at: () => Date = () => NOW, from: AccountsSeed = seed): Loose {
  return createAccountsFixtureDesk(from, at) as unknown as Loose;
}

async function people(on: Loose, query?: unknown, cursor?: unknown): Promise<DeskCitizen[]> {
  const answer = await on.citizens(HOUSE, true, query, cursor);
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.people;
}

describe('the seeded list', () => {
  it('holds six people, newest last time first, two with the names they published', async () => {
    const list = await people(desk());
    expect(list).toHaveLength(6);
    const lasts = list.map((person) => person.lastSeenAt);
    expect([...lasts].sort().reverse()).toEqual(lasts);
    for (const person of list) {
      expect(person.firstSeenAt <= person.lastSeenAt).toBe(true);
      expect(person.wallet).toMatch(/^0x[0-9a-f]{40}$/);
    }
    const named = list.filter((person) => person.name !== undefined);
    expect(named.map(({ wallet, name, avatar }) => ({ wallet, name, avatar }))).toEqual(
      expect.arrayContaining([
        { wallet: LUCIA, name: 'Lucía Vidal', avatar: ARLA },
        { wallet: MARCO, name: 'Marco Ibáñez', avatar: null },
      ]),
    );
    expect(named).toHaveLength(2);
  });

  it('counts the organizations each is in, and one is in none', async () => {
    const list = await people(desk());
    const count = (wallet: string) =>
      list.find((person) => person.wallet === wallet)?.organizations;
    expect(count(LUCIA)).toBe(1);
    expect(count(MARCO)).toBe(1);
    expect(count(NUEVA)).toBe(0);
    expect(list.filter((person) => person.organizations > 0).length).toBeGreaterThanOrEqual(3);
  });

  it('answers the list with its total and no next page', async () => {
    const answer = await desk().citizens(HOUSE, true);
    expect(answer).toMatchObject({ ok: true, total: 6, next: null });
  });
});

describe('only the house reads it', () => {
  it('refuses anyone else in the till’s words', async () => {
    const on = desk();
    expect(await on.citizens(ME, false)).toEqual({ ok: false, problems: [NOT_HOUSE_CENSUS] });
    expect(await on.citizens(LUCIA)).toEqual({ ok: false, problems: [NOT_HOUSE_CENSUS] });
    expect(await on.citizens(HOUSE, 'yes')).toEqual({ ok: false, problems: [HOUSE_BOOLEAN] });
    expect(await on.citizens('nobody', true)).toEqual({ ok: false, problems: [BAD_WALLET] });
  });
});

describe('a search', () => {
  it('finds a piece of the wallet or of the published name, in any case', async () => {
    const on = desk();
    expect((await people(on, 'lucía')).map((person) => person.wallet)).toEqual([LUCIA]);
    expect((await people(on, 'IBÁÑ')).map((person) => person.wallet)).toEqual([MARCO]);
    expect((await people(on, '0A07')).map((person) => person.wallet)).toEqual([NUEVA]);
    expect(await people(on, 'nadie así')).toEqual([]);
    expect(await people(on, '  ')).toHaveLength(6);
    const answer = await on.citizens(HOUSE, true, 'lucía');
    expect(answer).toMatchObject({ total: 1 });
  });

  it('refuses a search that is not text, or a cursor that is not one', async () => {
    const on = desk();
    expect(await on.citizens(HOUSE, true, 7)).toMatchObject({ ok: false });
    expect(await on.citizens(HOUSE, true, 'a'.repeat(101))).toMatchObject({ ok: false });
    expect(await on.citizens(HOUSE, true, '', 'nonsense')).toMatchObject({ ok: false });
    expect(await on.citizens(HOUSE, true, '', 7)).toMatchObject({ ok: false });
  });
});

describe('pages', () => {
  it('pages 200 at a time and carries on from the cursor', async () => {
    const many: AccountsSeed = {
      ...seed,
      signIns: Array.from({ length: 203 }, (_, index) => ({
        wallet: `0x${index.toString(16).padStart(40, '0')}`,
        firstDaysAgo: 30,
        lastDaysAgo: index % 20,
      })),
    };
    const on = desk(() => NOW, many);
    const first = await on.citizens(HOUSE, true);
    if (!first.ok) throw new Error('refused');
    expect(first.people).toHaveLength(200);
    expect(first.total).toBe(203);
    expect(first.next).not.toBeNull();
    const second = await on.citizens(HOUSE, true, '', first.next);
    if (!second.ok) throw new Error('refused');
    expect(second.people).toHaveLength(3);
    expect(second.next).toBeNull();
    const all = [...first.people, ...second.people].map((person) => person.wallet);
    expect(new Set(all).size).toBe(203);
  });

  it('starts from nobody when the seed has no list', async () => {
    const { signIns: _none, ...without } = seed;
    expect(await people(desk(() => NOW, without))).toEqual([]);
  });
});

describe('a sign-in', () => {
  it('adds a newcomer first, keeps the first time and moves the last', async () => {
    let now = NOW;
    const on = desk(() => now);
    expect(await on.signedIn(ME)).toEqual({ ok: true });
    const [newest] = await people(on);
    expect(newest).toEqual({
      wallet: ME,
      firstSeenAt: NOW.toISOString(),
      lastSeenAt: NOW.toISOString(),
      // The seed's «self» is whoever asks — here the house — so ME is in none.
      organizations: 0,
      organizationIds: [],
    });
    now = new Date('2026-10-17T09:30:00.000Z');
    await on.signedIn(LUCIA);
    const [lucia] = await people(on);
    expect(lucia?.wallet).toBe(LUCIA);
    expect(lucia?.lastSeenAt).toBe(now.toISOString());
    expect(lucia?.firstSeenAt).not.toBe(now.toISOString());
  });

  it('refuses a wallet that is not the session’s shape', async () => {
    const on = desk();
    for (const bad of [ME.toUpperCase(), 'nobody', 7]) {
      expect(await on.signedIn(bad)).toEqual({ ok: false, problems: [BAD_WALLET] });
    }
  });
});

describe('adding someone of the list to an organization', () => {
  it('counts the new organization at once', async () => {
    const on = desk();
    const added = await on.setMember(HOUSE, NUMEN, NUEVA, 'member', true);
    expect(added).toMatchObject({ ok: true });
    const list = await people(on);
    expect(list.find((person) => person.wallet === NUEVA)?.organizations).toBe(1);
    // The census row names the organization, so the dialog leaves it out with no member read.
    expect(list.find((person) => person.wallet === NUEVA)?.organizationIds).toEqual([NUMEN]);
  });
});
