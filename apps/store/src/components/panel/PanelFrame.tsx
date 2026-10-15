/**
 * «El panel» (the island): an organization's panel around one screen — the
 * organization's switcher, the rail of pieces and, beside them, the screen
 * of the piece the page is. The page is static; what belongs to the person
 * comes from /api/saldo, which reads the session and asks the till, so
 * nothing is made up here.
 *
 * The organization is the address's `?org=<account id>` (lib/panel.ts): no
 * storage, so a link carries the choice, and every link of the rail keeps
 * it. One organization: it is shown; several: a labelled <select> changes
 * the address; none: a sentence and the way to Saldo, where one is created;
 * signed out: the usual sign-in card.
 *
 * The rail is drawn here, but the Oracle's rooms keep the page-wide mark
 * the chrome paints (`data-session-ranks="oracle" hidden`, TopBar's one
 * session read): that zone is rendered in every state, at the same place,
 * so it is never mounted after the chrome has painted and left hidden.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import { readOverview, type DeskAccount } from '../../lib/accounts';
import {
  PIECES,
  ROOMS,
  chooseTeam,
  initialsOf,
  orgFromSearch,
  pieceHref,
  searchWithOrg,
  type BuiltPiece,
} from '../../lib/panel';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelGlyph } from './PanelGlyph';

type Phase =
  | { readonly at: 'loading' }
  | { readonly at: 'signed-out' }
  | { readonly at: 'not-bound' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly teams: readonly DeskAccount[] };

/** What the page is showing, as the stylesheet and the tests read it. */
type State = 'loading' | 'signed-out' | 'not-bound' | 'failed' | 'empty' | 'ready';

export interface PanelFrameProps {
  readonly locale: SupportedLocale;
  /** The screen this page is. */
  readonly face: BuiltPiece;
  readonly words: PanelMessages;
  /** The door, coming back to this very screen. */
  readonly signIn: string;
  /** Where an organization is created (Saldo), under the visitor's locale. */
  readonly saldoHref: string;
  /** The screen, for the organization shown (a new organization remounts it). */
  readonly children?: (team: DeskAccount) => ReactNode;
  /** Always drawn below the screen, whatever the state: the Summary's cards. */
  readonly footer?: (shown: { readonly org: string | null; readonly ready: boolean }) => ReactNode;
}

export function PanelFrame({
  locale,
  face,
  words,
  signIn,
  saldoHref,
  children,
  footer,
}: PanelFrameProps) {
  const [phase, setPhase] = useState<Phase>({ at: 'loading' });
  // Read from the address after hydration, never in the initial state: the page is prerendered.
  const [wanted, setWanted] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/saldo', { headers: { accept: 'application/json' } });
      const json: unknown = await response.json().catch(() => null);
      if (response.status === 401) return setPhase({ at: 'signed-out' });
      if (response.status === 503) return setPhase({ at: 'not-bound' });
      const accounts = response.ok ? readOverview(json) : null;
      if (accounts === null) return setPhase({ at: 'failed' });
      setPhase({ at: 'ready', teams: accounts.filter((account) => account.kind === 'team') });
    } catch {
      setPhase({ at: 'failed' });
    }
  }, []);

  useEffect(() => {
    const read = (): void => setWanted(orgFromSearch(window.location.search));
    read();
    window.addEventListener('popstate', read);
    void loadOverview();
    return () => window.removeEventListener('popstate', read);
  }, [loadOverview]);

  // The phone's rail is a strip: bring the current piece into view inside it, and
  // fade an edge only where something hides behind it (what the LAP's rail does).
  useEffect(() => {
    const strip = list.current;
    const nav = strip?.closest('nav');
    if (!strip || !nav) return;
    const fades = (): void => {
      const room = strip.scrollWidth - strip.clientWidth;
      nav.toggleAttribute('data-fade-left', room > 0 && strip.scrollLeft > 4);
      nav.toggleAttribute('data-fade-right', room > 0 && strip.scrollLeft < room - 4);
    };
    const here = strip.querySelector<HTMLElement>('a[aria-current="page"]');
    if (here && strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft = here.offsetLeft - (strip.clientWidth - here.offsetWidth) / 2;
    }
    fades();
    strip.addEventListener('scroll', fades, { passive: true });
    window.addEventListener('resize', fades, { passive: true });
    return () => {
      strip.removeEventListener('scroll', fades);
      window.removeEventListener('resize', fades);
    };
  }, []);

  const teams = phase.at === 'ready' ? phase.teams : [];
  const team = chooseTeam(teams, wanted);
  const state: State = phase.at === 'ready' ? (team === null ? 'empty' : 'ready') : phase.at;
  const org = team?.id ?? null;
  const several = teams.length > 1;
  const name = team?.name ?? '';

  /** A new organization: the address says so (back returns to the last one) and the screen follows. */
  const choose = (id: string): void => {
    window.history.pushState(
      null,
      '',
      `${window.location.pathname}${searchWithOrg(window.location.search, id)}`,
    );
    setWanted(id);
  };

  return (
    <div className="panel" data-org-panel data-face={face} data-state={state}>
      <div className="panel-cambia" data-org-switch>
        <span className="panel-cara" aria-hidden="true">
          {team === null ? '·' : initialsOf(name)}
        </span>
        <div className="panel-cambia-cuerpo">
          {several ? (
            <>
              <label className="panel-pequeno" htmlFor="org-switch">
                {words.switcher}
              </label>
              <select
                id="org-switch"
                className="panel-selector"
                value={org ?? ''}
                onChange={(event) => choose(event.target.value)}
                data-metric="panel-org"
              >
                {teams.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name ?? candidate.id}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <span className="panel-pequeno">{words.switcher}</span>
              <strong className="panel-nombre">{name}</strong>
            </>
          )}
        </div>
        {several && <PanelGlyph name="caret-down" size={16} />}
      </div>

      <nav className="panel-riel" aria-label={words.railLabel} data-org-rail>
        <p className="etiqueta">{`${words.piecesLabel} · ${PIECES.length}`}</p>
        <ul ref={list} data-piece-list>
          {PIECES.map((piece) => {
            const label = words.names[piece.id];
            const href = pieceHref(locale, piece, org);
            if (href === null) {
              // Not built: a place in the list, never a link that fails.
              return (
                <li key={piece.id} data-piece={piece.id} data-building="">
                  <span className="panel-fila">
                    <PanelGlyph name={piece.icon} size={18} />
                    <span className="texto">{label}</span>
                    <span className="obra">
                      <PanelGlyph name="crane-tower" size={14} />
                      <span className="obra-texto">{words.building}</span>
                    </span>
                  </span>
                </li>
              );
            }
            return (
              <li key={piece.id} data-piece={piece.id}>
                <a
                  href={href}
                  aria-current={piece.id === face ? 'page' : undefined}
                  title={label}
                  data-metric={`panel-nav-${piece.id}`}
                >
                  <PanelGlyph name={piece.icon} size={18} />
                  <span className="texto">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div
          className="panel-salas"
          data-org-rooms
          data-session-ranks="oracle"
          hidden
          suppressHydrationWarning
        >
          <p className="etiqueta">{words.roomsLabel}</p>
          <ul>
            {ROOMS.map((room) => (
              <li key={room.id}>
                <a
                  href={pieceHref(locale, room, org) ?? undefined}
                  title={words.rooms[room.id].name}
                  data-metric={`panel-room-${room.id}`}
                >
                  <PanelGlyph name={room.icon} size={18} />
                  <span className="texto">{words.rooms[room.id].name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="panel-contenido" data-org-content>
        <header className="panel-titulo">
          {team !== null && (
            <p className="etiqueta" data-org-name>
              {name}
            </p>
          )}
          <h1 className="display-m">{words.names[face]}</h1>
          <p className="panel-lead">{words.leads[face]}</p>
        </header>

        {state === 'loading' && (
          <div className="saldo-estado" role="status">
            <LunaEspera /> {words.loading}
          </div>
        )}
        {state === 'signed-out' && (
          <div className="saldo-marco saldo-fuera" data-org-signed-out>
            <h2>{words.signedOut.title}</h2>
            <p className="saldo-nota">{words.signedOut.text}</p>
            <div>
              <a className="btn btn-primario" href={signIn} data-metric="panel-sign-in">
                {words.signedOut.cta}
              </a>
            </div>
          </div>
        )}
        {(state === 'not-bound' || state === 'failed') && (
          <div className="saldo-marco saldo-fallo" role="alert" data-org-failed>
            <p>{state === 'not-bound' ? words.desk.notBound : words.desk.failed}</p>
            <div>
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => {
                  setPhase({ at: 'loading' });
                  void loadOverview();
                }}
                data-metric="panel-retry"
              >
                {words.desk.retry}
              </button>
            </div>
          </div>
        )}
        {state === 'empty' && (
          <div className="saldo-marco" data-org-none>
            <p className="saldo-nota">{words.none.text}</p>
            <div>
              <a className="btn btn-primario" href={saldoHref} data-metric="panel-none-saldo">
                {words.none.cta}
              </a>
            </div>
          </div>
        )}
        {team !== null && children?.(team)}
        {footer?.({ org, ready: team !== null })}
      </div>
    </div>
  );
}
