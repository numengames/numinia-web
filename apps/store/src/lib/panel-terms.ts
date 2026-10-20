/**
 * «Normas de vuestros espacios» (condiciones/w2), the panel side: what the
 * browser keeps of a community's terms and the small rules of writing a
 * draft. Pure — no fetch, no zod, no env — so the island may import it.
 *
 * The format and every rule of validity are @numinia/domain's
 * (`validateCommunityTerms`, run by the till on every publication); this file
 * only shapes what the screen needs: the page as the browser is answered it
 * (without who published each version), a draft the administrator edits
 * (each point with a key for the list and an id the person never types), the
 * next version number to suggest, and the till's problems — `path: message`,
 * in Spanish — sorted by the field they belong to.
 */

import {
  TERMS_POINT_ID,
  type PublishedCommunityTerms,
  type TermsPoint,
  type TermsPointType,
} from '@numinia/domain';

/** One published version as a browser sees it: no author, only what the history shows. */
export interface TermsVersion {
  readonly version: string;
  readonly puntos: readonly TermsPoint[];
  /** ISO instant, UTC. */
  readonly publishedAt: string;
}

/** A community's terms as the browser is answered them (GET and POST /api/saldo/terms). */
export interface TermsPage {
  readonly accountId: string;
  /** The version in force, or null while the community has published none. */
  readonly current: TermsVersion | null;
  /** Every version ever published, oldest first. */
  readonly history: readonly TermsVersion[];
  /** The asker holds `administrator`: may write and publish. */
  readonly mayEdit: boolean;
}

/** The till's version of a publication, as a browser may see it: its author stays in the till. */
function versionOf({ terms, publishedAt }: PublishedCommunityTerms): TermsVersion {
  return { version: terms.version, puntos: terms.puntos, publishedAt };
}

/** The till's answer as the browser is told it. */
export function termsPageOf(answer: {
  readonly accountId: string;
  readonly current: PublishedCommunityTerms | null;
  readonly history: readonly PublishedCommunityTerms[];
  readonly mayEdit: boolean;
}): TermsPage {
  return {
    accountId: answer.accountId,
    current: answer.current === null ? null : versionOf(answer.current),
    history: answer.history.map(versionOf),
    mayEdit: answer.mayEdit,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): value is TermsPoint {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['titulo'] === 'string' &&
    typeof value['texto'] === 'string' &&
    typeof value['obligatorio'] === 'boolean' &&
    (value['tipo'] === 'norma' || value['tipo'] === 'datos')
  );
}

function isVersion(value: unknown): value is TermsVersion {
  return (
    isRecord(value) &&
    typeof value['version'] === 'string' &&
    typeof value['publishedAt'] === 'string' &&
    Array.isArray(value['puntos']) &&
    value['puntos'].every(isPoint)
  );
}

/** GET or POST /api/saldo/terms: the page, or null when the body is not that. */
export function readTermsPage(json: unknown): TermsPage | null {
  if (!isRecord(json) || !isRecord(json['terms'])) return null;
  const { accountId, current, history, mayEdit } = json['terms'];
  if (
    typeof accountId !== 'string' ||
    typeof mayEdit !== 'boolean' ||
    !Array.isArray(history) ||
    !history.every(isVersion) ||
    !(current === null || isVersion(current))
  ) {
    return null;
  }
  return { accountId, current, history, mayEdit };
}

// ---- Writing a draft ----------------------------------------------------------

/** A point in the draft: the list needs a `key`, the person never sees the `id`. */
export interface DraftPoint {
  /** Stable while the draft lives (a React key); not sent. */
  readonly key: number;
  /** Empty for a point not yet published: it is made from the title when the draft is sent. */
  readonly id: string;
  readonly titulo: string;
  readonly texto: string;
  readonly obligatorio: boolean;
  readonly tipo: TermsPointType;
}

/** The draft of a new version starts as the version in force (or empty). */
export function draftOf(from: TermsVersion | null, firstKey = 1): readonly DraftPoint[] {
  return (from?.puntos ?? []).map((point, index) => ({ ...point, key: firstKey + index }));
}

/** A blank point for «Añadir una norma»: a rule that is optional until the administrator says otherwise. */
export function blankPoint(key: number): DraftPoint {
  return { key, id: '', titulo: '', texto: '', obligatorio: false, tipo: 'norma' };
}

/**
 * Changing the type of a point. A `datos` point is never mandatory (EDPB
 * 05/2020 §39, GDPR 7.4): turning it into `datos` also turns «obligatorio»
 * off, so the draft never holds the combination the validator refuses.
 */
export function withType(point: DraftPoint, tipo: TermsPointType): DraftPoint {
  return { ...point, tipo, obligatorio: tipo === 'datos' ? false : point.obligatorio };
}

/** An id from a title: lower-case letters and digits, hyphens between, 24 characters at most (the rule allows 32, leaving room for «-2»). */
function slug(title: string): string {
  const letters = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/g, '');
  return letters === '' ? 'punto' : letters;
}

/** A free id for a title, with `-2`, `-3`… when the plain one is taken. */
export function idFor(title: string, taken: ReadonlySet<string>): string {
  const base = slug(title);
  let candidate = base;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${base}-${n}`;
  return candidate;
}

/** What the till is sent: `{ version, puntos }`, every point with an id (the old ones keep theirs). */
export function draftBody(
  version: string,
  points: readonly DraftPoint[],
): { readonly version: string; readonly puntos: readonly TermsPoint[] } {
  const taken = new Set(points.map((point) => point.id).filter((id) => id !== ''));
  return {
    version: version.trim(),
    puntos: points.map(({ id, titulo, texto, obligatorio, tipo }) => {
      const own = id !== '' && TERMS_POINT_ID.test(id) ? id : idFor(titulo, taken);
      taken.add(own);
      return { id: own, titulo: titulo.trim(), texto: texto.trim(), obligatorio, tipo };
    }),
  };
}

/** The next number to suggest: «1.0» → «1.1», «2» → «2.1»; nothing when no rule fits, never one already used. */
export function nextVersion(history: readonly TermsVersion[]): string {
  const last = history[history.length - 1]?.version ?? '';
  const used = new Set(history.map((past) => past.version.toLowerCase()));
  const match = /^(\d{1,6})(?:\.(\d{1,6}))?$/.exec(last);
  if (match === null) return history.length === 0 ? '1.0' : '';
  const major = Number(match[1]);
  let minor = match[2] === undefined ? 1 : Number(match[2]) + 1;
  while (used.has(`${major}.${minor}`)) minor += 1;
  return `${major}.${minor}`;
}

// ---- The till's problems, by field -------------------------------------------

export type PointField = 'id' | 'titulo' | 'texto' | 'obligatorio' | 'tipo';

/** The problems of a refused draft, sorted by where they belong; every text is the validator's own Spanish. */
export interface TermsProblems {
  /** About the version number. */
  readonly version: readonly string[];
  /** About the list as a whole, or what no field owns (the permission, the format). */
  readonly general: readonly string[];
  /** By the position of the point in the draft sent, then by field. */
  readonly points: Readonly<Record<number, Partial<Record<PointField, readonly string[]>>>>;
}

const PROBLEM =
  /^(version|formato|capa|puntos)(?:\[(\d+)\]\.(id|titulo|texto|obligatorio|tipo))?: ([\s\S]+)$/;

/** Sorts the till's `path: message` lines; a line with no path of ours goes with the general ones. */
export function problemsOf(lines: readonly string[]): TermsProblems {
  const version: string[] = [];
  const general: string[] = [];
  const points: Record<number, Partial<Record<PointField, string[]>>> = {};
  for (const line of lines) {
    const found = PROBLEM.exec(line);
    const [, path, index, field, message] = found ?? [];
    if (path === 'version' && message !== undefined) {
      version.push(message);
    } else if (
      path === 'puntos' &&
      index !== undefined &&
      field !== undefined &&
      message !== undefined
    ) {
      const point = (points[Number(index)] ??= {});
      (point[field as PointField] ??= []).push(message);
    } else {
      general.push(path === undefined || message === undefined ? line : message);
    }
  }
  return { version, general, points };
}
