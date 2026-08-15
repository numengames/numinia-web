/**
 * Equipment — relics and weapons (RPG manual, chapter 6).
 * Deep-lore tier: names and effects are LoreString (ES+EN only, ADR-002).
 */

import type { LoreString } from './i18n.js';
import type { AttributeId } from './attribute.js';
import type { CompetenceId } from './competence.js';
import type { PositionId } from './position.js';

export const ATTACK_TYPES = ['light', 'heavy', 'special'] as const;
export type AttackType = (typeof ATTACK_TYPES)[number];

/** A relic binds to specific Positions and channels one Competence. */
export interface Relic {
  readonly kind: 'relic';
  readonly id: string;
  readonly name: LoreString;
  readonly description: LoreString;
  readonly positionIds: readonly PositionId[];
  readonly competenceId: CompetenceId;
  readonly property: LoreString;
  readonly riskFactor: LoreString;
}

export interface WeaponAttack {
  readonly type: AttackType;
  readonly name: LoreString;
  readonly effect: LoreString;
}

export interface Weapon {
  readonly kind: 'weapon';
  readonly id: string;
  readonly name: LoreString;
  readonly description: LoreString;
  /** The attribute whose dice pool boosts the attack roll. */
  readonly bonusAttribute: AttributeId;
  /** Dice notation, e.g. "1D6", "1D10+2". */
  readonly damageBase: string;
  readonly damageMax: string;
  readonly attacks: readonly WeaponAttack[];
}

export type Equipment = Relic | Weapon;
