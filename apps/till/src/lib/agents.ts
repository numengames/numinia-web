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
  draft: 'agent must be an object with id, name, publicKey and, if any, roleIds',
  name: 'name must be 1 to 40 characters, none of them a control character',
  publicKey: 'publicKey must be ed25519: and 43 base64url characters (a 32-byte key)',
  roleIds: 'roleIds must be a list of at most 10 role ids',
  change: 'change must be an object with enabled (true or false) and/or state (activa or dormida)',
  enabled: 'enabled must be true or false',
  state: 'state must be activa or dormida',
  audience: 'aud must be a world id',
  moment: 't must be a whole number of seconds',
  noSuchAgent: 'the organization has no such agent',
  taken: 'the organization already has an agent with that id or that key',
  limit: 'an organization keeps at most 20 agents',
  houseCannot: 'the house does not answer for an agent: a member creates it',
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

export interface AgentDraft {
  readonly id: string;
  readonly name: string;
  readonly publicKey: string;
  readonly roleIds: readonly string[];
}

/** A new agent: exactly id, name, publicKey and, if any, roleIds; the problems of every wrong field. */
export function readAgentDraft(value: unknown): AgentDraft | string[] {
  const fields = ['id', 'name', 'publicKey', 'roleIds'];
  if (!isRecord(value) || Object.keys(value).some((key) => !fields.includes(key))) {
    return [AGENT_PROBLEMS.draft];
  }
  const id = readAgentId(value['id']);
  const name = readAgentName(value['name']);
  const publicKey = readPublicKey(value['publicKey']);
  const sent = value['roleIds'] === undefined ? [] : value['roleIds'];
  const roleIds =
    Array.isArray(sent) && sent.length <= ROLES_PER_AGENT_MAX ? sent.map(readRoleId) : undefined;
  const problems = [
    ...(id === undefined ? [AGENT_PROBLEMS.agentId] : []),
    ...(name === undefined ? [AGENT_PROBLEMS.name] : []),
    ...(publicKey === undefined ? [AGENT_PROBLEMS.publicKey] : []),
    ...(roleIds === undefined || roleIds.includes(undefined) ? [AGENT_PROBLEMS.roleIds] : []),
  ];
  if (problems.length > 0) return problems;
  return {
    id: id as string,
    name: name as string,
    publicKey: publicKey as string,
    roleIds: [...new Set(roleIds as string[])],
  };
}

export interface AgentChange {
  readonly enabled?: boolean;
  readonly state?: AgentState;
}

/** A change to an agent: the switch and/or the state, each read; the problems of every wrong one. */
export function readAgentChange(value: unknown): AgentChange | string[] {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== 'enabled' && key !== 'state')) {
    return [AGENT_PROBLEMS.change];
  }
  const { enabled, state } = value;
  if (enabled === undefined && state === undefined) return [AGENT_PROBLEMS.change];
  const problems = [
    ...(enabled !== undefined && typeof enabled !== 'boolean' ? [AGENT_PROBLEMS.enabled] : []),
    ...(state !== undefined && readState(state) === undefined ? [AGENT_PROBLEMS.state] : []),
  ];
  if (problems.length > 0) return problems;
  return {
    ...(enabled === undefined ? {} : { enabled: enabled as boolean }),
    ...(state === undefined ? {} : { state: state as AgentState }),
  };
}
