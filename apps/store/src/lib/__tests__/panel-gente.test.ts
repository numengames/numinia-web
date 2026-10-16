/**
 * «Gente»: the groups the data supports — Oracles, one group per role of the
 * organization (its own names, its own order), the rest — and each row's
 * avatar, role and rank. No presence anywhere.
 */

import { describe, expect, it } from 'vitest';
import type { Rank } from '@numinia/domain';
import type { DeskMemberDetail, DeskRole, DeskRoles } from '../accounts';
import { groupsOf, initialOf } from '../panel-gente';

const wallet = (n: number): string => `0x${n.toString(16).padStart(2, '0').repeat(20)}`;

const role = (
  id: string,
  name: string,
  position: number,
  color: string | null = null,
): DeskRole => ({
  id,
  name,
  color,
  position,
  hoist: false,
  permissions: [],
  members: 0,
  mayEdit: false,
});

const member = (
  n: number,
  roleIds: string[] = [],
  extra: Partial<DeskMemberDetail> = {},
): DeskMemberDetail => ({
  wallet: wallet(n),
  owner: false,
  addedAt: '2026-09-01T10:00:00.000Z',
  roleIds,
  assignable: [],
  ...extra,
});

const ROLES = [
  role('team', 'Equipo', 3, '#3d8b5f'),
  role('money', 'Finanzas', 2),
  role('base', '@todos', 0),
];

const view = (members: DeskMemberDetail[]): DeskRoles => ({
  ok: true,
  accountId: 'acc_t_games',
  as: 'member',
  roles: ROLES,
  members,
});

describe('the groups of the people', () => {
  it("puts the Oracles first, then a group per role in the organization's order, then the rest", () => {
    const ranks: Record<string, Rank | null> = {
      [wallet(1)]: 'oracle',
      [wallet(2)]: 'citizen',
      [wallet(3)]: 'nomad',
    };
    const groups = groupsOf(
      view([member(1, ['team']), member(2, ['money', 'team']), member(3, ['money']), member(4)]),
      ranks,
      null,
    );
    expect(groups.map((group) => [group.id, group.kind, group.name])).toEqual([
      ['oracles', 'oracles', null],
      ['role:team', 'role', 'Equipo'],
      ['role:money', 'role', 'Finanzas'],
      ['rest', 'rest', null],
    ]);
    expect(groups[1]?.color).toBe('#3d8b5f');
    expect(groups[0]?.rows.map((row) => row.wallet)).toEqual([wallet(1)]);
  });

  it('puts a person in one group only: the highest role they hold', () => {
    const groups = groupsOf(view([member(2, ['money', 'team'])]), {}, null);
    expect(groups.map((group) => group.id)).toEqual(['role:team']);
    expect(groups[0]?.rows[0]?.role).toEqual({ name: 'Equipo', color: '#3d8b5f' });
  });

  it('does not draw an empty group, nor the AI agents the data does not hold', () => {
    const groups = groupsOf(view([member(4)]), {}, null);
    expect(groups.map((group) => group.id)).toEqual(['rest']);
    expect(groups[0]?.rows[0]?.role).toEqual({ name: '@todos', color: null });
    expect(groupsOf(view([]), {}, null)).toEqual([]);
  });

  it('says the rank where it is known and leaves it null where nobody could read it', () => {
    const [group] = groupsOf(view([member(4), member(5)]), { [wallet(4)]: 'pilgrim' }, null);
    expect(group?.rows.map((row) => row.rank)).toEqual(['pilgrim', null]);
    const [without] = groupsOf(view([member(4)]), null, null);
    expect(without?.rows[0]?.rank).toBeNull();
  });

  it("matches ranks whatever the wallet's case, and marks the viewer", () => {
    const upper = member(4, [], { wallet: `0x${'AB'.repeat(20)}` });
    const [group] = groupsOf(
      view([upper]),
      { [`0x${'ab'.repeat(20)}`]: 'citizen' },
      `0x${'ab'.repeat(20)}`,
    );
    expect(group?.rows[0]?.rank).toBe('citizen');
    expect(group?.rows[0]?.you).toBe(true);
    expect(groupsOf(view([upper]), null, null)[0]?.rows[0]?.you).toBe(false);
  });

  it("keeps the owners at the top of their group and the till's order otherwise", () => {
    const [group] = groupsOf(
      view([member(4), member(5, [], { owner: true }), member(6)]),
      null,
      null,
    );
    expect(group?.rows.map((row) => row.wallet)).toEqual([wallet(5), wallet(4), wallet(6)]);
    expect(group?.rows[0]?.owner).toBe(true);
  });

  it('draws the avatar the person chose, the initial of the name, or of the wallet', () => {
    const [group] = groupsOf(
      view([
        member(4, [], { name: 'ana', face: '/thumbs/1x/robot.webp' }),
        member(5),
        member(6, [], { name: 'élodie' }),
      ]),
      null,
      null,
    );
    const [ana, anon, elodie] = group?.rows ?? [];
    expect(ana).toMatchObject({ name: 'ana', face: '/thumbs/1x/robot.webp', initial: 'A' });
    expect(anon).toMatchObject({ name: null, face: null, initial: '0', short: '0x0505…0505' });
    expect(elodie?.initial).toBe('É');
  });

  it('copes with an organization that sends no base role', () => {
    const odd: DeskRoles = { ...view([member(4)]), roles: [role('team', 'Equipo', 3)] };
    expect(groupsOf(odd, null, null)[0]?.rows[0]?.role).toEqual({ name: '', color: null });
  });
});

describe('the initial', () => {
  it('is the first letter of the name, else of the wallet after 0x, in capitals', () => {
    expect(initialOf('lucía', wallet(1))).toBe('L');
    expect(initialOf(null, '0xabc')).toBe('A');
    expect(initialOf(null, '0x')).toBe('·');
  });
});
