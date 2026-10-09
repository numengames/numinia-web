/**
 * The worlds room: asks the session-gated endpoint and shows only what it
 * answers. Without the Oracle rank it shows the refusal, never a world.
 *
 * Shaped after the Alchemists' Tower dashboard: the figures on top, search
 * and filters that combine, three views (cards with their cover, a list,
 * by server), a wizard to ask for a new world, stop/start/close by
 * proposal, the orders that break the depot's rule, and the fleet's history.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  fill,
  filterRows,
  fleetHistoryUrl,
  fleetServers,
  fleetStats,
  type StatusFilter,
  type WorldCardInfo,
  type WorldRow,
  type WorldStatus,
} from '../../../lib/worlds';
import { LunaEspera } from '../../chrome/LunaEspera';
import { ChangeDialog, NewWorldDialog } from './WorldDialogs';
import { CardsView, ListView, ServersView, type WorldAction } from './WorldViews';

export interface WorldsLabels {
  readonly forbidden: string;
  readonly forbiddenNote: string;
  readonly signedAs: string;
}

interface HistoryEntry {
  readonly sha: string;
  readonly subject: string;
  readonly author: string;
  readonly date: string;
  readonly url: string;
}

interface Fleet {
  readonly rank: string;
  readonly canPropose: boolean;
  readonly rows: readonly WorldRow[];
  readonly cards: readonly WorldCardInfo[];
  readonly invalid: readonly { readonly file: string; readonly problems: readonly string[] }[];
  readonly history: readonly HistoryEntry[];
}

type Panel =
  | { readonly at: 'loading' }
  | { readonly at: 'forbidden' }
  | { readonly at: 'error'; readonly detail: string }
  | { readonly at: 'ready'; readonly fleet: Fleet };

type View = 'cards' | 'list' | 'servers';

const VIEWS: readonly View[] = ['cards', 'list', 'servers'];
const STATUS_ORDER: readonly WorldStatus[] = [
  'running',
  'unreachable',
  'stopped',
  'requested',
  'unknown',
];

export function WorldsPanel({ labels, room }: { labels: WorldsLabels; room: WorldsRoomMessages }) {
  const [panel, setPanel] = useState<Panel>({ at: 'loading' });
  const [view, setView] = useState<View>('cards');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [server, setServer] = useState('');
  const [wizard, setWizard] = useState(false);
  const [change, setChange] = useState<{ row: WorldRow; action: WorldAction } | null>(null);

  const load = useCallback(() => {
    let alive = true;
    fetch('/api/admin/worlds')
      .then(async (response) => {
        if (!alive) return;
        if (response.status === 403) return setPanel({ at: 'forbidden' });
        const data = (await response.json().catch(() => ({}))) as Partial<Fleet> & {
          status?: number;
        };
        if (!response.ok)
          return setPanel({ at: 'error', detail: `${response.status}/${data.status ?? '?'}` });
        setPanel({ at: 'ready', fleet: data as Fleet });
      })
      .catch((error: unknown) => {
        if (alive) setPanel({ at: 'error', detail: error instanceof Error ? error.message : '?' });
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const rows = panel.at === 'ready' ? panel.fleet.rows : [];
  const stats = useMemo(() => fleetStats(rows), [rows]);
  const servers = useMemo(() => fleetServers(rows), [rows]);
  const visible = useMemo(
    () => filterRows(rows, { query, status, server }),
    [rows, query, status, server],
  );
  const present = STATUS_ORDER.filter((candidate) => rows.some((row) => row.status === candidate));

  if (panel.at === 'loading') {
    return (
      <div data-worlds-panel>
        <p className="estado">
          <LunaEspera /> {room.loading}
        </p>
      </div>
    );
  }
  if (panel.at === 'forbidden') {
    return (
      <div data-worlds-panel>
        <div className="tarjeta refuso" role="note">
          <p>
            <strong>{labels.forbidden}</strong>
          </p>
          <p>{labels.forbiddenNote}</p>
        </div>
      </div>
    );
  }
  if (panel.at === 'error') {
    return (
      <div data-worlds-panel>
        <div className="estado fallo" role="alert">
          <p>{fill(room.failed, { detail: panel.detail })}</p>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => {
              setPanel({ at: 'loading' });
              load();
            }}
            data-metric="worlds-retry"
          >
            {room.retry}
          </button>
        </div>
      </div>
    );
  }

  const { fleet } = panel;
  const refresh = (): void => {
    load();
  };
  const onAction = (row: WorldRow, action: WorldAction): void => setChange({ row, action });
  const viewName: Readonly<Record<View, string>> = {
    cards: room.views.cards,
    list: room.views.list,
    servers: room.views.servers,
  };

  return (
    <div data-worlds-panel>
      <div className="barra-sala">
        <p className="sesion">
          <span className="etiqueta">{labels.signedAs}</span>{' '}
          <span className="mono">{fleet.rank}</span>
        </p>
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => setWizard(true)}
          data-metric="worlds-new"
        >
          + {room.actions.newWorld}
        </button>
      </div>
      {!fleet.canPropose && <p className="nota llave">{room.keyless}</p>}

      <dl className="cifras">
        {(
          [
            ['total', room.stats.total, stats.total],
            ['running', room.stats.running, stats.running],
            ['stopped', room.stats.stopped, stats.stopped],
            ['problems', room.stats.problems, stats.problems],
          ] as const
        ).map(([key, label, value]) => (
          <div key={key} className="cifra" data-figure={key}>
            <dt className="etiqueta">{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="controles">
        <label className="buscar">
          <span className="visually-hidden">{room.search}</span>
          <input
            type="search"
            placeholder={room.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            data-metric="worlds-search"
          />
        </label>
        {servers.length > 1 && (
          <label className="servidor">
            <span className="visually-hidden">{room.serverFilter}</span>
            <select
              value={server}
              onChange={(event) => setServer(event.target.value)}
              data-metric="worlds-server"
            >
              <option value="">{room.allServers}</option>
              {servers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="vistas" role="group" aria-label={room.views.label}>
          {VIEWS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={view === candidate}
              onClick={() => setView(candidate)}
              data-metric="worlds-view"
            >
              {viewName[candidate]}
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="filtros">
          <button
            type="button"
            aria-pressed={status === 'all'}
            onClick={() => setStatus('all')}
            data-metric="worlds-filter"
          >
            {room.allStates} ({rows.length})
          </button>
          {present.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={status === candidate}
              data-status={candidate}
              onClick={() => setStatus(candidate)}
              data-metric="worlds-filter"
            >
              {room.status[candidate]} ({rows.filter((row) => row.status === candidate).length})
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 && <p className="estado vacio">{room.empty}</p>}
      {rows.length > 0 && visible.length === 0 && <p className="estado vacio">{room.noMatch}</p>}
      {visible.length > 0 && view === 'cards' && (
        <CardsView rows={visible} room={room} onAction={onAction} />
      )}
      {visible.length > 0 && view === 'list' && (
        <ListView rows={visible} room={room} onAction={onAction} />
      )}
      {visible.length > 0 && view === 'servers' && (
        <ServersView rows={visible} room={room} onAction={onAction} />
      )}

      {fleet.invalid.length > 0 && (
        <section className="invalidas" aria-label={room.invalidTitle}>
          <h2 className="etiqueta">{room.invalidTitle}</h2>
          <ul>
            {fleet.invalid.map((entry) => (
              <li key={entry.file} className="mono">
                {entry.file} — {entry.problems.join(', ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="historial" aria-label={room.history.title}>
        <h2 className="etiqueta">{room.history.title}</h2>
        {fleet.history.length === 0 ? (
          <p className="estado">{room.history.empty}</p>
        ) : (
          <ol>
            {fleet.history.map((entry) => (
              <li key={entry.sha}>
                <time className="mono" dateTime={entry.date}>
                  {entry.date.slice(0, 10)}
                </time>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-metric="worlds-history"
                >
                  {entry.subject}
                </a>
                <span className="autor mono">{entry.author}</span>
              </li>
            ))}
          </ol>
        )}
        <a
          className="todo"
          href={fleetHistoryUrl()}
          target="_blank"
          rel="noopener noreferrer"
          data-metric="worlds-history"
        >
          {room.history.all}
        </a>
      </section>

      <NewWorldDialog
        open={wizard}
        onClose={() => setWizard(false)}
        onProposed={refresh}
        room={room}
        cards={fleet.cards}
        servers={servers}
        canPropose={fleet.canPropose}
      />
      <ChangeDialog
        change={change}
        onClose={() => setChange(null)}
        onProposed={refresh}
        room={room}
        canPropose={fleet.canPropose}
      />
    </div>
  );
}
