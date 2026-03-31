/**
 * D6 Pool dice system for Numinia RPG.
 *
 * Rules:
 * - Roll N d6 (pool size)
 * - 6 = success, 1 = failure
 * - If there's at least one success AND one failure, the first failure is free
 * - Net = successes - max(0, failures - freeFailure)
 * - ÉXITO TOTAL: net ≥ 3
 * - ÉXITO: net ≥ 1
 * - FRACASO: failures > 0 and net = 0
 * - FALLO: no successes and no failures
 */

export type RollOutcome = 'ÉXITO TOTAL' | 'ÉXITO' | 'FRACASO' | 'FALLO';

export interface DiceResult {
  dice: number[];
  pool: number;
  successes: number;
  failures: number;
  freeFailure: boolean;
  net: number;
  outcome: RollOutcome;
  statName: string;
}

export function rollDice(pool: number, statName: string = 'Tirada'): DiceResult {
  const clamped = Math.max(0, Math.min(pool, 60));
  const dice: number[] = [];

  for (let i = 0; i < clamped; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }

  const successes = dice.filter(d => d === 6).length;
  const failures = dice.filter(d => d === 1).length;

  const freeFailure = successes > 0 && failures > 0;
  const cancelledFailures = Math.max(0, failures - (freeFailure ? 1 : 0));
  const net = Math.max(0, successes - cancelledFailures);

  let outcome: RollOutcome;
  if (net >= 3) outcome = 'ÉXITO TOTAL';
  else if (net >= 1) outcome = 'ÉXITO';
  else if (failures > 0) outcome = 'FRACASO';
  else outcome = 'FALLO';

  return { dice, pool: clamped, successes, failures, freeFailure, net, outcome, statName };
}

export function getOutcomeColor(outcome: RollOutcome): string {
  switch (outcome) {
    case 'ÉXITO TOTAL': return 'text-blue-500';
    case 'ÉXITO': return 'text-green-500';
    case 'FRACASO': return 'text-red-500';
    case 'FALLO': return 'text-yellow-500';
  }
}

export function getOutcomeBg(outcome: RollOutcome): string {
  switch (outcome) {
    case 'ÉXITO TOTAL': return 'bg-blue-500/10 border-blue-500/30';
    case 'ÉXITO': return 'bg-green-500/10 border-green-500/30';
    case 'FRACASO': return 'bg-red-500/10 border-red-500/30';
    case 'FALLO': return 'bg-yellow-500/10 border-yellow-500/30';
  }
}
