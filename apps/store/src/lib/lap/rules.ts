/**
 * Sheet rules engine (MIS-085 D): the v0.6.0 creation rules applied to a
 * LapSheet. Pure derivation — the engine reads the sheet and reports
 * budgets, enabled competences, position mechanics and audit findings; it
 * never mutates the file (data dignity: audit, don't amputate).
 */

import {
  ATTRIBUTE_CREATION_MAX,
  ATTRIBUTE_CREATION_MIN,
  ATTRIBUTE_CREATION_POINTS,
  COMPETENCE_POOL_PER_SOURCE,
  POSITION_MECHANICS,
  enabledCompetences,
  positionAffinity,
  ARCHETYPE_IDS,
  FACTION_IDS,
  GUILD_IDS,
  POSITION_IDS,
  SPECIES_IDS,
  type ArchetypeId,
  type AttributeId,
  type CompetenceId,
  type FactionId,
  type GuildId,
  type PositionAffinity,
  type PositionId,
  type SpeciesId,
} from '@numinia/domain';
import { ATTRIBUTE_KEYS, type LapSheet } from './sheet';

export interface SheetPositionRules {
  readonly id: PositionId;
  readonly bonusAttribute: AttributeId;
  readonly initialUmbral: number;
  readonly initiative: number;
  readonly affinity: PositionAffinity;
}

export interface SheetRules {
  readonly enabled: ReadonlySet<CompetenceId>;
  readonly attributes: {
    readonly pool: number;
    readonly spent: number;
    readonly min: number;
    readonly max: number;
  };
  readonly competences: {
    readonly perSource: number;
    /** 6 points per DECIDED source (guild, faction, species). */
    readonly pool: number;
    readonly spent: number;
  };
  /** Competences carrying points this identity does not enable — an import
   * may bring them; the engine reports, the UI warns, nobody deletes. */
  readonly disabledWithPoints: readonly CompetenceId[];
  readonly position?: SheetPositionRules | undefined;
  /** Aliento del Velo = Percepción (manual 6517). */
  readonly veilBreath: number;
}

const asId = <T extends string>(ids: readonly T[], raw: string): T | undefined =>
  (ids as readonly string[]).includes(raw) ? (raw as T) : undefined;

export function sheetRules(sheet: LapSheet): SheetRules {
  const guildId = asId<GuildId>(GUILD_IDS, sheet.identity.guild);
  const factionId = asId<FactionId>(FACTION_IDS, sheet.identity.faction);
  const speciesId = asId<SpeciesId>(SPECIES_IDS, sheet.identity.species);
  const archetypeId = asId<ArchetypeId>(ARCHETYPE_IDS, sheet.identity.archetype);
  const positionId = asId<PositionId>(POSITION_IDS, sheet.identity.position);
  const identity = { guildId, factionId, speciesId, archetypeId };

  const enabled = enabledCompetences(identity);
  const entries = Object.entries(sheet.competences) as ReadonlyArray<[CompetenceId, number]>;
  const spent = entries.reduce((sum, [id, value]) => (enabled.has(id) ? sum + value : sum), 0);
  const disabledWithPoints = entries
    .filter(([id, value]) => value > 0 && !enabled.has(id))
    .map(([id]) => id);

  const decidedSources = [guildId, factionId, speciesId].filter(Boolean).length;

  let position: SheetPositionRules | undefined;
  if (positionId) {
    const mechanics = POSITION_MECHANICS[positionId];
    position = {
      id: positionId,
      bonusAttribute: mechanics.bonusAttribute,
      initialUmbral: mechanics.initialUmbral,
      initiative: mechanics.initiative,
      affinity: positionAffinity(positionId, identity),
    };
  }

  return {
    enabled,
    attributes: {
      pool: ATTRIBUTE_CREATION_POINTS,
      spent: ATTRIBUTE_KEYS.reduce((sum, key) => sum + sheet.attributes[key], 0),
      min: ATTRIBUTE_CREATION_MIN,
      max: ATTRIBUTE_CREATION_MAX,
    },
    competences: {
      perSource: COMPETENCE_POOL_PER_SOURCE,
      pool: COMPETENCE_POOL_PER_SOURCE * decidedSources,
      spent,
    },
    disabledWithPoints,
    position,
    veilBreath: sheet.attributes.perception,
  };
}
