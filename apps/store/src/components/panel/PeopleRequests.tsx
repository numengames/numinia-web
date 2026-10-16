/**
 * «Peticiones» (cut G «Hazla tuya»): the open requests the person on the
 * screen may decide on — in the panel's Members, those of the organization's
 * community, on top and only when there are some; in the house's Census,
 * every community's, newest first, with the community's name. One row per
 * ask: the person (face and name if published, else a glyph and the short
 * wallet), what they ask, their note, when, «Aceptar» / «Rechazar». The
 * till decides and logs; a claim accepted makes a titular, a join a member.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { CommunityRequestsMessages } from '../../i18n/community-requests';
import type { SaldoMessages } from '../../i18n/saldo';
import { readProblem, shortWallet, type DeskCommunityRequestEntry } from '../../lib/accounts';
import {
  askedAt,
  askerOf,
  decide,
  loadOpen,
  withWho,
  type OpenSheet,
} from '../../lib/community-requests-client';
import { LunaEspera } from '../chrome/LunaEspera';
import { PeopleGlyph } from './PeopleGlyph';

type Sheet = { readonly at: 'loading' } | OpenSheet;

/** A sentence for the person: what happened (`status`) or why not (`alert`). */
interface Notice {
  readonly tone: 'alert' | 'status';
  readonly text: string;
}

function Asker({ entry }: { readonly entry: DeskCommunityRequestEntry }) {
  const short = shortWallet(entry.wallet);
  return (
    <span className="gente-persona gente-persona-32">
      {entry.avatar === null ? (
        <span className="gente-cara gente-glifo" data-person-glyph>
          <PeopleGlyph name="user" size={16} />
        </span>
      ) : (
        <img
          className="gente-cara"
          src={entry.avatar}
          alt=""
          loading="lazy"
          width={32}
          height={32}
          data-person-face
        />
      )}
      <span className="gente-quien">
        <span className="gente-linea">
          {entry.name === null ? <code>{short}</code> : entry.name}
        </span>
        {entry.name !== null && (
          <span className="gente-bajo">
            <code>{short}</code>
          </span>
        )}
      </span>
    </span>
  );
}

export function PeopleRequests({
  community,
  communities,
  locale,
  words,
  ui,
  onAccepted,
  always = false,
}: {
  /** The community whose requests these are; `null` for every one (the house's Census). */
  readonly community: string | null;
  /** The communities' names by id, for the Census's column. */
  readonly communities?: Readonly<Record<string, string>>;
  readonly locale: SupportedLocale;
  readonly words: CommunityRequestsMessages['list'];
  /** Saldo's words for the till's refusals. */
  readonly ui: SaldoMessages;
  /** A request was accepted: the organization changed (Members reads its people again). */
  readonly onAccepted?: () => void;
  /** Draw the section even with nothing open (the Census); Members hides it then. */
  readonly always?: boolean;
}) {
  const [sheet, setSheet] = useState<Sheet>({ at: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Only the newest read may paint.
  const asked = useRef(0);

  const read = useCallback(async (): Promise<void> => {
    const mine = ++asked.current;
    const answered = await loadOpen(fetch, community);
    if (mine === asked.current) setSheet(answered);
  }, [community]);

  useEffect(() => {
    void read();
  }, [read]);

  const problemText = (problems: readonly string[]): string => {
    const { key } = readProblem(problems);
    return key === 'notConfigured' || key === 'needs' ? ui.problems.other : ui.problems[key];
  };

  const settle = async (entry: DeskCommunityRequestEntry, accept: boolean): Promise<void> => {
    if (busy !== null) return;
    setBusy(entry.id);
    setNotice(null);
    const result = await decide(fetch, entry.id, accept, entry.communityId);
    setBusy(null);
    if (!result.ok) {
      const why =
        result.why === 'unavailable'
          ? words.notBound
          : result.problems.length === 0
            ? ui.failed
            : `${words.refused} ${problemText(result.problems)}`;
      setNotice({ tone: 'alert', text: why });
      return;
    }
    setNotice({
      tone: 'status',
      text: !accept
        ? words.declined
        : entry.kind === 'claim'
          ? words.acceptedClaim
          : words.acceptedJoin,
    });
    if (sheet.at === 'ready') {
      setSheet({ at: 'ready', requests: sheet.requests.filter((r) => r.id !== entry.id) });
    }
    if (accept) onAccepted?.();
  };

  const none = sheet.at === 'ready' && sheet.requests.length === 0;
  if (!always && (sheet.at === 'forbidden' || sheet.at === 'unavailable' || none)) {
    return notice === null ? null : (
      <div className="gente-avisos" aria-live="polite" data-requests-notices>
        <p
          className={notice.tone === 'alert' ? 'saldo-mal gente-aviso' : 'saldo-nota gente-aviso'}
          role={notice.tone}
        >
          {notice.text}
        </p>
      </div>
    );
  }
  if (!always && (sheet.at === 'loading' || sheet.at === 'failed')) return null;

  return (
    <div className="saldo-seccion peticiones" data-requests={community ?? 'all'}>
      <div className="saldo-cabeza">
        <h2 className="etiqueta">{words.title}</h2>
      </div>
      {always && community === null && <p className="saldo-nota">{words.intro}</p>}
      <div className="gente-avisos" aria-live="polite" data-requests-notices>
        {notice !== null && (
          <p
            className={notice.tone === 'alert' ? 'saldo-mal gente-aviso' : 'saldo-nota gente-aviso'}
            role={notice.tone}
          >
            {notice.text}
          </p>
        )}
      </div>
      {sheet.at === 'loading' && (
        <div className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </div>
      )}
      {sheet.at === 'failed' && (
        <p className="saldo-nota" role="alert">
          {words.failed}{' '}
          <button type="button" className="btn btn-silencioso" onClick={() => void read()}>
            {words.retry}
          </button>
        </p>
      )}
      {sheet.at === 'unavailable' && <p className="saldo-nota">{words.notBound}</p>}
      {sheet.at === 'forbidden' && <p className="saldo-nota">{ui.problems.other}</p>}
      {none && <p className="saldo-nota">{words.empty}</p>}
      {sheet.at === 'ready' && sheet.requests.length > 0 && (
        <div className="gente-tabla" role="region" aria-label={words.title} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">{words.columns.person}</th>
                {community === null && <th scope="col">{words.columns.community}</th>}
                <th scope="col">{words.columns.ask}</th>
                <th scope="col">{words.columns.note}</th>
                <th scope="col">{words.columns.when}</th>
                <th scope="col">
                  <span className="sr-only">{words.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sheet.requests.map((entry) => {
                const who = askerOf(entry);
                const waiting = busy === entry.id;
                return (
                  <tr key={entry.id} data-request={entry.id} data-request-kind={entry.kind}>
                    <td>
                      <Asker entry={entry} />
                    </td>
                    {community === null && (
                      <td>{communities?.[entry.communityId] ?? entry.communityId}</td>
                    )}
                    <td>
                      <span className={`peticion-clase peticion-${entry.kind}`}>
                        {entry.kind === 'claim' ? words.claim : words.join}
                      </span>
                    </td>
                    <td className="peticion-nota">{entry.note ?? '—'}</td>
                    <td>
                      <time dateTime={entry.createdAt}>{askedAt(entry.createdAt, locale)}</time>
                    </td>
                    <td className="peticion-acciones">
                      <button
                        type="button"
                        className="btn btn-primario"
                        disabled={busy !== null}
                        aria-busy={waiting || undefined}
                        aria-label={withWho(words.acceptLabel, who)}
                        onClick={() => void settle(entry, true)}
                        data-metric="request-accept"
                      >
                        {words.accept}
                      </button>
                      <button
                        type="button"
                        className="btn btn-fantasma"
                        disabled={busy !== null}
                        aria-label={withWho(words.declineLabel, who)}
                        onClick={() => void settle(entry, false)}
                        data-metric="request-decline"
                      >
                        {words.decline}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
