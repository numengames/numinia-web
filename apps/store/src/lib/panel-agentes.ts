/**
 * «Agentes» (the panel's piece for an organization's AIs): the pure part —
 * reading the desk's answers (GET/POST/PATCH/DELETE /api/saldo/agents,
 * lib/agents-source.ts), telling a failure in plain words, and the small
 * decisions the list makes (which role chips a row draws, which roles can
 * still be given, what the invitation sends).
 *
 * Pure: no fetch, no env, no zod, no DOM. An island imports it, and zod in an
 * island breaks the bundle budget; the routes validate with zod, this only
 * reads what they send. It does not import lib/agents.ts (which carries the
 * pass signing): the few sentences of the till it tells apart are written
 * here and a test pins them to that file's own.
 *
 * The id of an agent comes from its name (lib/world-door.ts `agentIdFrom`,
 * the very slug the world's invitation makes), which always satisfies the
 * till's rule (`isAgentId`, lib/agents.ts).
 */

import {
  readProblem,
  shortWallet,
  type AgentState,
  type AgentStatus,
  type DeskAgent,
  type DeskAgents,
  type DeskRole,
  type ReadProblem,
} from './accounts';

/** What the screen says about a failed call: one plain sentence per kind, never a raw code. */
export type Failure =
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'refused'; readonly problems: readonly string[] };

const STATES: readonly string[] = ['activa', 'dormida'];
const STATUSES: readonly string[] = [
  'apagada',
  'sin-responsable',
  'sin-permiso',
  'activa',
  'dormida',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

function readAgent(value: unknown): DeskAgent | null {
  if (!isRecord(value)) return null;
  const { id, name, publicKey, enabled, state, status, responsible, responsibleName } = value;
  const { createdAt, updatedAt, roleIds, assignable, mayEdit } = value;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof publicKey !== 'string' ||
    typeof enabled !== 'boolean' ||
    typeof state !== 'string' ||
    !STATES.includes(state) ||
    typeof status !== 'string' ||
    !STATUSES.includes(status) ||
    typeof responsible !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string' ||
    !isStrings(roleIds) ||
    !isStrings(assignable) ||
    typeof mayEdit !== 'boolean'
  ) {
    return null;
  }
  return {
    id,
    name,
    publicKey,
    enabled,
    // The closed lists were checked above.
    state: state as AgentState,
    status: status as AgentStatus,
    responsible,
    ...(typeof responsibleName === 'string' ? { responsibleName } : {}),
    createdAt,
    updatedAt,
    roleIds,
    assignable,
    mayEdit,
  };
}

function readAssignable(value: unknown): DeskAgents['assignableRoles'] | null {
  if (!Array.isArray(value)) return null;
  const roles: DeskAgents['assignableRoles'] = [];
  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry['id'] !== 'string' ||
      typeof entry['name'] !== 'string' ||
      (entry['color'] !== null && typeof entry['color'] !== 'string') ||
      typeof entry['position'] !== 'number'
    ) {
      return null;
    }
    roles.push({
      id: entry['id'],
      name: entry['name'],
      color: entry['color'],
      position: entry['position'],
    });
  }
  return roles;
}

/** The organization's AIs as every call of /api/saldo/agents answers (`{ agents }`), or null when the body is not that. */
export function readAgents(json: unknown): DeskAgents | null {
  if (!isRecord(json) || !isRecord(json['agents'])) return null;
  const view = json['agents'];
  const roles = readAssignable(view['assignableRoles']);
  if (
    view['ok'] !== true ||
    typeof view['accountId'] !== 'string' ||
    (view['as'] !== 'owner' && view['as'] !== 'house' && view['as'] !== 'member') ||
    typeof view['mayCreate'] !== 'boolean' ||
    roles === null ||
    !Array.isArray(view['agents'])
  ) {
    return null;
  }
  const agents: DeskAgent[] = [];
  for (const entry of view['agents']) {
    const agent = readAgent(entry);
    if (agent === null) return null;
    agents.push(agent);
  }
  return {
    ok: true,
    accountId: view['accountId'],
    as: view['as'],
    mayCreate: view['mayCreate'],
    assignableRoles: roles,
    agents,
  };
}

/** What a call that did not give the list means, from its status and body. */
export function failureOf(status: number, json: unknown): Failure {
  if (status === 401) return { kind: 'signed-out' };
  if (status === 503) return { kind: 'unavailable' };
  if (status === 400) return { kind: 'invalid' };
  if (status === 403 && isRecord(json) && isStrings(json['problems'])) {
    return { kind: 'refused', problems: json['problems'] };
  }
  return { kind: 'failed' };
}

/** The sentences of the till about agents that the screen words on their own (lib/agents.ts AGENT_PROBLEMS, pinned by a test). */
const AGENT_SENTENCES: ReadonlyMap<string, AgentProblem> = new Map<string, AgentProblem>([
  ['the organization has no such agent', 'noSuchAgent'],
  ['the organization already has an agent with that id or that key', 'taken'],
  ['an organization keeps at most 20 agents', 'limit'],
  ['the house does not answer for an agent: a member creates it', 'houseCannot'],
  ['the organization has no such role', 'noSuchRole'],
]);

export type AgentProblem =
  'noSuchAgent' | 'taken' | 'limit' | 'houseCannot' | 'noSuchRole' | 'invalid';

/** Prefixes of the till's field refusals: a name, a key, an id the form should have caught. */
const FIELD_PROBLEM = /^(agentId|name|publicKey|roleIds|roleId|change|enabled|state|agent) /;

/**
 * A refusal told apart: one of the agents' own, or the organization's
 * (Saldo's sentences: «no eres miembro», «hace falta el permiso…»).
 */
export type Refusal =
  | { readonly kind: 'agent'; readonly problem: AgentProblem }
  | { readonly kind: 'organization'; readonly read: ReadProblem };

export function refusalOf(problems: readonly string[]): Refusal {
  for (const problem of problems) {
    const own = AGENT_SENTENCES.get(problem);
    if (own !== undefined) return { kind: 'agent', problem: own };
  }
  const read = readProblem(problems);
  if (read.key === 'other' && problems.some((problem) => FIELD_PROBLEM.test(problem))) {
    return { kind: 'agent', problem: 'invalid' };
  }
  return { kind: 'organization', read };
}

/** Who answers for an agent, as the row says it: the name they published, else the short wallet. */
export const responsibleOf = (agent: DeskAgent): string =>
  agent.responsibleName ?? shortWallet(agent.responsible);

/** A role as a chip: the organization's name for it and its colour. */
export interface Chip {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  /** The asker may take it off this agent. */
  readonly removable: boolean;
}

/**
 * The roles an agent holds, in the organization's order (top first), named by
 * the organization's roles (GET /api/saldo/roles) or, where those could not
 * be read, by the ones the asker may assign. A role nobody can name is left
 * out rather than shown as an id.
 */
export function chipsOf(
  agent: DeskAgent,
  named: readonly Pick<DeskRole, 'id' | 'name' | 'color' | 'position'>[],
): Chip[] {
  return named
    .filter((role) => agent.roleIds.includes(role.id))
    .sort((a, b) => b.position - a.position)
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      removable: agent.mayEdit && agent.assignable.includes(role.id),
    }));
}

/** The roles the asker may still give this agent (assignable and not held), top first. */
export function rolesToGive(
  agent: DeskAgent,
  view: Pick<DeskAgents, 'assignableRoles'>,
): DeskAgents['assignableRoles'] {
  return view.assignableRoles
    .filter(
      (role) =>
        agent.mayEdit && agent.assignable.includes(role.id) && !agent.roleIds.includes(role.id),
    )
    .sort((a, b) => b.position - a.position);
}

/** The roles an invitation may carry: those the asker may assign, top first. */
export const invitable = (
  view: Pick<DeskAgents, 'assignableRoles'>,
): DeskAgents['assignableRoles'] =>
  [...view.assignableRoles].sort((a, b) => b.position - a.position);

/** What an invitation sends: «Mirar y hablar» carries no role, «También construir» the ones picked. */
export function roleIdsFor(ability: 'talk' | 'build', picked: readonly string[]): string[] {
  return ability === 'talk' ? [] : [...picked];
}

/** The body of the request that changes an agent (PATCH). */
export type Change =
  | { readonly enabled: boolean }
  | { readonly state: AgentState }
  | { readonly giveRole: string }
  | { readonly takeRole: string };

export function changeBody(accountId: string, id: string, change: Change): Record<string, unknown> {
  return { accountId, id, ...change };
}

/** The address that removes an agent (DELETE). */
export const removeUrl = (accountId: string, id: string): string =>
  `/api/saldo/agents?cuenta=${encodeURIComponent(accountId)}&agente=${encodeURIComponent(id)}`;

/** The address that lists the organization's agents (GET). */
export const listUrl = (accountId: string): string =>
  `/api/saldo/agents?cuenta=${encodeURIComponent(accountId)}`;
