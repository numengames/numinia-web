/**
 * «El panel» (/panel/): the organization's panel — the pieces of its rail,
 * the organization chosen in the address (`?org=<account id>`, nothing is
 * stored) and what the person is in it. Pure: a path or a body in, an
 * answer out; the island and the page only draw it.
 */

import { describe, expect, it } from 'vitest';
import type { DeskRole, DeskRoles } from '../accounts';
import { PANEL_PATH, localeHref } from '../app-nav';
import {
  ORG_PARAM,
  PIECES,
  ROOMS,
  chooseTeam,
  initialsOf,
  orgFromSearch,
  pieceHref,
  searchWithOrg,
  standingIn,
  type Piece,
} from '../panel';

const piece = (id: string): Piece => [...PIECES, ...ROOMS].find((entry) => entry.id === id)!;

describe('the pieces of the panel', () => {
  it('are nine, in the order of the prototype: the working ones are drawn among the rest', () => {
    expect(PIECES.map((entry) => entry.id)).toEqual([
      'summary',
      'venues',
      'gatherings',
      'members',
      'agents',
      'memory',
      'bazaar',
      'balance',
      'settings',
    ]);
  });

  it('three are built, and each has its own address under /panel/ (Spanish slugs, like Saldo)', () => {
    const built = PIECES.filter((entry) => entry.kind === 'built');
    expect(built.map((entry) => [entry.id, entry.path])).toEqual([
      ['summary', '/panel/'],
      ['members', '/panel/miembros/'],
      ['balance', '/panel/saldo/'],
    ]);
    expect(PANEL_PATH).toBe('/panel/');
  });

  it('six are not built yet, and a piece not built has no address to fail on', () => {
    const soon = PIECES.filter((entry) => entry.kind === 'soon');
    expect(soon.map((entry) => entry.id)).toEqual([
      'venues',
      'gatherings',
      'agents',
      'memory',
      'bazaar',
      'settings',
    ]);
    for (const entry of soon) expect(entry.path).toBeNull();
  });

  it("the Oracle's four rooms are the LAP's own rooms, not copies", () => {
    expect(ROOMS.map((entry) => [entry.id, entry.kind, entry.path])).toEqual([
      ['census', 'room', '/lap/admin/census/'],
      ['worlds', 'room', '/lap/admin/worlds/'],
      ['prices', 'room', '/lap/admin/prices/'],
      ['assets', 'room', '/lap/admin/assets/'],
    ]);
  });

  it('never repeat an id, and every one draws an icon the site already has', () => {
    const everyone = [...PIECES, ...ROOMS];
    expect(new Set(everyone.map((entry) => entry.id)).size).toBe(everyone.length);
    expect(new Set(everyone.map((entry) => entry.icon))).toEqual(
      new Set([
        'house',
        'buildings',
        'calendar-blank',
        'users-three',
        'robot',
        'scroll',
        'package',
        'coins',
        'gear',
        'users',
        'planet',
      ]),
    );
  });
});

describe('where a piece leads', () => {
  it('keeps the organization in every address of the panel, under the visitor’s locale', () => {
    expect(pieceHref('en', piece('summary'), 'acc_t_1')).toBe('/panel/?org=acc_t_1');
    expect(pieceHref('es', piece('members'), 'acc_t_1')).toBe('/es/panel/miembros/?org=acc_t_1');
    expect(pieceHref('pt-br', piece('balance'), 'acc_t_1')).toBe('/pt-br/panel/saldo/?org=acc_t_1');
  });

  it('has no ?org= before an organization is known', () => {
    expect(pieceHref('ja', piece('members'), null)).toBe('/ja/panel/miembros/');
  });

  it('writes the organization encoded, whatever it holds', () => {
    expect(pieceHref('en', piece('summary'), 'a b&c=d')).toBe('/panel/?org=a%20b%26c%3Dd');
  });

  it('leads to the LAP room as it is: a room belongs to the city, not to one organization', () => {
    expect(pieceHref('es', piece('census'), 'acc_t_1')).toBe('/es/lap/admin/census/');
    expect(pieceHref('en', piece('worlds'), null)).toBe('/lap/admin/worlds/');
  });

  it('leads nowhere when the piece is not built: never a link that fails', () => {
    for (const id of ['venues', 'gatherings', 'agents', 'memory', 'bazaar', 'settings']) {
      expect(pieceHref('es', piece(id), 'acc_t_1')).toBeNull();
    }
  });

  it('writes the locale prefix as the nav does, in every language (this module does not import it)', () => {
    for (const locale of ['en', 'es', 'ja', 'ko', 'pt-br'] as const) {
      expect(pieceHref(locale, piece('summary'), null)).toBe(localeHref(locale, PANEL_PATH));
      expect(pieceHref(locale, piece('census'), null)).toBe(
        localeHref(locale, '/lap/admin/census/'),
      );
    }
  });
});

describe('the organization in the address', () => {
  it('reads ?org= whatever else the address carries', () => {
    expect(ORG_PARAM).toBe('org');
    expect(orgFromSearch('?org=acc_t_9f')).toBe('acc_t_9f');
    expect(orgFromSearch('?x=1&org=acc_t_9f&y=2')).toBe('acc_t_9f');
    expect(orgFromSearch('org=acc_t_9f')).toBe('acc_t_9f');
  });

  it('reads nothing when there is nothing, and the first of two', () => {
    expect(orgFromSearch('')).toBeNull();
    expect(orgFromSearch('?x=1')).toBeNull();
    expect(orgFromSearch('?org=')).toBeNull();
    expect(orgFromSearch('?org=acc_a&org=acc_b')).toBe('acc_a');
  });

  it('refuses what an account id never looks like', () => {
    for (const hostile of [
      '?org=<script>',
      '?org=a b',
      '?org=../../etc',
      '?org=javascript:alert(1)',
      `?org=${'a'.repeat(65)}`,
    ]) {
      expect(orgFromSearch(hostile), hostile).toBeNull();
    }
    expect(orgFromSearch(`?org=${'a'.repeat(64)}`)).toBe('a'.repeat(64));
  });

  it('sets it in an address, keeping the rest, replacing an older one', () => {
    expect(searchWithOrg('', 'acc_t_2')).toBe('?org=acc_t_2');
    expect(searchWithOrg('?org=acc_t_1', 'acc_t_2')).toBe('?org=acc_t_2');
    expect(searchWithOrg('?x=1&org=acc_t_1', 'acc_t_2')).toBe('?x=1&org=acc_t_2');
  });
});

describe('which organization the panel shows', () => {
  const teams = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('the one asked for, when the person is in it', () => {
    expect(chooseTeam(teams, 'b')).toBe(teams[1]);
  });

  it('the first one when nothing was asked, or when what was asked is not theirs', () => {
    expect(chooseTeam(teams, null)).toBe(teams[0]);
    expect(chooseTeam(teams, 'zzz')).toBe(teams[0]);
  });

  it('none when there is none: the panel says where one is created', () => {
    expect(chooseTeam([], null)).toBeNull();
    expect(chooseTeam([], 'a')).toBeNull();
  });
});

describe('the avatar letters of an organization', () => {
  it('are the first letters of its first two words, in capitals', () => {
    expect(initialsOf('Numen Games')).toBe('NG');
    expect(initialsOf('Active Inference Institute')).toBe('AI');
    expect(initialsOf('  la   tarugo ')).toBe('LT');
  });

  it('are the first two letters of a single word', () => {
    expect(initialsOf('Tarugo')).toBe('TA');
    expect(initialsOf('X')).toBe('X');
  });

  it('count a letter, not a code unit', () => {
    expect(initialsOf('𝔑umen')).toBe('𝔑U');
    expect(initialsOf('星 月')).toBe('星月');
  });

  it('are empty for a name that is only blanks', () => {
    expect(initialsOf('   ')).toBe('');
  });
});

describe('what the person is in an organization', () => {
  const role = (id: string, name: string, position: number): DeskRole => ({
    id,
    name,
    color: null,
    position,
    hoist: false,
    permissions: [],
    members: 0,
    mayEdit: false,
  });
  const ADMIN = role('r1', 'Administración', 2);
  const FINANCE = role('r2', 'Finanzas', 1);
  const BASE = role('r3', '@todos', 0);
  const ME = '0x42e6000000000000000000000000000000ca26';
  const OTHER = `0x${'cd'.repeat(20)}`;
  const view = (as: DeskRoles['as'], held: string[]): DeskRoles => ({
    ok: true,
    accountId: 'acc_t_1',
    as,
    roles: [ADMIN, FINANCE, BASE],
    members: [
      {
        wallet: OTHER,
        owner: true,
        addedAt: '2026-09-01T00:00:00.000Z',
        roleIds: [],
        assignable: [],
      },
      {
        wallet: ME,
        owner: false,
        addedAt: '2026-09-02T00:00:00.000Z',
        roleIds: held,
        assignable: [],
      },
    ],
  });

  it('is a member with the roles held, from the top down, never the base one', () => {
    const standing = standingIn(view('member', ['r2', 'r1']), ME);
    expect(standing.as).toBe('member');
    expect(standing.roles.map((entry) => entry.name)).toEqual(['Administración', 'Finanzas']);
  });

  it('is a member with no more roles than the base one', () => {
    expect(standingIn(view('member', []), ME).roles).toEqual([]);
  });

  it('is an owner as the desk says it, with the roles the owner also holds', () => {
    const standing = standingIn(view('owner', ['r1']), ME);
    expect(standing.as).toBe('owner');
    expect(standing.roles.map((entry) => entry.id)).toEqual(['r1']);
  });

  it('compares wallets without caring for capitals', () => {
    expect(
      standingIn(view('member', ['r2']), ME.toUpperCase().replace('0X', '0x')).roles,
    ).toHaveLength(1);
  });

  it('is the house when the desk says so: the house is nobody’s member, so it holds no role', () => {
    const standing = standingIn(view('house', []), `0x${'ab'.repeat(20)}`);
    expect(standing).toEqual({ as: 'house', roles: [] });
  });

  it('holds nothing when the desk did not say who is asking', () => {
    expect(standingIn(view('member', ['r1']), null)).toEqual({ as: 'member', roles: [] });
  });
});
