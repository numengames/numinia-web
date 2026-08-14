/**
 * Session Zero — thresholds, seals, and Prism Cells (glossary §12–13).
 * Seal names follow the seminal source (Culture + Wisdom for Thought — the
 * constitution was corrected accordingly, ADR-012).
 */

import type { LocalizedString } from './i18n.js';
import type { GuildId } from './guild.js';
import type { FactionId } from './faction.js';

export const THRESHOLD_IDS = [
  'threshold-of-thought',
  'threshold-of-transformation',
  'threshold-of-justice',
  'threshold-of-valor',
] as const;
export type ThresholdId = (typeof THRESHOLD_IDS)[number];

export const SEAL_IDS = [
  'seal-of-culture',
  'seal-of-wisdom',
  'seal-of-transformation',
  'seal-of-creativity',
  'seal-of-justice',
  'seal-of-valor',
  'seal-of-protection',
  'seal-of-balance',
] as const;
export type SealId = (typeof SEAL_IDS)[number];

export interface Threshold {
  readonly id: ThresholdId;
  readonly guildId: GuildId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
}

export interface Seal {
  readonly id: SealId;
  readonly thresholdId: ThresholdId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** Chest seals grant citizenship; challenge seals require the platforming route. */
  readonly obtainedBy: 'chest' | 'challenge';
}

export type SealCollection = Readonly<Record<SealId, boolean>>;

/** Faction-affinity token balances. */
export type PrismCellBalance = Readonly<Record<FactionId, number>>;
