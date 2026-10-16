/**
 * The words of the sphere of Numen Games and of its narrative page (v3 «La
 * esfera y la casa»). Typed per locale: a missing translation does not
 * compile. On screen: «comunidad», «encuentro» — never organization,
 * group or ritual.
 *
 * Canon is never invented here: the house's story line is the front door's
 * (i18n/front-door.ts: Holberins, the fire of 1920, the city reborn a
 * century later) and the rest is the approved wireframe's. The canon lines
 * are translated into every locale from the Spanish source: nothing on
 * this page falls back to another language.
 */

import type { SupportedLocale } from '@numinia/domain';

interface RingText {
  readonly title: string;
  readonly text: string;
}

export interface HouseMessages {
  // ── the sphere
  /** The sphere's accessible name: what it is and how to turn it. */
  readonly sphereLabel: string;
  /** The line under the sphere. */
  readonly sphereHint: string;
  /** The ring's list of links, for a screen reader. */
  readonly ringLabel: string;
  /** The «+N» chip's name: "{n}" is how many more. */
  readonly moreLabel: string;

  // ── the card on /communities/
  readonly cardLine: string;
  readonly cardText: string;
  readonly cardCta: string;
  /** Appended to the count line: the house is not one of the N. */
  readonly countHouse: string;

  // ── the page
  readonly lead: string;
  readonly quote: string;
  readonly quoteSource: string;
  readonly enterAgora: string;
  readonly itsWorlds: string;
  readonly howToPlay: string;
  /** "{n}" is how many communities the house brings together. */
  readonly legend: string;
  readonly legendLabel: string;

  readonly ringsTitle: string;
  readonly ringsHelp: string;
  readonly ringsRead: string;
  readonly rings: readonly [RingText, RingText, RingText];
  /** The third ring's last line: any community can tell the same model. */
  readonly storyTail: string;

  readonly metaTitle: string;
  readonly metaHelp: string;
  readonly rankTitle: string;
  readonly rankText: string;
  /** "{first}" and "{last}" are the first and the last rank's names. */
  readonly rankNote: string;
  readonly ladderLabel: string;
  readonly doorsTitle: string;
  readonly doorsText: string;
  readonly doorsLink: string;
  readonly seasonsTitle: string;
  readonly seasonsText: string;
  readonly sealsTitle: string;
  readonly sealsText: string;
  readonly seals: { readonly lodge: string; readonly league: string; readonly brotherhood: string };
  readonly codexTitle: string;
  readonly codexText: string;
  readonly codexLink: string;

  readonly caresTitle: string;
  readonly datesTitle: string;
  readonly datesHelp: string;
  readonly noDates: string;
  readonly peopleTitle: string;
  readonly archiveTitle: string;
  readonly archiveText: string;
  readonly bazaarTitle: string;
  readonly bazaarText: string;
  readonly bazaarLink: string;
}

/** The front door's one paragraph on the city (i18n/front-door.ts), cut at the rebirth. */
const STORY_ES =
  'El modelo contado como una ciudad. Holberins la concibió para reunir el conocimiento humano; un incendio la destruyó en 1920 y un siglo después renació.';
const STORY_EN =
  'The model told as a city. Holberins conceived it to gather human knowledge; a fire destroyed it in 1920 and a century later it was reborn.';
const QUOTE_ES =
  '«Nadie se apunta a Numinia. Llegas, y en algún momento te das cuenta de que ya estabas dentro.»';
const QUOTE_EN =
  '“Nobody signs up for Numinia. You arrive, and at some point you realise you were already inside.”';
const STORY_JA =
  '都市として語られたモデル。ホルベリンスは人類の知を集めるためにこの都市を構想しました。1920年に火災がそれを滅ぼし、一世紀の後に都市はよみがえりました。';
const STORY_KO =
  '도시로 들려주는 모델. 홀베린스는 인류의 지식을 모으기 위해 이 도시를 구상했습니다. 1920년에 화재가 도시를 파괴했고, 한 세기 뒤에 도시는 다시 태어났습니다.';
const STORY_PT =
  'O modelo contado como uma cidade. Holberins a concebeu para reunir o conhecimento humano; um incêndio a destruiu em 1920 e um século depois ela renasceu.';
const QUOTE_JA =
  '「Numinia に登録する人はいません。たどり着いて、いつかの瞬間に、もう中にいたことに気づくのです。」';
const QUOTE_KO =
  '“Numinia에 가입하는 사람은 없습니다. 도착하고, 어느 순간 이미 안에 있었다는 것을 깨닫습니다.”';
const QUOTE_PT =
  '“Ninguém se inscreve em Numinia. Você chega e, em algum momento, percebe que já estava dentro.”';

const ES: HouseMessages = {
  sphereLabel:
    'Numen Games, la comunidad de comunidades: una esfera con la oráculo. Arrástrala o usa las flechas para girarla. Cada punto del anillo es una comunidad.',
  sphereHint: 'Arrástrala para girarla · toca un punto para ver quién es',
  ringLabel: 'Las comunidades que reúne',
  moreLabel: 'Otras {n}: en la lista de debajo',
  cardLine: 'La comunidad de comunidades',
  cardText: 'Hace el juego en el que viven todas. Fundó la ciudad y cuida lo que es de todos.',
  cardCta: 'Entra en su historia',
  countHouse: ' · y Numen Games, que las reúne',
  lead: 'Hace el juego en el que viven todas las demás. Existe para subir de nivel a las comunidades, para que la gente se relacione mejor dentro, y lo hace jugando: el juego es la primera narración y la primera lección.',
  quote: QUOTE_ES,
  quoteSource: '— Ya estás en el juego',
  enterAgora: 'Entrar en el Ágora',
  itsWorlds: 'Sus mundos',
  howToPlay: 'Cómo se juega',
  legend: 'Reúne a {n} comunidades. Pasa por una y la esfera gira hasta ella.',
  legendLabel: 'Las comunidades que reúne',
  ringsTitle: 'Tres anillos enlazados',
  ringsHelp:
    'Lo explica Christian en «El modelo necesita una historia»: Numen Games, su modelo y Numinia no son tres pasos de un proceso, son tres anillos enlazados. Quita uno y los otros dos se separan.',
  ringsRead: 'Leerlo en la Summa',
  rings: [
    {
      title: 'El motivo · Numen Games',
      text: 'Subir de nivel a las comunidades para que la gente se relacione mejor dentro. Jugando.',
    },
    {
      title: 'El modelo',
      text: 'Roles, puestos, contextos y herramientas: el esqueleto. Cambiarle los nombres no lo transforma; lo transforma cambiar cómo se relaciona la gente.',
    },
    { title: 'La historia · Numinia', text: STORY_ES },
  ],
  storyTail: 'Cualquier comunidad puede contar el mismo modelo con su propia historia.',
  metaTitle: 'El metajuego',
  metaHelp: 'Lo que cruza todas las comunidades y viaja contigo, entres por la que entres.',
  rankTitle: 'Tu rango',
  rankText: 'Se lee de lo que has hecho; arriba del todo, se juzga. Nadie lo compra.',
  rankNote: 'Se llega como {first}. {last} es quien funda.',
  ladderLabel: 'Los rangos, de abajo arriba',
  doorsTitle: 'Las Puertas',
  doorsText: 'Donde empieza el juego. La Temporada I abre ocho puertas a todos.',
  doorsLink: 'Ir a las Puertas',
  seasonsTitle: 'Las temporadas',
  seasonsText: 'Cada temporada, un capítulo de la ciudad. Tu ficha guarda las tuyas.',
  sealsTitle: 'Los sellos',
  sealsText:
    'Logia, Liga u Hermandad: el sello de cada comunidad sale de quién la forma, nunca se elige.',
  seals: { lodge: 'Logia', league: 'Liga', brotherhood: 'Hermandad' },
  codexTitle: 'El Codex',
  codexText: 'El manual de la ciudad: sus gremios, sus facciones y sus lugares.',
  codexLink: 'Abrir el Codex',
  caresTitle: 'Lo que cuida',
  datesTitle: 'Sus citas',
  datesHelp: 'Las de toda la ciudad y las de cada semana.',
  noDates:
    'Ahora no hay ninguna anunciada. Cuando la casa anuncie una, sale aquí y en el calendario de la ciudad.',
  peopleTitle: 'Gente',
  archiveTitle: 'Su archivo',
  archiveText: 'La Summa: cómo trabaja la casa, a la vista de todos.',
  bazaarTitle: 'Su Bazar',
  bazaarText: 'Lo suyo es de todos: es el Bazar común.',
  bazaarLink: 'Al Bazar',
};

const EN: HouseMessages = {
  sphereLabel:
    'Numen Games, the community of communities: a sphere with the oracle. Drag it or use the arrow keys to turn it. Each dot on the ring is a community.',
  sphereHint: 'Drag to turn it · tap a dot to see who it is',
  ringLabel: 'The communities it brings together',
  moreLabel: '{n} more: in the list below',
  cardLine: 'The community of communities',
  cardText:
    'It makes the game they all live in. It founded the city and keeps what belongs to everyone.',
  cardCta: 'Step into its story',
  countHouse: ' · and Numen Games, which brings them together',
  lead: 'It makes the game all the others live in. It exists to level communities up, so that people relate better inside them, and it does so by playing: the game is the first story and the first lesson.',
  quote: QUOTE_EN,
  quoteSource: '— You are already in the game',
  enterAgora: 'Enter the Agora',
  itsWorlds: 'Its worlds',
  howToPlay: 'How it is played',
  legend: 'It brings {n} communities together. Point at one and the sphere turns to it.',
  legendLabel: 'The communities it brings together',
  ringsTitle: 'Three linked rings',
  ringsHelp:
    'Christian explains it in «The model needs a story»: Numen Games, its model and Numinia are not three steps of a process, they are three linked rings. Take one away and the other two come apart.',
  ringsRead: 'Read it in the Summa',
  rings: [
    {
      title: 'The motive · Numen Games',
      text: 'To level communities up so that people relate better inside them. By playing.',
    },
    {
      title: 'The model',
      text: 'Roles, posts, contexts and tools: the skeleton. Renaming it does not transform it; changing how people relate does.',
    },
    { title: 'The story · Numinia', text: STORY_EN },
  ],
  storyTail: 'Any community can tell the same model with its own story.',
  metaTitle: 'The metagame',
  metaHelp: 'What runs across every community and travels with you, whichever one you come in by.',
  rankTitle: 'Your rank',
  rankText: 'It is read from what you have done; at the very top, it is judged. Nobody buys it.',
  rankNote: 'You arrive as {first}. {last} is whoever founds.',
  ladderLabel: 'The ranks, from the bottom up',
  doorsTitle: 'The Gates',
  doorsText: 'Where the game begins. Season I opens eight doors to everyone.',
  doorsLink: 'Go to the Gates',
  seasonsTitle: 'The seasons',
  seasonsText: 'Each season, a chapter of the city. Your sheet keeps yours.',
  sealsTitle: 'The seals',
  sealsText:
    'Lodge, League or Brotherhood: each community’s seal comes from who makes it up; it is never chosen.',
  seals: { lodge: 'Lodge', league: 'League', brotherhood: 'Brotherhood' },
  codexTitle: 'The Codex',
  codexText: 'The city’s manual: its guilds, its factions and its places.',
  codexLink: 'Open the Codex',
  caresTitle: 'What it keeps',
  datesTitle: 'Its gatherings',
  datesHelp: 'The whole city’s, and the weekly ones.',
  noDates:
    'None is announced right now. When the house announces one, it shows here and in the city’s calendar.',
  peopleTitle: 'People',
  archiveTitle: 'Its archive',
  archiveText: 'The Summa: how the house works, in plain sight.',
  bazaarTitle: 'Its Bazaar',
  bazaarText: 'What is its own belongs to everyone: it is the common Bazaar.',
  bazaarLink: 'To the Bazaar',
};

const JA: HouseMessages = {
  sphereLabel:
    'Numen Games、コミュニティのコミュニティ。オラクルを描いた球体です。ドラッグするか矢印キーで回せます。リング上の点はそれぞれひとつのコミュニティです。',
  sphereHint: 'ドラッグで回す · 点をタップすると名前が出ます',
  ringLabel: 'まとめているコミュニティ',
  moreLabel: 'ほか{n}件:下の一覧に',
  cardLine: 'コミュニティのコミュニティ',
  cardText:
    'すべてのコミュニティが暮らすゲームをつくっています。都市を創り、みんなのものを守っています。',
  cardCta: 'その物語へ',
  countHouse: ' · そしてそれらをまとめる Numen Games',
  lead: 'ほかのすべてのコミュニティが暮らすゲームをつくっています。コミュニティを一段上へ導き、中の人どうしがよりよく関われるようにするために存在し、それを遊びで行います。ゲームは最初の物語であり、最初の学びです。',
  quote: QUOTE_JA,
  quoteSource: '— あなたはもうゲームの中にいます',
  enterAgora: 'アゴラに入る',
  itsWorlds: 'そのワールド',
  howToPlay: '遊び方',
  legend: '{n}のコミュニティをまとめています。ひとつを指すと、球体がそこまで回ります。',
  legendLabel: 'まとめているコミュニティ',
  ringsTitle: '結ばれた三つの輪',
  ringsHelp:
    'Christian が「モデルには物語が必要だ」で説明しています。Numen Games、そのモデル、そして Numinia は、ひとつの過程の三段階ではなく、結ばれた三つの輪です。ひとつを外すと、残りの二つも離れてしまいます。',
  ringsRead: 'Summa で読む',
  rings: [
    {
      title: '動機 · Numen Games',
      text: 'コミュニティを一段上へ導き、中の人どうしがよりよく関われるようにする。遊びながら。',
    },
    {
      title: 'モデル',
      text: '役割、ポスト、文脈、道具。それが骨格です。名前を変えても変わりません。変えるのは、人どうしの関わり方を変えることです。',
    },
    { title: '物語 · Numinia', text: STORY_JA },
  ],
  storyTail: 'どのコミュニティも、同じモデルを自分の物語で語ることができます。',
  metaTitle: 'メタゲーム',
  metaHelp: 'すべてのコミュニティを貫き、どこから入ってもあなたと一緒に旅するもの。',
  rankTitle: 'あなたのランク',
  rankText: 'したことから読み取られ、いちばん上では審査されます。誰も買えません。',
  rankNote: '{first}として到着します。{last}は創設する人です。',
  ladderLabel: 'ランク(下から上へ)',
  doorsTitle: '門',
  doorsText: 'ゲームが始まる場所。シーズン I は八つの扉を誰にでも開いています。',
  doorsLink: '門へ',
  seasonsTitle: 'シーズン',
  seasonsText: 'シーズンごとに、都市のひとつの章。あなたのシートがあなたの分を残します。',
  sealsTitle: '紋章',
  sealsText:
    'ロッジ、リーグ、兄弟団。各コミュニティの紋章は誰が集まっているかで決まり、選ぶものではありません。',
  seals: { lodge: 'ロッジ', league: 'リーグ', brotherhood: '兄弟団' },
  codexTitle: 'コーデックス',
  codexText: '都市の手引き。ギルド、派閥、場所。',
  codexLink: 'コーデックスを開く',
  caresTitle: '守っているもの',
  datesTitle: 'その集い',
  datesHelp: '都市全体の集いと、毎週の集い。',
  noDates: 'いまは告知されたものはありません。告知されると、ここと都市のカレンダーに出ます。',
  peopleTitle: '人びと',
  archiveTitle: 'そのアーカイブ',
  archiveText: 'Summa:この家の働き方を、誰にでも見えるように。',
  bazaarTitle: 'そのバザール',
  bazaarText: 'その持ち物はみんなのもの。共通のバザールです。',
  bazaarLink: 'バザールへ',
};

const KO: HouseMessages = {
  sphereLabel:
    'Numen Games, 커뮤니티들의 커뮤니티: 오라클이 담긴 구체입니다. 끌거나 화살표 키로 돌릴 수 있습니다. 고리 위의 점 하나하나가 커뮤니티입니다.',
  sphereHint: '끌어서 돌리기 · 점을 누르면 이름이 보여요',
  ringLabel: '함께 모은 커뮤니티',
  moreLabel: '{n}개 더: 아래 목록에',
  cardLine: '커뮤니티들의 커뮤니티',
  cardText: '모두가 사는 게임을 만듭니다. 도시를 세웠고, 모두의 것을 돌봅니다.',
  cardCta: '그 이야기로 들어가기',
  countHouse: ' · 그리고 이들을 모으는 Numen Games',
  lead: '다른 모든 커뮤니티가 사는 게임을 만듭니다. 커뮤니티의 수준을 끌어올려 그 안의 사람들이 더 잘 관계 맺도록 하기 위해 존재하며, 그것을 놀이로 합니다. 게임은 첫 번째 이야기이자 첫 번째 배움입니다.',
  quote: QUOTE_KO,
  quoteSource: '— 당신은 이미 게임 안에 있습니다',
  enterAgora: '아고라에 들어가기',
  itsWorlds: '그 월드',
  howToPlay: '플레이 방법',
  legend: '{n}개의 커뮤니티를 모읍니다. 하나를 가리키면 구체가 그쪽으로 돕니다.',
  legendLabel: '함께 모은 커뮤니티',
  ringsTitle: '서로 엮인 세 개의 고리',
  ringsHelp:
    'Christian이 「모델에는 이야기가 필요하다」에서 설명합니다. Numen Games, 그 모델, 그리고 Numinia는 한 과정의 세 단계가 아니라 서로 엮인 세 개의 고리입니다. 하나를 빼면 나머지 둘도 떨어집니다.',
  ringsRead: 'Summa에서 읽기',
  rings: [
    {
      title: '동기 · Numen Games',
      text: '커뮤니티의 수준을 끌어올려 그 안의 사람들이 더 잘 관계 맺도록. 놀이로.',
    },
    {
      title: '모델',
      text: '역할, 자리, 맥락, 도구: 뼈대입니다. 이름을 바꿔도 바뀌지 않습니다. 사람들이 관계 맺는 방식을 바꿀 때 바뀝니다.',
    },
    { title: '이야기 · Numinia', text: STORY_KO },
  ],
  storyTail: '어떤 커뮤니티든 같은 모델을 자신의 이야기로 들려줄 수 있습니다.',
  metaTitle: '메타게임',
  metaHelp: '모든 커뮤니티를 가로지르고, 어디로 들어오든 당신과 함께 다니는 것.',
  rankTitle: '당신의 등급',
  rankText: '한 일로 읽히고, 맨 위에서는 심사됩니다. 아무도 살 수 없습니다.',
  rankNote: '{first}(으)로 도착합니다. {last}은(는) 창설하는 사람입니다.',
  ladderLabel: '등급, 아래에서 위로',
  doorsTitle: '관문',
  doorsText: '게임이 시작되는 곳. 시즌 I은 여덟 개의 문을 모두에게 엽니다.',
  doorsLink: '관문으로',
  seasonsTitle: '시즌',
  seasonsText: '시즌마다 도시의 한 장. 당신의 시트가 당신의 것을 간직합니다.',
  sealsTitle: '인장',
  sealsText:
    '로지, 리그, 형제단: 각 커뮤니티의 인장은 누가 모였는지에서 나오며, 고르는 것이 아닙니다.',
  seals: { lodge: '로지', league: '리그', brotherhood: '형제단' },
  codexTitle: '코덱스',
  codexText: '도시의 안내서: 길드, 파벌, 장소.',
  codexLink: '코덱스 열기',
  caresTitle: '돌보는 것',
  datesTitle: '그 모임',
  datesHelp: '도시 전체의 모임과 매주의 모임.',
  noDates: '지금은 공지된 것이 없습니다. 공지되면 여기와 도시 달력에 나옵니다.',
  peopleTitle: '사람들',
  archiveTitle: '그 아카이브',
  archiveText: 'Summa: 이 집이 일하는 방식을 모두가 볼 수 있게.',
  bazaarTitle: '그 바자',
  bazaarText: '그 것은 모두의 것: 공동의 바자입니다.',
  bazaarLink: '바자로',
};

const PT_BR: HouseMessages = {
  sphereLabel:
    'Numen Games, a comunidade de comunidades: uma esfera com a oráculo. Arraste ou use as setas do teclado para girá-la. Cada ponto do anel é uma comunidade.',
  sphereHint: 'Arraste para girar · toque num ponto para ver quem é',
  ringLabel: 'As comunidades que ela reúne',
  moreLabel: 'Outras {n}: na lista abaixo',
  cardLine: 'A comunidade de comunidades',
  cardText: 'Faz o jogo em que todas vivem. Fundou a cidade e cuida do que é de todos.',
  cardCta: 'Entre na sua história',
  countHouse: ' · e Numen Games, que as reúne',
  lead: 'Faz o jogo em que todas as outras vivem. Existe para elevar o nível das comunidades, para que as pessoas se relacionem melhor dentro delas, e faz isso jogando: o jogo é a primeira narrativa e a primeira lição.',
  quote: QUOTE_PT,
  quoteSource: '— Você já está no jogo',
  enterAgora: 'Entrar na Ágora',
  itsWorlds: 'Seus mundos',
  howToPlay: 'Como se joga',
  legend: 'Reúne {n} comunidades. Passe por uma e a esfera gira até ela.',
  legendLabel: 'As comunidades que ela reúne',
  ringsTitle: 'Três anéis entrelaçados',
  ringsHelp:
    'Christian explica em «O modelo precisa de uma história»: Numen Games, seu modelo e Numinia não são três passos de um processo, são três anéis entrelaçados. Tire um e os outros dois se separam.',
  ringsRead: 'Ler na Summa',
  rings: [
    {
      title: 'O motivo · Numen Games',
      text: 'Elevar o nível das comunidades para que as pessoas se relacionem melhor dentro delas. Jogando.',
    },
    {
      title: 'O modelo',
      text: 'Papéis, postos, contextos e ferramentas: o esqueleto. Mudar os nomes não o transforma; o que o transforma é mudar como as pessoas se relacionam.',
    },
    { title: 'A história · Numinia', text: STORY_PT },
  ],
  storyTail: 'Qualquer comunidade pode contar o mesmo modelo com a sua própria história.',
  metaTitle: 'O metajogo',
  metaHelp: 'O que atravessa todas as comunidades e viaja com você, entre por onde entrar.',
  rankTitle: 'Sua patente',
  rankText: 'Lê-se do que você fez; lá no topo, é julgada. Ninguém a compra.',
  rankNote: 'Chega-se como {first}. {last} é quem funda.',
  ladderLabel: 'As patentes, de baixo para cima',
  doorsTitle: 'As Portas',
  doorsText: 'Onde o jogo começa. A Temporada I abre oito portas a todos.',
  doorsLink: 'Ir às Portas',
  seasonsTitle: 'As temporadas',
  seasonsText: 'Cada temporada, um capítulo da cidade. Sua ficha guarda as suas.',
  sealsTitle: 'Os selos',
  sealsText:
    'Loja, Liga ou Irmandade: o selo de cada comunidade vem de quem a forma; nunca se escolhe.',
  seals: { lodge: 'Loja', league: 'Liga', brotherhood: 'Irmandade' },
  codexTitle: 'O Codex',
  codexText: 'O manual da cidade: suas guildas, suas facções e seus lugares.',
  codexLink: 'Abrir o Codex',
  caresTitle: 'O que cuida',
  datesTitle: 'Seus encontros',
  datesHelp: 'Os de toda a cidade e os de cada semana.',
  noDates:
    'Agora não há nenhum anunciado. Quando a casa anunciar um, ele aparece aqui e no calendário da cidade.',
  peopleTitle: 'Pessoas',
  archiveTitle: 'Seu arquivo',
  archiveText: 'A Summa: como a casa trabalha, à vista de todos.',
  bazaarTitle: 'Seu Bazar',
  bazaarText: 'O que é dela é de todos: é o Bazar comum.',
  bazaarLink: 'Ao Bazar',
};

export const HOUSE_UI: Readonly<Record<SupportedLocale, HouseMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};
