/**
 * «Saldo y consumo»'s sections, drawn from what the till answered (cut
 * 2026-10-16 «el dinero», the shape of the prototype's saldoHTML): three
 * cards — the balance with how long it lasts and the top-up, this month, the
 * low-balance warning —, usage with each day stacked running over stopped
 * and a table of worlds, the movements with the balance after each line and
 * their CSV made in the browser, the rules in sight and, for an
 * organization, the way to «Miembros y roles». Presentational only —
 * SaldoPanel holds the state and asks the API; what a till before this cut
 * does not send is not drawn.
 */

import { BASE_ROLE_NAME } from '@numinia/domain';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  LOW_BALANCE_CENTS,
  SPEND_RANGES,
  TOPUP_KEYS,
  chartBars,
  fill,
  formatBucket,
  formatEuros,
  formatTopup,
  hasCosts,
  lineLabel,
  signedEuros,
  spendSeries,
  warnsLowBalance,
  type DeskAccess,
  type DeskLine,
  type DeskStatement,
  type DeskTariff,
  type SpendRange,
  type TopupKey,
} from '../../lib/accounts';
import {
  csvFileName,
  csvText,
  hoursAndMinutes,
  lineDay,
  runningBalances,
  runwayOf,
  sizesOf,
  splitSeries,
  stackedBars,
  topupRoles,
  worldBars,
  worldsTotal,
  type Runway,
} from '../../lib/saldo-view';

export type TopupState =
  | { readonly at: 'idle' }
  | { readonly at: 'opening' }
  | { readonly at: 'opened' }
  | { readonly at: 'blocked'; readonly url: string }
  | { readonly at: 'problem'; readonly text: string };

/** The top-up as the balance card holds it: the amount chosen, Stripe's state, and the two acts. */
export interface TopupControls {
  readonly amount: TopupKey;
  readonly onAmount: (key: TopupKey) => void;
  readonly onPay: () => void;
  readonly state: TopupState;
}

/** Whole euros, as the threshold of the warning is said: «10 €». */
function wholeEuros(cents: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** A UTC day as a person reads it: «14 oct», with the year when it is not this one. */
function dayText(day: string, lang: string, year: number): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(lang, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    ...(day.startsWith(String(year)) ? {} : { year: 'numeric' }),
  });
}

function runwayText(ui: SaldoMessages, runway: Runway): string | null {
  if (runway.kind === 'empty') return null;
  if (runway.kind === 'still') return ui.kpis.runwayStill;
  if (runway.days === 0) return ui.kpis.runwayLess;
  return runway.days === 1 ? ui.kpis.runwayOne : fill(ui.kpis.runway, { n: runway.days });
}

function TopupForm({
  ui,
  lang,
  controls,
  secondary,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly controls: TopupControls;
  /** On an account that spends nothing: a short line first, and the pay button a ghost, not the screen's primary act. */
  readonly secondary: boolean;
}) {
  const { amount, onAmount, onPay, state } = controls;
  return (
    <div className="saldo-recarga" data-saldo-topup={secondary ? 'secondary' : 'primary'}>
      {secondary && (
        <p className="saldo-nota" data-saldo-optional>
          {ui.topup.optional}
        </p>
      )}
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
          className={secondary ? 'btn btn-fantasma' : 'btn btn-primario'}
          onClick={onPay}
          disabled={state.at === 'opening'}
          data-metric="saldo-pay"
        >
          {state.at === 'opening' ? ui.topup.opening : ui.topup.pay}
        </button>
      </div>
      <p className="saldo-nota saldo-letra" data-saldo-seller>
        {ui.topup.seller}
      </p>
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
  );
}

/**
 * The three cards at the top: the balance (how long it lasts at the pace of
 * the last 7 complete days, and the top-up for whoever may top up), this
 * month (only from a till that sends its pace) and the low-balance warning.
 */
export function Kpis({
  ui,
  lang,
  statement,
  topup,
  noTopup,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly statement: DeskStatement;
  /** The top-up, for whoever may top up; null puts `noTopup` in its place. */
  readonly topup: TopupControls | null;
  /** Who may top up, said to whoever may not. */
  readonly noTopup: string;
}) {
  const { pace, tariff } = statement;
  const costs = hasCosts(statement);
  const runway = runwayOf(statement.balanceCents, pace);
  const lasts = runway === null || !costs ? null : runwayText(ui, runway);
  const worlds =
    pace === undefined
      ? ''
      : pace.monthWorlds === 0
        ? ui.kpis.monthWorldsNone
        : pace.monthWorlds === 1
          ? ui.kpis.monthWorldsOne
          : fill(ui.kpis.monthWorlds, { n: pace.monthWorlds });
  return (
    <div className="saldo-kpis" data-saldo-kpis>
      <section
        className="tarjeta saldo-kpi saldo-kpi-saldo"
        aria-labelledby="saldo-kpi-saldo-t"
        data-saldo-kpi="balance"
      >
        <h2 className="etiqueta" id="saldo-kpi-saldo-t">
          {ui.balance.label}
        </h2>
        <p className="saldo-kpi-valor mono" data-saldo-balance>
          {formatEuros(statement.balanceCents, lang)}
        </p>
        {lasts !== null && (
          <p className="saldo-nota" data-saldo-runway>
            {lasts}
          </p>
        )}
        {!costs && (
          <p className="saldo-nota" data-saldo-free>
            {statement.account.kind === 'personal' ? ui.balance.freePersonal : ui.balance.free}
          </p>
        )}
        {warnsLowBalance(statement) && (
          <p className="saldo-bajo" data-saldo-low>
            <strong>{ui.balance.low}</strong> · {ui.balance.lowNote}
          </p>
        )}
        {topup === null ? (
          <p className="saldo-nota" data-saldo-no-topup>
            {noTopup}
          </p>
        ) : (
          <TopupForm ui={ui} lang={lang} controls={topup} secondary={!costs} />
        )}
      </section>
      {pace !== undefined && (
        <section
          className="tarjeta saldo-kpi"
          aria-labelledby="saldo-kpi-mes-t"
          data-saldo-kpi="month"
        >
          <h2 className="etiqueta" id="saldo-kpi-mes-t">
            {ui.kpis.month}
          </h2>
          <p className="saldo-kpi-valor mono" data-saldo-month>
            {formatEuros(pace.monthCents, lang)}
          </p>
          <p className="saldo-nota" data-saldo-month-worlds>
            {worlds}
          </p>
        </section>
      )}
      <section
        className="tarjeta saldo-kpi"
        aria-labelledby="saldo-kpi-aviso-t"
        data-saldo-kpi="low"
      >
        <h2 className="etiqueta" id="saldo-kpi-aviso-t">
          {ui.kpis.low}
        </h2>
        <p className="saldo-kpi-valor mono">{wholeEuros(LOW_BALANCE_CENTS, lang)}</p>
        <p className="saldo-nota">{ui.kpis.lowWhen}</p>
        {tariff !== undefined && (
          <p className="saldo-nota" data-saldo-keep>
            {fill(ui.kpis.lowKeep, { n: tariff.rules.keepDaysAtZero })}
          </p>
        )}
      </section>
    </div>
  );
}

const CHART_W = 600;
const CHART_H = 160;
const WORLDS_CHART_H = 120;

/**
 * Usage per day or month: from a till of this cut, each bar stacked running
 * (at its base) over stopped, its title telling both halves, a legend and a
 * table of the worlds of the period; from an older one, one colour, no table.
 */
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
  const split = splitSeries(statement.spend, range, now);
  const series = split ?? spendSeries(statement.spend, range, now);
  const total = formatEuros(statement.spendTotalCents, lang);
  const ticks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const head =
    range === '12m' ? ui.usage.headMonths : fill(ui.usage.headDays, { n: range === '7d' ? 7 : 30 });
  const label = fill(range === '12m' ? ui.usage.chartMonths : ui.usage.chartDays, { total });
  const worlds = statement.worlds ?? [];
  return (
    <section className="saldo-seccion" aria-labelledby="saldo-uso-t" data-saldo-usage>
      <div className="saldo-cabeza">
        <div className="saldo-cabeza-texto">
          <p className="etiqueta">{ui.usage.title}</p>
          <h2 id="saldo-uso-t">{head}</h2>
          <p className="saldo-nota">{ui.usage.closes}</p>
        </div>
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
        <div className="saldo-uso-pie">
          <p className="saldo-nota">
            {ui.balance.spent} ·{' '}
            <span className="mono saldo-gastado" data-saldo-spent>
              {total}
            </span>
          </p>
          {split !== null && statement.spendTotalCents > 0 && (
            <p className="saldo-leyenda" data-saldo-legend>
              <span>
                <i className="saldo-muestra saldo-muestra-encendida" aria-hidden="true" />
                {ui.usage.running}
              </span>
              <span>
                <i className="saldo-muestra saldo-muestra-apagada" aria-hidden="true" />
                {ui.usage.stopped}
              </span>
            </p>
          )}
        </div>
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
              aria-label={label}
              data-saldo-chart
              data-saldo-stacked={split === null ? undefined : ''}
            >
              <line x1="0" y1={CHART_H - 0.5} x2={CHART_W} y2={CHART_H - 0.5} className="eje" />
              {split === null
                ? chartBars(series, CHART_W, CHART_H).map((bar) => (
                    <rect
                      key={bar.bucket}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      rx="2"
                      data-saldo-bar
                    >
                      <title>{`${formatBucket(bar.bucket, lang)} · ${formatEuros(bar.cents, lang)}`}</title>
                    </rect>
                  ))
                : stackedBars(split, CHART_W, CHART_H).map((bar) => (
                    <g key={bar.bucket} data-saldo-bar>
                      <title>
                        {fill(ui.usage.bar, {
                          when: formatBucket(bar.bucket, lang),
                          total: formatEuros(bar.cents, lang),
                          running: formatEuros(bar.runningCents, lang),
                          stopped: formatEuros(bar.stoppedCents, lang),
                        })}
                      </title>
                      <rect
                        className="saldo-encendida"
                        x={bar.x}
                        y={bar.runningY}
                        width={bar.width}
                        height={bar.runningHeight}
                      />
                      <rect
                        className="saldo-apagada"
                        x={bar.x}
                        y={bar.stoppedY}
                        width={bar.width}
                        height={bar.stoppedHeight}
                      />
                    </g>
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
      {worlds.length > 0 && (
        <div className="saldo-mundos" data-saldo-worlds-chart>
          <div className="saldo-cabeza-texto">
            <h3 className="etiqueta">{ui.usage.worlds}</h3>
          </div>
          <div className="saldo-mundos-cuerpo">
            <figure className="saldo-grafica saldo-mundos-grafica">
              <svg
                viewBox={`0 0 ${CHART_W} ${WORLDS_CHART_H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={fill(ui.usage.worldsChartLabel, {
                  total: formatEuros(worldsTotal(worlds), lang),
                })}
                data-saldo-worlds-bars
              >
                <line
                  x1="0"
                  y1={WORLDS_CHART_H - 0.5}
                  x2={CHART_W}
                  y2={WORLDS_CHART_H - 0.5}
                  className="eje"
                />
                {worldBars(worlds, CHART_W, WORLDS_CHART_H).map((bar) => (
                  <rect
                    key={bar.worldId}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx="2"
                    data-saldo-world-bar
                  >
                    <title>{`${bar.worldId} · ${formatEuros(bar.cents, lang)}`}</title>
                  </rect>
                ))}
              </svg>
            </figure>
            <div
              className="saldo-tabla"
              tabIndex={0}
              role="region"
              aria-label={ui.usage.worlds}
              data-saldo-worlds
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">{ui.usage.world}</th>
                    <th scope="col">{ui.usage.size}</th>
                    <th scope="col" className="num">
                      {ui.usage.daysRunning}
                    </th>
                    <th scope="col" className="num">
                      {ui.usage.amount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {worlds.map((world) => (
                    <tr key={world.worldId}>
                      <td>{world.worldId}</td>
                      <td className="mono">{world.size}</td>
                      <td className="num mono">{world.daysRunning}</td>
                      <td className="num mono">{formatEuros(world.cents, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function duration(ui: SaldoMessages, minutes: number): string {
  const { hours, minutes: rest } = hoursAndMinutes(minutes);
  return rest === 0
    ? fill(ui.lines.hours, { h: hours })
    : fill(ui.lines.hoursMinutes, { h: hours, m: rest });
}

/** What a line says beside its kind: a world and its minutes, a top-up's VAT, a correction's reason. */
function lineDetail(ui: SaldoMessages, line: DeskLine, lang: string): string {
  if (line.kind === 'world_day' && line.worldId) {
    const where = line.size
      ? fill(ui.lines.world, { world: line.worldId, size: line.size })
      : line.worldId;
    const { minutesRunning: on, minutesStopped: off } = line;
    return typeof on === 'number' && typeof off === 'number'
      ? `${where} · ${fill(ui.lines.minutes, { on: duration(ui, on), off: duration(ui, off) })}`
      : where;
  }
  if (line.kind === 'topup' && typeof line.vatCents === 'number') {
    return fill(ui.lines.vat, { v: formatEuros(line.vatCents, lang) });
  }
  return line.reason ?? '';
}

/**
 * The movements, newest first, each with the balance right after it
 * (counted back from today's: exact for the 100 newest lines the till
 * sends), and the same lines as a CSV made here, in the browser.
 */
export function Movements({
  ui,
  lang,
  statement,
  now,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly statement: DeskStatement;
  readonly now: Date;
}) {
  const { lines } = statement;
  const after = runningBalances(lines, statement.balanceCents);
  const rows = lines.map((line, i) => ({
    line,
    day: lineDay(line),
    what: ui.lines.labels[lineLabel(line.kind)],
    detail: lineDetail(ui, line, lang),
    after: after[i] ?? 0,
  }));
  const year = now.getUTCFullYear();

  const download = (): void => {
    const text = csvText(
      {
        day: ui.lines.day,
        what: ui.lines.what,
        detail: ui.lines.detail,
        amount: ui.lines.amount,
        balance: ui.lines.after,
      },
      rows.map((row) => ({
        day: row.day,
        what: row.what,
        detail: row.detail,
        amountCents: row.line.amountCents,
        balanceCents: row.after,
      })),
    );
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = csvFileName(new Date());
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  return (
    <section className="saldo-seccion" aria-labelledby="saldo-mov-t" data-saldo-movements>
      <div className="saldo-cabeza">
        <div className="saldo-cabeza-texto">
          <p className="etiqueta">{ui.lines.title}</p>
          <h2 id="saldo-mov-t">{ui.lines.head}</h2>
          <p className="saldo-nota">{ui.lines.never}</p>
        </div>
        {rows.length > 0 && (
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={download}
            data-metric="saldo-csv"
          >
            {ui.lines.csv}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="saldo-nota">{ui.lines.empty}</p>
      ) : (
        <>
          <div
            className="saldo-tabla saldo-lineas"
            tabIndex={0}
            role="region"
            aria-labelledby="saldo-mov-t"
            data-saldo-lines
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">{ui.lines.day}</th>
                  <th scope="col">{ui.lines.what}</th>
                  <th scope="col">{ui.lines.detail}</th>
                  <th scope="col" className="num">
                    {ui.lines.amount}
                  </th>
                  <th scope="col" className="num">
                    {ui.lines.after}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`${row.line.at}-${i}`}>
                    <td className="mono saldo-fecha">{dayText(row.day, lang, year)}</td>
                    <td className="saldo-que">{row.what}</td>
                    <td className="saldo-detalle">{row.detail}</td>
                    <td
                      className={`num mono ${row.line.amountCents > 0 ? 'mas' : ''}`}
                      data-saldo-amount
                    >
                      {signedEuros(row.line.amountCents, lang)}
                    </td>
                    <td className="num mono" data-saldo-after>
                      {formatEuros(row.after, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="saldo-nota saldo-pie" data-saldo-lines-note>
            {ui.lines.afterNote}
          </p>
        </>
      )}
    </section>
  );
}

const BASE_NAMES = new Set(Object.values(BASE_ROLE_NAME));

/** Who tops up, as the rules say it; null when the till did not say. */
function whoTopsUp(
  ui: SaldoMessages,
  lang: string,
  personal: boolean,
  access: DeskAccess | null,
): string | null {
  if (personal) return ui.rules.personal;
  const roles = topupRoles(access);
  if (roles === null) return null;
  if (roles.some((name) => BASE_NAMES.has(name))) return ui.rules.everyone;
  if (roles.length === 0) return ui.rules.whoTopsUpOwners;
  const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(roles);
  return fill(ui.rules.whoTopsUp, { roles: list });
}

/** «Las reglas, a la vista»: the tariff in force, to whoever reads this account's statement. */
export function Rules({
  ui,
  lang,
  tariff,
  personal,
  access,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly tariff: DeskTariff;
  readonly personal: boolean;
  readonly access: DeskAccess | null;
}) {
  const who = whoTopsUp(ui, lang, personal, access);
  const since = new Date(`${tariff.startsOn}T00:00:00Z`).toLocaleDateString(lang, {
    timeZone: 'UTC',
    dateStyle: 'long',
  });
  return (
    <section className="saldo-seccion" aria-labelledby="saldo-reglas-t" data-saldo-rules>
      <div className="saldo-cabeza-texto">
        <p className="etiqueta">{ui.rules.label}</p>
        <h2 id="saldo-reglas-t">{ui.rules.title}</h2>
      </div>
      <div className="saldo-marco">
        <ul className="saldo-reglas">
          {sizesOf(tariff).map((price) => (
            <li key={price.size}>
              {fill(ui.rules.size, {
                size: price.size,
                running: formatEuros(price.runningCentsPerDay, lang),
                stopped: formatEuros(price.stoppedCentsPerDay, lang),
              })}
            </li>
          ))}
          <li>{ui.rules.topups}</li>
          <li>{fill(ui.rules.keep, { n: tariff.rules.keepDaysAtZero })}</li>
          <li>{fill(ui.rules.notice, { n: tariff.rules.noticeDaysForRise })}</li>
          {who !== null && <li data-saldo-who>{who}</li>}
        </ul>
        <p className="saldo-nota saldo-pie">{fill(ui.rules.since, { date: since })}</p>
      </div>
    </section>
  );
}

/** Where an organization's people are now: one line, a link to «Miembros y roles». */
export function MembersLink({ ui, href }: { readonly ui: SaldoMessages; readonly href: string }) {
  const [before = '', after = ''] = ui.membersLink.text.split('{link}');
  return (
    <p className="saldo-nota saldo-miembros" data-saldo-members-link>
      {before}
      <a href={href} data-metric="saldo-members-link">
        {ui.membersLink.link}
      </a>
      {after}
    </p>
  );
}
