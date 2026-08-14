/**
 * District constants — geometry from the RPG manual, chapter 5 (glossary §5).
 * Coordinates measure km from the Plaza del Ágora (x east+, y north+).
 */

import type { District } from '../types/district.js';

export const DISTRICTS: readonly District[] = [
  {
    id: 'vitruvian',
    factionId: 'hermeticists',
    coordinates: { x: -131, y: 290 },
    heightMeters: 130,
    diameterKm: 100,
    name: {
      es: 'Distrito Vitruvian',
      en: 'Vitruvian District',
      ja: 'ヴィトルヴィアン区',
      ko: '비트루비안 구',
      'pt-br': 'Distrito Vitruvian',
    },
    description: {
      es: 'El templo del conocimiento: corazón intelectual de Numinia.',
      en: "The temple of knowledge: Numinia's intellectual heart.",
      ja: '知識の神殿。ヌミニアの知の中枢。',
      ko: '지식의 신전 — 누미니아의 지성 중심지.',
      'pt-br': 'O templo do conhecimento: coração intelectual de Numinia.',
    },
  },
  {
    id: 'ouroboros',
    factionId: 'heirs-of-eleusis',
    coordinates: { x: 271, y: -361 },
    heightMeters: 40,
    diameterKm: 90,
    name: {
      es: 'Distrito Ouroboros',
      en: 'Ouroboros District',
      ja: 'ウロボロス区',
      ko: '우로보로스 구',
      'pt-br': 'Distrito Ouroboros',
    },
    description: {
      es: 'El laberinto del juego: teatro de la incertidumbre.',
      en: 'The labyrinth of play: the theatre of uncertainty.',
      ja: '遊戯の迷宮。不確かさの劇場。',
      ko: '놀이의 미궁 — 불확실성의 극장.',
      'pt-br': 'O labirinto do jogo: teatro da incerteza.',
    },
  },
  {
    id: 'solomon',
    factionId: 'stellar-circle',
    coordinates: { x: -247, y: -221 },
    heightMeters: 70,
    diameterKm: 120,
    name: {
      es: 'Distrito Solomon',
      en: 'Solomon District',
      ja: 'ソロモン区',
      ko: '솔로몬 구',
      'pt-br': 'Distrito Solomon',
    },
    description: {
      es: 'El engranaje del orden: aquí se trazan las reglas de la ciudad.',
      en: "The gearwork of order: where the city's rules are drawn.",
      ja: '秩序の歯車。都市の規範が定まる場所。',
      ko: '질서의 톱니 — 도시의 규칙이 그려지는 곳.',
      'pt-br': 'A engrenagem da ordem: onde se traçam as regras da cidade.',
    },
  },
  {
    id: 'sycamore',
    factionId: 'neo-atlantists',
    coordinates: { x: 375, y: 232 },
    heightMeters: 100,
    diameterKm: 80,
    name: {
      es: 'Distrito Sycamore',
      en: 'Sycamore District',
      ja: 'シカモア区',
      ko: '시카모어 구',
      'pt-br': 'Distrito Sycamore',
    },
    description: {
      es: 'El lienzo de la imaginación: territorio en metamorfosis constante.',
      en: 'The canvas of imagination: a territory in constant metamorphosis.',
      ja: '想像力の画布。絶えず変容する領域。',
      ko: '상상력의 캔버스 — 끊임없이 변모하는 땅.',
      'pt-br': 'A tela da imaginação: território em metamorfose constante.',
    },
  },
];
