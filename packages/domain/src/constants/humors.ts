/**
 * Humor constants — the four classical humors (glossary §10).
 * Attribute links, elements, organs and conducts from the manual, ch. 3 fr. 5.
 */

import type { Humor } from '../types/humor.js';

export const HUMORS: readonly Humor[] = [
  {
    id: 'blood',
    linkedAttributes: ['movement', 'charisma'],
    name: { es: 'Sangre', en: 'Blood', ja: '血液', ko: '혈액', 'pt-br': 'Sangue' },
    temperament: {
      es: 'Sanguíneo',
      en: 'Sanguine',
      ja: '多血質',
      ko: '다혈질',
      'pt-br': 'Sanguíneo',
    },
    description: {
      es: 'Aire, corazón, conducta honorable: valiente, esperanzado, amoroso.',
      en: 'Air, the heart, honorable conduct: brave, hopeful, loving.',
      ja: '風と心臓、誇り高き振る舞い。勇敢、希望、愛情。',
      ko: '공기와 심장, 명예로운 품행 — 용감하고 희망차며 다정하다.',
      'pt-br': 'Ar, coração, conduta honrada: valente, esperançoso, amoroso.',
    },
  },
  {
    id: 'yellow-bile',
    linkedAttributes: ['strength', 'wisdom'],
    name: {
      es: 'Bilis Amarilla',
      en: 'Yellow Bile',
      ja: '黄胆汁',
      ko: '황담즙',
      'pt-br': 'Bílis Amarela',
    },
    temperament: {
      es: 'Colérico',
      en: 'Choleric',
      ja: '胆汁質',
      ko: '담즙질',
      'pt-br': 'Colérico',
    },
    description: {
      es: 'Fuego, hígado, conducta protectora: furioso, atrevido, apasionado.',
      en: 'Fire, the liver, protective conduct: fierce, daring, passionate.',
      ja: '火と肝臓、守りの気質。激しく、大胆で、情熱的。',
      ko: '불과 간, 보호하는 품성 — 격렬하고 대담하며 열정적이다.',
      'pt-br': 'Fogo, fígado, conduta protetora: furioso, ousado, apaixonado.',
    },
  },
  {
    id: 'black-bile',
    linkedAttributes: ['constitution', 'perception'],
    name: {
      es: 'Bilis Negra',
      en: 'Black Bile',
      ja: '黒胆汁',
      ko: '흑담즙',
      'pt-br': 'Bílis Negra',
    },
    temperament: {
      es: 'Melancólico',
      en: 'Melancholic',
      ja: '憂鬱質',
      ko: '우울질',
      'pt-br': 'Melancólico',
    },
    description: {
      es: 'Tierra, bazo, conducta idealista: imaginativo, misterioso, emocional.',
      en: 'Earth, the spleen, idealist conduct: imaginative, mysterious, emotional.',
      ja: '地と脾臓、理想の気質。想像的で神秘的、情動的。',
      ko: '흙과 비장, 이상주의적 품성 — 상상력 있고 신비로우며 감성적이다.',
      'pt-br': 'Terra, baço, conduta idealista: imaginativo, misterioso, emocional.',
    },
  },
  {
    id: 'phlegm',
    linkedAttributes: ['size', 'intelligence'],
    name: { es: 'Flema', en: 'Phlegm', ja: '粘液', ko: '점액', 'pt-br': 'Fleuma' },
    temperament: {
      es: 'Flemático',
      en: 'Phlegmatic',
      ja: '粘液質',
      ko: '점액질',
      'pt-br': 'Fleumático',
    },
    description: {
      es: 'Agua, pulmón, conducta racional: calmado, lógico, prudente.',
      en: 'Water, the lungs, rational conduct: calm, logical, prudent.',
      ja: '水と肺、理の気質。穏やかで論理的、慎重。',
      ko: '물과 폐, 이성적 품성 — 차분하고 논리적이며 신중하다.',
      'pt-br': 'Água, pulmão, conduta racional: calmo, lógico, prudente.',
    },
  },
];
