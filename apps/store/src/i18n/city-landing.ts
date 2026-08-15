/**
 * The City one-pager content — CANON, carried over verbatim from
 * numengames/numinia-web `src/content/landing.ts` (the live numinia.com
 * copy, itself derived from the Numinia deck v0.6.0). Lore languages only
 * (ES canonical + EN), per ADR-002. Do not rewrite copy here without the
 * Oracle: structure may evolve, the words are his.
 */

export type Lang = 'es' | 'en';

export interface LandingContent {
  meta: { title: string; description: string };
  nav: {
    seed: string;
    city: string;
    identity: string;
    life: string;
    game: string;
  };
  hero: {
    presentedBy: string;
    tagline: string;
    intro: string;
    ctaExplore: string;
    ctaGithub: string;
  };
  chapters: { seed: ChapterMeta; city: ChapterMeta; life: ChapterMeta; game: ChapterMeta };
  what: Section & { img: Art };
  history: Section & { img: Art };
  why: Section & { question: string; img: Art };
  engine: Section & { items: NamedItem[] };
  ecosystem: Section & { disciplines: string[]; center: string };
  construction: Section & { img: Art };
  districts: Section & {
    agora: { name: string; desc: string };
    items: District[];
  };
  numinid: Section & { img: Art };
  ranks: Section & { items: NamedItem[] };
  species: Section & { items: Species[]; question: string };
  guilds: Section & { items: Guild[]; question: string };
  factions: Section & { items: Faction[]; question: string };
  roles: Section & {
    venn: { species: string; guild: string; faction: string; role: string };
    footnote: string;
  };
  groups: Section & { items: (NamedItem & { seal: string })[] };
  diversity: Section & { img: Art };
  learning: Section & { pairs: [string, string][]; footnote: string };
  records: Section & { img: Art };
  cycle: Section & { steps: { name: string; sub: string }[]; footnote: string };
  ritual: Section & { councils: { name: string; icon: 'seal' | 'moon'; points: string[] }[] };
  lesson: Section & { img: Art };
  reality: Section & {
    playFor: { title: string; items: string[] };
    appearsIn: { title: string; items: string[] };
    footnote: string;
  };
  lab: Section & { cards: NamedItem[] };
  footer: { tagline: string; by: string; rights: string };
}

interface ChapterMeta {
  label: string;
  title: string;
}
interface Section {
  eyebrow: string;
  title: string;
  paragraphs: string[];
}
interface NamedItem {
  name: string;
  desc: string;
}
interface Art {
  src: string;
  alt: string;
}
interface District {
  name: string;
  tag: string;
  seal: string;
  spaces: string[];
}
interface Species {
  name: string;
  projection: string;
  character: string;
  field: string;
  thought: string;
  motto: string;
}
interface Guild {
  name: string;
  seal: string;
  desc: string;
  branches: { name: string; houses: string[] }[];
}
interface Faction {
  name: string;
  seal: string;
  district: string;
  desc: string;
  seedName: string;
  field: string;
  principles: string;
}

export const content: Record<Lang, LandingContent> = {
  es: {
    meta: {
      title: 'Numinia — Una ciudad para el conocimiento',
      description:
        'Numinia es un universo descentralizado donde el conocimiento está al alcance de todos: una ciudad proyectada en un tablero de juego, presentada por Numen Games.',
    },
    nav: {
      seed: 'La Semilla',
      city: 'La Ciudad',
      identity: 'Identidad',
      life: 'La Vida',
      game: 'El Juego',
    },
    hero: {
      presentedBy: 'Presentada por Numen Games',
      tagline: 'Una ciudad para el conocimiento',
      intro:
        'Un universo descentralizado donde ciencia, arte y filosofía dialogan sin fronteras. Una propuesta de futuro: un mundo de portales hacia el conocimiento compartido.',
      ctaExplore: 'Explorar la ciudad',
      ctaGithub: 'GitHub',
    },
    chapters: {
      seed: { label: 'Capítulo I', title: 'La Semilla' },
      city: { label: 'Capítulo II', title: 'La Ciudad' },
      life: { label: 'Capítulo III', title: 'La vida en Numinia' },
      game: { label: 'Capítulo IV', title: 'El Juego' },
    },
    what: {
      eyebrow: 'La voz de la ciudad',
      title: 'Qué es Numinia',
      paragraphs: [
        'Numinia no es solo la historia de la creación de una ciudad; es, ante todo, la génesis de un sueño, de un espacio mágico que adopta la forma de un gigantesco cenáculo, un lugar donde el gran conocimiento y la sabiduría pueden converger.',
        'Numinia es, por tanto, un universo descentralizado, donde la información está al alcance de todos. Una ciudad proyectada en un tablero de juego. Una propuesta de futuro, un mundo de portales hacia el conocimiento descentralizado.',
        'Porque el conocimiento es poder. Y el uso que hagamos de él depende de cada uno de nosotros, como jugadores.',
      ],
      img: { src: '/images/art/oracle.webp', alt: 'Una oráculo sostiene una esfera luminosa' },
    },
    history: {
      eyebrow: 'La génesis',
      title: 'Historia de Numinia',
      paragraphs: [
        'A comienzos del siglo XX, cinco iniciados, encabezados por un científico conocido como Holberins, concibieron Numinia como un experimento para reunir el conocimiento humano en un único espacio compartido, donde ciencia, arte y filosofía pudieran dialogar sin fronteras.',
        'La ciudad tomó forma sobre un gran tablero instalado en el Complejo Bildung; pero Holberins sabía que ninguna obra material es eterna.',
        'Antes de su destrucción a causa de un incendio en 1920, Holberins proyectó la esencia de la ciudad en los Registros Akáshicos, una memoria universal donde permanecen las ideas, los símbolos y los ecos de todo cuanto sucede, ha sucedido y sucederá.',
        'Gracias a ello, un siglo después, Numinia pudo renacer invocada por los Oráculos.',
      ],
      img: {
        src: '/images/art/genesis.webp',
        alt: 'Un globo suspendido sobre el gran tablero del Complejo Bildung',
      },
    },
    why: {
      eyebrow: '¿Por qué Numinia?',
      title: 'Una respuesta al futuro',
      paragraphs: [
        'Vivimos en una época en la que nunca ha existido tanto acceso a la información. Sin embargo, disponer de información no significa comprenderla, compartirla ni convertirla en algo valioso para una comunidad.',
        'Numinia nace de una pregunta sencilla:',
      ],
      question:
        '¿Cómo sería una ciudad concebida para organizar el conocimiento, estimular la creatividad y favorecer el aprendizaje compartido?',
      img: { src: '/images/art/reader.webp', alt: 'Una autómata lee un libro' },
    },
    engine: {
      eyebrow: 'Conectando mundos',
      title: 'El motor activo',
      paragraphs: [
        'Las ciudades nunca son únicamente un conjunto de edificios. Son la expresión física de una manera de entender el mundo. Cada calle refleja una decisión. Cada institución responde a una necesidad. Cada plaza representa una forma de encontrarse.',
        'Numinia adopta la forma de una ciudad porque una ciudad es el mejor modelo para representar un ecosistema vivo de conocimiento.',
      ],
      items: [
        { name: 'Personas', desc: 'Quienes dan vida a la ciudad.' },
        { name: 'Ideas', desc: 'El origen de toda creación.' },
        { name: 'Cultura', desc: 'El legado que compartimos.' },
        { name: 'Instituciones', desc: 'Los espacios donde el conocimiento se organiza.' },
        { name: 'Comunidad', desc: 'La red que conecta a sus ciudadanos.' },
      ],
    },
    ecosystem: {
      eyebrow: 'Arquitectura del conocimiento',
      title: 'Un ecosistema cultural',
      paragraphs: [
        'Numinia no pretende sustituir ninguna disciplina. Las conecta.',
        'Ciencia, arte, tecnología, filosofía, historia, literatura, diseño o juego dejan de entenderse como compartimentos aislados para convertirse en partes de un mismo ecosistema, donde cada descubrimiento alimenta nuevas preguntas y cada persona puede contribuir desde su propia vocación.',
      ],
      disciplines: [
        'Ciencia',
        'Arte',
        'Tecnología',
        'Filosofía',
        'Historia',
        'Literatura',
        'Diseño',
        'Juego',
      ],
      center: 'Numinia',
    },
    construction: {
      eyebrow: 'La creación colaborativa',
      title: 'Ciudad en construcción',
      paragraphs: [
        'Numinia no propone un mundo terminado. Propone un lugar que crece con las ideas, las investigaciones y las aportaciones de quienes lo habitan.',
        'No es únicamente un escenario imaginario. Es una invitación permanente a participar en la construcción colectiva del conocimiento.',
      ],
      img: {
        src: '/images/art/builder.webp',
        alt: 'Un constructor con visor trabaja entre máquinas',
      },
    },
    districts: {
      eyebrow: 'Geografía de un sueño',
      title: 'Un núcleo y cuatro distritos',
      paragraphs: [
        'Numinia no se organiza mediante fronteras, sino mediante relaciones. En su centro se encuentra el Ágora, lugar de encuentro y convergencia de toda la ciudad. A su alrededor se despliegan cuatro grandes distritos, cada uno dedicado a una dimensión esencial del conocimiento.',
      ],
      agora: {
        name: 'Ágora Plaza',
        desc: 'El corazón de la ciudad, donde todos los caminos convergen.',
      },
      items: [
        {
          name: 'Vitruvian',
          tag: 'El distrito de la educación',
          seal: '/images/seals/vitruvian.webp',
          spaces: [
            'Sociedad Histórica',
            'Biblioteca Atlantis',
            'Academia Lemuria',
            'Campus Escolástico',
          ],
        },
        {
          name: 'Sycamore',
          tag: 'El distrito del arte',
          seal: '/images/seals/sycamore.webp',
          spaces: ['Museo Akasha', 'Multiplex', 'La Forja', 'Acrópolis'],
        },
        {
          name: 'Solomon',
          tag: 'El distrito de la organización',
          seal: '/images/seals/solomon.webp',
          spaces: ['Pritaneo', 'Ateneo', 'Casa de la Moneda', 'Torre de los Alquimistas'],
        },
        {
          name: 'Ouroboros',
          tag: 'El distrito del juego',
          seal: '/images/seals/ouroboros.webp',
          spaces: [
            'Taberna Hyperborean',
            'Casa de los Enigmas',
            'Templo de Khepri',
            'Barrio Viejo',
          ],
        },
      ],
    },
    numinid: {
      eyebrow: 'Identidad de Numinia',
      title: 'El ser numínido',
      paragraphs: [
        'Numinia no está definida estrictamente por sus edificios, sus instituciones o sus distritos. Está definida por aquello o aquellos que la hacen posible.',
        'Numínido es todo aquello que participa de la identidad de Numinia. Lo son sus habitantes, pero también sus ideas, sus obras, sus símbolos y cualquier creación nacida de sus valores.',
        'Ser numínido no es un origen. Es una forma de pertenecer.',
      ],
      img: { src: '/images/art/city.webp', alt: 'Vista aérea de la ciudad de Numinia' },
    },
    ranks: {
      eyebrow: 'Los habitantes',
      title: 'Atributos y rangos',
      paragraphs: [
        'La condición de numínido no es estática. A medida que una persona participa en la vida de la ciudad, puede asumir distintos grados de implicación, responsabilidad y pertenencia. Cada rango representa una forma diferente de contribuir al desarrollo de Numinia.',
      ],
      items: [
        { name: 'Nómada', desc: 'Habitante registrado, sin ciudadanía.' },
        { name: 'Ciudadano', desc: 'Habitante con gremio y facción, participa activamente.' },
        { name: 'Peregrino', desc: 'Contribuye mediante colaboraciones o intercambios.' },
        { name: 'Vernáculo', desc: 'Forma parte del círculo de confianza de la ciudad.' },
        { name: 'Arconte', desc: 'Asume responsabilidades estratégicas y de alto nivel.' },
        { name: 'Oráculo', desc: 'Fundador y custodio de Numinia y sus principios.' },
      ],
    },
    species: {
      eyebrow: 'La identidad personal',
      title: 'Las Especies',
      paragraphs: [
        'La Especie no es una simple característica biológica, sino una configuración esencial de la identidad dentro del universo de Numinia. Cada Especie representa un campo de fuerza, un modo de pensamiento y un propósito único que las define.',
      ],
      items: [
        {
          name: 'Humanitas',
          projection: 'Disciplinas Humanísticas',
          character: 'El Idealista',
          field: 'Cultura',
          thought: 'Abstracto',
          motto: 'Custodios del significado',
        },
        {
          name: 'Cyanitas',
          projection: 'Ciencias Sociales',
          character: 'El Dialéctico',
          field: 'Conocimiento',
          thought: 'Analítico',
          motto: 'Portavoces de la razón',
        },
        {
          name: 'Reptilianos',
          projection: 'Sabiduría Primitiva',
          character: 'El Ritualista',
          field: 'Naturaleza',
          thought: 'Instintivo',
          motto: 'Guardianes de la tradición',
        },
        {
          name: 'Espectrales',
          projection: 'Ciencias Ocultas',
          character: 'El Místico',
          field: 'Éter',
          thought: 'Intuitivo',
          motto: 'Visionarios del más allá',
        },
        {
          name: 'Biomecánicos',
          projection: 'Ciencias Exactas',
          character: 'El Racional',
          field: 'Tecnología',
          thought: 'Lateral',
          motto: 'Maestros del progreso',
        },
      ],
      question: 'Las Especies responden a la pregunta: ¿Quién eres?',
    },
    guilds: {
      eyebrow: 'La identidad cultural',
      title: 'Los Gremios',
      paragraphs: [
        'Los gremios representan la vocación de cada ciudadano de Numinia. Son su sendero dentro de la ciudad, su área de especialización y el núcleo de sus habilidades. Existen cuatro grandes Gremios; cada uno contiene dos Ramas, y cada Rama contiene dos Casas.',
      ],
      items: [
        {
          name: 'Alquimistas',
          seal: '/images/seals/alquimistas.webp',
          desc: 'Mentes creativas, científicas y artísticas, desarrolladores.',
          branches: [
            { name: 'Menestrales', houses: ['Proyectistas', 'Estetas'] },
            { name: 'Ingenieros', houses: ['Arquitectos', 'Autómatas'] },
          ],
        },
        {
          name: 'Exégetas',
          seal: '/images/seals/exegetas.webp',
          desc: 'Narradores de la Historia y la leyenda, teóricos, educadores.',
          branches: [
            { name: 'Cronistas', houses: ['Logógrafos', 'Bardos'] },
            { name: 'Eruditos', houses: ['Hierofantes', 'Taumaturgos'] },
          ],
        },
        {
          name: 'Procuradores',
          seal: '/images/seals/procuradores.webp',
          desc: 'Mentes pragmáticas; gestores, administradores y legisladores.',
          branches: [
            { name: 'Legados', houses: ['Conejos Legales', 'Heraldos'] },
            { name: 'Síndicos', houses: ['Mercuriales', 'Intendentes'] },
          ],
        },
        {
          name: 'Centinelas',
          seal: '/images/seals/centinelas.webp',
          desc: 'Moderadores, custodios, pacificadores y cuidadores.',
          branches: [
            { name: 'Serafines', houses: ['Capitanes', 'Guardianes'] },
            { name: 'Arcángeles', houses: ['Sanadores', 'Exploradores'] },
          ],
        },
      ],
      question: 'Los Gremios responden a la pregunta: ¿Qué sabes?',
    },
    factions: {
      eyebrow: 'Grupos de desarrollo',
      title: 'Las Facciones',
      paragraphs: [
        'Cada distrito expresa una forma distinta de comprender el mundo. Conforman cuatro campos de desarrollo que dialogan entre sí, y que comprenden cuatro Facciones. Cada Facción de Numinia está asociada a la actividad de uno de los distritos.',
      ],
      items: [
        {
          name: 'Hermetistas',
          seal: '/images/seals/vitruvian.webp',
          district: 'Vitruvian',
          desc: 'Guardianes de la sabiduría y la erudición.',
          seedName: 'Sociedad Hermética de los Siete Principios',
          field: 'Educación',
          principles: 'Razón, disciplina, aprendizaje',
        },
        {
          name: 'Herederos de Eleusis',
          seal: '/images/seals/ouroboros.webp',
          district: 'Ouroboros',
          desc: 'Exploradores del misterio y narradores de historias.',
          seedName: 'Orden Mística de los Nuevos Cultos Eleusinos',
          field: 'Narrativa',
          principles: 'Juego, curiosidad, descubrimiento',
        },
        {
          name: 'Círculo Estelar',
          seal: '/images/seals/solomon.webp',
          district: 'Solomon',
          desc: 'Arquitectos del orden y legisladores de la ciudad.',
          seedName: 'Círculo Estelar del Estudio de la Tabla de Venus',
          field: 'Organización',
          principles: 'Orden, estrategia, gobernanza',
        },
        {
          name: 'Neo-Atlantes',
          seal: '/images/seals/sycamore.webp',
          district: 'Sycamore',
          desc: 'Visionarios que transforman la realidad desde el arte.',
          seedName: 'Confederación Internacional de la Sexta Raza Raíz',
          field: 'Artes',
          principles: 'Inspiración, innovación, expresión',
        },
      ],
      question: 'Las Facciones responden a la pregunta: ¿Qué persigues?',
    },
    roles: {
      eyebrow: 'La identidad en acción',
      title: 'Sistema de roles',
      paragraphs: [
        'La especie, el gremio y la facción no son categorías independientes. Juntas configuran el rol que cada persona desempeña en Numinia. No determinan un destino, sino una forma singular de participar en la construcción colectiva de la ciudad.',
      ],
      venn: { species: 'Especie', guild: 'Gremio', faction: 'Facción', role: 'Rol' },
      footnote:
        'El rol se manifiesta en la práctica, y responde a la pregunta: ¿Qué papel juegas en la ciudad?',
    },
    groups: {
      eyebrow: 'Espíritu colaborativo',
      title: 'Las agrupaciones',
      paragraphs: [
        'Las ideas solo transforman el mundo cuando se convierten en proyectos. En Numinia, cada misión reúne ciudadanos con perfiles diferentes que colaboran desde sus conocimientos, experiencias y perspectivas en distintas agrupaciones para construir algo que trasciende a cada individuo.',
      ],
      items: [
        {
          name: 'Logias',
          seal: '/images/seals/logias.webp',
          desc: 'Grupos de una misma facción y distintos gremios: habilidades diversas al servicio de un mismo campo de desarrollo.',
        },
        {
          name: 'Ligas',
          seal: '/images/seals/ligas.webp',
          desc: 'Grupos de diferentes facciones y un mismo gremio: los mismos conocimientos aplicados a distintos campos.',
        },
        {
          name: 'Hermandades',
          seal: '/images/seals/hermandades.webp',
          desc: 'Agrupaciones eclécticas para misiones que requieren trabajar sobre diferentes campos con variados enfoques.',
        },
      ],
    },
    diversity: {
      eyebrow: 'Inteligencia colectiva',
      title: 'La fuerza de la diversidad',
      paragraphs: [
        'Numinia no busca que todos piensen igual. Su riqueza nace del encuentro entre miradas distintas.',
        'La colaboración entre ciudadanos con identidades, formaciones y paradigmas diferentes convierte la diversidad en el principal motor de innovación y aprendizaje.',
      ],
      img: { src: '/images/art/citizens.webp', alt: 'Ciudadanos de Numinia caminando juntos' },
    },
    learning: {
      eyebrow: 'Creación abierta',
      title: 'Aprender creando',
      paragraphs: [
        'En Numinia el aprendizaje no se limita al estudio. Investigar, diseñar, escribir, organizar, experimentar o resolver problemas son formas de generar conocimiento. Cada proyecto amplía el patrimonio colectivo de la ciudad.',
        'Cada idea concluida es el inicio de una nueva. Copiar, replicar, ampliar, refundir, reinventar.',
      ],
      pairs: [
        ['Crear', 'Copiar'],
        ['Aprender', 'Combinar'],
        ['Recrear', 'Transformar'],
      ],
      footnote: 'Porque no; aún no está todo inventado. Inventar es transformar, reinterpretar.',
    },
    records: {
      eyebrow: 'Un legado compartido',
      title: 'Los Registros Akáshicos',
      paragraphs: [
        'Toda contribución deja una huella. Los Registros Akáshicos constituyen la memoria viva de Numinia.',
        'Un gran archivo donde se preservan proyectos, descubrimientos, relatos y creaciones para que puedan inspirar a quienes continúen construyendo la ciudad. El registro de lo que fue, es y será.',
        'Documentar es una labor esencial. Numinia es el documento del conocimiento universal.',
      ],
      img: { src: '/images/art/cosmos.webp', alt: 'Una galaxia: la memoria universal' },
    },
    cycle: {
      eyebrow: 'El ciclo de la ciudad',
      title: 'Una evolución sin fin',
      paragraphs: [
        'Cada nueva idea da origen a proyectos. Cada proyecto genera conocimiento. Ese conocimiento enriquece los Registros Akáshicos y se convierte, a su vez, en el punto de partida de nuevas ideas. Así, Numinia crece mediante un proceso continuo de creación y aprendizaje.',
      ],
      steps: [
        { name: 'Ideas', sub: 'Legado histórico' },
        { name: 'Proyectos', sub: 'Reinterpretación' },
        { name: 'Conocimiento', sub: 'Nueva creación' },
        { name: 'Registros Akáshicos', sub: 'Nuevo legado' },
      ],
      footnote: 'Las ideas generan nuevas ideas. Las ideas que no se ejecutan no existen.',
    },
    ritual: {
      eyebrow: 'Mente colmena',
      title: 'La importancia del ritual',
      paragraphs: [
        'Las comunidades no se construyen únicamente mediante objetivos comunes, sino también a través de rituales compartidos.',
        'En Numinia, los rituales son encuentros estructurados que permiten deliberar, crear, resolver conflictos y tomar decisiones de forma colectiva. Son espacios donde el conocimiento deja de pertenecer a una persona para convertirse en patrimonio de toda la ciudad.',
      ],
      councils: [
        {
          name: 'Dark Council',
          icon: 'seal',
          points: [
            'Deliberación',
            'Resolver problemas',
            'Tomar decisiones',
            'Contrastar perspectivas',
          ],
        },
        {
          name: 'Lunar Coven',
          icon: 'moon',
          points: ['Imaginar', 'Diseñar', 'Narrar', 'Construir'],
        },
      ],
    },
    lesson: {
      eyebrow: 'El juego como realización',
      title: 'La primera lección',
      paragraphs: [
        'Antes de escribir historias, jugábamos. Antes de comprender el mundo, lo simulábamos.',
        'El juego no es un entretenimiento posterior a la cultura. Es el mecanismo mediante el cual la cultura nace. Todo niño juega antes de comprender. Todo pueblo narra antes de legislar. Toda civilización imagina antes de construir.',
        'En Numinia, el juego no es una actividad. Es una forma de pensar y de crecer. El juego es nuestra primera narrativa, nuestra primera lección y nuestro primer impulso creativo.',
      ],
      img: { src: '/images/art/play.webp', alt: 'Un mando de juego frente a la ciudad' },
    },
    reality: {
      eyebrow: 'Dentro de la simulación',
      title: 'Creando la realidad',
      paragraphs: [
        'Los seres humanos aprendemos mediante simulaciones. No jugamos porque sea divertido. Jugamos porque es la forma más eficiente de comprender el mundo.',
      ],
      playFor: {
        title: 'Jugamos para…',
        items: [
          'explorar posibilidades',
          'ensayar decisiones',
          'descubrir consecuencias',
          'comprender sistemas',
          'construir culturas',
        ],
      },
      appearsIn: {
        title: 'Por eso el juego aparece en…',
        items: ['la ciencia', 'la filosofía', 'la política', 'el arte', 'la tecnología'],
      },
      footnote:
        'El ser humano no juega para escapar de la realidad. Juega para aprender a construirla.',
    },
    lab: {
      eyebrow: 'La diversión como consecuencia',
      title: 'El laboratorio narrativo',
      paragraphs: [
        'Numinia convierte el juego en una herramienta de creación colectiva. Aquí los jugadores no recorren una historia: la construyen.',
        'Cada sesión modifica el universo. Cada elección altera el Velo. Cada símbolo cambia de significado según quién lo interprete.',
        'El mundo no está terminado. Está siendo escrito.',
      ],
      cards: [
        { name: 'Aprendizaje', desc: 'Los humanos aprenden mejor jugando.' },
        { name: 'Realización', desc: 'Los humanos trabajan mejor jugando.' },
        { name: 'Relación', desc: 'Los humanos interactúan mejor jugando.' },
      ],
    },
    footer: {
      tagline: 'Una ciudad para el conocimiento.',
      by: 'Un proyecto de Numen Games',
      rights: 'Todos los derechos reservados.',
    },
  },

  en: {
    meta: {
      title: 'Numinia — A city for knowledge',
      description:
        'Numinia is a decentralized universe where knowledge is within everyone’s reach: a city projected onto a game board, presented by Numen Games.',
    },
    nav: {
      seed: 'The Seed',
      city: 'The City',
      identity: 'Identity',
      life: 'Life',
      game: 'The Game',
    },
    hero: {
      presentedBy: 'Presented by Numen Games',
      tagline: 'A city for knowledge',
      intro:
        'A decentralized universe where science, art and philosophy speak without borders. A proposal for the future: a world of portals to shared knowledge.',
      ctaExplore: 'Explore the city',
      ctaGithub: 'GitHub',
    },
    chapters: {
      seed: { label: 'Chapter I', title: 'The Seed' },
      city: { label: 'Chapter II', title: 'The City' },
      life: { label: 'Chapter III', title: 'Life in Numinia' },
      game: { label: 'Chapter IV', title: 'The Game' },
    },
    what: {
      eyebrow: 'The voice of the city',
      title: 'What is Numinia',
      paragraphs: [
        'Numinia is not just the story of the creation of a city; it is, above all, the genesis of a dream — a magical space that takes the form of a colossal cenacle, a place where great knowledge and wisdom can converge.',
        'Numinia is, therefore, a decentralized universe where information is within everyone’s reach. A city projected onto a game board. A proposal for the future, a world of portals to decentralized knowledge.',
        'Because knowledge is power. And the use we make of it depends on each one of us, as players.',
      ],
      img: { src: '/images/art/oracle.webp', alt: 'An oracle holds a luminous sphere' },
    },
    history: {
      eyebrow: 'The genesis',
      title: 'The history of Numinia',
      paragraphs: [
        'At the beginning of the 20th century, five initiates, led by a scientist known as Holberins, conceived Numinia as an experiment to gather human knowledge in a single shared space, where science, art and philosophy could speak without borders.',
        'The city took shape on a great board installed in the Bildung Complex; but Holberins knew that no material work is eternal.',
        'Before its destruction by fire in 1920, Holberins projected the essence of the city into the Akashic Records, a universal memory where the ideas, symbols and echoes of everything that happens, has happened and will happen remain.',
        'Thanks to that, a century later, Numinia was reborn, invoked by the Oracles.',
      ],
      img: {
        src: '/images/art/genesis.webp',
        alt: 'A globe suspended above the great board of the Bildung Complex',
      },
    },
    why: {
      eyebrow: 'Why Numinia?',
      title: 'An answer to the future',
      paragraphs: [
        'We live in an age with more access to information than ever before. Yet having information does not mean understanding it, sharing it, or turning it into something valuable for a community.',
        'Numinia is born from a simple question:',
      ],
      question:
        'What would a city look like if it were conceived to organize knowledge, spark creativity and foster shared learning?',
      img: { src: '/images/art/reader.webp', alt: 'An automaton reading a book' },
    },
    engine: {
      eyebrow: 'Connecting worlds',
      title: 'The active engine',
      paragraphs: [
        'Cities are never merely a collection of buildings. They are the physical expression of a way of understanding the world. Every street reflects a decision. Every institution answers a need. Every square represents a way of meeting.',
        'Numinia takes the form of a city because a city is the best model to represent a living ecosystem of knowledge.',
      ],
      items: [
        { name: 'People', desc: 'Those who bring the city to life.' },
        { name: 'Ideas', desc: 'The origin of all creation.' },
        { name: 'Culture', desc: 'The legacy we share.' },
        { name: 'Institutions', desc: 'The spaces where knowledge is organized.' },
        { name: 'Community', desc: 'The network that connects its citizens.' },
      ],
    },
    ecosystem: {
      eyebrow: 'Architecture of knowledge',
      title: 'A cultural ecosystem',
      paragraphs: [
        'Numinia does not intend to replace any discipline. It connects them.',
        'Science, art, technology, philosophy, history, literature, design and play stop being isolated compartments and become parts of a single ecosystem, where every discovery feeds new questions and every person can contribute from their own vocation.',
      ],
      disciplines: [
        'Science',
        'Art',
        'Technology',
        'Philosophy',
        'History',
        'Literature',
        'Design',
        'Play',
      ],
      center: 'Numinia',
    },
    construction: {
      eyebrow: 'Collaborative creation',
      title: 'A city under construction',
      paragraphs: [
        'Numinia does not propose a finished world. It proposes a place that grows with the ideas, research and contributions of those who inhabit it.',
        'It is not merely an imaginary setting. It is a standing invitation to take part in the collective construction of knowledge.',
      ],
      img: {
        src: '/images/art/builder.webp',
        alt: 'A builder with a headset works among machines',
      },
    },
    districts: {
      eyebrow: 'Geography of a dream',
      title: 'One core and four districts',
      paragraphs: [
        'Numinia is not organized by borders, but by relationships. At its center lies the Agora, the meeting point where the whole city converges. Around it unfold four great districts, each devoted to an essential dimension of knowledge.',
      ],
      agora: { name: 'Agora Plaza', desc: 'The heart of the city, where all paths converge.' },
      items: [
        {
          name: 'Vitruvian',
          tag: 'The district of education',
          seal: '/images/seals/vitruvian.webp',
          spaces: [
            'Historical Society',
            'Atlantis Library',
            'Lemuria Academy',
            'Scholastic Campus',
          ],
        },
        {
          name: 'Sycamore',
          tag: 'The district of art',
          seal: '/images/seals/sycamore.webp',
          spaces: ['Akasha Museum', 'Multiplex', 'The Forge', 'Acropolis'],
        },
        {
          name: 'Solomon',
          tag: 'The district of organization',
          seal: '/images/seals/solomon.webp',
          spaces: ['Prytaneum', 'Athenaeum', 'The Mint', 'Alchemists’ Tower'],
        },
        {
          name: 'Ouroboros',
          tag: 'The district of play',
          seal: '/images/seals/ouroboros.webp',
          spaces: ['Hyperborean Tavern', 'House of Enigmas', 'Temple of Khepri', 'Old Quarter'],
        },
      ],
    },
    numinid: {
      eyebrow: 'The identity of Numinia',
      title: 'The numinid being',
      paragraphs: [
        'Numinia is not strictly defined by its buildings, its institutions or its districts. It is defined by that — and those — who make it possible.',
        'Numinid is everything that partakes of Numinia’s identity. Its inhabitants are numinid, but so are its ideas, its works, its symbols and any creation born of its values.',
        'Being numinid is not an origin. It is a way of belonging.',
      ],
      img: { src: '/images/art/city.webp', alt: 'Aerial view of the city of Numinia' },
    },
    ranks: {
      eyebrow: 'The inhabitants',
      title: 'Attributes and ranks',
      paragraphs: [
        'The numinid condition is not static. As a person takes part in the life of the city, they can assume different degrees of involvement, responsibility and belonging. Each rank represents a different way of contributing to the development of Numinia.',
      ],
      items: [
        { name: 'Nomad', desc: 'Registered inhabitant, without citizenship.' },
        { name: 'Citizen', desc: 'Inhabitant with guild and faction, participates actively.' },
        { name: 'Pilgrim', desc: 'Contributes through collaborations or exchanges.' },
        { name: 'Vernacular', desc: 'Part of the city’s circle of trust.' },
        { name: 'Archon', desc: 'Takes on strategic, high-level responsibilities.' },
        { name: 'Oracle', desc: 'Founder and custodian of Numinia and its principles.' },
      ],
    },
    species: {
      eyebrow: 'Personal identity',
      title: 'The Species',
      paragraphs: [
        'A Species is not a mere biological trait, but an essential configuration of identity within the universe of Numinia. Each Species represents a force field, a mode of thought and a unique purpose that defines it.',
      ],
      items: [
        {
          name: 'Humanitas',
          projection: 'Humanistic Disciplines',
          character: 'The Idealist',
          field: 'Culture',
          thought: 'Abstract',
          motto: 'Custodians of meaning',
        },
        {
          name: 'Cyanitas',
          projection: 'Social Sciences',
          character: 'The Dialectician',
          field: 'Knowledge',
          thought: 'Analytical',
          motto: 'Speakers of reason',
        },
        {
          name: 'Reptilians',
          projection: 'Primal Wisdom',
          character: 'The Ritualist',
          field: 'Nature',
          thought: 'Instinctive',
          motto: 'Guardians of tradition',
        },
        {
          name: 'Spectrals',
          projection: 'Occult Sciences',
          character: 'The Mystic',
          field: 'Aether',
          thought: 'Intuitive',
          motto: 'Visionaries of the beyond',
        },
        {
          name: 'Biomechanicals',
          projection: 'Exact Sciences',
          character: 'The Rational',
          field: 'Technology',
          thought: 'Lateral',
          motto: 'Masters of progress',
        },
      ],
      question: 'The Species answer the question: Who are you?',
    },
    guilds: {
      eyebrow: 'Cultural identity',
      title: 'The Guilds',
      paragraphs: [
        'Guilds represent the vocation of every citizen of Numinia. They are their path within the city, their area of specialization and the core of their skills. There are four great Guilds; each contains two Branches, and each Branch contains two Houses.',
      ],
      items: [
        {
          name: 'Alchemists',
          seal: '/images/seals/alquimistas.webp',
          desc: 'Creative, scientific and artistic minds; builders and developers.',
          branches: [
            { name: 'Craftsmen', houses: ['Designers', 'Aesthetes'] },
            { name: 'Engineers', houses: ['Architects', 'Automata'] },
          ],
        },
        {
          name: 'Exegetes',
          seal: '/images/seals/exegetas.webp',
          desc: 'Narrators of history and legend, theorists, educators.',
          branches: [
            { name: 'Chroniclers', houses: ['Logographers', 'Bards'] },
            { name: 'Scholars', houses: ['Hierophants', 'Thaumaturges'] },
          ],
        },
        {
          name: 'Procurators',
          seal: '/images/seals/procuradores.webp',
          desc: 'Pragmatic minds; managers, administrators and lawmakers.',
          branches: [
            { name: 'Legates', houses: ['Legal Counsels', 'Heralds'] },
            { name: 'Syndics', houses: ['Mercurials', 'Intendants'] },
          ],
        },
        {
          name: 'Sentinels',
          seal: '/images/seals/centinelas.webp',
          desc: 'Moderators, custodians, peacekeepers and caretakers.',
          branches: [
            { name: 'Seraphim', houses: ['Captains', 'Guardians'] },
            { name: 'Archangels', houses: ['Healers', 'Explorers'] },
          ],
        },
      ],
      question: 'The Guilds answer the question: What do you know?',
    },
    factions: {
      eyebrow: 'Development groups',
      title: 'The Factions',
      paragraphs: [
        'Each district expresses a different way of understanding the world. Together they form four fields of development in dialogue with one another, comprising four Factions. Each Faction of Numinia is tied to the activity of one of the districts.',
      ],
      items: [
        {
          name: 'Hermetists',
          seal: '/images/seals/vitruvian.webp',
          district: 'Vitruvian',
          desc: 'Guardians of wisdom and erudition.',
          seedName: 'Hermetic Society of the Seven Principles',
          field: 'Education',
          principles: 'Reason, discipline, learning',
        },
        {
          name: 'Heirs of Eleusis',
          seal: '/images/seals/ouroboros.webp',
          district: 'Ouroboros',
          desc: 'Explorers of mystery and tellers of stories.',
          seedName: 'Mystic Order of the New Eleusinian Cults',
          field: 'Narrative',
          principles: 'Play, curiosity, discovery',
        },
        {
          name: 'Stellar Circle',
          seal: '/images/seals/solomon.webp',
          district: 'Solomon',
          desc: 'Architects of order and lawmakers of the city.',
          seedName: 'Stellar Circle for the Study of the Venus Tablet',
          field: 'Organization',
          principles: 'Order, strategy, governance',
        },
        {
          name: 'Neo-Atlanteans',
          seal: '/images/seals/sycamore.webp',
          district: 'Sycamore',
          desc: 'Visionaries who transform reality through art.',
          seedName: 'International Confederation of the Sixth Root Race',
          field: 'Arts',
          principles: 'Inspiration, innovation, expression',
        },
      ],
      question: 'The Factions answer the question: What do you pursue?',
    },
    roles: {
      eyebrow: 'Identity in action',
      title: 'The role system',
      paragraphs: [
        'Species, guild and faction are not independent categories. Together they shape the role each person plays in Numinia. They do not determine a destiny, but a singular way of taking part in the collective construction of the city.',
      ],
      venn: { species: 'Species', guild: 'Guild', faction: 'Faction', role: 'Role' },
      footnote:
        'The role shows itself in practice, and answers the question: What part do you play in the city?',
    },
    groups: {
      eyebrow: 'Collaborative spirit',
      title: 'The gatherings',
      paragraphs: [
        'Ideas only transform the world when they become projects. In Numinia, every mission brings together citizens with different profiles who collaborate from their knowledge, experience and perspectives in different gatherings, to build something that transcends each individual.',
      ],
      items: [
        {
          name: 'Lodges',
          seal: '/images/seals/logias.webp',
          desc: 'Groups from the same faction and different guilds: diverse skills in service of a single field of development.',
        },
        {
          name: 'Leagues',
          seal: '/images/seals/ligas.webp',
          desc: 'Groups from different factions and the same guild: the same knowledge applied to different fields.',
        },
        {
          name: 'Brotherhoods',
          seal: '/images/seals/hermandades.webp',
          desc: 'Eclectic gatherings for missions that require working across fields with varied approaches.',
        },
      ],
    },
    diversity: {
      eyebrow: 'Collective intelligence',
      title: 'The strength of diversity',
      paragraphs: [
        'Numinia does not seek to make everyone think alike. Its richness is born from the meeting of different gazes.',
        'Collaboration between citizens with different identities, backgrounds and paradigms turns diversity into the main engine of innovation and learning.',
      ],
      img: { src: '/images/art/citizens.webp', alt: 'Citizens of Numinia walking together' },
    },
    learning: {
      eyebrow: 'Open creation',
      title: 'Learning by creating',
      paragraphs: [
        'In Numinia, learning is not limited to study. Researching, designing, writing, organizing, experimenting and problem-solving are all ways of generating knowledge. Every project expands the collective heritage of the city.',
        'Every finished idea is the beginning of a new one. Copy, replicate, expand, recast, reinvent.',
      ],
      pairs: [
        ['Create', 'Copy'],
        ['Learn', 'Combine'],
        ['Recreate', 'Transform'],
      ],
      footnote:
        'Because no — not everything has been invented yet. To invent is to transform, to reinterpret.',
    },
    records: {
      eyebrow: 'A shared legacy',
      title: 'The Akashic Records',
      paragraphs: [
        'Every contribution leaves a trace. The Akashic Records are the living memory of Numinia.',
        'A great archive where projects, discoveries, tales and creations are preserved so they can inspire those who keep building the city. The record of what was, is and will be.',
        'Documenting is an essential labor. Numinia is the document of universal knowledge.',
      ],
      img: { src: '/images/art/cosmos.webp', alt: 'A galaxy: the universal memory' },
    },
    cycle: {
      eyebrow: 'The cycle of the city',
      title: 'An endless evolution',
      paragraphs: [
        'Every new idea gives rise to projects. Every project generates knowledge. That knowledge enriches the Akashic Records and becomes, in turn, the starting point of new ideas. Thus Numinia grows through a continuous process of creation and learning.',
      ],
      steps: [
        { name: 'Ideas', sub: 'Historical legacy' },
        { name: 'Projects', sub: 'Reinterpretation' },
        { name: 'Knowledge', sub: 'New creation' },
        { name: 'Akashic Records', sub: 'New legacy' },
      ],
      footnote: 'Ideas generate new ideas. Ideas that are not executed do not exist.',
    },
    ritual: {
      eyebrow: 'Hive mind',
      title: 'The importance of ritual',
      paragraphs: [
        'Communities are not built through common goals alone, but also through shared rituals.',
        'In Numinia, rituals are structured encounters for deliberating, creating, resolving conflicts and making decisions collectively. They are spaces where knowledge stops belonging to one person and becomes the heritage of the whole city.',
      ],
      councils: [
        {
          name: 'Dark Council',
          icon: 'seal',
          points: [
            'Deliberation',
            'Solving problems',
            'Making decisions',
            'Contrasting perspectives',
          ],
        },
        {
          name: 'Lunar Coven',
          icon: 'moon',
          points: ['Imagining', 'Designing', 'Narrating', 'Building'],
        },
      ],
    },
    lesson: {
      eyebrow: 'Play as fulfilment',
      title: 'The first lesson',
      paragraphs: [
        'Before we wrote stories, we played. Before we understood the world, we simulated it.',
        'Play is not an entertainment that comes after culture. It is the mechanism through which culture is born. Every child plays before understanding. Every people narrates before legislating. Every civilization imagines before building.',
        'In Numinia, play is not an activity. It is a way of thinking and growing. Play is our first narrative, our first lesson and our first creative impulse.',
      ],
      img: { src: '/images/art/play.webp', alt: 'A game controller facing the city' },
    },
    reality: {
      eyebrow: 'Inside the simulation',
      title: 'Creating reality',
      paragraphs: [
        'Human beings learn through simulations. We do not play because it is fun. We play because it is the most efficient way to understand the world.',
      ],
      playFor: {
        title: 'We play to…',
        items: [
          'explore possibilities',
          'rehearse decisions',
          'discover consequences',
          'understand systems',
          'build cultures',
        ],
      },
      appearsIn: {
        title: 'That is why play appears in…',
        items: ['science', 'philosophy', 'politics', 'art', 'technology'],
      },
      footnote: 'Humans do not play to escape reality. They play to learn how to build it.',
    },
    lab: {
      eyebrow: 'Fun as a consequence',
      title: 'The narrative laboratory',
      paragraphs: [
        'Numinia turns play into a tool for collective creation. Here, players do not walk through a story: they build it.',
        'Every session modifies the universe. Every choice alters the Veil. Every symbol changes its meaning depending on who interprets it.',
        'The world is not finished. It is being written.',
      ],
      cards: [
        { name: 'Learning', desc: 'Humans learn better when they play.' },
        { name: 'Fulfilment', desc: 'Humans work better when they play.' },
        { name: 'Relation', desc: 'Humans interact better when they play.' },
      ],
    },
    footer: {
      tagline: 'A city for knowledge.',
      by: 'A Numen Games project',
      rights: 'All rights reserved.',
    },
  },
};
