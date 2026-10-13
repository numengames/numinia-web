/**
 * UTC days (ADR-070 point 2): UTC is the till's reference time. A day is a
 * UTC calendar date, `YYYY-MM-DD`, from its 00:00:00.000Z to the next day's,
 * so every day has 1440 minutes, whatever any country's clock does. Local
 * times are computed by the screens from UTC, never stored here. No time
 * zone and no date library: plain `Date` arithmetic in UTC.
 */

/** Minutes in every day the till closes: 24 hours of 60. */
export const MINUTES_PER_DAY = 1440;

const DAY_MS = MINUTES_PER_DAY * 60_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** The instant a valid day starts (its 00:00:00.000Z), in ms. Throws on anything else. */
function dayAsUtcMs(day: string): number {
  if (!DAY_PATTERN.test(day)) {
    throw new RangeError(`not a YYYY-MM-DD day: ${JSON.stringify(day)}`);
  }
  const ms = Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
  );
  // Date.UTC rolls 2026-02-30 over to March: a real day survives the round trip.
  if (new Date(ms).toISOString().slice(0, 10) !== day) {
    throw new RangeError(`not a calendar day: ${day}`);
  }
  return ms;
}

/** True for a `YYYY-MM-DD` string that names a real calendar day. */
export function isDay(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    dayAsUtcMs(value);
    return true;
  } catch {
    return false;
  }
}

/** True for an instant written as `Date#toISOString` writes it (ms precision, `Z`). */
export function isInstant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    INSTANT_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

/** The UTC date an instant falls on: 2026-10-25T23:59:59.999Z is 2026-10-25. */
export function dayOf(instant: Date): string {
  if (Number.isNaN(instant.getTime())) throw new RangeError('dayOf: invalid instant');
  return instant.toISOString().slice(0, 10);
}

/** The day `count` calendar days after `day` (before it when negative). */
export function addDays(day: string, count: number): string {
  if (!Number.isSafeInteger(count)) throw new RangeError(`addDays: not a whole count: ${count}`);
  return new Date(dayAsUtcMs(day) + count * DAY_MS).toISOString().slice(0, 10);
}

/** Calendar days from `from` to `to`: 1 from a day to the next, negative backwards. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayAsUtcMs(to) - dayAsUtcMs(from)) / DAY_MS);
}

/** Every day from `first` to `last`, both included, oldest first (empty when last < first). */
export function daysFrom(first: string, last: string): string[] {
  const count = daysBetween(first, last);
  const days: string[] = [];
  for (let offset = 0; offset <= count; offset += 1) days.push(addDays(first, offset));
  return days;
}

/** The instant `day` starts: `${day}T00:00:00.000Z`. Throws on anything but a day. */
export function startOfDay(day: string): Date {
  return new Date(dayAsUtcMs(day));
}
