/**
 * «Quién ha entrado» (cut «El censo», 2026-10-16): above the Census page's
 * one-wallet lookup of ranks, everyone who has signed in to numinia.com —
 * for the house alone. The section around it is hidden until the chrome
 * knows the session is an Oracle's (`data-session-ranks="oracle"`), and this
 * island asks for the list only then: anyone else never sends a request
 * (lib/census-list.ts). The server refuses them all the same.
 *
 * Each row: the person (the face and name they published, else a glyph and
 * the short wallet), the first and the last time (stored in UTC, shown in
 * the visitor's zone), how many organizations, and «Añadir a una
 * organización»: a dialog that picks one of the organizations the house can
 * enter (Saldo's overview, which lists them for the house) and adds the
 * person as a member with the very write the panel's «Añadir miembro» uses
 * (POST /api/saldo `set-member`). The till decides.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { CensusListMessages } from '../../../i18n/census-list';
import { fill, readOverview, readResult, type Citizen } from '../../../lib/accounts';
import {
  isHouseSession,
  loadCitizens,
  personLines,
  seenAt,
  teamsToJoin,
  type CitizensSheet,
} from '../../../lib/census-list';
import { pageSessionClient } from '../../../lib/island-session';
import { LunaEspera } from '../../chrome/LunaEspera';
import { PeopleGlyph } from '../../panel/PeopleGlyph';

type Sheet = { readonly at: 'waiting' } | { readonly at: 'loading' } | CitizensSheet;

type Teams =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | {
      readonly at: 'ready';
      readonly teams: readonly { readonly id: string; readonly name: string }[];
    };

/** Typing settles for this long before the list is asked again. */
const SEARCH_PAUSE_MS = 250;

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };

/** The organizations the house can enter: Saldo's overview lists them all for the house. */
async function readTeams(): Promise<Teams> {
  try {
    const response = await fetch('/api/saldo', { headers: { accept: 'application/json' } });
    const accounts = response.ok ? readOverview(await response.json()) : null;
    return accounts === null ? { at: 'failed' } : { at: 'ready', teams: teamsToJoin(accounts) };
  } catch {
    return { at: 'failed' };
  }
}

/** Adds the wallet to the organization as a member: true when the till did it. */
async function addMember(accountId: string, wallet: string): Promise<boolean> {
  try {
    const response = await fetch('/api/saldo', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ action: 'set-member', accountId, wallet, role: 'member' }),
    });
    const result = readResult(await response.json().catch(() => null));
    return response.ok && result !== null && result.ok;
  } catch {
    return false;
  }
}

function Face({ person }: { readonly person: Citizen }) {
  return person.face === null ? (
    <span className="censo-cara censo-glifo" aria-hidden="true">
      <PeopleGlyph name="user" size={16} />
    </span>
  ) : (
    <img className="censo-cara" src={person.face} alt="" width={32} height={32} loading="lazy" />
  );
}

export function CitizensList({
  locale,
  words,
}: {
  readonly locale: SupportedLocale;
  readonly words: CensusListMessages;
}) {
  const [house, setHouse] = useState(false);
  const [sheet, setSheet] = useState<Sheet>({ at: 'waiting' });
  const [query, setQuery] = useState('');
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState<Citizen | null>(null);
  const [teams, setTeams] = useState<Teams>({ at: 'loading' });
  const [chosen, setChosen] = useState('');
  const [saving, setSaving] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  // Only the newest read of the list may paint.
  const asked = useRef(0);

  // The house is the session's Oracle rank, as the chrome read it: nobody else is ever asked about.
  useEffect(() => {
    let live = true;
    let stop: (() => void) | null = null;
    const hear = (view: { readonly status: string; readonly rank?: string }): void => {
      if (live) setHouse(isHouseSession(view));
    };
    void pageSessionClient(window).then((client) => {
      if (!live) return;
      stop = client.subscribe(hear);
      void client.current().then(hear);
    });
    return () => {
      live = false;
      stop?.();
    };
  }, []);

  const read = useCallback(async (search: string): Promise<void> => {
    const mine = ++asked.current;
    setSheet({ at: 'loading' });
    const answered = await loadCitizens(fetch, search);
    if (mine === asked.current) setSheet(answered);
  }, []);

  useEffect(() => {
    if (!house) return undefined;
    const timer = setTimeout(() => void read(query), query === '' ? 0 : SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [house, query, read]);

  const readMore = async (): Promise<void> => {
    if (sheet.at !== 'ready' || sheet.next === null) return;
    setMore(true);
    const mine = ++asked.current;
    const answered = await loadCitizens(fetch, query, sheet.next);
    setMore(false);
    if (mine !== asked.current) return;
    if (answered.at === 'ready') {
      setSheet({ ...answered, people: [...sheet.people, ...answered.people] });
    } else {
      setStatus(words.failed);
    }
  };

  const copy = async (person: Citizen): Promise<void> => {
    try {
      await navigator.clipboard.writeText(person.wallet);
      setStatus(words.copied);
    } catch {
      setStatus(fill(words.copyFailed, { wallet: person.wallet }));
    }
  };

  const open = (person: Citizen, button: HTMLButtonElement): void => {
    opener.current = button;
    setAdding(person);
    setAddFailed(false);
    setStatus('');
    dialog.current?.showModal();
    if (teams.at !== 'ready') {
      setTeams({ at: 'loading' });
      void readTeams().then(setTeams);
    }
  };

  const close = (): void => {
    dialog.current?.close();
  };

  // The organization picked, or the first of the list until one is.
  const choice =
    teams.at === 'ready'
      ? (teams.teams.find((team) => team.id === chosen)?.id ?? teams.teams[0]?.id ?? '')
      : '';

  const save = async (): Promise<void> => {
    if (adding === null || choice === '') return;
    setSaving(true);
    setAddFailed(false);
    const done = await addMember(choice, adding.wallet);
    setSaving(false);
    if (!done) {
      setAddFailed(true);
      return;
    }
    const org =
      teams.at === 'ready'
        ? (teams.teams.find((team) => team.id === choice)?.name ?? choice)
        : choice;
    close();
    setStatus(fill(words.added, { who: personLines(adding).title, org }));
    // The list says it at once: the person is in one organization more.
    const wallet = adding.wallet;
    setSheet((now) =>
      now.at === 'ready'
        ? {
            ...now,
            people: now.people.map((person) =>
              person.wallet === wallet
                ? { ...person, organizations: person.organizations + 1 }
                : person,
            ),
          }
        : now,
    );
  };

  const who = adding === null ? '' : personLines(adding).title;

  return (
    <div className="censo-lista" data-citizens-list>
      <div className="censo-buscar">
        <label htmlFor="censo-buscar">{words.searchLabel}</label>
        <input
          id="censo-buscar"
          type="search"
          value={query}
          placeholder={words.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          data-metric="census-citizens-search"
        />
      </div>

      <p className="censo-estado" role="status" data-citizens-status>
        {status}
      </p>

      {(sheet.at === 'loading' || (sheet.at === 'waiting' && house)) && (
        <p className="estado">
          <LunaEspera /> {words.loading}
        </p>
      )}
      {sheet.at === 'not-bound' && <p className="estado aviso">{words.notBound}</p>}
      {(sheet.at === 'failed' || sheet.at === 'forbidden') && (
        <div className="estado aviso" role="alert">
          <p>{words.failed}</p>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void read(query)}
            data-metric="census-citizens-retry"
          >
            {words.retry}
          </button>
        </div>
      )}
      {sheet.at === 'ready' && sheet.people.length === 0 && (
        <p className="estado">{query.trim() === '' ? words.empty : words.noMatch}</p>
      )}
      {sheet.at === 'ready' && sheet.people.length > 0 && (
        <>
          <p className="censo-cuenta">
            {fill(words.count, { shown: String(sheet.people.length), total: String(sheet.total) })}
          </p>
          <div className="censo-tabla" role="region" aria-label={words.title} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">{words.columns.person}</th>
                  <th scope="col">{words.columns.first}</th>
                  <th scope="col">{words.columns.last}</th>
                  <th scope="col">{words.columns.organizations}</th>
                  <th scope="col">
                    <span className="sr-only">{words.columns.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sheet.people.map((person) => {
                  const lines = personLines(person);
                  return (
                    <tr key={person.wallet} data-citizen={person.wallet}>
                      <td>
                        <span className="censo-persona">
                          <Face person={person} />
                          <span className="censo-quien">
                            <span className={lines.sub === null ? 'mono' : 'censo-nombre'}>
                              {lines.title}
                            </span>
                            {lines.sub !== null && (
                              <span className="mono censo-sub">{lines.sub}</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td data-label={words.columns.first}>
                        <time dateTime={person.firstSeenAt}>
                          {seenAt(person.firstSeenAt, locale)}
                        </time>
                      </td>
                      <td data-label={words.columns.last}>
                        <time dateTime={person.lastSeenAt}>
                          {seenAt(person.lastSeenAt, locale)}
                        </time>
                      </td>
                      <td
                        className="censo-num"
                        data-label={words.columns.organizations}
                        data-citizen-orgs
                      >
                        {person.organizations}
                      </td>
                      <td className="censo-acciones">
                        <button
                          type="button"
                          className="btn btn-silencioso"
                          aria-label={fill(words.copyLabel, { who: lines.title })}
                          onClick={() => void copy(person)}
                          data-metric="census-citizen-copy"
                        >
                          {words.copy}
                        </button>
                        <button
                          type="button"
                          className="btn btn-fantasma"
                          aria-label={fill(words.addLabel, { who: lines.title })}
                          onClick={(event) => open(person, event.currentTarget)}
                          data-metric="census-citizen-add"
                        >
                          {words.add}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sheet.next !== null && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void readMore()}
              data-espera={more ? '' : undefined}
              disabled={more}
              data-metric="census-citizens-more"
            >
              {words.more}
            </button>
          )}
        </>
      )}

      <dialog
        ref={dialog}
        className="censo-dialogo tarjeta"
        aria-labelledby="censo-dialogo-titulo"
        onClose={() => {
          setAdding(null);
          opener.current?.focus();
        }}
      >
        <h3 id="censo-dialogo-titulo">{fill(words.dialogTitle, { who })}</h3>
        {teams.at === 'loading' && (
          <p className="estado">
            <LunaEspera /> {words.loading}
          </p>
        )}
        {teams.at === 'failed' && <p className="estado aviso">{words.failed}</p>}
        {teams.at === 'ready' && teams.teams.length === 0 && (
          <p className="estado">{words.noOrgs}</p>
        )}
        {teams.at === 'ready' && teams.teams.length > 0 && (
          <div className="censo-campo">
            <label htmlFor="censo-org">{words.orgLabel}</label>
            <select
              id="censo-org"
              value={choice}
              onChange={(event) => setChosen(event.target.value)}
              data-metric="census-citizen-add-org"
            >
              {teams.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {addFailed && (
          <p className="estado aviso" role="alert">
            {words.addFailed}
          </p>
        )}
        <div className="censo-botones">
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void save()}
            disabled={saving || choice === ''}
            data-espera={saving ? '' : undefined}
            data-metric="census-citizen-add-save"
          >
            {words.addSave}
          </button>
          <button
            type="button"
            className="btn btn-silencioso"
            onClick={close}
            data-metric="census-citizen-add-cancel"
          >
            {words.cancel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
