/**
 * Competences — nine skills in three domains (glossary §8).
 * Each guild, faction, and species is associated with three of them.
 */

import type { LocalizedString } from './i18n.js';

export const COMPETENCE_DOMAIN_IDS = [
  'engineering-construction',
  'security-protection',
  'communication-connection',
] as const;
export type CompetenceDomainId = (typeof COMPETENCE_DOMAIN_IDS)[number];

export const COMPETENCE_IDS = [
  'technomancy',
  'advanced-forging',
  'virtual-architecture',
  'defensive-networks',
  'chronomancy',
  'cryptology',
  'decoding',
  'neural-vision',
  'luminous-projection',
] as const;
export type CompetenceId = (typeof COMPETENCE_IDS)[number];

export interface CompetenceDomain {
  readonly id: CompetenceDomainId;
  readonly name: LocalizedString;
}

export interface Competence {
  readonly id: CompetenceId;
  readonly domainId: CompetenceDomainId;
  readonly name: LocalizedString;
  readonly description: LocalizedString;
}

export type CompetenceScores = Readonly<Record<CompetenceId, number>>;
