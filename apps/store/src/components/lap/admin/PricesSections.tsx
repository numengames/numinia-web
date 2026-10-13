/**
 * The price room's sections, top to bottom: the tariff in force, the
 * calculator (its controls and one card per size of the draft), the example
 * fleet's profit, the market, the rules and the history. Presentational:
 * the panel (PricesPanel.tsx) holds the state and passes what changes it.
 */

import { useEffect, useRef, useState } from 'react';
import type { PricesRoomMessages } from '../../../i18n/prices';
import {
  DAYS_PER_MONTH,
  MARGIN_GOAL,
  MONEY_RULES,
  RULE_KEYS,
  daysOfTopup,
  fill,
  formatCents,
  formatDay,
  formatInstant,
  formatMoney,
  formatNumber,
  formatShare,
  grossCents,
  isWallet,
  marginOf,
  newestFirst,
  parseEuros,
  scheduledVersions,
  shortWallet,
  sizeOrder,
  sizeSpec,
  unitCost,
  versionState,
  type Assumptions,
  type DeskVersion,
  type DeskView,
  type DraftForm,
  type FleetProfit,
  type FormProblems,
  type RuleKey,
  type SizeForm,
} from '../../../lib/prices';
import {
  CPU_PROMISED_RANGE,
  MACHINES,
  MARKET,
  OCCUPANCY_RANGE,
  READ_ON,
  TOPUPS_EUR,
} from '../../../lib/prices-data';

type Lang = string | undefined;

/** A size's name as the room says it; a size the catalog does not know keeps its own. */
export function sizeName(key: string, room: PricesRoomMessages): string {
  return room.sizeNames[key] ?? fill(room.otherSize, { k: key });
}

/** Who a size is for: its people at once, the seed's example, or not in the catalog. */
export function sizePeople(key: string, room: PricesRoomMessages): string {
  const spec = sizeSpec(key);
  if (spec === undefined) return room.otherSizeNote;
  return spec.people === null ? room.exampleSize : fill(room.people, { n: spec.people });
}

/** Who published a version: a short wallet, or the seed. */
export function whoText(createdBy: string, room: PricesRoomMessages): string {
  return isWallet(createdBy) ? shortWallet(createdBy) : room.seed;
}

/** A number typed in an input that keeps its own text until it reads, and follows its value. */
export function NumberField({
  value,
  min,
  max,
  step,
  label,
  metric,
  onValue,
  describedBy,
}: {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly label?: string | undefined;
  readonly metric: string;
  readonly onValue: (value: number) => void;
  readonly describedBy?: string | undefined;
}) {
  const [text, setText] = useState(String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(String(value));
    }
  }, [value]);
  const read = Number(text);
  const bad = text.trim() === '' || !Number.isFinite(read) || read < min || read > max;
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      aria-label={label}
      aria-invalid={bad}
      aria-describedby={describedBy}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        const number = Number(next);
        if (next.trim() !== '' && Number.isFinite(number) && number >= min && number <= max) {
          last.current = number;
          onValue(number);
        }
      }}
      data-metric={metric}
    />
  );
}

// ---- En vigor ---------------------------------------------------------------

function PriceCell({ cents, room, lang }: { cents: number; room: PricesRoomMessages; lang: Lang }) {
  return (
    <td>
      <span className="mono">{formatCents(cents, lang)}</span>
      <span className="iva">
        {fill(room.inForce.withVat, { v: formatCents(grossCents(cents), lang) })}
      </span>
    </td>
  );
}

export function InForce({
  view,
  room,
  lang,
}: {
  readonly view: DeskView;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
}) {
  const current = view.versions.find((version) => version.id === view.inForceId) ?? null;
  const next = scheduledVersions(view);
  return (
    <section className="seccion vigor" aria-labelledby="precios-vigor" data-in-force={current?.id}>
      <h2 id="precios-vigor" className="etiqueta">
        {room.inForce.title}
      </h2>
      {current === null ? (
        <p className="estado">{room.inForce.none}</p>
      ) : (
        <div className="marco">
          <p className="cabeza-version">
            <strong>
              {fill(room.inForce.heading, { n: current.id, d: formatDay(current.startsOn, lang) })}
            </strong>
          </p>
          <p className="detalle">
            {fill(room.inForce.by, { who: whoText(current.createdBy, room) })}
          </p>
          <p className="nota-version">{current.basis?.note || room.inForce.noNote}</p>
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th scope="col">{room.inForce.size}</th>
                  <th scope="col">{room.inForce.running}</th>
                  <th scope="col">{room.inForce.stopped}</th>
                  <th scope="col">{room.inForce.month}</th>
                </tr>
              </thead>
              <tbody>
                {sizeOrder(Object.keys(current.sizes)).map((key) => {
                  const price = current.sizes[key];
                  if (price === undefined) return null;
                  return (
                    <tr key={key} data-size={key}>
                      <th scope="row">{sizeName(key, room)}</th>
                      <PriceCell cents={price.runningCentsPerDay} room={room} lang={lang} />
                      <PriceCell cents={price.stoppedCentsPerDay} room={room} lang={lang} />
                      <PriceCell
                        cents={price.runningCentsPerDay * DAYS_PER_MONTH}
                        room={room}
                        lang={lang}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="pista">{room.inForce.vatNote}</p>
        </div>
      )}
      {next.map((version) => (
        <p key={version.id} className="programada" data-scheduled={version.id}>
          {fill(room.inForce.scheduled, { n: version.id, d: formatDay(version.startsOn, lang) })}
        </p>
      ))}
    </section>
  );
}

// ---- Calculadora ----------------------------------------------------------

export function Controls({
  assumptions,
  room,
  lang,
  onChange,
}: {
  readonly assumptions: Assumptions;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly onChange: (patch: Partial<Assumptions>) => void;
}) {
  const words = room.calculator;
  return (
    <div className="controles-calc">
      <label className="control">
        <span>{words.machine}</span>
        <select
          value={assumptions.machine}
          onChange={(event) => onChange({ machine: event.currentTarget.value })}
          data-metric="prices-machine"
        >
          {MACHINES.map((machine) => (
            <option key={machine.key} value={machine.key}>
              {fill(words.machineOption, {
                m: machine.key,
                c: machine.vcores,
                r: machine.ramGb,
                e: formatMoney(machine.eurMonth, lang),
              })}
            </option>
          ))}
        </select>
      </label>
      <label className="control">
        <span>{words.occupancy}</span>
        <span className="deslizador">
          <input
            type="range"
            min={OCCUPANCY_RANGE.min}
            max={OCCUPANCY_RANGE.max}
            step={OCCUPANCY_RANGE.step}
            value={assumptions.occupancyPct}
            onChange={(event) => onChange({ occupancyPct: Number(event.currentTarget.value) })}
            data-metric="prices-occupancy"
          />
          <output className="mono" data-occupancy>
            {formatShare(assumptions.occupancyPct / 100, lang)}
          </output>
        </span>
      </label>
      <label className="control">
        <span>{words.cpu}</span>
        <span className="deslizador">
          <input
            type="range"
            min={CPU_PROMISED_RANGE.min}
            max={CPU_PROMISED_RANGE.max}
            step={CPU_PROMISED_RANGE.step}
            value={assumptions.cpuPromised}
            onChange={(event) => onChange({ cpuPromised: Number(event.currentTarget.value) })}
            data-metric="prices-cpu"
          />
          <output className="mono">×{formatNumber(assumptions.cpuPromised, lang)}</output>
        </span>
      </label>
      <label className="control">
        <span>{words.copies}</span>
        <select
          value={assumptions.copies}
          onChange={(event) =>
            onChange({
              copies: event.currentTarget.value === 'incremental' ? 'incremental' : 'full',
            })
          }
          data-metric="prices-copies"
        >
          <option value="full">{words.copiesFull}</option>
          <option value="incremental">{words.copiesIncremental}</option>
        </select>
      </label>
      <label className="control">
        <span>{words.topup}</span>
        <select
          value={assumptions.topupEur}
          onChange={(event) => onChange({ topupEur: Number(event.currentTarget.value) })}
          data-metric="prices-topup"
        >
          {TOPUPS_EUR.map((amount) => (
            <option key={amount} value={amount}>
              {formatMoney(amount, lang, 0)}
            </option>
          ))}
        </select>
      </label>
      <label className="control">
        <span>{words.seller}</span>
        <select
          value={assumptions.seller}
          onChange={(event) =>
            onChange({ seller: event.currentTarget.value === 'numen' ? 'numen' : 'stripe' })
          }
          data-metric="prices-seller"
        >
          <option value="stripe">{words.sellerStripe}</option>
          <option value="numen">{words.sellerNumen}</option>
        </select>
      </label>
      <label className="control">
        <span>{words.hour}</span>
        <NumberField
          value={assumptions.teamHourEur}
          min={0}
          max={10_000}
          step={5}
          metric="prices-hour"
          onValue={(value) => onChange({ teamHourEur: value })}
        />
      </label>
      <div className="control">
        <span>{words.support}</span>
        <span className="par">
          <NumberField
            value={assumptions.supportMinutes.medium}
            min={0}
            max={10_000}
            step={1}
            label={words.supportMedium}
            metric="prices-support-medium"
            onValue={(value) =>
              onChange({ supportMinutes: { ...assumptions.supportMinutes, medium: value } })
            }
          />
          <span aria-hidden="true">/</span>
          <NumberField
            value={assumptions.supportMinutes.large}
            min={0}
            max={10_000}
            step={1}
            label={words.supportLarge}
            metric="prices-support-large"
            onValue={(value) =>
              onChange({ supportMinutes: { ...assumptions.supportMinutes, large: value } })
            }
          />
        </span>
      </div>
    </div>
  );
}

/** One size of the draft: its two prices (the draft itself), what they mean, what it costs us. */
export function SizeCard({
  sizeKey,
  form,
  bad,
  inUse,
  assumptions,
  topupCents,
  room,
  lang,
  onChange,
}: {
  readonly sizeKey: string;
  readonly form: SizeForm;
  readonly bad: { readonly running: boolean; readonly stopped: boolean } | undefined;
  readonly inUse: boolean;
  readonly assumptions: Assumptions;
  /** The smallest top-up in the draft's rules, gross: what «… de recarga duran» counts. */
  readonly topupCents: number | null;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly onChange: (patch: Partial<SizeForm>) => void;
}) {
  const words = room.card;
  const spec = sizeSpec(sizeKey);
  const name = sizeName(sizeKey, room);
  const running = parseEuros(form.running);
  const cost = spec === undefined || running === null ? null : unitCost(spec, running, assumptions);
  const margin = cost === null || running === null ? null : marginOf(running, cost);
  const reached = margin !== null && margin >= MARGIN_GOAL;
  const lasts = topupCents === null || running === null ? null : daysOfTopup(topupCents, running);
  const dash = '—';
  return (
    <article
      className="tamano"
      data-size={sizeKey}
      data-included={form.included}
      aria-labelledby={`tamano-${sizeKey}`}
    >
      <header className="cabeza-tamano">
        <h3 id={`tamano-${sizeKey}`}>
          {name} <span className="personas">· {sizePeople(sizeKey, room)}</span>
        </h3>
        {spec !== undefined && (
          <p className="pista">
            {fill(words.specs, {
              f: formatNumber(spec.filesGb, lang),
              r: formatNumber(spec.ramReservedGb, lang),
              c: formatNumber(spec.cpuCeiling, lang),
            })}
          </p>
        )}
      </header>
      <div className="precios-par">
        <label className="campo-precio">
          <span>{words.running}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={form.running}
            aria-label={fill(words.runningOf, { name })}
            aria-invalid={bad?.running === true}
            onChange={(event) => onChange({ running: event.currentTarget.value })}
            data-metric="prices-running"
            data-field="running"
          />
        </label>
        <label className="campo-precio">
          <span>{words.stopped}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={form.stopped}
            aria-label={fill(words.stoppedOf, { name })}
            aria-invalid={bad?.stopped === true}
            onChange={(event) => onChange({ stopped: event.currentTarget.value })}
            data-metric="prices-stopped"
            data-field="stopped"
          />
        </label>
      </div>
      {bad !== undefined && (
        <p className="fallo" role="alert" data-bad-amount>
          {words.badAmount}
        </p>
      )}
      <dl className="filas">
        <div className="fila destacada">
          <dt>{words.month}</dt>
          <dd className="mono" data-month>
            {running === null ? dash : formatCents(running * DAYS_PER_MONTH, lang)}
          </dd>
        </div>
        <div className="fila">
          <dt>{words.consumer}</dt>
          <dd className="mono" data-consumer>
            {running === null
              ? dash
              : fill(words.consumerValue, {
                  d: formatCents(grossCents(running), lang),
                  m: formatCents(grossCents(running * DAYS_PER_MONTH), lang),
                })}
          </dd>
        </div>
      </dl>
      {topupCents !== null && running !== null && (
        <p className="fila-frase" data-lasts={lasts ?? 'free'}>
          {lasts === null
            ? words.lastsFree
            : fill(words.lasts, { a: formatMoney(topupCents / 100, lang, 0), n: lasts })}
        </p>
      )}
      {spec === undefined && <p className="fila-frase pista">{words.noModel}</p>}
      {cost !== null && (
        <dl className="filas">
          <div className="fila">
            <dt>{words.cost}</dt>
            <dd className="mono" data-cost>
              {Number.isFinite(cost.total)
                ? fill(words.costValue, { c: formatMoney(cost.total, lang, 3) })
                : dash}
            </dd>
          </div>
          <div className="fila pieza">
            <dt>· {cost.fit > 0 ? fill(words.machine, { n: cost.fit }) : words.machineNone}</dt>
            <dd className="mono" data-piece="machine">
              {Number.isFinite(cost.machine) ? formatMoney(cost.machine, lang, 3) : dash}
            </dd>
          </div>
          <div className="fila pieza">
            <dt>· {words.copies}</dt>
            <dd className="mono" data-piece="copies">
              {formatMoney(cost.copies, lang, 3)}
            </dd>
          </div>
          <div className="fila pieza">
            <dt>· {words.support}</dt>
            <dd className="mono" data-piece="support">
              {formatMoney(cost.support, lang, 3)}
            </dd>
          </div>
          <div className="fila pieza">
            <dt>· {words.stripe}</dt>
            <dd className="mono" data-piece="stripe">
              {formatMoney(cost.stripe, lang, 3)}
            </dd>
          </div>
          <div className="fila margen" data-reached={reached}>
            <dt>{words.margin}</dt>
            <dd data-margin={margin === null ? '' : Math.round(margin * 100)}>
              {margin === null ? (
                dash
              ) : (
                <>
                  <strong className="mono">{formatShare(margin, lang)}</strong>{' '}
                  <span className="marca-margen">
                    · {reached ? words.marginReached : words.marginShort}
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>
      )}
      <label className="interruptor">
        <input
          type="checkbox"
          checked={form.included}
          disabled={inUse && form.included}
          onChange={(event) => onChange({ included: event.currentTarget.checked })}
          data-metric="prices-include"
        />
        <span>{words.inTariff}</span>
      </label>
      {inUse && <p className="pista">{words.inUse}</p>}
      {!form.included && <p className="pista">{words.out}</p>}
    </article>
  );
}

export function Calculator({
  form,
  problems,
  assumptions,
  sizesInUse,
  topupCents,
  loaded,
  room,
  lang,
  onAssumptions,
  onSize,
}: {
  readonly form: DraftForm;
  readonly problems: FormProblems;
  readonly assumptions: Assumptions;
  readonly sizesInUse: readonly string[];
  readonly topupCents: number | null;
  /** The version just taken to the calculator, if any. */
  readonly loaded: number | null;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly onAssumptions: (patch: Partial<Assumptions>) => void;
  readonly onSize: (key: string, patch: Partial<SizeForm>) => void;
}) {
  return (
    <section
      className="seccion calculadora"
      id="precios-calculadora"
      aria-labelledby="precios-calc"
    >
      <h2 id="precios-calc" className="etiqueta">
        {room.calculator.title}
      </h2>
      <p className="nota">{fill(room.calculator.intro, { d: formatDay(READ_ON, lang) })}</p>
      {loaded !== null && (
        <p className="estado llevada" role="status" data-loaded={loaded}>
          {fill(room.history.loaded, { n: loaded })}
        </p>
      )}
      <Controls assumptions={assumptions} room={room} lang={lang} onChange={onAssumptions} />
      <div className="tamanos">
        {sizeOrder(Object.keys(form.sizes)).map((key) => {
          const size = form.sizes[key];
          if (size === undefined) return null;
          return (
            <SizeCard
              key={key}
              sizeKey={key}
              form={size}
              bad={problems.sizes[key]}
              inUse={sizesInUse.includes(key)}
              assumptions={assumptions}
              topupCents={topupCents}
              room={room}
              lang={lang}
              onChange={(patch) => onSize(key, patch)}
            />
          );
        })}
      </div>
      {problems.empty && (
        <p className="fallo" role="alert">
          {room.card.empty}
        </p>
      )}
      <p className="nota">{room.calculator.note}</p>
    </section>
  );
}

// ---- Beneficio al mes -------------------------------------------------------

export function Fleet({
  profit,
  assumptions,
  room,
  lang,
  onAssumptions,
}: {
  readonly profit: FleetProfit;
  readonly assumptions: Assumptions;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly onAssumptions: (patch: Partial<Assumptions>) => void;
}) {
  const words = room.fleet;
  const setEntry = (key: string, patch: { worlds?: number; runningPct?: number }): void => {
    const entry = assumptions.fleet[key] ?? { worlds: 0, runningPct: 100 };
    onAssumptions({ fleet: { ...assumptions.fleet, [key]: { ...entry, ...patch } } });
  };
  const money = (euros: number | null): string => (euros === null ? '—' : formatMoney(euros, lang));
  // A cost is shown as what it takes away; nothing taken away is 0, never «-0».
  const minus = (euros: number | null): number | null =>
    euros === null || euros === 0 ? euros : -euros;
  return (
    <section className="seccion flota" aria-labelledby="precios-flota">
      <h2 id="precios-flota" className="etiqueta">
        {words.title}
      </h2>
      <p className="nota">{words.intro}</p>
      <div className="tabla-envoltura">
        <table className="tabla-flota">
          <thead>
            <tr>
              <th scope="col">{words.size}</th>
              <th scope="col">{words.worlds}</th>
              <th scope="col">{words.running}</th>
              <th scope="col" className="num">
                {words.revenue}
              </th>
            </tr>
          </thead>
          <tbody>
            {profit.lines.map((line) => {
              const name = sizeName(line.key, room);
              return (
                <tr key={line.key} data-fleet={line.key}>
                  <th scope="row">
                    {fill(words.sizeLine, { name, n: sizeSpec(line.key)?.people ?? '?' })}
                  </th>
                  <td>
                    <NumberField
                      value={line.worlds}
                      min={0}
                      max={100_000}
                      step={1}
                      label={fill(words.worldsOf, { name })}
                      metric="prices-fleet-worlds"
                      onValue={(value) => setEntry(line.key, { worlds: Math.round(value) })}
                    />
                  </td>
                  <td>
                    <NumberField
                      value={line.runningPct}
                      min={0}
                      max={100}
                      step={5}
                      label={fill(words.runningOf, { name })}
                      metric="prices-fleet-running"
                      onValue={(value) => setEntry(line.key, { runningPct: value })}
                    />
                  </td>
                  <td className="num mono">
                    {line.priced ? money(line.revenue) : words.notPriced}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="controles-calc">
        <label className="control">
          <span>{words.fixed}</span>
          <NumberField
            value={assumptions.fixedEurMonth}
            min={0}
            max={1_000_000}
            step={5}
            metric="prices-fixed"
            onValue={(value) => onAssumptions({ fixedEurMonth: value })}
          />
        </label>
        <label className="control">
          <span>{words.extras}</span>
          <NumberField
            value={assumptions.extrasEurMonth}
            min={0}
            max={1_000_000}
            step={5}
            metric="prices-extras"
            describedBy="precios-pista-extras"
            onValue={(value) => onAssumptions({ extrasEurMonth: value })}
          />
          <span id="precios-pista-extras" className="pista">
            {words.extrasHint}
          </span>
        </label>
      </div>
      <div className="tabla-envoltura">
        <table className="tabla-beneficio">
          <tbody>
            <tr>
              <th scope="row">{words.revenueLine}</th>
              <td className="num mono" data-line="revenue">
                {money(profit.revenue)}
              </td>
            </tr>
            <tr>
              <th scope="row">
                {profit.machines === null
                  ? fill(words.machinesNone, { m: assumptions.machine })
                  : fill(words.machines, { n: profit.machines, m: assumptions.machine })}
              </th>
              <td className="num mono" data-line="machines">
                {money(minus(profit.machineCost))}
              </td>
            </tr>
            <tr>
              <th scope="row">{words.copies}</th>
              <td className="num mono" data-line="copies">
                {money(minus(profit.copies))}
              </td>
            </tr>
            <tr>
              <th scope="row">{words.support}</th>
              <td className="num mono" data-line="support">
                {money(minus(profit.support))}
              </td>
            </tr>
            <tr>
              <th scope="row">{words.stripe}</th>
              <td className="num mono" data-line="stripe">
                {money(minus(profit.stripe))}
              </td>
            </tr>
            <tr>
              <th scope="row">{words.fixedLine}</th>
              <td className="num mono" data-line="fixed">
                {money(minus(profit.fixed))}
              </td>
            </tr>
            <tr>
              <th scope="row">{words.extrasLine}</th>
              <td className="num mono" data-line="extras">
                {money(minus(profit.extras))}
              </td>
            </tr>
            <tr className="total" data-positive={profit.profit !== null && profit.profit >= 0}>
              <th scope="row">{words.profit}</th>
              <td className="num" data-line="profit" data-profit={profit.profit?.toFixed(2) ?? ''}>
                <strong className="mono">
                  {money(profit.profit)}
                  {profit.share === null ? '' : ` · ${formatShare(profit.share, lang)}`}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="nota">{words.note}</p>
    </section>
  );
}

// ---- Frente al mercado ------------------------------------------------------

export function Market({
  form,
  room,
  lang,
}: {
  readonly form: DraftForm;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
}) {
  const ours = ['small', 'medium', 'large'].flatMap((key) => {
    const size = form.sizes[key];
    const running = size === undefined ? null : parseEuros(size.running);
    const people = sizeSpec(key)?.people ?? null;
    if (size === undefined || !size.included || running === null || people === null) return [];
    return [
      {
        key,
        label: fill(room.market.ours, { name: sizeName(key, room), n: people }),
        eur: (running * DAYS_PER_MONTH) / 100,
        source: null,
      },
    ];
  });
  const rows = [
    ...ours,
    ...MARKET.map((offer) => ({
      key: offer.key,
      label: room.market.offers[offer.key] ?? offer.key,
      eur: offer.eurMonth,
      source: offer.source,
    })),
  ].sort((a, b) => a.eur - b.eur);
  const top = Math.max(1, ...rows.map((row) => row.eur));
  return (
    <section className="seccion mercado" aria-labelledby="precios-mercado">
      <h2 id="precios-mercado" className="etiqueta">
        {room.market.title}
      </h2>
      <p className="nota">{fill(room.market.intro, { d: formatDay(READ_ON, lang) })}</p>
      <div className="tabla-envoltura">
        <table className="tabla-mercado">
          <thead>
            <tr>
              <th scope="col">{room.market.who}</th>
              <th scope="col" className="num">
                {room.market.month}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} data-market={row.key} data-ours={row.source === null}>
                <td>
                  {row.source === null ? (
                    <strong>{row.label}</strong>
                  ) : (
                    <a
                      href={row.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-metric="prices-market-source"
                    >
                      {row.label}
                    </a>
                  )}
                  <span className="barra" aria-hidden="true">
                    <span style={{ width: `${Math.max(2, (row.eur / top) * 100)}%` }} />
                  </span>
                </td>
                <td className="num mono">{formatMoney(row.eur, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- Reglas ---------------------------------------------------------------

export function Rules({
  form,
  bad,
  room,
  onRule,
}: {
  readonly form: DraftForm;
  readonly bad: readonly RuleKey[];
  readonly room: PricesRoomMessages;
  readonly onRule: (key: RuleKey, text: string) => void;
}) {
  return (
    <details className="seccion reglas">
      <summary data-metric="prices-rules">
        <span className="etiqueta">{room.rules.title}</span>
      </summary>
      <p className="nota">{room.rules.intro}</p>
      <div className="lista-reglas">
        {RULE_KEYS.map((key) => {
          const words = room.rules.items[key];
          const wrong = bad.includes(key);
          return (
            <div key={key} className="regla" data-rule={key}>
              <label htmlFor={`precios-regla-${key}`}>{words.label}</label>
              <input
                id={`precios-regla-${key}`}
                type="text"
                inputMode={
                  MONEY_RULES.includes(key) || key === 'quickTopupsCents' ? 'decimal' : 'numeric'
                }
                autoComplete="off"
                value={form.rules[key]}
                aria-invalid={wrong}
                aria-describedby={`precios-regla-${key}-que`}
                onChange={(event) => onRule(key, event.currentTarget.value)}
                data-metric="prices-rule"
              />
              <p id={`precios-regla-${key}-que`} className="pista">
                {words.meaning}
              </p>
              {wrong && <p className="fallo">{room.rules.bad}</p>}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// ---- Historial --------------------------------------------------------------

export function History({
  view,
  room,
  lang,
  onLoad,
}: {
  readonly view: DeskView;
  readonly room: PricesRoomMessages;
  readonly lang: Lang;
  readonly onLoad: (version: DeskVersion) => void;
}) {
  const words = room.history;
  return (
    <section className="seccion historial" aria-labelledby="precios-historial">
      <h2 id="precios-historial" className="etiqueta">
        {words.title}
      </h2>
      {view.versions.length === 0 ? (
        <p className="estado">{words.empty}</p>
      ) : (
        <ol>
          {newestFirst(view.versions).map((version) => {
            const state = versionState(view, version);
            return (
              <li key={version.id} data-version={version.id} data-state={state}>
                <div className="linea-version">
                  <strong>
                    {fill(words.heading, { n: version.id, d: formatDay(version.startsOn, lang) })}
                  </strong>
                  <span className="pildora estado-version" data-state={state}>
                    {words.states[state]}
                  </span>
                </div>
                <p className="detalle">
                  {fill(words.by, {
                    who: whoText(version.createdBy, room),
                    t: formatInstant(version.createdAt, lang),
                  })}
                </p>
                <p className="precios-version">
                  {sizeOrder(Object.keys(version.sizes))
                    .map((key) => {
                      const price = version.sizes[key];
                      return price === undefined
                        ? ''
                        : fill(words.price, {
                            name: sizeName(key, room),
                            r: formatCents(price.runningCentsPerDay, lang),
                            s: formatCents(price.stoppedCentsPerDay, lang),
                          });
                    })
                    .join(' · ')}
                </p>
                <p className="nota-version">{version.basis?.note || words.noNote}</p>
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={() => onLoad(version)}
                  data-metric="prices-history-load"
                >
                  {words.load}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
