/**
 * The price room (MIS-184): asks the session-gated endpoint and shows only
 * what it answers. Without the Oracle rank it shows the refusal, never a price.
 *
 * Top to bottom: the tariff in force; the calculator — its assumptions and
 * one card per size, whose two prices ARE the draft — with each size's cost,
 * margin and an example fleet's profit; the market; the rules; Publish,
 * which checks the draft with the till's desk on every change (the newest
 * answer wins) and schedules it as a dated version; and the history, from
 * which any version can be taken back to the calculator.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PricesRoomMessages } from '../../../i18n/prices';
import {
  addDays,
  assumptionsFrom,
  changesFrom,
  decimalMark,
  draftFrom,
  fill,
  fleetProfit,
  formatDay,
  formFrom,
  nothingChanges,
  readAnswer,
  readCheckAnswer,
  shortWallet,
  versionFor,
  withSizesInUse,
  type Assumptions,
  type DeskVersion,
  type DraftForm,
  type PricesAnswer,
  type RuleKey,
  type SizeForm,
} from '../../../lib/prices';
import { DEFAULT_ASSUMPTIONS } from '../../../lib/prices-data';
import { LunaEspera } from '../../chrome/LunaEspera';
import {
  askDesk,
  PublishDialog,
  PublishSection,
  type CheckState,
  type Snapshot,
} from './PricesPublish';
import { Calculator, Fleet, History, InForce, Market, Rules } from './PricesSections';

export interface PricesLabels {
  readonly forbidden: string;
  readonly forbiddenNote: string;
  readonly signedAs: string;
}

type Panel =
  | { readonly at: 'loading' }
  | { readonly at: 'forbidden' }
  | { readonly at: 'not-bound' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly answer: PricesAnswer };

/** How long the room waits after the last change before asking the desk. */
const CHECK_AFTER_MS = 400;

export function PricesPanel({
  labels,
  room,
  lang,
}: {
  readonly labels: PricesLabels;
  readonly room: PricesRoomMessages;
  /** The page's language, for numbers, money and dates. */
  readonly lang: string;
}) {
  const [panel, setPanel] = useState<Panel>({ at: 'loading' });
  // Each read that answered: a draft is checked again after the desk changed.
  const [reads, setReads] = useState(0);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [check, setCheck] = useState<CheckState>({ at: 'idle' });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState<{ readonly id: number; readonly startsOn: string } | null>(
    null,
  );
  const [loaded, setLoaded] = useState<number | null>(null);
  const asked = useRef(0);
  const mark = useMemo(() => decimalMark(lang), [lang]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/prices', {
        headers: { accept: 'application/json' },
      });
      if (response.status === 403) return setPanel({ at: 'forbidden' });
      const json: unknown = await response.json().catch(() => null);
      const error = (json as { error?: unknown } | null)?.error;
      if (response.status === 503 && error === 'not-bound') return setPanel({ at: 'not-bound' });
      const answer = response.ok ? readAnswer(json) : null;
      if (answer === null) return setPanel({ at: 'failed' });
      setPanel({ at: 'ready', answer });
      setReads((count) => count + 1);
    } catch {
      setPanel({ at: 'failed' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const view = panel.at === 'ready' ? panel.answer.desk : null;

  // The first read opens the draft: the version in force, with the catalog's
  // sizes it does not price yet at their starting prices, from tomorrow.
  useEffect(() => {
    if (view === null || form !== null) return;
    const base =
      view.versions.find((version) => version.id === view.inForceId) ??
      view.versions.at(-1) ??
      null;
    setForm(
      withSizesInUse(formFrom(base, mark, addDays(view.today, 1), '', true), view.sizesInUse),
    );
  }, [view, form, mark]);

  const read = useMemo(
    () => (form === null ? null : draftFrom(form, assumptions)),
    [form, assumptions],
  );
  const draft = read?.draft ?? null;
  const draftKey = draft === null ? null : JSON.stringify(draft);

  // Every change asks the desk again, once the typing stops; only the newest answer counts.
  useEffect(() => {
    if (draftKey === null || panel.at !== 'ready') {
      asked.current += 1;
      setCheck({ at: 'idle' });
      return;
    }
    const mine = (asked.current += 1);
    setCheck({ at: 'checking' });
    const timer = setTimeout(() => {
      void askDesk({ action: 'check', draft: JSON.parse(draftKey) as unknown }).then((answer) => {
        if (mine !== asked.current) return;
        const found =
          answer !== null && answer.status === 200 ? readCheckAnswer(answer.json) : null;
        setCheck(
          found === null
            ? { at: 'failed', key: draftKey, notBound: answer?.status === 503 }
            : { at: 'done', key: draftKey, check: found },
        );
      });
    }, CHECK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [draftKey, panel.at, reads]);

  if (panel.at === 'loading' || (panel.at === 'ready' && form === null)) {
    return (
      <div data-prices-panel>
        <p className="estado">
          <LunaEspera /> {room.loading}
        </p>
      </div>
    );
  }
  if (panel.at === 'forbidden') {
    return (
      <div data-prices-panel>
        <div className="tarjeta refuso" role="note" data-refused>
          <p>
            <strong>{labels.forbidden}</strong>
          </p>
          <p>{labels.forbiddenNote}</p>
        </div>
      </div>
    );
  }
  if (panel.at === 'not-bound') {
    return (
      <div data-prices-panel>
        <div className="estado fallo" role="alert" data-not-bound>
          <p>
            <strong>{room.notBound}</strong>
          </p>
          <p>{room.notBoundNote}</p>
        </div>
      </div>
    );
  }
  if (panel.at === 'failed' || form === null || read === null) {
    return (
      <div data-prices-panel>
        <div className="estado fallo" role="alert" data-failed>
          <p>{room.failed}</p>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => {
              setPanel({ at: 'loading' });
              void load();
            }}
            data-metric="prices-retry"
          >
            {room.retry}
          </button>
        </div>
      </div>
    );
  }

  const desk = panel.answer.desk;
  const wallet = panel.answer.wallet;
  const replaced = draft === null ? null : (versionFor(desk.versions, draft.startsOn) ?? null);
  const changes = draft === null ? null : changesFrom(draft, replaced);
  const nothing = changes !== null && nothingChanges(changes);
  const current = check.at === 'done' && check.key === draftKey ? check.check : null;
  const shownCheck: CheckState =
    check.at === 'done' && check.key !== draftKey ? { at: 'checking' } : check;
  const canPublish =
    draft !== null && current !== null && current.problems.length === 0 && !nothing;
  const profit = fleetProfit(draft?.sizes ?? {}, assumptions);
  const topupRule = draft?.rules.minTopupCents ?? null;

  const setSize = (key: string, patch: Partial<SizeForm>): void =>
    setForm((before) => {
      const size = before?.sizes[key];
      if (!before || !size) return before;
      return { ...before, sizes: { ...before.sizes, [key]: { ...size, ...patch } } };
    });
  const setRule = (key: RuleKey, text: string): void =>
    setForm((before) => before && { ...before, rules: { ...before.rules, [key]: text } });
  const setAssumption = (patch: Partial<Assumptions>): void =>
    setAssumptions((before) => ({ ...before, ...patch }));
  const takeVersion = (version: DeskVersion): void => {
    setForm((before) =>
      withSizesInUse(
        formFrom(
          version,
          mark,
          before?.startsOn ?? addDays(desk.today, 1),
          before?.note ?? '',
          false,
        ),
        desk.sizesInUse,
      ),
    );
    const stored = version.basis?.assumptions;
    if (stored !== undefined) setAssumptions((before) => assumptionsFrom(stored, before));
    setLoaded(version.id);
    document.getElementById('precios-calculadora')?.scrollIntoView({ block: 'start' });
  };

  return (
    <div data-prices-panel>
      <div className="barra-sala">
        <p className="sesion">
          <span className="etiqueta">{labels.signedAs}</span>{' '}
          <span className="mono" data-wallet>
            {wallet === null ? '—' : shortWallet(wallet)}
          </span>
        </p>
      </div>

      <InForce view={desk} room={room} lang={lang} />
      <Calculator
        form={form}
        problems={read.problems}
        assumptions={assumptions}
        sizesInUse={desk.sizesInUse}
        topupCents={topupRule}
        loaded={loaded}
        room={room}
        lang={lang}
        onAssumptions={setAssumption}
        onSize={setSize}
      />
      <Fleet
        profit={profit}
        assumptions={assumptions}
        room={room}
        lang={lang}
        onAssumptions={setAssumption}
      />
      <Market form={form} room={room} lang={lang} />
      <Rules form={form} bad={read.problems.rules} room={room} onRule={setRule} />
      <PublishSection
        room={room}
        lang={lang}
        today={desk.today}
        startsOn={form.startsOn}
        note={form.note}
        draftReady={draft !== null}
        check={shownCheck}
        replaced={replaced}
        nothing={nothing}
        canPublish={canPublish}
        onStartsOn={(day) => setForm((before) => before && { ...before, startsOn: day })}
        onNote={(note) => setForm((before) => before && { ...before, note })}
        onOpen={() => {
          if (draft !== null && current !== null && changes !== null) {
            setSnapshot({ draft, check: current, changes });
          }
        }}
        onReload={() => void load()}
      />
      <History view={desk} room={room} lang={lang} onLoad={takeVersion} />

      {notice !== null && (
        <div className="aviso" data-tono="exito" role="status" data-published={notice.id}>
          <p>{fill(room.published, { n: notice.id, d: formatDay(notice.startsOn, lang) })}</p>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => setNotice(null)}
            data-metric="prices-notice-close"
          >
            {room.publishedClose}
          </button>
        </div>
      )}

      <PublishDialog
        snapshot={snapshot}
        room={room}
        lang={lang}
        onClose={() => setSnapshot(null)}
        onPublished={(version) => {
          setSnapshot(null);
          setNotice({ id: version.id, startsOn: version.startsOn });
          void load();
        }}
        onRefused={() => void load()}
      />
    </div>
  );
}
