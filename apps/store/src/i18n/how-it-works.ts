/**
 * «Cómo funciona» (/how-it-works/) — what the front door used to explain and
 * the old /city/ page told at length, rethought as one page (the app shell,
 * v0.83.0): what Numinia is in a line, four steps with their doors, the six
 * templates a community can open its home from, and why a city.
 *
 * The three lines of the city's story are canon, quoted verbatim from the
 * retired city page (Spanish and English only, as that page had them); the
 * other locales read them in English behind a notice, as that page did.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface HowStep {
  readonly title: string;
  /** May carry "{n}", the number of communities on the site. */
  readonly text: string;
  readonly link: string;
}

export interface HowTemplate {
  readonly name: string;
  readonly text: string;
}

export interface HowItWorksMessages {
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly lead: string;
  readonly steps: readonly [HowStep, HowStep, HowStep, HowStep];
  readonly openEyebrow: string;
  readonly openTitle: string;
  readonly openHelp: string;
  readonly templates: readonly [
    HowTemplate,
    HowTemplate,
    HowTemplate,
    HowTemplate,
    HowTemplate,
    HowTemplate,
  ];
  readonly write: string;
  readonly whyEyebrow: string;
  readonly whyTitle: string;
  readonly story: readonly [string, string, string];
  /** Set where the story is read in another language than the page's. */
  readonly storyNotice: string | undefined;
  readonly storyImageAlt: string;
  readonly readArchive: string;
}

/** The city's story, verbatim from the canon the retired /city/ page carried. */
const STORY_ES: readonly [string, string, string] = [
  'A comienzos del siglo XX, cinco iniciados, encabezados por un científico conocido como Holberins, concibieron Numinia como un experimento para reunir el conocimiento humano en un único espacio compartido, donde ciencia, arte y filosofía pudieran dialogar sin fronteras.',
  'Antes de su destrucción a causa de un incendio en 1920, Holberins proyectó la esencia de la ciudad en los Registros Akáshicos, una memoria universal donde permanecen las ideas, los símbolos y los ecos de todo cuanto sucede, ha sucedido y sucederá.',
  'Gracias a ello, un siglo después, Numinia pudo renacer invocada por los Oráculos.',
];

const STORY_EN: readonly [string, string, string] = [
  'At the beginning of the 20th century, five initiates, led by a scientist known as Holberins, conceived Numinia as an experiment to gather human knowledge in a single shared space, where science, art and philosophy could speak without borders.',
  'Before its destruction by fire in 1920, Holberins projected the essence of the city into the Akashic Records, a universal memory where the ideas, symbols and echoes of everything that happens, has happened and will happen remain.',
  'Thanks to that, a century later, Numinia was reborn, invoked by the Oracles.',
];

const ES: HowItWorksMessages = {
  title: 'Cómo funciona — Numinia',
  description:
    'Numinia es una ciudad en 3D donde tu comunidad tiene sede: encuéntrala, entra en su sede, ven a sus encuentros y llévate lo vuestro.',
  eyebrow: 'Cómo funciona',
  heading: 'Una ciudad en 3D donde tu comunidad tiene sede.',
  lead: 'Un congreso, un aula, un equipo o un grupo de amigos: cada uno tiene en Numinia su sitio en 3D, su calendario y su archivo.',
  steps: [
    {
      title: 'Encuentra tu comunidad',
      text: '{n} ya están aquí. Busca por nombre o por ciudad.',
      link: 'Explorar las comunidades →',
    },
    {
      title: 'Entra en su sede',
      text: 'Un mundo 3D que se abre en el navegador, también en el móvil. Sin instalar nada.',
      link: 'Ver qué pasa ahora →',
    },
    {
      title: 'Ven a sus encuentros',
      text: 'Sus reuniones, en persona o en línea. Te las llevas a tu calendario.',
      link: 'Calendario →',
    },
    {
      title: 'Llévate lo vuestro',
      text: 'Todo lo que hacéis son ficheros vuestros. Os los lleváis cuando queráis.',
      link: 'El Bazar →',
    },
  ],
  openEyebrow: 'Para comunidades',
  openTitle: 'Abre la sede de la tuya',
  openHelp:
    'Elige la plantilla que más se parece a lo que hacéis y escríbenos: te abrimos la sede y la hacéis vuestra. Si ya hemos hecho algo juntos, tu página ya está en la ciudad.',
  templates: [
    { name: 'Aula', text: 'Gradas, pizarra y salas de grupo.' },
    { name: 'Auditorio', text: 'Escenario, butacas y un vestíbulo.' },
    { name: 'Sala de equipo', text: 'Mesa de decisión y archivo a la vista.' },
    { name: 'Aventura', text: 'Una sala de enigmas para equipos.' },
    { name: 'Galería', text: 'Paredes para colgar y una inauguración.' },
    { name: 'Festival', text: 'Un escenario y sitio para la gente.' },
  ],
  write: 'Escríbenos',
  whyEyebrow: 'La ciudad',
  whyTitle: 'Por qué una ciudad',
  story: STORY_ES,
  storyNotice: undefined,
  storyImageAlt: 'Un globo suspendido sobre el gran tablero del Complejo Bildung',
  readArchive: 'Lee su historia en el Archivo',
};

const EN: HowItWorksMessages = {
  title: 'How it works — Numinia',
  description:
    'Numinia is a 3D city where your community has a home: find it, enter its home, come to its gatherings and take what is yours.',
  eyebrow: 'How it works',
  heading: 'A 3D city where your community has a home.',
  lead: 'A conference, a classroom, a team or a group of friends: each has in Numinia its own 3D place, its calendar and its archive.',
  steps: [
    {
      title: 'Find your community',
      text: '{n} are already here. Search by name or by city.',
      link: 'Explore the communities →',
    },
    {
      title: 'Enter its home',
      text: 'A 3D world that opens in the browser, on your phone too. Nothing to install.',
      link: 'See what is on now →',
    },
    {
      title: 'Come to its gatherings',
      text: 'Its gatherings, in person or online. Take them to your calendar.',
      link: 'Calendar →',
    },
    {
      title: 'Take what is yours',
      text: 'Everything you make is files of your own. Take them with you whenever you want.',
      link: 'The Bazaar →',
    },
  ],
  openEyebrow: 'For communities',
  openTitle: 'Open the home of yours',
  openHelp:
    'Pick the template closest to what you do and write to us: we open the home and you make it yours. If we have already done something together, your page is already in the city.',
  templates: [
    { name: 'Classroom', text: 'Tiers, a board and breakout rooms.' },
    { name: 'Auditorium', text: 'A stage, seats and a lobby.' },
    { name: 'Team room', text: 'A decision table and the archive in sight.' },
    { name: 'Adventure', text: 'An escape room for teams.' },
    { name: 'Gallery', text: 'Walls to hang on and an opening.' },
    { name: 'Festival', text: 'A stage and room for the crowd.' },
  ],
  write: 'Write to us',
  whyEyebrow: 'The city',
  whyTitle: 'Why a city',
  story: STORY_EN,
  storyNotice: undefined,
  storyImageAlt: 'A globe suspended above the great board of the Bildung Complex',
  readArchive: 'Read its story in the Archive',
};

const JA: HowItWorksMessages = {
  title: '仕組み — Numinia',
  description:
    'Numinia は、あなたのコミュニティが拠点を持つ 3D の都市です。コミュニティを見つけ、拠点に入り、集まりに参加し、自分たちのものを持ち帰りましょう。',
  eyebrow: '仕組み',
  heading: 'あなたのコミュニティが拠点を持つ 3D の都市。',
  lead: 'カンファレンス、教室、チーム、友人のグループ。それぞれが Numinia に、自分たちの 3D の場所、カレンダー、アーカイブを持ちます。',
  steps: [
    {
      title: 'コミュニティを見つける',
      text: 'すでに {n} のコミュニティがここにいます。名前や都市で検索できます。',
      link: 'コミュニティを見る →',
    },
    {
      title: '拠点に入る',
      text: 'ブラウザで開く 3D のワールド。スマートフォンでも。インストール不要。',
      link: 'いま起きていることを見る →',
    },
    {
      title: '集まりに参加する',
      text: '対面でもオンラインでも、その集まりをあなたのカレンダーに。',
      link: 'カレンダー →',
    },
    {
      title: '自分たちのものを持ち帰る',
      text: '作ったものはすべて自分たちのファイル。いつでも持ち帰れます。',
      link: 'バザール →',
    },
  ],
  openEyebrow: 'コミュニティのために',
  openTitle: 'あなたのコミュニティの拠点を開く',
  openHelp:
    '活動にいちばん近いテンプレートを選んで、ご連絡ください。拠点を開き、あなたたちのものにしていただきます。すでに一緒に何かをしたことがあれば、ページはもう都市にあります。',
  templates: [
    { name: '教室', text: '階段席、黒板、グループ用の部屋。' },
    { name: '講堂', text: 'ステージ、客席、ロビー。' },
    { name: 'チームルーム', text: '意思決定のテーブルと、見えるところにあるアーカイブ。' },
    { name: 'アドベンチャー', text: 'チームで挑む謎解きの部屋。' },
    { name: 'ギャラリー', text: '作品を掛ける壁とオープニング。' },
    { name: 'フェスティバル', text: 'ステージと、人が集まる場所。' },
  ],
  write: 'お問い合わせ',
  whyEyebrow: '都市',
  whyTitle: 'なぜ都市なのか',
  story: STORY_EN,
  storyNotice: 'この物語は現在、スペイン語と英語で提供されています。',
  storyImageAlt: 'ビルドゥング・コンプレックスの大きな盤の上に浮かぶ球体',
  readArchive: 'アーカイブでその歴史を読む',
};

const KO: HowItWorksMessages = {
  title: '작동 방식 — Numinia',
  description:
    'Numinia는 당신의 커뮤니티가 거점을 갖는 3D 도시입니다. 커뮤니티를 찾고, 거점에 들어가고, 모임에 참여하고, 여러분의 것을 가져가세요.',
  eyebrow: '작동 방식',
  heading: '당신의 커뮤니티가 거점을 갖는 3D 도시.',
  lead: '컨퍼런스, 교실, 팀, 친구들의 모임. 각각은 Numinia에 자신만의 3D 공간, 달력, 아카이브를 갖습니다.',
  steps: [
    {
      title: '커뮤니티 찾기',
      text: '이미 {n}개 커뮤니티가 여기에 있습니다. 이름이나 도시로 검색하세요.',
      link: '커뮤니티 둘러보기 →',
    },
    {
      title: '거점에 들어가기',
      text: '브라우저에서 열리는 3D 월드. 휴대폰에서도. 설치할 것이 없습니다.',
      link: '지금 일어나는 일 보기 →',
    },
    {
      title: '모임에 참여하기',
      text: '대면이든 온라인이든, 그 모임을 당신의 달력에.',
      link: '달력 →',
    },
    {
      title: '여러분의 것을 가져가기',
      text: '여러분이 만드는 모든 것은 여러분의 파일입니다. 언제든 가져갈 수 있습니다.',
      link: '바자르 →',
    },
  ],
  openEyebrow: '커뮤니티를 위해',
  openTitle: '당신의 커뮤니티의 거점 열기',
  openHelp:
    '여러분의 활동에 가장 가까운 템플릿을 고르고 연락해 주세요. 거점을 열어 드리면 여러분의 것으로 만들면 됩니다. 이미 함께 무언가를 했다면 페이지는 벌써 도시에 있습니다.',
  templates: [
    { name: '교실', text: '계단식 좌석, 칠판, 그룹 방.' },
    { name: '강당', text: '무대, 객석, 로비.' },
    { name: '팀 룸', text: '결정을 위한 테이블과 눈앞의 아카이브.' },
    { name: '어드벤처', text: '팀을 위한 수수께끼 방.' },
    { name: '갤러리', text: '작품을 거는 벽과 오프닝.' },
    { name: '페스티벌', text: '무대와 사람들을 위한 자리.' },
  ],
  write: '연락하기',
  whyEyebrow: '도시',
  whyTitle: '왜 도시인가',
  story: STORY_EN,
  storyNotice: '이 이야기는 현재 스페인어와 영어로 제공됩니다.',
  storyImageAlt: '빌둥 콤플렉스의 거대한 판 위에 떠 있는 구체',
  readArchive: '아카이브에서 그 역사 읽기',
};

const PT_BR: HowItWorksMessages = {
  title: 'Como funciona — Numinia',
  description:
    'Numinia é uma cidade em 3D onde a sua comunidade tem sede: encontre-a, entre na sede, venha aos encontros e leve o que é de vocês.',
  eyebrow: 'Como funciona',
  heading: 'Uma cidade em 3D onde a sua comunidade tem sede.',
  lead: 'Um congresso, uma sala de aula, uma equipe ou um grupo de amigos: cada um tem na Numinia seu lugar em 3D, seu calendário e seu arquivo.',
  steps: [
    {
      title: 'Encontre a sua comunidade',
      text: '{n} já estão aqui. Busque por nome ou por cidade.',
      link: 'Explorar as comunidades →',
    },
    {
      title: 'Entre na sede',
      text: 'Um mundo 3D que abre no navegador, também no celular. Sem instalar nada.',
      link: 'Ver o que acontece agora →',
    },
    {
      title: 'Venha aos encontros',
      text: 'Os encontros, presenciais ou on-line. Leve-os para o seu calendário.',
      link: 'Calendário →',
    },
    {
      title: 'Leve o que é de vocês',
      text: 'Tudo o que vocês fazem são arquivos de vocês. Levem quando quiserem.',
      link: 'O Bazar →',
    },
  ],
  openEyebrow: 'Para comunidades',
  openTitle: 'Abra a sede da sua',
  openHelp:
    'Escolha o modelo mais parecido com o que vocês fazem e escreva para nós: abrimos a sede e vocês a fazem sua. Se já fizemos algo juntos, a sua página já está na cidade.',
  templates: [
    { name: 'Sala de aula', text: 'Arquibancadas, quadro e salas de grupo.' },
    { name: 'Auditório', text: 'Palco, poltronas e um saguão.' },
    { name: 'Sala de equipe', text: 'Mesa de decisão e o arquivo à vista.' },
    { name: 'Aventura', text: 'Uma sala de enigmas para equipes.' },
    { name: 'Galeria', text: 'Paredes para pendurar e uma inauguração.' },
    { name: 'Festival', text: 'Um palco e lugar para o público.' },
  ],
  write: 'Escreva para nós',
  whyEyebrow: 'A cidade',
  whyTitle: 'Por que uma cidade',
  story: STORY_EN,
  storyNotice: 'Esta narrativa está disponível em espanhol e inglês por enquanto.',
  storyImageAlt: 'Um globo suspenso sobre o grande tabuleiro do Complexo Bildung',
  readArchive: 'Leia a história no Arquivo',
};

export const HOW_IT_WORKS: Readonly<Record<SupportedLocale, HowItWorksMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
