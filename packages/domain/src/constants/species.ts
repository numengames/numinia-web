/**
 * Species constants — the five pillars of Numinia (glossary §11).
 * Characters and force fields from the RPG manual, chapter 3, fragment 2.
 */

import type { Species } from '../types/species.js';

export const SPECIES: readonly Species[] = [
  {
    id: 'biomechanical',
    name: {
      es: 'Biomecánicos',
      en: 'Biomechanicals',
      ja: 'バイオメカニカル',
      ko: '바이오메카니컬',
      'pt-br': 'Biomecânicos',
    },
    description: {
      es: 'La chispa de la innovación: fusión de lo orgánico y lo mecánico, maestros del progreso.',
      en: 'The spark of innovation: fusion of the organic and the mechanical, masters of progress.',
      ja: '有機と機械の融合。進歩を司る革新の火花。',
      ko: '유기체와 기계의 융합 — 진보의 대가, 혁신의 불꽃.',
      'pt-br': 'A centelha da inovação: fusão do orgânico e do mecânico, mestres do progresso.',
    },
    character: {
      es: 'El Racional',
      en: 'The Rational',
      ja: '理性の者',
      ko: '이성적인 자',
      'pt-br': 'O Racional',
    },
    forceField: {
      es: 'Tecnología',
      en: 'Technology',
      ja: 'テクノロジー',
      ko: '기술',
      'pt-br': 'Tecnologia',
    },
  },
  {
    id: 'humanitas',
    name: {
      es: 'Humanitas',
      en: 'Humanitas',
      ja: 'フマニタス',
      ko: '후마니타스',
      'pt-br': 'Humanitas',
    },
    description: {
      es: 'Custodios del significado e intérpretes del legado cultural.',
      en: 'Custodians of meaning and interpreters of the cultural legacy.',
      ja: '意味の守り手、文化遺産の解釈者。',
      ko: '의미의 수호자이자 문화 유산의 해석자.',
      'pt-br': 'Custódios do significado e intérpretes do legado cultural.',
    },
    character: {
      es: 'El Idealista',
      en: 'The Idealist',
      ja: '理想の者',
      ko: '이상주의자',
      'pt-br': 'O Idealista',
    },
    forceField: { es: 'Cultura', en: 'Culture', ja: '文化', ko: '문화', 'pt-br': 'Cultura' },
  },
  {
    id: 'reptilian',
    name: {
      es: 'Reptilianos',
      en: 'Reptilians',
      ja: 'レプティリアン',
      ko: '렙틸리언',
      'pt-br': 'Reptilianos',
    },
    description: {
      es: 'Guardianes de la tradición y de los ritmos ancestrales.',
      en: 'Guardians of tradition and of the ancestral rhythms.',
      ja: '伝統と太古のリズムの守護者。',
      ko: '전통과 태고의 리듬을 지키는 자.',
      'pt-br': 'Guardiões da tradição e dos ritmos ancestrais.',
    },
    character: {
      es: 'El Ritualista',
      en: 'The Ritualist',
      ja: '儀式の者',
      ko: '의례주의자',
      'pt-br': 'O Ritualista',
    },
    forceField: { es: 'Naturaleza', en: 'Nature', ja: '自然', ko: '자연', 'pt-br': 'Natureza' },
  },
  {
    id: 'cyanite',
    name: {
      es: 'Cyanitas',
      en: 'Cyanites',
      ja: 'シアナイト',
      ko: '시아나이트',
      'pt-br': 'Cianitas',
    },
    description: {
      es: 'Arquitectos del orden social: analistas del tejido de la comunidad.',
      en: "Architects of the social order: analysts of the community's fabric.",
      ja: '社会秩序の建築家。共同体の織物を読み解く。',
      ko: '사회 질서의 건축가 — 공동체의 짜임을 분석한다.',
      'pt-br': 'Arquitetos da ordem social: analistas do tecido da comunidade.',
    },
    character: {
      es: 'El Dialéctico',
      en: 'The Dialectic',
      ja: '弁証の者',
      ko: '변증가',
      'pt-br': 'O Dialético',
    },
    forceField: {
      es: 'Conocimiento',
      en: 'Knowledge',
      ja: '知識',
      ko: '지식',
      'pt-br': 'Conhecimento',
    },
  },
  {
    id: 'spectral',
    name: {
      es: 'Espectrales',
      en: 'Spectrals',
      ja: 'スペクトラル',
      ko: '스펙트럴',
      'pt-br': 'Espectrais',
    },
    description: {
      es: 'Visionarios del más allá que caminan entre mundos y canalizan el plano etéreo.',
      en: 'Visionaries of the beyond who walk between worlds and channel the aetheric plane.',
      ja: '世界の狭間を歩き、霊妙な次元を渡す幻視者。',
      ko: '세계 사이를 걷고 에테르계를 매개하는 예지자.',
      'pt-br': 'Visionários do além que caminham entre mundos e canalizam o plano etéreo.',
    },
    character: {
      es: 'El Místico',
      en: 'The Mystic',
      ja: '神秘の者',
      ko: '신비가',
      'pt-br': 'O Místico',
    },
    forceField: { es: 'Éter', en: 'Aether', ja: 'エーテル', ko: '에테르', 'pt-br': 'Éter' },
  },
];
