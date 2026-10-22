/**
 * The world's HTTP door for outside AI agents, called from the browser of
 * someone who manages the world (the «IA» section of a world's page).
 *
 * The door lives on the world's own server (numinia-engine
 * packages/server/src/agentes-http.ts):
 *
 *   GET    <world>/agentes       -> { agentes: [{ id, nombre, rol, permisos, presente }] }
 *   POST   <world>/agentes       -> body { id, nombre, clave, rol? }
 *   DELETE <world>/agentes/<id>
 *   GET    <world>/funciones     -> { funciones: [{ id: "puerta"|"dardos"|"pesca", activa, fija }] }
 *   POST   <world>/funciones     -> body { funcion, activa } (w7: the «Funciones de este mundo» block)
 *
 * with `Authorization: Bearer <world pass>`. The pass is the one numinia.com
 * signs for «Entrar» (POST /api/mundos/<id>/pass answers the world's address
 * with the pass after `#`); it is taken out of that address here, kept in
 * memory for the page's life, renewed before it expires (it lives ten
 * minutes) and once more when the world answers 401. The signing contract is
 * lib/world-pass.ts's and is not touched. The world only answers CORS to
 * https://numinia.com.
 *
 * Pure and zod-free (an island imports it); `fetch` is always injected.
 */

import { passApiUrl } from './mundos';

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** The id an agent has in its world (engine: AGENTE_ID). */
export const AGENT_ID_SHAPE = /^[a-z][a-z0-9-]{1,23}$/;
/** The public key `node tools/agente.ts nuevo` prints (engine: CLAVE_PUBLICA). */
export const AGENT_KEY_SHAPE = /^ed25519:[A-Za-z0-9_-]{43}$/;
/** The world role that lets an agent build; without a role it does what @todos do. */
export const BUILD_ROLE = 'Administración';
/** The permission that means «builds» in an agent's `permisos`. */
export const BUILD_PERMISSION = 'build-in-worlds';
/** The longest name the invitation takes. */
export const NAME_MAX = 32;
/** A pass is renewed this long after it was asked for (it lives ten minutes). */
export const RENEW_AFTER_MS = 8 * 60 * 1000;

/** What an agent may do in the world, as the section words it. */
export type Ability = 'talk' | 'build';

/** One agent of the world, as the door lists it. */
export interface DoorAgent {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly permissions: readonly string[];
  /** Connected right now. */
  readonly present: boolean;
}

/** Why a call to the door did not work, in the section's own words (i18n `ai.failures`). */
export type DoorFailure =
  | 'unreachable'
  | 'disabled'
  | 'expired'
  | 'no-pass'
  | 'forbidden'
  | 'duplicate'
  | 'too-big'
  | 'starting'
  | 'invalid'
  | 'not-found'
  | 'other';

export type DoorResult<T, F extends string = DoorFailure> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly failure: F;
      /** The world's own `texto` (Spanish), when it said one. */
      readonly detail: string | null;
    };

/** The ways a call can fail whatever the path: the world is down, the pass cannot be had or renewed. */
type CallFailure = 'unreachable' | 'expired' | 'no-pass';

/** The world's switchable functions, in the engine's own ids (features/funciones). */
export const FUNCTION_IDS = ['puerta', 'dardos', 'pesca'] as const;
export type FunctionId = (typeof FUNCTION_IDS)[number];

/** One function of the world: on or off, and whether the server fixes it (the switch cannot change it). */
export interface DoorFunction {
  readonly id: FunctionId;
  readonly active: boolean;
  readonly fixed: boolean;
}

/**
 * Why a call to `/funciones` did not work. `unsupported`: the world answers 404 (an older engine, or one with no
 * pass configured: both mean «not from here»); `fixed`: 409, the server fixes that function.
 */
export type FunctionsFailure =
  | CallFailure
  | 'unsupported'
  | 'fixed'
  | 'forbidden'
  | 'invalid'
  | 'too-big'
  | 'starting'
  | 'other';

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The pass out of the address the pass route answers: `https://host/#pass=<token>`; null if there is none. */
export function passFromAddress(address: unknown): string | null {
  if (typeof address !== 'string') return null;
  const hash = /^https:\/\/[^\s#]+#(\S+)$/.exec(address)?.[1];
  if (hash === undefined) return null;
  const token = new URLSearchParams(hash).get('pass');
  return token !== null && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
    ? token
    : null;
}

/** Asks the pass route for a pass; null when numinia.com gives none (guest, no key, down). Never throws. */
export async function askPass(fetcher: Fetch, worldId: string): Promise<string | null> {
  try {
    const response = await fetcher(passApiUrl(worldId), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: '{}',
    });
    const json: unknown = await response.json().catch(() => null);
    return isRecord(json) && json.pass === true ? passFromAddress(json.url) : null;
  } catch {
    return null;
  }
}

/** The pass held for the page: kept until it is about to expire, renewed on demand. */
export interface PassKeeper {
  /** The pass to send now: the held one, or a fresh one when it is old or there is none. */
  get(): Promise<string | null>;
  /** Asks for a fresh pass whatever the held one says (the world refused it). */
  renew(): Promise<string | null>;
}

export function createPassKeeper(ask: () => Promise<string | null>, now: () => number): PassKeeper {
  let held: { readonly token: string; readonly at: number } | null = null;
  let pending: Promise<string | null> | null = null;
  const renew = (): Promise<string | null> => {
    pending ??= ask()
      .then((token) => {
        held = token === null ? null : { token, at: now() };
        return token;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
  return {
    get: () =>
      held !== null && now() - held.at < RENEW_AFTER_MS ? Promise.resolve(held.token) : renew(),
    renew,
  };
}

const isFunctionId = (value: unknown): value is FunctionId =>
  FUNCTION_IDS.some((id) => id === value);

/** One `{ id, activa, fija }` of the door read; null when it is not that. */
function readFunction(entry: unknown): DoorFunction | null {
  if (!isRecord(entry) || !isFunctionId(entry.id)) return null;
  if (typeof entry.activa !== 'boolean' || typeof entry.fija !== 'boolean') return null;
  return { id: entry.id, active: entry.activa, fixed: entry.fija };
}

/**
 * The door's list of functions, read into the ones this panel knows; null when the body is not that.
 * A function the engine adds later (an id not in FUNCTION_IDS) is left out, so a newer engine never
 * breaks an older panel.
 */
export function readFunctions(json: unknown): readonly DoorFunction[] | null {
  if (!isRecord(json) || !Array.isArray(json.funciones)) return null;
  const known: DoorFunction[] = [];
  for (const entry of json.funciones) {
    if (isRecord(entry) && typeof entry.id === 'string' && !isFunctionId(entry.id)) continue;
    const one = readFunction(entry);
    if (one === null) return null;
    known.push(one);
  }
  return known;
}

/** A name for the invitation: null when it is fine, else why not. */
export function nameProblem(name: string): 'empty' | 'long' | 'chars' | null {
  const clean = name.trim();
  if (clean === '') return 'empty';
  if (clean.length > NAME_MAX) return 'long';
  return /^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(clean) ? null : 'chars';
}

/** The id an agent gets from its name: «Hermes Pablo» -> `hermes-pablo`; `ia` when the name has no letters to use. */
export function agentIdFrom(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const lettered = /^[a-z]/.test(slug) ? slug : slug === '' ? '' : `ia-${slug}`;
  const id = lettered.slice(0, 24).replace(/-+$/, '');
  return AGENT_ID_SHAPE.test(id) ? id : 'ia';
}

/** The one line the person runs where their AI lives: it makes the key and prints the public half. */
export function newAgentCommand(id: string, name: string): string {
  return `node tools/agente.ts nuevo ${id} --nombre "${name.trim()}"`;
}

/** Does this text look like the public key line the command prints? */
export function isAgentKey(text: string): boolean {
  return AGENT_KEY_SHAPE.test(text.trim());
}

/** What an agent may do, from the permissions the world reports for it. */
export function abilityOf(agent: DoorAgent): Ability {
  return agent.permissions.includes(BUILD_PERMISSION) ? 'build' : 'talk';
}

/** The door's list read into agents; null when the body is not that. */
export function readAgents(json: unknown): readonly DoorAgent[] | null {
  if (!isRecord(json) || !Array.isArray(json.agentes)) return null;
  const agents: DoorAgent[] = [];
  for (const entry of json.agentes) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.nombre !== 'string' ||
      typeof entry.presente !== 'boolean' ||
      !Array.isArray(entry.permisos)
    ) {
      return null;
    }
    agents.push({
      id: entry.id,
      name: entry.nombre,
      role: typeof entry.rol === 'string' ? entry.rol : null,
      permissions: entry.permisos.filter((p): p is string => typeof p === 'string'),
      present: entry.presente,
    });
  }
  return agents;
}

/** The world's door address for a path: its own address, whatever hash or path that carries. */
function doorUrl(worldUrl: string, path: string): string | null {
  try {
    return new URL(path, worldUrl).toString();
  } catch {
    return null;
  }
}

const FAILURES: Readonly<Record<number, DoorFailure>> = {
  400: 'invalid',
  403: 'forbidden',
  409: 'duplicate',
  413: 'too-big',
  503: 'starting',
};

function failureOf(status: number, error: unknown): DoorFailure {
  if (status === 404) return error === 'agentes-desactivado' ? 'disabled' : 'not-found';
  return FAILURES[status] ?? 'other';
}

const FUNCTION_FAILURES: Readonly<Record<number, FunctionsFailure>> = {
  400: 'invalid',
  403: 'forbidden',
  404: 'unsupported',
  409: 'fixed',
  413: 'too-big',
  503: 'starting',
};

function functionsFailureOf(status: number): FunctionsFailure {
  return FUNCTION_FAILURES[status] ?? 'other';
}

/** A call to the door, with the pass; `expired` only after the pass was renewed once. */
export interface Door {
  list(): Promise<DoorResult<readonly DoorAgent[]>>;
  add(agent: {
    readonly id: string;
    readonly name: string;
    readonly key: string;
    readonly ability: Ability;
  }): Promise<DoorResult<null>>;
  remove(id: string): Promise<DoorResult<null>>;
  /** The world's functions as it reports them now. */
  functions(): Promise<DoorResult<readonly DoorFunction[], FunctionsFailure>>;
  /**
   * Turns one function on or off and answers the state the world reports afterwards (all of them: the world's
   * own answer when it carries the list, else the list read again).
   */
  setFunction(
    id: FunctionId,
    active: boolean,
  ): Promise<DoorResult<readonly DoorFunction[], FunctionsFailure>>;
}

export function createDoor(options: {
  readonly fetch: Fetch;
  /** The world's own address (https://<host>/), from GET /api/mundos/<id>. */
  readonly worldUrl: string | null;
  readonly keeper: PassKeeper;
}): Door {
  const { fetch: fetcher, worldUrl, keeper } = options;

  async function once(
    url: string,
    token: string,
    init: { readonly method: string; readonly body?: string },
  ): Promise<Response> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    };
    if (init.body !== undefined) headers['content-type'] = 'application/json';
    return fetcher(url, {
      method: init.method,
      headers,
      ...(init.body === undefined ? {} : { body: init.body }),
    });
  }

  async function call<T, F extends string>(
    path: string,
    init: { readonly method: string; readonly body?: string },
    read: (json: unknown) => { readonly value: T } | null,
    why: (status: number, error: unknown) => F,
  ): Promise<DoorResult<T, F | CallFailure | 'other'>> {
    const url = worldUrl === null ? null : doorUrl(worldUrl, path);
    if (url === null) return { ok: false, failure: 'unreachable', detail: null };
    let token = await keeper.get();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (token === null) return { ok: false, failure: 'no-pass', detail: null };
      let response: Response;
      try {
        response = await once(url, token, init);
      } catch {
        return { ok: false, failure: 'unreachable', detail: null };
      }
      if (response.status === 401) {
        if (attempt === 0) token = await keeper.renew();
        continue;
      }
      const json: unknown = await response.json().catch(() => null);
      if (response.ok) {
        const got = read(json);
        return got === null
          ? { ok: false, failure: 'other', detail: null }
          : { ok: true, value: got.value };
      }
      const error = isRecord(json) ? json.error : undefined;
      const detail = isRecord(json) && typeof json.texto === 'string' ? json.texto : null;
      return { ok: false, failure: why(response.status, error), detail };
    }
    return { ok: false, failure: 'expired', detail: null };
  }

  const readState = (): Promise<DoorResult<readonly DoorFunction[], FunctionsFailure>> =>
    call(
      '/funciones',
      { method: 'GET' },
      (json) => {
        const functions = readFunctions(json);
        return functions === null ? null : { value: functions };
      },
      functionsFailureOf,
    );

  return {
    list: () =>
      call(
        '/agentes',
        { method: 'GET' },
        (json) => {
          const agents = readAgents(json);
          return agents === null ? null : { value: agents };
        },
        failureOf,
      ),
    add: (agent) =>
      call(
        '/agentes',
        {
          method: 'POST',
          body: JSON.stringify({
            id: agent.id,
            nombre: agent.name.trim(),
            clave: agent.key.trim(),
            ...(agent.ability === 'build' ? { rol: BUILD_ROLE } : {}),
          }),
        },
        () => ({ value: null }),
        failureOf,
      ),
    remove: (id) =>
      call(
        `/agentes/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        () => ({ value: null }),
        failureOf,
      ),
    functions: readState,
    setFunction: async (id, active) => {
      const wrote = await call(
        '/funciones',
        { method: 'POST', body: JSON.stringify({ funcion: id, activa: active }) },
        (json) => ({ value: json }),
        functionsFailureOf,
      );
      if (!wrote.ok) return wrote;
      // The world's own answer when it carries the list; otherwise ask it again, never guess.
      const said = readFunctions(wrote.value);
      return said === null ? readState() : { ok: true, value: said };
    },
  };
}
