/**
 * LAP UI strings (MISSION-008) — shell sections, the character sheet,
 * and honest empty states. Five locales like every UI string;
 * identity option NAMES come localized from @numinia/domain, not from here.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { SheetLabels } from '../components/lap/sheet/sheet-props';

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
  /** «En construcción» (the Oracle, 2026-10-14): the crane mark in the rail
      and the settings, and the banner that opens each unfinished page with
      what does not work yet and when it comes. */
  readonly building: {
    readonly label: string;
    readonly loot: string;
    readonly lootLink: string;
    readonly portals: string;
  };
  readonly adminGroup: string;
  /** Ajustes → «Secciones del panel»: what a first visit finds off; {list} is the sections. */
  readonly quietPanel: string;
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
  readonly worlds: {
    readonly title: string;
    readonly intro: string;
    readonly forbiddenNote: string;
    readonly signedAs: string;
    readonly empty: string;
  };
  /** The price room (MIS-184): its frame; the room's own words live in prices.ts. */
  readonly prices: {
    readonly title: string;
    readonly intro: string;
    readonly forbiddenNote: string;
    /** `{date}`: where the till's poll of Stripe stopped. Shown only when it is more than two days behind. */
    readonly paymentsLag: string;
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
    /** Under the title: where «La ciudad» comes from, and that no session is needed. */
    readonly source: string;
    /** «La ciudad» (the Oracle, 2026-10-14: «deberían de ser las de Numinia»). */
    readonly city: string;
    readonly communities: string;
    readonly upcoming: string;
    readonly sedes: string;
    readonly bazaar: string;
    readonly insideNow: string;
    /** «El archivo»: the catalogue's figures, below the city. */
    readonly archive: string;
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
  readonly sheet: SheetLabels;
  readonly emptyTitle: string;
  readonly emptyPortals: string;
  readonly emptyLoot: string;
  readonly emptySeasons: string;
  readonly season: {
    readonly intro: string;
    readonly doors: string;
    readonly minutes: string;
    readonly play: string;
    readonly difficulty: string;
    readonly free: string;
    readonly premium: string;
    readonly passTitle: string;
    readonly passDelivers: string;
    readonly passGives: string;
    readonly vatIncluded: string;
    readonly buy: string;
    readonly comingSoon: string;
    readonly datesPending: string;
    readonly record: string;
    readonly freeTrack: string;
    readonly passTrack: string;
    readonly progress: string;
    readonly noPass: string;
    readonly passActive: string;
    readonly locked: string;
    readonly fog: string;
    readonly signIn: string;
    readonly withdrawal: string;
    readonly testNote: string;
  };
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
      annexLink: 'Ver la hoja del manual en el Códex',
      fileNote:
        'Tu personaje es tuyo: vive en este dispositivo y en los ficheros que te lleves. Nadie en Numinia guarda copia.',
      edit: 'Editar ficha',
      done: 'Terminar edición',
      exportMd: 'Exportar .md',
      exportPdf: 'Exportar PDF',
      importMd: 'Importar .md',
      importError:
        'Ese archivo no parece una ficha de Numinia. Revisa el formato e inténtalo de nuevo.',
      importConfirm: 'Importar reemplaza la ficha guardada en este dispositivo. ¿Continuar?',
      wipe: 'Borrar ficha',
      wipeConfirm:
        'Esto borra la ficha guardada en este dispositivo. Exporta antes si quieres conservarla.',
      roll: 'Tirar',
      total: 'Total',
      none: '—',
      identity: 'Identidad',
      attributes: 'Características',
      attributeBounds: '16 puntos · mín 1 · máx 5',
      values: 'Valores',
      competences: 'Competencias',
      competenceHint: '6 por Gremio, Facción y Especie',
      disabledCompetence: 'No vinculada a tu Gremio, Facción o Especie: deshabilitada.',
      strayPoints: 'Este archivo trae puntos en competencias no habilitadas:',
      aptitudes: 'Aptitudes especiales',
      aptitudeName: 'Aptitud',
      aptitudePool: 'reserva por afinidad de Posición',
      incompatiblePosition:
        'Posición incompatible con tu Gremio, Facción, Especie o Arquetipo (ver Códex, cap. III).',
      positionBonus: '+1 Posición',
      initialValue: 'inicial',
      fromPerception: '= Percepción',
      desequilibrium: 'Desequilibrio',
      desequilibriumNote: 'según tu Posición — consulta el Códex, cap. III.',
      gearOf: 'de',
      profile: 'Perfil',
      notes: 'Notas',
      fields: FIELDS_ES,
    },
    foldNav: 'Plegar o desplegar la navegación',
    building: {
      label: 'En construcción',
      loot: 'Aquí verás lo que ganes al cruzar las puertas de la Temporada I. Todavía no funciona: llegará cuando abra la temporada, y sus fechas aún no están fijadas. Mientras tanto, las puertas y sus premios se ven en Temporadas.',
      lootLink: 'Ver Temporadas',
      portals:
        'Este mapa es un boceto: los portales que ya existen abren su mundo y los que dicen «Próximamente» aún no se han construido. El mapa de verdad de la ciudad llega más adelante, con la Fase 5 del plan, que todavía no tiene fecha.',
    },
    adminGroup: 'Gestión',
    quietPanel:
      'Para empezar, el panel muestra lo esencial: {list} vienen apagados. Enciende los que quieras.',
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
    worlds: {
      title: 'Mundos',
      intro:
        'La flota de mundos públicos: qué mundos hay, dónde corren y en qué estado. Solo los Oráculos ven esta sala.',
      forbiddenNote:
        'Esta sala es solo para Oráculos. Entra con la cartera que lo es y volverá a abrirse.',
      signedAs: 'Has entrado como',
      empty:
        'Todavía no hay mundos en la flota. Cada mundo nace con su ficha en la Summa y su orden en numinia-assets (ADR-069).',
    },
    prices: {
      title: 'Precios',
      intro:
        'Lo que cuesta y lo que deja cada tamaño de mundo, y la tarifa que cobra la caja. Al publicar, la caja guarda una versión nueva con su fecha; lo cobrado antes no cambia.',
      forbiddenNote:
        'Esta sala es solo para Oráculos. Entra con la cartera que lo es y volverá a abrirse.',
      paymentsLag:
        'La caja lleva más de dos días sin leer Stripe (último evento leído: {date}). Stripe guarda los eventos 30 días: mira los registros de numinia-till en Cloudflare antes de que se pierdan pagos o reembolsos.',
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
      noSession: 'Sin sesión',
      rankLabel: 'Rango',
      seals: 'Sellos',
      prisma: 'Prisma',
      enter: 'Entrar en Numinia',
      dashboardIntro:
        'Tu puesto en la ciudad: quién eres, qué llevas y qué puertas tienes abiertas.',
    },
    stats: {
      title: 'Estadísticas de Numinia',
      source:
        'Contadas al publicar la web, con el registro de comunidades y el catálogo del Bazar; «Ahora dentro» se pregunta en directo a cada sede. Todo es público: no hace falta iniciar sesión.',
      city: 'La ciudad',
      communities: 'Comunidades',
      upcoming: 'Encuentros próximos',
      sedes: 'Sedes abiertas',
      bazaar: 'Objetos en el Bazar',
      insideNow: 'Ahora dentro',
      archive: 'El archivo',
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
    emptySeasons: 'Temporada I: ocho puertas abiertas a todos y un pase con el botín premium.',
    season: {
      intro:
        'Ocho puertas, ocho enigmas. Cada puerta que cruzas te da su botín y destapa la siguiente. La última solo se abre con el pase de temporada, que además suma el botín dorado de todas.',
      doors: 'Puertas',
      minutes: 'Minutos de juego',
      play: 'Entrar en la puerta',
      difficulty: 'Dificultad',
      free: 'Botín gratis',
      premium: 'Botín premium',
      passTitle: 'El pase de temporada',
      passDelivers: 'Qué te llevas',
      passGives:
        'El botín dorado de las ocho puertas, la entrada a la octava —El Velo— y un token del pase de la Temporada I en la wallet con la que entras.',
      vatIncluded: 'IVA incluido · pago único',
      buy: 'Comprar el pase',
      comingSoon: 'Próximamente',
      datesPending: 'Las fechas de la temporada aún no están fijadas.',
      record: 'El precio y lo que entrega salen de su ficha en el archivo',
      freeTrack: 'Gratis',
      passTrack: 'Pase',
      progress: '{n} de {t} puertas cruzadas',
      noPass: 'Sin pase',
      passActive: 'Pase activo',
      locked: 'Solo con el pase',
      fog: 'Aún en la niebla',
      signIn:
        'Entra con tu wallet para ver tu avance: cada botín que tengas cuenta como puerta cruzada.',
      withdrawal:
        'Quiero el contenido ya y entiendo que pierdo los 14 días para desistir de la compra.',
      testNote:
        'Modo de prueba: no se cobra nada. Para probarlo usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC. La página de pago muestra aún el producto del café.',
    },
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
      updates: 'What’s new',
      settings: 'Settings',
    },
    sheet: {
      title: 'Character sheet',
      annexLink: 'See the manual’s sheet in the Codex',
      fileNote:
        'Your character is yours: it lives on this device and in the files you take with you. No one in Numinia keeps a copy.',
      edit: 'Edit sheet',
      done: 'Finish editing',
      exportMd: 'Export .md',
      exportPdf: 'Export PDF',
      importMd: 'Import .md',
      importError: 'That file does not look like a Numinia sheet. Check the format and try again.',
      importConfirm: 'Importing replaces the sheet stored on this device. Continue?',
      wipe: 'Wipe sheet',
      wipeConfirm:
        'This erases the sheet stored on this device. Export it first if you want to keep it.',
      roll: 'Roll',
      total: 'Total',
      none: '—',
      identity: 'Identity',
      attributes: 'Characteristics',
      attributeBounds: '16 points · min 1 · max 5',
      values: 'Values',
      competences: 'Competences',
      competenceHint: '6 per Guild, Faction and Species',
      disabledCompetence: 'Not tied to your Guild, Faction or Species: disabled.',
      strayPoints: 'This file carries points in competences that are not enabled:',
      aptitudes: 'Special aptitudes',
      aptitudeName: 'Aptitude',
      aptitudePool: 'pool from Position affinity',
      incompatiblePosition:
        'Position incompatible with your Guild, Faction, Species or Archetype (see the Codex, ch. III).',
      positionBonus: '+1 Position',
      initialValue: 'initial',
      fromPerception: '= Perception',
      desequilibrium: 'Imbalance',
      desequilibriumNote: 'set by your Position — see the Codex, ch. III.',
      gearOf: 'of',
      profile: 'Profile',
      notes: 'Notes',
      fields: FIELDS_EN,
    },
    foldNav: 'Collapse or expand the navigation',
    building: {
      label: 'Under construction',
      loot: 'Here you will see what you win by crossing the doors of Season I. It does not work yet: it arrives when the season opens, and its dates are not set yet. Meanwhile, the doors and their rewards are on Seasons.',
      lootLink: 'See Seasons',
      portals:
        'This map is a sketch: the portals that already exist open their world, and the ones marked “Coming soon” are not built yet. The real map of the city comes later, with Phase 5 of the plan, which has no date yet.',
    },
    adminGroup: 'Management',
    quietPanel:
      'To start with, the panel shows the essentials: {list} come switched off. Turn on the ones you want.',
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
    worlds: {
      title: 'Worlds',
      intro:
        'The public worlds fleet: which worlds exist, where they run and in what state. Only Oracles see this room.',
      forbiddenNote:
        'This room is for Oracles only. Sign in with the wallet that is one and it will open again.',
      signedAs: 'Signed in as',
      empty:
        'No worlds in the fleet yet. Each world is born with its card in the Summa and its order in numinia-assets (ADR-069).',
    },
    prices: {
      title: 'Prices',
      intro:
        'What each size of world costs and what it leaves, and the tariff the till charges. Publishing makes the till keep a new version with its date; nothing charged before changes.',
      forbiddenNote:
        'This room is for Oracles only. Sign in with the wallet that is one and it will open again.',
      paymentsLag:
        'The till has not read Stripe for more than two days (last event read: {date}). Stripe keeps events 30 days: check numinia-till’s logs in Cloudflare before payments or refunds are lost.',
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
      noSession: 'No session',
      rankLabel: 'Rank',
      seals: 'Seals',
      prisma: 'Prisma',
      enter: 'Enter Numinia',
      dashboardIntro: 'Your post in the city: who you are, what you carry, which doors stand open.',
    },
    stats: {
      title: 'Numinia Statistics',
      source:
        'Counted when the site is published, from the register of communities and the Bazaar catalogue; “Inside now” is asked live of each home. All of it is public: no need to sign in.',
      city: 'The city',
      communities: 'Communities',
      upcoming: 'Upcoming gatherings',
      sedes: 'Open homes',
      bazaar: 'Items in the Bazaar',
      insideNow: 'Inside now',
      archive: 'The archive',
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
    emptySeasons: 'Season I: eight doors open to all, and a pass with the premium rewards.',
    season: {
      intro:
        'Eight doors, eight puzzles. Each door you cross gives you its reward and reveals the next. The last one opens only with the season pass, which also adds the gold reward of every door.',
      doors: 'Doors',
      minutes: 'Minutes of play',
      play: 'Enter the door',
      difficulty: 'Difficulty',
      free: 'Free reward',
      premium: 'Premium reward',
      passTitle: 'The season pass',
      passDelivers: 'What you take away',
      passGives:
        'The gold reward of all eight doors, entry to the eighth — The Veil — and a Season I pass token in the wallet you sign in with.',
      vatIncluded: 'VAT included · one-off payment',
      buy: 'Buy the pass',
      comingSoon: 'Coming soon',
      datesPending: 'The season’s dates are not set yet.',
      record: 'The price and what it delivers come from its record in the archive',
      freeTrack: 'Free',
      passTrack: 'Pass',
      progress: '{n} of {t} doors crossed',
      noPass: 'No pass',
      passActive: 'Pass active',
      locked: 'Pass holders only',
      fog: 'Still in the fog',
      signIn:
        'Sign in with your wallet to see your progress: every reward you hold counts as a door crossed.',
      withdrawal:
        'I want the content now and understand I lose the 14 days to withdraw from the purchase.',
      testNote:
        'Test mode: nothing is charged. To try it, use the card 4242 4242 4242 4242, any future date and any CVC. The payment page still shows the coffee’s product.',
    },
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
      annexLink: 'コデックスでマニュアルのシートを見る',
      fileNote:
        'シートはあなたのファイルです。Markdownとして書き出し、好きな場所に保管できます。サーバーには何も保存されません。',
      edit: 'シートを編集',
      done: '編集を終了',
      exportMd: '.md を書き出す',
      exportPdf: 'PDF を書き出す',
      importMd: '.md を読み込む',
      importError:
        'このファイルはヌミニアのシートではないようです。形式を確認してもう一度お試しください。',
      importConfirm: '読み込むと、この端末に保存されたシートが置き換えられます。続行しますか？',
      wipe: 'シートを消去',
      wipeConfirm: 'この端末に保存されたシートを消去します。残したい場合は先に書き出してください。',
      roll: 'ロール',
      total: '合計',
      none: '—',
      identity: 'アイデンティティ',
      attributes: '特性',
      attributeBounds: '16ポイント · 最小1 · 最大5',
      values: '数値',
      competences: 'コンピテンス',
      competenceHint: 'ギルド・ファクション・種族ごとに6',
      disabledCompetence: 'ギルド・ファクション・種族に結びついていないため無効です。',
      strayPoints: 'このファイルには有効化されていないコンピテンスのポイントが含まれています：',
      aptitudes: '特殊アプティチュード',
      aptitudeName: 'アプティチュード',
      aptitudePool: 'ポジション親和性によるプール',
      incompatiblePosition:
        'ポジションがギルド・ファクション・種族・アーキタイプと非互換です（コデックス第III章参照）。',
      positionBonus: '+1 ポジション',
      initialValue: '初期値',
      fromPerception: '= 知覚',
      desequilibrium: '不均衡',
      desequilibriumNote: 'ポジションにより決まります — コデックス第III章参照。',
      gearOf: '／',
      profile: 'プロフィール',
      notes: 'メモ',
      fields: FIELDS_EN,
    },
    foldNav: 'ナビゲーションの折りたたみ',
    building: {
      label: '準備中',
      loot: 'シーズンIの扉をくぐって手に入れたものが、ここに表示されます。まだ動いていません。シーズンが始まるときに届きますが、日程はまだ決まっていません。それまでは、扉と報酬を「シーズン」で見られます。',
      lootLink: 'シーズンを見る',
      portals:
        'この地図はまだ下書きです。すでにあるポータルはワールドを開き、「近日公開」のものはまだ建てられていません。本当の都市の地図は、計画のフェーズ5で届きます。日程はまだありません。',
    },
    adminGroup: '管理',
    quietPanel:
      'はじめは必要なものだけを表示します。{list}はオフになっています。使いたいものをオンにしてください。',
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
    worlds: {
      title: 'ワールド',
      intro:
        '公開ワールドのフリート：どのワールドがあり、どこで動き、どんな状態か。この部屋はオラクルだけが見られます。',
      forbiddenNote:
        'この部屋はオラクル専用です。オラクルのウォレットでサインインすると再び開きます。',
      signedAs: 'サインイン中のランク',
      empty:
        'フリートにはまだワールドがありません。各ワールドはSummaのカードとnuminia-assetsのオーダーから生まれます（ADR-069）。',
    },
    prices: {
      title: '料金',
      intro:
        '各サイズのワールドの原価と利益、そしてレジが請求する料金表。公開すると、レジは日付付きの新しいバージョンを保存します。これまでの請求は変わりません。',
      forbiddenNote:
        'この部屋はオラクル専用です。オラクルのウォレットでサインインすると再び開きます。',
      paymentsLag:
        'レジが2日以上Stripeを読んでいません（最後に読んだイベント：{date}）。Stripeはイベントを30日間保存します。支払いや返金が失われる前に、Cloudflareでnuminia-tillのログを確認してください。',
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
      noSession: 'セッションなし',
      rankLabel: 'ランク',
      seals: '印章',
      prisma: 'プリズマ',
      enter: 'ヌミニアに入る',
      dashboardIntro: '都市でのあなたの立ち位置:誰であり、何を携え、どの扉が開いているか。',
    },
    stats: {
      title: 'Numiniaの統計',
      source:
        'サイトの公開時に、コミュニティの登録とバザールのカタログから数えています。「いま中にいる人」は各拠点にその場で問い合わせます。すべて公開情報なので、サインインは不要です。',
      city: '都市',
      communities: 'コミュニティ',
      upcoming: '今後の集まり',
      sedes: '開いている拠点',
      bazaar: 'バザールのアイテム',
      insideNow: 'いま中にいる人',
      archive: 'アーカイブ',
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
    emptySeasons: 'シーズンI:誰にでも開かれた8つの扉と、プレミアム報酬付きのパス。',
    season: {
      intro:
        '8つの扉、8つの謎。扉をくぐるたびに報酬が手に入り、次の扉が現れる。最後の扉はシーズンパスでのみ開き、パスはすべての扉の金の報酬も加える。',
      doors: '扉',
      minutes: 'プレイ時間(分)',
      play: '扉に入る',
      difficulty: '難易度',
      free: '無料報酬',
      premium: 'プレミアム報酬',
      passTitle: 'シーズンパス',
      passDelivers: '手に入るもの',
      passGives:
        '8つの扉すべての金の報酬、8番目の扉「ヴェール」への入場、そしてサインインしたウォレットへのシーズンIパストークン。',
      vatIncluded: '税込 · 一回払い',
      buy: 'パスを購入',
      comingSoon: '近日公開',
      datesPending: 'シーズンの日程はまだ決まっていない。',
      record: '価格と内容はアーカイブの記録から読み込まれる',
      freeTrack: '無料',
      passTrack: 'パス',
      progress: '{t}の扉のうち{n}を通過',
      noPass: 'パスなし',
      passActive: 'パス有効',
      locked: 'パス保有者のみ',
      fog: 'まだ霧の中',
      signIn:
        'ウォレットでサインインすると進行状況が見られる。持っている報酬ごとに扉を通過したことになる。',
      withdrawal: '今すぐコンテンツを受け取り、購入を撤回できる14日間を失うことを理解している。',
      testNote:
        'テストモード:料金は発生しない。試すにはカード 4242 4242 4242 4242、任意の将来の日付、任意のCVCを使う。支払いページにはまだコーヒーの商品が表示される。',
    },
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
      updates: '새 소식',
      settings: '설정',
    },
    sheet: {
      title: '캐릭터 시트',
      annexLink: '코덱스에서 매뉴얼 시트 보기',
      fileNote:
        '시트는 당신의 파일입니다. Markdown으로 내보내 어디든 보관하세요. 서버에는 아무것도 저장되지 않습니다.',
      edit: '시트 편집',
      done: '편집 완료',
      exportMd: '.md 내보내기',
      exportPdf: 'PDF 내보내기',
      importMd: '.md 가져오기',
      importError: '누미니아 시트 형식이 아닌 것 같습니다. 형식을 확인하고 다시 시도하세요.',
      importConfirm: '가져오면 이 기기에 저장된 시트를 대체합니다. 계속할까요?',
      wipe: '시트 지우기',
      wipeConfirm: '이 기기에 저장된 시트를 지웁니다. 보관하려면 먼저 내보내세요.',
      roll: '굴리기',
      total: '합계',
      none: '—',
      identity: '정체성',
      attributes: '특성',
      attributeBounds: '16포인트 · 최소 1 · 최대 5',
      values: '수치',
      competences: '역량',
      competenceHint: '길드·파벌·종족당 6',
      disabledCompetence: '길드·파벌·종족과 연결되지 않아 비활성화되었습니다.',
      strayPoints: '이 파일에는 활성화되지 않은 역량의 포인트가 있습니다:',
      aptitudes: '특수 적성',
      aptitudeName: '적성',
      aptitudePool: '포지션 친화도에 따른 풀',
      incompatiblePosition:
        '포지션이 길드·파벌·종족·원형과 호환되지 않습니다 (코덱스 제III장 참조).',
      positionBonus: '+1 포지션',
      initialValue: '초기값',
      fromPerception: '= 지각',
      desequilibrium: '불균형',
      desequilibriumNote: '포지션에 따라 정해집니다 — 코덱스 제III장 참조.',
      gearOf: '/',
      profile: '프로필',
      notes: '메모',
      fields: FIELDS_EN,
    },
    foldNav: '내비게이션 접기/펼치기',
    building: {
      label: '준비 중',
      loot: '시즌 I의 문을 지나며 얻은 것이 여기에 표시됩니다. 아직 작동하지 않습니다. 시즌이 열릴 때 함께 오며, 일정은 아직 정해지지 않았습니다. 그동안 문과 보상은 «시즌»에서 볼 수 있습니다.',
      lootLink: '시즌 보기',
      portals:
        '이 지도는 아직 초안입니다. 이미 있는 포털은 월드를 열고, «공개 예정»인 것은 아직 지어지지 않았습니다. 도시의 진짜 지도는 나중에 계획의 5단계와 함께 오며, 아직 날짜가 없습니다.',
    },
    adminGroup: '관리',
    quietPanel:
      '처음에는 꼭 필요한 것만 보여 줍니다. {list} 항목은 꺼져 있으니, 원하는 것을 켜세요.',
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
    worlds: {
      title: '월드',
      intro:
        '공개 월드 플릿: 어떤 월드가 있고, 어디서 실행되며, 어떤 상태인지. 이 방은 오라클만 볼 수 있습니다.',
      forbiddenNote: '이 방은 오라클 전용입니다. 오라클 지갑으로 로그인하면 다시 열립니다.',
      signedAs: '로그인한 등급',
      empty:
        '플릿에 아직 월드가 없습니다. 각 월드는 Summa의 카드와 numinia-assets의 오더로 태어납니다(ADR-069).',
    },
    prices: {
      title: '요금',
      intro:
        '월드 크기별 비용과 남는 몫, 그리고 계산대가 청구하는 요금표. 게시하면 계산대는 날짜가 붙은 새 버전을 저장합니다. 이전에 청구된 것은 바뀌지 않습니다.',
      forbiddenNote: '이 방은 오라클 전용입니다. 오라클 지갑으로 로그인하면 다시 열립니다.',
      paymentsLag:
        '계산대가 이틀 넘게 Stripe를 읽지 않았습니다(마지막으로 읽은 이벤트: {date}). Stripe는 이벤트를 30일 동안 보관합니다. 결제나 환불이 사라지기 전에 Cloudflare에서 numinia-till 로그를 확인하세요.',
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
      noSession: '세션 없음',
      rankLabel: '랭크',
      seals: '인장',
      prisma: '프리즈마',
      enter: '누미니아 입장',
      dashboardIntro: '도시에서의 당신의 자리: 누구이며, 무엇을 지녔고, 어떤 문이 열려 있는지.',
    },
    stats: {
      title: 'Numinia 통계',
      source:
        '사이트를 게시할 때 커뮤니티 등록부와 바자 카탈로그로 셉니다. «지금 안에 있는 사람»은 각 거점에 실시간으로 묻습니다. 모두 공개 정보라 로그인할 필요가 없습니다.',
      city: '도시',
      communities: '커뮤니티',
      upcoming: '다가오는 모임',
      sedes: '열린 거점',
      bazaar: '바자의 아이템',
      insideNow: '지금 안에 있는 사람',
      archive: '아카이브',
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
    emptySeasons: '시즌 I: 누구에게나 열린 여덟 개의 문과 프리미엄 보상이 담긴 패스.',
    season: {
      intro:
        '여덟 개의 문, 여덟 개의 수수께끼. 문을 지날 때마다 보상을 받고 다음 문이 드러난다. 마지막 문은 시즌 패스로만 열리며, 패스는 모든 문의 황금 보상도 더한다.',
      doors: '문',
      minutes: '플레이 시간(분)',
      play: '문으로 들어가기',
      difficulty: '난이도',
      free: '무료 보상',
      premium: '프리미엄 보상',
      passTitle: '시즌 패스',
      passDelivers: '얻는 것',
      passGives:
        '여덟 문 모두의 황금 보상, 여덟 번째 문 «베일» 입장, 그리고 로그인한 지갑으로 받는 시즌 I 패스 토큰.',
      vatIncluded: '부가세 포함 · 일회 결제',
      buy: '패스 구매',
      comingSoon: '곧 출시',
      datesPending: '시즌 일정은 아직 정해지지 않았다.',
      record: '가격과 제공 내용은 아카이브의 기록에서 읽어 온다',
      freeTrack: '무료',
      passTrack: '패스',
      progress: '{t}개 중 {n}개 문 통과',
      noPass: '패스 없음',
      passActive: '패스 활성',
      locked: '패스 보유자 전용',
      fog: '아직 안개 속',
      signIn:
        '지갑으로 로그인하면 진행 상황을 볼 수 있다. 보유한 보상마다 문을 통과한 것으로 친다.',
      withdrawal:
        '지금 바로 콘텐츠를 받기를 원하며, 구매를 철회할 수 있는 14일을 잃는다는 것을 이해한다.',
      testNote:
        '테스트 모드: 요금이 청구되지 않는다. 카드 4242 4242 4242 4242, 미래의 아무 날짜, 아무 CVC로 시험해 보라. 결제 페이지에는 아직 커피 상품이 표시된다.',
    },
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
      annexLink: 'Ver a ficha do manual no Códex',
      fileNote:
        'Seu personagem é seu: vive neste dispositivo e nos arquivos que você levar. Ninguém em Numinia guarda cópia.',
      edit: 'Editar ficha',
      done: 'Concluir edição',
      exportMd: 'Exportar .md',
      exportPdf: 'Exportar PDF',
      importMd: 'Importar .md',
      importError:
        'Esse arquivo não parece uma ficha de Numinia. Verifique o formato e tente de novo.',
      importConfirm: 'Importar substitui a ficha guardada neste dispositivo. Continuar?',
      wipe: 'Apagar ficha',
      wipeConfirm:
        'Isto apaga a ficha guardada neste dispositivo. Exporte antes se quiser conservá-la.',
      roll: 'Rolar',
      total: 'Total',
      none: '—',
      identity: 'Identidade',
      attributes: 'Características',
      attributeBounds: '16 pontos · mín 1 · máx 5',
      values: 'Valores',
      competences: 'Competências',
      competenceHint: '6 por Guilda, Facção e Espécie',
      disabledCompetence: 'Não vinculada à sua Guilda, Facção ou Espécie: desabilitada.',
      strayPoints: 'Este arquivo traz pontos em competências não habilitadas:',
      aptitudes: 'Aptidões especiais',
      aptitudeName: 'Aptidão',
      aptitudePool: 'reserva por afinidade de Posição',
      incompatiblePosition:
        'Posição incompatível com sua Guilda, Facção, Espécie ou Arquétipo (ver Códex, cap. III).',
      positionBonus: '+1 Posição',
      initialValue: 'inicial',
      fromPerception: '= Percepção',
      desequilibrium: 'Desequilíbrio',
      desequilibriumNote: 'conforme sua Posição — consulte o Códex, cap. III.',
      gearOf: 'de',
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
    building: {
      label: 'Em construção',
      loot: 'Aqui você verá o que ganhar ao atravessar as portas da Temporada I. Ainda não funciona: chega quando a temporada abrir, e as datas ainda não foram definidas. Enquanto isso, as portas e suas recompensas estão em Temporadas.',
      lootLink: 'Ver Temporadas',
      portals:
        'Este mapa é um esboço: os portais que já existem abrem seu mundo, e os marcados como «Em breve» ainda não foram construídos. O mapa de verdade da cidade chega mais adiante, com a Fase 5 do plano, que ainda não tem data.',
    },
    adminGroup: 'Gestão',
    quietPanel:
      'Para começar, o painel mostra o essencial: {list} vêm desligados. Ligue os que quiser.',
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
    worlds: {
      title: 'Mundos',
      intro:
        'A frota de mundos públicos: quais mundos existem, onde rodam e em que estado. Só os Oráculos veem esta sala.',
      forbiddenNote:
        'Esta sala é só para Oráculos. Entre com a carteira que é de um e ela volta a abrir.',
      signedAs: 'Você entrou como',
      empty:
        'Ainda não há mundos na frota. Cada mundo nasce com sua ficha na Summa e sua ordem em numinia-assets (ADR-069).',
    },
    prices: {
      title: 'Preços',
      intro:
        'O que custa e o que rende cada tamanho de mundo, e a tarifa que o caixa cobra. Ao publicar, o caixa guarda uma versão nova com a sua data; o que já foi cobrado não muda.',
      forbiddenNote:
        'Esta sala é só para Oráculos. Entre com a carteira que é de um e ela volta a abrir.',
      paymentsLag:
        'O caixa está há mais de dois dias sem ler o Stripe (último evento lido: {date}). O Stripe guarda os eventos 30 dias: veja os registos do numinia-till na Cloudflare antes que se percam pagamentos ou reembolsos.',
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
      noSession: 'Sem sessão',
      rankLabel: 'Rank',
      seals: 'Selos',
      prisma: 'Prisma',
      enter: 'Entrar em Numinia',
      dashboardIntro:
        'Seu posto na cidade: quem você é, o que carrega e quais portas estão abertas.',
    },
    stats: {
      title: 'Estatísticas de Numinia',
      source:
        'Contadas ao publicar o site, com o registro de comunidades e o catálogo do Bazar; «Dentro agora» é perguntado ao vivo a cada sede. Tudo é público: não é preciso entrar.',
      city: 'A cidade',
      communities: 'Comunidades',
      upcoming: 'Próximos encontros',
      sedes: 'Sedes abertas',
      bazaar: 'Objetos no Bazar',
      insideNow: 'Dentro agora',
      archive: 'O arquivo',
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
    emptySeasons: 'Temporada I: oito portas abertas a todos e um passe com as recompensas premium.',
    season: {
      intro:
        'Oito portas, oito enigmas. Cada porta que você atravessa lhe dá sua recompensa e revela a seguinte. A última só se abre com o passe de temporada, que também soma a recompensa dourada de todas.',
      doors: 'Portas',
      minutes: 'Minutos de jogo',
      play: 'Entrar na porta',
      difficulty: 'Dificuldade',
      free: 'Recompensa grátis',
      premium: 'Recompensa premium',
      passTitle: 'O passe de temporada',
      passDelivers: 'O que você leva',
      passGives:
        'A recompensa dourada das oito portas, a entrada na oitava — O Véu — e um token do passe da Temporada I na carteira com que você entra.',
      vatIncluded: 'IVA incluído · pagamento único',
      buy: 'Comprar o passe',
      comingSoon: 'Em breve',
      datesPending: 'As datas da temporada ainda não foram definidas.',
      record: 'O preço e o que ele entrega vêm do seu registro no arquivo',
      freeTrack: 'Grátis',
      passTrack: 'Passe',
      progress: '{n} de {t} portas atravessadas',
      noPass: 'Sem passe',
      passActive: 'Passe ativo',
      locked: 'Só com o passe',
      fog: 'Ainda na névoa',
      signIn:
        'Entre com sua carteira para ver seu avanço: cada recompensa que você tiver conta como porta atravessada.',
      withdrawal: 'Quero o conteúdo agora e entendo que perco os 14 dias para desistir da compra.',
      testNote:
        'Modo de teste: nada é cobrado. Para testar, use o cartão 4242 4242 4242 4242, qualquer data futura e qualquer CVC. A página de pagamento ainda mostra o produto do café.',
    },
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
