/**
 * The panel's «Encuentros» (/panel/encuentros/, v3 carril 5): the words of its
 * screen — the organization's community, its upcoming and held encounters,
 * the way to its calendar and what is said when the organization has no
 * community page yet — five locales. A file of its own: i18n/panel.ts is the
 * frame's (the piece's name and lead live there). The encounters' own titles,
 * dates and places come from the register, already in the page's language.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface PanelGatheringsMessages {
  /** Above the community's name. */
  readonly community: string;
  readonly itsPage: string;
  readonly subscribe: string;
  readonly upcoming: string;
  readonly held: string;
  readonly noUpcoming: string;
  readonly noHeld: string;
  /** The organization has no page in Communities: nothing to list, said plainly. */
  readonly noCommunity: { readonly title: string; readonly text: string };
  /** Who publishes them today. */
  readonly publishNote: string;
}

export const PANEL_GATHERINGS_UI: Readonly<Record<SupportedLocale, PanelGatheringsMessages>> = {
  es: {
    community: 'Su comunidad',
    itsPage: 'Su página',
    subscribe: 'Suscribirte a su calendario',
    upcoming: 'Próximos',
    held: 'Ya celebrados',
    noUpcoming: 'Todavía no hay ninguno publicado.',
    noHeld: 'Aún no hay ninguno celebrado.',
    noCommunity: {
      title: 'Esta organización no tiene todavía página en Comunidades',
      text: 'Sus encuentros saldrán aquí cuando la tenga.',
    },
    publishNote: 'Por ahora, los encuentros los publica la casa en el registro de la ciudad.',
  },
  en: {
    community: 'Its community',
    itsPage: 'Its page',
    subscribe: 'Subscribe to its calendar',
    upcoming: 'Coming',
    held: 'Already held',
    noUpcoming: 'None published yet.',
    noHeld: 'None held yet.',
    noCommunity: {
      title: 'This organization has no page in Communities yet',
      text: 'Its gatherings will show here once it has one.',
    },
    publishNote: 'For now, the house publishes the gatherings in the city’s register.',
  },
  ja: {
    community: 'コミュニティ',
    itsPage: 'そのページ',
    subscribe: 'カレンダーを購読',
    upcoming: 'これから',
    held: '開催済み',
    noUpcoming: 'まだ公開されたものはありません。',
    noHeld: 'まだ開催されたものはありません。',
    noCommunity: {
      title: 'この組織にはまだコミュニティのページがありません',
      text: 'ページができると、ここに集まりが表示されます。',
    },
    publishNote: '今のところ、集まりは運営チームが街の登録簿に公開しています。',
  },
  ko: {
    community: '커뮤니티',
    itsPage: '페이지',
    subscribe: '캘린더 구독',
    upcoming: '다가오는 모임',
    held: '이미 열린 모임',
    noUpcoming: '아직 게시된 모임이 없습니다.',
    noHeld: '아직 열린 모임이 없습니다.',
    noCommunity: {
      title: '이 조직은 아직 커뮤니티 페이지가 없습니다',
      text: '페이지가 생기면 모임이 여기에 표시됩니다.',
    },
    publishNote: '지금은 운영팀이 도시의 등록부에 모임을 게시합니다.',
  },
  'pt-br': {
    community: 'Sua comunidade',
    itsPage: 'Sua página',
    subscribe: 'Assinar o calendário',
    upcoming: 'Próximos',
    held: 'Já realizados',
    noUpcoming: 'Ainda não há nenhum publicado.',
    noHeld: 'Ainda não há nenhum realizado.',
    noCommunity: {
      title: 'Esta organização ainda não tem página em Comunidades',
      text: 'Os encontros dela vão aparecer aqui quando tiver.',
    },
    publishNote: 'Por enquanto, a casa publica os encontros no registro da cidade.',
  },
};
