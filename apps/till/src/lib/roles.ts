/**
 * What numinia.com sends the roles desk, read as untrusted (numinia-archive
 * STD-051 and STD-052): a role's id, its draft or its change, a position.
 * Pure — no database. A malformed field is a problem in words, never a
 * throw; the desk refuses with them and writes nothing.
 */

import {
  ORGANIZATION_PERMISSIONS,
  ROLE_NAME_MAX,
  type OrganizationPermission,
} from '@numinia/domain';

export const ROLE_PROBLEMS = {
  roleId: 'roleId must be a role id',
  role: 'role must be an object with name, color, hoist and permissions',
  change: 'change must be an object with at least one of name, color, hoist and permissions',
  name: `name must be 1 to ${ROLE_NAME_MAX} characters, none of them a control character`,
  color: 'color must be #rrggbb in lower case, or null',
  hoist: 'hoist must be true or false',
  permissions: 'permissions must be a list of the register’s permissions',
  position: 'position must be a whole number from 1 to 1000',
  baseFixed: 'the base role keeps its name and its place: only what it carries changes',
  noSuchRole: 'the organization has no such role',
  noSuchMember: 'that wallet is not a member of the organization',
} as const;

/** The highest place a role is asked to move to; an organization holds far fewer roles. */
export const POSITION_MAX = 1000;

const ROLE_ID = /^role_[0-9a-f]{16}$/;
const COLOR = /^#[0-9a-f]{6}$/;
// eslint-disable-next-line no-control-regex -- a name never holds a control character
const CONTROL = /[\u0000-\u001f\u007f]/;
const KNOWN: ReadonlySet<string> = new Set(ORGANIZATION_PERMISSIONS);

export interface RoleDraft {
  readonly name: string;
  readonly color: string | null;
  readonly hoist: boolean;
  readonly permissions: readonly OrganizationPermission[];
}

export type RoleChange = Partial<RoleDraft>;

export function readRoleId(value: unknown): string | undefined {
  return typeof value === 'string' && ROLE_ID.test(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A role's name, trimmed: 1 to 100 characters, none of them a control character. */
export function readRoleName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  const length = [...name].length;
  return length >= 1 && length <= ROLE_NAME_MAX && !CONTROL.test(name) ? name : undefined;
}

export function readColor(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' && COLOR.test(value) ? value : undefined;
}

/** The register's permissions, each once, in the register's order; undefined when anything else is in the list. */
export function readPermissions(value: unknown): OrganizationPermission[] | undefined {
  if (!Array.isArray(value) || value.length > ORGANIZATION_PERMISSIONS.length) return undefined;
  if (!value.every((key) => typeof key === 'string' && KNOWN.has(key))) return undefined;
  return ORGANIZATION_PERMISSIONS.filter((key) => value.includes(key));
}

export function readPosition(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= POSITION_MAX
    ? value
    : undefined;
}

const FIELDS = ['name', 'color', 'hoist', 'permissions'] as const;

/** A change to a role: only the fields sent, each read; the problems of every wrong one. */
export function readRoleChange(value: unknown): RoleChange | string[] {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !(FIELDS as readonly string[]).includes(key))
  ) {
    return [ROLE_PROBLEMS.change];
  }
  const sent = FIELDS.filter((field) => value[field] !== undefined);
  if (sent.length === 0) return [ROLE_PROBLEMS.change];
  const change: { -readonly [K in keyof RoleDraft]?: RoleDraft[K] } = {};
  const problems: string[] = [];
  if (sent.includes('name')) {
    const name = readRoleName(value['name']);
    if (name === undefined) problems.push(ROLE_PROBLEMS.name);
    else change.name = name;
  }
  if (sent.includes('color')) {
    const color = readColor(value['color']);
    if (color === undefined) problems.push(ROLE_PROBLEMS.color);
    else change.color = color;
  }
  if (sent.includes('hoist')) {
    if (typeof value['hoist'] === 'boolean') change.hoist = value['hoist'];
    else problems.push(ROLE_PROBLEMS.hoist);
  }
  if (sent.includes('permissions')) {
    const permissions = readPermissions(value['permissions']);
    if (permissions === undefined) problems.push(ROLE_PROBLEMS.permissions);
    else change.permissions = permissions;
  }
  return problems.length > 0 ? problems : change;
}

/** A new role: a name and what it carries; no colour and not shown apart unless said. */
export function readRoleDraft(value: unknown): RoleDraft | string[] {
  if (!isRecord(value)) return [ROLE_PROBLEMS.role];
  const change = readRoleChange(value);
  if (Array.isArray(change)) return change;
  if (change.name === undefined) return [ROLE_PROBLEMS.name];
  return {
    name: change.name,
    color: change.color ?? null,
    hoist: change.hoist ?? false,
    permissions: change.permissions ?? [],
  };
}
