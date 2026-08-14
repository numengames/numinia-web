/**
 * Archetypes — the twelve Pearson/Jung archetypes (glossary §9).
 * Each guild and each faction aligns with three of them (RPG manual, ch. 3 fr. 5).
 * Note: archetype `explorer` (singular) is distinct from house `explorers`.
 */

import type { LocalizedString } from './i18n.js';
import type { GuildId } from './guild.js';
import type { FactionId } from './faction.js';

export const ARCHETYPE_IDS = [
  'innocent',
  'orphan',
  'warrior',
  'caregiver',
  'explorer',
  'destroyer',
  'lover',
  'creator',
  'ruler',
  'magician',
  'sage',
  'jester',
] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export interface Archetype {
  readonly id: ArchetypeId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly alignedGuilds: readonly GuildId[];
  readonly alignedFactions: readonly FactionId[];
}
