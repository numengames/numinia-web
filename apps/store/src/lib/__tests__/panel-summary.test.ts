import { describe, expect, it } from 'vitest';
import type { DeskRole, DeskRoles } from '../accounts';
import { chargedWorlds, nextEncounter, peopleOf, type EncounterMap } from '../panel-summary';

const NOW = new Date('2026-10-16T12:00:00.000Z');

describe('the next encounter of the organization’s community', () => {
  const map: EncounterMap = {
    acc_team_numen_games: [
      {
        title: 'Aniversario',
        href: '/es/rituals/a/',
        startsAt: '2026-10-10T00:00:00.000Z',
        endsAt: '2026-10-11T00:00:00.000Z',
      },
      {
        title: 'Encuentro de otoño',
        href: '/es/rituals/b/',
        startsAt: '2026-10-16T09:00:00.000Z',
        endsAt: '2026-10-17T00:00:00.000Z',
      },
      {
        title: 'Día del dominio público',
        href: '/es/rituals/c/',
        startsAt: '2027-01-01T00:00:00.000Z',
        endsAt: '2027-01-02T00:00:00.000Z',
      },
    ],
  };

  it('skips the ones already over, and says when the next one starts', () => {
    expect(nextEncounter(map, 'acc_team_numen_games', NOW)).toEqual({
      encounter: map['acc_team_numen_games']?.[1],
      when: 'now',
    });
    expect(
      nextEncounter(map, 'acc_team_numen_games', new Date('2026-10-17T00:00:00.000Z')),
    ).toEqual({
      encounter: map['acc_team_numen_games']?.[2],
      when: 'soon',
      days: 76,
    });
    // Starting later today is «in 1 day» at the most, never «in 0 days».
    expect(
      nextEncounter(map, 'acc_team_numen_games', new Date('2026-10-16T08:00:00.000Z')),
    ).toMatchObject({ when: 'soon', days: 1 });
  });

  it('is nothing when every one is over, or the organization has no community', () => {
    expect(
      nextEncounter(map, 'acc_team_numen_games', new Date('2027-02-01T00:00:00.000Z')),
    ).toBeNull();
    expect(nextEncounter(map, 'acc_team_la_tarugo', NOW)).toBeNull();
  });
});

describe('the worlds with a charge', () => {
  it('counts the worlds whose days cost something in the range, or nothing when the till does not say', () => {
    expect(
      chargedWorlds([
        { worldId: 'a', size: '4g', daysRunning: 3, cents: 285 },
        { worldId: 'b', size: '1g', daysRunning: 0, cents: 3 },
        { worldId: 'c', size: '1g', daysRunning: 0, cents: 0 },
      ]),
    ).toBe(2);
    expect(chargedWorlds([])).toBe(0);
    expect(chargedWorlds(undefined)).toBeNull();
  });
});

describe('the people of an organization', () => {
  const role = (id: string, position: number, hoist: boolean, members: number): DeskRole => ({
    id,
    name: id,
    color: hoist ? '#2f9e8f' : null,
    position,
    hoist,
    permissions: [],
    members,
    mayEdit: false,
  });
  const view: DeskRoles = {
    ok: true,
    accountId: 'acc_t',
    as: 'owner',
    roles: [
      role('Administración', 3, true, 2),
      role('Finanzas', 2, true, 0),
      role('Miembro', 1, false, 1),
      role('@everyone', 0, false, 3),
    ],
    members: [
      { wallet: 'a', owner: true, addedAt: 'x', roleIds: [], assignable: [] },
      { wallet: 'b', owner: false, addedAt: 'x', roleIds: [], assignable: [] },
      { wallet: 'c', owner: false, addedAt: 'x', roleIds: [], assignable: [] },
    ],
  };

  it('counts the members and lists the roles shown apart, top down, with their holders', () => {
    expect(peopleOf(view)).toEqual({
      members: 3,
      hoisted: [
        { id: 'Administración', name: 'Administración', color: '#2f9e8f', members: 2 },
        { id: 'Finanzas', name: 'Finanzas', color: '#2f9e8f', members: 0 },
      ],
    });
  });
});
