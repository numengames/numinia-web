/**
 * «Crear → Un encuentro» for real (cut M): the form's pure part — which
 * communities the person runs, and how the fields become the draft.
 */

import { describe, expect, it } from 'vitest';
import type { DeskAccount } from '../accounts';
import type { Community } from '../communities';
import {
  NOTE_MAX,
  TITLE_MAX,
  WHERE_MAX,
  administered,
  draftFrom,
  localInstant,
  type EncounterFields,
} from '../crear-encuentro';

const account = (id: string, role: DeskAccount['role'], kind: DeskAccount['kind'] = 'team') =>
  ({ id, kind, name: id, role, balanceCents: 0 }) as DeskAccount;

const register = [
  { id: 'numen-games', name: 'Numen Games', team: 'acc_team_numen_games' },
  { id: 'reset', name: 'Reset', team: undefined },
  { id: 'merge', name: 'MERGE', team: undefined },
] as unknown as readonly Community[];

describe('administered', () => {
  it('lists the communities whose organization — linked or derived — the wallet runs', () => {
    const derived = new Map([
      ['reset', 'acc_t_reset'],
      ['merge', 'acc_t_merge'],
    ]);
    const mine = administered(
      [
        account('acc_personal', 'owner', 'personal'),
        account('acc_team_numen_games', 'admin'),
        account('acc_t_reset', 'owner'),
        account('acc_t_merge', 'member'),
      ],
      register,
      derived,
    );
    expect(mine).toEqual([
      { id: 'numen-games', name: 'Numen Games', accountId: 'acc_team_numen_games' },
      { id: 'reset', name: 'Reset', accountId: 'acc_t_reset' },
    ]);
    expect(administered([], register, derived)).toEqual([]);
    expect(administered([account('acc_t_merge', 'member')], register, new Map())).toEqual([]);
  });
});

const FIELDS: EncounterFields = {
  community: 'numen-games',
  title: ' Taller de Hyperfy ',
  day: '2026-11-03',
  time: '',
  endDay: '',
  endTime: '',
  how: 'in-person',
  world: '',
  where: ' La Nave ',
  note: '',
};

/** A fake zone two hours ahead of UTC, as Madrid is in summer. */
const madrid = (day: string, time: string): string =>
  new Date(Date.parse(`${day}T${time}:00.000Z`) - 2 * 3_600_000).toISOString();

describe('draftFrom', () => {
  it('makes a whole-day draft, trimmed, the end day optional', () => {
    expect(draftFrom(FIELDS, madrid)).toEqual({
      ok: true,
      draft: {
        communityId: 'numen-games',
        title: 'Taller de Hyperfy',
        start: '2026-11-03',
        end: null,
        mode: 'in-person',
        where: 'La Nave',
        note: null,
        worldId: null,
      },
    });
    const days = draftFrom({ ...FIELDS, endDay: '2026-11-05', note: ' Trae portátil ' }, madrid);
    expect(days.ok && days.draft).toMatchObject({ end: '2026-11-05', note: 'Trae portátil' });
  });

  it('makes a timed draft in the browser’s zone: the end on the same day, on the end day, or the end day’s same time', () => {
    const timed = draftFrom({ ...FIELDS, time: '18:00', endTime: '20:00' }, madrid);
    expect(timed.ok && timed.draft).toMatchObject({
      start: '2026-11-03T16:00:00.000Z',
      end: '2026-11-03T18:00:00.000Z',
    });
    const open = draftFrom({ ...FIELDS, time: '18:00' }, madrid);
    expect(open.ok && open.draft).toMatchObject({ start: '2026-11-03T16:00:00.000Z', end: null });
    const spanning = draftFrom(
      { ...FIELDS, time: '18:00', endDay: '2026-11-04', endTime: '10:00' },
      madrid,
    );
    expect(spanning.ok && spanning.draft.end).toBe('2026-11-04T08:00:00.000Z');
    const sameTime = draftFrom({ ...FIELDS, time: '18:00', endDay: '2026-11-04' }, madrid);
    expect(sameTime.ok && sameTime.draft.end).toBe('2026-11-04T16:00:00.000Z');
  });

  it('says online for «en línea» and online in the world for «en su mundo»', () => {
    const online = draftFrom({ ...FIELDS, how: 'online' }, madrid);
    expect(online.ok && online.draft).toMatchObject({ mode: 'online', worldId: null });
    const world = draftFrom({ ...FIELDS, how: 'world', world: 'sede-numen-games' }, madrid);
    expect(world.ok && world.draft).toMatchObject({ mode: 'online', worldId: 'sede-numen-games' });
  });

  it('names the field that is wrong', () => {
    const wrong: readonly (readonly [Partial<EncounterFields>, string])[] = [
      [{ community: '' }, 'community'],
      [{ title: '  ' }, 'title'],
      [{ title: 'a'.repeat(TITLE_MAX + 1) }, 'title'],
      [{ day: '' }, 'day'],
      [{ day: '3 de noviembre' }, 'day'],
      [{ day: '2026-13-40' }, 'day'],
      [{ time: '6pm' }, 'day'],
      [{ endDay: '2026-11-02' }, 'end'],
      [{ endDay: 'mañana' }, 'end'],
      [{ endTime: 'tarde' }, 'end'],
      [{ time: '18:00', endTime: '17:00' }, 'end'],
      [{ how: 'presencial' }, 'how'],
      [{ how: 'world' }, 'world'],
      [{ where: '' }, 'where'],
      [{ where: 'a'.repeat(WHERE_MAX + 1) }, 'where'],
      [{ note: 'a'.repeat(NOTE_MAX + 1) }, 'note'],
    ];
    for (const [change, problem] of wrong) {
      expect(draftFrom({ ...FIELDS, ...change }, madrid), JSON.stringify(change)).toEqual({
        ok: false,
        problem,
      });
    }
  });

  it('reads a local day and time through the browser’s Date', () => {
    const instant = localInstant('2026-11-03', '18:00');
    expect(instant).toBe(new Date('2026-11-03T18:00').toISOString());
  });
});
