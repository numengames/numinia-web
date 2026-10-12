/**
 * The wallets numinia.com signs in with (thirdweb): social, email and
 * passkey through the In-App Wallet, and the external ones. One list for
 * the login and for every later signature (the worlds room), so the wallet
 * connected at the login is the one found again.
 */

import { createWallet, inAppWallet, type Wallet } from 'thirdweb/wallets';

export function houseWallets(): Wallet[] {
  // Widening cast: thirdweb's per-id Wallet<"..."> generics don't unify under
  // exactOptionalPropertyTypes; the runtime shape is exactly Wallet[].
  return [
    inAppWallet({ auth: { options: ['google', 'email', 'passkey'] } }),
    createWallet('io.metamask'),
    createWallet('walletConnect'),
  ] as Wallet[];
}
