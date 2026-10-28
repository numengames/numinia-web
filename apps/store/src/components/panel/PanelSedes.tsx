/**
 * «Sedes» inside the panel (cut 4, «Mundos ↔ organizaciones»): the worlds the
 * house has assigned to the organization the panel shows, each with a link to
 * its own page, and the usual empty state when it has none. Only people in
 * the organization (and the house) get the list: the server answers 403 to
 * anyone else, and this says so instead of drawing a world.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { VenuesMessages } from '../../i18n/mundos';
import type { PanelMessages } from '../../i18n/panel';
import { fill, readRoles } from '../../lib/accounts';
import {
  counted,
  enterWorldInNewTab,
  loadOrgWorlds,
  worldHref,
  type Sheet,
  type Venue,
} from '../../lib/mundos';
import { enterCount, enterersOf } from '../../lib/world-people';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelFrame } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';

type Read = { readonly at: 'loading' } | Sheet<Venue>;

function Venues({
  org,
  locale,
  words,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  readonly words: VenuesMessages;
}) {
  const [read, setRead] = useState<Read>({ at: 'loading' });
  const [failed, setFailed] = useState(false);
  // How many people of the organization may enter: what its roles say, or nothing when the till does not.
  const [mayEnter, setMayEnter] = useState<number | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    setRead(await loadOrgWorlds(fetch, org));
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let current = true;
    fetch(`/api/saldo/roles?cuenta=${encodeURIComponent(org)}`, {
      headers: { accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        const view = readRoles(json)?.roles;
        if (current) setMayEnter(view === undefined ? null : enterersOf(view).people.length);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [org]);

  /** «Entrar», in a new tab (card t_677de28a): the world's address (with the pass for a member); the world's page when there is none. */
  const enter = useCallback(async (worldId: string): Promise<void> => {
    setFailed(false);
    const address = await enterWorldInNewTab(fetch, worldId, null, (url, target) =>
      window.open(url, target),
    );
    if (address === null) setFailed(true);
  }, []);

  return (
    <section className="sedes" data-venues data-state={read.at}>
      {read.at === 'loading' && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </p>
      )}
      {read.at === 'forbidden' && (
        <div className="saldo-marco saldo-fallo" role="alert" data-venues-forbidden>
          <p>{words.forbidden}</p>
        </div>
      )}
      {read.at === 'failed' && (
        <div className="saldo-marco saldo-fallo" role="alert" data-venues-failed>
          <p>{words.failed}</p>
          <div>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void load()}
              data-metric="panel-venues-retry"
            >
              {words.retry}
            </button>
          </div>
        </div>
      )}
      {read.at === 'ready' && read.items.length === 0 && (
        <div className="saldo-marco" data-venues-empty>
          <h2>{words.empty}</h2>
          <p className="saldo-nota">{words.emptyNote}</p>
        </div>
      )}
      {read.at === 'ready' && read.items.length > 0 && (
        <>
          <p className="panel-pequeno sedes-cuenta" data-venues-count>
            {fill(counted(words.count, read.items.length), { n: read.items.length })}
          </p>
          <ul className="sedes-lista">
            {read.items.map((world) => (
              <li key={world.worldId} className="tarjeta sedes-ficha" data-venue={world.worldId}>
                {/* Its picture, the one its card wears in /mundos/; the glyph when it has none (MIS-265). */}
                <a
                  className="sedes-portada"
                  href={worldHref(locale, world.worldId)}
                  tabIndex={-1}
                  aria-hidden="true"
                  data-venue-cover={world.cover === null ? 'none' : 'picture'}
                >
                  {world.cover === null ? (
                    <PanelGlyph name="buildings" size={32} />
                  ) : (
                    <img src={world.cover} alt="" loading="lazy" decoding="async" />
                  )}
                </a>
                <span className="sedes-cuerpo">
                  <span className="etiqueta">{words.address}</span>
                  <strong className="sedes-nombre" data-venue-name>
                    {world.name}
                  </strong>
                  {mayEnter !== null && (
                    <span className="sedes-entran" data-venue-enterers>
                      {enterCount(mayEnter, words.enterers)}
                    </span>
                  )}
                </span>
                <a
                  className="btn btn-primario"
                  href={worldHref(locale, world.worldId)}
                  aria-label={fill(words.enterLabel, { w: world.name })}
                  onClick={(event) => {
                    event.preventDefault();
                    void enter(world.worldId);
                  }}
                  data-metric="panel-venue-enter"
                >
                  {words.enter}
                </a>
                <a
                  className="btn btn-fantasma"
                  href={worldHref(locale, world.worldId)}
                  aria-label={fill(words.openLabel, { w: world.name })}
                  data-metric="panel-venue-open"
                >
                  {words.open}
                </a>
              </li>
            ))}
          </ul>
          {failed && (
            <p className="saldo-nota" role="alert" data-venue-enter-failed>
              {words.enterFailed}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function PanelSedes({
  locale,
  words,
  signIn,
  saldoHref,
  venues,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  readonly venues: VenuesMessages;
}) {
  return (
    <PanelFrame locale={locale} face="venues" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team) => <Venues key={team.id} org={team.id} locale={locale} words={venues} />}
    </PanelFrame>
  );
}
