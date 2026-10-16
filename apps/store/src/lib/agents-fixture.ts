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
  type ActorAccess,
  type OrganizationAccess,
  type OrganizationRefusal,
  type OrganizationRole,
  type OrganizationState,
} from '@numinia/domain';
import type {
  AccountDesk,
  AgentState,
  AgentStatus,
  DeskAgent,
  DeskAgentChange,
  DeskAgentDraft,
  DeskAgentPassAnswer,
  DeskAgentsAnswer,
  DeskClaimAnswer,
  DeskLogAct,
  DeskRefusal,
} from './accounts';
import {
  AGENT_PROBLEMS,
  AGENT_STATES,
  isAccountId,
  isAgentId,
  isAudience,
  publicKeyBytes,
  readAgentName,
} from './agents';

/** How many agents an organization keeps (the till's `MAX_AGENTS`). */
export const MAX_AGENTS = 20;
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
  refusalOf(
    refusal: OrganizationRefusal,
    act: OrganizationAccess,
    state: OrganizationState,
  ): DeskRefusal;
}

interface FixtureAgent {
  readonly id: string;
  readonly name: string;
  readonly publicKey: string;
  readonly responsible: string;
  enabled: boolean;
  state: AgentState;
  readonly createdAt: string;
  updatedAt: string;
  roleIds: string[];
}

type AgentMethods = Pick<
  AccountDesk,
  | 'agents'
  | 'createAgent'
  | 'changeAgent'
  | 'removeAgent'
  | 'giveAgentRole'
  | 'takeAgentRole'
  | 'agentPass'
  | 'claimAgentPass'
>;

const refuse = (...problems: string[]): DeskRefusal => ({ ok: false, problems });

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

  const accessOfResponsible = (entry: HostEntry, agent: FixtureAgent) =>
    host.responsible(entry.accountId, agent.responsible)?.access ?? null;

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
    if (entry.who === agent.responsible) return null;
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
      mayCreate:
        entry.as !== 'house' &&
        entry.access.permissions.has('manage-roles') &&
        held.length < MAX_AGENTS,
      assignableRoles: topDown(entry.state.roles)
        .filter((role) => canAssignRole(entry.access, fresh, role).ok)
        .map(({ id, name, color, position }) => ({ id, name, color, position })),
      agents: held.map((agent): DeskAgent => {
        const target = accessOfAgent(entry.state, agent, accessOfResponsible(entry, agent));
        const responsibleName = host.published(agent.responsible);
        return {
          id: agent.id,
          name: agent.name,
          publicKey: agent.publicKey,
          enabled: agent.enabled,
          state: agent.state,
          status: statusOf(entry, agent),
          responsible: agent.responsible,
          ...(responsibleName === undefined ? {} : { responsibleName }),
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          roleIds: [...agent.roleIds],
          assignable: entry.state.roles
            .filter((role) => canAssignRole(entry.access, target, role).ok)
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

  return {
    agents: async (wallet, accountId, house): Promise<DeskAgentsAnswer> => {
      const entry = host.enter(wallet, accountId, house);
      if ('ok' in entry) return entry;
      host.houseRead(entry, 'agents');
      return view(entry);
    },

    createAgent: async (wallet, accountId, sent, house): Promise<DeskAgentsAnswer> => {
      const draft = sent as Partial<DeskAgentDraft> | null;
      const entry = host.enter(wallet, accountId, house);
      if ('ok' in entry) return entry;
      const roleIds = draft?.roleIds ?? [];
      const problems = [
        ...(isAgentId(draft?.id) ? [] : [AGENT_PROBLEMS.agentId]),
        ...(readAgentName(draft?.name) === undefined ? [AGENT_PROBLEMS.name] : []),
        ...(publicKeyBytes(draft?.publicKey) === null ? [AGENT_PROBLEMS.publicKey] : []),
        ...(Array.isArray(roleIds) &&
        roleIds.length <= ROLES_PER_AGENT_MAX &&
        roleIds.every((id) => ROLE_ID.test(id))
          ? []
          : [AGENT_PROBLEMS.roleIds]),
      ];
      if (problems.length > 0) return refuse(...problems);
      const { id, publicKey } = draft as DeskAgentDraft;
      const name = readAgentName(draft?.name) as string;
      if (!entry.access.permissions.has('manage-roles')) {
        return host.refusalOf('missing-permission', 'manage-roles', entry.state);
      }
      if (entry.as === 'house') return refuse(AGENT_PROBLEMS.houseCannot);
      const held = agentsOf(entry.accountId);
      if (held.length >= MAX_AGENTS) return refuse(AGENT_PROBLEMS.limit);
      if (held.some((other) => other.id === id || other.publicKey === publicKey)) {
        return refuse(AGENT_PROBLEMS.taken);
      }
      const unique = [...new Set(roleIds)];
      const fresh = newAgentAccess(entry, []);
      for (const roleId of unique) {
        const role = entry.state.roles.find((candidate) => candidate.id === roleId);
        if (role === undefined) return refuse(NO_SUCH_ROLE);
        const allowed = canAssignRole(entry.access, fresh, role);
        if (!allowed.ok) return host.refusalOf(allowed.refusal, 'manage-roles', entry.state);
      }
      const at = stamp();
      byOrg.set(entry.accountId, [
        ...held,
        {
          id,
          name,
          publicKey,
          responsible: entry.who,
          enabled: true,
          state: 'activa',
          createdAt: at,
          updatedAt: at,
          roleIds: unique,
        },
      ]);
      host.record(entry, 'agent-created', id, {
        name,
        ...(unique.length > 0 ? { roles: unique.join(',') } : {}),
      });
      return view(entry);
    },

    changeAgent: async (wallet, accountId, agentId, sent, house): Promise<DeskAgentsAnswer> => {
      const change = sent as DeskAgentChange | null;
      const keys = typeof change === 'object' && change !== null ? Object.keys(change) : [];
      const enabledSent = change?.enabled;
      const stateSent = change?.state;
      const problems = [
        ...(keys.length === 0 || keys.some((key) => key !== 'enabled' && key !== 'state')
          ? [AGENT_PROBLEMS.change]
          : []),
        ...(enabledSent !== undefined && typeof enabledSent !== 'boolean'
          ? [AGENT_PROBLEMS.enabled]
          : []),
        ...(stateSent !== undefined && !AGENT_STATES.includes(stateSent)
          ? [AGENT_PROBLEMS.state]
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
      if (switched || moved) {
        agent.enabled = enabled;
        agent.state = state;
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
      const access = accessOfAgent(org.state, agent, org.access);
      return {
        ok: true,
        accountId,
        agent: {
          id: agent.id,
          name: agent.name,
          publicKey: agent.publicKey,
          enabled: agent.enabled,
          state: agent.state,
        },
        eligible: answered(org.access),
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
  };

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
