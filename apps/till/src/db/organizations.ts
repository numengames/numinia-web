/**
 * Organizations as the account desk reads and changes them (numinia-archive
 * ADR-071; the rules are STD-051, the register STD-052): an organization's
 * roles, its members with the roles they hold, who is acting — an owner, the
 * house's staff or a member — and the lines of its log.
 *
 * What anyone may do is worked out by @numinia/domain from what is read here,
 * at every request (ORG-005), and every statement names its organization
 * (ORG-006). Every write is guarded by the revision it read and raises it
 * last, in one batch: a change made meanwhile makes the whole batch write
 * nothing, and the desk says so.
 */

import {
  HOUSE_ACCESS_SETTINGS,
  ORGANIZATION_PERMISSIONS,
  accessOf,
  houseMayEnter,
  type ActorAccess,
  type HouseAccess,
  type OrganizationMember,
  type OrganizationPermission,
  type OrganizationRole,
  type OrganizationState,
} from '@numinia/domain';
import { column, instant, text, type Row, type TillDatabase } from './repository';

/** A member as the till keeps them: the wallet stands for the person until people have ids of their own (MIS-179). */
export interface TeamMember extends OrganizationMember {
  readonly addedAt: string;
}

export interface Organization {
  readonly accountId: string;
  readonly name: string;
  readonly balanceCents: number;
  /** What every guarded write compares, and the last statement raises. */
  readonly revision: number;
  readonly state: OrganizationState;
  /** Oldest first. */
  readonly members: readonly TeamMember[];
}

/** On whose behalf someone acts: their own as an owner or a member, or the house's. */
export type ActingAs = 'owner' | 'house' | 'member';

export interface Acting {
  readonly wallet: string;
  readonly as: ActingAs;
  readonly access: ActorAccess;
}

export type LogAct =
  | 'organization-created'
  | 'organization-renamed'
  | 'member-added'
  | 'member-removed'
  | 'member-left'
  | 'role-given'
  | 'role-taken'
  | 'topup-started'
  | 'house-read'
  | 'role-created'
  | 'role-edited'
  | 'role-moved'
  | 'role-deleted'
  | 'settings-changed'
  | 'agent-created'
  | 'agent-enabled'
  | 'agent-disabled'
  | 'agent-state'
  | 'agent-removed'
  | 'agent-role-given'
  | 'agent-role-taken'
  | 'request-accepted'
  | 'request-declined'
  | 'ritual-created'
  | 'ritual-cancelled';

const KNOWN: ReadonlySet<unknown> = new Set(ORGANIZATION_PERMISSIONS);
const SETTINGS: ReadonlySet<unknown> = new Set(HOUSE_ACCESS_SETTINGS);

/** The revision the organization ?1 holds now: what a guarded statement compares. */
const REVISION = '(SELECT revision FROM team_profiles WHERE account_id = ?1)';

const SELECT_PROFILE = `
  SELECT name, house_access, revision,
         (SELECT coalesce(SUM(amount_cents), 0) FROM ledger_lines WHERE account_id = ?1)
           AS balance_cents
    FROM team_profiles WHERE account_id = ?1`;

const SELECT_ROLES = `
  SELECT id, name, color, position, hoist, permissions FROM team_roles
   WHERE account_id = ?1 ORDER BY position DESC`;

const SELECT_MEMBERS = `
  SELECT wallet, owner, added_at FROM team_members WHERE account_id = ?1 ORDER BY added_at, wallet`;

const SELECT_HELD = 'SELECT wallet, role_id FROM team_member_roles WHERE account_id = ?1';

/** A member ?2 joins ?1 with no role but the base one; the legacy role ?3 is written for a Worker still reading it. */
export const ADD_MEMBER = `
  INSERT INTO team_members (account_id, wallet, role, added_by, added_at, owner)
  SELECT ?1, ?2, ?3, ?4, ?5, 0 WHERE ${REVISION} = ?6`;

export const MIRROR_ROLE = `
  UPDATE team_members SET role = ?3 WHERE account_id = ?1 AND wallet = ?2 AND ${REVISION} = ?4`;

export const GIVE_ROLE = `
  INSERT INTO team_member_roles (account_id, wallet, role_id)
  SELECT ?1, ?2, ?3 WHERE ${REVISION} = ?4`;

export const TAKE_ROLE = `
  DELETE FROM team_member_roles
   WHERE account_id = ?1 AND wallet = ?2 AND role_id = ?3 AND ${REVISION} = ?4`;

export const INSERT_ROLE = `
  INSERT INTO team_roles (account_id, id, name, color, position, hoist, permissions)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE ${REVISION} = ?8`;

export const UPDATE_ROLE = `
  UPDATE team_roles SET name = ?3, color = ?4, hoist = ?5, permissions = ?6
   WHERE account_id = ?1 AND id = ?2 AND ${REVISION} = ?7`;

export const DELETE_ROLE = `
  DELETE FROM team_roles WHERE account_id = ?1 AND id = ?2 AND ${REVISION} = ?3`;

/**
 * Roles change places in two steps, because each place is held by one role
 * only (UNIQUE) and a statement checks it row by row: first every role that
 * moves is lifted out of the way, then each is set at its new place.
 */
export const LIFT = 1_000_000;

export const LIFT_ROLE = `
  UPDATE team_roles SET position = position + ${LIFT}
   WHERE account_id = ?1 AND id = ?2 AND ${REVISION} = ?3`;

export const PLACE_ROLE = `
  UPDATE team_roles SET position = ?3 WHERE account_id = ?1 AND id = ?2 AND ${REVISION} = ?4`;

export const SELECT_LOG = `
  SELECT seq, at, actor, as_house, act, subject, detail FROM team_log
   WHERE account_id = ?1 ORDER BY seq DESC LIMIT 100`;

export const DROP_MEMBER = `
  DELETE FROM team_members WHERE account_id = ?1 AND wallet = ?2 AND ${REVISION} = ?3`;

/** The last statement of every change: raises the revision it read, or changes nothing. */
const RAISE_REVISION = `
  UPDATE team_profiles SET revision = revision + 1 WHERE account_id = ?1 AND revision = ?2`;

/** A rename is the change and the raise at once. */
export const RENAME = `
  UPDATE team_profiles SET name = ?3, revision = revision + 1
   WHERE account_id = ?1 AND revision = ?2`;

const INSERT_LOG = `
  INSERT INTO team_log (account_id, at, actor, as_house, act, subject, detail)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE ?8 IS NULL OR ${REVISION} = ?8`;

/** A whole number from the database, or a throw: the till fails closed on a row the schema does not promise. */
export function whole(row: Row, name: string): number {
  const value = column(row, name);
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`till database: ${name} is not a whole number`);
  }
  return value;
}

/** A `team_roles` row as @numinia/domain's role. */
function roleOf(row: Row): OrganizationRole {
  const permissions: unknown = JSON.parse(text(row, 'permissions'));
  if (!Array.isArray(permissions) || !permissions.every((key) => KNOWN.has(key))) {
    throw new TypeError("till database: a role carries only STD-052's permissions");
  }
  const color = column(row, 'color');
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    color: color === null ? null : text(row, 'color'),
    position: whole(row, 'position'),
    hoist: whole(row, 'hoist') === 1,
    permissions: permissions as OrganizationPermission[],
  };
}

export function houseAccessOf(value: string): HouseAccess {
  if (!SETTINGS.has(value)) throw new TypeError(`till database: unknown house access ${value}`);
  return value as HouseAccess;
}

/** The organization `accountId`, read in one batch; null when no organization has that id. */
export async function loadOrganization(
  db: TillDatabase,
  accountId: string,
): Promise<Organization | null> {
  const [profiles, roles, members, held] = (
    await db.batch<Row>([
      db.prepare(SELECT_PROFILE).bind(accountId),
      db.prepare(SELECT_ROLES).bind(accountId),
      db.prepare(SELECT_MEMBERS).bind(accountId),
      db.prepare(SELECT_HELD).bind(accountId),
    ])
  ).map((result) => result.results) as [Row[], Row[], Row[], Row[]];
  const profile = profiles[0];
  if (profile === undefined) return null;
  const heldBy = new Map<string, string[]>();
  for (const row of held) {
    const holder = text(row, 'wallet');
    heldBy.set(holder, [...(heldBy.get(holder) ?? []), text(row, 'role_id')]);
  }
  return {
    accountId,
    name: text(profile, 'name'),
    balanceCents: whole(profile, 'balance_cents'),
    revision: whole(profile, 'revision'),
    state: {
      roles: roles.map(roleOf),
      houseAccess: houseAccessOf(text(profile, 'house_access')),
      // A leave asked of the owners belongs to `on-request`, which no organization holds yet.
      houseLeaveOpen: false,
    },
    members: members.map((row) => {
      const wallet = text(row, 'wallet');
      return {
        personId: wallet,
        kind: 'human',
        isOwner: whole(row, 'owner') === 1,
        roleIds: heldBy.get(wallet) ?? [],
        addedAt: instant(row, 'added_at'),
      };
    }),
  };
}

export function memberIn(org: Organization, wallet: string): TeamMember | undefined {
  return org.members.find((member) => member.personId === wallet);
}

/** What `wallet` holds in the organization as a member; an outsider holds nothing. */
export function accessIn(org: Organization, wallet: string): ActorAccess {
  const member = memberIn(org, wallet);
  return accessOf(
    org.state,
    member === undefined ? { kind: 'outsider' } : { kind: 'member', member },
  );
}

/**
 * On whose behalf `wallet` acts: as an owner first; then as the house's
 * staff, when numinia.com vouches for it (`house`) and the organization lets
 * the house in (ORG-007); then as a member. Null: a stranger to it.
 */
export function actingIn(org: Organization, wallet: string, house: boolean): Acting | null {
  const member = memberIn(org, wallet);
  if (member?.isOwner === true) {
    return { wallet, as: 'owner', access: accessOf(org.state, { kind: 'member', member }) };
  }
  if (house && houseMayEnter(org.state.houseAccess, org.state.houseLeaveOpen)) {
    return {
      wallet,
      as: 'house',
      access: accessOf(org.state, { kind: 'house', personId: wallet }),
    };
  }
  if (member === undefined) return null;
  return { wallet, as: 'member', access: accessOf(org.state, { kind: 'member', member }) };
}

/** One line of an organization's log; `guard` is the revision it must still hold, or null for a read. */
export function logLine(
  db: TillDatabase,
  accountId: string,
  at: Date,
  by: Pick<Acting, 'wallet' | 'as'>,
  act: LogAct,
  subject: string | null,
  detail: Readonly<Record<string, string>> | null,
  guard: number | null,
): D1PreparedStatement {
  return db
    .prepare(INSERT_LOG)
    .bind(
      accountId,
      at.toISOString(),
      by.wallet,
      by.as === 'house' ? 1 : 0,
      act,
      subject,
      detail === null ? null : JSON.stringify(detail),
      guard,
    );
}

/**
 * Runs a change: `statements`, each guarded by `org.revision`, then `last`
 * (by default the raise of the revision). False when the organization changed
 * meanwhile, and then nothing was written.
 */
export async function commit(
  db: TillDatabase,
  org: Organization,
  statements: readonly D1PreparedStatement[],
  last: D1PreparedStatement = db.prepare(RAISE_REVISION).bind(org.accountId, org.revision),
): Promise<boolean> {
  const results = await db.batch([...statements, last]);
  return results.at(-1)?.meta.changes === 1;
}
