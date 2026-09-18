/**
 * Ranks — the cumulative progression ladder (glossary §6).
 *
 * the `oracle` rank carries NO cardinality constraint. The five
 * founding Oracles are lore (Narrative Projection), not a rank invariant.
 *
 * Provenance (the manual, numinia-nwos lore/game/manual-v0.6.0.md): it only
 * grounds citizenship, the Vernaculars (Concordia observers) and the
 * Oracles. The full six-step ladder is a PLATFORM design (Operating
 * System), not manual canon — legitimate, and declared as such.
 */

import type { LocalizedString } from './i18n.js';

export const RANKS = ['nomad', 'citizen', 'pilgrim', 'vernacular', 'archon', 'oracle'] as const;
export type Rank = (typeof RANKS)[number];

export type RankLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface RankDefinition {
  readonly id: Rank;
  readonly level: RankLevel;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
}
