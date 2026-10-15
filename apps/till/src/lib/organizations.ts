/**
 * Organization roles in the till, the pure part (numinia-archive ADR-071; the
 * rules are STD-051, worked out by @numinia/domain): the house flag
 * numinia.com may send, the sentences of the desk's refusals — a refusal for
 * want of a permission names the roles that hold it, as MIS-179 asks — and
 * what the Saldo screen's «admin» stands for now that roles are each
 * organization's own.
 */

import {
  BASE_ROLE_POSITION,
  MAX_ORGANIZATION_ROLES,
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  type ActorAccess,
  type OrganizationAccess,
  type OrganizationRefusal,
  type OrganizationRole,
} from '@numinia/domain';

export const ORG_PROBLEMS = {
  house: 'house must be true or false',
  notHouse: 'only the house reads the directory of organizations',
  lastOwner: 'an organization keeps at least one owner',
  ownRoles: 'nobody changes their own roles: they may only leave',
  notBelow: 'you may act only on roles and members below your own highest role',
  owner: 'only the owners name or remove an owner',
  noAdministratorRole: 'no role of the organization carries administrator',
} as const;

/** Every act, in the register's order: the permissions, then the owners' acts. */
export const ACTS: readonly OrganizationAccess[] = [...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS];

const OWNERS_ONLY: ReadonlySet<OrganizationAccess> = new Set(OWNER_ACTS);

/** numinia.com's word that the caller is the house's staff: absent is false; a non-boolean is a problem. */
export function readHouse(value: unknown): boolean | undefined {
  if (value === undefined) return false;
  return typeof value === 'boolean' ? value : undefined;
}

/** Roles from the top of the list down. */
export function topDown(roles: readonly OrganizationRole[]): OrganizationRole[] {
  return [...roles].sort((a, b) => b.position - a.position);
}

/** The names of the roles that carry `act`, from the top down; none for an owners' act. */
export function holdersOf(roles: readonly OrganizationRole[], act: OrganizationAccess): string[] {
  if (OWNERS_ONLY.has(act)) return [];
  return topDown(roles)
    .filter((role) => role.permissions.some((held) => held === act || held === 'administrator'))
    .map((role) => role.name);
}

/** «A», «A and B», «A, B and C». */
export function listOf(names: readonly string[]): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** A refusal for want of `act`: the owners and the roles that hold it. */
export function needs(act: OrganizationAccess, holders: readonly string[]): string {
  if (holders.length === 0) return `this needs ${act}, which only the owners hold`;
  const noun = holders.length === 1 ? 'the role' : 'the roles';
  return `this needs ${act}, which the owners hold, and ${noun} ${listOf(holders)}`;
}

const REFUSALS: Readonly<Record<Exclude<OrganizationRefusal, 'missing-permission'>, string>> = {
  'not-below': ORG_PROBLEMS.notBelow,
  'own-roles': ORG_PROBLEMS.ownRoles,
  self: ORG_PROBLEMS.ownRoles,
  owner: ORG_PROBLEMS.owner,
  'base-role': 'everyone holds the base role: it is neither given nor taken away',
  'grant-exceeds': 'you may grant or take away only the permissions you hold',
  'role-limit': `an organization holds at most ${MAX_ORGANIZATION_ROLES} roles besides the base role`,
  'owners-only': 'only the owners may do this',
  'last-owner': ORG_PROBLEMS.lastOwner,
  alpha: "no organization changes the house's access during the alpha",
};

/** The words of a refusal of @numinia/domain about `act` in an organization with `roles`. */
export function refusalOf(
  refusal: OrganizationRefusal,
  act: OrganizationAccess,
  roles: readonly OrganizationRole[],
): string {
  return refusal === 'missing-permission' ? needs(act, holdersOf(roles, act)) : REFUSALS[refusal];
}

/** The Saldo screen's «admin»: an owner, the house, or whoever holds administrator. */
export function compatRole(access: ActorAccess): 'admin' | 'member' {
  return access.permissions.has('administrator') ? 'admin' : 'member';
}

/**
 * The role the Saldo screen's «make admin» gives: the highest role carrying
 * administrator below the actor's own highest role — or why there is none.
 */
export function administratorRoleFor(
  actor: ActorAccess,
  roles: readonly OrganizationRole[],
): OrganizationRole | string {
  const carrying = topDown(roles).filter(
    (role) => role.position > BASE_ROLE_POSITION && role.permissions.includes('administrator'),
  );
  if (carrying.length === 0) return ORG_PROBLEMS.noAdministratorRole;
  return carrying.find((role) => role.position < actor.height) ?? ORG_PROBLEMS.notBelow;
}
