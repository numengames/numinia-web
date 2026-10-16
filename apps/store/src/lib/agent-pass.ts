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
 * Answers — all JSON, `no-store`; an error is `{ error, texto }`, `texto` a
 * sentence for a person to read in the bridge's log:
 *   200 { pass, exp }
 *   400 `peticion` (the body is not what the contract says) · `hora` (|now − t| > 60 s)
 *   401 `firma` (the signature is not the agent's)
 *   403 `apagada` (switched off) · `sin-responsable` (the person who answers for it left or
 *       lost manage-roles) · `sin-permiso` (its roles do not let it enter) ·
 *       `otra-organizacion` (the world is not this organization's)
 *   404 `no-existe` (no such agent) · `mundo` (no such world)
 *   409 `repetida` (the request was already used)
 *   502 `caja` (the till failed) · 503 `no-vinculado` (no till) · `sin-clave` (no signing key)
 */

import { z } from 'zod';
import type { AccountDesk } from './accounts';
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
  caja: 'La caja de Numinia no respondió bien: vuelve a intentarlo.',
  'no-vinculado': 'Numinia no tiene la caja conectada ahora mismo.',
  'sin-clave': 'Numinia no puede firmar pases ahora mismo.',
} as const;

type Code = keyof typeof TEXTOS;

const fail = (error: Code, status: number): Response =>
  answerOf({ error, texto: TEXTOS[error] }, status);

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
  pass: z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      agent: z.object({
        id: z.string(),
        name: z.string(),
        publicKey: z.string(),
        enabled: z.boolean(),
        state: z.enum(['activa', 'dormida']),
      }),
      eligible: z.boolean(),
      permissions: z.array(z.string()),
      height: z.number(),
      roles: z.array(z.object({ name: z.string(), color: z.string().nullable() })),
    }),
    refusal,
  ]),
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

/** The failure `ask` gives for a till that failed or is not bound, in this route's words. */
const tillFailed = (response: Response): Response =>
  response.status === 503 ? fail('no-vinculado', 503) : fail('caja', 502);

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

/** POST /api/agents/pass. */
export async function answerAgentPass(
  desk: AccountDesk | null,
  req: Request,
  context: AgentPassContext,
  log: Log = logEvent,
): Promise<Response> {
  const body = await bodyOf(req);
  const read = body.ok ? request.safeParse(body.json) : null;
  if (read === null || !read.success) return fail('peticion', 400);
  const { org, agent, aud, t, sig } = read.data;
  if (!inWindow(t, context.now)) return fail('hora', 400);
  if (!context.hosts.has(aud)) return fail('mundo', 404);
  if (desk === null) return fail('no-vinculado', 503);

  const found = await ask(log, 'agent-pass', () => desk.agentPass(org, agent), shapes.pass);
  if (!found.ok) return tillFailed(found.response);
  if ('problems' in found.value) return fail('no-existe', 404);
  const held = found.value;

  if (!(await verifyRequest(held.agent.publicKey, sig, org, agent, aud, t))) {
    return fail('firma', 401);
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

  const claim = await ask(
    log,
    'agent-claim',
    () => desk.claimAgentPass(org, agent, aud, t),
    shapes.claim,
  );
  if (!claim.ok) return tillFailed(claim.response);
  if ('problems' in claim.value) return fail('repetida', 409);
  return answerOf(token);
}
