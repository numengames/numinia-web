/**
 * The worlds room: asks the session-gated endpoint and shows only what it
 * answers. Without the Oracle rank it shows the refusal, never a world.
 *
 * Shaped after the Alchemists' Tower dashboard: the figures on top, the
 * machines — each saying whether it obeys, from its door's heartbeat, and
 * which recipe it was installed from, with its line to run again when that
 * is not the room's — search and filters that combine, three views (cards
 * with their cover, a list, by server), a wizard for a new world,
 * stop/start/download/delete and each world's own admin code — each one
 * request the Oracle's wallet signs and the machine checks itself — and what
 * the machines did. A world being deleted leaves the list the moment its
 * machine takes the delete; the machine's line says it is still being freed.
 *
 * A world also comes back from its zip, picked or dropped on the room: one
 * signature, then the zip goes straight from this tab to its machine's door
 * while the new world's card, pinned first, carries the upload; it lands
 * stopped. What a reload of this tab needs to finish it (never the admin
 * code) lives in the tab's own history entry.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PlacementMessages } from '../../../i18n/mundos';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  bootstrapLine,
  formatAgo,
  formatSize,
  machineHealth,
  readImportRule,
  readRequest,
  readTickets,
  settled,
  shortSha,
  shortWallet,
  staleRecipe,
  uploadZip,
  waitFor,
  withTickets,
  type DoorLogEntry,
  type ImportTicket,
  type MachineHealth,
} from '../../../lib/fleet';
import { openAllCommunities } from '../../../lib/org-choices';
import { counted, homesByWorld, loadHomes, worldHref } from '../../../lib/mundos';
import {
  ENGINE_NAMES,
  fill,
  filterRows,
  fleetServers,
  fleetEngine,
  fleetStats,
  importMachines,
  listedRows,
  machineChoices,
  machineEngines,
  readEngineRelease,
  rowPlace,
  slot,
  type EngineRelease,
  type MachineSummary,
  type StatusFilter,
  type WorldCardInfo,
  type WorldRow,
  type WorldStatus,
} from '../../../lib/worlds';
import type { WorldHome } from '../../../lib/worlds-homes';
import { LunaEspera } from '../../chrome/LunaEspera';
import { problemText } from './fleet-action';
import { ImportDialog, ZIP_ACCEPT, type Handover, type ImportSource } from './ImportDialog';
import { ActionDialog, NewWorldDialog, WorldCodeDialog } from './WorldDialogs';
import { PlaceDialog, type PlaceAsk } from './WorldPlace';
import {
  CardsView,
  ListView,
  ServersView,
  pageLang,
  type CodeMode,
  type PlacementView,
  type TransferAction,
  type TransferView,
  type WorldAction,
} from './WorldViews';
import { hashZip } from './zip-hash';

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
  /** The Numinia Engine's newest published build; null while there is none. */
  readonly engine: EngineRelease | null;
}

type Panel =
  | { readonly at: 'loading' }
  | { readonly at: 'forbidden' }
  | { readonly at: 'error'; readonly detail: string }
  | { readonly at: 'ready'; readonly fleet: Fleet };

type View = 'cards' | 'list' | 'servers';

/** A zip this tab is bringing back as a world: its slot, its file, and how far it got. */
interface Transfer {
  readonly ticket: ImportTicket;
  /** The new world's own admin code, from its machine's 202; never kept beyond this page. */
  readonly code: string | null;
  /** The zip itself; null after a reload, until the Oracle picks the same one again. */
  readonly file: File | null;
  readonly state: TransferView['state'];
  readonly sent: number;
  readonly matching: number;
  readonly problem: string | null;
  readonly retry: boolean;
  /** Whether its landing has been told (the notice, when its card is out of sight). */
  readonly told: boolean;
}

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
/** How often the room asks a machine how a zip it has is going, and for how long at most. */
const WATCH_MS = 3000;
const WATCH_FOR_MS = 60 * 60_000;
/** The card's progress is redrawn at most this often while bytes move. */
const PROGRESS_MS = 250;

/** What a machine's heartbeat says, in the room's words; null when there is nothing to say. */
function healthLine(alias: string, health: MachineHealth, room: WorldsRoomMessages): string | null {
  if (health.kind === 'unknown' || health.kind === 'ok') return null;
  const words = room.machines;
  const parts = [fill(words[health.kind], { m: alias })];
  if (health.ago !== null) parts.push(fill(words.lastRun, { t: formatAgo(health.ago) }));
  if (health.kind !== 'failing' && health.waiting > 0) {
    parts.push(fill(words.waiting, { n: health.waiting }));
  }
  return parts.join(' ');
}

/** A time from a machine (UTC) in the reader's own clock and language. */
function localTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(pageLang(), { dateStyle: 'short', timeStyle: 'short' });
}

/** Why a machine would not bring a world back from its zip, from its request's result. */
function machineWords(
  rule: string | null,
  entry: string | null,
  ticket: ImportTicket,
  room: WorldsRoomMessages,
): string {
  const found = readImportRule(rule);
  if (found === null) {
    return problemText(
      { at: 'failed', problem: 'machine', detail: rule ?? '?' },
      ticket.machine,
      room,
    );
  }
  // The machine names the entry that broke the rule beside the rule itself.
  const named = found.detail ?? entry;
  if (found.rule === 'unexpected' && named !== null) {
    return fill(room.import.before.unexpected, { f: named });
  }
  // A Numinia Engine zip its machine's engine would not read: the engine's own line why.
  if (found.rule === 'engine-refused' && named !== null) {
    return fill(room.import.engineRefused, { m: ticket.machine, why: named });
  }
  const words = fill(room.import.rules[found.rule], {
    m: ticket.machine,
    f: ticket.name,
    s: formatSize(ticket.bytes, pageLang()),
    max: '?',
  });
  return named === null || found.rule === 'not-a-zip'
    ? words
    : `${words} ${fill(room.import.entry, { f: named })}`;
}

/** A world that exists only in this tab yet: its zip on its way, its machine not listing it. */
function arrivingRow(transfer: Transfer): WorldRow {
  return {
    id: transfer.ticket.world,
    title: transfer.ticket.world,
    cover: null,
    missingCard: false,
    status: 'changing',
    probe: null,
    // Landed but not listed yet: still being opened, until its machine lists it stopped.
    phase: transfer.state === 'checking' || transfer.state === 'landed' ? 'importing' : 'uploading',
    order: null,
    legacy: null,
    place: { server: transfer.ticket.machine, domain: transfer.ticket.domain },
    upload: null,
  };
}

/**
 * Keep the unfinished uploads in the tab's history entry. While a dialog is
 * open its own entry is the current one: the room's entry gets them too once
 * the dialog's is gone.
 */
function keepTickets(tickets: readonly ImportTicket[]): void {
  const write = (): void =>
    window.history.replaceState(withTickets(window.history.state, tickets), '');
  write();
  const state = window.history.state as { worldsDialog?: boolean } | null;
  if (state?.worldsDialog === true) window.addEventListener('popstate', write, { once: true });
}

/** What a drop holds, as the room takes it: one file, several, or a folder. */
function readDrop(data: DataTransfer | null): ImportSource | null {
  if (data === null) return null;
  const items = Array.from(data.items).filter((item) => item.kind === 'file');
  if (items.length > 1) return { kind: 'several', count: items.length };
  if (items[0]?.webkitGetAsEntry()?.isDirectory === true) return { kind: 'folder' };
  const file = data.files[0];
  return file === undefined ? null : { kind: 'file', file };
}

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

/** The newest Numinia Engine build and the worlds behind it, above the machines. */
function FleetEngineBanner({
  fleet,
  room,
  onAction,
}: {
  readonly fleet: Fleet;
  readonly room: WorldsRoomMessages;
  readonly onAction: (row: WorldRow, action: WorldAction) => void;
}) {
  const text = room.fleetEngine;
  const summary = fleetEngine(fleet.rows, fleet.machines, fleet.engine);
  const { current, laggards, otherEngine } = summary;
  return (
    <section
      className="motor-flota"
      aria-label={text.title}
      data-fleet-engine={current === null ? '' : current.build}
      data-laggards={laggards.length}
    >
      <h2 className="etiqueta">{text.title}</h2>
      <p className="mono">
        {current === null ? text.none : fill(text.current, { b: current.build })}
      </p>
      {current !== null && laggards.length === 0 && <p role="status">{text.upToDate}</p>}
      {laggards.length > 0 && (
        <>
          <p role="status">{fill(text.behind, { n: String(laggards.length) })}</p>
          <ul>
            {laggards.map((laggard) => {
              const row = fleet.rows.find((candidate) => candidate.id === laggard.id);
              return (
                <li key={laggard.id} data-laggard={laggard.id}>
                  <span className="mono">
                    {fill(text.laggard, { id: laggard.id, m: laggard.server, b: laggard.build })}
                  </span>
                  {laggard.canUpdate && row !== undefined ? (
                    <button
                      type="button"
                      className="btn btn-fantasma"
                      onClick={() => onAction(row, 'update')}
                      data-metric="worlds-fleet-update"
                    >
                      {room.actions.update}
                    </button>
                  ) : (
                    <span className="nota-motor">{text.manual}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {otherEngine > 0 && (
        <p className="nota-motor" data-other-engine={otherEngine}>
          {fill(text.otherEngine, { n: String(otherEngine) })}
        </p>
      )}
    </section>
  );
}

function Machines({ fleet, room }: { readonly fleet: Fleet; readonly room: WorldsRoomMessages }) {
  return (
    <section className="maquinas" aria-label={room.machines.title}>
      <h2 className="etiqueta">{room.machines.title}</h2>
      <ul>
        {fleet.machines.map((machine) => {
          const health = machineHealth(machine.heartbeat);
          const line = machine.open ? healthLine(machine.alias, health, room) : null;
          // Installed from another recipe than the room hands out, or one that says none.
          const stale = staleRecipe(machine);
          // Deleted worlds whose folder and keys this machine has not removed yet.
          const freeing = fleet.rows.filter(
            (row) => row.phase === 'deleting' && rowPlace(row)?.server === machine.alias,
          );
          return (
            <li
              key={machine.alias}
              data-machine={machine.alias}
              data-open={machine.open}
              data-health={machine.open ? health.kind : undefined}
              data-recipe={machine.open ? (stale ? 'stale' : 'pinned') : undefined}
              data-imports={machine.imports === null ? undefined : machine.imports.zipMaxBytes}
              data-engines={machine.open ? machineEngines(machine).join(' ') : undefined}
              data-updates={machine.open && machine.updates === true ? 'yes' : undefined}
            >
              {machine.open ? (
                <>
                  <span className="punto-maquina" aria-hidden="true" />
                  <span>{fill(room.machines.open, { m: machine.alias })}</span>
                  {typeof machine.recipe === 'string' && (
                    <span className="mono receta" title={machine.recipe}>
                      {fill(room.machines.recipe, { r: shortSha(machine.recipe) })}
                    </span>
                  )}
                  {/* The engines its door names; a door that names none runs Hyperfy alone. */}
                  <span className="mono receta">
                    {fill(room.machines.engines, {
                      e: machineEngines(machine)
                        .map((engine) => ENGINE_NAMES[engine])
                        .join(', '),
                    })}
                  </span>
                  {line !== null && (
                    <p
                      className="salud-maquina"
                      data-tono={health.kind === 'slow' ? 'aviso' : 'mal'}
                      role="status"
                    >
                      {line}
                      {health.kind === 'failing' && health.rule !== null && (
                        <>
                          {' '}
                          <span className="mono regla">«{health.rule}»</span>
                        </>
                      )}
                    </p>
                  )}
                  {stale && (
                    <div className="receta-vieja">
                      <p className="aviso-maquina" role="note">
                        {fill(room.machines.oldRecipe, { m: machine.alias })}
                      </p>
                      {fleet.wallet !== null && (
                        <CopyLine line={bootstrapLine(machine.alias, fleet.wallet)} room={room} />
                      )}
                    </div>
                  )}
                  {freeing.map((row) => (
                    <p key={row.id} className="estado liberando" data-freeing={row.id}>
                      <LunaEspera />{' '}
                      {fill(room.machines.freeing, { d: rowPlace(row)?.domain ?? row.id })}
                    </p>
                  ))}
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
          );
        })}
      </ul>
    </section>
  );
}

export function WorldsPanel({
  labels,
  room,
  mundos,
  locale,
  sessionHref,
}: {
  labels: WorldsLabels;
  room: WorldsRoomMessages;
  /** The words of each world's organization and of the house's placement (cut 4). */
  mundos: PlacementMessages;
  locale: SupportedLocale;
  /** The LAP's Session page in this locale: where the wallet is connected again. */
  sessionHref: string;
}) {
  const [panel, setPanel] = useState<Panel>({ at: 'loading' });
  const [view, setView] = useState<View>('cards');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [server, setServer] = useState('');
  const [wizard, setWizard] = useState(false);
  const [change, setChange] = useState<{ row: WorldRow; action: WorldAction } | null>(null);
  const [codeAsk, setCodeAsk] = useState<{ row: WorldRow; mode: CodeMode } | null>(null);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [transfers, setTransfers] = useState<readonly Transfer[]>([]);
  // How many files are dragged over the room (the overlay), or null.
  const [drag, setDrag] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ world: string; machine: string } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  // Which upload a picked zip is for: null = a new one (the dialog).
  const pickFor = useRef<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const tracked = useRef<readonly Transfer[]>([]);
  tracked.current = transfers;
  const scrollTo = useRef<string | null>(null);
  const restored = useRef(false);
  // Cut 4: which organization each world belongs to, the rows chosen for a bulk placement.
  const [homes, setHomes] = useState<ReadonlyMap<string, WorldHome> | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [homesFailed, setHomesFailed] = useState(false);
  const [placing, setPlacing] = useState<PlaceAsk | null>(null);
  const [placedNote, setPlacedNote] = useState<string | null>(null);
  // Cut 7: the house opens every community's organization at once.
  const [openingAll, setOpeningAll] = useState(false);
  const [openedNote, setOpenedNote] = useState<{
    readonly ok: boolean;
    readonly text: string;
  } | null>(null);
  const openAll = async (): Promise<void> => {
    setOpeningAll(true);
    setOpenedNote(null);
    const opened = await openAllCommunities(fetch);
    setOpeningAll(false);
    setOpenedNote(
      opened.ok
        ? { ok: true, text: fill(counted(mundos.openedAll, opened.opened), { n: opened.opened }) }
        : { ok: false, text: mundos.openAllFailed },
    );
  };
  const readHomes = useCallback(async (): Promise<void> => {
    const sheet = await loadHomes(fetch);
    setHomes(sheet.at === 'ready' ? homesByWorld(sheet.items) : null);
    setHomesFailed(sheet.at !== 'ready');
  }, []);
  const fleetReady = panel.at === 'ready';
  useEffect(() => {
    if (fleetReady) void readHomes();
  }, [fleetReady, readHomes]);

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
          // Checked again here: only a build of the exact shape is ever signed for.
          engine: readEngineRelease(data.engine),
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

  // Every world the room knows, those being deleted included (a name or an
  // address is not free until they are gone); the list shows the others.
  const known = panel.at === 'ready' ? panel.fleet.rows : [];
  const rows = useMemo(() => listedRows(known), [known]);
  const stats = useMemo(() => fleetStats(rows), [rows]);
  const servers = useMemo(() => fleetServers(rows), [rows]);
  const machines = useMemo(
    () => machineChoices(panel.at === 'ready' ? panel.fleet.machines : []),
    [panel],
  );
  const importers = useMemo(
    () => importMachines(panel.at === 'ready' ? panel.fleet.machines : []),
    [panel],
  );
  const visible = useMemo(
    () => filterRows(rows, { query, status, server }),
    [rows, query, status, server],
  );
  const present = STATUS_ORDER.filter((candidate) => rows.some((row) => row.status === candidate));

  // While a machine creates, stops, starts or deletes a world, keep the room current.
  const changing = known.some((row) => row.status === 'changing');
  useEffect(() => {
    if (!changing) return;
    const timer = setInterval(() => load(), CHANGING_REFRESH_MS);
    return () => clearInterval(timer);
  }, [changing, load]);

  const patch = useCallback((world: string, next: Partial<Transfer>) => {
    setTransfers((current) =>
      current.map((transfer) =>
        transfer.ticket.world === world ? { ...transfer, ...next } : transfer,
      ),
    );
  }, []);

  // Once its machine has the whole zip: ask how it goes until it has landed or been refused.
  const watch = useCallback(
    async (ticket: ImportTicket) => {
      const result = await waitFor(
        () => readRequest(fetch, ticket.machine, ticket.nonce),
        settled,
        {
          intervalMs: WATCH_MS,
          timeoutMs: WATCH_FOR_MS,
          cancelled: () => !tracked.current.some((t) => t.ticket.world === ticket.world),
        },
      );
      if (!tracked.current.some((t) => t.ticket.world === ticket.world)) return;
      if (result?.state === 'done') {
        patch(ticket.world, { state: 'landed' });
        load();
      } else if (result?.state === 'failed') {
        patch(ticket.world, {
          state: 'failed',
          retry: false,
          problem: machineWords(result.rule, result.entry, ticket, room),
        });
        load();
      }
    },
    [patch, load, room],
  );

  // The zip, whole, to the slot its machine opened for it; the card says how far it got.
  const send = useCallback(
    async (ticket: ImportTicket, file: File) => {
      const world = ticket.world;
      controllers.current.get(world)?.abort();
      const controller = new AbortController();
      controllers.current.set(world, controller);
      patch(world, { file, state: 'sending', sent: 0, problem: null, retry: false });
      let drawn = 0;
      const result = await uploadZip(
        ticket.machine,
        ticket.nonce,
        file,
        (sent) => {
          const now = Date.now();
          if (sent < file.size && now - drawn < PROGRESS_MS) return;
          drawn = now;
          patch(world, { sent });
        },
        undefined,
        controller.signal,
      );
      // Discarded, or sent again, meanwhile: that run is no longer this one.
      if (controllers.current.get(world) !== controller) return;
      controllers.current.delete(world);
      if (result.ok) {
        patch(world, { state: 'checking', sent: file.size });
        load();
        void watch(ticket);
        return;
      }
      if (result.error === 'cut' || result.error === 'unreachable') {
        // No answer is not yet a cut: the door may have taken the zip whole, or
        // refused it early, as the connection closed. Its request says which.
        const after = await readRequest(fetch, ticket.machine, ticket.nonce);
        if (!tracked.current.some((t) => t.ticket.world === world)) return;
        if (after !== null && after.state === 'failed') {
          patch(world, {
            state: 'failed',
            sent: result.sent,
            retry: false,
            problem: machineWords(after.rule, after.entry, ticket, room),
          });
          return;
        }
        if (after !== null && after.state !== 'uploading') {
          patch(world, { state: 'checking', sent: file.size });
          load();
          void watch(ticket);
          return;
        }
      }
      if (result.error === 'stopped' || result.error === 'cut') {
        patch(world, { state: result.error, sent: result.sent, retry: true });
        return;
      }
      // A slot that is gone needs a new signature; anything else, the same zip again.
      const gone = result.error === 'slot-expired' || result.error === 'missing';
      patch(world, {
        state: 'failed',
        sent: result.sent,
        retry: !gone,
        problem: problemText(
          {
            at: 'failed',
            problem: gone ? 'slot-expired' : result.error,
            detail: String(result.status),
          },
          ticket.machine,
          room,
          { f: ticket.name, s: formatSize(ticket.bytes, pageLang()), max: '?' },
        ),
      });
    },
    [patch, load, watch, room],
  );

  // After a reload: the zip picked again must be the one signed (its size, then its fingerprint).
  const resume = useCallback(
    async (world: string, file: File) => {
      const transfer = tracked.current.find((candidate) => candidate.ticket.world === world);
      if (transfer === undefined) return;
      if (file.size !== transfer.ticket.bytes) {
        patch(world, { state: 'half', problem: room.import.notSame });
        return;
      }
      patch(world, { state: 'matching', matching: 0, problem: null });
      const digest = await hashZip(file, (share) => patch(world, { matching: share })).result;
      if (digest !== transfer.ticket.sha256) {
        patch(world, {
          state: 'half',
          problem: digest === null ? room.import.unreadable : room.import.notSame,
        });
        return;
      }
      void send(transfer.ticket, file);
    },
    [patch, send, room],
  );

  const handover = useCallback(
    (given: Handover) => {
      setSource(null);
      const fresh: Transfer = {
        ticket: given.ticket,
        code: given.code,
        file: given.file,
        state: 'sending',
        sent: 0,
        matching: 0,
        problem: null,
        retry: false,
        told: false,
      };
      setTransfers((current) => [
        fresh,
        ...current.filter((transfer) => transfer.ticket.world !== given.ticket.world),
      ]);
      tracked.current = [fresh, ...tracked.current];
      scrollTo.current = given.ticket.world;
      void send(given.ticket, given.file);
    },
    [send],
  );

  // A reload of this tab: each unfinished upload is asked of its machine, then shown again.
  useEffect(() => {
    if (panel.at !== 'ready' || restored.current) return;
    restored.current = true;
    const tickets = readTickets(window.history.state);
    if (tickets.length === 0) return;
    void Promise.all(
      tickets.map(async (ticket) => ({
        ticket,
        result: await readRequest(fetch, ticket.machine, ticket.nonce),
      })),
    ).then((found) => {
      const back = found.flatMap(({ ticket, result }): Transfer[] => {
        // A slot that is gone, or a world already landed: nothing left to finish.
        if (result === null || result.state === 'done') return [];
        const base = {
          ticket,
          code: null,
          file: null,
          sent: 0,
          matching: 0,
          problem: null,
          retry: false,
          told: true,
        };
        if (result.state === 'uploading') return [{ ...base, state: 'half' }];
        if (result.state === 'failed') {
          return [
            {
              ...base,
              state: 'failed',
              problem: machineWords(result.rule, result.entry, ticket, room),
            },
          ];
        }
        return [{ ...base, state: 'checking', told: false }];
      });
      if (back.length === 0) return;
      setTransfers((current) => [...current, ...back]);
      tracked.current = [...tracked.current, ...back];
      for (const transfer of back) if (transfer.state === 'checking') void watch(transfer.ticket);
    });
  }, [panel.at, room, watch]);

  // What a reload needs to finish them: the uploads still open (never a code).
  const open = transfers
    .filter(
      (transfer) =>
        transfer.state !== 'landed' && !(transfer.state === 'failed' && !transfer.retry),
    )
    .map((transfer) => transfer.ticket);
  const openKey = JSON.stringify(open);
  useEffect(() => {
    if (panel.at === 'ready' && restored.current)
      keepTickets(JSON.parse(openKey) as ImportTicket[]);
  }, [openKey, panel.at]);

  // While bytes move, leaving the page asks first.
  const moving = transfers.some((transfer) => transfer.state === 'sending');
  useEffect(() => {
    if (!moving) return;
    const hold = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', hold);
    return () => window.removeEventListener('beforeunload', hold);
  }, [moving]);

  // Its machine lists it as a world again: it has landed (stopped).
  useEffect(() => {
    for (const transfer of transfers) {
      if (transfer.state !== 'checking') continue;
      const row = known.find((candidate) => candidate.id === transfer.ticket.world);
      if (row?.order != null && row.phase !== 'importing') {
        patch(transfer.ticket.world, { state: 'landed' });
      }
    }
  }, [known, transfers, patch]);

  // Landed out of sight: a notice says so, with the way to start it.
  useEffect(() => {
    const landed = transfers.find((transfer) => transfer.state === 'landed' && !transfer.told);
    if (landed === undefined) return;
    const world = landed.ticket.world;
    if (!known.some((row) => row.id === world && row.order !== null)) return;
    patch(world, { told: true });
    const box = document
      .querySelector(`[data-world="${CSS.escape(world)}"]`)
      ?.getBoundingClientRect();
    const seen = box !== undefined && box.bottom > 0 && box.top < window.innerHeight;
    if (!seen) setNotice({ world, machine: landed.ticket.machine });
  }, [known, transfers, patch]);

  // The card of a zip just handed over comes into view: once the dialog's own history
  // entry is gone, since going back to the room's entry restores the room's scroll.
  useEffect(() => {
    const world = scrollTo.current;
    if (world === null) return;
    const card = document.querySelector(`[data-world="${CSS.escape(world)}"]`);
    if (card === null) return;
    scrollTo.current = null;
    const show = (): void => card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const state = window.history.state as { worldsDialog?: boolean } | null;
    if (state?.worldsDialog === true) {
      window.addEventListener('popstate', () => requestAnimationFrame(show), { once: true });
    } else show();
  });

  // A file dragged over the room: the overlay (never over an open dialog), and the
  // browser's own drop (opening the file) always cancelled.
  const canImport = panel.at === 'ready' && importers.length > 0;
  useEffect(() => {
    if (panel.at !== 'ready') return;
    let depth = 0;
    const files = (event: DragEvent): boolean =>
      event.dataTransfer?.types.includes('Files') ?? false;
    const dialogOpen = (): boolean => document.querySelector('dialog[open]') !== null;
    const enter = (event: DragEvent): void => {
      if (!files(event)) return;
      depth += 1;
      if (canImport && !dialogOpen()) setDrag(event.dataTransfer?.items.length ?? 1);
    };
    const over = (event: DragEvent): void => {
      if (!files(event)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = canImport && !dialogOpen() ? 'copy' : 'none';
      }
    };
    const leave = (event: DragEvent): void => {
      if (!files(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDrag(null);
    };
    const drop = (event: DragEvent): void => {
      if (!files(event)) return;
      event.preventDefault();
      depth = 0;
      setDrag(null);
      if (!canImport || dialogOpen()) return;
      const dropped = readDrop(event.dataTransfer);
      if (dropped !== null) setSource(dropped);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [panel.at, canImport]);

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
  const onCode = (row: WorldRow, mode: CodeMode): void => setCodeAsk({ row, mode });
  const viewName: Readonly<Record<View, string>> = {
    cards: room.views.cards,
    list: room.views.list,
    servers: room.views.servers,
  };
  // Before signing for a machine that is not obeying, say so: the request will wait in its queue.
  const notObeying = (alias: string): string | null => {
    const summary = fleet.machines.find((machine) => machine.alias === alias);
    const health = machineHealth(summary?.heartbeat ?? null);
    return health.kind === 'failing' || health.kind === 'silent'
      ? fill(room.change.notObeying, { m: alias })
      : null;
  };
  const changeMachine = change === null ? null : (rowPlace(change.row)?.server ?? null);
  // Before signing for a world's code: a machine whose door says no recipe is
  // older than per-world codes and refuses them; a change waits for a machine that obeys.
  const codeWarning = (ask: { readonly row: WorldRow; readonly mode: CodeMode }): string | null => {
    const alias = rowPlace(ask.row)?.server;
    if (alias === undefined) return null;
    const summary = fleet.machines.find((machine) => machine.alias === alias);
    if (summary?.open === true && summary.recipe === null) {
      return fill(room.code.notYet, { m: alias });
    }
    return ask.mode === 'rotate' ? notObeying(alias) : null;
  };
  // Only a door that says it takes the room's beacons hears what happened in the browser.
  const listens = (alias: string): boolean =>
    fleet.machines.some((machine) => machine.alias === alias && machine.listens.includes('events'));

  // The worlds this tab is bringing back come first, whatever the filters say.
  const pinned = transfers.map(
    (transfer) => known.find((row) => row.id === transfer.ticket.world) ?? arrivingRow(transfer),
  );
  const pinnedIds = new Set(pinned.map((row) => row.id));
  const shown = [...pinned, ...visible.filter((row) => !pinnedIds.has(row.id))];
  const transferViews = new Map<string, TransferView>(
    transfers.map((transfer) => [
      transfer.ticket.world,
      {
        state: transfer.state,
        machine: transfer.ticket.machine,
        sent: transfer.sent,
        total: transfer.ticket.bytes,
        matching: transfer.matching,
        problem: transfer.problem,
        retry: transfer.retry && transfer.file !== null,
        code: transfer.code,
      },
    ]),
  );
  const onTransfer = (row: WorldRow, action: TransferAction): void => {
    const transfer = transfers.find((candidate) => candidate.ticket.world === row.id);
    if (transfer === undefined) return;
    if (action === 'stop') {
      controllers.current.get(row.id)?.abort();
    } else if (action === 'retry') {
      if (transfer.file !== null) void send(transfer.ticket, transfer.file);
    } else if (action === 'pick') {
      pickFor.current = row.id;
      picker.current?.click();
    } else {
      const running = controllers.current.get(row.id);
      controllers.current.delete(row.id);
      running?.abort();
      setTransfers((current) => current.filter((candidate) => candidate.ticket.world !== row.id));
    }
  };
  const onPicked = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file === undefined) return;
    const world = pickFor.current;
    pickFor.current = null;
    if (world === null) setSource({ kind: 'file', file });
    else void resume(world, file);
  };
  const knownIds = new Set(known.map((row) => row.id));
  const chosenRows = known.filter((row) => picked.has(row.id));
  const shownIds = shown.filter((row) => knownIds.has(row.id)).map((row) => row.id);
  const allShownPicked = shownIds.length > 0 && shownIds.every((id) => picked.has(id));
  const placement: PlacementView = {
    words: mundos,
    homes,
    selected: picked,
    onToggle: (row) =>
      setPicked((now) => {
        const next = new Set(now);
        if (!next.delete(row.id)) next.add(row.id);
        return next;
      }),
    onAssign: (row) => {
      setPlacedNote(null);
      setPlacing({ worlds: [{ id: row.id, title: row.title }] });
    },
    canPlace: (row) => knownIds.has(row.id),
    pageHref: (worldId) => worldHref(locale, worldId),
  };
  const lang = pageLang();
  const zipMax = Math.max(0, ...importers.map((importer) => importer.zipMaxBytes));
  const noticeRow =
    notice === null
      ? undefined
      : known.find((row) => row.id === notice.world && row.order?.state === 'stopped');

  return (
    <div data-worlds-panel>
      <div className="barra-sala">
        <p className="sesion">
          <span className="etiqueta">{labels.signedAs}</span>{' '}
          <span className="mono" data-wallet>
            {fleet.wallet === null ? fleet.rank : `${shortWallet(fleet.wallet)} · ${fleet.rank}`}
          </span>
        </p>
        <div className="botones-sala">
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={importers.length === 0}
            onClick={() => {
              pickFor.current = null;
              picker.current?.click();
            }}
            data-metric="worlds-import"
          >
            {room.actions.importZip}
          </button>
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
        <input
          ref={picker}
          type="file"
          accept={ZIP_ACCEPT}
          hidden
          onChange={onPicked}
          data-metric="worlds-import-file"
        />
      </div>
      {machines.length === 0 && <p className="nota llave">{room.noMachine}</p>}
      {machines.length > 0 && importers.length === 0 && (
        <p className="nota llave" data-no-imports>
          {room.import.noMachine}
        </p>
      )}

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

      <FleetEngineBanner fleet={fleet} room={room} onAction={onAction} />
      <Machines fleet={fleet} room={room} />

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

      {fleetReady && (
        <div className="casas-barra" data-open-all-bar>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void openAll()}
            disabled={openingAll}
            data-espera={openingAll ? '' : undefined}
            title={mundos.openAllTip}
            data-metric="worlds-open-all-communities"
          >
            {mundos.openAll}
          </button>
          {openedNote !== null && (
            <span
              className={openedNote.ok ? 'nota exito' : 'nota fallo'}
              role={openedNote.ok ? 'status' : 'alert'}
              data-opened-all
            >
              {openedNote.text}
            </span>
          )}
        </div>
      )}
      {shown.length > 0 && (
        <div className="casas-barra" data-place-bar>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setPicked(allShownPicked ? new Set() : new Set(shownIds))}
            data-metric="worlds-select-shown"
          >
            {allShownPicked ? mundos.clear : fill(mundos.selectShown, { n: shownIds.length })}
          </button>
          {chosenRows.length > 0 && (
            <>
              <span className="nota" role="status" data-picked-count>
                {fill(counted(mundos.chosen, chosenRows.length), { n: chosenRows.length })}
              </span>
              <button
                type="button"
                className="btn btn-primario"
                onClick={() => {
                  setPlacedNote(null);
                  setPlacing({
                    worlds: chosenRows.map((row) => ({ id: row.id, title: row.title })),
                  });
                }}
                data-metric="worlds-assign-chosen"
              >
                {fill(mundos.assignChosen, { n: chosenRows.length })}
              </button>
              <button
                type="button"
                className="btn btn-silencioso"
                onClick={() => setPicked(new Set())}
                data-metric="worlds-select-clear"
              >
                {mundos.clear}
              </button>
            </>
          )}
        </div>
      )}
      {homesFailed && (
        <p className="nota fallo" data-homes-failed>
          {mundos.homesFailed}
        </p>
      )}
      {placedNote !== null && (
        <p className="nota exito" role="status" data-placed-note>
          {placedNote}
        </p>
      )}
      {shown.length === 0 && rows.length === 0 && <p className="estado vacio">{room.empty}</p>}
      {shown.length === 0 && rows.length > 0 && <p className="estado vacio">{room.noMatch}</p>}
      {shown.length > 0 && view === 'cards' && (
        <CardsView
          rows={shown}
          room={room}
          onAction={onAction}
          onCode={onCode}
          transfers={transferViews}
          onTransfer={onTransfer}
          placement={placement}
        />
      )}
      {shown.length > 0 && view === 'list' && (
        <ListView
          rows={shown}
          room={room}
          onAction={onAction}
          transfers={transferViews}
          onTransfer={onTransfer}
          placement={placement}
        />
      )}
      {shown.length > 0 && view === 'servers' && (
        <ServersView
          rows={shown}
          room={room}
          onAction={onAction}
          onCode={onCode}
          transfers={transferViews}
          onTransfer={onTransfer}
          placement={placement}
        />
      )}

      <section className="historial" aria-label={room.history.title}>
        <h2 className="etiqueta">{room.history.title}</h2>
        {fleet.history.length === 0 ? (
          <p className="estado">{room.history.empty}</p>
        ) : (
          <ol>
            {fleet.history.map((entry) => {
              // The world sits where each language puts it (`{w}`), or after the verb.
              const [before, after] = slot(room.history.kinds[entry.type], 'w');
              return (
                <li
                  key={`${entry.machine}-${entry.at}-${entry.type}-${entry.world ?? ''}`}
                  data-state={entry.state}
                >
                  <time className="mono" dateTime={entry.at}>
                    {localTime(entry.at)}
                  </time>
                  <span>
                    <span className="mono">{entry.machine}</span> {before}
                    {entry.world !== null && <span className="mono">{entry.world}</span>}
                    {after}
                    {entry.took !== null && (
                      <> {fill(room.history.took, { t: formatAgo(entry.took) })}</>
                    )}
                    {entry.state === 'failed' && <> — {room.history.failed}</>}
                    {entry.rule !== null && (
                      <>
                        {' '}
                        <span className="mono regla">«{entry.rule}»</span>
                      </>
                    )}
                  </span>
                  {entry.by !== null && <span className="autor mono">{entry.by}</span>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {drag !== null && (
        <div className="capa-zip" aria-hidden="true" data-drop={drag > 1 ? 'several' : 'one'}>
          <div>
            <p className="titulo-capa">{drag > 1 ? room.import.dropOne : room.import.dropTitle}</p>
            {drag <= 1 && <p>{room.import.dropNote}</p>}
            <p className="mono">{fill(room.import.dropCap, { max: formatSize(zipMax, lang) })}</p>
          </div>
        </div>
      )}

      {notice !== null && (
        <div className="aviso" data-tono="exito" role="status" data-landed={notice.world}>
          <p>{fill(room.import.landed, { w: notice.world, m: notice.machine })}</p>
          <div className="acciones">
            {noticeRow !== undefined && (
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => {
                  setNotice(null);
                  setChange({ row: noticeRow, action: 'start' });
                }}
                data-metric="worlds-start"
              >
                {room.actions.start}
              </button>
            )}
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => setNotice(null)}
              data-metric="worlds-import-close"
            >
              {room.import.landedClose}
            </button>
          </div>
        </div>
      )}

      <NewWorldDialog
        open={wizard}
        onClose={() => setWizard(false)}
        onChanged={refresh}
        room={room}
        cards={fleet.cards}
        machines={machines}
        rows={known}
        wallet={fleet.wallet}
        sessionHref={sessionHref}
        listens={listens}
        engines={(alias) =>
          machineEngines(fleet.machines.find((machine) => machine.alias === alias))
        }
        release={fleet.engine}
      />
      <ImportDialog
        source={source}
        importers={importers}
        rows={known}
        room={room}
        wallet={fleet.wallet}
        sessionHref={sessionHref}
        listens={listens}
        release={fleet.engine}
        onClose={() => setSource(null)}
        onFile={(file) => setSource({ kind: 'file', file })}
        onHandover={handover}
      />
      <ActionDialog
        change={change}
        onClose={() => setChange(null)}
        onChanged={refresh}
        onDownloadFirst={(row) => setChange({ row, action: 'download' })}
        room={room}
        wallet={fleet.wallet}
        sessionHref={sessionHref}
        warning={changeMachine === null ? null : notObeying(changeMachine)}
        listens={listens}
      />
      <PlaceDialog
        ask={placing}
        words={mundos}
        onClose={() => setPlacing(null)}
        onPlaced={(message) => {
          setPlacing(null);
          setPicked(new Set());
          setPlacedNote(message);
          void readHomes();
        }}
      />
      <WorldCodeDialog
        ask={codeAsk}
        onClose={() => setCodeAsk(null)}
        onChanged={refresh}
        room={room}
        wallet={fleet.wallet}
        sessionHref={sessionHref}
        warning={codeAsk === null ? null : codeWarning(codeAsk)}
        listens={listens}
      />
    </div>
  );
}
