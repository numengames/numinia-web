/**
 * Card t_a856c570 (2026-10-18): the house renames an existing world (or
 * server) from its card — not only at creation. Modeled on WorldPlace.tsx's
 * dialog: a plain fetch to lib/mundos.ts's `renameWorld`, the server alone
 * deciding (an Oracle's session, 403 otherwise).
 */

import { useEffect, useState } from 'react';
import type { WorldsRoomMessages } from '../../../i18n/worlds';
import { fill } from '../../../lib/accounts';
import { renameWorld } from '../../../lib/mundos';
import { Modal } from './WorldDialogs';

/** The world to rename; null keeps the dialog closed. */
export interface RenameAsk {
  readonly id: string;
  readonly title: string;
}

export function WorldRenameDialog({
  ask,
  room,
  onClose,
  onRenamed,
}: {
  readonly ask: RenameAsk | null;
  readonly room: WorldsRoomMessages;
  readonly onClose: () => void;
  /** Saved: the room reads the names again and says what happened. */
  readonly onRenamed: (message: string) => void;
}) {
  const words = room.rename;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Each opening starts from the world's current title.
  useEffect(() => {
    setName(ask?.title ?? '');
    setProblem(null);
  }, [ask]);

  const title = fill(words.title, { t: ask?.title ?? '' });
  const clean = name.trim();
  const unchanged = ask !== null && clean === ask.title;

  const save = async (): Promise<void> => {
    if (ask === null || clean.length === 0) return;
    setSaving(true);
    setProblem(null);
    const result = await renameWorld(fetch, ask.id, clean);
    setSaving(false);
    if (!result.ok) {
      setProblem(result.why === 'forbidden' ? words.forbidden : words.failed);
      return;
    }
    onRenamed(words.saved);
  };

  return (
    <Modal open={ask !== null} label={title} onClose={onClose} dismissable={!saving}>
      <header className="cabeza-dialogo">
        <h2>{title}</h2>
      </header>
      <div className="contenido" data-request="RenameWorld">
        <div className="campo">
          <label htmlFor="mundos-rename">{words.fieldLabel}</label>
          <input
            id="mundos-rename"
            type="text"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
            data-metric="worlds-rename-name"
          />
        </div>
        {problem !== null && (
          <p className="estado fallo" role="alert" data-rename-problem>
            {problem}
          </p>
        )}
        <div className="pie">
          <button
            type="button"
            className="btn btn-silencioso"
            onClick={onClose}
            disabled={saving}
            data-metric="worlds-rename-cancel"
          >
            {words.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void save()}
            disabled={saving || clean.length === 0 || unchanged}
            data-espera={saving ? '' : undefined}
            data-metric="worlds-rename-save"
          >
            {words.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
