/**
 * Guilds — Basic Level Theory hierarchy (4 guilds × 2 branches × 2 houses).
 * Ids are frozen by docs/glossary.md §1–3 (ADR-012).
 */

import type { LocalizedString } from './i18n.js';

export const GUILD_IDS = ['alchemists', 'exegetes', 'procurators', 'sentinels'] as const;
export type GuildId = (typeof GUILD_IDS)[number];

export const BRANCH_IDS = [
  'artisans',
  'engineers',
  'chroniclers',
  'scholars',
  'jurists',
  'syndics',
  'seraphim',
  'archangels',
] as const;
export type BranchId = (typeof BRANCH_IDS)[number];

export const HOUSE_IDS = [
  'projectors',
  'aesthetes',
  'architects',
  'automata',
  'logographers',
  'bards',
  'hierophants',
  'thaumaturges',
  'legal-counsels',
  'heralds',
  'treasurers',
  'councillors',
  'captains',
  'guardians',
  'healers',
  'explorers',
] as const;
export type HouseId = (typeof HOUSE_IDS)[number];

export interface House {
  readonly id: HouseId;
  readonly branchId: BranchId;
  readonly guildId: GuildId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
}

export interface Branch {
  readonly id: BranchId;
  readonly guildId: GuildId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly houses: readonly [House, House];
}

export interface Guild {
  readonly id: GuildId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly branches: readonly [Branch, Branch];
}

/** A citizen's full path through the hierarchy. */
export interface GuildPath {
  readonly guildId: GuildId;
  readonly branchId: BranchId;
  readonly houseId: HouseId;
}
