/**
 * The pure part of organization roles in the till (src/lib/organizations.ts):
 * the house flag, the sentences of refusals and the Saldo screen's «admin».
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_ORGANIZATION_ROLES,
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  type ActorAccess,
  type OrganizationAccess,
  type OrganizationRefusal,
  type OrganizationRole,
} from '@numinia/domain';
import {
  ACTS,
  ORG_PROBLEMS,
  administratorRoleFor,
  compatRole,
  holdersOf,
  listOf,
  needs,
  readHouse,
  refusalOf,
} from '../src/lib/organizations';

const role = (
  name: string,
  position: number,
  permissions: OrganizationRole['permissions'],
): OrganizationRole => ({
  id: `role_${name}`,
  name,
  color: null,
  position,
  hoist: false,
  permissions,
});

const ROLES = [
  role('Base', 0, ['view-balance']),
  role('Admins', 4, ['administrator']),
  role('Deputies', 2, ['administrator']),
  role('Finance', 3, ['manage-balance']),
];

const actor = (height: number, permissions: OrganizationAccess[] = []): ActorAccess => ({
  personId: '0x1',
  permissions: new Set(permissions),
  height,
  isOwner: false,
  isHouse: false,
});

describe('the house flag', () => {
  it('is false when absent, a boolean as sent, and a problem otherwise', () => {
    expect([undefined, true, false, 'yes', 1, null].map(readHouse)).toEqual([
      false,
      true,
      false,
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe('the sentences of refusals', () => {
  it('lists names as a sentence does', () => {
    expect([[], ['A'], ['A', 'B'], ['A', 'B', 'C']].map(listOf)).toEqual([
      '',
      'A',
      'A and B',
      'A, B and C',
    ]);
  });

  it('names the roles that hold what is missing, from the top down, administrator included', () => {
    expect(holdersOf(ROLES, 'manage-balance')).toEqual(['Admins', 'Finance', 'Deputies']);
    expect(holdersOf(ROLES, 'view-balance')).toEqual(['Admins', 'Deputies', 'Base']);
    expect(holdersOf(ROLES, 'delete-world')).toEqual([]);
    expect(needs('delete-world', [])).toBe('this needs delete-world, which only the owners hold');
    expect(needs('create-worlds', ['Admins'])).toBe(
      'this needs create-worlds, which the owners hold, and the role Admins',
    );
    expect(needs('manage-balance', ['Admins', 'Finance'])).toBe(
      'this needs manage-balance, which the owners hold, and the roles Admins and Finance',
    );
  });

  it('gives each refusal of @numinia/domain its words', () => {
    expect(refusalOf('missing-permission', 'manage-balance', ROLES)).toBe(
      needs('manage-balance', ['Admins', 'Finance', 'Deputies']),
    );
    const others: OrganizationRefusal[] = [
      'not-below',
      'own-roles',
      'self',
      'owner',
      'base-role',
      'grant-exceeds',
      'role-limit',
      'owners-only',
      'last-owner',
      'alpha',
    ];
    const sentences = others.map((refusal) => refusalOf(refusal, 'manage-roles', ROLES));
    expect(sentences.slice(0, 4)).toEqual([
      ORG_PROBLEMS.notBelow,
      ORG_PROBLEMS.ownRoles,
      ORG_PROBLEMS.ownRoles,
      ORG_PROBLEMS.owner,
    ]);
    expect(sentences[6]).toContain(String(MAX_ORGANIZATION_ROLES));
    expect(sentences[8]).toBe(ORG_PROBLEMS.lastOwner);
    expect(new Set(sentences).size).toBe(others.length - 1);
  });

  it('keeps every act in the register’s order', () => {
    expect(ACTS).toEqual([...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS]);
  });
});

describe('the Saldo screen’s «admin»', () => {
  it('is whoever holds administrator', () => {
    expect(compatRole(actor(1, ['administrator']))).toBe('admin');
    expect(compatRole(actor(1, ['manage-roles']))).toBe('member');
  });

  it('gives the highest administrator role below the actor, or says why there is none', () => {
    expect(administratorRoleFor(actor(Number.POSITIVE_INFINITY), ROLES)).toMatchObject({
      name: 'Admins',
    });
    expect(administratorRoleFor(actor(4), ROLES)).toMatchObject({ name: 'Deputies' });
    expect(administratorRoleFor(actor(2), ROLES)).toBe(ORG_PROBLEMS.notBelow);
    expect(administratorRoleFor(actor(9), [role('Base', 0, ['administrator'])])).toBe(
      ORG_PROBLEMS.noAdministratorRole,
    );
  });
});
