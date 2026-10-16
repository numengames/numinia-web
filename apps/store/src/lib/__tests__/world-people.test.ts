import { describe, expect, it } from 'vitest';
import type { DeskMemberDetail, DeskRole, DeskRoles } from '../accounts';
import { PEOPLE_SHOWN, enterCount, enterersOf, personLabel, shownPeople } from '../world-people';

const role = (id: string, position: number, permissions: DeskRole['permissions']): DeskRole => ({
  id,
  name: id,
  color: null,
  position,
  hoist: false,
  permissions,
  members: 0,
  mayEdit: false,
});
const person = (wallet: string, patch: Partial<DeskMemberDetail> = {}): DeskMemberDetail => ({
  wallet,
  owner: false,
  addedAt: '2026-10-01T00:00:00.000Z',
  roleIds: [],
  assignable: [],
  ...patch,
});
const view = (roles: DeskRole[], members: DeskMemberDetail[]): DeskRoles => ({
  ok: true,
  accountId: 'acc_t_1',
  as: 'member',
  roles,
  members,
});
const w = (n: number): string => `0x${String(n).repeat(40).slice(0, 40)}`;

describe('who may enter a world of the community', () => {
  const roles = [
    role('admin', 3, ['administrator']),
    role('builder', 2, ['enter-worlds', 'build-in-worlds']),
    role('finance', 1, ['manage-balance']),
    role('base', 0, ['view-balance']),
  ];

  it('are the owners and whoever holds a role that carries «enter-worlds» or «administrator»', () => {
    const owner = person(w(1), { owner: true });
    const admin = person(w(2), { roleIds: ['admin'] });
    const builder = person(w(3), { roleIds: ['builder'] });
    const money = person(w(4), { roleIds: ['finance'] });
    const plain = person(w(5));
    const found = enterersOf(view(roles, [owner, admin, builder, money, plain]));
    expect(found.everyone).toBe(false);
    expect(found.roles.map((entry) => entry.id)).toEqual(['admin', 'builder']);
    expect(found.people).toEqual([owner, admin, builder]);
  });

  it('are everyone when the base role carries it, whatever else is held', () => {
    const open = [...roles.slice(0, 3), role('base', 0, ['enter-worlds'])];
    const found = enterersOf(view(open, [person(w(1)), person(w(2))]));
    expect(found.everyone).toBe(true);
    expect(found.people).toHaveLength(2);
    expect(found.roles.map((entry) => entry.id)).toEqual(['admin', 'builder']);
    const alpha = enterersOf(view([role('base', 0, ['administrator'])], [person(w(1))]));
    expect(alpha.everyone).toBe(true);
  });

  it('are nobody but the owners when no role carries it', () => {
    const none = enterersOf(
      view([role('base', 0, ['top-up'])], [person(w(1), { owner: true }), person(w(2))]),
    );
    expect(none.everyone).toBe(false);
    expect(none.roles).toEqual([]);
    expect(none.people.map((member) => member.wallet)).toEqual([w(1)]);
  });
});

describe('naming and counting them', () => {
  it('names a person as they published themselves, else a short wallet', () => {
    expect(personLabel(person(w(1), { name: 'Lucía' }))).toBe('Lucía');
    expect(personLabel(person(w(1)))).toBe(`${w(1).slice(0, 6)}…${w(1).slice(-4)}`);
    expect(personLabel(person(w(1), { name: null }))).toBe(`${w(1).slice(0, 6)}…${w(1).slice(-4)}`);
  });

  it('says how many, one apart', () => {
    const words = { one: 'Una persona', other: '{n} personas' };
    expect(enterCount(1, words)).toBe('Una persona');
    expect(enterCount(0, words)).toBe('0 personas');
    expect(enterCount(12, words)).toBe('12 personas');
  });

  it('lists eight and counts the rest', () => {
    const many = Array.from({ length: PEOPLE_SHOWN + 3 }, (_, i) => person(w(i % 9)));
    expect(shownPeople(many)).toEqual({ list: many.slice(0, PEOPLE_SHOWN), rest: 3 });
    expect(shownPeople(many.slice(0, 2))).toEqual({ list: many.slice(0, 2), rest: 0 });
  });
});
