/**
 * Districts — four floating territories (glossary §5).
 * Coordinates and heights come from the RPG manual, chapter 5.
 */

import type { LocalizedString } from './i18n.js';
import type { FactionId } from './faction.js';

export const DISTRICT_IDS = ['vitruvian', 'ouroboros', 'solomon', 'sycamore'] as const;
export type DistrictId = (typeof DISTRICT_IDS)[number];

/** Km from the Plaza del Ágora: x grows east, y grows north. */
export interface DistrictCoordinates {
  readonly x: number;
  readonly y: number;
}

export interface District {
  readonly id: DistrictId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly factionId: FactionId;
  readonly coordinates: DistrictCoordinates;
  readonly heightMeters: number;
  readonly diameterKm: number;
}
