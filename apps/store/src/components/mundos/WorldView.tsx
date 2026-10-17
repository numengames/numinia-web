/**
 * A world's own page: the island. The page (./WorldPage.astro) draws the
 * hero, the facts, the encounters, the machine and the community from what
 * the server read; this reads GET /api/mundos/<id> — no session needed —
 * and says whose the world is. It draws into the page's slots: «Entrar»
 * (the pass flow) in the hero for a signed-in person, «Gestionarlo» and
 * «Quién entra» for the people of the world's organization (and the
 * house), who also get the «Administración» block below: the organization
 * that pays for a world is the one that administers it. Nothing is stored.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SupportedLocale } from '@numinia/domain';
import type { WorldPageMessages } from '../../i18n/mundos';
import { fill, readRoles, type DeskRoles } from '../../lib/accounts';
import { enterersOf, personLabel, shownPeople } from '../../lib/world-people';
import { enterWorld, loadWorldPage, type PageSheet } from '../../lib/mundos';
import { PIECES, pieceHref } from '../../lib/panel';
import { LunaEspera } from '../chrome/LunaEspera';
import { AiSection } from './AiSection';

type Read = { readonly at: 'loading' } | PageSheet;

/** The panel's pieces the administration block leads to, in the order it draws them. */
const MANAGE_PIECES = ['venues', 'members', 'balance'] as const;

/** The page's slots this island draws into (WorldPage.astro). */
const SLOTS = {
  enter: '[data-world-enter-slot]',
  manage: '[data-world-manage-slot]',
  enters: '[data-world-enters-slot]',
} as const;

/** A slot of the page, emptied of what the server put there, once the island is in the browser; null on the server. */
function useSlot(selector: string): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const found = document.querySelector<HTMLElement>(selector);
    if (found !== null) found.replaceChildren();
    setSlot(found);
  }, [selector]);
  return slot;
}

/** Draws `children` into the page's slot. */
function Into({ selector, children }: { readonly selector: string; readonly children: ReactNode }) {
  const slot = useSlot(selector);
  return slot === null ? null : createPortal(children, slot);
}

/**
 * «Quién entra», read from the organization's roles — what the till already says to people in
 * it and to the house: nothing is asked twice and nothing is made up. Where the till does not
 * answer, the block is not drawn; the fact in the page keeps the guest line.
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
  const rule = found.everyone
    ? words.enters.everyone
    : found.roles.length > 0
      ? found.roles.map((role) => role.name).join(' · ')
      : words.enters.owners;
  return (
    <>
      <Into selector={SLOTS.enters}>
        <span data-world-enters-rule>{rule}</span>
      </Into>
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
    </>
  );
}

export function WorldView({
  worldId,
  locale,
  words,
  homeHref,
  fixture,
  placed,
}: {
  readonly worldId: string;
  readonly locale: SupportedLocale;
  readonly words: WorldPageMessages;
  /** The site's start, where «Volver» leads. */
  readonly homeHref: string;
  /** DATA_SOURCE=fixture: the «IA» section talks to an in-memory door. */
  readonly fixture: boolean;
  /** Whether the page already drew the world's community (the index lists it). */
  readonly placed: boolean;
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
  const manages = page !== null && page.manage && home !== null;

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
        <Into selector={SLOTS.enter}>
          <span data-world-enter>
            <button
              type="button"
              className="btn btn-primario btn-grande"
              onClick={() => void enter(page.url)}
              disabled={entering}
              aria-busy={entering}
              data-metric="world-enter"
            >
              {entering ? words.entering : words.enter}
            </button>
            {enterFailed && (
              <span className="mh-fallo" role="alert" data-world-enter-failed>
                {words.enterFailed}
              </span>
            )}
          </span>
        </Into>
      )}
      {manages && (
        <Into selector={SLOTS.manage}>
          <a
            className="btn btn-fantasma"
            href="#mundo-admin"
            data-world-manage-act
            data-metric="world-manage-act"
          >
            {words.own.manageAct}
          </a>
        </Into>
      )}
      {page !== null && !placed && (
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
      {manages && <Enters org={home.accountId} words={words} />}
      {manages && (
        <AiSection
          worldId={worldId}
          worldUrl={page.url}
          words={words.ai}
          retryLabel={words.retry}
          fixture={fixture}
        />
      )}
      {manages && (
        <section
          className="saldo-marco mundo-admin"
          id="mundo-admin"
          aria-labelledby="mundo-admin-t"
          tabIndex={-1}
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
