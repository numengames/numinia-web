/**
 * The account desk's pure rules (cut «Saldo», MIS-179, MIS-180): what each
 * argument numinia.com sends must look like, the top-up amounts and where
 * Stripe may send the buyer back, and the spend of a range in buckets for
 * the usage chart. Whatever arrives is `unknown`: each reader answers the
 * value or `undefined`, and the desk turns `undefined` into a problem in
 * words — never a throw.
 */

/** A wallet as numinia.com's session holds it: 0x and 40 lowercase hex digits. */
const WALLET = /^0x[0-9a-f]{40}$/;
const ANY_CASE_WALLET = /^0x[0-9a-fA-F]{40}$/;

/** Control characters have no place in a name a screen prints. */
const CONTROL = /\p{Cc}/u;

/** An account id the till wrote: a few safe characters, never long. */
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A Checkout Session id as Stripe writes them. */
const SESSION_ID = /^cs_[A-Za-z0-9_]{1,250}$/;

export const TEAM_NAME_MAX = 60;

export const ROLES = ['admin', 'member'] as const;
export type TeamRole = (typeof ROLES)[number];

/** The quick top-ups of the screen, in euros: each has its own Stripe price. */
export const AMOUNT_KEYS = ['10', '50', '100'] as const;
export type AmountKey = (typeof AMOUNT_KEYS)[number];

export const RANGES = ['7d', '30d', '12m'] as const;
export type SpendRange = (typeof RANGES)[number];

/** A balance under 10 € is low: the screen warns. */
export const LOW_BALANCE_CENTS = 1000;

/** The Stripe price of each quick top-up. */
export type TopupPrices = Readonly<Record<AmountKey, string>>;

/** The session's wallet: lowercase only — numinia.com writes it so, and the till does not guess. */
export function readWallet(value: unknown): string | undefined {
  return typeof value === 'string' && WALLET.test(value) ? value : undefined;
}

/** A wallet someone typed to add as a member: any case, kept in lowercase. */
export function readMemberWallet(value: unknown): string | undefined {
  return typeof value === 'string' && ANY_CASE_WALLET.test(value) ? value.toLowerCase() : undefined;
}

export function readAccountId(value: unknown): string | undefined {
  return typeof value === 'string' && ACCOUNT_ID.test(value) ? value : undefined;
}

/** An organization's name, trimmed: 1 to 60 characters, none of them a control character. */
export function readTeamName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  const length = [...name].length;
  return length >= 1 && length <= TEAM_NAME_MAX && !CONTROL.test(name) ? name : undefined;
}

export function readRole(value: unknown): TeamRole | undefined {
  return ROLES.find((role) => role === value);
}

export function readAmountKey(value: unknown): AmountKey | undefined {
  return AMOUNT_KEYS.find((key) => key === value);
}

export function readRange(value: unknown): SpendRange | undefined {
  return RANGES.find((range) => range === value);
}

export function readSessionId(value: unknown): string | undefined {
  return typeof value === 'string' && SESSION_ID.test(value) ? value : undefined;
}

/**
 * Where Stripe sends the buyer back: a page of https://numinia.com, or of a
 * local run (http://localhost, http://127.0.0.1, any port). Written whole
 * and plain — no query, fragment or credentials — since the desk appends
 * its own query; anything else could send a buyer, and a session id, away.
 */
export function readReturnBase(value: unknown): string | undefined {
  if (typeof value !== 'string' || !URL.canParse(value)) return undefined;
  const url = new URL(value);
  if (url.href !== value || url.search !== '' || url.hash !== '') return undefined;
  if (url.username !== '' || url.password !== '') return undefined;
  const site = url.protocol === 'https:' && url.host === 'numinia.com';
  const local =
    url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  return site || local ? value : undefined;
}

/**
 * `TILL_TOPUP_PRICES`, JSON `{"10":"price_…","50":"price_…","100":"price_…"}`:
 * every quick top-up's Stripe price, or undefined when any is missing or
 * malformed — then payments are not configured.
 */
export function parseTopupPrices(text: unknown): TopupPrices | undefined {
  if (typeof text !== 'string') return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  const record = parsed as Readonly<Record<string, unknown>>;
  const prices: Partial<Record<AmountKey, string>> = {};
  for (const key of AMOUNT_KEYS) {
    const price = record[key];
    if (typeof price !== 'string' || !/^price_[A-Za-z0-9_]+$/.test(price)) return undefined;
    prices[key] = price;
  }
  return prices as TopupPrices;
}

/**
 * One bar of the usage chart: a UTC day (`YYYY-MM-DD`) or month (`YYYY-MM`),
 * what was spent in it, and that split between the minutes the worlds ran
 * and the minutes they were stopped (the two add up to `cents`).
 */
export interface SpendBucket {
  readonly bucket: string;
  readonly cents: number;
  readonly runningCents: number;
  readonly stoppedCents: number;
}

/** What a world's day cost, positive: the spend of that UTC day, split as its bar stacks it. */
export interface DaySpend {
  readonly day: string;
  readonly cents: number;
  readonly runningCents: number;
  readonly stoppedCents: number;
}

/** A world's day as the per-world table counts it. */
export interface WorldDayUse {
  readonly worldId: string;
  readonly day: string;
  readonly size: string;
  readonly minutesRunning: number;
  /** What the day cost, positive. */
  readonly cents: number;
}

/** A world over a range: its latest size there, the days it ran at all, and what it cost. */
export interface WorldSpend {
  readonly worldId: string;
  readonly size: string;
  readonly daysRunning: number;
  readonly cents: number;
}

function monthBefore(month: string, count: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 - count;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** The buckets of a range ending on `today`, oldest first: 7 or 30 UTC days, or 12 months. */
function rangeKeys(range: SpendRange, today: string): string[] {
  const keys: string[] = [];
  if (range === '12m') {
    for (let back = 11; back >= 0; back -= 1) keys.push(monthBefore(today.slice(0, 7), back));
  } else {
    const count = range === '7d' ? 7 : 30;
    const end = Date.parse(`${today}T00:00:00.000Z`);
    for (let back = count - 1; back >= 0; back -= 1) {
      keys.push(new Date(end - back * 86_400_000).toISOString().slice(0, 10));
    }
  }
  return keys;
}

/** The bucket a UTC day falls in. */
function keyOf(range: SpendRange, day: string): string {
  return range === '12m' ? day.slice(0, 7) : day;
}

/**
 * The spend of a range ending on `today` (a UTC date), every bucket present
 * and oldest first: the last 7 or 30 UTC days, or the last 12 months, today's
 * included. Days outside the range are left out.
 */
export function spendBuckets(
  range: SpendRange,
  today: string,
  spends: readonly DaySpend[],
): SpendBucket[] {
  const buckets = rangeKeys(range, today).map((bucket) => ({
    bucket,
    cents: 0,
    runningCents: 0,
    stoppedCents: 0,
  }));
  const byKey = new Map(buckets.map((bucket) => [bucket.bucket, bucket]));
  for (const spend of spends) {
    const bucket = byKey.get(keyOf(range, spend.day));
    if (bucket === undefined) continue;
    bucket.cents += spend.cents;
    bucket.runningCents += spend.runningCents;
    bucket.stoppedCents += spend.stoppedCents;
  }
  return buckets;
}

/**
 * Each world with a day in the range ending on `today`: the size of its
 * latest day there, how many of its days ran at all, and what its days cost;
 * the most expensive first, then by id.
 */
export function worldsOver(
  range: SpendRange,
  today: string,
  days: readonly WorldDayUse[],
): WorldSpend[] {
  const inRange = new Set(rangeKeys(range, today));
  const worlds = new Map<
    string,
    { latest: string; size: string; daysRunning: number; cents: number }
  >();
  for (const day of days) {
    if (!inRange.has(keyOf(range, day.day))) continue;
    const world = worlds.get(day.worldId) ?? {
      latest: day.day,
      size: day.size,
      daysRunning: 0,
      cents: 0,
    };
    if (day.day > world.latest) {
      world.latest = day.day;
      world.size = day.size;
    }
    world.daysRunning += day.minutesRunning > 0 ? 1 : 0;
    world.cents += day.cents;
    worlds.set(day.worldId, world);
  }
  return [...worlds]
    .map(([worldId, { size, daysRunning, cents }]) => ({ worldId, size, daysRunning, cents }))
    .sort((a, b) => b.cents - a.cents || (a.worldId < b.worldId ? -1 : 1));
}
