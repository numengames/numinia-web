/**
 * «La gente»'s desk: what Miembros and Roles share — the organization as the
 * till answers it (GET /api/saldo/roles), one change at a time (POST
 * /api/saldo; the answer is the organization as it is now), the fresh
 * signature that giving «Administrador» or «Gestionar roles» asks for
 * (STD-051 ORG-008: ../saldo/wallet-signature.ts, the very flow Saldo's
 * members tab had) and the till's refusals in plain words.
 *
 * The till decides on every write: the screens only leave out what the
 * person cannot do (lib/panel-people.ts), so no button fails.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ORGANIZATION_PERMISSION_LABELS,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  needsSentence,
  readProblem,
  readResult,
  readRoles,
  readRolesView,
  type DeskRoles,
  type PostResult,
} from '../../lib/accounts';
import { signAct, type Signed } from '../saldo/wallet-signature';

type Sheet =
  | { readonly at: 'loading' }
  | { readonly at: 'failed'; readonly text: string }
  | { readonly at: 'ready'; readonly view: DeskRoles; readonly you: string | null };

/** A sentence for the person: why something did not happen (`alert`), or that it did (`status`). */
interface Notice {
  readonly tone: 'alert' | 'status';
  readonly text: string;
}

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

/** The refusal's words in a 403 body, or null. */
function problemsIn(status: number, json: unknown): string[] | null {
  if (status !== 403 || typeof json !== 'object' || json === null) return null;
  const { problems } = json as { problems?: unknown };
  return Array.isArray(problems) ? problems.map(String) : null;
}

/** A permission's name on screen: the domain's, said again where it still says «ritual». */
export function labelOf(
  permission: OrganizationPermission,
  locale: SupportedLocale,
  words: PeopleMessages,
): string {
  return words.roles.labels[permission] ?? ORGANIZATION_PERMISSION_LABELS[permission][locale];
}

export interface PeopleDesk {
  readonly sheet: Sheet;
  /** A change is on its way: every control that changes something waits. */
  readonly busy: boolean;
  /** The wallet is being asked to sign (ORG-008). */
  readonly signing: boolean;
  readonly notice: Notice | null;
  readonly say: (notice: Notice | null) => void;
  readonly reload: () => Promise<void>;
  /** One change: the organization as it is now, or null (the notice says why). */
  readonly act: (body: Readonly<Record<string, unknown>>) => Promise<DeskRoles | null>;
  /** The person takes themself out: true when the till did it (nothing is read again: they are out). */
  readonly leave: (wallet: string) => Promise<boolean>;
  readonly problemText: (problems: readonly string[]) => string;
}

export function usePeopleDesk(
  org: string,
  ui: SaldoMessages,
  words: PeopleMessages,
  locale: SupportedLocale,
): PeopleDesk {
  const [sheet, setSheet] = useState<Sheet>({ at: 'loading' });
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // Only the newest read of the organization may paint.
  const asked = useRef(0);

  const problemText = useCallback(
    (problems: readonly string[]): string => {
      const { key, act, holders } = readProblem(problems);
      if (key === 'needs' && act !== undefined) {
        return needsSentence(ui.problems, labelOf(act, locale, words), holders ?? null);
      }
      return key === 'notConfigured' || key === 'needs' ? ui.problems.other : ui.problems[key];
    },
    [ui, words, locale],
  );

  /** Reads the organization again; true when it answered. */
  const read = useCallback(async (): Promise<DeskRoles | null> => {
    const mine = ++asked.current;
    try {
      const response = await fetch(`/api/saldo/roles?cuenta=${encodeURIComponent(org)}`, {
        headers: { accept: 'application/json' },
      });
      const json: unknown = await response.json().catch(() => null);
      if (mine !== asked.current) return null;
      const answered = response.ok ? readRoles(json) : null;
      if (answered !== null) {
        setSheet({ at: 'ready', view: answered.roles, you: answered.you });
        return answered.roles;
      }
      const problems = problemsIn(response.status, json);
      setSheet({ at: 'failed', text: problems === null ? ui.failed : problemText(problems) });
    } catch {
      if (mine === asked.current) setSheet({ at: 'failed', text: ui.failed });
    }
    return null;
  }, [org, ui, problemText]);

  const reload = useCallback(async (): Promise<void> => {
    setSheet({ at: 'loading' });
    await read();
  }, [read]);

  useEffect(() => {
    void read();
  }, [read]);

  /** Why the wallet did not sign, in words. */
  const unsigned = useCallback(
    (signed: Extract<Signed, { readonly ok: false }>): string => {
      if (signed.problem === 'no-wallet') return ui.panel.noWallet;
      if (signed.problem === 'other-wallet') return ui.panel.otherWallet;
      if (signed.problem === 'declined') return ui.panel.declined;
      return signed.problems === undefined ? ui.failed : problemText(signed.problems);
    },
    [ui, problemText],
  );

  const act = useCallback(
    async (body: Readonly<Record<string, unknown>>): Promise<DeskRoles | null> => {
      if (busy || sheet.at !== 'ready') return null;
      setBusy(true);
      setNotice(null);
      const request = { ...body, accountId: org };
      let result = await post(request);
      // ORG-008: what gives «Administrador» or «Gestionar roles» asks the
      // wallet to sign this very act, and goes again with the proof.
      if (result !== null && !result.ok && readProblem(result.problems).key === 'freshSignature') {
        setSigning(true);
        const signed = await signAct(request, locale, sheet.you);
        setSigning(false);
        if (!signed.ok) {
          setBusy(false);
          setNotice({ tone: 'alert', text: unsigned(signed) });
          return null;
        }
        result = await post({ ...request, fresh: signed.proof });
      }
      if (result === null || !result.ok) {
        setBusy(false);
        setNotice({
          tone: 'alert',
          text: result === null ? ui.failed : problemText(result.problems),
        });
        return null;
      }
      const view = readRolesView(result);
      // Adding or taking out a person answers the people, not the organization: read it again.
      const now = view ?? (await read());
      if (view !== null) setSheet({ at: 'ready', view, you: sheet.you });
      setBusy(false);
      if (now === null) setNotice({ tone: 'alert', text: ui.failed });
      return now;
    },
    [busy, sheet, org, locale, ui, problemText, unsigned, read],
  );

  const leave = useCallback(
    async (wallet: string): Promise<boolean> => {
      if (busy || sheet.at !== 'ready') return false;
      setBusy(true);
      setNotice(null);
      const result = await post({ action: 'remove-member', accountId: org, wallet });
      if (result !== null && result.ok) return true;
      setBusy(false);
      setNotice({
        tone: 'alert',
        text: result === null ? ui.failed : problemText(result.problems),
      });
      return false;
    },
    [busy, sheet, org, ui, problemText],
  );

  return { sheet, busy, signing, notice, say: setNotice, reload, act, leave, problemText };
}
