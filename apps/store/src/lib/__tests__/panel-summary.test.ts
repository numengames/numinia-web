import { describe, expect, it } from 'vitest';
import type { DeskLine, DeskLogLine, DeskRole, DeskRoles } from '../accounts';
import {
  chargedWorlds,
  latestOf,
  nextEncounter,
  peopleOf,
  type EncounterMap,
} from '../panel-summary';

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

describe('the latest of an organization', () => {
  const log = (seq: number, at: string): DeskLogLine => ({
    seq,
    at,
    actor: `0x${'ab'.repeat(20)}`,
    asHouse: false,
    act: 'member-added',
    subject: `0x${'cd'.repeat(20)}`,
    detail: null,
  });
  const lines: DeskLine[] = [
    { kind: 'world_day', at: '2026-10-16T00:30:00.000Z', amountCents: -164, day: '2026-10-15' },
    { kind: 'topup', at: '2026-10-14T10:00:00.000Z', amountCents: 5000, vatCents: 1050 },
    { kind: 'adjustment', at: '2026-10-13T10:00:00.000Z', amountCents: 25, reason: 'gift' },
    { kind: 'topup', at: '2026-09-01T10:00:00.000Z', amountCents: 1000, vatCents: 210 },
  ];

  it('merges the log and the top-ups, newest first, five at the most', () => {
    const latest = latestOf(
      [
        log(9, '2026-10-15T09:00:00.000Z'),
        log(8, '2026-10-13T09:00:00.000Z'),
        log(7, '2026-10-12T09:00:00.000Z'),
        log(6, '2026-10-11T09:00:00.000Z'),
      ],
      lines,
    );
    expect(latest.map((entry) => [entry.kind, entry.at])).toEqual([
      ['log', '2026-10-15T09:00:00.000Z'],
      ['topup', '2026-10-14T10:00:00.000Z'],
      ['log', '2026-10-13T09:00:00.000Z'],
      ['log', '2026-10-12T09:00:00.000Z'],
      ['log', '2026-10-11T09:00:00.000Z'],
    ]);
    expect(latest[1]).toEqual({ kind: 'topup', at: '2026-10-14T10:00:00.000Z', amountCents: 5000 });
    expect(latest[0]).toMatchObject({ kind: 'log', line: { seq: 9 } });
  });

  it('keeps to what the person may read: no log, or no statement, or neither', () => {
    expect(latestOf(null, lines).map((entry) => entry.kind)).toEqual(['topup', 'topup']);
    expect(latestOf([log(1, '2026-10-01T00:00:00.000Z')], null)).toHaveLength(1);
    expect(latestOf(null, null)).toEqual([]);
    expect(latestOf([], [], 3)).toEqual([]);
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
