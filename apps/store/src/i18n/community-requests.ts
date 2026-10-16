/**
 * «Hazla tuya» for real (cut G): the words of the strip on a community's
 * page — claim it or ask to enter, the small dialog with one optional line,
 * what the strip says once asked — and of «Peticiones», the list the house
 * or an administrator decides on, in the panel's Members and in the Census.
 * Five locales; the strip's own «¿Es tu comunidad?» stays in communities.ts.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface CommunityRequestsMessages {
  readonly strip: {
    /** The strip when the community already has a titular: to enter it. */
    readonly joinTitle: string;
    readonly joinText: string;
    readonly joinCta: string;
    /** The dialog's title for each ask. */
    readonly claimDialog: string;
    readonly joinDialog: string;
    /** «Cuéntanos quién eres». */
    readonly noteLabel: string;
    /** «Opcional, hasta 280 caracteres.» */
    readonly noteHelp: string;
    readonly send: string;
    readonly cancel: string;
    /** The strip once a claim is open. */
    readonly sentClaim: string;
    /** The strip once a join is open. */
    readonly sentJoin: string;
    /** The ask did not go through. */
    readonly failed: string;
    /** The note is longer than allowed or has what a line cannot hold. */
    readonly badNote: string;
  };
  readonly list: {
    readonly title: string;
    /** The one line under the title, in the Census (every community). */
    readonly intro: string;
    /** The kind of ask, as a chip. */
    readonly claim: string;
    readonly join: string;
    readonly accept: string;
    readonly decline: string;
    /** «Aceptar la petición de {who}», for screen readers; the same for declining. */
    readonly acceptLabel: string;
    readonly declineLabel: string;
    readonly loading: string;
    readonly empty: string;
    readonly failed: string;
    readonly retry: string;
    /** After accepting: a claim makes a titular, a join a member. */
    readonly acceptedClaim: string;
    readonly acceptedJoin: string;
    readonly declined: string;
    /** The till refused the decision (the sentence of the refusal follows). */
    readonly refused: string;
    /** The till does not know this door yet. */
    readonly notBound: string;
    readonly columns: {
      readonly person: string;
      readonly community: string;
      readonly ask: string;
      readonly note: string;
      readonly when: string;
      readonly actions: string;
    };
  };
}

const ES: CommunityRequestsMessages = {
  strip: {
    joinTitle: '¿Quieres entrar?',
    joinText:
      'Esta comunidad ya tiene quien la lleva. Pide entrar y alguien de la comunidad lo verá.',
    joinCta: 'Quiero entrar',
    claimDialog: 'Hazla tuya',
    joinDialog: 'Pedir entrar',
    noteLabel: 'Cuéntanos quién eres',
    noteHelp: 'Opcional, hasta 280 caracteres.',
    send: 'Enviar',
    cancel: 'Cancelar',
    sentClaim: 'Pedido. Te avisaremos cuando la casa lo confirme.',
    sentJoin: 'Pedido. Alguien de la comunidad lo verá.',
    failed: 'No se pudo enviar. Prueba de nuevo.',
    badNote: 'La línea admite hasta 280 caracteres, sin saltos.',
  },
  list: {
    title: 'Peticiones',
    intro: 'Quien ha pedido llevar o entrar en una comunidad, la más reciente primero.',
    claim: 'Quiere llevarla',
    join: 'Quiere entrar',
    accept: 'Aceptar',
    decline: 'Rechazar',
    acceptLabel: 'Aceptar la petición de {who}',
    declineLabel: 'Rechazar la petición de {who}',
    loading: 'Leyendo las peticiones…',
    empty: 'No hay peticiones abiertas.',
    failed: 'No se pudieron leer las peticiones.',
    retry: 'Volver a intentarlo',
    acceptedClaim: 'Aceptada: ya es titular.',
    acceptedJoin: 'Aceptada: ya es miembro.',
    declined: 'Rechazada.',
    refused: 'No se pudo decidir:',
    notBound: 'La caja aún no conoce las peticiones.',
    columns: {
      person: 'Quién',
      community: 'Comunidad',
      ask: 'Qué pide',
      note: 'Nota',
      when: 'Cuándo',
      actions: 'Acciones',
    },
  },
};

const EN: CommunityRequestsMessages = {
  strip: {
    joinTitle: 'Want in?',
    joinText:
      'This community already has someone running it. Ask to enter and someone in it will see.',
    joinCta: 'I want in',
    claimDialog: 'Make it yours',
    joinDialog: 'Ask to enter',
    noteLabel: 'Tell us who you are',
    noteHelp: 'Optional, up to 280 characters.',
    send: 'Send',
    cancel: 'Cancel',
    sentClaim: 'Asked. We will let you know when the house confirms it.',
    sentJoin: 'Asked. Someone in the community will see it.',
    failed: 'It could not be sent. Try again.',
    badNote: 'One line of up to 280 characters, no line breaks.',
  },
  list: {
    title: 'Requests',
    intro: 'Whoever asked to run or to enter a community, newest first.',
    claim: 'Wants to run it',
    join: 'Wants in',
    accept: 'Accept',
    decline: 'Decline',
    acceptLabel: 'Accept the request of {who}',
    declineLabel: 'Decline the request of {who}',
    loading: 'Reading the requests…',
    empty: 'No open requests.',
    failed: 'The requests could not be read.',
    retry: 'Try again',
    acceptedClaim: 'Accepted: now the titular.',
    acceptedJoin: 'Accepted: now a member.',
    declined: 'Declined.',
    refused: 'It could not be decided:',
    notBound: 'The till does not know requests yet.',
    columns: {
      person: 'Who',
      community: 'Community',
      ask: 'Asks',
      note: 'Note',
      when: 'When',
      actions: 'Actions',
    },
  },
};

const JA: CommunityRequestsMessages = {
  strip: {
    joinTitle: '参加しますか？',
    joinText:
      'このコミュニティにはすでに運営者がいます。参加を申し込むと、コミュニティの誰かが確認します。',
    joinCta: '参加したい',
    claimDialog: '自分のものにする',
    joinDialog: '参加を申し込む',
    noteLabel: 'あなたについて教えてください',
    noteHelp: '任意、280文字まで。',
    send: '送信',
    cancel: 'キャンセル',
    sentClaim: '申し込みました。ハウスが確認したらお知らせします。',
    sentJoin: '申し込みました。コミュニティの誰かが確認します。',
    failed: '送信できませんでした。もう一度お試しください。',
    badNote: '改行なしで280文字までの一行です。',
  },
  list: {
    title: '申し込み',
    intro: 'コミュニティの運営または参加を申し込んだ人。新しいものから。',
    claim: '運営したい',
    join: '参加したい',
    accept: '承認',
    decline: '却下',
    acceptLabel: '{who} の申し込みを承認',
    declineLabel: '{who} の申し込みを却下',
    loading: '申し込みを読み込み中…',
    empty: '未決の申し込みはありません。',
    failed: '申し込みを読み込めませんでした。',
    retry: 'もう一度試す',
    acceptedClaim: '承認しました。代表になりました。',
    acceptedJoin: '承認しました。メンバーになりました。',
    declined: '却下しました。',
    refused: '決定できませんでした：',
    notBound: 'レジはまだ申し込みを扱えません。',
    columns: {
      person: '誰',
      community: 'コミュニティ',
      ask: '内容',
      note: 'メモ',
      when: 'いつ',
      actions: '操作',
    },
  },
};

const KO: CommunityRequestsMessages = {
  strip: {
    joinTitle: '들어오고 싶으신가요?',
    joinText:
      '이 커뮤니티는 이미 운영자가 있습니다. 가입을 요청하면 커뮤니티의 누군가가 확인합니다.',
    joinCta: '들어가고 싶어요',
    claimDialog: '내 것으로 만들기',
    joinDialog: '가입 요청',
    noteLabel: '당신이 누구인지 알려주세요',
    noteHelp: '선택 사항, 최대 280자.',
    send: '보내기',
    cancel: '취소',
    sentClaim: '요청했습니다. 하우스가 확인하면 알려드리겠습니다.',
    sentJoin: '요청했습니다. 커뮤니티의 누군가가 확인할 것입니다.',
    failed: '보낼 수 없었습니다. 다시 시도하세요.',
    badNote: '줄바꿈 없이 최대 280자의 한 줄입니다.',
  },
  list: {
    title: '요청',
    intro: '커뮤니티 운영 또는 가입을 요청한 사람. 최신순.',
    claim: '운영하고 싶음',
    join: '가입하고 싶음',
    accept: '수락',
    decline: '거절',
    acceptLabel: '{who}의 요청 수락',
    declineLabel: '{who}의 요청 거절',
    loading: '요청을 읽는 중…',
    empty: '열린 요청이 없습니다.',
    failed: '요청을 읽을 수 없었습니다.',
    retry: '다시 시도',
    acceptedClaim: '수락됨: 이제 대표입니다.',
    acceptedJoin: '수락됨: 이제 회원입니다.',
    declined: '거절됨.',
    refused: '결정할 수 없었습니다:',
    notBound: '금고가 아직 요청을 알지 못합니다.',
    columns: {
      person: '누구',
      community: '커뮤니티',
      ask: '요청',
      note: '메모',
      when: '언제',
      actions: '작업',
    },
  },
};

const PT: CommunityRequestsMessages = {
  strip: {
    joinTitle: 'Quer entrar?',
    joinText: 'Esta comunidade já tem quem a leva. Peça para entrar e alguém da comunidade verá.',
    joinCta: 'Quero entrar',
    claimDialog: 'Faça dela a sua',
    joinDialog: 'Pedir para entrar',
    noteLabel: 'Conte-nos quem você é',
    noteHelp: 'Opcional, até 280 caracteres.',
    send: 'Enviar',
    cancel: 'Cancelar',
    sentClaim: 'Pedido. Avisaremos quando a casa confirmar.',
    sentJoin: 'Pedido. Alguém da comunidade verá.',
    failed: 'Não foi possível enviar. Tente de novo.',
    badNote: 'Uma linha de até 280 caracteres, sem quebras.',
  },
  list: {
    title: 'Pedidos',
    intro: 'Quem pediu para levar ou entrar numa comunidade, o mais recente primeiro.',
    claim: 'Quer levá-la',
    join: 'Quer entrar',
    accept: 'Aceitar',
    decline: 'Recusar',
    acceptLabel: 'Aceitar o pedido de {who}',
    declineLabel: 'Recusar o pedido de {who}',
    loading: 'Lendo os pedidos…',
    empty: 'Não há pedidos abertos.',
    failed: 'Não foi possível ler os pedidos.',
    retry: 'Tentar de novo',
    acceptedClaim: 'Aceito: já é titular.',
    acceptedJoin: 'Aceito: já é membro.',
    declined: 'Recusado.',
    refused: 'Não foi possível decidir:',
    notBound: 'O caixa ainda não conhece os pedidos.',
    columns: {
      person: 'Quem',
      community: 'Comunidade',
      ask: 'O que pede',
      note: 'Nota',
      when: 'Quando',
      actions: 'Ações',
    },
  },
};

export const COMMUNITY_REQUESTS_UI: Record<SupportedLocale, CommunityRequestsMessages> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT,
};
