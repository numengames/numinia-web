/**
 * What numinia.com sends the agents desk (cut «IAs de organización», 2026-10-17;
 * numinia-archive STD-051 ORG-011), read as untrusted: an agent's id, name and
 * public key, the switch and the state, the moment of a pass request. Pure — no
 * database. A malformed field is a problem in words, never a throw; the desk
 * refuses with them and writes nothing.
 */

import { readRoleId } from './roles';

export const AGENT_PROBLEMS = {
  agentId:
    'agentId must be 1 to 32 characters: lower case letters, digits and hyphens, none at either end',
  draft:
    'agent must be an object with id, name, either publicKey or auth «token» with tokenHash and tokenPrefix, and, if any, roleIds, via and hears',
  tokenHash: 'tokenHash must be the SHA-256 of a token: 64 lower case hexadecimal characters',
  tokenPrefix: 'tokenPrefix must be 8 base64url characters',
  via: 'via must be «panel», or «mcp:» and the host the AI’s client returns to (lower case letters, digits, dots and hyphens)',
  notToken: 'that agent connects with a key, not a token',
  name: 'name must be 1 to 40 characters, none of them a control character',
  publicKey: 'publicKey must be ed25519: and 43 base64url characters (a 32-byte key)',
  roleIds: 'roleIds must be a list of at most 10 role ids',
  change:
    'change must be an object with enabled (true or false), state (activa or dormida) and/or hears (true or false)',
  enabled: 'enabled must be true or false',
  hears: 'hears must be true or false',
  state: 'state must be activa or dormida',
  audience: 'aud must be a world id',
  moment: 't must be a whole number of seconds',
  noSuchAgent: 'the organization has no such agent',
  taken: 'the organization already has an agent with that id or that key',
  limit: 'an organization keeps at most 20 agents',
  houseCeiling:
    'the house does not give an agent a role that holds Administrator or Manage roles: that is for the owners',
  replayed: 'that request was already used',
} as const;

/** How many agents one organization keeps: a bound for a script, plenty for a community. */
export const MAX_AGENTS = 20;

/** The closed list of states; a new one is added here and to the migration's CHECK. */
export const AGENT_STATES = ['activa', 'dormida'] as const;
export type AgentState = (typeof AGENT_STATES)[number];

export const NAME_MAX = 40;
export const ROLES_PER_AGENT_MAX = 10;

const AGENT_ID = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_HASH = /^[0-9a-f]{64}$/;
const TOKEN_PREFIX = /^[A-Za-z0-9_-]{8}$/;
/** A DNS name: labels of letters, digits and inner hyphens, joined by dots. */
const HOST = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
/** The longest a DNS name may be. */
const HOST_MAX = 253;
const KEY = /^ed25519:[A-Za-z0-9_-]{43}$/;
// eslint-disable-next-line no-control-regex -- a name never holds a control character
const CONTROL = /[\u0000-\u001f\u007f]/;

export function readAgentId(value: unknown): string | undefined {
  return typeof value === 'string' && AGENT_ID.test(value) ? value : undefined;
}

export function readAgentName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  const length = [...name].length;
  return length >= 1 && length <= NAME_MAX && !CONTROL.test(name) ? name : undefined;
}

/**
 * The agent's public key as the engine writes it: `ed25519:` and the 32 raw
 * bytes in base64url (43 characters, the last one canonical: its spare bits
 * zero, so the text decodes and encodes to itself).
 */
export function readPublicKey(value: unknown): string | undefined {
  if (typeof value !== 'string' || !KEY.test(value)) return undefined;
  const text = value.slice(8);
  const bytes = Uint8Array.from(atob(`${text.replace(/-/g, '+').replace(/_/g, '/')}=`), (char) =>
    char.charCodeAt(0),
  );
  const again = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return again === text ? value : undefined;
}

export function readState(value: unknown): AgentState | undefined {
  return AGENT_STATES.find((state) => state === value);
}

export function readWorldAudience(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 64 && WORLD_ID.test(value)
    ? value
    : undefined;
}

export function readMoment(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The SHA-256 of a token in hex, as numinia.com sends it; the till never sees the token itself. */
export function readTokenHash(value: unknown): string | undefined {
  return typeof value === 'string' && TOKEN_HASH.test(value) ? value : undefined;
}

/** The first 8 characters after `ntk_`, kept to tell tokens apart in a list. */
export function readTokenPrefix(value: unknown): string | undefined {
  return typeof value === 'string' && TOKEN_PREFIX.test(value) ? value : undefined;
}

/** How an AI was connected: from the panel, or by an MCP client through the house's relay. */
export type ConnectedVia = 'panel' | `mcp:${string}`;

/** What a creation or a renewal that says nothing of its way was: the panel, the only way before the relay. */
export const VIA_PANEL: ConnectedVia = 'panel';

/**
 * How an AI was connected (migration 0022): `panel`, or `mcp:` and the host
 * its MCP client returns to, as the consent screen showed it (`mcp:claude.ai`,
 * `mcp:localhost`). Absent is the panel; anything else is undefined.
 */
export function readConnectedVia(value: unknown): ConnectedVia | undefined {
  if (value === undefined) return VIA_PANEL;
  if (value === VIA_PANEL) return VIA_PANEL;
  if (typeof value !== 'string' || !value.startsWith('mcp:')) return undefined;
  const host = value.slice(4);
  return host.length <= HOST_MAX && HOST.test(host) ? (value as ConnectedVia) : undefined;
}

export interface KeyDraft {
  readonly auth: 'key';
  readonly id: string;
  readonly name: string;
  readonly publicKey: string;
  readonly roleIds: readonly string[];
  readonly via: ConnectedVia;
  readonly hears: boolean;
}

export interface TokenDraft {
  readonly auth: 'token';
  readonly id: string;
  readonly name: string;
  readonly tokenHash: string;
  readonly tokenPrefix: string;
  readonly roleIds: readonly string[];
  readonly via: ConnectedVia;
  readonly hears: boolean;
}

export type AgentDraft = KeyDraft | TokenDraft;

/**
 * A new agent: exactly id, name, roleIds (if any) and either a publicKey
 * (the key way) or `auth: 'token'` with tokenHash and tokenPrefix (the token
 * way: an agent has one or the other, never both), and how it was connected
 * (`via`, the panel when absent); the problems of every wrong field.
 */
export function readAgentDraft(value: unknown): AgentDraft | string[] {
  const viaToken = isRecord(value) && value['auth'] === 'token';
  const fields = viaToken
    ? ['id', 'name', 'roleIds', 'auth', 'tokenHash', 'tokenPrefix', 'via', 'hears']
    : ['id', 'name', 'publicKey', 'roleIds', 'via', 'hears'];
  if (!isRecord(value) || Object.keys(value).some((key) => !fields.includes(key))) {
    return [AGENT_PROBLEMS.draft];
  }
  const id = readAgentId(value['id']);
  const name = readAgentName(value['name']);
  const sent = value['roleIds'] === undefined ? [] : value['roleIds'];
  const roleIds =
    Array.isArray(sent) && sent.length <= ROLES_PER_AGENT_MAX ? sent.map(readRoleId) : undefined;
  const publicKey = viaToken ? undefined : readPublicKey(value['publicKey']);
  const tokenHash = viaToken ? readTokenHash(value['tokenHash']) : undefined;
  const tokenPrefix = viaToken ? readTokenPrefix(value['tokenPrefix']) : undefined;
  const via = readConnectedVia(value['via']);
  const hears = value['hears'] === undefined || typeof value['hears'] === 'boolean';
  const problems = [
    ...(id === undefined ? [AGENT_PROBLEMS.agentId] : []),
    ...(name === undefined ? [AGENT_PROBLEMS.name] : []),
    ...(viaToken || publicKey !== undefined ? [] : [AGENT_PROBLEMS.publicKey]),
    ...(!viaToken || tokenHash !== undefined ? [] : [AGENT_PROBLEMS.tokenHash]),
    ...(!viaToken || tokenPrefix !== undefined ? [] : [AGENT_PROBLEMS.tokenPrefix]),
    ...(roleIds === undefined || roleIds.includes(undefined) ? [AGENT_PROBLEMS.roleIds] : []),
    ...(via === undefined ? [AGENT_PROBLEMS.via] : []),
    ...(hears ? [] : [AGENT_PROBLEMS.hears]),
  ];
  if (problems.length > 0) return problems;
  const common = {
    id: id as string,
    name: name as string,
    roleIds: [...new Set(roleIds as string[])],
    via: via as ConnectedVia,
    hears: value['hears'] === true,
  };
  return viaToken
    ? {
        auth: 'token',
        ...common,
        tokenHash: tokenHash as string,
        tokenPrefix: tokenPrefix as string,
      }
    : { auth: 'key', ...common, publicKey: publicKey as string };
}

export interface AgentChange {
  readonly enabled?: boolean;
  readonly state?: AgentState;
  readonly hears?: boolean;
}

/** A change to an agent: the switch and/or the state, each read; the problems of every wrong one. */
export function readAgentChange(value: unknown): AgentChange | string[] {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== 'enabled' && key !== 'state' && key !== 'hears')
  ) {
    return [AGENT_PROBLEMS.change];
  }
  const { enabled, state, hears } = value;
  if (enabled === undefined && state === undefined && hears === undefined)
    return [AGENT_PROBLEMS.change];
  const problems = [
    ...(enabled !== undefined && typeof enabled !== 'boolean' ? [AGENT_PROBLEMS.enabled] : []),
    ...(state !== undefined && readState(state) === undefined ? [AGENT_PROBLEMS.state] : []),
    ...(hears !== undefined && typeof hears !== 'boolean' ? [AGENT_PROBLEMS.hears] : []),
  ];
  if (problems.length > 0) return problems;
  return {
    ...(enabled === undefined ? {} : { enabled: enabled as boolean }),
    ...(state === undefined ? {} : { state: state as AgentState }),
    ...(hears === undefined ? {} : { hears: hears as boolean }),
  };
}
