/**
 * Position constants — the fifteen stable functions (glossary §S2; RPG manual
 * ch. 3 fr. 3). Gender restrictions are recorded verbatim as inert data
 * (ADR-013): application code MUST NOT branch on `loreRestriction`.
 */

import type { Position } from '../types/position.js';

export const POSITIONS: readonly Position[] = [
  {
    id: 'guardian-of-the-gates',
    name: {
      es: 'Guardián de las Puertas',
      en: 'Guardian of the Gates',
      ja: '門の守護者',
      ko: '문의 수호자',
      'pt-br': 'Guardião dos Portões',
    },
    description: {
      es: 'Conocedor de todos los caminos: protege el acceso y regula quién entra y en qué condiciones.',
      en: 'Knower of all paths: protects the access and rules who enters and under which terms.',
      ja: 'あらゆる道を知る者。入口を守り、誰がどの条件で入るかを定める。',
      ko: '모든 길을 아는 자 — 입구를 지키고 누가 어떤 조건으로 들어오는지 정한다.',
      'pt-br':
        'Conhecedor de todos os caminhos: protege o acesso e regula quem entra e em que condições.',
    },
  },
  {
    id: 'pythia',
    loreRestriction: { gender: 'women-only' },
    name: { es: 'Pitia', en: 'Pythia', ja: 'ピュティア', ko: '피티아', 'pt-br': 'Pítia' },
    description: {
      es: 'Profetisa y guardiana de los oráculos: orienta con visiones y poemas crípticos, entre la lucidez y la locura.',
      en: 'Prophetess and keeper of the oracles: guides through visions and cryptic poems, between lucidity and madness.',
      ja: '託宣の守り手たる預言者。明晰と狂気のあわいで、幻視と謎めいた詩で導く。',
      ko: '신탁의 수호자이자 예언자 — 명료함과 광기 사이에서 환시와 수수께끼 같은 시로 인도한다.',
      'pt-br':
        'Profetisa e guardiã dos oráculos: orienta com visões e poemas crípticos, entre a lucidez e a loucura.',
    },
  },
  {
    id: 'ambassador',
    name: { es: 'Embajador', en: 'Ambassador', ja: '大使', ko: '대사', 'pt-br': 'Embaixador' },
    description: {
      es: 'Representante de todos los ciudadanos: primer rostro de Numinia ante quienes llegan.',
      en: "Representative of all citizens: Numinia's first face for those who arrive.",
      ja: '全市民の代表。訪れる者が最初に出会うヌミニアの顔。',
      ko: '모든 시민의 대표 — 도착하는 이들이 처음 만나는 누미니아의 얼굴.',
      'pt-br': 'Representante de todos os cidadãos: o primeiro rosto de Numinia para quem chega.',
    },
  },
  {
    id: 'game-master',
    name: {
      es: 'Maestro de Juego',
      en: 'Game Master',
      ja: 'ゲームマスター',
      ko: '게임 마스터',
      'pt-br': 'Mestre de Jogo',
    },
    description: {
      es: 'Constructor de enigmas: vive para desafiar el ingenio con juegos y acertijos.',
      en: 'Builder of enigmas: lives to challenge wit with games and riddles.',
      ja: '謎の構築者。遊びと謎かけで知恵を試すために生きる。',
      ko: '수수께끼의 건축가 — 놀이와 수수께끼로 지혜를 시험하며 산다.',
      'pt-br': 'Construtor de enigmas: vive para desafiar o engenho com jogos e charadas.',
    },
  },
  {
    id: 'legionary',
    name: {
      es: 'Legionario del Umbral',
      en: 'Legionary of the Threshold',
      ja: '境界の軍団兵',
      ko: '경계의 군단병',
      'pt-br': 'Legionário do Umbral',
    },
    description: {
      es: 'El último guerrero: fuerza de élite que solo emerge en momentos de crisis.',
      en: 'The last warrior: an elite force that only emerges in moments of crisis.',
      ja: '最後の戦士。危機の瞬間にのみ現れる精鋭。',
      ko: '최후의 전사 — 위기의 순간에만 나타나는 정예.',
      'pt-br': 'O último guerreiro: força de elite que só emerge em momentos de crise.',
    },
  },
  {
    id: 'armonaut',
    name: {
      es: 'Armonauta',
      en: 'Armonaut',
      ja: 'アルモナウタ',
      ko: '아르모나우타',
      'pt-br': 'Armonauta',
    },
    description: {
      es: 'Trovador de la historia y la leyenda: sus canciones guardan claves de los secretos de Numinia.',
      en: "Troubadour of history and legend: their songs hold keys to Numinia's secrets.",
      ja: '歴史と伝説の吟遊詩人。その歌にはヌミニアの秘密の鍵が眠る。',
      ko: '역사와 전설의 음유시인 — 그 노래에 누미니아의 비밀을 여는 열쇠가 담겨 있다.',
      'pt-br':
        'Trovador da história e da lenda: suas canções guardam chaves dos segredos de Numinia.',
    },
  },
  {
    id: 'whisperer-of-machines',
    name: {
      es: 'Susurrador de Máquinas',
      en: 'Whisperer of Machines',
      ja: '機械の囁き手',
      ko: '기계에게 속삭이는 자',
      'pt-br': 'Sussurrador de Máquinas',
    },
    description: {
      es: 'Arquitecto de lo invisible: dialoga con el código y los sistemas que sostienen la ciudad.',
      en: 'Architect of the invisible: converses with the code and systems that sustain the city.',
      ja: '見えざるものの建築家。都市を支えるコードと系統に語りかける。',
      ko: '보이지 않는 것의 건축가 — 도시를 떠받치는 코드와 체계와 대화한다.',
      'pt-br': 'Arquiteto do invisível: dialoga com o código e os sistemas que sustentam a cidade.',
    },
  },
  {
    id: 'runner-of-the-veil',
    loreRestriction: { gender: 'men-only' },
    name: {
      es: 'Corredor del Velo',
      en: 'Runner of the Veil',
      ja: 'ヴェールの走者',
      ko: '베일의 주자',
      'pt-br': 'Corredor do Véu',
    },
    description: {
      es: 'Mensajero entre planos: transporta lo sensible por las rutas más inestables.',
      en: 'Messenger between planes: carries the sensitive through the most unstable routes.',
      ja: '次元の狭間の使者。最も不安定な道を通って重要なものを運ぶ。',
      ko: '차원 사이의 전령 — 가장 불안정한 길로 민감한 것을 나른다.',
      'pt-br': 'Mensageiro entre planos: transporta o sensível pelas rotas mais instáveis.',
    },
  },
  {
    id: 'archivist',
    name: {
      es: 'Archivista',
      en: 'Archivist',
      ja: 'アーキビスト',
      ko: '기록 보관인',
      'pt-br': 'Arquivista',
    },
    description: {
      es: 'Custodio del Tesauro: restaura y protege la memoria profunda de Numinia.',
      en: "Custodian of the Thesaurus: restores and protects Numinia's deep memory.",
      ja: 'テサウルスの管理者。ヌミニアの深層記憶を修復し守る。',
      ko: '테사우루스의 관리인 — 누미니아의 깊은 기억을 복원하고 지킨다.',
      'pt-br': 'Custódio do Tesauro: restaura e protege a memória profunda de Numinia.',
    },
  },
  {
    id: 'hermeneut',
    name: {
      es: 'Hermeneuta',
      en: 'Hermeneut',
      ja: '解釈学者',
      ko: '해석학자',
      'pt-br': 'Hermeneuta',
    },
    description: {
      es: 'Escriba de los ecos: reescribe el mundo sin cambiar una sola palabra.',
      en: 'Scribe of the echoes: rewrites the world without changing a single word.',
      ja: 'こだまの書記。一語も変えずに世界を書き換える。',
      ko: '메아리의 서기 — 한 단어도 바꾸지 않고 세계를 다시 쓴다.',
      'pt-br': 'Escriba dos ecos: reescreve o mundo sem mudar uma única palavra.',
    },
  },
  {
    id: 'mediator-of-the-prism',
    name: {
      es: 'Mediador del Prisma',
      en: 'Mediator of the Prism',
      ja: 'プリズムの仲介者',
      ko: '프리즘의 중재자',
      'pt-br': 'Mediador do Prisma',
    },
    description: {
      es: 'Refractante de la realidad: contempla un mismo acontecimiento desde múltiples perspectivas simultáneas.',
      en: 'Refractor of reality: beholds one event from many simultaneous perspectives.',
      ja: '現実を屈折させる者。ひとつの出来事を同時に多くの視点から見る。',
      ko: '현실의 굴절자 — 하나의 사건을 동시에 여러 관점으로 본다.',
      'pt-br':
        'Refrator da realidade: contempla um mesmo acontecimento de múltiplas perspectivas simultâneas.',
    },
  },
  {
    id: 'cartographer-of-the-wind',
    name: {
      es: 'Cartógrafo del Viento',
      en: 'Cartographer of the Wind',
      ja: '風の地図師',
      ko: '바람의 지도제작자',
      'pt-br': 'Cartógrafo do Vento',
    },
    description: {
      es: 'Explorador de corrientes: traza las rutas invisibles que conectan lugares distantes.',
      en: 'Explorer of currents: charts the invisible routes that connect distant places.',
      ja: '流れの探究者。遠い場所をつなぐ見えない道を描く。',
      ko: '흐름의 탐험가 — 먼 곳을 잇는 보이지 않는 길을 그린다.',
      'pt-br': 'Explorador de correntes: traça as rotas invisíveis que conectam lugares distantes.',
    },
  },
  {
    id: 'oneiromancer',
    loreRestriction: { gender: 'men-only' },
    name: {
      es: 'Oniromante',
      en: 'Oneiromancer',
      ja: '夢の航海者',
      ko: '꿈의 항해사',
      'pt-br': 'Oniromante',
    },
    description: {
      es: 'Navegante del sueño: percibe, interpreta y atraviesa los sueños ajenos.',
      en: 'Navigator of the dream: perceives, interprets and crosses the dreams of others.',
      ja: '夢の航海者。他者の夢を感じ取り、読み解き、渡り歩く。',
      ko: '꿈의 항해사 — 타인의 꿈을 감지하고 해석하며 건너간다.',
      'pt-br': 'Navegante do sonho: percebe, interpreta e atravessa os sonhos alheios.',
    },
  },
  {
    id: 'anacharchid',
    loreRestriction: { gender: 'women-only' },
    name: {
      es: 'Anacárquide',
      en: 'Anacharchid',
      ja: 'アナカルキデ',
      ko: '아나카르키데',
      'pt-br': 'Anacárquide',
    },
    description: {
      es: 'Visionaria del Punto Ciego: intuye las grietas donde el sistema no puede observarse a sí mismo.',
      en: 'Seer of the Blind Spot: senses the cracks where the system cannot observe itself.',
      ja: '盲点の幻視者。系がみずからを観測できない裂け目を感じ取る。',
      ko: '맹점의 예지자 — 체계가 스스로를 볼 수 없는 틈을 감지한다.',
      'pt-br':
        'Visionária do Ponto Cego: intui as fendas onde o sistema não pode observar a si mesmo.',
    },
  },
  {
    id: 'ethnarch',
    name: { es: 'Etnarca', en: 'Ethnarch', ja: 'エトナルク', ko: '에트나르크', 'pt-br': 'Etnarca' },
    description: {
      es: 'Experto en civilizaciones olvidadas: reconstruye el significado de los vestigios de la Edad Oscura.',
      en: 'Expert in forgotten civilizations: reconstructs the meaning of the Dark Age remnants.',
      ja: '忘れられた文明の専門家。暗黒時代の遺物に意味を取り戻す。',
      ko: '잊힌 문명의 전문가 — 암흑시대 유물의 의미를 되살린다.',
      'pt-br':
        'Especialista em civilizações esquecidas: reconstrói o significado dos vestígios da Idade das Trevas.',
    },
  },
];
