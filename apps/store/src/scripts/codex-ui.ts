/**
 * The reader's live labels (bookmark, mode, moon, Narrador), handed from the
 * server in the `.codex` root's data-ui attribute so the client scripts speak
 * the manual's language without shipping both dictionaries. A missing or
 * unreadable attribute keeps the original Spanish words.
 */

export interface CodexClientUi {
  readonly bookmark: string;
  readonly bookmarked: string;
  readonly narrator: string;
  readonly pause: string;
  readonly resume: string;
  readonly day: string;
  readonly night: string;
  readonly phases: readonly string[];
  readonly voice: string;
}

const SPANISH: CodexClientUi = {
  bookmark: 'Marcapáginas',
  bookmarked: 'Marcado',
  narrator: 'Narrador',
  pause: 'Pausa',
  resume: 'Seguir',
  day: 'Diurno',
  night: 'Nocturno',
  phases: [
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
};

export function codexClientUi(codex: HTMLElement | null | undefined): CodexClientUi {
  try {
    const parsed: unknown = JSON.parse(codex?.dataset.ui ?? '');
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...SPANISH, ...(parsed as Partial<CodexClientUi>) };
    }
  } catch {
    /* no labels handed over: the original words */
  }
  return SPANISH;
}
