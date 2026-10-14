/**
 * What a member may do inside their organisation (numinia-archive STD-051).
 * Pure: the till calls it with what it stored, numinia.com shows what it
 * answers, and the browser never decides. Each rule names its plate.
 */

import {
  BASE_ROLE_POSITION,
  MAX_ORGANIZATION_ROLES,
  ROLE_NAME_MAX,
} from '../constants/organization-roles.js';
import {
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  type ActorAccess,
  type HouseAccess,
  type MemberAct,
  type OrganizationAccess,
  type OrganizationActor,
  type OrganizationMember,
  type OrganizationPermission,
  type OrganizationRefusal,
  type OrganizationRole,
  type OrganizationState,
  type OrganizationVerdict,
  type OwnerAct,
  type SensitiveChange,
} from '../types/organization.js';

/** The house stands above every role and below the owners (ORG-007). */
export const HOUSE_HEIGHT = Number.MAX_SAFE_INTEGER;
const OWNER_HEIGHT = Number.POSITIVE_INFINITY;
const OUTSIDE_HEIGHT = -1;

const EVERY_PERMISSION: ReadonlySet<OrganizationAccess> = new Set(ORGANIZATION_PERMISSIONS);
const EVERYTHING: ReadonlySet<OrganizationAccess> = new Set([
  ...ORGANIZATION_PERMISSIONS,
  ...OWNER_ACTS,
]);
const NOTHING: ReadonlySet<OrganizationAccess> = new Set();

const OK: OrganizationVerdict = { ok: true };
const refuse = (refusal: OrganizationRefusal): OrganizationVerdict => ({ ok: false, refusal });

const nobody = (personId: string | null): ActorAccess => ({
  personId,
  permissions: NOTHING,
  height: OUTSIDE_HEIGHT,
  isOwner: false,
  isHouse: false,
});

const isBase = (role: OrganizationRole): boolean => role.position === BASE_ROLE_POSITION;

/** ORG-007: during the alpha and where the setting says always; on request, while a leave is open. */
export function houseMayEnter(access: HouseAccess, leaveOpen: boolean): boolean {
  if (access === 'alpha' || access === 'always') return true;
  return access === 'on-request' && leaveOpen;
}

/** STD-052: only owners set the house's access, and no organisation changes it during the alpha. */
export function canSetHouseAccess(actor: ActorAccess, current: HouseAccess): OrganizationVerdict {
  if (!actor.permissions.has('set-house-access')) return refuse('owners-only');
  return current === 'alpha' ? refuse('alpha') : OK;
}

function memberAccess(state: OrganizationState, member: OrganizationMember): ActorAccess {
  // ORG-001: the base role plus every role held from this organisation's list.
  const held = new Set(member.roleIds);
  const own = state.roles.filter((role) => isBase(role) || held.has(role.id));
  const granted = new Set<OrganizationAccess>(own.flatMap((role) => role.permissions));
  return {
    personId: member.personId,
    permissions: granted.has('administrator') ? EVERY_PERMISSION : granted,
    height: Math.max(OUTSIDE_HEIGHT, ...own.map((role) => role.position)),
    isOwner: false,
    isHouse: false,
  };
}

/**
 * What one actor may do in one organisation. An agent is worked out against
 * `responsible`, the access of the person who answers for it (ORG-011).
 */
export function accessOf(
  state: OrganizationState,
  actor: OrganizationActor,
  responsible?: ActorAccess,
): ActorAccess {
  if (actor.kind === 'outsider') return nobody(null);
  if (actor.kind === 'house') {
    if (!houseMayEnter(state.houseAccess, state.houseLeaveOpen)) return nobody(actor.personId);
    return {
      personId: actor.personId,
      permissions: EVERY_PERMISSION,
      height: HOUSE_HEIGHT,
      isOwner: false,
      isHouse: true,
    };
  }
  const { member } = actor;
  if (member.kind === 'human') {
    // ORG-002: owners are not a role; they hold everything.
    if (!member.isOwner) return memberAccess(state, member);
    return {
      personId: member.personId,
      permissions: EVERYTHING,
      height: OWNER_HEIGHT,
      isOwner: true,
      isHouse: false,
    };
  }
  // ORG-011: an agent never goes beyond its person, and is never an owner.
  if (!responsible) return nobody(member.personId);
  const own = memberAccess(state, member);
  return {
    ...own,
    permissions: new Set([...own.permissions].filter((p) => responsible.permissions.has(p))),
    height: Math.min(own.height, responsible.height),
  };
}

/** ORG-003 and ORG-004: give or take away a role. */
export function canAssignRole(
  actor: ActorAccess,
  target: ActorAccess,
  role: OrganizationRole,
): OrganizationVerdict {
  if (!actor.permissions.has('manage-roles')) return refuse('missing-permission');
  if (isBase(role)) return refuse('base-role');
  // Only an outsider has no personId, and an outsider holds no permission.
  if (actor.personId === target.personId) return refuse('own-roles');
  if (target.isOwner) return refuse('owner');
  if (role.position >= actor.height || target.height >= actor.height) return refuse('not-below');
  return OK;
}

/** ORG-003: edit a role below you; every permission whose state changes must be yours. */
export function canEditRole(
  actor: ActorAccess,
  role: OrganizationRole,
  nextPermissions: readonly OrganizationPermission[] = role.permissions,
): OrganizationVerdict {
  if (!actor.permissions.has('manage-roles')) return refuse('missing-permission');
  if (role.position >= actor.height) return refuse('not-below');
  const before = new Set(role.permissions);
  const after = new Set(nextPermissions);
  const changed = [
    ...[...before].filter((p) => !after.has(p)),
    ...[...after].filter((p) => !before.has(p)),
  ];
  if (changed.some((p) => !actor.permissions.has(p))) return refuse('grant-exceeds');
  return OK;
}

/** ORG-003 and the cap of STD-052: create a role, which goes just below yours. */
export function canCreateRole(actor: ActorAccess, state: OrganizationState): OrganizationVerdict {
  if (!actor.permissions.has('manage-roles')) return refuse('missing-permission');
  if (actor.height <= BASE_ROLE_POSITION) return refuse('not-below');
  const count = state.roles.filter((role) => !isBase(role)).length;
  if (count >= MAX_ORGANIZATION_ROLES) return refuse('role-limit');
  return OK;
}

/**
 * Where a new role goes: just below the creator's highest role, which moves up
 * one with every role above it (`raised`); owners and the house create at the top.
 */
export function placeForNewRole(
  actor: ActorAccess,
  roles: readonly OrganizationRole[],
): { readonly position: number; readonly raised: readonly string[] } {
  const top = Math.max(BASE_ROLE_POSITION, ...roles.map((role) => role.position)) + 1;
  if (actor.height >= top) return { position: top, raised: [] };
  return {
    position: actor.height,
    raised: roles.filter((role) => role.position >= actor.height).map((role) => role.id),
  };
}

/** ORG-003: delete a role below you; the base role stays. */
export function canDeleteRole(actor: ActorAccess, role: OrganizationRole): OrganizationVerdict {
  if (!actor.permissions.has('manage-roles')) return refuse('missing-permission');
  if (isBase(role)) return refuse('base-role');
  if (role.position >= actor.height) return refuse('not-below');
  return OK;
}

/** ORG-003: move a role; it and its new place stay below you, and the base role stays last. */
export function canMoveRole(
  actor: ActorAccess,
  role: OrganizationRole,
  toPosition: number,
): OrganizationVerdict {
  if (!actor.permissions.has('manage-roles')) return refuse('missing-permission');
  if (isBase(role) || toPosition <= BASE_ROLE_POSITION) return refuse('base-role');
  if (role.position >= actor.height || toPosition >= actor.height) return refuse('not-below');
  return OK;
}

const ACT_PERMISSION: Readonly<Record<MemberAct, OrganizationPermission>> = {
  remove: 'remove-members',
  ban: 'ban-members',
  mute: 'mute-members',
};

/** ORG-003 and ORG-004: remove, ban or mute a member below you; never an owner, never yourself. */
export function canActOnMember(
  actor: ActorAccess,
  target: ActorAccess,
  act: MemberAct,
): OrganizationVerdict {
  if (!actor.permissions.has(ACT_PERMISSION[act])) return refuse('missing-permission');
  if (actor.personId === target.personId) return refuse('self');
  if (target.isOwner) return refuse('owner');
  if (target.height >= actor.height) return refuse('not-below');
  return OK;
}

/** ORG-002: the acts no role carries. */
export function canDoOwnerAct(actor: ActorAccess, act: OwnerAct): OrganizationVerdict {
  return actor.permissions.has(act) ? OK : refuse('owners-only');
}

/** ORG-002: an organisation keeps one owner at least, so the last owner stays. */
export function canLeave(member: OrganizationMember, ownerCount: number): OrganizationVerdict {
  return member.isOwner && ownerCount <= 1 ? refuse('last-owner') : OK;
}

const SIGNED_AGAIN: ReadonlySet<OrganizationPermission> = new Set([
  'administrator',
  'manage-roles',
]);

/** ORG-008: what asks for a new wallet signature at that moment. */
export function needsFreshSignature(change: SensitiveChange): boolean {
  if (change.kind !== 'grant') return true;
  return change.permissions.some((p) => SIGNED_AGAIN.has(p));
}

const KNOWN: ReadonlySet<string> = new Set(ORGANIZATION_PERMISSIONS);
const COLOR = /^#[0-9a-f]{6}$/;

/** What is wrong with an organisation's list of roles, in words; empty when nothing is (STD-052). */
export function validateOrganizationRoles(roles: readonly OrganizationRole[]): readonly string[] {
  const problems: string[] = [];
  const bases = roles.filter(isBase);
  if (bases.length !== 1) {
    problems.push(`exactly one base role at position ${BASE_ROLE_POSITION}, found ${bases.length}`);
  }
  if (bases.some((role) => role.hoist)) problems.push('the base role is never shown apart');
  const taken = new Set<number>();
  for (const role of roles) {
    if (!Number.isInteger(role.position) || role.position < BASE_ROLE_POSITION) {
      problems.push(`${role.id}: position ${role.position} is not a whole number from 0`);
    } else if (taken.has(role.position)) {
      problems.push(`${role.id}: position ${role.position} is taken`);
    }
    taken.add(role.position);
    const unknown = role.permissions.filter((p) => !KNOWN.has(p));
    if (unknown.length > 0) problems.push(`${role.id}: unknown permission ${unknown.join(', ')}`);
    if (
      role.name !== role.name.trim() ||
      role.name.length === 0 ||
      role.name.length > ROLE_NAME_MAX
    ) {
      problems.push(
        `${role.id}: a name of 1 to ${ROLE_NAME_MAX} characters, with no spaces around it`,
      );
    }
    if (role.color !== null && !COLOR.test(role.color)) {
      problems.push(`${role.id}: a colour is #rrggbb in lower case, or none`);
    }
  }
  if (roles.length - bases.length > MAX_ORGANIZATION_ROLES) {
    problems.push(`more than ${MAX_ORGANIZATION_ROLES} roles`);
  }
  return problems;
}
