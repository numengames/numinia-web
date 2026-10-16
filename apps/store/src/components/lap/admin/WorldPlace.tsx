/**
 * «Asignar a una organización» (cut 4): the house puts a world — or, from the
 * rows it chose, several at once — in exactly one organization. The dialog
 * reads the organizations the way the Census list's dialog does (one source,
 * org-teams.ts) and asks the house's endpoint to place them (lib/mundos.ts).
 * The server decides: only an Oracle's session places a world, and the
 * organization that pays for a world is the one that administers it.
 */

import { useEffect, useState } from 'react';
import type { PlacementMessages } from '../../../i18n/mundos';
import { fill } from '../../../lib/accounts';
import { counted, placeWorlds } from '../../../lib/mundos';
import { LunaEspera } from '../../chrome/LunaEspera';
import { readTeams, type Teams } from './org-teams';
import { Modal } from './WorldDialogs';

/** The worlds to place: their ids, and what to call them in the dialog. */
export interface PlaceAsk {
  readonly worlds: readonly { readonly id: string; readonly title: string }[];
}

export function PlaceDialog({
  ask,
  words,
  onClose,
  onPlaced,
}: {
  /** The worlds to place; null keeps the dialog closed. */
  readonly ask: PlaceAsk | null;
  readonly words: PlacementMessages;
  readonly onClose: () => void;
  /** Placed: the room reads the placements again and says what happened. */
  readonly onPlaced: (message: string) => void;
}) {
  const [teams, setTeams] = useState<Teams>({ at: 'loading' });
  const [chosen, setChosen] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Each opening reads the organizations again: one may have been created since.
  useEffect(() => {
    if (ask === null) return undefined;
    let live = true;
    setTeams({ at: 'loading' });
    setProblem(null);
    void readTeams().then((read) => {
      if (live) setTeams(read);
    });
    return () => {
      live = false;
    };
  }, [ask]);

  const list = teams.at === 'ready' ? teams.teams : [];
  // The organization picked, or the first of the list until one is.
  const choice = list.find((team) => team.id === chosen)?.id ?? list[0]?.id ?? '';
  const count = ask?.worlds.length ?? 0;
  const title =
    count === 1
      ? fill(words.titleOne, { w: ask?.worlds[0]?.title ?? '' })
      : fill(words.titleMany, { n: count });

  const save = async (): Promise<void> => {
    if (ask === null || choice === '') return;
    setSaving(true);
    setProblem(null);
    const result = await placeWorlds(
      fetch,
      ask.worlds.map((world) => world.id),
      choice,
    );
    setSaving(false);
    if (!result.ok) {
      setProblem(
        result.why === 'forbidden'
          ? words.forbidden
          : result.why === 'unknown-org'
            ? words.unknownOrg
            : words.failed,
      );
      return;
    }
    const org = list.find((team) => team.id === choice)?.name ?? choice;
    onPlaced(fill(counted(words.placed, result.placed), { n: result.placed, org }));
  };

  return (
    <Modal open={ask !== null} label={title} onClose={onClose} dismissable={!saving}>
      <header className="cabeza-dialogo">
        <h2>{title}</h2>
      </header>
      <div className="contenido" data-request="PlaceWorlds">
        {teams.at === 'loading' && (
          <p className="estado">
            <LunaEspera /> {words.loading}
          </p>
        )}
        {teams.at === 'failed' && (
          <p className="estado fallo" role="alert">
            {words.failed}
          </p>
        )}
        {teams.at === 'ready' && list.length === 0 && <p className="estado">{words.noOrgs}</p>}
        {list.length > 0 && (
          <div className="campo">
            <label htmlFor="mundos-org">{words.orgLabel}</label>
            <select
              id="mundos-org"
              value={choice}
              onChange={(event) => setChosen(event.target.value)}
              data-metric="worlds-assign-org"
            >
              {list.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <p className="nota">{words.moves}</p>
        {problem !== null && (
          <p className="estado fallo" role="alert" data-place-problem>
            {problem}
          </p>
        )}
        <div className="pie">
          <button
            type="button"
            className="btn btn-silencioso"
            onClick={onClose}
            disabled={saving}
            data-metric="worlds-assign-cancel"
          >
            {words.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void save()}
            disabled={saving || choice === ''}
            data-espera={saving ? '' : undefined}
            data-metric="worlds-assign-save"
          >
            {words.save}
          </button>
        </div>
      </div>
    </Modal>
  );
}
