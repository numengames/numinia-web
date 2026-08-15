/**
 * Character sheet — the complete citizen identity (Compendium of Attributes
 * and Ranks). Progressive by design: a Nomad's sheet is mostly empty; fields
 * fill as the citizen advances (guild/faction at Session Zero, etc.).
 *
 * `walletAddress` is optional (ADR-006: auth is progressive, wallet is not
 * the entry requirement) and MUST never leak into analytics.
 */

import type { Rank } from './rank.js';
import type { GuildPath } from './guild.js';
import type { FactionId } from './faction.js';
import type { DistrictId } from './district.js';
import type { SpeciesConfig } from './species.js';
import type { PositionId } from './position.js';
import type { AttributeScores } from './attribute.js';
import type { CompetenceId } from './competence.js';
import type { ArchetypeId } from './archetype.js';
import type { HumorId } from './humor.js';
import type { LinguisticProfile } from './linguistic.js';
import type { SealCollection, PrismCellBalance } from './seal.js';

export interface CharacterSheet {
  readonly name: string;
  readonly rank: Rank;
  readonly speciesConfig?: SpeciesConfig;
  readonly positionId?: PositionId;
  readonly guildPath?: GuildPath;
  readonly factionId?: FactionId;
  readonly districtId?: DistrictId;
  readonly attributes?: AttributeScores;
  /** Only competences associated to guild/faction/species may carry scores. */
  readonly competences?: Readonly<Partial<Record<CompetenceId, number>>>;
  readonly archetypeId?: ArchetypeId;
  readonly humorId?: HumorId;
  readonly linguistic?: LinguisticProfile;
  readonly seals?: SealCollection;
  readonly prismCells?: PrismCellBalance;
  readonly walletAddress?: string;
}
