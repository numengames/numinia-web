/**
 * The four calls thirdweb's widget makes to sign a person in, all against
 * our own endpoints (MISSION-002): ask for a SIWE message, send it back
 * signed with the accepted legal corpus (MIS-086), check whether this
 * wallet already holds the session, and drop it. thirdweb proves the
 * address; the session cookie is ours.
 */

import { LEGAL_CORPUS_VERSION } from '../../lib/legal';
import type { SessionClient } from '../../lib/session-client';

interface LoginPayloadQuery {
  readonly address: string;
  readonly chainId: number;
}

export interface AuthHooks {
  /** The page's session client (published by the chrome), as soon as it is
      there: the widget is live from the first paint, before the chrome's
      client may be (lib/island-session.ts `pageSessionClient`). */
  readonly session: () => Promise<SessionClient>;
  readonly onSignedIn: () => void;
  readonly onSignedOut: () => void;
}

/**
 * Continuing is accepting (the sign-in-wrap, since QA 2026-10-15): the door
 * shows one legal line instead of MIS-086's checkbox, and the accepted
 * corpus version still travels with every login — the endpoint refuses a
 * stale one.
 */
export function houseAuth({ session, onSignedIn, onSignedOut }: AuthHooks) {
  return {
    getLoginPayload: async ({ address, chainId }: LoginPayloadQuery) => {
      const params = new URLSearchParams({ address, chainId: String(chainId) });
      const response = await fetch(`/api/auth/login?${params}`);
      if (!response.ok) throw new Error('Failed to get login payload');
      return response.json();
    },
    doLogin: async ({ payload, signature }: { payload: unknown; signature: string }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, signature, terms: LEGAL_CORPUS_VERSION }),
      });
      if (!response.ok) throw new Error('Login rejected');
      onSignedIn();
    },
    isLoggedIn: async (address: string) => {
      const current = await (await session()).fresh();
      return current.status === 'in' && current.address === address.toLowerCase();
    },
    doLogout: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      onSignedOut();
    },
  };
}
