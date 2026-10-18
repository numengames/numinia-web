/**
 * «Poder y saldo» (MVL-B, 2026-10-18): the one rule a world's power choice
 * asks of an organization's prepaid balance. A world that starts on begins
 * spending that organization's balance from the moment the machine takes
 * it; a world that starts off spends and checks nothing. Pure and cheap on
 * purpose — the till owns how the balance itself is counted (accounts.ts,
 * saldo-view.ts); this only says whether what the till already answered is
 * enough to let a world start now, so Numen Games' own flow can ask the
 * same question later without this file changing.
 */

/** Whether an organization's balance, in cents, is enough to let a world start on. */
export function hasBalanceToPowerOn(balanceCents: number): boolean {
  return balanceCents > 0;
}
