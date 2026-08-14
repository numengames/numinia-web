/**
 * Species — five pillars plus the hybrid (mestizaje) system (glossary §11).
 * Hybrid generation rules come from the RPG manual, chapter 3, fragment 2.
 */

import type { LocalizedString } from './i18n.js';

export const SPECIES_IDS = [
  'biomechanical',
  'humanitas',
  'reptilian',
  'cyanite',
  'spectral',
] as const;
export type SpeciesId = (typeof SPECIES_IDS)[number];

export interface Species {
  readonly id: SpeciesId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  /** "El Racional", "El Místico"… — the species' character. */
  readonly character: LocalizedString;
  /** Technology, Culture, Nature, Knowledge, Aether. */
  readonly forceField: LocalizedString;
}

/** Pure lineage: a single species. */
export interface PureSpeciesConfig {
  readonly kind: 'pure';
  readonly species: SpeciesId;
}

/**
 * Hybrid lineage: two primary species (50/50, or 35/35 when secondaries exist)
 * plus zero, one, or two secondary species (30 split among them).
 */
export interface HybridSpeciesConfig {
  readonly kind: 'hybrid';
  readonly primary: readonly [SpeciesId, SpeciesId];
  readonly secondary: readonly SpeciesId[];
}

export type SpeciesConfig = PureSpeciesConfig | HybridSpeciesConfig;
