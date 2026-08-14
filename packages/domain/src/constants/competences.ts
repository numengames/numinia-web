/**
 * Competence constants — nine skills in three domains (glossary §8).
 */

import type { Competence, CompetenceDomain } from '../types/competence.js';

export const COMPETENCE_DOMAINS: readonly CompetenceDomain[] = [
  {
    id: 'engineering-construction',
    name: {
      es: 'Ingeniería y Construcción',
      en: 'Engineering and Construction',
      ja: '工学と建設',
      ko: '공학과 건설',
      'pt-br': 'Engenharia e Construção',
    },
  },
  {
    id: 'security-protection',
    name: {
      es: 'Seguridad y Protección',
      en: 'Security and Protection',
      ja: '防御と保護',
      ko: '보안과 보호',
      'pt-br': 'Segurança e Proteção',
    },
  },
  {
    id: 'communication-connection',
    name: {
      es: 'Comunicación y Conexión',
      en: 'Communication and Connection',
      ja: '伝達と接続',
      ko: '소통과 연결',
      'pt-br': 'Comunicação e Conexão',
    },
  },
];

export const COMPETENCES: readonly Competence[] = [
  {
    id: 'technomancy',
    domainId: 'engineering-construction',
    name: {
      es: 'Tecnomancia',
      en: 'Technomancy',
      ja: 'テクノマンシー',
      ko: '테크노맨시',
      'pt-br': 'Tecnomancia',
    },
    description: {
      es: 'Manipulación y control de sistemas digitales avanzados.',
      en: 'Manipulation and control of advanced digital systems.',
      ja: '高度なデジタル系統の操作と制御。',
      ko: '고도의 디지털 시스템 조작과 제어.',
      'pt-br': 'Manipulação e controle de sistemas digitais avançados.',
    },
  },
  {
    id: 'advanced-forging',
    domainId: 'engineering-construction',
    name: {
      es: 'Forja Avanzada',
      en: 'Advanced Forging',
      ja: '上位鍛造',
      ko: '고급 단조',
      'pt-br': 'Forja Avançada',
    },
    description: {
      es: 'Creación y mejora de artefactos tecnológicos.',
      en: 'Creation and improvement of technological artifacts.',
      ja: '技術遺物の創造と強化。',
      ko: '기술 유물의 창조와 개량.',
      'pt-br': 'Criação e aprimoramento de artefatos tecnológicos.',
    },
  },
  {
    id: 'virtual-architecture',
    domainId: 'engineering-construction',
    name: {
      es: 'Arquitectura Virtual',
      en: 'Virtual Architecture',
      ja: '仮想建築',
      ko: '가상 건축',
      'pt-br': 'Arquitetura Virtual',
    },
    description: {
      es: 'Diseño y optimización de infraestructuras físicas y virtuales.',
      en: 'Design and optimization of physical and virtual infrastructures.',
      ja: '物理・仮想インフラの設計と最適化。',
      ko: '물리·가상 기반 구조의 설계와 최적화.',
      'pt-br': 'Design e otimização de infraestruturas físicas e virtuais.',
    },
  },
  {
    id: 'defensive-networks',
    domainId: 'security-protection',
    name: {
      es: 'Redes Defensivas',
      en: 'Defensive Networks',
      ja: '防御網',
      ko: '방어망',
      'pt-br': 'Redes Defensivas',
    },
    description: {
      es: 'Creación y mantenimiento de protocolos de seguridad.',
      en: 'Creation and maintenance of security protocols.',
      ja: '防護プロトコルの構築と維持。',
      ko: '보안 프로토콜의 구축과 유지.',
      'pt-br': 'Criação e manutenção de protocolos de segurança.',
    },
  },
  {
    id: 'chronomancy',
    domainId: 'security-protection',
    name: {
      es: 'Cronomancia',
      en: 'Chronomancy',
      ja: 'クロノマンシー',
      ko: '크로노맨시',
      'pt-br': 'Cronomancia',
    },
    description: {
      es: 'Control del flujo temporal en acciones estratégicas.',
      en: 'Control of the temporal flow in strategic actions.',
      ja: '戦略的行動における時間流の制御。',
      ko: '전략적 행동에서의 시간 흐름 제어.',
      'pt-br': 'Controle do fluxo temporal em ações estratégicas.',
    },
  },
  {
    id: 'cryptology',
    domainId: 'security-protection',
    name: {
      es: 'Criptología',
      en: 'Cryptology',
      ja: '暗号学',
      ko: '암호학',
      'pt-br': 'Criptologia',
    },
    description: {
      es: 'Recuperación y análisis de artefactos antiguos y digitales.',
      en: 'Recovery and analysis of ancient and digital artifacts.',
      ja: '古代・デジタル遺物の復元と解析。',
      ko: '고대·디지털 유물의 복원과 분석.',
      'pt-br': 'Recuperação e análise de artefatos antigos e digitais.',
    },
  },
  {
    id: 'decoding',
    domainId: 'communication-connection',
    name: {
      es: 'Descodificación',
      en: 'Decoding',
      ja: '解読',
      ko: '해독',
      'pt-br': 'Decodificação',
    },
    description: {
      es: 'Interpretación de textos encriptados y lenguajes arcanos.',
      en: 'Interpretation of encrypted texts and arcane languages.',
      ja: '暗号文と秘言語の解釈。',
      ko: '암호문과 비의의 언어 해석.',
      'pt-br': 'Interpretação de textos criptografados e línguas arcanas.',
    },
  },
  {
    id: 'neural-vision',
    domainId: 'communication-connection',
    name: {
      es: 'Visión Neural',
      en: 'Neural Vision',
      ja: '神経視覚',
      ko: '신경 시각',
      'pt-br': 'Visão Neural',
    },
    description: {
      es: 'Gestión avanzada de redes de información y relaciones sociales.',
      en: 'Advanced handling of information networks and social relations.',
      ja: '情報網と人間関係の高度な把握。',
      ko: '정보망과 사회적 관계의 고도 운용.',
      'pt-br': 'Gestão avançada de redes de informação e relações sociais.',
    },
  },
  {
    id: 'luminous-projection',
    domainId: 'communication-connection',
    name: {
      es: 'Proyección Lumínica',
      en: 'Luminous Projection',
      ja: '光投影',
      ko: '광투영',
      'pt-br': 'Projeção Luminosa',
    },
    description: {
      es: 'Manipulación de luz y energía para ilusiones y defensas.',
      en: 'Manipulation of light and energy for illusions and defenses.',
      ja: '幻影と防御のための光と力の操作。',
      ko: '환영과 방어를 위한 빛과 에너지 조작.',
      'pt-br': 'Manipulação de luz e energia para ilusões e defesas.',
    },
  },
];
