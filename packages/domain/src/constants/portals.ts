/**
 * Portal constants — the city's 14 built portals (13 district worlds + the
 * Plaza del Ágora hub) plus the announced-but-unbuilt spaces, per district.
 *
 * Canonical source: the data repo (File Over App) —
 * data/portals/numinia-portals.json in numinia-digital-goods-data.
 * A space without `worldUrl` is announced but unbuilt (the map dims it).
 * Map positions are percent coordinates around each district's quadrant
 * anchor (vitruvian 25,20 · sycamore 75,20 · solomon 25,80 · ouroboros
 * 75,80 · hub 50,50), hand-spread so nodes never overlap.
 * ja/ko renderings pending native QA (D9 queue), like the rest of the domain.
 */

import type { Portal, PortalHub } from '../types/portal.js';

export const AGORA_PLAZA: PortalHub = {
  id: 'agora-plaza',
  worldUrl: 'https://v2.oncyber.io/agora_plaza_of_numinia',
  mapPosition: { x: 50, y: 50 },
  name: {
    es: 'Plaza del Ágora',
    en: 'Agora Plaza',
    ja: 'アゴラ広場',
    ko: '아고라 광장',
    'pt-br': 'Praça da Ágora',
  },
  description: {
    es: 'El nodo central de convergencia: todos los distritos conectan aquí.',
    en: 'The central convergence node: every district connects here.',
    ja: '中心の結節点。すべての区がここにつながる。',
    ko: '중앙 수렴 지점 — 모든 구가 이곳으로 연결된다.',
    'pt-br': 'O nó central de convergência: todos os distritos se conectam aqui.',
  },
};

export const PORTALS: readonly Portal[] = [
  /* ─── Vitruvian — education, research, knowledge ─────────────────── */
  {
    id: 'historical-society',
    districtId: 'vitruvian',
    worldUrl: 'https://v2.oncyber.io/historical_society_of_numinia',
    mapPosition: { x: 15, y: 12 },
    name: {
      es: 'Sociedad Histórica',
      en: 'Historical Society',
      ja: '歴史協会',
      ko: '역사 협회',
      'pt-br': 'Sociedade Histórica',
    },
    description: {
      es: 'La memoria de la ciudad: crónicas y registros de Numinia.',
      en: "The city's memory: Numinia's chronicles and records.",
      ja: '都市の記憶。ヌミニアの年代記と記録。',
      ko: '도시의 기억 — 누미니아의 연대기와 기록.',
      'pt-br': 'A memória da cidade: crônicas e registros de Numinia.',
    },
  },
  {
    id: 'atlantis-library',
    districtId: 'vitruvian',
    worldUrl: 'https://v2.oncyber.io/atlantis_library_of_numinia',
    mapPosition: { x: 33, y: 10 },
    name: {
      es: 'Biblioteca Atlantis',
      en: 'Atlantis Library',
      ja: 'アトランティス図書館',
      ko: '아틀란티스 도서관',
      'pt-br': 'Biblioteca Atlantis',
    },
    description: {
      es: 'Sala de saberes hundidos; alberga la Cámara de Palimpsestos.',
      en: 'A hall of sunken knowledge; home of the Chamber of Palimpsests.',
      ja: '沈んだ知の館。パリンプセストの間を蔵する。',
      ko: '가라앉은 지식의 전당 — 팔림프세스트의 방이 있는 곳.',
      'pt-br': 'Sala de saberes submersos; abriga a Câmara de Palimpsestos.',
    },
  },
  {
    id: 'lemuria-academy',
    districtId: 'vitruvian',
    worldUrl: 'https://v2.oncyber.io/lemuria_academy_of_numinia',
    mapPosition: { x: 17, y: 28 },
    name: {
      es: 'Academia Lemuria',
      en: 'Lemuria Academy',
      ja: 'レムリア学院',
      ko: '레무리아 아카데미',
      'pt-br': 'Academia Lemúria',
    },
    description: {
      es: 'El aula mayor del distrito: aquí se enseña a aprender.',
      en: "The district's great classroom: here one learns to learn.",
      ja: '区の大教室。学び方を学ぶ場所。',
      ko: '구의 큰 교실 — 배우는 법을 배우는 곳.',
      'pt-br': 'A grande sala de aula do distrito: aqui se ensina a aprender.',
    },
  },
  {
    id: 'ontological-schools',
    districtId: 'vitruvian',
    mapPosition: { x: 34, y: 27 },
    name: {
      es: 'Escuelas Ontológicas',
      en: 'Ontological Schools',
      ja: '存在論学派',
      ko: '존재론 학파',
      'pt-br': 'Escolas Ontológicas',
    },
    description: {
      es: 'Seis escuelas que estudian la naturaleza de lo real.',
      en: 'Six schools studying the nature of the real.',
      ja: '実在の本質を究める六つの学派。',
      ko: '실재의 본질을 탐구하는 여섯 학파.',
      'pt-br': 'Seis escolas que estudam a natureza do real.',
    },
  },

  /* ─── Sycamore — art, transformation, aesthetics ─────────────────── */
  {
    id: 'akasha-museum',
    districtId: 'sycamore',
    worldUrl: 'https://v2.oncyber.io/akasha_museum_of_numinia',
    mapPosition: { x: 66, y: 10 },
    name: {
      es: 'Museo Akasha',
      en: 'Akasha Museum',
      ja: 'アカシャ美術館',
      ko: '아카샤 박물관',
      'pt-br': 'Museu Akasha',
    },
    description: {
      es: 'El museo de los registros del arte: la colección akásica expuesta.',
      en: "The museum of art's records: the akashic collection on display.",
      ja: '芸術の記録の美術館。アカシックコレクションを展示。',
      ko: '예술 기록의 박물관 — 아카식 컬렉션이 전시된 곳.',
      'pt-br': 'O museu dos registros da arte: a coleção akáshica em exposição.',
    },
  },
  {
    id: 'multiplex',
    districtId: 'sycamore',
    worldUrl: 'https://v2.oncyber.io/multiplex_of_numinia',
    mapPosition: { x: 84, y: 12 },
    name: {
      es: 'Multiplex',
      en: 'Multiplex',
      ja: 'ムルティプレックス',
      ko: '멀티플렉스',
      'pt-br': 'Multiplex',
    },
    description: {
      es: 'Sala de proyecciones y ceremonias audiovisuales del distrito.',
      en: "The district's hall of screenings and audiovisual ceremony.",
      ja: '上映と映像儀礼のための区のホール。',
      ko: '상영과 시청각 의례를 위한 구의 홀.',
      'pt-br': 'Sala de projeções e cerimônias audiovisuais do distrito.',
    },
  },
  {
    id: 'forge',
    districtId: 'sycamore',
    worldUrl: 'https://v2.oncyber.io/forge_of_numinia',
    mapPosition: { x: 68, y: 27 },
    name: {
      es: 'La Forja',
      en: 'The Forge',
      ja: '鍛冶場',
      ko: '대장간',
      'pt-br': 'A Forja',
    },
    description: {
      es: 'El taller donde la materia digital toma forma.',
      en: 'The workshop where digital matter takes shape.',
      ja: 'デジタルの素材が形を得る工房。',
      ko: '디지털 물질이 형태를 얻는 공방.',
      'pt-br': 'A oficina onde a matéria digital ganha forma.',
    },
  },
  {
    id: 'free-academies',
    districtId: 'sycamore',
    mapPosition: { x: 85, y: 28 },
    name: {
      es: 'Academias Libres',
      en: 'Free Academies',
      ja: '自由アカデミー',
      ko: '자유 아카데미',
      'pt-br': 'Academias Livres',
    },
    description: {
      es: 'Escuelas abiertas de los oficios del arte.',
      en: 'Open schools of the crafts of art.',
      ja: '芸術の技を開く学び舎。',
      ko: '예술 기예를 여는 열린 학교.',
      'pt-br': 'Escolas abertas dos ofícios da arte.',
    },
  },
  {
    id: 'scenic-circle',
    districtId: 'sycamore',
    mapPosition: { x: 76, y: 36 },
    name: {
      es: 'Círculo Escénico',
      en: 'Scenic Circle',
      ja: '舞台サークル',
      ko: '무대 서클',
      'pt-br': 'Círculo Cênico',
    },
    description: {
      es: 'Teatros y escenarios de la ciudad en metamorfosis.',
      en: 'Stages and theatres of the city in metamorphosis.',
      ja: '変容する都市の劇場と舞台。',
      ko: '변모하는 도시의 극장과 무대.',
      'pt-br': 'Teatros e palcos da cidade em metamorfose.',
    },
  },

  /* ─── Solomon — justice, order, structure ────────────────────────── */
  {
    id: 'prytaneum',
    districtId: 'solomon',
    worldUrl: 'https://v2.oncyber.io/the_prytaneum_of_numinia',
    mapPosition: { x: 12, y: 70 },
    name: {
      es: 'El Pritaneo',
      en: 'The Prytaneum',
      ja: 'プリタネイオン',
      ko: '프리타네움',
      'pt-br': 'O Pritaneu',
    },
    description: {
      es: 'Sede del gobierno cívico: el fuego común de la ciudad.',
      en: "Seat of civic government: the city's common hearth.",
      ja: '市政の座。都市の共同のかまど。',
      ko: '시민 정부의 소재지 — 도시의 공동 화로.',
      'pt-br': 'Sede do governo cívico: o fogo comum da cidade.',
    },
  },
  {
    id: 'athenaeum',
    districtId: 'solomon',
    worldUrl: 'https://v2.oncyber.io/the_athenaeum_of_numinia',
    mapPosition: { x: 28, y: 67 },
    name: {
      es: 'El Ateneo',
      en: 'The Athenaeum',
      ja: 'アテナイオン',
      ko: '아테나이움',
      'pt-br': 'O Ateneu',
    },
    description: {
      es: 'Foro de debate y de la palabra pública.',
      en: 'Forum of debate and public speech.',
      ja: '討議と公論のフォーラム。',
      ko: '토론과 공론의 포럼.',
      'pt-br': 'Fórum de debate e da palavra pública.',
    },
  },
  {
    id: 'the-mint',
    districtId: 'solomon',
    worldUrl: 'https://v2.oncyber.io/the_mint_of_numinia',
    mapPosition: { x: 13, y: 85 },
    name: {
      es: 'La Casa de la Moneda',
      en: 'The Mint',
      ja: '造幣所',
      ko: '조폐소',
      'pt-br': 'A Casa da Moeda',
    },
    description: {
      es: 'Donde se acuña el valor de Numinia.',
      en: "Where Numinia's value is minted.",
      ja: 'ヌミニアの価値が鋳造される場所。',
      ko: '누미니아의 가치가 주조되는 곳.',
      'pt-br': 'Onde se cunha o valor de Numinia.',
    },
  },
  {
    id: 'alchemists-tower',
    districtId: 'solomon',
    worldUrl: 'https://v2.oncyber.io/alchemists_tower',
    mapPosition: { x: 30, y: 82 },
    name: {
      es: 'Torre de los Alquimistas',
      en: "Alchemists' Tower",
      ja: '錬金術師の塔',
      ko: '연금술사의 탑',
      'pt-br': 'Torre dos Alquimistas',
    },
    description: {
      es: 'El laboratorio vertical del gremio alquimista.',
      en: "The alchemists' vertical laboratory.",
      ja: '錬金術師組合の垂直の実験室。',
      ko: '연금술사 길드의 수직 실험실.',
      'pt-br': 'O laboratório vertical da guilda alquimista.',
    },
  },
  {
    id: 'concordia-council',
    districtId: 'solomon',
    mapPosition: { x: 22, y: 93 },
    name: {
      es: 'Consejo Concordia',
      en: 'Concordia Council',
      ja: 'コンコルディア評議会',
      ko: '콩코르디아 평의회',
      'pt-br': 'Conselho Concórdia',
    },
    description: {
      es: 'Cámara de acuerdos entre gremios y facciones.',
      en: 'Chamber of accords between guilds and factions.',
      ja: '組合と派閥の合意の議場。',
      ko: '길드와 파벌 간 합의의 회의장.',
      'pt-br': 'Câmara de acordos entre guildas e facções.',
    },
  },
  {
    id: 'archive-summa',
    districtId: 'solomon',
    mapPosition: { x: 38, y: 74 },
    name: {
      es: 'Archivo Summa',
      en: 'Summa Archive',
      ja: 'スンマ文書館',
      ko: '숨마 기록보관소',
      'pt-br': 'Arquivo Summa',
    },
    description: {
      es: 'El registro mayor: leyes, actas y sentencias.',
      en: 'The great record: laws, minutes, and rulings.',
      ja: '大いなる記録。法と議事録と裁定。',
      ko: '가장 큰 기록 — 법률, 회의록, 판결.',
      'pt-br': 'O grande registro: leis, atas e sentenças.',
    },
  },
  {
    id: 'defense-organ',
    districtId: 'solomon',
    mapPosition: { x: 38, y: 90 },
    name: {
      es: 'Órgano de Defensa',
      en: 'Defense Organ',
      ja: '防衛機構',
      ko: '방위 기구',
      'pt-br': 'Órgão de Defesa',
    },
    description: {
      es: 'La guardia estructural de la ciudad.',
      en: "The city's structural guard.",
      ja: '都市の構造を守る衛兵。',
      ko: '도시의 구조를 지키는 수비대.',
      'pt-br': 'A guarda estrutural da cidade.',
    },
  },

  /* ─── Ouroboros — game, ritual, spirituality ─────────────────────── */
  {
    id: 'hyperborean-tavern',
    districtId: 'ouroboros',
    worldUrl: 'https://v2.oncyber.io/hyperborean_tavern',
    mapPosition: { x: 66, y: 70 },
    name: {
      es: 'Taberna Hiperbórea',
      en: 'Hyperborean Tavern',
      ja: 'ヒュペルボレイオス酒場',
      ko: '히페르보레아 선술집',
      'pt-br': 'Taverna Hiperbórea',
    },
    description: {
      es: 'Posada de viajeros entre planos: aquí empiezan las historias.',
      en: 'An inn for travellers between planes: stories start here.',
      ja: '次元を渡る旅人の宿。物語はここから始まる。',
      ko: '차원을 오가는 여행자의 주막 — 이야기가 시작되는 곳.',
      'pt-br': 'Pousada de viajantes entre planos: as histórias começam aqui.',
    },
  },
  {
    id: 'house-of-riddles',
    districtId: 'ouroboros',
    worldUrl: 'https://v2.oncyber.io/house_of_riddles_of_numinia',
    mapPosition: { x: 84, y: 72 },
    name: {
      es: 'Casa de los Acertijos',
      en: 'House of Riddles',
      ja: '謎かけの館',
      ko: '수수께끼의 집',
      'pt-br': 'Casa dos Enigmas',
    },
    description: {
      es: 'Las aventuras y enigmas de los Maestros de Juego de la ciudad.',
      en: "The adventures and riddles of the city's Game Masters.",
      ja: '都市のゲームマスターたちの冒険と謎。',
      ko: '도시의 게임 마스터들이 지은 모험과 수수께끼.',
      'pt-br': 'As aventuras e enigmas dos Mestres de Jogo da cidade.',
    },
  },
  {
    // Provenance conflict (D24): the data repo places the temple in
    // Ouroboros (where its oncyber world lives); the manual places it in
    // Vitruvian (l.2598). Data repo wins for the map until the Oracle rules.
    id: 'temple-of-khepri',
    districtId: 'ouroboros',
    worldUrl: 'https://v2.oncyber.io/temple_of_khepri',
    mapPosition: { x: 68, y: 87 },
    name: {
      es: 'Templo de Khepri',
      en: 'Temple of Khepri',
      ja: 'ケプリ神殿',
      ko: '케프리 신전',
      'pt-br': 'Templo de Khepri',
    },
    description: {
      es: 'Santuario del escarabajo: el ciclo, el sol y la transformación.',
      en: 'Sanctuary of the scarab: cycle, sun, and transformation.',
      ja: 'スカラベの聖域。循環と太陽と変容。',
      ko: '풍뎅이의 성소 — 순환, 태양, 변모.',
      'pt-br': 'Santuário do escaravelho: o ciclo, o sol e a transformação.',
    },
  },
  {
    id: 'old-quarter',
    districtId: 'ouroboros',
    mapPosition: { x: 84, y: 89 },
    name: {
      es: 'Barrio Antiguo',
      en: 'Old Quarter',
      ja: '旧市街',
      ko: '구시가지',
      'pt-br': 'Bairro Antigo',
    },
    description: {
      es: 'Las callejas primeras de la ciudad reconstruida.',
      en: 'The first alleys of the rebuilt city.',
      ja: '再建された都市の最初の路地。',
      ko: '재건된 도시의 첫 골목길.',
      'pt-br': 'As primeiras vielas da cidade reconstruída.',
    },
  },
];

/** The city's headline number: 13 built district worlds + the Ágora hub. */
export const BUILT_PORTAL_COUNT: number =
  PORTALS.filter((portal) => portal.worldUrl !== undefined).length + 1;
