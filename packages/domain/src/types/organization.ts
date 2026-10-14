/**
 * Organisations — roles as a Discord server keeps them (numinia-archive
 * ADR-071; the rules are STD-051, the register STD-052). The till stores the
 * members and roles; numinia.com asks it; both decide with
 * resolvers/organization-access, never in the browser.
 */

import type { LocalizedString } from './i18n.js';

/** The sixteen permissions a role can carry (STD-052, «Permissions»). */
export const ORGANIZATION_PERMISSIONS = [
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
  'manage-balance',
] as const;
export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[number];

/** What only owners do; no role carries these (STD-052, «Only owners»). `see-world-code` is seeing or changing it. */
export const OWNER_ACTS = [
  'delete-world',
  'see-world-code',
  'download-world',
  'close-organization',
  'hand-over-organization',
  'manage-owners',
  'set-house-access',
] as const;
export type OwnerAct = (typeof OWNER_ACTS)[number];

/** A permission or an act reserved to owners: what an actor may do. */
export type OrganizationAccess = OrganizationPermission | OwnerAct;

/** How the house's staff may enter an organisation (STD-052, «The house's access»). */
export const HOUSE_ACCESS_SETTINGS = ['alpha', 'always', 'on-request', 'never'] as const;
export type HouseAccess = (typeof HOUSE_ACCESS_SETTINGS)[number];

export interface OrganizationRole {
  readonly id: string;
  readonly name: string;
  /** `#rrggbb` in lower case, or null for none. */
  readonly color: string | null;
  /** The base role, which every member holds, sits at 0; the higher, the more it may manage. */
  readonly position: number;
  /** Show its members apart in the list of people. */
  readonly hoist: boolean;
  readonly permissions: readonly OrganizationPermission[];
}

export interface OrganizationMember {
  readonly personId: string;
  readonly kind: 'human' | 'agent';
  /** Owners are not a role (STD-051); an agent is never one. */
  readonly isOwner: boolean;
  /** The roles given besides the base role. */
  readonly roleIds: readonly string[];
}

export interface OrganizationState {
  /** Every role of the organisation, the base role included. */
  readonly roles: readonly OrganizationRole[];
  readonly houseAccess: HouseAccess;
  /** For `on-request`: an owner's signed leave is open now. */
  readonly houseLeaveOpen: boolean;
}

/** Who is asking, inside one organisation. The house is the platform's staff. */
export type OrganizationActor =
  | { readonly kind: 'member'; readonly member: OrganizationMember }
  | { readonly kind: 'house'; readonly personId: string }
  | { readonly kind: 'outsider' };

/** What one actor may do in one organisation, worked out once per request. */
export interface ActorAccess {
  readonly personId: string | null;
  readonly permissions: ReadonlySet<OrganizationAccess>;
  /** The position of the highest role held; owners stand above every role, the house just below them. */
  readonly height: number;
  readonly isOwner: boolean;
  readonly isHouse: boolean;
}

export type OrganizationRefusal =
  | 'missing-permission'
  | 'not-below'
  | 'own-roles'
  | 'self'
  | 'owner'
  | 'base-role'
  | 'grant-exceeds'
  | 'role-limit'
  | 'owners-only'
  | 'last-owner'
  | 'alpha';

export type OrganizationVerdict =
  { readonly ok: true } | { readonly ok: false; readonly refusal: OrganizationRefusal };

/** What may be done to a member below you (STD-051). */
export type MemberAct = 'remove' | 'ban' | 'mute';

/** A change that asks for a new wallet signature at that moment (STD-051). */
export type SensitiveChange =
  | { readonly kind: 'grant'; readonly permissions: readonly OrganizationPermission[] }
  | { readonly kind: 'ban' }
  | { readonly kind: 'house-access' };

export type OrganizationTemplateId = 'alpha' | 'team' | 'community';

export interface TemplateRole {
  readonly name: LocalizedString;
  readonly permissions: readonly OrganizationPermission[];
  readonly hoist: boolean;
}

/** The roles an organisation is born with (STD-052), from the top of the list down. */
export interface OrganizationTemplate {
  readonly id: OrganizationTemplateId;
  readonly roles: readonly TemplateRole[];
  /** What the base role carries. */
  readonly base: readonly OrganizationPermission[];
}
