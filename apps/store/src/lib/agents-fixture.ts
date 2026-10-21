/**
 * «IAs de organización» in the fixture desk (DATA_SOURCE=fixture): a small,
 * documented fake of the till's agent methods (apps/till/src/db/agents.ts),
 * for CI, the acceptance run and screenshots. Never reached in a real build.
 *
 * It is kept apart from accounts-fixture.ts, which hands it what it knows of
 * an organization (`AgentsHost`): the entry of a wallet, the state of the
 * organization, who answers for an agent, the log. The agents are shared by
 * every wallet's copy of the seed, like the till's `team_agents` — an AI
 * created by one wallet is found by the pass route, which has no wallet. The
 * rules are the domain's (ORG-011) and the words the till's.
 */

import {
  ORGANIZATION_PERMISSIONS,
  accessOf,
  canAssignRole,
  DEFAULT_AGENT_PRESENCE,
  type ActorAccess,
  type AgentPresence,
  type AgentWorlds,
  applyAgentPresenceChange,
  parseAgentPresenceChange,
  parseAgentWorlds,
  type OrganizationAccess,
  type OrganizationRefusal,
  type OrganizationRole,
  type OrganizationState,
} from '@numinia/domain';
import type {
  AccountDesk,
  AgentAuth,
  AgentState,
  AgentStatus,
  DeskAgent,
  DeskAgentChange,
  DeskKeyDraft,
  DeskTokenDraft,
  DeskAgentPassAnswer,
  DeskAgentWorldsAnswer,
  DeskAgentsAnswer,
  DeskClaimAnswer,
  DeskLogAct,
  DeskRefusal,
} from './accounts';
import {
  AGENT_PROBLEMS,
  AGENT_STATES,
  HOUSE_NEVER_GIVES,
  MAX_AGENTS,
  PRESENCE_PROBLEMS,
  isAccountId,
  isAgentId,
  isAudience,
  isConnectedVia,
  isTokenHash,
  isTokenPrefix,
  presenceDiff,
  publicKeyBytes,
  readAgentName,
} from './agents';

/** How many agents an organization keeps (the till's `MAX_AGENTS`, kept in lib/agents.ts). */
export { MAX_AGENTS };
/** How long a pass request's nonce is kept, in seconds (the till's `NONCE_KEPT_SECONDS`). */
const NONCE_KEPT_SECONDS = 120;
const ROLES_PER_AGENT_MAX = 10;
const ROLE_ID = /^role_[0-9a-f]{16}$/;
const NO_SUCH_ROLE = 'the organization has no such role';
const ROLE_ID_PROBLEM = 'roleId must be a role id';

/** An organization as an entry of the fixture desk sees it. */
export interface HostEntry {
  readonly accountId: string;
  readonly who: string;
  readonly as: 'owner' | 'house' | 'member';
  readonly state: OrganizationState;
  /** What `who` holds there. */
  readonly access: ActorAccess;
}

/** What the fixture desk tells the agents about an organization. */
export interface AgentsHost {
  /** The organization a wallet — or the house — enters, or why not. */
  enter(wallet: unknown, accountId: unknown, house: unknown): HostEntry | DeskRefusal;
  /** The organization's state and what `wallet` holds there (null: not a member), or null when no such organization. */
  responsible(
    accountId: string,
    wallet: string,
  ): { readonly state: OrganizationState; readonly access: ActorAccess | null } | null;
  record(
    entry: HostEntry,
    act: DeskLogAct,
    subject: string | null,
    detail: Record<string, string> | null,
  ): void;
  houseRead(entry: HostEntry, what: string): void;
  /** The name a wallet published, if any. */
  published(wallet: string): string | undefined;
  /** The worlds placed in an organization, by id. */
  placedIn(accountId: string): readonly string[];
  refusalOf(
    refusal: OrganizationRefusal,
    act: OrganizationAccess,
    state: OrganizationState,
  ): DeskRefusal;
}

interface FixtureAgent {
  readonly id: string;
  readonly name: string;
  readonly auth: AgentAuth;
  readonly publicKey?: string;
  tokenHash?: string;
  tokenPrefix?: string;
  tokenCreatedAt?: string;
  /** How it was connected: `panel` or `mcp:<client host>` (the till's `connected_via`). */
  via: string;
  readonly responsible: string;
  /** The house answers for it (D-078): `responsible` is an Oracle's wallet, no member. */
  readonly responsibleHouse: boolean;
  enabled: boolean;
  state: AgentState;
  hears: boolean;
  /** How it is present in a world (the till's `presence_json`), `oye` agreeing with `hears`. */
  presence: AgentPresence;
  /** Where it lives (the till's `worlds_mode` and `team_agent_worlds`). */
  worlds: AgentWorlds;
  readonly createdAt: string;
  updatedAt: string;
  roleIds: string[];
}

type AgentMethods = Pick<
  AccountDesk,
  | 'agents'
  | 'createAgent'
  | 'changeAgent'
  | 'changeAgentPresence'
  | 'setAgentWorlds'
  | 'removeAgent'
  | 'renewAgentToken'
  | 'revokeAgentToken'
  | 'giveAgentRole'
  | 'takeAgentRole'
  | 'agentPass'
  | 'claimAgentPass'
  | 'agentWorlds'
  | 'agentByToken'
>;

const refuse = (...problems: string[]): DeskRefusal => ({ ok: false, problems });

/** The presence of a fixture AI: the default one, hearing everything nearby only if its switch is on. */
const presenceOf = (agent: FixtureAgent): AgentPresence => agent.presence;

/** The last rung of what it hears is the `hears` switch's (the till's `hearingOf`): set, `todo`; not set, never `todo`. */
const hearingOf = (hears: boolean, stored: AgentPresence['oye']): AgentPresence['oye'] =>
  hears ? 'todo' : stored === 'todo' ? 'llamada' : stored;

/** The worlds of an organization an AI lives in: all of them, or the chosen ones still placed there. */
const livesIn = (worlds: AgentWorlds, placed: readonly string[]): string[] =>
  ('todos' in worlds ? [...placed] : placed.filter((id) => worlds.mundos.includes(id))).sort();

export function createAgentsFixture(host: AgentsHost, now: () => Date): AgentMethods {
  const byOrg = new Map<string, FixtureAgent[]>();
  const nonces = new Map<string, number>();
  const agentsOf = (accountId: string): FixtureAgent[] => byOrg.get(accountId) ?? [];

  const topDown = (roles: readonly OrganizationRole[]): OrganizationRole[] =>
    [...roles].sort((a, b) => b.position - a.position);

  /** What an agent holds: its roles, trimmed by the person who answers for it (ORG-011). */
  const accessOfAgent = (
    state: OrganizationState,
    agent: FixtureAgent,
    responsible: ActorAccess | null,
  ): ActorAccess =>
    accessOf(
      state,
      {
        kind: 'member',
        member: {
          personId: `agent:${agent.id}`,
          kind: 'agent',
          isOwner: false,
          roleIds: agent.roleIds,
        },
      },
      responsible ?? undefined,
    );

  const answered = (access: ActorAccess | null): boolean =>
    access !== null && access.permissions.has('manage-roles');

  /** The access of whoever answers for the agent: a member's, or the house's (D-078). */
  const responsibleAccess = (accountId: string, agent: FixtureAgent): ActorAccess | null => {
    const org = host.responsible(accountId, agent.responsible);
    if (org === null || !agent.responsibleHouse) return org?.access ?? null;
    return accessOf(org.state, { kind: 'house', personId: agent.responsible });
  };

  const accessOfResponsible = (entry: HostEntry, agent: FixtureAgent) =>
    responsibleAccess(entry.accountId, agent);

  /** Whether `entry` may give `role` to `target`: ORG-003 and, for the house, its ceiling. */
  const mayGive = (entry: HostEntry, target: ActorAccess, role: OrganizationRole): boolean =>
    canAssignRole(entry.access, target, role).ok &&
    (entry.as !== 'house' || !role.permissions.some((key) => HOUSE_NEVER_GIVES.includes(key)));

  const statusOf = (entry: HostEntry, agent: FixtureAgent): AgentStatus => {
    if (!agent.enabled) return 'apagada';
    const responsible = accessOfResponsible(entry, agent);
    if (!answered(responsible)) return 'sin-responsable';
    if (!accessOfAgent(entry.state, agent, responsible).permissions.has('enter-worlds')) {
      return 'sin-permiso';
    }
    return agent.state;
  };

  /** Null when the one acting may handle the agent: manage-roles, and answering for it or standing above it. */
  const handling = (entry: HostEntry, agent: FixtureAgent): DeskRefusal | null => {
    if (!entry.access.permissions.has('manage-roles')) {
      return host.refusalOf('missing-permission', 'manage-roles', entry.state);
    }
    if (!agent.responsibleHouse && entry.who === agent.responsible) return null;
    const target = accessOfAgent(entry.state, agent, accessOfResponsible(entry, agent));
    return target.height >= entry.access.height
      ? host.refusalOf('not-below', 'manage-roles', entry.state)
      : null;
  };

  const newAgentAccess = (entry: HostEntry, roleIds: readonly string[]): ActorAccess =>
    accessOf(
      entry.state,
      {
        kind: 'member',
        member: { personId: 'agent:new', kind: 'agent', isOwner: false, roleIds },
      },
      entry.access,
    );

  const view = (entry: HostEntry): DeskAgentsAnswer => {
    const held = agentsOf(entry.accountId);
    const fresh = newAgentAccess(entry, []);
    return {
      ok: true,
      accountId: entry.accountId,
      as: entry.as,
      mayCreate: entry.access.permissions.has('manage-roles') && held.length < MAX_AGENTS,
      assignableRoles: topDown(entry.state.roles)
        .filter((role) => mayGive(entry, fresh, role))
        .map(({ id, name, color, position }) => ({ id, name, color, position })),
      agents: held.map((agent): DeskAgent => {
        const target = accessOfAgent(entry.state, agent, accessOfResponsible(entry, agent));
        const responsibleName = host.published(agent.responsible);
        return {
          id: agent.id,
          name: agent.name,
          auth: agent.auth,
          ...(agent.publicKey === undefined ? {} : { publicKey: agent.publicKey }),
          ...(agent.tokenPrefix === undefined
            ? {}
            : {
                tokenPrefix: agent.tokenPrefix,
                tokenCreatedAt: agent.tokenCreatedAt as string,
              }),
          via: agent.via,
          enabled: agent.enabled,
          state: agent.state,
          hears: agent.hears,
          presence: agent.presence,
          worlds: agent.worlds,
          status: statusOf(entry, agent),
          responsible: agent.responsible,
          ...(agent.responsibleHouse ? { responsibleHouse: true as const } : {}),
          ...(responsibleName === undefined ? {} : { responsibleName }),
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          roleIds: [...agent.roleIds],
          assignable: entry.state.roles
            .filter(
              (role) =>
                canAssignRole(entry.access, target, role).ok &&
                (mayGive(entry, target, role) || agent.roleIds.includes(role.id)),
            )
            .map((role) => role.id),
          mayEdit: handling(entry, agent) === null,
        };
      }),
    };
  };

  /** The entry, and the agent `agentId` of it, or the refusal. */
  const withAgent = (
    wallet: unknown,
    accountId: unknown,
    agentId: unknown,
    house: unknown,
  ): { readonly entry: HostEntry; readonly agent: FixtureAgent } | DeskRefusal => {
    const entry = host.enter(wallet, accountId, house);
    if ('ok' in entry) return entry;
    if (!isAgentId(agentId)) return refuse(AGENT_PROBLEMS.agentId);
    const agent = agentsOf(entry.accountId).find((held) => held.id === agentId);
    return agent === undefined ? refuse(AGENT_PROBLEMS.noSuchAgent) : { entry, agent };
  };

  const stamp = (): string => now().toISOString();

  const methods: AgentMethods = {
    agents: async (wallet, accountId, house): Promise<DeskAgentsAnswer> => {
      const entry = host.enter(wallet, accountId, house);
      if ('ok' in entry) return entry;
      host.houseRead(entry, 'agents');
      return view(entry);
    },

    createAgent: async (wallet, accountId, sent, house): Promise<DeskAgentsAnswer> => {
      const draft = sent as Partial<DeskKeyDraft & DeskTokenDraft> | null;
      const readWorlds = draft?.worlds === undefined ? undefined : parseAgentWorlds(draft.worlds);
      const viaToken = draft?.auth === 'token';
      const entry = host.enter(wallet, accountId, house);
      if ('ok' in entry) return entry;
      const roleIds = draft?.roleIds ?? [];
      const via = draft?.via ?? 'panel';
      const problems = [
        ...(isAgentId(draft?.id) ? [] : [AGENT_PROBLEMS.agentId]),
        ...(readAgentName(draft?.name) === undefined ? [AGENT_PROBLEMS.name] : []),
        ...(viaToken && (draft?.publicKey !== undefined || draft?.tokenHash === undefined)
          ? [AGENT_PROBLEMS.draft]
          : []),
        ...(!viaToken && draft?.tokenHash !== undefined ? [AGENT_PROBLEMS.draft] : []),
        ...(viaToken || publicKeyBytes(draft?.publicKey) !== null
          ? []
          : [AGENT_PROBLEMS.publicKey]),
        ...(!viaToken || isTokenHash(draft?.tokenHash) ? [] : [AGENT_PROBLEMS.tokenHash]),
        ...(!viaToken || isTokenPrefix(draft?.tokenPrefix) ? [] : [AGENT_PROBLEMS.tokenPrefix]),
        ...(Array.isArray(roleIds) &&
        roleIds.length <= ROLES_PER_AGENT_MAX &&
        roleIds.every((id) => ROLE_ID.test(id))
          ? []
          : [AGENT_PROBLEMS.roleIds]),
        ...(isConnectedVia(via) ? [] : [AGENT_PROBLEMS.via]),
        ...(draft?.hears === undefined || typeof draft.hears === 'boolean'
          ? []
          : [AGENT_PROBLEMS.hears]),
        ...(readWorlds === undefined || readWorlds.ok
          ? []
          : readWorlds.problems.map((line) => `worlds: ${line}`)),
      ];
      if (problems.length > 0) return refuse(...problems);
      const { id, publicKey, tokenHash, tokenPrefix } = draft as DeskKeyDraft & DeskTokenDraft;
      const name = readAgentName(draft?.name) as string;
      if (!entry.access.permissions.has('manage-roles')) {
        return host.refusalOf('missing-permission', 'manage-roles', entry.state);
      }
      const held = agentsOf(entry.accountId);
      if (held.length >= MAX_AGENTS) return refuse(AGENT_PROBLEMS.limit);
      if (
        held.some(
          (other) =>
            other.id === id ||
            (!viaToken && other.publicKey === publicKey) ||
            (viaToken && other.tokenHash === tokenHash),
        )
      ) {
        return refuse(AGENT_PROBLEMS.taken);
      }
      const unique = [...new Set(roleIds)];
      const fresh = newAgentAccess(entry, []);
      for (const roleId of unique) {
        const role = entry.state.roles.find((candidate) => candidate.id === roleId);
        if (role === undefined) return refuse(NO_SUCH_ROLE);
        const allowed = canAssignRole(entry.access, fresh, role);
        if (!allowed.ok) return host.refusalOf(allowed.refusal, 'manage-roles', entry.state);
        if (!mayGive(entry, fresh, role)) return refuse(AGENT_PROBLEMS.houseCeiling);
      }
      // Where it lives: what the draft says; else the one world of a community that has just one
      // (design §5); else every world. Each chosen world must be placed in the community.
      const placed = host.placedIn(entry.accountId);
      const lives: AgentWorlds =
        readWorlds?.ok === true
          ? 'todos' in readWorlds.value
            ? readWorlds.value
            : { mundos: [...readWorlds.value.mundos].sort() }
          : placed.length === 1
            ? { mundos: [...placed] }
            : { todos: true };
      if ('mundos' in lives && lives.mundos.some((worldId) => !placed.includes(worldId))) {
        return refuse(PRESENCE_PROBLEMS.worldsNotHere);
      }
      const at = stamp();
      byOrg.set(entry.accountId, [
        ...held,
        {
          id,
          name,
          auth: viaToken ? 'token' : 'key',
          ...(viaToken ? { tokenHash, tokenPrefix, tokenCreatedAt: at } : { publicKey }),
          via,
          responsible: entry.who,
          responsibleHouse: entry.as === 'house',
          enabled: true,
          state: 'activa',
          hears: draft?.hears === true,
          presence: {
            ...DEFAULT_AGENT_PRESENCE,
            oye: hearingOf(draft?.hears === true, DEFAULT_AGENT_PRESENCE.oye),
          },
          worlds: lives,
          createdAt: at,
          updatedAt: at,
          roleIds: unique,
        },
      ]);
      host.record(entry, 'agent-created', id, {
        name,
        ...(unique.length > 0 ? { roles: unique.join(',') } : {}),
        via,
      });
      // Only the prefix is ever written: never the token, never its hash.
      if (viaToken) {
        host.record(entry, 'agent-token-created', id, { name, prefix: tokenPrefix, via });
      }
      return view(entry);
    },

    changeAgent: async (wallet, accountId, agentId, sent, house): Promise<DeskAgentsAnswer> => {
      const change = sent as DeskAgentChange | null;
      const keys = typeof change === 'object' && change !== null ? Object.keys(change) : [];
      const enabledSent = change?.enabled;
      const stateSent = change?.state;
      const hearsSent = change?.hears;
      const problems = [
        ...(keys.length === 0 ||
        keys.some((key) => key !== 'enabled' && key !== 'state' && key !== 'hears')
          ? [AGENT_PROBLEMS.change]
          : []),
        ...(enabledSent !== undefined && typeof enabledSent !== 'boolean'
          ? [AGENT_PROBLEMS.enabled]
          : []),
        ...(stateSent !== undefined && !AGENT_STATES.includes(stateSent)
          ? [AGENT_PROBLEMS.state]
          : []),
        ...(hearsSent !== undefined && typeof hearsSent !== 'boolean'
          ? [AGENT_PROBLEMS.hears]
          : []),
      ];
      const found = withAgent(wallet, accountId, agentId, house);
      if ('ok' in found) return found;
      if (problems.length > 0) return refuse(...problems);
      const { entry, agent } = found;
      const refused = handling(entry, agent);
      if (refused !== null) return refused;
      const enabled = enabledSent ?? agent.enabled;
      const state = stateSent ?? agent.state;
      const switched = enabled !== agent.enabled;
      const moved = state !== agent.state;
      const hears = hearsSent ?? agent.hears;
      const listened = hears !== agent.hears;
      if (switched) {
        host.record(entry, enabled ? 'agent-enabled' : 'agent-disabled', agent.id, {
          name: agent.name,
        });
      }
      if (moved) {
        host.record(entry, 'agent-state', agent.id, {
          name: agent.name,
          from: agent.state,
          to: state,
        });
      }
      if (listened) {
        host.record(entry, 'agent-state', agent.id, {
          name: agent.name,
          hears: hears ? 'on' : 'off',
        });
      }
      if (switched || moved || listened) {
        agent.enabled = enabled;
        agent.state = state;
        agent.hears = hears;
        agent.presence = { ...agent.presence, oye: hearingOf(hears, agent.presence.oye) };
        agent.updatedAt = stamp();
      }
      return view(entry);
    },

    changeAgentPresence: async (
      wallet,
      accountId,
      agentId,
      sent,
      house,
    ): Promise<DeskAgentsAnswer> => {
      const read = parseAgentPresenceChange(sent);
      const found = withAgent(wallet, accountId, agentId, house);
      if ('ok' in found) return found;
      if (!read.ok) return refuse(...read.problems.map((line) => `presence: ${line}`));
      const { entry, agent } = found;
      const refused = handling(entry, agent);
      if (refused !== null) return refused;
      const next = applyAgentPresenceChange(agent.presence, read.value);
      const diff = presenceDiff(agent.presence, next);
      if (diff.length === 0) return view(entry);
      host.record(entry, 'agent-state', agent.id, { name: agent.name, presence: diff.join(';') });
      // The last rung of what it hears is the `hears` switch's, and the two move together.
      const hears = next.oye === 'todo';
      if (hears !== agent.hears) {
        host.record(entry, 'agent-state', agent.id, {
          name: agent.name,
          hears: hears ? 'on' : 'off',
        });
      }
      agent.presence = next;
      agent.hears = hears;
      agent.updatedAt = stamp();
      return view(entry);
    },

    setAgentWorlds: async (wallet, accountId, agentId, sent, house): Promise<DeskAgentsAnswer> => {
      const read = parseAgentWorlds(sent);
      const found = withAgent(wallet, accountId, agentId, house);
      if ('ok' in found) return found;
      if (!read.ok) return refuse(...read.problems.map((line) => `worlds: ${line}`));
      const { entry, agent } = found;
      const refused = handling(entry, agent);
      if (refused !== null) return refused;
      const placed = host.placedIn(entry.accountId);
      const next: AgentWorlds =
        'todos' in read.value ? read.value : { mundos: [...read.value.mundos].sort() };
      if ('mundos' in next && next.mundos.some((worldId) => !placed.includes(worldId))) {
        return refuse(PRESENCE_PROBLEMS.worldsNotHere);
      }
      const text = (worlds: AgentWorlds): string =>
        'todos' in worlds ? 'todos' : worlds.mundos.join(',');
      if (text(next) !== text(agent.worlds)) {
        host.record(entry, 'agent-state', agent.id, { name: agent.name, worlds: text(next) });
        agent.worlds = next;
        agent.updatedAt = stamp();
      }
      return view(entry);
    },

    removeAgent: async (wallet, accountId, agentId, house): Promise<DeskAgentsAnswer> => {
      const found = withAgent(wallet, accountId, agentId, house);
      if ('ok' in found) return found;
      const { entry, agent } = found;
      const refused = handling(entry, agent);
      if (refused !== null) return refused;
      byOrg.set(
        entry.accountId,
        agentsOf(entry.accountId).filter((held) => held !== agent),
      );
      host.record(entry, 'agent-removed', agent.id, { name: agent.name });
      return view(entry);
    },

    renewAgentToken: async (wallet, accountId, agentId, hash, prefix, house, sentVia) => {
      const via = sentVia ?? 'panel';
      const problems = [
        ...(isTokenHash(hash) ? [] : [AGENT_PROBLEMS.tokenHash]),
        ...(isTokenPrefix(prefix) ? [] : [AGENT_PROBLEMS.tokenPrefix]),
        ...(isConnectedVia(via) ? [] : [AGENT_PROBLEMS.via]),
      ];
      const found = withAgent(wallet, accountId, agentId, house);
      if ('ok' in found) return found;
      if (problems.length > 0) return refuse(...problems);
      const { entry, agent } = found;
      const refused = handling(entry, agent);
      if (refused !== null) return refused;
      if (agent.auth !== 'token') return refuse(AGENT_PROBLEMS.notToken);
      if (agent.tokenHash === hash) return refuse(AGENT_PROBLEMS.taken);
      agent.tokenHash = hash;
      agent.tokenPrefix = prefix;
      agent.tokenCreatedAt = stamp();
      agent.updatedAt = agent.tokenCreatedAt;
      agent.via = via;
      host.record(entry, 'agent-token-renewed', agent.id, { name: agent.name, prefix, via });
      return view(entry);
    },

    revokeAgentToken: async (wallet, accountId, agentId, house) => {
      const found = withAgent(wallet, accountId, agentId, house);
      if ('ok' in found) return found;
      const { entry, agent } = found;
      const refused = handling(entry, agent);
      if (refused !== null) return refused;
      if (agent.auth !== 'token') return refuse(AGENT_PROBLEMS.notToken);
      if (agent.tokenHash === undefined) return view(entry);
      host.record(entry, 'agent-token-revoked', agent.id, {
        name: agent.name,
        prefix: agent.tokenPrefix as string,
      });
      delete agent.tokenHash;
      delete agent.tokenPrefix;
      delete agent.tokenCreatedAt;
      agent.enabled = false;
      agent.updatedAt = stamp();
      return view(entry);
    },

    giveAgentRole: async (wallet, accountId, agentId, roleId, house) =>
      assign(true, wallet, accountId, agentId, roleId, house),
    takeAgentRole: async (wallet, accountId, agentId, roleId, house) =>
      assign(false, wallet, accountId, agentId, roleId, house),

    agentPass: async (accountId, agentId): Promise<DeskAgentPassAnswer> => {
      if (!isAccountId(accountId) || !isAgentId(agentId)) {
        return refuse(
          ...(isAccountId(accountId) ? [] : ['accountId must be an account id']),
          ...(isAgentId(agentId) ? [] : [AGENT_PROBLEMS.agentId]),
        );
      }
      const agent = agentsOf(accountId).find((held) => held.id === agentId);
      const org = agent === undefined ? null : host.responsible(accountId, agent.responsible);
      if (agent === undefined || org === null) return refuse(AGENT_PROBLEMS.noSuchAgent);
      const answering = responsibleAccess(accountId, agent);
      const access = accessOfAgent(org.state, agent, answering);
      return {
        ok: true,
        accountId,
        agent: {
          id: agent.id,
          name: agent.name,
          auth: agent.auth,
          ...(agent.publicKey === undefined ? {} : { publicKey: agent.publicKey }),
          ...(agent.tokenHash === undefined ? {} : { tokenHash: agent.tokenHash }),
          enabled: agent.enabled,
          state: agent.state,
          hears: agent.hears,
          presence: presenceOf(agent),
          worlds: agent.worlds,
        },
        eligible: answered(answering),
        permissions: ORGANIZATION_PERMISSIONS.filter((key) => access.permissions.has(key)),
        height: Math.max(0, access.height),
        roles: topDown(org.state.roles)
          .filter((role) => agent.roleIds.includes(role.id))
          .map(({ name, color }) => ({ name, color })),
      };
    },

    claimAgentPass: async (accountId, agentId, aud, t): Promise<DeskClaimAnswer> => {
      const seconds = Math.floor(now().getTime() / 1000);
      if (
        !isAccountId(accountId) ||
        !isAgentId(agentId) ||
        !isAudience(aud) ||
        !Number.isSafeInteger(t) ||
        t < 0
      ) {
        return refuse(AGENT_PROBLEMS.moment);
      }
      for (const [key, at] of nonces) if (at < seconds - NONCE_KEPT_SECONDS) nonces.delete(key);
      const key = `${accountId}:${agentId}:${aud}:${t}`;
      if (nonces.has(key)) return refuse(AGENT_PROBLEMS.replayed);
      nonces.set(key, t);
      return { ok: true };
    },

    agentWorlds: async (accountId, agentId): Promise<DeskAgentWorldsAnswer> => {
      if (!isAccountId(accountId) || !isAgentId(agentId)) {
        return refuse(
          ...(isAccountId(accountId) ? [] : ['accountId must be an account id']),
          ...(isAgentId(agentId) ? [] : [AGENT_PROBLEMS.agentId]),
        );
      }
      const agent = agentsOf(accountId).find((held) => held.id === agentId);
      if (agent === undefined) return refuse(AGENT_PROBLEMS.noSuchAgent);
      return {
        ok: true,
        accountId,
        agentId,
        worldIds: livesIn(agent.worlds, host.placedIn(accountId)),
        worlds: agent.worlds,
        presence: presenceOf(agent),
      };
    },

    agentByToken: async (tokenHash): Promise<DeskAgentPassAnswer> => {
      if (!isTokenHash(tokenHash)) return refuse(AGENT_PROBLEMS.tokenHash);
      for (const [accountId, held] of byOrg) {
        const agent = held.find((one) => one.tokenHash === tokenHash);
        if (agent !== undefined) return methods.agentPass(accountId, agent.id);
      }
      return refuse(AGENT_PROBLEMS.noSuchAgent);
    },
  };
  return methods;

  function assign(
    give: boolean,
    wallet: unknown,
    accountId: unknown,
    agentId: unknown,
    roleId: unknown,
    house: unknown,
  ): DeskAgentsAnswer {
    const found = withAgent(wallet, accountId, agentId, house);
    if ('ok' in found) return found;
    const { entry, agent } = found;
    if (typeof roleId !== 'string' || !ROLE_ID.test(roleId)) return refuse(ROLE_ID_PROBLEM);
    const role = entry.state.roles.find((candidate) => candidate.id === roleId);
    if (role === undefined) return refuse(NO_SUCH_ROLE);
    const target = accessOfAgent(entry.state, agent, accessOfResponsible(entry, agent));
    const allowed = canAssignRole(entry.access, target, role);
    if (!allowed.ok) return host.refusalOf(allowed.refusal, 'manage-roles', entry.state);
    if (give && !mayGive(entry, target, role)) return refuse(AGENT_PROBLEMS.houseCeiling);
    if (agent.roleIds.includes(role.id) === give) return view(entry);
    agent.roleIds = give
      ? [...agent.roleIds, role.id]
      : agent.roleIds.filter((held) => held !== role.id);
    agent.updatedAt = stamp();
    host.record(entry, give ? 'agent-role-given' : 'agent-role-taken', agent.id, {
      role: role.id,
      name: role.name,
    });
    return view(entry);
  }
}
