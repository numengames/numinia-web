/**
 * «Ahora y Mundos»'s words (v3, cut C, 2026-10-16), five locales: the front
 * page as «Ahora» (what the city is doing now), the index of the city's 3D
 * worlds (/mundos/) with the one world card every screen shares, and the
 * Bazar's line of shelves per community. Screen words: «encuentro» (never
 * ritual), «comunidad» (never organización or grupo), «mundo», «sede».
 * `{n}`-style placeholders are filled by `fill()` (i18n/communities.ts).
 *
 * Read on the server only: the pages hand their inline scripts the few
 * templates they fill in the browser.
 */

import type { SupportedLocale } from '@numinia/domain';

/** A world's state as its card says it, with the line that explains it. */
interface StateWords {
  readonly label: string;
  readonly note: string;
}

export interface AhoraMessages {
  // ── the front page
  /** The page's one heading, for screen readers (the featured frame speaks for it). */
  readonly title: string;
  readonly featuredLabel: string;
  /** A slide's place: "{n}" of "{m}". */
  readonly slideOf: string;
  readonly openNow: string;
  readonly ofTheCity: string;
  readonly worldLead: string;
  /** The line under a world slide: "{x}" is the next encounter's name, linked. */
  readonly laterInCity: string;
  readonly signMeUp: string;
  readonly seeEncounter: string;
  /** "{x}" is the community's name, linked. */
  readonly byCommunity: string;
  readonly nowInside: string;
  readonly upcomingTitle: string;
  /** The help under the encounters; the visitor's time zone follows it. */
  readonly upcomingHelp: string;
  readonly aliveTitle: string;
  readonly aliveHelp: string;
  /** "{n}" is how many communities the site shows. */
  readonly allCommunities: string;
  readonly newTitle: string;
  readonly newHelp: string;
  /** "{n}" is how many goods the Bazar has. */
  readonly allBazaar: string;

  // ── /mundos/
  readonly worldsTitle: string;
  readonly worldsLead: string;
  readonly crumbHome: string;
  readonly filterLabel: string;
  readonly filterAll: string;
  readonly filterPeople: string;
  readonly filterCity: string;
  readonly filterCommunities: string;
  readonly states: Readonly<Record<'on' | 'off' | 'works', StateWords>>;
  /** "{x}" is the community's name. */
  readonly keptBy: string;
  /** "{x}" is the community's name. */
  readonly homeOf: string;
  readonly insideNone: string;
  readonly insideOne: string;
  /** "{n}" people inside now. */
  readonly insideMany: string;
  readonly insideLabel: string;
  readonly enter: string;
  readonly entering: string;
  readonly itsPage: string;
  readonly countNote: string;
  readonly emptyFilter: string;
  readonly emptyAll: string;
  readonly unreadable: string;
  readonly coverAlt: string;

  // ── the Bazar
  readonly shelvesLine: string;
  readonly shelvesLabel: string;
}

const ES: AhoraMessages = {
  title: 'Ahora en Numinia',
  featuredLabel: 'Lo que presentamos',
  slideOf: '{n} de {m}',
  openNow: 'Abierto ahora',
  ofTheCity: 'De la ciudad',
  worldLead: 'Se abre en el navegador, sin instalar nada.',
  laterInCity: 'Luego en la ciudad: {x}.',
  signMeUp: 'Me apunto',
  seeEncounter: 'Ver el encuentro',
  byCommunity: 'De {x}.',
  nowInside: 'Ahora mismo, dentro',
  upcomingTitle: 'Próximos encuentros',
  upcomingHelp: 'En persona o en línea. En tu hora',
  aliveTitle: 'Comunidades con vida',
  aliveHelp: 'Las que se reúnen antes.',
  allCommunities: 'Las {n} comunidades',
  newTitle: 'Recién llegado al Bazar',
  newHelp: 'Lo último que se ha subido. Todo es CC0: cógelo y úsalo donde quieras.',
  allBazaar: 'Todo el Bazar · {n}',

  worldsTitle: 'Mundos',
  worldsLead:
    'Los espacios 3D de la ciudad: los de todos y la sede de cada comunidad. Se entra desde el navegador, también en el móvil.',
  crumbHome: 'Numinia',
  filterLabel: 'Qué mundos ver',
  filterAll: 'Todos',
  filterPeople: 'Con gente ahora',
  filterCity: 'De la ciudad',
  filterCommunities: 'De comunidades',
  states: {
    on: {
      label: 'Encendido',
      note: 'Abierto ahora: se entra desde el navegador, también en el móvil.',
    },
    off: {
      label: 'Apagado',
      note: 'Guardado tal cual. Se enciende para un encuentro o cuando su comunidad quiera.',
    },
    works: { label: 'En obras', note: 'Se está construyendo. Abre pronto.' },
  },
  keptBy: 'De todos · lo cuida {x}',
  homeOf: 'Sede de {x}',
  insideNone: 'Nadie dentro ahora',
  insideOne: '1 dentro ahora',
  insideMany: '{n} dentro ahora',
  insideLabel: 'Gente dentro ahora',
  enter: 'Entrar',
  entering: 'Entrando…',
  itsPage: 'Su página',
  countNote: 'Cuánta gente hay lo cuenta cada mundo, sin rastrear a nadie.',
  emptyFilter: 'Ningún mundo con este filtro.',
  emptyAll: 'Todavía no hay mundos abiertos al público.',
  unreadable: 'Ahora no podemos leer la lista de mundos. Vuelve a probar en un rato.',
  coverAlt: 'Vista del mundo',

  shelvesLine: 'El de cada comunidad, si ha subido algo:',
  shelvesLabel: 'Bazar de cada comunidad',
};

const EN: AhoraMessages = {
  title: 'Now in Numinia',
  featuredLabel: 'What we present',
  slideOf: '{n} of {m}',
  openNow: 'Open now',
  ofTheCity: 'Of the city',
  worldLead: 'It opens in the browser, nothing to install.',
  laterInCity: 'Later in the city: {x}.',
  signMeUp: 'Count me in',
  seeEncounter: 'See the encounter',
  byCommunity: 'By {x}.',
  nowInside: 'Inside right now',
  upcomingTitle: 'Upcoming encounters',
  upcomingHelp: 'In person or online. In your time',
  aliveTitle: 'Communities with life',
  aliveHelp: 'The ones that meet soonest.',
  allCommunities: 'All {n} communities',
  newTitle: 'New in the Bazar',
  newHelp: 'The latest uploads. Everything is CC0: take it and use it wherever you like.',
  allBazaar: 'The whole Bazar · {n}',

  worldsTitle: 'Worlds',
  worldsLead:
    'The city’s 3D spaces: the ones of everyone and each community’s home. You enter from the browser, on your phone too.',
  crumbHome: 'Numinia',
  filterLabel: 'Which worlds to see',
  filterAll: 'All',
  filterPeople: 'With people now',
  filterCity: 'Of the city',
  filterCommunities: 'Of communities',
  states: {
    on: { label: 'On', note: 'Open now: you enter from the browser, on your phone too.' },
    off: {
      label: 'Off',
      note: 'Kept just as it is. It is switched on for an encounter or when its community wants.',
    },
    works: { label: 'Under works', note: 'It is being built. It opens soon.' },
  },
  keptBy: 'Everyone’s · kept by {x}',
  homeOf: 'Home of {x}',
  insideNone: 'Nobody inside now',
  insideOne: '1 inside now',
  insideMany: '{n} inside now',
  insideLabel: 'People inside now',
  enter: 'Enter',
  entering: 'Entering…',
  itsPage: 'Its page',
  countNote: 'Each world counts how many are inside, without tracking anyone.',
  emptyFilter: 'No world with this filter.',
  emptyAll: 'No world is open to the public yet.',
  unreadable: 'We cannot read the list of worlds right now. Try again in a while.',
  coverAlt: 'View of the world',

  shelvesLine: 'Each community’s own, once it has uploaded something:',
  shelvesLabel: 'Each community’s Bazar',
};

const JA: AhoraMessages = {
  title: 'いまのヌミニア',
  featuredLabel: 'ご紹介',
  slideOf: '{m}件中{n}件目',
  openNow: 'いま開いています',
  ofTheCity: '都市のもの',
  worldLead: 'ブラウザで開きます。インストールは不要です。',
  laterInCity: 'このあと都市で：{x}。',
  signMeUp: '参加する',
  seeEncounter: '集まりを見る',
  byCommunity: '主催：{x}。',
  nowInside: 'いま中にいる人',
  upcomingTitle: '次の集まり',
  upcomingHelp: '対面またはオンライン。あなたの時間で',
  aliveTitle: '動きのあるコミュニティ',
  aliveHelp: 'いちばん早く集まるところ。',
  allCommunities: '{n}のコミュニティすべて',
  newTitle: 'バザールの新着',
  newHelp: '最近アップロードされたもの。すべてCC0：どこでも自由に使えます。',
  allBazaar: 'バザールすべて · {n}',

  worldsTitle: 'ワールド',
  worldsLead:
    '都市の3D空間：みんなのものと、各コミュニティの拠点。ブラウザから入れます。スマートフォンでも。',
  crumbHome: 'Numinia',
  filterLabel: '表示するワールド',
  filterAll: 'すべて',
  filterPeople: 'いま人がいる',
  filterCity: '都市のもの',
  filterCommunities: 'コミュニティのもの',
  states: {
    on: { label: '稼働中', note: 'いま開いています：ブラウザから入れます。スマートフォンでも。' },
    off: {
      label: '停止中',
      note: 'そのまま保存されています。集まりのときや、コミュニティが望むときに起動します。',
    },
    works: { label: '工事中', note: 'いま作られています。まもなく開きます。' },
  },
  keptBy: 'みんなのもの · 管理：{x}',
  homeOf: '{x}の拠点',
  insideNone: 'いまは誰もいません',
  insideOne: 'いま1人',
  insideMany: 'いま{n}人',
  insideLabel: 'いま中にいる人',
  enter: '入る',
  entering: '入っています…',
  itsPage: 'ページ',
  countNote: '人数は各ワールドが数えます。誰も追跡しません。',
  emptyFilter: 'この条件のワールドはありません。',
  emptyAll: '公開中のワールドはまだありません。',
  unreadable: 'いまワールドの一覧を読めません。しばらくしてからもう一度お試しください。',
  coverAlt: 'ワールドの眺め',

  shelvesLine: '各コミュニティのもの（アップロードがあれば）：',
  shelvesLabel: '各コミュニティのバザール',
};

const KO: AhoraMessages = {
  title: '지금 누미니아',
  featuredLabel: '소개',
  slideOf: '{m}개 중 {n}번째',
  openNow: '지금 열림',
  ofTheCity: '도시의 것',
  worldLead: '브라우저에서 열립니다. 설치할 것이 없습니다.',
  laterInCity: '이후 도시에서: {x}.',
  signMeUp: '참여할게요',
  seeEncounter: '모임 보기',
  byCommunity: '주최: {x}.',
  nowInside: '지금 안에 있는 곳',
  upcomingTitle: '다가오는 모임',
  upcomingHelp: '대면 또는 온라인. 당신의 시간으로',
  aliveTitle: '활동 중인 커뮤니티',
  aliveHelp: '가장 먼저 모이는 곳.',
  allCommunities: '커뮤니티 {n}곳 모두',
  newTitle: '바자에 새로 온 것',
  newHelp: '가장 최근에 올라온 것. 모두 CC0: 어디서든 자유롭게 쓰세요.',
  allBazaar: '바자 전체 · {n}',

  worldsTitle: '월드',
  worldsLead:
    '도시의 3D 공간: 모두의 것과 각 커뮤니티의 거점. 브라우저에서 들어갑니다. 휴대폰에서도.',
  crumbHome: 'Numinia',
  filterLabel: '볼 월드',
  filterAll: '전체',
  filterPeople: '지금 사람 있음',
  filterCity: '도시의 것',
  filterCommunities: '커뮤니티의 것',
  states: {
    on: { label: '켜짐', note: '지금 열림: 브라우저에서 들어갑니다. 휴대폰에서도.' },
    off: {
      label: '꺼짐',
      note: '그대로 보관되어 있습니다. 모임이 있거나 커뮤니티가 원할 때 켜집니다.',
    },
    works: { label: '공사 중', note: '지금 만들고 있습니다. 곧 열립니다.' },
  },
  keptBy: '모두의 것 · 관리: {x}',
  homeOf: '{x}의 거점',
  insideNone: '지금 아무도 없음',
  insideOne: '지금 1명',
  insideMany: '지금 {n}명',
  insideLabel: '지금 안에 있는 사람',
  enter: '들어가기',
  entering: '들어가는 중…',
  itsPage: '페이지',
  countNote: '인원은 각 월드가 셉니다. 아무도 추적하지 않습니다.',
  emptyFilter: '이 조건의 월드가 없습니다.',
  emptyAll: '아직 공개된 월드가 없습니다.',
  unreadable: '지금은 월드 목록을 읽을 수 없습니다. 잠시 후 다시 시도하세요.',
  coverAlt: '월드의 모습',

  shelvesLine: '각 커뮤니티의 것(올린 것이 있으면):',
  shelvesLabel: '각 커뮤니티의 바자',
};

const PT_BR: AhoraMessages = {
  title: 'Agora em Numinia',
  featuredLabel: 'O que apresentamos',
  slideOf: '{n} de {m}',
  openNow: 'Aberto agora',
  ofTheCity: 'Da cidade',
  worldLead: 'Abre no navegador, sem instalar nada.',
  laterInCity: 'Depois na cidade: {x}.',
  signMeUp: 'Eu vou',
  seeEncounter: 'Ver o encontro',
  byCommunity: 'De {x}.',
  nowInside: 'Agora mesmo, dentro',
  upcomingTitle: 'Próximos encontros',
  upcomingHelp: 'Presencial ou online. No seu horário',
  aliveTitle: 'Comunidades com vida',
  aliveHelp: 'As que se reúnem antes.',
  allCommunities: 'As {n} comunidades',
  newTitle: 'Recém-chegado ao Bazar',
  newHelp: 'O último que foi enviado. Tudo é CC0: pegue e use onde quiser.',
  allBazaar: 'Todo o Bazar · {n}',

  worldsTitle: 'Mundos',
  worldsLead:
    'Os espaços 3D da cidade: os de todos e a sede de cada comunidade. Entra-se pelo navegador, também no celular.',
  crumbHome: 'Numinia',
  filterLabel: 'Quais mundos ver',
  filterAll: 'Todos',
  filterPeople: 'Com gente agora',
  filterCity: 'Da cidade',
  filterCommunities: 'De comunidades',
  states: {
    on: {
      label: 'Ligado',
      note: 'Aberto agora: entra-se pelo navegador, também no celular.',
    },
    off: {
      label: 'Desligado',
      note: 'Guardado tal como está. Liga-se para um encontro ou quando sua comunidade quiser.',
    },
    works: { label: 'Em obras', note: 'Está sendo construído. Abre em breve.' },
  },
  keptBy: 'De todos · cuidado por {x}',
  homeOf: 'Sede de {x}',
  insideNone: 'Ninguém dentro agora',
  insideOne: '1 dentro agora',
  insideMany: '{n} dentro agora',
  insideLabel: 'Gente dentro agora',
  enter: 'Entrar',
  entering: 'Entrando…',
  itsPage: 'Sua página',
  countNote: 'Quanta gente há, cada mundo conta, sem rastrear ninguém.',
  emptyFilter: 'Nenhum mundo com este filtro.',
  emptyAll: 'Ainda não há mundos abertos ao público.',
  unreadable: 'Agora não conseguimos ler a lista de mundos. Tente de novo daqui a pouco.',
  coverAlt: 'Vista do mundo',

  shelvesLine: 'O de cada comunidade, se enviou algo:',
  shelvesLabel: 'Bazar de cada comunidade',
};

export const AHORA_UI: Readonly<Record<SupportedLocale, AhoraMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
