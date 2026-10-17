/**
 * «Avisos» (/notifications/, the bell; cut J «La ciudad y tú», 2026-10-17):
 * what concerns you, and only that — an encounter you are going to that
 * starts soon, people in a home of yours, a request you decide, an answer
 * to your own request. One list, four chips, no red numbers: the bar shows
 * a dot when there is something new, and that is all. Five locales; the
 * sign-in word itself comes from APP_SHELL_UI.
 */

import type { SupportedLocale } from '@numinia/domain';

/** The four chips, in their order; `all` shows every kind. */
export type NoticeFilter = 'all' | 'encounter' | 'world' | 'community';

/** The sentences each source fills: `{subject}` is the bold part. */
export interface NoticeWords {
  /** «{subject} empieza {when}. Vas.» */
  readonly starts: string;
  readonly today: string;
  readonly tomorrow: string;
  /** «en {n} días» */
  readonly inDays: string;
  /** «Hay {subject} en {world}.» */
  readonly inside: string;
  readonly onePerson: string;
  /** «{n} personas» */
  readonly people: string;
  /** «{subject} quiere {what} {community}.» */
  readonly wants: string;
  readonly toJoin: string;
  readonly toClaim: string;
  /** «{subject} te ha aceptado. Ya eres {role}.» */
  readonly accepted: string;
  readonly titular: string;
  readonly member: string;
  /** «{subject} no ha aceptado tu petición por ahora.» */
  readonly declined: string;
}

interface NotificationsMessages {
  readonly title: string;
  readonly description: string;
  readonly lead: string;
  readonly chips: Readonly<Record<NoticeFilter, string>>;
  readonly chipsLabel: string;
  readonly listLabel: string;
  readonly empty: { readonly title: string; readonly text: string };
  /** When the list cannot be read. */
  readonly failed: string;
  readonly retry: string;
  readonly actions: {
    readonly calendar: string;
    readonly enter: string;
    readonly accept: string;
    readonly later: string;
  };
  /** The row's icon, for assistive tech. */
  readonly kinds: Readonly<Record<Exclude<NoticeFilter, 'all'>, string>>;
  /** After «Aceptar» answered. */
  readonly acceptedNow: string;
  readonly acceptFailed: string;
  readonly words: NoticeWords;
  /** Signed out: the one line above the door. */
  readonly signedOut: string;
}

export const NOTIFICATIONS_UI: Readonly<Record<SupportedLocale, NotificationsMessages>> = {
  es: {
    title: 'Avisos',
    description:
      'Lo que te toca: encuentros a los que vas, gente en tus sedes, peticiones que decidir.',
    lead: 'Lo que te toca, y solo lo que elegiste. Sin números rojos: la barra enseña un punto cuando hay algo nuevo, y ya.',
    chips: { all: 'Todo', encounter: 'Encuentros', world: 'Sedes', community: 'Comunidades' },
    chipsLabel: 'Qué avisos ver',
    listLabel: 'Tus avisos',
    empty: {
      title: 'Estás al día',
      text: 'Lo que te toque — un encuentro al que vas, gente en una sede tuya, una petición que decidir — aparecerá aquí.',
    },
    failed: 'No se han podido leer tus avisos.',
    retry: 'Volver a intentar',
    actions: { calendar: 'A mi calendario', enter: 'Entrar', accept: 'Aceptar', later: 'Ahora no' },
    kinds: { encounter: 'Encuentro', world: 'Sede', community: 'Comunidad' },
    acceptedNow: 'Aceptada.',
    acceptFailed: 'No se ha podido aceptar. Vuelve a intentarlo.',
    words: {
      starts: '{subject} empieza {when}. Vas.',
      today: 'hoy',
      tomorrow: 'mañana',
      inDays: 'en {n} días',
      inside: 'Hay {subject} en {world}.',
      onePerson: '1 persona',
      people: '{n} personas',
      wants: '{subject} quiere {what} {community}.',
      toJoin: 'entrar en',
      toClaim: 'reclamar',
      accepted: '{subject} te ha aceptado. Ya eres {role}.',
      titular: 'Titular',
      member: 'miembro',
      declined: '{subject} no ha aceptado tu petición por ahora.',
    },
    signedOut: 'Entra para ver tus avisos',
  },
  en: {
    title: 'Notices',
    description:
      'What concerns you: encounters you are going to, people in your homes, requests to decide.',
    lead: 'What concerns you, and only what you chose. No red numbers: the bar shows a dot when there is something new, and that is all.',
    chips: { all: 'All', encounter: 'Encounters', world: 'Homes', community: 'Communities' },
    chipsLabel: 'Which notices to show',
    listLabel: 'Your notices',
    empty: {
      title: 'You’re all caught up',
      text: 'What concerns you — an encounter you are going to, people in a home of yours, a request to decide — will appear here.',
    },
    failed: 'Your notices could not be read.',
    retry: 'Try again',
    actions: { calendar: 'To my calendar', enter: 'Enter', accept: 'Accept', later: 'Not now' },
    kinds: { encounter: 'Encounter', world: 'Home', community: 'Community' },
    acceptedNow: 'Accepted.',
    acceptFailed: 'It could not be accepted. Try again.',
    words: {
      starts: '{subject} starts {when}. You are going.',
      today: 'today',
      tomorrow: 'tomorrow',
      inDays: 'in {n} days',
      inside: 'There are {subject} in {world}.',
      onePerson: '1 person',
      people: '{n} people',
      wants: '{subject} wants to {what} {community}.',
      toJoin: 'join',
      toClaim: 'claim',
      accepted: '{subject} accepted you. You are now {role}.',
      titular: 'Titular',
      member: 'a member',
      declined: '{subject} has not accepted your request for now.',
    },
    signedOut: 'Sign in to see your notices',
  },
  ja: {
    title: 'お知らせ',
    description: 'あなたに関わること: 参加する集い、あなたの拠点にいる人、決めるべきリクエスト。',
    lead: 'あなたに関わること、あなたが選んだことだけ。赤い数字はなし: 新しいものがあればバーに点が灯る、それだけです。',
    chips: { all: 'すべて', encounter: '集い', world: '拠点', community: 'コミュニティ' },
    chipsLabel: '表示するお知らせ',
    listLabel: 'あなたのお知らせ',
    empty: {
      title: 'すべて確認済みです',
      text: 'あなたに関わること — 参加する集い、あなたの拠点にいる人、決めるべきリクエスト — はここに表示されます。',
    },
    failed: 'お知らせを読み込めませんでした。',
    retry: 'もう一度',
    actions: { calendar: 'カレンダーに追加', enter: '入る', accept: '承認', later: '今はしない' },
    kinds: { encounter: '集い', world: '拠点', community: 'コミュニティ' },
    acceptedNow: '承認しました。',
    acceptFailed: '承認できませんでした。もう一度お試しください。',
    words: {
      starts: '{subject} が{when}始まります。参加予定です。',
      today: '今日',
      tomorrow: '明日',
      inDays: '{n}日後に',
      inside: '{world} に {subject} がいます。',
      onePerson: '1人',
      people: '{n}人',
      wants: '{subject} が {community} {what}。',
      toJoin: 'への参加を希望しています',
      toClaim: 'の運営を申請しています',
      accepted: '{subject} があなたを承認しました。あなたは{role}になりました。',
      titular: '代表',
      member: 'メンバー',
      declined: '{subject} は今のところあなたのリクエストを承認していません。',
    },
    signedOut: 'ログインしてお知らせを確認しましょう',
  },
  ko: {
    title: '알림',
    description: '나와 관련된 것: 참여하는 모임, 내 거점에 있는 사람, 결정할 요청.',
    lead: '나와 관련된 것, 내가 선택한 것만. 빨간 숫자는 없습니다: 새로운 것이 있으면 막대에 점이 켜지고, 그뿐입니다.',
    chips: { all: '전체', encounter: '모임', world: '거점', community: '커뮤니티' },
    chipsLabel: '어떤 알림을 볼지',
    listLabel: '내 알림',
    empty: {
      title: '모두 확인했어요',
      text: '나와 관련된 것 — 참여하는 모임, 내 거점에 있는 사람, 결정할 요청 — 이 여기에 표시됩니다.',
    },
    failed: '알림을 읽을 수 없습니다.',
    retry: '다시 시도',
    actions: { calendar: '내 캘린더에', enter: '입장', accept: '수락', later: '나중에' },
    kinds: { encounter: '모임', world: '거점', community: '커뮤니티' },
    acceptedNow: '수락했습니다.',
    acceptFailed: '수락할 수 없습니다. 다시 시도하세요.',
    words: {
      starts: '{subject}이(가) {when} 시작합니다. 참여 예정입니다.',
      today: '오늘',
      tomorrow: '내일',
      inDays: '{n}일 후',
      inside: '{world}에 {subject}이(가) 있습니다.',
      onePerson: '1명',
      people: '{n}명',
      wants: '{subject}이(가) {community}{what}.',
      toJoin: '에 가입하고 싶어합니다',
      toClaim: '의 운영을 요청합니다',
      accepted: '{subject}이(가) 수락했습니다. 이제 {role}입니다.',
      titular: '대표',
      member: '멤버',
      declined: '{subject}이(가) 아직 요청을 수락하지 않았습니다.',
    },
    signedOut: '로그인하고 알림을 확인하세요',
  },
  'pt-br': {
    title: 'Avisos',
    description:
      'O que é seu: encontros aos quais você vai, gente nas suas sedes, pedidos a decidir.',
    lead: 'O que é seu, e só o que você escolheu. Sem números vermelhos: a barra mostra um ponto quando há algo novo, e só.',
    chips: { all: 'Tudo', encounter: 'Encontros', world: 'Sedes', community: 'Comunidades' },
    chipsLabel: 'Quais avisos ver',
    listLabel: 'Seus avisos',
    empty: {
      title: 'Você está em dia',
      text: 'O que for seu — um encontro ao qual você vai, gente numa sede sua, um pedido a decidir — aparecerá aqui.',
    },
    failed: 'Não foi possível ler seus avisos.',
    retry: 'Tentar de novo',
    actions: {
      calendar: 'Ao meu calendário',
      enter: 'Entrar',
      accept: 'Aceitar',
      later: 'Agora não',
    },
    kinds: { encounter: 'Encontro', world: 'Sede', community: 'Comunidade' },
    acceptedNow: 'Aceito.',
    acceptFailed: 'Não foi possível aceitar. Tente de novo.',
    words: {
      starts: '{subject} começa {when}. Você vai.',
      today: 'hoje',
      tomorrow: 'amanhã',
      inDays: 'em {n} dias',
      inside: 'Há {subject} em {world}.',
      onePerson: '1 pessoa',
      people: '{n} pessoas',
      wants: '{subject} quer {what} {community}.',
      toJoin: 'entrar em',
      toClaim: 'reivindicar',
      accepted: '{subject} aceitou você. Agora você é {role}.',
      titular: 'Titular',
      member: 'membro',
      declined: '{subject} não aceitou seu pedido por enquanto.',
    },
    signedOut: 'Entre para ver seus avisos',
  },
};
