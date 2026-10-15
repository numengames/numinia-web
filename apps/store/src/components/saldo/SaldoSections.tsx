/**
 * «Saldo»'s sections, drawn from what the till answered: the balance, the
 * top-up, usage per day or month, the movements and, for an organization,
 * its team. Presentational only — SaldoPanel holds the state and asks the
 * API; these components get values and callbacks.
 */

import { useState, type SyntheticEvent } from 'react';
import {
  ORGANIZATION_PERMISSION_LABELS,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  SPEND_RANGES,
  TOPUP_KEYS,
  can,
  chartBars,
  fill,
  formatAt,
  formatBucket,
  formatEuros,
  formatTopup,
  holdersOf,
  lineLabel,
  needsSentence,
  shortWallet,
  signedEuros,
  spendSeries,
  walletOf,
  type DeskAccess,
  type DeskAccount,
  type DeskLine,
  type DeskMember,
  type DeskStatement,
  type MemberRole,
  type SpendRange,
  type TopupKey,
} from '../../lib/accounts';

export type TopupState =
  | { readonly at: 'idle' }
  | { readonly at: 'opening' }
  | { readonly at: 'opened' }
  | { readonly at: 'blocked'; readonly url: string }
  | { readonly at: 'problem'; readonly text: string };

export function Balance({
  ui,
  lang,
  statement,
  range,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly statement: DeskStatement;
  readonly range: SpendRange;
}) {
  return (
    <section className="saldo-cifras" aria-labelledby="saldo-cifra-t">
      <div className="saldo-marco saldo-grande">
        <p className="etiqueta" id="saldo-cifra-t">
          {ui.balance.label}
        </p>
        <p className="saldo-cifra mono" data-saldo-balance>
          {formatEuros(statement.balanceCents, lang)}
        </p>
        {statement.lowBalance && (
          <p className="saldo-bajo" data-saldo-low>
            <strong>{ui.balance.low}</strong> · {ui.balance.lowNote}
          </p>
        )}
      </div>
      <div className="saldo-marco">
        <p className="etiqueta">{ui.balance.spent}</p>
        <p className="saldo-cifra-m mono" data-saldo-spent>
          {formatEuros(statement.spendTotalCents, lang)}
        </p>
        <p className="saldo-nota">{fill(ui.balance.spentOf, { range: ui.usage.ranges[range] })}</p>
      </div>
    </section>
  );
}

export function Topup({
  ui,
  lang,
  amount,
  onAmount,
  onPay,
  state,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly amount: TopupKey;
  readonly onAmount: (key: TopupKey) => void;
  readonly onPay: () => void;
  readonly state: TopupState;
}) {
  return (
    <section className="saldo-seccion" aria-labelledby="saldo-recarga-t">
      <h2 className="etiqueta" id="saldo-recarga-t">
        {ui.topup.title}
      </h2>
      <div className="saldo-marco">
        <p className="saldo-nota">{ui.topup.note}</p>
        <p className="saldo-nota" data-saldo-seller>
          {ui.topup.seller}
        </p>
        <div className="saldo-importes" role="group" aria-label={ui.topup.amounts}>
          {TOPUP_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="saldo-importe mono"
              aria-pressed={amount === key}
              onClick={() => onAmount(key)}
              data-metric={`saldo-amount-${key}`}
            >
              +{formatTopup(key, lang)}
            </button>
          ))}
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primario"
            onClick={onPay}
            disabled={state.at === 'opening'}
            data-metric="saldo-pay"
          >
            {state.at === 'opening' ? ui.topup.opening : ui.topup.pay}
          </button>
        </div>
        <div aria-live="polite" className="saldo-vivo">
          {state.at === 'opened' && (
            <p className="saldo-hecho" data-saldo-opened>
              <strong>{ui.topup.opened}</strong> · {ui.topup.openedNote}
            </p>
          )}
          {state.at === 'blocked' && (
            <p className="saldo-hecho">
              {ui.topup.blocked}{' '}
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                data-metric="saldo-open-stripe"
              >
                {ui.topup.openLink}
              </a>
            </p>
          )}
          {state.at === 'problem' && <p className="saldo-mal">{state.text}</p>}
        </div>
      </div>
    </section>
  );
}

const CHART_W = 600;
const CHART_H = 160;

export function Usage({
  ui,
  lang,
  statement,
  range,
  onRange,
  now,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly statement: DeskStatement;
  readonly range: SpendRange;
  readonly onRange: (range: SpendRange) => void;
  readonly now: Date;
}) {
  const series = spendSeries(statement.spend, range, now);
  const bars = chartBars(series, CHART_W, CHART_H);
  const total = formatEuros(statement.spendTotalCents, lang);
  const ticks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  return (
    <section className="saldo-seccion" aria-labelledby="saldo-uso-t">
      <div className="saldo-cabeza">
        <h2 className="etiqueta" id="saldo-uso-t">
          {ui.usage.title}
        </h2>
        <div className="saldo-rangos" role="group" aria-label={ui.usage.rangeLabel}>
          {SPEND_RANGES.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={range === key}
              onClick={() => onRange(key)}
              data-metric={`saldo-range-${key}`}
            >
              {ui.usage.ranges[key]}
            </button>
          ))}
        </div>
      </div>
      <div className="saldo-marco">
        {statement.spendTotalCents === 0 ? (
          <p className="saldo-nota" data-saldo-usage-empty>
            {ui.usage.empty}
          </p>
        ) : (
          <figure className="saldo-grafica">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={fill(range === '12m' ? ui.usage.chartMonths : ui.usage.chartDays, {
                total,
              })}
              data-saldo-chart
            >
              <line x1="0" y1={CHART_H - 0.5} x2={CHART_W} y2={CHART_H - 0.5} className="eje" />
              {bars.map((bar) => (
                <rect
                  key={bar.bucket}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx="2"
                >
                  <title>{`${formatBucket(bar.bucket, lang)} · ${formatEuros(bar.cents, lang)}`}</title>
                </rect>
              ))}
            </svg>
            <figcaption className="saldo-ejes mono" aria-hidden="true">
              {ticks.map((index, i) => (
                <span key={i}>{formatBucket(series[index]?.bucket ?? '', lang)}</span>
              ))}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}

function lineDetail(ui: SaldoMessages, line: DeskLine, lang: string): string | null {
  if (line.kind === 'world_day' && line.worldId) {
    return fill(ui.lines.world, { world: line.worldId, size: line.size ?? '' });
  }
  if (line.kind === 'topup' && typeof line.vatCents === 'number') {
    return fill(ui.lines.vat, { v: formatEuros(line.vatCents, lang) });
  }
  return line.reason ?? null;
}

export function Movements({
  ui,
  lang,
  lines,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly lines: readonly DeskLine[];
}) {
  return (
    <section className="saldo-seccion" aria-labelledby="saldo-mov-t">
      <h2 className="etiqueta" id="saldo-mov-t">
        {ui.lines.title}
      </h2>
      {lines.length === 0 ? (
        <p className="saldo-nota">{ui.lines.empty}</p>
      ) : (
        <div
          className="saldo-tabla"
          tabIndex={0}
          role="region"
          aria-labelledby="saldo-mov-t"
          data-saldo-lines
        >
          <table>
            <thead>
              <tr>
                <th scope="col">{ui.lines.when}</th>
                <th scope="col">{ui.lines.what}</th>
                <th scope="col" className="num">
                  {ui.lines.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const detail = lineDetail(ui, line, lang);
                return (
                  <tr key={`${line.at}-${i}`}>
                    <td className="mono saldo-fecha">{formatAt(line.at, lang)}</td>
                    <td>
                      {ui.lines.labels[lineLabel(line.kind)]}
                      {detail !== null && <span className="saldo-detalle">{detail}</span>}
                    </td>
                    <td className={`num mono ${line.amountCents > 0 ? 'mas' : ''}`}>
                      {signedEuros(line.amountCents, lang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Team({
  ui,
  lang,
  account,
  members,
  you,
  access,
  locale,
  busy,
  onRename,
  onSetMember,
  onRemove,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly account: DeskAccount;
  readonly members: readonly DeskMember[];
  readonly you: string | null;
  /** What the wallet may do here; null when the till did not say (the till still decides). */
  readonly access: DeskAccess | null;
  readonly locale: SupportedLocale;
  readonly busy: boolean;
  readonly onRename: (name: string) => Promise<boolean>;
  readonly onSetMember: (wallet: string, role: MemberRole) => Promise<boolean>;
  readonly onRemove: (wallet: string) => Promise<boolean>;
}) {
  const mayRename = can(access, 'manage-organization');
  const mayInvite = can(access, 'invite-members');
  const mayRole = can(access, 'manage-roles');
  const mayRemove = can(access, 'remove-members');
  // A column of buttons only when the wallet may press one of them.
  const mayAct = mayRole || mayRemove || members.some((member) => member.wallet === you);
  const refusal = (act: OrganizationPermission): string =>
    needsSentence(
      ui.problems,
      ORGANIZATION_PERMISSION_LABELS[act][locale],
      holdersOf(access, act, lang),
    );
  const [name, setName] = useState(account.name ?? '');
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState('');
  const [addError, setAddError] = useState(false);

  const rename = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    if (await onRename(name)) setRenaming(false);
  };
  const add = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const wallet = walletOf(adding);
    setAddError(wallet === null);
    if (wallet !== null && (await onSetMember(wallet, 'member'))) setAdding('');
  };

  return (
    <section className="saldo-seccion" aria-labelledby="saldo-equipo-t" data-saldo-team>
      <div className="saldo-cabeza">
        <h2 className="etiqueta" id="saldo-equipo-t">
          {ui.team.title}
        </h2>
        {mayRename && !renaming && (
          <button
            type="button"
            className="btn btn-silencioso"
            onClick={() => setRenaming(true)}
            data-metric="saldo-rename"
          >
            {ui.team.rename}
          </button>
        )}
      </div>
      {renaming && (
        <form className="saldo-linea-form" onSubmit={(event) => void rename(event)}>
          <label htmlFor="saldo-nombre">{ui.team.renameLabel}</label>
          <input
            id="saldo-nombre"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn btn-fantasma" disabled={busy}>
            {ui.team.save}
          </button>
          <button type="button" className="btn btn-silencioso" onClick={() => setRenaming(false)}>
            {ui.switcher.cancel}
          </button>
        </form>
      )}
      <div className="saldo-tabla" tabIndex={0} role="region" aria-label={ui.team.members}>
        <table>
          <thead>
            <tr>
              <th scope="col">{ui.team.wallet}</th>
              <th scope="col">{ui.team.role}</th>
              <th scope="col">{ui.team.since}</th>
              {mayAct && (
                <th scope="col">
                  <span className="sr-only">{ui.team.members}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const who = shortWallet(member.wallet);
              const other = member.role === 'admin' ? 'member' : 'admin';
              const toggle = other === 'admin' ? ui.team.makeAdmin : ui.team.makeMember;
              return (
                <tr key={member.wallet}>
                  <td className="mono">
                    {who}
                    {member.wallet === you && <span className="saldo-tu"> ({ui.team.you})</span>}
                  </td>
                  <td>{ui.roles[member.role]}</td>
                  <td className="mono saldo-fecha">
                    {new Date(member.addedAt).toLocaleDateString(lang, { dateStyle: 'medium' })}
                  </td>
                  {mayAct && (
                    <td className="saldo-acciones">
                      {mayRole && member.wallet !== you && (
                        <button
                          type="button"
                          className="btn btn-silencioso"
                          disabled={busy}
                          aria-label={fill(ui.team.actionOn, { action: toggle, who })}
                          onClick={() => void onSetMember(member.wallet, other)}
                          data-metric="saldo-member-role"
                        >
                          {toggle}
                        </button>
                      )}
                      {(mayRemove || member.wallet === you) && (
                        <button
                          type="button"
                          className="btn btn-silencioso saldo-quitar"
                          disabled={busy}
                          aria-label={fill(ui.team.actionOn, {
                            action: member.wallet === you ? ui.team.leave : ui.team.remove,
                            who,
                          })}
                          onClick={() => void onRemove(member.wallet)}
                          data-metric="saldo-member-remove"
                        >
                          {member.wallet === you ? ui.team.leave : ui.team.remove}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {mayInvite ? (
        <form className="saldo-linea-form" onSubmit={(event) => void add(event)}>
          <label htmlFor="saldo-nuevo">{ui.team.addLabel}</label>
          <input
            id="saldo-nuevo"
            className="mono"
            value={adding}
            spellCheck={false}
            autoComplete="off"
            placeholder="0x…"
            aria-invalid={addError}
            aria-describedby={addError ? 'saldo-nuevo-mal' : undefined}
            onChange={(event) => setAdding(event.target.value)}
          />
          <button
            type="submit"
            className="btn btn-fantasma"
            disabled={busy}
            data-metric="saldo-member-add"
          >
            {ui.team.add}
          </button>
          {addError && (
            <p className="saldo-mal" id="saldo-nuevo-mal">
              {ui.team.walletInvalid}
            </p>
          )}
        </form>
      ) : (
        <p className="saldo-nota" data-saldo-no-invite>
          {refusal('invite-members')}
        </p>
      )}
      <div className="saldo-marco">
        <p className="etiqueta">{ui.team.perMember}</p>
        <p className="saldo-nota">{ui.team.perMemberEmpty}</p>
      </div>
    </section>
  );
}
