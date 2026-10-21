/**
 * «IAs que viven aquí» (S24, DISENO-IA-EN-EL-MUNDO.md §5): on a world's page,
 * for the people of the world's community (and the house), the AIs of that
 * community that live in this world — their name and how they stand — and,
 * for whoever may add AIs, «Añadir una IA», which leads to the panel's Agentes.
 * Nobody else sees it: the page draws this only where the world's own page
 * already knows the viewer belongs (`manage`).
 *
 * Read from the same list the panel reads (/api/saldo/agents), which the till
 * answers to a member and to the house alone; nothing is stored here. This is
 * apart from the «IA» section below it, which lists the AIs that come in
 * through the world's own door.
 */

import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { WorldPageMessages } from '../../i18n/mundos';
import type { DeskAgents } from '../../lib/accounts';
import { PIECES, pieceHref } from '../../lib/panel';
import { listUrl, livesInWorld, readAgents } from '../../lib/panel-agentes';
import { LunaEspera } from '../chrome/LunaEspera';

type Read =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly view: DeskAgents };

export function WorldAis({
  worldId,
  accountId,
  locale,
  words,
}: {
  readonly worldId: string;
  readonly accountId: string;
  readonly locale: SupportedLocale;
  readonly words: WorldPageMessages['here'];
}) {
  const [read, setRead] = useState<Read>({ at: 'loading' });

  useEffect(() => {
    let current = true;
    setRead({ at: 'loading' });
    fetch(listUrl(accountId), { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        const view = readAgents(json);
        if (current) setRead(view === null ? { at: 'failed' } : { at: 'ready', view });
      })
      .catch(() => {
        if (current) setRead({ at: 'failed' });
      });
    return () => {
      current = false;
    };
  }, [accountId]);

  const piece = PIECES.find((entry) => entry.id === 'agents');
  const href = piece === undefined ? null : pieceHref(locale, piece, accountId);
  const here =
    read.at === 'ready' ? read.view.agents.filter((agent) => livesInWorld(agent, worldId)) : [];

  return (
    <section
      className="saldo-marco mundo-ias"
      aria-labelledby="mundo-ias-t"
      data-world-ais-here
      data-state={read.at}
    >
      <h2 id="mundo-ias-t">{words.title}</h2>
      <p className="saldo-nota">{words.note}</p>
      {read.at === 'loading' && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </p>
      )}
      {read.at === 'failed' && (
        <p className="saldo-nota" role="alert" data-world-ais-failed>
          {words.failed}
        </p>
      )}
      {read.at === 'ready' &&
        (here.length === 0 ? (
          <p className="saldo-nota" data-world-ais-none>
            {words.none}
          </p>
        ) : (
          <ul className="mundo-ias-lista" aria-label={words.listLabel} data-world-ais-list>
            {here.map((agent) => (
              <li
                key={agent.id}
                data-world-here-ai={agent.id}
                data-world-here-status={agent.status}
              >
                <span className="mundo-ia-nombre">{agent.name}</span>
                <span
                  className={`saldo-chip${agent.status === 'activa' ? '' : ' mundo-ia-quieta'}`}
                >
                  {words.status[agent.status]}
                </span>
              </li>
            ))}
          </ul>
        ))}
      {read.at === 'ready' && read.view.mayCreate && href !== null && (
        <p>
          <a className="btn btn-fantasma" href={href} data-metric="world-ais-add">
            {words.add}
          </a>
        </p>
      )}
    </section>
  );
}
