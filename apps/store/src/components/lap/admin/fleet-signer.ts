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

/** The account connected at the login, or null when this browser remembers none. Throws if thirdweb fails. */
export async function rememberedAccount(clientId: string): Promise<Account | null> {
  const found: { wallet: Wallet | null } = { wallet: null };
  await autoConnect({
    client: createThirdwebClient({ clientId }),
    wallets: houseWallets(),
    onConnect: (wallet) => {
      found.wallet = wallet;
    },
  });
  return found.wallet?.getAccount() ?? null;
}
