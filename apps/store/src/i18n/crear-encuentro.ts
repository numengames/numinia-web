/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17): the words of
 * /crear/encuentro/ — the form that publishes an encounter of a community
 * you run — and of «Cancelar este encuentro» on an encounter's page, in five
 * locales. «{name}» is filled by `fill()` in i18n/communities.ts.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface CrearEncuentroMessages {
  readonly title: string;
  readonly lead: string;
  /** Signed out: what the page is for, and the door. */
  readonly signedOutLead: string;
  readonly signIn: string;
  /** No community of yours: the line and the way to «Hazla tuya». */
  readonly noneTitle: string;
  readonly noneLead: string;
  readonly claimOne: string;
  /** The till is not there. */
  readonly unavailable: string;
  /** The fields. */
  readonly community: string;
  readonly titleField: string;
  readonly titleHelp: string;
  readonly day: string;
  readonly time: string;
  readonly timeHelp: string;
  readonly endDay: string;
  readonly endTime: string;
  readonly endHelp: string;
  readonly how: string;
  readonly inPerson: string;
  readonly online: string;
  readonly inWorld: string;
  readonly world: string;
  readonly where: string;
  readonly whereHelp: string;
  readonly note: string;
  readonly noteHelp: string;
  readonly publish: string;
  readonly publishing: string;
  /** What went wrong, by field. */
  readonly problems: Readonly<
    Record<'community' | 'title' | 'day' | 'end' | 'how' | 'world' | 'where' | 'note', string>
  >;
  readonly refused: string;
  readonly failed: string;
  /** The toast on the new encounter's page. */
  readonly published: string;
  /** On an encounter's page, to its creator and the house. */
  readonly cancel: string;
  readonly cancelAsk: string;
  readonly cancelLead: string;
  readonly cancelConfirm: string;
  readonly cancelKeep: string;
  readonly cancelled: string;
  readonly cancelledLead: string;
}

const ES: CrearEncuentroMessages = {
  title: 'Un encuentro',
  lead: 'Para una comunidad que llevas: día, sitio, en persona o en su mundo. Al publicarlo entra en el calendario de la ciudad.',
  signedOutLead: 'Publica un encuentro de una comunidad que llevas. Entra para hacerlo.',
  signIn: 'Entrar',
  noneTitle: 'Todavía no llevas ninguna comunidad',
  noneLead:
    'Los encuentros los publica quien lleva la comunidad: su titular o alguien de su administración.',
  claimOne: 'Hazla tuya',
  unavailable: 'Ahora mismo no podemos publicar. Vuelve en un rato.',
  community: 'Comunidad',
  titleField: 'Nombre del encuentro',
  titleHelp: 'Como lo dirías tú: «Taller de Hyperfy», «Quedada de noviembre».',
  day: 'Día',
  time: 'Hora',
  timeHelp: 'Opcional. Sin hora, es de día entero. La hora es la de tu dispositivo.',
  endDay: 'Último día',
  endTime: 'Hora de fin',
  endHelp: 'Opcional. Para un encuentro de varios días, o para decir cuándo acaba.',
  how: 'Cómo',
  inPerson: 'En persona',
  online: 'En línea',
  inWorld: 'En su mundo',
  world: 'Mundo',
  where: 'Sitio',
  whereHelp: 'La dirección, el local, o el enlace si es en línea.',
  note: 'Una nota',
  noteHelp: 'Opcional, hasta 600 caracteres. Qué llevar, a quién va dirigido, cómo apuntarse.',
  publish: 'Publicar',
  publishing: 'Publicando…',
  problems: {
    community: 'Elige la comunidad.',
    title: 'Ponle nombre: hasta 120 caracteres.',
    day: 'Di el día, y la hora como HH:MM si la das.',
    end: 'El fin no puede ser antes del principio.',
    how: 'Di cómo se hace: en persona, en línea o en su mundo.',
    world: 'Elige el mundo.',
    where: 'Di el sitio: hasta 200 caracteres.',
    note: 'La nota llega hasta 600 caracteres.',
  },
  refused: 'No se ha podido publicar: no llevas esa comunidad.',
  failed: 'No se ha podido publicar. Inténtalo otra vez.',
  published: 'Publicado. Ya está en el calendario de la ciudad.',
  cancel: 'Cancelar este encuentro',
  cancelAsk: '¿Cancelar este encuentro?',
  cancelLead:
    'Saldrá del calendario y de las listas. Su página dirá que se canceló. No se puede deshacer.',
  cancelConfirm: 'Sí, cancelarlo',
  cancelKeep: 'No, dejarlo',
  cancelled: 'Cancelado',
  cancelledLead: 'Este encuentro se canceló. Ya no está en el calendario.',
};

const EN: CrearEncuentroMessages = {
  title: 'A gathering',
  lead: 'For a community you run: day, place, in person or in its world. Once published it is in the city’s calendar.',
  signedOutLead: 'Publish a gathering of a community you run. Sign in to do it.',
  signIn: 'Sign in',
  noneTitle: 'You don’t run a community yet',
  noneLead:
    'Gatherings are published by whoever runs the community: its holder or someone in its administration.',
  claimOne: 'Make it yours',
  unavailable: 'We can’t publish right now. Come back in a while.',
  community: 'Community',
  titleField: 'Name of the gathering',
  titleHelp: 'As you would say it: “Hyperfy workshop”, “November meetup”.',
  day: 'Day',
  time: 'Time',
  timeHelp: 'Optional. Without a time it lasts the whole day. The time is your device’s.',
  endDay: 'Last day',
  endTime: 'End time',
  endHelp: 'Optional. For a gathering over several days, or to say when it ends.',
  how: 'How',
  inPerson: 'In person',
  online: 'Online',
  inWorld: 'In its world',
  world: 'World',
  where: 'Place',
  whereHelp: 'The address, the venue, or the link if it is online.',
  note: 'A note',
  noteHelp: 'Optional, up to 600 characters. What to bring, who it is for, how to sign up.',
  publish: 'Publish',
  publishing: 'Publishing…',
  problems: {
    community: 'Choose the community.',
    title: 'Give it a name: up to 120 characters.',
    day: 'Say the day, and the time as HH:MM if you give one.',
    end: 'The end can’t come before the start.',
    how: 'Say how: in person, online or in its world.',
    world: 'Choose the world.',
    where: 'Say the place: up to 200 characters.',
    note: 'The note goes up to 600 characters.',
  },
  refused: 'It could not be published: you don’t run that community.',
  failed: 'It could not be published. Try again.',
  published: 'Published. It is already in the city’s calendar.',
  cancel: 'Cancel this gathering',
  cancelAsk: 'Cancel this gathering?',
  cancelLead:
    'It leaves the calendar and the lists. Its page will say it was cancelled. This cannot be undone.',
  cancelConfirm: 'Yes, cancel it',
  cancelKeep: 'No, keep it',
  cancelled: 'Cancelled',
  cancelledLead: 'This gathering was cancelled. It is no longer in the calendar.',
};

const JA: CrearEncuentroMessages = {
  title: '集まり',
  lead: 'あなたが運営するコミュニティのために：日付、場所、対面かそのワールドで。公開すると街のカレンダーに載ります。',
  signedOutLead: '運営するコミュニティの集まりを公開します。サインインしてください。',
  signIn: 'サインイン',
  noneTitle: 'まだ運営しているコミュニティがありません',
  noneLead: '集まりを公開できるのはコミュニティを運営する人：その代表か運営メンバーです。',
  claimOne: '自分のものにする',
  unavailable: '今は公開できません。しばらくしてからもう一度。',
  community: 'コミュニティ',
  titleField: '集まりの名前',
  titleHelp: 'あなたの言い方で：「Hyperfyワークショップ」「11月の集い」。',
  day: '日付',
  time: '時刻',
  timeHelp: '任意。時刻がなければ終日です。時刻はお使いの端末のものです。',
  endDay: '最終日',
  endTime: '終了時刻',
  endHelp: '任意。数日にわたる集まりや、終わる時刻を示すために。',
  how: '形式',
  inPerson: '対面',
  online: 'オンライン',
  inWorld: 'そのワールドで',
  world: 'ワールド',
  where: '場所',
  whereHelp: '住所、会場、オンラインならリンク。',
  note: 'メモ',
  noteHelp: '任意、600文字まで。持ち物、対象、参加方法など。',
  publish: '公開する',
  publishing: '公開中…',
  problems: {
    community: 'コミュニティを選んでください。',
    title: '名前をつけてください：120文字まで。',
    day: '日付を入れてください。時刻は HH:MM の形で。',
    end: '終了は開始より前にできません。',
    how: '形式を選んでください：対面、オンライン、そのワールド。',
    world: 'ワールドを選んでください。',
    where: '場所を入れてください：200文字まで。',
    note: 'メモは600文字までです。',
  },
  refused: '公開できませんでした：そのコミュニティを運営していません。',
  failed: '公開できませんでした。もう一度お試しください。',
  published: '公開しました。街のカレンダーに載っています。',
  cancel: 'この集まりを中止する',
  cancelAsk: 'この集まりを中止しますか？',
  cancelLead: 'カレンダーと一覧から消えます。このページには中止と表示されます。元に戻せません。',
  cancelConfirm: 'はい、中止する',
  cancelKeep: 'いいえ、残す',
  cancelled: '中止',
  cancelledLead: 'この集まりは中止されました。カレンダーにはもうありません。',
};

const KO: CrearEncuentroMessages = {
  title: '모임',
  lead: '내가 운영하는 커뮤니티를 위해: 날짜, 장소, 대면 또는 그 월드에서. 게시하면 도시 달력에 오릅니다.',
  signedOutLead: '운영하는 커뮤니티의 모임을 게시합니다. 로그인하세요.',
  signIn: '로그인',
  noneTitle: '아직 운영하는 커뮤니티가 없습니다',
  noneLead: '모임은 커뮤니티를 운영하는 사람이 게시합니다: 대표나 운영진.',
  claimOne: '내 것으로 만들기',
  unavailable: '지금은 게시할 수 없습니다. 잠시 후 다시 오세요.',
  community: '커뮤니티',
  titleField: '모임 이름',
  titleHelp: '평소 말하듯이: «Hyperfy 워크숍», «11월 모임».',
  day: '날짜',
  time: '시간',
  timeHelp: '선택. 시간이 없으면 하루 종일입니다. 시간은 내 기기 기준입니다.',
  endDay: '마지막 날',
  endTime: '종료 시간',
  endHelp: '선택. 여러 날에 걸친 모임이거나 끝나는 때를 알리려면.',
  how: '방식',
  inPerson: '대면',
  online: '온라인',
  inWorld: '그 월드에서',
  world: '월드',
  where: '장소',
  whereHelp: '주소, 장소명, 온라인이면 링크.',
  note: '메모',
  noteHelp: '선택, 600자까지. 준비물, 대상, 참여 방법.',
  publish: '게시',
  publishing: '게시 중…',
  problems: {
    community: '커뮤니티를 고르세요.',
    title: '이름을 지어 주세요: 120자까지.',
    day: '날짜를 입력하고, 시간은 HH:MM 형식으로.',
    end: '종료가 시작보다 앞설 수 없습니다.',
    how: '방식을 고르세요: 대면, 온라인, 그 월드에서.',
    world: '월드를 고르세요.',
    where: '장소를 입력하세요: 200자까지.',
    note: '메모는 600자까지입니다.',
  },
  refused: '게시할 수 없습니다: 그 커뮤니티를 운영하지 않습니다.',
  failed: '게시할 수 없습니다. 다시 시도하세요.',
  published: '게시됨. 이미 도시 달력에 있습니다.',
  cancel: '이 모임 취소하기',
  cancelAsk: '이 모임을 취소할까요?',
  cancelLead:
    '달력과 목록에서 사라집니다. 이 페이지에는 취소되었다고 표시됩니다. 되돌릴 수 없습니다.',
  cancelConfirm: '네, 취소합니다',
  cancelKeep: '아니요, 남겨 둡니다',
  cancelled: '취소됨',
  cancelledLead: '이 모임은 취소되었습니다. 더는 달력에 없습니다.',
};

const PT_BR: CrearEncuentroMessages = {
  title: 'Um encontro',
  lead: 'Para uma comunidade que você lidera: dia, lugar, presencial ou no mundo dela. Ao publicar, entra no calendário da cidade.',
  signedOutLead: 'Publique um encontro de uma comunidade que você lidera. Entre para fazer isso.',
  signIn: 'Entrar',
  noneTitle: 'Você ainda não lidera nenhuma comunidade',
  noneLead:
    'Os encontros são publicados por quem lidera a comunidade: seu titular ou alguém da administração.',
  claimOne: 'Faça-a sua',
  unavailable: 'Agora não conseguimos publicar. Volte daqui a pouco.',
  community: 'Comunidade',
  titleField: 'Nome do encontro',
  titleHelp: 'Como você diria: «Oficina de Hyperfy», «Encontro de novembro».',
  day: 'Dia',
  time: 'Hora',
  timeHelp: 'Opcional. Sem hora, dura o dia inteiro. A hora é a do seu aparelho.',
  endDay: 'Último dia',
  endTime: 'Hora de término',
  endHelp: 'Opcional. Para um encontro de vários dias, ou para dizer quando termina.',
  how: 'Como',
  inPerson: 'Presencial',
  online: 'Online',
  inWorld: 'No mundo dela',
  world: 'Mundo',
  where: 'Lugar',
  whereHelp: 'O endereço, o local, ou o link se for online.',
  note: 'Uma nota',
  noteHelp: 'Opcional, até 600 caracteres. O que levar, para quem é, como se inscrever.',
  publish: 'Publicar',
  publishing: 'Publicando…',
  problems: {
    community: 'Escolha a comunidade.',
    title: 'Dê um nome: até 120 caracteres.',
    day: 'Diga o dia, e a hora como HH:MM se houver.',
    end: 'O fim não pode vir antes do começo.',
    how: 'Diga como: presencial, online ou no mundo dela.',
    world: 'Escolha o mundo.',
    where: 'Diga o lugar: até 200 caracteres.',
    note: 'A nota vai até 600 caracteres.',
  },
  refused: 'Não foi possível publicar: você não lidera essa comunidade.',
  failed: 'Não foi possível publicar. Tente de novo.',
  published: 'Publicado. Já está no calendário da cidade.',
  cancel: 'Cancelar este encontro',
  cancelAsk: 'Cancelar este encontro?',
  cancelLead:
    'Sai do calendário e das listas. A página dele dirá que foi cancelado. Não dá para desfazer.',
  cancelConfirm: 'Sim, cancelar',
  cancelKeep: 'Não, deixar',
  cancelled: 'Cancelado',
  cancelledLead: 'Este encontro foi cancelado. Já não está no calendário.',
};

export const CREAR_ENCUENTRO_UI: Readonly<Record<SupportedLocale, CrearEncuentroMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
