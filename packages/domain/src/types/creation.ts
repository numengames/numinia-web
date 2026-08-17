/**
 * Creation rules — the v0.6.0 manual's character-creation facts as types
 * (MIS-085 D). Only hard mechanics live here (numbers, id associations);
 * the manual's prose stays in numinia-lore (ADR-020) and reaches citizens
 * through the Codex.
 */

import type { ArchetypeId } from './archetype.js';
import type { AttributeId } from './attribute.js';
import type { CompetenceId } from './competence.js';
import type { FactionId } from './faction.js';
import type { GuildId } from './guild.js';
import type { SpeciesId } from './species.js';

/** Three competences tied to one identity axis (manual ch. 3 fr. 4). */
export type CompetenceTriad = readonly [CompetenceId, CompetenceId, CompetenceId];

/**
 * Compatibility tiers, ordered [preferred, compatible, neutral, incompatible]
 * (manual ch. 3 fr. 3: 2 / 1 / 0 points; incompatible invalidates the
 * position). Guilds and factions are fully enumerated; species and
 * archetypes list four and every unlisted id is neutral (manual line 4503).
 */
export interface PositionAffinityTiers {
  readonly guilds: readonly [GuildId, GuildId, GuildId, GuildId];
  readonly factions: readonly [FactionId, FactionId, FactionId, FactionId];
  readonly species: readonly [SpeciesId, SpeciesId, SpeciesId, SpeciesId];
  readonly archetypes: readonly [ArchetypeId, ArchetypeId, ArchetypeId, ArchetypeId];
}

/** The mechanical payload every position grants (manual position blocks). */
export interface PositionMechanics {
  /** +1 to this attribute at creation (per-position "habilidades" line). */
  readonly bonusAttribute: AttributeId;
  /** Starting Umbral points (2–4, per-position block). */
  readonly initialUmbral: number;
  /** Initiative value (1–4). The manual assigns it but defines no consuming
   * rule (divergence #7, docs/reference/sheet-rules-findings.md). */
  readonly initiative: number;
  readonly affinity: PositionAffinityTiers;
}

/** Identity axes a sheet may have chosen; absent axes are simply undecided. */
export interface CreationIdentity {
  readonly guildId?: GuildId | undefined;
  readonly factionId?: FactionId | undefined;
  readonly speciesId?: SpeciesId | undefined;
  readonly archetypeId?: ArchetypeId | undefined;
}

/** Affinity verdict: the aptitude dice pool, or an invalidated position. */
export interface PositionAffinity {
  readonly compatible: boolean;
  /** Sum of tier points over the decided axes (0–8); 0 when incompatible. */
  readonly points: number;
}
