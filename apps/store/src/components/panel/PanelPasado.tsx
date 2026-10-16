/**
 * «Qué ha pasado» (the panel's summary, cut 8): the organization's log as a
 * readable list — who, what, when in the visitor's time zone (the log stores
 * UTC) — newest first, thirty lines and «Ver más». Only what the log has: the
 * house's reads stay, as «la casa» with the name it published. The till
 * answers members and the house alone; anyone else sees the failure note.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PanelSummaryMessages } from '../../i18n/panel-summary';
import { formatAt, readHappenings, type DeskHappening } from '../../lib/accounts';
import { oldestOf, whatOf, whoOf, withPage } from '../../lib/happened';
import { LunaEspera } from '../chrome/LunaEspera';

type Read =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly lines: readonly DeskHappening[]; readonly more: boolean };

/** One page of the log: the lines and whether older ones remain, or null when the till did not say. */
async function page(
  org: string,
  before: number | null,
): Promise<{ lines: DeskHappening[]; more: boolean } | null> {
  const cursor = before === null ? '' : `&antes=${before}`;
  try {
    const response = await fetch(`/api/saldo/happened?cuenta=${encodeURIComponent(org)}${cursor}`, {
      headers: { accept: 'application/json' },
    });
    const json: unknown = await response.json().catch(() => null);
    return response.ok ? readHappenings(json) : null;
  } catch {
    return null;
  }
}

export function PanelPasado({
  org,
  locale,
  words,
  logHref,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  readonly words: PanelSummaryMessages['latest'];
  /** The whole log, in «Miembros»; null while there is no such way. */
  readonly logHref: string | null;
}) {
  const [read, setRead] = useState<Read>({ at: 'loading' });
  const [asking, setAsking] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    const first = await page(org, null);
    setRead(first === null ? { at: 'failed' } : { at: 'ready', ...first });
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  const more = async (): Promise<void> => {
    if (read.at !== 'ready') return;
    setAsking(true);
    const next = await page(org, oldestOf(read.lines));
    setAsking(false);
    setRead(
      next === null
        ? { at: 'failed' }
        : { at: 'ready', lines: withPage(read.lines, next.lines), more: next.more },
    );
  };

  return (
    <section className="saldo-seccion" aria-labelledby="summary-latest-t" data-summary-latest>
      <div className="saldo-cabeza">
        <div className="saldo-cabeza-texto">
          <p className="etiqueta">{words.label}</p>
          <h2 id="summary-latest-t">{words.title}</h2>
        </div>
        {logHref !== null && (
          <a href={logHref} data-metric="panel-summary-log">
            {words.log} <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
      <div className="saldo-marco">
        {read.at === 'loading' && (
          <p className="saldo-estado" role="status">
            <LunaEspera /> {words.loading}
          </p>
        )}
        {read.at === 'failed' && (
          <div role="alert" data-happened-failed>
            <p className="saldo-nota">{words.failed}</p>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void load()}
              data-metric="panel-happened-retry"
            >
              {words.retry}
            </button>
          </div>
        )}
        {read.at === 'ready' && read.lines.length === 0 && (
          <p className="saldo-nota" data-happened-empty>
            {words.empty}
          </p>
        )}
        {read.at === 'ready' && read.lines.length > 0 && (
          <>
            <ul className="saldo-ultimo" data-happened-list>
              {read.lines.map((line) => (
                <li key={line.seq} data-happened-act={line.act}>
                  <span>
                    <strong>{whoOf(line, words)}</strong> · {whatOf(line, words)}
                  </span>
                  <time dateTime={line.at}>{formatAt(line.at, locale)}</time>
                </li>
              ))}
            </ul>
            {read.more && (
              <button
                type="button"
                className="btn btn-fantasma"
                disabled={asking}
                onClick={() => void more()}
                data-metric="panel-happened-more"
              >
                {words.more}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
