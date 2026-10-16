/**
 * «La gente» (the panel's Miembros and Roles): what the two screens work out
 * from the till's answer about one organization (/api/saldo/roles) — what the
 * person may do there and who could instead, whom they may take out, how a
 * permission's switch stands, the search, a person's dot, the month they
 * came, a fresh role's name. Pure: an answer in, a decision out; the islands
 * only draw it, and the till still decides on every write.
 */

import { describe, expect, it } from 'vitest';
import { ORGANIZATION_PERMISSIONS, OWNER_ACTS } from '@numinia/domain';
import type { DeskMemberDetail, DeskRole, DeskRoles } from '../accounts';
import {
  PERMISSION_GROUPS,
  SWATCHES,
  chosenRole,
  dotOf,
  freshRoleName,
  holdersIn,
  holdersOfRole,
  matchesSearch,
  mayCreateRole,
  mayEditRole,
  monthOf,
  newRoleId,
  ownersOf,
  peopleAccess,
  peopleToGive,
  plural,
  readRanks,
  removalOf,
  rolesToGive,
  sameSet,
  shownOf,
  swatchesFor,
  switchOf,
  toggled,
} from '../panel-people';

const wallet = (pair: string) => `0x${pair.repeat(20)}`;
const OWNER = wallet('0a');
const OWNER_TWO = wallet('0b');
const ME = wallet('42');
const FINANCE_PERSON = wallet('f1');
const NEWBIE = wallet('11');
const ADMIN_PERSON = wallet('ad');
const HOUSE = wallet('ab');

const role = (
  id: string,
  name: string,
  position: number,
  permissions: DeskRole['permissions'],
  extra: Partial<DeskRole> = {},
): DeskRole => ({
  id,
  name,
  color: null,
  position,
  hoist: false,
  permissions,
  members: 0,
  mayEdit: false,
  ...extra,
});

const ADMINISTRATION = role('role_admin', 'Administración', 3, ['administrator'], {
  color: '#c0392b',
  hoist: true,
});
const MODERATION = role('role_mod', 'Moderación', 2, ['remove-members', 'manage-roles']);
const FINANCE = role('role_fin', 'Finanzas', 1, ['view-balance', 'top-up'], { color: '#2f7fa8' });
const BASE = role('role_base', '@todos', 0, ['enter-worlds']);
const ROLES = [ADMINISTRATION, MODERATION, FINANCE, BASE];

const member = (
  who: string,
  roleIds: string[],
  extra: Partial<DeskMemberDetail> = {},
): DeskMemberDetail => ({
  wallet: who,
  owner: false,
  addedAt: '2026-09-02T10:00:00.000Z',
  roleIds,
  assignable: [],
  ...extra,
});

function view(
  as: DeskRoles['as'],
  members: DeskMemberDetail[] = [
    member(OWNER, [], { owner: true }),
    member(ME, ['role_mod']),
    member(FINANCE_PERSON, ['role_fin']),
    member(NEWBIE, []),
    member(ADMIN_PERSON, ['role_admin']),
  ],
  roles: DeskRole[] = ROLES,
): DeskRoles {
  return { ok: true, accountId: 'acc_t_1', as, roles, members };
}

describe('the permissions, in the five groups of the prototype', () => {
  it('hold the seventeen once each, in the register’s own order', () => {
    expect(PERMISSION_GROUPS.map((group) => group.id)).toEqual([
      'organization',
      'people',
      'gatherings',
      'venues',
      'money',
    ]);
    expect(PERMISSION_GROUPS.flatMap((group) => group.permissions)).toEqual([
      ...ORGANIZATION_PERMISSIONS,
    ]);
  });

  it('put each where the prototype puts it', () => {
    const groupOf = (permission: string) =>
      PERMISSION_GROUPS.find((group) => group.permissions.some((held) => held === permission))?.id;
    expect(groupOf('view-organization-log')).toBe('organization');
    expect(groupOf('mute-members')).toBe('people');
    expect(groupOf('manage-rituals')).toBe('gatherings');
    expect(groupOf('create-worlds')).toBe('venues');
    expect(groupOf('manage-balance')).toBe('money');
  });
});

describe('what the person may do here, worked out as the till does', () => {
  it('an owner may everything, the owners’ own acts too', () => {
    const { access, actor } = peopleAccess(view('owner'), OWNER);
    expect(access.as).toBe('owner');
    expect(access.permissions).toEqual([...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS]);
    expect(actor.isOwner).toBe(true);
  });

  it('a member may what the base role and the roles held carry, in the register’s order', () => {
    const { access, actor } = peopleAccess(view('member'), ME);
    expect(access.as).toBe('member');
    expect(access.permissions).toEqual(['manage-roles', 'remove-members', 'enter-worlds']);
    expect(actor.height).toBe(2);
  });

  it('a member whose role carries «Administrador» may every permission, never the owners’ acts', () => {
    const { access } = peopleAccess(view('member'), ADMIN_PERSON);
    expect(access.permissions).toEqual([...ORGANIZATION_PERMISSIONS]);
  });

  it('finds the person whatever the capitals', () => {
    const shouted = ADMIN_PERSON.toUpperCase().replace('0X', '0x');
    expect(peopleAccess(view('member'), shouted).access.permissions).toEqual([
      ...ORGANIZATION_PERMISSIONS,
    ]);
  });

  it('the house may every permission and stands above every role, below the owners', () => {
    const { access, actor } = peopleAccess(view('house'), HOUSE);
    expect(access.as).toBe('house');
    expect(access.permissions).toEqual([...ORGANIZATION_PERMISSIONS]);
    expect(actor.isHouse).toBe(true);
    expect(actor.height).toBeGreaterThan(ADMINISTRATION.position);
  });

  it('nobody the desk does not name may anything', () => {
    expect(peopleAccess(view('member'), null).access.permissions).toEqual([]);
    expect(peopleAccess(view('member'), wallet('99')).access.permissions).toEqual([]);
    expect(peopleAccess(view('house'), null).access.permissions).toEqual([
      ...ORGANIZATION_PERMISSIONS,
    ]);
  });

  it('says, for every act, the roles that hold it — «Administrador» counts — and none for the owners’ own', () => {
    const { holders } = peopleAccess(view('member'), ME).access;
    expect(holders['manage-roles']).toEqual(['Administración', 'Moderación']);
    expect(holders['view-balance']).toEqual(['Administración', 'Finanzas']);
    expect(holders['enter-worlds']).toEqual(['Administración', '@todos']);
    expect(holders['delete-world']).toEqual([]);
    expect(Object.keys(holders)).toHaveLength(ORGANIZATION_PERMISSIONS.length + OWNER_ACTS.length);
  });

  it('names the holders in the order the roles are given', () => {
    expect(holdersIn([FINANCE, ADMINISTRATION], 'top-up')).toEqual(['Finanzas', 'Administración']);
    expect(holdersIn([], 'top-up')).toEqual([]);
  });
});

describe('who may create and edit a role', () => {
  it('creating needs «Gestionar roles» and a role above the base one', () => {
    expect(mayCreateRole(peopleAccess(view('member'), ME), view('member'))).toBe(true);
    expect(mayCreateRole(peopleAccess(view('owner'), OWNER), view('owner'))).toBe(true);
    expect(mayCreateRole(peopleAccess(view('house'), HOUSE), view('house'))).toBe(true);
    expect(mayCreateRole(peopleAccess(view('member'), FINANCE_PERSON), view('member'))).toBe(false);
    // «Gestionar roles» from the base role alone: nothing stands below the person.
    const flat = view('member', [member(NEWBIE, [])], [{ ...BASE, permissions: ['manage-roles'] }]);
    expect(mayCreateRole(peopleAccess(flat, NEWBIE), flat)).toBe(false);
  });

  it('a role above the base one is the till’s word (`mayEdit`)', () => {
    const people = peopleAccess(view('member'), ME);
    expect(mayEditRole(people, { ...FINANCE, mayEdit: true })).toBe(true);
    expect(mayEditRole(people, { ...FINANCE, mayEdit: false })).toBe(false);
  });

  it('the base role (the till never marks it) may be edited by whoever manages roles above it', () => {
    expect(mayEditRole(peopleAccess(view('owner'), OWNER), BASE)).toBe(true);
    expect(mayEditRole(peopleAccess(view('member'), ME), BASE)).toBe(true);
    expect(mayEditRole(peopleAccess(view('member'), FINANCE_PERSON), BASE)).toBe(false);
  });
});

describe('who may be taken out of the organization', () => {
  const at = (as: DeskRoles['as'], you: string, target: string, members?: DeskMemberDetail[]) => {
    const organization = view(as, members);
    const found = organization.members.find((entry) => entry.wallet === target)!;
    return removalOf(peopleAccess(organization, you), organization, found);
  };

  it('anyone may leave, but the last owner', () => {
    expect(at('member', ME, ME)).toBe('leave');
    expect(at('owner', OWNER, OWNER)).toBeNull();
    const two = [member(OWNER, [], { owner: true }), member(OWNER_TWO, [], { owner: true })];
    expect(at('owner', OWNER, OWNER, two)).toBe('leave');
  });

  it('«Quitar miembros» takes out whoever stands below, never an owner', () => {
    expect(at('member', ME, NEWBIE)).toBe('remove');
    expect(at('member', ME, FINANCE_PERSON)).toBe('remove');
    expect(at('member', ME, ADMIN_PERSON)).toBeNull();
    expect(at('member', ME, OWNER)).toBeNull();
    expect(at('member', FINANCE_PERSON, NEWBIE)).toBeNull();
  });

  it('only an owner takes out another owner; the house takes out members, never an owner', () => {
    const two = [member(OWNER, [], { owner: true }), member(OWNER_TWO, [], { owner: true })];
    expect(at('owner', OWNER, OWNER_TWO, two)).toBe('remove');
    expect(at('house', HOUSE, OWNER)).toBeNull();
    expect(at('house', HOUSE, ADMIN_PERSON)).toBe('remove');
  });
});

describe('a permission’s switch', () => {
  const owner = peopleAccess(view('owner'), OWNER);
  const me = peopleAccess(view('member'), ME);

  it('is on when the role carries it, and the person may flip it', () => {
    expect(switchOf('top-up', ['top-up'], owner, true)).toEqual({
      on: true,
      disabled: false,
      why: null,
    });
    expect(switchOf('top-up', [], owner, true)).toEqual({ on: false, disabled: false, why: null });
  });

  it('with «Administrador» every other one is on and given by it', () => {
    expect(switchOf('top-up', ['administrator'], owner, true)).toEqual({
      on: true,
      disabled: true,
      why: 'admin',
    });
    expect(switchOf('administrator', ['administrator'], owner, true)).toEqual({
      on: true,
      disabled: false,
      why: null,
    });
  });

  it('a permission the person does not hold cannot be given or taken by them', () => {
    expect(switchOf('top-up', [], me, true)).toEqual({
      on: false,
      disabled: true,
      why: 'not-held',
    });
    expect(switchOf('remove-members', [], me, true)).toEqual({
      on: false,
      disabled: false,
      why: null,
    });
  });

  it('a role the person may not edit is read, never flipped', () => {
    expect(switchOf('top-up', ['top-up'], owner, false)).toEqual({
      on: true,
      disabled: true,
      why: null,
    });
  });

  it('flips one permission and keeps the register’s order', () => {
    expect(toggled(['top-up'], 'administrator')).toEqual(['administrator', 'top-up']);
    expect(toggled(['administrator', 'top-up'], 'administrator')).toEqual(['top-up']);
  });

  it('tells a changed draft from the saved one, whatever the order', () => {
    expect(sameSet(['top-up', 'administrator'], ['administrator', 'top-up'])).toBe(true);
    expect(sameSet(['top-up'], ['administrator'])).toBe(false);
    expect(sameSet(['top-up'], ['top-up', 'administrator'])).toBe(false);
  });
});

describe('the search', () => {
  it('finds a wallet by any part of it, without caring for capitals or blanks', () => {
    expect(matchesSearch(member(ME, []), '')).toBe(true);
    expect(matchesSearch(member(ME, []), '   ')).toBe(true);
    expect(matchesSearch(member(ME, []), '4242')).toBe(true);
    expect(matchesSearch(member(ME, []), ' 0X4242 ')).toBe(true);
    expect(matchesSearch(member(ME, []), 'ab')).toBe(false);
  });

  it('understands the short form the table shows, with «…» or three dots', () => {
    const short = `${ME.slice(0, 6)}…${ME.slice(-4)}`;
    expect(matchesSearch(member(ME, []), short)).toBe(true);
    expect(matchesSearch(member(ME, []), `${ME.slice(0, 6)}...${ME.slice(-4)}`)).toBe(true);
    expect(matchesSearch(member(ME, []), '0x42…ffff')).toBe(false);
    expect(matchesSearch(member(ME, []), '0xff…4242')).toBe(false);
  });

  it('finds a person by the name they chose, whatever the capitals', () => {
    const ana = { ...member(ME, []), name: 'Ana Ruiz' };
    expect(matchesSearch(ana, 'ruiz')).toBe(true);
    expect(matchesSearch(ana, ' ANA R ')).toBe(true);
    expect(matchesSearch(ana, 'teo')).toBe(false);
    // A name out of shape is no name: only the wallet is searched.
    expect(matchesSearch({ ...member(ME, []), name: 7 }, '7')).toBe(false);
  });
});

describe('what a person chose to show here (the till’s optional `name` and `face`)', () => {
  it('a name is shown as written, without blanks around it', () => {
    expect(shownOf({ ...member(ME, []), name: '  Ana Ruiz ' })).toEqual({
      name: 'Ana Ruiz',
      face: null,
    });
  });

  it('a face is a thumbnail of this site, under /thumbs/', () => {
    expect(
      shownOf({ ...member(ME, []), name: 'Ana', face: '/thumbs/avatar-arla-mncdhz3l.webp' }),
    ).toEqual({ name: 'Ana', face: '/thumbs/avatar-arla-mncdhz3l.webp' });
    expect(shownOf({ ...member(ME, []), face: '/thumbs/1x/starter-avatar-01.webp' }).face).toBe(
      '/thumbs/1x/starter-avatar-01.webp',
    );
  });

  it('without them, or from a till that does not send them, the person is their wallet', () => {
    expect(shownOf(member(ME, []))).toEqual({ name: null, face: null });
    expect(shownOf({ ...member(ME, []), name: null, face: null })).toEqual({
      name: null,
      face: null,
    });
  });

  it('anything out of shape is left out, never shown half', () => {
    const odd = (name: unknown, face: unknown) => shownOf({ ...member(ME, []), name, face });
    expect(odd('', '')).toEqual({ name: null, face: null });
    expect(odd('   ', 'thumbs/a.webp')).toEqual({ name: null, face: null });
    expect(odd(42, 42)).toEqual({ name: null, face: null });
    expect(odd(['Ana'], { src: '/thumbs/a.webp' })).toEqual({ name: null, face: null });
    for (const face of [
      'https://elsewhere.example/thumbs/a.webp',
      '//elsewhere.example/thumbs/a.webp',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '/thumbs/',
      '/thumbs/../api/saldo',
      '/thumbs/a.webp?x=1',
      '/thumbs/a b.webp',
      '/thumbs/a\\b.webp',
      '/images/a.webp',
    ]) {
      expect(odd(null, face).face, face).toBeNull();
    }
  });

  it('a name longer than the till allows is cut at sixty characters, never mid-letter', () => {
    const long = `${'é'.repeat(59)}🙂🙂`;
    const shown = shownOf({ ...member(ME, []), name: long }).name ?? '';
    expect(Array.from(shown)).toHaveLength(60);
    expect(shown.endsWith('🙂')).toBe(true);
  });

  it('a name never carries invisible controls that turn the text around', () => {
    expect(shownOf({ ...member(ME, []), name: 'Ana\u202E nóicartsinimdA\u0000' }).name).toBe(
      'Ana nóicartsinimdA',
    );
    expect(shownOf({ ...member(ME, []), name: '\u202E\u2066' }).name).toBeNull();
  });
});

describe('a person in the table', () => {
  it('draws the colour of the highest coloured role held, as a dot', () => {
    expect(dotOf(member(ME, ['role_fin', 'role_admin']), ROLES)).toBe('#c0392b');
    expect(dotOf(member(ME, ['role_mod', 'role_fin']), ROLES)).toBe('#2f7fa8');
    expect(dotOf(member(ME, ['role_mod']), ROLES)).toBeNull();
    expect(dotOf(member(ME, []), ROLES)).toBeNull();
  });

  it('looks for the highest whatever order the roles come in', () => {
    expect(dotOf(member(ME, ['role_fin', 'role_admin']), [FINANCE, ADMINISTRATION])).toBe(
      '#c0392b',
    );
  });

  it('came in a month of a year, said in the reader’s language', () => {
    const iso = '2026-09-02T10:00:00.000Z';
    expect(monthOf(iso, 'es')).toBe(
      new Date(iso).toLocaleDateString('es', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    );
    expect(monthOf(iso, 'es')).toContain('2026');
    expect(monthOf('yesterday', 'es')).toBeNull();
  });

  it('has the rank the city answered, read by hand, in lower case', () => {
    expect(
      readRanks({
        ok: true,
        ranks: { [ME.toUpperCase().replace('0X', '0x')]: 'citizen', [NEWBIE]: null },
      }),
    ).toEqual({ [ME]: 'citizen', [NEWBIE]: null });
    // A rank the city does not know is no rank at all.
    expect(readRanks({ ok: true, ranks: { [ME]: 'emperor', [NEWBIE]: 7 } })).toEqual({
      [ME]: null,
      [NEWBIE]: null,
    });
    expect(readRanks({ ok: true, ranks: {} })).toEqual({});
    for (const odd of [
      null,
      'ok',
      { ok: false, ranks: {} },
      { ok: true },
      { ok: true, ranks: [] },
    ]) {
      expect(readRanks(odd), JSON.stringify(odd)).toBeNull();
    }
  });

  it('may be given the roles the person may give and they do not hold, in the list’s order', () => {
    const someone = member(NEWBIE, ['role_fin'], { assignable: ['role_fin', 'role_mod'] });
    expect(rolesToGive(someone, ROLES).map((entry) => entry.id)).toEqual(['role_mod']);
    expect(rolesToGive(member(NEWBIE, []), ROLES)).toEqual([]);
  });
});

describe('the people of a role', () => {
  const organization = view('owner', [
    member(OWNER, [], { owner: true }),
    member(ME, ['role_mod'], { assignable: ['role_fin', 'role_mod'] }),
    member(NEWBIE, [], { assignable: ['role_fin'] }),
    member(FINANCE_PERSON, ['role_fin'], { assignable: ['role_fin'] }),
  ]);

  it('are its holders; the base role is everyone’s', () => {
    expect(holdersOfRole(organization, FINANCE).map((entry) => entry.wallet)).toEqual([
      FINANCE_PERSON,
    ]);
    expect(holdersOfRole(organization, BASE)).toHaveLength(4);
  });

  it('may grow by those without it whom the person may give it to', () => {
    expect(peopleToGive(organization, FINANCE).map((entry) => entry.wallet)).toEqual([ME, NEWBIE]);
    expect(peopleToGive(organization, ADMINISTRATION)).toEqual([]);
  });

  it('the owners are named apart: they are not a role', () => {
    expect(ownersOf(organization).map((entry) => entry.wallet)).toEqual([OWNER]);
  });
});

describe('the list of roles', () => {
  it('opens on the role asked for, or the top one', () => {
    expect(chosenRole(ROLES, 'role_fin')).toBe(FINANCE);
    expect(chosenRole(ROLES, 'role_gone')).toBe(ADMINISTRATION);
    expect(chosenRole(ROLES, null)).toBe(ADMINISTRATION);
    expect(chosenRole([], 'role_fin')).toBeNull();
  });

  it('names a fresh role so it never repeats a name', () => {
    expect(freshRoleName('Rol nuevo', ROLES)).toBe('Rol nuevo');
    const taken = [...ROLES, role('r1', 'rol nuevo', 4, []), role('r2', 'Rol nuevo 2', 5, [])];
    expect(freshRoleName('Rol nuevo', taken)).toBe('Rol nuevo 3');
  });

  it('finds the role the till added', () => {
    const before = view('owner');
    const added = role('role_new', 'Rol nuevo', 4, []);
    expect(newRoleId(before, view('owner', undefined, [added, ...ROLES]))).toBe('role_new');
    expect(newRoleId(before, before)).toBeNull();
  });

  it('offers the house’s swatches, and a role’s own colour when it is another', () => {
    expect(SWATCHES).toHaveLength(7);
    for (const swatch of SWATCHES) expect(swatch).toMatch(/^#[0-9a-f]{6}$/);
    expect(swatchesFor(null)).toEqual(SWATCHES);
    expect(swatchesFor(SWATCHES[2]!)).toEqual(SWATCHES);
    expect(swatchesFor('#123456')).toEqual(['#123456', ...SWATCHES]);
  });
});

describe('counting people in words', () => {
  const forms = { one: '{n} persona', other: '{n} personas' };

  it('says one and many apart where the language does', () => {
    expect(plural(1, forms, 'es')).toBe('1 persona');
    expect(plural(3, forms, 'es')).toBe('3 personas');
    expect(plural(0, forms, 'es')).toBe('0 personas');
  });

  it('uses one form where the language has one', () => {
    expect(plural(1, { one: '{n}人', other: '{n} 人' }, 'ja')).toBe('1 人');
  });
});
