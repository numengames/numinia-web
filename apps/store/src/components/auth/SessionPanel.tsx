/**
 * What the sign-in page shows once you are in (MISSION-002), in the
 * reader's language: your rank by its name, the short wallet, «Continuar»
 * back to where you came from and the one «Salir». Split out of LoginSpike
 * so each file stays inside the 200-line rule.
 */

import type { SignInMessages } from '../../i18n/sign-in';
import type { SessionView } from '../../lib/session-client';

export type PanelState = SessionView | { readonly status: 'loading' };

interface Props {
  readonly session: PanelState;
  readonly copy: SignInMessages;
  /** Every rank's name in the reader's language, by rank id. */
  readonly rankNames: Readonly<Record<string, string>>;
  /** Where «Continuar» leads: the page the person came from, or Perfil. */
  readonly continueHref: string;
  readonly leaving: boolean;
  readonly onLogout: () => void;
}

export function SessionPanel({ session, copy, rankNames, continueHref, leaving, onLogout }: Props) {
  if (leaving) return <p role="status">{copy.signingOut}</p>;
  if (session.status === 'loading') return <p role="status">{copy.checking}</p>;
  if (session.status === 'out') return null;
  return (
    <div data-session-panel>
      <p className="hecho">{copy.signedIn}</p>
      <dl>
        <div>
          <dt className="etiqueta">{copy.rank}</dt>
          <dd data-spike-session-rank={session.rank}>{rankNames[session.rank] ?? session.rank}</dd>
        </div>
        <div>
          <dt className="etiqueta">{copy.wallet}</dt>
          <dd className="mono">{session.short}</dd>
        </div>
      </dl>
      <div className="acciones">
        <a className="btn btn-primario" href={continueHref} data-metric="auth-continue">
          {copy.continue}
        </a>
        <button
          type="button"
          className="btn btn-fantasma"
          data-metric="auth-logout"
          onClick={onLogout}
        >
          {copy.signOut}
        </button>
      </div>
    </div>
  );
}
