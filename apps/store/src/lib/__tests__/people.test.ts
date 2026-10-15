import { describe, expect, it } from 'vitest';
import type { DeskRoles } from '../accounts';
import { peopleOf } from '../people';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ANA = wallet('56');
const FER = wallet('12');
const LUIS = wallet('34');

const ORACLE = 'role_0000000000000001';
const TEAM = 'role_0000000000000002';
const GUIDE = 'role_0000000000000003';
const BASE = 'role_0000000000000004';

const role = (id: string, name: string, position: number, extra: object = {}) => ({
  id,
  name,
  color: null,
  position,
  hoist: false,
  permissions: [],
  members: 0,
  mayEdit: false,
  ...extra,
});

const member = (who: string, roleIds: string[] = [], owner = false) => ({
  wallet: who,
  owner,
  addedAt: '2026-09-01T00:00:00.000Z',
  roleIds,
  assignable: [],
});

/** Top down, the base role last, as the till answers `roles`. */
function organization(members: DeskRoles['members']): DeskRoles {
  return {
    ok: true,
    accountId: 'acc_t_1',
    as: 'member',
    roles: [
      role(ORACLE, 'Oráculos', 4, { hoist: true, color: '#7c3aed' }),
      role(TEAM, 'Equipo', 3, { hoist: true }),
      role(GUIDE, 'Guías', 2, { color: '#14b8a6' }),
      role(BASE, '@todos', 0),
    ],
    members,
  };
}

describe('the list of people (STD-053 PRS-004, design §5.4)', () => {
  it('puts each person in the group of their highest role shown apart, in the order of the roles', () => {
    const view = peopleOf(
      organization([
        member(PABLO, [], true),
        member(MARIA, [TEAM, ORACLE]),
        member(ANA, [TEAM]),
        member(FER, [GUIDE]),
        member(LUIS),
      ]),
      FER,
    );
    expect(view.members).toBe(5);
    expect(view.groups.map((group) => [group.id, group.name, group.people.length])).toEqual([
      [ORACLE, 'Oráculos', 1],
      [TEAM, 'Equipo', 1],
      ['rest', '', 3],
    ]);
    expect(view.groups[0]?.people.map((person) => person.short)).toEqual(['0xcdcd…cdcd']);
    expect(view.groups[1]?.people.map((person) => person.short)).toEqual(['0x5656…5656']);
  });

  it('keeps the till’s order inside a group: owners first, then by arrival', () => {
    const view = peopleOf(organization([member(PABLO, [], true), member(FER), member(LUIS)]), FER);
    const rest = view.groups.at(-1);
    expect(rest?.people.map((person) => person.short)).toEqual([
      '0xabab…abab',
      '0x1212…1212',
      '0x3434…3434',
    ]);
  });

  it('marks owners with a crown and the reader as «you», and never sends a whole wallet', () => {
    const view = peopleOf(organization([member(PABLO, [], true), member(FER)]), FER);
    const [first, second] = view.groups.at(-1)?.people ?? [];
    expect([first?.owner, first?.you, second?.owner, second?.you]).toEqual([
      true,
      false,
      false,
      true,
    ]);
    expect(JSON.stringify(view)).not.toContain(PABLO);
    expect(JSON.stringify(view)).not.toContain(FER);
  });

  it('colours a person by their highest role with a colour, shown apart or not', () => {
    const view = peopleOf(
      organization([member(MARIA, [ORACLE, GUIDE]), member(FER, [GUIDE]), member(LUIS, [TEAM])]),
      LUIS,
    );
    const colours = view.groups.flatMap((group) => group.people.map((person) => person.color));
    expect(colours).toEqual(['#7c3aed', null, '#14b8a6']);
  });

  it('gives each group the colour of its role and leaves out groups nobody is in', () => {
    const view = peopleOf(organization([member(MARIA, [ORACLE])]), MARIA);
    expect(view.groups.map((group) => [group.id, group.color])).toEqual([[ORACLE, '#7c3aed']]);
  });

  it('draws no group at all for an organization with nobody in it', () => {
    expect(peopleOf(organization([]), PABLO)).toEqual({ members: 0, groups: [] });
  });

  it('ignores a role id the organization no longer has', () => {
    const view = peopleOf(organization([member(MARIA, ['role_00000000000000ff'])]), MARIA);
    expect(view.groups.map((group) => group.id)).toEqual(['rest']);
  });
});
