/**
 * The wallet connected at the login, found again in this browser for the
 * signatures asked after it: the worlds room's fleet requests and Saldo's
 * fresh signature (STD-051, ORG-008). It lives in its own module, imported
 * by name, so the bundler keeps only what it uses — the same pieces the
 * login already ships — and each page loads it only when a signature is
 * asked for. (A dynamic import of the whole 'thirdweb' entry kept all of it.)
 */

import { createThirdwebClient } from 'thirdweb';
import { autoConnect, type Wallet } from 'thirdweb/wallets';
import { houseWallets } from './wallets';

/**
 * The wallet the first auto-connection of this page found. thirdweb keeps the
 * result of its first `autoConnect` for the whole page: a later call answers
 * "connected" at once and never calls `onConnect` again (its autoConnectCore
 * returns early). A page may sign several times in one visit, so it keeps the
 * wallet itself — without this, every signature after the first one said
 * "no wallet" while the session was alive.
 */
let remembered: Wallet | null = null;

/** The wallet connected at the login, or null when this browser remembers none. Throws if thirdweb fails. */
export async function rememberedWallet(clientId: string): Promise<Wallet | null> {
  if (remembered?.getAccount()) return remembered;
  await autoConnect({
    client: createThirdwebClient({ clientId }),
    wallets: houseWallets(),
    onConnect: (wallet) => {
      remembered = wallet;
    },
  });
  return remembered?.getAccount() ? remembered : null;
}
