/**
 * «IAs de organización» (cut of 2026-10-17), in migration 0011's `team_agents`:
 * an AI that belongs to an organization and enters its worlds with a pass
 * numinia.com signs for it every few minutes. This is the desk's database work:
 * listing the agents, creating one, switching it on or off, putting it to
 * sleep, giving or taking its roles, removing it — and what the store asks
 * when an agent requests its pass (`agentPass`, `claimAgentPass`), lists its
 * worlds (`agentWorlds`) or comes with nothing but its token (`agentByToken`).
 * How an agent was connected — the panel, or an MCP client through the
 * house's relay — is kept on its row and in its log lines as `via`
 * (migration 0022).
 *
 * The rules are STD-051, worked out by @numinia/domain from the tables as they
 * are now (ORG-011: an agent never goes beyond the person who answers for it,
 * and is never an owner). Whoever creates an agent answers for it — a member
 * with `manage-roles`, or the house (D-078, migration 0025) in any community
 * that lets it in, which then answers as the house. Every change is one
 * guarded batch (src/db/organizations.ts `commit`) that writes its line in the
 * organization's log (ORG-009) — switching it off and putting it to sleep
 * included; the house's acts carry its mark.
 *
 * If the person who answers for an agent leaves the organization or loses
 * `manage-roles` — or, when it is the house, the community stops letting the
 * house in — the agent is no longer given a pass: that is worked out here at
 * every request, never by a trigger. Every argument comes from numinia.com
 * and is read as untrusted (src/lib/agents.ts); a refusal is an answer with
 * problems in words, never a throw.
 */

import {
  AGENT_RESPONDS_TEXT_MAX,
  ORGANIZATION_PERMISSIONS,
  accessOf,
  applyAgentPresenceChange,
  canAssignRole,
  houseMayEnter,
  storedAgentPresence,
  DEFAULT_AGENT_PRESENCE,
  type ActorAccess,
  type AgentPresence,
  type AgentResponds,
  type AgentWorlds,
  type OrganizationPermission,
  type OrganizationRole,
} from '@numinia/domain';
import { readAccountId } from '../lib/accounts';
import {
  AGENT_PROBLEMS,
  MAX_AGENTS,
  readAgentChange,
  readAgentDraft,
  readAgentId,
  readAgentPresenceChange,
  readAgentWorlds,
  readConnectedVia,
  readMoment,
  readTokenHash,
  readTokenPrefix,
  hearingOf,
  PRESENCE_PROBLEMS,
  presenceDiff,
  presenceOfAgent,
  readWorldAudience,
  sortedWorlds,
  worldsText,
  type AgentDraft,
  type AgentState,
  type ConnectedVia,
} from '../lib/agents';
import { ORG_PROBLEMS, refusalOf, topDown } from '../lib/organizations';
import { ROLE_PROBLEMS, readRoleId } from '../lib/roles';
import { PROBLEMS, houseRead, lacking, refuse, type Entered, type Refusal } from './accounts';
import {
  accessIn,
  actingIn,
  commit,
  loadOrganization,
  logLine,
  memberIn,
  whole,
  type Acting,
  type ActingAs,
  type Organization,
} from './organizations';
import { publishedBy, publishedIn } from './profiles';
import { entering } from './roles';
import { instant, text, type Row, type TillDatabase } from './repository';

export type AgentAuth = 'key' | 'token';

/** An agent as the till keeps it. */
interface TeamAgent {
  readonly id: string;
  readonly name: string;
  /** How it proves itself: an Ed25519 key it signs with, or an access token (migration 0021). */
  readonly auth: AgentAuth;
  /** Its public key; null for a token agent. */
  readonly publicKey: string | null;
  /** SHA-256 of its token in hex; null for a key agent or once the token is revoked. Never leaves the till but to the pass route. */
  readonly tokenHash: string | null;
  /** The first 8 characters after `ntk_`; null with the hash. */
  readonly tokenPrefix: string | null;
  readonly tokenCreatedAt: string | null;
  /** How it was connected (migration 0022); null for an agent made before, through the panel. */
  readonly via: ConnectedVia | null;
  /** The wallet of the person who answers for it (ORG-011). */
  readonly responsible: string;
  /** Whether that person answers as the house (an Oracle acting as the house, D-078), not as a member. */
  readonly responsibleHouse: boolean;
  readonly enabled: boolean;
  readonly state: AgentState;
  /** Whether it may hear what is said nearby in the worlds (migration 0023). */
  readonly hears: boolean;
  /** How it is present in a world (migration 0026), hearing agreeing with `hears`; the defaults when nothing is stored. */
  readonly presence: AgentPresence;
  /** Where it lives (migration 0026): every world of its organization, or the chosen ones still placed there. */
  readonly worlds: AgentWorlds;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly roleIds: readonly string[];
}

/** Why an agent gets no pass, or how it enters when it does. */
export type AgentStatus = 'apagada' | 'sin-responsable' | 'sin-permiso' | AgentState;

/** An agent as the panel draws it. */
export interface AgentDetail {
  readonly id: string;
  readonly name: string;
  readonly auth: AgentAuth;
  /** Its public key (a key agent only). */
  readonly publicKey?: string;
  /** The first 8 characters of its token and when it was made (a token agent with a live token only); never the token or its hash. */
  readonly tokenPrefix?: string;
  readonly tokenCreatedAt?: string;
  /** How it was connected: the panel, or `mcp:` and its client's host (absent for an agent made before migration 0022). */
  readonly via?: ConnectedVia;
  readonly enabled: boolean;
  readonly state: AgentState;
  /** Whether it may hear what is said nearby in the worlds; off by default (migration 0023). */
  readonly hears: boolean;
  /** How it is present in a world: body, bubble, how it is called, what it hears, how long it stays (migration 0026). */
  readonly presence: AgentPresence;
  /** Where it lives: `{ todos: true }` — every world of the organization, now and later — or `{ mundos }`, the chosen ones still placed there. */
  readonly worlds: AgentWorlds;
  /** What the next pass will be: off, orphaned, without permission to enter, or its state. */
  readonly status: AgentStatus;
  readonly responsible: string;
  /** Present, `true`, when the house answers for it (D-078): the panel shows «la casa» and the wallet's name. */
  readonly responsibleHouse?: true;
  /** The name the responsible person published, if any. */
  readonly responsibleName?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** The roles held besides the base role. */
  readonly roleIds: readonly string[];
  /** The roles the one asking may give to or take from this agent. */
  readonly assignable: readonly string[];
  /** Whether the one asking may switch it, change its state, give it roles or remove it. */
  readonly mayEdit: boolean;
}

export interface AgentsView {
  readonly ok: true;
  readonly accountId: string;
  readonly as: ActingAs;
  /** The asker may create an agent (manage-roles — the house holds it where it may enter — below the limit). */
  readonly mayCreate: boolean;
  /** The roles the asker may give to a new agent, from the top down. */
  readonly assignableRoles: readonly {
    readonly id: string;
    readonly name: string;
    readonly color: string | null;
    readonly position: number;
  }[];
  /** By arrival. */
  readonly agents: readonly AgentDetail[];
}

export type AgentsAnswer = AgentsView | Refusal;

/** What an agent's pass is made of, as numinia.com asks for it. */
export interface AgentPass {
  readonly ok: true;
  readonly accountId: string;
  readonly agent: {
    readonly id: string;
    readonly name: string;
    readonly auth: AgentAuth;
    /** A key agent's public key. */
    readonly publicKey?: string;
    /** A token agent's SHA-256(token) in hex, for numinia.com to compare in constant time; absent once revoked. */
    readonly tokenHash?: string;
    readonly enabled: boolean;
    readonly state: AgentState;
    readonly hears: boolean;
    /** Its presence settings, for the pass's `ia` block (migration 0026). */
    readonly presence: AgentPresence;
    /** Where it lives, for refusing a pass outside it: the chosen worlds, or all. */
    readonly worlds: AgentWorlds;
  };
  /** The person who answers for it is still in the organization and still holds manage-roles. */
  readonly eligible: boolean;
  /**
   * Who answers for it, as its world shows it to everyone (D-084), for the pass's `ia` block: the
   * community's name and the person's published name, or their wallet when they published none —
   * the house's Oracle, when the house answers. Absent when it cannot be said in a form the pass accepts.
   */
  readonly responde?: AgentResponds;
  /** accessOf's permissions for the agent (ORG-011), in the register's order. */
  readonly permissions: readonly OrganizationPermission[];
  /** accessOf's height: a role position, never an owner's. */
  readonly height: number;
  /** The roles it holds besides the base role, highest first. */
  readonly roles: readonly { readonly name: string; readonly color: string | null }[];
}

export type AgentPassAnswer = AgentPass | Refusal;

/** The worlds an agent lives in, by id, and how; read in one query. */
export type AgentWorldsAnswer =
  | {
      readonly ok: true;
      readonly accountId: string;
      readonly agentId: string;
      /** The worlds it lives in: those placed in its organization, or only the chosen ones among them. */
      readonly worldIds: readonly string[];
      /** `{ todos: true }` or `{ mundos }` (the same ids as `worldIds`). */
      readonly worlds: AgentWorlds;
      readonly presence: AgentPresence;
    }
  | Refusal;
export type ClaimAnswer = { readonly ok: true } | Refusal;

/** The revision the organization ?1 holds now: what a guarded statement compares. */
const REVISION = '(SELECT revision FROM team_profiles WHERE account_id = ?1)';

const SELECT_AGENTS = `
  SELECT agent_id, name, auth_kind, public_key, token_hash, token_prefix, token_created_at,
         connected_via, responsible_wallet, responsible_house, enabled, state, hears,
         presence_json, worlds_mode, created_at, updated_at
    FROM team_agents WHERE account_id = ?1 ORDER BY created_at, agent_id`;

const SELECT_AGENT_ROLES = 'SELECT agent_id, role_id FROM team_agent_roles WHERE account_id = ?1';

/** The worlds chosen for the organization's agents, only those still placed in it. */
const SELECT_AGENT_WORLD_ROWS = `
  SELECT w.agent_id, w.world_id
    FROM team_agent_worlds AS w
    JOIN world_placements AS p ON p.world_id = w.world_id AND p.account_id = w.account_id
   WHERE w.account_id = ?1 ORDER BY w.world_id`;

/** The worlds placed in the organization, by id. */
const SELECT_PLACED =
  'SELECT world_id FROM world_placements WHERE account_id = ?1 ORDER BY world_id';

const INSERT_AGENT = `
  INSERT INTO team_agents
    (account_id, agent_id, name, auth_kind, public_key, token_hash, token_prefix,
     token_created_at, connected_via, responsible_wallet, responsible_house, enabled, state,
     hears, presence_json, worlds_mode, created_by, created_at, updated_at)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?12, ?9, ?14, 1, 'activa', ?13, ?15, ?16, ?9, ?10, ?10
   WHERE ${REVISION} = ?11`;

/** A chosen world, only if it is still placed in the organization when the batch runs. */
const INSERT_AGENT_WORLD = `
  INSERT INTO team_agent_worlds (account_id, agent_id, world_id)
  SELECT ?1, ?2, ?3 FROM world_placements WHERE world_id = ?3 AND account_id = ?1
   AND ${REVISION} = ?4`;

const DELETE_AGENT_WORLDS = `
  DELETE FROM team_agent_worlds WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?3`;

const UPDATE_AGENT_WORLDS_MODE = `
  UPDATE team_agents SET worlds_mode = ?3, updated_at = ?4
   WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?5`;

/** Presence and hearing are written together: they say the same of the ladder's last rung. */
const UPDATE_AGENT_PRESENCE = `
  UPDATE team_agents SET presence_json = ?3, hears = ?4, updated_at = ?5
   WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?6`;

const GIVE_AGENT_ROLE = `
  INSERT INTO team_agent_roles (account_id, agent_id, role_id)
  SELECT ?1, ?2, ?3 WHERE ${REVISION} = ?4`;

const TAKE_AGENT_ROLE = `
  DELETE FROM team_agent_roles
   WHERE account_id = ?1 AND agent_id = ?2 AND role_id = ?3 AND ${REVISION} = ?4`;

const UPDATE_AGENT = `
  UPDATE team_agents SET enabled = ?3, state = ?4, hears = ?7, updated_at = ?5
   WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?6`;

const UPDATE_AGENT_TOKEN = `
  UPDATE team_agents
     SET token_hash = ?3, token_prefix = ?4, token_created_at = ?5, enabled = ?6, updated_at = ?8
   WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?7`;

/** A renewal: a new token, and the way it came by (a revocation leaves the way as it was). */
const RENEW_AGENT_TOKEN = `
  UPDATE team_agents
     SET token_hash = ?3, token_prefix = ?4, token_created_at = ?5, connected_via = ?6,
         updated_at = ?5
   WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?7`;

/**
 * The worlds an agent lives in, and its presence, in one query: the agent's
 * own row, joined to the placements of its organization — all of them for an
 * agent that lives in 'todos', only the chosen ones for 'elegidos'. No row:
 * no such agent there; one row with a NULL world: an agent that lives in no
 * world (its organization has none, or none of the chosen is placed there).
 */
const SELECT_AGENT_WORLDS = `
  SELECT a.presence_json, a.worlds_mode, a.hears, p.world_id
    FROM team_agents AS a
    LEFT JOIN world_placements AS p ON p.account_id = a.account_id
     AND (a.worlds_mode = 'todos' OR EXISTS (
       SELECT 1 FROM team_agent_worlds AS w
        WHERE w.account_id = a.account_id AND w.agent_id = a.agent_id AND w.world_id = p.world_id))
   WHERE a.account_id = ?1 AND a.agent_id = ?2
   ORDER BY p.world_id`;

/** The agent holding a live token, by its hash (the unique index team_agents_by_token, migration 0021). */
const SELECT_AGENT_BY_TOKEN = `
  SELECT account_id, agent_id FROM team_agents
   WHERE token_hash = ?1 AND auth_kind = 'token'`;

const DELETE_AGENT = `
  DELETE FROM team_agents WHERE account_id = ?1 AND agent_id = ?2 AND ${REVISION} = ?3`;

/** How long a pass request's nonce is kept: past the ±60 s window the store accepts, twice over. */
export const NONCE_KEPT_SECONDS = 120;

const SWEEP_PASSES = 'DELETE FROM team_agent_passes WHERE t < ?1';
const CLAIM_PASS =
  'INSERT OR IGNORE INTO team_agent_passes (account_id, agent_id, aud, t) VALUES (?1, ?2, ?3, ?4)';

/** A text column that may be NULL. */
const optional = (row: Row, column: string): string | null =>
  row[column] === null ? null : text(row, column);

/** The organization's agents, read after the organization itself: a change between the two raises the revision and the guarded write refuses. */
async function loadAgents(db: TillDatabase, accountId: string): Promise<TeamAgent[]> {
  const [agents, held, chosen] = (
    await db.batch<Row>([
      db.prepare(SELECT_AGENTS).bind(accountId),
      db.prepare(SELECT_AGENT_ROLES).bind(accountId),
      db.prepare(SELECT_AGENT_WORLD_ROWS).bind(accountId),
    ])
  ).map((result) => result.results) as [Row[], Row[], Row[]];
  const heldBy = new Map<string, string[]>();
  for (const row of held) {
    const holder = text(row, 'agent_id');
    heldBy.set(holder, [...(heldBy.get(holder) ?? []), text(row, 'role_id')]);
  }
  const chosenBy = new Map<string, string[]>();
  for (const row of chosen) {
    const holder = text(row, 'agent_id');
    chosenBy.set(holder, [...(chosenBy.get(holder) ?? []), text(row, 'world_id')]);
  }
  return agents.map((row) => {
    const id = text(row, 'agent_id');
    const hears = whole(row, 'hears') === 1;
    return {
      id,
      name: text(row, 'name'),
      auth: text(row, 'auth_kind') as AgentAuth,
      publicKey: optional(row, 'public_key'),
      tokenHash: optional(row, 'token_hash'),
      tokenPrefix: optional(row, 'token_prefix'),
      tokenCreatedAt: optional(row, 'token_created_at'),
      via: optional(row, 'connected_via') as ConnectedVia | null,
      responsible: text(row, 'responsible_wallet'),
      responsibleHouse: whole(row, 'responsible_house') === 1,
      enabled: whole(row, 'enabled') === 1,
      state: text(row, 'state') as AgentState,
      hears,
      presence: presenceOfAgent(optional(row, 'presence_json'), hears),
      worlds:
        text(row, 'worlds_mode') === 'todos' ? { todos: true } : { mundos: chosenBy.get(id) ?? [] },
      createdAt: instant(row, 'created_at'),
      updatedAt: instant(row, 'updated_at'),
      roleIds: heldBy.get(id) ?? [],
    };
  });
}

type Answerable = Pick<TeamAgent, 'responsible' | 'responsibleHouse'>;

/**
 * The access of the person who answers for an agent, or undefined when nobody
 * does: a member who left, or the house where the community no longer lets it in.
 * The house answers with its own access (every permission, above every role —
 * `accessOf` 'house'), so what an agent it made may do is bounded by its roles,
 * and by the ceiling in {@link houseMayGive}.
 */
function responsibleAccess(org: Organization, agent: Answerable): ActorAccess | undefined {
  if (agent.responsibleHouse) {
    return houseMayEnter(org.state.houseAccess, org.state.houseLeaveOpen)
      ? accessOf(org.state, { kind: 'house', personId: agent.responsible })
      : undefined;
  }
  return memberIn(org, agent.responsible) === undefined
    ? undefined
    : accessIn(org, agent.responsible);
}

/** What an agent holds: its roles, trimmed by the person who answers for it (ORG-011); nothing without them. */
function agentAccess(org: Organization, agent: Pick<TeamAgent, 'id' | 'roleIds'> & Answerable) {
  return accessOf(
    org.state,
    {
      kind: 'member',
      member: {
        personId: `agent:${agent.id}`,
        kind: 'agent',
        isOwner: false,
        roleIds: agent.roleIds,
      },
    },
    responsibleAccess(org, agent),
  );
}

/** Whether the agent's responsible person still answers for it: a member who holds manage-roles, or the house where it may enter. */
const answered = (org: Organization, agent: Answerable): boolean =>
  responsibleAccess(org, agent)?.permissions.has('manage-roles') === true;

/**
 * The house's ceiling (D-078): it gives an agent any role of the community
 * except one that holds Administrator or Manage roles — the two permissions
 * that ask for a fresh wallet signature (ORG-008), which the house, acting
 * alone, would not have behind it. Owners are not roles, so no role is above.
 */
const HOUSE_NEVER_GIVES: readonly OrganizationPermission[] = ['administrator', 'manage-roles'];

/** Whether `acting` may give `role` to an agent whose access is `target`: ORG-003 and, for the house, its ceiling. */
const mayGive = (acting: Acting, target: ActorAccess, role: OrganizationRole): boolean =>
  canAssignRole(acting.access, target, role).ok &&
  (acting.as !== 'house' || !role.permissions.some((key) => HOUSE_NEVER_GIVES.includes(key)));

function statusOf(org: Organization, agent: TeamAgent): AgentStatus {
  if (!agent.enabled) return 'apagada';
  if (!answered(org, agent)) return 'sin-responsable';
  if (!agentAccess(org, agent).permissions.has('enter-worlds')) return 'sin-permiso';
  return agent.state;
}

/**
 * Null when the one acting may handle `agent`: they hold manage-roles, and
 * either answer for it or stand above it (the agent's height is below theirs).
 */
function handling(entered: Entered, agent: TeamAgent): Refusal | null {
  const refused = lacking(entered, 'manage-roles');
  if (refused !== null) return refused;
  const { org, acting } = entered;
  // Who answers as a member is told by the wallet; the house's agents are told by height alone.
  if (!agent.responsibleHouse && acting.wallet === agent.responsible) return null;
  return agentAccess(org, agent).height >= acting.access.height
    ? refuse(ORG_PROBLEMS.notBelow)
    : null;
}

/** The access a new agent would hold with `roleIds`, answering to `acting`. */
const newAgentAccess = (org: Organization, acting: Acting, roleIds: readonly string[]) =>
  accessOf(
    org.state,
    {
      kind: 'member',
      member: { personId: 'agent:new', kind: 'agent', isOwner: false, roleIds },
    },
    acting.access,
  );

const mayCreate = (acting: Acting, count: number): boolean =>
  acting.access.permissions.has('manage-roles') && count < MAX_AGENTS;

async function viewOf(db: TillDatabase, entered: Entered): Promise<AgentsView> {
  const { org, acting } = entered;
  const agents = await loadAgents(db, org.accountId);
  const members = await publishedIn(db, org.accountId);
  // The house's Oracles are no members: their published name is read apart, for the AIs they answer for.
  const houses = await publishedBy(
    db,
    agents.filter((agent) => agent.responsibleHouse).map((agent) => agent.responsible),
  );
  const published = (agent: TeamAgent) =>
    (agent.responsibleHouse ? houses : members).get(agent.responsible);
  const fresh = newAgentAccess(org, acting, []);
  return {
    ok: true,
    accountId: org.accountId,
    as: acting.as,
    mayCreate: mayCreate(acting, agents.length),
    assignableRoles: topDown(org.state.roles)
      .filter((role) => mayGive(acting, fresh, role))
      .map(({ id, name, color, position }) => ({ id, name, color, position })),
    agents: agents.map((agent) => {
      const target = agentAccess(org, agent);
      return {
        id: agent.id,
        name: agent.name,
        auth: agent.auth,
        ...(agent.publicKey === null ? {} : { publicKey: agent.publicKey }),
        ...(agent.tokenPrefix === null
          ? {}
          : {
              tokenPrefix: agent.tokenPrefix,
              tokenCreatedAt: agent.tokenCreatedAt as string,
            }),
        ...(agent.via === null ? {} : { via: agent.via }),
        ...(agent.responsibleHouse ? { responsibleHouse: true as const } : {}),
        enabled: agent.enabled,
        state: agent.state,
        hears: agent.hears,
        presence: agent.presence,
        worlds: agent.worlds,
        status: statusOf(org, agent),
        responsible: agent.responsible,
        ...(published(agent) === undefined
          ? {}
          : { responsibleName: published(agent)?.name as string }),
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        roleIds: agent.roleIds,
        // A role the agent already holds can always be taken, whoever gave it.
        assignable: org.state.roles
          .filter(
            (role) =>
              canAssignRole(acting.access, target, role).ok &&
              (mayGive(acting, target, role) || agent.roleIds.includes(role.id)),
          )
          .map((role) => role.id),
        mayEdit: handling(entered, agent) === null,
      };
    }),
  };
}

/** Runs a change and answers the agents as they are now, or that the organization changed meanwhile. */
async function written(
  db: TillDatabase,
  entered: Entered,
  statements: readonly D1PreparedStatement[],
): Promise<AgentsAnswer> {
  if (!(await commit(db, entered.org, statements))) return refuse(PROBLEMS.meanwhile);
  const org = (await loadOrganization(db, entered.org.accountId)) as Organization;
  const acting =
    actingIn(org, entered.acting.wallet, entered.acting.as === 'house') ?? entered.acting;
  return viewOf(db, { org, acting });
}

/** The organization's agents, to any member and the house (where it may enter). */
export async function agentsOf(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  await houseRead(entered, db, now, 'agents');
  return viewOf(db, entered);
}

/** The agent `sentAgent` of the organization, read and found, or the refusal. */
async function agentFor(
  db: TillDatabase,
  entered: Entered,
  sentAgent: unknown,
): Promise<{ readonly agent: TeamAgent } | Refusal> {
  const id = readAgentId(sentAgent);
  if (id === undefined) return refuse(AGENT_PROBLEMS.agentId);
  const agent = (await loadAgents(db, entered.org.accountId)).find((held) => held.id === id);
  return agent === undefined ? refuse(AGENT_PROBLEMS.noSuchAgent) : { agent };
}

/**
 * Creates an agent: whoever holds manage-roles — as a member, or as the house
 * where the community lets it in (D-078). They become its responsible person
 * (ORG-011; marked as the house when it is the house), and may give it, at
 * once, only roles below their own highest — the house, any role but those
 * that hold Administrator or Manage roles. The draft's `via` (the panel when
 * absent) is kept on the row and in the log lines.
 */
export async function createAgent(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const draft = readAgentDraft(sentAgent);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    Array.isArray(draft) ? draft : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const made = draft as AgentDraft;
  const { id, name, roleIds, via, hears, presence } = made;
  const refused = lacking(entered, 'manage-roles');
  if (refused !== null) return refused;
  const held = await loadAgents(db, org.accountId);
  if (held.length >= MAX_AGENTS) return refuse(AGENT_PROBLEMS.limit);
  const publicKey = made.auth === 'key' ? made.publicKey : null;
  const tokenHash = made.auth === 'token' ? made.tokenHash : null;
  if (
    held.some(
      (other) =>
        other.id === id ||
        (publicKey !== null && other.publicKey === publicKey) ||
        (tokenHash !== null && other.tokenHash === tokenHash),
    )
  ) {
    return refuse(AGENT_PROBLEMS.taken);
  }
  const fresh = newAgentAccess(org, acting, []);
  for (const roleId of roleIds) {
    const role = org.state.roles.find((candidate) => candidate.id === roleId);
    if (role === undefined) return refuse(ROLE_PROBLEMS.noSuchRole);
    const allowed = canAssignRole(acting.access, fresh, role);
    if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
    if (!mayGive(acting, fresh, role)) return refuse(AGENT_PROBLEMS.houseCeiling);
  }
  // Where it lives: what the draft says; else the one world of a community that has just one
  // (design §5: an AI lives in one world, chosen when it is connected); else every world, as before.
  const placed = await placedWorlds(db, org.accountId);
  const worlds = sortedWorlds(
    made.worlds ?? (placed.length === 1 ? { mundos: placed } : { todos: true }),
  );
  if ('mundos' in worlds && worlds.mundos.some((worldId) => !placed.includes(worldId))) {
    return refuse(PRESENCE_PROBLEMS.worldsNotHere);
  }
  const customised = presenceDiff(DEFAULT_AGENT_PRESENCE, presence);
  return written(db, entered, [
    db
      .prepare(INSERT_AGENT)
      .bind(
        org.accountId,
        id,
        name,
        made.auth,
        publicKey,
        tokenHash,
        made.auth === 'token' ? made.tokenPrefix : null,
        made.auth === 'token' ? now.toISOString() : null,
        acting.wallet,
        now.toISOString(),
        org.revision,
        via,
        hears ? 1 : 0,
        acting.as === 'house' ? 1 : 0,
        storedAgentPresence(presence),
        'todos' in worlds ? 'todos' : 'elegidos',
      ),
    ...roleIds.map((roleId) =>
      db.prepare(GIVE_AGENT_ROLE).bind(org.accountId, id, roleId, org.revision),
    ),
    ...('mundos' in worlds ? worlds.mundos : []).map((worldId) =>
      db.prepare(INSERT_AGENT_WORLD).bind(org.accountId, id, worldId, org.revision),
    ),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'agent-created',
      id,
      {
        name,
        ...(roleIds.length > 0 ? { roles: roleIds.join(',') } : {}),
        via,
        ...(customised.length > 0 ? { presence: customised.join(';') } : {}),
        ...('mundos' in worlds ? { worlds: worldsText(worlds) } : {}),
      },
      org.revision,
    ),
    // Only the prefix is ever written: never the token, never its hash.
    ...(made.auth === 'token'
      ? [
          logLine(
            db,
            org.accountId,
            now,
            acting,
            'agent-token-created',
            id,
            { name, prefix: made.tokenPrefix, via },
            org.revision,
          ),
        ]
      : []),
  ]);
}

/** Switches an agent on or off, sets its state and/or whether it hears nearby chat: whoever may handle it. Every change is a line of the log. */
export async function changeAgent(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentChange: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const change = readAgentChange(sentChange);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    Array.isArray(change) ? change : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const refused = handling(entered, agent);
  if (refused !== null) return refused;
  const next = Array.isArray(change) ? {} : change;
  const enabled = next.enabled ?? agent.enabled;
  const state = next.state ?? agent.state;
  const hears = next.hears ?? agent.hears;
  const switched = enabled !== agent.enabled;
  const moved = state !== agent.state;
  const listened = hears !== agent.hears;
  if (!switched && !moved && !listened) return viewOf(db, entered);
  return written(db, entered, [
    db
      .prepare(UPDATE_AGENT)
      .bind(
        org.accountId,
        agent.id,
        enabled ? 1 : 0,
        state,
        now.toISOString(),
        org.revision,
        hears ? 1 : 0,
      ),
    ...(switched
      ? [
          logLine(
            db,
            org.accountId,
            now,
            acting,
            enabled ? 'agent-enabled' : 'agent-disabled',
            agent.id,
            { name: agent.name },
            org.revision,
          ),
        ]
      : []),
    ...(moved
      ? [
          logLine(
            db,
            org.accountId,
            now,
            acting,
            'agent-state',
            agent.id,
            { name: agent.name, from: agent.state, to: state },
            org.revision,
          ),
        ]
      : []),
    // The ladder's last rung lives in two places (migration 0026): keep the presence in step.
    ...(listened
      ? [
          db
            .prepare(UPDATE_AGENT_PRESENCE)
            .bind(
              org.accountId,
              agent.id,
              storedAgentPresence({ ...agent.presence, oye: hearingOf(hears, agent.presence.oye) }),
              hears ? 1 : 0,
              now.toISOString(),
              org.revision,
            ),
        ]
      : []),
    // No act of its own (the list is a CHECK, 0021): an AI's hearing rides on its state's act.
    ...(listened
      ? [
          logLine(
            db,
            org.accountId,
            now,
            acting,
            'agent-state',
            agent.id,
            { name: agent.name, hears: hears ? 'on' : 'off' },
            org.revision,
          ),
        ]
      : []),
  ]);
}

/**
 * Gives a token agent a new token (the old one stops working at once): whoever
 * may handle it. numinia.com draws the token and sends only its SHA-256 and
 * first 8 characters; the log keeps the prefix. A key agent has no token.
 * `sentVia` is the way the new token came by — the panel when absent, or
 * `mcp:<host>` when an MCP client reconnects the same AI — and replaces the
 * row's; the log line carries it as `detail.via`.
 */
export async function renewAgentToken(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentHash: unknown,
  sentPrefix: unknown,
  sentHouse: unknown,
  sentVia: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const tokenHash = readTokenHash(sentHash);
  const tokenPrefix = readTokenPrefix(sentPrefix);
  const via = readConnectedVia(sentVia);
  const wrong = [
    ...(tokenHash === undefined ? [AGENT_PROBLEMS.tokenHash] : []),
    ...(tokenPrefix === undefined ? [AGENT_PROBLEMS.tokenPrefix] : []),
    ...(via === undefined ? [AGENT_PROBLEMS.via] : []),
  ];
  const entered = await entering(db, sentWallet, sentAccount, sentHouse, wrong);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const refused = handling(entered, agent);
  if (refused !== null) return refused;
  if (agent.auth !== 'token') return refuse(AGENT_PROBLEMS.notToken);
  if (agent.tokenHash === tokenHash) return refuse(AGENT_PROBLEMS.taken);
  const at = now.toISOString();
  return written(db, entered, [
    db
      .prepare(RENEW_AGENT_TOKEN)
      .bind(
        org.accountId,
        agent.id,
        tokenHash as string,
        tokenPrefix as string,
        at,
        via as ConnectedVia,
        org.revision,
      ),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'agent-token-renewed',
      agent.id,
      { name: agent.name, prefix: tokenPrefix as string, via: via as ConnectedVia },
      org.revision,
    ),
  ]);
}

/** Revokes a token agent's token: the agent is switched off and keeps no token until it is renewed. */
export async function revokeAgentToken(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const refused = handling(entered, agent);
  if (refused !== null) return refused;
  if (agent.auth !== 'token') return refuse(AGENT_PROBLEMS.notToken);
  if (agent.tokenHash === null) return viewOf(db, entered);
  return written(db, entered, [
    db
      .prepare(UPDATE_AGENT_TOKEN)
      .bind(org.accountId, agent.id, null, null, null, 0, org.revision, now.toISOString()),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'agent-token-revoked',
      agent.id,
      { name: agent.name, prefix: agent.tokenPrefix as string },
      org.revision,
    ),
  ]);
}

/** The worlds placed in the organization, by id. */
async function placedWorlds(db: TillDatabase, accountId: string): Promise<string[]> {
  const { results } = await db.prepare(SELECT_PLACED).bind(accountId).all<Row>();
  return results.map((row) => text(row, 'world_id'));
}

/**
 * Changes how an agent is present in a world — body, bubble, how it is
 * called, what it hears, how long it stays (migration 0026; the domain's
 * `AgentPresenceChange`: any part of any group): whoever may handle it. The
 * last rung of what it hears is the `hears` column's too, so the two move
 * together. One line of the log under `agent-state` (`detail.presence`: what
 * changed as `path=value;…`; and `hears` when that flipped); nothing when
 * nothing changes. numinia.com puts it in the next pass (≤ 10 minutes).
 */
export async function changeAgentPresence(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentChange: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const change = readAgentPresenceChange(sentChange);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    Array.isArray(change) ? change : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const refused = handling(entered, agent);
  if (refused !== null) return refused;
  const next = applyAgentPresenceChange(agent.presence, Array.isArray(change) ? {} : change);
  const diff = presenceDiff(agent.presence, next);
  if (diff.length === 0) return viewOf(db, entered);
  const hears = next.oye === 'todo';
  return written(db, entered, [
    db
      .prepare(UPDATE_AGENT_PRESENCE)
      .bind(
        org.accountId,
        agent.id,
        storedAgentPresence(next),
        hears ? 1 : 0,
        now.toISOString(),
        org.revision,
      ),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'agent-state',
      agent.id,
      { name: agent.name, presence: diff.join(';') },
      org.revision,
    ),
    ...(hears !== agent.hears
      ? [
          logLine(
            db,
            org.accountId,
            now,
            acting,
            'agent-state',
            agent.id,
            { name: agent.name, hears: hears ? 'on' : 'off' },
            org.revision,
          ),
        ]
      : []),
  ]);
}

/**
 * Sets where an agent lives (migration 0026): `{ todos: true }`, every world
 * of its organization now and later, or `{ mundos: [ids] }`, exactly those —
 * each one placed in the agent's own organization, or the answer is a
 * refusal and nothing is written. Whoever may handle the agent. One line of
 * the log under `agent-state` (`detail.worlds`: `todos`, or the ids); nothing
 * when it already lives there. numinia.com refuses the pass outside them.
 */
export async function setAgentWorlds(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentWorlds: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const worlds = readAgentWorlds(sentWorlds);
  const entered = await entering(
    db,
    sentWallet,
    sentAccount,
    sentHouse,
    Array.isArray(worlds) ? worlds : [],
  );
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const refused = handling(entered, agent);
  if (refused !== null) return refused;
  const next = sortedWorlds(worlds as AgentWorlds);
  if ('mundos' in next) {
    const placed = await placedWorlds(db, org.accountId);
    if (next.mundos.some((worldId) => !placed.includes(worldId))) {
      return refuse(PRESENCE_PROBLEMS.worldsNotHere);
    }
  }
  if (worldsText(next) === worldsText(sortedWorlds(agent.worlds))) return viewOf(db, entered);
  return written(db, entered, [
    db.prepare(DELETE_AGENT_WORLDS).bind(org.accountId, agent.id, org.revision),
    ...('mundos' in next ? next.mundos : []).map((worldId) =>
      db.prepare(INSERT_AGENT_WORLD).bind(org.accountId, agent.id, worldId, org.revision),
    ),
    db
      .prepare(UPDATE_AGENT_WORLDS_MODE)
      .bind(
        org.accountId,
        agent.id,
        'todos' in next ? 'todos' : 'elegidos',
        now.toISOString(),
        org.revision,
      ),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'agent-state',
      agent.id,
      { name: agent.name, worlds: worldsText(next) },
      org.revision,
    ),
  ]);
}

/** Removes an agent: whoever may handle it. It gets no more passes; its connection falls when its pass runs out. */
export async function removeAgent(
  db: TillDatabase,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const refused = handling(entered, agent);
  if (refused !== null) return refused;
  return written(db, entered, [
    db.prepare(DELETE_AGENT).bind(org.accountId, agent.id, org.revision),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      'agent-removed',
      agent.id,
      { name: agent.name },
      org.revision,
    ),
  ]);
}

/** Gives a role to an agent, or takes it from it: only below one's own highest role (ORG-003, ORG-004). */
export async function assignAgentRole(
  db: TillDatabase,
  give: boolean,
  sentWallet: unknown,
  sentAccount: unknown,
  sentAgent: unknown,
  sentRole: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AgentsAnswer> {
  const entered = await entering(db, sentWallet, sentAccount, sentHouse);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const found = await agentFor(db, entered, sentAgent);
  if ('problems' in found) return found;
  const { agent } = found;
  const roleId = readRoleId(sentRole);
  if (roleId === undefined) return refuse(ROLE_PROBLEMS.roleId);
  const role = org.state.roles.find((candidate) => candidate.id === roleId);
  if (role === undefined) return refuse(ROLE_PROBLEMS.noSuchRole);
  const allowed = canAssignRole(acting.access, agentAccess(org, agent), role);
  if (!allowed.ok) return refuse(refusalOf(allowed.refusal, 'manage-roles', org.state.roles));
  if (give && !mayGive(acting, agentAccess(org, agent), role)) {
    return refuse(AGENT_PROBLEMS.houseCeiling);
  }
  if (agent.roleIds.includes(role.id) === give) return viewOf(db, entered);
  return written(db, entered, [
    db
      .prepare(give ? GIVE_AGENT_ROLE : TAKE_AGENT_ROLE)
      .bind(org.accountId, agent.id, role.id, org.revision),
    logLine(
      db,
      org.accountId,
      now,
      acting,
      give ? 'agent-role-given' : 'agent-role-taken',
      agent.id,
      { role: role.id, name: role.name },
      org.revision,
    ),
  ]);
}

// eslint-disable-next-line no-control-regex -- control codes are exactly what goes
const CONTROL = /[\u0000-\u001f\u007f]/g;

/** At most `max` characters of a name for the pass, trimmed and without control characters; undefined when nothing is left. */
function shown(name: string, max: number): string | undefined {
  const cut = Array.from(name.replace(CONTROL, ' ').trim()).slice(0, max).join('').trim();
  return cut === '' ? undefined : cut;
}

/** The `responde` of an agent's pass: the community, and the person by name or, with no name, by wallet (D-084). */
async function respondsOf(
  db: TillDatabase,
  org: Organization,
  agent: Pick<TeamAgent, 'responsible'>,
): Promise<AgentResponds | undefined> {
  const comunidad = shown(org.name, AGENT_RESPONDS_TEXT_MAX);
  if (comunidad === undefined) return undefined;
  const name = (await publishedBy(db, [agent.responsible])).get(agent.responsible)?.name;
  if (name !== undefined)
    return { comunidad, nombre: shown(name, AGENT_RESPONDS_TEXT_MAX) as string };
  // A wallet is stored as `0x` and 40 lower case hexadecimal digits (the table's CHECK): what the pass asks for.
  return { comunidad, cartera: agent.responsible };
}

/**
 * What an agent's pass is made of: its switch, its state, who answers for it
 * and what it holds (ORG-011). Asked by numinia.com when an agent requests a
 * pass, after nothing but the agent's id: it names no person, only the
 * agent's own public data, and numinia.com signs nothing before it has
 * verified the agent's signature against `publicKey`.
 */
export async function agentPass(
  db: TillDatabase,
  sentAccount: unknown,
  sentAgent: unknown,
): Promise<AgentPassAnswer> {
  const accountId = readAccountId(sentAccount);
  const id = readAgentId(sentAgent);
  if (accountId === undefined || id === undefined) {
    return refuse(
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(id === undefined ? [AGENT_PROBLEMS.agentId] : []),
    );
  }
  const org = await loadOrganization(db, accountId);
  if (org === null) return refuse(AGENT_PROBLEMS.noSuchAgent);
  const agent = (await loadAgents(db, accountId)).find((held) => held.id === id);
  if (agent === undefined) return refuse(AGENT_PROBLEMS.noSuchAgent);
  const access: ActorAccess = agentAccess(org, agent);
  const responde = await respondsOf(db, org, agent);
  return {
    ok: true,
    accountId,
    agent: {
      id: agent.id,
      name: agent.name,
      auth: agent.auth,
      ...(agent.publicKey === null ? {} : { publicKey: agent.publicKey }),
      ...(agent.tokenHash === null ? {} : { tokenHash: agent.tokenHash }),
      enabled: agent.enabled,
      state: agent.state,
      hears: agent.hears,
      presence: agent.presence,
      worlds: agent.worlds,
    },
    eligible: answered(org, agent),
    ...(responde === undefined ? {} : { responde }),
    permissions: ORGANIZATION_PERMISSIONS.filter((key) => access.permissions.has(key)),
    height: Math.max(0, access.height),
    roles: topDown(org.state.roles)
      .filter((role) => agent.roleIds.includes(role.id))
      .map(({ name, color }) => ({ name, color })),
  };
}

/**
 * The worlds an agent lives in, in ONE query (the agent's row joined to its
 * organization's placements, narrowed to the chosen ones for an agent that
 * lives in 'elegidos'), and its presence, for GET /api/agents/me: public as
 * `homeOf` is — where a world stands is no secret — and asked by numinia.com
 * only once it has judged the agent's token. Whether the agent may enter
 * them is not decided here: `agentPass` says that.
 */
export async function agentWorlds(
  db: TillDatabase,
  sentAccount: unknown,
  sentAgent: unknown,
): Promise<AgentWorldsAnswer> {
  const accountId = readAccountId(sentAccount);
  const agentId = readAgentId(sentAgent);
  if (accountId === undefined || agentId === undefined) {
    return refuse(
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(agentId === undefined ? [AGENT_PROBLEMS.agentId] : []),
    );
  }
  const { results } = await db.prepare(SELECT_AGENT_WORLDS).bind(accountId, agentId).all<Row>();
  const [first] = results;
  if (first === undefined) return refuse(AGENT_PROBLEMS.noSuchAgent);
  const worldIds = results.flatMap((row) =>
    row['world_id'] === null ? [] : [text(row, 'world_id')],
  );
  return {
    ok: true,
    accountId,
    agentId,
    worldIds,
    worlds: text(first, 'worlds_mode') === 'todos' ? { todos: true } : { mundos: worldIds },
    presence: presenceOfAgent(optional(first, 'presence_json'), whole(first, 'hears') === 1),
  };
}

/**
 * The agent a live token belongs to, found by its SHA-256 alone — for a
 * client that holds nothing but an `ntk_` token (the MCP relay's static
 * bearer). The lookup is by hash through the unique index, so no token is
 * ever compared here, raw or hashed; a revoked token has no hash and a key
 * agent never had one, so neither is found. The answer is `agentPass`'s, so
 * numinia.com judges it as it judges a pass: an unknown hash is the same
 * refusal as an unknown agent.
 */
export async function agentByToken(db: TillDatabase, sentHash: unknown): Promise<AgentPassAnswer> {
  const tokenHash = readTokenHash(sentHash);
  if (tokenHash === undefined) return refuse(AGENT_PROBLEMS.tokenHash);
  const row = await db.prepare(SELECT_AGENT_BY_TOKEN).bind(tokenHash).first<Row>();
  if (row === null) return refuse(AGENT_PROBLEMS.noSuchAgent);
  return agentPass(db, text(row, 'account_id'), text(row, 'agent_id'));
}

/**
 * Uses up one pass request: the agent, the world and the second it signed.
 * The first claim is `ok`; a second for the same four is refused (replay).
 * Rows older than {@link NONCE_KEPT_SECONDS} are swept first. Numinia.com
 * claims only after it has verified the signature, so nobody can burn the
 * nonce of a request they cannot sign.
 */
export async function claimAgentPass(
  db: TillDatabase,
  sentAccount: unknown,
  sentAgent: unknown,
  sentAudience: unknown,
  sentMoment: unknown,
  now: Date,
): Promise<ClaimAnswer> {
  const accountId = readAccountId(sentAccount);
  const id = readAgentId(sentAgent);
  const aud = readWorldAudience(sentAudience);
  const t = readMoment(sentMoment);
  if (accountId === undefined || id === undefined || aud === undefined || t === undefined) {
    return refuse(
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(id === undefined ? [AGENT_PROBLEMS.agentId] : []),
      ...(aud === undefined ? [AGENT_PROBLEMS.audience] : []),
      ...(t === undefined ? [AGENT_PROBLEMS.moment] : []),
    );
  }
  const seconds = Math.floor(now.getTime() / 1000);
  const results = await db.batch([
    db.prepare(SWEEP_PASSES).bind(seconds - NONCE_KEPT_SECONDS),
    db.prepare(CLAIM_PASS).bind(accountId, id, aud, t),
  ]);
  return results[1]?.meta.changes === 1 ? { ok: true } : refuse(AGENT_PROBLEMS.replayed);
}
