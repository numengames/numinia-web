/**
 * The price room's model (MIS-184): the contract with the till's Oracle
 * desk, the calculator ported from the pricing study's prototype
 * (calculadora.html) and model (modelo.py), money in whole cents, VAT for
 * display, the draft the Oracle publishes and what it changes.
 *
 * Pure: no fetch, no env and no zod. The island imports it, and zod in an
 * island breaks the bundle budget, so whatever comes from outside is read
 * by hand. The till holds the real tariff rules (apps/till); `versionFor`
 * and `isRise` here are copies for the fixture desk and for showing what a
 * draft changes before the till is asked.
 */

import {
  DEFAULT_RULES,
  FLEET_SIZES,
  FULL_COPIES_HELD,
  INCREMENTAL_HELD,
  MACHINES,
  MACHINE_SELF,
  READ_ON,
  S3_USD_PER_GB_MONTH,
  SIZE_CATALOG,
  STRIPE,
  TOPUPS_EUR,
  USD_PER_EUR,
  CPU_PROMISED_RANGE,
  OCCUPANCY_RANGE,
  type MachineOffer,
  type SizeSpec,
} from './prices-data';

// ---- The contract with the till's desk (copied exactly) --------------------

/** Prices of one size, net of VAT, whole euro cents per UTC day. */
export interface DeskSizePrice {
  runningCentsPerDay: number;
  stoppedCentsPerDay: number;
}

/** The till's rules (exactly TariffRules in apps/till/src/lib/tariff.ts). */
export interface DeskRules {
  eventBoostCentsPerDay: number;
  minTopupCents: number;
  quickTopupsCents: number[];
  minBalanceDaysRunning: number;
  keepDaysAtZero: number;
  noticeDaysForRise: number;
  lowBalanceDaysDefault: number;
}

/** Why a version was published: a human note and, optionally, the calculator's
 *  assumptions at that moment. The till stores it as given and never interprets
 *  `assumptions`. */
export interface DeskBasis {
  note: string;
  assumptions?: Record<string, unknown>;
}

export interface DeskVersion {
  id: number;
  startsOn: string;
  createdAt: string;
  createdBy: string;
  sizes: Record<string, DeskSizePrice>;
  rules: DeskRules;
  basis: DeskBasis | null;
}

export interface DeskView {
  today: string;
  inForceId: number | null;
  versions: DeskVersion[];
  sizesInUse: string[];
}

export interface DeskDraft {
  startsOn: string;
  sizes: Record<string, DeskSizePrice>;
  rules: DeskRules;
  basis: DeskBasis | null;
}

export interface DeskCheck {
  today: string;
  nextId: number;
  replacedId: number | null;
  isRise: boolean;
  noticeDays: number;
  earliestStart: string;
  problems: string[];
}

export type DeskSchedule = { ok: true; version: DeskVersion } | { ok: false; problems: string[] };

/** The RPC surface of the till's `OracleDesk` entrypoint, as the store calls it. */
export interface OracleDesk {
  read(): Promise<DeskView>;
  check(draft: DeskDraft): Promise<DeskCheck>;
  schedule(draft: DeskDraft, by: string): Promise<DeskSchedule>;
}

/** The rules in the order the room shows them. */
export const RULE_KEYS = [
  'eventBoostCentsPerDay',
  'minTopupCents',
  'quickTopupsCents',
  'minBalanceDaysRunning',
  'keepDaysAtZero',
  'noticeDaysForRise',
  'lowBalanceDaysDefault',
] as const;
export type RuleKey = (typeof RULE_KEYS)[number];

/** The rules counted in euros (the rest are days, and the quick top-ups a list of euros). */
export const MONEY_RULES: readonly RuleKey[] = ['eventBoostCentsPerDay', 'minTopupCents'];

// The till's own words for the problems the desk adds (the contract's list).
export const BASIS_PROBLEM =
  'basis must be a note of at most 500 characters and an object of assumptions, 16 KB in all';
export const BY_PROBLEM = 'by must be a lowercase 0x wallet';
export const MEANWHILE_PROBLEM = 'another version was published meanwhile: read the desk again';
export const NOTE_MAX = 500;

// ---- Reading the room's own answer (no zod in an island) -------------------

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What GET /api/admin/prices answers, read just enough not to trust it blindly. */
export interface PricesAnswer {
  readonly wallet: string | null;
  readonly desk: DeskView;
}

/**
 * The room's GET answer, or null when it is not one. The Worker has already
 * checked the till's answer field by field; this only keeps a wrong body
 * from breaking the page.
 */
export function readAnswer(json: unknown): PricesAnswer | null {
  if (!isRecord(json) || !isRecord(json['desk'])) return null;
  const desk = json['desk'];
  if (
    typeof desk['today'] !== 'string' ||
    !Array.isArray(desk['versions']) ||
    !Array.isArray(desk['sizesInUse']) ||
    !(desk['inForceId'] === null || typeof desk['inForceId'] === 'number')
  ) {
    return null;
  }
  return {
    wallet: typeof json['wallet'] === 'string' ? json['wallet'] : null,
    desk: desk as unknown as DeskView,
  };
}

/** The room's answer to a check: the desk's check, or null when it is not one. */
export function readCheckAnswer(json: unknown): DeskCheck | null {
  if (!isRecord(json) || !isRecord(json['check'])) return null;
  const check = json['check'];
  return typeof check['nextId'] === 'number' &&
    typeof check['earliestStart'] === 'string' &&
    typeof check['isRise'] === 'boolean' &&
    Array.isArray(check['problems'])
    ? (check as unknown as DeskCheck)
    : null;
}

/** The room's answer to a schedule: the version published, or the till's problems; null otherwise. */
export function readScheduleAnswer(json: unknown): DeskSchedule | null {
  if (!isRecord(json) || !isRecord(json['schedule'])) return null;
  const schedule = json['schedule'];
  if (schedule['ok'] === true && isRecord(schedule['version'])) {
    return schedule as unknown as DeskSchedule;
  }
  if (schedule['ok'] === false && Array.isArray(schedule['problems'])) {
    return schedule as unknown as DeskSchedule;
  }
  return null;
}

// ---- UTC days -------------------------------------------------------------

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** True for a real calendar day written YYYY-MM-DD. */
export function isDay(text: string): boolean {
  if (!DAY.test(text)) return false;
  const time = Date.parse(`${text}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === text;
}

/** The UTC day of an instant. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A UTC day moved by whole days. */
export function addDays(day: string, days: number): string {
  return utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

// ---- The tariff's rules (copies of the till's, for the fixture and the room) --

/**
 * The version in force on `day`: the greatest `startsOn` ≤ day, ties broken
 * by the greatest id. Undefined when none has started yet.
 */
export function versionFor(versions: readonly DeskVersion[], day: string): DeskVersion | undefined {
  let best: DeskVersion | undefined;
  for (const version of versions) {
    if (version.startsOn > day) continue;
    if (
      best === undefined ||
      version.startsOn > best.startsOn ||
      (version.startsOn === best.startsOn && version.id > best.id)
    ) {
      best = version;
    }
  }
  return best;
}

/**
 * True when any price in `next` is above the same price in `current`: a
 * size's running or stopped day, or the event boost. A new size is not a
 * rise; rules that are not prices are not either.
 */
export function isRise(
  next: Pick<DeskVersion, 'sizes' | 'rules'>,
  current: Pick<DeskVersion, 'sizes' | 'rules'>,
): boolean {
  if (next.rules.eventBoostCentsPerDay > current.rules.eventBoostCentsPerDay) return true;
  return Object.entries(next.sizes).some(([size, price]) => {
    const before = current.sizes[size];
    return (
      before !== undefined &&
      (price.runningCentsPerDay > before.runningCentsPerDay ||
        price.stoppedCentsPerDay > before.stoppedCentsPerDay)
    );
  });
}

/** How a version stands today: in force, still to come, before, or replaced before it began. */
export type VersionState = 'in-force' | 'scheduled' | 'earlier' | 'replaced';

export function versionState(view: DeskView, version: DeskVersion): VersionState {
  if (version.id === view.inForceId) return 'in-force';
  if (version.startsOn <= view.today) return 'earlier';
  return versionFor(view.versions, version.startsOn)?.id === version.id ? 'scheduled' : 'replaced';
}

/** The versions still to come that will be in force on their day, soonest first. */
export function scheduledVersions(view: DeskView): DeskVersion[] {
  return view.versions
    .filter((version) => versionState(view, version) === 'scheduled')
    .sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1));
}

/** Newest first, as the history lists them. */
export function newestFirst(versions: readonly DeskVersion[]): DeskVersion[] {
  return [...versions].sort((a, b) => b.id - a.id);
}

// ---- Money: whole cents, euros typed by a person, VAT for display ----------

/** Spain's general VAT rate: consumers see prices with it. */
export const VAT_PERCENT = 21;
export const DAYS_PER_MONTH = 30;

const EUROS = /^(\d{1,7})(?:[.,](\d{1,2}))?$/;
const WHOLE = /^\d{1,6}$/;

/**
 * Whole cents from euros typed by a person — «0,20», «0.2», «12» — or null
 * when it is not an amount: empty, negative, not a number, or more than two
 * decimals (0,205 is refused, never rounded).
 */
export function parseEuros(text: string): number | null {
  const match = EUROS.exec(text.trim());
  if (match === null) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

/** A whole number of days typed by a person, or null. */
export function parseWhole(text: string): number | null {
  const trimmed = text.trim();
  return WHOLE.test(trimmed) ? Number(trimmed) : null;
}

/**
 * A list of euro amounts — «10 · 20 · 50 · 100», «10; 20», «10, 20» — as
 * whole cents, or null when any of them is not an amount or the list is
 * empty. A comma between digits is a decimal comma; followed by a space it
 * separates amounts.
 */
export function parseEurosList(text: string): number[] | null {
  const parts = text
    .replace(/,\s+/g, ' ')
    .split(/[\s;·/]+/)
    .filter((part) => part !== '');
  if (parts.length === 0) return null;
  const amounts = parts.map(parseEuros);
  return amounts.every((amount): amount is number => amount !== null) ? amounts : null;
}

/** The decimal mark of a language (`,` in Spanish, `.` in English). */
export function decimalMark(lang: string | undefined): string {
  return (
    new Intl.NumberFormat(lang).formatToParts(1.5).find((part) => part.type === 'decimal')?.value ??
    '.'
  );
}

/** Cents as a person would type them: «0,20»; `compact` drops «,00» («10»). */
export function centsText(cents: number, mark: string, compact = false): string {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  if (compact && rest === 0) return String(whole);
  return `${whole}${mark}${String(rest).padStart(2, '0')}`;
}

/** Net cents with VAT, rounded half up: round_half_up(net × 121 / 100). */
export function grossCents(netCents: number): number {
  return Math.floor((netCents * (100 + VAT_PERCENT) + 50) / 100);
}

/** Euros in a language's own way: «0,20 €», «€0.20». */
export function formatMoney(euros: number, lang: string | undefined, digits = 2): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(euros);
}

export function formatCents(cents: number, lang: string | undefined): string {
  return formatMoney(cents / 100, lang);
}

/** A share as a whole percentage: «71 %». */
export function formatShare(share: number, lang: string | undefined): string {
  return new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(share);
}

/** A plain number in a language's way: «0,5», «1.5». */
export function formatNumber(value: number, lang: string | undefined): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(value);
}

/**
 * Days a top-up lasts a world running: a consumer pays it with VAT, the
 * balance keeps it net, and a day running costs its price. Null when
 * running is free.
 */
export function daysOfTopup(topupCents: number, runningCents: number): number | null {
  if (runningCents <= 0) return null;
  return Math.floor((topupCents * 100) / (runningCents * (100 + VAT_PERCENT)));
}

// ---- Dates for people ------------------------------------------------------

/** A UTC day in long form, as written on the tariff: «14 de octubre de 2026». */
export function formatDay(day: string, lang: string | undefined): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(lang, {
    timeZone: 'UTC',
    dateStyle: 'long',
  });
}

/** When a UTC day begins on the reader's own clock: «14 de octubre de 2026, 2:00». */
export function formatDayStart(day: string, lang: string | undefined, timeZone?: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleString(lang, {
    dateStyle: 'long',
    timeStyle: 'short',
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

/** An instant on the reader's own clock. */
export function formatInstant(iso: string, lang: string | undefined, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

/** A wallet, short: «0x42e6…ca26». */
export function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

/** True when `by` is a wallet (the seed's text is not). */
export function isWallet(text: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(text);
}

/** `{name}` placeholders filled from `values`; unknown ones stay as they are. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

// ---- The calculator --------------------------------------------------------

export type Seller = 'stripe' | 'numen';
export type CopyKind = 'full' | 'incremental';

export interface FleetEntry {
  readonly worlds: number;
  readonly runningPct: number;
}

/** What the calculator assumes; it travels with a published version as its basis. */
export interface Assumptions {
  readonly machine: string;
  readonly occupancyPct: number;
  readonly cpuPromised: number;
  readonly copies: CopyKind;
  readonly topupEur: number;
  readonly seller: Seller;
  readonly teamHourEur: number;
  readonly supportMinutes: { readonly medium: number; readonly large: number };
  readonly fixedEurMonth: number;
  readonly extrasEurMonth: number;
  readonly fleet: Readonly<Record<string, FleetEntry>>;
}

/** The machine an assumption names; the VPS-3 when it names none the room knows. */
export function machineOf(key: string): MachineOffer {
  return MACHINES.find((machine) => machine.key === key) ?? (MACHINES[1] as MachineOffer);
}

export function sizeSpec(key: string): SizeSpec | undefined {
  return SIZE_CATALOG.find((size) => size.key === key);
}

/**
 * Worlds of a size that fit one machine: RAM strict by reservation, CPU by
 * ceiling times the processor promised, disk at typical use.
 */
export function worldsPerMachine(
  machine: MachineOffer,
  size: SizeSpec,
  cpuPromised: number,
): number {
  const byRam = Math.floor((machine.ramGb - MACHINE_SELF.ramGb) / size.ramReservedGb);
  const byCpu = Math.floor(
    ((machine.vcores - MACHINE_SELF.cpu) * cpuPromised) / size.cpuCeiling + 1e-9,
  );
  const byDisk = Math.floor((machine.diskGb - MACHINE_SELF.diskGb) / Math.max(size.usedGb, 0.1));
  return Math.max(0, Math.min(byRam, byCpu, byDisk));
}

/** S3 storage in euros per GB-month, at the ECB's rate. */
export function s3EurPerGbMonth(): number {
  return S3_USD_PER_GB_MONTH.value / USD_PER_EUR.value;
}

/**
 * Stripe's fee on one top-up of `topupEur`. Stripe sells (Managed Payments):
 * card 1.5 % + 0.25 € + 3.5 %. Numen sells, with Stripe: card + the invoice
 * 0.4 % (at most $2) + Stripe Tax 0.5 %.
 */
export function stripeFee(topupEur: number, seller: Seller): number {
  const card = (topupEur * STRIPE.cardPercent.value) / 100 + STRIPE.cardFixedEur.value;
  if (seller === 'stripe') return card + (topupEur * STRIPE.managedPaymentsPercent.value) / 100;
  return (
    card +
    Math.min(
      (topupEur * STRIPE.invoicePercent.value) / 100,
      STRIPE.invoiceCapUsd.value / USD_PER_EUR.value,
    ) +
    (topupEur * STRIPE.taxPercent.value) / 100
  );
}

/** Support minutes a month for a size: the calculator's for medium and large, the catalog's otherwise. */
export function supportMinutesOf(size: SizeSpec, assumptions: Assumptions): number {
  if (size.key === 'medium') return assumptions.supportMinutes.medium;
  if (size.key === 'large') return assumptions.supportMinutes.large;
  return size.supportMinutes;
}

/** What a world of a size costs a day, in euros, piece by piece. */
export interface UnitCost {
  /** Worlds of the size per machine. */
  readonly fit: number;
  readonly machine: number;
  readonly copies: number;
  readonly support: number;
  readonly stripe: number;
  readonly total: number;
}

/**
 * The cost of a world a day: its share of a machine (€ a month over the
 * worlds that fit times the occupancy, over 30 days; Infinity when none
 * fits), its copies (used GB × copies held × S3 €/GB-month / 30), its
 * support (minutes / 60 × the team's hour / 30) and Stripe's fee on what it
 * pays running (price × fee(t) / t).
 */
export function unitCost(size: SizeSpec, runningCents: number, assumptions: Assumptions): UnitCost {
  const machine = machineOf(assumptions.machine);
  const fit = worldsPerMachine(machine, size, assumptions.cpuPromised);
  const share =
    fit > 0
      ? machine.eurMonth / (fit * (assumptions.occupancyPct / 100)) / DAYS_PER_MONTH
      : Infinity;
  const held =
    size.usedGb *
    (assumptions.copies === 'incremental' ? INCREMENTAL_HELD.value : FULL_COPIES_HELD.value);
  const copies = (held * s3EurPerGbMonth()) / DAYS_PER_MONTH;
  const support =
    ((supportMinutesOf(size, assumptions) / 60) * assumptions.teamHourEur) / DAYS_PER_MONTH;
  const stripe =
    ((runningCents / 100) * stripeFee(assumptions.topupEur, assumptions.seller)) /
    assumptions.topupEur;
  return { fit, machine: share, copies, support, stripe, total: share + copies + support + stripe };
}

/** The gross margin of a price: (price − cost) / price; null when it is free or the world fits nowhere. */
export function marginOf(runningCents: number, cost: UnitCost): number | null {
  if (runningCents <= 0 || !Number.isFinite(cost.total)) return null;
  const price = runningCents / 100;
  return (price - cost.total) / price;
}

/** The margin the room marks as reached. */
export const MARGIN_GOAL = 0.6;

export interface FleetLine {
  readonly key: string;
  readonly worlds: number;
  readonly runningPct: number;
  /** False when the draft does not price the size: it earns nothing here. */
  readonly priced: boolean;
  readonly revenue: number;
}

/** The example fleet's month, net of VAT, before salaries and taxes. */
export interface FleetProfit {
  readonly lines: readonly FleetLine[];
  readonly revenue: number;
  /** Machines needed; null when some world fits on none. */
  readonly machines: number | null;
  readonly machineCost: number | null;
  readonly copies: number;
  readonly support: number;
  readonly stripe: number;
  readonly fixed: number;
  readonly extras: number;
  readonly profit: number | null;
  readonly share: number | null;
}

/**
 * The example fleet's profit a month: revenue = Σ worlds × 30 × (running ×
 * p + stopped × (1 − p)); machines = ceil(Σ worlds / per machine ÷
 * occupancy); copies and support for every world all month; Stripe on the
 * revenue; then the fixed costs and voice, video and AI.
 */
export function fleetProfit(
  sizes: Readonly<Record<string, DeskSizePrice>>,
  assumptions: Assumptions,
): FleetProfit {
  const machine = machineOf(assumptions.machine);
  let revenue = 0;
  let load = 0;
  let copies = 0;
  let support = 0;
  const lines = FLEET_SIZES.map((key): FleetLine => {
    const entry = assumptions.fleet[key] ?? { worlds: 0, runningPct: 100 };
    const price = sizes[key];
    const spec = sizeSpec(key);
    if (price === undefined || spec === undefined) {
      return { key, worlds: entry.worlds, runningPct: entry.runningPct, priced: false, revenue: 0 };
    }
    const running = entry.runningPct / 100;
    const earned =
      entry.worlds *
      DAYS_PER_MONTH *
      ((price.runningCentsPerDay / 100) * running +
        (price.stoppedCentsPerDay / 100) * (1 - running));
    const cost = unitCost(spec, price.runningCentsPerDay, assumptions);
    revenue += earned;
    if (entry.worlds > 0) load += cost.fit > 0 ? entry.worlds / cost.fit : Infinity;
    copies += entry.worlds * cost.copies * DAYS_PER_MONTH;
    support += entry.worlds * cost.support * DAYS_PER_MONTH;
    return {
      key,
      worlds: entry.worlds,
      runningPct: entry.runningPct,
      priced: true,
      revenue: earned,
    };
  });
  let machines: number | null = null;
  if (Number.isFinite(load)) {
    machines = load > 0 ? Math.ceil(load / (assumptions.occupancyPct / 100) - 1e-9) : 0;
  }
  const machineCost = machines === null ? null : machines * machine.eurMonth;
  const stripe =
    (revenue * stripeFee(assumptions.topupEur, assumptions.seller)) / assumptions.topupEur;
  const profit =
    machineCost === null
      ? null
      : revenue -
        machineCost -
        copies -
        support -
        stripe -
        assumptions.fixedEurMonth -
        assumptions.extrasEurMonth;
  return {
    lines,
    revenue,
    machines,
    machineCost,
    copies,
    support,
    stripe,
    fixed: assumptions.fixedEurMonth,
    extras: assumptions.extrasEurMonth,
    profit,
    share: profit === null || revenue <= 0 ? null : profit / revenue,
  };
}

// ---- The assumptions a version carries -------------------------------------

/** The calculator's assumptions as a plain object for a version's basis, with the figures' day. */
export function snapshotOf(assumptions: Assumptions): Record<string, unknown> {
  return {
    ...(JSON.parse(JSON.stringify(assumptions)) as Record<string, unknown>),
    readOn: READ_ON,
  };
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

/**
 * A version's stored assumptions read back into the calculator: each field
 * that reads well replaces the base's, anything else keeps the base's.
 */
export function assumptionsFrom(json: unknown, base: Assumptions): Assumptions {
  if (!isRecord(json)) return base;
  const support = isRecord(json['supportMinutes']) ? json['supportMinutes'] : {};
  const fleet = isRecord(json['fleet']) ? json['fleet'] : {};
  const machine = json['machine'];
  const topup = json['topupEur'];
  return {
    machine:
      typeof machine === 'string' && MACHINES.some((offer) => offer.key === machine)
        ? machine
        : base.machine,
    occupancyPct: numberIn(
      json['occupancyPct'],
      OCCUPANCY_RANGE.min,
      OCCUPANCY_RANGE.max,
      base.occupancyPct,
    ),
    cpuPromised: numberIn(
      json['cpuPromised'],
      CPU_PROMISED_RANGE.min,
      CPU_PROMISED_RANGE.max,
      base.cpuPromised,
    ),
    copies:
      json['copies'] === 'full' || json['copies'] === 'incremental' ? json['copies'] : base.copies,
    topupEur: typeof topup === 'number' && TOPUPS_EUR.includes(topup) ? topup : base.topupEur,
    seller:
      json['seller'] === 'stripe' || json['seller'] === 'numen' ? json['seller'] : base.seller,
    teamHourEur: numberIn(json['teamHourEur'], 0, 10_000, base.teamHourEur),
    supportMinutes: {
      medium: numberIn(support['medium'], 0, 10_000, base.supportMinutes.medium),
      large: numberIn(support['large'], 0, 10_000, base.supportMinutes.large),
    },
    fixedEurMonth: numberIn(json['fixedEurMonth'], 0, 1_000_000, base.fixedEurMonth),
    extrasEurMonth: numberIn(json['extrasEurMonth'], 0, 1_000_000, base.extrasEurMonth),
    fleet: Object.fromEntries(
      FLEET_SIZES.map((key) => {
        const fallback = base.fleet[key] ?? { worlds: 0, runningPct: 100 };
        const entry = isRecord(fleet[key]) ? fleet[key] : {};
        const worlds = numberIn(entry['worlds'], 0, 100_000, fallback.worlds);
        return [
          key,
          {
            worlds: Number.isInteger(worlds) ? worlds : fallback.worlds,
            runningPct: numberIn(entry['runningPct'], 0, 100, fallback.runningPct),
          },
        ];
      }),
    ),
  };
}

// ---- The draft -------------------------------------------------------------

/** A size's two prices as typed, and whether it is in the tariff. */
export interface SizeForm {
  readonly running: string;
  readonly stopped: string;
  readonly included: boolean;
}

/** The draft as the Oracle types it: text, until it reads as a draft. */
export interface DraftForm {
  readonly sizes: Readonly<Record<string, SizeForm>>;
  readonly rules: Readonly<Record<RuleKey, string>>;
  readonly startsOn: string;
  readonly note: string;
}

/** The sizes in the room's order: the catalog's first, then any other, by name. */
export function sizeOrder(keys: Iterable<string>): string[] {
  const all = new Set(keys);
  const known = SIZE_CATALOG.map((size) => size.key).filter((key) => all.has(key));
  const others = [...all].filter((key) => sizeSpec(key) === undefined).sort();
  return [...known, ...others];
}

/** A rule's value as typed in the room. */
export function ruleText(key: RuleKey, rules: DeskRules, mark: string): string {
  if (key === 'quickTopupsCents') {
    return rules.quickTopupsCents.map((cents) => centsText(cents, mark, true)).join(' · ');
  }
  return MONEY_RULES.includes(key) ? centsText(rules[key], mark) : String(rules[key]);
}

/**
 * A draft form from a version: its prices and rules. With `addCatalog`
 * (the room's opening draft) the catalog's sizes it does not price come in
 * at their starting prices; without it (a version taken to the calculator)
 * they are shown out of the tariff. A size with no starting price starts empty.
 */
export function formFrom(
  version: Pick<DeskVersion, 'sizes' | 'rules'> | null,
  mark: string,
  startsOn: string,
  note: string,
  addCatalog: boolean,
): DraftForm {
  const priced = version?.sizes ?? {};
  const keys = sizeOrder([...SIZE_CATALOG.map((size) => size.key), ...Object.keys(priced)]);
  const sizes: Record<string, SizeForm> = {};
  for (const key of keys) {
    const price = priced[key];
    if (price !== undefined) {
      sizes[key] = {
        running: centsText(price.runningCentsPerDay, mark),
        stopped: centsText(price.stoppedCentsPerDay, mark),
        included: true,
      };
      continue;
    }
    const spec = sizeSpec(key);
    const running = spec?.startRunningCents ?? null;
    const stopped = spec?.startStoppedCents ?? null;
    sizes[key] = {
      running: running === null ? '' : centsText(running, mark),
      stopped: stopped === null ? '' : centsText(stopped, mark),
      included: addCatalog && running !== null && stopped !== null,
    };
  }
  const rules = version?.rules ?? DEFAULT_RULES;
  return {
    sizes,
    rules: Object.fromEntries(RULE_KEYS.map((key) => [key, ruleText(key, rules, mark)])) as Record<
      RuleKey,
      string
    >,
    startsOn,
    note,
  };
}

/** A size the till still charges to worlds stays in the tariff, priced or not yet. */
export function withSizesInUse(form: DraftForm, inUse: readonly string[]): DraftForm {
  const missing = inUse.filter((key) => form.sizes[key]?.included !== true);
  if (missing.length === 0) return form;
  const sizes: Record<string, SizeForm> = { ...form.sizes };
  for (const key of missing) {
    sizes[key] = { running: '', stopped: '', ...form.sizes[key], included: true };
  }
  return { ...form, sizes };
}

/** What does not read in a form: the fields to mark. */
export interface FormProblems {
  readonly sizes: Readonly<
    Record<string, { readonly running: boolean; readonly stopped: boolean }>
  >;
  readonly rules: readonly RuleKey[];
  readonly startsOn: boolean;
  /** No size is in the tariff. */
  readonly empty: boolean;
}

function readRule(key: RuleKey, text: string): number | number[] | null {
  if (key === 'quickTopupsCents') return parseEurosList(text);
  return MONEY_RULES.includes(key) ? parseEuros(text) : parseWhole(text);
}

/**
 * The draft a form says, with the calculator's assumptions as its basis, or
 * null with the fields that do not read. Only the sizes in the tariff count.
 */
export function draftFrom(
  form: DraftForm,
  assumptions: Assumptions,
): { readonly draft: DeskDraft | null; readonly problems: FormProblems } {
  const sizes: Record<string, DeskSizePrice> = {};
  const sizeProblems: Record<string, { running: boolean; stopped: boolean }> = {};
  for (const [key, size] of Object.entries(form.sizes)) {
    if (!size.included) continue;
    const running = parseEuros(size.running);
    const stopped = parseEuros(size.stopped);
    if (running === null || stopped === null) {
      sizeProblems[key] = { running: running === null, stopped: stopped === null };
      continue;
    }
    sizes[key] = { runningCentsPerDay: running, stoppedCentsPerDay: stopped };
  }
  const values: Partial<Record<RuleKey, number | number[]>> = {};
  const ruleProblems: RuleKey[] = [];
  for (const key of RULE_KEYS) {
    const value = readRule(key, form.rules[key]);
    if (value === null) ruleProblems.push(key);
    else values[key] = value;
  }
  const startsOnBad = !isDay(form.startsOn);
  const empty = Object.keys(sizes).length === 0 && Object.keys(sizeProblems).length === 0;
  const problems: FormProblems = {
    sizes: sizeProblems,
    rules: ruleProblems,
    startsOn: startsOnBad,
    empty,
  };
  if (Object.keys(sizeProblems).length > 0 || ruleProblems.length > 0 || startsOnBad || empty) {
    return { draft: null, problems };
  }
  const rules = values as DeskRules;
  return {
    draft: {
      startsOn: form.startsOn,
      sizes,
      rules,
      basis: { note: form.note.trim(), assumptions: snapshotOf(assumptions) },
    },
    problems,
  };
}

// ---- What a draft changes --------------------------------------------------

export interface SizeChange {
  readonly key: string;
  readonly before: DeskSizePrice | null;
  readonly after: DeskSizePrice | null;
}

export interface RuleChange {
  readonly key: RuleKey;
  readonly before: number | readonly number[] | null;
  readonly after: number | readonly number[];
}

export interface DraftChanges {
  readonly sizes: readonly SizeChange[];
  readonly rules: readonly RuleChange[];
}

function samePrice(a: DeskSizePrice, b: DeskSizePrice): boolean {
  return (
    a.runningCentsPerDay === b.runningCentsPerDay && a.stoppedCentsPerDay === b.stoppedCentsPerDay
  );
}

function sameRule(a: number | readonly number[], b: number | readonly number[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** What a draft changes against the version it replaces (all of it when it replaces none). */
export function changesFrom(
  draft: Pick<DeskDraft, 'sizes' | 'rules'>,
  replaced: Pick<DeskVersion, 'sizes' | 'rules'> | null,
): DraftChanges {
  const before = replaced?.sizes ?? {};
  const sizes = sizeOrder([...Object.keys(before), ...Object.keys(draft.sizes)])
    .map((key): SizeChange => ({
      key,
      before: before[key] ?? null,
      after: draft.sizes[key] ?? null,
    }))
    .filter(
      (change) =>
        change.before === null || change.after === null || !samePrice(change.before, change.after),
    );
  const rules = RULE_KEYS.map((key): RuleChange => ({
    key,
    before: replaced === null ? null : replaced.rules[key],
    after: draft.rules[key],
  })).filter((change) => change.before === null || !sameRule(change.before, change.after));
  return { sizes, rules };
}

export function nothingChanges(changes: DraftChanges): boolean {
  return changes.sizes.length === 0 && changes.rules.length === 0;
}

// ---- The till's problems, read so the room can say them in its words -------

export type DeskProblem =
  | { readonly kind: 'notice'; readonly days: number; readonly day: string }
  | { readonly kind: 'tomorrow'; readonly day: string }
  | { readonly kind: 'in-use'; readonly size: string }
  | { readonly kind: 'basis' }
  | { readonly kind: 'by' }
  | { readonly kind: 'meanwhile' }
  | { readonly kind: 'other'; readonly text: string };

const NOTICE =
  /^a rise needs (\d+) days' notice: it starts on (\d{4}-\d{2}-\d{2}) at the earliest$/;
const TOMORROW =
  /^a version scheduled on \d{4}-\d{2}-\d{2} starts on (\d{4}-\d{2}-\d{2}) at the earliest$/;
const IN_USE = /^size (\S+) is still charged to worlds: a version must keep pricing it$/;

/** One of the till's problems, recognised; anything else is kept word for word. */
export function readProblem(text: string): DeskProblem {
  const notice = NOTICE.exec(text);
  if (notice !== null) return { kind: 'notice', days: Number(notice[1]), day: notice[2] as string };
  const tomorrow = TOMORROW.exec(text);
  if (tomorrow !== null) return { kind: 'tomorrow', day: tomorrow[1] as string };
  const inUse = IN_USE.exec(text);
  if (inUse !== null) return { kind: 'in-use', size: inUse[1] as string };
  if (text === BASIS_PROBLEM) return { kind: 'basis' };
  if (text === BY_PROBLEM) return { kind: 'by' };
  if (text === MEANWHILE_PROBLEM) return { kind: 'meanwhile' };
  return { kind: 'other', text };
}
