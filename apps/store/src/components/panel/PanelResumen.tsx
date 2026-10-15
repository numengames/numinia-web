/**
 * «Resumen» (the panel's first piece): the organization at a glance — what
 * you are in it (owner, the house or a member) with the roles you hold, and
 * a card per piece the way the LAP's overview has one per door: the screens
 * that exist are links, the ones still to be built say «En construcción»
 * and lead nowhere, and the Oracle's rooms are signposted to the Oracle.
 *
 * What you are comes from /api/saldo/roles, the same answer «Miembros y
 * roles» reads, so the two never disagree.
 */

import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import { readRoles, type DeskAccount } from '../../lib/accounts';
import { PIECES, ROOMS, pieceHref, standingIn, type Standing } from '../../lib/panel';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelFrame } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';

type Read =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly standing: Standing };

function YouAre({ team, words }: { readonly team: DeskAccount; readonly words: PanelMessages }) {
  const [read, setRead] = useState<Read>({ at: 'loading' });

  useEffect(() => {
    // A new organization remounts this, so one answer is awaited; unmounting drops it.
    let wanted = true;
    const load = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/saldo/roles?cuenta=${encodeURIComponent(team.id)}`, {
          headers: { accept: 'application/json' },
        });
        const json: unknown = await response.json().catch(() => null);
        const answer = response.ok ? readRoles(json) : null;
        if (!wanted) return;
        setRead(
          answer === null
            ? { at: 'failed' }
            : { at: 'ready', standing: standingIn(answer.roles, answer.you) },
        );
      } catch {
        if (wanted) setRead({ at: 'failed' });
      }
    };
    void load();
    return () => {
      wanted = false;
    };
  }, [team.id]);

  const { standing } = words;
  return (
    <section className="tarjeta panel-tu" data-org-you aria-labelledby="org-you-t">
      <h2 className="etiqueta" id="org-you-t">
        {standing.label}
      </h2>
      {read.at === 'loading' && (
        <div className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </div>
      )}
      {read.at === 'failed' && <p className="saldo-nota">{words.desk.failed}</p>}
      {read.at === 'ready' && (
        <>
          <p className="panel-tu-linea">
            <span className="saldo-chip" data-org-as={read.standing.as}>
              {standing.as[read.standing.as]}
            </span>
            <span>{standing.says[read.standing.as]}</span>
          </p>
          {(read.standing.as === 'member' || read.standing.roles.length > 0) && (
            <div className="saldo-fichas">
              <span className="saldo-nota">{standing.roles}</span>
              {read.standing.roles.length === 0 ? (
                <span className="saldo-nota">{standing.noRoles}</span>
              ) : (
                read.standing.roles.map((role) => (
                  <span key={role.id} className="saldo-chip" data-org-role>
                    {role.name}
                  </span>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** A card of the Summary: a link, or — while the piece is not built — a place that says so. */
function Cards({
  locale,
  words,
  org,
  ready,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly org: string | null;
  readonly ready: boolean;
}) {
  return (
    <div className="panel-zona" data-org-cards hidden={!ready}>
      <section aria-labelledby="org-cards-t">
        <h2 className="etiqueta" id="org-cards-t">
          {words.piecesLabel}
        </h2>
        <ul className="panel-cartas">
          {PIECES.filter((piece) => piece.id !== 'summary').map((piece) => {
            const name = words.names[piece.id];
            const note = piece.kind === 'built' ? words.leads[piece.id] : words.notes[piece.id];
            const body = (
              <>
                <PanelGlyph name={piece.icon} size={20} />
                <h3>{name}</h3>
                <p>{note}</p>
              </>
            );
            return (
              <li key={piece.id}>
                {piece.kind === 'built' ? (
                  <a
                    className="tarjeta panel-carta"
                    href={pieceHref(locale, piece, org) ?? undefined}
                    data-org-card={piece.id}
                    data-metric={`panel-card-${piece.id}`}
                  >
                    {body}
                  </a>
                ) : (
                  <div className="tarjeta panel-carta" data-org-card={piece.id} data-building="">
                    {body}
                    <span className="obra">
                      <PanelGlyph name="crane-tower" size={14} />
                      <span>{words.building}</span>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section
        className="panel-salas-cartas"
        aria-labelledby="org-rooms-t"
        data-org-rooms
        data-session-ranks="oracle"
        hidden
        suppressHydrationWarning
      >
        <h2 className="etiqueta" id="org-rooms-t">
          {words.roomsLabel}
        </h2>
        <ul className="panel-cartas">
          {ROOMS.map((room) => (
            <li key={room.id}>
              <a
                className="tarjeta panel-carta"
                href={pieceHref(locale, room, org) ?? undefined}
                data-org-card={room.id}
                data-metric={`panel-room-card-${room.id}`}
              >
                <PanelGlyph name={room.icon} size={20} />
                <h3>{words.rooms[room.id].name}</h3>
                <p>{words.rooms[room.id].note}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PanelResumen({
  locale,
  words,
  signIn,
  saldoHref,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
}) {
  return (
    <PanelFrame
      locale={locale}
      face="summary"
      words={words}
      signIn={signIn}
      saldoHref={saldoHref}
      footer={({ org, ready }) => <Cards locale={locale} words={words} org={org} ready={ready} />}
    >
      {(team) => <YouAre key={team.id} team={team} words={words} />}
    </PanelFrame>
  );
}
