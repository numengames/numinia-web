/**
 * Publishing a draft: the start date and the why, what the desk says of the
 * draft (checked again on every change, the newest answer winning), and the
 * dialog that shows what changes before the version is scheduled in the
 * till. A refusal keeps everything typed and shows the till's problems.
 */

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { PricesRoomMessages } from '../../../i18n/prices';
import {
  MONEY_RULES,
  NOTE_MAX,
  addDays,
  fill,
  formatCents,
  formatDay,
  formatDayStart,
  grossCents,
  isDay,
  readProblem,
  readScheduleAnswer,
  sizeOrder,
  type DeskCheck,
  type DeskDraft,
  type DeskSizePrice,
  type DeskVersion,
  type DraftChanges,
  type RuleChange,
} from '../../../lib/prices';
import { LunaEspera } from '../../chrome/LunaEspera';
import { sizeName } from './PricesSections';

type Lang = string | undefined;

/** What the room knows of the desk's check of the current draft. */
export type CheckState =
  | { readonly at: 'idle' }
  | { readonly at: 'checking' }
  | { readonly at: 'done'; readonly key: string; readonly check: DeskCheck }
  | { readonly at: 'failed'; readonly key: string; readonly notBound: boolean };

/** What the dialog publishes: the draft, the desk's check of it, and what it changes. */
export interface Snapshot {
  readonly draft: DeskDraft;
  readonly check: DeskCheck;
  readonly changes: DraftChanges;
}

/** POST to the room's API; null when the network itself failed. */
export async function askDesk(
  body: Readonly<Record<string, unknown>>,
): Promise<{ readonly status: number; readonly json: unknown } | null> {
  try {
    const response = await fetch('/api/admin/prices', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, json: await response.json().catch(() => null) };
  } catch {
    return null;
  }
}

/** One of the till's problems in the room's words (the till's own words when it is new to the room). */
export function problemWords(text: string, room: PricesRoomMessages, lang: Lang): string {
  const problem = readProblem(text);
  const words = room.publish.problems;
  switch (problem.kind) {
    case 'notice':
      return fill(words.notice, { n: problem.days, d: formatDay(problem.day, lang) });
    case 'tomorrow':
      return fill(words.tomorrow, { d: formatDay(problem.day, lang) });
    case 'in-use':
      return fill(words.inUse, { s: sizeName(problem.size, room) });
    case 'basis':
      return words.basis;
    case 'by':
      return words.by;
    case 'meanwhile':
      return words.meanwhile;
    default:
      return fill(words.other, { t: problem.text });
  }
}

export function PublishSection({
  room,
  lang,
  today,
  startsOn,
  note,
  draftReady,
  check,
  replaced,
  nothing,
  canPublish,
  onStartsOn,
  onNote,
  onOpen,
  onReload,
}: {
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly today: string;
  readonly startsOn: string;
  readonly note: string;
  /** The form reads as a draft. */
  readonly draftReady: boolean;
  /** The desk's check of THIS draft, or where it is. */
  readonly check: CheckState;
  /** The version the draft replaces, as the room reads it. */
  readonly replaced: DeskVersion | null;
  readonly nothing: boolean;
  readonly canPublish: boolean;
  readonly onStartsOn: (day: string) => void;
  readonly onNote: (note: string) => void;
  readonly onOpen: () => void;
  readonly onReload: () => void;
}) {
  const words = room.publish;
  const done = check.at === 'done' ? check.check : null;
  const min = done?.earliestStart ?? addDays(today, 1);
  const early = done !== null && isDay(startsOn) && startsOn < done.earliestStart;
  // The rise and the earliest day are said once, with the button that moves the date.
  const others =
    done?.problems.filter((text) => {
      const kind = readProblem(text).kind;
      return kind !== 'notice' && kind !== 'tomorrow';
    }) ?? [];
  const meanwhile = others.some((text) => readProblem(text).kind === 'meanwhile');
  return (
    <section className="seccion publicar" aria-labelledby="precios-publicar">
      <h2 id="precios-publicar" className="etiqueta">
        {words.title}
      </h2>
      <div className="campos-publicar">
        <div className="campo">
          <label htmlFor="precios-fecha">{words.startsOn}</label>
          <input
            id="precios-fecha"
            type="date"
            min={min}
            value={startsOn}
            aria-invalid={!isDay(startsOn) || early}
            aria-describedby="precios-utc"
            onChange={(event) => onStartsOn(event.currentTarget.value)}
            data-metric="prices-starts-on"
          />
          <p id="precios-utc" className="pista" data-utc>
            {isDay(startsOn) ? fill(words.utc, { t: formatDayStart(startsOn, lang) }) : ''}
          </p>
        </div>
        <div className="campo">
          <label htmlFor="precios-nota">{words.note}</label>
          <input
            id="precios-nota"
            type="text"
            maxLength={NOTE_MAX}
            value={note}
            placeholder={words.notePlaceholder}
            onChange={(event) => onNote(event.currentTarget.value)}
            data-metric="prices-note"
          />
        </div>
      </div>
      <div className="estado-publicar" aria-live="polite" data-check={check.at}>
        {!draftReady && <p className="fallo">{words.fixFirst}</p>}
        {draftReady && check.at === 'checking' && (
          <p className="estado">
            <LunaEspera /> {words.checking}
          </p>
        )}
        {draftReady && check.at === 'failed' && (
          <p className="fallo" role="alert">
            {check.notBound ? room.notBound : words.checkFailed}
          </p>
        )}
        {draftReady && done !== null && (
          <>
            <p className="detalle" data-replaces={done.replacedId ?? ''}>
              {replaced === null ? words.first : fill(words.replaces, { n: replaced.id })}
            </p>
            {nothing && (
              <p className="aviso-sala" data-nothing>
                {words.nothing}
              </p>
            )}
            {done.isRise && !early && (
              <p className="aviso-sala" data-rise="ready">
                {fill(words.riseReady, { n: done.noticeDays })}
              </p>
            )}
            {early && (
              <div className="mover-fecha" data-rise={done.isRise ? 'early' : undefined}>
                <p className="aviso-sala" data-earliest={done.earliestStart}>
                  {done.isRise
                    ? fill(words.rise, {
                        n: done.noticeDays,
                        d: formatDay(done.earliestStart, lang),
                      })
                    : fill(words.problems.tomorrow, { d: formatDay(done.earliestStart, lang) })}
                </p>
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={() => onStartsOn(done.earliestStart)}
                  data-metric="prices-move-date"
                >
                  {fill(words.riseMove, { d: formatDay(done.earliestStart, lang) })}
                </button>
              </div>
            )}
            {others.length > 0 && (
              <ul className="problemas" data-problems={others.length}>
                {others.map((text) => (
                  <li key={text} className="fallo">
                    {problemWords(text, room, lang)}
                  </li>
                ))}
              </ul>
            )}
            {meanwhile && (
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={onReload}
                data-metric="prices-reload"
              >
                {words.reload}
              </button>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primario"
        disabled={!canPublish}
        onClick={onOpen}
        data-metric="prices-publish"
      >
        {words.button}
      </button>
    </section>
  );
}

/** A modal of the house: Esc and a click outside close it unless it is busy; Back closes it too. */
function Modal({
  open,
  label,
  busy,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly label: string;
  readonly busy: boolean;
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
  // An open dialog owns one history entry: the browser's Back closes it instead of leaving the room.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ pricesDialog: true }, '');
    const onPop = (): void => close.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      const state = window.history.state as { pricesDialog?: boolean } | null;
      if (state?.pricesDialog === true) window.history.back();
    };
  }, [open]);
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>): void => {
    const dialog = ref.current;
    if (busy || !dialog || event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) onClose();
  };
  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-label={label}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClick={onBackdrop}
    >
      {open && children}
    </dialog>
  );
}

function PricesLine({
  price,
  room,
  lang,
}: {
  readonly price: DeskSizePrice;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
}) {
  return (
    <>
      <span className="mono">
        {fill(room.dialog.prices, {
          r: formatCents(price.runningCentsPerDay, lang),
          s: formatCents(price.stoppedCentsPerDay, lang),
        })}
      </span>
      <span className="iva">
        {fill(room.dialog.vat, {
          r: formatCents(grossCents(price.runningCentsPerDay), lang),
          s: formatCents(grossCents(price.stoppedCentsPerDay), lang),
        })}
      </span>
    </>
  );
}

function ruleValue(change: RuleChange, value: RuleChange['after'], lang: Lang): string {
  if (Array.isArray(value)) return value.map((cents) => formatCents(cents, lang)).join(' · ');
  const amount = value as number;
  return MONEY_RULES.includes(change.key) ? formatCents(amount, lang) : String(amount);
}

type Publishing =
  | { readonly at: 'ready' }
  | { readonly at: 'publishing' }
  | { readonly at: 'refused'; readonly problems: readonly string[] }
  | { readonly at: 'failed'; readonly notBound: boolean };

export function PublishDialog({
  snapshot,
  room,
  lang,
  onClose,
  onPublished,
  onRefused,
}: {
  readonly snapshot: Snapshot | null;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly onClose: () => void;
  readonly onPublished: (version: DeskVersion) => void;
  /** The till refused: the room reads the desk again, so what it shows stays true. */
  readonly onRefused: () => void;
}) {
  const [state, setState] = useState<Publishing>({ at: 'ready' });
  const run = useRef(0);
  useEffect(() => {
    // A new dialog starts clean; a run still on its way no longer counts.
    run.current += 1;
    setState({ at: 'ready' });
  }, [snapshot]);
  const words = room.dialog;
  const busy = state.at === 'publishing';
  const confirm = async (): Promise<void> => {
    if (snapshot === null) return;
    const mine = (run.current += 1);
    setState({ at: 'publishing' });
    const answer = await askDesk({ action: 'schedule', draft: snapshot.draft });
    if (mine !== run.current) return;
    const result =
      answer === null || answer.status !== 200 ? null : readScheduleAnswer(answer.json);
    if (result === null) {
      setState({ at: 'failed', notBound: answer?.status === 503 });
      return;
    }
    if (!result.ok) {
      setState({ at: 'refused', problems: result.problems });
      onRefused();
      return;
    }
    onPublished(result.version);
  };
  const id = snapshot?.check.nextId ?? 0;
  return (
    <Modal
      open={snapshot !== null}
      label={fill(words.title, { n: id })}
      busy={busy}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {snapshot !== null && (
        <div className="contenido-dialogo" data-publish-dialog={id}>
          <h2>{fill(words.title, { n: id })}</h2>
          <p className="nota">{words.intro}</p>
          <h3 className="etiqueta">{words.sizes}</h3>
          {snapshot.changes.sizes.length === 0 ? (
            <p className="nota">{words.noSizes}</p>
          ) : (
            <div className="tabla-envoltura">
              <table className="tabla-cambios">
                <thead>
                  <tr>
                    <th scope="col">{words.size}</th>
                    <th scope="col">{words.before}</th>
                    <th scope="col">{words.after}</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeOrder(snapshot.changes.sizes.map((change) => change.key)).map((key) => {
                    const change = snapshot.changes.sizes.find(
                      (candidate) => candidate.key === key,
                    );
                    if (change === undefined) return null;
                    return (
                      <tr key={key} data-change={key}>
                        <th scope="row">{sizeName(key, room)}</th>
                        <td>
                          {change.before === null ? (
                            <span className="nota">{words.added}</span>
                          ) : (
                            <PricesLine price={change.before} room={room} lang={lang} />
                          )}
                        </td>
                        <td>
                          {change.after === null ? (
                            <span className="nota">{words.removed}</span>
                          ) : (
                            <PricesLine price={change.after} room={room} lang={lang} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <h3 className="etiqueta">{words.rules}</h3>
          {snapshot.changes.rules.length === 0 ? (
            <p className="nota">{words.noRules}</p>
          ) : (
            <ul className="cambios-reglas">
              {snapshot.changes.rules.map((change) => (
                <li key={change.key} data-rule-change={change.key}>
                  {room.rules.items[change.key].label}:{' '}
                  <span className="mono">
                    {change.before === null ? '—' : ruleValue(change, change.before, lang)} →{' '}
                    {ruleValue(change, change.after, lang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="detalle" data-starts={snapshot.draft.startsOn}>
            {fill(words.starts, {
              d: formatDay(snapshot.draft.startsOn, lang),
              t: formatDayStart(snapshot.draft.startsOn, lang),
            })}
          </p>
          <p className="nota-version">
            <strong>{words.note}:</strong> {snapshot.draft.basis?.note || words.noNote}
          </p>
          {snapshot.check.isRise && (
            <p className="aviso-sala" data-mail>
              {words.mail}
            </p>
          )}
          {state.at === 'refused' && (
            <div className="rechazo" role="alert" data-refused={state.problems.length}>
              <p className="fallo">{words.refused}</p>
              <ul className="problemas">
                {state.problems.map((text) => (
                  <li key={text} className="fallo">
                    {problemWords(text, room, lang)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {state.at === 'failed' && (
            <p className="fallo" role="alert" data-failed>
              {state.notBound ? room.notBound : words.failed}
            </p>
          )}
          <div className="pie">
            <button
              type="button"
              className="btn btn-fantasma"
              disabled={busy}
              onClick={onClose}
              data-metric="prices-dialog-cancel"
            >
              {state.at === 'refused' ? words.close : words.cancel}
            </button>
            <button
              type="button"
              className="btn btn-primario"
              disabled={busy || state.at === 'refused'}
              data-espera={busy ? '' : undefined}
              onClick={() => void confirm()}
              data-metric="prices-dialog-publish"
            >
              {busy ? words.publishing : fill(words.confirm, { n: id })}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
