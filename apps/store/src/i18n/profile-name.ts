/**
 * «Tu nombre en la ciudad»'s words, five locales (cut «Tu nombre y tu cara»,
 * 2026-10-16): the settings section where a person may publish a name and
 * one of the Bazar's avatars for the people of their organizations
 * (STD-053). It says who will see it before it asks for anything, and
 * «organización» as Saldo says it.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface ProfileNameMessages {
  /** The section's title (`#nombre`). */
  readonly title: string;
  /** Who will see it — said before the name is asked for. */
  readonly who: string;
  /** What leaves the browser, and for how long. */
  readonly kept: string;
  readonly nameLabel: string;
  readonly nameHint: string;
  /** The avatar picker's legend: «Tu avatar · del Bazar». */
  readonly avatarLegend: string;
  readonly noAvatar: string;
  readonly save: string;
  readonly saving: string;
  readonly loading: string;
  /** The state line while nothing is published. */
  readonly notPublished: string;
  /** The state line while a name is published. */
  readonly published: string;
  /** Said once, politely, after a save. */
  readonly saved: string;
  readonly remove: string;
  /** Asked before «Dejar de mostrarlo» deletes anything. */
  readonly removeQuestion: string;
  readonly removeYes: string;
  readonly removeNo: string;
  readonly removing: string;
  /** Said once, politely, after the removal. */
  readonly removed: string;
  /** The till's refusals in plain words: a name, an avatar, anything else. */
  readonly problems: { readonly name: string; readonly avatar: string; readonly other: string };
  /** The till is not there yet (503): the section says so instead of the form. */
  readonly unavailable: string;
  /** The request failed (network, 502). */
  readonly failed: string;
  /** The session ended meanwhile (401). */
  readonly signedOut: string;
}

export const PROFILE_NAME_UI: Readonly<Record<SupportedLocale, ProfileNameMessages>> = {
  es: {
    title: 'Tu nombre en la ciudad',
    who: 'Lo ven las personas de tus organizaciones y, mientras dura la alfa, el equipo de Numen Games cuando entra a ayudar. Nadie más.',
    kept: 'Solo esto sale de tu navegador: el nombre y el avatar que guardes aquí, hasta que pulses «Dejar de mostrarlo».',
    nameLabel: 'Tu nombre',
    nameHint: 'De 1 a 60 caracteres. No se envía nada hasta que pulses «Guardar».',
    avatarLegend: 'Tu avatar · del Bazar',
    noAvatar: 'Sin avatar',
    save: 'Guardar',
    saving: 'Guardando…',
    loading: 'Cargando…',
    notPublished: 'Todavía no se muestra a nadie.',
    published: 'Publicado: se muestra a las personas de tus organizaciones.',
    saved: 'Guardado. Ya lo ven las personas de tus organizaciones.',
    remove: 'Dejar de mostrarlo',
    removeQuestion: 'Se borran tu nombre y tu avatar, sin copia. ¿Dejar de mostrarlos?',
    removeYes: 'Sí, dejar de mostrarlo',
    removeNo: 'Cancelar',
    removing: 'Borrando…',
    removed: 'Hecho: tu nombre ya no se muestra a nadie y no queda guardado.',
    problems: {
      name: 'Escribe un nombre de 1 a 60 caracteres, con al menos una letra, un número o un signo, y sin caracteres de control.',
      avatar: 'Elige uno de los avatares del Bazar, o «Sin avatar».',
      other: 'No se ha podido guardar. Inténtalo otra vez.',
    },
    unavailable: 'Todavía no está disponible: pronto podrás elegir aquí tu nombre y tu avatar.',
    failed: 'No se ha podido conectar. Inténtalo otra vez en un momento.',
    signedOut: 'Tu sesión ha terminado. Vuelve a entrar para cambiar tu nombre.',
  },
  en: {
    title: 'Your name in the city',
    who: 'The people of your organizations see it and, while the alpha lasts, the Numen Games team when they step in to help. Nobody else.',
    kept: 'Only this leaves your browser: the name and avatar you save here, until you press «Stop showing it».',
    nameLabel: 'Your name',
    nameHint: '1 to 60 characters. Nothing is sent until you press «Save».',
    avatarLegend: 'Your avatar · from the Bazaar',
    noAvatar: 'No avatar',
    save: 'Save',
    saving: 'Saving…',
    loading: 'Loading…',
    notPublished: 'Not shown to anyone yet.',
    published: 'Published: shown to the people of your organizations.',
    saved: 'Saved. The people of your organizations see it now.',
    remove: 'Stop showing it',
    removeQuestion: 'Your name and avatar are erased, with no copy kept. Stop showing them?',
    removeYes: 'Yes, stop showing it',
    removeNo: 'Cancel',
    removing: 'Erasing…',
    removed: 'Done: your name is shown to nobody and is no longer kept.',
    problems: {
      name: 'Write a name of 1 to 60 characters, with at least one letter, number or sign, and no control characters.',
      avatar: 'Choose one of the Bazaar’s avatars, or «No avatar».',
      other: 'It could not be saved. Try again.',
    },
    unavailable: 'Not available yet: soon you will choose your name and avatar here.',
    failed: 'It could not connect. Try again in a moment.',
    signedOut: 'Your session has ended. Sign in again to change your name.',
  },
  ja: {
    title: 'まちでのあなたの名前',
    who: 'あなたの組織の人たちと、アルファ版の間は手伝いに入るNumen Gamesのチームが見ます。それ以外の人には見えません。',
    kept: 'ブラウザの外に出るのは、ここで保存する名前とアバターだけです。「表示をやめる」を押すまで保存されます。',
    nameLabel: 'あなたの名前',
    nameHint: '1〜60文字。「保存」を押すまで何も送信されません。',
    avatarLegend: 'あなたのアバター · バザールから',
    noAvatar: 'アバターなし',
    save: '保存',
    saving: '保存中…',
    loading: '読み込み中…',
    notPublished: 'まだ誰にも表示されていません。',
    published: '公開中：あなたの組織の人たちに表示されています。',
    saved: '保存しました。あなたの組織の人たちに表示されます。',
    remove: '表示をやめる',
    removeQuestion: 'あなたの名前とアバターは消去され、コピーは残りません。表示をやめますか？',
    removeYes: 'はい、表示をやめる',
    removeNo: 'キャンセル',
    removing: '消去中…',
    removed: '完了しました。あなたの名前は誰にも表示されず、保存もされていません。',
    problems: {
      name: '1〜60文字で、文字・数字・記号を少なくとも1つ含み、制御文字を含まない名前を入力してください。',
      avatar: 'バザールのアバターから選ぶか、「アバターなし」を選んでください。',
      other: '保存できませんでした。もう一度お試しください。',
    },
    unavailable: 'まだご利用いただけません。まもなく、ここで名前とアバターを選べるようになります。',
    failed: '接続できませんでした。少し待ってからもう一度お試しください。',
    signedOut: 'セッションが終了しました。名前を変更するには、もう一度ログインしてください。',
  },
  ko: {
    title: '도시에서 쓰는 내 이름',
    who: '내 조직의 사람들과, 알파 기간에는 도우러 들어오는 Numen Games 팀이 봅니다. 그 밖의 누구도 볼 수 없습니다.',
    kept: '브라우저 밖으로 나가는 것은 여기에서 저장한 이름과 아바타뿐이며, «표시 중단»을 누를 때까지 보관됩니다.',
    nameLabel: '내 이름',
    nameHint: '1~60자. «저장»을 누르기 전에는 아무것도 보내지 않습니다.',
    avatarLegend: '내 아바타 · 바자르에서',
    noAvatar: '아바타 없음',
    save: '저장',
    saving: '저장 중…',
    loading: '불러오는 중…',
    notPublished: '아직 누구에게도 표시되지 않습니다.',
    published: '공개됨: 내 조직의 사람들에게 표시됩니다.',
    saved: '저장했습니다. 이제 내 조직의 사람들이 볼 수 있습니다.',
    remove: '표시 중단',
    removeQuestion: '이름과 아바타가 사본 없이 지워집니다. 표시를 중단할까요?',
    removeYes: '네, 표시 중단',
    removeNo: '취소',
    removing: '지우는 중…',
    removed: '완료: 이제 내 이름은 누구에게도 표시되지 않으며 보관되지 않습니다.',
    problems: {
      name: '글자, 숫자 또는 기호를 하나 이상 포함하고 제어 문자가 없는 1~60자의 이름을 입력하세요.',
      avatar: '바자르의 아바타 중 하나를 고르거나 «아바타 없음»을 고르세요.',
      other: '저장하지 못했습니다. 다시 시도하세요.',
    },
    unavailable: '아직 사용할 수 없습니다. 곧 여기에서 이름과 아바타를 고를 수 있습니다.',
    failed: '연결하지 못했습니다. 잠시 후 다시 시도하세요.',
    signedOut: '세션이 끝났습니다. 이름을 바꾸려면 다시 로그인하세요.',
  },
  'pt-br': {
    title: 'Seu nome na cidade',
    who: 'Quem vê são as pessoas das suas organizações e, enquanto durar a alfa, a equipe da Numen Games quando entra para ajudar. Mais ninguém.',
    kept: 'Só isto sai do seu navegador: o nome e o avatar que você salvar aqui, até clicar em «Deixar de mostrar».',
    nameLabel: 'Seu nome',
    nameHint: 'De 1 a 60 caracteres. Nada é enviado até você clicar em «Salvar».',
    avatarLegend: 'Seu avatar · do Bazar',
    noAvatar: 'Sem avatar',
    save: 'Salvar',
    saving: 'Salvando…',
    loading: 'Carregando…',
    notPublished: 'Ainda não aparece para ninguém.',
    published: 'Publicado: aparece para as pessoas das suas organizações.',
    saved: 'Salvo. As pessoas das suas organizações já o veem.',
    remove: 'Deixar de mostrar',
    removeQuestion: 'Seu nome e seu avatar são apagados, sem cópia. Deixar de mostrá-los?',
    removeYes: 'Sim, deixar de mostrar',
    removeNo: 'Cancelar',
    removing: 'Apagando…',
    removed: 'Pronto: seu nome não aparece para ninguém e não fica guardado.',
    problems: {
      name: 'Escreva um nome de 1 a 60 caracteres, com pelo menos uma letra, um número ou um sinal, e sem caracteres de controle.',
      avatar: 'Escolha um dos avatares do Bazar, ou «Sem avatar».',
      other: 'Não foi possível salvar. Tente de novo.',
    },
    unavailable:
      'Ainda não está disponível: em breve você poderá escolher aqui seu nome e seu avatar.',
    failed: 'Não foi possível conectar. Tente de novo em um instante.',
    signedOut: 'Sua sessão terminou. Entre de novo para mudar seu nome.',
  },
};
