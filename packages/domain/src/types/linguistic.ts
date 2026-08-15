/**
 * Linguistic variations — dialect (species), sociolect (district), lingo
 * (guild), idiolect (personal). Glossary §S4; RPG manual ch. 3 fr. 6.
 */

export const DIALECT_IDS = [
  'cybernetic',
  'epistolary',
  'primordial',
  'bizarre',
  'prophetic',
] as const;
export type DialectId = (typeof DIALECT_IDS)[number];

export const SOCIOLECT_IDS = ['erudite', 'histrionic', 'professorial', 'mystic'] as const;
export type SociolectId = (typeof SOCIOLECT_IDS)[number];

export const LINGO_IDS = ['transmutative', 'mythological', 'pragmatic', 'martial'] as const;
export type LingoId = (typeof LINGO_IDS)[number];

export interface LinguisticProfile {
  readonly dialect: DialectId;
  readonly sociolect: SociolectId;
  readonly lingo: LingoId;
  /** Free text, player-defined, DJ-approved (e.g. "speaks like Julius Caesar"). */
  readonly idiolect: string;
}
