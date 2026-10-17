/**
 * UI messages of the communities platform (home, /communities/, a
 * community's page, a ritual's page, the calendar, Live and «Perteneces»).
 * Typed per locale: a missing translation does not compile. The register's
 * own texts (summaries, places, programmes) travel in English and Spanish
 * inside each file under src/content/communities/ and the other locales read
 * English.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { AssetCategory } from '../lib/data';
import type { PieceId } from '../lib/space-uses';

export interface CommunitiesMessages {
  // ── the bar and the footer
  readonly navCommunities: string;
  readonly navCalendar: string;
  readonly search: string;

  // ── home (the app shell: action, not explanation)
  readonly featuredLabel: string;
  /** "{n}" of "{m}": a slide's place in the featured card. */
  readonly slideOf: string;
  readonly nextRitual: string;
  readonly from: string;
  readonly home: string;
  readonly homeToOpen: string;
  readonly homeInProgress: string;
  readonly seeCommunity: string;
  readonly seeRitual: string;
  readonly enterWorld: string;
  readonly toMyCalendar: string;
  readonly previous: string;
  readonly next: string;
  readonly upcomingEyebrow: string;
  readonly upcomingTitle: string;
  readonly upcomingHelp: string;
  readonly goodsEyebrow: string;
  readonly goodsTitle: string;
  readonly goodsHelp: string;
  readonly seeBazaar: string;
  readonly licenceLine: string;
  readonly goodCategories: Readonly<Record<AssetCategory, string>>;
  /** The catalogue's shelves by their id; a shelf not named here shows no chip. */
  readonly goodCollections: Readonly<Record<string, string>>;
  readonly liveEyebrow: string;
  readonly liveTitle: string;
  readonly liveHelp: string;
  readonly firstTime: string;
  readonly howItWorks: string;
  readonly openYourHome: string;

  // ── cards and marks
  readonly founder: string;
  readonly openedByHouse: string;
  /** "{x}" is the operator's name. */
  readonly runBy: string;
  readonly weekly: string;
  readonly lastRitual: string;
  readonly toAnnounce: string;
  readonly ofTheCity: string;
  readonly heldChip: string;
  readonly modes: Readonly<Record<'in-person' | 'online' | 'mixed', string>>;

  // ── /communities/
  readonly indexEyebrow: string;
  readonly indexTitle: string;
  readonly indexLead: string;
  readonly searchPlaceholder: string;
  readonly searchLabel: string;
  readonly filterLabel: string;
  readonly filterAll: string;
  /**
   * «{n} comunidades en {m} lugares» in the four forms a count needs: one
   * community or several, one place or several. A language without plurals
   * repeats the same line in all four.
   */
  readonly countLine: {
    readonly oneOne: string;
    readonly oneMany: string;
    readonly manyOne: string;
    readonly manyMany: string;
  };
  /** "{q}" is the query. */
  readonly noResults: string;
  readonly noResultsCta: string;

  // ── a community's page
  readonly crumbCommunities: string;
  readonly follow: string;
  readonly following: string;
  /** Toasts of the follow toggle, and its failure. */
  readonly followed: string;
  readonly unfollowed: string;
  readonly followFailed: string;
  /** «Dejar de seguir» on /belong/. */
  readonly unfollow: string;
  /** «N personas la siguen» under the name: one and many; {n} is the figure. */
  readonly followerOne: string;
  readonly followerMany: string;
  readonly rituals: string;
  readonly inYourHour: string;
  readonly subscribe: string;
  readonly weeklyNote: string;
  readonly upcomingLabel: string;
  readonly heldLabel: string;
  readonly noUpcomingConference: string;
  readonly noUpcoming: string;
  readonly noHeldFounder: string;
  readonly noHeld: string;
  readonly chronicle: string;
  readonly archive: string;
  readonly archiveEmpty: string;
  readonly enter: string;
  readonly homeFounderNote: string;
  readonly homeInProgressText: string;
  readonly homeToOpenLine: string;
  readonly members: string;
  readonly membersEmpty: string;
  readonly membersNote: string;
  readonly peopleOne: string;
  readonly peopleMany: string;
  readonly peopleHidden: string;
  readonly peopleRest: string;
  readonly peopleOwner: string;
  readonly peopleYou: string;
  readonly peopleLabel: string;
  readonly details: string;
  readonly whoSees: string;
  readonly everyone: string;
  readonly howToEnter: string;
  readonly byInvitation: string;
  readonly decidedByCommunity: string;
  readonly district: string;
  readonly toChoose: string;
  readonly claimTitle: string;
  readonly claimText: string;
  readonly claimCta: string;

  // ── what a community's space uses (its page): each piece and its state
  readonly usesTitle: string;
  readonly usesHelp: string;
  readonly balance: string;
  /** One line per piece: what it is. */
  readonly usesLines: Readonly<Record<PieceId, string>>;
  readonly usesNoHome: string;
  /** How many of its gatherings are coming: none, one, "{n}". */
  readonly usesComingNone: string;
  readonly usesComingOne: string;
  readonly usesComingMany: string;
  /** The mark of a piece not built yet, beside the crane. */
  readonly underConstruction: string;

  // ── a ritual's page
  readonly stageLabel: string;
  /** "{x}" is the community's name. */
  readonly homeOf: string;
  /** "{x}" is the community's name. */
  readonly homeOfToOpen: string;
  readonly worldNote: string;
  readonly share: string;
  readonly linkCopied: string;
  readonly organisedBy: string;
  readonly cityKeeps: string;
  readonly when: string;
  readonly wholeDay: string;
  /** "{n}" days. */
  readonly wholeDays: string;
  readonly where: string;
  readonly howToAnnounce: string;
  readonly whoCanGo: string;
  readonly anyone: string;
  readonly openNote: string;
  readonly inYourCalendar: string;
  readonly add: string;
  readonly addNote: string;
  readonly onlineNote: string;
  readonly howToGetThere: string;
  readonly programme: string;
  /** "{source}" and "{date}". */
  readonly readOn: string;
  readonly after: string;
  readonly afterText: string;

  // ── calendar
  readonly calendarEyebrow: string;
  readonly calendarTitle: string;
  readonly calendarLead: string;
  readonly subscribeCity: string;
  readonly calendarNote: string;
  readonly weekdays: readonly [string, string, string, string, string, string, string];
  readonly ritualOne: string;
  readonly ritualMany: string;

  // ── Live
  readonly livePageTitle: string;
  readonly livePageLead: string;
  readonly liveNowTitle: string;
  readonly liveNowEmpty: string;
  readonly liveNextTitle: string;
  readonly liveNextHelp: string;
  readonly liveNextEmpty: string;
  readonly liveHomesTitle: string;
  readonly liveHomesHelp: string;
  /** How many are inside a home right now: none, one, "{n}". */
  readonly insideNone: string;
  readonly insideOne: string;
  readonly insideMany: string;

  // ── editing, the Oracle only (day one: the file in GitHub's editor)
  readonly editLabel: string;
  readonly editRitual: string;
  readonly editOpen: string;
  readonly addRitual: string;
  readonly editNote: string;

  // ── «Perteneces» (/belong/)
  readonly belongTitle: string;
  readonly belongLead: string;
  readonly followsTitle: string;
  readonly followsHelp: string;
  readonly followsEmpty: string;
  readonly memberOfTitle: string;
  readonly memberDoor: string;
  readonly signIn: string;
  readonly memberSoon: string;
  /** "{n}" is the number of communities on the site. */
  readonly exploreAll: string;

  // ── countdown templates for the page script ("{n}" is the number)
  readonly countNow: string;
  readonly countTomorrow: string;
  readonly countDays: string;
  readonly countWeeks: string;
  readonly countMonths: string;
  readonly countHeld: string;
}

const ES: CommunitiesMessages = {
  navCommunities: 'Comunidades',
  navCalendar: 'Calendario',
  search: 'Buscar',

  featuredLabel: 'Destacado',
  slideOf: '{n} de {m}',
  nextRitual: 'Próximo encuentro',
  from: 'De dónde',
  home: 'Sede',
  homeToOpen: 'Por abrir',
  homeInProgress: 'En construcción',
  seeCommunity: 'Ver la comunidad →',
  seeRitual: 'Ver el encuentro →',
  enterWorld: 'Entrar al mundo',
  toMyCalendar: 'A mi calendario',
  previous: 'Anterior',
  next: 'Siguiente',
  upcomingEyebrow: 'Lo que viene',
  upcomingTitle: 'Próximos encuentros',
  upcomingHelp:
    'Las reuniones de cada comunidad, en persona o en línea. Las fechas, el mismo día en todo el mundo; las horas, en la tuya.',
  goodsEyebrow: 'Del Bazar',
  goodsTitle: 'Objetos para tu sede',
  goodsHelp: 'Todo CC0: úsalo, cámbialo y llévatelo, también fuera de Numinia.',
  seeBazaar: 'Ver el Bazar',
  licenceLine: 'CC0 · libre, sin pedir permiso',
  goodCategories: {
    models: 'Modelo 3D',
    avatars: 'Avatar',
    worlds: 'Mundo',
    audio: 'Sonido',
    video: 'Vídeo',
    images: 'Imagen',
  },
  goodCollections: {
    'numinia-avatars': 'Avatares de Numinia',
    'numinia-assets': 'Objetos de Numinia',
    'numinia-worlds': 'Mundos de Numinia',
    'numinia-audio': 'Sonidos de Numinia',
    'numinia-video': 'Vídeos de Numinia',
    'numinia-images': 'Imágenes de Numinia',
  },
  liveEyebrow: 'Ahora mismo',
  liveTitle: 'Comunidades con vida',
  liveHelp: 'Las tres con el encuentro más cercano. De dónde son y cuándo se reúnen.',
  firstTime: '¿Primera vez aquí?',
  howItWorks: 'Cómo funciona',
  openYourHome: 'Abre la sede de tu comunidad',

  founder: 'Fundó la ciudad',
  openedByHouse: 'La abrió Numen Games',
  runBy: 'La lleva {x}',
  weekly: 'Cada semana',
  lastRitual: 'Último encuentro',
  toAnnounce: 'por anunciar',
  ofTheCity: 'De la ciudad',
  heldChip: 'Celebrado',
  modes: { 'in-person': 'En persona', online: 'En línea', mixed: 'En persona y en línea' },

  indexEyebrow: 'La ciudad',
  indexTitle: 'Las comunidades',
  indexLead:
    'Las que tienen sede en Numinia. A una comunidad oculta se llega con su enlace; una privada solo la ven sus miembros.',
  searchPlaceholder: 'Nombre, ciudad o encuentro',
  searchLabel: 'Buscar una comunidad',
  filterLabel: 'Filtrar por lugar',
  filterAll: 'Todas',
  countLine: {
    oneOne: '{n} comunidad en {m} lugar',
    oneMany: '{n} comunidad en {m} lugares',
    manyOne: '{n} comunidades en {m} lugar',
    manyMany: '{n} comunidades en {m} lugares',
  },
  noResults: 'Ninguna comunidad con «{q}». ¿Es la tuya?',
  noResultsCta: 'Abre tu sede',

  crumbCommunities: 'Comunidades',
  follow: 'Seguir',
  following: 'Sigues',
  followed: 'Sigues esta comunidad.',
  unfollowed: 'Ya no sigues esta comunidad.',
  followFailed: 'No se pudo guardar. Prueba de nuevo.',
  unfollow: 'Dejar de seguir',
  followerOne: '1 persona la sigue',
  followerMany: '{n} personas la siguen',
  rituals: 'Encuentros',
  inYourHour: 'en tu hora',
  subscribe: 'Suscribirte',
  weeklyNote: 'Sus citas de siempre. Si son abiertas, salen también en el calendario de la ciudad.',
  upcomingLabel: 'Próximos',
  heldLabel: 'Ya celebrados',
  noUpcomingConference:
    'Todavía no hay ninguno publicado. La próxima edición aparecerá aquí en cuanto la anuncien.',
  noUpcoming:
    'Todavía no hay ninguno publicado. Los publica la comunidad cuando hace suya la sede.',
  noHeldFounder: 'Lo que ya pasó queda aquí, con su crónica.',
  noHeld: 'Lo que hicimos juntos aparecerá aquí, con su crónica.',
  chronicle: 'Crónica',
  archive: 'Archivo',
  archiveEmpty:
    'Las crónicas de sus encuentros y lo que la comunidad escriba quedan aquí. Son ficheros suyos: se los lleva cuando quiera.',
  enter: 'Entrar',
  homeFounderNote:
    'Numen Games no tiene sede propia: cuida los sitios de todos, el Ágora, las Puertas y la Biblioteca.',
  homeInProgressText:
    'Numen Games le está haciendo la sede. Cuando abra, se verá en el navegador, también en el móvil, y aquí dirá cuánta gente hay dentro.',
  homeToOpenLine:
    'Cuando la comunidad la abra, entrarás desde aquí, en el navegador y sin instalar nada.',
  members: 'Miembros',
  membersEmpty: 'Nadie todavía: la sede espera a quien lleve la comunidad.',
  membersNote:
    'El tipo (Logia, Liga o Hermandad) se calcula de los miembros con Session Zero; hasta entonces no se muestra.',
  peopleOne: 'Un miembro',
  peopleMany: '{n} miembros',
  peopleHidden: 'Los nombres solo los ve quien es miembro.',
  peopleRest: 'Más gente',
  peopleOwner: 'Propietaria',
  peopleYou: 'tú',
  peopleLabel: 'Quién forma parte de la comunidad',
  details: 'Detalles',
  whoSees: 'Quién la ve',
  everyone: 'Todo el mundo',
  howToEnter: 'Cómo se entra',
  byInvitation: 'Por invitación',
  decidedByCommunity: 'Lo decide la comunidad al hacerla suya',
  district: 'Distrito',
  toChoose: 'Por elegir',
  claimTitle: '¿Es tu comunidad?',
  claimText:
    'Hazla tuya: entras y pasas a llevarla. Tú decides qué se ve, cómo se llama cada cosa y quién entra.',
  claimCta: 'Es mi comunidad',

  usesTitle: 'Lo que usa este espacio',
  usesHelp: 'Las piezas de Numinia que usa la comunidad y en qué punto está cada una.',
  balance: 'Saldo',
  usesLines: {
    home: 'Su mundo en 3D',
    gatherings: 'Sus reuniones con fecha',
    archive: 'Sus crónicas y sus ficheros',
    members: 'Quién forma parte',
    balance: 'Lo que mantiene su sede encendida',
  },
  usesNoHome: 'Sin sede todavía',
  usesComingNone: 'Ninguno a la vista',
  usesComingOne: '1 próximo',
  usesComingMany: '{n} próximos',
  underConstruction: 'En construcción',

  stageLabel: 'La sede en 3D',
  homeOf: 'La sede de {x}',
  homeOfToOpen: 'La sede de {x} está por abrir',
  worldNote: 'Se abre en el navegador, también en el móvil. Sin instalar nada.',
  share: 'Compartir',
  linkCopied: 'Enlace copiado',
  organisedBy: 'Lo organiza',
  cityKeeps: 'Lo celebra toda la ciudad. Lo cuida',
  when: 'Cuándo',
  wholeDay: 'Día entero',
  wholeDays: '{n} días, de día entero',
  where: 'Dónde',
  howToAnnounce: 'Cómo, por anunciar',
  whoCanGo: 'Quién puede ir',
  anyone: 'Cualquiera',
  openNote: 'Es abierto. Una comunidad puede hacer un encuentro solo para los suyos.',
  inYourCalendar: 'En tu calendario',
  add: 'Añadir',
  addNote: 'Un fichero .ics para Google, Apple o el que uses',
  onlineNote: 'Cuando empiece, aquí aparecerá «Entrar» y cuánta gente hay dentro.',
  howToGetThere: 'Cómo llegar',
  programme: 'Programa',
  readOn: 'Leído en {source} el {date}. Lo cambia la comunidad cuando quiera.',
  after: 'Después',
  afterText:
    'Cuando acabe, quedará como celebrado: cuánta gente vino y, si la comunidad tiene Cronista, su crónica en el archivo.',

  calendarEyebrow: 'La ciudad',
  calendarTitle: 'Calendario',
  calendarLead: 'Los encuentros de todas las comunidades, mes a mes.',
  subscribeCity: 'Suscribirte desde tu calendario',
  calendarNote:
    'Los encuentros con hora se guardan en UTC y los ves en la tuya. Los de día entero se ven igual en todo el mundo. Cada comunidad tiene su propio calendario al que suscribirte.',
  weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  ritualOne: '1 encuentro',
  ritualMany: '{n} encuentros',

  livePageTitle: 'Live',
  livePageLead: 'Las sedes con gente dentro ahora mismo y los encuentros que están pasando.',
  liveNowTitle: 'Ahora',
  liveNowEmpty: 'Ahora mismo no hay nadie dentro de ninguna sede.',
  liveNextTitle: 'Lo próximo',
  liveNextHelp: 'Los seis encuentros más cercanos. Las fechas, el mismo día en todo el mundo.',
  liveNextEmpty: 'Ningún encuentro a la vista.',
  liveHomesTitle: 'Sedes abiertas',
  liveHomesHelp:
    'Las comunidades que ya tienen sede en 3D. Se entra desde el navegador, también en el móvil, sin instalar nada.',
  insideNone: 'Nadie dentro ahora',
  insideOne: '1 persona dentro ahora',
  insideMany: '{n} personas dentro ahora',
  editLabel: 'Editar la ficha',
  editRitual: 'Editar el encuentro',
  editOpen: 'Abrir en GitHub',
  addRitual: 'Añadir un encuentro',
  editNote:
    'Solo lo ves tú, como Oráculo. Se abre el archivo en GitHub: al guardar queda una propuesta de cambio, y se publica cuando otra persona la aprueba.',

  belongTitle: 'Perteneces',
  belongLead: 'Tus comunidades y lo que pasa en ellas.',
  followsTitle: 'Sigues',
  followsHelp: 'Las comunidades que sigues desde tu cuenta, cada una con su próximo encuentro.',
  followsEmpty: 'Aún no sigues ninguna. Pulsa «Seguir» en la página de una comunidad.',
  memberOfTitle: 'Perteneces a',
  memberDoor: 'Entra para ver las comunidades a las que perteneces.',
  signIn: 'Iniciar sesión',
  memberSoon: 'Cuando una comunidad te haga miembro, aparecerá aquí.',
  exploreAll: 'o explora las {n} comunidades →',

  countNow: 'ahora',
  countTomorrow: 'mañana',
  countDays: 'en {n} días',
  countWeeks: 'en {n} semanas',
  countMonths: 'en {n} meses',
  countHeld: 'celebrado',
};

const EN: CommunitiesMessages = {
  navCommunities: 'Communities',
  navCalendar: 'Calendar',
  search: 'Search',

  featuredLabel: 'Featured',
  slideOf: '{n} of {m}',
  nextRitual: 'Next gathering',
  from: 'From',
  home: 'Home',
  homeToOpen: 'To open',
  homeInProgress: 'Being built',
  seeCommunity: 'See the community →',
  seeRitual: 'See the gathering →',
  enterWorld: 'Enter the world',
  toMyCalendar: 'Add to my calendar',
  previous: 'Previous',
  next: 'Next',
  upcomingEyebrow: 'What is coming',
  upcomingTitle: 'Upcoming gatherings',
  upcomingHelp:
    'Each community’s meetings, in person or online. Dates are the same day everywhere; hours show in yours.',
  goodsEyebrow: 'From the Bazaar',
  goodsTitle: 'Objects for your home',
  goodsHelp: 'All CC0: use it, change it and take it with you, outside Numinia too.',
  seeBazaar: 'See the Bazaar',
  licenceLine: 'CC0 · free, no permission needed',
  goodCategories: {
    models: '3D model',
    avatars: 'Avatar',
    worlds: 'World',
    audio: 'Sound',
    video: 'Video',
    images: 'Image',
  },
  goodCollections: {
    'numinia-avatars': 'Numinia avatars',
    'numinia-assets': 'Numinia objects',
    'numinia-worlds': 'Numinia worlds',
    'numinia-audio': 'Numinia sounds',
    'numinia-video': 'Numinia videos',
    'numinia-images': 'Numinia images',
  },
  liveEyebrow: 'Right now',
  liveTitle: 'Communities with life',
  liveHelp: 'The three with the nearest gathering. Where they are from and when they meet.',
  firstTime: 'First time here?',
  howItWorks: 'How it works',
  openYourHome: 'Open your community’s home',

  founder: 'Founded the city',
  openedByHouse: 'Opened by Numen Games',
  runBy: 'Run by {x}',
  weekly: 'Every week',
  lastRitual: 'Last gathering',
  toAnnounce: 'to be announced',
  ofTheCity: 'Of the city',
  heldChip: 'Held',
  modes: { 'in-person': 'In person', online: 'Online', mixed: 'In person and online' },

  indexEyebrow: 'The city',
  indexTitle: 'The communities',
  indexLead:
    'Those with a home in Numinia. A hidden community is reached by its link; a private one is seen by its members only.',
  searchPlaceholder: 'Name, city or gathering',
  searchLabel: 'Search for a community',
  filterLabel: 'Filter by place',
  filterAll: 'All',
  countLine: {
    oneOne: '{n} community in {m} place',
    oneMany: '{n} community in {m} places',
    manyOne: '{n} communities in {m} place',
    manyMany: '{n} communities in {m} places',
  },
  noResults: 'No community matches “{q}”. Is it yours?',
  noResultsCta: 'Open your home',

  crumbCommunities: 'Communities',
  follow: 'Follow',
  following: 'Following',
  followed: 'You follow this community.',
  unfollowed: 'You no longer follow this community.',
  followFailed: 'It could not be saved. Try again.',
  unfollow: 'Unfollow',
  followerOne: '1 person follows it',
  followerMany: '{n} people follow it',
  rituals: 'Gatherings',
  inYourHour: 'in your hour',
  subscribe: 'Subscribe',
  weeklyNote: 'Its standing dates. When open, they also show in the city’s calendar.',
  upcomingLabel: 'Upcoming',
  heldLabel: 'Already held',
  noUpcomingConference:
    'None published yet. The next edition appears here as soon as it is announced.',
  noUpcoming: 'None published yet. The community publishes them once it makes the home its own.',
  noHeldFounder: 'What already happened stays here, with its chronicle.',
  noHeld: 'What we did together will appear here, with its chronicle.',
  chronicle: 'Chronicle',
  archive: 'Archive',
  archiveEmpty:
    'The chronicles of its gatherings and whatever the community writes stay here. They are its own files: it takes them whenever it wants.',
  enter: 'Enter',
  homeFounderNote:
    'Numen Games has no home of its own: it keeps the places of everyone — the Agora, the Gates and the Library.',
  homeInProgressText:
    'Numen Games is building its home. When it opens it will show in the browser, on the phone too, and this will say how many people are inside.',
  homeToOpenLine:
    'When the community opens it, you will enter from here, in the browser, with nothing to install.',
  members: 'Members',
  membersEmpty: 'Nobody yet: the home waits for whoever runs the community.',
  membersNote:
    'The kind (Lodge, League or Brotherhood) is worked out from the members with a Session Zero; until then it is not shown.',
  peopleOne: 'One member',
  peopleMany: '{n} members',
  peopleHidden: 'Only members see the names.',
  peopleRest: 'Everyone else',
  peopleOwner: 'Owner',
  peopleYou: 'you',
  peopleLabel: "The community's members",
  details: 'Details',
  whoSees: 'Who sees it',
  everyone: 'Everyone',
  howToEnter: 'How to enter',
  byInvitation: 'By invitation',
  decidedByCommunity: 'The community decides when it makes the home its own',
  district: 'District',
  toChoose: 'To choose',
  claimTitle: 'Is this your community?',
  claimText:
    'Make it yours: you come in and take it over. You decide what is shown, what each thing is called and who gets in.',
  claimCta: 'It is my community',

  usesTitle: 'What this space uses',
  usesHelp: 'The pieces of Numinia the community uses, and where each one stands.',
  balance: 'Balance',
  usesLines: {
    home: 'Its 3D world',
    gatherings: 'Its dated meetings',
    archive: 'Its chronicles and files',
    members: 'Who belongs',
    balance: 'What keeps its home running',
  },
  usesNoHome: 'No home yet',
  usesComingNone: 'None in sight',
  usesComingOne: '1 coming up',
  usesComingMany: '{n} coming up',
  underConstruction: 'Under construction',

  stageLabel: 'The home in 3D',
  homeOf: '{x}’s home',
  homeOfToOpen: '{x}’s home is still to open',
  worldNote: 'Opens in the browser, on your phone too. Nothing to install.',
  share: 'Share',
  linkCopied: 'Link copied',
  organisedBy: 'Organised by',
  cityKeeps: 'The whole city celebrates it. It is kept by',
  when: 'When',
  wholeDay: 'Whole day',
  wholeDays: '{n} days, whole days',
  where: 'Where',
  howToAnnounce: 'How, to be announced',
  whoCanGo: 'Who can go',
  anyone: 'Anyone',
  openNote: 'It is open. A community can hold a gathering for its own people only.',
  inYourCalendar: 'In your calendar',
  add: 'Add',
  addNote: 'An .ics file for Google, Apple or whichever you use',
  onlineNote: 'When it starts, “Enter” will appear here, with how many people are inside.',
  howToGetThere: 'Getting there',
  programme: 'Programme',
  readOn: 'Read on {source} on {date}. The community changes it whenever it wants.',
  after: 'Afterwards',
  afterText:
    'When it ends it will stay as held: how many people came and, if the community has a Chronicler, its chronicle in the archive.',

  calendarEyebrow: 'The city',
  calendarTitle: 'Calendar',
  calendarLead: 'The gatherings of every community, month by month.',
  subscribeCity: 'Subscribe from your calendar',
  calendarNote:
    'Timed gatherings are kept in UTC and shown in your hour. Whole-day ones look the same everywhere. Each community has its own calendar to subscribe to.',
  weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  ritualOne: '1 gathering',
  ritualMany: '{n} gatherings',

  livePageTitle: 'Live',
  livePageLead: 'The homes with people inside right now, and the gatherings taking place.',
  liveNowTitle: 'Now',
  liveNowEmpty: 'Nobody is inside any home right now.',
  liveNextTitle: 'Coming up',
  liveNextHelp: 'The six nearest gatherings. Dates are the same day everywhere.',
  liveNextEmpty: 'No gathering in sight.',
  liveHomesTitle: 'Open homes',
  liveHomesHelp:
    'The communities that already have a 3D home. You enter from the browser, on the phone too, with nothing to install.',
  insideNone: 'Nobody inside now',
  insideOne: '1 person inside now',
  insideMany: '{n} people inside now',
  editLabel: 'Edit the page',
  editRitual: 'Edit the gathering',
  editOpen: 'Open in GitHub',
  addRitual: 'Add a gathering',
  editNote:
    'Only you see this, as an Oracle. The file opens in GitHub: saving leaves a proposed change, published once someone else approves it.',

  belongTitle: 'You belong',
  belongLead: 'Your communities and what happens in them.',
  followsTitle: 'You follow',
  followsHelp: 'The communities you follow from your account, each with its next gathering.',
  followsEmpty: 'You follow none yet. Press “Follow” on a community’s page.',
  memberOfTitle: 'You belong to',
  memberDoor: 'Sign in to see the communities you belong to.',
  signIn: 'Sign in',
  memberSoon: 'When a community makes you a member, it will appear here.',
  exploreAll: 'or explore the {n} communities →',

  countNow: 'now',
  countTomorrow: 'tomorrow',
  countDays: 'in {n} days',
  countWeeks: 'in {n} weeks',
  countMonths: 'in {n} months',
  countHeld: 'held',
};

const JA: CommunitiesMessages = {
  weeklyNote: '定例の集まり。公開のものは都市のカレンダーにも出ます。',
  noUpcomingConference: 'まだ公開されていません。次回が告知されると、すぐここに出ます。',
  noUpcoming: 'まだ公開されていません。コミュニティが拠点を自分のものにすると公開します。',
  noHeldFounder: 'すでに起きたことは、その記録とともにここに残ります。',
  noHeld: '一緒にしたことが、その記録とともにここに出ます。',
  chronicle: '記録',
  archiveEmpty:
    '集まりの記録と、コミュニティが書くものはここに残ります。コミュニティ自身のファイルなので、いつでも持ち出せます。',
  homeFounderNote:
    'Numen Games に自分の拠点はありません。みんなの場所、アゴラ、門、図書館を守っています。',
  homeInProgressText:
    'Numen Games は拠点を建設中です。開くとブラウザに、スマホにも表示され、ここに中にいる人数が出ます。',
  membersEmpty: 'まだ誰もいません。拠点はコミュニティを運営する人を待っています。',
  membersNote:
    '種類(ロッジ、リーグ、兄弟団)はセッションゼロを終えたメンバーから決まります。それまでは表示されません。',
  decidedByCommunity: 'いつ拠点を自分のものにするかはコミュニティが決めます',
  claimText:
    'あなたのものに。入って引き継ぎます。何を見せるか、それぞれを何と呼ぶか、誰を入れるかはあなたが決めます。',
  cityKeeps: '都市全体で祝います。守っているのは',
  howToAnnounce: '方法は、追って告知',
  openNote: '公開です。コミュニティは自分たちだけの集まりを開くこともできます。',
  addNote: 'Google、Apple、お使いのカレンダー向けの .ics ファイル',
  onlineNote: '始まると、ここに「入る」と中にいる人数が出ます。',
  readOn: '{date} に {source} から読み取りました。コミュニティはいつでも変更できます。',
  afterText:
    '終わると開催済みとして残ります。来た人数と、コミュニティに記録係がいればアーカイブにその記録が残ります。',
  calendarNote:
    '時刻のある集まりは UTC で保存され、あなたの時間で表示されます。終日のものはどこでも同じに見えます。各コミュニティには購読できる自分のカレンダーがあります。',
  navCommunities: 'コミュニティ',
  navCalendar: 'カレンダー',
  search: '検索',
  featuredLabel: 'おすすめ',
  slideOf: '{n} / {m}',
  nextRitual: '次の集まり',
  from: '所在地',
  home: '拠点',
  homeToOpen: '準備中',
  homeInProgress: '建設中',
  seeCommunity: 'コミュニティを見る →',
  seeRitual: '集まりを見る →',
  enterWorld: 'ワールドに入る',
  toMyCalendar: 'カレンダーに追加',
  previous: '前へ',
  next: '次へ',
  upcomingEyebrow: 'これから',
  upcomingTitle: '次の集まり',
  upcomingHelp:
    '各コミュニティの集まり。対面でもオンラインでも。日付は世界中で同じ日、時刻はあなたの時間で表示されます。',
  goodsEyebrow: 'バザールから',
  goodsTitle: '拠点のためのオブジェクト',
  goodsHelp: 'すべて CC0。使って、変えて、持ち帰れます。Numinia の外でも。',
  seeBazaar: 'バザールを見る',
  licenceLine: 'CC0 · 自由に、許可なしで',
  goodCategories: {
    models: '3D モデル',
    avatars: 'アバター',
    worlds: 'ワールド',
    audio: 'サウンド',
    video: 'ビデオ',
    images: '画像',
  },
  goodCollections: {
    'numinia-avatars': 'Numinia のアバター',
    'numinia-assets': 'Numinia のオブジェクト',
    'numinia-worlds': 'Numinia のワールド',
    'numinia-audio': 'Numinia のサウンド',
    'numinia-video': 'Numinia のビデオ',
    'numinia-images': 'Numinia の画像',
  },
  liveEyebrow: 'いま',
  liveTitle: '動きのあるコミュニティ',
  liveHelp: '集まりが最も近い三つ。どこから来て、いつ集まるか。',
  firstTime: '初めてですか？',
  howItWorks: '仕組み',
  openYourHome: 'コミュニティの拠点を開く',
  founder: '都市を創設',
  openedByHouse: 'Numen Games が開設',
  runBy: '運営：{x}',
  weekly: '毎週',
  lastRitual: '前回の集まり',
  toAnnounce: '近日発表',
  ofTheCity: '都市の集まり',
  heldChip: '開催済み',
  modes: { 'in-person': '対面', online: 'オンライン', mixed: '対面とオンライン' },
  indexEyebrow: '都市',
  indexTitle: 'コミュニティ',
  indexLead:
    'Numinia に拠点を持つコミュニティ。非公開のものはリンクから、プライベートなものはメンバーだけが見られます。',
  searchPlaceholder: '名前、都市、集まり',
  searchLabel: 'コミュニティを検索',
  filterLabel: '場所で絞り込む',
  filterAll: 'すべて',
  countLine: {
    oneOne: '{m} か所に {n} のコミュニティ',
    oneMany: '{m} か所に {n} のコミュニティ',
    manyOne: '{m} か所に {n} のコミュニティ',
    manyMany: '{m} か所に {n} のコミュニティ',
  },
  noResults: '「{q}」に当たるコミュニティはありません。あなたのコミュニティですか？',
  noResultsCta: '拠点を開く',
  crumbCommunities: 'コミュニティ',
  follow: 'フォロー',
  following: 'フォロー中',
  followed: 'このコミュニティをフォローしました。',
  unfollowed: 'このコミュニティのフォローを解除しました。',
  followFailed: '保存できませんでした。もう一度お試しください。',
  unfollow: 'フォロー解除',
  followerOne: '1人がフォロー中',
  followerMany: '{n}人がフォロー中',
  rituals: '集まり',
  inYourHour: 'あなたの時間で',
  subscribe: '購読する',
  upcomingLabel: '予定',
  heldLabel: '開催済み',
  archive: 'アーカイブ',
  enter: '入る',
  homeToOpenLine:
    'コミュニティが拠点を開いたら、ここからブラウザで入れます。インストールは不要です。',
  members: 'メンバー',
  peopleOne: 'メンバー1人',
  peopleMany: 'メンバー{n}人',
  peopleHidden: '名前が見えるのはメンバーだけです。',
  peopleRest: 'そのほかの人',
  peopleOwner: 'オーナー',
  peopleYou: 'あなた',
  peopleLabel: 'コミュニティのメンバー',
  details: '詳細',
  whoSees: '誰が見られるか',
  everyone: '誰でも',
  howToEnter: '入り方',
  byInvitation: '招待制',
  district: '地区',
  toChoose: '未選択',
  claimTitle: 'あなたのコミュニティですか？',
  claimCta: '私のコミュニティです',
  usesTitle: 'この空間が使っているもの',
  usesHelp: 'コミュニティが使っている Numinia の要素と、それぞれの状態。',
  balance: '残高',
  usesLines: {
    home: '3D のワールド',
    gatherings: '日付のある集まり',
    archive: '記録とファイル',
    members: '参加している人',
    balance: '拠点を動かし続けるもの',
  },
  usesNoHome: 'まだ拠点はありません',
  usesComingNone: '予定なし',
  usesComingOne: '1 件予定',
  usesComingMany: '{n} 件予定',
  underConstruction: '工事中',
  stageLabel: '3D の拠点',
  homeOf: '{x} の拠点',
  homeOfToOpen: '{x} の拠点はまだ準備中です',
  worldNote: 'ブラウザで開きます。スマートフォンでも。インストール不要。',
  share: '共有',
  linkCopied: 'リンクをコピーしました',
  organisedBy: '主催',
  when: '日時',
  wholeDay: '終日',
  wholeDays: '{n} 日間、終日',
  where: '場所',
  whoCanGo: '参加できる人',
  anyone: '誰でも',
  inYourCalendar: 'カレンダーに',
  add: '追加',
  howToGetThere: 'アクセス',
  programme: 'プログラム',
  after: 'その後',
  calendarEyebrow: '都市',
  calendarTitle: 'カレンダー',
  calendarLead: 'すべてのコミュニティの集まりを月ごとに。',
  subscribeCity: 'カレンダーから購読',
  weekdays: ['月', '火', '水', '木', '金', '土', '日'],
  ritualOne: '集まり 1',
  ritualMany: '集まり {n}',
  livePageTitle: 'Live',
  livePageLead: 'いま人がいる拠点と、開催中の集まり。',
  liveNowTitle: 'いま',
  liveNowEmpty: 'いまはどの拠点にも誰もいません。',
  liveNextTitle: 'これから',
  liveNextHelp: '最も近い六つの集まり。日付は世界中で同じ日です。',
  liveNextEmpty: '予定されている集まりはありません。',
  liveHomesTitle: '開いている拠点',
  liveHomesHelp:
    'すでに3Dの拠点を持つコミュニティ。ブラウザから、スマホでも、何もインストールせずに入れます。',
  insideNone: 'いまは誰もいません',
  insideOne: 'いま1人がいます',
  insideMany: 'いま{n}人がいます',
  editLabel: 'ページを編集',
  editRitual: '集まりを編集',
  editOpen: 'GitHubで開く',
  addRitual: '集まりを追加',
  editNote:
    'オラクルであるあなたにだけ表示されます。ファイルがGitHubで開きます。保存すると変更の提案になり、別の人が承認すると公開されます。',
  belongTitle: '所属',
  belongLead: 'あなたのコミュニティと、そこで起きていること。',
  followsTitle: 'フォロー中',
  followsHelp: 'アカウントでフォローしているコミュニティと、それぞれの次の集まり。',
  followsEmpty:
    'まだ何もフォローしていません。コミュニティのページで「フォロー」を押してください。',
  memberOfTitle: '所属コミュニティ',
  memberDoor: 'ログインすると、所属しているコミュニティが表示されます。',
  signIn: 'ログイン',
  memberSoon: 'コミュニティがあなたをメンバーにすると、ここに表示されます。',
  exploreAll: 'または {n} のコミュニティを見る →',
  countNow: '開催中',
  countTomorrow: '明日',
  countDays: '{n} 日後',
  countWeeks: '{n} 週間後',
  countMonths: '{n} か月後',
  countHeld: '開催済み',
};

const KO: CommunitiesMessages = {
  weeklyNote: '정기 모임. 공개된 것은 도시 달력에도 나옵니다.',
  noUpcomingConference: '아직 공개된 것이 없습니다. 다음 회차가 공지되면 바로 여기에 나옵니다.',
  noUpcoming: '아직 공개된 것이 없습니다. 커뮤니티가 거점을 자기 것으로 만들면 공개합니다.',
  noHeldFounder: '이미 일어난 일은 그 기록과 함께 여기에 남습니다.',
  noHeld: '함께한 일이 그 기록과 함께 여기에 나옵니다.',
  chronicle: '기록',
  archiveEmpty:
    '모임의 기록과 커뮤니티가 쓰는 것은 여기에 남습니다. 커뮤니티 자신의 파일이라 언제든 가져갈 수 있습니다.',
  homeFounderNote:
    'Numen Games에는 자기 거점이 없습니다. 모두의 장소인 아고라, 관문, 도서관을 돌봅니다.',
  homeInProgressText:
    'Numen Games가 거점을 짓고 있습니다. 열리면 브라우저에, 휴대폰에도 보이고, 여기에 안에 있는 사람 수가 나옵니다.',
  membersEmpty: '아직 아무도 없습니다. 거점은 커뮤니티를 운영하는 사람을 기다립니다.',
  membersNote:
    '종류(로지, 리그, 형제단)는 세션 제로를 마친 구성원에게서 정해집니다. 그 전에는 보이지 않습니다.',
  decidedByCommunity: '언제 거점을 자기 것으로 만들지는 커뮤니티가 정합니다',
  claimText:
    '당신의 것으로. 들어와서 맡습니다. 무엇을 보여줄지, 각각을 뭐라고 부를지, 누구를 들일지는 당신이 정합니다.',
  cityKeeps: '도시 전체가 함께 기념합니다. 돌보는 곳은',
  howToAnnounce: '방법은 추후 공지',
  openNote: '공개입니다. 커뮤니티는 자기 사람들만을 위한 모임을 열 수도 있습니다.',
  addNote: 'Google, Apple 또는 쓰시는 달력용 .ics 파일',
  onlineNote: '시작되면 여기에 「들어가기」와 안에 있는 사람 수가 나옵니다.',
  readOn: '{date}에 {source}에서 읽었습니다. 커뮤니티는 언제든 바꿀 수 있습니다.',
  afterText:
    '끝나면 개최됨으로 남습니다. 온 사람 수와, 커뮤니티에 기록자가 있으면 아카이브에 그 기록이 남습니다.',
  calendarNote:
    '시간이 있는 모임은 UTC로 저장되고 당신의 시간으로 보입니다. 종일 모임은 어디서나 똑같이 보입니다. 커뮤니티마다 구독할 수 있는 자기 달력이 있습니다.',
  navCommunities: '커뮤니티',
  navCalendar: '달력',
  search: '검색',
  featuredLabel: '추천',
  slideOf: '{n} / {m}',
  nextRitual: '다음 모임',
  from: '소재지',
  home: '거점',
  homeToOpen: '준비 중',
  homeInProgress: '건설 중',
  seeCommunity: '커뮤니티 보기 →',
  seeRitual: '모임 보기 →',
  enterWorld: '월드에 들어가기',
  toMyCalendar: '내 달력에 추가',
  previous: '이전',
  next: '다음',
  upcomingEyebrow: '다가오는',
  upcomingTitle: '다음 모임',
  upcomingHelp:
    '각 커뮤니티의 모임, 대면 또는 온라인. 날짜는 전 세계 같은 날, 시간은 당신의 시간으로 표시됩니다.',
  goodsEyebrow: '바자르에서',
  goodsTitle: '거점을 위한 오브젝트',
  goodsHelp: '모두 CC0: 쓰고, 바꾸고, 가져가세요. Numinia 밖에서도.',
  seeBazaar: '바자르 보기',
  licenceLine: 'CC0 · 자유롭게, 허락 없이',
  goodCategories: {
    models: '3D 모델',
    avatars: '아바타',
    worlds: '월드',
    audio: '사운드',
    video: '비디오',
    images: '이미지',
  },
  goodCollections: {
    'numinia-avatars': 'Numinia 아바타',
    'numinia-assets': 'Numinia 오브젝트',
    'numinia-worlds': 'Numinia 월드',
    'numinia-audio': 'Numinia 사운드',
    'numinia-video': 'Numinia 비디오',
    'numinia-images': 'Numinia 이미지',
  },
  liveEyebrow: '지금',
  liveTitle: '활동 중인 커뮤니티',
  liveHelp: '모임이 가장 가까운 세 곳. 어디서 왔고 언제 모이는지.',
  firstTime: '처음 오셨나요?',
  howItWorks: '작동 방식',
  openYourHome: '커뮤니티의 거점 열기',
  founder: '도시를 세움',
  openedByHouse: 'Numen Games가 열었음',
  runBy: '운영: {x}',
  weekly: '매주',
  lastRitual: '지난 모임',
  toAnnounce: '추후 공지',
  ofTheCity: '도시의 모임',
  heldChip: '개최됨',
  modes: { 'in-person': '대면', online: '온라인', mixed: '대면과 온라인' },
  indexEyebrow: '도시',
  indexTitle: '커뮤니티',
  indexLead:
    'Numinia에 거점을 둔 커뮤니티. 숨겨진 커뮤니티는 링크로, 비공개 커뮤니티는 구성원만 볼 수 있습니다.',
  searchPlaceholder: '이름, 도시, 모임',
  searchLabel: '커뮤니티 검색',
  filterLabel: '장소로 필터',
  filterAll: '전체',
  countLine: {
    oneOne: '{m}곳의 {n}개 커뮤니티',
    oneMany: '{m}곳의 {n}개 커뮤니티',
    manyOne: '{m}곳의 {n}개 커뮤니티',
    manyMany: '{m}곳의 {n}개 커뮤니티',
  },
  noResults: '“{q}”에 맞는 커뮤니티가 없습니다. 당신의 커뮤니티인가요?',
  noResultsCta: '거점 열기',
  crumbCommunities: '커뮤니티',
  follow: '팔로우',
  following: '팔로잉',
  followed: '이 커뮤니티를 팔로우합니다.',
  unfollowed: '이 커뮤니티를 더 이상 팔로우하지 않습니다.',
  followFailed: '저장하지 못했습니다. 다시 시도하세요.',
  unfollow: '팔로우 취소',
  followerOne: '1명이 팔로우 중',
  followerMany: '{n}명이 팔로우 중',
  rituals: '모임',
  inYourHour: '당신의 시간으로',
  subscribe: '구독',
  upcomingLabel: '예정',
  heldLabel: '개최됨',
  archive: '아카이브',
  enter: '들어가기',
  homeToOpenLine:
    '커뮤니티가 거점을 열면 여기에서 브라우저로 들어갈 수 있습니다. 설치는 필요 없습니다.',
  members: '구성원',
  peopleOne: '멤버 1명',
  peopleMany: '멤버 {n}명',
  peopleHidden: '이름은 멤버에게만 보입니다.',
  peopleRest: '그 밖의 사람',
  peopleOwner: '소유자',
  peopleYou: '나',
  peopleLabel: '커뮤니티 멤버',
  details: '상세',
  whoSees: '누가 볼 수 있나',
  everyone: '모두',
  howToEnter: '입장 방법',
  byInvitation: '초대제',
  district: '구역',
  toChoose: '미정',
  claimTitle: '당신의 커뮤니티인가요?',
  claimCta: '내 커뮤니티입니다',
  usesTitle: '이 공간이 쓰는 것',
  usesHelp: '커뮤니티가 쓰는 Numinia의 요소와 각각의 상태.',
  balance: '잔액',
  usesLines: {
    home: '3D 월드',
    gatherings: '날짜가 정해진 모임',
    archive: '기록과 파일',
    members: '함께하는 사람',
    balance: '거점을 계속 켜 두는 것',
  },
  usesNoHome: '아직 거점이 없습니다',
  usesComingNone: '예정 없음',
  usesComingOne: '1개 예정',
  usesComingMany: '{n}개 예정',
  underConstruction: '공사 중',
  stageLabel: '3D 거점',
  homeOf: '{x}의 거점',
  homeOfToOpen: '{x}의 거점은 아직 준비 중입니다',
  worldNote: '브라우저에서 열립니다. 휴대폰에서도. 설치할 것이 없습니다.',
  share: '공유',
  linkCopied: '링크를 복사했습니다',
  organisedBy: '주최',
  when: '일시',
  wholeDay: '종일',
  wholeDays: '{n}일간, 종일',
  where: '장소',
  whoCanGo: '참여 가능',
  anyone: '누구나',
  inYourCalendar: '내 달력에',
  add: '추가',
  howToGetThere: '오시는 길',
  programme: '프로그램',
  after: '그 후',
  calendarEyebrow: '도시',
  calendarTitle: '달력',
  calendarLead: '모든 커뮤니티의 모임을 달마다.',
  subscribeCity: '달력에서 구독',
  weekdays: ['월', '화', '수', '목', '금', '토', '일'],
  ritualOne: '모임 1개',
  ritualMany: '모임 {n}개',
  livePageTitle: 'Live',
  livePageLead: '지금 사람이 있는 거점과 진행 중인 모임.',
  liveNowTitle: '지금',
  liveNowEmpty: '지금은 어느 거점에도 아무도 없습니다.',
  liveNextTitle: '다가오는',
  liveNextHelp: '가장 가까운 여섯 개의 모임. 날짜는 전 세계 같은 날입니다.',
  liveNextEmpty: '예정된 모임이 없습니다.',
  liveHomesTitle: '열린 거점',
  liveHomesHelp:
    '이미 3D 거점가 있는 커뮤니티입니다. 브라우저에서, 휴대폰에서도, 아무것도 설치하지 않고 들어갑니다.',
  insideNone: '지금 아무도 없음',
  insideOne: '지금 1명 있음',
  insideMany: '지금 {n}명 있음',
  editLabel: '페이지 편집',
  editRitual: '모임 편집',
  editOpen: 'GitHub에서 열기',
  addRitual: '모임 추가',
  editNote:
    '오라클인 당신에게만 보입니다. 파일이 GitHub에서 열립니다. 저장하면 변경 제안이 남고, 다른 사람이 승인하면 게시됩니다.',
  belongTitle: '소속',
  belongLead: '당신의 커뮤니티와 그곳에서 일어나는 일.',
  followsTitle: '팔로우 중',
  followsHelp: '계정에서 팔로우하는 커뮤니티와 각각의 다음 모임.',
  followsEmpty: '아직 팔로우하는 커뮤니티가 없습니다. 커뮤니티 페이지에서 「팔로우」를 누르세요.',
  memberOfTitle: '소속 커뮤니티',
  memberDoor: '로그인하면 소속된 커뮤니티를 볼 수 있습니다.',
  signIn: '로그인',
  memberSoon: '커뮤니티가 당신을 구성원으로 받으면 여기에 나타납니다.',
  exploreAll: '또는 {n}개 커뮤니티 둘러보기 →',
  countNow: '진행 중',
  countTomorrow: '내일',
  countDays: '{n}일 후',
  countWeeks: '{n}주 후',
  countMonths: '{n}개월 후',
  countHeld: '개최됨',
};

const PT_BR: CommunitiesMessages = {
  weeklyNote: 'Seus encontros fixos. Quando abertos, aparecem também no calendário da cidade.',
  noUpcomingConference:
    'Nenhum publicado ainda. A próxima edição aparece aqui assim que for anunciada.',
  noUpcoming: 'Nenhum publicado ainda. A comunidade os publica quando faz a sede sua.',
  noHeldFounder: 'O que já aconteceu fica aqui, com a sua crônica.',
  noHeld: 'O que fizemos juntos vai aparecer aqui, com a sua crônica.',
  chronicle: 'Crônica',
  archiveEmpty:
    'As crônicas dos seus encontros e o que a comunidade escrever ficam aqui. São arquivos dela: ela os leva quando quiser.',
  homeFounderNote:
    'A Numen Games não tem sede própria: cuida dos lugares de todos — a Ágora, as Portas e a Biblioteca.',
  homeInProgressText:
    'A Numen Games está construindo a sua sede. Quando abrir, vai aparecer no navegador, no celular também, e aqui vai dizer quantas pessoas estão dentro.',
  membersEmpty: 'Ninguém ainda: a sede espera por quem conduz a comunidade.',
  membersNote:
    'O tipo (Loja, Liga ou Irmandade) vem dos membros com Sessão Zero; até lá, não aparece.',
  decidedByCommunity: 'A comunidade decide quando faz a sede sua',
  claimText:
    'Faça-a sua: você entra e assume. Você decide o que aparece, como cada coisa se chama e quem entra.',
  cityKeeps: 'A cidade inteira celebra. Quem cuida é',
  howToAnnounce: 'Como, a anunciar',
  openNote: 'É aberto. Uma comunidade pode fazer um encontro só para a sua gente.',
  addNote: 'Um arquivo .ics para Google, Apple ou o que você usar',
  onlineNote: 'Quando começar, vai aparecer aqui «Entrar», com quantas pessoas estão dentro.',
  readOn: 'Lido em {source} em {date}. A comunidade muda quando quiser.',
  afterText:
    'Quando terminar, fica como realizado: quantas pessoas vieram e, se a comunidade tiver um Cronista, a sua crônica no arquivo.',
  calendarNote:
    'Encontros com hora são guardados em UTC e mostrados na sua hora. Os de dia inteiro aparecem iguais em todo lugar. Cada comunidade tem o seu próprio calendário para assinar.',
  navCommunities: 'Comunidades',
  navCalendar: 'Calendário',
  search: 'Buscar',
  featuredLabel: 'Destaque',
  slideOf: '{n} de {m}',
  nextRitual: 'Próximo encontro',
  from: 'De onde',
  home: 'Sede',
  homeToOpen: 'Por abrir',
  homeInProgress: 'Em construção',
  seeCommunity: 'Ver a comunidade →',
  seeRitual: 'Ver o encontro →',
  enterWorld: 'Entrar no mundo',
  toMyCalendar: 'No meu calendário',
  previous: 'Anterior',
  next: 'Próximo',
  upcomingEyebrow: 'O que vem',
  upcomingTitle: 'Próximos encontros',
  upcomingHelp:
    'As reuniões de cada comunidade, presenciais ou on-line. As datas são o mesmo dia no mundo todo; as horas, na sua.',
  goodsEyebrow: 'Do Bazar',
  goodsTitle: 'Objetos para a sua sede',
  goodsHelp: 'Tudo CC0: use, mude e leve com você, também fora da Numinia.',
  seeBazaar: 'Ver o Bazar',
  licenceLine: 'CC0 · livre, sem pedir permissão',
  goodCategories: {
    models: 'Modelo 3D',
    avatars: 'Avatar',
    worlds: 'Mundo',
    audio: 'Som',
    video: 'Vídeo',
    images: 'Imagem',
  },
  goodCollections: {
    'numinia-avatars': 'Avatares da Numinia',
    'numinia-assets': 'Objetos da Numinia',
    'numinia-worlds': 'Mundos da Numinia',
    'numinia-audio': 'Sons da Numinia',
    'numinia-video': 'Vídeos da Numinia',
    'numinia-images': 'Imagens da Numinia',
  },
  liveEyebrow: 'Agora',
  liveTitle: 'Comunidades com vida',
  liveHelp: 'As três com o encontro mais próximo. De onde são e quando se reúnem.',
  firstTime: 'Primeira vez aqui?',
  howItWorks: 'Como funciona',
  openYourHome: 'Abra a sede da sua comunidade',
  founder: 'Fundou a cidade',
  openedByHouse: 'Aberta pela Numen Games',
  runBy: 'Conduzida por {x}',
  weekly: 'Toda semana',
  lastRitual: 'Último encontro',
  toAnnounce: 'a anunciar',
  ofTheCity: 'Da cidade',
  heldChip: 'Realizado',
  modes: { 'in-person': 'Presencial', online: 'On-line', mixed: 'Presencial e on-line' },
  indexEyebrow: 'A cidade',
  indexTitle: 'As comunidades',
  indexLead:
    'As que têm sede na Numinia. A uma comunidade oculta se chega pelo link; uma privada só os membros veem.',
  searchPlaceholder: 'Nome, cidade ou encontro',
  searchLabel: 'Buscar uma comunidade',
  filterLabel: 'Filtrar por lugar',
  filterAll: 'Todas',
  countLine: {
    oneOne: '{n} comunidade em {m} lugar',
    oneMany: '{n} comunidade em {m} lugares',
    manyOne: '{n} comunidades em {m} lugar',
    manyMany: '{n} comunidades em {m} lugares',
  },
  noResults: 'Nenhuma comunidade com “{q}”. É a sua?',
  noResultsCta: 'Abra sua sede',
  crumbCommunities: 'Comunidades',
  follow: 'Seguir',
  following: 'Seguindo',
  followed: 'Você segue esta comunidade.',
  unfollowed: 'Você não segue mais esta comunidade.',
  followFailed: 'Não foi possível salvar. Tente de novo.',
  unfollow: 'Deixar de seguir',
  followerOne: '1 pessoa a segue',
  followerMany: '{n} pessoas a seguem',
  rituals: 'Encontros',
  inYourHour: 'na sua hora',
  subscribe: 'Assinar',
  upcomingLabel: 'Próximos',
  heldLabel: 'Já realizados',
  archive: 'Arquivo',
  enter: 'Entrar',
  homeToOpenLine:
    'Quando a comunidade abri-la, você vai entrar daqui, no navegador e sem instalar nada.',
  members: 'Membros',
  peopleOne: 'Um membro',
  peopleMany: '{n} membros',
  peopleHidden: 'Só os membros veem os nomes.',
  peopleRest: 'Mais gente',
  peopleOwner: 'Proprietária',
  peopleYou: 'você',
  peopleLabel: 'Quem faz parte da comunidade',
  details: 'Detalhes',
  whoSees: 'Quem a vê',
  everyone: 'Todo mundo',
  howToEnter: 'Como entrar',
  byInvitation: 'Por convite',
  district: 'Distrito',
  toChoose: 'A escolher',
  claimTitle: 'É a sua comunidade?',
  claimCta: 'É a minha comunidade',
  usesTitle: 'O que este espaço usa',
  usesHelp: 'As peças da Numinia que a comunidade usa e em que ponto está cada uma.',
  balance: 'Saldo',
  usesLines: {
    home: 'Seu mundo em 3D',
    gatherings: 'Seus encontros com data',
    archive: 'Suas crônicas e arquivos',
    members: 'Quem faz parte',
    balance: 'O que mantém a sede ligada',
  },
  usesNoHome: 'Ainda sem sede',
  usesComingNone: 'Nenhum à vista',
  usesComingOne: '1 próximo',
  usesComingMany: '{n} próximos',
  underConstruction: 'Em construção',
  stageLabel: 'A sede em 3D',
  homeOf: 'A sede de {x}',
  homeOfToOpen: 'A sede de {x} ainda vai abrir',
  worldNote: 'Abre no navegador, também no celular. Sem instalar nada.',
  share: 'Compartilhar',
  linkCopied: 'Link copiado',
  organisedBy: 'Organizado por',
  when: 'Quando',
  wholeDay: 'Dia inteiro',
  wholeDays: '{n} dias, de dia inteiro',
  where: 'Onde',
  whoCanGo: 'Quem pode ir',
  anyone: 'Qualquer pessoa',
  inYourCalendar: 'No seu calendário',
  add: 'Adicionar',
  howToGetThere: 'Como chegar',
  programme: 'Programa',
  after: 'Depois',
  calendarEyebrow: 'A cidade',
  calendarTitle: 'Calendário',
  calendarLead: 'Os encontros de todas as comunidades, mês a mês.',
  subscribeCity: 'Assinar do seu calendário',
  weekdays: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
  ritualOne: '1 encontro',
  ritualMany: '{n} encontros',
  livePageTitle: 'Live',
  livePageLead: 'As sedes com gente dentro agora mesmo e os encontros que estão acontecendo.',
  liveNowTitle: 'Agora',
  liveNowEmpty: 'Agora não há ninguém dentro de nenhuma sede.',
  liveNextTitle: 'O que vem',
  liveNextHelp: 'Os seis encontros mais próximos. As datas são o mesmo dia no mundo todo.',
  liveNextEmpty: 'Nenhum encontro à vista.',
  liveHomesTitle: 'Sedes abertas',
  liveHomesHelp:
    'As comunidades que já têm sede em 3D. Entra-se pelo navegador, no celular também, sem instalar nada.',
  insideNone: 'Ninguém dentro agora',
  insideOne: '1 pessoa dentro agora',
  insideMany: '{n} pessoas dentro agora',
  editLabel: 'Editar a página',
  editRitual: 'Editar o encontro',
  editOpen: 'Abrir no GitHub',
  addRitual: 'Adicionar um encontro',
  editNote:
    'Só você vê isto, como Oráculo. O arquivo abre no GitHub: ao salvar fica uma proposta de mudança, publicada quando outra pessoa a aprova.',
  belongTitle: 'Você pertence',
  belongLead: 'Suas comunidades e o que acontece nelas.',
  followsTitle: 'Você segue',
  followsHelp: 'As comunidades que você segue na sua conta, cada uma com seu próximo encontro.',
  followsEmpty: 'Você ainda não segue nenhuma. Toque em «Seguir» na página de uma comunidade.',
  memberOfTitle: 'Você pertence a',
  memberDoor: 'Entre para ver as comunidades às quais você pertence.',
  signIn: 'Entrar',
  memberSoon: 'Quando uma comunidade fizer de você um membro, ela aparecerá aqui.',
  exploreAll: 'ou explore as {n} comunidades →',
  countNow: 'agora',
  countTomorrow: 'amanhã',
  countDays: 'em {n} dias',
  countWeeks: 'em {n} semanas',
  countMonths: 'em {n} meses',
  countHeld: 'realizado',
};

export const COMMUNITIES_UI: Readonly<Record<SupportedLocale, CommunitiesMessages>> = {
  es: ES,
  en: EN,
  ja: JA,
  ko: KO,
  'pt-br': PT_BR,
};

/** Fills "{name}" holes in a message. */
export function fill(message: string, values: Readonly<Record<string, string | number>>): string {
  return message.replace(/\{(\w+)\}/g, (hole, key: string) =>
    values[key] === undefined ? hole : String(values[key]),
  );
}
