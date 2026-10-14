/**
 * UI messages of the communities platform (home, /communities/, a
 * community's page, a ritual's page, the calendar). Typed per locale: a
 * missing translation does not compile. The register's own texts
 * (summaries, places, programmes) travel in English and Spanish inside each
 * file under src/content/communities/ and the other locales read English.
 */

import type { SupportedLocale } from '@numinia/domain';

export interface Step {
  readonly title: string;
  readonly text: string;
}

export interface CommunityKind {
  readonly name: string;
  readonly rule: string;
  readonly note: string;
}

export interface Template {
  readonly for: string;
  readonly name: string;
  readonly text: string;
  readonly ticks: readonly [string, string];
}

export interface Agent {
  readonly name: string;
  readonly text: string;
  /** 'beta' is live; 'later' is announced. */
  readonly status: 'beta' | 'later';
}

export interface CommunitiesMessages {
  // ── the bar and the footer
  readonly navCommunities: string;
  readonly navCalendar: string;
  readonly search: string;

  // ── home
  readonly eyebrow: string;
  readonly heroTitle: string;
  readonly heroLead: string;
  readonly ctaOpen: string;
  readonly ctaCommunities: string;
  readonly featured: string;
  readonly nextRitual: string;
  readonly from: string;
  readonly home: string;
  readonly homeToOpen: string;
  readonly homeInProgress: string;
  readonly seeCommunity: string;
  readonly previous: string;
  readonly next: string;
  readonly upcomingEyebrow: string;
  readonly upcomingTitle: string;
  readonly upcomingHelp: string;
  readonly fullCalendar: string;
  readonly liveEyebrow: string;
  readonly liveTitle: string;
  readonly liveHelp: string;
  readonly seeAll: string;
  readonly howEyebrow: string;
  readonly howTitle: string;
  readonly steps: readonly [Step, Step, Step, Step];
  readonly kindsEyebrow: string;
  readonly kindsTitle: string;
  readonly kindsHelp: string;
  readonly kinds: readonly [CommunityKind, CommunityKind, CommunityKind];
  readonly templatesEyebrow: string;
  readonly templatesTitle: string;
  readonly templatesHelp: string;
  readonly templates: readonly Template[];
  readonly agentsEyebrow: string;
  readonly agentsTitle: string;
  readonly agentsHelp: string;
  readonly agents: readonly Agent[];
  readonly beta: string;
  readonly later: string;
  readonly closingEyebrow: string;
  readonly closingTitle: string;
  readonly closingText: string;
  readonly closingWho: string;

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
  /** "{n}" communities, "{m}" places. */
  readonly countLine: string;
  /** "{q}" is the query. */
  readonly noResults: string;
  readonly noResultsCta: string;

  // ── a community's page
  readonly crumbCommunities: string;
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
  readonly homeFounderNote: string;
  readonly homeInProgressText: string;
  readonly homeToOpenText: string;
  readonly members: string;
  readonly membersEmpty: string;
  readonly membersNote: string;
  readonly details: string;
  readonly whoSees: string;
  readonly everyone: string;
  readonly howToEnter: string;
  readonly byInvitation: string;
  readonly decidedByCommunity: string;
  readonly district: string;
  readonly toChoose: string;
  readonly itsFile: string;
  readonly claimTitle: string;
  readonly claimText: string;
  readonly claimCta: string;

  // ── a ritual's page
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

  eyebrow: 'Numinia · una ciudad para el conocimiento',
  heroTitle: 'Una ciudad donde las comunidades tienen sede.',
  heroLead:
    'Un congreso, un aula, un equipo, una comunidad. Cada una tiene en Numinia una sede en 3D que se abre en el navegador, un calendario con sus rituales —sus reuniones, en persona o en línea— y un archivo que es suyo. La ciudad se construye con quienes entran; Numen Games fue la primera.',
  ctaOpen: 'Abre tu sede',
  ctaCommunities: 'Ver las comunidades',
  featured: 'Comunidad destacada',
  nextRitual: 'Próximo ritual',
  from: 'De dónde',
  home: 'Sede',
  homeToOpen: 'Por abrir',
  homeInProgress: 'En construcción',
  seeCommunity: 'Ver la comunidad →',
  previous: 'Anterior',
  next: 'Siguiente',
  upcomingEyebrow: 'Lo que viene',
  upcomingTitle: 'Próximos rituales',
  upcomingHelp:
    'Las reuniones de cada comunidad, en persona o en línea. Las fechas, el mismo día en todo el mundo; las horas, en la tuya.',
  fullCalendar: 'Calendario completo',
  liveEyebrow: 'Ahora mismo',
  liveTitle: 'Comunidades con vida',
  liveHelp: 'Las tres con el ritual más cercano. De dónde son y cuándo se reúnen.',
  seeAll: 'Ver todas',
  howEyebrow: 'Cómo funciona',
  howTitle: 'De la sede al archivo',
  steps: [
    {
      title: 'Abre tu sede',
      text: 'Eliges una plantilla y tu sede se abre en el navegador. Si ya hemos hecho algo juntos, te la abrimos nosotros y la haces tuya.',
    },
    {
      title: 'Session Zero',
      text: 'Cada persona cruza una sala corta y sale con su gremio y su rango, que la acompañan por toda la ciudad.',
    },
    {
      title: 'El ritual',
      text: 'Os reunís en la sede o en persona. El orden del día llega preparado y lo que decidís queda escrito.',
    },
    {
      title: 'El archivo',
      text: 'Todo lo que hacéis es un fichero vuestro. Os lo lleváis entero cuando queráis, con la sede dentro.',
    },
  ],
  kindsEyebrow: 'El canon como mecánica',
  kindsTitle: 'El tipo de comunidad lo decide su gente',
  kindsHelp:
    'Nadie elige la etiqueta: la ciudad la calcula a partir de quién está dentro, y cambia si la comunidad cambia.',
  kinds: [
    {
      name: 'Logia',
      rule: 'Misma facción, gremios distintos.',
      note: 'Saberes diversos al servicio de un mismo campo.',
    },
    {
      name: 'Liga',
      rule: 'Mismo gremio, facciones distintas.',
      note: 'El mismo saber aplicado a campos distintos.',
    },
    {
      name: 'Hermandad',
      rule: 'Mezcla de gremios y facciones.',
      note: 'Para misiones que cruzan campos.',
    },
  ],
  templatesEyebrow: 'Plantillas',
  templatesTitle: 'Empieza desde lo que ya sois',
  templatesHelp:
    'Cada plantilla trae una sede, un ritual por defecto y los nombres de cada cosa. Luego lo cambiáis todo.',
  templates: [
    {
      for: 'Aula',
      name: 'El Anfiteatro',
      text: 'Gradas, pizarra compartida y salas de grupo.',
      ticks: ['Ritual por defecto: la clase, cada semana', 'Session Zero adaptada a la asignatura'],
    },
    {
      for: 'Congreso',
      name: 'El Auditorio',
      text: 'Escenario, butacas y un vestíbulo donde cruzarse.',
      ticks: ['Ritual por defecto: la edición anual', 'Las charlas quedan en el archivo'],
    },
    {
      for: 'Equipo',
      name: 'La Sala del Consejo',
      text: 'Mesa de decisión, muro de proyectos y archivo a la vista.',
      ticks: [
        'Ritual por defecto: el consejo, cada semana',
        'Un Administrador sigue cada decisión',
      ],
    },
    {
      for: 'Aventura',
      name: 'La Cripta',
      text: 'Una sala de enigmas para equipos: se entra junto y se sale junto.',
      ticks: ['Ritual por defecto: la partida', 'Un Guía que marca el ritmo'],
    },
    {
      for: 'Artistas',
      name: 'La Galería',
      text: 'Paredes para colgar, luz para mirar y una inauguración.',
      ticks: [
        'Ritual por defecto: la inauguración',
        'Las obras, en el archivo y en el Bazar si quieres',
      ],
    },
    {
      for: 'Festival',
      name: 'La Plaza',
      text: 'Un escenario, puestos alrededor y sitio para la gente.',
      ticks: ['Ritual por defecto: el festival, cada año', 'Aforo y entradas si hacen falta'],
    },
  ],
  agentsEyebrow: 'Agentes de la comunidad',
  agentsTitle: 'La burocracia la hacen ellos',
  agentsHelp:
    'Se activan por comunidad, cada uno con una persona responsable, y se presentan siempre como lo que son.',
  agents: [
    {
      name: 'El Cronista',
      text: 'Escribe el acta y la crónica de cada ritual en el archivo.',
      status: 'beta',
    },
    {
      name: 'El Administrador',
      text: 'Prepara el orden del día y sigue cada decisión hasta cerrarla.',
      status: 'later',
    },
    {
      name: 'El Guardián',
      text: 'Cuida la convivencia y avisa cuando alguien se descuelga.',
      status: 'later',
    },
    { name: 'El Constructor', text: 'Adapta la sede con lo que hay en el Bazar.', status: 'later' },
  ],
  beta: 'Beta',
  later: 'Después',
  closingEyebrow: 'Abrimos la ciudad',
  closingTitle: 'Las comunidades que ya se reúnen entran primero.',
  closingText:
    'Si hemos hecho algo juntos, tu sede ya está abierta: entra y hazla tuya. Si no, pídela y la abrimos contigo.',
  closingWho: 'Ver quién está',

  founder: 'Fundó la ciudad',
  openedByHouse: 'La abrió Numen Games',
  runBy: 'La lleva {x}',
  weekly: 'Cada semana',
  lastRitual: 'Último ritual',
  toAnnounce: 'por anunciar',
  ofTheCity: 'De la ciudad',
  heldChip: 'Celebrado',
  modes: { 'in-person': 'En persona', online: 'En línea', mixed: 'En persona y en línea' },

  indexEyebrow: 'La ciudad',
  indexTitle: 'Las comunidades',
  indexLead:
    'Las que tienen sede en Numinia. A una comunidad oculta se llega con su enlace; una privada solo la ven sus miembros.',
  searchPlaceholder: 'Busca por nombre, ciudad o ritual',
  searchLabel: 'Buscar una comunidad',
  filterLabel: 'Filtrar por lugar',
  filterAll: 'Todas',
  countLine: '{n} comunidades en {m} lugares',
  noResults: 'Ninguna comunidad con «{q}». ¿Es la tuya?',
  noResultsCta: 'Abre tu sede',

  crumbCommunities: 'Comunidades',
  rituals: 'Rituales',
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
    'Las crónicas de sus rituales y lo que la comunidad escriba quedan aquí. Son ficheros suyos: se los lleva cuando quiera.',
  homeFounderNote:
    'Numen Games no tiene sede propia: cuida los sitios de todos, el Ágora, las Puertas y la Biblioteca.',
  homeInProgressText:
    'Numen Games le está haciendo la sede. Cuando abra, se verá en el navegador, también en el móvil, y aquí dirá cuánta gente hay dentro.',
  homeToOpenText:
    'Por abrir. Cuando la comunidad quiera, elige una plantilla y la sede se abre en el navegador; aquí dirá cuánta gente hay dentro.',
  members: 'Miembros',
  membersEmpty: 'Nadie todavía: la sede espera a quien lleve la comunidad.',
  membersNote:
    'El tipo (Logia, Liga o Hermandad) se calcula de los miembros con Session Zero; hasta entonces no se muestra.',
  details: 'Detalles',
  whoSees: 'Quién la ve',
  everyone: 'Todo el mundo',
  howToEnter: 'Cómo se entra',
  byInvitation: 'Por invitación',
  decidedByCommunity: 'Lo decide la comunidad al hacerla suya',
  district: 'Distrito',
  toChoose: 'Por elegir',
  itsFile: 'Su fichero',
  claimTitle: '¿Es tu comunidad?',
  claimText:
    'Hazla tuya: entras y pasas a llevarla. Tú decides qué se ve, cómo se llama cada cosa y quién entra.',
  claimCta: 'Es mi comunidad',

  organisedBy: 'Lo organiza',
  cityKeeps: 'Lo celebra toda la ciudad. Lo cuida',
  when: 'Cuándo',
  wholeDay: 'Día entero',
  wholeDays: '{n} días, de día entero',
  where: 'Dónde',
  howToAnnounce: 'Cómo, por anunciar',
  whoCanGo: 'Quién puede ir',
  anyone: 'Cualquiera',
  openNote: 'Es abierto. Una comunidad puede hacer un ritual solo para los suyos.',
  inYourCalendar: 'En tu calendario',
  add: 'Añadir',
  addNote: 'Un fichero .ics para Google, Apple o el que uses',
  onlineNote: 'Cuando empiece, aquí aparecerá «Entrar» y cuánta gente hay dentro.',
  programme: 'Programa',
  readOn: 'Leído en {source} el {date}. Lo cambia la comunidad cuando quiera.',
  after: 'Después',
  afterText:
    'Cuando acabe, quedará como celebrado: cuánta gente vino y, si la comunidad tiene Cronista, su crónica en el archivo.',

  calendarEyebrow: 'La ciudad',
  calendarTitle: 'Calendario',
  calendarLead: 'Los rituales de todas las comunidades, mes a mes.',
  subscribeCity: 'Suscribirte desde tu calendario',
  calendarNote:
    'Los rituales con hora se guardan en UTC y los ves en la tuya. Los de día entero se ven igual en todo el mundo. Cada comunidad tiene su propio calendario al que suscribirte.',
  weekdays: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  ritualOne: '1 ritual',
  ritualMany: '{n} rituales',

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

  eyebrow: 'Numinia · a city for knowledge',
  heroTitle: 'A city where communities have a home.',
  heroLead:
    'A conference, a classroom, a team, a community. Each has in Numinia a 3D home that opens in the browser, a calendar of its rituals — its gatherings, in person or online — and an archive that is its own. The city is built with those who enter; Numen Games was the first.',
  ctaOpen: 'Open your home',
  ctaCommunities: 'See the communities',
  featured: 'Featured community',
  nextRitual: 'Next ritual',
  from: 'From',
  home: 'Home',
  homeToOpen: 'To open',
  homeInProgress: 'Being built',
  seeCommunity: 'See the community →',
  previous: 'Previous',
  next: 'Next',
  upcomingEyebrow: 'What is coming',
  upcomingTitle: 'Upcoming rituals',
  upcomingHelp:
    'Each community’s gatherings, in person or online. Dates are the same day everywhere; hours show in yours.',
  fullCalendar: 'Full calendar',
  liveEyebrow: 'Right now',
  liveTitle: 'Communities with life',
  liveHelp: 'The three with the nearest ritual. Where they are from and when they meet.',
  seeAll: 'See all',
  howEyebrow: 'How it works',
  howTitle: 'From the home to the archive',
  steps: [
    {
      title: 'Open your home',
      text: 'Pick a template and your home opens in the browser. If we have already done something together, we open it for you and you make it yours.',
    },
    {
      title: 'Session Zero',
      text: 'Each person crosses a short room and comes out with a guild and a rank, which travel with them across the city.',
    },
    {
      title: 'The ritual',
      text: 'You gather in the home or in person. The agenda arrives prepared and what you decide is written down.',
    },
    {
      title: 'The archive',
      text: 'Everything you do is a file of yours. Take it all with you whenever you want, home included.',
    },
  ],
  kindsEyebrow: 'The canon as a mechanic',
  kindsTitle: 'The kind of community is decided by its people',
  kindsHelp:
    'Nobody picks the label: the city works it out from who is inside, and it changes when the community changes.',
  kinds: [
    {
      name: 'Lodge',
      rule: 'Same faction, different guilds.',
      note: 'Diverse knowledge in the service of one field.',
    },
    {
      name: 'League',
      rule: 'Same guild, different factions.',
      note: 'The same knowledge applied to different fields.',
    },
    {
      name: 'Brotherhood',
      rule: 'A mix of guilds and factions.',
      note: 'For missions that cross fields.',
    },
  ],
  templatesEyebrow: 'Templates',
  templatesTitle: 'Start from what you already are',
  templatesHelp:
    'Each template brings a home, a default ritual and the names of each thing. Then you change it all.',
  templates: [
    {
      for: 'Classroom',
      name: 'The Amphitheatre',
      text: 'Tiers, a shared board and breakout rooms.',
      ticks: ['Default ritual: the class, every week', 'Session Zero adapted to the subject'],
    },
    {
      for: 'Conference',
      name: 'The Auditorium',
      text: 'A stage, seats and a lobby to run into people.',
      ticks: ['Default ritual: the yearly edition', 'The talks stay in the archive'],
    },
    {
      for: 'Team',
      name: 'The Council Room',
      text: 'A decision table, a project wall and the archive in sight.',
      ticks: ['Default ritual: the council, every week', 'An Administrator follows each decision'],
    },
    {
      for: 'Adventure',
      name: 'The Crypt',
      text: 'An escape room for teams: you enter together and leave together.',
      ticks: ['Default ritual: the game', 'A Guide who sets the pace'],
    },
    {
      for: 'Artists',
      name: 'The Gallery',
      text: 'Walls to hang on, light to look by and an opening.',
      ticks: [
        'Default ritual: the opening',
        'The works, in the archive and in the Bazaar if you wish',
      ],
    },
    {
      for: 'Festival',
      name: 'The Square',
      text: 'A stage, stalls around it and room for the crowd.',
      ticks: ['Default ritual: the festival, every year', 'Capacity and tickets if needed'],
    },
  ],
  agentsEyebrow: 'The community’s agents',
  agentsTitle: 'They do the paperwork',
  agentsHelp:
    'Switched on per community, each with a person responsible, and always presented as what they are.',
  agents: [
    {
      name: 'The Chronicler',
      text: 'Writes the minutes and the chronicle of each ritual into the archive.',
      status: 'beta',
    },
    {
      name: 'The Administrator',
      text: 'Prepares the agenda and follows each decision until it closes.',
      status: 'later',
    },
    {
      name: 'The Guardian',
      text: 'Looks after the community and says when someone drifts away.',
      status: 'later',
    },
    { name: 'The Builder', text: 'Adapts the home with what the Bazaar holds.', status: 'later' },
  ],
  beta: 'Beta',
  later: 'Later',
  closingEyebrow: 'We are opening the city',
  closingTitle: 'The communities that already gather come in first.',
  closingText:
    'If we have done something together, your home is already open: come in and make it yours. If not, ask for it and we open it with you.',
  closingWho: 'See who is here',

  founder: 'Founded the city',
  openedByHouse: 'Opened by Numen Games',
  runBy: 'Run by {x}',
  weekly: 'Every week',
  lastRitual: 'Last ritual',
  toAnnounce: 'to be announced',
  ofTheCity: 'Of the city',
  heldChip: 'Held',
  modes: { 'in-person': 'In person', online: 'Online', mixed: 'In person and online' },

  indexEyebrow: 'The city',
  indexTitle: 'The communities',
  indexLead:
    'Those with a home in Numinia. A hidden community is reached by its link; a private one is seen by its members only.',
  searchPlaceholder: 'Search by name, city or ritual',
  searchLabel: 'Search for a community',
  filterLabel: 'Filter by place',
  filterAll: 'All',
  countLine: '{n} communities in {m} places',
  noResults: 'No community matches “{q}”. Is it yours?',
  noResultsCta: 'Open your home',

  crumbCommunities: 'Communities',
  rituals: 'Rituals',
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
    'The chronicles of its rituals and whatever the community writes stay here. They are its own files: it takes them whenever it wants.',
  homeFounderNote:
    'Numen Games has no home of its own: it keeps the places of everyone — the Agora, the Gates and the Library.',
  homeInProgressText:
    'Numen Games is building its home. When it opens it will show in the browser, on the phone too, and this will say how many people are inside.',
  homeToOpenText:
    'To open. When the community wishes, it picks a template and the home opens in the browser; this will say how many people are inside.',
  members: 'Members',
  membersEmpty: 'Nobody yet: the home waits for whoever runs the community.',
  membersNote:
    'The kind (Lodge, League or Brotherhood) is worked out from the members with a Session Zero; until then it is not shown.',
  details: 'Details',
  whoSees: 'Who sees it',
  everyone: 'Everyone',
  howToEnter: 'How to enter',
  byInvitation: 'By invitation',
  decidedByCommunity: 'The community decides when it makes the home its own',
  district: 'District',
  toChoose: 'To choose',
  itsFile: 'Its file',
  claimTitle: 'Is this your community?',
  claimText:
    'Make it yours: you come in and take it over. You decide what is shown, what each thing is called and who gets in.',
  claimCta: 'It is my community',

  organisedBy: 'Organised by',
  cityKeeps: 'The whole city celebrates it. It is kept by',
  when: 'When',
  wholeDay: 'Whole day',
  wholeDays: '{n} days, whole days',
  where: 'Where',
  howToAnnounce: 'How, to be announced',
  whoCanGo: 'Who can go',
  anyone: 'Anyone',
  openNote: 'It is open. A community can hold a ritual for its own people only.',
  inYourCalendar: 'In your calendar',
  add: 'Add',
  addNote: 'An .ics file for Google, Apple or whichever you use',
  onlineNote: 'When it starts, “Enter” will appear here, with how many people are inside.',
  programme: 'Programme',
  readOn: 'Read on {source} on {date}. The community changes it whenever it wants.',
  after: 'Afterwards',
  afterText:
    'When it ends it will stay as held: how many people came and, if the community has a Chronicler, its chronicle in the archive.',

  calendarEyebrow: 'The city',
  calendarTitle: 'Calendar',
  calendarLead: 'The rituals of every community, month by month.',
  subscribeCity: 'Subscribe from your calendar',
  calendarNote:
    'Timed rituals are kept in UTC and shown in your hour. Whole-day ones look the same everywhere. Each community has its own calendar to subscribe to.',
  weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  ritualOne: '1 ritual',
  ritualMany: '{n} rituals',

  countNow: 'now',
  countTomorrow: 'tomorrow',
  countDays: 'in {n} days',
  countWeeks: 'in {n} weeks',
  countMonths: 'in {n} months',
  countHeld: 'held',
};

const JA: CommunitiesMessages = {
  ...EN,
  navCommunities: 'コミュニティ',
  navCalendar: 'カレンダー',
  search: '検索',
  eyebrow: 'Numinia · 知のための都市',
  heroTitle: 'コミュニティが拠点を持つ都市。',
  heroLead:
    'カンファレンス、教室、チーム、コミュニティ。それぞれが Numinia に、ブラウザで開く 3D の拠点、対面でもオンラインでも集まる「儀式」のカレンダー、そして自分たちのものであるアーカイブを持ちます。都市は入ってくる人とともに築かれます。最初に入ったのは Numen Games でした。',
  ctaOpen: '拠点を開く',
  ctaCommunities: 'コミュニティを見る',
  featured: '注目のコミュニティ',
  nextRitual: '次の儀式',
  from: '所在地',
  home: '拠点',
  homeToOpen: '準備中',
  homeInProgress: '建設中',
  seeCommunity: 'コミュニティを見る →',
  previous: '前へ',
  next: '次へ',
  upcomingEyebrow: 'これから',
  upcomingTitle: '次の儀式',
  upcomingHelp:
    '各コミュニティの集まり。対面でもオンラインでも。日付は世界中で同じ日、時刻はあなたの時間で表示されます。',
  fullCalendar: 'カレンダー全体',
  liveEyebrow: 'いま',
  liveTitle: '動きのあるコミュニティ',
  liveHelp: '儀式が最も近い三つ。どこから来て、いつ集まるか。',
  seeAll: 'すべて見る',
  howEyebrow: '仕組み',
  howTitle: '拠点からアーカイブへ',
  closingEyebrow: '都市を開きます',
  closingTitle: 'すでに集まっているコミュニティが先に入ります。',
  closingText:
    '一緒に何かをしたことがあれば、拠点はもう開いています。入って自分のものにしてください。まだなら、申し込めば一緒に開きます。',
  closingWho: '誰がいるか見る',
  founder: '都市を創設',
  openedByHouse: 'Numen Games が開設',
  runBy: '運営：{x}',
  weekly: '毎週',
  lastRitual: '前回の儀式',
  toAnnounce: '近日発表',
  ofTheCity: '都市の儀式',
  heldChip: '開催済み',
  modes: { 'in-person': '対面', online: 'オンライン', mixed: '対面とオンライン' },
  indexEyebrow: '都市',
  indexTitle: 'コミュニティ',
  indexLead:
    'Numinia に拠点を持つコミュニティ。非公開のものはリンクから、プライベートなものはメンバーだけが見られます。',
  searchPlaceholder: '名前、都市、儀式で検索',
  searchLabel: 'コミュニティを検索',
  filterLabel: '場所で絞り込む',
  filterAll: 'すべて',
  countLine: '{m} か所に {n} のコミュニティ',
  noResults: '「{q}」に当たるコミュニティはありません。あなたのコミュニティですか？',
  noResultsCta: '拠点を開く',
  crumbCommunities: 'コミュニティ',
  rituals: '儀式',
  inYourHour: 'あなたの時間で',
  subscribe: '購読する',
  upcomingLabel: '予定',
  heldLabel: '開催済み',
  archive: 'アーカイブ',
  members: 'メンバー',
  details: '詳細',
  whoSees: '誰が見られるか',
  everyone: '誰でも',
  howToEnter: '入り方',
  byInvitation: '招待制',
  district: '地区',
  toChoose: '未選択',
  itsFile: 'ファイル',
  claimTitle: 'あなたのコミュニティですか？',
  claimCta: '私のコミュニティです',
  organisedBy: '主催',
  when: '日時',
  wholeDay: '終日',
  wholeDays: '{n} 日間、終日',
  where: '場所',
  whoCanGo: '参加できる人',
  anyone: '誰でも',
  inYourCalendar: 'カレンダーに',
  add: '追加',
  programme: 'プログラム',
  after: 'その後',
  calendarEyebrow: '都市',
  calendarTitle: 'カレンダー',
  calendarLead: 'すべてのコミュニティの儀式を月ごとに。',
  subscribeCity: 'カレンダーから購読',
  weekdays: ['月', '火', '水', '木', '金', '土', '日'],
  ritualOne: '儀式 1',
  ritualMany: '儀式 {n}',
  countNow: '開催中',
  countTomorrow: '明日',
  countDays: '{n} 日後',
  countWeeks: '{n} 週間後',
  countMonths: '{n} か月後',
  countHeld: '開催済み',
};

const KO: CommunitiesMessages = {
  ...EN,
  navCommunities: '커뮤니티',
  navCalendar: '달력',
  search: '검색',
  eyebrow: 'Numinia · 지식을 위한 도시',
  heroTitle: '커뮤니티가 거점을 갖는 도시.',
  heroLead:
    '컨퍼런스, 교실, 팀, 커뮤니티. 각각은 Numinia에서 브라우저로 열리는 3D 거점, 대면이든 온라인이든 모이는 「의식」의 달력, 그리고 자신들의 것인 아카이브를 갖습니다. 도시는 들어오는 이들과 함께 세워집니다. 처음 들어온 곳은 Numen Games였습니다.',
  ctaOpen: '거점 열기',
  ctaCommunities: '커뮤니티 보기',
  featured: '주목할 커뮤니티',
  nextRitual: '다음 의식',
  from: '소재지',
  home: '거점',
  homeToOpen: '준비 중',
  homeInProgress: '건설 중',
  seeCommunity: '커뮤니티 보기 →',
  previous: '이전',
  next: '다음',
  upcomingEyebrow: '다가오는',
  upcomingTitle: '다음 의식',
  upcomingHelp:
    '각 커뮤니티의 모임, 대면 또는 온라인. 날짜는 전 세계 같은 날, 시간은 당신의 시간으로 표시됩니다.',
  fullCalendar: '전체 달력',
  liveEyebrow: '지금',
  liveTitle: '활동 중인 커뮤니티',
  liveHelp: '의식이 가장 가까운 세 곳. 어디서 왔고 언제 모이는지.',
  seeAll: '모두 보기',
  howEyebrow: '작동 방식',
  howTitle: '거점에서 아카이브까지',
  closingEyebrow: '도시를 엽니다',
  closingTitle: '이미 모이고 있는 커뮤니티가 먼저 들어옵니다.',
  closingText:
    '함께 무언가를 한 적이 있다면 거점은 이미 열려 있습니다. 들어와서 당신의 것으로 만드세요. 아니라면 요청하세요. 함께 열겠습니다.',
  closingWho: '누가 있는지 보기',
  founder: '도시를 세움',
  openedByHouse: 'Numen Games가 열었음',
  runBy: '운영: {x}',
  weekly: '매주',
  lastRitual: '지난 의식',
  toAnnounce: '추후 공지',
  ofTheCity: '도시의 의식',
  heldChip: '개최됨',
  modes: { 'in-person': '대면', online: '온라인', mixed: '대면과 온라인' },
  indexEyebrow: '도시',
  indexTitle: '커뮤니티',
  indexLead:
    'Numinia에 거점을 둔 커뮤니티. 숨겨진 커뮤니티는 링크로, 비공개 커뮤니티는 구성원만 볼 수 있습니다.',
  searchPlaceholder: '이름, 도시, 의식으로 검색',
  searchLabel: '커뮤니티 검색',
  filterLabel: '장소로 필터',
  filterAll: '전체',
  countLine: '{m}곳의 {n}개 커뮤니티',
  noResults: '“{q}”에 맞는 커뮤니티가 없습니다. 당신의 커뮤니티인가요?',
  noResultsCta: '거점 열기',
  crumbCommunities: '커뮤니티',
  rituals: '의식',
  inYourHour: '당신의 시간으로',
  subscribe: '구독',
  upcomingLabel: '예정',
  heldLabel: '개최됨',
  archive: '아카이브',
  members: '구성원',
  details: '상세',
  whoSees: '누가 볼 수 있나',
  everyone: '모두',
  howToEnter: '입장 방법',
  byInvitation: '초대제',
  district: '구역',
  toChoose: '미정',
  itsFile: '파일',
  claimTitle: '당신의 커뮤니티인가요?',
  claimCta: '내 커뮤니티입니다',
  organisedBy: '주최',
  when: '일시',
  wholeDay: '종일',
  wholeDays: '{n}일간, 종일',
  where: '장소',
  whoCanGo: '참여 가능',
  anyone: '누구나',
  inYourCalendar: '내 달력에',
  add: '추가',
  programme: '프로그램',
  after: '그 후',
  calendarEyebrow: '도시',
  calendarTitle: '달력',
  calendarLead: '모든 커뮤니티의 의식을 달마다.',
  subscribeCity: '달력에서 구독',
  weekdays: ['월', '화', '수', '목', '금', '토', '일'],
  ritualOne: '의식 1개',
  ritualMany: '의식 {n}개',
  countNow: '진행 중',
  countTomorrow: '내일',
  countDays: '{n}일 후',
  countWeeks: '{n}주 후',
  countMonths: '{n}개월 후',
  countHeld: '개최됨',
};

const PT_BR: CommunitiesMessages = {
  ...EN,
  navCommunities: 'Comunidades',
  navCalendar: 'Calendário',
  search: 'Buscar',
  eyebrow: 'Numinia · uma cidade para o conhecimento',
  heroTitle: 'Uma cidade onde as comunidades têm sede.',
  heroLead:
    'Um congresso, uma sala de aula, uma equipe, uma comunidade. Cada uma tem na Numinia uma sede em 3D que abre no navegador, um calendário com seus rituais — seus encontros, presenciais ou on-line — e um arquivo que é seu. A cidade se constrói com quem entra; a Numen Games foi a primeira.',
  ctaOpen: 'Abra sua sede',
  ctaCommunities: 'Ver as comunidades',
  featured: 'Comunidade em destaque',
  nextRitual: 'Próximo ritual',
  from: 'De onde',
  home: 'Sede',
  homeToOpen: 'Por abrir',
  homeInProgress: 'Em construção',
  seeCommunity: 'Ver a comunidade →',
  previous: 'Anterior',
  next: 'Próximo',
  upcomingEyebrow: 'O que vem',
  upcomingTitle: 'Próximos rituais',
  upcomingHelp:
    'Os encontros de cada comunidade, presenciais ou on-line. As datas são o mesmo dia no mundo todo; as horas, na sua.',
  fullCalendar: 'Calendário completo',
  liveEyebrow: 'Agora',
  liveTitle: 'Comunidades com vida',
  liveHelp: 'As três com o ritual mais próximo. De onde são e quando se reúnem.',
  seeAll: 'Ver todas',
  howEyebrow: 'Como funciona',
  howTitle: 'Da sede ao arquivo',
  closingEyebrow: 'Abrimos a cidade',
  closingTitle: 'As comunidades que já se reúnem entram primeiro.',
  closingText:
    'Se já fizemos algo juntos, sua sede já está aberta: entre e faça dela a sua. Se não, peça e a abrimos com você.',
  closingWho: 'Ver quem está',
  founder: 'Fundou a cidade',
  openedByHouse: 'Aberta pela Numen Games',
  runBy: 'Conduzida por {x}',
  weekly: 'Toda semana',
  lastRitual: 'Último ritual',
  toAnnounce: 'a anunciar',
  ofTheCity: 'Da cidade',
  heldChip: 'Realizado',
  modes: { 'in-person': 'Presencial', online: 'On-line', mixed: 'Presencial e on-line' },
  indexEyebrow: 'A cidade',
  indexTitle: 'As comunidades',
  indexLead:
    'As que têm sede na Numinia. A uma comunidade oculta se chega pelo link; uma privada só os membros veem.',
  searchPlaceholder: 'Busque por nome, cidade ou ritual',
  searchLabel: 'Buscar uma comunidade',
  filterLabel: 'Filtrar por lugar',
  filterAll: 'Todas',
  countLine: '{n} comunidades em {m} lugares',
  noResults: 'Nenhuma comunidade com “{q}”. É a sua?',
  noResultsCta: 'Abra sua sede',
  crumbCommunities: 'Comunidades',
  rituals: 'Rituais',
  inYourHour: 'na sua hora',
  subscribe: 'Assinar',
  upcomingLabel: 'Próximos',
  heldLabel: 'Já realizados',
  archive: 'Arquivo',
  members: 'Membros',
  details: 'Detalhes',
  whoSees: 'Quem a vê',
  everyone: 'Todo mundo',
  howToEnter: 'Como entrar',
  byInvitation: 'Por convite',
  district: 'Distrito',
  toChoose: 'A escolher',
  itsFile: 'Seu arquivo',
  claimTitle: 'É a sua comunidade?',
  claimCta: 'É a minha comunidade',
  organisedBy: 'Organizado por',
  when: 'Quando',
  wholeDay: 'Dia inteiro',
  wholeDays: '{n} dias, de dia inteiro',
  where: 'Onde',
  whoCanGo: 'Quem pode ir',
  anyone: 'Qualquer pessoa',
  inYourCalendar: 'No seu calendário',
  add: 'Adicionar',
  programme: 'Programa',
  after: 'Depois',
  calendarEyebrow: 'A cidade',
  calendarTitle: 'Calendário',
  calendarLead: 'Os rituais de todas as comunidades, mês a mês.',
  subscribeCity: 'Assinar do seu calendário',
  weekdays: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
  ritualOne: '1 ritual',
  ritualMany: '{n} rituais',
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
