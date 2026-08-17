/**
 * Creation resolvers (MIS-085 D): the two questions every sheet asks —
 * which competences does this identity enable, and how many aptitude dice
 * does this position grant. Pure functions over the creation constants.
 */

import {
  FACTION_COMPETENCES,
  GUILD_COMPETENCES,
  POSITION_MECHANICS,
  SPECIES_COMPETENCES,
} from '../constants/creation.js';
import type { CompetenceId } from '../types/competence.js';
import type { CreationIdentity, PositionAffinity } from '../types/creation.js';
import type { PositionId } from '../types/position.js';

/**
 * Enabled competences = union of the triads of guild, faction and species
 * (manual annex 6705: the rest are disabled). Undecided axes contribute
 * nothing — a growing sheet enables as it decides.
 */
export function enabledCompetences(identity: CreationIdentity): ReadonlySet<CompetenceId> {
  const enabled = new Set<CompetenceId>();
  if (identity.guildId) for (const id of GUILD_COMPETENCES[identity.guildId]) enabled.add(id);
  if (identity.factionId) for (const id of FACTION_COMPETENCES[identity.factionId]) enabled.add(id);
  if (identity.speciesId) for (const id of SPECIES_COMPETENCES[identity.speciesId]) enabled.add(id);
  return enabled;
}

/** Tier position → points: preferred 2, compatible 1, neutral 0 (manual
 * 4479–4490); index 3 is the incompatible tier. Unlisted ids are neutral. */
function tierPoints(tiers: readonly string[], id: string): number | 'incompatible' {
  const index = tiers.indexOf(id);
  if (index === 3) return 'incompatible';
  if (index === 0) return 2;
  if (index === 1) return 1;
  return 0;
}

/**
 * The aptitude dice pool a position grants for this identity: sum of tier
 * points over the DECIDED axes (0–8). Any incompatible axis invalidates the
 * position outright (manual 4476).
 */
export function positionAffinity(
  positionId: PositionId,
  identity: CreationIdentity,
): PositionAffinity {
  const { affinity } = POSITION_MECHANICS[positionId];
  const axes: ReadonlyArray<[readonly string[], string | undefined]> = [
    [affinity.guilds, identity.guildId],
    [affinity.factions, identity.factionId],
    [affinity.species, identity.speciesId],
    [affinity.archetypes, identity.archetypeId],
  ];
  let points = 0;
  for (const [tiers, id] of axes) {
    // Type guard only — behaviorally a PROVEN-EQUIVALENT mutant: an
    // undecided axis scored through tierPoints lands on indexOf === -1,
    // which is neutral (0), exactly what skipping yields.
    if (id === undefined) continue;
    const score = tierPoints(tiers, id);
    if (score === 'incompatible') return { compatible: false, points: 0 };
    points += score;
  }
  return { compatible: true, points };
}
