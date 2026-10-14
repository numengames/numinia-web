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
 *
 * Since v0.84.0 it is also the site's one way out:
 * - `?salir=1` signs out — wallet first, then the cookie — and goes home.
 *   Every «Salir» on the site links here, because only this page carries
 *   the wallet code that must disconnect (the chrome never loads it).
 * - A fresh sign-in lands on your profile (Pablo, 2026-10-14: «me debería
 *   de mantener en el perfil»), or on the room of the player area the door
 *   was opened from (`?vuelta=`, lib/island-session.ts `landingAfterSignIn`).
 *   «Continuar» leads to the same place.
 * Once you are in, the widget is gone: the page shows who you are.
 *
 * The island draws two regions the page lays out (SessionPage.astro): the
 * steps — the legal gate and the guide — and the way in — the widget, or
 * its place while the terms wait, or who you are once in. On a wide screen
 * they sit side by side; on a phone, one under the other.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { createThirdwebClient } from 'thirdweb';
import {
  AutoConnect,
  ConnectEmbed,
  ThirdwebProvider,
  getLastAuthProvider,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from 'thirdweb/react';
import { LegalConsentGate, type LegalGateCopy } from './LegalConsentGate';
import { SessionPanel, type PanelState } from './SessionPanel';
import {
  LoginMethodGuide,
  methodFromWidgetTarget,
  type LoginMethod,
  type LoginPhase,
} from './LoginMethodGuide';
import { houseAuth } from './house-auth';
import { houseWallets } from './wallets';
import { WIDGET_THEMES, useModo } from './widget-theme';
import { WIDGET_LOCALE, type SignInMessages } from '../../i18n/sign-in';
import {
  NO_DOOR_PARAMS,
  doorParams,
  landingAfterSignIn,
  pageSessionClient,
} from '../../lib/island-session';
import type { SessionClient } from '../../lib/session-client';
import type { SupportedLocale } from '@numinia/domain';

const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;

const wallets = houseWallets();

export interface LoginProps {
  readonly locale: SupportedLocale;
  readonly legal: LegalGateCopy;
  readonly copy: SignInMessages;
  readonly rankNames: Readonly<Record<string, string>>;
  /** Your profile (Resumen) in the page's language: where a sign-in lands. */
  readonly profileHref: string;
  /** Where «Salir» lands: the home page. */
  readonly homeHref: string;
}

/** Inner component so thirdweb hooks run under ThirdwebProvider. */
function SpikeInner({
  client,
  locale,
  legal,
  copy,
  rankNames,
  profileHref,
  homeHref,
}: LoginProps & { client: ReturnType<typeof createThirdwebClient> }) {
  const [session, setSession] = useState<PanelState>({ status: 'loading' });
  const [accepted, setAccepted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const modo = useModo();
  const activeWallet = useActiveWallet();
  const activeAccount = useActiveAccount();
  const connection = useActiveWalletConnectionStatus();
  const { disconnect } = useDisconnect();

  // Read after hydration: the query string is the browser's.
  const [{ returnTo, signOutAsked }, setDoor] = useState(NO_DOOR_PARAMS);
  useEffect(() => setDoor(doorParams(window.location.search)), []);
  // Your profile, unless the door was opened from a room of the player area.
  const landing = landingAfterSignIn(returnTo, profileHref);

  // Connected-but-unauthenticated is the exact spot users get lost in:
  // the wallet is linked yet the SIWE signature is still pending.
  const phase: LoginPhase = session.status === 'in' ? 'done' : activeAccount ? 'sign' : 'connect';

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

  // The page's one session read, owned by the chrome: this island hears
  // the same answer, and every sign-in or sign-out it announces reaches
  // the whole page. A fresh sign-in then lands on your profile.
  const [page, setPage] = useState<SessionClient | null>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    void pageSessionClient(window).then((client) => {
      setPage(client);
      stop = client.subscribe(setSession);
    });
    return () => stop?.();
  }, []);
  const auth = useMemo(
    () =>
      page &&
      houseAuth({
        session: page,
        onSignedIn: () => {
          page.changed();
          window.location.assign(landing);
        },
        onSignedOut: () => page.changed(),
      }),
    [page, landing],
  );

  // Dropping the cookie is not enough: in-app wallets (Google/email/passkey)
  // sign silently, so a still-connected wallet re-authenticates immediately.
  // Logout therefore disconnects the wallet BEFORE clearing the session.
  const signOut = useCallback(async () => {
    setLeaving(true);
    if (activeWallet) disconnect(activeWallet);
    await fetch('/api/auth/logout', { method: 'POST' });
    page?.changed();
  }, [activeWallet, disconnect, page]);

  const handleLogout = useCallback(() => {
    void signOut().then(() => setLeaving(false));
  }, [signOut]);

  // `?salir=1`: wait until the remembered wallet has reconnected (or is
  // known to be absent, or 3 s have passed), sign out, go home. Once only.
  const done = useRef(false);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    if (!signOutAsked) return;
    const timer = window.setTimeout(() => setWaited(true), 3000);
    return () => window.clearTimeout(timer);
  }, [signOutAsked]);
  useEffect(() => {
    if (!signOutAsked || done.current || session.status === 'loading') return;
    const settling = connection === 'unknown' || connection === 'connecting';
    if (session.status === 'in' && settling && !waited) return;
    done.current = true;
    const leave = session.status === 'in' ? signOut() : Promise.resolve();
    void leave.then(() => window.location.replace(homeHref));
  }, [signOutAsked, session, connection, waited, signOut, homeHref]);

  // «Listen to thirdweb»: taps inside the closed widget drive the guide.
  // Taps only, never focus: focus arrives on the press, the guide then
  // appears and moves the layout, and the release lands beside the button —
  // the first tap on «Connect a Wallet» was lost.
  const handleWidgetInteraction = useCallback((event: SyntheticEvent) => {
    const method = methodFromWidgetTarget(event.target);
    if (method) setSelectedMethod(method);
  }, []);

  const signedIn = session.status === 'in';
  // Nobody here yet: the legal gate, then the widget.
  const atDoor = session.status === 'out' && !leaving;
  // The guide belongs to a sign-in in progress, not to a returning visit.
  const guiding = !signedIn || selectedMethod !== null;

  return (
    <>
      <div data-sign-in-steps>
        {atDoor && <LegalConsentGate copy={legal} accepted={accepted} onChange={setAccepted} />}
        {guiding && (
          <LoginMethodGuide
            copy={copy}
            selected={selectedMethod}
            detected={detectedMethod}
            phase={phase}
          />
        )}
      </div>
      <div data-sign-in-way>
        {/* Signed in: no widget, only who you are. The wallet still reconnects
            in the background, so «Salir» can disconnect it. */}
        {signedIn && <AutoConnect client={client} wallets={wallets} />}
        {/* The widget's place while the terms wait: the way in is visible
            from the start, and says what opens it. */}
        {atDoor && !accepted && (
          <div data-way-waiting>
            <p className="etiqueta">{copy.doorTitle}</p>
            <p>{copy.doorMethods}</p>
            <p data-legal-gate-pending>{legal.pending}</p>
          </div>
        )}
        {atDoor && accepted && auth && (
          <div data-metric="auth-connect" onClickCapture={handleWidgetInteraction}>
            <ConnectEmbed
              client={client}
              wallets={wallets}
              locale={WIDGET_LOCALE[locale]}
              theme={WIDGET_THEMES[modo]}
              auth={auth}
            />
          </div>
        )}
        <SessionPanel
          session={session}
          copy={copy}
          rankNames={rankNames}
          continueHref={landing}
          leaving={leaving}
          onLogout={handleLogout}
        />
      </div>
    </>
  );
}

export function LoginSpike(props: LoginProps) {
  if (!clientId) {
    // Fail loudly, not silently: the login is useless without the client ID.
    return <p role="alert">PUBLIC_THIRDWEB_CLIENT_ID is not set — check apps/store/.env</p>;
  }
  return (
    <ThirdwebProvider>
      <SpikeInner client={createThirdwebClient({ clientId })} {...props} />
    </ThirdwebProvider>
  );
}
