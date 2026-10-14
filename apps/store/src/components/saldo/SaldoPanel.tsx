/**
 * «Saldo» (the island): your account and your organizations' in one
 * screen. Asks /api/saldo (the till's AccountDesk behind the session) and
 * shows only what it answers — no figure is made up here.
 *
 * Top to bottom: the account switcher («Tu cuenta», each organization,
 * «Nueva organización»), the balance that never expires and what was spent
 * in the period, the top-up (+10 / +50 / +100 €, Stripe in a NEW tab: the
 * tab is opened blank on the click itself, so popup blockers allow it, and
 * sent to Stripe once the API answers), usage per day or month, the
 * movements and, for an organization, its team. Every return to the tab
 * reads the balance again (the payment happened in the other one).
 */

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  checkoutTarget,
  problemOf,
  readOverview,
  readResult,
  readStatement,
  readYou,
  teamName,
  type DeskAccount,
  type DeskStatement,
  type MemberRole,
  type PostResult,
  type SpendRange,
  type TopupKey,
} from '../../lib/accounts';
import { LunaEspera } from '../chrome/LunaEspera';
import { Balance, Movements, Team, Topup, Usage, type TopupState } from './SaldoSections';

type Phase =
  | { readonly at: 'loading' }
  | { readonly at: 'signed-out' }
  | { readonly at: 'not-bound' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly accounts: readonly DeskAccount[] };

type Sheet =
  | { readonly at: 'loading' }
  | { readonly at: 'failed'; readonly text: string }
  | { readonly at: 'ready'; readonly statement: DeskStatement; readonly you: string | null };

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };

/** POST one action; the desk's answer, or null when the API failed. */
async function post(body: Readonly<Record<string, unknown>>): Promise<PostResult | null> {
  try {
    const response = await fetch('/api/saldo', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
    const json: unknown = await response.json().catch(() => null);
    return response.ok ? readResult(json) : null;
  } catch {
    return null;
  }
}

export function SaldoPanel({
  ui,
  lang,
  locale,
  signIn,
}: {
  readonly ui: SaldoMessages;
  /** The page's language, for money and dates. */
  readonly lang: string;
  readonly locale: SupportedLocale;
  /** The door, coming back here. */
  readonly signIn: string;
}) {
  const [phase, setPhase] = useState<Phase>({ at: 'loading' });
  const [current, setCurrent] = useState<string | null>(null);
  const [range, setRange] = useState<SpendRange>('30d');
  const [sheet, setSheet] = useState<Sheet>({ at: 'loading' });
  const [amount, setAmount] = useState<TopupKey>('10');
  const [topup, setTopup] = useState<TopupState>({ at: 'idle' });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  // Only the newest statement read may paint.
  const asked = useRef(0);

  const problemText = useCallback(
    (problems: readonly string[]): string => {
      const key = problemOf(problems);
      return key === 'notConfigured' ? ui.topup.notConfigured : ui.problems[key];
    },
    [ui],
  );

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/saldo', { headers: { accept: 'application/json' } });
      const json: unknown = await response.json().catch(() => null);
      if (response.status === 401) return setPhase({ at: 'signed-out' });
      if (response.status === 503) return setPhase({ at: 'not-bound' });
      const accounts = response.ok ? readOverview(json) : null;
      if (accounts === null || accounts.length === 0) return setPhase({ at: 'failed' });
      setPhase({ at: 'ready', accounts });
      setCurrent((id) =>
        id !== null && accounts.some((account) => account.id === id)
          ? id
          : (accounts[0] as DeskAccount).id,
      );
    } catch {
      setPhase({ at: 'failed' });
    }
  }, []);

  const loadStatement = useCallback(
    async (id: string, which: SpendRange, quiet: boolean): Promise<void> => {
      const mine = (asked.current += 1);
      if (!quiet) setSheet({ at: 'loading' });
      try {
        const query = new URLSearchParams({ cuenta: id, rango: which });
        const response = await fetch(`/api/saldo/statement?${query.toString()}`, {
          headers: { accept: 'application/json' },
        });
        const json: unknown = await response.json().catch(() => null);
        if (mine !== asked.current) return;
        if (response.status === 401) return setPhase({ at: 'signed-out' });
        const statement = response.ok ? readStatement(json) : null;
        if (statement === null) {
          const problems = (json as { problems?: unknown } | null)?.problems;
          return setSheet({
            at: 'failed',
            text: Array.isArray(problems) ? problemText(problems.map(String)) : ui.failed,
          });
        }
        setNow(new Date());
        setSheet({ at: 'ready', statement, you: readYou(json) });
      } catch {
        if (mine === asked.current) setSheet({ at: 'failed', text: ui.failed });
      }
    },
    [problemText, ui],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (current !== null) void loadStatement(current, range, false);
  }, [current, range, loadStatement]);

  // The payment happens in the other tab: coming back reads the balance again.
  useEffect(() => {
    const again = (): void => {
      if (current === null) return;
      void loadOverview();
      void loadStatement(current, range, true);
    };
    window.addEventListener('focus', again);
    return () => window.removeEventListener('focus', again);
  }, [current, range, loadOverview, loadStatement]);

  const pay = (): void => {
    if (current === null) return;
    // Opened on the click itself, so the browser allows it; sent to Stripe below.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setTopup({ at: 'opening' });
    void post({ action: 'topup', accountId: current, amount, locale }).then((result) => {
      if (result === null || !result.ok) {
        tab?.close();
        return setTopup({
          at: 'problem',
          text: result === null ? ui.failed : problemText(result.problems),
        });
      }
      const url = checkoutTarget(result['url'], window.location.origin);
      if (url === null) {
        tab?.close();
        return setTopup({ at: 'problem', text: ui.failed });
      }
      if (tab === null || tab.closed) return setTopup({ at: 'blocked', url });
      tab.location.href = url;
      setTopup({ at: 'opened' });
    });
  };

  /** One write on the desk; true when it went through (then everything is read again). */
  const act = async (body: Readonly<Record<string, unknown>>): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    const result = await post(body);
    setBusy(false);
    if (result === null || !result.ok) {
      setNotice(result === null ? ui.failed : problemText(result.problems));
      return false;
    }
    await loadOverview();
    if (current !== null) await loadStatement(current, range, true);
    return true;
  };

  const createTeam = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const name = teamName(newName);
    if (name === null) return setNameError(ui.switcher.nameInvalid);
    setNameError(null);
    setBusy(true);
    const result = await post({ action: 'create-team', name });
    setBusy(false);
    if (result === null || !result.ok) {
      return setNameError(result === null ? ui.failed : problemText(result.problems));
    }
    const account = result['account'] as DeskAccount | undefined;
    setCreating(false);
    setNewName('');
    await loadOverview();
    if (account) setCurrent(account.id);
  };

  if (phase.at === 'loading') {
    return (
      <div className="saldo-estado" role="status">
        <LunaEspera /> {ui.loading}
      </div>
    );
  }
  if (phase.at === 'signed-out') {
    return (
      <div className="saldo-marco saldo-fuera" data-saldo-signed-out>
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
  if (phase.at !== 'ready') {
    return (
      <div className="saldo-marco saldo-fallo" role="alert">
        <p>{phase.at === 'not-bound' ? ui.notBound : ui.failed}</p>
        <div>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => {
              setPhase({ at: 'loading' });
              void loadOverview();
            }}
          >
            {ui.retry}
          </button>
        </div>
      </div>
    );
  }

  const account = phase.accounts.find((candidate) => candidate.id === current) ?? null;
  const nameOf = (candidate: DeskAccount): string =>
    candidate.kind === 'personal' ? ui.switcher.personal : (candidate.name ?? candidate.id);

  return (
    <div className="saldo-panel" data-saldo-panel>
      <div className="saldo-cuentas">
        <div className="saldo-elige">
          <label htmlFor="saldo-cuenta" className="etiqueta">
            {ui.switcher.label}
          </label>
          <select
            id="saldo-cuenta"
            value={current ?? ''}
            onChange={(event) => {
              setTopup({ at: 'idle' });
              setNotice(null);
              setCurrent(event.target.value);
            }}
            data-metric="saldo-account"
          >
            {phase.accounts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.kind === 'personal'
                  ? nameOf(candidate)
                  : `${nameOf(candidate)} · ${ui.roles[candidate.role]}`}
              </option>
            ))}
          </select>
        </div>
        {!creating && (
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setCreating(true)}
            data-metric="saldo-new-team"
          >
            + {ui.switcher.newTeam}
          </button>
        )}
      </div>

      {creating && (
        <form
          className="saldo-marco saldo-nueva"
          onSubmit={(event) => void createTeam(event)}
          aria-labelledby="saldo-nueva-t"
        >
          <h2 className="etiqueta" id="saldo-nueva-t">
            {ui.switcher.newTeam}
          </h2>
          <label htmlFor="saldo-nueva-nombre">{ui.switcher.newTeamName}</label>
          <input
            id="saldo-nueva-nombre"
            value={newName}
            maxLength={60}
            autoComplete="organization"
            aria-invalid={nameError !== null}
            aria-describedby="saldo-nueva-nota"
            onChange={(event) => setNewName(event.target.value)}
          />
          <p className={nameError === null ? 'saldo-nota' : 'saldo-mal'} id="saldo-nueva-nota">
            {nameError ?? ui.switcher.newTeamNote}
          </p>
          <div className="saldo-botones">
            <button type="submit" className="btn btn-primario" disabled={busy}>
              {ui.switcher.create}
            </button>
            <button
              type="button"
              className="btn btn-silencioso"
              onClick={() => {
                setCreating(false);
                setNameError(null);
              }}
            >
              {ui.switcher.cancel}
            </button>
          </div>
        </form>
      )}

      <div aria-live="polite">
        {notice !== null && (
          <p className="saldo-mal saldo-aviso" role="alert">
            {notice}
          </p>
        )}
      </div>

      {sheet.at === 'loading' && (
        <div className="saldo-estado" role="status">
          <LunaEspera /> {ui.loading}
        </div>
      )}
      {sheet.at === 'failed' && (
        <div className="saldo-marco saldo-fallo" role="alert">
          <p>{sheet.text}</p>
          <div>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => current !== null && void loadStatement(current, range, false)}
            >
              {ui.retry}
            </button>
          </div>
        </div>
      )}
      {sheet.at === 'ready' && account !== null && (
        <>
          <Balance ui={ui} lang={lang} statement={sheet.statement} range={range} />
          <Topup
            ui={ui}
            lang={lang}
            amount={amount}
            onAmount={(key) => {
              setAmount(key);
              setTopup({ at: 'idle' });
            }}
            onPay={pay}
            state={topup}
          />
          <Usage
            ui={ui}
            lang={lang}
            statement={sheet.statement}
            range={range}
            onRange={setRange}
            now={now}
          />
          <Movements ui={ui} lang={lang} lines={sheet.statement.lines} />
          {account.kind === 'team' && (
            <Team
              key={account.id}
              ui={ui}
              lang={lang}
              account={account}
              members={sheet.statement.members ?? []}
              you={sheet.you}
              busy={busy}
              onRename={(name) => act({ action: 'rename', accountId: account.id, name })}
              onSetMember={(wallet, role: MemberRole) =>
                act({ action: 'set-member', accountId: account.id, wallet, role })
              }
              onRemove={(wallet) => act({ action: 'remove-member', accountId: account.id, wallet })}
            />
          )}
        </>
      )}
    </div>
  );
}
