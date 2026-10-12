/**
 * The thirdweb side of a fleet signature: the wallet thirdweb remembers in
 * this browser, found again. It lives in its own module, imported by name,
 * so the bundler keeps only what it uses — the same pieces the login
 * already ships — and fleet-wallet.ts loads it only when a signature is
 * asked for. (A dynamic import of the whole 'thirdweb' entry kept all of it.)
 */

import { createThirdwebClient } from 'thirdweb';
import { autoConnect, type Account, type Wallet } from 'thirdweb/wallets';
import { houseWallets } from '../../auth/wallets';

/**
 * The wallet the first auto-connection of this page found. thirdweb keeps the
 * result of its first `autoConnect` for the whole page: a later call answers
 * "connected" at once and never calls `onConnect` again (its autoConnectCore
 * returns early). The room signs several times in one visit, so it keeps the
 * wallet itself — without this, every signature after the first one said
 * "no wallet" while the session was alive.
 */
let remembered: Wallet | null = null;

/** The account connected at the login, or null when this browser remembers none. Throws if thirdweb fails. */
export async function rememberedAccount(clientId: string): Promise<Account | null> {
  const known = remembered?.getAccount();
  if (known) return known;
  await autoConnect({
    client: createThirdwebClient({ clientId }),
    wallets: houseWallets(),
    onConnect: (wallet) => {
      remembered = wallet;
    },
  });
  return remembered?.getAccount() ?? null;
}
