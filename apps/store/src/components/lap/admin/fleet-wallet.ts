/**
 * The Oracle's wallet, found again in the worlds room to sign one fleet
 * request (lib/fleet.ts). thirdweb is loaded only when a signature is asked
 * for, so the room opens as light as before. The wallet is the one
 * connected at the login, which thirdweb remembers in this browser; the
 * room never connects a new one, and it refuses to sign with a wallet that
 * is not the session's — the machine would refuse it anyway.
 */

import type { Account } from 'thirdweb/wallets';
import type { FleetTypedData } from '../../../lib/fleet';

export type SignProblem = 'no-wallet' | 'other-wallet' | 'declined';

export type Signed =
  | { readonly ok: true; readonly signature: string; readonly wallet: string }
  | { readonly ok: false; readonly problem: SignProblem; readonly wallet: string | null };

export async function signWithWallet(
  data: FleetTypedData,
  sessionWallet: string | null,
): Promise<Signed> {
  const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;
  if (!clientId) return { ok: false, problem: 'no-wallet', wallet: null };
  let account: Account | null;
  try {
    const { rememberedAccount } = await import('./fleet-signer');
    account = await rememberedAccount(clientId);
  } catch {
    return { ok: false, problem: 'no-wallet', wallet: null };
  }
  if (!account) return { ok: false, problem: 'no-wallet', wallet: null };
  if (sessionWallet !== null && account.address.toLowerCase() !== sessionWallet.toLowerCase()) {
    return { ok: false, problem: 'other-wallet', wallet: account.address };
  }
  try {
    const signature = await account.signTypedData(
      data as unknown as Parameters<Account['signTypedData']>[0],
    );
    return { ok: true, signature, wallet: account.address };
  } catch {
    return { ok: false, problem: 'declined', wallet: account.address };
  }
}
