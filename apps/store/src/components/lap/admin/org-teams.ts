/**
 * What the house can enter, read the way the Census list's «Añadir a una
 * organización» reads it and shared with the Worlds room's «Asignar a una
 * organización»: a community IS an organization (cut 6, 2026-10-16), so the
 * register's communities come first — whether or not the till has opened an
 * account for them yet — and the till's own organizations no community owns
 * follow. Saldo's overview lists every organization for the house (an
 * Oracle's session); the register comes from /api/admin/communities.
 */

import { readOverview } from '../../../lib/accounts';
import { teamsToJoin } from '../../../lib/census-list';
import { loadCommunities, orgChoices, type OrgChoice } from '../../../lib/org-choices';

export type Teams =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly choices: readonly OrgChoice[] };

/** The overview's organizations, or null when Saldo cannot say. */
async function readAccounts(): Promise<ReturnType<typeof readOverview>> {
  const response = await fetch('/api/saldo', { headers: { accept: 'application/json' } });
  return response.ok ? readOverview(await response.json()) : null;
}

/** The communities first, then the organizations of the till no community owns; failed when either cannot be read. */
export async function readTeams(): Promise<Teams> {
  try {
    const [accounts, communities] = await Promise.all([readAccounts(), loadCommunities(fetch)]);
    return accounts === null || communities === null
      ? { at: 'failed' }
      : { at: 'ready', choices: orgChoices(communities, teamsToJoin(accounts)) };
  } catch {
    return { at: 'failed' };
  }
}
