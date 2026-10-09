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
  deleteOrderUrl,
  draftToOrder,
  editOrderUrl,
  emptyDraft,
  fill,
  newOrderUrl,
  problemFields,
  renderOrder,
  suggestDomain,
  type DraftField,
  type OrderDraft,
  type WorldCardInfo,
  type WorldRow,
} from '../../../lib/worlds';
import { Cover, type WorldAction } from './WorldViews';

type Outcome =
  | { readonly at: 'idle' }
  | { readonly at: 'sending' }
  | { readonly at: 'done'; readonly number: number; readonly url: string }
  | { readonly at: 'manual'; readonly url: string; readonly note: string }
  | { readonly at: 'error'; readonly detail: string; readonly url?: string };

type Body =
  | { readonly action: 'create'; readonly draft: OrderDraft }
  | { readonly action: WorldAction; readonly id: string };

/** Ask the Worker to open the pull request; fall back to GitHub when it has no key. */
async function propose(
  body: Body,
  manual: { url: string; note: string },
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
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
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
}: {
  outcome: Outcome;
  room: WorldsRoomMessages;
  onClose: () => void;
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
        <div className="pie">
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

export function NewWorldDialog({
  open,
  onClose,
  onProposed,
  room,
  cards,
  servers,
  canPropose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onProposed: () => void;
  readonly room: WorldsRoomMessages;
  readonly cards: readonly WorldCardInfo[];
  readonly servers: readonly string[];
  readonly canPropose: boolean;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OrderDraft>(() => emptyDraft(servers[0]));
  const [outcome, setOutcome] = useState<Outcome>({ at: 'idle' });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(emptyDraft(servers[0]));
    setOutcome({ at: 'idle' });
  }, [open, servers]);

  const result = useMemo(() => draftToOrder(draft), [draft]);
  const marked: ReadonlySet<DraftField> = new Set(
    'problems' in result && step === 3 ? problemFields(result.problems) : [],
  );
  const set = (key: keyof OrderDraft) => (value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const chosen = cards.find((card) => card.slug === draft.card.trim()) ?? null;

  const canNext =
    (step === 0 && draft.id.trim() !== '' && draft.card.trim() !== '') ||
    (step === 1 && draft.server.trim() !== '' && draft.domain.trim() !== '') ||
    (step === 2 && draft.image.trim() !== '');

  const next = (): void => {
    if (step === 0 && draft.domain.trim() === '') {
      setDraft((current) => ({
        ...current,
        domain: suggestDomain(current.id.trim().toLowerCase()),
      }));
    }
    setStep((current) => current + 1);
  };

  const submit = async (): Promise<void> => {
    if (!('order' in result)) return;
    const manual = { url: newOrderUrl(result.order), note: room.wizard.manualNote };
    if (!canPropose) {
      setOutcome({ at: 'manual', ...manual });
      return;
    }
    setOutcome({ at: 'sending' });
    const answer = await propose({ action: 'create', draft }, manual, room);
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
        <Result outcome={outcome} room={room} onClose={onClose} />
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
                          id:
                            current.id === '' || current.id === current.card
                              ? card.slug
                              : current.id,
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
                invalid={marked.has('id')}
                onChange={set('id')}
              />
              <Field
                id="mundo-ficha"
                label={room.wizard.cardLabel}
                hint={room.wizard.cardHint}
                value={draft.card}
                invalid={marked.has('card')}
                onChange={set('card')}
              />
            </>
          )}
          {step === 1 && (
            <>
              <Field
                id="mundo-servidor"
                label={room.wizard.serverLabel}
                hint={room.wizard.serverHint}
                value={draft.server}
                invalid={marked.has('server')}
                onChange={set('server')}
                list="mundo-servidores"
              />
              <datalist id="mundo-servidores">
                {servers.map((server) => (
                  <option key={server} value={server} />
                ))}
              </datalist>
              <Field
                id="mundo-dominio"
                label={room.wizard.domainLabel}
                hint={room.wizard.domainHint}
                value={draft.domain}
                invalid={marked.has('domain')}
                onChange={set('domain')}
              />
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
  canPropose,
}: {
  readonly change: { readonly row: WorldRow; readonly action: WorldAction } | null;
  readonly onClose: () => void;
  readonly onProposed: () => void;
  readonly room: WorldsRoomMessages;
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

  const manual = (): { url: string; note: string } => {
    const id = row?.id ?? '';
    if (action === 'close') return { url: deleteOrderUrl(id), note: room.wizard.manualNote };
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
