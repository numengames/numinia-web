/**
 * The panel's Resumen (cut 2026-10-16 «el dinero»): the words of its four
 * cards — the worlds with a charge, the next encounter, the people, the
 * balance — and of «Lo último», five locales. A file of its own:
 * i18n/panel.ts is the frame's. What Saldo y consumo already says (how long
 * the balance lasts, a low balance, the acts of an organization's log) is
 * taken from i18n/saldo.ts, so the two screens never say it differently.
 * `{n}` and `{amount}` are filled by `fill()` in lib/accounts.ts.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { DeskLogAct } from '../lib/accounts';
import { SALDO_UI } from './saldo';

export interface PanelSummaryMessages {
  /** The four cards, as a screen reader names them together. */
  readonly label: string;
  /** The worlds with a charge in the last 30 days. */
  readonly venues: {
    readonly title: string;
    /** After the count: several, or one. */
    readonly charged: string;
    readonly chargedOne: string;
    readonly none: string;
    readonly noneNote: string;
  };
  /** The next encounter of the organization's community. */
  readonly next: {
    readonly title: string;
    readonly now: string;
    /** `{n}`: whole days until it starts, two or more; within a day, `soon`. */
    readonly inDays: string;
    readonly soon: string;
    readonly none: string;
    readonly noneNote: string;
  };
  readonly people: {
    readonly title: string;
    /** After the count: several, or one. */
    readonly members: string;
    readonly membersOne: string;
  };
  /** The balance: the runway as Saldo says it; `empty` when nothing is left. */
  readonly balance: {
    readonly title: string;
    readonly runway: string;
    readonly runwayOne: string;
    readonly runwayLess: string;
    readonly runwayStill: string;
    readonly empty: string;
  };
  readonly latest: {
    readonly label: string;
    readonly title: string;
    /** `{amount}`: a top-up of the statement. */
    readonly topup: string;
    readonly empty: string;
    /** The way to the whole log, in «Miembros y roles». */
    readonly log: string;
    readonly acts: Readonly<Record<DeskLogAct, string>>;
  };
}

/** What the Resumen says as Saldo says it, in one locale. */
function fromSaldo(locale: SupportedLocale) {
  const { kpis, balance, panel } = SALDO_UI[locale];
  return {
    balance: {
      runway: kpis.runway,
      runwayOne: kpis.runwayOne,
      runwayLess: kpis.runwayLess,
      runwayStill: kpis.runwayStill,
      empty: `${balance.low} · ${balance.lowNote}`,
    },
    acts: panel.logAct,
  };
}

const ES = fromSaldo('es');
const EN = fromSaldo('en');
const JA = fromSaldo('ja');
const KO = fromSaldo('ko');
const PT = fromSaldo('pt-br');

export const PANEL_SUMMARY_UI: Readonly<Record<SupportedLocale, PanelSummaryMessages>> = {
  es: {
    label: 'De un vistazo',
    venues: {
      title: 'Sedes',
      charged: 'sedes con cargo en los últimos 30 días',
      chargedOne: 'sede con cargo en los últimos 30 días',
      none: 'Ninguna sede todavía',
      noneNote: 'Ninguna sede ha tenido cargo en los últimos 30 días.',
    },
    next: {
      title: 'Lo próximo',
      now: 'Está pasando ahora',
      inDays: 'Empieza dentro de {n} días',
      soon: 'Empieza en menos de un día',
      none: 'Ningún encuentro a la vista',
      noneNote: 'Aquí aparece el próximo encuentro de la comunidad de esta organización.',
    },
    people: { title: 'Gente', members: 'miembros', membersOne: 'miembro' },
    balance: { title: 'Saldo', ...ES.balance },
    latest: {
      label: 'Lo último',
      title: 'Qué ha pasado',
      topup: 'Recarga de {amount}',
      empty: 'Todavía no ha pasado nada que contar.',
      log: 'Ver el registro completo',
      acts: ES.acts,
    },
  },
  en: {
    label: 'At a glance',
    venues: {
      title: 'Homes',
      charged: 'homes charged in the last 30 days',
      chargedOne: 'home charged in the last 30 days',
      none: 'No homes yet',
      noneNote: 'No home has been charged in the last 30 days.',
    },
    next: {
      title: 'Coming up',
      now: 'Happening now',
      inDays: 'Starts in {n} days',
      soon: 'Starts within a day',
      none: 'No gathering in sight',
      noneNote: "The next gathering of this organization's community shows up here.",
    },
    people: { title: 'People', members: 'members', membersOne: 'member' },
    balance: { title: 'Balance', ...EN.balance },
    latest: {
      label: 'The latest',
      title: 'What happened',
      topup: 'Top-up of {amount}',
      empty: 'Nothing worth telling has happened yet.',
      log: 'See the whole log',
      acts: EN.acts,
    },
  },
  ja: {
    label: 'ひと目で',
    venues: {
      title: '拠点',
      charged: '過去30日間に請求のあった拠点',
      chargedOne: '過去30日間に請求のあった拠点',
      none: 'まだ拠点はありません',
      noneNote: '過去30日間に請求のあった拠点はありません。',
    },
    next: {
      title: '次の予定',
      now: 'いま開催中です',
      inDays: '{n}日後に始まります',
      soon: '1日以内に始まります',
      none: '予定されている集まりはありません',
      noneNote: 'この組織のコミュニティの次の集まりが、ここに表示されます。',
    },
    people: { title: 'メンバー', members: '人', membersOne: '人' },
    balance: { title: '残高', ...JA.balance },
    latest: {
      label: '最新',
      title: '最近の出来事',
      topup: '{amount}のチャージ',
      empty: 'まだ伝えることは何も起きていません。',
      log: '記録をすべて見る',
      acts: JA.acts,
    },
  },
  ko: {
    label: '한눈에',
    venues: {
      title: '거점',
      charged: '최근 30일 동안 요금이 나간 거점',
      chargedOne: '최근 30일 동안 요금이 나간 거점',
      none: '아직 거점이 없습니다',
      noneNote: '최근 30일 동안 요금이 나간 거점이 없습니다.',
    },
    next: {
      title: '다음 일정',
      now: '지금 진행 중입니다',
      inDays: '{n}일 후에 시작합니다',
      soon: '하루 안에 시작합니다',
      none: '예정된 모임이 없습니다',
      noneNote: '이 조직의 커뮤니티가 여는 다음 모임이 여기에 표시됩니다.',
    },
    people: { title: '사람', members: '명', membersOne: '명' },
    balance: { title: '잔액', ...KO.balance },
    latest: {
      label: '최신',
      title: '최근 있었던 일',
      topup: '{amount} 충전',
      empty: '아직 전할 만한 일이 없습니다.',
      log: '전체 기록 보기',
      acts: KO.acts,
    },
  },
  'pt-br': {
    label: 'Num relance',
    venues: {
      title: 'Sedes',
      charged: 'sedes com cobrança nos últimos 30 dias',
      chargedOne: 'sede com cobrança nos últimos 30 dias',
      none: 'Nenhuma sede ainda',
      noneNote: 'Nenhuma sede teve cobrança nos últimos 30 dias.',
    },
    next: {
      title: 'O próximo',
      now: 'Está acontecendo agora',
      inDays: 'Começa daqui a {n} dias',
      soon: 'Começa em menos de um dia',
      none: 'Nenhum encontro à vista',
      noneNote: 'Aqui aparece o próximo encontro da comunidade desta organização.',
    },
    people: { title: 'Pessoas', members: 'membros', membersOne: 'membro' },
    balance: { title: 'Saldo', ...PT.balance },
    latest: {
      label: 'O mais recente',
      title: 'O que aconteceu',
      topup: 'Recarga de {amount}',
      empty: 'Ainda não aconteceu nada que valha contar.',
      log: 'Ver o registro completo',
      acts: PT.acts,
    },
  },
};
