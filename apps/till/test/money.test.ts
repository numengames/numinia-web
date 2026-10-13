import { describe, expect, it } from 'vitest';
import { addVat, divideHalfUp, isCents, splitVatInclusive } from '../src/lib/money';

describe('cents', () => {
  it('are whole numbers JavaScript holds exactly', () => {
    expect(isCents(1000)).toBe(true);
    expect(isCents(-63)).toBe(true);
    expect(isCents(0)).toBe(true);
    expect(isCents(0.5)).toBe(false);
    expect(isCents(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isCents(Number.NaN)).toBe(false);
    expect(isCents('1000')).toBe(false);
    expect(isCents(null)).toBe(false);
  });
});

describe('rounding half up, in integers', () => {
  it('rounds a half up: 23 hours or 11 hours running at 60 c/day', () => {
    // 23 hours are 23 × 60 minutes: 23 × 60 × 60 c / 1440 = 57.5 → 58.
    expect(divideHalfUp(23 * 60 * 60, 1440)).toBe(58);
    // 11 hours are 660 minutes: 660 × 60 c / 1440 = 27.5 → 28.
    expect(divideHalfUp(660 * 60, 1440)).toBe(28);
  });

  it('rounds below a half down and from a half up', () => {
    expect(divideHalfUp(719, 1440)).toBe(0);
    expect(divideHalfUp(720, 1440)).toBe(1);
    expect(divideHalfUp(1439, 1440)).toBe(1);
    expect(divideHalfUp(2880, 1440)).toBe(2);
    expect(divideHalfUp(0, 7)).toBe(0);
  });

  it('refuses what it cannot round exactly', () => {
    expect(() => divideHalfUp(-1, 2)).toThrow(RangeError);
    expect(() => divideHalfUp(1.5, 2)).toThrow(RangeError);
    expect(() => divideHalfUp(Number.MAX_SAFE_INTEGER + 1, 2)).toThrow(RangeError);
    expect(() => divideHalfUp(1, 0)).toThrow(RangeError);
    expect(() => divideHalfUp(1, -2)).toThrow(RangeError);
    expect(() => divideHalfUp(1, 2.5)).toThrow(RangeError);
  });
});

describe('VAT for the screens (the ledger counts net money)', () => {
  it('splits 10.00 € at 21 % into 8.26 € of balance and 1.74 € of VAT', () => {
    expect(splitVatInclusive(1000, 21)).toEqual({ netCents: 826, vatCents: 174, grossCents: 1000 });
  });

  it('adds 2.10 € of VAT to 10.00 € at 21 %', () => {
    expect(addVat(1000, 21)).toEqual({ netCents: 1000, vatCents: 210, grossCents: 1210 });
  });

  it('splits every amount up to 200 € to the nearest cent, half up, net + VAT = gross', () => {
    for (let gross = 0; gross <= 20_000; gross += 1) {
      const { netCents, vatCents } = splitVatInclusive(gross, 21);
      expect(netCents + vatCents).toBe(gross);
      // net = round_half_up(gross × 100 / 121): |gross × 100 − net × 121| ≤ 121 / 2,
      // and a tie goes up.
      const error = gross * 100 - netCents * 121;
      expect(error * 2).toBeLessThan(121);
      expect(error * 2).toBeGreaterThanOrEqual(-121);
    }
  });

  it('takes rates with two decimals, as some EU states charge them', () => {
    // Finland, 25.5 %: 1000 × 100 / 125.5 = 796.8… → 797.
    expect(splitVatInclusive(1000, 25.5)).toEqual({
      netCents: 797,
      vatCents: 203,
      grossCents: 1000,
    });
    expect(addVat(797, 25.5)).toEqual({ netCents: 797, vatCents: 203, grossCents: 1000 });
    expect(addVat(1000, 0)).toEqual({ netCents: 1000, vatCents: 0, grossCents: 1000 });
    expect(addVat(1000, 100)).toEqual({ netCents: 1000, vatCents: 1000, grossCents: 2000 });
  });

  it('never guesses a rate or an amount', () => {
    expect(() => addVat(1000, Number.NaN)).toThrow(RangeError);
    expect(() => addVat(1000, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => addVat(1000, 21.005)).toThrow(RangeError);
    expect(() => addVat(1000, -1)).toThrow(RangeError);
    expect(() => addVat(1000, 100.01)).toThrow(RangeError);
    expect(() => addVat(10.5, 21)).toThrow(RangeError);
    expect(() => addVat(-1, 21)).toThrow(RangeError);
    expect(() => splitVatInclusive(-1, 21)).toThrow(RangeError);
    expect(() => splitVatInclusive(1000.5, 21)).toThrow(RangeError);
  });
});
