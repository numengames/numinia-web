/**
 * Session Zero constants — thresholds and seals (glossary §12–13).
 * Names follow the seminal About Session Zero; mottos are the portal legends.
 */

import type { Seal, Threshold } from '../types/seal.js';

export const THRESHOLDS: readonly Threshold[] = [
  {
    id: 'threshold-of-thought',
    guildId: 'exegetes',
    name: {
      es: 'Umbral del Pensamiento',
      en: 'Threshold of Thought',
      ja: '思索の門',
      ko: '사유의 문',
      'pt-br': 'Umbral do Pensamento',
    },
    description: {
      es: 'Más allá de este umbral, las palabras no se leen: se desentierran.',
      en: 'Beyond this threshold, words are not read: they are unearthed.',
      ja: 'この門の先では、言葉は読むものではなく掘り出すもの。',
      ko: '이 문 너머에서 말은 읽는 것이 아니라 발굴하는 것이다.',
      'pt-br': 'Além deste umbral, as palavras não se leem: desenterram-se.',
    },
  },
  {
    id: 'threshold-of-transformation',
    guildId: 'alchemists',
    name: {
      es: 'Umbral de la Transformación',
      en: 'Threshold of Transformation',
      ja: '変容の門',
      ko: '변용의 문',
      'pt-br': 'Umbral da Transformação',
    },
    description: {
      es: 'Nada sale como entró.',
      en: 'Nothing leaves as it entered.',
      ja: '入った時のままで出られるものは何もない。',
      ko: '들어온 그대로 나가는 것은 없다.',
      'pt-br': 'Nada sai como entrou.',
    },
  },
  {
    id: 'threshold-of-justice',
    guildId: 'procurators',
    name: {
      es: 'Umbral de la Justicia',
      en: 'Threshold of Justice',
      ja: '正義の門',
      ko: '정의의 문',
      'pt-br': 'Umbral da Justiça',
    },
    description: {
      es: 'Pisa con cuidado: cada decisión dejará una marca.',
      en: 'Step carefully: every decision here will leave a mark.',
      ja: '慎重に歩め。ここでの決断はすべて痕を残す。',
      ko: '조심히 걸어라 — 여기서의 모든 결정은 자국을 남긴다.',
      'pt-br': 'Pise com cuidado: cada decisão aqui deixará uma marca.',
    },
  },
  {
    id: 'threshold-of-valor',
    guildId: 'sentinels',
    name: {
      es: 'Umbral del Valor',
      en: 'Threshold of Valor',
      ja: '勇気の門',
      ko: '용기의 문',
      'pt-br': 'Umbral do Valor',
    },
    description: {
      es: 'Aquí no se lucha por gloria, sino por lo que debe ser protegido.',
      en: 'Here one does not fight for glory, but for what must be protected.',
      ja: 'ここで戦うのは栄光のためではなく、守るべきもののため。',
      ko: '여기서는 영광이 아니라 지켜야 할 것을 위해 싸운다.',
      'pt-br': 'Aqui não se luta por glória, mas pelo que deve ser protegido.',
    },
  },
];

export const SEALS: readonly Seal[] = [
  {
    id: 'seal-of-culture',
    thresholdId: 'threshold-of-thought',
    obtainedBy: 'chest',
    name: {
      es: 'Sello de la Cultura',
      en: 'Seal of Culture',
      ja: '文化の印章',
      ko: '문화의 인장',
      'pt-br': 'Selo da Cultura',
    },
    description: {
      es: 'Recompensa del cofre en el Umbral del Pensamiento.',
      en: 'The chest reward of the Threshold of Thought.',
      ja: '思索の門の宝箱より得られる印。',
      ko: '사유의 문의 보물 상자에서 얻는 인장.',
      'pt-br': 'Recompensa do baú no Umbral do Pensamento.',
    },
  },
  {
    id: 'seal-of-wisdom',
    thresholdId: 'threshold-of-thought',
    obtainedBy: 'challenge',
    name: {
      es: 'Sello de la Sabiduría',
      en: 'Seal of Wisdom',
      ja: '知恵の印章',
      ko: '지혜의 인장',
      'pt-br': 'Selo da Sabedoria',
    },
    description: {
      es: 'Se gana alcanzando la Morada del Eco en el Umbral del Pensamiento.',
      en: 'Earned by reaching the Dwelling of the Echo in the Threshold of Thought.',
      ja: '思索の門で「こだまの住処」に至り得られる印。',
      ko: '사유의 문에서 메아리의 거처에 닿아야 얻는 인장.',
      'pt-br': 'Ganha-se alcançando a Morada do Eco no Umbral do Pensamento.',
    },
  },
  {
    id: 'seal-of-transformation',
    thresholdId: 'threshold-of-transformation',
    obtainedBy: 'chest',
    name: {
      es: 'Sello de la Transformación',
      en: 'Seal of Transformation',
      ja: '変容の印章',
      ko: '변용의 인장',
      'pt-br': 'Selo da Transformação',
    },
    description: {
      es: 'Recompensa del cofre en el Umbral de la Transformación.',
      en: 'The chest reward of the Threshold of Transformation.',
      ja: '変容の門の宝箱より得られる印。',
      ko: '변용의 문의 보물 상자에서 얻는 인장.',
      'pt-br': 'Recompensa do baú no Umbral da Transformação.',
    },
  },
  {
    id: 'seal-of-creativity',
    thresholdId: 'threshold-of-transformation',
    obtainedBy: 'challenge',
    name: {
      es: 'Sello de la Creatividad',
      en: 'Seal of Creativity',
      ja: '創造の印章',
      ko: '창조의 인장',
      'pt-br': 'Selo da Criatividade',
    },
    description: {
      es: 'Se gana alcanzando la Morada del Eco en el Umbral de la Transformación.',
      en: 'Earned by reaching the Dwelling of the Echo in the Threshold of Transformation.',
      ja: '変容の門で「こだまの住処」に至り得られる印。',
      ko: '변용의 문에서 메아리의 거처에 닿아야 얻는 인장.',
      'pt-br': 'Ganha-se alcançando a Morada do Eco no Umbral da Transformação.',
    },
  },
  {
    id: 'seal-of-justice',
    thresholdId: 'threshold-of-justice',
    obtainedBy: 'chest',
    name: {
      es: 'Sello de la Justicia',
      en: 'Seal of Justice',
      ja: '正義の印章',
      ko: '정의의 인장',
      'pt-br': 'Selo da Justiça',
    },
    description: {
      es: 'Recompensa del cofre en el Umbral de la Justicia.',
      en: 'The chest reward of the Threshold of Justice.',
      ja: '正義の門の宝箱より得られる印。',
      ko: '정의의 문의 보물 상자에서 얻는 인장.',
      'pt-br': 'Recompensa do baú no Umbral da Justiça.',
    },
  },
  {
    id: 'seal-of-valor',
    thresholdId: 'threshold-of-justice',
    obtainedBy: 'challenge',
    name: {
      es: 'Sello del Valor',
      en: 'Seal of Valor',
      ja: '勇気の印章',
      ko: '용기의 인장',
      'pt-br': 'Selo do Valor',
    },
    description: {
      es: 'Se gana alcanzando la Morada del Eco en el Umbral de la Justicia.',
      en: 'Earned by reaching the Dwelling of the Echo in the Threshold of Justice.',
      ja: '正義の門で「こだまの住処」に至り得られる印。',
      ko: '정의의 문에서 메아리의 거처에 닿아야 얻는 인장.',
      'pt-br': 'Ganha-se alcançando a Morada do Eco no Umbral da Justiça.',
    },
  },
  {
    id: 'seal-of-protection',
    thresholdId: 'threshold-of-valor',
    obtainedBy: 'chest',
    name: {
      es: 'Sello de la Protección',
      en: 'Seal of Protection',
      ja: '守護の印章',
      ko: '수호의 인장',
      'pt-br': 'Selo da Proteção',
    },
    description: {
      es: 'Recompensa del cofre en el Umbral del Valor.',
      en: 'The chest reward of the Threshold of Valor.',
      ja: '勇気の門の宝箱より得られる印。',
      ko: '용기의 문의 보물 상자에서 얻는 인장.',
      'pt-br': 'Recompensa do baú no Umbral do Valor.',
    },
  },
  {
    id: 'seal-of-balance',
    thresholdId: 'threshold-of-valor',
    obtainedBy: 'challenge',
    name: {
      es: 'Sello del Equilibrio',
      en: 'Seal of Balance',
      ja: '均衡の印章',
      ko: '균형의 인장',
      'pt-br': 'Selo do Equilíbrio',
    },
    description: {
      es: 'Se gana alcanzando la Morada del Eco en el Umbral del Valor.',
      en: 'Earned by reaching the Dwelling of the Echo in the Threshold of Valor.',
      ja: '勇気の門で「こだまの住処」に至り得られる印。',
      ko: '용기의 문에서 메아리의 거처에 닿아야 얻는 인장.',
      'pt-br': 'Ganha-se alcançando a Morada do Eco no Umbral do Valor.',
    },
  },
];

/** Chest seals grant citizenship; all eight reforged grant the Cyberdog avatar. */
export const CITIZENSHIP_SEAL_COUNT = 4;
export const CYBERDOG_SEAL_COUNT = 8;
