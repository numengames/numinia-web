/**
 * «Hazla tuya» for real (cut G, 2026-10-17), the pure part: what a request
 * for a community is — a claim («Es mi comunidad») or an ask to join («Quiero
 * entrar») — and how its fields are read from what numinia.com sends, as
 * untrusted. A malformed field is a problem in words, never a throw. Pure —
 * no database.
 */

export const REQUEST_KINDS = ['claim', 'join'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_STATES = ['open', 'accepted', 'declined'] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

/** The optional line «Cuéntanos quién eres» is this long at most. */
export const NOTE_MAX = 280;

const REQUEST_ID = /^req_[0-9a-f]{32}$/;
// C0 and C1 control characters, as a published name refuses them.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export const REQUEST_PROBLEMS = {
  kind: `kind must be one of: ${REQUEST_KINDS.join(', ')}`,
  note: `note must be text of ${NOTE_MAX} characters at most, none of them a control character, or null`,
  requestId: 'requestId must be a request id',
  accept: 'accept must be true or false',
  member: 'already a member of that community',
  hasOwner: 'that community has a titular already: ask to join it',
  notAllowed: 'only the house or an administrator of the community sees and decides its requests',
  noSuchRequest: 'no such request',
  decided: 'that request is decided already',
  noOrganization: 'the organization of that community is not open: the house opens it with a name',
} as const;

/** A kind as the screen sends it, or undefined. */
export function readKind(value: unknown): RequestKind | undefined {
  return REQUEST_KINDS.some((kind) => kind === value) ? (value as RequestKind) : undefined;
}

/**
 * The note: null when nothing was sent (undefined, null or blank), the
 * trimmed text when it is 1 to 280 characters without control characters,
 * undefined otherwise.
 */
export function readNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || CONTROL.test(value)) return undefined;
  const note = value.trim();
  if (note.length === 0) return null;
  return note.length <= NOTE_MAX ? note : undefined;
}

/** A request id as the till writes it (`req_` and 32 hex), or undefined. */
export function readRequestId(value: unknown): string | undefined {
  return typeof value === 'string' && REQUEST_ID.test(value) ? value : undefined;
}

/** The decision: true accepts, false declines; anything else is undefined. */
export function readAccept(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** A new request's id: random, `req_` and 32 hex. */
export function requestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `req_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** A request as the till answers it. */
export interface CommunityRequest {
  readonly id: string;
  readonly communityId: string;
  readonly wallet: string;
  readonly kind: RequestKind;
  readonly note: string | null;
  readonly state: RequestState;
  readonly createdAt: string;
  readonly decidedAt: string | null;
  readonly decidedBy: string | null;
}

/** A request as the ones who decide see it: with what the asker published. */
export interface CommunityRequestEntry extends CommunityRequest {
  readonly name: string | null;
  readonly avatar: string | null;
}
