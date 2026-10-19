/**
 * The one way the relay asks numinia.com who an AI is: `GET
 * /api/agents/me?org=&agent=` with the AI's `ntk_` token as the Bearer
 * (story W1, apps/store/src/lib/agent-me.ts). `/vuelta` asks it once before
 * issuing a code (story W6); the tools `quien_soy` and `mundos` ask it on
 * every call (story W7).
 *
 * The answer is read against W1's contract and sorted into what a caller
 * can act on:
 * - `ok`: the agent, as numinia.com describes it, and the worlds of its
 *   organization that the fleet serves;
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

/** W1's answer: `AgentMe` in apps/store/src/lib/agent-me.ts. */
export const meShape = z.object({
  org: z.string(),
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  state: z.enum(['activa', 'dormida']),
  eligible: z.boolean(),
  permissions: z.array(z.string()),
  worlds: z.array(worldShape),
});
export type Me = z.infer<typeof meShape>;

/** What numinia.com said, sorted. */
export type MeAnswer =
  | { readonly kind: 'ok'; readonly me: Me }
  | { readonly kind: 'revoked' }
  | { readonly kind: 'busy' }
  | { readonly kind: 'down' }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'refused' };

/** GET `<store>/api/agents/me` for one agent; never throws. */
export async function askMe(store: string, ask: MeAsk): Promise<MeAnswer> {
  const query = new URLSearchParams({ org: ask.accountId, agent: ask.agentId });
  let response: Response;
  try {
    response = await fetch(`${store}/api/agents/me?${query.toString()}`, {
      headers: { Authorization: `Bearer ${ask.token}`, Accept: 'application/json' },
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
