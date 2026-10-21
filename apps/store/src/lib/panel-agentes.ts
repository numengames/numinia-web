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

import type {
  AgentBodyKind,
  AgentHearingStep,
  AgentPresence,
  AgentPresenceChange,
  AgentStayHours,
  AgentWorlds,
  BubbleShape,
  BubbleVisible,
} from '@numinia/domain';
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

// The domain's own lists, written out here because this file ships to the browser without the domain's
// validators (zod); a test pins every one of them to packages/domain/src/types/agent-presence.ts.
export const BUBBLE_FORMS: readonly BubbleShape[] = ['esfera', 'cupula', 'cilindro', 'caja'];
export const BUBBLE_VISIBILITY: readonly BubbleVisible[] = ['siempre', 'al-acercarte', 'nunca'];
export const BUBBLE_RADIUS_MIN = 2;
export const BUBBLE_RADIUS_MAX = 12;
export const STAY_HOURS: readonly AgentStayHours[] = [0, 1, 4, 24];
export const HEARING_STEPS: readonly AgentHearingStep[] = ['llamada', 'burbuja', 'todo'];
export const CALL_PHRASE_MAX = 40;
const BODY_KINDS: readonly string[] = ['casa'] satisfies readonly AgentBodyKind[];
const BODY_MODEL_MAX = 999;

/** The house's own models an AI may wear. Only its robot is on offer until the house publishes more. */
export const HOUSE_BODIES: readonly { readonly modelo: number; readonly key: 'robot' }[] = [
  { modelo: 0, key: 'robot' },
];

/** What a new AI is present as, until its manager changes it: the till's own (the domain's `DEFAULT_AGENT_PRESENCE`). */
export const DEFAULT_PRESENCE: AgentPresence = {
  cuerpo: { tipo: 'casa', modelo: 0 },
  burbuja: { forma: 'esfera', radio: 4, visible: 'al-acercarte' },
  llamada: { nombre: true, barra: true, boton: true, solo_dentro: true },
  oye: 'llamada',
  quedarse_h: 0,
};

const isWhole = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const isOneOf = <T extends string | number>(list: readonly T[], value: unknown): value is T =>
  (list as readonly unknown[]).includes(value);

/** How an AI is present, as the desk says it: all four groups, each valid; undefined for anything else. */
function readPresence(value: unknown): AgentPresence | undefined {
  if (!isRecord(value)) return undefined;
  const { cuerpo, burbuja, llamada, oye, quedarse_h: stay } = value;
  if (!isRecord(cuerpo) || !isRecord(burbuja) || !isRecord(llamada)) return undefined;
  const { frase } = llamada;
  if (
    typeof cuerpo['tipo'] !== 'string' ||
    !BODY_KINDS.includes(cuerpo['tipo']) ||
    !isWhole(cuerpo['modelo'], 0, BODY_MODEL_MAX) ||
    !isOneOf(BUBBLE_FORMS, burbuja['forma']) ||
    !isWhole(burbuja['radio'], BUBBLE_RADIUS_MIN, BUBBLE_RADIUS_MAX) ||
    !isOneOf(BUBBLE_VISIBILITY, burbuja['visible']) ||
    typeof llamada['nombre'] !== 'boolean' ||
    typeof llamada['barra'] !== 'boolean' ||
    typeof llamada['boton'] !== 'boolean' ||
    typeof llamada['solo_dentro'] !== 'boolean' ||
    (frase !== undefined && (typeof frase !== 'string' || frase.length === 0)) ||
    !isOneOf(HEARING_STEPS, oye) ||
    !isOneOf(STAY_HOURS, stay)
  ) {
    return undefined;
  }
  return {
    cuerpo: { tipo: 'casa', modelo: cuerpo['modelo'] },
    burbuja: { forma: burbuja['forma'], radio: burbuja['radio'], visible: burbuja['visible'] },
    llamada: {
      nombre: llamada['nombre'],
      barra: llamada['barra'],
      boton: llamada['boton'],
      solo_dentro: llamada['solo_dentro'],
      ...(typeof frase === 'string' ? { frase } : {}),
    },
    oye,
    quedarse_h: stay,
  };
}

/** Where an AI lives, as the desk says it: every world (`todos`) or the chosen ones (`mundos`); undefined for anything else. */
function readWorlds(value: unknown): AgentWorlds | undefined {
  if (!isRecord(value)) return undefined;
  if (value['todos'] === true) return { todos: true };
  const chosen = value['mundos'];
  return isStrings(chosen) ? { mundos: chosen } : undefined;
}

function readAgent(value: unknown): DeskAgent | null {
  if (!isRecord(value)) return null;
  const { id, name, auth, publicKey, enabled, state, status, responsible, responsibleName } = value;
  const { responsibleHouse } = value;
  const { tokenPrefix, tokenCreatedAt, via } = value;
  const { createdAt, updatedAt, roleIds, assignable, mayEdit, hears } = value;
  const worlds = readWorlds(value['worlds']);
  const presence = readPresence(value['presence']);
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    (auth !== 'key' && auth !== 'token') ||
    (publicKey !== undefined && typeof publicKey !== 'string') ||
    (tokenPrefix !== undefined && typeof tokenPrefix !== 'string') ||
    (tokenCreatedAt !== undefined && typeof tokenCreatedAt !== 'string') ||
    (via !== undefined && typeof via !== 'string') ||
    typeof enabled !== 'boolean' ||
    (hears !== undefined && typeof hears !== 'boolean') ||
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
    auth,
    ...(publicKey === undefined ? {} : { publicKey }),
    ...(tokenPrefix === undefined || tokenCreatedAt === undefined
      ? {}
      : { tokenPrefix, tokenCreatedAt }),
    ...(via === undefined ? {} : { via }),
    enabled,
    // The closed lists were checked above.
    state: state as AgentState,
    // A desk that does not say (before migration 0023) hears nothing.
    hears: hears === true,
    // A desk that does not say (before migration 0026) lives in all of its community's worlds.
    ...(worlds === undefined ? {} : { worlds }),
    // …and is present as the defaults say.
    ...(presence === undefined ? {} : { presence }),
    status: status as AgentStatus,
    responsible,
    ...(responsibleHouse === true ? { responsibleHouse } : {}),
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

const TOKEN = /^ntk_[A-Za-z0-9_-]{43}$/;

/**
 * The secret a call that made a token answers with (`{ agents, token }`), or
 * null when it carries none. Held in memory by the screen that shows it once;
 * never stored, logged or put in a URL.
 */
export function readToken(json: unknown): string | null {
  const token = isRecord(json) ? json['token'] : undefined;
  return typeof token === 'string' && TOKEN.test(token) ? token : null;
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
  [
    'the house does not give an agent a role that holds Administrator or Manage roles: that is for the owners',
    'houseCeiling',
  ],
  ['the organization has no such role', 'noSuchRole'],
  ['that agent connects with a key, not a token', 'notToken'],
  ['every world must be placed in the AI’s organization', 'worldGone'],
]);

export type AgentProblem =
  | 'noSuchAgent'
  | 'taken'
  | 'limit'
  | 'houseCeiling'
  | 'noSuchRole'
  | 'notToken'
  | 'worldGone'
  | 'invalid';

/** Prefixes of the till's field refusals: a name, a key, an id the form should have caught. */
const FIELD_PROBLEM =
  /^(agentId|name|publicKey|tokenHash|tokenPrefix|roleIds|roleId|change|enabled|state|hears|agent|worlds|presence)[ :.]/;

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
  | { readonly hears: boolean }
  | { readonly worlds: AgentWorlds }
  | { readonly presence: AgentPresenceChange }
  | { readonly giveRole: string }
  | { readonly takeRole: string }
  | { readonly renewToken: true }
  | { readonly revokeToken: true };

export function changeBody(accountId: string, id: string, change: Change): Record<string, unknown> {
  return { accountId, id, ...change };
}

/** The address that removes an agent (DELETE). */
export const removeUrl = (accountId: string, id: string): string =>
  `/api/saldo/agents?cuenta=${encodeURIComponent(accountId)}&agente=${encodeURIComponent(id)}`;

/** The address that lists the organization's agents (GET). */
export const listUrl = (accountId: string): string =>
  `/api/saldo/agents?cuenta=${encodeURIComponent(accountId)}`;

/**
 * The three lines that connect an AI to the world with its token, for Hermes
 * (`hermes mcp add --help`: `--command` the program, `--env KEY=VALUE …`, and
 * `--args …` last). The bridge is the engine's, so the first line goes into the
 * folder where numinia-engine is cloned and the path is made from it — no
 * package is invented. Only the world's address is left for the person to
 * fill in (`TU-MUNDO`). The token is the secret just shown once.
 */
export function connectCommand(input: {
  readonly origin: string;
  readonly org: string;
  readonly id: string;
  readonly token: string;
}): string {
  const env = [
    `NUMINIA_URL=${input.origin}`,
    `AGENTE_ORG=${input.org}`,
    `AGENTE_ID=${input.id}`,
    `AGENTE_TOKEN=${input.token}`,
    'MUNDO_URL=wss://TU-MUNDO/ws',
  ].join(' ');
  return [
    'cd numinia-engine',
    `hermes mcp add numinia-mundo --command node --env ${env} --args "$PWD/tools/mcp-mundo.ts"`,
    'hermes mcp test numinia-mundo',
  ].join('\n');
}

/**
 * The relay's address (apps/mcp, `RESOURCE`): the one URL a person pastes in
 * Claude, ChatGPT or Hermes. Written here because lib/relay-handoff.ts, which
 * holds `RELAY_ORIGIN`, carries zod; a test pins the two together.
 */
export const RELAY_URL = 'https://mcp.numinia.com/mcp';

/** The name the relay takes in a person's Hermes (`hermes mcp add <name>`). */
const HERMES_NAME = 'numinia';

/**
 * Hermes desktop's «Add to Hermes» link for the relay with its login
 * (hermes-agent docs, MCP config reference › «Add to Hermes link»:
 * `hermes://mcp/install?name=NAME&config=BASE64`, the config as base64url
 * JSON with a `url`; `auth: oauth` makes Hermes sign in through the browser).
 * Opening it installs nothing: Hermes shows the config and asks first.
 */
export function hermesInstallLink(url: string = RELAY_URL): string {
  const config = btoa(JSON.stringify({ url, auth: 'oauth' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `hermes://mcp/install?name=${HERMES_NAME}&config=${config}`;
}

/**
 * The line for a client that cannot sign in (Hermes on a server, a script's
 * Hermes): the same address with the panel's token. `hermes mcp add --auth
 * header` asks for «API key / Bearer token» and sends it in the
 * Authorization header as a bearer token, which the relay takes (W11).
 */
export const hermesTokenCommand = (url: string = RELAY_URL): string =>
  `hermes mcp add ${HERMES_NAME} --url ${url} --auth header`;

/**
 * The two terminal lines that add the relay to Hermes with its login
 * (`hermes mcp add --help`: `--url`, `--auth {oauth,header}`; `hermes mcp
 * login <name>` signs in through the browser — hermes-agent docs, «OAuth over
 * SSH / Remote Hosts»). The chat of Hermes cannot do this: its connections
 * tool only installs servers from its own catalog.
 */
export const hermesOauthCommand = (url: string = RELAY_URL): string =>
  `hermes mcp add ${HERMES_NAME} --url ${url} --auth oauth\nhermes mcp login ${HERMES_NAME}`;

/** How an AI was connected, as its row says it: from the panel, from an app by URL (and its host), or not known. */
export type Connection =
  { readonly kind: 'panel' } | { readonly kind: 'url'; readonly host: string } | null;

const VIA_URL = /^mcp:([a-z0-9.-]{1,253})$/;

export function connectionOf(agent: Pick<DeskAgent, 'via'>): Connection {
  if (agent.via === 'panel') return { kind: 'panel' };
  const host = VIA_URL.exec(agent.via ?? '')?.[1];
  return host === undefined ? null : { kind: 'url', host };
}

/**
 * Whether the row offers «Desconectar»: an AI connected from an app by URL
 * that still holds its token, to someone who may handle it. It is the panel's
 * revoke (`revokeToken`): the till drops the token and switches it off, and
 * the relay drops its connection the next time it asks.
 */
export const disconnectable = (agent: DeskAgent): boolean =>
  agent.mayEdit &&
  agent.auth === 'token' &&
  agent.tokenPrefix !== undefined &&
  connectionOf(agent)?.kind === 'url';

/**
 * Which app an AI came from, as its card's chip says it: Claude, ChatGPT or
 * Hermes (by the host it connected from), the panel's code, a key, or — for an
 * app Numinia does not know — the host itself.
 */
export type AgentClient =
  | { readonly kind: 'claude' | 'chatgpt' | 'hermes' | 'panel' | 'key' }
  | { readonly kind: 'other'; readonly host: string };

/** `host` is the host itself or a subdomain of `domain`. */
const underDomain = (host: string, domain: string): boolean =>
  host === domain || host.endsWith(`.${domain}`);

/** The app behind an `mcp:<host>` connection: the well-known hosts by name, any other by itself. */
function clientOfHost(host: string): AgentClient {
  if (
    underDomain(host, 'claude.ai') ||
    underDomain(host, 'claude.com') ||
    host.includes('anthropic')
  ) {
    return { kind: 'claude' };
  }
  if (underDomain(host, 'chatgpt.com') || host.includes('openai')) return { kind: 'chatgpt' };
  if (
    host.includes('nousresearch') ||
    host.includes('hermes') ||
    host === '127.0.0.1' ||
    underDomain(host, 'localhost')
  ) {
    return { kind: 'hermes' };
  }
  return { kind: 'other', host };
}

/**
 * Where an AI came from, from its `via` (what the till wrote when it was
 * made): `mcp:<host>` is an app, `panel` is a code made in the panel, and no
 * `via` is an AI that existed before it — a code if it holds a token, else a
 * key (the ways older than `via`).
 */
export function clientOf(agent: Pick<DeskAgent, 'via' | 'auth'>): AgentClient {
  if (agent.via === 'panel') return { kind: 'panel' };
  const host = VIA_URL.exec(agent.via ?? '')?.[1];
  if (host !== undefined) return clientOfHost(host);
  return { kind: agent.auth === 'token' ? 'panel' : 'key' };
}

/** The app's name as a sentence says it — Claude, ChatGPT, Hermes, or the host of one it does not know; null for the panel and a key. */
export function appNameOf(client: AgentClient): string | null {
  switch (client.kind) {
    case 'claude':
      return 'Claude';
    case 'chatgpt':
      return 'ChatGPT';
    case 'hermes':
      return 'Hermes';
    case 'other':
      return client.host;
    default:
      return null;
  }
}

/** What the card's ⋯ menu offers. */
export type AgentAction = 'disconnect' | 'renew' | 'remove';

/**
 * The actions this AI's menu has, only those that apply to it: «Desconectar»
 * for one connected from an app, «Renovar código» for one made with a code
 * from the panel, «Quitar» for any — all of them only to someone who may edit
 * it, so the others get no menu.
 */
export function actionsOf(agent: DeskAgent): readonly AgentAction[] {
  if (!agent.mayEdit) return [];
  const actions: AgentAction[] = [];
  if (disconnectable(agent)) actions.push('disconnect');
  if (agent.auth === 'token' && connectionOf(agent)?.kind !== 'url') actions.push('renew');
  actions.push('remove');
  return actions;
}

/** The row's token line parts: the prefix as shown (`ntk_ab12cd34…`) and the day it was made. */
export function tokenLine(
  agent: DeskAgent,
): { readonly shown: string; readonly day: string } | null {
  if (agent.auth !== 'token' || agent.tokenPrefix === undefined) return null;
  return {
    shown: `ntk_${agent.tokenPrefix}…`,
    day: (agent.tokenCreatedAt ?? '').slice(0, 10),
  };
}

// ---- «En el mundo» (S20): where an AI lives ---------------------------------

/** How the card puts where an AI lives: in one world, in several chosen ones, or in all of the community's. */
export type WorldsMode = 'one' | 'several' | 'all';

/** Where an AI lives: what the desk said, or — from a till older than migration 0026 — all of its community's worlds. */
export const worldsOf = (agent: Pick<DeskAgent, 'worlds'>): AgentWorlds =>
  agent.worlds ?? { todos: true };

/** The mode a stored answer reads as: all, one chosen world, or several (none chosen reads as several). */
export function worldsModeOf(worlds: AgentWorlds): WorldsMode {
  if ('todos' in worlds) return 'all';
  return worlds.mundos.length === 1 ? 'one' : 'several';
}

/** The community's worlds an AI lives in now: all of them, or the chosen ones still there. */
export function livesIn(worlds: AgentWorlds, community: readonly string[]): string[] {
  return 'todos' in worlds ? [...community] : community.filter((id) => worlds.mundos.includes(id));
}

/** Whether an AI lives in this world (S24): it lives in all of its community's worlds, or in the chosen ones. */
export function livesInWorld(agent: Pick<DeskAgent, 'worlds'>, worldId: string): boolean {
  const worlds = worldsOf(agent);
  return 'todos' in worlds || worlds.mundos.includes(worldId);
}

/**
 * What to tell the desk when the person picks another way of living: «todos»
 * for all; for one, the first world it lives in (else the community's first);
 * for several, the ones it lives in now (else all of them). Null when nothing
 * needs sending — the community has no worlds to pick from, or the pick keeps
 * the same worlds (one → several).
 */
export function worldsForMode(
  mode: WorldsMode,
  current: AgentWorlds,
  community: readonly string[],
): AgentWorlds | null {
  if (mode === 'all') return { todos: true };
  const now = livesIn(current, community);
  const first = now[0] ?? community[0];
  if (first === undefined) return null;
  if (mode === 'one') return { mundos: [first] };
  if ('mundos' in current) return null;
  return { mundos: [...community] };
}

/** The chosen worlds with one added or taken away; null when that would leave none (it must live somewhere). */
export function toggleWorld(
  chosen: readonly string[],
  id: string,
  on: boolean,
): AgentWorlds | null {
  const next = on ? [...new Set([...chosen, id])] : chosen.filter((one) => one !== id);
  return next.length === 0 ? null : { mundos: next.sort() };
}

// ---- «En el mundo» (S21): body and bubble --------------------------------------

/**
 * How an AI is present: what the desk said, or — from a till older than migration 0026 — the defaults. What it
 * hears follows its `hears` switch, the truth about the last rung: set, «everything nearby»; not set, never.
 */
export function presenceOf(agent: Pick<DeskAgent, 'presence' | 'hears'>): AgentPresence {
  const stored = agent.presence ?? DEFAULT_PRESENCE;
  const oye = agent.hears ? 'todo' : stored.oye === 'todo' ? 'llamada' : stored.oye;
  return oye === stored.oye ? stored : { ...stored, oye };
}

/** A radius the slider may hold: whole metres, between the least and the most. */
export const clampRadius = (metres: number): number =>
  Math.min(BUBBLE_RADIUS_MAX, Math.max(BUBBLE_RADIUS_MIN, Math.round(metres)));
