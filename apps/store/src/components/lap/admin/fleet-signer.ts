/**
 * The thirdweb side of a fleet signature: the account of the wallet
 * connected at the login, found again by ../../auth/remembered-wallet.ts
 * (one module for every page that signs after the login, so thirdweb's
 * single auto-connection is shared). fleet-wallet.ts loads this only when
 * a signature is asked for.
 */

import type { Account } from 'thirdweb/wallets';
import { rememberedWallet } from '../../auth/remembered-wallet';

/** The account connected at the login, or null when this browser remembers none. Throws if thirdweb fails. */
export async function rememberedAccount(clientId: string): Promise<Account | null> {
  return (await rememberedWallet(clientId))?.getAccount() ?? null;
}
