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
import { accountOf } from '../../../lib/org-choices';
import { LunaEspera } from '../../chrome/LunaEspera';
import { OrgOptions } from './OrgOptions';
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

  const list = teams.at === 'ready' ? teams.choices : [];
  // The organization picked, or the first of the list until one is.
  const choice = list.find((team) => team.key === chosen) ?? list[0] ?? null;
  const count = ask?.worlds.length ?? 0;
  const title =
    count === 1
      ? fill(words.titleOne, { w: ask?.worlds[0]?.title ?? '' })
      : fill(words.titleMany, { n: count });

  const save = async (): Promise<void> => {
    if (ask === null || choice === null) return;
    setSaving(true);
    setProblem(null);
    // A community the house has not used yet gets its account now, then the worlds go there.
    const account = await accountOf(fetch, choice);
    const result = account.ok
      ? await placeWorlds(
          fetch,
          ask.worlds.map((world) => world.id),
          account.accountId,
        )
      : account;
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
    onPlaced(fill(counted(words.placed, result.placed), { n: result.placed, org: choice.label }));
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
              value={choice?.key ?? ''}
              onChange={(event) => setChosen(event.target.value)}
              data-metric="worlds-assign-org"
            >
              <OrgOptions list={list} words={words} />
            </select>
          </div>
        )}
        {choice !== null && choice.community !== null && choice.accountId === null && (
          <p className="nota" data-opens-home>
            {words.opensHome}
          </p>
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
            disabled={saving || choice === null}
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
