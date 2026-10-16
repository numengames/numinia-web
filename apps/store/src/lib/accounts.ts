/**
 * «Saldo»: the contract with the till's `AccountDesk` and what the screen
 * needs to draw it — money in whole euro cents, net of VAT, a balance that
 * never expires, usage per day or per month, the lines of the ledger, the
 * members of an organization.
 *
 * Pure: no fetch, no env and no zod. The saldo island imports it, and zod
 * in an island breaks the bundle budget, so whatever comes from outside is
 * read by hand here. The server side (lib/accounts-source.ts) checks the
 * till's answers with zod before the browser ever sees them; these readers
 * only keep a wrong body from breaking the page.
 *
 * The till decides who may do what (membership); this module only shapes.
 */

import {
  ORGANIZATION_PERMISSIONS,
  needsFreshSignature,
  type OrganizationAccess,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import { localeHref } from './app-nav';
import { isVocabulary } from './panel-settings';

// ---- The contract with the till's desk (SPEC «AccountDesk methods») -------

export type AccountKind = 'personal' | 'team';
/** `owner` is the personal account's only role; a team has admins and members. */
export type AccountRole = 'owner' | 'admin' | 'member';
export type MemberRole = 'admin' | 'member';
export type SpendRange = '7d' | '30d' | '12m';
export type TopupKey = '10' | '50' | '100';
export type LineKind = 'topup' | 'world_day' | 'adjustment' | 'refund' | 'chargeback';
export type CheckoutState = 'paid' | 'open' | 'expired';

export interface DeskAccount {
  id: string;
  kind: AccountKind;
  /** Null for the personal account («Tu cuenta»). */
  name: string | null;
  role: AccountRole;
  balanceCents: number;
  /**
   * `house` marks an organization the wallet is not in and enters as the
   * house (QA 2026-10-15, STD-051 ORG-007): only an Oracle's session ever
   * lists one. Absent on the wallet's own accounts, so old readers see the
   * same list, longer. Such an entry says `admin` (what the till answers
   * for the house) and `balanceCents: 0` — a placeholder, not a balance: the
   * directory reveals no money, and the statement (which the till logs as a
   * read of the house) has the real one.
   */
  as?: 'house';
}

export interface DeskOverview {
  /** Personal first, then the teams by name. */
  accounts: DeskAccount[];
}

/** One organization as the till's directory lists it to the house: an id and a name, no money. */
export interface DeskDirectoryEntry {
  id: string;
  kind: 'team';
  name: string;
}

export type DeskDirectoryAnswer = { ok: true; accounts: DeskDirectoryEntry[] } | DeskRefusal;

/** A refusal: the till's answer when the wallet may not do it. */
export interface DeskRefusal {
  ok: false;
  problems: string[];
}

export interface DeskLot {
  lineId: string;
  at: string;
  amountCents: number;
  remainderCents: number;
}

export interface DeskSpend {
  /** `YYYY-MM-DD` for the day ranges, `YYYY-MM` for 12 months. */
  bucket: string;
  cents: number;
  /** A till of the cut «el dinero» splits each bucket: what the worlds' running and stopped minutes cost (they add up to `cents`). */
  runningCents?: number;
  stoppedCents?: number;
}

export interface DeskLine {
  kind: LineKind;
  at: string;
  amountCents: number;
  vatCents?: number | null;
  day?: string | null;
  worldId?: string | null;
  size?: string | null;
  /** A world's day, from a till of the cut «el dinero»: its minutes running and stopped. */
  minutesRunning?: number | null;
  minutesStopped?: number | null;
  reason?: string | null;
}

export interface DeskMember {
  wallet: string;
  role: MemberRole;
  addedAt: string;
}

/** A world over the statement's range: its latest size there, the days it ran at all, what it cost. */
export interface DeskWorld {
  worldId: string;
  size: string;
  daysRunning: number;
  cents: number;
}

/** What a day of a size costs, net of VAT, running or stopped. */
export interface DeskSizePrice {
  runningCentsPerDay: number;
  stoppedCentsPerDay: number;
}

/** The tariff in force today, cut to what a person reads: the sizes in use and two rules. */
export interface DeskTariff {
  startsOn: string;
  sizes: Record<string, DeskSizePrice>;
  rules: { keepDaysAtZero: number; noticeDaysForRise: number };
}

/** The same in every range: the 7 complete UTC days before today, and the month so far with its worlds charged. */
export interface DeskPace {
  sevenDaysCents: number;
  monthCents: number;
  monthWorlds: number;
}

export interface DeskStatement {
  account: DeskAccount;
  balanceCents: number;
  lowBalance: boolean;
  /**
   * From a till of the cut «gratis»: whether the account has something that
   * costs (a world charged to it or placed in it). Absent from an older till:
   * see `hasCosts()`.
   */
  hasCosts?: boolean;
  lots: DeskLot[];
  spend: DeskSpend[];
  spendTotalCents: number;
  /** The last 100 lines, newest first. */
  lines: DeskLine[];
  /** Teams only. */
  members?: DeskMember[];
  /** From a till of the cut «el dinero» (each absent from an older one; the screen hides what is absent). */
  worlds?: DeskWorld[];
  pace?: DeskPace;
  tariff?: DeskTariff;
}

export type DeskTeamAnswer = { ok: true; account: DeskAccount } | DeskRefusal;
export type DeskMembersAnswer = { ok: true; members?: DeskMember[] } | DeskRefusal;
export type DeskTopupAnswer = { ok: true; url: string } | DeskRefusal;
/**
 * What the till says a wallet may do in an organization (its `access`):
 * on whose behalf it acts, every act it may do, and for every act the
 * names of the roles that hold it. The screen hides what the wallet may
 * not do and says who could; the till still decides on every write.
 */
export interface DeskAccess {
  as: 'owner' | 'house' | 'member';
  permissions: OrganizationAccess[];
  holders: Partial<Record<OrganizationAccess, string[]>>;
}

/** A role as the panel draws it (the till's `roles`). */
export interface DeskRole {
  id: string;
  name: string;
  color: string | null;
  position: number;
  hoist: boolean;
  permissions: OrganizationPermission[];
  /** How many members hold it; everyone holds the base role. */
  members: number;
  /** Whether the asker may edit, move or delete it. */
  mayEdit: boolean;
}

/** A member as the panel draws it. */
export interface DeskMemberDetail {
  wallet: string;
  owner: boolean;
  addedAt: string;
  /** The roles held besides the base role. */
  roleIds: string[];
  /** The roles the asker may give to or take from this member. */
  assignable: string[];
  /**
   * What the member published (cut «Tu nombre y tu cara», 2026-10-16,
   * STD-053), absent when they published nothing: `name`, the name fellow
   * members read instead of a short wallet; `face`, the baked 1x thumbnail
   * of their Bazar avatar (`/thumbs/1x/<id>.webp`), or null for none. The
   * till sends `avatar`, the avatar's id: the store turns it into `face`
   * and never hands the id to a browser (lib/accounts-source.ts).
   */
  name?: string | null;
  face?: string | null;
  avatar?: string | null;
}

export interface DeskRoles {
  ok: true;
  accountId: string;
  as: 'owner' | 'house' | 'member';
  /** From the top down, the base role last. */
  roles: DeskRole[];
  /** Owners first, then by arrival. */
  members: DeskMemberDetail[];
}

export type DeskRolesAnswer = DeskRoles | DeskRefusal;

/** How many people an organization has, asked with no wallet: all a stranger is shown (PRS-004). */
export type DeskHeadcountAnswer = { ok: true; accountId: string; members: number } | DeskRefusal;

/** What a role is made of when it is created. */
export interface DeskRoleDraft {
  name: string;
  color: string | null;
  hoist: boolean;
  permissions: OrganizationPermission[];
}

export type DeskRoleChange = Partial<DeskRoleDraft>;

export type DeskLogAct =
  | 'organization-created'
  | 'organization-renamed'
  | 'member-added'
  | 'member-removed'
  | 'member-left'
  | 'role-given'
  | 'role-taken'
  | 'topup-started'
  | 'house-read'
  | 'role-created'
  | 'role-edited'
  | 'role-moved'
  | 'role-deleted'
  | 'settings-changed'
  | 'agent-created'
  | 'agent-enabled'
  | 'agent-disabled'
  | 'agent-state'
  | 'agent-removed'
  | 'agent-role-given'
  | 'agent-role-taken';

export interface DeskLogLine {
  seq: number;
  at: string;
  actor: string;
  asHouse: boolean;
  act: DeskLogAct;
  subject: string | null;
  detail: Record<string, string> | null;
}

export type DeskLogAnswer = { ok: true; accountId: string; lines: DeskLogLine[] } | DeskRefusal;

/**
 * «Ajustes de la comunidad» (cut 8): which pieces of the panel an organization
 * has switched off, the preset of its words, and whether the asker may change
 * them. Nothing stored is today's behaviour: `off` empty, `mixed`.
 */
export interface DeskSettings {
  ok: true;
  accountId: string;
  off: string[];
  vocabulary: 'simple' | 'mixed' | 'numinia';
  mayEdit: boolean;
}
export type DeskSettingsAnswer = DeskSettings | DeskRefusal;
export interface DeskSettingsChange {
  off?: string[] | undefined;
  vocabulary?: 'simple' | 'mixed' | 'numinia' | undefined;
}

/** A line of the log for «Qué ha pasado»: the log's line plus the author's published name. */
export interface DeskHappening extends DeskLogLine {
  actorName: string | null;
}
export type DeskHappeningsAnswer =
  { ok: true; accountId: string; lines: DeskHappening[]; more: boolean } | DeskRefusal;

/**
 * «IAs de organización» (2026-10-17): the AIs an organization sends into its
 * worlds. `state` is a closed list that grows by adding values; it only counts
 * while `enabled`. `status` is what the next pass will be, worked out by the
 * till from the tables: off, orphaned (the person who answers for it left or
 * lost manage-roles), without the permission to enter, or its state.
 */
export type AgentState = 'activa' | 'dormida';
export type AgentStatus = 'apagada' | 'sin-responsable' | 'sin-permiso' | AgentState;

export interface DeskAgent {
  id: string;
  name: string;
  publicKey: string;
  enabled: boolean;
  state: AgentState;
  status: AgentStatus;
  responsible: string;
  responsibleName?: string | undefined;
  createdAt: string;
  updatedAt: string;
  roleIds: string[];
  assignable: string[];
  mayEdit: boolean;
}

export interface DeskAgents {
  ok: true;
  accountId: string;
  as: 'owner' | 'house' | 'member';
  mayCreate: boolean;
  assignableRoles: { id: string; name: string; color: string | null; position: number }[];
  agents: DeskAgent[];
}
export type DeskAgentsAnswer = DeskAgents | DeskRefusal;

export interface DeskAgentDraft {
  id: string;
  name: string;
  publicKey: string;
  roleIds?: string[] | undefined;
}

export interface DeskAgentChange {
  enabled?: boolean | undefined;
  state?: AgentState | undefined;
}

/** What an agent's pass is made of (asked with no wallet, by the pass route, before it signs). */
export interface DeskAgentPass {
  ok: true;
  accountId: string;
  agent: { id: string; name: string; publicKey: string; enabled: boolean; state: AgentState };
  eligible: boolean;
  permissions: string[];
  height: number;
  roles: { name: string; color: string | null }[];
}
export type DeskAgentPassAnswer = DeskAgentPass | DeskRefusal;
export type DeskClaimAnswer = { ok: true } | DeskRefusal;

export type DeskConfirmAnswer =
  { ok: true; state: CheckoutState; accountId: string; balanceCents: number } | DeskRefusal;

/**
 * The RPC surface of the till's `AccountDesk` entrypoint, as the store calls
 * it. The first argument is always the session's wallet, lowercase 0x — the
 * till trusts its bound caller for WHO and decides itself WHAT.
 *
 * The trailing `house` of the organization methods is the house's flag
 * (STD-051 ORG-007): the store's word that this session is the house's staff
 * — an Oracle's, read from our own signed cookie, never from the browser.
 * With it the till lets the wallet into an organization it is not in, as
 * `house`, and writes down what it reads and does there (ORG-009); without
 * it, or false, the wallet is only what it is in that organization.
 * `directory` is the one method that exists for the house alone.
 */
export interface AccountDesk {
  overview(wallet: string): Promise<DeskOverview | DeskRefusal>;
  directory(wallet: string, house: boolean): Promise<DeskDirectoryAnswer>;
  createTeam(wallet: string, name: string): Promise<DeskTeamAnswer>;
  renameTeam(
    wallet: string,
    accountId: string,
    name: string,
    house?: boolean,
  ): Promise<DeskTeamAnswer>;
  statement(
    wallet: string,
    accountId: string,
    range: SpendRange,
    house?: boolean,
  ): Promise<DeskStatement | DeskRefusal>;
  members(wallet: string, accountId: string, house?: boolean): Promise<DeskMembersAnswer>;
  access(
    wallet: string,
    accountId: string,
    house?: boolean,
  ): Promise<({ ok: true; accountId: string } & DeskAccess) | DeskRefusal>;
  setMember(
    wallet: string,
    accountId: string,
    memberWallet: string,
    role: MemberRole,
    house?: boolean,
  ): Promise<DeskMembersAnswer>;
  removeMember(
    wallet: string,
    accountId: string,
    memberWallet: string,
    house?: boolean,
  ): Promise<DeskMembersAnswer>;
  roles(wallet: string, accountId: string, house?: boolean): Promise<DeskRolesAnswer>;
  headcount(accountId: string): Promise<DeskHeadcountAnswer>;
  createRole(
    wallet: string,
    accountId: string,
    role: DeskRoleDraft,
    house?: boolean,
  ): Promise<DeskRolesAnswer>;
  editRole(
    wallet: string,
    accountId: string,
    roleId: string,
    change: DeskRoleChange,
    house?: boolean,
  ): Promise<DeskRolesAnswer>;
  moveRole(
    wallet: string,
    accountId: string,
    roleId: string,
    position: number,
    house?: boolean,
  ): Promise<DeskRolesAnswer>;
  deleteRole(
    wallet: string,
    accountId: string,
    roleId: string,
    house?: boolean,
  ): Promise<DeskRolesAnswer>;
  giveRole(
    wallet: string,
    accountId: string,
    memberWallet: string,
    roleId: string,
    house?: boolean,
  ): Promise<DeskRolesAnswer>;
  takeRole(
    wallet: string,
    accountId: string,
    memberWallet: string,
    roleId: string,
    house?: boolean,
  ): Promise<DeskRolesAnswer>;
  log(wallet: string, accountId: string, house?: boolean): Promise<DeskLogAnswer>;
  startTopup(
    wallet: string,
    accountId: string,
    amountKey: TopupKey,
    returnBase: string,
    house?: boolean,
  ): Promise<DeskTopupAnswer>;
  confirmTopup(wallet: string, sessionId: string): Promise<DeskConfirmAnswer>;
  /** «Tu nombre y tu cara»: what the wallet published, to the wallet itself (optional: see below). */
  profile(wallet: string): Promise<DeskProfileAnswer>;
  /** Publishes or replaces the wallet's name and avatar, or stops showing them (null: erased). */
  setProfile(wallet: string, change: DeskProfileChange): Promise<DeskProfileAnswer>;
  /** «El censo»: the wallet signed in now (first time kept, last time moved; optional: see below). */
  signedIn(wallet: string): Promise<DeskSignedInAnswer>;
  /**
   * «El censo»: everyone who has signed in, newest first, a search and pages
   * of 200 — to the house alone (`house` true); anyone else is refused.
   */
  citizens(
    wallet: string,
    house: boolean,
    query?: string,
    cursor?: string | null,
  ): Promise<DeskCitizensAnswer>;
  /**
   * «Mundos ↔ organizaciones»: the house places 1 to 50 worlds (fleet ids) in
   * one organization, which pays for them and administers them (optional).
   */
  placeWorld(
    wallet: string,
    house: boolean,
    worldIds: string[],
    accountId: string,
  ): Promise<DeskPlaceAnswer>;
  /** Where every placed world stands, to the house alone (`house` true). */
  placements(wallet: string, house: boolean): Promise<DeskPlacementsAnswer>;
  /** The worlds placed in one organization, to its members and the house. */
  worldsOf(wallet: string, house: boolean, accountId: string): Promise<DeskWorldsOfAnswer>;
  /** The organization one world belongs to — public: `wallet` may be null — and whether the caller may manage it. */
  homeOf(worldId: string, wallet?: string | null, house?: boolean): Promise<DeskHomeOfAnswer>;
  /**
   * «Una comunidad ES una organización»: the house opens the till account of a
   * community of the register the first time it uses it — the account's id is
   * derived from the community's (`communityAccountId`), so asking twice finds
   * the same one (`created: false`). Only the house (`house` true) asks.
   */
  ensureCommunityTeam(
    wallet: string,
    house: boolean,
    communityId: string,
    name: string,
  ): Promise<DeskEnsureAnswer>;
  /** «Ajustes de la comunidad»: the pieces that are off and the preset of the words, to a member or the house (optional). */
  settings(wallet: string, accountId: string, house?: boolean): Promise<DeskSettingsAnswer>;
  /** Turns pieces on or off and picks the words: whoever may manage the organization; logged (optional). */
  changeSettings(
    wallet: string,
    accountId: string,
    change: DeskSettingsChange,
    house?: boolean,
  ): Promise<DeskSettingsAnswer>;
  /** «Qué ha pasado»: the log, 30 a page, newest first; `before` is the last `seq` seen (optional). */
  happenings(
    wallet: string,
    accountId: string,
    before?: number | null,
    house?: boolean,
  ): Promise<DeskHappeningsAnswer>;
  /**
   * The house opens the organization of every community in one call (at most
   * 50): each one as `ensureCommunityTeam` does, the house a member and an
   * administrator of every one. Answers each account with whether this very
   * call opened it. Only the house (`house` true) asks.
   */
  openAllCommunities(
    wallet: string,
    house: boolean,
    communities: readonly { readonly id: string; readonly name: string }[],
  ): Promise<DeskOpenAllAnswer>;
  /** «IAs de organización»: the organization's agents, to a member or the house (optional). */
  agents(wallet: string, accountId: string, house?: boolean): Promise<DeskAgentsAnswer>;
  /** A new agent; the creator answers for it (ORG-011); logged (optional). */
  createAgent(
    wallet: string,
    accountId: string,
    agent: DeskAgentDraft,
    house?: boolean,
  ): Promise<DeskAgentsAnswer>;
  /** Switches an agent on or off and/or sets its state; logged (optional). */
  changeAgent(
    wallet: string,
    accountId: string,
    agentId: string,
    change: DeskAgentChange,
    house?: boolean,
  ): Promise<DeskAgentsAnswer>;
  removeAgent(
    wallet: string,
    accountId: string,
    agentId: string,
    house?: boolean,
  ): Promise<DeskAgentsAnswer>;
  giveAgentRole(
    wallet: string,
    accountId: string,
    agentId: string,
    roleId: string,
    house?: boolean,
  ): Promise<DeskAgentsAnswer>;
  takeAgentRole(
    wallet: string,
    accountId: string,
    agentId: string,
    roleId: string,
    house?: boolean,
  ): Promise<DeskAgentsAnswer>;
  /** What an agent's pass is made of; read-only, asked before the signature is verified (optional). */
  agentPass(accountId: string, agentId: string): Promise<DeskAgentPassAnswer>;
  /** Uses up one signed pass request (agent, world, second): a second use is refused (optional). */
  claimAgentPass(
    accountId: string,
    agentId: string,
    aud: string,
    t: number,
  ): Promise<DeskClaimAnswer>;
}

/**
 * Who is asking the desk, decided once per request from the verified
 * session (lib/auth/session-wallet.ts): its wallet, lowercase 0x, and
 * whether it is the house — the Oracle rank, and no other. It is never read
 * from a body, a query or a header.
 */
export interface Asker {
  readonly wallet: string;
  readonly house: boolean;
}

/** The methods a binding must have to be a desk, in the contract's order. */
export const DESK_METHODS = [
  'overview',
  'directory',
  'createTeam',
  'renameTeam',
  'statement',
  'members',
  'access',
  'setMember',
  'removeMember',
  'roles',
  'headcount',
  'createRole',
  'editRole',
  'moveRole',
  'deleteRole',
  'giveRole',
  'takeRole',
  'log',
  'startTopup',
  'confirmTopup',
  'profile',
  'setProfile',
  'signedIn',
  'citizens',
  'placeWorld',
  'placements',
  'worldsOf',
  'homeOf',
  'ensureCommunityTeam',
  'settings',
  'changeSettings',
  'happenings',
  'openAllCommunities',
  'agents',
  'createAgent',
  'changeAgent',
  'removeAgent',
  'giveAgentRole',
  'takeAgentRole',
  'agentPass',
  'claimAgentPass',
] as const satisfies readonly (keyof AccountDesk)[];

/**
 * The desk methods a till may still lack: the store and the till deploy on
 * their own, so for the minutes between the two a till without `directory`
 * is a desk all the same — the house just keeps the organizations it is in.
 * So is one without `profile` and `setProfile` (cut «Tu nombre y tu cara»):
 * Saldo and the panel keep working, and /api/profile answers 503 until the
 * till has them. And one without `signedIn` and `citizens` (cut «El censo»):
 * a sign-in records nothing, and /api/admin/citizens answers 503. And one
 * without the four of «Mundos ↔ organizaciones»: the world routes answer 503.
 * And one without `ensureCommunityTeam`: /api/admin/community-team answers 503.
 * And one without `settings`, `changeSettings` and `happenings` (cut «Ajustes de la
 * comunidad»): the panel keeps its defaults and the settings and the list answer 503.
 * And one without `openAllCommunities` (cut 7): `{ all: true }` answers 503.
 * And one without the eight agent methods (cut «IAs de organización»): the agents
 * routes and /api/agents/pass answer 503.
 */
export const OPTIONAL_DESK_METHODS: readonly (typeof DESK_METHODS)[number][] = [
  'directory',
  'profile',
  'setProfile',
  'signedIn',
  'citizens',
  'placeWorld',
  'placements',
  'worldsOf',
  'homeOf',
  'ensureCommunityTeam',
  'settings',
  'changeSettings',
  'happenings',
  'openAllCommunities',
  'agents',
  'createAgent',
  'changeAgent',
  'removeAgent',
  'giveAgentRole',
  'takeAgentRole',
  'agentPass',
  'claimAgentPass',
];

export const SPEND_RANGES: readonly SpendRange[] = ['7d', '30d', '12m'];
export const TOPUP_KEYS: readonly TopupKey[] = ['10', '50', '100'];
export const MEMBER_ROLES: readonly MemberRole[] = ['admin', 'member'];

/** Under 10 € the screen warns «Saldo bajo» (the till says it too: `lowBalance`) — only on an account that has costs. */
export const LOW_BALANCE_CENTS = 1000;

/**
 * Whether the account has anything that costs. A till of the cut «gratis»
 * says it; an older one does not, and then a world's day in the lines is the
 * evidence. Opening an organization is free: with nothing that costs, the
 * screen asks for no money.
 */
export function hasCosts(statement: Pick<DeskStatement, 'hasCosts' | 'lines'>): boolean {
  return statement.hasCosts ?? statement.lines.some((line) => line.kind === 'world_day');
}

/** The low-balance warning shows only when something costs and the balance is below the threshold. */
export function warnsLowBalance(
  statement: Pick<DeskStatement, 'hasCosts' | 'lines' | 'lowBalance'>,
): boolean {
  return statement.lowBalance && hasCosts(statement);
}
/** An organization's name: 1 to 60 characters once trimmed (the till's CHECK). */
export const TEAM_NAME_MAX = 60;

// The till's own words for the refusals the screen tells apart (apps/till:
// db/accounts.ts PROBLEMS and lib/organizations.ts ORG_PROBLEMS, pinned by
// a test that reads them).
export const NOT_MEMBER = 'not a member';
/** The directory of organizations is the house's alone (the till's `ORG_PROBLEMS.notHouse`). */
export const NOT_HOUSE = 'only the house reads the directory of organizations';
/** workerd's words when the till's entrypoint has no such method: a till older than the store. */
export const NOT_IMPLEMENTED = 'does not implement the method';
/** The till's refusal of the list of who has signed in to anyone but the house (cut «El censo»). */
export const NOT_HOUSE_CENSUS = 'only the house reads the list of who has signed in';
/** A `house` flag that is neither true nor false (the till's `ORG_PROBLEMS.house`). */
export const HOUSE_BOOLEAN = 'house must be true or false';
export const NOT_CONFIGURED = 'payments are not configured';
export const LAST_OWNER = 'an organization keeps at least one owner';
export const OWN_ROLES = 'nobody changes their own roles: they may only leave';
export const NOT_BELOW = 'you may act only on roles and members below your own highest role';
export const OWNER_ONLY = 'only the owners name or remove an owner';
export const NO_ADMIN_ROLE = 'no role of the organization carries administrator';
/** What /api/saldo answers when an act needs a fresh signature of the wallet and none came (ORG-008). */
export const FRESH_SIGNATURE =
  'giving administrator or manage-roles needs a fresh signature of your wallet';
/** The signature came after its two minutes: sign again. */
export const SIGNATURE_EXPIRED = 'the signature expired: sign again';
/** The signature is not the session's wallet's, or not for this very act. */
export const SIGNATURE_MISMATCH = 'the signature is not for this act or not from your wallet';
export const MEANWHILE = 'the organization changed meanwhile: read it again';
export const BASE_ROLE = 'everyone holds the base role: it is neither given nor taken away';
export const GRANT_EXCEEDS = 'you may grant or take away only the permissions you hold';
const ROLE_LIMIT = /^an organization holds at most \d+ roles besides the base role$/;
export const OWNERS_ONLY = 'only the owners may do this';
export const ALPHA = "no organization changes the house's access during the alpha";
/** «this needs manage-roles, which the owners hold, and the roles A and B» (or «which only the owners hold»). */
const NEEDS =
  /^this needs ([a-z-]+), which (?:only the owners hold|the owners hold, and the roles? (.+))$/;

// ---- Small shared checks ---------------------------------------------------

const WALLET = /^0x[0-9a-fA-F]{40}$/;

export function isWallet(text: string): boolean {
  return WALLET.test(text);
}

/** A typed wallet as the till wants it (lowercase), or null when it is not one. */
export function walletOf(text: string): string | null {
  const trimmed = text.trim();
  return isWallet(trimmed) ? trimmed.toLowerCase() : null;
}

/** `0x42e6…ca26`: enough to recognise, too little to copy (STD-035). */
export function shortWallet(wallet: string): string {
  return wallet.length > 12 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet;
}

/** A name for an organization, trimmed, or null when it is empty or too long. */
export function teamName(text: string): string | null {
  const name = text.trim();
  return name.length >= 1 && name.length <= TEAM_NAME_MAX ? name : null;
}

export function isSpendRange(value: unknown): value is SpendRange {
  return typeof value === 'string' && (SPEND_RANGES as readonly string[]).includes(value);
}

export function isTopupKey(value: unknown): value is TopupKey {
  return typeof value === 'string' && (TOPUP_KEYS as readonly string[]).includes(value);
}

/** `{name}` placeholders filled from `values`; unknown ones stay as they are. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

// ---- Money, days and months for people ------------------------------------

/** Cents in a language's own way: «4,20 €», «€4.20». `-0` prints as 0. */
export function formatEuros(cents: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents === 0 ? 0 : cents / 100);
}

/** A whole-euro top-up amount: «10 €», «€10». */
export function formatTopup(key: TopupKey, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(key));
}

/** A bucket as an axis label: a day «14 oct», a month «oct 2026». */
export function formatBucket(bucket: string, lang: string): string {
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    return new Date(`${bucket}-01T00:00:00Z`).toLocaleDateString(lang, {
      timeZone: 'UTC',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(`${bucket}T00:00:00Z`).toLocaleDateString(lang, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
}

/** An instant on the reader's own clock, or the text as it came when it is not one. */
export function formatAt(iso: string, lang: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone === undefined ? {} : { timeZone }),
  });
}

const DAY_MS = 86_400_000;

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The buckets a range covers up to `now`, oldest first (UTC, as the till counts). */
export function bucketsOf(range: SpendRange, now: Date): string[] {
  if (range === '12m') {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    return Array.from({ length: 12 }, (_, i) => {
      const at = new Date(Date.UTC(year, month - 11 + i, 1));
      return at.toISOString().slice(0, 7);
    });
  }
  const days = range === '7d' ? 7 : 30;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) => utcDay(new Date(today - (days - 1 - i) * DAY_MS)));
}

/**
 * The bars of the usage chart: every bucket of the range, in order, with
 * what the till counted for it (0 where it counted nothing). Buckets the
 * till names outside the range are left out; spend is never negative.
 */
export function spendSeries(
  spend: readonly DeskSpend[],
  range: SpendRange,
  now: Date,
): DeskSpend[] {
  const counted = new Map<string, number>();
  for (const entry of spend) {
    counted.set(entry.bucket, (counted.get(entry.bucket) ?? 0) + Math.max(0, entry.cents));
  }
  return bucketsOf(range, now).map((bucket) => ({ bucket, cents: counted.get(bucket) ?? 0 }));
}

/** The words a line is shown with. Refunds and chargebacks are both «Devolución». */
export type LineLabel = 'topup' | 'world' | 'adjustment' | 'refund';

export function lineLabel(kind: LineKind): LineLabel {
  if (kind === 'world_day') return 'world';
  if (kind === 'chargeback') return 'refund';
  return kind;
}

/** A movement's amount with its sign: «+10,00 €», «-0,20 €», «0,00 €». */
export function signedEuros(cents: number, lang: string): string {
  const plain = formatEuros(Math.abs(cents), lang);
  if (cents > 0) return `+${plain}`;
  return cents < 0 ? `-${plain}` : plain;
}

/** One bar of the usage chart, in the chart's own units (0..width, 0..height). */
export interface ChartBar {
  readonly bucket: string;
  readonly cents: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The bars of a series in a `width` × `height` box: one slot per bucket, a
 * gap of a fifth of the slot, the tallest bar full height, a bucket that
 * cost something at least one unit tall so it never vanishes.
 */
export function chartBars(series: readonly DeskSpend[], width: number, height: number): ChartBar[] {
  const max = series.reduce((top, entry) => Math.max(top, entry.cents), 0);
  const slot = series.length === 0 ? 0 : width / series.length;
  return series.map((entry, i) => {
    const tall = max === 0 ? 0 : Math.max(entry.cents > 0 ? 1 : 0, (entry.cents / max) * height);
    return {
      bucket: entry.bucket,
      cents: entry.cents,
      x: i * slot + slot * 0.1,
      y: height - tall,
      width: slot * 0.8,
      height: tall,
    };
  });
}

/** Which of the till's refusals the screen has its own words for. */
export type ProblemKey =
  | 'notMember'
  | 'notConfigured'
  | 'lastOwner'
  | 'ownRoles'
  | 'notBelow'
  | 'ownerOnly'
  | 'noAdminRole'
  | 'baseRole'
  | 'grantExceeds'
  | 'roleLimit'
  | 'ownersOnly'
  | 'alpha'
  | 'meanwhile'
  | 'freshSignature'
  | 'signatureExpired'
  | 'signatureMismatch'
  | 'needs'
  | 'other';

const SENTENCES: ReadonlyMap<string, ProblemKey> = new Map([
  [NOT_MEMBER, 'notMember'],
  [NOT_CONFIGURED, 'notConfigured'],
  [LAST_OWNER, 'lastOwner'],
  [OWN_ROLES, 'ownRoles'],
  [NOT_BELOW, 'notBelow'],
  [OWNER_ONLY, 'ownerOnly'],
  [NO_ADMIN_ROLE, 'noAdminRole'],
  [BASE_ROLE, 'baseRole'],
  [GRANT_EXCEEDS, 'grantExceeds'],
  [OWNERS_ONLY, 'ownersOnly'],
  [ALPHA, 'alpha'],
  [MEANWHILE, 'meanwhile'],
  [FRESH_SIGNATURE, 'freshSignature'],
  [SIGNATURE_EXPIRED, 'signatureExpired'],
  [SIGNATURE_MISMATCH, 'signatureMismatch'],
]);

/** One refusal, read: its key and, for a missing permission, which one and who holds it. */
export interface ReadProblem {
  readonly key: ProblemKey;
  /** `needs` only: the permission the wallet lacks. */
  readonly act?: OrganizationPermission;
  /** `needs` only: the roles that hold it, as the till wrote them; absent when only the owners do. */
  readonly holders?: string;
}

const isPermission = (text: string): text is OrganizationPermission =>
  (ORGANIZATION_PERMISSIONS as readonly string[]).includes(text);

export function readProblem(problems: readonly string[]): ReadProblem {
  for (const problem of problems) {
    const known = SENTENCES.get(problem);
    if (known !== undefined) return { key: known };
    if (ROLE_LIMIT.test(problem)) return { key: 'roleLimit' };
    const needs = NEEDS.exec(problem);
    if (needs !== null) {
      const [, act = '', holders] = needs;
      // An act only the owners hold has no label: it is the owners' own.
      if (!isPermission(act)) return { key: 'ownersOnly' };
      return holders === undefined ? { key: 'needs', act } : { key: 'needs', act, holders };
    }
  }
  return { key: 'other' };
}

/** Whether the wallet may do `act` here. Unknown access (null) shows the control: the till decides anyway. */
export function can(access: DeskAccess | null, act: OrganizationAccess): boolean {
  return access === null || access.permissions.includes(act);
}

/** The roles that hold `act`, in the language's own list («A, B y C»), or null when none or unknown. */
export function holdersOf(
  access: DeskAccess | null,
  act: OrganizationAccess,
  lang: string,
): string | null {
  const names = access?.holders[act] ?? [];
  return names.length === 0
    ? null
    : new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(names);
}

/** The two sentences a missing permission is told in (`{act}`, and `{holders}` in the first). */
export interface NeedsWords {
  readonly needs: string;
  readonly needsOwners: string;
}

/** «Para hacerlo hace falta «Invitar», que tienen …»: `act` is the permission's label in the page's language. */
export function needsSentence(words: NeedsWords, act: string, holders: string | null): string {
  return holders === null ? fill(words.needsOwners, { act }) : fill(words.needs, { act, holders });
}

// ---- Stripe in a new tab and the way back ----------------------------------

/** Where Stripe sends the buyer back: `/<locale>/saldo/vuelta/` on this origin. */
export const VUELTA_PATH = '/saldo/vuelta/';

export function vueltaBase(origin: string, locale: SupportedLocale): string {
  return `${origin}${localeHref(locale, VUELTA_PATH)}`;
}

/**
 * The address the new tab may be sent to: Stripe's own Checkout over https,
 * or a page of this very site (the fixture's way back). Anything else is
 * refused (null), so a wrong answer can never send the tab elsewhere.
 */
export function checkoutTarget(url: unknown, origin: string): string | null {
  if (typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol === 'https:' && parsed.hostname === 'checkout.stripe.com') {
    return parsed.href;
  }
  return parsed.origin === origin ? parsed.href : null;
}

/** What the way back was handed: Stripe's session id, or that the buyer cancelled. */
export interface VueltaParams {
  readonly sessionId: string | null;
  readonly cancelled: boolean;
}

const SESSION_ID = /^cs_[A-Za-z0-9_]{1,250}$/;

export function isCheckoutId(text: string): boolean {
  return SESSION_ID.test(text);
}

export function vueltaParams(search: string): VueltaParams {
  const query = new URLSearchParams(search);
  const id = query.get('session_id') ?? '';
  return {
    sessionId: isCheckoutId(id) ? id : null,
    cancelled: query.get('cancelled') === '1',
  };
}

// ---- Reading the API's answers in the browser (no zod in an island) --------

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAccount(value: unknown): value is DeskAccount {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    (value['kind'] === 'personal' || value['kind'] === 'team') &&
    (value['name'] === null || typeof value['name'] === 'string') &&
    typeof value['role'] === 'string' &&
    typeof value['balanceCents'] === 'number'
  );
}

/** GET /api/saldo: the accounts this wallet sees, or null when the body is not that. */
export function readOverview(json: unknown): DeskAccount[] | null {
  if (!isRecord(json) || !Array.isArray(json['accounts'])) return null;
  const accounts = json['accounts'] as unknown[];
  return accounts.every(isAccount) ? accounts : null;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function isWorld(value: unknown): value is DeskWorld {
  return (
    isRecord(value) &&
    typeof value['worldId'] === 'string' &&
    typeof value['size'] === 'string' &&
    isNumber(value['daysRunning']) &&
    isNumber(value['cents'])
  );
}

function isPace(value: unknown): value is DeskPace {
  return (
    isRecord(value) &&
    isNumber(value['sevenDaysCents']) &&
    isNumber(value['monthCents']) &&
    isNumber(value['monthWorlds'])
  );
}

function isTariff(value: unknown): value is DeskTariff {
  if (!isRecord(value) || typeof value['startsOn'] !== 'string') return false;
  const { sizes, rules } = value;
  return (
    isRecord(sizes) &&
    Object.values(sizes).every(
      (price) =>
        isRecord(price) &&
        isNumber(price['runningCentsPerDay']) &&
        isNumber(price['stoppedCentsPerDay']),
    ) &&
    isRecord(rules) &&
    isNumber(rules['keepDaysAtZero']) &&
    isNumber(rules['noticeDaysForRise'])
  );
}

/** GET /api/saldo/statement: the statement, or null when the body is not one. */
export function readStatement(json: unknown): DeskStatement | null {
  if (!isRecord(json) || !isRecord(json['statement'])) return null;
  const statement = json['statement'];
  if (!(
    isAccount(statement['account']) &&
    typeof statement['balanceCents'] === 'number' &&
    typeof statement['lowBalance'] === 'boolean' &&
    (statement['hasCosts'] === undefined || typeof statement['hasCosts'] === 'boolean') &&
    Array.isArray(statement['spend']) &&
    typeof statement['spendTotalCents'] === 'number' &&
    Array.isArray(statement['lines']) &&
    (statement['members'] === undefined || Array.isArray(statement['members']))
  )) {
    return null;
  }
  // What a till of the cut «el dinero» adds is read one field at a time: out of shape, it is dropped and the rest kept.
  const { worlds, pace, tariff, ...rest } = statement;
  return {
    ...(rest as unknown as DeskStatement),
    ...(Array.isArray(worlds) && worlds.every(isWorld) ? { worlds } : {}),
    ...(isPace(pace) ? { pace } : {}),
    ...(isTariff(tariff) ? { tariff } : {}),
  };
}

/** GET /api/saldo/statement also names who is asking (to mark «tú» among the members). */
export function readYou(json: unknown): string | null {
  return isRecord(json) && typeof json['you'] === 'string' ? json['you'] : null;
}

/** GET /api/saldo/statement carries the wallet's access to an organization; null for a personal account or when unread. */
export function readAccess(json: unknown): DeskAccess | null {
  if (!isRecord(json) || !isRecord(json['access'])) return null;
  const access = json['access'];
  const holders = access['holders'];
  return (access['as'] === 'owner' || access['as'] === 'house' || access['as'] === 'member') &&
    Array.isArray(access['permissions']) &&
    isRecord(holders)
    ? {
        as: access['as'],
        permissions: (access['permissions'] as unknown[]).map(String) as OrganizationAccess[],
        holders: holders as DeskAccess['holders'],
      }
    : null;
}

/** What a POST answered: the desk's own `{ ok, … }`, or null when the body is not one. */
export type PostResult = { readonly ok: true; readonly [key: string]: unknown } | DeskRefusal;

export function readResult(json: unknown): PostResult | null {
  if (!isRecord(json) || !isRecord(json['result'])) return null;
  const result = json['result'];
  if (result['ok'] === true) return result as PostResult;
  if (result['ok'] === false && Array.isArray(result['problems'])) {
    return { ok: false, problems: (result['problems'] as unknown[]).map(String) };
  }
  return null;
}

// ---- Members and roles: reading the API's answers, and the little rules the screen needs ----

function isRole(value: unknown): value is DeskRole {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    (value['color'] === null || typeof value['color'] === 'string') &&
    typeof value['position'] === 'number' &&
    typeof value['hoist'] === 'boolean' &&
    Array.isArray(value['permissions']) &&
    typeof value['members'] === 'number' &&
    typeof value['mayEdit'] === 'boolean'
  );
}

function isMemberDetail(value: unknown): value is DeskMemberDetail {
  return (
    isRecord(value) &&
    typeof value['wallet'] === 'string' &&
    typeof value['owner'] === 'boolean' &&
    typeof value['addedAt'] === 'string' &&
    Array.isArray(value['roleIds']) &&
    Array.isArray(value['assignable'])
  );
}

/** An organization as the desk answers it (a GET's `roles`, a POST's `result`), or null when it is not one. */
export function readRolesView(value: unknown): DeskRoles | null {
  if (!isRecord(value) || value['ok'] !== true) return null;
  const { accountId, as, roles, members } = value;
  return typeof accountId === 'string' &&
    (as === 'owner' || as === 'house' || as === 'member') &&
    Array.isArray(roles) &&
    roles.every(isRole) &&
    Array.isArray(members) &&
    members.every(isMemberDetail)
    ? (value as unknown as DeskRoles)
    : null;
}

/** GET /api/saldo/roles: the organization and who is asking, or null when the body is not that. */
export function readRoles(json: unknown): { roles: DeskRoles; you: string | null } | null {
  if (!isRecord(json)) return null;
  const roles = readRolesView(json['roles']);
  return roles === null ? null : { roles, you: readYou(json) };
}

/** GET /api/saldo/log: the changes, newest first, or null when the body is not that. */
export function readLog(json: unknown): DeskLogLine[] | null {
  if (!isRecord(json) || !isRecord(json['log'])) return null;
  const lines = json['log']['lines'];
  return Array.isArray(lines) &&
    lines.every(
      (line) =>
        isRecord(line) &&
        typeof line['seq'] === 'number' &&
        typeof line['at'] === 'string' &&
        typeof line['actor'] === 'string' &&
        typeof line['act'] === 'string' &&
        (line['subject'] === null || typeof line['subject'] === 'string'),
    )
    ? (lines as DeskLogLine[])
    : null;
}

/** GET /api/saldo/settings: the settings of the organization, or null when the body is not that. */
export function readSettings(json: unknown): DeskSettings | null {
  if (!isRecord(json) || !isRecord(json['settings'])) return null;
  const { accountId, off, vocabulary, mayEdit } = json['settings'];
  return typeof accountId === 'string' &&
    Array.isArray(off) &&
    off.every((piece) => typeof piece === 'string') &&
    isVocabulary(vocabulary) &&
    typeof mayEdit === 'boolean'
    ? { ok: true, accountId, off: off as string[], vocabulary, mayEdit }
    : null;
}

/** GET /api/saldo/happened: a page of «Qué ha pasado», or null when the body is not that. */
export function readHappenings(json: unknown): { lines: DeskHappening[]; more: boolean } | null {
  if (!isRecord(json) || !isRecord(json['happened'])) return null;
  const { lines, more } = json['happened'];
  return typeof more === 'boolean' &&
    Array.isArray(lines) &&
    lines.every(
      (line) =>
        isRecord(line) &&
        typeof line['seq'] === 'number' &&
        typeof line['at'] === 'string' &&
        typeof line['actor'] === 'string' &&
        typeof line['act'] === 'string' &&
        typeof line['asHouse'] === 'boolean' &&
        (line['subject'] === null || typeof line['subject'] === 'string') &&
        (line['actorName'] === null || typeof line['actorName'] === 'string'),
    )
    ? { lines: lines as DeskHappening[], more }
    : null;
}

/** Whether giving this permission asks for a fresh wallet signature (ORG-008): the screen says so beside it. */
export function needsSignature(permission: OrganizationPermission): boolean {
  return needsFreshSignature({ kind: 'grant', permissions: [permission] });
}

/** What /api/saldo/signature answers: the sentence the wallet signs and the token that brings it back. */
export interface FreshSign {
  readonly message: string;
  readonly token: string;
}

/** POST /api/saldo/signature: the sentence and its token, or null when the body is not that. */
export function readSign(json: unknown): FreshSign | null {
  if (!isRecord(json) || !isRecord(json['sign'])) return null;
  const { message, token } = json['sign'];
  return typeof message === 'string' &&
    message.length > 0 &&
    typeof token === 'string' &&
    token.length > 0
    ? { message, token }
    : null;
}

/**
 * The place a role moves to one step up (+1) or down (-1), or null at the
 * end of the list. Places run 1..n for the roles above the base role (0).
 */
export function stepPosition(
  roles: readonly DeskRole[],
  role: DeskRole,
  step: 1 | -1,
): number | null {
  const top = roles.filter((entry) => entry.position > 0).length;
  const to = role.position + step;
  return to >= 1 && to <= top ? to : null;
}

// ---- «Tu nombre y tu cara» (2026-10-16, STD-053): one's own name and Bazar avatar ----

/** What the till keeps of a person who published: the name, a Bazar avatar's id or none, and when. */
export interface DeskProfile {
  name: string;
  avatar: string | null;
  updatedAt: string;
}

/** One's own profile, or null while nothing is published. */
export type DeskProfileAnswer = { ok: true; profile: DeskProfile | null } | DeskRefusal;

/** `{ name, avatar }` publishes or replaces them; null stops showing them — the till deletes the row. */
export type DeskProfileChange = { name: string; avatar: string | null } | null;

/** One's own profile as GET and POST /api/profile answer it: the avatar's id (it is yours) and its face. */
export interface OwnProfile {
  readonly name: string;
  readonly avatar: string | null;
  readonly face: string | null;
}

const isTextOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

/**
 * GET or POST /api/profile, read in the browser: `{ profile }` — the three
 * fields it knows, or null when nothing is published — or null when the
 * body is not that.
 */
export function readOwnProfile(json: unknown): { readonly profile: OwnProfile | null } | null {
  if (!isRecord(json) || json['ok'] !== true || !('profile' in json)) return null;
  const { profile } = json;
  if (profile === null) return { profile: null };
  if (!isRecord(profile)) return null;
  const { name, avatar, face } = profile;
  return typeof name === 'string' && isTextOrNull(avatar) && isTextOrNull(face)
    ? { profile: { name, avatar, face } }
    : null;
}

// ---- «El censo» (2026-10-16, STD-053): who has signed in, for the house alone ----

/** One person of the till's list: when they came first and last, what they published, how many organizations. */
export interface DeskCitizen {
  wallet: string;
  firstSeenAt: string;
  lastSeenAt: string;
  /** The name they published; absent, with the avatar, when none. */
  name?: string;
  /** The Bazar avatar's id: the store turns it into `face` and never hands it on. */
  avatar?: string | null;
  organizations: number;
}

export type DeskCitizensAnswer =
  { ok: true; people: DeskCitizen[]; total: number; next: string | null } | DeskRefusal;

export type DeskSignedInAnswer = { ok: true } | DeskRefusal;

/** One person as /api/admin/citizens answers the browser: a face path, never an avatar id. */
export interface Citizen {
  readonly wallet: string;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly name: string | null;
  readonly face: string | null;
  readonly organizations: number;
}

/** A page of the list as the browser reads it. */
export interface CitizensPage {
  readonly people: readonly Citizen[];
  readonly total: number;
  readonly next: string | null;
}

function readCitizen(value: unknown): Citizen | null {
  if (!isRecord(value)) return null;
  const { wallet, firstSeenAt, lastSeenAt, name, face, organizations } = value;
  return typeof wallet === 'string' &&
    typeof firstSeenAt === 'string' &&
    typeof lastSeenAt === 'string' &&
    isTextOrNull(name) &&
    isTextOrNull(face) &&
    typeof organizations === 'number'
    ? { wallet, firstSeenAt, lastSeenAt, name, face, organizations }
    : null;
}

/**
 * GET /api/admin/citizens, read in the browser: the page of people — the
 * fields it knows and no other —, the total and the next cursor; or null
 * when the body is not that.
 */
export function readCitizens(json: unknown): CitizensPage | null {
  if (!isRecord(json) || json['ok'] !== true) return null;
  const { people, total, next } = json;
  if (!Array.isArray(people) || typeof total !== 'number' || !isTextOrNull(next)) return null;
  const read = people.map(readCitizen);
  return read.every((person): person is Citizen => person !== null)
    ? { people: read, total, next }
    : null;
}

// ---- «Mundos ↔ organizaciones» (2026-10-16): which organization each world belongs to ----

/** Where one world stands: its organization, by name, and since when. */
export interface DeskHome {
  worldId: string;
  accountId: string;
  accountName: string;
  placedAt: string;
}

/** The till account of a community: its id and name, and whether this very call opened it. */
export type DeskEnsureAnswer =
  { ok: true; account: { id: string; name: string; created: boolean } } | DeskRefusal;

/** Every community's account after the house opened them all, in the order asked. */
export type DeskOpenAllAnswer =
  { ok: true; accounts: { id: string; name: string; created: boolean }[] } | DeskRefusal;

export type DeskPlaceAnswer = { ok: true; placed: number } | DeskRefusal;

export type DeskPlacementsAnswer = { ok: true; homes: DeskHome[] } | DeskRefusal;

export type DeskWorldsOfAnswer =
  { ok: true; worlds: { worldId: string; accountId: string }[] } | DeskRefusal;

export type DeskHomeOfAnswer =
  | {
      ok: true;
      home: { accountId: string; accountName: string; placedAt: string } | null;
      /** The caller is a member or owner of the home organization, or the house. */
      manage: boolean;
    }
  | DeskRefusal;
