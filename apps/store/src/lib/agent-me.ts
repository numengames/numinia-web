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
 * The answer is `{ org, id, name, enabled, state, hear, oye, vive, presence,
 * eligible, permissions, worlds }`: what the till says of the agent and the
 * worlds it LIVES IN (S19: all those of its organization, or only the ones
 * its managers chose) that the fleet serves, each with the WebSocket address
 * its bridge connects to (`wss://<host>/ws`, the engine's door behind Caddy).
 * `presence` is its body, bubble, calling and stay — no secret: the token and
 * its hash never travel —, `oye` the rung of what it hears (`llamada`,
 * `burbuja`, `todo`: D-083) and `hear` the same for relays that predate the
 * ladder: true only when `oye` is `todo`. `vive` says whether it lives in
 * `todos` the worlds of its organization or only in `elegidos`; a till older
 * than migration 0026 says nothing of either, and the answer is `todos`, the
 * default presence and `oye` `todo` only if it hears. An AI
 * that is switched off, whose person no longer answers for it (ORG-011), or
 * whose roles do not let it enter, is still told who it is, with no worlds:
 * it would get no pass for any of them. The organization's worlds come from
 * the till in ONE call (`agentWorlds`: the agent's row joined to its
 * organization's placements, W2), kept only where the fleet serves them — so
 * a world placed in another organization is never listed, and the pass makes
 * the same test (`homeOf`) world by world.
 *
 * The token is judged as the pass route judges it, by the same function
 * (`tokenHolder`): SHA-256 of the bearer against the hash the till keeps, in
 * constant time, and every wrong credential — no header, a header that is not
 * a token, an unknown agent, an agent made with a key, a revoked token, a
 * token that is not its own — is the same generic 401 `token`, so the route
 * never tells «unknown agent» from «bad token». The metering is the pass
 * route's too and the bucket is the same: 60 requests a minute PER AGENT,
 * the two routes together (`meterToken`, 429 `limite` with retry-after),
 * whether or not the agent exists, besides the doorman's per-IP limit —
 * which the relay's calls skip (story W10, `fromRelay` in lib/rate-limit.ts:
 * through a service binding they have no address, and one bucket for all
 * would let one AI throttle the rest), so for them this meter is the only
 * one. The token is never logged, never in an error text, never in telemetry.
 *
 * The token alone (story W11, the relay's static bearer): a client that
 * cannot do OAuth — Hermes, a script — holds nothing but the `ntk_` token
 * the panel showed, so the relay asks with NO query at all:
 *   GET /api/agents/me
 *   Authorization: Bearer ***
 * The till finds the agent by SHA-256(token) alone (`agentByToken`, W2: by
 * the unique index, a revoked or renewed token has no hash left) and the
 * answer is the same as with the query. The same generic 401 for every
 * wrong credential (a bearer that is not shaped like a token is refused
 * before the till is asked; the rest go through `tokenHolder` like the
 * query's). The same meter: once the token names its agent, the request
 * counts in THAT agent's bucket, the one /pass and the query share — it
 * cannot be counted before, when nobody is named yet; an unknown token
 * costs one indexed read and is counted per address by the doorman (from
 * the internet) or by the relay (limites.ts, per caller's address).
 *
 * Answers — all JSON, `no-store`; an error is `{ error, texto }`:
 *   200 the agent and its worlds
 *   400 `peticion` (only one of `org` and `agent`, or one not well formed)
 *   401 `token` (the bearer is not this agent's token, whatever the reason)
 *   429 `limite` (too many requests for this agent)
 *   502 `caja` (the till failed) · 503 `no-vinculado` (no till)
 */

import {
  DEFAULT_AGENT_PRESENCE,
  parseAgentPresence,
  parseAgentWorlds,
  type AgentHearingStep,
  type AgentPresence,
} from '@numinia/domain';
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
      // A till that has not run migration 0023 yet says nothing: it hears nothing.
      hears: z.boolean().default(false),
      // Nor has one that has not run 0026: no presence (the default one) and all the worlds.
      // Read loosely here and judged by `presenceOf` / `livesOf`, so a till of another shape never fails the route.
      presence: z.unknown().optional(),
      worlds: z.unknown().optional(),
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

/** What the till answers `agentWorlds`: the worlds placed in the agent's organization, by id. */
const agentWorldsShape = z.union([
  z.object({
    ok: z.literal(true),
    accountId: z.string(),
    agentId: z.string(),
    worldIds: z.array(z.string()),
  }),
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
  /** Whether its community lets it hear nearby chat (`oir`): true only when `oye` is `todo` (kept for relays older than the ladder). */
  readonly hear: boolean;
  /** What it hears (D-083): only who calls it, also what is said in its bubble, or everything nearby. */
  readonly oye: AgentHearingStep;
  /** Where it lives: all the worlds of its organization, or only the ones chosen. */
  readonly vive: 'todos' | 'elegidos';
  /** How it is present in a world: body, bubble, calling, stay. */
  readonly presence: AgentPresence;
  /** The person who answers for it is still in the organization and may manage roles (ORG-011). */
  readonly eligible: boolean;
  readonly permissions: readonly string[];
  /** The worlds it lives in that the fleet serves now. */
  readonly worlds: readonly AgentWorld[];
}

/** What the route works out from its environment, so the answer stays pure. */
export interface AgentMeContext {
  /** The fleet's world ids with the host each is served at; read only once the token is good. */
  readonly hosts: () => Promise<ReadonlyMap<string, string>>;
  /** Seconds since the epoch. */
  readonly now: number;
}

/** The presence the till kept, or the default when it kept none or something that no longer reads. */
function presenceOf(held: HeldAgent['agent']): AgentPresence {
  const read = parseAgentPresence(held.presence);
  const presence = read.ok ? read.value : DEFAULT_AGENT_PRESENCE;
  // `hears` is the truth about the last rung (the till says so too): an older till has only that.
  if (held.hears) return { ...presence, oye: 'todo' };
  return presence.oye === 'todo' ? { ...presence, oye: 'llamada' } : presence;
}

/** Where the agent lives, as the till said it: only a clear choice of worlds is `elegidos`. */
function livesOf(held: HeldAgent['agent']): AgentMe['vive'] {
  const read = parseAgentWorlds(held.worlds);
  return read.ok && 'mundos' in read.value ? 'elegidos' : 'todos';
}

/** The WebSocket address of a world served at `host`. */
export const worldSocket = (host: string): string => `wss://${host}/ws`;

/** An agent whose token was good, and the till that said so. */
interface Holding {
  readonly desk: AccountDesk;
  readonly held: HeldAgent;
}

/** The agent named by `?org=&agent=` whose token the bearer is, or the answer that refuses. */
async function heldByQuery(
  desk: AccountDesk | null,
  req: Request,
  org: string,
  agent: string,
  nowMs: number,
  log: Log,
): Promise<Holding | Response> {
  const limited = meterToken(org, agent, nowMs, log);
  if (limited !== null) return limited;
  if (desk === null) return fail('no-vinculado', 503);
  const found = await ask(log, 'agent-me', () => desk.agentPass(org, agent), agentPassShape);
  if (!found.ok) return tillFailed(found.response);
  const held = await tokenHolder(req.headers.get('authorization'), found.value);
  return held === null ? refusedToken() : { desk, held };
}

/**
 * The agent whose token the bearer is, found by the token alone (story
 * W11), or the answer that refuses; metered in that agent's bucket once
 * the token has named it.
 */
async function heldByToken(
  desk: AccountDesk | null,
  req: Request,
  nowMs: number,
  log: Log,
): Promise<Holding | Response> {
  const authorization = req.headers.get('authorization');
  const presented = bearerOf(authorization);
  if (presented === null) return refusedToken();
  if (desk === null) return fail('no-vinculado', 503);
  const hash = await hashToken(presented);
  const found = await ask(log, 'agent-me-token', () => desk.agentByToken(hash), agentPassShape);
  if (!found.ok) return tillFailed(found.response);
  const held = await tokenHolder(authorization, found.value);
  if (held === null) return refusedToken();
  return meterToken(held.accountId, held.agent.id, nowMs, log) ?? { desk, held };
}

/** GET /api/agents/me: with `?org=&agent=` (W1), or with the token alone (W11). */
export async function answerAgentMe(
  desk: AccountDesk | null,
  req: Request,
  context: AgentMeContext,
  log: Log = logEvent,
): Promise<Response> {
  const query = new URL(req.url).searchParams;
  const asked = { org: query.get('org'), agent: query.get('agent') };
  const nowMs = context.now * 1000;
  let holding: Holding | Response;
  if (asked.org === null && asked.agent === null) {
    holding = await heldByToken(desk, req, nowMs, log);
  } else if (isAccountId(asked.org) && isAgentId(asked.agent)) {
    holding = await heldByQuery(desk, req, asked.org, asked.agent, nowMs, log);
  } else {
    return fail('peticion', 400);
  }
  return holding instanceof Response ? holding : answerFor(holding, context, log);
}

/** The answer for an agent whose token was good: who it is and, if it may enter, its worlds. */
async function answerFor(
  { desk, held }: Holding,
  context: AgentMeContext,
  log: Log,
): Promise<Response> {
  const org = held.accountId;
  const enters = held.agent.enabled && held.eligible && held.permissions.includes('enter-worlds');
  const worlds: AgentWorld[] = [];
  if (enters) {
    const placed = await ask(
      log,
      'agent-me-worlds',
      () => desk.agentWorlds(org, held.agent.id),
      agentWorldsShape,
    );
    if (!placed.ok) return tillFailed(placed.response);
    // An agent removed between the two calls has no worlds: nothing to list.
    const ids = 'problems' in placed.value ? [] : placed.value.worldIds;
    const hosts = await context.hosts();
    for (const id of [...ids].sort((a, b) => a.localeCompare(b))) {
      const host = hosts.get(id);
      if (host !== undefined) worlds.push({ id, ws: worldSocket(host) });
    }
  }

  const presence = presenceOf(held.agent);
  const me: AgentMe = {
    org,
    id: held.agent.id,
    name: held.agent.name,
    enabled: held.agent.enabled,
    state: held.agent.state,
    hear: presence.oye === 'todo',
    oye: presence.oye,
    vive: livesOf(held.agent),
    presence,
    eligible: held.eligible,
    permissions: held.permissions,
    worlds,
  };
  return answerOf(me);
}
