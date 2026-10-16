/**
 * Which community an organization of the till is of (cut G «Hazla tuya»):
 * the organization the house opens for a community has a derived account id
 * (community-teams.ts), and a community's file may name an older one
 * (`team:`). Built once at render from the register, for the panel's Members
 * to find the community's «Peticiones», and for the Census to name each
 * community. Server-side: the register never reaches the browser whole. The
 * register comes in (components/communities/register.ts reads markdown).
 */

import type { Community } from './communities';
import { communityAccountId } from './community-teams';

/** `{ accountId: communityId }` for every organization the register ties to a community. */
export async function communityOfAccount(
  register: readonly Community[],
): Promise<Record<string, string>> {
  const pairs = await Promise.all(
    register.map(async (community): Promise<readonly (readonly [string, string])[]> => [
      [await communityAccountId(community.id), community.id],
      ...(community.team === undefined ? [] : [[community.team, community.id] as const]),
    ]),
  );
  return Object.fromEntries(pairs.flat());
}

/** `{ communityId: name }` for the register. */
export function communityNames(register: readonly Community[]): Record<string, string> {
  return Object.fromEntries(register.map((community) => [community.id, community.name]));
}
