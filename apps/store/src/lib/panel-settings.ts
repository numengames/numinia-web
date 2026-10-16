/**
 * «Ajustes de la comunidad» (/panel/ajustes/), the pure part: which pieces of
 * the panel an organization has on, and the three presets of «Cómo se llama
 * cada cosa». Screen words only — the back stays standard English (`owner`,
 * `admin`, `member`, STD-052 ids).
 *
 * `withVocabulary` is the ONE lookup the panel's own screens go through: the
 * frame calls it once with the organization's preset and every screen reads
 * the words it returns, so no screen carries a preset's word of its own.
 * «Mixto» is today's wording (it IS the words in i18n/panel.ts); «Sencillo»
 * and «Numinia» replace three terms: the home of a world, the meeting, and
 * who owns the organization.
 *
 * Pure: no fetch, no env, no zod, no DOM; an island imports it.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../i18n/panel';
import type { OrgPiece } from './panel';

/** The pieces an organization may turn off; the summary and the settings are always on. */
export const SWITCHABLE_PIECES = [
  'venues',
  'members',
  'gente',
  'roles',
  'agents',
  'balance',
] as const;
export type SwitchablePiece = (typeof SWITCHABLE_PIECES)[number];

/** The presets: simple words, today's mix, or the game's own. */
export const VOCABULARIES = ['simple', 'mixed', 'numinia'] as const;
export type Vocabulary = (typeof VOCABULARIES)[number];

/** Today's behaviour: the wording the panel already had. */
export const DEFAULT_VOCABULARY: Vocabulary = 'mixed';

/** «Qué ha pasado» shows this many lines at a time (the till pages the same). */
export const HAPPENINGS_PAGE = 30;

export function isSwitchable(piece: string): piece is SwitchablePiece {
  return SWITCHABLE_PIECES.some((candidate) => candidate === piece);
}

export function isVocabulary(value: unknown): value is Vocabulary {
  return VOCABULARIES.some((candidate) => candidate === value);
}

/** Whether a piece is on, given the ones that are off: a piece nobody may turn off always is. */
export function isOn(piece: OrgPiece, off: readonly string[]): boolean {
  return !off.includes(piece);
}

/** The three words a preset changes. */
interface Terms {
  readonly venues: string;
  readonly gatherings: string;
  readonly owner: string;
}

/** «Sencillo» and «Numinia» in five locales («Mixto» is the panel's own words). */
const TERMS: Readonly<
  Record<Exclude<Vocabulary, 'mixed'>, Readonly<Record<SupportedLocale, Terms>>>
> = {
  simple: {
    es: { venues: 'Salas', gatherings: 'Reuniones', owner: 'Coordinación' },
    en: { venues: 'Rooms', gatherings: 'Meetings', owner: 'Coordinator' },
    ja: { venues: '部屋', gatherings: 'ミーティング', owner: 'コーディネーター' },
    ko: { venues: '방', gatherings: '회의', owner: '코디네이터' },
    'pt-br': { venues: 'Salas', gatherings: 'Reuniões', owner: 'Coordenação' },
  },
  numinia: {
    es: { venues: 'Sedes', gatherings: 'Rituales', owner: 'Propietario' },
    en: { venues: 'Venues', gatherings: 'Rituals', owner: 'Owner' },
    ja: { venues: '会場', gatherings: '儀式', owner: 'オーナー' },
    ko: { venues: '장소', gatherings: '의식', owner: '소유자' },
    'pt-br': { venues: 'Sedes', gatherings: 'Rituais', owner: 'Proprietário' },
  },
};

/** The three words of a preset in one locale, or null for «Mixto» (the panel's own words stand). */
export function termsOf(vocabulary: Vocabulary, locale: SupportedLocale): Terms | null {
  return vocabulary === 'mixed' ? null : TERMS[vocabulary][locale];
}

/** The panel's words under an organization's preset. The only place a preset's word is applied. */
export function withVocabulary(
  words: PanelMessages,
  vocabulary: Vocabulary,
  locale: SupportedLocale,
): PanelMessages {
  const terms = termsOf(vocabulary, locale);
  if (terms === null) return words;
  return {
    ...words,
    names: { ...words.names, venues: terms.venues, gatherings: terms.gatherings },
    standing: { ...words.standing, as: { ...words.standing.as, owner: terms.owner } },
  };
}
