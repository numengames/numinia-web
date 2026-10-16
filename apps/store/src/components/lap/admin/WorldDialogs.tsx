/**
 * The worlds room's dialogs, after the Tower's: a four-step wizard for a
 * new world (card → place → engine → confirm) that shows exactly what the
 * wallet will sign — the engine step offers the engines the chosen
 * machine's door names —, a dialog for stop, start, update, download and
 * delete — delete warns that it cannot be undone, offers a copy first and
 * asks you to type the world's address — and one that shows or changes a
 * world's own admin code.
 *
 * Nothing here holds a key. Each action is one request the Oracle's wallet
 * signs and the machine checks itself (lib/fleet.ts). Once the machine takes
 * it, a dialog closes (a create keeps the new world's admin code on screen)
 * and the world's card shows the rest; only a download waits here for its
 * zip, and a code dialog stays open to show the code.
 */

import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import { copyFileUrl, formatBytes } from '../../../lib/fleet';
import {
  DEFAULT_IMAGE,
  ENGINE_NAMES,
  WORLD_ZONES,
  addressOwner,
  buildTag,
  draftToOrder,
  emptyDraft,
  engineOf,
  engineTag,
  fill,
  inHouseZone,
  joinDomain,
  nameOwner,
  placeAllowed,
  problemFields,
  rowPlace,
  type AddressDns,
  type DraftField,
  type Engine,
  type EngineRelease,
  type OrderDraft,
  type WorldCardInfo,
  type WorldRow,
} from '../../../lib/worlds';
import { checkAddress } from '../../../lib/worlds-source';
import { LunaEspera } from '../../chrome/LunaEspera';
import { busy, problemText, stepText, useFleetAction, type Step } from './fleet-action';
import { CodeBox, Cover, type CodeMode, type WorldAction } from './WorldViews';

export function Modal({
  open,
  label,
  onClose,
  dismissable = true,
  children,
}: {
  readonly open: boolean;
  readonly label: string;
  readonly onClose: () => void;
  /** A click outside the dialog closes it — not while the wallet or the machine is being asked. */
  readonly dismissable?: boolean;
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
  // A native modal ignores clicks on its backdrop; a click that lands on the
  // dialog element itself, outside its box, is one.
  const onBackdrop = (event: MouseEvent<HTMLDialogElement>): void => {
    const dialog = ref.current;
    if (!dismissable || !dialog || event.target !== dialog) return;
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
        // Esc does nothing while the wallet or the machine is being asked.
        if (!dismissable) event.preventDefault();
      }}
      onClick={onBackdrop}
    >
      {open && children}
    </dialog>
  );
}

/** Calls `effect` each time a signed request is taken or finished: the room reads the fleet again. */
function useOnProgress(step: Step, effect: () => void): void {
  const latest = useRef(effect);
  latest.current = effect;
  useEffect(() => {
    if (step.at === 'accepted' || step.at === 'done') latest.current();
  }, [step.at]);
}

/** Where the request is while it travels, or what went wrong once it stopped. */
export function StepLine({
  step,
  machine,
  room,
  sessionHref,
  values,
}: {
  readonly step: Step;
  readonly machine: string;
  readonly room: WorldsRoomMessages;
  /** Where the wallet is connected again, when the room cannot find it. */
  readonly sessionHref: string;
  /** A zip rule's own blanks (`{f}`, `{s}`, `{max}`), for a world brought back from its zip. */
  readonly values?: Readonly<Record<string, string | number>> | undefined;
}) {
  if (step.at === 'failed') {
    return (
      <p className="fallo" role="alert" data-problem={step.problem}>
        {problemText(step, machine, room, values)}
        {step.problem === 'no-wallet' && (
          <>
            {' '}
            <a href={sessionHref} target="_blank" rel="noopener" data-metric="worlds-session">
              {room.problems.noWalletLink}
            </a>
          </>
        )}
      </p>
    );
  }
  const line = stepText(step, machine, room);
  if (line === null) return null;
  return (
    <p className="estado paso-firma" aria-live="polite" data-step={step.at}>
      <LunaEspera /> {line}
    </p>
  );
}

export function Field({
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

export type DnsState = AddressDns | 'checking';

/** One line under the address: whose it is, or where public DNS sends it. */
export function AddressLine({
  domain,
  machine,
  owner,
  dns,
  room,
}: {
  readonly domain: string;
  readonly machine: string;
  readonly owner: {
    readonly id: string;
    readonly legacy: boolean;
    readonly leaving: boolean;
  } | null;
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
  if (owner?.leaving) {
    // A world deleted a moment ago keeps its address until its folder and keys are gone.
    return (
      <p className="linea-dns" data-tono="aviso" role="alert">
        {fill(words.addressFreeing, { d: domain })}
      </p>
    );
  }
  if (owner) {
    // A world of the fleet already there is a clash; a legacy world there is a move into the fleet.
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
  onChanged,
  room,
  cards,
  machines,
  rows,
  wallet,
  sessionHref,
  listens,
  engines,
  release,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The fleet changed: read it again. */
  readonly onChanged: () => void;
  readonly room: WorldsRoomMessages;
  readonly cards: readonly WorldCardInfo[];
  /** The machines to choose from: those whose door answers (machineChoices). */
  readonly machines: readonly string[];
  /** Every world the room knows, those being deleted included, to see whether a name or an address is taken. */
  readonly rows: readonly WorldRow[];
  /** The session's wallet: the one that must sign. */
  readonly wallet: string | null;
  readonly sessionHref: string;
  /** Whether a machine's door takes the room's beacons. */
  readonly listens: (alias: string) => boolean;
  /** The engines a machine runs, as its door says (machineEngines): the engine step offers those. */
  readonly engines: (alias: string) => readonly Engine[];
  /** The Numinia Engine's newest published build; null while there is none (its option stays off). */
  readonly release: EngineRelease | null;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OrderDraft>(() => emptyDraft(machines[0]));
  const [label, setLabel] = useState('');
  const [zone, setZone] = useState<string>(WORLD_ZONES[0]);
  const [dns, setDns] = useState<DnsState>('checking');
  const { step: flow, run, reset } = useFleetAction(wallet, listens);
  useOnProgress(flow, onChanged);

  const clear = (): void => {
    setStep(0);
    setDraft(emptyDraft(machines[0]));
    setLabel('');
    setZone(WORLD_ZONES[0]);
    reset();
  };

  // Nothing typed is ever thrown away: closing the wizard keeps the draft, and
  // only a world on its way (or Start again) empties it. A draft never touched
  // still takes the machine the room ended up loading.
  const pristine = draft.id.trim() === '' && label.trim() === '';
  useEffect(() => {
    if (!open || !pristine) return;
    setDraft((current) =>
      machines[0] === undefined || current.server === machines[0]
        ? current
        : { ...current, server: machines[0] },
    );
  }, [open, pristine, machines]);

  // Once the machine has taken the world, the draft has done its job.
  const handedOver = flow.at === 'accepted' || flow.at === 'done';
  const close = (): void => {
    if (handedOver) clear();
    else reset();
    onClose();
  };

  const domain = joinDomain(label, zone);
  const owner = addressOwner(domain, rows);
  const taken = nameOwner(draft.id, rows);

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
  // The engines the chosen machine runs, each with the build a new world of it gets.
  const offered = engines(draft.server);
  const engineImage = (engine: Engine): string | null =>
    engine === 'numinia-engine' ? (release?.image ?? null) : DEFAULT_IMAGE;
  const drafted = engineOf(draft.image.trim());
  const engineOffered = drafted === null || offered.includes(drafted);

  const canNext =
    (step === 0 && draft.id.trim() !== '' && taken === null) ||
    (step === 1 && draft.server.trim() !== '' && placeAllowed(domain, owner, dns)) ||
    (step === 2 && draft.image.trim() !== '' && engineOffered);

  const next = (): void => {
    if (step === 0 && label.trim() === '') setLabel(draft.id.trim().toLowerCase());
    setStep((current) => current + 1);
  };

  const create = (): void => {
    if (!('order' in result)) return;
    const order = result.order;
    void run({
      kind: 'CreateWorld',
      machine: order.server,
      world: order.id,
      domain: order.domain,
      image: order.image,
      memory: order.limits.memory,
      cpus: order.limits.cpus,
      maxUploadMb: order.limits.maxUploadMb,
    });
  };

  const order = 'order' in result ? result.order : null;
  const title = chosen?.title ?? order?.id ?? draft.id;
  const sending = busy(flow);

  return (
    <Modal open={open} label={room.wizard.title} onClose={close} dismissable={!sending}>
      <header className="cabeza-dialogo">
        <h2>{room.wizard.title}</h2>
        {!handedOver && (
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

      {handedOver && order ? (
        // The machine has the world: it is born on its own and the card shows it.
        // The dialog only hands over its own admin code, the one thing the card cannot show.
        <div className="resultado" data-created={order.id}>
          <h2>{fill(room.wizard.resultTitle, { t: title })}</h2>
          <p className="nota">
            {fill(room.wizard.resultNote, { m: order.server, d: order.domain })}
          </p>
          {(flow.at === 'accepted' || flow.at === 'done') && flow.code !== null && (
            <>
              <p className="etiqueta">{fill(room.code.shown, { t: title })}</p>
              <CodeBox code={flow.code} room={room} />
              <p className="nota">{fill(room.code.chat, { code: flow.code })}</p>
            </>
          )}
          <div className="pie">
            <button
              type="button"
              className="btn btn-primario"
              onClick={close}
              data-metric="worlds-done"
            >
              {room.wizard.done}
            </button>
          </div>
        </div>
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
                invalid={marked.has('id') || marked.has('card') || taken !== null}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, id: value, card: value }))
                }
              />
              {taken !== null && (
                <p className="linea-dns" data-tono={taken.leaving ? 'aviso' : 'mal'} role="alert">
                  {fill(taken.leaving ? room.wizard.nameFreeing : room.wizard.nameTaken, {
                    w: taken.id,
                  })}
                </p>
              )}
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
              <div className="campo">
                <span className="etiqueta">{room.wizard.engineLabel}</span>
                <div className="fichas" role="group" aria-label={room.wizard.engineLabel}>
                  {offered.map((engine) => {
                    const image = engineImage(engine);
                    return (
                      <button
                        key={engine}
                        type="button"
                        className="ficha-mundo ficha-motor"
                        aria-pressed={drafted === engine}
                        disabled={image === null}
                        onClick={() => {
                          if (image !== null) set('image')(image);
                        }}
                        data-engine={engine}
                        data-metric="worlds-wizard-engine"
                      >
                        <span>{ENGINE_NAMES[engine]}</span>
                        <span className="pista mono">
                          {image === null ? room.wizard.engineNoRelease : buildTag(image)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="pista">{fill(room.wizard.engineHint, { m: draft.server })}</span>
              </div>
              <Field
                id="mundo-motor"
                label={room.wizard.imageLabel}
                hint={room.wizard.imageHint}
                value={draft.image}
                invalid={marked.has('image') || !engineOffered}
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
              {order ? (
                <div className="confirmacion">
                  <Cover src={chosen?.cover ?? null} title={title} room={room} />
                  <div>
                    <p className="nota">{room.wizard.confirmIntro}</p>
                    <dl className="datos firma" data-request="CreateWorld">
                      <div>
                        <dt className="etiqueta">{room.fields.world}</dt>
                        <dd className="mono">{order.id}</dd>
                      </div>
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
                        <dd className="mono" title={order.image}>
                          {engineTag(order.image)}
                        </dd>
                      </div>
                      <div>
                        <dt className="etiqueta">{room.fields.limits}</dt>
                        <dd className="mono">
                          {`${order.limits.memory} · ${order.limits.cpus} CPU · ${order.limits.maxUploadMb} MB`}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="fallo" role="alert">
                  {fill(room.wizard.invalid, {
                    fields: problemFields('problems' in result ? result.problems : [])
                      .map((field) => room.fieldNames[field])
                      .join(', '),
                  })}
                </p>
              )}
              <StepLine step={flow} machine={draft.server} room={room} sessionHref={sessionHref} />
            </>
          )}
          <div className="pie">
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={close}
              data-metric="worlds-wizard-cancel"
            >
              {room.wizard.cancel}
            </button>
            {!pristine && !sending && (
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={clear}
                data-metric="worlds-wizard-restart"
              >
                {room.wizard.restart}
              </button>
            )}
            {step > 0 && !sending && (
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => {
                  reset();
                  setStep((current) => current - 1);
                }}
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
                disabled={order === null || sending}
                onClick={create}
                data-metric="worlds-wizard-create"
              >
                {room.wizard.create}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ActionDialog({
  change,
  onClose,
  onChanged,
  onDownloadFirst,
  room,
  wallet,
  sessionHref,
  warning,
  listens,
}: {
  readonly change: { readonly row: WorldRow; readonly action: WorldAction } | null;
  readonly onClose: () => void;
  /** The fleet changed: read it again. */
  readonly onChanged: () => void;
  /** From the delete warning: download a copy of this world first. */
  readonly onDownloadFirst: (row: WorldRow) => void;
  readonly room: WorldsRoomMessages;
  readonly wallet: string | null;
  readonly sessionHref: string;
  /** The machine is not obeying right now: said before signing; null when it obeys. */
  readonly warning: string | null;
  /** Whether a machine's door takes the room's beacons. */
  readonly listens: (alias: string) => boolean;
}) {
  const [typed, setTyped] = useState('');
  const { step, run, reset } = useFleetAction(wallet, listens);
  useOnProgress(step, onChanged);

  useEffect(() => {
    setTyped('');
    reset();
  }, [change, reset]);

  const row = change?.row ?? null;
  const action = change?.action ?? 'stop';
  const place = row ? rowPlace(row) : null;
  const machine = place?.server ?? '';
  const words = room.change;
  const titles: Readonly<Record<WorldAction, string>> = {
    stop: words.stopTitle,
    start: words.startTitle,
    delete: words.deleteTitle,
    download: words.downloadTitle,
    update: words.updateTitle,
  };
  const confirms: Readonly<Record<WorldAction, string>> = {
    stop: words.stopConfirm,
    start: words.startConfirm,
    delete: words.deleteConfirm,
    download: words.downloadConfirm,
    update: words.updateConfirm,
  };
  const title = row ? fill(titles[action], { t: row.title }) : '';
  // The build an update moves the world to: the newest of its engine, as the room read it.
  const target = row?.update ?? null;
  // A delete is confirmed by typing the world's whole address, as it is written.
  const confirmed =
    (action !== 'delete' || (place !== null && typed.trim().toLowerCase() === place.domain)) &&
    (action !== 'update' || target !== null);
  const sending = busy(step);

  const close = (): void => {
    reset();
    onClose();
  };

  // Once the machine has taken a stop, a start, an update or a delete, the
  // dialog has done its job: the machine does the rest and the card shows it.
  const closeNow = useRef(close);
  closeNow.current = close;
  useEffect(() => {
    if (step.at === 'accepted') closeNow.current();
  }, [step.at]);

  const submit = (): void => {
    if (!row || !place || !confirmed) return;
    const world = { machine: place.server, world: row.id };
    if (action === 'delete') void run({ kind: 'DeleteWorld', ...world, domain: place.domain });
    else if (action === 'stop') void run({ kind: 'StopWorld', ...world });
    else if (action === 'start') void run({ kind: 'StartWorld', ...world });
    else if (action === 'update' && target !== null) {
      void run({ kind: 'UpdateWorld', ...world, image: target });
    } else void run({ kind: 'DownloadWorld', ...world });
  };

  return (
    <Modal open={change !== null} label={title} onClose={close} dismissable={!sending}>
      <header className="cabeza-dialogo">
        <h2>{title}</h2>
        {/* Which world, unmistakably: its address and its machine. */}
        {place !== null && (
          <p className="nota mono donde" data-where>
            {place.domain} · {place.server}
          </p>
        )}
      </header>
      {step.at === 'done' && row && step.copy ? (
        // Only a download waits in the dialog: its zip is what the Oracle came for.
        <div className="resultado" data-done={action}>
          <p>
            {fill(room.copy.ready, {
              f: step.copy.status.filename ?? `${row.id}.zip`,
              s: step.copy.status.bytes === null ? '?' : formatBytes(step.copy.status.bytes),
            })}
          </p>
          {step.copy.status.sha256 !== null && (
            <p className="nota mono huella">
              {fill(room.copy.fingerprint, { h: step.copy.status.sha256 })}
            </p>
          )}
          {step.copy.status.expiresAt !== null && (
            <p className="nota">
              {fill(room.copy.expires, {
                when: new Date(step.copy.status.expiresAt).toLocaleString(),
              })}
            </p>
          )}
          <div className="pie">
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={close}
              data-metric="worlds-done"
            >
              {room.wizard.done}
            </button>
            <a
              className="btn btn-primario"
              href={copyFileUrl(machine, step.copy.id)}
              download={step.copy.status.filename ?? `${row.id}.zip`}
              data-metric="worlds-zip"
            >
              {room.copy.save}
            </a>
          </div>
        </div>
      ) : (
        <div className="contenido">
          {action === 'stop' && <p>{words.stopIntro}</p>}
          {action === 'start' && <p>{words.startIntro}</p>}
          {action === 'download' && <p>{words.downloadIntro}</p>}
          {action === 'update' && row?.order && target !== null && (
            <>
              <p data-update-to={target}>
                {fill(words.updateIntro, {
                  t: row.title,
                  from: buildTag(row.order.image),
                  to: buildTag(target),
                })}
              </p>
              {/* The build the wallet signs for, whole: the machine takes that one and no other. */}
              <p className="nota mono huella" data-update-image>
                {target}
              </p>
            </>
          )}
          {action === 'delete' && row && place && (
            <>
              <p className="aviso-peligro" role="note">
                <strong>{words.deleteWarning}</strong>
              </p>
              <ul className="pasos-cierre">
                {words.deleteSteps.map((line) => (
                  <li key={line}>{fill(line, { d: place.domain })}</li>
                ))}
              </ul>
              <p className="nota">
                {words.deleteCopyFirst}{' '}
                <button
                  type="button"
                  className="btn btn-fantasma"
                  disabled={sending}
                  onClick={() => onDownloadFirst(row)}
                  data-metric="worlds-download-first"
                >
                  {words.downloadFirst}
                </button>
              </p>
              {/* The label is a sentence in the page's own case, the address to type in mono. */}
              <label className="campo confirmar" htmlFor="mundo-confirmar">
                <span className="texto-confirmar">
                  {words.typeToConfirm} <span className="mono">{place.domain}</span>
                </span>
                <input
                  id="mundo-confirmar"
                  className="mono"
                  value={typed}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && confirmed && !sending) submit();
                  }}
                  data-metric="worlds-field"
                />
              </label>
            </>
          )}
          {warning !== null && step.at !== 'failed' && (
            <p className="aviso-maquina" data-tono="aviso" role="note">
              {warning}
            </p>
          )}
          <StepLine step={step} machine={machine} room={room} sessionHref={sessionHref} />
          <div className="pie">
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={close}
              data-metric="worlds-change-cancel"
            >
              {/* While a copy is being made the request is already taken: closing undoes nothing. */}
              {step.at === 'preparing' ? room.wizard.close : room.wizard.cancel}
            </button>
            <button
              type="button"
              className={action === 'delete' ? 'btn btn-destructivo' : 'btn btn-primario'}
              disabled={!confirmed || sending}
              onClick={submit}
              data-metric={`worlds-change-${action}`}
            >
              {confirms[action]}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function WorldCodeDialog({
  ask,
  onClose,
  onChanged,
  room,
  wallet,
  sessionHref,
  warning,
  listens,
}: {
  /** The world whose own code to show or change, and which; null keeps the dialog closed. */
  readonly ask: { readonly row: WorldRow; readonly mode: CodeMode } | null;
  readonly onClose: () => void;
  /** The fleet changed: read it again (after a code is changed: its world restarts). */
  readonly onChanged: () => void;
  readonly room: WorldsRoomMessages;
  readonly wallet: string | null;
  readonly sessionHref: string;
  /** Said before signing: the machine does not know these requests yet, or is not obeying. */
  readonly warning: string | null;
  /** Whether a machine's door takes the room's beacons. */
  readonly listens: (alias: string) => boolean;
}) {
  const { step, run, reset } = useFleetAction(wallet, listens);
  const mode = ask?.mode ?? 'show';
  useOnProgress(step, mode === 'rotate' ? onChanged : () => undefined);
  useEffect(() => {
    reset();
  }, [ask, reset]);

  const row = ask?.row ?? null;
  const place = row ? rowPlace(row) : null;
  const machine = place?.server ?? '';
  const t = row?.title ?? '';
  const words = room.code;
  // A stopped world takes a new code when it starts; a running one restarts now.
  const stopped = row?.order?.state === 'stopped';
  const kind = mode === 'show' ? 'ShowWorldCode' : 'RotateWorldCode';
  const title = fill(mode === 'show' ? words.showTitle : words.rotateTitle, { t });
  const sending = busy(step);
  const code = step.at === 'done' ? step.code : null;

  const close = (): void => {
    reset();
    onClose();
  };
  const submit = (): void => {
    if (!row || !place) return;
    void run({ kind, machine: place.server, world: row.id });
  };

  const intro =
    mode === 'show' ? words.showIntro : stopped ? words.rotateStopped : words.rotateIntro;
  return (
    <Modal open={ask !== null} label={title} onClose={close} dismissable={!sending}>
      <header className="cabeza-dialogo">
        <h2>{title}</h2>
        {/* Which world, unmistakably: its address and its machine. */}
        {place !== null && (
          <p className="nota mono donde" data-where>
            {place.domain} · {place.server}
          </p>
        )}
      </header>
      <div className="contenido" data-request={kind}>
        {code !== null ? (
          <>
            <p className="etiqueta">{fill(mode === 'show' ? words.shown : words.rotated, { t })}</p>
            <CodeBox code={code} room={room} />
            {mode === 'rotate' && (
              <p className="nota" data-applies={stopped ? 'on-start' : 'on-restart'}>
                {fill(stopped ? words.rotatedStopped : words.rotatedNote, { m: machine, t })}
              </p>
            )}
            <p className="nota">{fill(words.chat, { code })}</p>
          </>
        ) : (
          <>
            <p>{fill(intro, { t })}</p>
            {warning !== null && step.at !== 'failed' && (
              <p className="aviso-maquina" data-tono="aviso" role="note">
                {warning}
              </p>
            )}
            <StepLine step={step} machine={machine} room={room} sessionHref={sessionHref} />
          </>
        )}
        <div className="pie">
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={close}
            data-metric={code === null ? 'worlds-code-cancel' : 'worlds-done'}
          >
            {code === null ? room.wizard.cancel : room.wizard.done}
          </button>
          {code === null && (
            <button
              type="button"
              className="btn btn-primario"
              disabled={sending || place === null}
              onClick={submit}
              data-metric={`worlds-code-${mode}-sign`}
            >
              {mode === 'show' ? words.showConfirm : words.rotateConfirm}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
