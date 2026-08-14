/**
 * Guild constants — 4 guilds × 2 branches × 2 houses, five locales each.
 * Names per docs/glossary.md §1–3. ES is canonical; JA/KO/PT-BR pending native
 * QA (open-questions D9).
 */

import type { Branch, Guild, House } from '../types/guild.js';

const projectors: House = {
  id: 'projectors',
  branchId: 'artisans',
  guildId: 'alchemists',
  name: {
    es: 'Proyectistas',
    en: 'Projectors',
    ja: '設計士',
    ko: '설계사',
    'pt-br': 'Projetistas',
  },
  description: {
    es: 'Diseñadores a pequeña y gran escala.',
    en: 'Designers at small and grand scale.',
    ja: '大小のスケールを描く設計者。',
    ko: '크고 작은 규모의 설계자.',
    'pt-br': 'Projetistas em pequena e grande escala.',
  },
};

const aesthetes: House = {
  id: 'aesthetes',
  branchId: 'artisans',
  guildId: 'alchemists',
  name: {
    es: 'Estetas',
    en: 'Aesthetes',
    ja: '耽美家',
    ko: '심미가',
    'pt-br': 'Estetas',
  },
  description: {
    es: 'Artistas de todo tipo.',
    en: 'Artists of every kind.',
    ja: 'あらゆる種類の芸術家。',
    ko: '모든 종류의 예술가.',
    'pt-br': 'Artistas de todo tipo.',
  },
};

const architects: House = {
  id: 'architects',
  branchId: 'engineers',
  guildId: 'alchemists',
  name: {
    es: 'Arquitectos',
    en: 'Architects',
    ja: '建築家',
    ko: '건축가',
    'pt-br': 'Arquitetos',
  },
  description: {
    es: 'Desarrollan la arquitectura digital de Numinia.',
    en: "They build Numinia's digital architecture.",
    ja: 'ヌミニアのデジタル建築を築く。',
    ko: '누미니아의 디지털 구조를 세운다.',
    'pt-br': 'Desenvolvem a arquitetura digital de Numinia.',
  },
};

const automata: House = {
  id: 'automata',
  branchId: 'engineers',
  guildId: 'alchemists',
  name: {
    es: 'Autómatas',
    en: 'Automata',
    ja: 'オートマタ',
    ko: '오토마타',
    'pt-br': 'Autômatos',
  },
  description: {
    es: 'Trabajan con realidades virtuales y conciencias artificiales.',
    en: 'They work with virtual realities and artificial consciousness.',
    ja: '仮想現実と人工意識を扱う。',
    ko: '가상 현실과 인공 의식을 다룬다.',
    'pt-br': 'Trabalham com realidades virtuais e consciências artificiais.',
  },
};

const logographers: House = {
  id: 'logographers',
  branchId: 'chroniclers',
  guildId: 'exegetes',
  name: {
    es: 'Logógrafos',
    en: 'Logographers',
    ja: 'ロゴグラフォス',
    ko: '로고그라포스',
    'pt-br': 'Logógrafos',
  },
  description: {
    es: 'La perspectiva diacrónica: historias y leyendas.',
    en: 'The diachronic view: histories and legends.',
    ja: '通時の視点。歴史と伝説を記す。',
    ko: '통시적 관점 — 역사와 전설.',
    'pt-br': 'A perspectiva diacrônica: histórias e lendas.',
  },
};

const bards: House = {
  id: 'bards',
  branchId: 'chroniclers',
  guildId: 'exegetes',
  name: {
    es: 'Bardos',
    en: 'Bards',
    ja: '吟遊詩人',
    ko: '음유시인',
    'pt-br': 'Bardos',
  },
  description: {
    es: 'La perspectiva sincrónica: noticias y crónicas del presente.',
    en: 'The synchronic view: news and chronicles of the present.',
    ja: '共時の視点。現在の報せと記録。',
    ko: '공시적 관점 — 현재의 소식과 기록.',
    'pt-br': 'A perspectiva sincrônica: notícias e crônicas do presente.',
  },
};

const hierophants: House = {
  id: 'hierophants',
  branchId: 'scholars',
  guildId: 'exegetes',
  name: {
    es: 'Hierofantes',
    en: 'Hierophants',
    ja: 'ヒエロファント',
    ko: '히에로판트',
    'pt-br': 'Hierofantes',
  },
  description: {
    es: 'Especialistas en distintos campos del saber.',
    en: 'Specialists across the fields of knowledge.',
    ja: '諸分野の専門家。',
    ko: '여러 지식 분야의 전문가.',
    'pt-br': 'Especialistas em distintos campos do saber.',
  },
};

const thaumaturges: House = {
  id: 'thaumaturges',
  branchId: 'scholars',
  guildId: 'exegetes',
  name: {
    es: 'Taumaturgos',
    en: 'Thaumaturges',
    ja: '奇跡術師',
    ko: '기적술사',
    'pt-br': 'Taumaturgos',
  },
  description: {
    es: 'Moldean la cultura y desarrollan nuevas ideas.',
    en: 'They shape culture and develop new ideas.',
    ja: '文化を形づくり、新たな思想を生む。',
    ko: '문화를 빚고 새로운 생각을 키운다.',
    'pt-br': 'Moldam a cultura e desenvolvem novas ideias.',
  },
};

const legalCounsels: House = {
  id: 'legal-counsels',
  branchId: 'jurists',
  guildId: 'procurators',
  name: {
    es: 'Conejos Legales',
    en: 'Legal Counsels',
    ja: '法律顧問',
    ko: '법률 고문',
    'pt-br': 'Conselheiros Legais',
  },
  description: {
    es: 'Asesoría legal y ejercicio de la ley.',
    en: 'Legal counsel and the practice of law.',
    ja: '法律相談と法の実践。',
    ko: '법률 자문과 법의 실천.',
    'pt-br': 'Assessoria legal e exercício da lei.',
  },
};

const heralds: House = {
  id: 'heralds',
  branchId: 'jurists',
  guildId: 'procurators',
  name: {
    es: 'Heraldos',
    en: 'Heralds',
    ja: '伝令官',
    ko: '전령관',
    'pt-br': 'Arautos',
  },
  description: {
    es: 'Representan a la ciudad en asuntos legales y diplomáticos.',
    en: 'They represent the city in legal and diplomatic matters.',
    ja: '法と外交で都市を代表する。',
    ko: '법률·외교 문제에서 도시를 대표한다.',
    'pt-br': 'Representam a cidade em assuntos legais e diplomáticos.',
  },
};

const treasurers: House = {
  id: 'treasurers',
  branchId: 'syndics',
  guildId: 'procurators',
  name: {
    es: 'Tesoreros',
    en: 'Treasurers',
    ja: '財務官',
    ko: '재무관',
    'pt-br': 'Tesoureiros',
  },
  description: {
    es: 'Administran la economía.',
    en: 'They administer the economy.',
    ja: '経済を司る。',
    ko: '경제를 관리한다.',
    'pt-br': 'Administram a economia.',
  },
};

const councillors: House = {
  id: 'councillors',
  branchId: 'syndics',
  guildId: 'procurators',
  name: {
    es: 'Concejales',
    en: 'Councillors',
    ja: '評議員',
    ko: '평의원',
    'pt-br': 'Vereadores',
  },
  description: {
    es: 'Gestionan los asuntos organizativos internos.',
    en: 'They manage internal organizational affairs.',
    ja: '内部の組織運営を担う。',
    ko: '내부 조직 업무를 관장한다.',
    'pt-br': 'Gerenciam os assuntos organizacionais internos.',
  },
};

const captains: House = {
  id: 'captains',
  branchId: 'seraphim',
  guildId: 'sentinels',
  name: {
    es: 'Capitanes',
    en: 'Captains',
    ja: '隊長',
    ko: '대장',
    'pt-br': 'Capitães',
  },
  description: {
    es: 'Supervisan y gestionan la estructura de Numinia.',
    en: "They oversee and manage Numinia's structure.",
    ja: 'ヌミニアの構造を監督し運営する。',
    ko: '누미니아의 구조를 감독하고 관리한다.',
    'pt-br': 'Supervisionam e gerenciam a estrutura de Numinia.',
  },
};

const guardians: House = {
  id: 'guardians',
  branchId: 'seraphim',
  guildId: 'sentinels',
  name: {
    es: 'Guardianes',
    en: 'Guardians',
    ja: '守護者',
    ko: '수호자',
    'pt-br': 'Guardiões',
  },
  description: {
    es: 'Velan por las normas y los conflictos comunitarios.',
    en: 'They uphold the norms and handle community conflicts.',
    ja: '規範を守り、共同体の対立を収める。',
    ko: '규범을 지키고 공동체의 갈등을 다룬다.',
    'pt-br': 'Zelam pelas normas e pelos conflitos comunitários.',
  },
};

const healers: House = {
  id: 'healers',
  branchId: 'archangels',
  guildId: 'sentinels',
  name: {
    es: 'Sanadores',
    en: 'Healers',
    ja: '癒し手',
    ko: '치유사',
    'pt-br': 'Curadores',
  },
  description: {
    es: 'Cuidado mental y bienestar.',
    en: 'Mental care and wellbeing.',
    ja: '心のケアと安らぎ。',
    ko: '마음의 돌봄과 안녕.',
    'pt-br': 'Cuidado mental e bem-estar.',
  },
};

// "Guides" was a trait, not a house — the Explorers guide citizens (ADR-012).
const explorers: House = {
  id: 'explorers',
  branchId: 'archangels',
  guildId: 'sentinels',
  name: {
    es: 'Exploradores',
    en: 'Explorers',
    ja: '探究者',
    ko: '탐구자',
    'pt-br': 'Exploradores',
  },
  description: {
    es: 'Ayudan a guiar a los ciudadanos por el camino correcto.',
    en: 'They help guide citizens along the right path.',
    ja: '市民を正しい道へ導く。',
    ko: '시민이 바른 길을 가도록 이끈다.',
    'pt-br': 'Ajudam a guiar os cidadãos pelo caminho certo.',
  },
};

const artisans: Branch = {
  id: 'artisans',
  guildId: 'alchemists',
  name: {
    es: 'Menestrales',
    en: 'Artisans',
    ja: '職人衆',
    ko: '장인단',
    'pt-br': 'Artesãos',
  },
  description: {
    es: 'Los espíritus creativos de la ciudad.',
    en: 'The creative spirits of the city.',
    ja: '都市の創造的精神。',
    ko: '도시의 창조적 영혼.',
    'pt-br': 'Os espíritos criativos da cidade.',
  },
  houses: [projectors, aesthetes],
};

const engineers: Branch = {
  id: 'engineers',
  guildId: 'alchemists',
  name: {
    es: 'Ingenieros',
    en: 'Engineers',
    ja: '技師団',
    ko: '기술자단',
    'pt-br': 'Engenheiros',
  },
  description: {
    es: 'Trabajan con código y cadenas de información.',
    en: 'They work with code and chains of information.',
    ja: 'コードと情報の連なりを扱う。',
    ko: '코드와 정보의 사슬을 다룬다.',
    'pt-br': 'Trabalham com código e cadeias de informação.',
  },
  houses: [architects, automata],
};

const chroniclers: Branch = {
  id: 'chroniclers',
  guildId: 'exegetes',
  name: {
    es: 'Cronistas',
    en: 'Chroniclers',
    ja: '年代記者',
    ko: '연대기 작가',
    'pt-br': 'Cronistas',
  },
  description: {
    es: 'Documentan los eventos de la ciudad.',
    en: 'They document the events of the city.',
    ja: '都市の出来事を記録する。',
    ko: '도시의 사건을 기록한다.',
    'pt-br': 'Documentam os eventos da cidade.',
  },
  houses: [logographers, bards],
};

// Hierophants first, Thaumaturges second — Oracle resolution 3 (ADR-012).
const scholars: Branch = {
  id: 'scholars',
  guildId: 'exegetes',
  name: {
    es: 'Eruditos',
    en: 'Scholars',
    ja: '碩学',
    ko: '석학',
    'pt-br': 'Eruditos',
  },
  description: {
    es: 'Estudiosos y expertos en diversas disciplinas.',
    en: 'Scholars and experts across disciplines.',
    ja: '諸学に通じた研究者たち。',
    ko: '여러 분야의 학자이자 전문가.',
    'pt-br': 'Estudiosos e especialistas em diversas disciplinas.',
  },
  houses: [hierophants, thaumaturges],
};

const jurists: Branch = {
  id: 'jurists',
  guildId: 'procurators',
  name: {
    es: 'Juristas',
    en: 'Jurists',
    ja: '法学者',
    ko: '법학자',
    'pt-br': 'Juristas',
  },
  description: {
    es: 'Operan dentro del marco legal y judicial.',
    en: 'They operate within the legal and judicial framework.',
    ja: '法と司法の枠組みの中で働く。',
    ko: '법과 사법의 틀 안에서 활동한다.',
    'pt-br': 'Atuam dentro do marco legal e judicial.',
  },
  houses: [legalCounsels, heralds],
};

const syndics: Branch = {
  id: 'syndics',
  guildId: 'procurators',
  name: {
    es: 'Síndicos',
    en: 'Syndics',
    ja: 'シンディック',
    ko: '신디크',
    'pt-br': 'Síndicos',
  },
  description: {
    es: 'Protegen los intereses de Numinia en lo económico y lo social.',
    en: "They protect Numinia's economic and social interests.",
    ja: 'ヌミニアの経済的・社会的利益を守る。',
    ko: '누미니아의 경제적·사회적 이익을 보호한다.',
    'pt-br': 'Protegem os interesses econômicos e sociais de Numinia.',
  },
  houses: [treasurers, councillors],
};

const seraphim: Branch = {
  id: 'seraphim',
  guildId: 'sentinels',
  name: {
    es: 'Serafines',
    en: 'Seraphim',
    ja: '熾天使',
    ko: '세라핌',
    'pt-br': 'Serafins',
  },
  description: {
    es: 'Mantienen el orden.',
    en: 'They keep the order.',
    ja: '秩序を維持する。',
    ko: '질서를 유지한다.',
    'pt-br': 'Mantêm a ordem.',
  },
  houses: [captains, guardians],
};

const archangels: Branch = {
  id: 'archangels',
  guildId: 'sentinels',
  name: {
    es: 'Arcángeles',
    en: 'Archangels',
    ja: '大天使',
    ko: '대천사',
    'pt-br': 'Arcanjos',
  },
  description: {
    es: 'Trabajan con la comunidad, resolviendo dilemas y ofreciendo asistencia.',
    en: 'They work with the community, resolving dilemmas and offering assistance.',
    ja: '共同体と共に働き、悩みに寄り添い助ける。',
    ko: '공동체와 함께하며 문제를 풀고 도움을 준다.',
    'pt-br': 'Trabalham com a comunidade, resolvendo dilemas e oferecendo assistência.',
  },
  houses: [healers, explorers],
};

export const GUILDS: readonly Guild[] = [
  {
    id: 'alchemists',
    name: {
      es: 'Alquimistas',
      en: 'Alchemists',
      ja: '錬金術師',
      ko: '연금술사',
      'pt-br': 'Alquimistas',
    },
    description: {
      es: 'Mentes creativas, científicas y artísticas: inventores, descubridores e innovadores.',
      en: 'Creative, scientific and artistic minds: inventors, discoverers and innovators.',
      ja: '創造と科学と芸術の精神。発明家、発見者、革新者。',
      ko: '창조적이고 과학적이며 예술적인 정신 — 발명가, 발견자, 혁신가.',
      'pt-br':
        'Mentes criativas, científicas e artísticas: inventores, descobridores e inovadores.',
    },
    branches: [artisans, engineers],
  },
  {
    id: 'exegetes',
    name: {
      es: 'Exégetas',
      en: 'Exegetes',
      ja: '釈義者',
      ko: '주해자',
      'pt-br': 'Exegetas',
    },
    description: {
      es: 'Viven por las letras, la historia y la fantasía: cronistas de las eras y visionarios.',
      en: 'They live by letters, history and fantasy: chroniclers of the ages and visionaries.',
      ja: '文芸と歴史と幻想に生きる者たち。時代の記録者にして夢想家。',
      ko: '문학과 역사, 환상 속에 사는 자들 — 시대의 기록자이자 몽상가.',
      'pt-br':
        'Vivem pelas letras, pela história e pela fantasia: cronistas das eras e visionários.',
    },
    branches: [chroniclers, scholars],
  },
  {
    id: 'procurators',
    name: {
      es: 'Procuradores',
      en: 'Procurators',
      ja: 'プロクラトル',
      ko: '프로쿠라토르',
      'pt-br': 'Procuradores',
    },
    description: {
      es: 'Las mentes pragmáticas: organización, gestión, administración y derecho.',
      en: 'The pragmatic minds: organization, management, administration and law.',
      ja: '実務の精神。組織、運営、行政、法律を司る。',
      ko: '실용적인 정신 — 조직, 관리, 행정, 법률.',
      'pt-br': 'As mentes pragmáticas: organização, gestão, administração e direito.',
    },
    branches: [jurists, syndics],
  },
  {
    id: 'sentinels',
    name: {
      es: 'Centinelas',
      en: 'Sentinels',
      ja: 'センチネル',
      ko: '센티넬',
      'pt-br': 'Sentinelas',
    },
    description: {
      es: 'Garantizan el buen funcionamiento de la ciudad: moderadores, custodios y pacificadores.',
      en: 'They keep the city running well: moderators, custodians and peacemakers.',
      ja: '都市の安寧を守る者たち。調停者にして守護者。',
      ko: '도시의 안녕을 지키는 자들 — 중재자, 수호자, 평화주의자.',
      'pt-br': 'Garantem o bom funcionamento da cidade: moderadores, guardiões e pacificadores.',
    },
    branches: [seraphim, archangels],
  },
];
