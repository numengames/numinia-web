/**
 * Pillar pages copy (MISSION-004): the Assets hub and the L.A.P. — platform
 * UI text, so fully localized in the 5 locales (not deep lore).
 */

import type { SupportedLocale } from '@numinia/domain';

export interface AssetsHubMessages {
  readonly assetsTitle: string;
  readonly assetsIntro: string;
  readonly resourcesCard: string;
}

export const ASSETS_HUB_MESSAGES: Readonly<Record<SupportedLocale, AssetsHubMessages>> = {
  es: {
    assetsTitle: 'Assets',
    assetsIntro:
      'Los bienes digitales de Numinia para construir mundos: avatares, modelos, escenarios, audio y más — todos CC0, en formatos abiertos.',
    resourcesCard: 'Recursos: guías sobre formatos, licencias y filosofía del proyecto.',
  },
  en: {
    assetsTitle: 'Assets',
    assetsIntro:
      'Numinia’s digital goods for building worlds: avatars, models, scenes, audio and more — all CC0, in open formats.',
    resourcesCard: 'Resources: guides on formats, licenses, and the project philosophy.',
  },
  ja: {
    assetsTitle: 'アセット',
    assetsIntro:
      '世界を作るためのヌミニアのデジタルグッズ:アバター、モデル、シーン、オーディオなど — すべてCC0、オープンフォーマット。',
    resourcesCard: 'リソース:フォーマット、ライセンス、プロジェクト哲学のガイド。',
  },
  ko: {
    assetsTitle: '에셋',
    assetsIntro:
      '월드를 만들기 위한 누미니아의 디지털 굿즈: 아바타, 모델, 씬, 오디오 등 — 전부 CC0, 개방형 포맷.',
    resourcesCard: '리소스: 포맷, 라이선스, 프로젝트 철학 가이드.',
  },
  'pt-br': {
    assetsTitle: 'Assets',
    assetsIntro:
      'Os bens digitais de Numinia para construir mundos: avatares, modelos, cenários, áudio e mais — todos CC0, em formatos abertos.',
    resourcesCard: 'Recursos: guias sobre formatos, licenças e a filosofia do projeto.',
  },
};

export interface LapMessages {
  readonly lapTitle: string;
  readonly lapIntro: string;
  readonly lapBody: string;
  readonly ranksTitle: string;
  readonly ranksIntro: string;
  readonly statusTitle: string;
  readonly statusBody: string;
  readonly updatesNote: string;
}

export const LAP_MESSAGES: Readonly<Record<SupportedLocale, LapMessages>> = {
  es: {
    lapTitle: 'L.A.P.',
    lapIntro: 'El área del jugador: tu puerta al juego virtual y a tu información de ciudadano.',
    lapBody:
      'Desde el L.A.P. accederás al juego, a tu ficha de personaje (especie, gremio, facción y rol), a tu botín y a tus estadísticas. Es el espacio privado de cada numínido dentro de la ciudad.',
    ranksTitle: 'Los rangos',
    ranksIntro:
      'La condición de numínido no es estática: cada rango representa una forma diferente de contribuir al desarrollo de Numinia.',
    statusTitle: 'Estado',
    statusBody:
      'La entrada al L.A.P. requiere ciudadanía. La identidad soberana (Web2 → Web3) está en construcción: cuando se abra, empezarás como Nómada y cruzarás la Sesión Cero para hacerte Ciudadano.',
    updatesNote: 'Mientras tanto, puedes seguir el progreso de la plataforma en Actualizaciones.',
  },
  en: {
    lapTitle: 'L.A.P.',
    lapIntro: 'The player area: your door to the virtual game and your citizen information.',
    lapBody:
      'From the L.A.P. you will access the game, your character sheet (species, guild, faction, and role), your loot, and your stats. It is every numinid’s private space within the city.',
    ranksTitle: 'The ranks',
    ranksIntro:
      'Being numinid is not static: each rank represents a different way of contributing to Numinia’s development.',
    statusTitle: 'Status',
    statusBody:
      'Entering the L.A.P. requires citizenship. Sovereign identity (Web2 → Web3) is under construction: when it opens, you will start as a Nomad and cross Session Zero to become a Citizen.',
    updatesNote: 'Meanwhile, you can follow the platform’s progress in Updates.',
  },
  ja: {
    lapTitle: 'L.A.P.',
    lapIntro: 'プレイヤーエリア:仮想ゲームと市民情報への入り口。',
    lapBody:
      'L.A.P.からゲーム、キャラクターシート(種族・ギルド・派閥・ロール)、戦利品、統計にアクセスできます。都市における各ヌミニドの私的空間です。',
    ranksTitle: 'ランク',
    ranksIntro:
      'ヌミニドであることは静的ではありません。各ランクはヌミニアの発展に貢献する異なる形を表します。',
    statusTitle: 'ステータス',
    statusBody:
      'L.A.P.への入場には市民権が必要です。ソブリンID(Web2→Web3)は構築中:公開されたら、放浪者として始まり、セッションゼロを越えて市民になります。',
    updatesNote: 'それまでの間、プラットフォームの進捗は更新履歴で確認できます。',
  },
  ko: {
    lapTitle: 'L.A.P.',
    lapIntro: '플레이어 구역: 가상 게임과 시민 정보로 가는 문.',
    lapBody:
      'L.A.P.에서 게임, 캐릭터 시트(종족·길드·파벌·역할), 전리품, 통계에 접근합니다. 도시 안 모든 누미니드의 사적 공간입니다.',
    ranksTitle: '랭크',
    ranksIntro:
      '누미니드라는 조건은 고정되어 있지 않습니다. 각 랭크는 누미니아 발전에 기여하는 서로 다른 방식을 나타냅니다.',
    statusTitle: '상태',
    statusBody:
      'L.A.P. 입장에는 시민권이 필요합니다. 주권 신원(Web2→Web3)은 구축 중입니다. 열리면 유랑자로 시작해 세션 제로를 거쳐 시민이 됩니다.',
    updatesNote: '그동안 플랫폼 진행 상황은 업데이트에서 확인할 수 있습니다.',
  },
  'pt-br': {
    lapTitle: 'L.A.P.',
    lapIntro: 'A área do jogador: sua porta para o jogo virtual e suas informações de cidadão.',
    lapBody:
      'Do L.A.P. você acessará o jogo, sua ficha de personagem (espécie, guilda, facção e papel), seu loot e suas estatísticas. É o espaço privado de cada numínido dentro da cidade.',
    ranksTitle: 'Os ranks',
    ranksIntro:
      'A condição de numínido não é estática: cada rank representa uma forma diferente de contribuir para o desenvolvimento de Numinia.',
    statusTitle: 'Status',
    statusBody:
      'Entrar no L.A.P. requer cidadania. A identidade soberana (Web2 → Web3) está em construção: quando abrir, você começará como Nômade e cruzará a Sessão Zero para se tornar Cidadão.',
    updatesNote: 'Enquanto isso, acompanhe o progresso da plataforma em Atualizações.',
  },
};
