/**
 * «Saldo» › the way back from Stripe (/saldo/vuelta/). Stripe sends the
 * buyer here in the tab it opened, with `?session_id=cs_…` or
 * `?cancelled=1`. The page asks the till (POST /api/saldo `confirm`) what
 * became of the payment: paid → the top-up is written and the balance
 * shown; still processing → it asks again a few times; cancelled → nothing
 * was charged. The till credits a payment once whoever asks first — this
 * page or the minute's poll.
 *
 * A stranger with no session is not told «we could not find this top-up in
 * your account» (the live QA pass of 2026-10-17 found exactly that greeting
 * on a page nobody had been sent to): the till answers 401 and the page
 * shows the same polite door «Saldo» shows — «Entra para ver tu saldo…».
 * That «we could not find it» belongs only to someone signed in whose
 * top-up really is missing.
 *
 * Paid (t_ef680bad): the plain «you can close this tab» is replaced by a
 * centered thank-you card with the house's established celebration — one
 * burst of stars in the sky's colours (STD-023 velo.cielo), the same
 * construction as the Backer thanks page (support/ThanksPage.astro), never
 * generic confetti. CSS only, played once, still under reduced motion
 * (CEL-011). The card then sends the buyer on to Saldo by itself; the
 * «back» link lets them go sooner.
 */

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SaldoMessages } from '../../i18n/saldo';
import { fill, formatEuros, readResult, vueltaParams } from '../../lib/accounts';
import {
  backTarget,
  readNote,
  VOLVER_ASK,
  VOLVER_CHANNEL,
  type VolverNote,
} from '../../lib/saldo-return';
import { LunaEspera } from '../chrome/LunaEspera';
import coins from '../../../../../packages/ui/src/icons/coins.svg?raw';

/** How long the paid card stays before it sends the buyer on to Saldo. */
const GRACIA_REDIRECT_MS = 5_000;

/** The celebration's 24 stars: angle, distance, size and delay, each on the
    sky's rarity palette (one amber), same construction as ThanksPage.astro. */
const GRACIA_COLORS = [
  'arena',
  'arena',
  'arena',
  'verde',
  'azul',
  'violeta',
  'arena',
  'verde',
  'ambar',
] as const;
const GRACIA_STARS = Array.from({ length: 24 }, (_, i) => ({
  angle: Math.round((360 / 24) * i + ((i * 37) % 11)),
  distance: 90 + ((i * 53) % 90),
  size: 4 + ((i * 7) % 5),
  delay: (i % 5) * 40,
  color: GRACIA_COLORS[i % GRACIA_COLORS.length],
}));

type State =
  | { readonly at: 'checking' }
  | { readonly at: 'signed-out' }
  | { readonly at: 'paid'; readonly balanceCents: number; readonly accountId: string | null }
  | { readonly at: 'processing' }
  | { readonly at: 'cancelled' }
  | { readonly at: 'unknown' };

/** How many times the page asks again while Stripe has not confirmed, and how far apart. */
const RETRIES = 6;
const RETRY_MS = 5_000;

/**
 * Who is here, as the chrome publishes it on `html[data-session]` — the
 * page's ONE session read (lib/session-client.ts). This island asks the
 * server nothing of its own: without a session it draws the door and stops,
 * so the page really does go idle.
 */
function signedInSoon(): Promise<boolean> {
  const read = (): string | null => document.documentElement.getAttribute('data-session');
  const known = read();
  if (known !== null) return Promise.resolve(known === 'in');
  return new Promise((resolve) => {
    const watcher = new MutationObserver(() => {
      const value = read();
      if (value === null) return;
      watcher.disconnect();
      resolve(value === 'in');
    });
    watcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-session'],
    });
  });
}

async function confirm(sessionId: string): Promise<State> {
  try {
    const response = await fetch('/api/saldo', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ action: 'confirm', sessionId }),
    });
    // Read the body whatever the status: an unread body keeps the request
    // open in the browser and the page never goes idle.
    const json: unknown = await response.json().catch(() => null);
    if (response.status === 401) return { at: 'signed-out' };
    const result = response.ok ? readResult(json) : null;
    if (result === null || !result.ok) return { at: 'unknown' };
    if (result['state'] === 'paid') {
      const paidAccount = result['accountId'];
      return {
        at: 'paid',
        balanceCents: Number(result['balanceCents']),
        accountId: typeof paidAccount === 'string' ? paidAccount : null,
      };
    }
    return result['state'] === 'expired' ? { at: 'cancelled' } : { at: 'processing' };
  } catch {
    return { at: 'unknown' };
  }
}

export function SaldoVuelta({
  ui,
  lang,
  saldoHref,
  panelSaldoHref,
  signIn,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly saldoHref: string;
  /** The organization panel's balance (`?org=` is added): where an organization's top-up returns. */
  readonly panelSaldoHref: string;
  /** The door, landing on «Saldo»: the balance is what the person came for. */
  readonly signIn: string;
}) {
  const [state, setState] = useState<State>({ at: 'checking' });
  // Where the top-up was started from, told by the tab the buyer left open.
  const [note, setNote] = useState<VolverNote | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(VOLVER_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const heard = readNote(event.data);
      if (heard !== null) setNote((kept) => kept ?? heard);
    };
    channel.postMessage(VOLVER_ASK);
    return () => channel.close();
  }, []);

  const target = backTarget(
    note,
    state.at === 'paid' ? state.accountId : null,
    panelSaldoHref,
    saldoHref,
  );

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = async (sessionId: string, left: number): Promise<void> => {
      const next = await confirm(sessionId);
      if (stopped) return;
      setState(next);
      if (next.at === 'processing' && left > 0) {
        timer = setTimeout(() => void ask(sessionId, left - 1), RETRY_MS);
      }
    };
    const run = async (): Promise<void> => {
      const { sessionId, cancelled } = vueltaParams(window.location.search);
      // Nothing was charged: true for anybody, it claims nothing about an
      // account, and it needs neither a session nor a request.
      if (cancelled) return setState({ at: 'cancelled' });
      // No session: the door, and not one request from this island.
      if (!(await signedInSoon())) {
        if (!stopped) setState({ at: 'signed-out' });
        return;
      }
      if (stopped) return;
      // Signed in and nobody sent them here by a payment: the honest
      // «we could not find this top-up in your account».
      if (sessionId === null) return setState({ at: 'unknown' });
      await ask(sessionId, RETRIES);
    };
    void run();
    return () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  // The celebration's one way on: once paid, it sends the buyer to the
  // balance by itself — the «back» link below lets them go sooner.
  useEffect(() => {
    if (state.at !== 'paid') return;
    const timer = setTimeout(() => {
      window.location.assign(target.saldo);
    }, GRACIA_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [state.at, target.saldo]);

  if (state.at === 'signed-out') {
    return (
      <div className="saldo-marco saldo-fuera" data-saldo-vuelta="signed-out" data-saldo-signed-out>
        <h2>{ui.signedOut.title}</h2>
        <p className="saldo-nota">{ui.signedOut.text}</p>
        <div>
          <a className="btn btn-primario" href={signIn} data-metric="saldo-sign-in">
            {ui.signedOut.cta}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="saldo-marco saldo-vuelta" data-saldo-vuelta={state.at} aria-live="polite">
      {state.at === 'checking' && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {ui.vuelta.checking}
        </p>
      )}
      {state.at === 'paid' && (
        <div className="saldo-gracias" data-saldo-gracias>
          <div className="saldo-gracias-burst" aria-hidden="true">
            {/* Safe: a build-time ?raw import of our own repo-owned SVG
                (packages/ui/src/icons/coins.svg), the same pattern as
                PanelGlyph.tsx and WorldGlyph.tsx — never user input. */}
            <span
              className="icono saldo-gracias-moneda"
              dangerouslySetInnerHTML={{ __html: coins }}
            />
            {GRACIA_STARS.map((star, i) => (
              <span
                key={i}
                className={`saldo-gracias-estrella saldo-gracias-${star.color}`}
                style={
                  {
                    '--a': `${star.angle}deg`,
                    '--d': `${star.distance}px`,
                    '--s': `${star.size}px`,
                    '--t': `${star.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <h2 className="entrada-1">{ui.vuelta.done}</h2>
          <p className="saldo-cifra-m mono entrada-2">
            {fill(ui.vuelta.balanceNow, { b: formatEuros(state.balanceCents, lang) })}
          </p>
          <p className="saldo-nota entrada-2" data-saldo-seller>
            {ui.topup.seller}
          </p>
          <p className="saldo-nota saldo-gracias-redirect entrada-3" role="status">
            {ui.vuelta.redirecting}
          </p>
        </div>
      )}
      {state.at === 'processing' && (
        <>
          <h2>{ui.vuelta.processing}</h2>
          <p className="saldo-nota">{ui.vuelta.processingNote}</p>
        </>
      )}
      {state.at === 'cancelled' && (
        <>
          <h2>{ui.vuelta.cancelled}</h2>
          <p className="saldo-nota">{ui.vuelta.cancelledNote}</p>
        </>
      )}
      {state.at === 'unknown' && <p className="saldo-nota">{ui.vuelta.unknown}</p>}
      <div>
        <a className="btn btn-fantasma" href={target.saldo} data-metric="saldo-vuelta-back">
          {ui.vuelta.back}
        </a>
        {target.resume !== null && (
          <a
            className="btn btn-primario"
            href={target.resume}
            data-saldo-resume
            data-metric="saldo-vuelta-resume"
          >
            {ui.vuelta.resume}
          </a>
        )}
      </div>
    </div>
  );
}
