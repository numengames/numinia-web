/**
 * Archetype constants — twelve Pearson/Jung archetypes (glossary §9).
 * Guild/faction alignments from the RPG manual, chapter 3, fragment 5:
 * every guild and every faction aligns with exactly three archetypes.
 */

import type { Archetype } from '../types/archetype.js';

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: 'innocent',
    alignedGuilds: ['sentinels'],
    alignedFactions: ['heirs-of-eleusis'],
    name: { es: 'Inocente', en: 'Innocent', ja: '無垢なる者', ko: '순수한 자', 'pt-br': 'Inocente' },
    description: {
      es: 'La esperanza pura y la confianza esencial.',
      en: 'Pure hope and essential trust.',
      ja: '純粋な希望と根源的な信頼。',
      ko: '순수한 희망과 본질적인 신뢰.',
      'pt-br': 'A esperança pura e a confiança essencial.',
    },
  },
  {
    id: 'orphan',
    alignedGuilds: ['procurators'],
    alignedFactions: ['hermeticists'],
    name: { es: 'Huérfano', en: 'Orphan', ja: '孤児', ko: '고아', 'pt-br': 'Órfão' },
    description: {
      es: 'El realismo empático de quien fue herido pronto.',
      en: 'The empathic realism of one wounded early.',
      ja: '早くに傷ついた者の共感的な現実主義。',
      ko: '일찍 상처 입은 자의 공감적 현실주의.',
      'pt-br': 'O realismo empático de quem foi ferido cedo.',
    },
  },
  {
    id: 'warrior',
    alignedGuilds: ['procurators'],
    alignedFactions: ['neo-atlantists'],
    name: { es: 'Guerrero', en: 'Warrior', ja: '戦士', ko: '전사', 'pt-br': 'Guerreiro' },
    description: {
      es: 'La fuerza decidida que lucha por metas claras.',
      en: 'The resolute force that fights for clear goals.',
      ja: '明確な目標のために戦う決然たる力。',
      ko: '뚜렷한 목표를 위해 싸우는 결연한 힘.',
      'pt-br': 'A força decidida que luta por metas claras.',
    },
  },
  {
    id: 'caregiver',
    alignedGuilds: ['sentinels'],
    alignedFactions: ['stellar-circle'],
    name: { es: 'Cuidador', en: 'Caregiver', ja: '慈しむ者', ko: '돌보는 자', 'pt-br': 'Cuidador' },
    description: {
      es: 'La compasión hecha acción.',
      en: 'Compassion made action.',
      ja: '行動となった慈悲。',
      ko: '행동이 된 연민.',
      'pt-br': 'A compaixão feita ação.',
    },
  },
  {
    id: 'explorer',
    alignedGuilds: ['exegetes'],
    alignedFactions: ['neo-atlantists'],
    name: { es: 'Explorador', en: 'Explorer', ja: '探検家', ko: '탐험가', 'pt-br': 'Explorador' },
    description: {
      es: 'La voz interior que anhela lo nuevo y lo auténtico.',
      en: 'The inner voice that longs for the new and the authentic.',
      ja: '新しさと真正さを求める内なる声。',
      ko: '새로움과 진정성을 갈망하는 내면의 목소리.',
      'pt-br': 'A voz interior que anseia pelo novo e pelo autêntico.',
    },
  },
  {
    id: 'destroyer',
    alignedGuilds: ['alchemists'],
    alignedFactions: ['heirs-of-eleusis'],
    name: { es: 'Destructor', en: 'Destroyer', ja: '破壊者', ko: '파괴자', 'pt-br': 'Destruidor' },
    description: {
      es: 'La furia que rompe lo caduco para dar paso a lo nuevo.',
      en: 'The fury that breaks the worn-out to make way for the new.',
      ja: '古びたものを砕き、新しきに道を開く怒り。',
      ko: '낡은 것을 부수어 새로움에 길을 여는 분노.',
      'pt-br': 'A fúria que rompe o caduco para dar passagem ao novo.',
    },
  },
  {
    id: 'lover',
    alignedGuilds: ['sentinels'],
    alignedFactions: ['stellar-circle'],
    name: { es: 'Amante', en: 'Lover', ja: '愛する者', ko: '사랑하는 자', 'pt-br': 'Amante' },
    description: {
      es: 'El fuego del vínculo profundo.',
      en: 'The fire of the deep bond.',
      ja: '深い絆の炎。',
      ko: '깊은 유대의 불꽃.',
      'pt-br': 'O fogo do vínculo profundo.',
    },
  },
  {
    id: 'creator',
    alignedGuilds: ['alchemists'],
    alignedFactions: ['neo-atlantists'],
    name: { es: 'Creador', en: 'Creator', ja: '創造者', ko: '창조자', 'pt-br': 'Criador' },
    description: {
      es: 'La chispa que transforma la visión en forma.',
      en: 'The spark that turns vision into form.',
      ja: '幻視を形に変える火花。',
      ko: '비전을 형태로 바꾸는 불꽃.',
      'pt-br': 'A centelha que transforma a visão em forma.',
    },
  },
  {
    id: 'ruler',
    alignedGuilds: ['procurators'],
    alignedFactions: ['stellar-circle'],
    name: { es: 'Gobernante', en: 'Ruler', ja: '統治者', ko: '통치자', 'pt-br': 'Governante' },
    description: {
      es: 'El liderazgo que estructura y protege.',
      en: 'The leadership that structures and protects.',
      ja: '構造を与え守る指導力。',
      ko: '구조를 세우고 보호하는 지도력.',
      'pt-br': 'A liderança que estrutura e protege.',
    },
  },
  {
    id: 'magician',
    alignedGuilds: ['alchemists'],
    alignedFactions: ['hermeticists'],
    name: { es: 'Mago', en: 'Magician', ja: '魔術師', ko: '마법사', 'pt-br': 'Mago' },
    description: {
      es: 'El alquimista del alma que transforma realidades.',
      en: 'The alchemist of the soul who transforms realities.',
      ja: '現実を変容させる魂の錬金術師。',
      ko: '현실을 변모시키는 영혼의 연금술사.',
      'pt-br': 'O alquimista da alma que transforma realidades.',
    },
  },
  {
    id: 'sage',
    alignedGuilds: ['exegetes'],
    alignedFactions: ['hermeticists'],
    name: { es: 'Sabio', en: 'Sage', ja: '賢者', ko: '현자', 'pt-br': 'Sábio' },
    description: {
      es: 'El faro que busca la verdad como camino a la libertad.',
      en: 'The beacon that seeks truth as the road to freedom.',
      ja: '自由への道として真理を求める灯台。',
      ko: '자유로 가는 길로서 진리를 찾는 등대.',
      'pt-br': 'O farol que busca a verdade como caminho para a liberdade.',
    },
  },
  {
    id: 'jester',
    alignedGuilds: ['exegetes'],
    alignedFactions: ['heirs-of-eleusis'],
    name: { es: 'Bufón', en: 'Jester', ja: '道化師', ko: '광대', 'pt-br': 'Bufão' },
    description: {
      es: 'La risa que disuelve el peso del mundo.',
      en: 'The laughter that dissolves the weight of the world.',
      ja: '世界の重さを溶かす笑い。',
      ko: '세상의 무게를 녹이는 웃음.',
      'pt-br': 'O riso que dissolve o peso do mundo.',
    },
  },
];
