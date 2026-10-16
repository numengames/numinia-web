/**
 * The words the two house dialogs share once a community IS an organization
 * (cut 6, 2026-10-16), five locales: the Worlds room's «Asignar a una
 * organización» and the Census's «Añadir a una organización» list the
 * register's communities first and the till's other organizations after, and
 * say that the community's sede opens when it is first used. «Comunidad» and
 * «sede», never «grupo»; the house is «la casa».
 */

import type { SupportedLocale } from '@numinia/domain';

export interface OrgChoiceMessages {
  /** The list's first part: the register's communities. */
  readonly communitiesGroup: string;
  /** The list's second part: organizations the till has that no community owns. */
  readonly othersGroup: string;
  /** Under the Worlds room's select when the community chosen has no organization yet. */
  readonly opensHome: string;
  /** The same, under the Census's select. */
  readonly opensHomeAdd: string;
}

export const ORG_CHOICE_WORDS: Readonly<Record<SupportedLocale, OrgChoiceMessages>> = {
  es: {
    communitiesGroup: 'Comunidades',
    othersGroup: 'Otras',
    opensHome: 'Se abre la sede de la comunidad al asignar.',
    opensHomeAdd: 'Se abre la sede de la comunidad al añadir.',
  },
  en: {
    communitiesGroup: 'Communities',
    othersGroup: 'Others',
    opensHome: 'The community’s home opens when you assign.',
    opensHomeAdd: 'The community’s home opens when you add.',
  },
  ja: {
    communitiesGroup: 'コミュニティ',
    othersGroup: 'その他',
    opensHome: '割り当てると、コミュニティの拠点が開かれます。',
    opensHomeAdd: '追加すると、コミュニティの拠点が開かれます。',
  },
  ko: {
    communitiesGroup: '커뮤니티',
    othersGroup: '기타',
    opensHome: '배정하면 커뮤니티의 거점이 열립니다.',
    opensHomeAdd: '추가하면 커뮤니티의 거점이 열립니다.',
  },
  'pt-br': {
    communitiesGroup: 'Comunidades',
    othersGroup: 'Outras',
    opensHome: 'A sede da comunidade é aberta ao atribuir.',
    opensHomeAdd: 'A sede da comunidade é aberta ao adicionar.',
  },
};
