/**
 * Seasons — temporal progression. Adventures are Narrative Projection (game, virtual worlds); they
 * are NOT missions.
 */

import type { LocalizedString } from './i18n.js';

export const SEASON_STATUSES = ['upcoming', 'active', 'ended'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const REWARD_TRACKS = ['free', 'premium'] as const;
export type RewardTrack = (typeof REWARD_TRACKS)[number];

export const PUZZLE_TYPES = [
  'hieroglyph',
  'logic',
  'brain-puzzle',
  'visual-acuity',
  'escape-room',
  'easter-egg',
  'maze',
] as const;
export type PuzzleType = (typeof PUZZLE_TYPES)[number];

/**
 * Where a reward lives once it is minted: one ERC-1155 token id in one
 * contract. Holding the free reward of a door is how the city knows the door
 * was crossed — the wallet is the proof, not a form.
 */
export interface RewardToken {
  readonly chainId: number;
  readonly contract: `0x${string}`;
  readonly tokenId: string;
}

export interface Reward {
  readonly id: string;
  readonly track: RewardTrack;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** Asset granted by this reward, when it is a digital good. */
  readonly assetId?: string;
  /** The token that proves it is held; absent until the reward is minted. */
  readonly token?: RewardToken;
}

export interface Adventure {
  readonly id: string;
  readonly seasonId: string;
  readonly order: number;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /**
   * The world the adventure is played in, or null when the door is behind the
   * pass: its address is then given by the server to pass holders only.
   */
  readonly worldUrl: string | null;
  /** Only pass holders enter (the season's last door). */
  readonly requiresPass: boolean;
  /** Estimated minutes to finish. */
  readonly durationMinutes: number;
  /** 1 (gentle) to 5 (hard). */
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly puzzle: PuzzleType;
  /** One reward per track: the free one and the premium one. */
  readonly rewards: readonly Reward[];
}

export interface Season {
  readonly id: string;
  readonly status: SeasonStatus;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** ISO dates, or null while the Oracle has not set them: the platform never invents time. */
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly adventures: readonly Adventure[];
}
