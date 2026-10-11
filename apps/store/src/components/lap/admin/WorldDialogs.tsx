/**
 * The worlds room's dialogs, after the Tower's: a four-step wizard for a
 * new world (card → place → engine → confirm) that shows the address and
 * the exact order before anything is sent, and a change dialog for stop,
 * start and close — close asks you to type the world's name.
 *
 * Nothing here writes to a server. With the room's key, the proposal is a
 * pull request opened by the Worker; without it, the same change opens on
 * GitHub, already written, under the Oracle's own account.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import {
  WORLD_ZONES,
  addressOwner,
  deleteOrderUrl,
  indexWith,
  draftToOrder,
  editOrderUrl,
  emptyDraft,
  fill,
  inHouseZone,
  joinDomain,
  newOrderUrl,
  placeAllowed,
  problemFields,
  renderOrder,
  type AddressDns,
  type DraftField,
  type OrderDraft,
  type WorldCardInfo,
  type WorldRow,
} from '../../../lib/worlds';
import { checkAddress } from '../../../lib/worlds-source';
import { Cover, type WorldAction } from './WorldViews';

/** The ids the book holds today: the rows that carry an order (legacy rows have none). */
const orderIds = (rows: readonly WorldRow[]): string[] =>
  rows.filter((row) => row.order !== null).map((row) => row.id);

type Outcome =
  | { readonly at: 'idle' }
  | { readonly at: 'sending' }
  | { readonly at: 'done'; readonly number: number; readonly url: string }
  | {
      readonly at: 'manual';
      readonly url: string;
      readonly note: string;
      /** The index as it must read after this change, when the change needs it (create, close). */
      readonly index?: string;
    }
  | { readonly at: 'error'; readonly detail: string; readonly url?: string };

type Body =
  | { readonly action: 'create'; readonly draft: OrderDraft }
  | { readonly action: WorldAction; readonly id: string };

/** Ask the Worker to open the pull request; fall back to GitHub when it has no key. */
async function propose(
  body: Body,
  manual: { url: string; note: string; index?: string },
  room: WorldsRoomMessages,
): Promise<Outcome> {
  try {
    const response = await fetch('/api/admin/worlds', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      number?: number;
      url?: string;
      error?: string;
    };
    if (response.status === 201 && data.number !== undefined && data.url !== undefined) {
      return { at: 'done', number: data.number, url: data.url };
    }
    if (response.status === 503 && data.error === 'not-configured')
      return { at: 'manual', ...manual };
    if (response.status === 409 && data.error === 'pending') {
      return data.url !== undefined
        ? { at: 'error', detail: room.wizard.pendingExists, url: data.url }
        : { at: 'error', detail: room.wizard.pendingExists };
    }
    return {
      at: 'error',
      detail: fill(room.wizard.error, { detail: `${response.status} ${data.error ?? ''}`.trim() }),
    };
  } catch (error) {
    return {
      at: 'error',
      detail: fill(room.wizard.error, { detail: error instanceof Error ? error.message : '?' }),
    };
  }
}

function Modal({
  open,
  label,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly label: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  // An open dialog owns one history entry, so the browser's Back closes it
  // instead of leaving the room (and losing what was typed).
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ worldsDialog: true }, '');
    const onPop = (): void => close.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      const state = window.history.state as { worldsDialog?: boolean } | null;
      if (state?.worldsDialog === true) window.history.back();
    };
  }, [open]);
  return (
    <dialog ref={ref} className="dialogo" aria-label={label} onClose={onClose}>
      {open && children}
    </dialog>
  );
}

function Result({
  outcome,
  room,
  onClose,
  onBack,
}: {
  outcome: Outcome;
  room: WorldsRoomMessages;
  onClose: () => void;
  /** Back to the wizard, keeping what was typed; absent when there is nothing to go back to. */
  onBack?: (() => void) | undefined;
}) {
  if (outcome.at === 'done') {
    return (
      <div className="resultado">
        <h2>{room.wizard.resultTitle}</h2>
        <p>
          <a href={outcome.url} target="_blank" rel="noopener noreferrer" data-metric="worlds-pr">
            {fill(room.wizard.resultPr, { n: outcome.number })}
          </a>
        </p>
        <p className="nota">{room.wizard.resultAfter}</p>
        <div className="pie">
          <button
            type="button"
            className="btn btn-primario"
            onClick={onClose}
            data-metric="worlds-done"
          >
            {room.wizard.done}
          </button>
        </div>
      </div>
    );
  }
  if (outcome.at === 'manual') {
    return (
      <div className="resultado">
        <h2>{room.wizard.manualTitle}</h2>
        <p className="nota">{outcome.note}</p>
        {outcome.index !== undefined && (
          <>
            <p className="nota">{room.wizard.manualIndex}</p>
            <pre className="mono" data-index>
              {outcome.index}
            </pre>
          </>
        )}
        <div className="pie">
          {onBack !== undefined && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={onBack}
              data-metric="worlds-wizard-back"
            >
              {room.wizard.back}
            </button>
          )}
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={onClose}
            data-metric="worlds-done"
          >
            {room.wizard.done}
          </button>
          <a
            className="btn btn-primario"
            href={outcome.url}
            target="_blank"
            rel="noopener noreferrer"
            data-metric="worlds-github"
          >
            {room.wizard.openGithub}
          </a>
        </div>
      </div>
    );
  }
  return null;
}

function Field({
  id,
  label,
  hint,
  value,
  invalid,
  onChange,
  list,
  mono = true,
}: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly value: string;
  readonly invalid: boolean;
  readonly onChange: (value: string) => void;
  readonly list?: string;
  readonly mono?: boolean;
}) {
  return (
    <label className="campo" htmlFor={id}>
      <span className="etiqueta">{label}</span>
      <input
        id={id}
        className={mono ? 'mono' : undefined}
        value={value}
        aria-invalid={invalid}
        list={list}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        data-metric="worlds-field"
      />
      {hint !== undefined && <span className="pista">{hint}</span>}
    </label>
  );
}

const STEPS = ['stepCard', 'stepPlace', 'stepEngine', 'stepConfirm'] as const;

type DnsState = AddressDns | 'checking';

/** One line under the address: whose it is, or where public DNS sends it. */
function AddressLine({
  domain,
  machine,
  owner,
  dns,
  room,
}: {
  readonly domain: string;
  readonly machine: string;
  readonly owner: { readonly id: string; readonly legacy: boolean } | null;
  readonly dns: DnsState;
  readonly room: WorldsRoomMessages;
}) {
  const words = room.wizard;
  if (domain === '') return null;
  if (!inHouseZone(domain)) {
    return (
      <p className="linea-dns" data-tono="mal">
        {words.labelInvalid}
      </p>
    );
  }
  if (owner) {
    // An order already there is a clash; a legacy world there is a move into the fleet.
    return (
      <p className="linea-dns" data-tono={owner.legacy ? 'aviso' : 'mal'} role="alert">
        {fill(owner.legacy ? words.legacyMove : words.addressTaken, {
          d: domain,
          w: owner.id,
          m: machine,
        })}
      </p>
    );
  }
  const text: Readonly<Record<DnsState, string>> = {
    checking: words.dnsChecking,
    machine: words.dnsMachine,
    elsewhere: words.dnsElsewhere,
    none: words.dnsNone,
    unknown: words.dnsUnknown,
  };
  const tone: Readonly<Record<DnsState, string>> = {
    checking: 'neutro',
    machine: 'bien',
    elsewhere: 'mal',
    none: 'aviso',
    unknown: 'aviso',
  };
  return (
    <p className="linea-dns" data-tono={tone[dns]} aria-live="polite">
      {fill(text[dns], { d: domain, m: machine })}
    </p>
  );
}

export function NewWorldDialog({
  open,
  onClose,
  onProposed,
  room,
  cards,
  machines,
  rows,
  canPropose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onProposed: () => void;
  readonly room: WorldsRoomMessages;
  readonly cards: readonly WorldCardInfo[];
  /** The machines to choose from: the fleet's own first (machineChoices). */
  readonly machines: readonly string[];
  /** Every world the room shows, to see whether an address is already taken. */
  readonly rows: readonly WorldRow[];
  readonly canPropose: boolean;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OrderDraft>(() => emptyDraft(machines[0]));
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState<string>(WORLD_ZONES[0]);
  const [dns, setDns] = useState<DnsState>('checking');
  const [outcome, setOutcome] = useState<Outcome>({ at: 'idle' });

  const clear = (): void => {
    setStep(0);
    setDraft(emptyDraft(machines[0]));
    setLabel('');
    setZone(WORLD_ZONES[0]);
    setOutcome({ at: 'idle' });
  };

  // Nothing typed is ever thrown away: closing the wizard keeps the draft, and
  // only a proposal already handed over (or Start again) empties it. A draft
  // never touched still takes the machine the room ended up loading.
  const pristine = draft.id.trim() === '' && label.trim() === '';
  useEffect(() => {
    if (!open || !pristine) return;
    setDraft((current) =>
      machines[0] === undefined || current.server === machines[0]
        ? current
        : { ...current, server: machines[0] },
    );
  }, [open, pristine, machines]);

  const finish = (): void => {
    clear();
    onClose();
  };

  const domain = joinDomain(label, zone);
  const owner = addressOwner(domain, rows);

  // Where the address points, asked of public DNS a moment after the last keystroke.
  useEffect(() => {
    if (step !== 1 || !inHouseZone(domain) || (owner && !owner.legacy)) return;
    let alive = true;
    setDns('checking');
    const timer = setTimeout(() => {
      void checkAddress(fetch, domain, draft.server).then((answer) => {
        if (alive) setDns(answer);
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [step, domain, draft.server, owner?.id, owner?.legacy]);

  const full = useMemo(() => ({ ...draft, domain }), [draft, domain]);
  const result = useMemo(() => draftToOrder(full), [full]);
  const marked: ReadonlySet<DraftField> = new Set(
    'problems' in result && step === 3 ? problemFields(result.problems) : [],
  );
  const set = (key: keyof OrderDraft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const chosen = cards.find((card) => card.slug === draft.card.trim()) ?? null;

  const canNext =
    (step === 0 && draft.id.trim() !== '') ||
    (step === 1 && draft.server.trim() !== '' && placeAllowed(domain, owner, dns)) ||
    (step === 2 && draft.image.trim() !== '');

  const next = (): void => {
    if (step === 0 && label.trim() === '') setLabel(draft.id.trim().toLowerCase());
    setStep((current) => current + 1);
  };

  const submit = async (): Promise<void> => {
    if (!('order' in result)) return;
    const manual = {
      url: newOrderUrl(result.order),
      note: room.wizard.manualNote,
      index: indexWith(orderIds(rows), result.order.id, true),
    };
    if (!canPropose) {
      setOutcome({ at: 'manual', ...manual });
      return;
    }
    setOutcome({ at: 'sending' });
    const answer = await propose({ action: 'create', draft: full }, manual, room);
    setOutcome(answer);
    if (answer.at === 'done') onProposed();
  };

  const finished = outcome.at === 'done' || outcome.at === 'manual';

  return (
    <Modal open={open} label={room.wizard.title} onClose={onClose}>
      <header className="cabeza-dialogo">
        <h2>{room.wizard.title}</h2>
        {!finished && (
          <ol className="pasos">
            {STEPS.map((name, index) => (
              <li
                key={name}
                aria-current={index === step ? 'step' : undefined}
                data-done={index < step}
              >
                {room.wizard[name]}
              </li>
            ))}
          </ol>
        )}
      </header>

      {finished ? (
        <Result
          outcome={outcome}
          room={room}
          onClose={finish}
          onBack={outcome.at === 'manual' ? () => setOutcome({ at: 'idle' }) : undefined}
        />
      ) : (
        <div className="contenido">
          {step === 0 && (
            <>
              <p className="nota">
                {cards.length > 0 ? room.wizard.cardIntro : room.wizard.cardNone}
              </p>
              {cards.length > 0 && (
                <div className="fichas" role="group" aria-label={room.wizard.cardLabel}>
                  {cards.map((card) => (
                    <button
                      key={card.slug}
                      type="button"
                      className="ficha-mundo"
                      aria-pressed={draft.card === card.slug}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          card: card.slug,
                          id: card.slug,
                        }))
                      }
                      data-metric="worlds-wizard-card"
                    >
                      <Cover src={card.cover} title={card.title} room={room} />
                      <span>{card.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <Field
                id="mundo-id"
                label={room.wizard.idLabel}
                hint={room.wizard.idHint}
                value={draft.id}
                invalid={marked.has('id') || marked.has('card')}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, id: value, card: value }))
                }
              />
            </>
          )}
          {step === 1 && (
            <>
              <label className="campo" htmlFor="mundo-servidor">
                <span className="etiqueta">{room.wizard.serverLabel}</span>
                <select
                  id="mundo-servidor"
                  value={draft.server}
                  onChange={(event) => set('server')(event.target.value)}
                  data-metric="worlds-field"
                >
                  {machines.map((machine) => (
                    <option key={machine} value={machine}>
                      {machine}
                    </option>
                  ))}
                </select>
                <span className="pista">{room.wizard.serverHint}</span>
              </label>
              <div className="campo">
                <label className="etiqueta" htmlFor="mundo-dominio">
                  {room.wizard.domainLabel}
                </label>
                <div className="direccion-campo">
                  <input
                    id="mundo-dominio"
                    className="mono"
                    value={label}
                    aria-invalid={label !== '' && !inHouseZone(domain)}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => setLabel(event.target.value)}
                    data-metric="worlds-field"
                  />
                  <span className="mono zona-punto" aria-hidden="true">
                    .
                  </span>
                  <select
                    aria-label={room.wizard.zoneLabel}
                    className="mono"
                    value={zone}
                    onChange={(event) => setZone(event.target.value)}
                    data-metric="worlds-field"
                  >
                    {WORLD_ZONES.map((candidate) => (
                      <option key={candidate} value={candidate}>
                        {candidate}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="pista">{room.wizard.domainHint}</span>
                <AddressLine
                  domain={domain}
                  machine={draft.server}
                  owner={owner}
                  dns={dns}
                  room={room}
                />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Field
                id="mundo-motor"
                label={room.wizard.imageLabel}
                hint={room.wizard.imageHint}
                value={draft.image}
                invalid={marked.has('image')}
                onChange={set('image')}
              />
              <div className="trio">
                <Field
                  id="mundo-memoria"
                  label={room.wizard.memoryLabel}
                  value={draft.memory}
                  invalid={marked.has('memory')}
                  onChange={set('memory')}
                />
                <Field
                  id="mundo-cpu"
                  label={room.wizard.cpusLabel}
                  value={draft.cpus}
                  invalid={marked.has('cpus')}
                  onChange={set('cpus')}
                />
                <Field
                  id="mundo-subida"
                  label={room.wizard.uploadLabel}
                  value={draft.maxUploadMb}
                  invalid={marked.has('upload')}
                  onChange={set('maxUploadMb')}
                />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              {'order' in result ? (
                <div className="confirmacion">
                  <Cover
                    src={chosen?.cover ?? null}
                    title={chosen?.title ?? result.order.id}
                    room={room}
                  />
                  <div>
                    <p className="nota">{room.wizard.confirmIntro}</p>
                    <pre className="orden mono">{renderOrder(result.order)}</pre>
                  </div>
                </div>
              ) : (
                <p className="fallo" role="alert">
                  {fill(room.wizard.invalid, {
                    fields: problemFields(result.problems)
                      .map((field) => room.fieldNames[field])
                      .join(', '),
                  })}
                </p>
              )}
              {outcome.at === 'error' && (
                <p className="fallo" role="alert">
                  {outcome.detail}{' '}
                  {outcome.url !== undefined && (
                    <a
                      href={outcome.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-metric="worlds-pending"
                    >
                      {outcome.url}
                    </a>
                  )}
                </p>
              )}
            </>
          )}
          <div className="pie">
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={onClose}
              data-metric="worlds-wizard-cancel"
            >
              {room.wizard.cancel}
            </button>
            {!pristine && (
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={clear}
                data-metric="worlds-wizard-restart"
              >
                {room.wizard.restart}
              </button>
            )}
            {step > 0 && (
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => setStep((current) => current - 1)}
                data-metric="worlds-wizard-back"
              >
                {room.wizard.back}
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primario"
                disabled={!canNext}
                onClick={next}
                data-metric="worlds-wizard-next"
              >
                {room.wizard.next}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primario"
                disabled={!('order' in result) || outcome.at === 'sending'}
                onClick={() => void submit()}
                data-metric="worlds-wizard-propose"
              >
                {outcome.at === 'sending' ? room.wizard.proposing : room.wizard.propose}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ChangeDialog({
  change,
  onClose,
  onProposed,
  room,
  rows,
  canPropose,
}: {
  readonly change: { readonly row: WorldRow; readonly action: WorldAction } | null;
  readonly onClose: () => void;
  readonly onProposed: () => void;
  readonly room: WorldsRoomMessages;
  readonly rows: readonly WorldRow[];
  readonly canPropose: boolean;
}) {
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ at: 'idle' });

  useEffect(() => {
    setTyped('');
    setOutcome({ at: 'idle' });
  }, [change]);

  const row = change?.row;
  const action = change?.action ?? 'stop';
  const title = row
    ? fill(
        action === 'stop'
          ? room.change.stopTitle
          : action === 'start'
            ? room.change.startTitle
            : room.change.closeTitle,
        {
          t: row.title,
        },
      )
    : '';
  const confirmed = action !== 'close' || typed.trim() === row?.id;

  const manual = (): { url: string; note: string; index?: string } => {
    const id = row?.id ?? '';
    if (action === 'close') {
      return {
        url: deleteOrderUrl(id),
        note: room.wizard.manualNote,
        index: indexWith(orderIds(rows), id, false),
      };
    }
    return {
      url: editOrderUrl(id),
      note: fill(room.wizard.manualEdit, { state: action === 'stop' ? 'stopped' : 'running' }),
    };
  };

  const submit = async (): Promise<void> => {
    if (!row || !confirmed) return;
    if (!canPropose) {
      setOutcome({ at: 'manual', ...manual() });
      return;
    }
    setOutcome({ at: 'sending' });
    const answer = await propose({ action, id: row.id }, manual(), room);
    setOutcome(answer);
    if (answer.at === 'done') onProposed();
  };

  const finished = outcome.at === 'done' || outcome.at === 'manual';

  return (
    <Modal open={change !== null} label={title} onClose={onClose}>
      <header className="cabeza-dialogo">
        <h2>{title}</h2>
      </header>
      {finished ? (
        <Result outcome={outcome} room={room} onClose={onClose} />
      ) : (
        <div className="contenido">
          <p>
            {action === 'stop'
              ? room.change.stopIntro
              : action === 'start'
                ? room.change.startIntro
                : room.change.closeIntro}
          </p>
          {action === 'close' && row && (
            <>
              <ul className="pasos-cierre">
                {room.change.closeSteps.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Field
                id="mundo-confirmar"
                label={fill(room.change.typeToConfirm, { id: row.id })}
                value={typed}
                invalid={typed !== '' && !confirmed}
                onChange={setTyped}
              />
            </>
          )}
          {outcome.at === 'error' && (
            <p className="fallo" role="alert">
              {outcome.detail}{' '}
              {outcome.url !== undefined && (
                <a
                  href={outcome.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-metric="worlds-pending"
                >
                  {outcome.url}
                </a>
              )}
            </p>
          )}
          <div className="pie">
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={onClose}
              data-metric="worlds-change-cancel"
            >
              {room.wizard.cancel}
            </button>
            <button
              type="button"
              className={action === 'close' ? 'btn btn-destructivo' : 'btn btn-primario'}
              disabled={!confirmed || outcome.at === 'sending'}
              onClick={() => void submit()}
              data-metric={`worlds-change-${action}`}
            >
              {outcome.at === 'sending' ? room.wizard.proposing : room.change.confirm}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
