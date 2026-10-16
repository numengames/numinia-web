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
  type Engine,
  type EngineRelease,
  type WorldRow,
} from '../../../lib/worlds';
import { checkAddress } from '../../../lib/worlds-source';
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
import { AddressLine, Field, Modal, StepLine, type DnsState } from './WorldDialogs';
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
  const { step: flow, run, reset } = useFleetAction(wallet, listens);
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

  const read = reading?.ok ? reading.reading : null;
  // A zip goes to a machine that runs its engine, ordered with that engine's build.
  const engine: Engine = read?.engine ?? 'numinia-hyperfy2';
  const fits = importers.filter((candidate) => candidate.engines.includes(engine));
  const image = engine === 'numinia-engine' ? (release?.image ?? null) : DEFAULT_IMAGE;
  const importer = fits.find((candidate) => candidate.alias === machine) ?? fits[0];
  const alias = importer?.alias ?? '';
  const name = id.trim().toLowerCase();
  const domain = joinDomain(label ?? name, zone);
  const owner = addressOwner(domain, rows);
  const taken = nameOwner(name, rows);
  const result = draftToOrder({
    ...emptyDraft(alias),
    image: image ?? '',
    id: name,
    card: name,
    domain,
  });
  const order = 'order' in result ? result.order : null;
  const badName =
    name !== '' && 'problems' in result && problemFields(result.problems).includes('id');
  const tooBig = file !== null && importer !== undefined && file.size > importer.zipMaxBytes;
  const sending = busy(flow);
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
    if (step !== 0 || read === null || !inHouseZone(domain) || (owner && !owner.legacy)) return;
    let alive = true;
    setDns('checking');
    const timer = setTimeout(() => {
      void checkAddress(fetch, domain, alias).then((answer) => {
        if (alive) setDns(answer);
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [step, domain, alias, owner?.id, owner?.legacy, read === null]);

  const close = (): void => {
    reset();
    onClose();
  };

  // The machine took it: the dialog hands the zip to the room and closes.
  const handover = useRef(onHandover);
  handover.current = onHandover;
  const signed = useRef<{ order: typeof order; sha: string | null }>({ order: null, sha: null });
  useEffect(() => {
    if (flow.at !== 'accepted' || file === null) return;
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
  }, [flow, file]);

  const sign = (): void => {
    if (order === null || sha === null || file === null) return;
    signed.current = { order, sha };
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
    placeAllowed(domain, owner, dns) &&
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
            <p className="nota">
              {fill(read.engine === 'numinia-engine' ? words.engineKeysNote : words.keysNote, {
                m: alias,
              })}
            </p>
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
            {fits.length > 1 ? (
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
            <p className="nota">{fill(words.signNote, { m: order.server })}</p>
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
          {step > 0 && !sending && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => {
                reset();
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
              disabled={order === null || sha === null || sending}
              onClick={sign}
              data-metric="worlds-import-sign"
            >
              {words.sign}
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
