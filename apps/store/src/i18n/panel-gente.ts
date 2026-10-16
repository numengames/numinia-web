/**
 * «Gente» (the panel's people list, cut 9): the few words the screen adds to
 * the panel's, the people's (i18n/panel-people.ts: the rank names) and
 * Saldo's (the «tú» tag). Five locales, typed so a missing one does not
 * compile. No word of presence on purpose: there is no «en línea».
 */

import type { SupportedLocale } from '@numinia/domain';

export interface GenteMessages {
  /** The group of the Oracles (the house's own wallets). */
  readonly oracles: string;
  /** The group of everybody who holds no role of the organization. */
  readonly rest: string;
  /** The label of the groups' region. */
  readonly region: string;
  /** Nobody is in yet. */
  readonly none: string;
  /** The title of the owner mark on a row. */
  readonly owner: string;
}

export const GENTE_UI: Readonly<Record<SupportedLocale, GenteMessages>> = {
  es: {
    oracles: 'Oráculos',
    rest: 'El resto',
    region: 'La gente de la organización, por grupos',
    none: 'Nadie todavía: la sede espera a quien lleve la comunidad.',
    owner: 'Titular',
  },
  en: {
    oracles: 'Oracles',
    rest: 'Everyone else',
    region: 'The people of the organization, in groups',
    none: 'Nobody yet: the venue waits for whoever leads the community.',
    owner: 'Owner',
  },
  ja: {
    oracles: 'オラクル',
    rest: 'その他の人',
    region: '組織の人々（グループ別）',
    none: 'まだ誰もいません。会場はコミュニティを率いる人を待っています。',
    owner: 'オーナー',
  },
  ko: {
    oracles: '오라클',
    rest: '나머지',
    region: '조직의 사람들(그룹별)',
    none: '아직 아무도 없습니다. 장소는 커뮤니티를 이끌 사람을 기다립니다.',
    owner: '소유자',
  },
  'pt-br': {
    oracles: 'Oráculos',
    rest: 'O resto',
    region: 'As pessoas da organização, por grupos',
    none: 'Ninguém ainda: a sede espera quem lidere a comunidade.',
    owner: 'Proprietário',
  },
};
