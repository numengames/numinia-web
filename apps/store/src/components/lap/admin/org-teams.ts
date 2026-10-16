/**
 * The organizations the house can enter, read the way the Census list's
 * «Añadir a una organización» reads them and shared with the Worlds room's
 * «Asignar a una organización»: Saldo's overview lists every organization
 * for the house (an Oracle's session), so there is one source and one shape.
 */

import { readOverview } from '../../../lib/accounts';
import { teamsToJoin } from '../../../lib/census-list';

export type Teams =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | {
      readonly at: 'ready';
      readonly teams: readonly { readonly id: string; readonly name: string }[];
    };

/** The organizations the house can enter: Saldo's overview lists them all for the house. */
export async function readTeams(): Promise<Teams> {
  try {
    const response = await fetch('/api/saldo', { headers: { accept: 'application/json' } });
    const accounts = response.ok ? readOverview(await response.json()) : null;
    return accounts === null ? { at: 'failed' } : { at: 'ready', teams: teamsToJoin(accounts) };
  } catch {
    return { at: 'failed' };
  }
}
