/**
 * «Me apunto» for real and «Tu agenda» (cut F, 2026-10-17): the words of the
 * RSVP button — on an encounter's page and on the featured encounter of
 * «Ahora» — and of the page that lists what you said you are going to, in
 * five locales. The button's states and toasts travel to the browser as
 * data attributes; «{n}» is filled by `fill()` in i18n/communities.ts.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface AgendaMessages {
  /** The button before the person says «voy». */
  readonly signMeUp: string;
  /** The button once pressed (`aria-pressed`). */
  readonly going: string;
  /** Said once the row is gone (toast). */
  readonly noLongerGoing: string;
  /** Said once the row is kept (toast). */
  readonly signedUp: string;
  /** The toggle could not be saved. */
  readonly failed: string;
  /** The `.ics` file, now the second action. */
  readonly addToCalendar: string;
  /** Under the title, only when someone is going: `{n}` ≥ 2, or one. */
  readonly peopleGoing: string;
  readonly personGoing: string;
  /** The link to the page. */
  readonly yourAgenda: string;
  /** The page. */
  readonly title: string;
  readonly lead: string;
  /** Signed out: what the page is for, and the door. */
  readonly signedOutLead: string;
  readonly signIn: string;
  /** Nothing yet, and where encounters are. */
  readonly emptyTitle: string;
  readonly seeEncounters: string;
  /** The fold of past encounters: `{n}` is how many. */
  readonly past: string;
  /** The till is not there. */
  readonly unavailable: string;
}

const ES: AgendaMessages = {
  signMeUp: 'Me apunto',
  going: 'Voy',
  noLongerGoing: 'Ya no vas. Lo hemos quitado de tu agenda.',
  signedUp: 'Apuntado. Está en tu agenda.',
  failed: 'No se ha podido guardar. Prueba otra vez.',
  addToCalendar: 'Añadir a mi calendario',
  peopleGoing: '{n} personas van',
  personGoing: '1 persona va',
  yourAgenda: 'Tu agenda',
  title: 'Tu agenda',
  lead: 'A lo que vas, en tu hora.',
  signedOutLead: 'Lo que apuntas con «Me apunto» llega aquí. Entra para verlo.',
  signIn: 'Iniciar sesión',
  emptyTitle: 'Todavía no vas a ningún encuentro',
  seeEncounters: 'Ver los encuentros',
  past: 'Ya pasaron · {n}',
  unavailable: 'La agenda no responde ahora mismo. Prueba en un momento.',
};

const EN: AgendaMessages = {
  signMeUp: 'Count me in',
  going: 'Going',
  noLongerGoing: 'No longer going. Removed from your agenda.',
  signedUp: 'Counted in. It is in your agenda.',
  failed: 'Could not be saved. Try again.',
  addToCalendar: 'Add to my calendar',
  peopleGoing: '{n} people are going',
  personGoing: '1 person is going',
  yourAgenda: 'Your agenda',
  title: 'Your agenda',
  lead: 'What you are going to, in your time.',
  signedOutLead: 'What you say «Count me in» to lands here. Sign in to see it.',
  signIn: 'Sign in',
  emptyTitle: 'You are not going to any encounter yet',
  seeEncounters: 'See the encounters',
  past: 'Already happened · {n}',
  unavailable: 'The agenda is not answering right now. Try again in a moment.',
};

const JA: AgendaMessages = {
  signMeUp: '参加する',
  going: '参加予定',
  noLongerGoing: '参加をやめました。アジェンダから外しました。',
  signedUp: '参加登録しました。アジェンダに入っています。',
  failed: '保存できませんでした。もう一度お試しください。',
  addToCalendar: 'カレンダーに追加',
  peopleGoing: '{n}人が参加予定',
  personGoing: '1人が参加予定',
  yourAgenda: 'あなたのアジェンダ',
  title: 'あなたのアジェンダ',
  lead: '参加する集まりを、あなたの時間で。',
  signedOutLead: '「参加する」を押した集まりがここに届きます。見るにはサインインしてください。',
  signIn: 'サインイン',
  emptyTitle: 'まだ参加する集まりはありません',
  seeEncounters: '集まりを見る',
  past: '終了した集まり · {n}',
  unavailable: 'アジェンダがいま応答していません。しばらくしてからお試しください。',
};

const KO: AgendaMessages = {
  signMeUp: '참여할게요',
  going: '참여 예정',
  noLongerGoing: '참여를 취소했습니다. 일정에서 뺐습니다.',
  signedUp: '참여 등록됨. 내 일정에 있습니다.',
  failed: '저장하지 못했습니다. 다시 시도해 주세요.',
  addToCalendar: '내 달력에 추가',
  peopleGoing: '{n}명이 참여 예정',
  personGoing: '1명이 참여 예정',
  yourAgenda: '내 일정',
  title: '내 일정',
  lead: '참여할 모임을 내 시간으로.',
  signedOutLead: '「참여할게요」를 누른 모임이 여기에 모입니다. 보려면 로그인하세요.',
  signIn: '로그인',
  emptyTitle: '아직 참여하는 모임이 없습니다',
  seeEncounters: '모임 보기',
  past: '지난 모임 · {n}',
  unavailable: '지금은 일정이 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',
};

const PT_BR: AgendaMessages = {
  signMeUp: 'Eu vou',
  going: 'Vou',
  noLongerGoing: 'Você não vai mais. Tiramos da sua agenda.',
  signedUp: 'Anotado. Está na sua agenda.',
  failed: 'Não foi possível salvar. Tente de novo.',
  addToCalendar: 'Adicionar ao meu calendário',
  peopleGoing: '{n} pessoas vão',
  personGoing: '1 pessoa vai',
  yourAgenda: 'Sua agenda',
  title: 'Sua agenda',
  lead: 'Aonde você vai, no seu horário.',
  signedOutLead: 'O que você marca com «Eu vou» chega aqui. Entre para ver.',
  signIn: 'Entrar',
  emptyTitle: 'Você ainda não vai a nenhum encontro',
  seeEncounters: 'Ver os encontros',
  past: 'Já passaram · {n}',
  unavailable: 'A agenda não está respondendo agora. Tente daqui a pouco.',
};

export const AGENDA_UI: Readonly<Record<SupportedLocale, AgendaMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
