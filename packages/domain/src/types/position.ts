/**
 * Positions — the fifteen stable functions of Numinia (glossary §S2).
 *
 * ADR-013: `loreRestriction` records the manual's gender restrictions as inert
 * data. Application code MUST NOT branch on it; the product policy is an open
 * Oracle decision.
 */

import type { LocalizedString } from './i18n.js';

export const POSITION_IDS = [
  'guardian-of-the-gates',
  'pythia',
  'ambassador',
  'game-master',
  'legionary',
  'armonaut',
  'whisperer-of-machines',
  'runner-of-the-veil',
  'archivist',
  'hermeneut',
  'mediator-of-the-prism',
  'cartographer-of-the-wind',
  'oneiromancer',
  'anacharchid',
  'ethnarch',
] as const;
export type PositionId = (typeof POSITION_IDS)[number];

export interface PositionLoreRestriction {
  readonly gender: 'women-only' | 'men-only';
}

export interface Position {
  readonly id: PositionId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly loreRestriction?: PositionLoreRestriction;
}
