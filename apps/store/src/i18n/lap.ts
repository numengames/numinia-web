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
    readonly updates: string;
  };
  readonly sheet: {
    readonly title: string;
    readonly fileNote: string;
    readonly edit: string;
    readonly done: string;
    readonly exportMd: string;
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
      updates: 'Novedades',
    },
    sheet: {
      title: 'Ficha de personaje',
      fileNote:
        'Tu ficha es un archivo tuyo: expórtala como Markdown y guárdala donde quieras. Nada se almacena en servidores.',
      edit: 'Editar ficha',
      done: 'Terminar edición',
      exportMd: 'Exportar .md',
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
      updates: 'Updates',
    },
    sheet: {
      title: 'Character sheet',
      fileNote:
        'Your sheet is a file you own: export it as Markdown and keep it anywhere. Nothing is stored on servers.',
      edit: 'Edit sheet',
      done: 'Finish editing',
      exportMd: 'Export .md',
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
      updates: '更新情報',
    },
    sheet: {
      title: 'キャラクターシート',
      fileNote:
        'シートはあなたのファイルです。Markdownとして書き出し、好きな場所に保管できます。サーバーには何も保存されません。',
      edit: 'シートを編集',
      done: '編集を終了',
      exportMd: '.md を書き出す',
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
      updates: '업데이트',
    },
    sheet: {
      title: '캐릭터 시트',
      fileNote:
        '시트는 당신의 파일입니다. Markdown으로 내보내 어디든 보관하세요. 서버에는 아무것도 저장되지 않습니다.',
      edit: '시트 편집',
      done: '편집 완료',
      exportMd: '.md 내보내기',
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
      updates: 'Novidades',
    },
    sheet: {
      title: 'Ficha de personagem',
      fileNote:
        'Sua ficha é um arquivo seu: exporte como Markdown e guarde onde quiser. Nada é armazenado em servidores.',
      edit: 'Editar ficha',
      done: 'Concluir edição',
      exportMd: 'Exportar .md',
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
