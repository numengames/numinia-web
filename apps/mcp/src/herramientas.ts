/**
 * The relay's own tools (DISENO-MCP-REMOTO §2 (a), story W7), both without
 * state: each call reads the grant's props (the organization, the agent and
 * its `ntk_` token, decrypted by the OAuth library) and asks numinia.com's
 * `GET /api/agents/me` (me.ts) who the AI is now. Nothing is cached, so a
 * switch flipped in Panel › Agents shows on the next call.
 *
 * - `quien_soy`: who the AI is — its stable id, organization, name, whether
 *   it is switched on, its state (activa/dormida), what its roles let it do
 *   and that it cannot hear nearby chat (`hear: false`: `oir` stays off for
 *   AIs connected by URL until the lawyers validate it, and the relay has
 *   no `oir` yet).
 * - `mundos`: the worlds of its organization that are on, and how to enter
 *   one (`entrar`, story W8); none, with the reason, when it may not enter.
 *
 * What can go wrong is a tool result with `isError: true` and a sentence an
 * AI can act on, never a protocol error: numinia.com down or busy, a relay
 * without its setting, and a token revoked or renewed on numinia.com
 * (`401`): then the relay revokes this OAuth grant with the library's
 * `revokeGrant`, so the client's next call is a `401` and it has to connect
 * again. The AI's token is never in a tool result, an error or a log line.
 */
import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { z } from 'zod';
import { storeFetch, storeOrigin, type Env } from './env';
import { askMe, type Me } from './me';

/** The tools' names: stable ids a client keeps; never renamed. */
export const WHO_AM_I = 'quien_soy';
export const WORLDS = 'mundos';

/** The tool that takes the AI into a world (herramientas-cuerpo.ts, story W9). */
export const ENTER_TOOL = 'entrar';

/** The permission that lets an AI into its organization's worlds (the till's act). */
const ENTER_WORLDS = 'enter-worlds';

const NO_INPUT = { type: 'object', properties: {}, additionalProperties: false } as const;

/** Read-only, same answer for the same state, nothing outside Numinia. */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/** Why an AI may not enter its worlds now, in the panel's words (Panel › Agents). */
export type Standing = 'apagada' | 'sin-responsable' | 'sin-permiso' | 'activa' | 'dormida';

const STANDING_TEXT: Record<Standing, string> = {
  apagada:
    'You are switched off: you enter no world. A person of your organization can switch you on in Panel › Agents on numinia.com.',
  'sin-responsable':
    'No one answers for you: the person who did left the organization or can no longer manage roles. You enter no world until someone does.',
  'sin-permiso':
    'Your roles do not let you into the worlds. A person who manages roles can change them in Panel › Agents.',
  activa: 'You are active: attentive and ready. You can enter your organization’s worlds.',
  dormida:
    'You are asleep (dormida): you can enter the worlds at rest — you watch and listen, speak only if called, and do not build.',
};

const STANDINGS = Object.keys(STANDING_TEXT);

/** The tools as `tools/list` shows them. */
export const TOOLS = [
  {
    name: WHO_AM_I,
    title: 'Who am I',
    description:
      'Who you are in Numinia: your stable id, your organization, your name, whether you are switched on, your state (activa or dormida), what your roles let you do, and whether you can hear chat near you (not yet). Call it first, and again if something you try is refused.',
    inputSchema: NO_INPUT,
    outputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Your stable id, «<organization>.<agent>»: the same on every call and connection.',
        },
        agent: { type: 'string', description: 'Your agent id within the organization.' },
        organization: { type: 'string', description: 'Your organization’s id.' },
        name: { type: 'string' },
        enabled: { type: 'boolean', description: 'false: you are switched off.' },
        state: { type: 'string', enum: ['activa', 'dormida'] },
        standing: { type: 'string', enum: STANDINGS },
        canEnter: { type: 'boolean', description: 'Whether you may enter worlds now.' },
        permissions: { type: 'array', items: { type: 'string' } },
        hear: {
          type: 'boolean',
          description: 'Whether you can hear chat near you: false for now.',
        },
        note: { type: 'string' },
      },
      required: [
        'id',
        'agent',
        'organization',
        'name',
        'enabled',
        'state',
        'standing',
        'canEnter',
        'permissions',
        'hear',
        'note',
      ],
      additionalProperties: false,
    },
    annotations: { title: 'Who am I', ...READ_ONLY },
  },
  {
    name: WORLDS,
    title: 'Worlds',
    description:
      'The worlds of your organization that are on now, with their ids, and how to enter one later with the tool «entrar». Empty, with the reason, when you may not enter any (switched off, no one answers for you, no permission).',
    inputSchema: NO_INPUT,
    outputSchema: {
      type: 'object',
      properties: {
        organization: { type: 'string' },
        worlds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The world’s id: pass it to «entrar».' },
              name: { type: 'string' },
              on: { type: 'boolean', description: 'Whether the world is on and served now.' },
              enter: {
                type: 'object',
                description: 'The call that will take you in.',
                properties: {
                  tool: { type: 'string', const: ENTER_TOOL },
                  arguments: {
                    type: 'object',
                    properties: { mundo: { type: 'string' } },
                    required: ['mundo'],
                  },
                },
                required: ['tool', 'arguments'],
              },
            },
            required: ['id', 'on', 'enter'],
          },
        },
        reason: {
          type: 'string',
          enum: ['apagada', 'sin-responsable', 'sin-permiso', 'sin-mundos'],
          description: 'Why the list is empty.',
        },
        note: { type: 'string' },
      },
      required: ['organization', 'worlds', 'note'],
      additionalProperties: false,
    },
    annotations: { title: 'Worlds', ...READ_ONLY },
  },
] as const;

/** What `tools/call` answers (MCP `CallToolResult`). */
export interface ToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
  readonly structuredContent?: Record<string, unknown>;
  readonly isError?: true;
}

/** What one call needs: the bindings, the grant's props and the OAuth access token. */
export interface ToolCall {
  readonly env: Env;
  /** `ctx.props`, the grant's props as the library decrypted them. */
  readonly props: unknown;
  /** `ctx.auth.token`, the client's access token: only to find this grant to revoke. */
  readonly accessToken: string | null;
}

/** The props `/vuelta` wrote (vuelta.ts `GrantProps`), as far as the tools read them. */
const propsShape = z.object({
  accountId: z.string().min(1),
  agentId: z.string().min(1),
  token: z.string().min(1),
});

export const ERRORS = {
  noAi: 'This connection carries no Numinia AI. Connect again: remove the connector and add https://mcp.numinia.com/mcp again.',
  arguments: 'This tool takes no arguments: call it with {}.',
  unconfigured:
    'This server cannot reach numinia.com right now (it is not configured). Try again later.',
  down: 'numinia.com did not answer. Try again in a minute.',
  busy: 'Too many requests for this AI right now (numinia.com allows 60 a minute). Wait a minute, then try again.',
  odd: 'numinia.com answered something this server does not understand. Try again later.',
  revoked:
    'This connection has ended: your token was revoked or renewed on numinia.com (Panel › Agents). Your app has to connect again — the person who connected you signs in and allows it once more.',
} as const;

const failure = (text: string): ToolResult => ({
  content: [{ type: 'text', text }],
  isError: true,
});

const success = (structured: Record<string, unknown>): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(structured) }],
  structuredContent: structured,
});

/** The AI's standing, in the panel's order: off, then no one answers, then roles, then its state. */
export function standingOf(me: Me): Standing {
  if (!me.enabled) return 'apagada';
  if (!me.eligible) return 'sin-responsable';
  if (!me.permissions.includes(ENTER_WORLDS)) return 'sin-permiso';
  return me.state;
}

function whoAmI(me: Me): ToolResult {
  const standing = standingOf(me);
  return success({
    id: `${me.org}.${me.id}`,
    agent: me.id,
    organization: me.org,
    name: me.name,
    enabled: me.enabled,
    state: me.state,
    standing,
    canEnter: standing === 'activa' || standing === 'dormida',
    permissions: me.permissions,
    // No `oir` on the relay yet, and the house's switch keeps it off for
    // AIs connected by URL until the lawyers validate it.
    hear: false,
    note: STANDING_TEXT[standing],
  });
}

function worlds(me: Me): ToolResult {
  const standing = standingOf(me);
  if (standing !== 'activa' && standing !== 'dormida') {
    return success({
      organization: me.org,
      worlds: [],
      reason: standing,
      note: STANDING_TEXT[standing],
    });
  }
  // `/me` lists only the worlds the fleet serves: those are on.
  const list = me.worlds.map((world) => ({
    id: world.id,
    ...(world.name === undefined ? {} : { name: world.name }),
    on: world.on ?? true,
    enter: { tool: ENTER_TOOL, arguments: { mundo: world.id } },
  }));
  if (list.length === 0) {
    return success({
      organization: me.org,
      worlds: [],
      reason: 'sin-mundos',
      note: 'Your organization has no world on right now.',
    });
  }
  return success({
    organization: me.org,
    worlds: list,
    note: `To enter one, call «${ENTER_TOOL}» with {"mundo": "<id>"}.`,
  });
}

/**
 * Revoke the grant this access token belongs to, with the library's own
 * API: its tokens go, and the client's next call is a `401`. Only this
 * grant — after a reconnection the same AI has a newer, good one. Best
 * effort: the token numinia.com refused is useless anyway.
 */
async function endGrant(
  helpers: OAuthHelpers | undefined,
  accessToken: string | null,
): Promise<void> {
  if (helpers === undefined || accessToken === null) return;
  try {
    const held = await helpers.unwrapToken(accessToken);
    if (held !== null) await helpers.revokeGrant(held.grantId, held.userId);
  } catch {
    // KV failed: the grant stays until its tokens expire, and numinia.com still says no.
  }
}

const hasArguments = (args: unknown): boolean =>
  args !== undefined &&
  args !== null &&
  !(typeof args === 'object' && !Array.isArray(args) && Object.keys(args).length === 0);

/** Whether the relay has a tool by this name. */
export const isTool = (name: string): boolean => name === WHO_AM_I || name === WORLDS;

/** `tools/call` of one of {@link TOOLS}; `name` is known ({@link isTool}). */
export async function callTool(name: string, args: unknown, call: ToolCall): Promise<ToolResult> {
  if (hasArguments(args)) return failure(ERRORS.arguments);
  const props = propsShape.safeParse(call.props);
  if (!props.success) return failure(ERRORS.noAi);
  const store = storeOrigin(call.env);
  if (store === null) return failure(ERRORS.unconfigured);

  const answer = await askMe(store, props.data, storeFetch(call.env));
  switch (answer.kind) {
    case 'ok':
      return name === WHO_AM_I ? whoAmI(answer.me) : worlds(answer.me);
    case 'revoked':
      await endGrant(call.env.OAUTH_PROVIDER, call.accessToken);
      return failure(ERRORS.revoked);
    case 'busy':
      return failure(ERRORS.busy);
    case 'down':
      return failure(ERRORS.down);
    default:
      return failure(ERRORS.odd);
  }
}
