/**
 * «Ajustes de la comunidad» (cut 8, 2026-10-16), the pure part: what an
 * organization may switch in its panel — which pieces are on and how the
 * panel names things — and the cursor of «Qué ha pasado». Everything arrives
 * from numinia.com and is read as untrusted; a malformed field is a problem
 * in words, never a throw. Pure — no database.
 *
 * The words of the vocabularies are screen words only and live in the store;
 * the till keeps the preset's id, and the back stays standard English.
 */

/** The panel pieces an organization may turn off (the summary and the settings stay on). */
const SWITCHABLE_PIECES = ['venues', 'members', 'gente', 'roles', 'balance'] as const;
export type SwitchablePiece = (typeof SWITCHABLE_PIECES)[number];

/** The three presets of «Cómo se llama cada cosa». */
const VOCABULARIES = ['simple', 'mixed', 'numinia'] as const;
export type Vocabulary = (typeof VOCABULARIES)[number];

/** Today's behaviour: the words the panel already had. */
export const DEFAULT_VOCABULARY: Vocabulary = 'mixed';

/** «Qué ha pasado» shows this many lines at a time. */
export const HAPPENINGS_PAGE = 30;

export const SETTINGS_PROBLEMS = {
  change: 'change must be an object with off (a list of pieces) and/or vocabulary, nothing else',
  off: `off must be a list of pieces, each once, among: ${SWITCHABLE_PIECES.join(', ')}`,
  vocabulary: `vocabulary must be one of: ${VOCABULARIES.join(', ')}`,
  before: 'before must be the number of a line of the log, or null',
} as const;

/** A change of settings as read: only what was sent. */
export interface SettingsChange {
  readonly off?: readonly SwitchablePiece[];
  readonly vocabulary?: Vocabulary;
}

function isPiece(value: unknown): value is SwitchablePiece {
  return SWITCHABLE_PIECES.some((piece) => piece === value);
}

function isVocabulary(value: unknown): value is Vocabulary {
  return VOCABULARIES.some((vocabulary) => vocabulary === value);
}

/** A list of switchable pieces, each once, in the order of the panel; or undefined. */
export function readOff(value: unknown): SwitchablePiece[] | undefined {
  if (!Array.isArray(value) || value.length > SWITCHABLE_PIECES.length) return undefined;
  if (!value.every(isPiece) || new Set(value).size !== value.length) return undefined;
  return SWITCHABLE_PIECES.filter((piece) => value.includes(piece));
}

/** A preset's id, or undefined. */
export function readVocabulary(value: unknown): Vocabulary | undefined {
  return isVocabulary(value) ? value : undefined;
}

/** A change: an object with `off` and/or `vocabulary`; or the problems in words. */
export function readChange(
  value: unknown,
): { readonly change: SettingsChange } | { readonly problems: string[] } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { problems: [SETTINGS_PROBLEMS.change] };
  }
  const sent = value as Readonly<Record<string, unknown>>;
  const keys = Object.keys(sent);
  if (keys.length === 0 || keys.some((key) => key !== 'off' && key !== 'vocabulary')) {
    return { problems: [SETTINGS_PROBLEMS.change] };
  }
  const off = 'off' in sent ? readOff(sent['off']) : undefined;
  const vocabulary = 'vocabulary' in sent ? readVocabulary(sent['vocabulary']) : undefined;
  const problems = [
    ...('off' in sent && off === undefined ? [SETTINGS_PROBLEMS.off] : []),
    ...('vocabulary' in sent && vocabulary === undefined ? [SETTINGS_PROBLEMS.vocabulary] : []),
  ];
  if (problems.length > 0) return { problems };
  return {
    change: {
      ...(off === undefined ? {} : { off }),
      ...(vocabulary === undefined ? {} : { vocabulary }),
    },
  };
}

/** The pieces a stored `pieces_off` names: whatever is no longer a piece is dropped. */
export function storedOff(json: string): SwitchablePiece[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? SWITCHABLE_PIECES.filter((piece) => parsed.includes(piece)) : [];
  } catch {
    return [];
  }
}

/** The cursor of «Qué ha pasado»: null for the newest page, else the `seq` the page goes before. */
export function readBefore(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
