/**
 * Humors — the four classical humors (glossary §10).
 * Each links one physical and one psychic attribute (RPG manual, ch. 3 fr. 5).
 */

import type { LocalizedString } from './i18n.js';
import type { PhysicalAttribute, PsychicAttribute } from './attribute.js';

export const HUMOR_IDS = ['blood', 'yellow-bile', 'black-bile', 'phlegm'] as const;
export type HumorId = (typeof HUMOR_IDS)[number];

export interface Humor {
  readonly id: HumorId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
  readonly temperament: LocalizedString;
  readonly linkedAttributes: readonly [PhysicalAttribute, PsychicAttribute];
}
