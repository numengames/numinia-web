/**
 * Códex reader strings (MIS-085): the interface AROUND the manual. They
 * follow the manual's language, not the site locale: /es reads the Spanish
 * original and keeps its Spanish chrome word for word; every other locale
 * reads the English edition, so its chrome is English too (see
 * codexLang() in lib/codex/source.ts). Numinia terms follow the archive's
 * translation glossary (lore/game/manual/glossary-es-en.md): Umbral →
 * Threshold, Códice → Codex, Lector Akáshico → Akashic Reader.
 *
 * Plain data, no Vite APIs: the export pipeline (scripts/build-exports.mjs)
 * bundles this module too, so the PDF/EPUB editions say the same words.
 */

export type CodexUiLang = 'es' | 'en';

export interface CodexUi {
  /** Chapter kicker: «Capítulo primero» / «Chapter One». */
  readonly chapterKicker: (number: number) => string;
  readonly moduleKicker: string;
  readonly introKicker: string;
  /** «Introducción» as the index row prefix for the introduction. */
  readonly introPrefix: string;
  /** Footer shorthand: «Cap. III · …». */
  readonly chapterShort: string;
  readonly annex: string;
  readonly cover: string;
  readonly backToCover: string;
  readonly marginNotes: string;
  readonly prevNext: string;
  readonly back: string;
  readonly home: {
    readonly title: string;
    readonly description: string;
    readonly path: string;
    readonly downloadsLabel: string;
    readonly downloadsHeading: string;
    readonly acknowledgments: string;
  };
  readonly chapterPage: {
    readonly titleSuffix: string;
    readonly description: (capActual: string) => string;
  };
  readonly index: {
    readonly label: string;
    readonly heading: string;
    readonly veiled: string;
    readonly open: string;
    readonly glossary: string;
    readonly sheet: string;
  };
  readonly glossary: {
    readonly title: string;
    readonly description: string;
    readonly path: string;
    readonly name: string;
    readonly heading: string;
  };
  readonly sheet: {
    readonly title: string;
    readonly description: string;
    readonly path: string;
    readonly name: string;
    readonly footer: string;
    readonly print: string;
    readonly download: string;
    readonly downloadFile: string;
    readonly living: string;
  };
  readonly chrome: {
    readonly index: string;
    readonly bookmark: string;
    readonly bookmarked: string;
    readonly narrator: string;
    readonly narratorTitle: string;
    readonly narratorPause: string;
    readonly narratorResume: string;
    readonly paceTitle: string;
    readonly textSize: string;
    readonly mode: string;
    readonly modeTitle: string;
    readonly day: string;
    readonly night: string;
    readonly cross: string;
    readonly prevChapter: string;
    readonly nextChapter: string;
    readonly backToBookmark: string;
    readonly progress: string;
    readonly moonPhases: readonly string[];
    /** BCP 47 tag the Narrador speaks in. */
    readonly voice: string;
  };
  readonly downloads: {
    readonly bookFile: string;
    readonly book: string;
    readonly chapterFormat: string;
    readonly chapter: string;
    readonly pdf: string;
    readonly epub: string;
  };
  readonly umbral: {
    readonly label: string;
    readonly heading: string;
    readonly body: string;
    readonly back: string;
    readonly note: string;
  };
  readonly colophon: {
    readonly seal: string;
    readonly line1: (version: string) => string;
    readonly line2: string;
    readonly line3: string;
    readonly line4: string;
  };
  readonly portada: {
    readonly label: string;
    readonly presents: string;
    readonly subtitle: string;
    readonly edition: (version: string) => string;
    readonly scroll: string;
  };
}

const ORDINALS_ES = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo'];
const ORDINALS_EN = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'];

/** File-name stem of the whole-book downloads (.md, PDF, EPUB). */
export function codexBookBase(lang: CodexUiLang, version: string): string {
  const v = version.replaceAll('.', '_');
  return lang === 'en'
    ? `Numinia_The_Roleplaying_Game_Manual_v${v}`
    : `Numinia_Manual_del_juego_de_rol_v${v}`;
}

export const CODEX_UI: Readonly<Record<CodexUiLang, CodexUi>> = {
  es: {
    chapterKicker: (number) => `Capítulo ${ORDINALS_ES[number - 1] ?? number}`,
    moduleKicker: 'Módulo',
    introKicker: 'Introducción',
    introPrefix: 'Introducción',
    chapterShort: 'Cap.',
    annex: 'Anexo',
    cover: 'Portada',
    backToCover: '← Portada',
    marginNotes: 'Notas al margen',
    prevNext: 'Anterior / Siguiente',
    back: 'Volver',
    home: {
      title: 'Códex de Numinia — Manual del juego de rol',
      description:
        'El manual del juego de rol de Numinia, leído en el Lector Akáshico Personal. Capítulo primero abierto; el libro entero, siempre libre de descargar.',
      path: '/ codex / manual-del-juego-de-rol',
      downloadsLabel: 'Descargas',
      downloadsHeading: 'El libro viaja libre',
      acknowledgments: 'Agradecimientos',
    },
    chapterPage: {
      titleSuffix: 'Códex de Numinia',
      description: (capActual) =>
        `${capActual} · Manual del juego de rol de Numinia, edición del Lector Akáshico.`,
    },
    index: {
      label: 'Índice',
      heading: 'Índice del Códex',
      veiled: 'tras el Umbral',
      open: 'abierto',
      glossary: 'Glosario',
      sheet: 'Hoja de Personaje',
    },
    glossary: {
      title: 'Glosario — Códex de Numinia',
      description:
        'Los términos del mundo de Numinia, definidos exclusivamente desde el texto del manual.',
      path: '/ codex / glosario',
      name: 'Glosario',
      heading: 'Glosario del Códex',
    },
    sheet: {
      title: 'Hoja de Personaje — Códex de Numinia',
      description:
        'La hoja de personaje del manual v0.6.0, transcrita campo a campo: imprímela o llévatela en .md.',
      path: '/ codex / ficha',
      name: 'Hoja de Personaje',
      footer: 'Anexo · Hoja de Personaje',
      print: 'Imprimir',
      download: 'Descargar .md',
      downloadFile: 'Numinia_Hoja_de_Personaje_v0_6_0.md',
      living: 'Abrir la ficha viva',
    },
    chrome: {
      index: 'Índice',
      bookmark: 'Marcapáginas',
      bookmarked: 'Marcado',
      narrator: 'Narrador',
      narratorTitle: 'El Narrador lee el capítulo en voz alta',
      narratorPause: 'Pausa',
      narratorResume: 'Seguir',
      paceTitle: 'Ritmo de lectura del Narrador',
      textSize: 'Tamaño de letra',
      mode: 'Modo del manual',
      modeTitle: 'Modo del manual — independiente del resto del LAP',
      day: 'Diurno',
      night: 'Nocturno',
      cross: 'Cruzar el Umbral',
      prevChapter: 'Capítulo anterior',
      nextChapter: 'Capítulo siguiente',
      backToBookmark: 'Volver al marcapáginas',
      progress: 'Progreso de lectura',
      moonPhases: [
        'luna nueva',
        'creciente',
        'cuarto creciente',
        'gibosa creciente',
        'casi llena',
        'gibosa',
        'vísperas del plenilunio',
        'luna llena',
      ],
      voice: 'es-ES',
    },
    downloads: {
      bookFile: '.md',
      book: 'El libro entero. Texto plano, tuyo.',
      chapterFormat: '.md · capítulo',
      chapter: 'Solo este capítulo.',
      pdf: 'Para imprimir. Edición Diurno.',
      epub: 'Para tu Kindle o lector.',
    },
    umbral: {
      label: 'El Umbral',
      heading: 'Aquí termina lo que la ciudad muestra a los viajeros.',
      body: 'Los capítulos restantes aguardan en el Lector. Cruza con tu identidad de ciudadano y el Códex recordará siempre tu página. El libro completo, además, siempre viaja libre:',
      back: 'Volver al índice',
      note: 'acceso con identidad soberana · el capítulo primero y las descargas son libres, siempre',
    },
    colophon: {
      seal: 'Sello de cierre',
      line1: (version) => `Numinia · Manual del juego de rol · versión ${version}`,
      line2: 'Autoría: Christian Märtens (80 %) · Pablo Fernández-Maquieira Martínez (20 %)',
      line3:
        'Dominio público (CC0 1.0) · Numen Games S.L. y sus autores renuncian a sus derechos · Numinia, Numen Games y Khepri son marcas',
      line4: 'Compuesto en Alegreya con el Sistema · La fuente de verdad vive en Git',
    },
    portada: {
      label: 'Portada',
      presents: 'Numen Games presenta',
      subtitle: 'El juego de rol de la ciudad escrita entre vapor y código',
      edition: (version) => `manual del juego de rol · v${version} · edición del Lector Akáshico`,
      scroll: '↓ abre el códex',
    },
  },
  en: {
    chapterKicker: (number) => `Chapter ${ORDINALS_EN[number - 1] ?? number}`,
    moduleKicker: 'Module',
    introKicker: 'Introduction',
    introPrefix: 'Introduction',
    chapterShort: 'Ch.',
    annex: 'Annex',
    cover: 'Cover',
    backToCover: '← Cover',
    marginNotes: 'Margin notes',
    prevNext: 'Previous / Next',
    back: 'Back',
    home: {
      title: 'Codex of Numinia — The Roleplaying Game Manual',
      description:
        'The Numinia roleplaying game manual, read in the Personal Akashic Reader. Chapter One is open; the whole book is always free to download.',
      path: '/ codex / roleplaying-game-manual',
      downloadsLabel: 'Downloads',
      downloadsHeading: 'The book travels free',
      acknowledgments: 'Acknowledgments',
    },
    chapterPage: {
      titleSuffix: 'Codex of Numinia',
      description: (capActual) =>
        `${capActual} · The Numinia roleplaying game manual, Akashic Reader edition.`,
    },
    index: {
      label: 'Contents',
      heading: 'Contents of the Codex',
      veiled: 'beyond the Threshold',
      open: 'open',
      glossary: 'Glossary',
      sheet: 'Character Sheet',
    },
    glossary: {
      title: 'Glossary — Codex of Numinia',
      description: 'The terms of the world of Numinia, defined solely from the text of the manual.',
      path: '/ codex / glossary',
      name: 'Glossary',
      heading: 'Glossary of the Codex',
    },
    sheet: {
      title: 'Character Sheet — Codex of Numinia',
      description:
        'The character sheet of the v0.6.0 manual, transcribed field by field: print it or take it away as .md.',
      path: '/ codex / character-sheet',
      name: 'Character Sheet',
      footer: 'Annex · Character Sheet',
      print: 'Print',
      download: 'Download .md',
      downloadFile: 'Numinia_Character_Sheet_v0_6_0.md',
      living: 'Open the living sheet',
    },
    chrome: {
      index: 'Contents',
      bookmark: 'Bookmark',
      bookmarked: 'Bookmarked',
      narrator: 'Narrator',
      narratorTitle: 'The Narrator reads the chapter aloud',
      narratorPause: 'Pause',
      narratorResume: 'Resume',
      paceTitle: 'The Narrator’s reading pace',
      textSize: 'Text size',
      mode: 'Manual mode',
      modeTitle: 'Manual mode — independent of the rest of the LAP',
      day: 'Day',
      night: 'Night',
      cross: 'Cross the Threshold',
      prevChapter: 'Previous chapter',
      nextChapter: 'Next chapter',
      backToBookmark: 'Back to the bookmark',
      progress: 'Reading progress',
      moonPhases: [
        'new moon',
        'waxing crescent',
        'first quarter',
        'waxing gibbous',
        'nearly full',
        'gibbous',
        'eve of the full moon',
        'full moon',
      ],
      voice: 'en-GB',
    },
    downloads: {
      bookFile: '.md',
      book: 'The whole book. Plain text, yours.',
      chapterFormat: '.md · chapter',
      chapter: 'Just this chapter.',
      pdf: 'For printing. Day edition.',
      epub: 'For your Kindle or e-reader.',
    },
    umbral: {
      label: 'The Threshold',
      heading: 'Here ends what the city shows to travellers.',
      body: 'The remaining chapters wait in the Reader. Cross with your citizen identity and the Codex will always remember your page. The whole book, besides, always travels free:',
      back: 'Back to the contents',
      note: 'access with a sovereign identity · Chapter One and the downloads are free, always',
    },
    colophon: {
      seal: 'Closing seal',
      line1: (version) => `Numinia · The Roleplaying Game Manual · version ${version}`,
      line2: 'Authors: Christian Märtens (80 %) · Pablo Fernández-Maquieira Martínez (20 %)',
      line3:
        'Public domain (CC0 1.0) · Numen Games S.L. and its authors waive their rights · Numinia, Numen Games and Khepri are trademarks',
      line4: 'Set in Alegreya with the System · The source of truth lives in Git',
    },
    portada: {
      label: 'Cover',
      presents: 'Numen Games presents',
      subtitle: 'The roleplaying game of the city written between steam and code',
      edition: (version) => `the roleplaying game manual · v${version} · Akashic Reader edition`,
      scroll: '↓ open the codex',
    },
  },
};
