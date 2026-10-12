/**
 * The worlds room: asks the session-gated endpoint and shows only what it
 * answers. Without the Oracle rank it shows the refusal, never a world.
 *
 * Shaped after the Alchemists' Tower dashboard: the figures on top, the
 * machines, search and filters that combine, three views (cards with their
 * cover, a list, by server), a wizard for a new world, stop/start/download/
 * delete — each one request the Oracle's wallet signs and the machine checks
 * itself — and what the machines did.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import { bootstrapLine, shortWallet, type DoorLogEntry } from '../../../lib/fleet';
import {
  fill,
  filterRows,
  fleetServers,
  fleetStats,
  machineChoices,
  type MachineSummary,
  type StatusFilter,
  type WorldCardInfo,
  type WorldRow,
  type WorldStatus,
} from '../../../lib/worlds';
import { LunaEspera } from '../../chrome/LunaEspera';
import { ActionDialog, CodeDialog, NewWorldDialog } from './WorldDialogs';
import { CardsView, ListView, ServersView, type WorldAction } from './WorldViews';

export interface WorldsLabels {
  readonly forbidden: string;
  readonly forbiddenNote: string;
  readonly signedAs: string;
}

/** What the Worker answers. */
interface Fleet {
  readonly rank: string;
  /** The session's wallet: it must be the one that signs. */
  readonly wallet: string | null;
  readonly machines: readonly MachineSummary[];
  readonly rows: readonly WorldRow[];
  readonly cards: readonly WorldCardInfo[];
  readonly history: readonly DoorLogEntry[];
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
  'changing',
  'unknown',
];
/** While a machine is changing a world, the room reads the fleet again this often. */
const CHANGING_REFRESH_MS = 10_000;

/** A line to copy: a machine's bootstrap line. */
function CopyLine({ line, room }: { readonly line: string; readonly room: WorldsRoomMessages }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="linea-copiar">
      <pre className="mono">{line}</pre>
      <button
        type="button"
        className="btn btn-fantasma"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(line)
            .then(() => setCopied(true))
            .catch(() => undefined);
        }}
        data-metric="worlds-copy"
      >
        {copied ? room.machines.copied : room.machines.copy}
      </button>
    </div>
  );
}

function Machines({
  fleet,
  room,
  onCode,
}: {
  readonly fleet: Fleet;
  readonly room: WorldsRoomMessages;
  readonly onCode: (alias: string) => void;
}) {
  return (
    <section className="maquinas" aria-label={room.machines.title}>
      <h2 className="etiqueta">{room.machines.title}</h2>
      <ul>
        {fleet.machines.map((machine) => (
          <li key={machine.alias} data-machine={machine.alias} data-open={machine.open}>
            {machine.open ? (
              <>
                <span className="punto-maquina" aria-hidden="true" />
                <span>{fill(room.machines.open, { m: machine.alias })}</span>
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={() => onCode(machine.alias)}
                  data-metric="worlds-admin-code"
                >
                  {room.machines.adminCode}
                </button>
              </>
            ) : (
              <div className="maquina-cerrada">
                <p>
                  <span className="punto-maquina" aria-hidden="true" />{' '}
                  {fill(room.machines.closed, { m: machine.alias, why: machine.reason ?? '?' })}
                </p>
                {fleet.wallet !== null && (
                  <>
                    <p className="nota">{room.machines.connect}</p>
                    <CopyLine line={bootstrapLine(machine.alias, fleet.wallet)} room={room} />
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorldsPanel({ labels, room }: { labels: WorldsLabels; room: WorldsRoomMessages }) {
  const [panel, setPanel] = useState<Panel>({ at: 'loading' });
  const [view, setView] = useState<View>('cards');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [server, setServer] = useState('');
  const [wizard, setWizard] = useState(false);
  const [change, setChange] = useState<{ row: WorldRow; action: WorldAction } | null>(null);
  const [codeOf, setCodeOf] = useState<string | null>(null);

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
        const fleet: Fleet = {
          rank: data.rank ?? '?',
          wallet: typeof data.wallet === 'string' ? data.wallet : null,
          machines: data.machines ?? [],
          rows: data.rows ?? [],
          cards: data.cards ?? [],
          history: data.history ?? [],
        };
        if (alive) setPanel({ at: 'ready', fleet });
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
  const machines = useMemo(
    () => machineChoices(panel.at === 'ready' ? panel.fleet.machines : []),
    [panel],
  );
  const visible = useMemo(
    () => filterRows(rows, { query, status, server }),
    [rows, query, status, server],
  );
  const present = STATUS_ORDER.filter((candidate) => rows.some((row) => row.status === candidate));

  // While a machine creates, stops, starts or deletes a world, keep the room current.
  const changing = rows.some((row) => row.status === 'changing');
  useEffect(() => {
    if (!changing) return;
    const timer = setInterval(() => load(), CHANGING_REFRESH_MS);
    return () => clearInterval(timer);
  }, [changing, load]);

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
          <span className="mono" data-wallet>
            {fleet.wallet === null ? fleet.rank : `${shortWallet(fleet.wallet)} · ${fleet.rank}`}
          </span>
        </p>
        <button
          type="button"
          className="btn btn-primario"
          disabled={machines.length === 0}
          onClick={() => setWizard(true)}
          data-metric="worlds-new"
        >
          + {room.actions.newWorld}
        </button>
      </div>
      {machines.length === 0 && <p className="nota llave">{room.noMachine}</p>}

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

      <Machines fleet={fleet} room={room} onCode={setCodeOf} />

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

      <section className="historial" aria-label={room.history.title}>
        <h2 className="etiqueta">{room.history.title}</h2>
        {fleet.history.length === 0 ? (
          <p className="estado">{room.history.empty}</p>
        ) : (
          <ol>
            {fleet.history.map((entry) => (
              <li
                key={`${entry.machine}-${entry.at}-${entry.type}-${entry.world ?? ''}`}
                data-state={entry.state}
              >
                <time className="mono" dateTime={entry.at}>
                  {entry.at.slice(0, 16).replace('T', ' ')}
                </time>
                <span>
                  <span className="mono">{entry.machine}</span> {room.history.kinds[entry.type]}{' '}
                  {entry.world !== null && <span className="mono">{entry.world}</span>}
                  {entry.state === 'failed' && <> — {room.history.failed}</>}
                </span>
                {entry.by !== null && <span className="autor mono">{entry.by}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <NewWorldDialog
        open={wizard}
        onClose={() => setWizard(false)}
        onChanged={refresh}
        room={room}
        cards={fleet.cards}
        machines={machines}
        rows={rows}
        wallet={fleet.wallet}
      />
      <ActionDialog
        change={change}
        onClose={() => setChange(null)}
        onChanged={refresh}
        onDownloadFirst={(row) => setChange({ row, action: 'download' })}
        room={room}
        wallet={fleet.wallet}
      />
      <CodeDialog
        machine={codeOf}
        onClose={() => setCodeOf(null)}
        room={room}
        wallet={fleet.wallet}
      />
    </div>
  );
}
