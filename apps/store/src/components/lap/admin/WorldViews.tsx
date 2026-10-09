/**
 * The worlds room's three ways of looking at the fleet: cards with their
 * cover (the same picture the world shows while it loads), a compact list,
 * and the cards grouped by server — the Tower grouped by organisation, with
 * "show N more" after six.
 */

import { useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  buildTag,
  describeStatus,
  fill,
  groupByServer,
  orderFileUrl,
  type WorldRow,
} from '../../../lib/worlds';

export type WorldAction = 'stop' | 'start' | 'close';

interface ViewProps {
  readonly rows: readonly WorldRow[];
  readonly room: WorldsRoomMessages;
  readonly onAction: (row: WorldRow, action: WorldAction) => void;
}

const PER_GROUP = 6;

function StatusPill({ row, room }: { row: WorldRow; room: WorldsRoomMessages }) {
  return (
    <span
      className="pildora estado-mundo"
      data-status={row.status}
      title={describeStatus(row, room.reasons)}
    >
      {room.status[row.status]}
    </span>
  );
}

function Badges({ row, room }: { row: WorldRow; room: WorldsRoomMessages }) {
  const showPending = row.pending && row.status !== 'requested';
  if (!row.missingCard && !showPending) return null;
  return (
    <span className="marcas">
      {row.missingCard && <span className="marca sin-ficha">{room.badges.missingCard}</span>}
      {showPending && row.pending && (
        <a
          className="marca pedido"
          href={row.pending.url}
          target="_blank"
          rel="noopener noreferrer"
          data-metric="worlds-pending"
        >
          {fill(room.badges.pending, { n: row.pending.number })}
        </a>
      )}
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
  const busy = row.pending !== null;
  return (
    <div className="acciones">
      {order && order.state === 'running' && (
        <a
          className="btn btn-fantasma abrir"
          href={`https://${order.domain}/`}
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
          disabled={busy}
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
          disabled={busy}
          onClick={() => onAction(row, 'start')}
          data-metric="worlds-start"
        >
          {room.actions.start}
        </button>
      )}
      {order && (
        <button
          type="button"
          className="btn btn-fantasma peligro"
          disabled={busy}
          onClick={() => onAction(row, 'close')}
          data-metric="worlds-close"
        >
          {room.actions.close}
        </button>
      )}
      {row.status === 'requested' && row.pending && (
        <a
          className="btn btn-fantasma"
          href={row.pending.url}
          target="_blank"
          rel="noopener noreferrer"
          data-metric="worlds-pending"
        >
          {fill(room.wizard.resultPr, { n: row.pending.number })}
        </a>
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

function WorldCard({
  row,
  room,
  onAction,
}: {
  row: WorldRow;
  room: WorldsRoomMessages;
  onAction: ViewProps['onAction'];
}) {
  const order = row.order;
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
        {order && (
          <dl className="datos">
            <div>
              <dt className="etiqueta">{room.fields.address}</dt>
              <dd className="mono">{order.domain}</dd>
            </div>
            <div>
              <dt className="etiqueta">{room.fields.server}</dt>
              <dd className="mono">{order.server}</dd>
            </div>
            <div>
              <dt className="etiqueta">{room.fields.build}</dt>
              <dd className="mono">
                <a
                  href={orderFileUrl(row.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-metric="worlds-order"
                >
                  {buildTag(order.image)}
                </a>
              </dd>
            </div>
          </dl>
        )}
        <Actions row={row} room={room} onAction={onAction} />
      </div>
    </article>
  );
}

export function CardsView({ rows, room, onAction }: ViewProps) {
  return (
    <div className="rejilla">
      {rows.map((row) => (
        <WorldCard key={row.id} row={row} room={room} onAction={onAction} />
      ))}
    </div>
  );
}

export function ListView({ rows, room, onAction }: ViewProps) {
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
          {rows.map((row) => (
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
                {row.order ? (
                  <>
                    <span className="direccion">{row.order.domain}</span>
                    <span className="detalle">
                      {`${row.order.server} · ${buildTag(row.order.image)} · ${row.order.limits.memory} · ${row.order.limits.cpus} CPU · ${row.order.limits.maxUploadMb} MB`}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ServersView({ rows, room, onAction }: ViewProps) {
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
            <CardsView rows={visible} room={room} onAction={onAction} />
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
