/**
 * Dice for the sheet (MISSION-008): a stat of N rolls N six-sided dice —
 * the legacy table's rule, kept. Crypto-random; pure result, no theater.
 */

export interface DiceRoll {
  readonly rolls: readonly number[];
  readonly total: number;
}

export function rollD6Pool(pool: number, random: () => number = cryptoRandom): DiceRoll {
  const size = Math.min(99, Math.max(0, Math.floor(pool)));
  const rolls = Array.from({ length: size }, () => 1 + Math.floor(random() * 6));
  return { rolls, total: rolls.reduce((sum, value) => sum + value, 0) };
}

function cryptoRandom(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0]! / 2 ** 32;
}
