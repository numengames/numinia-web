/**
 * A community's organization (cut «Una comunidad ES una organización»,
 * 2026-10-16), the pure part: the community id numinia.com sends, read as
 * untrusted; the till account id worked out from it; the words of the
 * refusals. Pure — no database. A malformed field is a problem in words,
 * never a throw.
 */

import {
  rolesFromTemplate,
  type LocalizedString,
  type OrganizationRole,
  type SupportedLocale,
} from '@numinia/domain';
import { readTeamName } from './accounts';

/** The most communities one `openAllCommunities` call opens. */
const OPEN_ALL_MAX = 50;

/** A register page's id: lowercase letters, digits and hyphens, never leading with one. */
const COMMUNITY_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

export const COMMUNITY_PROBLEMS = {
  notHouse: 'only the house opens the organization of a community',
  community:
    'communityId must be 1 to 63 characters: lowercase letters, digits and hyphens, not starting with a hyphen',
  communities: `communities must be a list of 1 to ${OPEN_ALL_MAX} objects with an id (a community id) and a name (1 to 60 characters)`,
} as const;

/**
 * Communities whose administrator role has a name of its own: in Numen Games
 * the Oracles are the administrators. Small on purpose — a community that is
 * not here is born with the Team template as it is.
 */
const ADMINISTRATOR_NAMES: Readonly<Record<string, LocalizedString>> = {
  'numen-games': {
    es: 'Oráculos',
    en: 'Oracles',
    ja: 'オラクル',
    ko: '오라클',
    'pt-br': 'Oráculos',
  },
};

/**
 * The roles a community's organization is born with: the Team template's, in
 * one language, with the administrator role renamed where the community has a
 * name for it (the colour and the permission stay the template's).
 */
export function communityRoles(
  communityId: string,
  locale: SupportedLocale,
  makeId: (index: number) => string,
): readonly OrganizationRole[] {
  const roles = rolesFromTemplate('team', locale, makeId);
  const names = ADMINISTRATOR_NAMES[communityId];
  if (names === undefined) return roles;
  return roles.map((role) =>
    role.permissions.includes('administrator') ? { ...role, name: names[locale] } : role,
  );
}

/** One community to open: its register id and its name. */
export interface CommunityToOpen {
  readonly id: string;
  readonly name: string;
}

/** The 1 to 50 `{id, name}` pairs numinia.com sends, or undefined if any is out of shape. */
export function readCommunities(value: unknown): readonly CommunityToOpen[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > OPEN_ALL_MAX) return undefined;
  const read: CommunityToOpen[] = [];
  for (const item of value as readonly unknown[]) {
    if (typeof item !== 'object' || item === null) return undefined;
    const id = readCommunityId((item as Record<string, unknown>)['id']);
    const name = readTeamName((item as Record<string, unknown>)['name']);
    if (id === undefined || name === undefined) return undefined;
    read.push({ id, name });
  }
  return read;
}

/** A community id as the register writes it, or undefined. */
export function readCommunityId(value: unknown): string | undefined {
  return typeof value === 'string' && COMMUNITY_ID.test(value) ? value : undefined;
}

/**
 * The till account of a community: derived from its id, so two first calls
 * at once make one account and the id never has to be kept anywhere. The
 * same shape as a founded organization's random id: `acc_t_` and 32 hex.
 */
export async function communityAccountId(communityId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`numinia-till community ${communityId}`),
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0'));
  return `acc_t_${hex.join('').slice(0, 32)}`;
}
