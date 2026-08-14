/**
 * Rank constants — descriptions from the Compendium of Attributes and Ranks.
 * ADR-011: no Oracle cardinality anywhere in this file.
 */

import type { RankDefinition } from '../types/rank.js';

export const RANK_DEFINITIONS: readonly RankDefinition[] = [
  {
    id: 'nomad',
    level: 0,
    name: { es: 'Nómada', en: 'Nomad', ja: '放浪者', ko: '유랑자', 'pt-br': 'Nômade' },
    description: {
      es: 'Sin gremio ni facción; registrado por el sistema, aún no es ciudadano.',
      en: 'No guild or faction yet; registered by the system, not yet a citizen.',
      ja: 'ギルドも派閥も持たず、記録されただけの来訪者。',
      ko: '길드도 파벌도 없이 시스템에 등록만 된 상태.',
      'pt-br': 'Sem guilda nem facção; registrado pelo sistema, ainda não é cidadão.',
    },
  },
  {
    id: 'citizen',
    level: 1,
    name: { es: 'Ciudadano', en: 'Citizen', ja: '市民', ko: '시민', 'pt-br': 'Cidadão' },
    description: {
      es: 'Miembro de un gremio y una facción tras completar la Sesión Cero.',
      en: 'Member of a guild and a faction after completing Session Zero.',
      ja: 'セッションゼロを終え、ギルドと派閥に属する市民。',
      ko: '세션 제로를 마치고 길드와 파벌에 속한 시민.',
      'pt-br': 'Membro de uma guilda e uma facção após completar a Sessão Zero.',
    },
  },
  {
    id: 'pilgrim',
    level: 2,
    name: { es: 'Peregrino', en: 'Pilgrim', ja: '巡礼者', ko: '순례자', 'pt-br': 'Peregrino' },
    description: {
      es: 'Ciudadano en intercambio con Numinia: colaboración o comercio.',
      en: 'A citizen in exchange with Numinia: collaboration or commerce.',
      ja: '協力や商いでヌミニアと交わる市民。',
      ko: '협력이나 거래로 누미니아와 교류하는 시민.',
      'pt-br': 'Cidadão em intercâmbio com Numinia: colaboração ou comércio.',
    },
  },
  {
    id: 'vernacular',
    level: 3,
    name: {
      es: 'Vernáculo',
      en: 'Vernacular',
      ja: 'ヴァナキュラー',
      ko: '버내큘러',
      'pt-br': 'Vernáculo',
    },
    description: {
      es: 'Parte del círculo de confianza de los Oráculos por su participación directa.',
      en: "Part of the Oracles' circle of trust through direct participation.",
      ja: '直接の貢献により託宣者たちの信頼の輪に入る者。',
      ko: '직접적인 참여로 오라클의 신뢰를 얻은 자.',
      'pt-br': 'Parte do círculo de confiança dos Oráculos por sua participação direta.',
    },
  },
  {
    id: 'archon',
    level: 4,
    name: { es: 'Arconte', en: 'Archon', ja: 'アルコン', ko: '아르콘', 'pt-br': 'Arconte' },
    description: {
      es: 'Del círculo más cercano a los Oráculos, con atribuciones de alto nivel.',
      en: 'Of the circle closest to the Oracles, with high-level attributions.',
      ja: '託宣者に最も近い輪に属し、高位の権能を持つ。',
      ko: '오라클과 가장 가까운 원에 속하며 높은 권한을 지닌다.',
      'pt-br': 'Do círculo mais próximo aos Oráculos, com atribuições de alto nível.',
    },
  },
  {
    id: 'oracle',
    level: 5,
    name: { es: 'Oráculo', en: 'Oracle', ja: 'オラクル', ko: '오라클', 'pt-br': 'Oráculo' },
    description: {
      es: 'Cofundador de la nueva Numinia y una de las fuerzas motrices de la ciudad.',
      en: "Co-founder of the new Numinia and one of the city's driving forces.",
      ja: '新生ヌミニアの共同創設者にして都市の原動力。',
      ko: '새로운 누미니아의 공동 창설자이자 도시의 원동력.',
      'pt-br': 'Cofundador da nova Numinia e uma das forças motrizes da cidade.',
    },
  },
];
