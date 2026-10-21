/**
 * «IAs de organización» (2026-10-17): POST /api/agents/pass — the pass an
 * organization's AI asks for, every few minutes, to stay in a world.
 *
 * Who calls it: the AI's bridge (the engine's tools/mcp-mundo.ts), never a
 * browser — there is no session, no cookie and no CORS header. What proves
 * it is the AI: the body is `{ org, agent, aud, t, sig }`, `sig` being the
 * Ed25519 signature, with the key the organization registered for the agent,
 * of the ASCII line `numinia-agent-pass:<org>:<agent>:<aud>:<t>`
 * (lib/agents.ts). The answer is `{ pass, exp }`: a world pass of ten minutes
 * (lib/world-pass.ts, the same key and format as a person's, plus `kind`,
 * `state` and an `a_…` sub). Switching an AI off, putting it to sleep or
 * removing it is nothing more than not giving it the next pass, or a
 * trimmed one: the engine closes the connection of an AI whose pass runs out.
 *
 * Replay: a signed request is good for 60 seconds either side of `t` and for
 * ONE use. The till keeps (org, agent, aud, t) for two minutes
 * (`claimAgentPass`, a D1 table): the second request with the same four
 * answers 409 `repetida`. The claim is made only after the signature is
 * verified (nobody burns a nonce they cannot sign) and after every other
 * refusal (a refused request burns nothing). The table is the till's, so the
 * rule holds across Workers; if the till cannot be reached the route fails
 * closed (502), never open.
 *
 * The other way in (cut 2, «token de acceso»): an AI made with a token sends
 * `Authorization: Bearer ntk_…` and the body `{ org, agent, aud }` — no `t`, no
 * `sig`. The route looks the agent up by (org, agent) and compares SHA-256 of
 * the bearer with the hash the till keeps, in constant time (lib/agents.ts
 * `sameSecret`). From there it is the same as the key way: switched off,
 * the person who answers for it, ORG-011, the organization's world, the state.
 * A bearer needs no nonce (it is a secret, not a repeatable signature) but is
 * metered: 60 requests a minute PER AGENT (`limite`, 429, retry-after), whether
 * or not the agent exists, besides the doorman's per-IP limit. Whatever is
 * wrong with the credential — no such agent, an agent made with a key, a
 * revoked token, a token that is not its own, a header that is not a token —
 * is the same generic 401 `token`: it never tells «unknown agent» from «bad
 * token». A key agent refuses a bearer and a token agent refuses a signature.
 * The metering and the judging of the bearer are lib/agent-me.ts's, shared
 * with GET /api/agents/me: one check, one bucket per agent for both routes.
 * The token is never logged, never in an error text, never in telemetry.
 *
 * Answers — all JSON, `no-store`; an error is `{ error, texto }`, `texto` a
 * sentence for a person to read in the bridge's log:
 *   200 { pass, exp }
 *   400 `peticion` (the body is not what the contract says) · `hora` (|now − t| > 60 s)
 *   401 `firma` (the signature is not the agent's, or the agent has a token and no key) ·
 *       `token` (the bearer is not this agent's token, whatever the reason)
 *   429 `limite` (too many requests for this agent)
 *   403 `apagada` (switched off) · `sin-responsable` (the person who answers for it left or
 *       lost manage-roles) · `sin-permiso` (its roles do not let it enter) ·
 *       `otra-organizacion` (the world is not this organization's)
 *   404 `no-existe` (no such agent) · `mundo` (no such world)
 *   409 `repetida` (the request was already used)
 *   502 `caja` (the till failed) · 503 `no-vinculado` (no till) · `sin-clave` (no signing key)
 *
 * The `ia` block (S18, D-084): the pass says how the AI looks, how it is called, how long it
 * stays and who answers for it, but ONLY for a world whose engine takes it (0.29.0 or later:
 * an older one refuses a pass with a field it does not know). The context's `takesIa` says so
 * for a world; not given, or not a clear yes, or no one to name as responsible: the pass goes
 * without the block, exactly as before.
 */

import { agentPassIa, parseAgentResponds, type AgentPassIa } from '@numinia/domain';
import { z } from 'zod';
import type { AccountDesk } from './accounts';
import {
  agentPassShape,
  meterToken,
  presenceOf,
  refusedToken,
  tillFailed,
  tokenHolder,
  type HeldAgent,
} from './agent-me';
import { inWindow, isAccountId, isAgentId, isAudience, verifyRequest } from './agents';
import { logEvent } from './telemetry';
import { WorldPassError, buildAgentPassPayload, signPass } from './world-pass';
import { answer as answerOf, ask } from './accounts-source';

type Log = (event: Readonly<Record<string, unknown>>) => void;

/** What the route works out from its environment, so the answer stays pure. */
export interface AgentPassContext {
  /** The fleet's world ids with the host each is served at (only the ids matter here). */
  readonly hosts: ReadonlyMap<string, string>;
  /** WORLD_PASS_PRIVATE_KEY. */
  readonly privateKey: string | undefined;
  /** AUTH_SESSION_SECRET, the HMAC key of the agent's opaque id. */
  readonly secret: string | undefined;
  /** Seconds since the epoch. */
  readonly now: number;
  /** Whether the world `aud` runs an engine that takes the `ia` block (lib/world-ia.ts); not given: it does not. */
  readonly takesIa?: (aud: string) => Promise<boolean>;
}

/** A request is a few hundred bytes. */
const MAX_REQUEST_BYTES = 1_024;
const SIGNATURE_MAX = 128;

const TEXTOS = {
  peticion:
    'La petición no es la del contrato: {org, agent, aud, t, sig} en JSON, con t en segundos.',
  hora: 'La hora de la petición se aparta más de 60 segundos de la del servidor: revisa el reloj.',
  firma: 'La firma no es la de esta IA.',
  apagada: 'Esta IA está apagada: no recibe pase.',
  'sin-responsable':
    'La persona que responde de esta IA ya no está en la organización o ya no puede gestionar roles: no recibe pase.',
  'sin-permiso': 'Los roles de esta IA no le dejan entrar a los mundos.',
  'otra-organizacion': 'Ese mundo no es de la organización de esta IA.',
  'no-existe': 'Esta organización no tiene una IA con ese nombre.',
  mundo: 'No hay un mundo con ese nombre.',
  repetida: 'Esa petición ya se usó: firma otra con la hora de ahora.',
  'no-vinculado': 'Numinia no tiene la caja conectada ahora mismo.',
  'sin-clave': 'Numinia no puede firmar pases ahora mismo.',
} as const;

type Code = keyof typeof TEXTOS;

const fail = (error: Code, status: number): Response =>
  answerOf({ error, texto: TEXTOS[error] }, status);

const bearerRequest = z
  .object({
    org: z.string().refine(isAccountId),
    agent: z.string().refine(isAgentId),
    aud: z.string().refine(isAudience),
  })
  .strict();

const request = z
  .object({
    org: z.string().refine(isAccountId),
    agent: z.string().refine(isAgentId),
    aud: z.string().refine(isAudience),
    t: z.number().int().nonnegative(),
    sig: z.string().min(1).max(SIGNATURE_MAX),
  })
  .strict();

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const shapes = {
  pass: agentPassShape,
  home: z.union([
    z
      .object({
        ok: z.literal(true),
        home: z.object({ accountId: z.string() }).passthrough().nullable(),
      })
      .passthrough(),
    refusal,
  ]),
  claim: z.union([z.object({ ok: z.literal(true) }), refusal]),
};

/** The JSON of a POST within limits, or the answer that refuses it. */
async function bodyOf(
  req: Request,
): Promise<{ readonly ok: true; readonly json: unknown } | { readonly ok: false }> {
  const type = (req.headers.get('content-type') ?? '').trim().toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(type)) return { ok: false };
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_REQUEST_BYTES) return { ok: false };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_REQUEST_BYTES) return { ok: false };
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * The `ia` block for this AI in the world `aud`, or none: it needs someone to name as responsible, and a
 * world that clearly takes it. A world that cannot be asked, or fails when asked, is a world that does not.
 */
async function iaFor(
  held: HeldAgent,
  aud: string,
  context: AgentPassContext,
): Promise<AgentPassIa | undefined> {
  const responde = parseAgentResponds(held.responde);
  if (!responde.ok || context.takesIa === undefined) return undefined;
  try {
    if (!(await context.takesIa(aud))) return undefined;
  } catch {
    return undefined;
  }
  return agentPassIa(presenceOf(held.agent), responde.value);
}

type Parsed =
  | { readonly mode: 'signed'; org: string; agent: string; aud: string; t: number; sig: string }
  | { readonly mode: 'bearer'; org: string; agent: string; aud: string };

/** The request the contract says, for the way in the headers announce (a bearer or a signature), or null. */
function parseRequest(json: unknown, bearer: boolean): Parsed | null {
  if (bearer) {
    const read = bearerRequest.safeParse(json);
    return read.success ? { mode: 'bearer', ...read.data } : null;
  }
  const read = request.safeParse(json);
  return read.success ? { mode: 'signed', ...read.data } : null;
}

/** POST /api/agents/pass. */
export async function answerAgentPass(
  desk: AccountDesk | null,
  req: Request,
  context: AgentPassContext,
  log: Log = logEvent,
): Promise<Response> {
  const authorization = req.headers.get('authorization');
  const body = await bodyOf(req);
  const parsed = body.ok ? parseRequest(body.json, authorization !== null) : null;
  if (parsed === null) return fail('peticion', 400);
  const { org, agent, aud } = parsed;
  const signed = parsed.mode === 'signed' ? parsed : null;
  if (signed !== null && !inWindow(signed.t, context.now)) return fail('hora', 400);
  if (signed === null) {
    // Metered per agent whether or not it exists, before anything is looked up.
    const limited = meterToken(org, agent, context.now * 1000, log);
    if (limited !== null) return limited;
  }
  if (!context.hosts.has(aud)) return fail('mundo', 404);
  if (desk === null) return fail('no-vinculado', 503);

  const found = await ask(log, 'agent-pass', () => desk.agentPass(org, agent), shapes.pass);
  if (!found.ok) return tillFailed(found.response);

  // The credential is judged in one way, and nothing tells why it failed.
  if (signed === null && (await tokenHolder(authorization, found.value)) === null) {
    return refusedToken();
  }
  if ('problems' in found.value) return fail('no-existe', 404);
  const held = found.value;

  if (signed !== null) {
    const key = held.agent.publicKey;
    if (
      held.agent.auth !== 'key' ||
      key === undefined ||
      !(await verifyRequest(key, signed.sig, org, agent, aud, signed.t))
    ) {
      return fail('firma', 401);
    }
  }
  if (!held.agent.enabled) return fail('apagada', 403);
  if (!held.eligible) return fail('sin-responsable', 403);
  if (!held.permissions.includes('enter-worlds')) return fail('sin-permiso', 403);

  const home = await ask(log, 'agent-home', () => desk.homeOf(aud, null, false), shapes.home);
  if (!home.ok) return tillFailed(home.response);
  if ('problems' in home.value || home.value.home?.accountId !== org) {
    return fail('otra-organizacion', 403);
  }

  // Signed first and claimed after: a door without a key spends no nonce.
  const ia = await iaFor(held, aud, context);
  let token: { readonly pass: string; readonly exp: number };
  try {
    if (context.secret === undefined || context.secret === '') {
      throw new WorldPassError('no-key');
    }
    const payload = await buildAgentPassPayload({
      aud,
      org,
      secret: context.secret,
      agent,
      name: held.agent.name,
      state: held.agent.state,
      access: { permissions: held.permissions, height: held.height },
      roles: held.roles,
      ...(ia === undefined ? {} : { ia }),
      now: context.now,
    });
    token = { pass: await signPass(context.privateKey, payload), exp: payload.exp };
  } catch (error) {
    log({
      level: 'error',
      kind: 'agent-pass',
      rule: error instanceof WorldPassError ? error.code : 'threw',
    });
    return fail('sin-clave', 503);
  }

  // A bearer is not repeatable by design: only a signed request spends a nonce.
  if (signed !== null) {
    const claim = await ask(
      log,
      'agent-claim',
      () => desk.claimAgentPass(org, agent, aud, signed.t),
      shapes.claim,
    );
    if (!claim.ok) return tillFailed(claim.response);
    if ('problems' in claim.value) return fail('repetida', 409);
  }
  return answerOf(token);
}
