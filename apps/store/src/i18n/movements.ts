/**
 * The words of the Bazar's «Movimientos» section (first cut), five locales:
 * its heading, its lead, the line that says nothing downloads yet, and the
 * name of each movement by its dictionary id. Screen words: «movimiento»
 * (never «emote» or «animación» on the card), «comunidad», «mundo».
 * `{n}` is filled by `fill()` (lib/bazaar-view.ts).
 */

import type { SupportedLocale } from '@numinia/domain';

export interface MovementsMessages {
  readonly title: string;
  readonly lead: string;
  /** The chip in the Bazar's head that leads down to the section: «Movimientos · {n}». */
  readonly jump: string;
  /** Said once, under the lead: there is no download button on purpose. */
  readonly noDownload: string;
  /** The label before the clips' own names. */
  readonly clipsLabel: string;
  /** The same label when the library gives still poses, not clips. */
  readonly posesLabel: string;
  readonly fromLabel: string;
  /** Each movement's name, by its stable id. */
  readonly names: Readonly<Record<string, string>>;
}

const ES: MovementsMessages = {
  title: 'Movimientos',
  lead: 'Lo que un avatar ya puede hacer en un mundo con una animación libre que existe hoy. Cada movimiento lleva un código que no cambia, para encontrarlo siempre igual.',
  jump: 'Movimientos · {n}',
  noDownload: 'Todavía no se descargan desde aquí.',
  clipsLabel: 'Clips',
  posesLabel: 'Poses',
  fromLabel: 'De',
  names: {
    'GS-03': 'Celebrar',
    'EST-13': 'Esperar de pie',
    'EST-15': 'Sentarse en una silla',
    'EST-16': 'Sentarse en el suelo',
    'EST-19': 'Brazos cruzados',
    'REA-23': 'Sorpresa',
    'REA-24': 'Tristeza',
    'MUN-32': 'Pulsar un botón',
    'MUN-34': 'Abrir una puerta o un cofre',
    'MUN-35': 'Empujar',
    'MUN-36': 'Lanzar algo pequeño',
    'MUN-37': 'Agacharse a coger algo',
    'DUO-42': 'Posar para la foto',
  },
};

const EN: MovementsMessages = {
  title: 'Movements',
  lead: 'What an avatar can already do in a world with a free animation that exists today. Each movement has a code that never changes, so you always find it the same way.',
  jump: 'Movements · {n}',
  noDownload: 'They cannot be downloaded from here yet.',
  clipsLabel: 'Clips',
  posesLabel: 'Poses',
  fromLabel: 'From',
  names: {
    'GS-03': 'Celebrate',
    'EST-13': 'Wait standing',
    'EST-15': 'Sit on a chair',
    'EST-16': 'Sit on the floor',
    'EST-19': 'Arms crossed',
    'REA-23': 'Surprise',
    'REA-24': 'Sadness',
    'MUN-32': 'Press a button',
    'MUN-34': 'Open a door or a chest',
    'MUN-35': 'Push',
    'MUN-36': 'Throw something small',
    'MUN-37': 'Crouch to pick something up',
    'DUO-42': 'Pose for a photo',
  },
};

const JA: MovementsMessages = {
  title: 'モーション',
  lead: '今ある自由なアニメーションで、アバターがワールドの中ですでにできること。各モーションには変わらないコードが付いていて、いつも同じように見つけられます。',
  jump: 'モーション · {n}',
  noDownload: 'ここからはまだダウンロードできません。',
  clipsLabel: 'クリップ',
  posesLabel: 'ポーズ',
  fromLabel: '出典',
  names: {
    'GS-03': '祝う',
    'EST-13': '立って待つ',
    'EST-15': '椅子に座る',
    'EST-16': '床に座る',
    'EST-19': '腕を組む',
    'REA-23': '驚き',
    'REA-24': '悲しみ',
    'MUN-32': 'ボタンを押す',
    'MUN-34': 'ドアや宝箱を開ける',
    'MUN-35': '押す',
    'MUN-36': '小さな物を投げる',
    'MUN-37': 'かがんで拾う',
    'DUO-42': '写真のポーズ',
  },
};

const KO: MovementsMessages = {
  title: '동작',
  lead: '지금 있는 자유 애니메이션으로 아바타가 월드에서 이미 할 수 있는 것. 각 동작에는 바뀌지 않는 코드가 있어 언제나 같은 방법으로 찾을 수 있습니다.',
  jump: '동작 · {n}',
  noDownload: '아직 여기서 내려받을 수 없습니다.',
  clipsLabel: '클립',
  posesLabel: '포즈',
  fromLabel: '출처',
  names: {
    'GS-03': '축하하기',
    'EST-13': '서서 기다리기',
    'EST-15': '의자에 앉기',
    'EST-16': '바닥에 앉기',
    'EST-19': '팔짱 끼기',
    'REA-23': '놀람',
    'REA-24': '슬픔',
    'MUN-32': '버튼 누르기',
    'MUN-34': '문이나 상자 열기',
    'MUN-35': '밀기',
    'MUN-36': '작은 것 던지기',
    'MUN-37': '몸을 굽혀 줍기',
    'DUO-42': '사진 포즈',
  },
};

const PT_BR: MovementsMessages = {
  title: 'Movimentos',
  lead: 'O que um avatar já pode fazer num mundo com uma animação livre que existe hoje. Cada movimento tem um código que não muda, para encontrá-lo sempre do mesmo jeito.',
  jump: 'Movimentos · {n}',
  noDownload: 'Ainda não dá para baixar daqui.',
  clipsLabel: 'Clipes',
  posesLabel: 'Poses',
  fromLabel: 'De',
  names: {
    'GS-03': 'Comemorar',
    'EST-13': 'Esperar em pé',
    'EST-15': 'Sentar numa cadeira',
    'EST-16': 'Sentar no chão',
    'EST-19': 'Braços cruzados',
    'REA-23': 'Surpresa',
    'REA-24': 'Tristeza',
    'MUN-32': 'Apertar um botão',
    'MUN-34': 'Abrir uma porta ou um baú',
    'MUN-35': 'Empurrar',
    'MUN-36': 'Lançar algo pequeno',
    'MUN-37': 'Abaixar-se para pegar algo',
    'DUO-42': 'Posar para a foto',
  },
};

export const MOVEMENTS_MESSAGES: Readonly<Record<SupportedLocale, MovementsMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
