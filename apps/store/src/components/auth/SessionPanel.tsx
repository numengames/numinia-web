/**
 * What the sign-in door shows once you are in (MISSION-002), in the
 * reader's language: your rank by its name, the short wallet, «Continuar»
 * to where a sign-in lands and the one «Salir». The panel's title already
 * says you are in (SessionPage.astro, painted by the chrome). Split out of
 * LoginSpike so each file stays inside the 200-line rule.
 */

import type { SignInMessages } from '../../i18n/sign-in';
import type { SessionView } from '../../lib/session-client';

export type PanelState = SessionView | { readonly status: 'loading' };

interface Props {
  readonly session: PanelState;
  readonly copy: SignInMessages;
  /** Every rank's name in the reader's language, by rank id. */
  readonly rankNames: Readonly<Record<string, string>>;
  /** Where «Continuar» leads: your profile, or the room you came from. */
  readonly continueHref: string;
  readonly leaving: boolean;
  readonly onLogout: () => void;
}

export function SessionPanel({ session, copy, rankNames, continueHref, leaving, onLogout }: Props) {
  if (leaving) return <p role="status">{copy.signingOut}</p>;
  if (session.status !== 'in') return null;
  return (
    <div data-session-panel>
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
