/**
 * «La gente» (the panel's Miembros and Roles): what the two screens work out
 * from the till's answer about one organization (/api/saldo/roles) — what the
 * person may do there and who could instead, whom they may take out, how a
 * permission's switch stands, the search, a person's dot, the month they
 * came, a fresh role's name, and what each person chose to show (a name and
 * a face, optional fields an older till does not send).
 *
 * Pure: no fetch, no env, no zod, no DOM — the islands import it, and zod in
 * an island breaks the bundle budget. The rules are @numinia/domain's own
 * (resolvers/organization-access), the ones the till decides with: here they
 * only leave out of the screen what the person cannot do, so no button
 * fails. The till still decides on every write.
 */

import {
  BASE_ROLE_POSITION,
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  RANKS,
  accessOf,
  canActOnMember,
  canCreateRole,
  type ActorAccess,
  type OrganizationAccess,
  type OrganizationActor,
  type OrganizationPermission,
  type OrganizationState,
  type Rank,
} from '@numinia/domain';
import type { DeskAccess, DeskMemberDetail, DeskRole, DeskRoles } from './accounts';

/** The five groups the prototype sorts the permissions in, each in the register's order. */
type PermissionGroup = 'organization' | 'people' | 'gatherings' | 'venues' | 'money';

export const PERMISSION_GROUPS: readonly {
  readonly id: PermissionGroup;
  readonly permissions: readonly OrganizationPermission[];
}[] = [
  {
    id: 'organization',
    permissions: ['administrator', 'manage-organization', 'view-organization-log'],
  },
  {
    id: 'people',
    permissions: [
      'manage-roles',
      'invite-members',
      'remove-members',
      'ban-members',
      'mute-members',
    ],
  },
  { id: 'gatherings', permissions: ['create-rituals', 'manage-rituals'] },
  {
    id: 'venues',
    permissions: ['enter-worlds', 'build-in-worlds', 'start-stop-worlds', 'create-worlds'],
  },
  { id: 'money', permissions: ['view-balance', 'top-up', 'manage-balance'] },
];

/** The house's colours for a role (Saldo's own seven), `#rrggbb` in lower case as the till keeps them. */
export const SWATCHES: readonly string[] = [
  '#c0392b',
  '#d98324',
  '#c9a227',
  '#3d8b5f',
  '#2f7fa8',
  '#6b5ca5',
  '#a8477a',
];

const EVERY_ACT: readonly OrganizationAccess[] = [...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS];

/** What the person may do in this organization: the till's `access`, and the actor the rules weigh. */
export interface PeopleAccess {
  readonly access: DeskAccess;
  readonly actor: ActorAccess;
}

/** The organization as the domain's rules read it. The house enters during the alpha (ORG-007). */
function stateOf(view: DeskRoles): OrganizationState {
  return { roles: view.roles, houseAccess: 'alpha', houseLeaveOpen: false };
}

function actorOf(member: DeskMemberDetail): OrganizationActor {
  return {
    kind: 'member',
    member: {
      personId: member.wallet.toLowerCase(),
      kind: 'human',
      isOwner: member.owner,
      roleIds: member.roleIds,
    },
  };
}

/** The names of the roles that carry a permission — «Administrador» carries them all — in the order given. */
export function holdersIn(
  roles: readonly DeskRole[],
  permission: OrganizationPermission,
): string[] {
  return roles
    .filter((role) =>
      role.permissions.some((held) => held === permission || held === 'administrator'),
    )
    .map((role) => role.name);
}

/**
 * What `you` may do in the organization, worked out as the till does: an
 * owner everything, the house every permission (none of the owners' acts),
 * a member what the base role and the roles held carry; anyone the view
 * does not name, nothing. For every act, the roles that hold it.
 */
export function peopleAccess(view: DeskRoles, you: string | null): PeopleAccess {
  const wallet = you?.toLowerCase() ?? null;
  const state = stateOf(view);
  const member = view.members.find((entry) => entry.wallet.toLowerCase() === wallet);
  const actor =
    view.as === 'house'
      ? accessOf(state, { kind: 'house', personId: wallet ?? 'house' })
      : accessOf(state, member === undefined ? { kind: 'outsider' } : actorOf(member));
  const holders: Partial<Record<OrganizationAccess, string[]>> = {};
  for (const act of EVERY_ACT) {
    const isPermission = (ORGANIZATION_PERMISSIONS as readonly string[]).includes(act);
    holders[act] = isPermission ? holdersIn(view.roles, act as OrganizationPermission) : [];
  }
  return {
    access: {
      as: view.as,
      permissions: EVERY_ACT.filter((act) => actor.permissions.has(act)),
      holders,
    },
    actor,
  };
}

/** Whether the person may create a role: «Gestionar roles», above the base role, under the cap. */
export function mayCreateRole(people: PeopleAccess, view: DeskRoles): boolean {
  return canCreateRole(people.actor, stateOf(view)).ok;
}

/**
 * Whether the person may edit a role: the till's word (`mayEdit`) for a role
 * above the base one; the base role, which the till never marks, by whoever
 * manages roles from above it (only what it carries changes).
 */
export function mayEditRole(people: PeopleAccess, role: DeskRole): boolean {
  if (role.position !== BASE_ROLE_POSITION) return role.mayEdit;
  return people.actor.permissions.has('manage-roles') && people.actor.height > BASE_ROLE_POSITION;
}

/**
 * Whether the person may take this member out (`remove`), may leave
 * themselves (`leave`), or neither: anyone leaves but the last owner; only
 * an owner takes out another owner; anyone else needs «Quitar miembros» and
 * a member below them.
 */
export function removalOf(
  people: PeopleAccess,
  view: DeskRoles,
  member: DeskMemberDetail,
): 'leave' | 'remove' | null {
  const wallet = member.wallet.toLowerCase();
  if (wallet === people.actor.personId) {
    const owners = view.members.filter((entry) => entry.owner).length;
    return member.owner && owners <= 1 ? null : 'leave';
  }
  if (member.owner) return people.actor.permissions.has('manage-owners') ? 'remove' : null;
  const target = accessOf(stateOf(view), actorOf(member));
  return canActOnMember(people.actor, target, 'remove').ok ? 'remove' : null;
}

/** How a permission's switch stands in a role's draft, and why it cannot be flipped. */
export interface SwitchState {
  readonly on: boolean;
  readonly disabled: boolean;
  /** `admin`: given by «Administrador»; `not-held`: the person does not hold it. */
  readonly why: 'admin' | 'not-held' | null;
}

export function switchOf(
  permission: OrganizationPermission,
  draft: readonly OrganizationPermission[],
  people: PeopleAccess,
  editable: boolean,
): SwitchState {
  if (permission !== 'administrator' && draft.includes('administrator')) {
    return { on: true, disabled: true, why: 'admin' };
  }
  const on = draft.includes(permission);
  if (!editable) return { on, disabled: true, why: null };
  if (!people.actor.permissions.has(permission)) return { on, disabled: true, why: 'not-held' };
  return { on, disabled: false, why: null };
}

/** The draft with one permission flipped, in the register's order. */
export function toggled(
  draft: readonly OrganizationPermission[],
  permission: OrganizationPermission,
): OrganizationPermission[] {
  return ORGANIZATION_PERMISSIONS.filter((held) => draft.includes(held) !== (held === permission));
}

/** Whether two lists of permissions hold the same ones, whatever the order. */
export function sameSet(
  a: readonly OrganizationPermission[],
  b: readonly OrganizationPermission[],
): boolean {
  return a.length === b.length && a.every((held) => b.includes(held));
}

/**
 * A member as the till may send it: besides the contract's fields, what the
 * person chose to show to the organization — optional, and read here as
 * unknown, since a till without them (or with anything else) must still
 * draw today's wallet-only row.
 */
type ShownMember = DeskMemberDetail & { readonly name?: unknown; readonly face?: unknown };

/** What a person chose to show: a name and a face, each one or nothing. */
interface Shown {
  readonly name: string | null;
  readonly face: string | null;
}

/** The longest name the till accepts. */
const NAME_MAX = 60;
/** Control characters, and the invisible marks that turn text around (bidi). */
const CONTROLS = /\p{Cc}/gu;
const BIDI = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu;
/** A thumbnail this site serves: a path under /thumbs/, plain segments only (no `..`, no query). */
const FACE_SHAPE = /^\/thumbs\/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

function nameOf(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(CONTROLS, ' ').replace(BIDI, '').replace(/\s+/gu, ' ').trim();
  if (clean === '') return null;
  return Array.from(clean).slice(0, NAME_MAX).join('').trimEnd();
}

/** The name and the face a person chose, or null for each that is absent or out of shape. */
export function shownOf(member: ShownMember): Shown {
  const { name, face } = member;
  return {
    name: nameOf(name),
    face: typeof face === 'string' && face.length <= 200 && FACE_SHAPE.test(face) ? face : null,
  };
}

/** The table's short form typed back: `0x1234…abcd` or `0x1234...abcd`. */
const SHORT_FORM = /^(0x[0-9a-f]*)(?:…|\.\.\.)([0-9a-f]*)$/;

/** Whether a member answers the search: any part of the wallet, its short form, or the name chosen. */
export function matchesSearch(member: ShownMember, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') return true;
  const wallet = member.wallet.toLowerCase();
  if (wallet.includes(wanted)) return true;
  const short = SHORT_FORM.exec(wanted);
  if (short !== null) {
    const [head, tail] = short.slice(1) as [string, string];
    if (wallet.startsWith(head) && wallet.endsWith(tail)) return true;
  }
  return shownOf(member).name?.toLowerCase().includes(wanted) ?? false;
}

/** The colour of the highest coloured role a person holds, drawn as a dot; null for none. */
export function dotOf(member: DeskMemberDetail, roles: readonly DeskRole[]): string | null {
  let top: DeskRole | null = null;
  for (const role of roles) {
    if (role.color === null || !member.roleIds.includes(role.id)) continue;
    if (top === null || role.position > top.position) top = role;
  }
  return top?.color ?? null;
}

/** The month a person came in, in the reader's language («sept 2026»); null for a date that is none. */
export function monthOf(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * GET /api/saldo/ranks's answer read by hand (no zod in an island): each
 * wallet, in lower case, and its rank in the city — null where the answer
 * names none the city knows. Null when the body is not that answer.
 */
export function readRanks(json: unknown): Readonly<Record<string, Rank | null>> | null {
  if (typeof json !== 'object' || json === null) return null;
  const { ok, ranks } = json as { readonly ok?: unknown; readonly ranks?: unknown };
  if (ok !== true || typeof ranks !== 'object' || ranks === null || Array.isArray(ranks)) {
    return null;
  }
  const known: readonly string[] = RANKS;
  const read: Record<string, Rank | null> = {};
  for (const [wallet, rank] of Object.entries(ranks as Readonly<Record<string, unknown>>)) {
    read[wallet.toLowerCase()] =
      typeof rank === 'string' && known.includes(rank) ? (rank as Rank) : null;
  }
  return read;
}

/** The roles the person may give this member and the member does not hold, in the list's order. */
export function rolesToGive(member: DeskMemberDetail, roles: readonly DeskRole[]): DeskRole[] {
  return roles.filter(
    (role) => member.assignable.includes(role.id) && !member.roleIds.includes(role.id),
  );
}

/** Who holds a role; the base role is everyone's. */
export function holdersOfRole(view: DeskRoles, role: DeskRole): DeskMemberDetail[] {
  if (role.position === BASE_ROLE_POSITION) return [...view.members];
  return view.members.filter((member) => member.roleIds.includes(role.id));
}

/** The members without a role whom the person may give it to. */
export function peopleToGive(view: DeskRoles, role: DeskRole): DeskMemberDetail[] {
  return view.members.filter(
    (member) => !member.roleIds.includes(role.id) && member.assignable.includes(role.id),
  );
}

/** The owners: not a role, named apart. */
export function ownersOf(view: DeskRoles): DeskMemberDetail[] {
  return view.members.filter((member) => member.owner);
}

/** The role the editor opens on: the one asked for, or the top one. */
export function chosenRole(roles: readonly DeskRole[], id: string | null): DeskRole | null {
  return roles.find((role) => role.id === id) ?? roles[0] ?? null;
}

/** A fresh role's name that repeats none of the list's: «Rol nuevo», «Rol nuevo 2», … */
export function freshRoleName(base: string, roles: readonly DeskRole[]): string {
  const taken = new Set(roles.map((role) => role.name.trim().toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n += 1) name = `${base} ${n}`;
  return name;
}

/** The role the till added between two answers, or null. */
export function newRoleId(before: DeskRoles, after: DeskRoles): string | null {
  const known = new Set(before.roles.map((role) => role.id));
  return after.roles.find((role) => !known.has(role.id))?.id ?? null;
}

/** The swatches to offer: the house's, and first the role's own when it is another. */
export function swatchesFor(color: string | null): readonly string[] {
  return color === null || SWATCHES.includes(color) ? SWATCHES : [color, ...SWATCHES];
}

/** A count in words, one and many apart where the language does (`{n}` is the number). */
export function plural(
  n: number,
  forms: { readonly one: string; readonly other: string },
  locale: string,
): string {
  const form = new Intl.PluralRules(locale).select(n) === 'one' ? forms.one : forms.other;
  return form.replace('{n}', new Intl.NumberFormat(locale).format(n));
}
