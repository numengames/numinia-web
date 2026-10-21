/**
 * «MCP remoto», story W3: what the «Conecta tu IA» consent decides. An MCP
 * client (Claude, ChatGPT, Hermes, any other: Pablo opened it to every client,
 * 2026-10-19) asks to act in Numinia worlds; the signed-in person picks an
 * organization, which AI it is (a new one, or one already connected to
 * reconnect) and its role. This file works out what that means:
 *
 *   - a NEW AI: an organization AI made the token way (lib/agents-source.ts's
 *     «create by token»), connected `mcp:<the host the client returns to>`;
 *   - the SAME AI again: its token renewed (the old connection stops at once:
 *     reconnecting never duplicates) and the AI switched back on; where it
 *     lives stays as it was.
 *
 * A new AI also says which world it lives in (`worlds`, design §5, S23): every
 * world of the community or the chosen ones; unsaid, the till decides.
 *
 * The rules are not new ones. They are the panel's, read from the till's own
 * answer to the person (`agents`, apps/till/src/db/agents.ts):
 *   - creating needs `mayCreate`: manage-roles — as the person (owner or
 *     member) or, where the community lets the house in, as the house (D-078,
 *     which then answers for the AI) — below MAX_AGENTS (db/agents.ts
 *     `mayCreate`);
 *   - the role given at once must be one of `assignableRoles` — the till's
 *     `canAssignRole` clamp of a fresh AI below the person (ORG-011, accessOf;
 *     for the house, also its ceiling), what the panel's invitation offers
 *     (lib/panel-agentes.ts `invitable`);
 *   - reconnecting needs the row's `mayEdit` (manage-roles, and answering for
 *     it or standing above it: db/agents.ts `handling`) and a token AI; a role
 *     given then must be in the row's `assignable`.
 * The person's `access` is read only to NAME a refusal (lacking manage-roles,
 * versus the limit, versus not standing above the AI). The
 * till checks every write again; this decides what to ask it and what the
 * screen says when the answer would be no.
 *
 * Two of Pablo's decisions travel with every plan (DISENO-MCP-REMOTO.md §6,
 * the first as he changed it on 2026-10-20):
 *   - `hear`: whether the AI may use `oir` (nearby chat). It is a switch PER
 *     AI, off by default, that the person ticks (unticked) on the consent and
 *     that whoever may edit the AI flips later in the panel; it is stored on
 *     the AI's row (the till's `hears`) and the relay honours it;
 *   - the house pays the AI's body in the world for now: no balance is checked.
 *
 * The secret is drawn here (`newToken`) and handed back ONCE to the caller
 * (the relay keeps it sealed in the OAuth grant; the person never sees it).
 * Only its SHA-256 and first 8 characters reach the till, as in the panel.
 */

import { z } from 'zod';
import type { AgentWorlds } from '@numinia/domain';
import type { AccountDesk, AgentAuth, Asker, DeskAgents } from './accounts';
import { ask, whoIs, type Log } from './accounts-source';
import { MAX_AGENTS, isConnectedVia, newToken, readAgentName, type FreshToken } from './agents';
import { logEvent } from './telemetry';
import { agentIdFrom } from './world-door';

/** The MCP client asking: its own name for itself and the host it returns to. */
export interface ConnectClient {
  /** As the client registered it («Claude»). Untrusted: shown, never obeyed. */
  readonly name: string;
  /** The host of its redirect URI (`claude.ai`, `localhost`), without scheme or port. */
  readonly redirectHost: string;
}

/** Which AI the person says it is: a new one, or one already made to reconnect. */
export type WhichAi =
  | { readonly kind: 'new'; readonly name: string }
  | { readonly kind: 'again'; readonly accountId: string; readonly agentId: string };

export interface ConnectRequest {
  /** The organization picked. */
  readonly accountId: string;
  readonly client: ConnectClient;
  readonly ai: WhichAi;
  /**
   * The role picked, or null for none beyond the base role (the panel's
   * «Mirar y hablar»). On a reconnection null keeps the roles it holds.
   */
  readonly roleId: string | null;
  /** Whether the person lets the AI hear nearby chat (the consent's checkbox); off when absent. */
  readonly hear?: boolean;
  /**
   * Connect as the house (D-078) rather than as the person: only an Oracle's
   * session may, and only where the community lets the house in (the till
   * says). Off when absent: the person acts as themselves.
   */
  readonly house?: boolean;
  /**
   * Where a NEW AI lives (design §5): all the community's worlds, or the chosen ones
   * (each placed there, which the till judges). Absent: the till's own default — the
   * one placed world when the community has just one, else all. A reconnection keeps
   * the worlds the AI already has: this is not read for it.
   */
  readonly worlds?: AgentWorlds;
}

/** An AI of the organization as the decision reads it (the till's row to this person). */
export interface ViewAgent {
  readonly id: string;
  readonly name: string;
  readonly auth: AgentAuth;
  readonly enabled: boolean;
  /** Whether it hears nearby chat now. */
  readonly hears: boolean;
  readonly roleIds: readonly string[];
  readonly assignable: readonly string[];
  readonly mayEdit: boolean;
}

/** What the decision reads: the till's `agents` answer to the person, and their permissions there. */
export interface ConnectView {
  readonly accountId: string;
  readonly as: DeskAgents['as'];
  readonly mayCreate: boolean;
  readonly assignableRoles: readonly { readonly id: string }[];
  readonly agents: readonly ViewAgent[];
  /** The person's permissions in the organization (the till's `access`): only to name a refusal. */
  readonly permissions: readonly string[];
}

/** Why the consent cannot go ahead, one plain reason the screen words. */
export type ConnectRefusal =
  /** No readable name for the app, or a return host that is not a host name. */
  | 'client'
  /** The new AI's name is empty, too long or holds a control character. */
  | 'name'
  /** The person lacks manage-roles there. */
  | 'no-permission'
  /** The organization already keeps MAX_AGENTS AIs. */
  | 'limit'
  /** A role the person cannot give. */
  | 'role'
  /** The organization already has an AI by that name (its id): reconnect it instead. */
  | 'taken'
  /** The AI named to reconnect is another organization's. */
  | 'other-organization'
  /** The organization has no such AI. */
  | 'no-such-agent'
  /** That AI connects with its own key: it has no token to renew. */
  | 'not-token'
  /** The person does not answer for that AI and does not stand above it. */
  | 'not-below';

interface PlanCommon {
  readonly ok: true;
  readonly accountId: string;
  readonly agentId: string;
  readonly name: string;
  /** How it is connected, for the row and the log: `mcp:` and the client's return host. */
  readonly via: string;
  /** The app's name as the consent shows it. */
  readonly app: string;
  /** It returns to this computer (localhost): the consent warns apart (MCP authorization). */
  readonly loopback: boolean;
  /** Whether it may hear nearby chat (`oir`): what the person ticked, off by default. */
  readonly hear: boolean;
}

export type ConnectPlan =
  | (PlanCommon & {
      readonly action: 'create';
      readonly roleIds: readonly string[];
      readonly worlds: AgentWorlds | undefined;
    })
  | (PlanCommon & {
      readonly action: 'renew';
      /** It was off (revoked, or switched off): switch it on after the renewal. */
      readonly switchOn: boolean;
      /** The role to give it after the renewal, or null when nothing changes. */
      readonly giveRole: string | null;
      /** The new hearing setting when the consent differs from the row's, or null when it stays. */
      readonly setHear: boolean | null;
    })
  | { readonly ok: false; readonly refusal: ConnectRefusal };

const refuse = (refusal: ConnectRefusal): ConnectPlan => ({ ok: false, refusal });

const APP_NAME_MAX = 40;

/** Whether a return host is this computer: a local client the consent warns about. */
export const isLoopback = (host: string): boolean =>
  host === 'localhost' || host.endsWith('.localhost') || /^127(?:\.\d{1,3}){3}$/.test(host);

/**
 * The client's name and its `via`, or null when either cannot be read. The
 * consent page (lib/conectar-ia-page.ts) reads its query with it too, so the
 * screen shows exactly the name and host the decision will use.
 */
export function readClient(
  client: ConnectClient,
): { readonly app: string; readonly host: string; readonly via: string } | null {
  // A registered name is free text of any length: the consent shows its first 40 characters.
  const app = readAgentName([...client.name.trim()].slice(0, APP_NAME_MAX).join(''));
  const host = client.redirectHost.trim().toLowerCase().replace(/\.$/, '');
  const via = `mcp:${host}`;
  return app === undefined || !isConnectedVia(via) ? null : { app, host, via };
}

const holds = (view: ConnectView, act: string): boolean => view.permissions.includes(act);

/** Why the till's `mayCreate` is false, in its own order: manage-roles, the limit. */
function whyNotCreate(view: ConnectView): ConnectRefusal {
  return holds(view, 'manage-roles') ? 'limit' : 'no-permission';
}

/** The AIs this person may reconnect: token AIs they may handle, as the panel's renew button. */
export const reconnectable = (view: Pick<ConnectView, 'agents'>): ViewAgent[] =>
  view.agents.filter((agent) => agent.auth === 'token' && agent.mayEdit);

/**
 * The decision, pure: create a new AI or renew one, with which roles — or why
 * not. `view` is the till's answer for the organization `request.accountId`.
 */
export function decideConnection(view: ConnectView, request: ConnectRequest): ConnectPlan {
  const client = readClient(request.client);
  if (client === null) return refuse('client');
  const common = {
    ok: true as const,
    accountId: view.accountId,
    via: client.via,
    app: client.app,
    loopback: isLoopback(client.host),
    hear: request.hear === true,
  };
  const { ai, roleId } = request;

  if (ai.kind === 'new') {
    if (!view.mayCreate || view.agents.length >= MAX_AGENTS) return refuse(whyNotCreate(view));
    const name = readAgentName(ai.name);
    if (name === undefined) return refuse('name');
    // The id comes from the name, as the panel's invitation makes it.
    const agentId = agentIdFrom(name);
    if (view.agents.some((agent) => agent.id === agentId)) return refuse('taken');
    if (roleId !== null && !view.assignableRoles.some((role) => role.id === roleId)) {
      return refuse('role');
    }
    return {
      ...common,
      action: 'create',
      agentId,
      name,
      roleIds: roleId === null ? [] : [roleId],
      worlds: request.worlds,
    };
  }

  if (ai.accountId !== view.accountId) return refuse('other-organization');
  const agent = view.agents.find((held) => held.id === ai.agentId);
  if (agent === undefined) return refuse('no-such-agent');
  if (!agent.mayEdit) return refuse(holds(view, 'manage-roles') ? 'not-below' : 'no-permission');
  if (agent.auth !== 'token') return refuse('not-token');
  const give = roleId === null || agent.roleIds.includes(roleId) ? null : roleId;
  if (give !== null && !agent.assignable.includes(give)) return refuse('role');
  return {
    ...common,
    action: 'renew',
    agentId: agent.id,
    name: agent.name,
    switchOn: !agent.enabled,
    giveRole: give,
    setHear: agent.hears === common.hear ? null : common.hear,
  };
}

// ---- Asking the till --------------------------------------------------------

let built: ReturnType<typeof buildShapes> | null = null;

function buildShapes() {
  const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
  const agents = z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      as: z.enum(['owner', 'house', 'member']),
      mayCreate: z.boolean(),
      assignableRoles: z.array(z.object({ id: z.string() })),
      agents: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          auth: z.enum(['key', 'token']),
          enabled: z.boolean(),
          // A till that has not run migration 0023 yet says nothing: it hears nothing.
          hears: z.boolean().default(false),
          roleIds: z.array(z.string()),
          assignable: z.array(z.string()),
          mayEdit: z.boolean(),
        }),
      ),
    }),
    refusal,
  ]);
  const access = z.union([
    z.object({ ok: z.literal(true), permissions: z.array(z.string()) }),
    refusal,
  ]);
  return { agents, access };
}

const shapes = (): ReturnType<typeof buildShapes> => (built ??= buildShapes());

/** The organization's AIs after the connection, as the till answered the last write. */
export type ConnectedAgents = Omit<ConnectView, 'permissions'>;

export type ConnectOutcome =
  | {
      readonly ok: true;
      readonly action: 'create' | 'renew';
      readonly accountId: string;
      readonly agentId: string;
      readonly name: string;
      readonly via: string;
      readonly hear: boolean;
      /** The secret, `ntk_…`: for the relay to seal in the grant. Never logged, stored or shown. */
      readonly token: string;
      readonly agents: ConnectedAgents;
    }
  | { readonly ok: false; readonly refusal: ConnectRefusal }
  /** The till said no (not a member, the organization changed meanwhile…), in its words. */
  | { readonly ok: false; readonly refusal: 'till'; readonly problems: readonly string[] }
  | { readonly ok: false; readonly refusal: 'signed-out' | 'unavailable' | 'failed' };

type Failed = Extract<ConnectOutcome, { ok: false }>;

/** A failed `ask` as an outcome: no till bound (503), or one that failed. */
const failedAsk = (response: Response): Failed => ({
  ok: false,
  refusal: response.status === 503 ? 'unavailable' : 'failed',
});

/** One write of the connection, answered with the organization's AIs, or the failure. */
async function write(
  log: Log,
  action: string,
  call: () => Promise<unknown>,
): Promise<{ readonly ok: true; readonly value: ConnectedAgents } | Failed> {
  const asked = await ask(log, action, call, shapes().agents);
  if (!asked.ok) return failedAsk(asked.response);
  if ('problems' in asked.value) {
    return { ok: false, refusal: 'till', problems: asked.value.problems };
  }
  return { ok: true, value: asked.value };
}

/**
 * Connects the AI: reads what the till says this person may do in the
 * organization, decides (`decideConnection`), draws a token and asks the till
 * to create the AI or renew its token, then switches it on and gives the
 * role. A renewal comes first so that the old connection is dead before
 * anything wakes the AI or widens it. Only the session decides who asks
 * (`asker`, from our signed cookie).
 */
export async function connectAi(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: ConnectRequest,
  log: Log = logEvent,
  draw: () => Promise<FreshToken> = newToken,
): Promise<ConnectOutcome> {
  if (asker === null) return { ok: false, refusal: 'signed-out' };
  if (desk === null) return { ok: false, refusal: 'unavailable' };
  const { you } = whoIs(asker);
  // As the person (owner or member) unless the consent chose the house (D-078): then
  // the session must be the house's — an Oracle's — or nothing is asked of the till.
  const house = request.house === true;
  if (house && !asker.house) return { ok: false, refusal: 'no-permission' };
  const { accountId } = request;
  const [agents, access] = await Promise.all([
    ask(log, 'connect-agents', () => desk.agents(you, accountId, house), shapes().agents),
    ask(log, 'connect-access', () => desk.access(you, accountId, house), shapes().access),
  ]);
  if (!agents.ok) return failedAsk(agents.response);
  if (!access.ok) return failedAsk(access.response);
  if ('problems' in agents.value) {
    return { ok: false, refusal: 'till', problems: agents.value.problems };
  }
  if ('problems' in access.value) {
    return { ok: false, refusal: 'till', problems: access.value.problems };
  }

  const plan = decideConnection(
    { ...agents.value, permissions: access.value.permissions },
    request,
  );
  if (!plan.ok) return plan;

  const fresh = await draw();
  let last: ConnectedAgents;
  if (plan.action === 'create') {
    const made = await write(log, 'connect-create', () =>
      desk.createAgent(
        you,
        accountId,
        {
          id: plan.agentId,
          name: plan.name,
          auth: 'token',
          tokenHash: fresh.hash,
          tokenPrefix: fresh.prefix,
          roleIds: [...plan.roleIds],
          via: plan.via,
          hears: plan.hear,
          ...(plan.worlds === undefined ? {} : { worlds: plan.worlds }),
        },
        house,
      ),
    );
    if (!made.ok) return made;
    last = made.value;
  } else {
    const renewed = await write(log, 'connect-renew', () =>
      desk.renewAgentToken(you, accountId, plan.agentId, fresh.hash, fresh.prefix, house, plan.via),
    );
    if (!renewed.ok) return renewed;
    last = renewed.value;
    if (plan.switchOn) {
      const on = await write(log, 'connect-switch-on', () =>
        desk.changeAgent(you, accountId, plan.agentId, { enabled: true }, house),
      );
      if (!on.ok) return on;
      last = on.value;
    }
    if (plan.setHear !== null) {
      const hears = plan.setHear;
      const heard = await write(log, 'connect-hear', () =>
        desk.changeAgent(you, accountId, plan.agentId, { hears }, house),
      );
      if (!heard.ok) return heard;
      last = heard.value;
    }
    if (plan.giveRole !== null) {
      const role = plan.giveRole;
      const given = await write(log, 'connect-give-role', () =>
        desk.giveAgentRole(you, accountId, plan.agentId, role, house),
      );
      if (!given.ok) return given;
      last = given.value;
    }
  }
  return {
    ok: true,
    action: plan.action,
    accountId,
    agentId: plan.agentId,
    name: plan.name,
    via: plan.via,
    hear: plan.hear,
    token: fresh.token,
    agents: last,
  };
}
