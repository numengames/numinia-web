/**
 * «Saldo»: the contract with the till's `AccountDesk` and what the screen
 * needs to draw it — money in whole euro cents, net of VAT, a balance that
 * never expires, usage per day or per month, the lines of the ledger, the
 * members of an organization.
 *
 * Pure: no fetch, no env and no zod. The saldo island imports it, and zod
 * in an island breaks the bundle budget, so whatever comes from outside is
 * read by hand here. The server side (lib/accounts-source.ts) checks the
 * till's answers with zod before the browser ever sees them; these readers
 * only keep a wrong body from breaking the page.
 *
 * The till decides who may do what (membership); this module only shapes.
 */

import type { SupportedLocale } from '@numinia/domain';
import { localeHref } from './app-nav';

// ---- The contract with the till's desk (SPEC «AccountDesk methods») -------

export type AccountKind = 'personal' | 'team';
/** `owner` is the personal account's only role; a team has admins and members. */
export type AccountRole = 'owner' | 'admin' | 'member';
export type MemberRole = 'admin' | 'member';
export type SpendRange = '7d' | '30d' | '12m';
export type TopupKey = '10' | '50' | '100';
export type LineKind = 'topup' | 'world_day' | 'adjustment' | 'refund' | 'chargeback';
export type CheckoutState = 'paid' | 'open' | 'expired';

export interface DeskAccount {
  id: string;
  kind: AccountKind;
  /** Null for the personal account («Tu cuenta»). */
  name: string | null;
  role: AccountRole;
  balanceCents: number;
}

export interface DeskOverview {
  /** Personal first, then the teams by name. */
  accounts: DeskAccount[];
}

/** A refusal: the till's answer when the wallet may not do it. */
export interface DeskRefusal {
  ok: false;
  problems: string[];
}

export interface DeskLot {
  lineId: string;
  at: string;
  amountCents: number;
  remainderCents: number;
}

export interface DeskSpend {
  /** `YYYY-MM-DD` for the day ranges, `YYYY-MM` for 12 months. */
  bucket: string;
  cents: number;
}

export interface DeskLine {
  kind: LineKind;
  at: string;
  amountCents: number;
  vatCents?: number | null;
  day?: string | null;
  worldId?: string | null;
  size?: string | null;
  reason?: string | null;
}

export interface DeskMember {
  wallet: string;
  role: MemberRole;
  addedAt: string;
}

export interface DeskStatement {
  account: DeskAccount;
  balanceCents: number;
  lowBalance: boolean;
  lots: DeskLot[];
  spend: DeskSpend[];
  spendTotalCents: number;
  /** The last 100 lines, newest first. */
  lines: DeskLine[];
  /** Teams only. */
  members?: DeskMember[];
}

export type DeskTeamAnswer = { ok: true; account: DeskAccount } | DeskRefusal;
export type DeskMembersAnswer = { ok: true; members?: DeskMember[] } | DeskRefusal;
export type DeskTopupAnswer = { ok: true; url: string } | DeskRefusal;
export type DeskConfirmAnswer =
  { ok: true; state: CheckoutState; accountId: string; balanceCents: number } | DeskRefusal;

/**
 * The RPC surface of the till's `AccountDesk` entrypoint, as the store calls
 * it. The first argument is always the session's wallet, lowercase 0x — the
 * till trusts its bound caller for WHO and decides itself WHAT.
 */
export interface AccountDesk {
  overview(wallet: string): Promise<DeskOverview | DeskRefusal>;
  createTeam(wallet: string, name: string): Promise<DeskTeamAnswer>;
  renameTeam(wallet: string, accountId: string, name: string): Promise<DeskTeamAnswer>;
  statement(
    wallet: string,
    accountId: string,
    range: SpendRange,
  ): Promise<DeskStatement | DeskRefusal>;
  members(wallet: string, accountId: string): Promise<DeskMembersAnswer>;
  setMember(
    wallet: string,
    accountId: string,
    memberWallet: string,
    role: MemberRole,
  ): Promise<DeskMembersAnswer>;
  removeMember(wallet: string, accountId: string, memberWallet: string): Promise<DeskMembersAnswer>;
  startTopup(
    wallet: string,
    accountId: string,
    amountKey: TopupKey,
    returnBase: string,
  ): Promise<DeskTopupAnswer>;
  confirmTopup(wallet: string, sessionId: string): Promise<DeskConfirmAnswer>;
}

/** The methods a binding must have to be a desk, in the contract's order. */
export const DESK_METHODS = [
  'overview',
  'createTeam',
  'renameTeam',
  'statement',
  'members',
  'setMember',
  'removeMember',
  'startTopup',
  'confirmTopup',
] as const satisfies readonly (keyof AccountDesk)[];

export const SPEND_RANGES: readonly SpendRange[] = ['7d', '30d', '12m'];
export const TOPUP_KEYS: readonly TopupKey[] = ['10', '50', '100'];
export const MEMBER_ROLES: readonly MemberRole[] = ['admin', 'member'];

/** Under 10 € the screen warns «Saldo bajo» (the till says it too: `lowBalance`). */
export const LOW_BALANCE_CENTS = 1000;
/** An organization's name: 1 to 60 characters once trimmed (the till's CHECK). */
export const TEAM_NAME_MAX = 60;

// The till's own words for the refusals the screen tells apart.
export const NOT_MEMBER = 'not a member';
export const NOT_CONFIGURED = 'payments are not configured';
export const ADMIN_ONLY = 'only an admin of the organization may do this';
export const LAST_ADMIN = 'an organization keeps at least one admin';

// ---- Small shared checks ---------------------------------------------------

const WALLET = /^0x[0-9a-fA-F]{40}$/;

export function isWallet(text: string): boolean {
  return WALLET.test(text);
}

/** A typed wallet as the till wants it (lowercase), or null when it is not one. */
export function walletOf(text: string): string | null {
  const trimmed = text.trim();
  return isWallet(trimmed) ? trimmed.toLowerCase() : null;
}

/** `0x42e6…ca26`: enough to recognise, too little to copy (STD-035). */
export function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

/** A name for an organization, trimmed, or null when it is empty or too long. */
export function teamName(text: string): string | null {
  const name = text.trim();
  return name.length >= 1 && name.length <= TEAM_NAME_MAX ? name : null;
}

export function isSpendRange(value: unknown): value is SpendRange {
  return typeof value === 'string' && (SPEND_RANGES as readonly string[]).includes(value);
}

export function isTopupKey(value: unknown): value is TopupKey {
  return typeof value === 'string' && (TOPUP_KEYS as readonly string[]).includes(value);
}

/** `{name}` placeholders filled from `values`; unknown ones stay as they are. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

// ---- Money, days and months for people ------------------------------------

/** Cents in a language's own way: «4,20 €», «€4.20». `-0` prints as 0. */
export function formatEuros(cents: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents === 0 ? 0 : cents / 100);
}

/** A whole-euro top-up amount: «10 €», «€10». */
export function formatTopup(key: TopupKey, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(key));
}

/** A bucket as an axis label: a day «14 oct», a month «oct 2026». */
export function formatBucket(bucket: string, lang: string): string {
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    return new Date(`${bucket}-01T00:00:00Z`).toLocaleDateString(lang, {
      timeZone: 'UTC',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(`${bucket}T00:00:00Z`).toLocaleDateString(lang, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
}

/** An instant on the reader's own clock, or the text as it came when it is not one. */
export function formatAt(iso: string, lang: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

const DAY_MS = 86_400_000;

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The buckets a range covers up to `now`, oldest first (UTC, as the till counts). */
export function bucketsOf(range: SpendRange, now: Date): string[] {
  if (range === '12m') {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    return Array.from({ length: 12 }, (_, i) => {
      const at = new Date(Date.UTC(year, month - 11 + i, 1));
      return at.toISOString().slice(0, 7);
    });
  }
  const days = range === '7d' ? 7 : 30;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) => utcDay(new Date(today - (days - 1 - i) * DAY_MS)));
}

/**
 * The bars of the usage chart: every bucket of the range, in order, with
 * what the till counted for it (0 where it counted nothing). Buckets the
 * till names outside the range are left out; spend is never negative.
 */
export function spendSeries(
  spend: readonly DeskSpend[],
  range: SpendRange,
  now: Date,
): DeskSpend[] {
  const counted = new Map<string, number>();
  for (const entry of spend) {
    counted.set(entry.bucket, (counted.get(entry.bucket) ?? 0) + Math.max(0, entry.cents));
  }
  return bucketsOf(range, now).map((bucket) => ({ bucket, cents: counted.get(bucket) ?? 0 }));
}

/** The words a line is shown with. Refunds and chargebacks are both «Devolución». */
export type LineLabel = 'topup' | 'world' | 'adjustment' | 'refund';

export function lineLabel(kind: LineKind): LineLabel {
  if (kind === 'world_day') return 'world';
  if (kind === 'chargeback') return 'refund';
  return kind;
}

/** A movement's amount with its sign: «+10,00 €», «-0,20 €», «0,00 €». */
export function signedEuros(cents: number, lang: string): string {
  const plain = formatEuros(Math.abs(cents), lang);
  if (cents > 0) return `+${plain}`;
  return cents < 0 ? `-${plain}` : plain;
}

/** One bar of the usage chart, in the chart's own units (0..width, 0..height). */
export interface ChartBar {
  readonly bucket: string;
  readonly cents: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The bars of a series in a `width` × `height` box: one slot per bucket, a
 * gap of a fifth of the slot, the tallest bar full height, a bucket that
 * cost something at least one unit tall so it never vanishes.
 */
export function chartBars(series: readonly DeskSpend[], width: number, height: number): ChartBar[] {
  const max = series.reduce((top, entry) => Math.max(top, entry.cents), 0);
  const slot = series.length === 0 ? 0 : width / series.length;
  return series.map((entry, i) => {
    const tall = max === 0 ? 0 : Math.max(entry.cents > 0 ? 1 : 0, (entry.cents / max) * height);
    return {
      bucket: entry.bucket,
      cents: entry.cents,
      x: i * slot + slot * 0.1,
      y: height - tall,
      width: slot * 0.8,
      height: tall,
    };
  });
}

/** Which of the till's refusals the screen has its own words for. */
export type ProblemKey = 'notMember' | 'adminOnly' | 'lastAdmin' | 'notConfigured' | 'other';

export function problemOf(problems: readonly string[]): ProblemKey {
  if (problems.includes(NOT_CONFIGURED)) return 'notConfigured';
  if (problems.includes(NOT_MEMBER)) return 'notMember';
  if (problems.includes(ADMIN_ONLY)) return 'adminOnly';
  if (problems.includes(LAST_ADMIN)) return 'lastAdmin';
  return 'other';
}

// ---- Stripe in a new tab and the way back ----------------------------------

/** Where Stripe sends the buyer back: `/<locale>/saldo/vuelta/` on this origin. */
export const VUELTA_PATH = '/saldo/vuelta/';

export function vueltaBase(origin: string, locale: SupportedLocale): string {
  return `${origin}${localeHref(locale, VUELTA_PATH)}`;
}

/**
 * The address the new tab may be sent to: Stripe's own Checkout over https,
 * or a page of this very site (the fixture's way back). Anything else is
 * refused (null), so a wrong answer can never send the tab elsewhere.
 */
export function checkoutTarget(url: unknown, origin: string): string | null {
  if (typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol === 'https:' && parsed.hostname === 'checkout.stripe.com') {
    return parsed.href;
  }
  return parsed.origin === origin ? parsed.href : null;
}

/** What the way back was handed: Stripe's session id, or that the buyer cancelled. */
export interface VueltaParams {
  readonly sessionId: string | null;
  readonly cancelled: boolean;
}

const SESSION_ID = /^cs_[A-Za-z0-9_]{1,250}$/;

export function isCheckoutId(text: string): boolean {
  return SESSION_ID.test(text);
}

export function vueltaParams(search: string): VueltaParams {
  const query = new URLSearchParams(search);
  const id = query.get('session_id') ?? '';
  return {
    sessionId: isCheckoutId(id) ? id : null,
    cancelled: query.get('cancelled') === '1',
  };
}

// ---- Reading the API's answers in the browser (no zod in an island) --------

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAccount(value: unknown): value is DeskAccount {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    (value['kind'] === 'personal' || value['kind'] === 'team') &&
    (value['name'] === null || typeof value['name'] === 'string') &&
    typeof value['role'] === 'string' &&
    typeof value['balanceCents'] === 'number'
  );
}

/** GET /api/saldo: the accounts this wallet sees, or null when the body is not that. */
export function readOverview(json: unknown): DeskAccount[] | null {
  if (!isRecord(json) || !Array.isArray(json['accounts'])) return null;
  const accounts = json['accounts'] as unknown[];
  return accounts.every(isAccount) ? accounts : null;
}

/** GET /api/saldo/statement: the statement, or null when the body is not one. */
export function readStatement(json: unknown): DeskStatement | null {
  if (!isRecord(json) || !isRecord(json['statement'])) return null;
  const statement = json['statement'];
  return isAccount(statement['account']) &&
    typeof statement['balanceCents'] === 'number' &&
    typeof statement['lowBalance'] === 'boolean' &&
    Array.isArray(statement['spend']) &&
    typeof statement['spendTotalCents'] === 'number' &&
    Array.isArray(statement['lines']) &&
    (statement['members'] === undefined || Array.isArray(statement['members']))
    ? (statement as unknown as DeskStatement)
    : null;
}

/** GET /api/saldo/statement also names who is asking (to mark «tú» among the members). */
export function readYou(json: unknown): string | null {
  return isRecord(json) && typeof json['you'] === 'string' ? json['you'] : null;
}

/** What a POST answered: the desk's own `{ ok, … }`, or null when the body is not one. */
export type PostResult = { readonly ok: true; readonly [key: string]: unknown } | DeskRefusal;

export function readResult(json: unknown): PostResult | null {
  if (!isRecord(json) || !isRecord(json['result'])) return null;
  const result = json['result'];
  if (result['ok'] === true) return result as PostResult;
  if (result['ok'] === false && Array.isArray(result['problems'])) {
    return { ok: false, problems: (result['problems'] as unknown[]).map(String) };
  }
  return null;
}
