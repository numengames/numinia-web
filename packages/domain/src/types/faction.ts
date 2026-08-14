/**
 * Factions — Prototype Theory, horizontal arrangement (glossary §4).
 * Gamification is the prototype; Art is the itinerant domain.
 */

import type { LocalizedString, LoreString } from './i18n.js';
import type { DistrictId } from './district.js';

export const FACTION_IDS = [
  'hermeticists',
  'heirs-of-eleusis',
  'stellar-circle',
  'neo-atlantists',
] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const FIELDS_OF_DEVELOPMENT = ['education', 'gamification', 'organization', 'art'] as const;
export type FieldOfDevelopment = (typeof FIELDS_OF_DEVELOPMENT)[number];

export type PrototypeRole = 'prototype' | 'peripheral' | 'itinerant';

export interface Faction {
  readonly id: FactionId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly field: FieldOfDevelopment;
  readonly prototypeRole: PrototypeRole;
  readonly districtId: DistrictId;
  /** Seed society name from the manual — lore, ES/EN only. */
  readonly seedName: LoreString;
}
