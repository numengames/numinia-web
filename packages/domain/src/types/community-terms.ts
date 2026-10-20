/**
 * Terms of a community — the rules its administrators write for the worlds
 * of the community («Normas de vuestros espacios»). Same format as the file
 * a world carries (`aventura/condiciones.json`, `condiciones@1`, read by
 * the engine's `packages/server/src/condiciones.ts`): this type is that
 * file's `comunidad` layer, point for point, so numinia.com can write the
 * file into each world of the community without translating anything.
 *
 * The law behind `kind` (CONDICIONES-EN-LOS-MUNDOS, «La ley europea»): a
 * `norma` is part of the contract and may close the door; a `datos` point
 * (session report, an AI that listens, notices) never may — refusing it
 * still lets the person in (EDPB 05/2020 §39, GDPR 7.4). So a `datos`
 * point can never be mandatory.
 */

/** The format name the world's file carries. */
export const COMMUNITY_TERMS_FORMAT = 'condiciones@1';

/** The layer of the world's file that belongs to the community. */
export const COMMUNITY_TERMS_LAYER = 'comunidad';

/** `norma` (contract, may be mandatory) or `datos` (a permission, never mandatory). */
export const TERMS_POINT_TYPES = ['norma', 'datos'] as const;
export type TermsPointType = (typeof TERMS_POINT_TYPES)[number];

/** One point: the same keys as the engine's `Punto`, `tipo` always written out. */
export interface TermsPoint {
  /** Lower-case letters, digits and hyphens; 1–32 characters; unique in its layer. */
  readonly id: string;
  /** 1–120 characters. */
  readonly titulo: string;
  /** 1–8000 characters. */
  readonly texto: string;
  /** No entry without it. Always false when `tipo` is `datos`. */
  readonly obligatorio: boolean;
  readonly tipo: TermsPointType;
}

/** One published version of a community's terms: the file's `comunidad` layer. */
export interface CommunityTerms {
  readonly capa: typeof COMMUNITY_TERMS_LAYER;
  /** Free text, 1–40 characters; each publication has one no earlier version had. */
  readonly version: string;
  /** 1–20 points. */
  readonly puntos: readonly TermsPoint[];
}

/** A version as it is kept in the history: who published it and when. */
export interface PublishedCommunityTerms {
  readonly terms: CommunityTerms;
  /** ISO instant, UTC. */
  readonly publishedAt: string;
  /** Who published it (a wallet or person id: opaque to the domain). */
  readonly publishedBy: string;
}

/** Why a draft is refused; `path` points into the draft (`puntos[2].id`). */
export interface TermsIssue {
  readonly path: string;
  /** Stable key for screens to translate. */
  readonly code:
    | 'format'
    | 'layer'
    | 'version'
    | 'version-repeated'
    | 'points'
    | 'id'
    | 'id-repeated'
    | 'title'
    | 'text'
    | 'mandatory'
    | 'type'
    | 'data-mandatory';
  /** Spanish, says how to fix it (the world's file and the engine speak Spanish too). */
  readonly message: string;
}

export type TermsValidation =
  | { readonly ok: true; readonly value: CommunityTerms }
  | { readonly ok: false; readonly issues: readonly TermsIssue[] };

export type TermsPublication =
  | {
      readonly ok: true;
      /** The history with the new version last; the one passed in is not touched. */
      readonly history: readonly PublishedCommunityTerms[];
      readonly published: PublishedCommunityTerms;
    }
  | { readonly ok: false; readonly issues: readonly TermsIssue[] };
