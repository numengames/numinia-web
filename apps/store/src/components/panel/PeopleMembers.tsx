/**
 * «Miembros» (the panel's people of one organization): the prototype's
 * table — who, their rank in the city, their roles here, since when — with
 * the search, «Añadir miembro», the roles given and taken from each row and
 * each row's menu (take out or leave, copy the wallet); below, the log
 * behind its toggle, as Saldo's members tab had it.
 *
 * What may be done is the till's (lib/panel-people.ts reads it from the
 * roles view): a control the person cannot use is not drawn. The ranks come
 * from /api/saldo/ranks, for this organization's people only; a rank nobody
 * could read is «—», never a guess. There is no presence and no request to
 * join yet, so no «En línea» and no «Piden entrar».
 */

import { Fragment, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { Rank, SupportedLocale } from '@numinia/domain';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import { fill, formatAt, readLog, shortWallet, type DeskLogLine } from '../../lib/accounts';
import {
  dotOf,
  matchesSearch,
  monthOf,
  peopleAccess,
  plural,
  readRanks,
  removalOf,
  rolesToGive,
} from '../../lib/panel-people';
import { LunaEspera } from '../chrome/LunaEspera';
import { usePeopleDesk } from './people-desk';
import { HouseStrip, OwnerChip, PeopleNotices, Person, RoleDot, whoOf } from './PeopleBits';
import { PeopleGlyph } from './PeopleGlyph';
import { WalletSuggest } from './WalletSuggest';

type Ranks =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly ranks: Readonly<Record<string, Rank | null>> };

type LogState =
  | { readonly at: 'closed' }
  | { readonly at: 'loading' }
  | { readonly at: 'failed'; readonly text: string }
  | { readonly at: 'ready'; readonly lines: readonly DeskLogLine[] };

/** A wallet as the till keeps it, typed by a person. */
const WALLET = /^0x[0-9a-f]{40}$/;

export function PeopleMembers({
  org,
  locale,
  label,
  homeHref,
  ui,
  words,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  /** The screen's name, which also labels the table's scrolling region. */
  readonly label: string;
  /** The panel's door, under the visitor's locale: where leaving the organization lands. */
  readonly homeHref: string;
  readonly ui: SaldoMessages;
  readonly words: PeopleMessages;
}) {
  const desk = usePeopleDesk(org, ui, words, locale);
  const said = words.members;
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [givingTo, setGivingTo] = useState<string | null>(null);
  const [chosen, setChosen] = useState('');
  const [ranks, setRanks] = useState<Ranks>({ at: 'loading' });
  const [log, setLog] = useState<LogState>({ at: 'closed' });
  // The ranks already read: a person they do not name asks for them again.
  const known = useRef<Readonly<Record<string, Rank | null>> | null>(null);

  const view = desk.sheet.at === 'ready' ? desk.sheet.view : null;
  const you = desk.sheet.at === 'ready' ? desk.sheet.you : null;
  const wallets = view?.members.map((member) => member.wallet.toLowerCase()).join(',') ?? '';

  useEffect(() => {
    if (wallets === '') return;
    const read = known.current;
    if (read !== null && wallets.split(',').every((wallet) => wallet in read)) return;
    let gone = false;
    void (async () => {
      try {
        // The first read may come from the browser's five minutes; a new person asks the server.
        const response = await fetch(`/api/saldo/ranks?cuenta=${encodeURIComponent(org)}`, {
          headers: { accept: 'application/json' },
          cache: read === null ? 'default' : 'reload',
        });
        const json: unknown = await response.json().catch(() => null);
        const answered = response.ok ? readRanks(json) : null;
        if (gone) return;
        known.current = answered;
        setRanks(answered === null ? { at: 'failed' } : { at: 'ready', ranks: answered });
      } catch {
        if (!gone) setRanks({ at: 'failed' });
      }
    })();
    return () => {
      gone = true;
    };
  }, [wallets, org]);

  const toggleLog = async (): Promise<void> => {
    if (log.at !== 'closed') return setLog({ at: 'closed' });
    setLog({ at: 'loading' });
    try {
      const response = await fetch(`/api/saldo/log?cuenta=${encodeURIComponent(org)}`, {
        headers: { accept: 'application/json' },
      });
      const json: unknown = await response.json().catch(() => null);
      const lines = response.ok ? readLog(json) : null;
      if (lines !== null) return setLog({ at: 'ready', lines });
      const problems =
        response.status === 403 && typeof json === 'object' && json !== null
          ? (json as { problems?: unknown }).problems
          : null;
      setLog({
        at: 'failed',
        text: Array.isArray(problems) ? desk.problemText(problems.map(String)) : ui.failed,
      });
    } catch {
      setLog({ at: 'failed', text: ui.failed });
    }
  };

  if (desk.sheet.at === 'loading') {
    return (
      <div className="saldo-estado" role="status">
        <LunaEspera /> {ui.loading}
      </div>
    );
  }
  if (desk.sheet.at === 'failed') {
    return (
      <div className="saldo-marco saldo-fallo" role="alert">
        <p>{desk.sheet.text}</p>
        <div>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void desk.reload()}
            data-metric="panel-people-retry"
          >
            {ui.retry}
          </button>
        </div>
      </div>
    );
  }

  const organization = desk.sheet.view;
  const people = peopleAccess(organization, you);
  const mayInvite = people.access.permissions.includes('invite-members');
  const shown = organization.members.filter((member) => matchesSearch(member, query));
  const roleOf = (id: string) => organization.roles.find((role) => role.id === id);

  const add = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const wallet = typed.trim().toLowerCase();
    if (!WALLET.test(wallet)) return setBad(true);
    setBad(false);
    const now = await desk.act({ action: 'set-member', wallet, role: 'member' });
    if (now !== null) {
      setTyped('');
      setAdding(false);
    }
  };

  const remove = async (wallet: string, leaving: boolean): Promise<void> => {
    if (leaving) {
      // Out of the organization: back to the panel, which shows the next one (or none).
      if (await desk.leave(wallet)) window.location.assign(homeHref);
      return;
    }
    const now = await desk.act({ action: 'remove-member', wallet });
    if (now === null) return;
    setOpen(null);
    setConfirming(false);
  };

  const copy = async (wallet: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(wallet);
      desk.say({ tone: 'status', text: said.copied });
    } catch {
      desk.say({ tone: 'status', text: fill(said.copyFailed, { wallet }) });
    }
    setOpen(null);
  };

  const give = async (wallet: string, roleId: string): Promise<void> => {
    const now = await desk.act({ action: 'give-role', wallet, roleId });
    if (now !== null) setGivingTo(null);
  };

  return (
    <div className="saldo-panel gente" data-people-members>
      {organization.as === 'house' && <HouseStrip ui={ui} />}
      <PeopleNotices desk={desk} ui={ui} />

      <div className="saldo-marco gente-tarjeta">
        <div className="gente-barra">
          <div className="gente-buscar">
            <label className="sr-only" htmlFor="gente-buscar">
              {said.search}
            </label>
            <PeopleGlyph name="magnifying-glass" size={16} />
            <input
              id="gente-buscar"
              type="search"
              value={query}
              placeholder={said.search}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
              data-metric="panel-people-search"
            />
          </div>
          <span className="gente-cuenta" data-people-count aria-live="polite">
            {plural(shown.length, said.count, locale)}
          </span>
          {mayInvite && !adding && (
            <button
              type="button"
              className="btn btn-fantasma gente-anadir-btn"
              onClick={() => setAdding(true)}
              data-metric="panel-member-add"
            >
              <PeopleGlyph name="plus" size={16} />
              {said.add}
            </button>
          )}
        </div>

        {mayInvite && adding && (
          <form className="gente-anadir" onSubmit={(event) => void add(event)} data-people-add>
            <label htmlFor="gente-cartera">{said.addLabel}</label>
            <div className="saldo-linea-form">
              {/* «El censo»: for the house, suggestions from who has signed in; for anyone else, as before. */}
              <WalletSuggest locale={locale} value={typed} bad={bad} onChange={setTyped} />
              <button
                type="submit"
                className="btn btn-primario"
                disabled={desk.busy}
                data-metric="panel-member-add-save"
              >
                {said.addSave}
              </button>
              <button
                type="button"
                className="btn btn-silencioso"
                onClick={() => {
                  setAdding(false);
                  setBad(false);
                }}
                data-metric="panel-member-add-cancel"
              >
                {ui.panel.cancel}
              </button>
              {bad && (
                <p className="saldo-mal" id="gente-cartera-mal" role="alert">
                  {said.addBad}
                </p>
              )}
            </div>
          </form>
        )}

        <div className="gente-tabla" role="region" aria-label={label} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">{said.columns.person}</th>
                <th scope="col">{said.columns.rank}</th>
                <th scope="col">{said.columns.roles}</th>
                <th scope="col">{said.columns.since}</th>
                <th scope="col">
                  <span className="sr-only">{said.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((member, index) => {
                const wallet = member.wallet;
                const who = whoOf(member);
                const rank =
                  ranks.at === 'ready' ? (ranks.ranks[wallet.toLowerCase()] ?? null) : null;
                const free = rolesToGive(member, organization.roles);
                const removal = removalOf(people, organization, member);
                const menuId = `gente-menu-${index}`;
                const isOpen = open === wallet;
                return (
                  <Fragment key={wallet}>
                    <tr data-person={wallet}>
                      <td>
                        <span className="gente-celda-persona">
                          <Person
                            member={member}
                            you={you}
                            ui={ui}
                            dot={dotOf(member, organization.roles)}
                          />
                          {member.owner && <OwnerChip ui={ui} />}
                        </span>
                      </td>
                      <td>
                        {ranks.at === 'loading' ? (
                          <span className="gente-tenue" data-rank title={said.loadingRanks}>
                            …
                          </span>
                        ) : (
                          <span
                            className={rank === null ? 'gente-tenue' : undefined}
                            title={rank === null ? said.rankUnknown : undefined}
                            data-rank
                          >
                            {rank === null ? '—' : said.ranks[rank]}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="gente-roles">
                          {member.roleIds.map((id) => {
                            const role = roleOf(id);
                            if (role === undefined) return null;
                            return (
                              <span key={id} className="saldo-chip gente-chip">
                                <RoleDot color={role.color} />
                                <span data-role-chip>{role.name}</span>
                                {member.assignable.includes(id) && (
                                  <button
                                    type="button"
                                    className="gente-chip-x"
                                    disabled={desk.busy}
                                    aria-label={fill(ui.panel.take, { role: role.name, who })}
                                    onClick={() =>
                                      void desk.act({ action: 'take-role', wallet, roleId: id })
                                    }
                                    data-metric="panel-member-role-take"
                                  >
                                    <PeopleGlyph name="x" size={12} />
                                  </button>
                                )}
                              </span>
                            );
                          })}
                          {free.length > 0 && givingTo !== wallet && (
                            <button
                              type="button"
                              className="gente-mas"
                              aria-label={fill(said.giveMore, { who })}
                              onClick={() => {
                                setGivingTo(wallet);
                                setChosen(free[0]?.id ?? '');
                              }}
                              data-metric="panel-member-role-more"
                            >
                              <PeopleGlyph name="plus" size={14} />
                            </button>
                          )}
                          {free.length > 0 && givingTo === wallet && (
                            <span className="gente-dar">
                              <label className="sr-only" htmlFor={`gente-dar-${index}`}>
                                {fill(ui.panel.giveLabel, { who })}
                              </label>
                              <select
                                id={`gente-dar-${index}`}
                                value={chosen}
                                onChange={(event) => setChosen(event.target.value)}
                                data-metric="panel-member-role-choose"
                              >
                                {free.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="btn btn-fantasma gente-pequeno"
                                disabled={desk.busy}
                                onClick={() => void give(wallet, chosen)}
                                data-metric="panel-member-role-give"
                              >
                                {ui.panel.give}
                              </button>
                              <button
                                type="button"
                                className="gente-chip-x"
                                aria-label={ui.panel.cancel}
                                onClick={() => setGivingTo(null)}
                                data-metric="panel-member-role-cancel"
                              >
                                <PeopleGlyph name="x" size={12} />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="gente-desde" data-since>
                        {monthOf(member.addedAt, locale) ?? '—'}
                      </td>
                      <td className="gente-acciones">
                        <button
                          type="button"
                          className="gente-menu-btn"
                          aria-label={fill(said.menu, { who })}
                          aria-expanded={isOpen}
                          aria-controls={isOpen ? menuId : undefined}
                          onClick={() => {
                            setOpen(isOpen ? null : wallet);
                            setConfirming(false);
                          }}
                          data-metric="panel-member-menu"
                        >
                          <PeopleGlyph name="dots-three" size={20} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="gente-detalle" id={menuId} data-person-detail={wallet}>
                        <td colSpan={5}>
                          {confirming && removal !== null ? (
                            <div
                              className="saldo-confirmar"
                              role="group"
                              aria-label={removal === 'leave' ? said.leave : said.remove}
                              data-person-confirm
                            >
                              <p>
                                {removal === 'leave'
                                  ? said.leaveConfirm
                                  : fill(said.removeConfirm, { who })}
                              </p>
                              <div className="saldo-botones">
                                <button
                                  type="button"
                                  className="btn btn-destructivo"
                                  disabled={desk.busy}
                                  onClick={() => void remove(wallet, removal === 'leave')}
                                  data-metric="panel-member-remove-confirm"
                                >
                                  {removal === 'leave' ? said.leaveYes : said.removeYes}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-silencioso"
                                  onClick={() => setConfirming(false)}
                                  data-metric="panel-member-remove-cancel"
                                >
                                  {ui.panel.cancel}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ul className="gente-menu">
                              {removal !== null && (
                                <li>
                                  <button
                                    type="button"
                                    className="btn btn-silencioso gente-peligro"
                                    onClick={() => setConfirming(true)}
                                    data-metric="panel-member-remove"
                                  >
                                    {removal === 'leave' ? said.leave : said.remove}
                                  </button>
                                </li>
                              )}
                              <li>
                                <button
                                  type="button"
                                  className="btn btn-silencioso"
                                  onClick={() => void copy(wallet)}
                                  data-metric="panel-member-copy"
                                >
                                  {said.copy}
                                </button>
                              </li>
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && (
          <p className="saldo-nota" data-people-none>
            {fill(said.none, { q: query.trim() })}
          </p>
        )}
      </div>

      <section className="saldo-seccion" aria-labelledby="gente-registro-t" data-panel-log>
        <div className="saldo-cabeza">
          <h2 className="etiqueta" id="gente-registro-t">
            {ui.panel.logTitle}
          </h2>
          <button
            type="button"
            className="btn btn-silencioso"
            aria-expanded={log.at !== 'closed'}
            onClick={() => void toggleLog()}
            data-metric="panel-log-toggle"
          >
            {log.at === 'closed' ? ui.panel.showLog : ui.panel.hideLog}
          </button>
        </div>
        {log.at === 'loading' && (
          <div className="saldo-estado" role="status">
            <LunaEspera /> {ui.loading}
          </div>
        )}
        {log.at === 'failed' && <p className="saldo-nota">{log.text}</p>}
        {log.at === 'ready' && log.lines.length === 0 && (
          <p className="saldo-nota">{ui.panel.logEmpty}</p>
        )}
        {log.at === 'ready' && log.lines.length > 0 && (
          <ol className="saldo-registro">
            {log.lines.map((line) => (
              <li key={line.seq}>
                <span className="mono saldo-fecha">{formatAt(line.at, locale)}</span>
                <span>
                  {ui.panel.logAct[line.act] ?? line.act}
                  {line.detail?.['name'] !== undefined && ` · ${line.detail['name']}`}
                  {line.subject !== null && ` → ${shortWallet(line.subject)}`}
                </span>
                <span className="mono saldo-fecha">{shortWallet(line.actor)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
