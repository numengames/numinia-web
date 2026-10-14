import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import {
  ADMIN_ONLY,
  LAST_ADMIN,
  NOT_MEMBER,
  type AccountDesk,
  type DeskStatement,
} from '../accounts';
import { createAccountsFixtureDesk, lotsOf, spendOf, type AccountsSeed } from '../accounts-fixture';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const OTHER = `0x${'cd'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;
/** The desk as the binding sees it: anything may arrive, so the tests send anything. */
type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const loose = (d: AccountDesk): Loose => d as unknown as Loose;
const desk = (): Loose => loose(createAccountsFixtureDesk(seed, () => NOW));

describe('the fixture desk', () => {
  it('gives every wallet its own copy of the seed: its account and Numen Games', async () => {
    const d = desk();
    const overview = await d.overview(ME);
    expect(
      'accounts' in overview && overview.accounts.map((a) => [a.kind, a.name, a.role]),
    ).toEqual([
      ['personal', null, 'owner'],
      ['team', 'Numen Games', 'admin'],
    ]);
    expect('accounts' in overview && overview.accounts[0]?.balanceCents).toBe(420);
    expect(await d.overview('nope')).toMatchObject({ ok: false });
    expect(await d.overview(7)).toMatchObject({ ok: false });
  });

  it('answers statements per range, with members for an organization', async () => {
    const d = desk();
    const personal = (await d.statement(ME, 'acc_personal', '30d')) as DeskStatement;
    expect(personal.balanceCents).toBe(420);
    expect(personal.lowBalance).toBe(true);
    expect(personal.members).toBeUndefined();
    expect((personal.lines[0]?.at ?? '') >= (personal.lines.at(-1)?.at ?? '')).toBe(true);
    const team = (await d.statement(ME, seed.teams[0]?.id, '12m')) as DeskStatement;
    expect(team.members?.some((m) => m.wallet === ME)).toBe(true);
    expect(await d.statement(ME, 'acc_personal', '1y')).toMatchObject({ ok: false });
    expect(await d.statement(ME, 'acc_missing', '7d')).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    expect(await d.statement(null, 'acc_personal', '7d')).toMatchObject({ ok: false });
  });

  it('creates, renames and manages organizations like the till', async () => {
    const d = desk();
    const made = await d.createTeam(ME, '  Arcasiles ');
    if (!made.ok) throw new Error('no team');
    expect(made.account).toMatchObject({ name: 'Arcasiles', role: 'admin', balanceCents: 0 });
    expect(await d.createTeam(ME, '')).toMatchObject({ ok: false });
    expect(await d.createTeam(1, 'X')).toMatchObject({ ok: false });
    const id = made.account.id;
    expect(await d.renameTeam(ME, id, 'Arca')).toMatchObject({
      ok: true,
      account: { name: 'Arca' },
    });
    expect(await d.renameTeam(ME, id, ' ')).toMatchObject({ ok: false });
    expect(await d.renameTeam(ME, 'acc_personal', 'X')).toEqual({
      ok: false,
      problems: [ADMIN_ONLY],
    });
    expect(await d.members(ME, id)).toMatchObject({ ok: true, members: [{ wallet: ME }] });
    expect(await d.setMember(ME, id, OTHER, 'member')).toMatchObject({ ok: true });
    expect(await d.setMember(ME, id, 'x', 'member')).toMatchObject({ ok: false });
    expect(await d.setMember(ME, id, OTHER, 'owner')).toMatchObject({ ok: false });
    expect(await d.setMember(ME, id, ME, 'member')).toEqual({ ok: false, problems: [LAST_ADMIN] });
    expect(await d.removeMember(ME, id, ME)).toEqual({ ok: false, problems: [LAST_ADMIN] });
    expect(await d.removeMember(ME, id, `0x${'ef'.repeat(20)}`)).toMatchObject({ ok: false });
    await d.setMember(ME, id, OTHER, 'admin');
    const removed = await d.removeMember(ME, id, OTHER);
    expect(removed.ok && removed.members?.map((m) => m.wallet)).toEqual([ME]);
    expect(await d.removeMember(ME, 'acc_personal', OTHER)).toEqual({
      ok: false,
      problems: [ADMIN_ONLY],
    });
    expect(await d.members(ME, 'acc_personal')).toEqual({ ok: false, problems: [ADMIN_ONLY] });
  });

  it('tops up through the site’s own way back, credited once', async () => {
    const d = desk();
    const back = 'http://localhost:4321/es/saldo/vuelta/';
    const started = await d.startTopup(ME, 'acc_personal', '10', back);
    expect(started).toEqual({ ok: true, url: `${back}?session_id=cs_test_fixture_1` });
    expect(await d.startTopup(ME, 'acc_personal', '20', back)).toMatchObject({ ok: false });
    expect(await d.startTopup(ME, 'acc_personal', '10', 'https://evil.example/')).toMatchObject({
      ok: false,
    });
    expect(await d.startTopup(ME, 'acc_missing', '10', back)).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    const paid = await d.confirmTopup(ME, 'cs_test_fixture_1');
    expect(paid).toEqual({
      ok: true,
      state: 'paid',
      accountId: 'acc_personal',
      balanceCents: 1420,
    });
    expect(await d.confirmTopup(ME, 'cs_test_fixture_1')).toEqual(paid);
    expect(await d.confirmTopup(OTHER, 'cs_test_fixture_1')).toMatchObject({ ok: false });
    expect(await d.confirmTopup(ME, 'bad')).toMatchObject({ ok: false });
    expect(await d.confirmTopup(1, 'cs_test_fixture_1')).toMatchObject({ ok: false });
  });

  it('refuses what is not shaped as asked, and sorts organizations by name', async () => {
    const d = desk();
    expect(await d.createTeam(ME, 7)).toMatchObject({ ok: false });
    await d.createTeam(ME, 'Arcasiles');
    const overview = await d.overview(ME);
    expect('accounts' in overview && overview.accounts.map((a) => a.name)).toEqual([
      null,
      'Arcasiles',
      'Numen Games',
    ]);
    const team = seed.teams[0]?.id;
    expect(await d.renameTeam(ME, team, 7)).toMatchObject({ ok: false });
    expect(await d.renameTeam(ME, 'acc_missing', 'X')).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    expect(await d.setMember(ME, 'acc_missing', OTHER, 'member')).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    expect(await d.setMember(ME, team, 7, 'member')).toMatchObject({ ok: false });
    expect(await d.removeMember(ME, 'acc_missing', OTHER)).toEqual({
      ok: false,
      problems: [NOT_MEMBER],
    });
    expect(await d.removeMember(ME, team, 7)).toMatchObject({ ok: false });
  });

  it('keeps a seed’s reasons, and hides an organization the wallet is not in', async () => {
    const d = loose(
      createAccountsFixtureDesk(
        {
          personal: {
            id: 'acc_p',
            lines: [{ kind: 'adjustment', daysAgo: 1, amountCents: 25, reason: 'a gift' }],
          },
          teams: [
            {
              id: 'acc_t',
              name: 'Elsewhere',
              createdDaysAgo: 3,
              members: [{ wallet: OTHER, role: 'admin', addedDaysAgo: 3 }],
              lines: [],
            },
          ],
        },
        () => NOW,
      ),
    );
    const overview = await d.overview(ME);
    expect('accounts' in overview && overview.accounts.map((a) => a.id)).toEqual(['acc_p']);
    const statement = (await d.statement(ME, 'acc_p', '7d')) as DeskStatement;
    expect(statement.lines[0]?.reason).toBe('a gift');
    expect(await d.statement(ME, 'acc_t', '7d')).toEqual({ ok: false, problems: [NOT_MEMBER] });
  });

  it('uses the real clock when none is given', async () => {
    const d = createAccountsFixtureDesk(seed);
    expect(await d.overview(ME)).toHaveProperty('accounts');
  });
});

describe('lots and spend', () => {
  it('spends top-ups oldest first', () => {
    const lots = lotsOf([
      { kind: 'topup', at: '2026-10-01T10:00:00.000Z', amountCents: 1000 },
      { kind: 'world_day', at: '2026-10-02T00:30:00.000Z', amountCents: -1200, day: '2026-10-01' },
      { kind: 'topup', at: '2026-10-03T10:00:00.000Z', amountCents: 500 },
    ]);
    expect(lots.map((lot) => lot.remainderCents)).toEqual([0, 300]);
  });

  it('counts worlds’ days per day or month inside the range only', () => {
    const lines = [
      { kind: 'world_day' as const, at: 'x', amountCents: -60, day: '2026-10-13' },
      { kind: 'world_day' as const, at: 'x', amountCents: -60, day: '2026-10-13' },
      { kind: 'world_day' as const, at: 'x', amountCents: -60, day: '2025-01-01' },
      { kind: 'world_day' as const, at: 'x', amountCents: -60 },
      { kind: 'topup' as const, at: 'x', amountCents: 1000 },
    ];
    expect(spendOf(lines, '7d', NOW)).toEqual({
      spend: [{ bucket: '2026-10-13', cents: 120 }],
      total: 120,
    });
    expect(spendOf(lines, '12m', NOW).spend).toEqual([{ bucket: '2026-10', cents: 120 }]);
    expect(spendOf(lines, '30d', NOW).total).toBe(120);
  });
});
