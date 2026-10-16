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
import type { SaldoMessages } from '../../../i18n/saldo';
import { fill, readResult, type Citizen } from '../../../lib/accounts';
import {
  isHouseSession,
  loadCitizens,
  personLines,
  refusalWords,
  seenAt,
  type CitizensSheet,
} from '../../../lib/census-list';
import { pageSessionClient } from '../../../lib/island-session';
import { LunaEspera } from '../../chrome/LunaEspera';
import { PeopleGlyph } from '../../panel/PeopleGlyph';
import { accountOf, choicesToJoin } from '../../../lib/org-choices';
import { OrgOptions } from './OrgOptions';
import { readTeams, type Teams } from './org-teams';

type Sheet = { readonly at: 'waiting' } | { readonly at: 'loading' } | CitizensSheet;

/** Typing settles for this long before the list is asked again. */
const SEARCH_PAUSE_MS = 250;

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };

/** What adding a person came to: done, or the till's reasons (none when it said nothing). */
type Added = { readonly ok: true } | { readonly ok: false; readonly problems: readonly string[] };

/** Adds the wallet to the organization as a member. */
async function addMember(accountId: string, wallet: string): Promise<Added> {
  try {
    const response = await fetch('/api/saldo', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ action: 'set-member', accountId, wallet, role: 'member' }),
    });
    const result = readResult(await response.json().catch(() => null));
    if (result === null) return { ok: false, problems: [] };
    return result.ok && response.ok
      ? { ok: true }
      : { ok: false, problems: result.ok ? [] : result.problems };
  } catch {
    return { ok: false, problems: [] };
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
  problems,
}: {
  readonly locale: SupportedLocale;
  readonly words: CensusListMessages;
  /** The Saldo panel's sentences for the till's refusals: an add that is refused says why. */
  readonly problems: SaldoMessages['problems'];
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
  // The till's reason for the last refused add, in words; null when it gave none.
  const [addReason, setAddReason] = useState<string | null>(null);
  // Every organization on offer already has the person in it.
  const [allJoined, setAllJoined] = useState(false);
  const opening = useRef(0);
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
    setAddReason(null);
    setAllJoined(false);
    setStatus('');
    dialog.current?.showModal();
    // Each opening reads the list again: a community may have got its organization since.
    // The ones the person already belongs to are left out of it.
    setTeams({ at: 'loading' });
    const mine = ++opening.current;
    void readTeams().then(async (read) => {
      if (read.at !== 'ready') {
        if (mine === opening.current) setTeams(read);
        return;
      }
      const left = await choicesToJoin(fetch, read.choices, person.wallet);
      if (mine !== opening.current) return;
      setAllJoined(read.choices.length > 0 && left.length === 0);
      setTeams({ at: 'ready', choices: left });
    });
  };

  const close = (): void => {
    dialog.current?.close();
  };

  // The organization picked, or the first of the list until one is.
  const choice =
    teams.at === 'ready'
      ? (teams.choices.find((team) => team.key === chosen) ?? teams.choices[0] ?? null)
      : null;

  const save = async (): Promise<void> => {
    if (adding === null || choice === null) return;
    setSaving(true);
    setAddFailed(false);
    setAddReason(null);
    // A community the house has not used yet gets its account now, then the person joins it.
    const account = await accountOf(fetch, choice);
    const done: Added = account.ok
      ? await addMember(account.accountId, adding.wallet)
      : { ok: false, problems: [] };
    setSaving(false);
    if (!done.ok) {
      setAddFailed(true);
      setAddReason(done.problems.length === 0 ? null : refusalWords(done.problems, problems));
      return;
    }
    close();
    setStatus(fill(words.added, { who: personLines(adding).title, org: choice.label }));
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
        {teams.at === 'ready' && teams.choices.length === 0 && (
          <p className="estado" data-all-joined={allJoined ? '' : undefined}>
            {allJoined ? words.allJoined : words.noOrgs}
          </p>
        )}
        {teams.at === 'ready' && teams.choices.length > 0 && (
          <div className="censo-campo">
            <label htmlFor="censo-org">{words.orgLabel}</label>
            <select
              id="censo-org"
              value={choice?.key ?? ''}
              onChange={(event) => setChosen(event.target.value)}
              data-metric="census-citizen-add-org"
            >
              <OrgOptions list={teams.choices} words={words} />
            </select>
          </div>
        )}
        {choice !== null && choice.community !== null && choice.accountId === null && (
          <p className="nota" data-opens-home>
            {words.opensHomeAdd}
          </p>
        )}
        {addFailed && (
          <p className="estado aviso" role="alert">
            {words.addFailed}
            {addReason !== null && (
              <>
                {' '}
                <span data-add-reason>{addReason}</span>
              </>
            )}
          </p>
        )}
        <div className="censo-botones">
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void save()}
            disabled={saving || choice === null}
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
