/**
 * The screen's half of a fresh signature (STD-051, ORG-008): find the
 * wallet connected at the login, ask /api/saldo/signature for the lines of
 * this very act, have the wallet sign them and hand back the proof the act
 * carries when it is sent again. thirdweb loads only now
 * (../auth/remembered-wallet.ts), so the tab opens as light as before.
 *
 * The wallet must be the session's: another one is refused here, before
 * any lines are asked for — the server would refuse its signature anyway.
 * In-app wallets (Google, email, passkey) sign without a window; MetaMask
 * and WalletConnect show the lines and ask.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { Wallet } from 'thirdweb/wallets';
import { readSign } from '../../lib/accounts';

type SignProblem = 'no-wallet' | 'other-wallet' | 'declined' | 'failed';

/** What the act carries the second time it is sent (`fresh`). */
interface FreshProof {
  readonly token: string;
  readonly signature: string;
}

export type Signed =
  | { readonly ok: true; readonly proof: FreshProof }
  | {
      readonly ok: false;
      readonly problem: SignProblem;
      /** `failed` only: the till's words, when it refused to name the act. */
      readonly problems?: readonly string[];
    };

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };

/** The refusal's words in a 403 body, or none. */
function problemsOf(status: number, json: unknown): readonly string[] | null {
  if (status !== 403 || typeof json !== 'object' || json === null) return null;
  const problems = (json as { problems?: unknown }).problems;
  return Array.isArray(problems) ? problems.map(String) : null;
}

export async function signAct(
  act: Readonly<Record<string, unknown>>,
  locale: SupportedLocale,
  sessionWallet: string | null,
): Promise<Signed> {
  const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;
  if (!clientId) return { ok: false, problem: 'no-wallet' };
  let wallet: Wallet | null;
  try {
    const { rememberedWallet } = await import('../auth/remembered-wallet');
    wallet = await rememberedWallet(clientId);
  } catch {
    return { ok: false, problem: 'no-wallet' };
  }
  const account = wallet?.getAccount();
  if (!wallet || !account) return { ok: false, problem: 'no-wallet' };
  if (sessionWallet !== null && account.address.toLowerCase() !== sessionWallet.toLowerCase()) {
    return { ok: false, problem: 'other-wallet' };
  }

  const query = new URLSearchParams({ locale });
  const chain = wallet.getChain()?.id;
  if (chain !== undefined) query.set('chain', String(chain));
  let sign: ReturnType<typeof readSign>;
  try {
    const response = await fetch(`/api/saldo/signature?${query.toString()}`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(act),
    });
    const json: unknown = await response.json().catch(() => null);
    sign = response.ok ? readSign(json) : null;
    if (sign === null) {
      const problems = problemsOf(response.status, json);
      return problems === null
        ? { ok: false, problem: 'failed' }
        : { ok: false, problem: 'failed', problems };
    }
  } catch {
    return { ok: false, problem: 'failed' };
  }

  try {
    const signature = await account.signMessage({ message: sign.message });
    return { ok: true, proof: { token: sign.token, signature } };
  } catch {
    return { ok: false, problem: 'declined' };
  }
}

/**
 * Have the connected wallet sign lines the server already worded (the census
 * desk's Oracle acts answer 428 with them, STD-003 RNK-009): the same wallet
 * lookup as `signAct`, without asking /api/saldo/signature.
 */
export async function signLines(sign: {
  readonly message: string;
  readonly token: string;
}): Promise<Signed> {
  const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;
  if (!clientId) return { ok: false, problem: 'no-wallet' };
  let wallet: Wallet | null;
  try {
    const { rememberedWallet } = await import('../auth/remembered-wallet');
    wallet = await rememberedWallet(clientId);
  } catch {
    return { ok: false, problem: 'no-wallet' };
  }
  const account = wallet?.getAccount();
  if (!account) return { ok: false, problem: 'no-wallet' };
  try {
    const signature = await account.signMessage({ message: sign.message });
    return { ok: true, proof: { token: sign.token, signature } };
  } catch {
    return { ok: false, problem: 'declined' };
  }
}
