/**
 * The worlds room's three ways of looking at the fleet: cards with their
 * cover (the same picture the world shows while it loads), a compact list,
 * and the cards grouped by server — the Tower grouped by organisation, with
 * "show N more" after six. Each card of a world of the fleet carries its own
 * admin code: Show and Change code, one signature each. A world coming back
 * from its zip carries its upload on its card: how much of the zip its
 * machine has, a way to stop it or send it again, and its new admin code.
 */

import { useState } from 'react';
import type { PlacementMessages } from '../../../i18n/mundos';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import { formatSize } from '../../../lib/fleet';
import {
  describeStatus,
  engineTag,
  fill,
  groupByServer,
  rowPlace,
  worldUrl,
  type WorldRow,
} from '../../../lib/worlds';
import type { WorldHome } from '../../../lib/worlds-homes-types';
import { LunaEspera } from '../../chrome/LunaEspera';

/** `update`: move a world of the Numinia Engine to its newest build (UpdateWorld). */
export type WorldAction = 'stop' | 'start' | 'delete' | 'download' | 'update';
/** What the Oracle asks of a world's own admin code: to see it, or to change it. */
export type CodeMode = 'show' | 'rotate';

/** A zip this tab is bringing back as a world, as its card shows it. */
export interface TransferView {
  /**
   * `sending` its bytes, the machine `checking` it, `cut` or `stopped` on the
   * way, `failed` (a refusal), `half` done before a reload, `matching` a zip
   * picked again against the signed fingerprint, `landed` stopped.
   */
  readonly state:
    'sending' | 'checking' | 'cut' | 'stopped' | 'failed' | 'half' | 'matching' | 'landed';
  readonly machine: string;
  /** Bytes sent, of the zip's `total`. */
  readonly sent: number;
  readonly total: number;
  /** While a zip picked again is hashed: the share done, 0 to 1. */
  readonly matching: number;
  /** What went wrong, in the room's words; null when nothing did. */
  readonly problem: string | null;
  /** Whether "Volver a subir" can send the same zip into the same slot, with no new signature. */
  readonly retry: boolean;
  /** The new world's own admin code, from its machine's 202: shown on its card, never kept. */
  readonly code: string | null;
}

export type TransferAction = 'stop' | 'retry' | 'discard' | 'pick';

/**
 * What a row says about its organization (cut 4): whose it is, a checkbox to
 * choose it for a bulk placement, and the house's «Asignar a una organización».
 * Absent while the room has not the house's list of placements.
 */
export interface PlacementView {
  readonly words: PlacementMessages;
  /** Each world's home; null when the list could not be read (rows say so once, above). */
  readonly homes: ReadonlyMap<string, WorldHome> | null;
  readonly selected: ReadonlySet<string>;
  readonly onToggle: (row: WorldRow) => void;
  readonly onAssign: (row: WorldRow) => void;
  /** Only a world the fleet really has can be placed (not one still arriving from a zip). */
  readonly canPlace: (row: WorldRow) => boolean;
  /** A world's own public page, under the visitor's locale. */
  readonly pageHref: (worldId: string) => string;
}

interface ViewProps {
  readonly rows: readonly WorldRow[];
  readonly room: WorldsRoomMessages;
  readonly onAction: (row: WorldRow, action: WorldAction) => void;
  readonly onCode: (row: WorldRow, mode: CodeMode) => void;
  /** The uploads this tab runs, by world. */
  readonly transfers?: ReadonlyMap<string, TransferView> | undefined;
  readonly onTransfer?: ((row: WorldRow, action: TransferAction) => void) | undefined;
  readonly placement?: PlacementView | undefined;
}

const PER_GROUP = 6;

/** The page's language, for sizes and numbers; none = the browser's. */
export function pageLang(): string | undefined {
  return typeof document === 'undefined' ? undefined : document.documentElement.lang || undefined;
}

/** A code to read and copy: an admin code. */
export function CodeBox({
  code,
  room,
}: {
  readonly code: string;
  readonly room: WorldsRoomMessages;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="codigo">
      <code className="mono" data-admin-code>
        {code}
      </code>
      <button
        type="button"
        className="btn btn-fantasma"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(code)
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

/** What a world is doing, in one verb: the settled states as they are, a change as what is happening now. */
function StatusPill({
  row,
  room,
  transfer,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  transfer: TransferView | undefined;
}) {
  // An upload this tab runs says its own state: on its way, cut, or refused.
  const stuck =
    transfer?.state === 'failed'
      ? room.import.failedPill
      : transfer?.state === 'cut' || transfer?.state === 'stopped' || transfer?.state === 'half'
        ? room.import.cutPill
        : null;
  if (stuck !== null) {
    return (
      <span
        className="pildora estado-mundo"
        data-status="unreachable"
        data-transfer={transfer?.state}
      >
        {stuck}
      </span>
    );
  }
  const phase =
    transfer?.state === 'sending' || transfer?.state === 'matching'
      ? 'uploading'
      : transfer?.state === 'checking'
        ? 'importing'
        : row.phase;
  const changing =
    row.status === 'changing' || (transfer !== undefined && transfer.state !== 'landed');
  const doing =
    changing &&
    (phase === 'creating' ||
      phase === 'stopping' ||
      phase === 'starting' ||
      phase === 'deleting' ||
      phase === 'uploading' ||
      phase === 'importing' ||
      phase === 'updating')
      ? room.phases[phase]
      : null;
  return (
    <span
      className="pildora estado-mundo"
      data-status={doing === null ? row.status : 'changing'}
      data-phase={doing === null ? undefined : (phase ?? undefined)}
      title={describeStatus(row, room.reasons)}
    >
      {doing === null ? (
        room.status[row.status]
      ) : (
        <>
          <LunaEspera /> {doing}
        </>
      )}
    </span>
  );
}

function Badges({ row, room }: { row: WorldRow; room: WorldsRoomMessages }) {
  if (!row.missingCard && !row.legacy) return null;
  return (
    <span className="marcas">
      {row.legacy && (
        <span className="marca legado" title={room.badges.legacyNote}>
          {room.badges.legacy}
        </span>
      )}
      {row.missingCard && <span className="marca sin-ficha">{room.badges.missingCard}</span>}
    </span>
  );
}

/** §9.8's 4 px capsule with its figure beside, in mono: how much of a zip its machine has. */
function UploadBar({
  sent,
  total,
  label,
}: {
  readonly sent: number;
  readonly total: number;
  readonly label: string;
}) {
  const share = total > 0 ? Math.min(100, Math.floor((sent / total) * 100)) : 0;
  return (
    <div className="barra-fila">
      <div
        className="barra-subida"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
      >
        <span style={{ width: `${share}%` }} />
      </div>
      <span className="mono cifra-subida">{share} %</span>
    </div>
  );
}

/** A world's upload, on its card, while this tab runs it: progress, then what to do when it stops. */
function TransferBox({
  row,
  transfer,
  room,
  onTransfer,
}: {
  row: WorldRow;
  transfer: TransferView;
  room: WorldsRoomMessages;
  onTransfer: NonNullable<ViewProps['onTransfer']>;
}) {
  const words = room.import;
  const lang = pageLang();
  const sizes = {
    m: transfer.machine,
    sent: formatSize(transfer.sent, lang),
    total: formatSize(transfer.total, lang),
  };
  const button = (action: TransferAction, label: string) => (
    <button
      type="button"
      className="btn btn-fantasma"
      onClick={() => onTransfer(row, action)}
      data-metric={`worlds-import-${action}`}
    >
      {label}
    </button>
  );
  const state = transfer.state;
  if (state === 'landed') return null;
  if (state === 'sending') {
    return (
      <div className="subida" data-transfer={state}>
        <p className="nota" aria-live="polite">
          {fill(words.uploading, sizes)}
        </p>
        <UploadBar
          sent={transfer.sent}
          total={transfer.total}
          label={fill(words.uploading, sizes)}
        />
        <p className="nota espera">{words.keepOpen}</p>
        <div className="acciones">{button('stop', words.stop)}</div>
      </div>
    );
  }
  if (state === 'checking') {
    return (
      <div className="subida" data-transfer={state}>
        <p className="nota espera">{fill(words.checking, sizes)}</p>
      </div>
    );
  }
  if (state === 'matching') {
    return (
      <div className="subida" data-transfer={state}>
        <p className="nota espera">
          <LunaEspera /> {fill(words.hashing, { p: Math.floor(transfer.matching * 100) })}
        </p>
      </div>
    );
  }
  const said =
    state === 'cut'
      ? fill(words.cut, sizes)
      : state === 'stopped'
        ? fill(words.stopped, sizes)
        : state === 'half'
          ? words.halfDone
          : (transfer.problem ?? words.failedPill);
  return (
    <div className="subida" data-transfer={state}>
      <p className={state === 'stopped' || state === 'half' ? 'nota' : 'fallo'} role="status">
        {said}
      </p>
      {state === 'half' && transfer.problem !== null && (
        <p className="fallo" role="alert">
          {transfer.problem}
        </p>
      )}
      <div className="acciones">
        {state === 'half' && button('pick', words.pickSame)}
        {state !== 'half' && transfer.retry && button('retry', words.retry)}
        {button('discard', words.discard)}
      </div>
    </div>
  );
}

function Actions({
  row,
  room,
  onAction,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  onAction: ViewProps['onAction'];
}) {
  const order = row.order;
  // While its machine creates, stops, starts or deletes it, there is nothing to press:
  // the pill says what is happening, and a world not born yet has nothing to open.
  if (row.status === 'changing') {
    const machine = rowPlace(row)?.server ?? '?';
    // A zip on its way that this tab is not sending: another tab's, or one left half done.
    if (row.phase === 'uploading') {
      return (
        <div className="subida" data-transfer="elsewhere">
          {row.upload !== null && (
            <UploadBar
              sent={row.upload.bytes}
              total={row.upload.of}
              label={describeStatus(row, room.reasons)}
            />
          )}
          <p className="nota espera">{fill(room.import.elsewhere, { m: machine })}</p>
        </div>
      );
    }
    if (row.phase === 'importing') {
      return <p className="nota espera">{fill(room.import.checking, { m: machine })}</p>;
    }
    return <p className="nota espera">{room.busyNote}</p>;
  }
  const open = row.legacy?.domain ?? (order?.state === 'running' ? order.domain : null);
  return (
    <div className="acciones">
      {open !== null && (
        <a
          className="btn btn-fantasma abrir"
          href={worldUrl(open)}
          target="_blank"
          rel="noopener noreferrer"
          data-metric="worlds-open"
        >
          {room.actions.open}
        </a>
      )}
      {order && order.state === 'running' && (
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => onAction(row, 'stop')}
          data-metric="worlds-stop"
        >
          {room.actions.stop}
        </button>
      )}
      {order && order.state === 'stopped' && (
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => onAction(row, 'start')}
          data-metric="worlds-start"
        >
          {room.actions.start}
        </button>
      )}
      {/* A world of the Numinia Engine whose machine takes updates, on an older build than the newest. */}
      {order && row.update && (
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => onAction(row, 'update')}
          data-metric="worlds-update"
        >
          {room.actions.update}
        </button>
      )}
      {order && (
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => onAction(row, 'download')}
          data-metric="worlds-download"
        >
          {room.actions.download}
        </button>
      )}
      {order && (
        <button
          type="button"
          className="btn btn-fantasma peligro"
          onClick={() => onAction(row, 'delete')}
          data-metric="worlds-delete"
        >
          {room.actions.delete}
        </button>
      )}
    </div>
  );
}

/** What a card does at its foot: its upload while this tab runs one, else its actions. */
function Foot({
  row,
  room,
  onAction,
  transfer,
  onTransfer,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  onAction: ViewProps['onAction'];
  transfer: TransferView | undefined;
  onTransfer: ViewProps['onTransfer'];
}) {
  if (transfer !== undefined && transfer.state !== 'landed' && onTransfer !== undefined) {
    return <TransferBox row={row} transfer={transfer} room={room} onTransfer={onTransfer} />;
  }
  return <Actions row={row} room={room} onAction={onAction} />;
}

/** The cover, or the world's initial on the house's night when the card has none yet. */
export function Cover({
  src,
  title,
  room,
}: {
  src: string | null;
  title: string;
  room: WorldsRoomMessages;
}) {
  return (
    <div className="caratula">
      {src ? (
        <img src={src} alt={fill(room.coverAlt, { t: title })} loading="lazy" decoding="async" />
      ) : (
        <span className="sin-caratula" aria-hidden="true">
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * A world's own admin code, on its card: see it, or change it, each with one
 * signature. Only a world of the fleet that is not being changed has one to
 * show; a legacy world's code is not the room's to give.
 */
function CodeLine({
  row,
  room,
  onCode,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  onCode: ViewProps['onCode'];
}) {
  if (row.order === null || row.status === 'changing') return null;
  return (
    <div
      className="codigo-mundo"
      role="group"
      aria-label={fill(room.code.showTitle, { t: row.title })}
      data-code-for={row.id}
    >
      <span className="etiqueta">{room.code.label}</span>
      <button
        type="button"
        className="btn btn-fantasma"
        onClick={() => onCode(row, 'show')}
        data-metric="worlds-code-show"
      >
        {room.code.show}
      </button>
      <button
        type="button"
        className="btn btn-fantasma"
        onClick={() => onCode(row, 'rotate')}
        data-metric="worlds-code-rotate"
      >
        {room.code.rotate}
      </button>
    </div>
  );
}

/** The admin code a world brought back from its zip was born with: on its card, once. */
function NewCode({ row, code, room }: { row: WorldRow; code: string; room: WorldsRoomMessages }) {
  return (
    <div className="codigo-nuevo" data-new-code={row.id}>
      <p className="etiqueta">{fill(room.code.shown, { t: row.title })}</p>
      <CodeBox code={code} room={room} />
      <p className="nota">{fill(room.code.chat, { code })}</p>
    </div>
  );
}

/**
 * What a world says under its name: where a world just landed came from;
 * nothing while an upload that stopped says why at the card's foot; else its state.
 */
function reasonOf(
  row: WorldRow,
  transfer: TransferView | undefined,
  room: WorldsRoomMessages,
): string | null {
  if (transfer?.state === 'landed' && row.status === 'stopped') return room.import.fromZip;
  const stuck = transfer?.state;
  if (stuck === 'cut' || stuck === 'stopped' || stuck === 'half' || stuck === 'failed') return null;
  return describeStatus(row, room.reasons);
}

/** A code for a world its machine will never make (refused, or its slot gone) is not shown. */
const codeOf = (transfer: TransferView | undefined): string | null =>
  transfer === undefined || (transfer.state === 'failed' && !transfer.retry) ? null : transfer.code;

/** A world's organization, its page, and what the house does with it: choose it, or assign it. */
function HomeLine({ row, placement }: { row: WorldRow; placement: PlacementView }) {
  const { words, homes } = placement;
  if (!placement.canPlace(row)) return null;
  const home = homes?.get(row.id) ?? null;
  return (
    <div className="casa" data-home-of={row.id} data-placed={home === null ? 'no' : 'yes'}>
      <label className="casa-elegir">
        <input
          type="checkbox"
          checked={placement.selected.has(row.id)}
          onChange={() => placement.onToggle(row)}
          data-metric="worlds-select"
        />
        <span className="visually-hidden">{fill(words.select, { w: row.title })}</span>
      </label>
      <p className="casa-nombre">
        <span className="etiqueta">{words.homeLabel}</span>
        <span data-home-name>{home === null ? words.unplaced : home.accountName}</span>
      </p>
      <div className="casa-botones">
        <button
          type="button"
          className="btn btn-fantasma"
          aria-label={fill(words.assignLabel, { w: row.title })}
          onClick={() => placement.onAssign(row)}
          data-metric="worlds-assign"
        >
          {words.assign}
        </button>
        <a
          className="btn btn-fantasma"
          href={placement.pageHref(row.id)}
          data-metric="worlds-page-link"
        >
          {words.openPage}
        </a>
      </div>
    </div>
  );
}

function WorldCard({
  row,
  room,
  onAction,
  onCode,
  transfer,
  onTransfer,
  placement,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  onAction: ViewProps['onAction'];
  onCode: ViewProps['onCode'];
  transfer: TransferView | undefined;
  onTransfer: ViewProps['onTransfer'];
  placement: ViewProps['placement'];
}) {
  const order = row.order;
  const place = rowPlace(row);
  const reason = reasonOf(row, transfer, room);
  const code = codeOf(transfer);
  return (
    <article
      className="mundo"
      data-status={row.status}
      data-world={row.id}
      data-transfer={transfer?.state}
    >
      <div className="marco-caratula">
        <Cover src={row.cover} title={row.title} room={room} />
        <StatusPill row={row} room={room} transfer={transfer} />
      </div>
      <div className="cuerpo">
        <h3>{row.title}</h3>
        <Badges row={row} room={room} />
        {reason !== null && <p className="motivo">{reason}</p>}
        {place && (
          <dl className="datos">
            <div>
              <dt className="etiqueta">{room.fields.address}</dt>
              <dd className="mono">{place.domain}</dd>
            </div>
            <div>
              <dt className="etiqueta">{room.fields.server}</dt>
              <dd className="mono">{place.server}</dd>
            </div>
            {order && (
              <div>
                <dt className="etiqueta">{room.fields.build}</dt>
                <dd className="mono" title={order.image}>
                  {engineTag(order.image)}
                </dd>
              </div>
            )}
          </dl>
        )}
        {placement !== undefined && <HomeLine row={row} placement={placement} />}
        {code !== null && <NewCode row={row} code={code} room={room} />}
        <CodeLine row={row} room={room} onCode={onCode} />
        <Foot
          row={row}
          room={room}
          onAction={onAction}
          transfer={transfer}
          onTransfer={onTransfer}
        />
      </div>
    </article>
  );
}

export function CardsView({
  rows,
  room,
  onAction,
  onCode,
  transfers,
  onTransfer,
  placement,
}: ViewProps) {
  return (
    <div className="rejilla">
      {rows.map((row) => (
        <WorldCard
          key={row.id}
          row={row}
          room={room}
          onAction={onAction}
          onCode={onCode}
          transfer={transfers?.get(row.id)}
          onTransfer={onTransfer}
          placement={placement}
        />
      ))}
    </div>
  );
}

export function ListView({
  rows,
  room,
  onAction,
  transfers,
  onTransfer,
  placement,
}: Omit<ViewProps, 'onCode'>) {
  return (
    <div className="tabla-envoltura">
      <table>
        <thead>
          <tr>
            <th scope="col">{room.fields.world}</th>
            <th scope="col">{room.fields.state}</th>
            <th scope="col">{room.fields.address}</th>
            <th scope="col">
              <span className="visually-hidden">{room.actions.open}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const place = rowPlace(row);
            const transfer = transfers?.get(row.id);
            const reason = reasonOf(row, transfer, room);
            return (
              <tr key={row.id} data-world={row.id} data-transfer={transfer?.state}>
                <td>
                  <div className="fila-mundo">
                    <Cover src={row.cover} title={row.title} room={room} />
                    <span>
                      <span className="nombre">{row.title}</span>
                      <span className="id mono">{row.id}</span>
                      <Badges row={row} room={room} />
                    </span>
                  </div>
                  {placement !== undefined && <HomeLine row={row} placement={placement} />}
                </td>
                <td>
                  <StatusPill row={row} room={room} transfer={transfer} />
                  {reason !== null && <span className="motivo">{reason}</span>}
                </td>
                <td className="mono secundario">
                  {place ? (
                    <>
                      <span className="direccion">{place.domain}</span>
                      <span className="detalle">
                        {row.order
                          ? `${place.server} · ${engineTag(row.order.image)} · ${row.order.limits.memory} · ${row.order.limits.cpus} CPU · ${row.order.limits.maxUploadMb} MB`
                          : place.server}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <Foot
                    row={row}
                    room={room}
                    onAction={onAction}
                    transfer={transfer}
                    onTransfer={onTransfer}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ServersView({
  rows,
  room,
  onAction,
  onCode,
  transfers,
  onTransfer,
  placement,
}: ViewProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string): void =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <div className="grupos">
      {groupByServer(rows).map((group) => {
        const key = group.server ?? '';
        const expanded = open.has(key);
        const visible = expanded ? group.rows : group.rows.slice(0, PER_GROUP);
        const hidden = group.rows.length - visible.length;
        return (
          <section key={key} className="grupo" aria-label={group.server ?? room.unplaced}>
            <h2 className="cabeza-grupo">
              <span className="mono">{group.server ?? room.unplaced}</span>
              <span className="cuenta mono">{group.rows.length}</span>
            </h2>
            <CardsView
              rows={visible}
              room={room}
              onAction={onAction}
              onCode={onCode}
              transfers={transfers}
              onTransfer={onTransfer}
              placement={placement}
            />
            {group.rows.length > PER_GROUP && (
              <button
                type="button"
                className="btn btn-fantasma mas"
                onClick={() => toggle(key)}
                data-metric="worlds-more"
              >
                {expanded ? room.actions.less : fill(room.actions.more, { n: hidden })}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
