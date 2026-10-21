/**
 * The one way the relay asks numinia.com who an AI is: `GET
 * /api/agents/me?org=&agent=` with the AI's `ntk_` token as the Bearer
 * (story W1, apps/store/src/lib/agent-me.ts). `/vuelta` asks it once before
 * issuing a code (story W6); the tools `quien_soy` and `mundos` ask it on
 * every call (story W7). A client that pastes the panel's token instead of
 * connecting with OAuth (story W11, bearer.ts) is asked with the token
 * alone, `GET /api/agents/me` with no query ({@link askMeByToken}): the
 * relay does not know yet whose it is, and numinia.com finds it by its hash.
 *
 * The answer is read against W1's contract and sorted into what a caller
 * can act on:
 * - `ok`: the agent, as numinia.com describes it, and the worlds it lives in
 *   (those of its organization, or only the ones chosen for it) that the
 *   fleet serves;
 * - `revoked`: `401` — the token is no longer this agent's (revoked,
 *   renewed, the agent deleted): the grant that carries it is dead;
 * - `busy`: `429` — this agent asked too often (60 a minute, with its
 *   passes);
 * - `down`: no answer, or a `5xx`;
 * - `malformed`: a `200` that is not the contract;
 * - `refused`: any other status (a malformed query: a bug, not the token).
 * The token leaves the relay only in the `Authorization` header of this
 * request: never in the URL, an error or a log line.
 */
import { z } from 'zod';
import type { StoreFetch } from './env';

/** What the relay needs to ask: the agent, its organization and its token. */
export interface MeAsk {
  readonly accountId: string;
  readonly agentId: string;
  readonly token: string;
}

/** One world of the organization, as `/me` lists it (served by the fleet). */
const worldShape = z.object({
  id: z.string().min(1),
  ws: z.string(),
  // Not in W1's answer today; read when numinia.com adds them.
  name: z.string().min(1).optional(),
  on: z.boolean().optional(),
});

/** What an AI hears (D-083): only who calls it, also its bubble, or everything nearby. */
const HEARING = ['llamada', 'burbuja', 'todo'] as const;

/**
 * W1's answer: `AgentMe` in apps/store/src/lib/agent-me.ts. `oye` and `vive`
 * (S19) are read defensively: a store older than them says neither, and then
 * the AI hears everything nearby only if `hear` is true and lives in all the
 * worlds `worlds` lists; one that says something this relay does not know
 * yet (a new rung) is read as that default, never refused. The presence the
 * store also sends is not read here: the relay does not act on it.
 */
export const meShape = z
  .object({
    org: z.string(),
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    state: z.enum(['activa', 'dormida']),
    // Per AI, set from the panel; a store that has not shipped the switch yet says nothing: it hears nothing.
    hear: z.boolean().default(false),
    oye: z.enum(HEARING).optional().catch(undefined),
    vive: z.enum(['todos', 'elegidos']).default('todos').catch('todos'),
    eligible: z.boolean(),
    permissions: z.array(z.string()),
    worlds: z.array(worldShape),
  })
  .transform((me) => ({ ...me, oye: me.oye ?? (me.hear ? 'todo' : 'llamada') }));
export type Me = z.infer<typeof meShape>;

/** What numinia.com said, sorted. */
export type MeAnswer =
  | { readonly kind: 'ok'; readonly me: Me }
  | { readonly kind: 'revoked' }
  | { readonly kind: 'busy' }
  | { readonly kind: 'down' }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'refused' };

/**
 * GET `<store>/api/agents/me` for one agent; never throws. `send` is the way
 * to numinia.com (`storeFetch(env)`: its service binding when bound, story
 * W10), the public fetch by default.
 */
export async function askMe(
  store: string,
  ask: MeAsk,
  send: StoreFetch = (input, init) => fetch(input, init),
): Promise<MeAnswer> {
  const query = new URLSearchParams({ org: ask.accountId, agent: ask.agentId });
  return askAt(`${store}/api/agents/me?${query.toString()}`, ask.token, send);
}

/**
 * GET `<store>/api/agents/me` with the token alone (story W11): whose it
 * is, as {@link askMe} answers it. Never throws.
 */
export async function askMeByToken(
  store: string,
  token: string,
  send: StoreFetch = (input, init) => fetch(input, init),
): Promise<MeAnswer> {
  return askAt(`${store}/api/agents/me`, token, send);
}

async function askAt(url: string, token: string, send: StoreFetch): Promise<MeAnswer> {
  let response: Response;
  try {
    response = await send(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      redirect: 'manual',
    });
  } catch {
    return { kind: 'down' };
  }
  if (response.status === 401) return { kind: 'revoked' };
  if (response.status === 429) return { kind: 'busy' };
  if (response.status >= 500) return { kind: 'down' };
  if (response.status !== 200) return { kind: 'refused' };
  const parsed = meShape.safeParse(await response.json().catch(() => null));
  return parsed.success ? { kind: 'ok', me: parsed.data } : { kind: 'malformed' };
}
