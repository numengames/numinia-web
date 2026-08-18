/**
 * Login island (MISSION-002 Step 0, gate D14 — promoted out of the spike).
 *
 * Exercises the full progressive path in one surface: social/email/passkey
 * (thirdweb In-App Wallet) and external wallets, all funneled through SIWE
 * against our own endpoints — the session cookie is @numinia/auth, not vendor.
 *
 * Since MIS-086 the widget stays behind the legal gate: no connection until
 * the visitor accepts the published corpus, and the accepted version travels
 * with the login request.
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
import { LegalConsentGate, type LegalGateCopy } from './LegalConsentGate';
import { fetchSession, SessionPanel, type SessionState } from './SessionPanel';
import {
  LoginMethodGuide,
  methodFromWidgetTarget,
  type LoginMethod,
  type LoginPhase,
} from './LoginMethodGuide';
import { WIDGET_THEMES, useModo } from './widget-theme';
import { LEGAL_CORPUS_VERSION } from '../../lib/legal';

const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;

// Widening cast: thirdweb's per-id Wallet<"..."> generics don't unify under
// exactOptionalPropertyTypes; the runtime shape is exactly Wallet[].
const wallets = [
  inAppWallet({ auth: { options: ['google', 'email', 'passkey'] } }),
  createWallet('io.metamask'),
  createWallet('walletConnect'),
] as Wallet[];

/** Inner component so thirdweb hooks run under ThirdwebProvider. */
function SpikeInner({
  client,
  legal,
}: {
  client: ReturnType<typeof createThirdwebClient>;
  legal: LegalGateCopy;
}) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [accepted, setAccepted] = useState(false);
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
      {/* An authenticated visitor already accepted: never ask twice. */}
      {session.status !== 'authenticated' && (
        <LegalConsentGate copy={legal} accepted={accepted} onChange={setAccepted} />
      )}
      {!accepted && session.status !== 'authenticated' ? (
        <p data-legal-gate-pending>{legal.pending}</p>
      ) : (
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
                  body: JSON.stringify({ payload, signature, terms: LEGAL_CORPUS_VERSION }),
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
      )}
      <SessionPanel session={session} onLogout={handleLogout} />
    </>
  );
}

export function LoginSpike({ legal }: { legal: LegalGateCopy }) {
  if (!clientId) {
    // Fail loudly, not silently: the login is useless without the client ID.
    return <p role="alert">PUBLIC_THIRDWEB_CLIENT_ID is not set — check apps/store/.env</p>;
  }
  return (
    <ThirdwebProvider>
      <SpikeInner client={createThirdwebClient({ clientId })} legal={legal} />
    </ThirdwebProvider>
  );
}
