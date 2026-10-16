/**
 * «Resumen» (the panel's first piece): the organization at a glance — what
 * you are in it (owner, the house or a member) with the roles you hold; four
 * cards like the prototype's (cut 2026-10-16 «el dinero»): the worlds with a
 * charge in the last 30 days, the next encounter of its community, its
 * people with the roles shown apart, and its balance with how long it
 * lasts; «Lo último», the newest of its log and of its top-ups; and below,
 * a card per piece the way the LAP's overview has one per door: the screens
 * that exist are links, the ones still to be built say «En construcción»
 * and lead nowhere, and the Oracle's rooms are signposted to the Oracle.
 *
 * Everything comes from the till, read once per organization:
 * /api/saldo/roles (what you are and the people — the same answer «Miembros
 * y roles» reads, so the two never disagree), the statement of the last 30
 * days and the log. What the till refuses this person is not drawn. The
 * next encounter comes from a map made when the site is built
 * (PanelSummary.astro), never from the browser.
 */

import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import type { PanelSummaryMessages } from '../../i18n/panel-summary';
import {
  fill,
  formatAt,
  formatEuros,
  readAccess,
  readLog,
  readRoles,
  readStatement,
  shortWallet,
  type DeskAccess,
  type DeskAccount,
  type DeskLogLine,
  type DeskRoles,
  type DeskStatement,
} from '../../lib/accounts';
import { PIECES, ROOMS, pieceHref, standingIn, type Standing } from '../../lib/panel';
import {
  chargedWorlds,
  latestOf,
  nextEncounter,
  peopleOf,
  type EncounterMap,
  type LatestEntry,
  type NextEncounter,
} from '../../lib/panel-summary';
import { runwayOf } from '../../lib/saldo-view';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelFrame } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';

type Load<T> =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly value: T };

/** One read of the till for this organization: its answer, or failed (refused, or not there). */
async function load<T>(url: string, parse: (json: unknown) => T | null): Promise<Load<T>> {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const json: unknown = await response.json().catch(() => null);
    const value = response.ok ? parse(json) : null;
    return value === null ? { at: 'failed' } : { at: 'ready', value };
  } catch {
    return { at: 'failed' };
  }
}

interface Sheet {
  readonly statement: DeskStatement;
  readonly access: DeskAccess | null;
}

function readSheet(json: unknown): Sheet | null {
  const statement = readStatement(json);
  return statement === null ? null : { statement, access: readAccess(json) };
}

const MEMBERS = PIECES.find((piece) => piece.id === 'members');
const BALANCE = PIECES.find((piece) => piece.id === 'balance');

function YouAre({ read, words }: { readonly read: Load<Standing>; readonly words: PanelMessages }) {
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
            <span className="saldo-chip" data-org-as={read.value.as}>
              {standing.as[read.value.as]}
            </span>
            <span>{standing.says[read.value.as]}</span>
          </p>
          {(read.value.as === 'member' || read.value.roles.length > 0) && (
            <div className="saldo-fichas">
              <span className="saldo-nota">{standing.roles}</span>
              {read.value.roles.length === 0 ? (
                <span className="saldo-nota">{standing.noRoles}</span>
              ) : (
                read.value.roles.map((role) => (
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

function nextWhen(summary: PanelSummaryMessages, next: NextEncounter): string {
  if (next.when === 'now') return summary.next.now;
  return next.days <= 1 ? summary.next.soon : fill(summary.next.inDays, { n: next.days });
}

function entryText(summary: PanelSummaryMessages, entry: LatestEntry, lang: string): string {
  if (entry.kind === 'topup') {
    return fill(summary.latest.topup, { amount: formatEuros(entry.amountCents, lang) });
  }
  const { line } = entry;
  const name = line.detail?.['name'];
  return [
    summary.latest.acts[line.act] ?? line.act,
    name === undefined ? '' : ` · ${name}`,
    line.subject === null ? '' : ` → ${shortWallet(line.subject)}`,
  ].join('');
}

/** The balance card's second line: how long it lasts, or Saldo's words when nothing is left. */
function lastsText(summary: PanelSummaryMessages, statement: DeskStatement): string | null {
  const runway = runwayOf(statement.balanceCents, statement.pace);
  if (runway === null) return null;
  if (runway.kind === 'empty') return summary.balance.empty;
  if (runway.kind === 'still') return summary.balance.runwayStill;
  if (runway.days === 0) return summary.balance.runwayLess;
  return runway.days === 1
    ? summary.balance.runwayOne
    : fill(summary.balance.runway, { n: runway.days });
}

/** What you are here, the four cards and «Lo último», for one organization. */
function Glance({
  team,
  locale,
  words,
  summary,
  encounters,
}: {
  readonly team: DeskAccount;
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly summary: PanelSummaryMessages;
  readonly encounters: EncounterMap;
}) {
  const [roles, setRoles] = useState<Load<{ roles: DeskRoles; you: string | null }>>({
    at: 'loading',
  });
  const [sheet, setSheet] = useState<Load<Sheet>>({ at: 'loading' });
  const [log, setLog] = useState<Load<DeskLogLine[]>>({ at: 'loading' });
  const [now] = useState(() => new Date());

  useEffect(() => {
    // A new organization remounts this, so one answer of each is awaited; unmounting drops them.
    let wanted = true;
    const cuenta = encodeURIComponent(team.id);
    void load(`/api/saldo/roles?cuenta=${cuenta}`, readRoles).then((read) => {
      if (wanted) setRoles(read);
    });
    void load(`/api/saldo/statement?cuenta=${cuenta}&rango=30d`, readSheet).then((read) => {
      if (wanted) setSheet(read);
    });
    void load(`/api/saldo/log?cuenta=${cuenta}`, readLog).then((read) => {
      if (wanted) setLog(read);
    });
    return () => {
      wanted = false;
    };
  }, [team.id]);

  const standing: Load<Standing> =
    roles.at === 'ready'
      ? { at: 'ready', value: standingIn(roles.value.roles, roles.value.you) }
      : roles;
  const settled = roles.at !== 'loading' && sheet.at !== 'loading' && log.at !== 'loading';
  const people = roles.at === 'ready' ? peopleOf(roles.value.roles) : null;
  const statement = sheet.at === 'ready' ? sheet.value.statement : null;
  const charged = statement === null ? null : chargedWorlds(statement.worlds);
  const next = nextEncounter(encounters, team.id, now);
  // The house's own reads stay in the whole log; «Lo último» tells what was done.
  const told = log.at === 'ready' ? log.value.filter((line) => line.act !== 'house-read') : null;
  const entries = latestOf(told, statement?.lines ?? null);
  const membersHref = MEMBERS === undefined ? null : pieceHref(locale, MEMBERS, team.id);
  const balanceHref = BALANCE === undefined ? null : pieceHref(locale, BALANCE, team.id);
  const lasts = statement === null ? null : lastsText(summary, statement);

  return (
    <>
      <YouAre read={standing} words={words} />
      {settled && (
        <div className="saldo-resumen-zona">
          <div className="saldo-resumen" data-summary-cards>
            {charged !== null && (
              <section
                className="tarjeta saldo-kpi"
                aria-labelledby="summary-venues-t"
                data-summary-card="venues"
              >
                <h2 className="etiqueta" id="summary-venues-t">
                  {summary.venues.title}
                </h2>
                {charged === 0 ? (
                  <>
                    <p className="saldo-kpi-texto">{summary.venues.none}</p>
                    <p className="saldo-nota">{summary.venues.noneNote}</p>
                  </>
                ) : (
                  <>
                    <p className="saldo-kpi-valor mono">{charged}</p>
                    <p className="saldo-nota">
                      {charged === 1 ? summary.venues.chargedOne : summary.venues.charged}
                    </p>
                  </>
                )}
              </section>
            )}
            <section
              className="tarjeta saldo-kpi"
              aria-labelledby="summary-next-t"
              data-summary-card="next"
            >
              <h2 className="etiqueta" id="summary-next-t">
                {summary.next.title}
              </h2>
              {next === null ? (
                <>
                  <p className="saldo-kpi-texto">{summary.next.none}</p>
                  <p className="saldo-nota">{summary.next.noneNote}</p>
                </>
              ) : (
                <>
                  <p className="saldo-kpi-texto">
                    <a href={next.encounter.href} data-metric="panel-summary-next">
                      {next.encounter.title}
                    </a>
                  </p>
                  <p className="saldo-nota">
                    {nextWhen(summary, next)} ·{' '}
                    <time dateTime={next.encounter.startsAt}>
                      {formatAt(next.encounter.startsAt, locale)}
                    </time>
                  </p>
                </>
              )}
            </section>
            {people !== null && (
              <section
                className="tarjeta saldo-kpi"
                aria-labelledby="summary-people-t"
                data-summary-card="people"
              >
                <h2 className="etiqueta" id="summary-people-t">
                  {summary.people.title}
                </h2>
                <p className="saldo-kpi-valor mono">
                  {people.members}
                  <small>
                    {people.members === 1 ? summary.people.membersOne : summary.people.members}
                  </small>
                </p>
                {people.hoisted.length > 0 && (
                  <p className="saldo-chips">
                    {people.hoisted.map((role) => (
                      <span key={role.id} className="saldo-chip" data-summary-role>
                        <span
                          className="saldo-punto-rol"
                          style={role.color === null ? undefined : { background: role.color }}
                          aria-hidden="true"
                        />
                        {role.name} · {role.members}
                      </span>
                    ))}
                  </p>
                )}
                {membersHref !== null && (
                  <a href={membersHref} data-metric="panel-summary-people">
                    {words.names.members} <span aria-hidden="true">→</span>
                  </a>
                )}
              </section>
            )}
            {statement !== null && (
              <section
                className="tarjeta saldo-kpi"
                aria-labelledby="summary-balance-t"
                data-summary-card="balance"
              >
                <h2 className="etiqueta" id="summary-balance-t">
                  {summary.balance.title}
                </h2>
                <p className="saldo-kpi-valor mono">
                  {formatEuros(statement.balanceCents, locale)}
                </p>
                {lasts !== null && <p className="saldo-nota">{lasts}</p>}
                {balanceHref !== null && (
                  <a href={balanceHref} data-metric="panel-summary-balance">
                    {words.names.balance} <span aria-hidden="true">→</span>
                  </a>
                )}
              </section>
            )}
          </div>
          {(told !== null || statement !== null) && (
            <section
              className="saldo-seccion"
              aria-labelledby="summary-latest-t"
              data-summary-latest
            >
              <div className="saldo-cabeza">
                <div className="saldo-cabeza-texto">
                  <p className="etiqueta">{summary.latest.label}</p>
                  <h2 id="summary-latest-t">{summary.latest.title}</h2>
                </div>
                {told !== null && membersHref !== null && (
                  <a href={membersHref} data-metric="panel-summary-log">
                    {summary.latest.log} <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
              <div className="saldo-marco">
                {entries.length === 0 ? (
                  <p className="saldo-nota">{summary.latest.empty}</p>
                ) : (
                  <ul className="saldo-ultimo">
                    {entries.map((entry, i) => (
                      <li key={`${entry.at}-${i}`}>
                        <span>{entryText(summary, entry, locale)}</span>
                        <time dateTime={entry.at}>{formatAt(entry.at, locale)}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </>
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
  summary,
  encounters,
  signIn,
  saldoHref,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  /** The four cards' and «Lo último»'s words. */
  readonly summary: PanelSummaryMessages;
  /** Per organization, its community's upcoming encounters, made when the site was built. */
  readonly encounters: EncounterMap;
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
      {(team) => (
        <Glance
          key={team.id}
          team={team}
          locale={locale}
          words={words}
          summary={summary}
          encounters={encounters}
        />
      )}
    </PanelFrame>
  );
}
