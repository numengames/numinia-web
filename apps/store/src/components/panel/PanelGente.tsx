/**
 * «Gente» inside the panel (cut 9): the people of the organization the panel
 * shows, in groups — the Oracles, one group per role under the
 * organization's own names, the rest — each person with their avatar (the
 * Bazar's if they chose one, the initial otherwise), their name, the role
 * and their rank in the city. No presence: no dots, no «en línea» counts.
 *
 * It reads what «Miembros» reads (GET /api/saldo/roles and /api/saldo/ranks)
 * and so shows what Miembros shows: the till refuses a stranger, and then so
 * does this. It only reads, so it never reaches the wallet's chunks (unlike
 * Miembros and Roles): it is a public-class page for the bundle budget.
 */

import { useEffect, useState } from 'react';
import type { Rank, SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import type { GenteMessages } from '../../i18n/panel-gente';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import { readRoles, type DeskRoles } from '../../lib/accounts';
import { groupsOf, type GenteRow } from '../../lib/panel-gente';
import { readRanks } from '../../lib/panel-people';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelFrame } from './PanelFrame';
import { RoleDot } from './PeopleBits';

type Roles =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly view: DeskRoles; readonly you: string | null };

/** The ranks, once asked: a failure only means no rank chips and no Oracles group. */
type Ranks =
  | { readonly at: 'loading' }
  | { readonly at: 'done'; readonly ranks: Readonly<Record<string, Rank | null>> | null };

async function json(url: string): Promise<{ ok: boolean; body: unknown }> {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    return { ok: response.ok, body: await response.json().catch(() => null) };
  } catch {
    return { ok: false, body: null };
  }
}

function Person({
  row,
  people,
  ui,
  words,
}: {
  readonly row: GenteRow;
  readonly people: PeopleMessages;
  readonly ui: SaldoMessages;
  readonly words: GenteMessages;
}) {
  return (
    <li className="gente-fila" data-gente-person={row.wallet}>
      {row.face === null ? (
        <span className="gente-cara gente-inicial" aria-hidden="true" data-gente-initial>
          {row.initial}
        </span>
      ) : (
        <img
          className="gente-cara"
          src={row.face}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          data-gente-face
        />
      )}
      <span className="gente-quien">
        <span className="gente-linea">
          {row.name === null ? (
            <span className="mono gente-cartera" data-gente-name>
              {row.short}
            </span>
          ) : (
            <span className="gente-nombre" data-gente-name>
              {row.name}
            </span>
          )}
          {row.you && <span className="saldo-tu"> ({ui.panel.you})</span>}
        </span>
        {row.name !== null && (
          <span className="mono gente-cartera gente-cartera-pequena">{row.short}</span>
        )}
      </span>
      <span className="gente-chips">
        <span className="saldo-chip gente-chip" data-gente-role>
          <RoleDot color={row.role.color} />
          {row.role.name}
        </span>
        {row.owner && (
          <span className="saldo-chip gente-chip" data-gente-owner>
            {words.owner}
          </span>
        )}
        {row.rank !== null && (
          <span className="saldo-chip gente-chip" data-gente-rank={row.rank}>
            {people.members.ranks[row.rank]}
          </span>
        )}
      </span>
    </li>
  );
}

function Gente({
  org,
  locale,
  words,
  ui,
  people,
  gente,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly ui: SaldoMessages;
  readonly people: PeopleMessages;
  readonly gente: GenteMessages;
}) {
  const [roles, setRoles] = useState<Roles>({ at: 'loading' });
  const [ranks, setRanks] = useState<Ranks>({ at: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // A new organization remounts this; unmounting (or a retry) drops the answers.
    let wanted = true;
    const cuenta = encodeURIComponent(org);
    setRoles({ at: 'loading' });
    setRanks({ at: 'loading' });
    void json(`/api/saldo/roles?cuenta=${cuenta}`).then(({ ok, body }) => {
      if (!wanted) return;
      const read = ok ? readRoles(body) : null;
      setRoles(read === null ? { at: 'failed' } : { at: 'ready', view: read.roles, you: read.you });
    });
    void json(`/api/saldo/ranks?cuenta=${cuenta}`).then(({ ok, body }) => {
      if (wanted) setRanks({ at: 'done', ranks: ok ? readRanks(body) : null });
    });
    return () => {
      wanted = false;
    };
  }, [org, attempt]);

  if (roles.at === 'loading' || (roles.at === 'ready' && ranks.at === 'loading')) {
    return (
      <div className="saldo-estado" role="status">
        <LunaEspera /> {words.loading}
      </div>
    );
  }
  if (roles.at === 'failed') {
    return (
      <div className="saldo-marco saldo-fallo" role="alert" data-gente-failed>
        <p>{words.desk.failed}</p>
        <div>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setAttempt((n) => n + 1)}
            data-metric="panel-gente-retry"
          >
            {words.desk.retry}
          </button>
        </div>
      </div>
    );
  }
  const groups = groupsOf(roles.view, ranks.at === 'done' ? ranks.ranks : null, roles.you);
  if (groups.length === 0) {
    return (
      <p className="saldo-nota" data-gente-none>
        {gente.none}
      </p>
    );
  }
  return (
    <div className="gente-grupos" role="region" aria-label={gente.region} data-gente-groups>
      {groups.map((group) => {
        const title =
          group.kind === 'oracles'
            ? gente.oracles
            : group.kind === 'rest'
              ? gente.rest
              : group.name;
        return (
          <section
            key={group.id}
            className="saldo-marco gente-grupo"
            aria-labelledby={`gente-g-${group.id.replace(/\W/g, '-')}`}
            data-gente-group={group.id}
          >
            <h2 className="etiqueta" id={`gente-g-${group.id.replace(/\W/g, '-')}`}>
              {group.color !== null && <RoleDot color={group.color} />}
              {title}
              {' — '}
              {new Intl.NumberFormat(locale).format(group.rows.length)}
            </h2>
            <ul className="gente-lista">
              {group.rows.map((row) => (
                <Person key={row.wallet} row={row} people={people} ui={ui} words={gente} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function PanelGente({
  locale,
  words,
  signIn,
  saldoHref,
  ui,
  people,
  gente,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  readonly ui: SaldoMessages;
  readonly people: PeopleMessages;
  readonly gente: GenteMessages;
}) {
  return (
    <PanelFrame locale={locale} face="gente" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team, panel) => (
        <Gente
          key={team.id}
          org={team.id}
          locale={locale}
          words={panel.words}
          ui={ui}
          people={people}
          gente={gente}
        />
      )}
    </PanelFrame>
  );
}
