/**
 * La Ciudad — narrative content (MISSION-004, source: the v0.6.0 deck).
 * Shell labels exist in all 5 locales; deep lore prose is ES+EN only
 * (ADR-002) — other locales read EN behind a language notice.
 */

import type { SupportedLocale } from '@numinia/domain';

/** Shell labels — required in every locale (typed like all UI messages). */
export interface CityMessages {
  readonly cityTitle: string;
  readonly cityIntro: string;
  readonly inhabitantsTitle: string;
  readonly districtsTitle: string;
  readonly gameTitle: string;
  readonly speciesLabel: string;
  readonly guildsLabel: string;
  readonly factionsLabel: string;
  readonly ranksLabel: string;
  readonly readMore: string;
}

export const CITY_MESSAGES: Readonly<Record<SupportedLocale, CityMessages>> = {
  es: {
    cityTitle: 'La Ciudad',
    cityIntro:
      'Qué es Numinia: una ciudad para el conocimiento, proyectada en un tablero de juego.',
    inhabitantsTitle: 'Los habitantes',
    districtsTitle: 'Distritos y espacios',
    gameTitle: 'El juego',
    speciesLabel: 'Las Especies — ¿quién eres?',
    guildsLabel: 'Los Gremios — ¿qué sabes?',
    factionsLabel: 'Las Facciones — ¿qué persigues?',
    ranksLabel: 'Los rangos',
    readMore: 'Seguir leyendo',
  },
  en: {
    cityTitle: 'The City',
    cityIntro: 'What Numinia is: a city for knowledge, projected onto a game board.',
    inhabitantsTitle: 'The inhabitants',
    districtsTitle: 'Districts and spaces',
    gameTitle: 'The game',
    speciesLabel: 'The Species — who are you?',
    guildsLabel: 'The Guilds — what do you know?',
    factionsLabel: 'The Factions — what do you pursue?',
    ranksLabel: 'The ranks',
    readMore: 'Keep reading',
  },
  ja: {
    cityTitle: '都市',
    cityIntro: 'ヌミニアとは:ゲーム盤の上に描かれた、知識のための都市。',
    inhabitantsTitle: '住民たち',
    districtsTitle: '地区と空間',
    gameTitle: 'ゲーム',
    speciesLabel: '種族 — あなたは誰?',
    guildsLabel: 'ギルド — 何を知っている?',
    factionsLabel: '派閥 — 何を追い求める?',
    ranksLabel: 'ランク',
    readMore: '続きを読む',
  },
  ko: {
    cityTitle: '도시',
    cityIntro: '누미니아란: 게임 보드 위에 투영된 지식의 도시.',
    inhabitantsTitle: '주민들',
    districtsTitle: '구역과 공간',
    gameTitle: '게임',
    speciesLabel: '종족 — 당신은 누구인가?',
    guildsLabel: '길드 — 무엇을 아는가?',
    factionsLabel: '파벌 — 무엇을 추구하는가?',
    ranksLabel: '랭크',
    readMore: '계속 읽기',
  },
  'pt-br': {
    cityTitle: 'A Cidade',
    cityIntro:
      'O que é Numinia: uma cidade para o conhecimento, projetada em um tabuleiro de jogo.',
    inhabitantsTitle: 'Os habitantes',
    districtsTitle: 'Distritos e espaços',
    gameTitle: 'O jogo',
    speciesLabel: 'As Espécies — quem é você?',
    guildsLabel: 'As Guildas — o que você sabe?',
    factionsLabel: 'As Facções — o que você busca?',
    ranksLabel: 'Os ranks',
    readMore: 'Continuar lendo',
  },
};

/** Deep lore (ADR-002): ES canonical + EN. */
interface CityLore {
  readonly whatIs: readonly string[];
  readonly history: readonly string[];
  readonly engine: string;
  readonly inhabitantsIntro: string;
  readonly roleSystem: readonly string[];
  readonly groupings: readonly { name: string; body: string }[];
  readonly districtsIntro: readonly string[];
  readonly gameBody: readonly string[];
  readonly akashic: readonly string[];
  readonly cycle: string;
}

export const CITY_LORE: Readonly<Record<'es' | 'en', CityLore>> = {
  es: {
    whatIs: [
      'Numinia no es solo la historia de la creación de una ciudad; es, ante todo, la génesis de un sueño: un espacio mágico con forma de gigantesco cenáculo donde el gran conocimiento y la sabiduría pueden converger.',
      'Es un universo descentralizado, donde la información está al alcance de todos. Una ciudad proyectada en un tablero de juego; un mundo de portales hacia el conocimiento descentralizado.',
      'Numinia es un metajuego: jugarlo es construir la ciudad, y construir la ciudad es aprender. Porque el conocimiento es poder, y el uso que hagamos de él depende de cada uno de nosotros, como jugadores.',
    ],
    history: [
      'A comienzos del siglo XX, cinco iniciados encabezados por el científico Holberins concibieron Numinia como un experimento: reunir el conocimiento humano en un único espacio compartido, donde ciencia, arte y filosofía dialogaran sin fronteras. La ciudad tomó forma sobre un gran tablero instalado en el Complejo Bildung.',
      'Antes de su destrucción por un incendio en 1920, Holberins proyectó la esencia de la ciudad en los Registros Akáshicos — una memoria universal donde permanecen las ideas, los símbolos y los ecos de todo cuanto sucede, ha sucedido y sucederá. Gracias a ello, un siglo después, Numinia pudo renacer invocada por los Oráculos.',
    ],
    engine:
      'Las ciudades nunca son solo edificios: son la expresión física de una manera de entender el mundo. Numinia adopta la forma de una ciudad porque una ciudad es el mejor modelo para representar un ecosistema vivo de conocimiento — personas, ideas, cultura, instituciones y comunidad.',
    inhabitantsIntro:
      'Numínido es todo aquello que participa de la identidad de Numinia: sus habitantes, pero también sus ideas, sus obras y sus símbolos. Ser numínido no es un origen: es una forma de pertenecer.',
    roleSystem: [
      'La especie, el gremio y la facción no son categorías independientes. Juntas configuran el rol que cada persona desempeña en Numinia: la especie responde a ¿quién eres?, el gremio a ¿qué sabes?, la facción a ¿qué persigues?',
      'No determinan un destino, sino una forma singular de participar en la construcción colectiva de la ciudad.',
    ],
    groupings: [
      {
        name: 'Logias',
        body: 'Individuos de una misma facción y distintos gremios: un propósito que requiere habilidades diversas, enfocado en un campo de desarrollo.',
      },
      {
        name: 'Ligas',
        body: 'Individuos de diferentes facciones y el mismo gremio: los mismos conocimientos aplicados a distintos campos.',
      },
      {
        name: 'Hermandades',
        body: 'Agrupaciones eclécticas para misiones que cruzan campos, enfoques y saberes.',
      },
    ],
    districtsIntro: [
      'Numinia no se organiza mediante fronteras, sino mediante relaciones. En su centro está el Ágora, lugar de encuentro y convergencia de toda la ciudad; a su alrededor se despliegan cuatro grandes distritos, cada uno dedicado a una dimensión esencial del conocimiento.',
      'Los espacios de la urbe se reparten entre los distritos: en el centro se halla la narrativa; a los lados, la organización y la educación; y las artes orbitan, itinerantes, los otros tres campos.',
    ],
    gameBody: [
      'Antes de escribir historias, jugábamos. Antes de comprender el mundo, lo simulábamos. El juego no es un entretenimiento posterior a la cultura: es el mecanismo mediante el cual la cultura nace.',
      'En Numinia el juego no es una actividad: es una forma de pensar y de crecer. Jugamos para explorar posibilidades, ensayar decisiones, descubrir consecuencias, comprender sistemas y construir culturas.',
      'La diversión es solo una consecuencia. La esencia del juego es interpretar: ¿qué significa esto?, ¿cómo debo actuar?, ¿qué consecuencias tendrá? Jugar consiste en construir significado.',
      'Aquí los jugadores no recorren una historia: la construyen. Cada sesión modifica el universo. Cada elección altera el Velo. El mundo no está terminado — está siendo escrito.',
    ],
    akashic: [
      'Toda contribución deja una huella. Los Registros Akáshicos constituyen la memoria viva de Numinia: un gran archivo donde se preservan proyectos, descubrimientos, relatos y creaciones para inspirar a quienes continúen construyendo la ciudad.',
      'El registro de lo que fue, es y será. Documentar es una labor esencial: Numinia es el documento del conocimiento universal.',
    ],
    cycle:
      'Cada nueva idea da origen a proyectos. Cada proyecto genera conocimiento. Ese conocimiento enriquece los Registros Akáshicos y se convierte en el punto de partida de nuevas ideas. Las ideas que no se ejecutan no existen.',
  },
  en: {
    whatIs: [
      'Numinia is not merely the story of a city being built; it is, above all, the genesis of a dream: a magical space shaped like a vast cenacle where great knowledge and wisdom can converge.',
      'It is a decentralized universe where information is within everyone’s reach. A city projected onto a game board; a world of portals toward decentralized knowledge.',
      'Numinia is a metagame: to play it is to build the city, and to build the city is to learn. Because knowledge is power — and what we do with it is up to each of us, as players.',
    ],
    history: [
      'At the start of the 20th century, five initiates led by the scientist Holberins conceived Numinia as an experiment: gathering human knowledge in a single shared space where science, art, and philosophy could talk without borders. The city took shape on a great board installed in the Bildung Complex.',
      'Before its destruction by fire in 1920, Holberins projected the city’s essence into the Akashic Records — a universal memory where ideas, symbols, and the echoes of all that happens, has happened, and will happen remain. Thanks to that, a century later, Numinia was reborn, invoked by the Oracles.',
    ],
    engine:
      'Cities are never just buildings: they are the physical expression of a way of understanding the world. Numinia takes the shape of a city because a city is the best model for a living ecosystem of knowledge — people, ideas, culture, institutions, and community.',
    inhabitantsIntro:
      'Numinid is everything that partakes in Numinia’s identity: its inhabitants, but also its ideas, its works, its symbols. Being numinid is not an origin — it is a way of belonging.',
    roleSystem: [
      'Species, guild, and faction are not independent categories. Together they configure the role each person plays in Numinia: species answers who are you?, guild answers what do you know?, faction answers what do you pursue?',
      'They do not determine a destiny — they shape a singular way of taking part in the collective construction of the city.',
    ],
    groupings: [
      {
        name: 'Lodges',
        body: 'People of one faction and different guilds: a purpose that needs diverse skills, focused on one field of development.',
      },
      {
        name: 'Leagues',
        body: 'People of different factions and the same guild: the same knowledge applied across different fields.',
      },
      {
        name: 'Brotherhoods',
        body: 'Eclectic groupings for missions that cross fields, approaches, and knowledge.',
      },
    ],
    districtsIntro: [
      'Numinia is organized not by borders but by relations. At its center lies the Ágora, the meeting point of the whole city; around it unfold four great districts, each devoted to an essential dimension of knowledge.',
      'The city’s spaces are distributed among the districts: narrative at the center; organization and education at the sides; and the arts orbit, itinerant, around the other three fields.',
    ],
    gameBody: [
      'Before we wrote stories, we played. Before we understood the world, we simulated it. Play is not entertainment that comes after culture: it is the mechanism through which culture is born.',
      'In Numinia, play is not an activity: it is a way of thinking and growing. We play to explore possibilities, rehearse decisions, discover consequences, understand systems, and build cultures.',
      'Fun is only a consequence. The essence of play is interpretation: what does this mean? how should I act? what consequences will it have? To play is to build meaning.',
      'Here players do not walk through a story: they build it. Every session modifies the universe. Every choice alters the Veil. The world is not finished — it is being written.',
    ],
    akashic: [
      'Every contribution leaves a trace. The Akashic Records are Numinia’s living memory: a great archive preserving projects, discoveries, tales, and creations to inspire those who keep building the city.',
      'The record of what was, is, and will be. Documenting is essential work: Numinia is the document of universal knowledge.',
    ],
    cycle:
      'Every new idea gives rise to projects. Every project generates knowledge. That knowledge enriches the Akashic Records and becomes the starting point of new ideas. Ideas that are not executed do not exist.',
  },
};

/** Lore locale resolution + notice (same pattern as legal/docs). */
export function loreLocale(locale: SupportedLocale): 'es' | 'en' {
  return locale === 'es' ? 'es' : 'en';
}

export const CITY_LANGUAGE_NOTICE: Partial<Record<SupportedLocale, string>> = {
  ja: 'この物語は現在、スペイン語と英語で提供されています。',
  ko: '이 이야기는 현재 스페인어와 영어로 제공됩니다.',
  'pt-br': 'Esta narrativa está disponível em espanhol e inglês por enquanto.',
};
