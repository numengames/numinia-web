/**
 * «Normas de la comunidad» in public (condiciones/w3): what anybody — no
 * session — may read of the terms a community published for its worlds: the
 * version in force with its points whole, and the number and date of every
 * version. Never who published one, never the till account.
 *
 * One reading serves three readers: the public page
 * (`/es/communities/<id>/normas/`), the world-copying story (w4) and the
 * AIs, which all take the JSON of GET /api/community-terms?comunidad=<id>:
 *
 *   { schema: 'community-terms-public@1', ok: true, communityId, page,
 *     numinia: { terms, version },
 *     current: { capa: 'comunidad', version, puntos: [{ id, titulo, texto,
 *                obligatorio, tipo }], publishedAt } | null,
 *     history: [{ version, publishedAt }] }
 *
 * `current` is, key for key, a `condiciones@1` layer (capa, version,
 * puntos) plus the instant it was published, so a world can copy it as it
 * is. A community that published nothing answers `current: null` and an
 * empty history — the page then says Numinia's terms are the only ones.
 *
 * Which communities are public is the register's (`published()`): one that
 * is only prepared, or not on file, is a 404 here and on the page, never an
 * empty answer that would tell them apart. The till is asked by community
 * id and derives the account itself (db/community-terms.ts `publicTerms`).
 *
 * Pure: no fetch, no env, no register — the route hands in the desk and
 * which communities are public — so it is unit-tested whole.
 */

import { z } from 'zod';
import { TERMS_POINT_TYPES, type TermsPoint } from '@numinia/domain';
import type { AccountDesk } from './accounts';
import { readCommunityId } from './community-teams';
import { LEGAL_DOC_VERSION } from './legal';
import { logEvent } from './telemetry';
import { ask, type Log } from './worlds-homes';

export const PUBLIC_TERMS_SCHEMA = 'community-terms-public@1';

/** Anybody may keep it a minute in the browser and five at the edge; a published version shows within minutes. */
export const PUBLIC_TERMS_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

/** The API's path, for the docs and the tests. */
export const PUBLIC_TERMS_API = '/api/community-terms';

/** The page of a community's terms in a locale (`en` is the root). */
export function termsPagePath(locale: string, communityId: string): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${prefix}/communities/${communityId}/normas/`;
}

/** The Terms of Use of Numinia, which go in front of every community's. */
export function numiniaTermsPath(locale: string): string {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${prefix}/legal/terms/`;
}

export interface PublicTermsDoc {
  readonly schema: typeof PUBLIC_TERMS_SCHEMA;
  readonly ok: true;
  readonly communityId: string;
  /** The page, in Castilian (the master), for a person to open. */
  readonly page: string;
  /** Numinia's own terms, which come first; the version a person signs in with. */
  readonly numinia: { readonly terms: string; readonly version: string };
  readonly current: {
    readonly capa: 'comunidad';
    readonly version: string;
    readonly puntos: readonly TermsPoint[];
    readonly publishedAt: string;
  } | null;
  readonly history: readonly { readonly version: string; readonly publishedAt: string }[];
}

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const point = z.object({
  id: z.string(),
  titulo: z.string(),
  texto: z.string(),
  obligatorio: z.boolean(),
  tipo: z.enum(TERMS_POINT_TYPES),
});
const SHAPE = z.union([
  z.object({
    ok: z.literal(true),
    communityId: z.string(),
    current: z
      .object({
        terms: z.object({
          capa: z.literal('comunidad'),
          version: z.string(),
          puntos: z.array(point),
        }),
        publishedAt: z.string(),
      })
      .nullable(),
    history: z.array(z.object({ version: z.string(), publishedAt: z.string() })),
  }),
  refusal,
]);

const respond = (body: unknown, status: number, cache: string): Response =>
  Response.json(body, { status, headers: { 'cache-control': cache } });

export type PublicTermsRead =
  | { readonly ok: true; readonly doc: PublicTermsDoc }
  | { readonly ok: false; readonly response: Response };

/** Ask the till for a public community's terms and shape them, or the response to send. */
export async function readPublicTerms(
  desk: AccountDesk | null,
  communityId: string,
  log: Log = logEvent,
): Promise<PublicTermsRead> {
  if (desk === null) {
    return { ok: false, response: respond({ error: 'not-bound' }, 503, 'no-store') };
  }
  const asked = await ask(log, 'publicTerms', () => desk.publicTerms(communityId), SHAPE);
  // The desk's own answer: 503 when the till lacks the method, 502 when it fails — never cached.
  if (!asked.ok) return { ok: false, response: asked.response };
  const value = asked.value;
  if (!value.ok) {
    return {
      ok: false,
      response: respond({ error: 'refused', problems: value.problems }, 400, 'no-store'),
    };
  }
  return {
    ok: true,
    doc: {
      schema: PUBLIC_TERMS_SCHEMA,
      ok: true,
      communityId: value.communityId,
      page: termsPagePath('es', value.communityId),
      numinia: { terms: numiniaTermsPath('es'), version: LEGAL_DOC_VERSION.terms },
      current:
        value.current === null
          ? null
          : {
              capa: 'comunidad',
              version: value.current.terms.version,
              puntos: value.current.terms.puntos,
              publishedAt: value.current.publishedAt,
            },
      history: value.history,
    },
  };
}

/**
 * GET /api/community-terms?comunidad=<id>: the public JSON. 400 for what is not a community id; 404
 * for a community that is not public (not on the register, or only prepared); the till's refusals
 * and failures are never cached.
 */
export async function answerPublicTerms(
  desk: AccountDesk | null,
  url: URL,
  isPublic: (communityId: string) => boolean,
  log: Log = logEvent,
): Promise<Response> {
  const community = readCommunityId(url.searchParams.get('comunidad'));
  if (community === undefined) {
    return respond({ error: 'comunidad must be a community id' }, 400, 'no-store');
  }
  if (!isPublic(community)) return respond({ error: 'not-found' }, 404, PUBLIC_TERMS_CACHE);
  const read = await readPublicTerms(desk, community, log);
  return read.ok ? respond(read.doc, 200, PUBLIC_TERMS_CACHE) : read.response;
}
