/**
 * Organisation roles, as numinia-archive's STD-051 states them and STD-052
 * registers them (decided in ADR-071). One describe per rule, named by its
 * plate, so the archive's Check table can point at each.
 */
import { describe, expect, it } from 'vitest';
import {
  HOUSE_ACCESS_SETTINGS,
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  type ActorAccess,
  type OrganizationAccess,
  type OrganizationMember,
  type OrganizationRole,
  type OrganizationState,
} from '../src/types/organization.js';
import { SUPPORTED_LOCALES } from '../src/types/i18n.js';
import {
  BASE_ROLE_NAME,
  BASE_ROLE_POSITION,
  MAX_ORGANIZATION_ROLES,
  ORGANIZATION_PERMISSION_LABELS,
  ORGANIZATION_TEMPLATES,
  ROLE_NAME_MAX,
  rolesFromTemplate,
} from '../src/constants/organization-roles.js';
import {
  HOUSE_HEIGHT,
  accessOf,
  canActOnMember,
  canAssignRole,
  canCreateRole,
  canDeleteRole,
  canDoOwnerAct,
  canEditRole,
  canLeave,
  canMoveRole,
  canSetHouseAccess,
  houseMayEnter,
  needsFreshSignature,
  placeForNewRole,
  validateOrganizationRoles,
} from '../src/resolvers/organization-access.js';

// A congress, as in the design: an owner, an administrator, a moderator, a
// speaker, a volunteer, an attendee and an agent that a volunteer answers for.
const role = (
  id: string,
  position: number,
  permissions: OrganizationRole['permissions'],
  hoist = false,
): OrganizationRole => ({ id, name: id, color: null, position, hoist, permissions });

const BASE = role('base', 0, ['enter-worlds']);
const VOLUNTEERS = role('volunteers', 1, ['mute-members', 'create-rituals']);
const SPEAKERS = role('speakers', 2, ['build-in-worlds'], true);
const MODERATION = role('moderation', 3, [
  'remove-members',
  'ban-members',
  'mute-members',
  'manage-rituals',
  'manage-roles',
]);
const ADMINISTRATION = role('administration', 4, ['administrator'], true);
const ROLES = [ADMINISTRATION, MODERATION, SPEAKERS, VOLUNTEERS, BASE];

const state = (overrides: Partial<OrganizationState> = {}): OrganizationState => ({
  roles: ROLES,
  houseAccess: 'alpha',
  houseLeaveOpen: false,
  ...overrides,
});

const human = (personId: string, roleIds: string[], isOwner = false): OrganizationMember => ({
  personId,
  kind: 'human',
  isOwner,
  roleIds,
});

const of = (member: OrganizationMember, s = state(), responsible?: ActorAccess): ActorAccess =>
  accessOf(s, { kind: 'member', member }, responsible);

const elena = of(human('elena', [], true));
const ana = of(human('ana', ['administration']));
const marco = of(human('marco', ['moderation']));
const nuria = of(human('nuria', ['speakers', 'volunteers']));
const pau = of(human('pau', ['volunteers']));
const guest = of(human('guest', []));
const house = accessOf(state(), { kind: 'house', personId: 'pablo' });

const sorted = (set: ReadonlySet<OrganizationAccess>): string[] => [...set].sort();

describe('ORG-001: roles add up, and nothing reaches outside the organisation', () => {
  it('a member with no role holds only the base role', () => {
    expect(sorted(guest.permissions)).toEqual(['enter-worlds']);
    expect(guest.height).toBe(BASE_ROLE_POSITION);
  });

  it('every role a member holds adds its permissions to the base role', () => {
    expect(sorted(pau.permissions)).toEqual(['create-rituals', 'enter-worlds', 'mute-members']);
    expect(sorted(nuria.permissions)).toEqual([
      'build-in-worlds',
      'create-rituals',
      'enter-worlds',
      'mute-members',
    ]);
    expect(nuria.height).toBe(SPEAKERS.position);
  });

  it('a role from another organisation grants nothing here', () => {
    const stranger = of(human('lucia', ['a-role-of-another-organisation']));
    expect(sorted(stranger.permissions)).toEqual(['enter-worlds']);
  });

  it('administrator holds every permission, and no act reserved to owners', () => {
    expect(sorted(ana.permissions)).toEqual([...ORGANIZATION_PERMISSIONS].sort());
    for (const act of OWNER_ACTS) expect(ana.permissions.has(act)).toBe(false);
  });

  it('someone who is not a member holds nothing', () => {
    const outsider = accessOf(state(), { kind: 'outsider' });
    expect(outsider.permissions.size).toBe(0);
    expect(outsider.height).toBeLessThan(BASE_ROLE_POSITION);
  });

  it('without a base role a member holds only what their own roles carry', () => {
    const noBase = of(human('pau', ['volunteers']), state({ roles: [VOLUNTEERS] }));
    expect(sorted(noBase.permissions)).toEqual(['create-rituals', 'mute-members']);
    const nothing = of(human('guest', []), state({ roles: [VOLUNTEERS] }));
    expect(nothing.permissions.size).toBe(0);
  });
});

describe('ORG-002: owners are not a role', () => {
  it('an owner holds every permission and every act reserved to owners, with no role at all', () => {
    expect(elena.isOwner).toBe(true);
    expect(sorted(elena.permissions)).toEqual([...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS].sort());
    expect(elena.height).toBeGreaterThan(HOUSE_HEIGHT);
  });

  it('only an owner deletes a world, sees its code, downloads it, closes or hands over the organisation', () => {
    for (const act of OWNER_ACTS) {
      expect(canDoOwnerAct(elena, act)).toEqual({ ok: true });
      expect(canDoOwnerAct(ana, act)).toEqual({ ok: false, refusal: 'owners-only' });
      expect(canDoOwnerAct(house, act)).toEqual({ ok: false, refusal: 'owners-only' });
    }
  });

  it('the last owner cannot leave; a second owner can, and anyone else always can', () => {
    const owner = human('elena', [], true);
    expect(canLeave(owner, 1)).toEqual({ ok: false, refusal: 'last-owner' });
    expect(canLeave(owner, 2)).toEqual({ ok: true });
    expect(canLeave(human('pau', ['volunteers']), 1)).toEqual({ ok: true });
  });
});

describe('ORG-011: an agent never goes beyond its person', () => {
  const agent: OrganizationMember = {
    personId: 'procyon',
    kind: 'agent',
    isOwner: true,
    roleIds: ['moderation'],
  };

  it('holds only what both its roles and its person allow, and stands no higher than its person', () => {
    const procyon = of(agent, state(), pau);
    expect(sorted(procyon.permissions)).toEqual(['enter-worlds', 'mute-members']);
    expect(procyon.height).toBe(VOLUNTEERS.position);
  });

  it('is never an owner, even when the record says so', () => {
    const procyon = of(agent, state(), elena);
    expect(procyon.isOwner).toBe(false);
    for (const act of OWNER_ACTS) expect(procyon.permissions.has(act)).toBe(false);
  });

  it('with nobody answering for it, holds nothing', () => {
    const orphan = of(agent, state());
    expect(orphan.permissions.size).toBe(0);
    expect(orphan.personId).toBe('procyon');
  });
});

describe('ORG-003: only below your highest role, and only permissions you hold', () => {
  it('gives and takes away roles below its own, to members below it', () => {
    expect(canAssignRole(marco, guest, VOLUNTEERS)).toEqual({ ok: true });
    expect(canAssignRole(marco, pau, SPEAKERS)).toEqual({ ok: true });
  });

  it('never a role at or above its own highest role', () => {
    expect(canAssignRole(marco, guest, MODERATION)).toEqual({ ok: false, refusal: 'not-below' });
    expect(canAssignRole(marco, guest, ADMINISTRATION)).toEqual({
      ok: false,
      refusal: 'not-below',
    });
  });

  it('never to a member at or above it, and never to an owner', () => {
    expect(canAssignRole(marco, ana, VOLUNTEERS)).toEqual({ ok: false, refusal: 'not-below' });
    expect(canAssignRole(ana, elena, VOLUNTEERS)).toEqual({ ok: false, refusal: 'owner' });
  });

  it('without the permission to manage roles, nothing; the base role is nobody’s to give', () => {
    expect(canAssignRole(pau, guest, VOLUNTEERS)).toEqual({
      ok: false,
      refusal: 'missing-permission',
    });
    expect(canAssignRole(marco, guest, BASE)).toEqual({ ok: false, refusal: 'base-role' });
  });

  it('edits a role below it, changing only permissions it holds', () => {
    expect(canEditRole(marco, VOLUNTEERS)).toEqual({ ok: true });
    expect(canEditRole(marco, VOLUNTEERS, [...VOLUNTEERS.permissions, 'ban-members'])).toEqual({
      ok: true,
    });
    expect(canEditRole(marco, VOLUNTEERS, [...VOLUNTEERS.permissions, 'create-worlds'])).toEqual({
      ok: false,
      refusal: 'grant-exceeds',
    });
    // Taking away a permission it does not hold is a change it may not make either.
    expect(canEditRole(marco, SPEAKERS, [])).toEqual({ ok: false, refusal: 'grant-exceeds' });
    expect(canEditRole(marco, ADMINISTRATION)).toEqual({ ok: false, refusal: 'not-below' });
    expect(canEditRole(pau, BASE)).toEqual({ ok: false, refusal: 'missing-permission' });
    expect(canEditRole(marco, BASE, ['enter-worlds', 'mute-members'])).toEqual({ ok: true });
  });

  it('creates a role just below its own highest role; owners and the house create at the top', () => {
    expect(canCreateRole(marco, state())).toEqual({ ok: true });
    expect(placeForNewRole(marco, ROLES)).toEqual({
      position: MODERATION.position,
      raised: ['administration', 'moderation'],
    });
    expect(placeForNewRole(elena, ROLES)).toEqual({ position: 5, raised: [] });
    expect(placeForNewRole(house, ROLES)).toEqual({ position: 5, raised: [] });
    expect(placeForNewRole(elena, [])).toEqual({ position: 1, raised: [] });
    expect(canCreateRole(pau, state())).toEqual({ ok: false, refusal: 'missing-permission' });
  });

  it('cannot create a role with nowhere below it to go', () => {
    const baseManager = of(
      human('guest', []),
      state({ roles: [role('base', 0, ['manage-roles'])] }),
    );
    expect(canCreateRole(baseManager, state())).toEqual({ ok: false, refusal: 'not-below' });
  });

  it('deletes and moves only roles below it, and the base role stays last', () => {
    expect(canDeleteRole(marco, VOLUNTEERS)).toEqual({ ok: true });
    expect(canDeleteRole(marco, ADMINISTRATION)).toEqual({ ok: false, refusal: 'not-below' });
    expect(canDeleteRole(marco, BASE)).toEqual({ ok: false, refusal: 'base-role' });
    expect(canDeleteRole(pau, VOLUNTEERS)).toEqual({ ok: false, refusal: 'missing-permission' });
    expect(canMoveRole(marco, VOLUNTEERS, 2)).toEqual({ ok: true });
    expect(canMoveRole(marco, VOLUNTEERS, 3)).toEqual({ ok: false, refusal: 'not-below' });
    expect(canMoveRole(marco, ADMINISTRATION, 1)).toEqual({ ok: false, refusal: 'not-below' });
    expect(canMoveRole(marco, BASE, 1)).toEqual({ ok: false, refusal: 'base-role' });
    expect(canMoveRole(marco, VOLUNTEERS, 0)).toEqual({ ok: false, refusal: 'base-role' });
    expect(canMoveRole(pau, VOLUNTEERS, 1)).toEqual({ ok: false, refusal: 'missing-permission' });
  });

  it('removes, bans and mutes only members below it, never an owner', () => {
    expect(canActOnMember(marco, pau, 'ban')).toEqual({ ok: true });
    expect(canActOnMember(marco, guest, 'remove')).toEqual({ ok: true });
    expect(canActOnMember(pau, guest, 'mute')).toEqual({ ok: true });
    expect(canActOnMember(marco, ana, 'ban')).toEqual({ ok: false, refusal: 'not-below' });
    expect(canActOnMember(marco, elena, 'remove')).toEqual({ ok: false, refusal: 'owner' });
    expect(canActOnMember(pau, guest, 'remove')).toEqual({
      ok: false,
      refusal: 'missing-permission',
    });
  });
});

describe('ORG-004: nobody changes their own roles', () => {
  it('not even an administrator or an owner, on a role below them', () => {
    expect(canAssignRole(ana, ana, VOLUNTEERS)).toEqual({ ok: false, refusal: 'own-roles' });
    expect(canAssignRole(elena, elena, VOLUNTEERS)).toEqual({ ok: false, refusal: 'own-roles' });
  });

  it('a member does not remove, ban or mute themselves: they leave', () => {
    expect(canActOnMember(marco, marco, 'remove')).toEqual({ ok: false, refusal: 'self' });
  });
});

describe('ORG-007: the house enters as the organisation allows', () => {
  it('enters every organisation during the alpha, and where the setting says always', () => {
    expect(houseMayEnter('alpha', false)).toBe(true);
    expect(houseMayEnter('always', false)).toBe(true);
  });

  it('on request, only while an owner’s leave is open; never, not at all', () => {
    expect(houseMayEnter('on-request', false)).toBe(false);
    expect(houseMayEnter('on-request', true)).toBe(true);
    expect(houseMayEnter('never', true)).toBe(false);
  });

  it('enters with an administrator’s reach, above every role and below the owners', () => {
    expect(house.isHouse).toBe(true);
    expect(sorted(house.permissions)).toEqual([...ORGANIZATION_PERMISSIONS].sort());
    expect(house.height).toBeGreaterThan(ADMINISTRATION.position);
    expect(canActOnMember(house, ana, 'remove')).toEqual({ ok: true });
    expect(canActOnMember(house, elena, 'remove')).toEqual({ ok: false, refusal: 'owner' });
  });

  it('no organisation changes the house’s access during the alpha; afterwards only owners do', () => {
    expect(canSetHouseAccess(elena, 'alpha')).toEqual({ ok: false, refusal: 'alpha' });
    expect(canSetHouseAccess(elena, 'on-request')).toEqual({ ok: true });
    expect(canSetHouseAccess(ana, 'always')).toEqual({ ok: false, refusal: 'owners-only' });
  });

  it('where it may not enter, the house holds nothing', () => {
    const shut = accessOf(state({ houseAccess: 'never' }), { kind: 'house', personId: 'pablo' });
    expect(shut.permissions.size).toBe(0);
    expect(shut.isHouse).toBe(false);
    const leave = accessOf(state({ houseAccess: 'on-request', houseLeaveOpen: true }), {
      kind: 'house',
      personId: 'pablo',
    });
    expect(leave.permissions.has('administrator')).toBe(true);
  });
});

describe('ORG-008: what is dangerous is signed again', () => {
  it('granting administrator or role management, banning and the house’s access ask for a new signature', () => {
    expect(needsFreshSignature({ kind: 'grant', permissions: ['administrator'] })).toBe(true);
    expect(
      needsFreshSignature({ kind: 'grant', permissions: ['mute-members', 'manage-roles'] }),
    ).toBe(true);
    expect(needsFreshSignature({ kind: 'ban' })).toBe(true);
    expect(needsFreshSignature({ kind: 'house-access' })).toBe(true);
  });

  it('granting anything else does not', () => {
    expect(
      needsFreshSignature({ kind: 'grant', permissions: ['mute-members', 'view-balance'] }),
    ).toBe(false);
  });
});

describe('ORG-012: the code and the register move together', () => {
  // Changing any list below changes numinia-archive's STD-052 in the same
  // change: these literals are its tables, copied word for word.
  it('the seventeen permissions are the register’s', () => {
    expect(ORGANIZATION_PERMISSIONS).toEqual([
      'administrator',
      'manage-organization',
      'view-organization-log',
      'manage-roles',
      'invite-members',
      'remove-members',
      'ban-members',
      'mute-members',
      'create-rituals',
      'manage-rituals',
      'enter-worlds',
      'build-in-worlds',
      'start-stop-worlds',
      'create-worlds',
      'view-balance',
      'top-up',
      'manage-balance',
    ]);
  });

  it('the acts no role carries, the house’s settings and the cap are the register’s', () => {
    expect(OWNER_ACTS).toEqual([
      'delete-world',
      'see-world-code',
      'download-world',
      'close-organization',
      'hand-over-organization',
      'manage-owners',
      'set-house-access',
    ]);
    expect(HOUSE_ACCESS_SETTINGS).toEqual(['alpha', 'always', 'on-request', 'never']);
    expect(MAX_ORGANIZATION_ROLES).toBe(250);
  });

  it('every permission has a label in each of the five languages', () => {
    for (const permission of ORGANIZATION_PERMISSIONS) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(ORGANIZATION_PERMISSION_LABELS[permission][locale].length).toBeGreaterThan(0);
      }
    }
  });
});

describe('STD-052: the cap of roles and a well-formed list', () => {
  it('stops creating roles at 250 besides the base role', () => {
    const many = Array.from({ length: MAX_ORGANIZATION_ROLES }, (_, i) => role(`r${i}`, i + 1, []));
    expect(canCreateRole(elena, state({ roles: [...many, BASE] }))).toEqual({
      ok: false,
      refusal: 'role-limit',
    });
    expect(validateOrganizationRoles([...many, BASE])).toEqual([]);
    expect(validateOrganizationRoles([...many, role('one-too-many', 251, []), BASE])).toEqual([
      `more than ${MAX_ORGANIZATION_ROLES} roles`,
    ]);
  });

  it('finds what is wrong with a list of roles', () => {
    expect(validateOrganizationRoles(ROLES)).toEqual([]);
    expect(validateOrganizationRoles([VOLUNTEERS])).toEqual([
      'exactly one base role at position 0, found 0',
    ]);
    expect(
      validateOrganizationRoles([
        { ...BASE, hoist: true },
        { ...VOLUNTEERS, position: 1.5 },
        { ...SPEAKERS, position: -2 },
        { ...MODERATION, position: 4 },
        ADMINISTRATION,
        { ...VOLUNTEERS, id: 'odd', position: 6, permissions: ['fly' as never] },
        { ...VOLUNTEERS, id: 'blank', position: 7, name: ' Blank ' },
        { ...VOLUNTEERS, id: 'long', position: 8, name: 'x'.repeat(ROLE_NAME_MAX + 1) },
        { ...VOLUNTEERS, id: 'paint', position: 9, color: 'red' },
        { ...VOLUNTEERS, id: 'teal', position: 10, color: '#3fb8a7' },
        { ...VOLUNTEERS, id: 'empty', position: 11, name: '' },
      ]),
    ).toEqual([
      'the base role is never shown apart',
      'volunteers: position 1.5 is not a whole number from 0',
      'speakers: position -2 is not a whole number from 0',
      'administration: position 4 is taken',
      'odd: unknown permission fly',
      'blank: a name of 1 to 100 characters, with no spaces around it',
      'long: a name of 1 to 100 characters, with no spaces around it',
      'paint: a colour is #rrggbb in lower case, or none',
      'empty: a name of 1 to 100 characters, with no spaces around it',
    ]);
  });
});

describe('STD-052: the roles an organisation is born with', () => {
  it('Alpha: administration, and the base role enters the worlds', () => {
    const roles = rolesFromTemplate('alpha', 'es', (i) => `alpha-${i}`);
    expect(roles.map((r) => [r.id, r.name, r.position, r.permissions])).toEqual([
      ['alpha-0', 'Administración', 1, ['administrator']],
      ['alpha-1', BASE_ROLE_NAME.es, 0, ['enter-worlds', 'top-up']],
    ]);
    expect(validateOrganizationRoles(roles)).toEqual([]);
  });

  it('Community: administration and moderation above the base role', () => {
    const roles = rolesFromTemplate('community', 'en', (i) => `c${i}`);
    expect(roles.map((r) => r.name)).toEqual(['Administration', 'Moderation', '@everyone']);
    expect(roles[1]?.permissions).toEqual(ORGANIZATION_TEMPLATES.community.roles[1]?.permissions);
    expect(validateOrganizationRoles(roles)).toEqual([]);
  });

  it('Team: Administration orange, Finance blue, Member green, the base role none', () => {
    const roles = rolesFromTemplate('team', 'en', (i) => `t${i}`);
    expect(roles.map((r) => r.color)).toEqual(['#d98324', '#2f7fa8', '#3d8b5f', null]);
    expect(rolesFromTemplate('community', 'en', (i) => `c${i}`).map((r) => r.color)).toEqual([
      null,
      null,
      null,
    ]);
    expect(validateOrganizationRoles(roles)).toEqual([]);
  });

  // MIS-179's table, cell by cell: the four roles of ADR-070 are the Team template.
  describe('Team: every cell of the four team roles of ADR-070 still holds', () => {
    const roles = rolesFromTemplate('team', 'en', (i) => ['adm', 'fin', 'mem', 'base'][i] ?? 'x');
    const team = state({ roles });
    const people = {
      owner: of(human('o', [], true), team),
      administration: of(human('a', ['adm']), team),
      finance: of(human('f', ['fin']), team),
      member: of(human('m', ['mem']), team),
    };
    const table: ReadonlyArray<readonly [string, readonly OrganizationAccess[], string]> = [
      ['see worlds, usage and invoices', ['view-balance'], 'owner administration finance member'],
      ['start and stop worlds', ['start-stop-worlds'], 'owner administration member'],
      ['create worlds', ['create-worlds'], 'owner administration'],
      [
        'delete a world, see or change its code, download it',
        ['delete-world', 'see-world-code', 'download-world'],
        'owner',
      ],
      ['change billing details', ['manage-balance'], 'owner administration finance'],
      ['top up', ['top-up'], 'owner administration finance member'],
      [
        'invite, remove and change roles',
        ['invite-members', 'remove-members', 'manage-roles'],
        'owner administration',
      ],
      ['close the team or hand it over', ['close-organization', 'hand-over-organization'], 'owner'],
    ];
    for (const [act, needs, allowed] of table) {
      for (const [who, access] of Object.entries(people)) {
        const expected = allowed.split(' ').includes(who);
        it(`${act}: ${who} ${expected ? 'may' : 'may not'}`, () => {
          for (const permission of needs) expect(access.permissions.has(permission)).toBe(expected);
        });
      }
    }
  });
});
