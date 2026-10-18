/**
 * «Encuentros» inside the panel (v3, carril 5): the encounters of the
 * organization's community — the community whose file names the
 * organization, or the one the house opened it for — upcoming nearest first
 * and held latest first, each with its page, plus the way to the community's
 * page and its calendar. The lists were made when the site was built
 * (lib/panel-encounters.ts `gatheringsMap`, ./PanelGatherings.astro), the same
 * the community's own page shows; an organization with no community page
 * says so instead of drawing an empty list.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { PanelGatheringsMessages } from '../../i18n/panel-gatherings';
import type { PanelMessages } from '../../i18n/panel';
import type { GatheringRow, Gatherings, GatheringsMap } from '../../lib/panel-encounters';
import { PanelFrame } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';

function Rows({
  rows,
  empty,
  metric,
}: {
  readonly rows: readonly GatheringRow[];
  readonly empty: string;
  readonly metric: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="saldo-nota" data-gatherings-empty>
        {empty}
      </p>
    );
  }
  return (
    <ul className="encuentros-lista">
      {rows.map((row) => (
        <li key={row.id} className="tarjeta encuentros-fila" data-gathering={row.id}>
          <span className="sedes-icono" aria-hidden="true">
            <PanelGlyph name="calendar-blank" size={18} />
          </span>
          <span className="sedes-cuerpo">
            <a className="encuentros-titulo" href={row.href} data-metric={metric}>
              {row.title}
            </a>
            <span className="small">
              {row.when} {row.year} · {row.where}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Lists({
  entry,
  ui,
}: {
  readonly entry: Gatherings | null;
  readonly ui: PanelGatheringsMessages;
}) {
  if (entry === null) {
    return (
      <div className="saldo-marco" data-gatherings-none>
        <h2>{ui.noCommunity.title}</h2>
        <p className="saldo-nota">{ui.noCommunity.text}</p>
      </div>
    );
  }
  return (
    <section className="encuentros" data-gatherings={entry.community.id}>
      <div className="tarjeta encuentros-cabeza">
        <div className="sedes-cuerpo">
          <span className="etiqueta">{ui.community}</span>
          <strong className="sedes-nombre">{entry.community.name}</strong>
        </div>
        <a
          className="btn btn-fantasma btn-sm"
          href={entry.community.href}
          data-metric="panel-gatherings-community"
        >
          {ui.itsPage}
        </a>
        <a
          className="btn btn-fantasma btn-sm"
          href={entry.community.calendar}
          data-metric="panel-gatherings-subscribe"
        >
          {ui.subscribe}
        </a>
      </div>
      <h2 className="etiqueta encuentros-h2">
        {ui.upcoming} · {entry.upcoming.length}
      </h2>
      <Rows rows={entry.upcoming} empty={ui.noUpcoming} metric="panel-gatherings-upcoming" />
      <h2 className="etiqueta encuentros-h2">
        {ui.held} · {entry.held.length}
      </h2>
      <Rows rows={entry.held} empty={ui.noHeld} metric="panel-gatherings-held" />
      <p className="saldo-nota">{ui.publishNote}</p>
    </section>
  );
}

export function PanelEncuentros({
  locale,
  words,
  signIn,
  saldoHref,
  ui,
  gatherings,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  readonly ui: PanelGatheringsMessages;
  /** Per organization, its community's encounters, made when the site was built. */
  readonly gatherings: GatheringsMap;
}) {
  return (
    <PanelFrame
      locale={locale}
      face="gatherings"
      words={words}
      signIn={signIn}
      saldoHref={saldoHref}
    >
      {(team) => <Lists key={team.id} entry={gatherings[team.id] ?? null} ui={ui} />}
    </PanelFrame>
  );
}
