/**
 * A world's own page (cut 4): public for now. The page is a shell (its address
 * names the world); this reads GET /api/mundos/<id> — no session needed — and
 * says whose the world is. People who belong to the world's organization (and
 * the house) get an «Administración» block besides: the organization that
 * pays for a world is the one that administers it. Nothing is stored.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { WorldPageMessages } from '../../i18n/mundos';
import { fill, readRoles, type DeskRoles } from '../../lib/accounts';
import { enterersOf, personLabel, shownPeople } from '../../lib/world-people';
import { enterWorld, loadWorldPage, type PageSheet } from '../../lib/mundos';
import { PIECES, pieceHref } from '../../lib/panel';
import { LunaEspera } from '../chrome/LunaEspera';

type Read = { readonly at: 'loading' } | PageSheet;

/** The panel's pieces the administration block leads to, in the order it draws them. */
const MANAGE_PIECES = ['venues', 'members', 'balance'] as const;

/**
 * «Quién entra», read from the organization's roles — what the till already says to people in
 * it and to the house: nothing is asked twice and nothing is made up. Where the till does not
 * answer, the block is not drawn.
 */
function Enters({ org, words }: { readonly org: string; readonly words: WorldPageMessages }) {
  const [view, setView] = useState<DeskRoles | null>(null);

  useEffect(() => {
    let current = true;
    fetch(`/api/saldo/roles?cuenta=${encodeURIComponent(org)}`, {
      headers: { accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        if (current) setView(readRoles(json)?.roles ?? null);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [org]);

  if (view === null) return null;
  const found = enterersOf(view);
  const { list, rest } = shownPeople(found.people);
  return (
    <section
      className="saldo-marco mundo-entran"
      aria-labelledby="mundo-entran-t"
      data-world-enters
    >
      <h2 id="mundo-entran-t">{words.enters.title}</h2>
      {found.everyone ? (
        <p className="saldo-nota">{words.enters.everyone}</p>
      ) : (
        found.roles.length > 0 && (
          <>
            <p className="saldo-nota">{words.enters.roles}</p>
            <p className="saldo-chips">
              {found.roles.map((role) => (
                <span key={role.id} className="saldo-chip" data-world-enter-role>
                  {role.name}
                </span>
              ))}
            </p>
          </>
        )
      )}
      <p className="saldo-nota">{words.enters.owners}</p>
      <h3 className="etiqueta">{words.enters.people}</h3>
      {list.length === 0 ? (
        <p className="saldo-nota">{words.enters.none}</p>
      ) : (
        <ul className="mundo-gente" data-world-people>
          {list.map((member) => (
            <li key={member.wallet} data-world-person>
              {personLabel(member)}
            </li>
          ))}
          {rest > 0 && <li className="saldo-nota">{fill(words.enters.more, { n: rest })}</li>}
        </ul>
      )}
    </section>
  );
}

export function WorldView({
  worldId,
  locale,
  words,
  homeHref,
}: {
  readonly worldId: string;
  readonly locale: SupportedLocale;
  readonly words: WorldPageMessages;
  /** The site's start, where «Volver» leads. */
  readonly homeHref: string;
}) {
  const [read, setRead] = useState<Read>({ at: 'loading' });
  const [entering, setEntering] = useState(false);
  const [enterFailed, setEnterFailed] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    setRead(await loadWorldPage(fetch, worldId));
  }, [worldId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Coming back to the page (bfcache) must not find the button still working.
  useEffect(() => {
    const again = (event: PageTransitionEvent): void => {
      if (event.persisted) setEntering(false);
    };
    window.addEventListener('pageshow', again);
    return () => window.removeEventListener('pageshow', again);
  }, []);

  const page = read.at === 'ready' ? read.page : null;
  const home = page?.home ?? null;

  /** Works out the address (with the pass for a member) and goes there; says so when there is none. */
  const enter = useCallback(
    async (fallback: string | null): Promise<void> => {
      setEntering(true);
      setEnterFailed(false);
      const address = await enterWorld(fetch, worldId, fallback);
      if (address === null) {
        setEntering(false);
        setEnterFailed(true);
        return;
      }
      window.location.assign(address);
    },
    [worldId],
  );

  return (
    <div className="mundo-pagina" data-world-page={worldId} data-state={read.at}>
      {read.at === 'loading' && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </p>
      )}
      {read.at === 'failed' && (
        <div className="saldo-marco saldo-fallo" role="alert" data-world-failed>
          <p>{words.failed}</p>
          <div>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void load()}
              data-metric="world-page-retry"
            >
              {words.retry}
            </button>
          </div>
        </div>
      )}
      {read.at === 'missing' && (
        <div className="saldo-marco" data-world-missing>
          <h2>{words.missingTitle}</h2>
          <p className="saldo-nota">{words.missing}</p>
          <div>
            <a className="btn btn-fantasma" href={homeHref} data-metric="world-page-home">
              {words.back}
            </a>
          </div>
        </div>
      )}
      {page !== null && (
        <section
          className="saldo-marco mundo-casa"
          data-world-home={home === null ? 'none' : 'org'}
        >
          <p className="etiqueta">{words.homeLabel}</p>
          {home === null ? (
            <>
              <h2 data-world-org>{words.unplaced}</h2>
              <p className="saldo-nota">{words.unplacedNote}</p>
            </>
          ) : (
            <h2 data-world-org>{home.accountName}</h2>
          )}
        </section>
      )}
      {page !== null && (
        <section className="saldo-marco mundo-entrar" data-world-enter>
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void enter(page.url)}
            disabled={entering}
            aria-busy={entering}
            data-metric="world-enter"
          >
            {entering ? words.entering : words.enter}
          </button>
          <p className="saldo-nota" data-world-enter-note>
            {home !== null && page.manage
              ? fill(words.enterMember, { org: home.accountName })
              : words.enterGuest}
          </p>
          {enterFailed && (
            <p className="saldo-nota" role="alert" data-world-enter-failed>
              {words.enterFailed}
            </p>
          )}
        </section>
      )}
      {page !== null && page.manage && home !== null && (
        <Enters org={home.accountId} words={words} />
      )}
      {page !== null && page.manage && home !== null && (
        <section
          className="saldo-marco mundo-admin"
          aria-labelledby="mundo-admin-t"
          data-world-manage
        >
          <h2 id="mundo-admin-t">{words.manage.title}</h2>
          <p className="saldo-nota">{words.manage.note}</p>
          <ul className="mundo-enlaces">
            {MANAGE_PIECES.map((id) => {
              const piece = PIECES.find((entry) => entry.id === id);
              const href = piece === undefined ? null : pieceHref(locale, piece, home.accountId);
              return (
                href !== null && (
                  <li key={id}>
                    <a className="btn btn-fantasma" href={href} data-metric={`world-page-${id}`}>
                      {words.manage[id]}
                    </a>
                  </li>
                )
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
