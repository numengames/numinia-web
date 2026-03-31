/**
 * Season storage — CRUD for season data in the GitHub data repo.
 *
 * Follows the same pattern as github-storage.ts:
 * - snake_case in JSON, camelCase in TypeScript
 * - fetchData / updateData for read/write with optimistic locking
 */

import { fetchData, updateData } from '@/lib/github-storage';
import type {
  Season,
  Adventure,
  LootItem,
  BurnRitual,
  PuzzleType,
  SeasonProgress,
  PassHolder,
  UserSeasonStatus,
} from '@/types/season';

// ---------------------------------------------------------------------------
// Data paths in the data repo
// ---------------------------------------------------------------------------

const SEASONS_INDEX_PATH = 'data/seasons/seasons-index.json';

function seasonPath(seasonId: string): string {
  return `data/seasons/${seasonId}.json`;
}

function progressPath(seasonId: string): string {
  return `data/seasons/${seasonId}-progress.json`;
}

// ---------------------------------------------------------------------------
// Raw JSON shapes (snake_case as stored in GitHub)
// ---------------------------------------------------------------------------

interface RawSeasonIndex {
  active_season: string;
  seasons: string[];
}

interface RawLootItem {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  thumbnail_url: string;
  type: string;
}

interface RawAdventure {
  id: string;
  order: number;
  name: Record<string, string>;
  description: Record<string, string>;
  url: string;
  requires_pass: boolean;
  duration_minutes: number;
  difficulty: number;
  puzzle_type: string;
  published: boolean;
  free_loot: RawLootItem;
  premium_loot: RawLootItem;
}

interface RawBurnRitual {
  enabled: boolean;
  required_items: number;
  reward: RawLootItem;
}

interface RawSeason {
  id: string;
  slug: string;
  title: Record<string, string>;
  description: Record<string, string>;
  status: 'active' | 'upcoming' | 'ended';
  pass_price_eur: number;
  stripe_price_id: string;
  start_date: string;
  end_date: string;
  adventures: RawAdventure[];
  burn_ritual: RawBurnRitual;
}

interface RawPassHolder {
  address: string;
  purchased_at: string;
  stripe_session_id: string;
  completed_adventures: string[];
  burn_completed: boolean;
}

interface RawSeasonProgress {
  pass_holders: RawPassHolder[];
}

// ---------------------------------------------------------------------------
// Converters: snake_case → camelCase
// ---------------------------------------------------------------------------

function toLootItem(raw: RawLootItem): LootItem {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? {},
    thumbnailUrl: raw.thumbnail_url,
    type: raw.type as LootItem['type'],
  };
}

function toAdventure(raw: RawAdventure): Adventure {
  return {
    id: raw.id,
    order: raw.order,
    name: raw.name,
    description: raw.description ?? {},
    url: raw.url,
    requiresPass: raw.requires_pass,
    durationMinutes: raw.duration_minutes,
    difficulty: raw.difficulty,
    puzzleType: raw.puzzle_type as PuzzleType,
    published: raw.published ?? true,
    freeLoot: toLootItem(raw.free_loot),
    premiumLoot: toLootItem(raw.premium_loot),
  };
}

function toBurnRitual(raw: RawBurnRitual): BurnRitual {
  return {
    enabled: raw.enabled,
    requiredItems: raw.required_items,
    reward: toLootItem(raw.reward),
  };
}

function toSeason(raw: RawSeason): Season {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description ?? {},
    status: raw.status,
    passPriceEur: raw.pass_price_eur,
    stripePriceId: raw.stripe_price_id,
    startDate: raw.start_date,
    endDate: raw.end_date,
    adventures: raw.adventures.map(toAdventure),
    burnRitual: toBurnRitual(raw.burn_ritual),
  };
}

function toPassHolder(raw: RawPassHolder): PassHolder {
  return {
    address: raw.address,
    purchasedAt: raw.purchased_at,
    stripeSessionId: raw.stripe_session_id,
    completedAdventures: raw.completed_adventures,
    burnCompleted: raw.burn_completed,
  };
}

function toSeasonProgress(raw: RawSeasonProgress): SeasonProgress {
  return {
    passHolders: (raw.pass_holders ?? []).map(toPassHolder),
  };
}

// ---------------------------------------------------------------------------
// Converters: camelCase → snake_case (for writes)
// ---------------------------------------------------------------------------

function toRawPassHolder(holder: PassHolder): RawPassHolder {
  return {
    address: holder.address,
    purchased_at: holder.purchasedAt,
    stripe_session_id: holder.stripeSessionId,
    completed_adventures: holder.completedAdventures,
    burn_completed: holder.burnCompleted,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch the currently active season. */
export async function getActiveSeason(): Promise<Season | null> {
  const index = await fetchData<RawSeasonIndex>(SEASONS_INDEX_PATH);
  if (!index || !index.active_season) return null;

  const raw = await fetchData<RawSeason>(seasonPath(index.active_season));
  if (!raw || !raw.id) return null;

  return toSeason(raw);
}

/** Fetch progress data for a season (all pass holders + their progress). */
export async function getSeasonProgress(seasonId: string): Promise<SeasonProgress> {
  const raw = await fetchData<RawSeasonProgress>(progressPath(seasonId));
  if (!raw || !raw.pass_holders) return { passHolders: [] };
  return toSeasonProgress(raw);
}

/** Get a specific user's season status. */
export async function getUserSeasonStatus(
  seasonId: string,
  address: string,
): Promise<UserSeasonStatus> {
  const progress = await getSeasonProgress(seasonId);
  const holder = progress.passHolders.find(
    (h) => h.address.toLowerCase() === address.toLowerCase(),
  );
  return {
    hasPass: !!holder,
    completedAdventures: holder?.completedAdventures ?? [],
  };
}

/** Record a new pass holder after successful Stripe payment. */
export async function addPassHolder(
  seasonId: string,
  holder: PassHolder,
): Promise<boolean> {
  const progress = await getSeasonProgress(seasonId);

  // Prevent duplicates
  const exists = progress.passHolders.some(
    (h) => h.address.toLowerCase() === holder.address.toLowerCase(),
  );
  if (exists) return true;

  progress.passHolders.push(holder);

  const rawHolders: RawSeasonProgress = {
    pass_holders: progress.passHolders.map(toRawPassHolder),
  };

  return updateData(
    progressPath(seasonId),
    rawHolders,
    `Add season pass holder: ${holder.address.slice(0, 10)}…`,
  );
}

/** Mark an adventure as completed for a wallet address. */
export async function updateAdventureProgress(
  seasonId: string,
  address: string,
  adventureId: string,
): Promise<boolean> {
  const progress = await getSeasonProgress(seasonId);
  const holder = progress.passHolders.find(
    (h) => h.address.toLowerCase() === address.toLowerCase(),
  );

  if (!holder) return false;

  if (!holder.completedAdventures.includes(adventureId)) {
    holder.completedAdventures.push(adventureId);
  }

  const rawHolders: RawSeasonProgress = {
    pass_holders: progress.passHolders.map(toRawPassHolder),
  };

  return updateData(
    progressPath(seasonId),
    rawHolders,
    `Mark adventure ${adventureId} completed for ${address.slice(0, 10)}…`,
  );
}
