/**
 * The worlds room's three ways of looking at the fleet: cards with their
 * cover (the same picture the world shows while it loads), a compact list,
 * and the cards grouped by server — the Tower grouped by organisation, with
 * "show N more" after six. Each card of a world of the fleet carries its own
 * admin code: Show and Change code, one signature each.
 */

import { useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  buildTag,
  describeStatus,
  fill,
  groupByServer,
  rowPlace,
  worldUrl,
  type WorldRow,
} from '../../../lib/worlds';
import { LunaEspera } from '../../chrome/LunaEspera';

export type WorldAction = 'stop' | 'start' | 'delete' | 'download';
/** What the Oracle asks of a world's own admin code: to see it, or to change it. */
export type CodeMode = 'show' | 'rotate';

interface ViewProps {
  readonly rows: readonly WorldRow[];
  readonly room: WorldsRoomMessages;
  readonly onAction: (row: WorldRow, action: WorldAction) => void;
  readonly onCode: (row: WorldRow, mode: CodeMode) => void;
}

const PER_GROUP = 6;

/** What a world is doing, in one verb: the settled states as they are, a change as what is happening now. */
function StatusPill({ row, room }: { row: WorldRow; room: WorldsRoomMessages }) {
  const phase = row.phase;
  const doing =
    row.status === 'changing' &&
    (phase === 'creating' || phase === 'stopping' || phase === 'starting' || phase === 'deleting')
      ? room.phases[phase]
      : null;
  return (
    <span
      className="pildora estado-mundo"
      data-status={row.status}
      data-phase={doing === null ? undefined : phase}
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
  if (row.status === 'changing') return <p className="nota espera">{room.busyNote}</p>;
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

function WorldCard({
  row,
  room,
  onAction,
  onCode,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  onAction: ViewProps['onAction'];
  onCode: ViewProps['onCode'];
}) {
  const order = row.order;
  const place = rowPlace(row);
  return (
    <article className="mundo" data-status={row.status} data-world={row.id}>
      <div className="marco-caratula">
        <Cover src={row.cover} title={row.title} room={room} />
        <StatusPill row={row} room={room} />
      </div>
      <div className="cuerpo">
        <h3>{row.title}</h3>
        <Badges row={row} room={room} />
        <p className="motivo">{describeStatus(row, room.reasons)}</p>
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
                  {buildTag(order.image)}
                </dd>
              </div>
            )}
          </dl>
        )}
        <CodeLine row={row} room={room} onCode={onCode} />
        <Actions row={row} room={room} onAction={onAction} />
      </div>
    </article>
  );
}

export function CardsView({ rows, room, onAction, onCode }: ViewProps) {
  return (
    <div className="rejilla">
      {rows.map((row) => (
        <WorldCard key={row.id} row={row} room={room} onAction={onAction} onCode={onCode} />
      ))}
    </div>
  );
}

export function ListView({ rows, room, onAction }: Omit<ViewProps, 'onCode'>) {
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
            return (
              <tr key={row.id} data-world={row.id}>
                <td>
                  <div className="fila-mundo">
                    <Cover src={row.cover} title={row.title} room={room} />
                    <span>
                      <span className="nombre">{row.title}</span>
                      <span className="id mono">{row.id}</span>
                      <Badges row={row} room={room} />
                    </span>
                  </div>
                </td>
                <td>
                  <StatusPill row={row} room={room} />
                  <span className="motivo">{describeStatus(row, room.reasons)}</span>
                </td>
                <td className="mono secundario">
                  {place ? (
                    <>
                      <span className="direccion">{place.domain}</span>
                      <span className="detalle">
                        {row.order
                          ? `${place.server} · ${buildTag(row.order.image)} · ${row.order.limits.memory} · ${row.order.limits.cpus} CPU · ${row.order.limits.maxUploadMb} MB`
                          : place.server}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <Actions row={row} room={room} onAction={onAction} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ServersView({ rows, room, onAction, onCode }: ViewProps) {
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
            <CardsView rows={visible} room={room} onAction={onAction} onCode={onCode} />
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
