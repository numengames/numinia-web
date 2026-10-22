/**
 * "Traer un mundo": a world brought back from its zip, in one dialog of two
 * steps. Lugar: what the zip is — read here first (lib/zip-read.ts), so that
 * what its machine would refuse is said before anything is signed — the
 * world's name, its machine (those whose door takes zips and runs the zip's
 * engine) and its address; the engine is the zip's own — a Hyperfy world
 * with the fleet's Hyperfy, a Numinia Engine world with that engine's
 * newest build. Firmar: what the wallet signs, the zip's
 * exact size and its fingerprint included, the fingerprint made off the
 * page's thread (zip-hash.ts). At the machine's 202 the dialog closes and
 * hands the zip to the room, which uploads it from the world's card.
 */

import { useEffect, useRef, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import { formatCount, formatSize, type ImportTicket } from '../../../lib/fleet';
import {
  DEFAULT_IMAGE,
  WORLD_ZONES,
  addressOwner,
  draftToOrder,
  emptyDraft,
  engineTag,
  fill,
  inHouseZone,
  joinDomain,
  nameOwner,
  placeAllowed,
  problemFields,
  proposeName,
  replaceTargets,
  type Engine,
  type EngineRelease,
  type WorldLimits,
  type WorldRow,
} from '../../../lib/worlds';
import { askAddress } from '../../../lib/worlds-source';
import {
  ZIP_CAPS,
  inspectZip,
  shortHash,
  zipStem,
  type ZipInspection,
  type ZipProblem,
} from '../../../lib/zip-read';
import { LunaEspera } from '../../chrome/LunaEspera';
import { busy, useFleetAction } from './fleet-action';
import {
  AddressLine,
  DnsWriteLine,
  Field,
  Modal,
  StepLine,
  useDnsWrite,
  type DnsState,
} from './WorldDialogs';
import { pageLang } from './WorldViews';
import { hashZip } from './zip-hash';

/** What reached the room: one file, or a drop it cannot take. */
export type ImportSource =
  | { readonly kind: 'file'; readonly file: File }
  | { readonly kind: 'several'; readonly count: number }
  | { readonly kind: 'folder' };

/** A machine whose door brings worlds back from their zip, the biggest zip it takes, and the engines it runs. */
export interface Importer {
  readonly alias: string;
  readonly zipMaxBytes: number;
  readonly engines: readonly Engine[];
}

/** What the dialog hands the room at the machine's 202: the slot, the zip, the new world's code. */
export interface Handover {
  readonly ticket: ImportTicket;
  readonly file: File;
  readonly code: string | null;
}

const STEPS = ['stepPlace', 'stepSign'] as const;

/** How long the machine has to finish deleting the old world before the dialog says it is late. */
const DELETE_LATE_MS = 120_000;

/** The world a zip takes the place of, and everything the new one inherits from it. */
interface Aim {
  readonly id: string;
  readonly title: string;
  readonly server: string;
  readonly domain: string;
  readonly limits: WorldLimits;
}

/** Where a replacement is: the old world's delete to sign, the machine deleting it, the zip to sign. */
type Stage = 'delete' | 'deleting' | 'import';

/** What the system's picker offers: zips, by name and by both types systems give them. */
export const ZIP_ACCEPT = '.zip,application/zip,application/x-zip-compressed';

/** A refusal the room's own reading found, before anything is signed, in Pablo's words. */
export function zipProblemText(
  problem: ZipProblem,
  file: string,
  machine: string,
  room: WorldsRoomMessages,
  lang?: string,
): string {
  const words = room.import;
  const size = (bytes: number | null): string => (bytes === null ? '?' : formatSize(bytes, lang));
  switch (problem.rule) {
    case 'empty':
      return words.before.empty;
    case 'too-many-files':
      return fill(words.before.tooManyFiles, {
        n: problem.amount === null ? '?' : formatCount(problem.amount, lang),
        m: machine,
        max: formatCount(ZIP_CAPS.entriesMax, lang),
      });
    case 'file-too-big':
      return fill(words.before.fileTooBig, {
        f: problem.entry ?? '?',
        s: size(problem.amount),
        m: machine,
        max: size(ZIP_CAPS.fileMax),
      });
    case 'ratio':
      return fill(words.before.ratio, {
        r: problem.amount !== null && Number.isFinite(problem.amount) ? problem.amount : '∞',
      });
    case 'unpacked-too-big':
      return fill(words.before.unpackedTooBig, {
        s: size(problem.amount),
        m: machine,
        max: size(ZIP_CAPS.unpackedMax),
      });
    case 'unexpected':
      return fill(words.before.unexpected, { f: problem.entry ?? '?' });
    default:
      return fill(words.rules[problem.rule], { f: file, m: machine });
  }
}

/** The day a copy was made, short and in the reader's language: `12 oct`. */
function copyDay(iso: string, lang: string | undefined): string {
  return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

export function ImportDialog({
  source,
  importers,
  rows,
  room,
  wallet,
  sessionHref,
  listens,
  release,
  replaceId,
  onClose,
  onFile,
  onHandover,
}: {
  /** The zip (or the drop) to bring back; null keeps the dialog closed. */
  readonly source: ImportSource | null;
  /** The machines whose door takes zips (importMachines). */
  readonly importers: readonly Importer[];
  /** Every world the room knows, those being deleted included, to see whether a name or an address is taken. */
  readonly rows: readonly WorldRow[];
  readonly room: WorldsRoomMessages;
  readonly wallet: string | null;
  readonly sessionHref: string;
  readonly listens: (alias: string) => boolean;
  /** The Numinia Engine's newest published build: what one of its worlds comes back with. */
  readonly release: EngineRelease | null;
  /** The world whose card asked for this zip: it starts chosen as the world to take the place of. */
  readonly replaceId: string | null;
  readonly onClose: () => void;
  /** Another zip, picked from the dialog itself (a picker outside an open modal is inert). */
  readonly onFile: (file: File) => void;
  /** The machine took the request: the room uploads the zip from the world's card. */
  readonly onHandover: (handover: Handover) => void;
}) {
  const file = source?.kind === 'file' ? source.file : null;
  const picker = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<ZipInspection | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [hashed, setHashed] = useState(0);
  const [unreadable, setUnreadable] = useState(false);
  const [step, setStep] = useState(0);
  const [machine, setMachine] = useState(importers[0]?.alias ?? '');
  const [id, setId] = useState('');
  // The address follows the name until it is typed.
  const [label, setLabel] = useState<string | null>(null);
  const [zone, setZone] = useState<string>(WORLD_ZONES[0]);
  const [dns, setDns] = useState<DnsState>('checking');
  const [pick, setPick] = useState<string | null>(replaceId);
  const [stage, setStage] = useState<Stage>('delete');
  const [locked, setLocked] = useState<Aim | null>(null);
  const [late, setLate] = useState(false);
  const { step: flow, run, reset } = useFleetAction(wallet, listens);
  const { dnsStep, prepare, resetDns } = useDnsWrite();
  const lang = pageLang();
  const known = useRef({ rows, zone });
  known.current = { rows, zone };

  // Each zip is read anew: what it is, then — when the machine's rules pass — its fingerprint.
  useEffect(() => {
    setStep(0);
    setReading(null);
    setSha(null);
    setHashed(0);
    setUnreadable(false);
    setLabel(null);
    setStage('delete');
    setLocked(null);
    setLate(false);
    reset();
    if (file === null) return;
    let alive = true;
    let stopHashing: () => void = () => undefined;
    void inspectZip(file).then((inspection) => {
      if (!alive) return;
      setReading(inspection);
      if (!inspection.ok) return;
      setId(
        proposeName(
          inspection.reading.world ?? zipStem(file.name),
          known.current.rows,
          known.current.zone,
        ),
      );
      const job = hashZip(file, (share) => {
        if (alive) setHashed(share);
      });
      stopHashing = job.stop;
      void job.result.then((digest) => {
        if (!alive) return;
        if (digest === null) setUnreadable(true);
        else setSha(digest);
      });
    });
    return () => {
      alive = false;
      stopHashing();
    };
  }, [file, reset]);

  // The card that asked for the zip chooses the world to replace; another zip keeps the choice.
  useEffect(() => setPick(replaceId), [replaceId, source]);

  const read = reading?.ok ? reading.reading : null;
  // A zip goes to a machine that runs its engine, ordered with that engine's build.
  const engine: Engine = read?.engine ?? 'numinia-hyperfy2';
  const fits = importers.filter((candidate) => candidate.engines.includes(engine));
  const image = engine === 'numinia-engine' ? (release?.image ?? null) : DEFAULT_IMAGE;
  // A world to take the place of: it keeps its name, its machine, its address and its limits.
  const targets = read === null ? [] : replaceTargets(rows, importers, engine);
  const chosen = targets.find((row) => row.id === pick)?.order ?? null;
  const aim: Aim | null =
    locked ??
    (chosen === null
      ? null
      : {
          id: chosen.id,
          title: targets.find((row) => row.id === chosen.id)?.title ?? chosen.id,
          server: chosen.server,
          domain: chosen.domain,
          limits: chosen.limits,
        });
  const importer =
    aim === null
      ? (fits.find((candidate) => candidate.alias === machine) ?? fits[0])
      : fits.find((candidate) => candidate.alias === aim.server);
  const alias = importer?.alias ?? '';
  const name = aim === null ? id.trim().toLowerCase() : aim.id;
  const domain = aim === null ? joinDomain(label ?? name, zone) : aim.domain;
  const owner = aim === null ? addressOwner(domain, rows) : null;
  const taken = aim === null ? nameOwner(name, rows) : null;
  const result = draftToOrder({
    ...emptyDraft(alias),
    image: image ?? '',
    id: name,
    card: name,
    domain,
    ...(aim === null
      ? {}
      : {
          memory: aim.limits.memory,
          cpus: aim.limits.cpus,
          maxUploadMb: String(aim.limits.maxUploadMb),
        }),
  });
  const order = 'order' in result ? result.order : null;
  const badName =
    name !== '' && 'problems' in result && problemFields(result.problems).includes('id');
  const tooBig = file !== null && importer !== undefined && file.size > importer.zipMaxBytes;
  const sending = busy(flow) || dnsStep.at === 'writing';
  const words = room.import;
  // A zip the room read but cannot order: no build of its engine yet, or no machine that runs it.
  const unplaceable =
    read === null
      ? null
      : image === null
        ? words.engineNoRelease
        : fits.length === 0
          ? engine === 'numinia-engine'
            ? words.noEngineMachine
            : words.noMachine
          : null;

  // Where the address points, asked of public DNS a moment after the last keystroke.
  useEffect(() => {
    if (aim !== null || step !== 0 || read === null || !inHouseZone(domain)) return;
    if (owner && !owner.legacy) return;
    let alive = true;
    setDns('checking');
    const timer = setTimeout(() => {
      void askAddress(fetch, domain, alias).then((answer) => {
        if (alive) setDns(answer);
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [step, domain, alias, owner?.id, owner?.legacy, read === null, aim === null]);

  const close = (): void => {
    reset();
    resetDns();
    onClose();
  };

  // The machine took it: the dialog hands the zip to the room and closes.
  const handover = useRef(onHandover);
  handover.current = onHandover;
  const signed = useRef<{ order: typeof order; sha: string | null }>({ order: null, sha: null });
  useEffect(() => {
    if (flow.at !== 'accepted' || file === null) return;
    // The old world's delete was taken: the machine now deletes it, and the zip waits.
    if (locked !== null && stage === 'delete') {
      setStage('deleting');
      reset();
      return;
    }
    if (locked !== null && stage !== 'import') return;
    const { order: taken, sha: digest } = signed.current;
    if (taken === null || digest === null) return;
    handover.current({
      ticket: {
        machine: taken.server,
        world: taken.id,
        domain: taken.domain,
        nonce: flow.request,
        bytes: file.size,
        sha256: digest,
        name: file.name,
      },
      file,
      code: flow.code,
    });
  }, [flow, file, locked, stage, reset]);

  // The old world is gone when the room no longer sees it: now the zip can be signed.
  useEffect(() => {
    if (stage !== 'deleting' || locked === null) return;
    if (!rows.some((row) => row.id === locked.id)) setStage('import');
  }, [stage, locked, rows]);
  useEffect(() => {
    if (stage !== 'deleting') return;
    const timer = setTimeout(() => setLate(true), DELETE_LATE_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  const sign = async (): Promise<void> => {
    if (order === null || file === null) return;
    // A replacement signs twice: the old world's delete first, then the zip.
    if (aim !== null && stage === 'delete') {
      setLocked(aim);
      void run({ kind: 'DeleteWorld', machine: aim.server, world: aim.id, domain: aim.domain });
      return;
    }
    if (sha === null) return;
    signed.current = { order, sha };
    // The address first: a world whose record the room writes gets it before the wallet signs.
    if (!(await prepare(dns, order.domain, order.server))) return;
    void run({
      kind: 'ImportWorld',
      machine: order.server,
      world: order.id,
      domain: order.domain,
      image: order.image,
      memory: order.limits.memory,
      cpus: order.limits.cpus,
      maxUploadMb: order.limits.maxUploadMb,
      zipBytes: file.size,
      zipSha256: sha,
    });
  };

  const canNext =
    read !== null &&
    unplaceable === null &&
    order !== null &&
    taken === null &&
    !tooBig &&
    (aim !== null || placeAllowed(domain, owner, dns)) &&
    alias !== '';

  // What the zip is, in one line, once the room has read it.
  const zipLine =
    file === null || read === null
      ? null
      : read.engine === 'numinia-engine'
        ? fill(words.engineWorld, {
            v: (read.schema ?? '').replace('numinia-engine/', ''),
            n: formatCount(read.files, lang),
            s: formatSize(file.size, lang),
          })
        : read.world !== null
          ? fill(read.copiedAt === null ? words.copyOfUndated : words.copyOf, {
              w: read.world,
              d: read.copiedAt === null ? '' : copyDay(read.copiedAt, lang),
              s: formatSize(file.size, lang),
            })
          : fill(words.folder, {
              n: formatCount(Math.max(0, read.files - 1), lang),
              s: formatSize(file.size, lang),
            });

  // A refusal before anything is signed: the drop itself, or the room's reading of the zip.
  const refusal =
    source?.kind === 'several'
      ? fill(words.before.several, { n: source.count })
      : source?.kind === 'folder'
        ? words.before.folder
        : reading !== null && !reading.ok && file !== null
          ? zipProblemText(reading.problem, file.name, alias, room, lang)
          : unreadable
            ? words.unreadable
            : null;
  const pickAgain = refusal !== null || flow.at === 'failed';

  return (
    <Modal open={source !== null} label={words.title} onClose={close} dismissable={!sending}>
      <header className="cabeza-dialogo">
        <h2>{words.title}</h2>
        <ol className="pasos">
          {STEPS.map((key, index) => (
            <li
              key={key}
              aria-current={index === step ? 'step' : undefined}
              data-done={index < step}
            >
              {words[key]}
            </li>
          ))}
        </ol>
      </header>
      <div className="contenido" data-import={step === 0 ? 'place' : 'sign'}>
        {file !== null && reading === null && (
          <p className="estado" aria-live="polite" data-reading>
            <LunaEspera /> {words.reading}
          </p>
        )}
        {zipLine !== null && (
          <p className="linea-zip" data-zip>
            <span className="mono">{file?.name}</span> · {zipLine}
          </p>
        )}
        {refusal !== null && (
          <p
            className="fallo"
            role="alert"
            data-refused={
              reading !== null && !reading.ok ? reading.problem.rule : (source?.kind ?? 'file')
            }
          >
            {refusal}
          </p>
        )}
        {read !== null && file !== null && step === 0 && (
          <>
            {read.engineBytes > 0 && (
              <p className="nota" data-engine-image>
                {fill(words.engineImage, { s: formatSize(read.engineBytes, lang) })}
              </p>
            )}
            {unplaceable !== null && (
              <p className="fallo" role="alert" data-refused="engine">
                {unplaceable}
              </p>
            )}
            {targets.length > 0 && (
              <label className="campo" htmlFor="importar-reemplazo">
                <span className="etiqueta">{words.replaceLabel}</span>
                <select
                  id="importar-reemplazo"
                  value={aim?.id ?? ''}
                  onChange={(event) =>
                    setPick(event.target.value === '' ? null : event.target.value)
                  }
                  data-metric="worlds-field"
                >
                  <option value="">{words.replaceNew}</option>
                  {targets.map((row) => (
                    <option key={row.id} value={row.id}>
                      {fill(words.replaceOption, {
                        t: row.title,
                        d: row.order?.domain ?? row.id,
                      })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {aim !== null && (
              <>
                <p className="linea-dns" data-tono="aviso" role="alert" data-replace-warning>
                  {fill(words.replaceWarning, { t: aim.title, d: aim.domain })}
                </p>
                <p className="nota">{words.replaceKeep}</p>
              </>
            )}
            {aim === null && (
              <p className="nota">
                {fill(read.engine === 'numinia-engine' ? words.engineKeysNote : words.keysNote, {
                  m: alias,
                })}
              </p>
            )}
            {aim === null && (
              <>
                <Field
                  id="importar-nombre"
                  label={room.wizard.idLabel}
                  value={id}
                  invalid={badName || taken !== null}
                  onChange={setId}
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
            {fits.length > 1 && aim === null ? (
              <label className="campo" htmlFor="importar-maquina">
                <span className="etiqueta">{words.machineLabel}</span>
                <select
                  id="importar-maquina"
                  value={alias}
                  onChange={(event) => setMachine(event.target.value)}
                  data-metric="worlds-field"
                >
                  {fits.map((candidate) => (
                    <option key={candidate.alias} value={candidate.alias}>
                      {candidate.alias}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="campo">
                <span className="etiqueta">{words.machineLabel}</span>
                <span className="mono" data-machine-choice>
                  {alias}
                </span>
              </div>
            )}
            {tooBig && importer !== undefined && (
              <p className="fallo" role="alert" data-refused="zip-too-big">
                {fill(words.rules['zip-too-big'], {
                  s: formatSize(file.size, lang),
                  m: alias,
                  max: formatSize(importer.zipMaxBytes, lang),
                })}
              </p>
            )}
            {aim !== null ? (
              <div className="campo">
                <span className="etiqueta">{room.wizard.domainLabel}</span>
                <span className="mono" data-address-choice>
                  {aim.domain}
                </span>
              </div>
            ) : (
              <div className="campo">
                <label className="etiqueta" htmlFor="importar-dominio">
                  {room.wizard.domainLabel}
                </label>
                <div className="direccion-campo">
                  <input
                    id="importar-dominio"
                    className="mono"
                    value={label ?? name}
                    aria-invalid={domain !== '' && !inHouseZone(domain)}
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
                <AddressLine domain={domain} machine={alias} owner={owner} dns={dns} room={room} />
              </div>
            )}
            <div className="campo">
              <span className="etiqueta">{room.fields.build}</span>
              <span className="mono" title={image ?? undefined} data-engine={engine}>
                {image === null
                  ? words.engineNoRelease
                  : fill(words.engineNote, { b: engineTag(image) })}
              </span>
            </div>
          </>
        )}
        {read !== null && file !== null && step === 1 && order !== null && (
          <>
            <dl className="datos firma" data-request="ImportWorld">
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
            <p className="nota mono" data-zip-bytes={file.size}>
              {fill(words.zipLine, {
                f: file.name,
                s: formatSize(file.size, lang),
                b: formatCount(file.size, lang),
              })}
            </p>
            {sha !== null ? (
              <p className="nota mono huella" title={sha} data-sha256={sha}>
                {fill(words.fingerprint, { h: shortHash(sha) })}
              </p>
            ) : (
              !unreadable && (
                <p className="estado" aria-live="polite" data-hashing>
                  <LunaEspera /> {fill(words.hashing, { p: Math.floor(hashed * 100) })}
                </p>
              )
            )}
            {aim !== null && stage === 'deleting' && (
              <p className="estado" aria-live="polite" data-replace-deleting>
                <LunaEspera />{' '}
                {fill(late ? words.replaceLate : words.replaceDeleting, { m: alias, w: aim.id })}
              </p>
            )}
            {aim !== null && stage === 'import' && (
              <p className="linea-dns" data-tono="aviso" data-replace-deleted>
                {fill(words.replaceDeleted, { w: aim.id })}
              </p>
            )}
            <p className="nota">
              {aim === null
                ? fill(words.signNote, { m: order.server })
                : fill(words.replaceSignNote, { m: order.server, w: aim.id })}
            </p>
            <DnsWriteLine step={dnsStep} domain={order.domain} machine={order.server} room={room} />
            <StepLine
              step={flow}
              machine={order.server}
              room={room}
              sessionHref={sessionHref}
              values={{
                f: file.name,
                s: formatSize(file.size, lang),
                max: importer === undefined ? '?' : formatSize(importer.zipMaxBytes, lang),
              }}
            />
          </>
        )}
        <div className="pie">
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={close}
            data-metric="worlds-import-cancel"
          >
            {room.wizard.cancel}
          </button>
          {pickAgain && !sending && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => picker.current?.click()}
              data-metric="worlds-import-pick"
            >
              {words.pickAnother}
            </button>
          )}
          {step > 0 && !sending && stage === 'delete' && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => {
                reset();
                setLocked(null);
                setStep(0);
              }}
              data-metric="worlds-import-back"
            >
              {room.wizard.back}
            </button>
          )}
          {read !== null && step === 0 && (
            <button
              type="button"
              className="btn btn-primario"
              disabled={!canNext}
              onClick={() => setStep(1)}
              data-metric="worlds-import-next"
            >
              {room.wizard.next}
            </button>
          )}
          {read !== null && step === 1 && (
            <button
              type="button"
              className="btn btn-primario"
              disabled={
                order === null ||
                sending ||
                stage === 'deleting' ||
                (sha === null && (aim === null || stage === 'import'))
              }
              onClick={() => void sign()}
              data-metric="worlds-import-sign"
            >
              {aim === null
                ? words.sign
                : stage === 'delete'
                  ? words.replaceSign
                  : words.replaceSignImport}
            </button>
          )}
        </div>
        <input
          ref={picker}
          type="file"
          accept={ZIP_ACCEPT}
          hidden
          onChange={(event) => {
            const chosen = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (chosen) onFile(chosen);
          }}
          data-metric="worlds-import-file"
        />
      </div>
    </Modal>
  );
}
