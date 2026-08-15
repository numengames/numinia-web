/**
 * L.A.P. UI strings (MISSION-008) — shell sections, the character sheet,
 * and honest empty states. Five locales like every UI string (ADR-001);
 * identity option NAMES come localized from @numinia/domain, not from here.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface LapMessages {
  readonly sections: {
    readonly overview: string;
    readonly character: string;
    readonly codex: string;
    readonly portals: string;
    readonly loot: string;
    readonly seasons: string;
    readonly stats: string;
    readonly updates: string;
    readonly settings: string;
  };
  readonly foldNav: string;
  readonly adminGroup: string;
  readonly admin: {
    readonly assets: string;
    readonly assetsIntro: string;
    readonly forbidden: string;
    readonly forbiddenNote: string;
    readonly loading: string;
    readonly search: string;
    readonly all: string;
    readonly name: string;
    readonly format: string;
    readonly category: string;
    readonly storage: string;
    readonly created: string;
    readonly count: string;
    readonly readOnly: string;
  };
  readonly census: {
    readonly title: string;
    readonly intro: string;
    readonly walletPlaceholder: string;
    readonly lookup: string;
    readonly notFound: string;
    readonly unconfigured: string;
    readonly invalidWallet: string;
    readonly currentRank: string;
    readonly since: string;
    readonly updatedBy: string;
    readonly grant: string;
    readonly granted: string;
    readonly failed: string;
  };
  readonly citizen: {
    readonly title: string;
    readonly noSession: string;
    readonly rankLabel: string;
    readonly seals: string;
    readonly prisma: string;
    readonly enter: string;
    readonly dashboardIntro: string;
  };
  readonly stats: {
    readonly title: string;
    readonly intro: string;
    readonly totalAssets: string;
    readonly projects: string;
    readonly byFormat: string;
    readonly storageLayers: string;
    readonly redundancy: string;
    readonly redundant: string;
    readonly single: string;
  };
  readonly portals: {
    readonly title: string;
    readonly intro: string;
    readonly openPortals: string;
    readonly mapAria: string;
    readonly hub: string;
    readonly enter: string;
    readonly unbuilt: string;
  };
  readonly manual: {
    readonly tab: string;
    readonly identitiesTab: string;
    readonly title: string;
    readonly intro: string;
    readonly chapter: string;
    readonly esNote: string;
    readonly prev: string;
    readonly next: string;
    readonly indexTitle: string;
    readonly gated: string;
    readonly gatedNote: string;
    readonly gatedAction: string;
  };
  readonly sheet: {
    readonly title: string;
    readonly fileNote: string;
    readonly edit: string;
    readonly done: string;
    readonly exportMd: string;
    readonly exportPdf: string;
    readonly importMd: string;
    readonly importError: string;
    readonly roll: string;
    readonly total: string;
    readonly none: string;
    readonly identity: string;
    readonly attributes: string;
    readonly values: string;
    readonly competences: string;
    readonly profile: string;
    readonly notes: string;
    readonly fields: Readonly<Record<string, string>>;
  };
  readonly emptyTitle: string;
  readonly emptyPortals: string;
  readonly emptyLoot: string;
  readonly emptySeasons: string;
  readonly codexTitle: string;
  readonly codexIntro: string;
  readonly codexGroups: {
    readonly species: string;
    readonly guilds: string;
    readonly factions: string;
    readonly districts: string;
    readonly archetypes: string;
    readonly humors: string;
    readonly competences: string;
  };
}

const FIELDS_EN = {
  name: 'Name',
  player: 'Player',
  species: 'Species',
  position: 'Position',
  guild: 'Guild',
  branch: 'Branch',
  house: 'House',
  faction: 'Faction',
  district: 'District',
  archetype: 'Archetype',
  humor: 'Humor',
  wallet: 'Wallet',
  dialect: 'Dialect',
  sociolect: 'Sociolect',
  lingo: 'Lingo',
  idiolect: 'Idiolect',
  weapons: 'Weapons',
  relics: 'Relics',
  strength: 'Strength',
  movement: 'Movement',
  size: 'Size',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  perception: 'Perception',
  charisma: 'Charisma',
  threshold: 'Threshold',
  veilBreath: 'Veil breath',
  initiative: 'Initiative',
  energy: 'Energy',
  prestige: 'Prestige',
  prisma: 'Prisma',
} as const;

const FIELDS_ES = {
  name: 'Nombre',
  player: 'Jugador',
  species: 'Especie',
  position: 'Posición',
  guild: 'Gremio',
  branch: 'Rama',
  house: 'Casa',
  faction: 'Facción',
  district: 'Distrito',
  archetype: 'Arquetipo',
  humor: 'Humor',
  wallet: 'Wallet',
  dialect: 'Dialecto',
  sociolect: 'Sociolecto',
  lingo: 'Jerga',
  idiolect: 'Idiolecto',
  weapons: 'Armas',
  relics: 'Reliquias',
  strength: 'Fuerza',
  movement: 'Movimiento',
  size: 'Tamaño',
  constitution: 'Constitución',
  intelligence: 'Inteligencia',
  wisdom: 'Sabiduría',
  perception: 'Percepción',
  charisma: 'Carisma',
  threshold: 'Umbral',
  veilBreath: 'Aliento del velo',
  initiative: 'Iniciativa',
  energy: 'Energía',
  prestige: 'Prestigio',
  prisma: 'Prisma',
} as const;

export const LAP_UI: Readonly<Record<SupportedLocale, LapMessages>> = {
  es: {
    sections: {
      overview: 'Resumen',
      character: 'Personaje',
      codex: 'Códice',
      portals: 'Portales',
      loot: 'Botín',
      seasons: 'Temporadas',
      stats: 'Estadísticas',
      updates: 'Novedades',
      settings: 'Ajustes',
    },
    sheet: {
      title: 'Ficha de personaje',
      fileNote:
        'Tu ficha es un archivo tuyo: expórtala como Markdown y guárdala donde quieras. Nada se almacena en servidores.',
      edit: 'Editar ficha',
      done: 'Terminar edición',
      exportMd: 'Exportar .md',
      exportPdf: 'Exportar PDF',
      importMd: 'Importar .md',
      importError:
        'Ese archivo no parece una ficha de Numinia. Revisa el formato e inténtalo de nuevo.',
      roll: 'Tirar',
      total: 'Total',
      none: '—',
      identity: 'Identidad',
      attributes: 'Atributos',
      values: 'Valores',
      competences: 'Competencias',
      profile: 'Perfil',
      notes: 'Notas',
      fields: FIELDS_ES,
    },
    foldNav: 'Plegar o desplegar la navegación',
    adminGroup: 'Gestión',
    admin: {
      assets: 'Assets',
      assetsIntro:
        'Todo lo que la ciudad custodia: formato, categoría y en qué capas vive cada binario.',
      forbidden: 'Zona de Oráculos',
      forbiddenNote:
        'Esta sala pide rango de Archonte o superior. Entra con la cartera que lo tiene y volverá a abrirse.',
      loading: 'Consultando el archivo…',
      search: 'Buscar por nombre o id…',
      all: 'Todos',
      name: 'Nombre',
      format: 'Formato',
      category: 'Categoría',
      storage: 'Almacenamiento',
      created: 'Creado',
      count: 'assets',
      readOnly:
        'Solo lectura: escribir en el repositorio de datos necesita su propia decisión (ADR de escritura).',
    },
    census: {
      title: 'Censo',
      intro:
        'El registro público de rangos: busca una wallet y concede lo que la ciudad decida. Cada concesión queda escrita en la historia.',
      walletPlaceholder: '0x…',
      lookup: 'Buscar',
      notFound: 'Sin registro: nómada de paso.',
      unconfigured: 'El censo aún no está configurado (falta el repositorio de estado — D23).',
      invalidWallet: 'Eso no es una dirección 0x válida.',
      currentRank: 'Rango',
      since: 'Desde',
      updatedBy: 'Última pluma',
      grant: 'Conceder',
      granted: 'Concedido — escrito en la historia.',
      failed: 'No se pudo. Revisa e inténtalo de nuevo.',
    },
    citizen: {
      title: 'Tu ciudadanía',
      noSession: 'Sin sesión — nómada de paso',
      rankLabel: 'Rango',
      seals: 'Sellos',
      prisma: 'Prisma',
      enter: 'Entrar en Numinia',
      dashboardIntro:
        'Tu puesto en la ciudad: quién eres, qué llevas y qué puertas tienes abiertas.',
    },
    stats: {
      title: 'Estadísticas del Archivo',
      intro: 'Números reales del catálogo público — lo que hay, dónde vive y cuán a salvo está.',
      totalAssets: 'Assets públicos',
      projects: 'Proyectos',
      byFormat: 'Por formato',
      storageLayers: 'Capas de almacenamiento',
      redundancy: 'Salud de redundancia',
      redundant: 'Redundantes',
      single: 'Punto único',
    },
    portals: {
      title: 'Portales de Numinia',
      intro:
        'El mapa de la ciudad: cuatro distritos alrededor de la Plaza del Ágora. Cada portal abre un mundo virtual; los atenuados aún no se han construido.',
      openPortals: 'Portales abiertos',
      mapAria: 'Mapa de portales de la ciudad',
      hub: 'Nodo central',
      enter: 'Entrar al mundo',
      unbuilt: 'Próximamente',
    },
    manual: {
      tab: 'El Manual',
      identitiesTab: 'Identidades',
      title: 'El Manual de Numinia',
      intro:
        'El juego de rol completo, tal como lo escribió su autor — el texto fundacional de la ciudad.',
      chapter: 'Capítulo',
      esNote: '',
      prev: 'Anterior',
      next: 'Siguiente',
      indexTitle: 'Índice',
      gated: 'El Manual pide sesión',
      gatedNote:
        'El juego de rol completo se lee dentro de la ciudad: entra con lo que ya tienes y el Códice se abre.',
      gatedAction: 'Entrar en Numinia',
    },
    emptyTitle: 'Aún no hay nada aquí',
    emptyPortals:
      'Los portales se cartografían con la Fase 5. El mapa llegará antes que la niebla.',
    emptyLoot: 'El botín llega con las Temporadas (Fase 3). Lo que ganes, será tuyo.',
    emptySeasons: 'Las Temporadas encienden la Fase 3: aventuras, rituales y recompensas.',
    codexTitle: 'Códice de identidades',
    codexIntro:
      'Las formas de pertenecer a Numinia: quién eres, qué sabes, qué persigues — tal y como las registra el modelo de la ciudad.',
    codexGroups: {
      species: 'Especies',
      guilds: 'Gremios',
      factions: 'Facciones',
      districts: 'Distritos',
      archetypes: 'Arquetipos',
      humors: 'Humores',
      competences: 'Competencias',
    },
  },
  en: {
    sections: {
      overview: 'Overview',
      character: 'Character',
      codex: 'Codex',
      portals: 'Portals',
      loot: 'Loot',
      seasons: 'Seasons',
      stats: 'Stats',
      updates: 'Updates',
      settings: 'Settings',
    },
    sheet: {
      title: 'Character sheet',
      fileNote:
        'Your sheet is a file you own: export it as Markdown and keep it anywhere. Nothing is stored on servers.',
      edit: 'Edit sheet',
      done: 'Finish editing',
      exportMd: 'Export .md',
      exportPdf: 'Export PDF',
      importMd: 'Import .md',
      importError: 'That file does not look like a Numinia sheet. Check the format and try again.',
      roll: 'Roll',
      total: 'Total',
      none: '—',
      identity: 'Identity',
      attributes: 'Attributes',
      values: 'Values',
      competences: 'Competences',
      profile: 'Profile',
      notes: 'Notes',
      fields: FIELDS_EN,
    },
    foldNav: 'Collapse or expand the navigation',
    adminGroup: 'Management',
    admin: {
      assets: 'Assets',
      assetsIntro:
        'Everything the city keeps: format, category, and which layers hold each binary.',
      forbidden: 'Oracles only',
      forbiddenNote:
        'This room asks for Archon rank or above. Enter with the wallet that holds it and it opens again.',
      loading: 'Consulting the archive…',
      search: 'Search by name or id…',
      all: 'All',
      name: 'Name',
      format: 'Format',
      category: 'Category',
      storage: 'Storage',
      created: 'Created',
      count: 'assets',
      readOnly:
        'Read-only: writing to the data repository needs its own decision (write-path ADR).',
    },
    census: {
      title: 'Census',
      intro:
        'The public record of ranks: look a wallet up and grant what the city decides. Every grant is written into history.',
      walletPlaceholder: '0x…',
      lookup: 'Look up',
      notFound: 'No record: a Nomad passing through.',
      unconfigured: 'The census is not configured yet (the state repo is pending — D23).',
      invalidWallet: 'That is not a valid 0x address.',
      currentRank: 'Rank',
      since: 'Since',
      updatedBy: 'Last pen',
      grant: 'Grant',
      granted: 'Granted — written into history.',
      failed: 'It failed. Check and retry.',
    },
    citizen: {
      title: 'Your citizenship',
      noSession: 'No session — a Nomad passing through',
      rankLabel: 'Rank',
      seals: 'Seals',
      prisma: 'Prisma',
      enter: 'Enter Numinia',
      dashboardIntro: 'Your post in the city: who you are, what you carry, which doors stand open.',
    },
    stats: {
      title: 'Archive Statistics',
      intro: 'Real numbers from the public catalog — what exists, where it lives, how safe it is.',
      totalAssets: 'Public assets',
      projects: 'Projects',
      byFormat: 'By format',
      storageLayers: 'Storage layers',
      redundancy: 'Redundancy health',
      redundant: 'Redundant',
      single: 'Single point',
    },
    portals: {
      title: 'Portals of Numinia',
      intro:
        'The city map: four districts around the Agora Plaza. Each portal opens a virtual world; the dimmed ones are not built yet.',
      openPortals: 'Open portals',
      mapAria: 'City portals map',
      hub: 'Central hub',
      enter: 'Enter the world',
      unbuilt: 'Coming soon',
    },
    manual: {
      tab: 'The Manual',
      identitiesTab: 'Identities',
      title: 'The Numinia Manual',
      intro:
        'The complete role-playing game, exactly as its author wrote it — the founding text of the city.',
      chapter: 'Chapter',
      esNote: 'The Manual is available in its original Spanish for now.',
      prev: 'Previous',
      next: 'Next',
      indexTitle: 'Index',
      gated: 'The Manual asks for a session',
      gatedNote:
        'The complete role-playing game is read inside the city: enter with what you already have and the Codex opens.',
      gatedAction: 'Enter Numinia',
    },
    emptyTitle: 'Nothing here yet',
    emptyPortals: 'Portals are charted in Phase 5. The map arrives before the fog.',
    emptyLoot: 'Loot arrives with the Seasons (Phase 3). What you earn will be yours.',
    emptySeasons: 'Seasons light up Phase 3: adventures, rituals and rewards.',
    codexTitle: 'Codex of identities',
    codexIntro:
      'The ways of belonging to Numinia: who you are, what you know, what you pursue — as the city model records them.',
    codexGroups: {
      species: 'Species',
      guilds: 'Guilds',
      factions: 'Factions',
      districts: 'Districts',
      archetypes: 'Archetypes',
      humors: 'Humors',
      competences: 'Competences',
    },
  },
  ja: {
    sections: {
      overview: '概要',
      character: 'キャラクター',
      codex: 'コデックス',
      portals: 'ポータル',
      loot: '戦利品',
      seasons: 'シーズン',
      stats: '統計',
      updates: '更新情報',
      settings: '設定',
    },
    sheet: {
      title: 'キャラクターシート',
      fileNote:
        'シートはあなたのファイルです。Markdownとして書き出し、好きな場所に保管できます。サーバーには何も保存されません。',
      edit: 'シートを編集',
      done: '編集を終了',
      exportMd: '.md を書き出す',
      exportPdf: 'PDF を書き出す',
      importMd: '.md を読み込む',
      importError:
        'このファイルはヌミニアのシートではないようです。形式を確認してもう一度お試しください。',
      roll: 'ロール',
      total: '合計',
      none: '—',
      identity: 'アイデンティティ',
      attributes: '属性',
      values: '数値',
      competences: 'コンピテンス',
      profile: 'プロフィール',
      notes: 'メモ',
      fields: FIELDS_EN,
    },
    foldNav: 'ナビゲーションの折りたたみ',
    adminGroup: '管理',
    admin: {
      assets: 'アセット',
      assetsIntro: '都市が保管するすべて:形式、カテゴリ、そして各バイナリがどの層にあるか。',
      forbidden: 'オラクル専用',
      forbiddenNote:
        'この部屋はアルコン以上のランクが必要です。該当するウォレットで入場してください。',
      loading: 'アーカイブを照会中…',
      search: '名前またはIDで検索…',
      all: 'すべて',
      name: '名前',
      format: '形式',
      category: 'カテゴリ',
      storage: 'ストレージ',
      created: '作成日',
      count: 'アセット',
      readOnly: '読み取り専用:データリポジトリへの書き込みには独自の決定が必要です。',
    },
    census: {
      title: '市民名簿',
      intro:
        '公開ランク台帳 — ウォレットを検索し、都市が定めた位階を授ける。すべての授与は歴史に刻まれる。',
      walletPlaceholder: '0x…',
      lookup: '検索',
      notFound: '記録なし — 通りすがりのノマド。',
      unconfigured: '名簿は未設定（状態リポジトリ待ち — D23）。',
      invalidWallet: '有効な 0x アドレスではありません。',
      currentRank: '位階',
      since: '取得日',
      updatedBy: '最後の筆',
      grant: '授与',
      granted: '授与 — 歴史に記録された。',
      failed: '失敗。確認して再試行してください。',
    },
    citizen: {
      title: 'あなたの市民権',
      noSession: 'セッションなし — 通りすがりのノマド',
      rankLabel: 'ランク',
      seals: '印章',
      prisma: 'プリズマ',
      enter: 'ヌミニアに入る',
      dashboardIntro: '都市でのあなたの立ち位置:誰であり、何を携え、どの扉が開いているか。',
    },
    stats: {
      title: 'アーカイブ統計',
      intro: '公開カタログの実数 — 何があり、どこに保存され、どれほど安全か。',
      totalAssets: '公開アセット',
      projects: 'プロジェクト',
      byFormat: '形式別',
      storageLayers: 'ストレージ層',
      redundancy: '冗長性ヘルス',
      redundant: '冗長',
      single: '単一保存',
    },
    portals: {
      title: 'ヌミニアのポータル',
      intro:
        '都市の地図 — アゴラ広場を囲む四つの区。各ポータルは仮想世界へ開く。淡色のものは未建設。',
      openPortals: '開通ポータル',
      mapAria: '都市ポータルの地図',
      hub: '中央ノード',
      enter: 'ワールドへ入る',
      unbuilt: '近日公開',
    },
    manual: {
      tab: 'マニュアル',
      identitiesTab: 'アイデンティティ',
      title: 'ヌミニア・マニュアル',
      intro: '著者が書いたままの完全なRPG — 都市の礎となるテキスト。',
      chapter: '章',
      esNote: 'マニュアルは現在、原文(スペイン語)のみで提供されています。',
      prev: '前へ',
      next: '次へ',
      indexTitle: '目次',
      gated: 'マニュアルにはセッションが必要です',
      gatedNote: '完全なRPGは都市の中で読めます。お持ちの方法で入場すると、コデックスが開きます。',
      gatedAction: 'ヌミニアに入る',
    },
    emptyTitle: 'まだ何もありません',
    emptyPortals: 'ポータルはフェーズ5で地図化されます。',
    emptyLoot: '戦利品はシーズン(フェーズ3)とともに届きます。',
    emptySeasons: 'シーズンはフェーズ3で始まります:冒険、儀式、報酬。',
    codexTitle: 'アイデンティティのコデックス',
    codexIntro: 'ヌミニアに属する形:あなたは誰か、何を知るか、何を追うか。',
    codexGroups: {
      species: '種族',
      guilds: 'ギルド',
      factions: '党派',
      districts: '地区',
      archetypes: 'アーキタイプ',
      humors: '気質',
      competences: 'コンピテンス',
    },
  },
  ko: {
    sections: {
      overview: '개요',
      character: '캐릭터',
      codex: '코덱스',
      portals: '포털',
      loot: '전리품',
      seasons: '시즌',
      stats: '통계',
      updates: '업데이트',
      settings: '설정',
    },
    sheet: {
      title: '캐릭터 시트',
      fileNote:
        '시트는 당신의 파일입니다. Markdown으로 내보내 어디든 보관하세요. 서버에는 아무것도 저장되지 않습니다.',
      edit: '시트 편집',
      done: '편집 완료',
      exportMd: '.md 내보내기',
      exportPdf: 'PDF 내보내기',
      importMd: '.md 가져오기',
      importError: '누미니아 시트 형식이 아닌 것 같습니다. 형식을 확인하고 다시 시도하세요.',
      roll: '굴리기',
      total: '합계',
      none: '—',
      identity: '정체성',
      attributes: '속성',
      values: '수치',
      competences: '역량',
      profile: '프로필',
      notes: '메모',
      fields: FIELDS_EN,
    },
    foldNav: '내비게이션 접기/펼치기',
    adminGroup: '관리',
    admin: {
      assets: '에셋',
      assetsIntro: '도시가 보관하는 모든 것: 형식, 카테고리, 각 바이너리가 있는 계층.',
      forbidden: '오라클 전용',
      forbiddenNote: '이 방은 아콘 이상의 랭크가 필요합니다. 해당 지갑으로 입장하세요.',
      loading: '아카이브 조회 중…',
      search: '이름 또는 ID로 검색…',
      all: '전체',
      name: '이름',
      format: '형식',
      category: '카테고리',
      storage: '스토리지',
      created: '생성일',
      count: '에셋',
      readOnly: '읽기 전용: 데이터 저장소 쓰기에는 별도의 결정이 필요합니다.',
    },
    census: {
      title: '시민 명부',
      intro:
        '공개 계급 대장 — 지갑을 조회하고 도시가 정한 계급을 부여한다. 모든 부여는 역사에 기록된다.',
      walletPlaceholder: '0x…',
      lookup: '조회',
      notFound: '기록 없음 — 지나가는 노마드.',
      unconfigured: '명부가 아직 설정되지 않았습니다(상태 저장소 대기 — D23).',
      invalidWallet: '유효한 0x 주소가 아닙니다.',
      currentRank: '계급',
      since: '취득일',
      updatedBy: '마지막 펜',
      grant: '부여',
      granted: '부여됨 — 역사에 기록되었습니다.',
      failed: '실패했습니다. 확인 후 다시 시도하세요.',
    },
    citizen: {
      title: '당신의 시민권',
      noSession: '세션 없음 — 지나가는 노마드',
      rankLabel: '랭크',
      seals: '인장',
      prisma: '프리즈마',
      enter: '누미니아 입장',
      dashboardIntro: '도시에서의 당신의 자리: 누구이며, 무엇을 지녔고, 어떤 문이 열려 있는지.',
    },
    stats: {
      title: '아카이브 통계',
      intro: '공개 카탈로그의 실제 수치 — 무엇이 있고, 어디에 저장되며, 얼마나 안전한지.',
      totalAssets: '공개 에셋',
      projects: '프로젝트',
      byFormat: '형식별',
      storageLayers: '스토리지 계층',
      redundancy: '중복성 상태',
      redundant: '중복 보관',
      single: '단일 보관',
    },
    portals: {
      title: '누미니아의 포털',
      intro:
        '도시의 지도 — 아고라 광장을 둘러싼 네 개의 구. 각 포털은 가상 세계로 열리며, 흐린 것은 아직 지어지지 않았다.',
      openPortals: '열린 포털',
      mapAria: '도시 포털 지도',
      hub: '중앙 노드',
      enter: '월드 입장',
      unbuilt: '공개 예정',
    },
    manual: {
      tab: '매뉴얼',
      identitiesTab: '정체성',
      title: '누미니아 매뉴얼',
      intro: '저자가 쓴 그대로의 완전한 RPG — 도시의 기초가 되는 텍스트.',
      chapter: '장',
      esNote: '매뉴얼은 현재 원문(스페인어)으로만 제공됩니다.',
      prev: '이전',
      next: '다음',
      indexTitle: '목차',
      gated: '매뉴얼은 세션이 필요합니다',
      gatedNote: '완전한 RPG는 도시 안에서 읽습니다. 가진 방법으로 입장하면 코덱스가 열립니다.',
      gatedAction: '누미니아 입장',
    },
    emptyTitle: '아직 아무것도 없습니다',
    emptyPortals: '포털은 5단계에서 지도화됩니다.',
    emptyLoot: '전리품은 시즌(3단계)과 함께 옵니다.',
    emptySeasons: '시즌은 3단계에서 시작됩니다: 모험, 의식, 보상.',
    codexTitle: '정체성 코덱스',
    codexIntro: '누미니아에 속하는 방법: 당신은 누구인지, 무엇을 아는지, 무엇을 추구하는지.',
    codexGroups: {
      species: '종족',
      guilds: '길드',
      factions: '파벌',
      districts: '구역',
      archetypes: '원형',
      humors: '기질',
      competences: '역량',
    },
  },
  'pt-br': {
    sections: {
      overview: 'Resumo',
      character: 'Personagem',
      codex: 'Códice',
      portals: 'Portais',
      loot: 'Espólio',
      seasons: 'Temporadas',
      stats: 'Estatísticas',
      updates: 'Novidades',
      settings: 'Configurações',
    },
    sheet: {
      title: 'Ficha de personagem',
      fileNote:
        'Sua ficha é um arquivo seu: exporte como Markdown e guarde onde quiser. Nada é armazenado em servidores.',
      edit: 'Editar ficha',
      done: 'Concluir edição',
      exportMd: 'Exportar .md',
      exportPdf: 'Exportar PDF',
      importMd: 'Importar .md',
      importError:
        'Esse arquivo não parece uma ficha de Numinia. Verifique o formato e tente de novo.',
      roll: 'Rolar',
      total: 'Total',
      none: '—',
      identity: 'Identidade',
      attributes: 'Atributos',
      values: 'Valores',
      competences: 'Competências',
      profile: 'Perfil',
      notes: 'Notas',
      fields: {
        ...FIELDS_EN,
        name: 'Nome',
        player: 'Jogador',
        species: 'Espécie',
        position: 'Posição',
        guild: 'Guilda',
        branch: 'Ramo',
        house: 'Casa',
        faction: 'Facção',
        district: 'Distrito',
        archetype: 'Arquétipo',
        humor: 'Humor',
        dialect: 'Dialeto',
        sociolect: 'Socioleto',
        lingo: 'Gíria',
        idiolect: 'Idioleto',
        weapons: 'Armas',
        relics: 'Relíquias',
        strength: 'Força',
        movement: 'Movimento',
        size: 'Tamanho',
        constitution: 'Constituição',
        intelligence: 'Inteligência',
        wisdom: 'Sabedoria',
        perception: 'Percepção',
        charisma: 'Carisma',
        threshold: 'Limiar',
        veilBreath: 'Sopro do véu',
        initiative: 'Iniciativa',
        energy: 'Energia',
        prestige: 'Prestígio',
        prisma: 'Prisma',
      },
    },
    foldNav: 'Recolher ou expandir a navegação',
    adminGroup: 'Gestão',
    admin: {
      assets: 'Assets',
      assetsIntro:
        'Tudo o que a cidade guarda: formato, categoria e em quais camadas vive cada binário.',
      forbidden: 'Zona de Oráculos',
      forbiddenNote:
        'Esta sala pede rank de Arconte ou superior. Entre com a carteira que o tem e ela reabre.',
      loading: 'Consultando o arquivo…',
      search: 'Buscar por nome ou id…',
      all: 'Todos',
      name: 'Nome',
      format: 'Formato',
      category: 'Categoria',
      storage: 'Armazenamento',
      created: 'Criado',
      count: 'assets',
      readOnly: 'Somente leitura: escrever no repositório de dados precisa de sua própria decisão.',
    },
    census: {
      title: 'Censo',
      intro:
        'O registro público de patentes: busque uma wallet e conceda o que a cidade decidir. Cada concessão fica escrita na história.',
      walletPlaceholder: '0x…',
      lookup: 'Buscar',
      notFound: 'Sem registro: nômade de passagem.',
      unconfigured: 'O censo ainda não está configurado (falta o repositório de estado — D23).',
      invalidWallet: 'Isso não é um endereço 0x válido.',
      currentRank: 'Patente',
      since: 'Desde',
      updatedBy: 'Última pena',
      grant: 'Conceder',
      granted: 'Concedido — escrito na história.',
      failed: 'Falhou. Verifique e tente de novo.',
    },
    citizen: {
      title: 'Sua cidadania',
      noSession: 'Sem sessão — nômade de passagem',
      rankLabel: 'Rank',
      seals: 'Selos',
      prisma: 'Prisma',
      enter: 'Entrar em Numinia',
      dashboardIntro:
        'Seu posto na cidade: quem você é, o que carrega e quais portas estão abertas.',
    },
    stats: {
      title: 'Estatísticas do Arquivo',
      intro: 'Números reais do catálogo público — o que existe, onde vive e quão seguro está.',
      totalAssets: 'Assets públicos',
      projects: 'Projetos',
      byFormat: 'Por formato',
      storageLayers: 'Camadas de armazenamento',
      redundancy: 'Saúde de redundância',
      redundant: 'Redundantes',
      single: 'Ponto único',
    },
    portals: {
      title: 'Portais de Numinia',
      intro:
        'O mapa da cidade: quatro distritos ao redor da Praça da Ágora. Cada portal abre um mundo virtual; os esmaecidos ainda não foram construídos.',
      openPortals: 'Portais abertos',
      mapAria: 'Mapa de portais da cidade',
      hub: 'Nó central',
      enter: 'Entrar no mundo',
      unbuilt: 'Em breve',
    },
    manual: {
      tab: 'O Manual',
      identitiesTab: 'Identidades',
      title: 'O Manual de Numinia',
      intro: 'O RPG completo, exatamente como seu autor o escreveu — o texto fundador da cidade.',
      chapter: 'Capítulo',
      esNote: 'O Manual está disponível no original em espanhol por enquanto.',
      prev: 'Anterior',
      next: 'Próximo',
      indexTitle: 'Índice',
      gated: 'O Manual pede sessão',
      gatedNote:
        'O RPG completo se lê dentro da cidade: entre com o que já tem e o Códice se abre.',
      gatedAction: 'Entrar em Numinia',
    },
    emptyTitle: 'Ainda não há nada aqui',
    emptyPortals: 'Os portais são cartografados na Fase 5.',
    emptyLoot: 'O espólio chega com as Temporadas (Fase 3). O que você ganhar será seu.',
    emptySeasons: 'As Temporadas acendem a Fase 3: aventuras, rituais e recompensas.',
    codexTitle: 'Códice de identidades',
    codexIntro:
      'As formas de pertencer a Numinia: quem você é, o que sabe, o que persegue — como o modelo da cidade as registra.',
    codexGroups: {
      species: 'Espécies',
      guilds: 'Guildas',
      factions: 'Facções',
      districts: 'Distritos',
      archetypes: 'Arquétipos',
      humors: 'Humores',
      competences: 'Competências',
    },
  },
};
