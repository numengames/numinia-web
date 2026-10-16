/**
 * «Encuentros» (/calendar/), five locales: the city's encounters as a list by
 * month (the default) or as the month grid. Screen words: «encuentro», never
 * ritual; the nav already calls the room «Encuentros» / «Gatherings».
 * Rows reuse the register's own words (modes, «De la ciudad», the countdown)
 * from i18n/communities.ts; only what this page adds lives here.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface EncuentrosMessages {
  readonly title: string;
  readonly lead: string;
  /** The group of the two view buttons, for screen readers. */
  readonly viewsLabel: string;
  readonly viewList: string;
  readonly viewMonth: string;
  /** When there is nothing coming. */
  readonly empty: string;
  /** Under the list: each community has its own feed. */
  readonly note: string;
}

const ES: EncuentrosMessages = {
  title: 'Encuentros',
  lead: 'Todos los encuentros abiertos de la ciudad, en persona o en línea.',
  viewsLabel: 'Cómo verlos',
  viewList: 'Lista',
  viewMonth: 'Mes',
  empty: 'No hay encuentros anunciados por ahora.',
  note: 'Los encuentros con hora se guardan en UTC. Los de día entero se ven igual en todo el mundo. Cada comunidad tiene también el suyo, para suscribirse desde su página.',
};

const EN: EncuentrosMessages = {
  title: 'Gatherings',
  lead: 'Every open gathering of the city, in person or online.',
  viewsLabel: 'How to see them',
  viewList: 'List',
  viewMonth: 'Month',
  empty: 'No gatherings announced for now.',
  note: 'Timed gatherings are kept in UTC. Whole-day ones look the same everywhere. Each community also has its own, to subscribe to from its page.',
};

const JA: EncuentrosMessages = {
  title: '集まり',
  lead: '都市のすべての公開の集まり。対面でもオンラインでも。',
  viewsLabel: '表示方法',
  viewList: '一覧',
  viewMonth: '月',
  empty: '今のところ告知された集まりはありません。',
  note: '時刻のある集まりは UTC で保存されます。終日の集まりはどこでも同じ日に見えます。各コミュニティにも独自のカレンダーがあり、そのページから購読できます。',
};

const KO: EncuentrosMessages = {
  title: '모임',
  lead: '도시의 모든 공개 모임, 대면이든 온라인이든.',
  viewsLabel: '보는 방법',
  viewList: '목록',
  viewMonth: '월',
  empty: '지금은 공지된 모임이 없습니다.',
  note: '시간이 있는 모임은 UTC로 저장됩니다. 종일 모임은 어디서나 같은 날로 보입니다. 각 커뮤니티에도 자체 달력이 있어 그 페이지에서 구독할 수 있습니다.',
};

const PT_BR: EncuentrosMessages = {
  title: 'Encontros',
  lead: 'Todos os encontros abertos da cidade, presenciais ou online.',
  viewsLabel: 'Como vê-los',
  viewList: 'Lista',
  viewMonth: 'Mês',
  empty: 'Nenhum encontro anunciado por enquanto.',
  note: 'Encontros com horário são guardados em UTC. Os de dia inteiro aparecem iguais no mundo todo. Cada comunidade também tem o seu, para assinar na página dela.',
};

export const ENCUENTROS_UI: Readonly<Record<SupportedLocale, EncuentrosMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
