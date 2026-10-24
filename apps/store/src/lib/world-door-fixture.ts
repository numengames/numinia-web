/**
 * A world's door for AI agents, in memory: what DATA_SOURCE=fixture puts
 * behind the «IA» section of a world's page, so the whole flow (invite, wait,
 * see it arrive, remove) can be walked and tested without a real world. It
 * answers like the engine's door (lib/world-door.ts documents it) with the
 * same refusals — a missing or wrong pass is 401, a bad key 400, a repeated
 * id 409, an unknown id 404 — and an agent that was just added shows as
 * connected from the second time the list is read, as an agent that dials in
 * would. It also keeps the world's functions (`/funciones`): conditions of
 * entry on, darts on, fishing off and fixed by the «server», so both the
 * switch and the fixed state can be walked.
 */

import {
  AGENT_ID_SHAPE,
  AGENT_KEY_SHAPE,
  BUILD_PERMISSION,
  BUILD_ROLE,
  FUNCTION_IDS,
} from './world-door';

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** The pass the fixture's keeper hands out, and the only one its door takes. */
export const FIXTURE_PASS = 'fixture.world.pass';

/** How many reads of the list it takes a new fixture agent to «connect». */
export const FIXTURE_ARRIVES_AFTER = 2;

interface Held {
  id: string;
  nombre: string;
  rol: string | null;
  reads: number;
}

const reply = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

const refusal = (status: number, error: string, texto: string): Response =>
  reply(status, { error, texto });

/**
 * A fresh fixture world with no agents; the returned fetch is the door. `functions: false` is a world whose
 * engine has no `/funciones` yet (404), to walk the «cannot be changed from here» state.
 */
export function createFixtureDoor(options: { readonly functions?: boolean } = {}): Fetch {
  const hasFunctions = options.functions !== false;
  const held: Held[] = [];
  const functions = [
    { id: 'normas', activa: true, fija: false },
    { id: 'dardos', activa: true, fija: false },
    { id: 'pesca', activa: false, fija: true },
  ];

  const view = (agent: Held) => ({
    id: agent.id,
    nombre: agent.nombre,
    rol: agent.rol,
    permisos: agent.rol === null ? ['enter-worlds'] : [BUILD_PERMISSION, 'enter-worlds'],
    presente: agent.reads >= FIXTURE_ARRIVES_AFTER,
  });

  return async (input, init) => {
    const method = init?.method ?? 'GET';
    const path = new URL(input).pathname;
    const authorization = new Headers(init?.headers).get('authorization');
    if (authorization === null) {
      return refusal(401, 'sin-pase', 'Falta el pase de numinia.com.');
    }
    if (authorization !== `Bearer ${FIXTURE_PASS}`) {
      return refusal(401, 'pase-invalido', 'El pase no vale o ha caducado.');
    }

    if (path === '/agentes' && method === 'GET') {
      const agents = held.map((agent) => {
        agent.reads += 1;
        return view(agent);
      });
      return reply(200, { agentes: agents });
    }

    if (path === '/agentes' && method === 'POST') {
      let body: unknown;
      try {
        body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
      } catch {
        return refusal(400, 'json', 'El cuerpo no es JSON.');
      }
      const { id, nombre, clave, rol } = (body ?? {}) as Record<string, unknown>;
      if (typeof id !== 'string' || typeof nombre !== 'string' || typeof clave !== 'string') {
        return refusal(400, 'campos', 'Hace falta un objeto JSON con id, nombre y clave (texto).');
      }
      if (!AGENT_ID_SHAPE.test(id)) {
        return refusal(400, 'invalido', 'No lo añado: el id no vale (2–24: a-z, 0-9 y guion).');
      }
      if (!AGENT_KEY_SHAPE.test(clave)) {
        return refusal(400, 'invalido', 'No lo añado: la clave no es una clave pública ed25519.');
      }
      if (rol !== undefined && rol !== BUILD_ROLE) {
        return refusal(
          400,
          'invalido',
          '¿Qué rol? Los de este mundo: @todos, Moderación, Administración.',
        );
      }
      if (held.some((agent) => agent.id === id)) {
        return refusal(409, 'conflicto', `No lo añado: Ya hay un agente con el id «${id}».`);
      }
      const agent: Held = { id, nombre, rol: rol === undefined ? null : BUILD_ROLE, reads: 0 };
      held.push(agent);
      return reply(201, {
        ok: true,
        texto: `Hecho: «${nombre} · IA» puede entrar.`,
        agente: view(agent),
      });
    }

    // An engine from before the door: a plain 404, as it answers any address it does not know.
    if (path === '/funciones' && !hasFunctions) {
      return refusal(404, 'no-hay', 'No existe esa dirección.');
    }

    if (path === '/funciones' && method === 'GET') return reply(200, { funciones: functions });

    if (path === '/funciones' && method === 'POST') {
      let body: unknown;
      try {
        body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
      } catch {
        return refusal(400, 'json', 'El cuerpo no es JSON.');
      }
      const { funcion, activa } = (body ?? {}) as Record<string, unknown>;
      const target = functions.find((entry) => entry.id === funcion);
      if (target === undefined || typeof activa !== 'boolean') {
        return refusal(
          400,
          'invalido',
          `¿Qué función? Las de este mundo: ${FUNCTION_IDS.join(', ')}.`,
        );
      }
      if (target.fija) {
        return refusal(409, 'fija', 'Esa función la fija el servidor.');
      }
      target.activa = activa;
      return reply(200, { ok: true, texto: 'Hecho.', funciones: functions });
    }

    const one = /^\/agentes\/([^/]+)$/.exec(path)?.[1];
    if (one !== undefined && method === 'DELETE') {
      const at = held.findIndex((agent) => agent.id === decodeURIComponent(one));
      if (at < 0) return refusal(404, 'no-hay', 'No hay ningún agente con ese id.');
      held.splice(at, 1);
      return reply(200, { ok: true, texto: 'Ya no puede entrar en este mundo.' });
    }

    return refusal(405, 'metodo', 'Aquí vale: GET, POST, DELETE.');
  };
}
