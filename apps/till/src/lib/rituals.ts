/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17), the pure part: what
 * an encounter («encuentro», code `ritual`) published from numinia.com is,
 * and how its fields are read from what the site sends, as untrusted. A
 * malformed field is a problem in words, never a throw. Pure — no database.
 */

const RITUAL_MODES = ['in-person', 'online', 'mixed'] as const;
export type RitualMode = (typeof RITUAL_MODES)[number];

/** The title and the place are this long at most; the note, `RITUAL_NOTE_MAX`. */
export const RITUAL_TITLE_MAX = 120;
export const RITUAL_WHERE_MAX = 200;
export const RITUAL_NOTE_MAX = 600;
/** The most community ids one list asks for at once. */
export const RITUAL_COMMUNITIES_MAX = 100;

const TILL_RITUAL_ID = /^rit_[0-9a-f]{16}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const WORLD_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
// C0 and C1 control characters, as a published name refuses them.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export const RITUAL_PROBLEMS = {
  ritualId: 'ritualId must be an encounter id of the till (rit_ and 16 hex)',
  title: `title must be text of 1 to ${RITUAL_TITLE_MAX} characters, none of them a control character`,
  when: 'start and end must both be days (YYYY-MM-DD) or both instants in UTC (…Z), the end not before the start',
  mode: `mode must be one of: ${RITUAL_MODES.join(', ')}`,
  where: `where must be text of 1 to ${RITUAL_WHERE_MAX} characters, none of them a control character`,
  note: `note must be text of ${RITUAL_NOTE_MAX} characters at most, none of them a control character, or null`,
  worldId: 'worldId must be a world id (lowercase slug) or null',
  communityIds: `communityIds must be a list of 0 to ${RITUAL_COMMUNITIES_MAX} community ids, or null`,
  notAllowed:
    'only the house or an administrator of the community publishes and cancels its encounters',
  noSuchRitual: 'no such encounter',
  cancelled: 'that encounter is cancelled already',
  noOrganization: 'the organization of that community is not open: nobody runs it yet',
} as const;

/** A ritual id as the till writes it (`rit_` and 16 hex), or undefined. */
export function readTillRitualId(value: unknown): string | undefined {
  return typeof value === 'string' && TILL_RITUAL_ID.test(value) ? value : undefined;
}

/** A new encounter's id: random, `rit_` and 16 hex. */
export function tillRitualId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `rit_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** Trimmed text of 1 to `max` characters without control characters, or undefined. */
function readText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || CONTROL.test(value)) return undefined;
  const text = value.trim();
  return text.length >= 1 && text.length <= max ? text : undefined;
}

export function readTitle(value: unknown): string | undefined {
  return readText(value, RITUAL_TITLE_MAX);
}

export function readWhere(value: unknown): string | undefined {
  return readText(value, RITUAL_WHERE_MAX);
}

/** The note: null for nothing or blank, the trimmed text up to 600 clean characters, undefined otherwise. */
export function readRitualNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || CONTROL.test(value)) return undefined;
  const note = value.trim();
  if (note.length === 0) return null;
  return note.length <= RITUAL_NOTE_MAX ? note : undefined;
}

export function readMode(value: unknown): RitualMode | undefined {
  return RITUAL_MODES.some((mode) => mode === value) ? (value as RitualMode) : undefined;
}

/** A world id or null for none; undefined when it is not one. */
export function readWorldId(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' && WORLD_ID.test(value) ? value : undefined;
}

export interface RitualWhen {
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
}

/** A real calendar day (the instant must read back as written) or a real instant. */
function realDay(text: string): boolean {
  const ms = Date.parse(`${text}T00:00:00.000Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === text;
}

function realInstant(text: string): boolean {
  const ms = Date.parse(text);
  return Number.isFinite(ms) && new Date(ms).toISOString() === text;
}

/**
 * When: both days (a whole-day encounter, the end its inclusive last day;
 * an absent end is the start) or both instants in UTC, the end not before
 * the start. Undefined otherwise.
 */
export function readWhen(sentStart: unknown, sentEnd: unknown): RitualWhen | undefined {
  if (typeof sentStart !== 'string') return undefined;
  const end = sentEnd === undefined || sentEnd === null ? sentStart : sentEnd;
  if (typeof end !== 'string') return undefined;
  if (DAY.test(sentStart)) {
    if (!DAY.test(end) || !realDay(sentStart) || !realDay(end) || end < sentStart) return undefined;
    return { start: sentStart, end, allDay: true };
  }
  if (!INSTANT.test(sentStart) || !INSTANT.test(end)) return undefined;
  if (!realInstant(sentStart) || !realInstant(end) || Date.parse(end) < Date.parse(sentStart)) {
    return undefined;
  }
  return { start: sentStart, end, allDay: false };
}

/** A list of community ids (lowercase slugs), duplicates dropped; null for «all»; undefined when any is not one. */
export function readCommunityIds(
  value: unknown,
  readOne: (value: unknown) => string | undefined,
): readonly string[] | null | undefined {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length > RITUAL_COMMUNITIES_MAX) return undefined;
  const ids: string[] = [];
  for (const entry of value) {
    const id = readOne(entry);
    if (id === undefined) return undefined;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** An encounter as the till answers it. */
export interface TillRitual {
  readonly id: string;
  readonly communityId: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
  readonly mode: RitualMode;
  readonly where: string;
  readonly note: string | null;
  readonly worldId: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly cancelledAt: string | null;
}
