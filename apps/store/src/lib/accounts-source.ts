/**
 * «Saldo»'s door to the till. Server only — no island imports it, so it may
 * use zod. Mirror of lib/prices-source.ts.
 *
 * Trust model. The till (apps/till, Worker `numinia-till`) is reachable
 * from nowhere but this Worker's service binding `TILL_ACCOUNTS` (root
 * wrangler.jsonc), bound to its named RPC entrypoint `AccountDesk`: an RPC
 * entrypoint has no URL, so the desk cannot be reached from the internet.
 * The API routes read the SESSION first — our own signed cookie, any rank —
 * and pass the session's wallet, lowercased, as the first argument of every
 * call. The till trusts its one bound caller for WHO and decides itself
 * WHAT that wallet may do (membership), re-validating every field. Neither
 * of us trusts a browser: what it sends is checked for shape before the
 * till sees it, what the till answers is checked before the browser sees
 * it, and the way back from Stripe is built here from the request's own
 * origin, never taken from the body. Logs name rules, never wallets or
 * amounts.
 *
 * The house (STD-051 ORG-007, «la casa entra», QA 2026-10-15): during the
 * alpha the house is the Oracles. The routes resolve an `Asker` — the
 * session's wallet and whether its rank is Oracle (lib/auth/session-wallet.ts)
 * — once per request, and every call on an organization carries that flag
 * as its last argument, so the till lets the house into organizations it is
 * not in and writes down what it does there (ORG-009). Nothing of the
 * browser's can set it: a body is read by strict shapes, which refuse a
 * `house` of its own, and a query is only read for the keys named here.
 * Only an Oracle's session ever asks the till's directory.
 *
 * What is dangerous is signed again (STD-051, ORG-008): an act that gives
 * «Administrator» or «Manage roles» reaches the till only with a fresh
 * signature of the session's wallet over the lines /api/saldo/signature
 * wrote for that very act (lib/fresh-signature.ts). Without one the act is
 * answered FRESH_SIGNATURE and the screen asks the wallet; the till itself
 * stays as it was.
 */

import { z } from 'zod';
import {
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_PERMISSION_LABELS,
  SUPPORTED_LOCALES,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import deskSeed from '../../fixtures/accounts/desk.json';
import homesSeed from '../../fixtures/worlds/homes.json';
import { FRESH_SIGNATURE_WORDS } from '../i18n/fresh-signature';
import {
  DESK_METHODS,
  NOT_HOUSE_CENSUS,
  NOT_IMPLEMENTED,
  OPTIONAL_DESK_METHODS,
  SPEND_RANGES,
  TOPUP_KEYS,
  FRESH_SIGNATURE,
  SIGNATURE_EXPIRED,
  SIGNATURE_MISMATCH,
  checkoutTarget,
  isSpendRange,
  needsSignature,
  shortWallet,
  vueltaBase,
  type AccountDesk,
  type Asker,
  type Citizen,
  type DeskAccount,
  type DeskMemberDetail,
  type DeskProfileChange,
  type DeskRoleChange,
  type DeskRoleDraft,
  type OwnProfile,
  type SpendRange,
} from './accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from './accounts-fixture';
import {
  FRESH_TTL_MS,
  actDigest,
  checkFresh,
  freshMessage,
  issueFreshToken,
  type FreshAct,
  type FreshDeps,
  type FreshProof,
} from './fresh-signature';
import { peopleOf } from './people';
import { SWITCHABLE_PIECES, VOCABULARIES } from './panel-settings';
import { isProfileAvatar } from './profile-avatars';
import { PROFILE_AVATAR_PROBLEM } from './profile-name';
import { logEvent } from './telemetry';
import { faceSrc } from './thumbs';

/** What a binding without an optional method answers instead: workerd's own words. */
const absent = (method: string): Promise<never> =>
  Promise.reject(new TypeError(`The desk ${NOT_IMPLEMENTED} "${method}".`));

/** The desk read off whatever workerd bound: its methods (the optional ones may be missing), or null when it is not a desk. */
export function boundAccounts(binding: unknown): AccountDesk | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<keyof AccountDesk, unknown>>;
  const present = (method: (typeof DESK_METHODS)[number]): boolean =>
    OPTIONAL_DESK_METHODS.includes(method) || typeof desk[method] === 'function';
  if (!DESK_METHODS.every(present)) return null;
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as AccountDesk;
  return {
    overview: (wallet) => stub.overview(wallet),
    directory: (wallet, house) => stub.directory(wallet, house),
    createTeam: (wallet, name) => stub.createTeam(wallet, name),
    renameTeam: (wallet, accountId, name, house) => stub.renameTeam(wallet, accountId, name, house),
    statement: (wallet, accountId, range, house) => stub.statement(wallet, accountId, range, house),
    members: (wallet, accountId, house) => stub.members(wallet, accountId, house),
    access: (wallet, accountId, house) => stub.access(wallet, accountId, house),
    setMember: (wallet, accountId, member, role, house) =>
      stub.setMember(wallet, accountId, member, role, house),
    removeMember: (wallet, accountId, member, house) =>
      stub.removeMember(wallet, accountId, member, house),
    roles: (wallet, accountId, house) => stub.roles(wallet, accountId, house),
    headcount: (accountId) => stub.headcount(accountId),
    createRole: (wallet, accountId, role, house) => stub.createRole(wallet, accountId, role, house),
    editRole: (wallet, accountId, roleId, change, house) =>
      stub.editRole(wallet, accountId, roleId, change, house),
    moveRole: (wallet, accountId, roleId, position, house) =>
      stub.moveRole(wallet, accountId, roleId, position, house),
    deleteRole: (wallet, accountId, roleId, house) =>
      stub.deleteRole(wallet, accountId, roleId, house),
    giveRole: (wallet, accountId, member, roleId, house) =>
      stub.giveRole(wallet, accountId, member, roleId, house),
    takeRole: (wallet, accountId, member, roleId, house) =>
      stub.takeRole(wallet, accountId, member, roleId, house),
    log: (wallet, accountId, house) => stub.log(wallet, accountId, house),
    startTopup: (wallet, accountId, key, returnBase, house) =>
      stub.startTopup(wallet, accountId, key, returnBase, house),
    confirmTopup: (wallet, sessionId) => stub.confirmTopup(wallet, sessionId),
    // «Tu nombre y tu cara»: optional (OPTIONAL_DESK_METHODS). A binding without them
    // answers as workerd does for a till older than the method, so /api/profile says 503.
    profile: (wallet) =>
      typeof desk.profile === 'function' ? stub.profile(wallet) : absent('profile'),
    setProfile: (wallet, change) =>
      typeof desk.setProfile === 'function'
        ? stub.setProfile(wallet, change)
        : absent('setProfile'),
    // «El censo»: optional too. Without them a sign-in records nothing and
    // /api/admin/citizens says 503.
    signedIn: (wallet) =>
      typeof desk.signedIn === 'function' ? stub.signedIn(wallet) : absent('signedIn'),
    citizens: (wallet, house, query, cursor) =>
      typeof desk.citizens === 'function'
        ? stub.citizens(wallet, house, query, cursor)
        : absent('citizens'),
    // «Mundos ↔ organizaciones»: optional too. Without them the world routes say 503.
    placeWorld: (wallet, house, worldIds, accountId) =>
      typeof desk.placeWorld === 'function'
        ? stub.placeWorld(wallet, house, worldIds, accountId)
        : absent('placeWorld'),
    placements: (wallet, house) =>
      typeof desk.placements === 'function' ? stub.placements(wallet, house) : absent('placements'),
    worldsOf: (wallet, house, accountId) =>
      typeof desk.worldsOf === 'function'
        ? stub.worldsOf(wallet, house, accountId)
        : absent('worldsOf'),
    homeOf: (worldId, wallet, house) =>
      typeof desk.homeOf === 'function' ? stub.homeOf(worldId, wallet, house) : absent('homeOf'),
    // Card t_a856c570 (2026-10-18): optional too. Without them the rename routes say 503.
    renameWorld: (wallet, house, worldId, name) =>
      typeof desk.renameWorld === 'function'
        ? stub.renameWorld(wallet, house, worldId, name)
        : absent('renameWorld'),
    worldNames: (wallet, house) =>
      typeof desk.worldNames === 'function' ? stub.worldNames(wallet, house) : absent('worldNames'),
    // «Una comunidad ES una organización»: optional too. Without it the community route says 503.
    ensureCommunityTeam: (wallet, house, communityId, name) =>
      typeof desk.ensureCommunityTeam === 'function'
        ? stub.ensureCommunityTeam(wallet, house, communityId, name)
        : absent('ensureCommunityTeam'),
    // «Ajustes de la comunidad»: optional too. Without them the panel keeps its defaults.
    settings: (wallet, accountId, house) =>
      typeof desk.settings === 'function'
        ? stub.settings(wallet, accountId, house)
        : absent('settings'),
    changeSettings: (wallet, accountId, change, house) =>
      typeof desk.changeSettings === 'function'
        ? stub.changeSettings(wallet, accountId, change, house)
        : absent('changeSettings'),
    happenings: (wallet, accountId, before, house) =>
      typeof desk.happenings === 'function'
        ? stub.happenings(wallet, accountId, before, house)
        : absent('happenings'),
    // Cut 7: the house opens every community at once. Optional too: 503 without it.
    openAllCommunities: (wallet, house, communities) =>
      typeof desk.openAllCommunities === 'function'
        ? stub.openAllCommunities(wallet, house, communities)
        : absent('openAllCommunities'),
    // «IAs de organización»: optional too. Without them the agents routes and the pass say 503.
    agents: (wallet, accountId, house) =>
      typeof desk.agents === 'function' ? stub.agents(wallet, accountId, house) : absent('agents'),
    createAgent: (wallet, accountId, agent, house) =>
      typeof desk.createAgent === 'function'
        ? stub.createAgent(wallet, accountId, agent, house)
        : absent('createAgent'),
    changeAgent: (wallet, accountId, agentId, change, house) =>
      typeof desk.changeAgent === 'function'
        ? stub.changeAgent(wallet, accountId, agentId, change, house)
        : absent('changeAgent'),
    renewAgentToken: (wallet, accountId, agentId, tokenHash, tokenPrefix, house, via) =>
      typeof desk.renewAgentToken === 'function'
        ? stub.renewAgentToken(wallet, accountId, agentId, tokenHash, tokenPrefix, house, via)
        : absent('renewAgentToken'),
    revokeAgentToken: (wallet, accountId, agentId, house) =>
      typeof desk.revokeAgentToken === 'function'
        ? stub.revokeAgentToken(wallet, accountId, agentId, house)
        : absent('revokeAgentToken'),
    removeAgent: (wallet, accountId, agentId, house) =>
      typeof desk.removeAgent === 'function'
        ? stub.removeAgent(wallet, accountId, agentId, house)
        : absent('removeAgent'),
    giveAgentRole: (wallet, accountId, agentId, roleId, house) =>
      typeof desk.giveAgentRole === 'function'
        ? stub.giveAgentRole(wallet, accountId, agentId, roleId, house)
        : absent('giveAgentRole'),
    takeAgentRole: (wallet, accountId, agentId, roleId, house) =>
      typeof desk.takeAgentRole === 'function'
        ? stub.takeAgentRole(wallet, accountId, agentId, roleId, house)
        : absent('takeAgentRole'),
    agentPass: (accountId, agentId) =>
      typeof desk.agentPass === 'function'
        ? stub.agentPass(accountId, agentId)
        : absent('agentPass'),
    claimAgentPass: (accountId, agentId, aud, t) =>
      typeof desk.claimAgentPass === 'function'
        ? stub.claimAgentPass(accountId, agentId, aud, t)
        : absent('claimAgentPass'),
    // «MCP remoto» (W2): an agent's worlds in one query, and the agent a token belongs to.
    agentWorlds: (accountId, agentId) =>
      typeof desk.agentWorlds === 'function'
        ? stub.agentWorlds(accountId, agentId)
        : absent('agentWorlds'),
    agentByToken: (tokenHash) =>
      typeof desk.agentByToken === 'function'
        ? stub.agentByToken(tokenHash)
        : absent('agentByToken'),
    // «Hazla tuya» for real (cut G): optional too. Without them the request routes say 503.
    requestCommunity: (wallet, communityId, kind, note) =>
      typeof desk.requestCommunity === 'function'
        ? stub.requestCommunity(wallet, communityId, kind, note)
        : absent('requestCommunity'),
    myCommunityRequests: (wallet, communityId) =>
      typeof desk.myCommunityRequests === 'function'
        ? stub.myCommunityRequests(wallet, communityId)
        : absent('myCommunityRequests'),
    communityRequests: (wallet, house, communityId) =>
      typeof desk.communityRequests === 'function'
        ? stub.communityRequests(wallet, house, communityId)
        : absent('communityRequests'),
    decideCommunityRequest: (wallet, requestId, accept, house, name) =>
      typeof desk.decideCommunityRequest === 'function'
        ? stub.decideCommunityRequest(wallet, requestId, accept, house, name)
        : absent('decideCommunityRequest'),
    // «Crear → Un encuentro» for real (cut M): optional too. Without them the ritual routes say 503.
    createRitual: (wallet, draft, house) =>
      typeof desk.createRitual === 'function'
        ? stub.createRitual(wallet, draft, house)
        : absent('createRitual'),
    cancelRitual: (wallet, ritualId, house) =>
      typeof desk.cancelRitual === 'function'
        ? stub.cancelRitual(wallet, ritualId, house)
        : absent('cancelRitual'),
    ritualsOf: (communityIds, upcoming) =>
      typeof desk.ritualsOf === 'function'
        ? stub.ritualsOf(communityIds, upcoming)
        : absent('ritualsOf'),
    ritual: (ritualId) =>
      typeof desk.ritual === 'function' ? stub.ritual(ritualId) : absent('ritual'),
    // Card t_371c917d (2026-10-18): optional too. Without them the fields routes say 503.
    editCommunityFields: (wallet, house, communityId, fields) =>
      typeof desk.editCommunityFields === 'function'
        ? stub.editCommunityFields(wallet, house, communityId, fields)
        : absent('editCommunityFields'),
    communityFields: (communityId) =>
      typeof desk.communityFields === 'function'
        ? stub.communityFields(communityId)
        : absent('communityFields'),
  };
}

let fixture: AccountDesk | null = null;

/** The fixture desk, one per server process, so a top-up stays until it stops. */
export function fixtureAccounts(): AccountDesk {
  fixture ??= createAccountsFixtureDesk({
    ...(deskSeed as unknown as AccountsSeed),
    // «Mundos ↔ organizaciones»: where the fleet's worlds belong when the build is a fixture.
    homes: (homesSeed as unknown as Pick<AccountsSeed, 'homes'>).homes,
  });
  return fixture;
}

/** Test seam: a fresh fixture desk for the next scenario. */
export function resetFixtureAccountsForTests(): void {
  fixture = null;
}

export interface AccountsEnv {
  /** What workerd bound as TILL_ACCOUNTS (runtimeBinding). */
  readonly binding: unknown;
  /** DATA_SOURCE, frozen at build: `fixture` in CI, acceptance and screenshots. */
  readonly dataSource: string | undefined;
}

/**
 * The desk to ask: the bound till first, then the fixture desk when the
 * build reads fixtures, else null — the routes answer 503 `not-bound`.
 */
export function accountsFrom(env: AccountsEnv): AccountDesk | null {
  return boundAccounts(env.binding) ?? (env.dataSource === 'fixture' ? fixtureAccounts() : null);
}

// ---- Shapes (built on first use, never at import) ---------------------------

/**
 * Bytes a POST may carry: an action and a few short fields, plus the fresh
 * signature some acts carry — its token holds the signed lines, and a smart
 * account's signature (ERC-6492) runs to a few kilobytes.
 */
export const MAX_BODY_BYTES = 8_192;
const ID_MAX = 100;
/** A name as typed, before the till trims and counts it (60 characters): bounded, never judged here. */
const PROFILE_TEXT_MAX = 1_000;
/** A fresh signature's token: its claims hold the signed lines, in any of the five languages. */
const TOKEN_MAX = 4_096;
/** A signature in hex: 132 characters from an ordinary wallet, more from a smart account. */
const SIGNATURE_MAX = 6_000;

function buildSchemas() {
  const id = z.string().min(1).max(ID_MAX);
  // A wallet in the browser's own case; the till wants it lowercase.
  const wallet = z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, 'a wallet is 0x and 40 hex digits')
    .transform((text) => text.toLowerCase());
  const role = z.enum(['admin', 'member']);
  // The name's real rule (1 to 60 characters, trimmed) is the till's to judge.
  const name = z.string().max(200);
  const roleId = z.string().regex(/^role_[0-9a-f]{16}$/, 'a role id');
  const permission = z.enum(ORGANIZATION_PERMISSIONS);
  const color = z.string().regex(/^#[0-9a-f]{6}$/, '#rrggbb in lower case');
  // A role's name rules (1 to 100, no control characters) are the till's to judge.
  const roleName = z.string().max(400);
  const draft = z
    .object({
      name: roleName,
      color: color.nullable(),
      hoist: z.boolean(),
      permissions: z.array(permission).max(ORGANIZATION_PERMISSIONS.length),
    })
    .strict();
  const change = z
    .object({
      name: roleName.optional(),
      color: color.nullable().optional(),
      hoist: z.boolean().optional(),
      permissions: z.array(permission).max(ORGANIZATION_PERMISSIONS.length).optional(),
    })
    .strict();
  const request = z.discriminatedUnion('action', [
    z
      .object({
        action: z.literal('topup'),
        accountId: id,
        amount: z.enum(TOPUP_KEYS as readonly ['10', '50', '100']),
        locale: z.enum(SUPPORTED_LOCALES),
      })
      .strict(),
    z
      .object({
        action: z.literal('confirm'),
        sessionId: z.string().regex(/^cs_[A-Za-z0-9_]{1,250}$/),
      })
      .strict(),
    z.object({ action: z.literal('create-team'), name }).strict(),
    z.object({ action: z.literal('rename'), accountId: id, name }).strict(),
    z.object({ action: z.literal('set-member'), accountId: id, wallet, role }).strict(),
    z.object({ action: z.literal('remove-member'), accountId: id, wallet }).strict(),
    z.object({ action: z.literal('create-role'), accountId: id, role: draft }).strict(),
    z.object({ action: z.literal('edit-role'), accountId: id, roleId, change }).strict(),
    z
      .object({
        action: z.literal('move-role'),
        accountId: id,
        roleId,
        position: z.number().int().min(1).max(1000),
      })
      .strict(),
    z.object({ action: z.literal('delete-role'), accountId: id, roleId }).strict(),
    z.object({ action: z.literal('give-role'), accountId: id, wallet, roleId }).strict(),
    z.object({ action: z.literal('take-role'), accountId: id, wallet, roleId }).strict(),
  ]);
  // A fresh signature, carried apart from the act it signs (`fresh`).
  const proof = z
    .object({
      token: z.string().min(1).max(TOKEN_MAX),
      signature: z
        .string()
        .max(SIGNATURE_MAX)
        .regex(/^0x[0-9a-fA-F]+$/, 'a signature is 0x and hex digits'),
    })
    .strict();

  // The till's answers: extra fields are dropped, missing or mistyped ones refused.
  const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
  const account = z.object({
    id: z.string(),
    kind: z.enum(['personal', 'team']),
    name: z.string().nullable(),
    role: z.enum(['owner', 'admin', 'member']),
    balanceCents: z.number(),
    // Only the house’s entries carry a mark, and only this one: any other is out of shape.
    as: z.literal('house').optional(),
  });
  const member = z.object({ wallet: z.string(), role, addedAt: z.string() });
  const line = z.object({
    kind: z.enum(['topup', 'world_day', 'adjustment', 'refund', 'chargeback']),
    at: z.string(),
    amountCents: z.number(),
    vatCents: z.number().nullish(),
    day: z.string().nullish(),
    worldId: z.string().nullish(),
    size: z.string().nullish(),
    // A world's day, from a till of the cut «el dinero»: optional, as an older till sends none.
    minutesRunning: z.number().nullish(),
    minutesStopped: z.number().nullish(),
    reason: z.string().nullish(),
  });
  const overview = z.union([z.object({ accounts: z.array(account) }), refusal]);
  // The house's directory: an id, a team and a name per organization — no money, no people.
  const directory = z.union([
    z.object({
      ok: z.literal(true),
      accounts: z.array(z.object({ id: z.string(), kind: z.literal('team'), name: z.string() })),
    }),
    refusal,
  ]);
  const statement = z.union([
    z.object({
      account,
      balanceCents: z.number(),
      lowBalance: z.boolean(),
      hasCosts: z.boolean().optional(),
      lots: z.array(
        z.object({
          lineId: z.string(),
          at: z.string(),
          amountCents: z.number(),
          remainderCents: z.number(),
        }),
      ),
      spend: z.array(
        z.object({
          bucket: z.string(),
          cents: z.number(),
          runningCents: z.number().optional(),
          stoppedCents: z.number().optional(),
        }),
      ),
      spendTotalCents: z.number(),
      lines: z.array(line),
      members: z.array(member).optional(),
      // What a till of the cut «el dinero» adds; each optional, as the store
      // deploys apart from the till and an older one sends none of it.
      worlds: z
        .array(
          z.object({
            worldId: z.string(),
            size: z.string(),
            daysRunning: z.number(),
            cents: z.number(),
          }),
        )
        .optional(),
      pace: z
        .object({ sevenDaysCents: z.number(), monthCents: z.number(), monthWorlds: z.number() })
        .optional(),
      tariff: z
        .object({
          startsOn: z.string(),
          sizes: z.record(
            z.string(),
            z.object({ runningCentsPerDay: z.number(), stoppedCentsPerDay: z.number() }),
          ),
          rules: z.object({ keepDaysAtZero: z.number(), noticeDaysForRise: z.number() }),
        })
        .optional(),
    }),
    refusal,
  ]);
  const team = z.union([z.object({ ok: z.literal(true), account }), refusal]);
  const members = z.union([
    z.object({ ok: z.literal(true), members: z.array(member).optional() }),
    refusal,
  ]);
  const access = z.union([
    z.object({
      ok: z.literal(true),
      as: z.enum(['owner', 'house', 'member']),
      permissions: z.array(z.string()),
      holders: z.record(z.string(), z.array(z.string())),
    }),
    refusal,
  ]);
  const roleDetail = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    position: z.number(),
    hoist: z.boolean(),
    permissions: z.array(permission),
    members: z.number(),
    mayEdit: z.boolean(),
  });
  const memberDetail = z
    .object({
      wallet: z.string(),
      owner: z.boolean(),
      addedAt: z.string(),
      roleIds: z.array(z.string()),
      assignable: z.array(z.string()),
      // «Tu nombre y tu cara» (STD-053): what the member published, absent when nothing.
      name: z.string().optional(),
      avatar: z.string().nullable().optional(),
    })
    // The avatar's id never travels on: a browser gets its baked thumbnail, or null.
    .transform(({ name, avatar, ...member }): DeskMemberDetail =>
      name === undefined
        ? member
        : { ...member, name, face: avatar == null ? null : faceSrc(avatar) },
    );
  const roles = z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      as: z.enum(['owner', 'house', 'member']),
      roles: z.array(roleDetail),
      members: z.array(memberDetail),
    }),
    refusal,
  ]);
  const headcount = z.union([
    z.object({ ok: z.literal(true), accountId: z.string(), members: z.number().int().min(0) }),
    refusal,
  ]);
  const logLine = z.object({
    seq: z.number(),
    at: z.string(),
    actor: z.string(),
    asHouse: z.boolean(),
    act: z.string(),
    subject: z.string().nullable(),
    detail: z.record(z.string(), z.string()).nullable(),
  });
  const log = z.union([
    z.object({ ok: z.literal(true), accountId: z.string(), lines: z.array(logLine) }),
    refusal,
  ]);
  const topup = z.union([z.object({ ok: z.literal(true), url: z.string() }), refusal]);
  const confirm = z.union([
    z.object({
      ok: z.literal(true),
      state: z.enum(['paid', 'open', 'expired']),
      accountId: z.string(),
      balanceCents: z.number(),
    }),
    refusal,
  ]);
  // «Tu nombre y tu cara»: the till's answer for one's own profile, and what the browser may send.
  const profile = z.union([
    z.object({
      ok: z.literal(true),
      profile: z
        .object({ name: z.string(), avatar: z.string().nullable(), updatedAt: z.string() })
        .nullable(),
    }),
    refusal,
  ]);
  // «El censo»: the till's list of who has signed in; each avatar leaves as its baked face.
  const citizens = z.union([
    z.object({
      ok: z.literal(true),
      people: z.array(
        z
          .object({
            wallet: z.string(),
            firstSeenAt: z.string(),
            lastSeenAt: z.string(),
            name: z.string().optional(),
            avatar: z.string().nullable().optional(),
            organizations: z.number().int().nonnegative(),
          })
          .transform(({ name, avatar, ...person }): Citizen => ({
            ...person,
            name: name ?? null,
            face: name === undefined || avatar == null ? null : faceSrc(avatar),
          })),
      ),
      total: z.number().int().nonnegative(),
      next: z.string().nullable(),
    }),
    refusal,
  ]);
  const settings = z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      off: z.array(z.string()),
      vocabulary: z.enum(VOCABULARIES),
      mayEdit: z.boolean(),
      aiAgent: z.object({
        enabled: z.boolean(),
        model: z.string(),
        trialCapCents: z.number(),
        spentCents: z.number(),
      }),
    }),
    refusal,
  ]);
  const happenings = z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      lines: z.array(logLine.extend({ actorName: z.string().nullable() })),
      more: z.boolean(),
    }),
    refusal,
  ]);
  const settingsRequest = z
    .object({
      accountId: id,
      off: z.array(z.enum(SWITCHABLE_PIECES)).max(SWITCHABLE_PIECES.length).optional(),
      vocabulary: z.enum(VOCABULARIES).optional(),
      aiAgentEnabled: z.boolean().optional(),
    })
    .strict();
  const profileRequest = z.union([
    z
      .object({ name: z.string().max(PROFILE_TEXT_MAX), avatar: z.string().max(ID_MAX).nullable() })
      .strict(),
    z.object({ remove: z.literal(true) }).strict(),
  ]);
  return {
    request,
    proof,
    overview,
    directory,
    statement,
    team,
    members,
    access,
    roles,
    headcount,
    log,
    topup,
    confirm,
    profile,
    profileRequest,
    citizens,
    settings,
    happenings,
    settingsRequest,
  };
}

let schemas: ReturnType<typeof buildSchemas> | null = null;
function shapes(): ReturnType<typeof buildSchemas> {
  schemas ??= buildSchemas();
  return schemas;
}

export type SaldoRequest =
  | {
      readonly action: 'topup';
      readonly accountId: string;
      readonly amount: '10' | '50' | '100';
      readonly locale: SupportedLocale;
    }
  | { readonly action: 'confirm'; readonly sessionId: string }
  | { readonly action: 'create-team'; readonly name: string }
  | { readonly action: 'rename'; readonly accountId: string; readonly name: string }
  | {
      readonly action: 'set-member';
      readonly accountId: string;
      readonly wallet: string;
      readonly role: 'admin' | 'member';
    }
  | { readonly action: 'remove-member'; readonly accountId: string; readonly wallet: string }
  | { readonly action: 'create-role'; readonly accountId: string; readonly role: DeskRoleDraft }
  | {
      readonly action: 'edit-role';
      readonly accountId: string;
      readonly roleId: string;
      readonly change: DeskRoleChange;
    }
  | {
      readonly action: 'move-role';
      readonly accountId: string;
      readonly roleId: string;
      readonly position: number;
    }
  | { readonly action: 'delete-role'; readonly accountId: string; readonly roleId: string }
  | {
      readonly action: 'give-role';
      readonly accountId: string;
      readonly wallet: string;
      readonly roleId: string;
    }
  | {
      readonly action: 'take-role';
      readonly accountId: string;
      readonly wallet: string;
      readonly roleId: string;
    };

/** The browser's POST body, read: one action shaped like the contract's, or the first issue. */
export function readSaldoRequest(
  json: unknown,
):
  | { readonly ok: true; readonly request: SaldoRequest }
  | { readonly ok: false; readonly error: string } {
  const parsed = shapes().request.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue === undefined || issue.path.length === 0 ? '' : `${issue.path.join('.')}: `;
    return { ok: false, error: `${where}${issue?.message ?? 'invalid'}` };
  }
  return { ok: true, request: parsed.data as SaldoRequest };
}

/**
 * The browser's POST body, split: the act, and apart the fresh signature it
 * may carry (`fresh`, ORG-008) — or the issue that refuses a proof out of
 * shape before anything else is read.
 */
function splitProof(
  json: unknown,
):
  | { readonly ok: true; readonly act: unknown; readonly proof: FreshProof | null }
  | { readonly ok: false; readonly error: string } {
  if (typeof json !== 'object' || json === null || !('fresh' in json)) {
    return { ok: true, act: json, proof: null };
  }
  const { fresh, ...act } = json as Readonly<Record<string, unknown>>;
  const parsed = shapes().proof.safeParse(fresh);
  if (!parsed.success)
    return { ok: false, error: 'fresh: a token and a 0x signature, nothing else' };
  return { ok: true, act, proof: parsed.data };
}

// ---- Answers ---------------------------------------------------------------

export type Log = (event: Readonly<Record<string, unknown>>) => void;

const HEADERS = { 'cache-control': 'no-store' } as const;
export const answer = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: HEADERS });
export const signedOut = (): Response => answer({ error: 'signed-out' }, 401);
export const notBound = (): Response => answer({ error: 'not-bound' }, 503);
export const refused = (problems: readonly string[]): Response =>
  answer({ error: 'refused', problems }, 403);

/** A desk that threw, or answered out of shape: logged by rule, never by value. */
function noted(log: Log, action: string, rule: string, error?: unknown): void {
  log({
    level: 'error',
    kind: 'saldo-till',
    action,
    rule,
    ...(error === undefined ? {} : { error: error instanceof Error ? error.name : typeof error }),
  });
}

/** The same, and the 502 that tells the browser the till failed. */
function failed(log: Log, action: string, rule: string, error?: unknown): Response {
  noted(log, action, rule, error);
  return answer({ error: 'till-failed' }, 502);
}

/** Ask the desk and check its answer's shape: the answer, or the failure to send. */
export async function ask<T>(
  log: Log,
  action: string,
  call: () => Promise<unknown>,
  shape: z.ZodType<T>,
): Promise<
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly response: Response }
> {
  let raw: unknown;
  try {
    raw = await call();
  } catch (error) {
    // A till older than the store lacks a newer method: the feature is not bound yet.
    if (error instanceof Error && error.message.includes(NOT_IMPLEMENTED)) {
      noted(log, action, 'not-implemented');
      return { ok: false, response: notBound() };
    }
    return { ok: false, response: failed(log, action, 'threw', error) };
  }
  const parsed = shape.safeParse(raw);
  if (!parsed.success) return { ok: false, response: failed(log, action, 'answer-shape') };
  return { ok: true, value: parsed.data };
}

/**
 * The asker as the desk is called for it: the wallet, lowercase 0x, and the
 * house's flag. The flag is the session's (lib/auth/session-wallet.ts) —
 * never anything the request carries.
 */
export interface Who {
  readonly you: string;
  readonly house: boolean;
}

export const whoIs = (asker: Asker): Who => ({
  you: asker.wallet.toLowerCase(),
  house: asker.house,
});

/**
 * The organizations only the house enters, as the overview lists them: the
 * till's directory minus the wallet's own accounts, each marked
 * `as: 'house'`. The directory names no money, so the entry carries a zero
 * that means «not read here» (the statement has the real balance, and the
 * till writes down that the house read it), and `admin`, which is what the
 * till answers for the house. A directory that fails or refuses never
 * fails the overview: the wallet keeps its own accounts and the rule is
 * logged, by rule only.
 */
async function houseEntries(
  desk: AccountDesk,
  you: string,
  own: readonly { readonly id: string }[],
  log: Log,
): Promise<readonly DeskAccount[]> {
  const asked = await ask(log, 'directory', () => desk.directory(you, true), shapes().directory);
  if (!asked.ok) return [];
  if ('problems' in asked.value) {
    noted(log, 'directory', 'refused');
    return [];
  }
  const mine = new Set(own.map((account) => account.id));
  return asked.value.accounts
    .filter((entry) => !mine.has(entry.id))
    .map((entry) => ({ ...entry, role: 'admin', balanceCents: 0, as: 'house' }));
}

/**
 * GET /api/saldo: the accounts this wallet sees, personal first. For the
 * house (an Oracle's session) the organizations it is not in follow,
 * marked, from the till's directory: additive, so a reader that does not
 * know the mark sees the same list, longer.
 */
export async function answerOverview(
  desk: AccountDesk | null,
  asker: Asker | null,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (desk === null) return notBound();
  const { you, house } = whoIs(asker);
  const asked = await ask(log, 'overview', () => desk.overview(you), shapes().overview);
  if (!asked.ok) return asked.response;
  const overview = asked.value;
  if ('ok' in overview) return refused(overview.problems);
  if (!house) return answer({ accounts: overview.accounts });
  return answer({
    accounts: [...overview.accounts, ...(await houseEntries(desk, you, overview.accounts, log))],
  });
}

/** GET /api/saldo/statement?cuenta=&rango=: one account's statement and, for an organization, what the wallet may do there; members only — and the house. */
export async function answerStatement(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  const account = url.searchParams.get('cuenta') ?? '';
  const rango = url.searchParams.get('rango') ?? '30d';
  if (account.length === 0 || account.length > ID_MAX) {
    return answer({ error: 'cuenta: an account id is required' }, 400);
  }
  if (!isSpendRange(rango)) {
    return answer({ error: `rango: one of ${SPEND_RANGES.join(', ')}` }, 400);
  }
  if (desk === null) return notBound();
  const { you, house } = whoIs(asker);
  const range: SpendRange = rango;
  const asked = await ask(
    log,
    'statement',
    () => desk.statement(you, account, range, house),
    shapes().statement,
  );
  if (!asked.ok) return asked.response;
  const statement = asked.value;
  if ('ok' in statement) return refused(statement.problems);
  if (statement.account.kind === 'personal') return answer({ statement, you, access: null });
  // What this wallet may do here: the screen hides the rest. A desk that
  // cannot say leaves the controls shown (null) — the till refuses on every write.
  const allowed = await ask(log, 'access', () => desk.access(you, account, house), shapes().access);
  const access =
    allowed.ok && !('problems' in allowed.value)
      ? {
          as: allowed.value.as,
          permissions: allowed.value.permissions,
          holders: allowed.value.holders,
        }
      : null;
  return answer({ statement, you, access });
}

/** The account a GET names (`?cuenta=`), or the answer that refuses it. */
export function accountOf(
  url: URL,
): { ok: true; account: string } | { ok: false; response: Response } {
  const account = url.searchParams.get('cuenta') ?? '';
  if (account.length === 0 || account.length > ID_MAX) {
    return { ok: false, response: answer({ error: 'cuenta: an account id is required' }, 400) };
  }
  return { ok: true, account };
}

/** GET /api/saldo/roles?cuenta=: an organization's roles and members, as this wallet may handle them. */
export async function answerRoles(
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
    'roles',
    () => desk.roles(you, named.account, house),
    shapes().roles,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ roles: asked.value, you });
}

/**
 * GET /api/people?comunidad=: the people of a community's organization
 * (STD-053 PRS-004). A member is shown the groups — each person by a short
 * wallet, never a whole one; anyone else (no session, or not a member) is
 * shown how many and no one. `team` is the organization the community's
 * file links, or null when it links none.
 */
export async function answerPeople(
  desk: AccountDesk | null,
  wallet: string | null,
  team: string | null,
  log: Log = logEvent,
): Promise<Response> {
  if (team === null) return answer({ error: 'no-team' }, 404);
  if (desk === null) return notBound();
  if (wallet !== null) {
    const you = wallet.toLowerCase();
    const asked = await ask(log, 'people', () => desk.roles(you, team), shapes().roles);
    if (!asked.ok) return asked.response;
    if (!('problems' in asked.value))
      return answer({ view: 'list', ...peopleOf(asked.value, you) });
  }
  const counted = await ask(log, 'headcount', () => desk.headcount(team), shapes().headcount);
  if (!counted.ok) return counted.response;
  if ('problems' in counted.value) return answer({ error: 'no-team' }, 404);
  return answer({ view: 'count', members: counted.value.members });
}

/** GET /api/saldo/log?cuenta=: the organization's last changes, for whoever may view its log. */
export async function answerLog(
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
  const asked = await ask(log, 'log', () => desk.log(you, named.account, house), shapes().log);
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ log: asked.value });
}

/** GET /api/saldo/settings?cuenta=: the pieces that are off and the words of an organization, to a member or the house. */
export async function answerSettings(
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
    'settings',
    () => desk.settings(you, named.account, house),
    shapes().settings,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ settings: asked.value });
}

/**
 * POST /api/saldo/settings: `{ accountId, off?, vocabulary? }` turns pieces on
 * or off and picks the words; the till decides who may and writes the log.
 */
export async function answerChangeSettings(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = shapes().settingsRequest.safeParse(body.json);
  if (!read.success) {
    const issue = read.error.issues[0];
    const where = issue === undefined || issue.path.length === 0 ? '' : `${issue.path.join('.')}: `;
    return answer({ error: `${where}${issue?.message ?? 'invalid'}` }, 400);
  }
  if (
    read.data.off === undefined &&
    read.data.vocabulary === undefined &&
    read.data.aiAgentEnabled === undefined
  ) {
    return answer({ error: 'off, vocabulary or aiAgentEnabled is required' }, 400);
  }
  if (desk === null) return notBound();
  const { you, house } = whoIs(asker);
  const { accountId, ...change } = read.data;
  const asked = await ask(
    log,
    'change-settings',
    () => desk.changeSettings(you, accountId, change, house),
    shapes().settings,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ settings: asked.value });
}

/** GET /api/saldo/happened?cuenta=&antes=: a page of «Qué ha pasado» — 30 lines, newest first — to a member or the house. */
export async function answerHappened(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  const named = accountOf(url);
  if (!named.ok) return named.response;
  const sent = url.searchParams.get('antes');
  const before = sent === null ? null : /^[1-9][0-9]{0,15}$/.test(sent) ? Number(sent) : undefined;
  if (before === undefined) return answer({ error: 'antes: a line number' }, 400);
  if (desk === null) return notBound();
  const { you, house } = whoIs(asker);
  const asked = await ask(
    log,
    'happenings',
    () => desk.happenings(you, named.account, before, house),
    shapes().happenings,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ happened: asked.value });
}

/** Read a POST's JSON body within limits, or the answer that refuses it. */
export async function bodyOf(
  request: Request,
): Promise<{ ok: true; json: unknown } | { ok: false; response: Response }> {
  const type = (request.headers.get('content-type') ?? '').trim().toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(type)) {
    return { ok: false, response: answer({ error: 'content-type must be application/json' }, 415) };
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES)
    return { ok: false, response: answer({ error: 'body too large' }, 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: answer({ error: 'body too large' }, 413) };
  }
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: answer({ error: 'body must be JSON' }, 400) };
  }
}

/**
 * POST /api/saldo: one action on the desk as the session's wallet. The
 * desk's refusals travel as values (`{ result: { ok: false, problems } }`,
 * 200): the screen tells the person why; only a desk that failed is 502.
 * An act that gives what is dangerous also needs `fresh` and the Worker's
 * `FreshDeps` (ORG-008); without them it never reaches the desk.
 */
export async function answerAction(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  log: Log = logEvent,
  fresh: FreshDeps | null = null,
): Promise<Response> {
  if (asker === null) return signedOut();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const split = splitProof(body.json);
  if (!split.ok) return answer({ error: split.error }, 400);
  const read = readSaldoRequest(split.act);
  if (!read.ok) return answer({ error: read.error }, 400);
  if (desk === null) return notBound();
  const who = whoIs(asker);
  const { you, house } = who;
  const s = shapes();
  const action = read.request;

  if (action.action === 'topup') {
    const origin = new URL(request.url).origin;
    const asked = await ask(
      log,
      'topup',
      () =>
        desk.startTopup(
          you,
          action.accountId,
          action.amount,
          vueltaBase(origin, action.locale),
          house,
        ),
      s.topup,
    );
    if (!asked.ok) return asked.response;
    const result = asked.value;
    if (result.ok) {
      // Only Stripe's Checkout or this site's own way back may reach the new tab.
      const url = checkoutTarget(result.url, origin);
      if (url === null) return failed(log, 'topup', 'checkout-url');
      log({ level: 'info', kind: 'saldo-topup', outcome: 'opened' });
      return answer({ result: { ok: true, url } });
    }
    log({ level: 'info', kind: 'saldo-topup', outcome: 'refused' });
    return answer({ result });
  }

  if (action.action === 'confirm') {
    const asked = await ask(
      log,
      'confirm',
      () => desk.confirmTopup(you, action.sessionId),
      s.confirm,
    );
    if (!asked.ok) return asked.response;
    const result = asked.value;
    log({ level: 'info', kind: 'saldo-confirm', outcome: result.ok ? result.state : 'refused' });
    return answer({ result });
  }

  if (
    action.action === 'create-role' ||
    action.action === 'edit-role' ||
    action.action === 'give-role' ||
    action.action === 'take-role' ||
    action.action === 'move-role' ||
    action.action === 'delete-role'
  ) {
    return answerRoleAction(desk, who, action, log, split.proof, fresh);
  }

  const asked =
    action.action === 'create-team'
      ? await ask(log, action.action, () => desk.createTeam(you, action.name), s.team)
      : action.action === 'rename'
        ? await ask(
            log,
            action.action,
            () => desk.renameTeam(you, action.accountId, action.name, house),
            s.team,
          )
        : action.action === 'set-member'
          ? await ask(
              log,
              action.action,
              () => desk.setMember(you, action.accountId, action.wallet, action.role, house),
              s.members,
            )
          : await ask(
              log,
              action.action,
              () => desk.removeMember(you, action.accountId, action.wallet, house),
              s.members,
            );
  if (!asked.ok) return asked.response;
  return answer({ result: asked.value });
}

type RoleAction = Extract<
  SaldoRequest,
  {
    readonly action:
      'create-role' | 'edit-role' | 'move-role' | 'delete-role' | 'give-role' | 'take-role';
  }
>;

/** The permissions among `permissions` that ask for a fresh signature (STD-051, ORG-008). */
const signedAgain = (
  permissions: readonly OrganizationPermission[],
): readonly OrganizationPermission[] =>
  permissions.filter((permission) => needsSignature(permission));

/** What an act adds to a role the desk lists: giving it adds all it holds; editing it, what it does not hold yet. */
function addsTo(action: RoleAction): {
  readonly roleId: string;
  readonly added: (held: readonly OrganizationPermission[]) => readonly OrganizationPermission[];
} | null {
  if (action.action === 'give-role') return { roleId: action.roleId, added: (held) => held };
  if (action.action === 'edit-role' && action.change.permissions !== undefined) {
    const asked = action.change.permissions;
    return {
      roleId: action.roleId,
      added: (held) => asked.filter((permission) => !held.includes(permission)),
    };
  }
  return null;
}

type Grant =
  | {
      readonly at: 'granted';
      /** What the act would ADD that asks for a fresh signature; empty when nothing does. */
      readonly permissions: readonly OrganizationPermission[];
      /** The role's name, for the lines the wallet signs. */
      readonly role: string;
    }
  | { readonly at: 'refused'; readonly problems: readonly string[] }
  | { readonly at: 'failed'; readonly response: Response };

const NO_GRANT: Grant = { at: 'granted', permissions: [], role: '' };

/**
 * What a role action would grant that asks for a new wallet signature
 * (STD-051, ORG-008), read against the roles the desk lists now. A role the
 * desk does not list adds nothing to check: the till answers for it.
 */
async function grantOf(desk: AccountDesk, who: Who, action: RoleAction, log: Log): Promise<Grant> {
  if (action.action === 'create-role') {
    return {
      at: 'granted',
      permissions: signedAgain(action.role.permissions),
      role: action.role.name,
    };
  }
  const adds = addsTo(action);
  if (adds === null) return NO_GRANT;
  const asked = await ask(
    log,
    'roles',
    () => desk.roles(who.you, action.accountId, who.house),
    shapes().roles,
  );
  if (!asked.ok) return { at: 'failed', response: asked.response };
  if ('problems' in asked.value) return { at: 'refused', problems: asked.value.problems };
  const listed = asked.value.roles.find((role) => role.id === adds.roleId);
  if (listed === undefined) return NO_GRANT;
  return {
    at: 'granted',
    permissions: signedAgain(adds.added(listed.permissions)),
    role: listed.name,
  };
}

/** Why an act that needs a fresh signature does not reach the desk: the log's outcome and the screen's words. */
const UNSIGNED = {
  missing: { outcome: 'needs-signature', problem: FRESH_SIGNATURE },
  expired: { outcome: 'signature-expired', problem: SIGNATURE_EXPIRED },
  mismatch: { outcome: 'signature-mismatch', problem: SIGNATURE_MISMATCH },
} as const;

/** A role action on the desk; one that gives administrator or manage-roles goes only with a fresh signature of this very act — the house's included. */
async function answerRoleAction(
  desk: AccountDesk,
  who: Who,
  action: RoleAction,
  log: Log,
  proof: FreshProof | null,
  fresh: FreshDeps | null,
): Promise<Response> {
  const { you, house } = who;
  const grant = await grantOf(desk, who, action, log);
  if (grant.at === 'failed') return grant.response;
  // A desk that refuses to list the roles lets the act through to the same refusal: nothing is written.
  if (grant.at === 'granted' && grant.permissions.length > 0) {
    const verdict =
      proof === null || fresh === null ? 'missing' : await checkFresh(fresh, you, action, proof);
    if (verdict !== 'ok') {
      const { outcome, problem } = UNSIGNED[verdict];
      log({ level: 'info', kind: 'saldo-role', action: action.action, outcome });
      return answer({ result: { ok: false, problems: [problem] } });
    }
  }
  const s = shapes();
  const asked =
    action.action === 'create-role'
      ? await ask(
          log,
          action.action,
          () => desk.createRole(you, action.accountId, action.role, house),
          s.roles,
        )
      : action.action === 'edit-role'
        ? await ask(
            log,
            action.action,
            () => desk.editRole(you, action.accountId, action.roleId, action.change, house),
            s.roles,
          )
        : action.action === 'move-role'
          ? await ask(
              log,
              action.action,
              () => desk.moveRole(you, action.accountId, action.roleId, action.position, house),
              s.roles,
            )
          : action.action === 'delete-role'
            ? await ask(
                log,
                action.action,
                () => desk.deleteRole(you, action.accountId, action.roleId, house),
                s.roles,
              )
            : action.action === 'give-role'
              ? await ask(
                  log,
                  action.action,
                  () => desk.giveRole(you, action.accountId, action.wallet, action.roleId, house),
                  s.roles,
                )
              : await ask(
                  log,
                  action.action,
                  () => desk.takeRole(you, action.accountId, action.wallet, action.roleId, house),
                  s.roles,
                );
  if (!asked.ok) return asked.response;
  log({
    level: 'info',
    kind: 'saldo-role',
    action: action.action,
    outcome: asked.value.ok ? 'done' : 'refused',
  });
  return answer({ result: asked.value });
}

// ---- The fresh signature: the lines a wallet signs (ORG-008) ---------------

/** The acts that may give what asks for a fresh signature. */
type GrantAct = Extract<
  SaldoRequest,
  { readonly action: 'create-role' | 'edit-role' | 'give-role' }
>;

const isGrantAct = (request: SaldoRequest): request is GrantAct =>
  request.action === 'create-role' ||
  request.action === 'edit-role' ||
  request.action === 'give-role';

const KIND: Readonly<Record<GrantAct['action'], FreshAct['kind']>> = {
  'create-role': 'create',
  'edit-role': 'edit',
  'give-role': 'give',
};

const NOTHING_TO_SIGN = 'nothing to sign: this act gives nothing that asks for a fresh signature';

const isLocale = (text: string): text is SupportedLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(text);

/** The chain the wallet named: absent is null, a whole number from 1 is itself, anything else undefined. */
function chainOf(text: string | null): number | null | undefined {
  if (text === null) return null;
  const id = Number(text);
  return /^[1-9]\d{0,15}$/.test(text) && Number.isSafeInteger(id) ? id : undefined;
}

/**
 * POST /api/saldo/signature?locale=&chain=: the lines the session's wallet
 * signs for this very act, in the page's language, and the token that
 * brings them back with it (lib/fresh-signature.ts). The body is the act
 * exactly as POST /api/saldo will receive it; `chain` is the wallet's own,
 * for a smart account. Only an act that gives administrator or manage-roles
 * gets lines to sign, and asking never acts: the desk is only read.
 */
export async function answerSignature(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  fresh: FreshDeps | null,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null) return signedOut();
  if (fresh === null) return answer({ error: 'not-configured' }, 503);
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readSaldoRequest(body.json);
  if (!read.ok) return answer({ error: read.error }, 400);
  const query = new URL(request.url).searchParams;
  const locale = query.get('locale') ?? '';
  if (!isLocale(locale)) {
    return answer({ error: `locale: one of ${SUPPORTED_LOCALES.join(', ')}` }, 400);
  }
  const chainId = chainOf(query.get('chain'));
  if (chainId === undefined) return answer({ error: 'chain: a whole number from 1' }, 400);
  const act = read.request;
  if (!isGrantAct(act)) return answer({ error: NOTHING_TO_SIGN }, 400);
  if (desk === null) return notBound();
  const who = whoIs(asker);
  const { you } = who;
  const grant = await grantOf(desk, who, act, log);
  if (grant.at === 'failed') return grant.response;
  if (grant.at === 'refused') return refused(grant.problems);
  if (grant.permissions.length === 0) return answer({ error: NOTHING_TO_SIGN }, 400);
  const accounts = await ask(log, 'overview', () => desk.overview(you), shapes().overview);
  if (!accounts.ok) return accounts.response;
  // The organization by its name; by its id when the lists do not name it — the wallet's own
  // accounts and, for the house, the others it enters.
  const own = 'accounts' in accounts.value ? accounts.value.accounts : [];
  const listed = who.house ? [...own, ...(await houseEntries(desk, you, own, log))] : own;
  const named = listed.find((account) => account.id === act.accountId)?.name;
  const expiresAt = fresh.now() + FRESH_TTL_MS;
  const message = freshMessage(FRESH_SIGNATURE_WORDS[locale], locale, expiresAt, {
    kind: KIND[act.action],
    organization: named ?? act.accountId,
    role: grant.role,
    permissions: grant.permissions.map(
      (permission) => ORGANIZATION_PERMISSION_LABELS[permission][locale],
    ),
    who: act.action === 'give-role' ? shortWallet(act.wallet) : '',
  });
  const token = await issueFreshToken(fresh.secret, {
    wallet: you,
    act: await actDigest(act),
    message,
    chainId,
    expiresAt,
  });
  log({ level: 'info', kind: 'saldo-signature', action: act.action, outcome: 'issued' });
  return answer({ sign: { message, token, expiresAt: new Date(expiresAt).toISOString() } });
}

// ---- «Tu nombre y tu cara» (2026-10-16, STD-053): GET and POST /api/profile -------------
//
// One's own name and Bazar avatar, and nobody else's: the wallet is the
// session's, always, and a body is read by strict shapes that know no
// wallet. Nobody is shown before choosing — the till writes nothing until a
// name is saved — and «Dejar de mostrarlo» is a delete. Fellow members see
// what is published through the roles view, never through this door.

/** The till's refusal of a profile, in its own words: 400, the person can put it right. */
const refusedProfile = (problems: readonly string[]): Response =>
  answer({ error: 'refused', problems }, 400);

const PROFILE_BODY = 'body: { name, avatar } or { remove: true }';

/** One's own profile as a browser is answered it: the avatar's id (it is yours) and its face; not when. */
function ownProfile(profile: { name: string; avatar: string | null } | null): OwnProfile | null {
  if (profile === null) return null;
  const { name, avatar } = profile;
  return { name, avatar, face: avatar === null ? null : faceSrc(avatar) };
}

type ProfileAnswer = z.infer<ReturnType<typeof buildSchemas>['profile']>;

/** Ask the desk about a profile: a till older than the method is 503, one that fails 502, by rule. */
async function askProfile(
  log: Log,
  action: string,
  call: () => Promise<unknown>,
): Promise<
  | { readonly ok: true; readonly value: ProfileAnswer }
  | { readonly ok: false; readonly response: Response }
> {
  let raw: unknown;
  try {
    raw = await call();
  } catch (error) {
    if (error instanceof Error && error.message.includes(NOT_IMPLEMENTED)) {
      noted(log, action, 'not-implemented');
      return { ok: false, response: notBound() };
    }
    return { ok: false, response: failed(log, action, 'threw', error) };
  }
  const parsed = shapes().profile.safeParse(raw);
  if (!parsed.success) return { ok: false, response: failed(log, action, 'answer-shape') };
  return { ok: true, value: parsed.data };
}

/** GET /api/profile: what the session's wallet published — `{ name, avatar, face }` — or null. */
export async function answerProfile(
  desk: AccountDesk | null,
  wallet: string | null,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  if (desk === null) return notBound();
  const you = wallet.toLowerCase();
  const asked = await askProfile(log, 'profile', () => desk.profile(you));
  if (!asked.ok) return asked.response;
  if (!asked.value.ok) return refusedProfile(asked.value.problems);
  return answer({ ok: true, profile: ownProfile(asked.value.profile) });
}

/**
 * POST /api/profile (JSON only, like POST /api/saldo): `{ name, avatar }`
 * publishes or replaces the session wallet's name and avatar — the avatar
 * one of the Bazar's with a baked thumbnail (lib/profile-avatars.ts), or
 * null — and `{ remove: true }` stops showing them: the till deletes the
 * row. The name goes as written: the till trims it and decides.
 */
export async function answerSetProfile(
  desk: AccountDesk | null,
  wallet: string | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = shapes().profileRequest.safeParse(body.json);
  if (!read.success) return answer({ error: PROFILE_BODY }, 400);
  const change: DeskProfileChange =
    'remove' in read.data ? null : { name: read.data.name, avatar: read.data.avatar };
  if (change?.avatar != null && !isProfileAvatar(change.avatar)) {
    return refusedProfile([PROFILE_AVATAR_PROBLEM]);
  }
  if (desk === null) return notBound();
  const you = wallet.toLowerCase();
  const asked = await askProfile(log, 'set-profile', () => desk.setProfile(you, change));
  if (!asked.ok) return asked.response;
  if (!asked.value.ok) return refusedProfile(asked.value.problems);
  return answer({ ok: true, profile: ownProfile(asked.value.profile) });
}

// ---- «El censo» (2026-10-16, STD-053): who has signed in, for the house alone ----
//
// Each verified sign-in is recorded in the till — the first and the last
// time per wallet, nothing else — best effort, after the session cookie is
// decided: nothing the till does can slow or break a sign-in. The list of
// who has signed in is answered to an Oracle's session (the house) alone,
// decided from our own signed cookie (lib/auth/session-wallet.ts), never
// from the request; everyone else is refused before the till is asked.

/** The list names people: private to the one browser that asked, and never stored. */
const PRIVATE_HEADERS = { 'cache-control': 'private, no-store' } as const;
const privately = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: PRIVATE_HEADERS });

/** The longest search and cursor the route passes on (the till's own limit is 100 for a search). */
const CITIZENS_QUERY_MAX = 100;
const CITIZENS_CURSOR_MAX = 200;

/**
 * GET /api/admin/citizens?q=&cursor=: everyone who has signed in, newest
 * first — `{ ok, people: [{ wallet, firstSeenAt, lastSeenAt, name, face,
 * organizations }], total, next }` — to the house alone: 403 for any other
 * session or none, 503 without a till or with one older than the census,
 * 502 when it fails. Each avatar leaves as its baked face, never its id.
 */
export async function answerCitizens(
  desk: AccountDesk | null,
  asker: Asker | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null || !asker.house) return privately({ error: 'forbidden' }, 403);
  const query = url.searchParams.get('q') ?? '';
  const cursor = url.searchParams.get('cursor') ?? '';
  if (query.length > CITIZENS_QUERY_MAX) {
    return privately({ error: `q: ${CITIZENS_QUERY_MAX} characters at most` }, 400);
  }
  if (cursor.length > CITIZENS_CURSOR_MAX) {
    return privately({ error: `cursor: ${CITIZENS_CURSOR_MAX} characters at most` }, 400);
  }
  if (desk === null) return privately({ error: 'not-bound' }, 503);
  const { you } = whoIs(asker);
  let raw: unknown;
  try {
    raw = await desk.citizens(you, true, query, cursor === '' ? null : cursor);
  } catch (error) {
    if (error instanceof Error && error.message.includes(NOT_IMPLEMENTED)) {
      noted(log, 'citizens', 'not-implemented');
      return privately({ error: 'not-bound' }, 503);
    }
    noted(log, 'citizens', 'threw', error);
    return privately({ error: 'till-failed' }, 502);
  }
  const parsed = shapes().citizens.safeParse(raw);
  if (!parsed.success) {
    noted(log, 'citizens', 'answer-shape');
    return privately({ error: 'till-failed' }, 502);
  }
  const list = parsed.data;
  if (!list.ok) {
    const status = list.problems.includes(NOT_HOUSE_CENSUS) ? 403 : 400;
    return privately({ error: 'refused', problems: list.problems }, status);
  }
  return privately(list);
}

/** Where work goes that must outlive the answer: the Worker's `waitUntil`. */
export type Defer = (work: Promise<unknown>) => void;

/** The Worker's own `waitUntil` (Astro's Cloudflare adapter: `locals.cfContext`), or none. */
function waitUntilOf(locals: unknown): Defer | null {
  try {
    const context = (locals as { cfContext?: unknown } | null | undefined)?.cfContext;
    const waitUntil = (context as { waitUntil?: unknown } | null | undefined)?.waitUntil;
    if (typeof waitUntil !== 'function') return null;
    // Called as a method of the context: workerd's needs its receiver.
    return (work) => {
      waitUntil.call(context, work);
    };
  } catch {
    return null;
  }
}

/**
 * The route's way to keep work running after it answered: the Worker's
 * `waitUntil` on workerd; elsewhere (node, tests) the work just runs on.
 */
export function deferFrom(locals: unknown): Defer {
  return waitUntilOf(locals) ?? (() => undefined);
}

/**
 * A verified sign-in, noted in the till best effort (`signedIn`): handed to
 * `defer` as work for after the answer, every failure swallowed — a refusal,
 * a throw, a till older than the census, a broken context. Returns at once.
 */
export function recordSignIn(desk: AccountDesk | null, wallet: string, defer: Defer): void {
  if (desk === null) return;
  const work = Promise.resolve()
    .then(() => desk.signedIn(wallet.toLowerCase()))
    .then(
      () => undefined,
      () => undefined,
    );
  try {
    defer(work);
  } catch {
    // The sign-in is already decided: nothing here may change it.
  }
}
