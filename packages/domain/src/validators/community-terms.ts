/**
 * Terms of a community: checking a draft and publishing a new version.
 * Pure — no clock, no storage; whoever stores it (the till) passes the time
 * and the author in. The rules are the engine's own (`condiciones@1`,
 * packages/server/src/condiciones.ts) plus `tipo`: a point of type `datos`
 * can never be mandatory, because refusing it must still let the person in.
 */

import {
  COMMUNITY_TERMS_FORMAT,
  COMMUNITY_TERMS_LAYER,
  TERMS_POINT_TYPES,
  type PublishedCommunityTerms,
  type TermsIssue,
  type TermsPoint,
  type TermsPointType,
  type TermsPublication,
  type TermsValidation,
} from '../types/community-terms.js';

export const TERMS_VERSION_MAX = 40;
export const TERMS_POINTS_MAX = 20;
export const TERMS_TITLE_MAX = 120;
export const TERMS_TEXT_MAX = 8000;
/** Same pattern as the engine's: lower-case letters and digits first, then hyphens, 1–32 long. */
export const TERMS_POINT_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;

type Draft = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Draft {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text of 1..max characters that is not only blank. */
function textWithin(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max;
}

function isType(value: unknown): value is TermsPointType {
  return (TERMS_POINT_TYPES as readonly unknown[]).includes(value);
}

/**
 * Check one point; the issues are pushed to `issues`. A point with no `tipo` is a `norma`
 * (the engine's default). Returns the point only when it raised nothing.
 */
function checkPoint(
  raw: unknown,
  at: string,
  seen: Set<string>,
  issues: TermsIssue[],
): TermsPoint | undefined {
  const before = issues.length;
  const point: Draft = isRecord(raw) ? raw : {};
  const id = point['id'];
  if (typeof id !== 'string' || !TERMS_POINT_ID.test(id)) {
    issues.push({
      path: `${at}.id`,
      code: 'id',
      message:
        'El identificador va en minúsculas, números y guiones (sin espacios), de 1 a 32 caracteres. Ejemplo: «uso» o «informe-sesion».',
    });
  } else if (seen.has(id)) {
    issues.push({
      path: `${at}.id`,
      code: 'id-repeated',
      message: `Hay dos puntos con el identificador «${id}». Cambia el de uno de ellos.`,
    });
  } else {
    seen.add(id);
  }
  if (!textWithin(point['titulo'], TERMS_TITLE_MAX)) {
    issues.push({
      path: `${at}.titulo`,
      code: 'title',
      message: `Cada punto necesita un título de 1 a ${TERMS_TITLE_MAX} caracteres.`,
    });
  }
  if (!textWithin(point['texto'], TERMS_TEXT_MAX)) {
    issues.push({
      path: `${at}.texto`,
      code: 'text',
      message: `Cada punto necesita un texto de 1 a ${TERMS_TEXT_MAX} caracteres.`,
    });
  }
  if (typeof point['obligatorio'] !== 'boolean') {
    issues.push({
      path: `${at}.obligatorio`,
      code: 'mandatory',
      message: 'Marca el punto como obligatorio o como opcional.',
    });
  }
  const type = point['tipo'] ?? 'norma';
  if (!isType(type)) {
    issues.push({
      path: `${at}.tipo`,
      code: 'type',
      message: `El tipo del punto es «norma» o «datos» (${TERMS_POINT_TYPES.join(' | ')}).`,
    });
  } else if (type === 'datos' && point['obligatorio'] === true) {
    issues.push({
      path: `${at}.obligatorio`,
      code: 'data-mandatory',
      message:
        'Un permiso de datos no puede ser obligatorio: quien lo rechaza entra igual. Márcalo como opcional, o cambia el tipo a «norma» si es una regla del espacio.',
    });
  }
  if (issues.length > before) return undefined;
  return {
    id: String(id),
    titulo: String(point['titulo']),
    texto: String(point['texto']),
    obligatorio: point['obligatorio'] === true,
    tipo: type as TermsPointType,
  };
}

/** Check a draft of a community's terms: every problem with a path, never throws. */
export function validateCommunityTerms(draft: unknown): TermsValidation {
  if (!isRecord(draft)) {
    return {
      ok: false,
      issues: [
        {
          path: '',
          code: 'format',
          message: 'Las normas son un objeto con «version» y «puntos».',
        },
      ],
    };
  }
  const issues: TermsIssue[] = [];
  const format = draft['formato'];
  if (format !== undefined && format !== COMMUNITY_TERMS_FORMAT) {
    issues.push({
      path: 'formato',
      code: 'format',
      message: `El formato debe ser ${COMMUNITY_TERMS_FORMAT} (o no ponerse).`,
    });
  }
  const layer = draft['capa'];
  if (layer !== undefined && layer !== COMMUNITY_TERMS_LAYER) {
    issues.push({
      path: 'capa',
      code: 'layer',
      message: `La capa de una comunidad es «${COMMUNITY_TERMS_LAYER}» (la de la casa no se edita aquí).`,
    });
  }
  const version = draft['version'];
  if (!textWithin(version, TERMS_VERSION_MAX)) {
    issues.push({
      path: 'version',
      code: 'version',
      message: `La versión es un texto de 1 a ${TERMS_VERSION_MAX} caracteres, por ejemplo «1.1».`,
    });
  }
  const raw = draft['puntos'];
  const points: TermsPoint[] = [];
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > TERMS_POINTS_MAX) {
    issues.push({
      path: 'puntos',
      code: 'points',
      message: `Hacen falta de 1 a ${TERMS_POINTS_MAX} puntos; una norma sin puntos no dice nada.`,
    });
  } else {
    const seen = new Set<string>();
    raw.forEach((item: unknown, index) => {
      const point = checkPoint(item, `puntos[${index}]`, seen, issues);
      if (point) points.push(point);
    });
  }
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      capa: COMMUNITY_TERMS_LAYER,
      version: version as string,
      puntos: points,
    },
  };
}

/** The version in force: the last published, or undefined when the community has none. */
export function currentCommunityTerms(
  history: readonly PublishedCommunityTerms[],
): PublishedCommunityTerms | undefined {
  return history[history.length - 1];
}

/**
 * Publish a new version. Every earlier version stays in the history; the new one needs a
 * `version` no earlier version had (compared without case). The history passed in is not changed.
 */
export function publishCommunityTerms(
  history: readonly PublishedCommunityTerms[],
  draft: unknown,
  author: string,
  now: Date,
): TermsPublication {
  const checked = validateCommunityTerms(draft);
  if (!checked.ok) return checked;
  const wanted = checked.value.version.toLowerCase();
  if (history.some((past) => past.terms.version.toLowerCase() === wanted)) {
    return {
      ok: false,
      issues: [
        {
          path: 'version',
          code: 'version-repeated',
          message: `La versión «${checked.value.version}» ya está publicada. Pon una nueva (por ejemplo, la siguiente) para no pisar la anterior.`,
        },
      ],
    };
  }
  const published: PublishedCommunityTerms = {
    terms: checked.value,
    publishedAt: now.toISOString(),
    publishedBy: author,
  };
  return { ok: true, history: [...history, published], published };
}
