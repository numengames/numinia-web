/**
 * Seasons — temporal progression (Battle-Pass shape from the legacy design,
 * ADR-010). Adventures are Narrative Projection (game, Hyperfy); they are NOT
 * missions (ADR-005).
 */

import type { LocalizedString } from './i18n.js';

export const SEASON_STATUSES = ['upcoming', 'active', 'ended'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const REWARD_TRACKS = ['free', 'premium'] as const;
export type RewardTrack = (typeof REWARD_TRACKS)[number];

export interface Reward {
  readonly id: string;
  readonly track: RewardTrack;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** Asset granted by this reward, when it is a digital good. */
  readonly assetId?: string;
}

export interface Adventure {
  readonly id: string;
  readonly seasonId: string;
  readonly order: number;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly rewards: readonly Reward[];
}

export interface Season {
  readonly id: string;
  readonly status: SeasonStatus;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** ISO dates; the platform never invents time. */
  readonly startsAt: string;
  readonly endsAt: string;
  readonly adventures: readonly Adventure[];
}
