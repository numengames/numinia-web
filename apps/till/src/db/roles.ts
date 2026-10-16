/**
 * The roles desk's database work (numinia-archive ADR-071; the rules are
 * STD-051 ORG-003 and ORG-004, worked out by @numinia/domain from the tables
 * as they are now): reading an organization's roles with who holds them,
 * creating, editing, moving and deleting a role, giving or taking one from a
 * member, and reading the organization's log.
 *
 * Every change is one guarded batch (src/db/organizations.ts `commit`): it
 * writes only if the organization is as it was read, raises the revision
 * last, and writes its line in the log — whose actor and, for the house's
 * staff, house mark are the organization's record (ORG-009). Every argument
 * comes from a browser through numinia.com and is read as untrusted
 * (src/lib/roles.ts); a refusal is an answer with problems in words, never
 * a throw.
 */

import {
  BASE_ROLE_POSITION,
  canAssignRole,
  canCreateRole,
  canDeleteRole,
  canEditRole,
  canMoveRole,
  placeForNewRole,
  type OrganizationPermission,
  type OrganizationRole,
} from '@numinia/domain';
import { readAccountId, readMemberWallet, readWallet } from '../lib/accounts';
import { ORG_PROBLEMS, readHouse, refusalOf, topDown } from '../lib/organizations';
import {
  ROLE_PROBLEMS,
  readPosition,
  readRoleChange,
  readRoleDraft,
  readRoleId,
  type RoleDraft,
} from '../lib/roles';
import {
  PROBLEMS,
  enter,
  houseRead,
  lacking,
  refuse,
  roleId,
  type Entered,
  type Refusal,
} from './accounts';
import {
  DELETE_ROLE,
  GIVE_ROLE,
  INSERT_ROLE,
  LIFT_ROLE,
  PLACE_ROLE,
  SELECT_LOG,
  TAKE_ROLE,
  UPDATE_ROLE,
  accessIn,
  actingIn,
  commit,
  loadOrganization,
  logLine,
  memberIn,
  whole,
  type ActingAs,
  type LogAct,
  type Organization,
} from './organizations';
import { column, instant, text, type Row, type TillDatabase } from './repository';
import { publishedIn } from './profiles';

/** A role as the panel draws it. */
export interface RoleDetail {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly position: number;
  readonly hoist: boolean;
  readonly permissions: readonly OrganizationPermission[];
  /** How many members hold it; every member holds the base role. */
  readonly members: number;
  /** Whether the one asking may edit, move or delete it (never the base role's name or place). */
  readonly mayEdit: boolean;
}

/** A member as the panel draws it. */
export interface MemberDetail {
  readonly wallet: string;
  readonly owner: boolean;
  readonly addedAt: string;
  /** The roles held besides the base role. */
  readonly roleIds: readonly string[];
  /** The roles the one asking may give to or take from this member. */
  readonly assignable: readonly string[];
  /**
   * What the member published (cut «Tu nombre y tu cara», STD-053): the name
   * fellow members read and the Bazar avatar's id, or null for none. Absent,
   * both, when the member published nothing.
   */
  readonly name?: string;
  readonly avatar?: string | null;
}

export interface RolesView {
  readonly ok: true;
  readonly accountId: string;
  readonly as: ActingAs;
  /** From the top down, the base role last. */
  readonly roles: readonly RoleDetail[];
  /** Owners first, then by arrival. */
  readonly members: readonly MemberDetail[];
}

export type RolesAnswer = RolesView | Refusal;

export interface LogEntry {
  readonly seq: number;
  readonly at: string;
  readonly actor: string;
  readonly asHouse: boolean;
  readonly act: LogAct;
  readonly subject: string | null;
  readonly detail: Readonly<Record<string, string>> | null;
}

export type LogAnswer =
  { readonly ok: true; readonly accountId: string; readonly lines: readonly LogEntry[] } | Refusal;

/** Reads the wallet, the organization and the house flag, adds the problems already found, and enters. */
export async function entering(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  found: readonly string[] = [],
): Promise<Entered | Refusal> {
  const wallet = readWallet(sentWallet);
  const accountId = readAccountId(sentAccount);
  const house = readHouse(sentHouse);
  if (wallet === undefined || accountId === undefined || house === undefined || found.length > 0) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...found,
    );
  }
  return enter(db, wallet, accountId, house);
}

/**
 * The organization as the one who entered it may handle its roles, each
 * member with what they published, if anything (cut «Tu nombre y tu cara»):
 * this view is answered only to members and to the house, never a stranger.
 */
async function viewOf(db: TillDatabase, { org, acting }: Entered): Promise<RolesView> {
  const { access } = acting;
  const published = await publishedIn(db, org.accountId);
  return {
    ok: true,
    accountId: org.accountId,
    as: acting.as,
    roles: topDown(org.state.roles).map((role) => {
      const base = role.position === BASE_ROLE_POSITION;
      return {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        hoist: role.hoist,
        permissions: role.permissions,
        members: base
          ? org.members.length
          : org.members.filter((member) => member.roleIds.includes(role.id)).length,
        mayEdit: !base && canEditRole(access, role).ok,
      };
    }),
    members: [...org.members]
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
      .map((member) => {
        const target = accessIn(org, member.personId);
        return {
          wallet: member.personId,
          owner: member.isOwner,
          addedAt: member.addedAt,
          roleIds: member.roleIds,
          assignable: org.state.roles
            .filter((role) => canAssignRole(access, target, role).ok)
            .map((role) => role.id),
          ...published.get(member.personId),
        };
      }),
  };
}

/** The same organization read again after a change, as the same person enters it. */
async function reread(db: TillDatabase, { org, acting }: Entered): Promise<RolesAnswer> {
  const fresh = (await loadOrganization(db, org.accountId)) as Organization;
  const again = actingIn(fresh, acting.wallet, acting.as === 'house') ?? acting;
  return viewOf(db, { org: fresh, acting: again });
}

/** Runs a change and answers the organization as it is now, or that it changed meanwhile. */
async function written(
  db: TillDatabase,
  entered: Entered,
  statements: readonly D1PreparedStatement[],
): Promise<RolesAnswer> {
  if (!(await commit(db, entered.org, statements))) return refuse(PROBLEMS.meanwhile);
  return reread(db, entered);
}

/** The organization's roles with who holds them: to any member, and the house where it may enter. */
export async function rolesOf(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<RolesAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  await houseRead(entered, db, now, 'roles');
  return viewOf(db, entered);
}

const find = (org: Organization, id: string): OrganizationRole | undefined =>
  org.state.roles.find((role) => role.id === id);

/** The statements that put roles at new places: lifted out of the way, then set. */
function moves(
  db: TillDatabase,
  org: Organization,
  places: readonly (readonly [string, number])[],
): D1PreparedStatement[] {
  return [
    ...places.map(([id]) => db.prepare(LIFT_ROLE).bind(org.accountId, id, org.revision)),
    ...places.map(([id, position]) =>
      db.prepare(PLACE_ROLE).bind(org.accountId, id, position, org.revision),
    ),
  ];
}

/**
 * The role `id` of the organization the one who entered may work on — or the
 * refusal for want of such a role. The id is read first; a stranger to the
 * organization never learns whether a role exists.
 */
function roleFor(
  entered: Entered,
  sentRole: unknown,
): { readonly role: OrganizationRole } | Refusal {
  const id = readRoleId(sentRole);
  if (id === undefined) return refuse(ROLE_PROBLEMS.roleId);
  const role = find(entered.org, id);
  return role === undefined ? refuse(ROLE_PROBLEMS.noSuchRole) : { role };
}

/** The permissions added to and taken from a role, as log words. */
function permissionDelta(
  before: readonly OrganizationPermission[],
  after: readonly OrganizationPermission[],
): Record<string, string> {
  const added = after.filter((key) => !before.includes(key));
  const removed = before.filter((key) => !after.includes(key));
  return {
    ...(added.length > 0 ? { added: added.join(',') } : {}),
    ...(removed.length > 0 ? { removed: removed.join(',') } : {}),
  };
}

/** Creates a role just below the creator's highest one: whoever may manage roles, giving only what they hold. */
export async function createRole(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentRole: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<RolesAnswer> {
  const draft = readRoleDraft(sentRole);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    Array.isArray(draft) ? draft : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const { name, color, hoist, permissions } = draft as RoleDraft;
  const allowed = canCreateRole(acting.access, org.state);
  if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
  if (permissions.some((key) => !acting.access.permissions.has(key))) {
    return refuse(refusalOf('grant-exceeds', 'manage-roles', org.state.roles));
  }
  const place = placeForNewRole(acting.access, org.state.roles);
  const raised = place.raised.map(
    (id) => [id, (find(org, id) as OrganizationRole).position + 1] as const,
  );
  const id = roleId();
  return written(db, entered, [
    ...moves(db, org, raised),
    db
      .prepare(INSERT_ROLE)
      .bind(
        org.accountId,
        id,
        name,
        color,
        place.position,
        hoist ? 1 : 0,
        JSON.stringify(permissions),
        org.revision,
      ),
    logLine(db, org.accountId, now, acting, 'role-created', null, { role: id, name }, org.revision),
  ]);
}

/**
 * Edits a role below the editor's highest: its name, colour, whether its
 * members are shown apart, and what it carries — every permission that
 * changes must be one the editor holds. The base role keeps its name and
 * only its permissions change.
 */
export async function editRole(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentRole: unknown,
  sentChange: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<RolesAnswer> {
  const change = readRoleChange(sentChange);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    Array.isArray(change) ? change : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = roleFor(entered, sentRole);
  if ('problems' in found) return found;
  const { role } = found;
  const next = Array.isArray(change) ? {} : change;
  const permissions = next.permissions ?? role.permissions;
  const allowed = canEditRole(acting.access, role, permissions);
  if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
  const base = role.position === BASE_ROLE_POSITION;
  if (base && (next.name !== undefined || next.color !== undefined || next.hoist !== undefined)) {
    return refuse(ROLE_PROBLEMS.baseFixed);
  }
  const after = {
    name: next.name ?? role.name,
    color: next.color === undefined ? role.color : next.color,
    hoist: next.hoist ?? role.hoist,
    permissions,
  };
  const delta = permissionDelta(role.permissions, permissions);
  const fields = [
    ...(after.name === role.name ? [] : ['name']),
    ...(after.color === role.color ? [] : ['color']),
    ...(after.hoist === role.hoist ? [] : ['hoist']),
    ...(Object.keys(delta).length > 0 ? ['permissions'] : []),
  ];
  if (fields.length === 0) return viewOf(db, entered);
  return written(db, entered, [
    db
      .prepare(UPDATE_ROLE)
      .bind(
        org.accountId,
        role.id,
        after.name,
        after.color,
        after.hoist ? 1 : 0,
        JSON.stringify(after.permissions),
        org.revision,
      ),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'role-edited',
      null,
      { role: role.id, name: after.name, fields: fields.join(','), ...delta },
      org.revision,
    ),
  ]);
}

/**
 * Moves a role to `position`, the roles between it and there making room;
 * both its old place and its new one stay below the mover's highest role.
 */
export async function moveRole(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentRole: unknown,
  sentPosition: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<RolesAnswer> {
  const position = readPosition(sentPosition);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    position === undefined ? [ROLE_PROBLEMS.position] : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = roleFor(entered, sentRole);
  if ('problems' in found) return found;
  const { role } = found;
  const requested = position as number;
  const allowed = canMoveRole(acting.access, role, requested);
  if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
  // Never beyond the top of the list: a gap would hold no role.
  const top = Math.max(...org.state.roles.map((held) => held.position));
  const to = Math.min(requested, top);
  if (to === role.position) return viewOf(db, entered);
  const up = to > role.position;
  const shifted = org.state.roles
    .filter((held) =>
      up
        ? held.position > role.position && held.position <= to
        : held.position >= to && held.position < role.position,
    )
    .map((held) => [held.id, held.position + (up ? -1 : 1)] as const);
  return written(db, entered, [
    ...moves(db, org, [...shifted, [role.id, to]]),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'role-moved',
      null,
      { role: role.id, name: role.name, from: String(role.position), to: String(to) },
      org.revision,
    ),
  ]);
}

/** Deletes a role below the deleter's highest; whoever held it simply loses it. The base role stays. */
export async function deleteRole(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentRole: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<RolesAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = roleFor(entered, sentRole);
  if ('problems' in found) return found;
  const { role } = found;
  const allowed = canDeleteRole(acting.access, role);
  if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
  return written(db, entered, [
    db.prepare(DELETE_ROLE).bind(org.accountId, role.id, org.revision),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'role-deleted',
      null,
      { role: role.id, name: role.name },
      org.revision,
    ),
  ]);
}

/** Gives a role to a member, or takes it from them: only below one's own highest role, never to oneself or an owner. */
export async function assignRole(
  db: TillDatabase,
  give: boolean,
  sentWallet: unknown,
  sentAccount: unknown,
  sentMember: unknown,
  sentRole: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<RolesAnswer> {
  const member = readMemberWallet(sentMember);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    member === undefined ? [PROBLEMS.memberWallet] : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = roleFor(entered, sentRole);
  if ('problems' in found) return found;
  const { role } = found;
  const target = memberIn(org, member as string);
  if (target === undefined) return refuse(ROLE_PROBLEMS.noSuchMember);
  const allowed = canAssignRole(acting.access, accessIn(org, target.personId), role);
  if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
  if (target.roleIds.includes(role.id) === give) return viewOf(db, entered);
  return written(db, entered, [
    db
      .prepare(give ? GIVE_ROLE : TAKE_ROLE)
      .bind(org.accountId, target.personId, role.id, org.revision),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      give ? 'role-given' : 'role-taken',
      target.personId,
      { role: role.id },
      org.revision,
    ),
  ]);
}

/** A `team_log` row as the panel reads it. */
function entryOf(row: Row): LogEntry {
  const detail = column(row, 'detail');
  const subject = column(row, 'subject');
  return {
    seq: whole(row, 'seq'),
    at: instant(row, 'at'),
    actor: text(row, 'actor'),
    asHouse: whole(row, 'as_house') === 1,
    act: text(row, 'act') as LogAct,
    subject: subject === null ? null : text(row, 'subject'),
    detail: typeof detail === 'string' ? (JSON.parse(detail) as Record<string, string>) : null,
  };
}

/** The organization's last hundred changes, newest first: to whoever may view its log. */
export async function logOf(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<LogAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  const refused = lacking(entered, 'view-organization-log');
  if (refused !== null) return refused;
  await houseRead(entered, db, now, 'log');
  const { results } = await db.prepare(SELECT_LOG).bind(entered.org.accountId).all<Row>();
  return { ok: true, accountId: entered.org.accountId, lines: results.map(entryOf) };
}
