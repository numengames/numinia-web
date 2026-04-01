/** Season Pass (Battle Pass) types — Numinia Seasons */

export type PuzzleType =
  | 'hieroglyph'
  | 'logic'
  | 'brain_puzzle'
  | 'visual_acuity'
  | 'escape_room'
  | 'maze'
  | 'easter_egg'
  | 'mixed';

export interface Season {
  id: string;
  slug: string;
  title: Record<string, string>;
  description: Record<string, string>;
  status: 'active' | 'upcoming' | 'ended';
  passPriceEur: number;
  stripePriceId: string;
  startDate: string;
  endDate: string;
  adventures: Adventure[];
  burnRitual: BurnRitual;
}

export interface Adventure {
  id: string;
  order: number;
  name: Record<string, string>;
  description: Record<string, string>;
  url: string;
  requiresPass: boolean;
  /** Estimated duration in minutes */
  durationMinutes: number;
  /** 1-5 star difficulty */
  difficulty: number;
  puzzleType: PuzzleType;
  /** Whether this adventure is published/playable */
  published: boolean;
  freeLoot: LootItem;
  premiumLoot: LootItem;
}

export interface LootItem {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  thumbnailUrl: string;
  type: 'wearable' | 'artifact' | 'nft_artwork';
}

export interface BurnRitual {
  enabled: boolean;
  requiredItems: number;
  reward: LootItem;
}

export interface PassHolder {
  address: string;
  purchasedAt: string;
  stripeSessionId: string;
  nftTokenId?: string;
  nftTransactionHash?: string;
  completedAdventures: string[];
  burnCompleted: boolean;
}

export interface SeasonProgress {
  passHolders: PassHolder[];
}

/** Shape returned by GET /api/seasons for the current user. */
export interface UserSeasonStatus {
  hasPass: boolean;
  completedAdventures: string[];
}
