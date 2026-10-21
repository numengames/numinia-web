/**
 * «IAs de organización» (2026-10-17): the community panel's actions on an
 * organization's AIs — /api/saldo/agents. The session decides WHO (our own
 * signed cookie, never a header or a body); the till decides WHAT (it checks
 * manage-roles, who is above whom, the limit, and writes the organization's
 * log). Nothing here judges a permission.
 *
 *   GET    ?cuenta=<account id>              → { agents: DeskAgents }
 *   POST   { accountId, id, name, publicKey, roleIds? }      create by key (the asker answers for it)
 *          { accountId, id, name, auth: 'token', roleIds? }   create by token → { agents, token }
 *   PATCH  { accountId, id, enabled?, state?, hears? }       the switch, the state and/or whether it hears nearby chat
 *          { accountId, id, renewToken: true }               a new token (the old one stops) → { agents, token }
 *          { accountId, id, revokeToken: true }              revoke the token and switch it off
 *          { accountId, id, worlds: { todos: true } | { mundos: [world ids] } }   where it lives
 *          { accountId, id, presence: { cuerpo?, burbuja?, llamada?, oye?, quedarse_h? } }   how it is present
 *          { accountId, id, giveRole: <role id> }            give a role
 *          { accountId, id, takeRole: <role id> }            take a role
 *   DELETE ?cuenta=<account id>&agente=<agent id>            remove
 *
 * Every answer to a write is the same `{ agents }` as the read, so the panel
 * redraws from it. The two that make a token (create by token, renew) add
 * `token`: the secret, `ntk_` and 43 base64url characters, drawn here from 32
 * random bytes and shown ONCE. Only its SHA-256 and its first 8 characters go
 * to the till; the secret is in no log, no error and no telemetry, and the
 * answer is `no-store`. A refusal is 403 `{ error: 'refused', problems }`; a
 * body out of shape 400; no session 401; no till 503; a till that fails 502
 * (lib/accounts-source.ts). Changes reach the world in at most 10 minutes —
 * the engine acts on the pass, which an AI renews every ~8.
 *
 * No fresh wallet signature (ORG-008) is asked for giving an AI a role that
 * carries `manage-roles` or `administrator`: an AI's pass never carries
 * either (its permissions are cut to entering and building, lib/world-pass.ts),
 * so the role gives it no power over the organization.
 */

import { z } from 'zod';
import {
  AGENT_WORLDS_MAX,
  parseAgentPresence,
  parseAgentPresenceChange,
  type AgentPresenceChange,
} from '@numinia/domain';
import type { AccountDesk, Asker, DeskAgent, DeskAgentDraft } from './accounts';
import {
  accountOf,
  answer,
  ask,
  bodyOf,
  notBound,
  refused,
  signedOut,
  whoIs,
  type Log,
} from './accounts-source';
import { AGENT_STATES, newToken, type FreshToken } from './agents';
import { logEvent } from './telemetry';

const ID_MAX = 100;

let built: ReturnType<typeof buildSchemas> | null = null;

function buildSchemas() {
  const accountId = z.string().min(1).max(ID_MAX);
  // The agent's id, name and key are judged by the till (the same words as the fixture).
  const agentId = z.string().min(1).max(ID_MAX);
  const roleId = z.string().regex(/^role_[0-9a-f]{16}$/, 'a role id');
  const createKey = z
    .object({
      accountId,
      id: agentId,
      name: z.string().max(400),
      publicKey: z.string().max(200),
      roleIds: z.array(roleId).max(10).optional(),
    })
    .strict();
  const createToken = z
    .object({
      accountId,
      id: agentId,
      name: z.string().max(400),
      auth: z.literal('token'),
      roleIds: z.array(roleId).max(10).optional(),
    })
    .strict();
  // The worlds are judged by the till (each one placed in the organization); the route only checks the shape.
  const worlds = z.union([
    z.object({ todos: z.literal(true) }).strict(),
    z
      .object({ mundos: z.array(z.string().min(1).max(ID_MAX)).min(1).max(AGENT_WORLDS_MAX) })
      .strict(),
  ]);
  // The presence is the domain's: any part of any group, each valid, none unknown (the till reads it again).
  const presence = z.custom<AgentPresenceChange>((value) => parseAgentPresenceChange(value).ok, {
    message: 'invalid presence',
  });
  const patch = z.union([
    z
      .object({
        accountId,
        id: agentId,
        enabled: z.boolean().optional(),
        state: z.enum(AGENT_STATES).optional(),
        hears: z.boolean().optional(),
      })
      .strict()
      .refine(
        (change) =>
          change.enabled !== undefined || change.state !== undefined || change.hears !== undefined,
        { message: 'enabled, state or hears is required' },
      ),
    z.object({ accountId, id: agentId, worlds }).strict(),
    z.object({ accountId, id: agentId, presence }).strict(),
    z.object({ accountId, id: agentId, giveRole: roleId }).strict(),
    z.object({ accountId, id: agentId, takeRole: roleId }).strict(),
    z.object({ accountId, id: agentId, renewToken: z.literal(true) }).strict(),
    z.object({ accountId, id: agentId, revokeToken: z.literal(true) }).strict(),
  ]);
  const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
  const agents = z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      as: z.enum(['owner', 'house', 'member']),
      mayCreate: z.boolean(),
      assignableRoles: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z.string().nullable(),
          position: z.number(),
        }),
      ),
      agents: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          auth: z.enum(['key', 'token']),
          publicKey: z.string().optional(),
          tokenPrefix: z.string().optional(),
          tokenCreatedAt: z.string().optional(),
          enabled: z.boolean(),
          state: z.enum(AGENT_STATES),
          // A till that has not run migration 0023 yet says nothing: it hears nothing.
          hears: z.boolean().default(false),
          // A till that has not run migration 0026 yet says neither: the defaults, and all the worlds.
          presence: z
            .custom<NonNullable<DeskAgent['presence']>>((value) => parseAgentPresence(value).ok)
            .optional(),
          worlds: z
            .union([
              z.object({ todos: z.literal(true) }),
              z.object({ mundos: z.array(z.string()) }),
            ])
            .optional(),
          status: z.enum(['apagada', 'sin-responsable', 'sin-permiso', ...AGENT_STATES]),
          responsible: z.string(),
          // A till that has not run migration 0025 yet says nothing: a member answers for it.
          responsibleHouse: z.literal(true).optional(),
          responsibleName: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
          roleIds: z.array(z.string()),
          assignable: z.array(z.string()),
          mayEdit: z.boolean(),
        }),
      ),
    }),
    refusal,
  ]);
  return { createKey, createToken, patch, agents };
}

const shapes = (): ReturnType<typeof buildSchemas> => (built ??= buildSchemas());

/** The first issue of a body that is not the contract's, as the other routes word it. */
function badBody(error: z.ZodError): Response {
  const issue = error.issues[0];
  const where = issue === undefined || issue.path.length === 0 ? '' : `${issue.path.join('.')}: `;
  return answer({ error: `${where}${issue?.message ?? 'invalid'}` }, 400);
}

/** GET /api/saldo/agents?cuenta=: the organization's AIs, to a member or the house. */
export async function answerAgents(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  const named = accountOf(url);
  if (!named.ok) return named.response;
  if (desk === null) return notBound();
  const { you, house } = whoIs(asker);
  const asked = await ask(
    log,
    'agents',
    () => desk.agents(you, named.account, house),
    shapes().agents,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ agents: asked.value });
}

/** POST, PATCH and DELETE /api/saldo/agents: create, change, remove. */
export async function answerAgentWrite(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  const { method } = request;

  if (method === 'DELETE') {
    const url = new URL(request.url);
    const named = accountOf(url);
    if (!named.ok) return named.response;
    const agent = url.searchParams.get('agente') ?? '';
    if (agent.length === 0 || agent.length > ID_MAX) {
      return answer({ error: 'agente: an agent id is required' }, 400);
    }
    if (desk === null) return notBound();
    const { you, house } = whoIs(asker);
    const asked = await ask(
      log,
      'remove-agent',
      () => desk.removeAgent(you, named.account, agent, house),
      shapes().agents,
    );
    if (!asked.ok) return asked.response;
    if ('problems' in asked.value) return refused(asked.value.problems);
    return answer({ agents: asked.value });
  }

  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const s = shapes();

  if (method === 'POST') {
    const viaToken =
      typeof body.json === 'object' &&
      body.json !== null &&
      (body.json as Record<string, unknown>)['auth'] !== undefined;
    const read = viaToken ? s.createToken.safeParse(body.json) : s.createKey.safeParse(body.json);
    if (!read.success) return badBody(read.error);
    if (desk === null) return notBound();
    const { you, house } = whoIs(asker);
    const { accountId, ...agent } = read.data;
    // The secret is drawn here; the till is given its hash and prefix only.
    const fresh = 'auth' in agent ? await newToken() : null;
    const draft: DeskAgentDraft =
      'auth' in agent
        ? {
            ...agent,
            tokenHash: (fresh as FreshToken).hash,
            tokenPrefix: (fresh as FreshToken).prefix,
          }
        : agent;
    const asked = await ask(
      log,
      'create-agent',
      () => desk.createAgent(you, accountId, draft, house),
      s.agents,
    );
    if (!asked.ok) return asked.response;
    if ('problems' in asked.value) return refused(asked.value.problems);
    return answer({ agents: asked.value, ...(fresh === null ? {} : { token: fresh.token }) });
  }

  // PATCH: the only other method the route exports.
  const read = s.patch.safeParse(body.json);
  if (!read.success) return badBody(read.error);
  if (desk === null) return notBound();
  const { you, house } = whoIs(asker);
  const change = read.data;
  // A renewal draws the new secret here; the till is given its hash and prefix only.
  const fresh = 'renewToken' in change ? await newToken() : null;
  const asked = await ask(
    log,
    'change-agent',
    () => {
      if ('giveRole' in change) {
        return desk.giveAgentRole(you, change.accountId, change.id, change.giveRole, house);
      }
      if ('takeRole' in change) {
        return desk.takeAgentRole(you, change.accountId, change.id, change.takeRole, house);
      }
      if ('presence' in change) {
        return desk.changeAgentPresence(you, change.accountId, change.id, change.presence, house);
      }
      if ('worlds' in change) {
        return desk.setAgentWorlds(you, change.accountId, change.id, change.worlds, house);
      }
      if ('renewToken' in change) {
        const { hash, prefix } = fresh as NonNullable<typeof fresh>;
        return desk.renewAgentToken(you, change.accountId, change.id, hash, prefix, house);
      }
      if ('revokeToken' in change) {
        return desk.revokeAgentToken(you, change.accountId, change.id, house);
      }
      const { accountId, id, ...rest } = change;
      return desk.changeAgent(you, accountId, id, rest, house);
    },
    s.agents,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ agents: asked.value, ...(fresh === null ? {} : { token: fresh.token }) });
}
