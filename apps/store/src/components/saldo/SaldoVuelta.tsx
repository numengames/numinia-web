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
 */

import { useEffect, useState } from 'react';
import type { SaldoMessages } from '../../i18n/saldo';
import { fill, formatEuros, readResult, vueltaParams } from '../../lib/accounts';
import { LunaEspera } from '../chrome/LunaEspera';

type State =
  | { readonly at: 'checking' }
  | { readonly at: 'signed-out' }
  | { readonly at: 'paid'; readonly balanceCents: number }
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
      return { at: 'paid', balanceCents: Number(result['balanceCents']) };
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
  signIn,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly saldoHref: string;
  /** The door, landing on «Saldo»: the balance is what the person came for. */
  readonly signIn: string;
}) {
  const [state, setState] = useState<State>({ at: 'checking' });

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
        <>
          <h2>{ui.vuelta.done}</h2>
          <p className="saldo-cifra-m mono">
            {fill(ui.vuelta.balanceNow, { b: formatEuros(state.balanceCents, lang) })}
          </p>
          <p className="saldo-nota" data-saldo-seller>
            {ui.topup.seller}
          </p>
        </>
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
        <a className="btn btn-fantasma" href={saldoHref} data-metric="saldo-vuelta-back">
          {ui.vuelta.back}
        </a>
      </div>
    </div>
  );
}
