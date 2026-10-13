/**
 * Money in the till (ADR-070): integer euro cents everywhere, never a float.
 * The ledger counts NET money; VAT is split or added only for what a screen
 * shows — a consumer sees prices with VAT, a company without.
 */

/** Hundredths of a percent in 100 % — VAT rates are carried as 2100 for 21 %. */
const HUNDREDTHS_PER_WHOLE = 10_000;

/** A net amount, its VAT and their sum, all in cents. */
export interface VatSplit {
  readonly netCents: number;
  readonly vatCents: number;
  readonly grossCents: number;
}

/** True when `value` is a whole number of cents that JavaScript holds exactly. */
export function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/**
 * `numerator / denominator` rounded half up, with integers only — no float
 * is ever produced: 62.5 → 63, 57.5 → 58. Defined for a numerator ≥ 0 and a
 * denominator > 0, which is every amount the till rounds.
 */
export function divideHalfUp(numerator: number, denominator: number): number {
  if (!isCents(numerator) || numerator < 0) {
    throw new RangeError(`divideHalfUp: numerator must be a safe integer ≥ 0, got ${numerator}`);
  }
  if (!isCents(denominator) || denominator <= 0) {
    throw new RangeError(
      `divideHalfUp: denominator must be a safe integer > 0, got ${denominator}`,
    );
  }
  const remainder = numerator % denominator;
  const quotient = (numerator - remainder) / denominator;
  return remainder * 2 >= denominator ? quotient + 1 : quotient;
}

/**
 * A VAT rate in percent with at most two decimals (21, 25.5, 5.5), as
 * hundredths of a percent. Throws on anything else: a rate is never guessed.
 */
function rateInHundredths(ratePercent: number): number {
  const hundredths = Math.round(ratePercent * 100);
  if (
    !Number.isFinite(ratePercent) ||
    Math.abs(hundredths - ratePercent * 100) > 1e-6 ||
    hundredths < 0 ||
    hundredths > HUNDREDTHS_PER_WHOLE
  ) {
    throw new RangeError(
      `VAT rate must be a percentage from 0 to 100 with at most two decimals, got ${ratePercent}`,
    );
  }
  return hundredths;
}

function assertNonNegativeCents(cents: number, what: string): void {
  if (!isCents(cents) || cents < 0) {
    throw new RangeError(`${what} must be whole cents ≥ 0, got ${cents}`);
  }
}

/**
 * Splits a VAT-inclusive amount into its net part and its VAT:
 * net = round_half_up(gross × 100 / (100 + rate)). 10.00 € at 21 % is
 * 8.26 € of balance and 1.74 € of VAT.
 */
export function splitVatInclusive(grossCents: number, ratePercent: number): VatSplit {
  assertNonNegativeCents(grossCents, 'gross amount');
  const rate = rateInHundredths(ratePercent);
  const netCents = divideHalfUp(grossCents * HUNDREDTHS_PER_WHOLE, HUNDREDTHS_PER_WHOLE + rate);
  return { netCents, vatCents: grossCents - netCents, grossCents };
}

/** Adds VAT to a net amount, rounded half up: 10.00 € at 21 % carries 2.10 € of VAT. */
export function addVat(netCents: number, ratePercent: number): VatSplit {
  assertNonNegativeCents(netCents, 'net amount');
  const rate = rateInHundredths(ratePercent);
  const vatCents = divideHalfUp(netCents * rate, HUNDREDTHS_PER_WHOLE);
  return { netCents, vatCents, grossCents: netCents + vatCents };
}
