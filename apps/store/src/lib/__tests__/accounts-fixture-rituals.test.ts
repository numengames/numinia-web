/**
 * «Crear → Un encuentro» for real (cut M) in the fixture desk: whoever runs
 * a community — the seed's «admin» of its team, or the house — publishes an
 * encounter, the lists show it, the same people cancel it once. A fake of
 * the till (apps/till), pinned here the way the till pins its own.
 */

import { describe, expect, it } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, DeskLogAnswer, DeskRitualAnswer } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { communityAccountId } from '../community-teams';
import { RITUAL_PROBLEMS } from '../rituals-till';

const NOW = new Date('2026-10-17T09:30:00.000Z');
const HOUSE = `0x${'99'.repeat(20)}`;
const PABLO = `0x${'0a'.repeat(20)}`;
const MARIA = `0x${'0b'.repeat(20)}`;
const seed = deskSeed as unknown as AccountsSeed;

type Loose = {
  [K in keyof AccountDesk]: (...args: unknown[]) => ReturnType<AccountDesk[K]>;
};
const desk = (): Loose => createAccountsFixtureDesk(seed, () => NOW) as unknown as Loose;
const ritualOf = (answer: DeskRitualAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.ritual;
};
const acts = (answer: DeskLogAnswer): string[] => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.lines
    .map((line) => line.act)
    .filter((act) => act !== 'house-read')
    .reverse();
};

const DRAFT = {
  communityId: 'numen-games',
  title: 'Taller de Hyperfy',
  start: '2026-11-03',
  end: null,
  mode: 'in-person',
  where: 'La Nave, Madrid',
  note: null,
  worldId: null,
};

describe('publishing', () => {
  it('refuses what it cannot read, a community nobody runs, and a plain member', async () => {
    const d = desk();
    expect(await d.createRitual('pablo', { title: 1 })).toEqual({
      ok: false,
      problems: ['wallet must be a lowercase 0x address', RITUAL_PROBLEMS.draft],
    });
    expect(await d.createRitual(PABLO, { ...DRAFT, communityId: 'merge' })).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.noOrganization],
    });
    // The seed's third member of Numen Games is a plain member: MARIA stands in for them through the house's door.
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'MERGE');
    await d.setMember(HOUSE, await communityAccountId('merge'), MARIA, 'member', true);
    expect(await d.createRitual(MARIA, { ...DRAFT, communityId: 'merge' })).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.notAllowed],
    });
  });

  it('publishes for the seed’s admin of the team, whole and timed too, and logs it', async () => {
    const d = desk();
    const ritual = ritualOf(await d.createRitual(PABLO, { ...DRAFT, note: 'Trae portátil' }));
    expect(ritual).toEqual({
      id: 'rit_0000000000000001',
      communityId: 'numen-games',
      title: 'Taller de Hyperfy',
      start: '2026-11-03',
      end: '2026-11-03',
      allDay: true,
      mode: 'in-person',
      where: 'La Nave, Madrid',
      note: 'Trae portátil',
      worldId: null,
      createdBy: PABLO,
      createdAt: NOW.toISOString(),
      cancelledAt: null,
    });
    const timed = ritualOf(
      await d.createRitual(PABLO, {
        ...DRAFT,
        start: '2026-11-05T18:00:00.000Z',
        end: '2026-11-05T20:00:00.000Z',
        mode: 'online',
        worldId: 'sede-numen-games',
      }),
    );
    expect(timed).toMatchObject({
      id: 'rit_0000000000000002',
      allDay: false,
      end: '2026-11-05T20:00:00.000Z',
      worldId: 'sede-numen-games',
    });
    expect(acts(await d.log(PABLO, 'acc_t_2e2dd18c880ba974da1512dc7cde2431')).slice(-2)).toEqual([
      'ritual-created',
      'ritual-created',
    ]);
    const found = await d.ritual(ritual.id);
    expect(found).toEqual({ ok: true, ritual });
    expect(await d.ritual('trg26')).toEqual({ ok: false, problems: [RITUAL_PROBLEMS.ritualId] });
    expect(await d.ritual('rit_00000000000000ff')).toEqual({ ok: true, ritual: null });
  });

  it('publishes for the house in a community it opened', async () => {
    const d = desk();
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'MERGE');
    const ritual = ritualOf(await d.createRitual(HOUSE, { ...DRAFT, communityId: 'merge' }, true));
    expect(ritual.communityId).toBe('merge');
  });
});

describe('listing and cancelling', () => {
  it('lists the not cancelled ones by community or all, upcoming or every one, soonest first', async () => {
    const d = desk();
    const late = ritualOf(
      await d.createRitual(PABLO, { ...DRAFT, start: '2027-01-10', end: null }),
    );
    const past = ritualOf(
      await d.createRitual(PABLO, { ...DRAFT, start: '2020-01-01', end: null }),
    );
    const all = await d.ritualsOf(null, false);
    expect(all.ok && all.rituals.map((r) => r.id)).toEqual([past.id, late.id]);
    const coming = await d.ritualsOf(['numen-games'], true);
    expect(coming.ok && coming.rituals.map((r) => r.id)).toEqual([late.id]);
    const other = await d.ritualsOf(['merge'], false);
    expect(other).toEqual({ ok: true, rituals: [] });
  });

  it('cancels once for its runner or the house, keeps the row, logs it', async () => {
    const d = desk();
    const ritual = ritualOf(await d.createRitual(PABLO, DRAFT));
    // In the seed every wallet is Numen Games' admin: MARIA is a plain member of MERGE alone.
    await d.ensureCommunityTeam(HOUSE, true, 'merge', 'MERGE');
    await d.setMember(HOUSE, await communityAccountId('merge'), MARIA, 'member', true);
    const merge = ritualOf(await d.createRitual(HOUSE, { ...DRAFT, communityId: 'merge' }, true));
    expect(await d.cancelRitual('x', 'nope')).toEqual({
      ok: false,
      problems: ['wallet must be a lowercase 0x address', RITUAL_PROBLEMS.ritualId],
    });
    expect(await d.cancelRitual(PABLO, 'rit_00000000000000ff')).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.noSuchRitual],
    });
    expect(await d.cancelRitual(MARIA, merge.id)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.notAllowed],
    });
    const cancelled = await d.cancelRitual(PABLO, ritual.id);
    expect(cancelled.ok && cancelled.ritual.cancelledAt).toBe(NOW.toISOString());
    const left = await d.ritualsOf(null, false);
    expect(left.ok && left.rituals.map((r) => r.id)).toEqual([merge.id]);
    const byHouse = await d.cancelRitual(HOUSE, merge.id, true);
    expect(byHouse.ok && byHouse.ritual.cancelledAt).toBe(NOW.toISOString());
    expect(await d.ritualsOf(null, false)).toEqual({ ok: true, rituals: [] });
    expect(await d.cancelRitual(PABLO, ritual.id)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.cancelled],
    });
    expect(acts(await d.log(PABLO, 'acc_t_2e2dd18c880ba974da1512dc7cde2431')).slice(-2)).toEqual([
      'ritual-created',
      'ritual-cancelled',
    ]);
  });
});
