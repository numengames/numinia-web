/**
 * The sign-in door's way in (MISSION-002, gate D14 — promoted out of the
 * spike), drawn inside the door's one panel (SessionPage.astro).
 *
 * Social/email/passkey (thirdweb In-App Wallet) and external wallets, all
 * funneled through SIWE against our own endpoints — the session cookie is
 * @numinia/auth, not vendor's.
 *
 * Since QA 2026-10-15 (Pablo: «súper limpio, súper sencillito»), the widget
 * is live from the first paint, compact, with no checkbox before it:
 * continuing is accepting (the panel's legal line), and the accepted corpus
 * version still travels with the login request (house-auth.ts; the endpoint
 * refuses a stale one). The states share the panel: the widget, with one
 * short line while the wallet connects or asks for the signature; who you
 * are once in; the way out.
 *
 * Since v0.84.0 it is also the site's one way out:
 * - `?salir=1` signs out — wallet first, then the cookie — and goes home.
 *   Every «Salir» on the site links here, because only this page carries
 *   the wallet code that must disconnect (the chrome never loads it).
 * - A fresh sign-in lands on your profile, or on the room of the player
 *   area the door was opened from (`?vuelta=`, lib/island-session.ts
 *   `landingAfterSignIn`). «Continuar» leads to the same place.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createThirdwebClient } from 'thirdweb';
import {
  AutoConnect,
  ConnectEmbed,
  ThirdwebProvider,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from 'thirdweb/react';
import { SessionPanel, type PanelState } from './SessionPanel';
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
import type { SupportedLocale } from '@numinia/domain';

const clientId = import.meta.env.PUBLIC_THIRDWEB_CLIENT_ID as string | undefined;

const wallets = houseWallets();

/** The widget fills the panel: the panel is the modal, not the widget. */
const WIDGET_STYLE = {
  width: '100%',
  maxWidth: '100%',
  border: 'none',
  boxShadow: 'none',
  background: 'transparent',
} as const;

export interface LoginProps {
  readonly locale: SupportedLocale;
  readonly copy: SignInMessages;
  readonly rankNames: Readonly<Record<string, string>>;
  /** Your profile (Resumen) in the page's language: where a sign-in lands. */
  readonly profileHref: string;
  /** Where «Salir» lands: the home page. */
  readonly homeHref: string;
}

/** The page's client: only ever asked for in the browser. */
const pageClient = () => pageSessionClient(window);

/** Inner component so thirdweb hooks run under ThirdwebProvider. */
function SpikeInner({
  client,
  locale,
  copy,
  rankNames,
  profileHref,
  homeHref,
}: LoginProps & { client: ReturnType<typeof createThirdwebClient> }) {
  const [session, setSession] = useState<PanelState>({ status: 'loading' });
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

  // The page's one session read, owned by the chrome: this island hears
  // the same answer, and every sign-in or sign-out it announces reaches
  // the whole page.
  useEffect(() => {
    let stop: (() => void) | undefined;
    void pageClient().then((page) => {
      stop = page.subscribe(setSession);
    });
    return () => stop?.();
  }, []);
  // Built at once, so the widget is live before the chrome's client is:
  // each call waits for it only when the widget really needs it.
  const auth = useMemo(
    () =>
      houseAuth({
        session: pageClient,
        onSignedIn: () => {
          void pageClient().then((page) => {
            page.changed();
            window.location.assign(landing);
          });
        },
        onSignedOut: () => {
          void pageClient().then((page) => page.changed());
        },
      }),
    [landing],
  );

  // Dropping the cookie is not enough: in-app wallets (Google/email/passkey)
  // sign silently, so a still-connected wallet re-authenticates immediately.
  // Logout therefore disconnects the wallet BEFORE clearing the session.
  const signOut = useCallback(async () => {
    setLeaving(true);
    if (activeWallet) disconnect(activeWallet);
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    await response.text();
    (await pageClient()).changed();
  }, [activeWallet, disconnect]);

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

  const signedIn = session.status === 'in';
  const goingOut = leaving || signOutAsked;
  // Nobody in yet: the way in, from the first paint.
  const atDoor = !signedIn && !goingOut;
  // Connected, the SIWE signature still pending: the exact spot people get
  // lost in, so it says what to do in one line.
  const signing = atDoor && session.status === 'out' && activeAccount !== undefined;
  const connecting = atDoor && !signing && connection === 'connecting';
  const external = activeWallet !== undefined && activeWallet.id !== 'inApp';

  return (
    <div data-sign-in-way>
      {/* Signed in: no widget, only who you are. The wallet still reconnects
          in the background, so «Salir» can disconnect it. */}
      {signedIn && <AutoConnect client={client} wallets={wallets} />}
      {atDoor && (
        <div data-metric="auth-connect">
          <ConnectEmbed
            client={client}
            wallets={wallets}
            locale={WIDGET_LOCALE[locale]}
            theme={WIDGET_THEMES[modo]}
            auth={auth}
            modalSize="compact"
            showThirdwebBranding={false}
            style={WIDGET_STYLE}
          />
        </div>
      )}
      <p role="status" data-door-status>
        {signing ? copy.signHint : connecting ? copy.connecting : ''}
      </p>
      {signing && external && <p data-wallet-note>{copy.walletNote}</p>}
      {signOutAsked && !leaving && <p role="status">{copy.signingOut}</p>}
      <SessionPanel
        session={session}
        copy={copy}
        rankNames={rankNames}
        continueHref={landing}
        leaving={leaving}
        onLogout={handleLogout}
      />
    </div>
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
