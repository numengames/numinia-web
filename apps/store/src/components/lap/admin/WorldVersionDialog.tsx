/**
 * The dialogs of a world's versions: publish one (the world goes off a few
 * seconds and comes back by itself), delete the one that waits, duplicate the
 * published one. Each is one request the Oracle's wallet signs. Once the
 * machine takes it the dialog has done its job: the room follows the request
 * (WorldsPanel) and the card shows the rest. A download of a version is not
 * here: it waits for its zip in ActionDialog, as a world's does.
 */

import { useEffect, useRef } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import { fill, publishedVersion, rowPlace, versionNo, type WorldRow } from '../../../lib/worlds';
import { busy, useFleetAction } from './fleet-action';
import { Modal, StepLine, useOnProgress } from './WorldDialogs';
import type { FollowedKind, VersionJob } from './WorldVersions';

/** The version a dialog is about, and what to do with it (a download is ActionDialog's). */
export interface VersionAsk {
  readonly row: WorldRow;
  readonly action: 'publish' | 'delete' | 'duplicate';
  /** The version asked about: the one to publish or delete, the published one to duplicate. */
  readonly version: string;
}

const KINDS: Readonly<Record<VersionAsk['action'], Exclude<FollowedKind, 'ImportVersion'>>> = {
  publish: 'PublishVersion',
  delete: 'DeleteVersion',
  duplicate: 'DuplicateVersion',
};

export function VersionDialog({
  ask,
  onClose,
  onChanged,
  onAccepted,
  onDownloadFirst,
  room,
  wallet,
  sessionHref,
  warning,
  listens,
}: {
  /** The version and what to do with it; null keeps the dialog closed. */
  readonly ask: VersionAsk | null;
  readonly onClose: () => void;
  /** The fleet may have changed: read it again. */
  readonly onChanged: () => void;
  /** The machine took the request: the room follows it from here. */
  readonly onAccepted: (job: VersionJob) => void;
  /** From the delete warning: download that version first. */
  readonly onDownloadFirst: (row: WorldRow, version: string) => void;
  readonly room: WorldsRoomMessages;
  readonly wallet: string | null;
  readonly sessionHref: string;
  /** The machine is not obeying right now: said before signing; null when it obeys. */
  readonly warning: string | null;
  /** Whether a machine's door takes the room's beacons. */
  readonly listens: (alias: string) => boolean;
}) {
  const { step, run, reset } = useFleetAction(wallet, listens);
  useOnProgress(step, onChanged);
  useEffect(() => {
    reset();
  }, [ask, reset]);

  const row = ask?.row ?? null;
  const action = ask?.action ?? 'publish';
  const version = ask?.version ?? '';
  const place = row ? rowPlace(row) : null;
  const machine = place?.server ?? '';
  const words = room.versions.dialog;
  const n = version === '' ? 0 : versionNo(version);
  const publishedNow = row ? publishedVersion(row) : undefined;
  const stopped = row?.order?.state === 'stopped';
  const sending = busy(step);
  const title =
    action === 'publish'
      ? fill(words.publishTitle, { n })
      : action === 'delete'
        ? fill(words.deleteTitle, { n })
        : words.duplicateTitle;
  const confirm =
    action === 'publish'
      ? words.publishConfirm
      : action === 'delete'
        ? words.deleteConfirm
        : words.duplicateConfirm;

  const close = (): void => {
    reset();
    onClose();
  };

  // Once the machine has taken it the dialog is done: hand the request to the room and close.
  const handed = useRef<string | null>(null);
  const latest = useRef({ close, onAccepted, ask });
  latest.current = { close, onAccepted, ask };
  useEffect(() => {
    if (step.at !== 'accepted') return;
    const current = latest.current;
    if (current.ask !== null && handed.current !== step.request) {
      handed.current = step.request;
      current.onAccepted({
        machine: rowPlace(current.ask.row)?.server ?? '',
        world: current.ask.row.id,
        kind: KINDS[current.ask.action],
        version: current.ask.version,
        request: step.request,
      });
    }
    current.close();
  }, [step]);

  const submit = (): void => {
    if (!row || !place || version === '') return;
    void run({ kind: KINDS[action], machine: place.server, world: row.id, version });
  };

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
      <div className="contenido" data-request={KINDS[action]}>
        {action === 'publish' && (
          <>
            <p>{words.publishIntro}</p>
            {publishedNow !== undefined && (
              <p data-publish-keep>{fill(words.publishKeep, { p: versionNo(publishedNow.id) })}</p>
            )}
            {stopped && <p data-publish-stopped>{words.publishStopped}</p>}
          </>
        )}
        {action === 'delete' && row && (
          <>
            <p className="aviso-peligro" role="note">
              <strong>{words.deleteIntro}</strong>
            </p>
            <p className="nota">
              {words.deleteCopyFirst}{' '}
              <button
                type="button"
                className="btn btn-fantasma"
                disabled={sending}
                onClick={() => onDownloadFirst(row, version)}
                data-metric="worlds-version-download-first"
              >
                {fill(words.downloadFirst, { n })}
              </button>
            </p>
          </>
        )}
        {action === 'duplicate' && <p>{words.duplicateIntro}</p>}
        {warning !== null && step.at !== 'failed' && (
          <p className="aviso-maquina" data-tono="aviso" role="note">
            {warning}
          </p>
        )}
        <StepLine
          step={step}
          machine={machine}
          room={room}
          sessionHref={sessionHref}
          kind={KINDS[action]}
        />
        <div className="pie">
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={close}
            data-metric="worlds-version-cancel"
          >
            {room.wizard.cancel}
          </button>
          <button
            type="button"
            className={action === 'delete' ? 'btn btn-destructivo' : 'btn btn-primario'}
            disabled={sending || place === null}
            onClick={submit}
            data-metric={`worlds-version-${action}-sign`}
          >
            {confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
