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
import { fill } from '../../lib/accounts';
import { counted, loadOrgWorlds, worldHref, type Sheet } from '../../lib/mundos';
import type { OrgWorld } from '../../lib/worlds-homes';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelFrame } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';

type Read = { readonly at: 'loading' } | Sheet<OrgWorld>;

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

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    setRead(await loadOrgWorlds(fetch, org));
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

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
                <span className="sedes-icono" aria-hidden="true">
                  <PanelGlyph name="buildings" size={18} />
                </span>
                <span className="sedes-cuerpo">
                  <span className="etiqueta">{words.address}</span>
                  <strong className="mono sedes-nombre">{world.worldId}</strong>
                </span>
                <a
                  className="btn btn-fantasma"
                  href={worldHref(locale, world.worldId)}
                  aria-label={fill(words.openLabel, { w: world.worldId })}
                  data-metric="panel-venue-open"
                >
                  {words.open}
                </a>
              </li>
            ))}
          </ul>
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
