/**
 * Login island for the MISSION-002 Step 0 spike (gate D14).
 *
 * Exercises the full progressive path in one surface: social/email/passkey
 * (thirdweb In-App Wallet) and external wallets, all funneled through SIWE
 * against our own endpoints — the session cookie is @numinia/auth, not vendor.
 *
 * Spike-only: loaded exclusively on /spike/auth via client:load.
 */

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { createThirdwebClient } from 'thirdweb';
import {
  ConnectEmbed,
  ThirdwebProvider,
  getLastAuthProvider,
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from 'thirdweb/react';
import { createWallet, inAppWallet, type Wallet } from 'thirdweb/wallets';
import {
  LoginMethodGuide,
  methodFromWidgetTarget,
  type LoginMethod,
  type LoginPhase,
} from './LoginMethodGuide';
import { WIDGET_THEMES, useModo } from './widget-theme';

const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;

// Widening cast: thirdweb's per-id Wallet<"..."> generics don't unify under
// exactOptionalPropertyTypes; the runtime shape is exactly Wallet[].
const wallets = [
  inAppWallet({ auth: { options: ['google', 'email', 'passkey'] } }),
  createWallet('io.metamask'),
  createWallet('walletConnect'),
] as Wallet[];

interface SessionState {
  status: 'loading' | 'anonymous' | 'authenticated' | 'error';
  address?: string;
  rank?: string;
}

async function fetchSession(): Promise<SessionState> {
  const response = await fetch('/api/auth/session');
  if (response.status === 401) return { status: 'anonymous' };
  if (!response.ok) return { status: 'error' };
  const data = (await response.json()) as { address: string; rank: string };
  return { status: 'authenticated', address: data.address, rank: data.rank };
}

function SessionPanel({ session, onLogout }: { session: SessionState; onLogout: () => void }) {
  if (session.status === 'loading') return <p>Checking session…</p>;
  if (session.status === 'error') return <p role="alert">Session endpoint unreachable.</p>;
  if (session.status === 'anonymous') return <p>No session — you are browsing as an outsider.</p>;
  return (
    <div>
      <p data-spike-session-rank={session.rank}>
        Session verified: rank <strong>{session.rank}</strong>
        <br />
        <code>{session.address}</code>
      </p>
      <button type="button" data-metric="auth-logout" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}

/** Inner component so thirdweb hooks run under ThirdwebProvider. */
function SpikeInner({ client }: { client: ReturnType<typeof createThirdwebClient> }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const modo = useModo();
  const activeWallet = useActiveWallet();
  const activeAccount = useActiveAccount();
  const { disconnect } = useDisconnect();

  // Connected-but-unauthenticated is the exact spot users get lost in:
  // the wallet is linked yet the SIWE signature is still pending.
  const phase: LoginPhase =
    session.status === 'authenticated' ? 'done' : activeAccount ? 'sign' : 'connect';

  // Method guide: manual selection until the real method is detectable —
  // external wallets by wallet id, in-app ones by thirdweb's last-auth record.
  const [selectedMethod, setSelectedMethod] = useState<LoginMethod | null>(null);
  const [detectedMethod, setDetectedMethod] = useState<LoginMethod | null>(null);
  useEffect(() => {
    if (!activeWallet) {
      setDetectedMethod(null);
      return;
    }
    if (activeWallet.id !== 'inApp') {
      setDetectedMethod('wallet');
      return;
    }
    void getLastAuthProvider().then((provider) => {
      if (provider === 'google' || provider === 'email' || provider === 'passkey') {
        setDetectedMethod(provider);
      }
    });
  }, [activeWallet]);

  const refresh = useCallback(() => {
    void fetchSession().then(setSession);
  }, []);

  useEffect(refresh, [refresh]);

  // Dropping the cookie is not enough: in-app wallets (Google/email/passkey)
  // sign silently, so a still-connected wallet re-authenticates immediately.
  // Logout therefore disconnects the wallet BEFORE clearing the session.
  const handleLogout = useCallback(() => {
    if (activeWallet) disconnect(activeWallet);
    void fetch('/api/auth/logout', { method: 'POST' }).then(refresh);
  }, [activeWallet, disconnect, refresh]);

  // "Listen to thirdweb": taps/focus inside the closed widget drive the guide.
  const handleWidgetInteraction = useCallback((event: SyntheticEvent) => {
    const method = methodFromWidgetTarget(event.target);
    if (method) setSelectedMethod(method);
  }, []);

  return (
    <>
      <LoginMethodGuide selected={selectedMethod} detected={detectedMethod} phase={phase} />
      <div
        data-metric="auth-connect"
        onClickCapture={handleWidgetInteraction}
        onFocusCapture={handleWidgetInteraction}
      >
        <ConnectEmbed
          client={client}
          wallets={wallets}
          theme={WIDGET_THEMES[modo]}
          auth={{
            getLoginPayload: async ({ address, chainId }) => {
              const params = new URLSearchParams({ address, chainId: String(chainId) });
              const response = await fetch(`/api/auth/login?${params}`);
              if (!response.ok) throw new Error('Failed to get login payload');
              return response.json();
            },
            doLogin: async ({ payload, signature }) => {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload, signature }),
              });
              if (!response.ok) throw new Error('Login rejected');
              refresh();
            },
            isLoggedIn: async (address) => {
              const current = await fetchSession();
              return (
                current.status === 'authenticated' &&
                current.address?.toLowerCase() === address.toLowerCase()
              );
            },
            doLogout: async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              refresh();
            },
          }}
        />
      </div>
      <SessionPanel session={session} onLogout={handleLogout} />
    </>
  );
}

export function LoginSpike() {
  if (!clientId) {
    // Fail loudly, not silently: the spike is useless without the client ID.
    return <p role="alert">PUBLIC_THIRDWEB_CLIENT_ID is not set — check apps/store/.env</p>;
  }
  return (
    <ThirdwebProvider>
      <SpikeInner client={createThirdwebClient({ clientId })} />
    </ThirdwebProvider>
  );
}
