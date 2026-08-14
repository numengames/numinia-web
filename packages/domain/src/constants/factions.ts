/**
 * Faction constants — Prototype Theory arrangement (glossary §4).
 * Gamification (Heirs of Eleusis) is the prototype; Art is itinerant.
 */

import type { Faction } from '../types/faction.js';

export const FACTIONS: readonly Faction[] = [
  {
    id: 'hermeticists',
    field: 'education',
    prototypeRole: 'peripheral',
    districtId: 'vitruvian',
    name: {
      es: 'Hermetistas',
      en: 'Hermeticists',
      ja: 'ヘルメス主義者',
      ko: '헤르메스주의자',
      'pt-br': 'Hermetistas',
    },
    description: {
      es: 'Guardianes de la sabiduría y la erudición: estudian, preservan y expanden el conocimiento.',
      en: 'Guardians of wisdom and erudition: they study, preserve and expand knowledge.',
      ja: '知恵と学識の守護者。知識を学び、守り、広げる。',
      ko: '지혜와 학식의 수호자 — 지식을 연구하고 보존하며 넓힌다.',
      'pt-br':
        'Guardiões da sabedoria e da erudição: estudam, preservam e expandem o conhecimento.',
    },
    seedName: {
      es: 'Sociedad Hermética de los Siete Principios',
      en: 'Hermetic Society of the Seven Principles',
    },
  },
  {
    id: 'heirs-of-eleusis',
    field: 'gamification',
    prototypeRole: 'prototype',
    districtId: 'ouroboros',
    name: {
      es: 'Herederos de Eleusis',
      en: 'Heirs of Eleusis',
      ja: 'エレウシスの後継者',
      ko: '엘레우시스의 계승자',
      'pt-br': 'Herdeiros de Elêusis',
    },
    description: {
      es: 'El aprendizaje y el progreso surgen de la experimentación lúdica: el juego es la forma suprema de conocimiento.',
      en: 'Learning and progress arise from playful experimentation: play is the supreme form of knowledge.',
      ja: '学びと進歩は遊びの実験から生まれる。遊びこそ最高の知。',
      ko: '배움과 진보는 놀이의 실험에서 태어난다 — 놀이는 최고의 앎이다.',
      'pt-br':
        'O aprendizado e o progresso nascem da experimentação lúdica: o jogo é a forma suprema de conhecimento.',
    },
    seedName: {
      es: 'Orden Mística de los Nuevos Cultos Eleusinos',
      en: 'Mystic Order of the New Eleusinian Cults',
    },
  },
  {
    id: 'stellar-circle',
    field: 'organization',
    prototypeRole: 'peripheral',
    districtId: 'solomon',
    name: {
      es: 'Círculo Estelar',
      en: 'Stellar Circle',
      ja: '星辰円環',
      ko: '성환회',
      'pt-br': 'Círculo Estelar',
    },
    description: {
      es: 'Creen en la necesidad de un marco sólido: arquitectos del orden y diseñadores de sistemas.',
      en: 'They believe in the need for a solid framework: architects of order and designers of systems.',
      ja: '堅固な枠組みを信じる者たち。秩序の建築家、制度の設計者。',
      ko: '견고한 틀을 믿는 자들 — 질서의 건축가이자 체계의 설계자.',
      'pt-br':
        'Acreditam na necessidade de um marco sólido: arquitetos da ordem e projetistas de sistemas.',
    },
    seedName: {
      es: 'Círculo Estelar del Estudio de la Tabla de Venus',
      en: 'Stellar Circle for the Study of the Venus Tablet',
    },
  },
  {
    id: 'neo-atlantists',
    field: 'art',
    prototypeRole: 'itinerant',
    districtId: 'sycamore',
    name: {
      es: 'Neo-Atlantes',
      en: 'Neo-Atlantists',
      ja: 'ネオ・アトランティス派',
      ko: '네오아틀란티스파',
      'pt-br': 'Neo-Atlantes',
    },
    description: {
      es: 'La creatividad como motor: artistas y visionarios que transforman la realidad a través de la expresión.',
      en: 'Creativity as the engine: artists and visionaries who transform reality through expression.',
      ja: '創造性を原動力に、表現で現実を変える芸術家と夢想家。',
      ko: '창조성을 원동력으로 — 표현으로 현실을 바꾸는 예술가와 선각자.',
      'pt-br':
        'A criatividade como motor: artistas e visionários que transformam a realidade através da expressão.',
    },
    seedName: {
      es: 'Confederación Internacional de la Sexta Raza Raíz',
      en: 'International Confederation of the Sixth Root Race',
    },
  },
];
