/**
 * The world pass (cut 5, «Entrar»): what numinia.com hands a browser so a
 * world knows who walks in and what that person may do there.
 *
 * ── The contract the engine's verifier implements ───────────────────────────
 * A pass is a compact JWS (RFC 7515) signed with Ed25519 (RFC 8037), so any
 * JWT library with EdDSA verifies it:
 *
 *     base64url(header) . base64url(payload) . base64url(signature)
 *
 *   header    { "alg": "EdDSA", "typ": "numinia-world-pass", "kid": "<kid>" }
 *   signature Ed25519 over the ASCII bytes of `base64url(header).base64url(payload)`
 *   payload   (every field required but `name`; no extras)
 *     v       1
 *     iss     "numinia.com"
 *     aud     the world's id (`agora-plaza`): a world refuses a pass whose `aud` is not its own
 *     sub     opaque person id `p_` + 32 hex: the first 16 bytes of
 *             HMAC-SHA256(key = AUTH_SESSION_SECRET, msg = "world-pass-sub:" + lowercase wallet).
 *             Never the wallet.
 *     org     the organization (account) id the world belongs to
 *     perm    the world permission ids the person holds, in the order of
 *             WORLD_PASS_PERMISSIONS below (a subset of it)
 *     height  accessOf's height in the organization: a role position (0 = only the base role),
 *             HOUSE_HEIGHT (Number.MAX_SAFE_INTEGER) for the house, and Number.MAX_VALUE for an
 *             owner (accessOf says +Infinity, which JSON cannot carry; owners stand above the house)
 *     roles   up to 5 `{ name (≤ 40 chars), color ("#rrggbb" | null) }`, highest first
 *     name    the display name the person chose (opt-in); absent means the engine shows a guest name
 *     iat/exp seconds since the epoch; exp = iat + 600
 *
 * The pass of an organization's AI (cut «IAs de organización», 2026-10-17; asked for by the AI's
 * bridge at POST /api/agents/pass, lib/agent-pass.ts) is the same JWS with the same key and three
 * fields more, which only an AI's pass carries — a person's pass stays byte for byte what it was:
 *     kind    "agent"
 *     state   "activa" | "dormida" (asleep: it watches and listens, and `perm` leaves out
 *             `build-in-worlds`)
 *     sub     `a_` + 32 hex: the first 16 bytes of HMAC-SHA256(key = AUTH_SESSION_SECRET,
 *             msg = "world-pass-agent:" + org + ":" + agent id)
 *     name    always: the agent's name (the engine adds « · IA»)
 *     perm    already trimmed: what the agent's roles give, no more than the person who answers
 *             for it holds (ORG-011), within {enter-worlds, build-in-worlds}
 *     height  accessOf's: a role position, never an owner's nor the house's
 *
 * What the person already accepted on numinia.com (condiciones/w5, 2026-10-20): a PERSON's pass may carry one field more,
 *     acepto  `{ casa: "<LEGAL_CORPUS_VERSION>" }`, e.g. `{ "casa": "terms@1.0.1+privacy@2.1.0" }` — the version of the Terms and
 *             the Privacy Policy the session behind the pass accepted at sign-in (the signed session cookie carries it; a
 *             session that accepted an older corpus gets no field). Only when the person accepted: a pass without it says nothing.
 *             A world whose own house layer declares `versionWeb` with that very string counts the layer's norms as accepted and
 *             does not ask again; it never counts data permissions (the world always asks those). Never on an AI's pass. The
 *             field is covered by the signature and cannot lengthen the pass (`exp` stays iat + 600) or change `perm`/`height`.
 *             An engine that does not know the field refuses the pass («contenido»): the Worker only adds it while
 *             `WORLD_PASS_ACEPTO=si` (see world-pass-answer.ts), which is set after the fleet runs an engine that reads it.
 * The verifier below accepts these fields and still refuses any other extra.
 *
 * Key: the Worker secret `WORLD_PASS_PRIVATE_KEY` (Ed25519, PKCS8, base64). Its public half is published
 * at `GET /.well-known/world-pass-key.json` as `{ alg: "Ed25519", kid, publicKey }`, `publicKey` being the
 * raw 32 bytes in base64url and `kid` the first 8 hex digits of its SHA-256; the header's `kid` names it.
 * The verifier checks: three base64url parts, `alg`/`typ`, the signature, the payload's exact shape,
 * `iat - 60 s ≤ now ≤ exp`, and `aud` = its own world. `verifyPass` below is that verifier, for the engine to copy.
 *
 * Fail closed: with the secret missing or not an Ed25519 PKCS8 key every signing function throws a
 * WorldPassError; the route answers 503 and the page falls back to the plain guest link.
 *
 * Web Crypto only, no dependencies. Server side: islands never import this file.
 */

import type { OrganizationAccess } from '@numinia/domain';
import type { DeskAccess, DeskRole } from './accounts';

/** The world permission ids a pass may carry, in the order they are written. */
export const WORLD_PASS_PERMISSIONS = [
  'enter-worlds',
  'build-in-worlds',
  'mute-members',
  'remove-members',
  'ban-members',
  'manage-roles',
  'manage-organization',
  'download-world',
] as const satisfies readonly OrganizationAccess[];
type WorldPassPermission = (typeof WORLD_PASS_PERMISSIONS)[number];

/** A pass lives ten minutes. */
export const PASS_TTL_SECONDS = 600;
/** How far ahead of this clock a pass may have been issued. */
const SKEW_SECONDS = 60;
const MAX_ROLES = 5;
const NAME_MAX = 40;
/** accessOf's house height (packages/domain HOUSE_HEIGHT), spelled out: it is below 2^53. */
const HOUSE_HEIGHT = Number.MAX_SAFE_INTEGER;
/** accessOf's owner height (+Infinity) as JSON can say it. */
const OWNER_HEIGHT = Number.MAX_VALUE;

interface PassRole {
  readonly name: string;
  readonly color: string | null;
}

/** What an AI's pass may carry of the world's permissions. */
export const AGENT_PASS_PERMISSIONS = [
  'enter-worlds',
  'build-in-worlds',
] as const satisfies readonly WorldPassPermission[];

export interface PassPayload {
  readonly v: 1;
  readonly iss: 'numinia.com';
  readonly aud: string;
  readonly sub: string;
  readonly org: string;
  readonly perm: readonly WorldPassPermission[];
  readonly height: number;
  readonly roles: readonly PassRole[];
  readonly name?: string;
  /** Only an AI's pass: `agent`. */
  readonly kind?: 'agent';
  /** Only an AI's pass. */
  readonly state?: 'activa' | 'dormida';
  /** Only a person's pass, only when they accepted the current corpus on numinia.com (condiciones/w5). */
  readonly acepto?: { readonly casa: string };
  readonly iat: number;
  readonly exp: number;
}

/** Why a pass could not be signed. */
export class WorldPassError extends Error {
  readonly code: 'no-key' | 'bad-key';
  constructor(code: 'no-key' | 'bad-key') {
    super(`world pass: ${code}`);
    this.name = 'WorldPassError';
    this.code = code;
  }
}

// ---- base64url ---------------------------------------------------------------

export function b64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The bytes of base64url text, or null when it is not that. */
export function b64urlDecode(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const padded = text
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

const utf8 = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);
const hex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---- the person --------------------------------------------------------------

/** The first 16 bytes of HMAC-SHA256(secret, message), in hex. */
async function mac16(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(message)));
  return hex(mac.slice(0, 16));
}

/** The opaque id of a person in a pass: stable, one-way, never the wallet. */
export async function personSub(secret: string, wallet: string): Promise<string> {
  return `p_${await mac16(secret, `world-pass-sub:${wallet.toLowerCase()}`)}`;
}

/** The opaque id of an organization's AI in a pass: stable, one-way, one per organization and agent. */
export async function agentSub(secret: string, org: string, agent: string): Promise<string> {
  return `a_${await mac16(secret, `world-pass-agent:${org}:${agent}`)}`;
}

// ---- keys --------------------------------------------------------------------

async function privateKeyOf(secret: string | undefined): Promise<CryptoKey> {
  if (secret === undefined || secret.trim() === '') throw new WorldPassError('no-key');
  try {
    const der = Uint8Array.from(atob(secret.trim()), (char) => char.charCodeAt(0));
    return await crypto.subtle.importKey('pkcs8', der, 'Ed25519', true, ['sign']);
  } catch {
    throw new WorldPassError('bad-key');
  }
}

export interface PublicKeyDocument {
  readonly alg: 'Ed25519';
  readonly kid: string;
  readonly publicKey: string;
}

/** What `/.well-known/world-pass-key.json` says, worked out from the private key. */
export async function publicKeyDocument(secret: string | undefined): Promise<PublicKeyDocument> {
  const jwk = await crypto.subtle.exportKey('jwk', await privateKeyOf(secret));
  const publicKey = jwk.x as string;
  const raw = b64urlDecode(publicKey) as Uint8Array<ArrayBuffer>;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  return { alg: 'Ed25519', kid: hex(digest).slice(0, 8), publicKey };
}

/** Signs a payload: the compact JWS. */
export async function signPass(secret: string | undefined, payload: PassPayload): Promise<string> {
  const key = await privateKeyOf(secret);
  const { kid } = await publicKeyDocument(secret);
  const header = b64urlEncode(
    utf8(JSON.stringify({ alg: 'EdDSA', typ: 'numinia-world-pass', kid })),
  );
  const body = b64urlEncode(utf8(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign('Ed25519', key, utf8(`${header}.${body}`)),
  );
  return `${header}.${body}.${b64urlEncode(signature)}`;
}

// ---- the payload -------------------------------------------------------------

export interface PassInput {
  readonly aud: string;
  readonly org: string;
  /** AUTH_SESSION_SECRET, the HMAC key of `sub`. */
  readonly secret: string;
  readonly wallet: string;
  readonly access: {
    readonly as: DeskAccess['as'];
    readonly permissions: readonly string[];
    readonly [more: string]: unknown;
  };
  readonly roles: {
    readonly roles: readonly Pick<DeskRole, 'id' | 'name' | 'color' | 'position'>[];
    readonly members: readonly {
      readonly wallet: string;
      readonly roleIds: readonly string[];
      readonly name?: string | null | undefined;
    }[];
    readonly [more: string]: unknown;
  };
  /** The legal corpus version the person's session accepted at sign-in, when it is the current one (condiciones/w5); none = no field. */
  readonly acceptedTerms?: string | null | undefined;
  /** Seconds since the epoch. */
  readonly now: number;
}

/** What the till says the person is in this organization, as a pass payload. */
export async function buildPassPayload(input: PassInput): Promise<PassPayload> {
  const { access, roles } = input;
  const mine = roles.members.find(
    (member) => member.wallet.toLowerCase() === input.wallet.toLowerCase(),
  );
  const held = new Set(mine?.roleIds ?? []);
  const own = roles.roles
    .filter((role) => held.has(role.id))
    .sort((a, b) => b.position - a.position);
  const standing = access.as;
  const height =
    standing === 'owner'
      ? OWNER_HEIGHT
      : standing === 'house'
        ? HOUSE_HEIGHT
        : Math.max(0, ...own.map((r) => r.position));
  const may = new Set<string>(access.permissions);
  const perm = WORLD_PASS_PERMISSIONS.filter((id) =>
    id === 'download-world' ? standing !== 'member' : may.has(id),
  );
  const name = typeof mine?.name === 'string' && mine.name !== '' ? mine.name : undefined;
  return {
    v: 1,
    iss: 'numinia.com',
    aud: input.aud,
    sub: await personSub(input.secret, input.wallet),
    org: input.org,
    perm,
    height,
    roles: own
      .slice(0, MAX_ROLES)
      .map((role) => ({ name: role.name.slice(0, NAME_MAX), color: role.color })),
    ...(name === undefined ? {} : { name }),
    ...(input.acceptedTerms ? { acepto: { casa: input.acceptedTerms } } : {}),
    iat: input.now,
    exp: input.now + PASS_TTL_SECONDS,
  };
}

export interface AgentPassInput {
  readonly aud: string;
  readonly org: string;
  /** AUTH_SESSION_SECRET, the HMAC key of `sub`. */
  readonly secret: string;
  readonly agent: string;
  readonly name: string;
  readonly state: 'activa' | 'dormida';
  /** What the till says the agent holds (accessOf with its person, ORG-011). */
  readonly access: { readonly permissions: readonly string[]; readonly height: number };
  /** The roles the agent holds besides the base role, highest first. */
  readonly roles: readonly PassRole[];
  /** Seconds since the epoch. */
  readonly now: number;
}

/**
 * What the till says an AI is in this organization, as a pass payload: only
 * entering and building survive, building only while it is awake, and the
 * height is a role position — anything else (an owner's, the house's) is
 * not an AI's and falls to the lowest.
 */
export async function buildAgentPassPayload(input: AgentPassInput): Promise<PassPayload> {
  const may = new Set<string>(input.access.permissions);
  const perm = AGENT_PASS_PERMISSIONS.filter(
    (id) => may.has(id) && !(id === 'build-in-worlds' && input.state === 'dormida'),
  );
  const { height } = input.access;
  return {
    v: 1,
    iss: 'numinia.com',
    aud: input.aud,
    sub: await agentSub(input.secret, input.org, input.agent),
    org: input.org,
    perm,
    height: Number.isSafeInteger(height) && height >= 0 && height < HOUSE_HEIGHT ? height : 0,
    roles: input.roles
      .slice(0, MAX_ROLES)
      .map((role) => ({ name: role.name.slice(0, NAME_MAX), color: role.color })),
    name: input.name.slice(0, NAME_MAX),
    kind: 'agent',
    state: input.state,
    iat: input.now,
    exp: input.now + PASS_TTL_SECONDS,
  };
}

// ---- the verifier (the engine copies this) -----------------------------------

export type PassVerdict =
  | { readonly ok: true; readonly payload: PassPayload }
  | {
      readonly ok: false;
      readonly why: 'shape' | 'header' | 'signature' | 'payload' | 'expired' | 'early' | 'audience';
    };

const REQUIRED = ['v', 'iss', 'aud', 'sub', 'org', 'perm', 'height', 'roles', 'iat', 'exp'];
const OPTIONAL = ['name', 'kind', 'state', 'acepto'];
const AGENT_SUB = /^a_[0-9a-f]{32}$/;

/**
 * `kind` and `state` belong to an AI's pass together: an AI's pass says `agent`, a
 * state, its name and an `a_…` sub; a person's carries neither field.
 */
function agentFieldsOk(record: Record<string, unknown>): boolean {
  if (record['kind'] === undefined) return record['state'] === undefined;
  return (
    record['kind'] === 'agent' &&
    (record['state'] === 'activa' || record['state'] === 'dormida') &&
    isText(record['name']) &&
    AGENT_SUB.test(record['sub'] as string)
  );
}

const isText = (value: unknown): value is string => typeof value === 'string';

/** `acepto` is a person's field: `{ casa: <text> }`, never on an AI's pass. */
function aceptoOk(record: Record<string, unknown>): boolean {
  const acepto = record['acepto'];
  if (acepto === undefined) return true;
  if (record['kind'] !== undefined) return false;
  return (
    typeof acepto === 'object' &&
    acepto !== null &&
    !Array.isArray(acepto) &&
    isText((acepto as Record<string, unknown>)['casa'])
  );
}

/** The JSON in some UTF-8 bytes, or null when it is not JSON. */
function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function readPayload(json: unknown): PassPayload | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const record = json as Record<string, unknown>;
  const keys = Object.keys(record);
  const exact =
    REQUIRED.every((key) => keys.includes(key)) &&
    keys.every((key) => REQUIRED.includes(key) || OPTIONAL.includes(key));
  const roleOk = (role: unknown): boolean => {
    const r = role as Record<string, unknown> | null;
    return (
      typeof r === 'object' &&
      r !== null &&
      isText(r['name']) &&
      (r['color'] === null || isText(r['color']))
    );
  };
  const valid =
    exact &&
    record['v'] === 1 &&
    record['iss'] === 'numinia.com' &&
    isText(record['aud']) &&
    isText(record['sub']) &&
    isText(record['org']) &&
    Array.isArray(record['perm']) &&
    record['perm'].every(isText) &&
    typeof record['height'] === 'number' &&
    Array.isArray(record['roles']) &&
    record['roles'].every(roleOk) &&
    (record['name'] === undefined || isText(record['name'])) &&
    aceptoOk(record) &&
    typeof record['iat'] === 'number' &&
    typeof record['exp'] === 'number' &&
    agentFieldsOk(record);
  return valid ? (record as unknown as PassPayload) : null;
}

/**
 * Checks a pass against the world's own id and the published public key
 * (raw 32 bytes, base64url). Pure but for Web Crypto; the clock is injected.
 */
export async function verifyPass(
  token: string,
  publicKey: string,
  at: { readonly aud: string; readonly now: number },
): Promise<PassVerdict> {
  const parts = token.split('.');
  const decoded = parts.map(b64urlDecode);
  if (parts.length !== 3 || decoded.some((part) => part === null))
    return { ok: false, why: 'shape' };
  const [headBytes, bodyBytes, signature] = decoded as [
    Uint8Array<ArrayBuffer>,
    Uint8Array<ArrayBuffer>,
    Uint8Array<ArrayBuffer>,
  ];
  const header = parseJson(headBytes) as Record<string, unknown> | null;
  if (
    header?.['alg'] !== 'EdDSA' ||
    header['typ'] !== 'numinia-world-pass' ||
    !isText(header['kid'])
  ) {
    return { ok: false, why: 'header' };
  }
  const key = await crypto.subtle.importKey(
    'raw',
    b64urlDecode(publicKey) as Uint8Array<ArrayBuffer>,
    'Ed25519',
    false,
    ['verify'],
  );
  const signed = utf8(`${parts[0]}.${parts[1]}`);
  if (!(await crypto.subtle.verify('Ed25519', key, signature, signed)))
    return { ok: false, why: 'signature' };
  const payload = readPayload(parseJson(bodyBytes));
  if (payload === null) return { ok: false, why: 'payload' };
  if (at.now > payload.exp) return { ok: false, why: 'expired' };
  if (at.now < payload.iat - SKEW_SECONDS) return { ok: false, why: 'early' };
  if (payload.aud !== at.aud) return { ok: false, why: 'audience' };
  return { ok: true, payload };
}
