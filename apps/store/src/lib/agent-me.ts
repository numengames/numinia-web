/**
 * «MCP remoto», story W1 (2026-10-19): GET /api/agents/me — who an
 * organization's AI is, asked with its access token, and the one check of
 * that token that POST /api/agents/pass (lib/agent-pass.ts) shares.
 *
 * Who calls it: the relay that holds an AI's body in a world (and the bridge
 * of whoever runs one at home), never a browser — no session, no cookie, no
 * CORS header. The request is
 *   GET /api/agents/me?org=<organization id>&agent=<agent id>
 *   Authorization: Bearer ntk_…
 * The token alone does not say whose it is (the till keeps only its hash, by
 * agent), so the organization and the agent travel beside it, as they do in
 * the body of the pass request and in the lines that connect Hermes
 * (`AGENTE_ORG`, `AGENTE_ID`, lib/panel-agentes.ts `connectCommand`).
 *
 * The answer is `{ org, id, name, enabled, state, eligible, permissions,
 * worlds }`: what the till says of the agent and the worlds of ITS
 * organization the fleet serves, each with the WebSocket address its bridge
 * connects to (`wss://<host>/ws`, the engine's door behind Caddy). An AI
 * that is switched off, whose person no longer answers for it (ORG-011), or
 * whose roles do not let it enter, is still told who it is, with no worlds:
 * it would get no pass for any of them. A world is the organization's when
 * the till's public `homeOf` says so — the same test the pass makes — so a
 * world placed in another organization is never listed.
 *
 * The token is judged as the pass route judges it, by the same function
 * (`tokenHolder`): SHA-256 of the bearer against the hash the till keeps, in
 * constant time, and every wrong credential — no header, a header that is not
 * a token, an unknown agent, an agent made with a key, a revoked token, a
 * token that is not its own — is the same generic 401 `token`, so the route
 * never tells «unknown agent» from «bad token». The metering is the pass
 * route's too and the bucket is the same: 60 requests a minute PER AGENT,
 * the two routes together (`meterToken`, 429 `limite` with retry-after),
 * whether or not the agent exists, besides the doorman's per-IP limit. The
 * token is never logged, never in an error text, never in telemetry.
 *
 * Answers — all JSON, `no-store`; an error is `{ error, texto }`:
 *   200 the agent and its worlds
 *   400 `peticion` (no well-formed `org` and `agent` in the query)
 *   401 `token` (the bearer is not this agent's token, whatever the reason)
 *   429 `limite` (too many requests for this agent)
 *   502 `caja` (the till failed) · 503 `no-vinculado` (no till)
 */

import { z } from 'zod';
import type { AccountDesk } from './accounts';
import { answer as answerOf, ask } from './accounts-source';
import { bearerOf, hashToken, isAccountId, isAgentId, sameSecret } from './agents';
import { checkRate } from './rate-limit';
import { logEvent } from './telemetry';

type Log = (event: Readonly<Record<string, unknown>>) => void;

/** Requests a minute one agent may make with a token, to /pass and /me together (SPEC, cut 2). */
export const TOKEN_REQUESTS_PER_MINUTE = 60;

const TEXTOS = {
  peticion:
    'La petición no es la del contrato: GET ?org=…&agent=… con la cabecera Authorization: Bearer ntk_….',
  token: 'El token no es válido para esta IA.',
  limite: 'Demasiadas peticiones de esta IA: espera un poco.',
  caja: 'La caja de Numinia no respondió bien: vuelve a intentarlo.',
  'no-vinculado': 'Numinia no tiene la caja conectada ahora mismo.',
} as const;

type Code = keyof typeof TEXTOS;

const fail = (error: Code, status: number): Response =>
  answerOf({ error, texto: TEXTOS[error] }, status);

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });

/** What the till answers `agentPass`: the agent, whether its person answers for it, what it holds. */
export const agentPassShape = z.union([
  z.object({
    ok: z.literal(true),
    accountId: z.string(),
    agent: z.object({
      id: z.string(),
      name: z.string(),
      auth: z.enum(['key', 'token']),
      publicKey: z.string().optional(),
      tokenHash: z.string().optional(),
      enabled: z.boolean(),
      state: z.enum(['activa', 'dormida']),
    }),
    eligible: z.boolean(),
    permissions: z.array(z.string()),
    height: z.number(),
    roles: z.array(z.object({ name: z.string(), color: z.string().nullable() })),
  }),
  refusal,
]);

type AgentPassValue = z.infer<typeof agentPassShape>;
/** An agent the till holds, as `agentPass` answers it. */
export type HeldAgent = Exclude<AgentPassValue, { readonly ok: false }>;

const homeShape = z.union([
  z
    .object({
      ok: z.literal(true),
      home: z.object({ accountId: z.string() }).passthrough().nullable(),
    })
    .passthrough(),
  refusal,
]);

/** The generic 401 of the token way. */
export const refusedToken = (): Response => fail('token', 401);

/**
 * Meters one token request of (org, agent), existing or not, before anything
 * is looked up: null when it may go on, else the 429 that says to wait.
 */
export function meterToken(org: string, agent: string, nowMs: number, log: Log): Response | null {
  const verdict = checkRate(
    `agent-token:${org}:${agent}`,
    TOKEN_REQUESTS_PER_MINUTE,
    60_000,
    nowMs,
  );
  if (verdict.allowed) return null;
  log({ level: 'warn', kind: 'throttled', rule: 'agent-token' });
  return Response.json(
    { error: 'limite', texto: TEXTOS.limite },
    {
      status: 429,
      headers: { 'cache-control': 'no-store', 'retry-after': String(verdict.retryAfterS) },
    },
  );
}

/** The hash a request that has no agent to be compared with is compared with: the work is the same. */
const NOBODY = '0'.repeat(64);

/**
 * The agent whose token the `Authorization` header carries, or null —
 * judged in one way, so nothing tells why it failed. The comparison runs
 * even when there is nothing to compare with.
 */
export async function tokenHolder(
  authorization: string | null,
  found: AgentPassValue,
): Promise<HeldAgent | null> {
  const presented = bearerOf(authorization);
  const given = await hashToken(presented ?? '');
  const kept = 'problems' in found ? undefined : found;
  const equal = sameSecret(given, kept?.agent.tokenHash ?? NOBODY);
  return equal && presented !== null && kept?.agent.auth === 'token' ? kept : null;
}

/** The answer when the till failed or is not bound, in these routes' words. */
export const tillFailed = (response: Response): Response =>
  response.status === 503 ? fail('no-vinculado', 503) : fail('caja', 502);

/** One world of the AI's organization, and where its bridge connects. */
export interface AgentWorld {
  readonly id: string;
  readonly ws: string;
}

/** What GET /api/agents/me answers. */
export interface AgentMe {
  readonly org: string;
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly state: 'activa' | 'dormida';
  /** The person who answers for it is still in the organization and may manage roles (ORG-011). */
  readonly eligible: boolean;
  readonly permissions: readonly string[];
  readonly worlds: readonly AgentWorld[];
}

/** What the route works out from its environment, so the answer stays pure. */
export interface AgentMeContext {
  /** The fleet's world ids with the host each is served at; read only once the token is good. */
  readonly hosts: () => Promise<ReadonlyMap<string, string>>;
  /** Seconds since the epoch. */
  readonly now: number;
}

/** The WebSocket address of a world served at `host`. */
export const worldSocket = (host: string): string => `wss://${host}/ws`;

/** GET /api/agents/me. */
export async function answerAgentMe(
  desk: AccountDesk | null,
  req: Request,
  context: AgentMeContext,
  log: Log = logEvent,
): Promise<Response> {
  const query = new URL(req.url).searchParams;
  const org = query.get('org');
  const agent = query.get('agent');
  if (!isAccountId(org) || !isAgentId(agent)) return fail('peticion', 400);

  const limited = meterToken(org, agent, context.now * 1000, log);
  if (limited !== null) return limited;
  if (desk === null) return fail('no-vinculado', 503);

  const found = await ask(log, 'agent-me', () => desk.agentPass(org, agent), agentPassShape);
  if (!found.ok) return tillFailed(found.response);
  const held = await tokenHolder(req.headers.get('authorization'), found.value);
  if (held === null) return refusedToken();

  const enters = held.agent.enabled && held.eligible && held.permissions.includes('enter-worlds');
  const worlds: AgentWorld[] = [];
  if (enters) {
    const hosts = [...(await context.hosts())].sort(([a], [b]) => a.localeCompare(b));
    const asked = await Promise.all(
      hosts.map(async ([id, host]) => ({
        id,
        host,
        home: await ask(log, 'agent-me-home', () => desk.homeOf(id, null, false), homeShape),
      })),
    );
    for (const { id, host, home } of asked) {
      if (!home.ok) return tillFailed(home.response);
      if (!('problems' in home.value) && home.value.home?.accountId === org) {
        worlds.push({ id, ws: worldSocket(host) });
      }
    }
  }

  const me: AgentMe = {
    org,
    id: held.agent.id,
    name: held.agent.name,
    enabled: held.agent.enabled,
    state: held.agent.state,
    eligible: held.eligible,
    permissions: held.permissions,
    worlds,
  };
  return answerOf(me);
}
