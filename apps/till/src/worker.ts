/**
 * The till's Worker (ADR-070 §8): a service apart from the website, with its
 * own database. Its work is the nightly close, fired by the one cron in
 * wrangler.jsonc at 00:30 UTC, the till's reference time, every night; the
 * default export answers only `GET /health`, and only in local runs, since
 * nothing routes to the deployed Worker.
 *
 * Its one door is the Oracle desk (MIS-184): `OracleDesk`, a named RPC
 * entrypoint. Only a Worker that declares a service binding to it can call
 * it — numinia.com's, as `TILL_ORACLE` (service `numinia-till`, entrypoint
 * `OracleDesk`) — and an RPC entrypoint answers no HTTP request at all, so
 * even a later route (a Stripe webhook) leaves the desk unreachable from the
 * internet. The trust model: numinia.com's API route checks the Oracle's
 * session (its own signed cookie, permission `edit-system-config`, which
 * only the Oracle rank holds) and passes the session's wallet as `by`; the
 * till trusts its one bound caller to have done so, and re-validates every
 * field it is sent. The till never trusts a browser.
 *
 * Its second door is the account desk (cut «Saldo», MIS-179, MIS-180):
 * `AccountDesk`, bound by numinia.com as `TILL_ACCOUNTS`. numinia.com's API
 * route checks the session (any rank) and passes the session's wallet as the
 * first argument of every method; the till trusts its bound caller for WHO
 * and decides itself, from its own tables, WHAT that wallet may do. Top-ups
 * go through Stripe Managed Payments Checkout: the till reaches OUT to
 * api.stripe.com, and nothing of Stripe's reaches in — a payment is
 * confirmed when the buyer comes back and by a poll of Stripe's events every
 * minute (the second cron).
 */

import { WorkerEntrypoint } from 'cloudflare:workers';
import meterFixture from '../fixtures/meter.json';
import {
  access,
  confirmTopup,
  createTeam,
  directory,
  members,
  overview,
  pollState,
  pollStripe,
  removeMember,
  renameTeam,
  setMember,
  startTopup,
  statement,
  type AccessAnswer,
  type DirectoryAnswer,
  type MembersAnswer,
  type Overview,
  type Payments,
  type PollState,
  type PollRun,
  type Refusal,
  type StatementAnswer,
  type TeamAnswer,
  type TopupConfirm,
  type TopupStart,
} from './db/accounts';
import {
  ensureCommunityTeam,
  openAllCommunities,
  type EnsureAnswer,
  type OpenAllAnswer,
} from './db/community-teams';
import {
  communityRequests,
  decideCommunityRequest,
  myCommunityRequests,
  requestCommunity,
  type MyRequestsAnswer,
  type RequestAnswer,
  type RequestsAnswer,
} from './db/community-requests';
import { citizens, recordSignIn, type CitizensAnswer, type SignedInAnswer } from './db/census';
import {
  follow,
  followCounts,
  myFollows,
  unfollow,
  type FollowCountsAnswer,
  type MyFollowsAnswer,
} from './db/follows';
import {
  myRsvps,
  rsvp,
  rsvpCounts,
  unrsvp,
  type MyRsvpsAnswer,
  type RsvpCountsAnswer,
} from './db/rsvps';
import {
  cancelRitual,
  createRitual,
  ritualById,
  ritualsOf,
  type RitualAnswer,
  type RitualsAnswer,
} from './db/rituals';
import type { TillRitual } from './lib/rituals';
import {
  homeOf,
  placeWorld,
  placements,
  worldsOf,
  type HomeOfAnswer,
  type PlaceAnswer,
  type PlacementsAnswer,
  type WorldsOfAnswer,
} from './db/world-placements';
import { headcount, type HeadcountAnswer } from './db/headcount';
import {
  changeSettings,
  happenings,
  settings,
  type HappeningsAnswer,
  type SettingsAnswer,
} from './db/settings';
import {
  agentPass,
  agentsOf,
  assignAgentRole,
  changeAgent,
  claimAgentPass,
  createAgent,
  removeAgent,
  type AgentPassAnswer,
  type AgentsAnswer,
  type ClaimAnswer,
} from './db/agents';
import { changeProfile, profileAnswer, type ProfileAnswer } from './db/profiles';
import {
  assignRole,
  createRole,
  deleteRole,
  editRole,
  logOf,
  moveRole,
  rolesOf,
  type LogAnswer,
  type RolesAnswer,
} from './db/roles';
import { checkDraft, readDesk, scheduleDraft, type DeskSchedule, type DeskView } from './db/desk';
import { runClose, type CloseRun, type TillDatabase } from './db/repository';
import { parseTopupPrices } from './lib/accounts';
import { Stripe, type Fetcher } from './lib/stripe';
import {
  CloudflareDns,
  FleetDns,
  type DnsDone,
  type DnsLook,
  type DnsRefusal,
  type Fetcher as DnsFetcher,
} from './lib/fleet-dns';
import type { DeskCheck } from './lib/tariff';
import { FakeMeter, NoMeter, parseMeterReadings, type Meter } from './meter';

export interface Env {
  readonly TILL_DB: TillDatabase;
  /** Which meter the close reads: `none` (the default: every day pending) or `fake` (the fixture). */
  readonly TILL_METER?: string;
  /**
   * Secret: a Stripe restricted key (Checkout Sessions write, Events read).
   * Without it the desk answers `payments are not configured` and the
   * minute's poll does nothing.
   */
  readonly STRIPE_KEY?: string;
  /** Var: JSON `{"10":"price_…","50":"price_…","100":"price_…"}`, the Stripe price of each quick top-up. */
  readonly TILL_TOPUP_PRICES?: string;
  /**
   * Secret: a Cloudflare API token with Zone → Zone Read and Zone → DNS Edit
   * on numinia.com and numen.games only. Without it the DNS desk answers
   * `not-configured` and the room asks for the record by hand.
   */
  readonly CLOUDFLARE_DNS_TOKEN?: string;
}

/** The nightly close: 00:30 UTC (wrangler.jsonc). */
export const NIGHTLY_CRON = '30 0 * * *';

/** The poll of Stripe's events: every minute (wrangler.jsonc). */
export const MINUTE_CRON = '* * * * *';

const HEALTH = JSON.stringify({ service: 'till', ok: true });

/** `GET /health` answers; everything else is not found. */
export function handleFetch(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (request.method === 'GET' && pathname === '/health') {
    return new Response(HEALTH, {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response('Not found', { status: 404 });
}

/** The meter `TILL_METER` names; an unknown name fails the run rather than guessing. */
export function meterFor(name: string | undefined): Meter {
  if (name === undefined || name === 'none') return new NoMeter();
  if (name === 'fake') return new FakeMeter(parseMeterReadings(meterFixture));
  throw new Error(`TILL_METER must be "none" or "fake", not ${JSON.stringify(name)}`);
}

/** The nightly close for the UTC date of the event's scheduled time. */
export async function handleScheduled(
  controller: Pick<ScheduledController, 'scheduledTime'>,
  env: Env,
): Promise<CloseRun> {
  return runClose(env.TILL_DB, meterFor(env.TILL_METER), new Date(controller.scheduledTime));
}

/**
 * Stripe and the top-up prices, when both are configured; null otherwise.
 * `fetcher` is for tests: deployed, the till calls the runtime's `fetch`.
 */
export function paymentsFor(
  env: Pick<Env, 'STRIPE_KEY' | 'TILL_TOPUP_PRICES'>,
  fetcher?: Fetcher,
): Payments | null {
  const prices = parseTopupPrices(env.TILL_TOPUP_PRICES);
  if (env.STRIPE_KEY === undefined || env.STRIPE_KEY === '' || prices === undefined) return null;
  return { stripe: new Stripe(env.STRIPE_KEY, fetcher), prices };
}

/**
 * The minute's poll of Stripe's events. Without `STRIPE_KEY` it does
 * nothing (null). Paid sessions it refused to credit fail the run AFTER the
 * cursor moved — the error, in Workers Logs, names the rule and a count,
 * never an amount or a wallet — and the next runs' overlap shows them again.
 */
export async function handleMinute(
  controller: Pick<ScheduledController, 'scheduledTime'>,
  env: Env,
  fetcher?: Fetcher,
): Promise<PollRun | null> {
  if (env.STRIPE_KEY === undefined || env.STRIPE_KEY === '') return null;
  const run = await pollStripe(
    env.TILL_DB,
    new Stripe(env.STRIPE_KEY, fetcher),
    new Date(controller.scheduledTime),
  );
  // Every rule broken this run, in one error: Workers Logs shows the run as
  // failed, naming rules and counts — never an amount or a wallet.
  const broken = [
    ...(run.uncreditable > 0
      ? [
          `${run.uncreditable} paid session(s) not credited (rule: same account, euros, a payment intent, a positive amount)`,
        ]
      : []),
    ...(run.unapplied > 0
      ? [`${run.unapplied} refund(s) or dispute(s) of the till's top-ups not applied (rule: euros)`]
      : []),
    ...(run.complete ? [] : ['more events than one run reads; the cursor did not move']),
    ...(run.lagging ? ['the poll is more than two days behind; Stripe keeps events 30 days'] : []),
  ];
  if (broken.length > 0) throw new Error(`stripe poll: ${broken.join('; ')}`);
  return run;
}

/** Each cron to its run: the nightly close or the minute's poll; an unknown one fails. */
export async function dispatchScheduled(
  controller: Pick<ScheduledController, 'scheduledTime' | 'cron'>,
  env: Env,
): Promise<void> {
  if (controller.cron === NIGHTLY_CRON) await handleScheduled(controller, env);
  else if (controller.cron === MINUTE_CRON) await handleMinute(controller, env);
  else throw new Error(`no run for the cron ${JSON.stringify(controller.cron)}`);
}

/**
 * The Oracle desk: read the tariff, check a draft of the next version, and
 * schedule it with who and why — each on the till's own clock (UTC). Its
 * arguments come from another Worker and are never trusted: a malformed
 * draft or author is answered with problems in words, never a throw; only a
 * failing database throws. Methods, not arrow properties: RPC exposes only
 * what the class's prototype declares.
 */
export class OracleDesk extends WorkerEntrypoint<Env> {
  /** Every version, the one in force today, and the sizes still charged to worlds. */
  async read(): Promise<DeskView> {
    return readDesk(this.env.TILL_DB, new Date());
  }

  /** Where the minute's poll has read Stripe up to, and whether it is more than two days behind. */
  async payments(): Promise<PollState> {
    return pollState(this.env.TILL_DB, new Date());
  }

  /** What scheduling `draft` now would replace and refuse; writes nothing. */
  async check(draft: unknown): Promise<DeskCheck> {
    return checkDraft(this.env.TILL_DB, draft, new Date());
  }

  /** Schedules `draft` as the next version, published now by the wallet `by`, or says why not. */
  async schedule(draft: unknown, by: unknown): Promise<DeskSchedule> {
    return scheduleDraft(this.env.TILL_DB, draft, by, new Date());
  }
}

/**
 * The account desk: each wallet's own account and its organizations, their
 * statements, their members, and top-ups through Stripe Checkout — each on
 * the till's own clock (UTC). `wallet` is the session's, as numinia.com
 * verified it; `house` is numinia.com's word that the session is the house's
 * staff (STD-051 ORG-007: the house enters an organization with an
 * administrator's reach as the organization allows, and its log keeps every
 * act of theirs). Every other argument comes from a browser through
 * numinia.com and is never trusted. A refusal is an answer with problems in
 * words; only a failing database, or Stripe failing to answer, throws.
 * Methods, not arrow properties: RPC exposes only what the prototype
 * declares.
 */
export class AccountDesk extends WorkerEntrypoint<Env> {
  /** The wallet's own account (created the first time) and its organizations, with balances. */
  async overview(wallet: unknown): Promise<Overview | Refusal> {
    return overview(this.env.TILL_DB, wallet, new Date());
  }

  /**
   * Every organization the house may enter, by name — ids and names only, no
   * money: to the house's staff alone (`house` true), since it lists
   * organizations a wallet is not in. A list of doors, not a way through one:
   * entering is decided, and logged, by the methods below.
   */
  async directory(wallet: unknown, house?: unknown): Promise<DirectoryAnswer> {
    return directory(this.env.TILL_DB, wallet, house);
  }

  /** A new organization, with the wallet as its first owner and the Team template's roles. */
  async createTeam(wallet: unknown, name: unknown): Promise<TeamAnswer> {
    return createTeam(this.env.TILL_DB, wallet, name, new Date());
  }

  /** What the wallet may do in an organization, its roles, and who holds each act. */
  async access(wallet: unknown, accountId: unknown, house?: unknown): Promise<AccessAnswer> {
    return access(this.env.TILL_DB, wallet, accountId, house, new Date());
  }

  /** An organization's roles with who holds them and which the asker may handle: to any member. */
  async roles(wallet: unknown, accountId: unknown, house?: unknown): Promise<RolesAnswer> {
    return rolesOf(this.env.TILL_DB, wallet, accountId, house, new Date());
  }

  /** How many people an organization has, asked with no wallet: a number, never a name (PRS-004). */
  async headcount(accountId: unknown): Promise<HeadcountAnswer> {
    return headcount(this.env.TILL_DB, accountId);
  }

  /** A new role just below the asker's highest, carrying only permissions the asker holds. */
  async createRole(
    wallet: unknown,
    accountId: unknown,
    role: unknown,
    house?: unknown,
  ): Promise<RolesAnswer> {
    return createRole(this.env.TILL_DB, wallet, accountId, role, house, new Date());
  }

  /** Edits a role below the asker's highest: name, colour, shown apart, what it carries. */
  async editRole(
    wallet: unknown,
    accountId: unknown,
    roleId: unknown,
    change: unknown,
    house?: unknown,
  ): Promise<RolesAnswer> {
    return editRole(this.env.TILL_DB, wallet, accountId, roleId, change, house, new Date());
  }

  /** Moves a role to a place of the list, below the asker's highest. */
  async moveRole(
    wallet: unknown,
    accountId: unknown,
    roleId: unknown,
    position: unknown,
    house?: unknown,
  ): Promise<RolesAnswer> {
    return moveRole(this.env.TILL_DB, wallet, accountId, roleId, position, house, new Date());
  }

  /** Deletes a role below the asker's highest; its holders lose it. */
  async deleteRole(
    wallet: unknown,
    accountId: unknown,
    roleId: unknown,
    house?: unknown,
  ): Promise<RolesAnswer> {
    return deleteRole(this.env.TILL_DB, wallet, accountId, roleId, house, new Date());
  }

  /** Gives a role to a member below the asker's highest role. */
  async giveRole(
    wallet: unknown,
    accountId: unknown,
    memberWallet: unknown,
    roleId: unknown,
    house?: unknown,
  ): Promise<RolesAnswer> {
    return assignRole(
      this.env.TILL_DB,
      true,
      wallet,
      accountId,
      memberWallet,
      roleId,
      house,
      new Date(),
    );
  }

  /** Takes a role from a member below the asker's highest role. */
  async takeRole(
    wallet: unknown,
    accountId: unknown,
    memberWallet: unknown,
    roleId: unknown,
    house?: unknown,
  ): Promise<RolesAnswer> {
    return assignRole(
      this.env.TILL_DB,
      false,
      wallet,
      accountId,
      memberWallet,
      roleId,
      house,
      new Date(),
    );
  }

  /** The organization's last hundred changes, newest first: to whoever may view its log. */
  async log(wallet: unknown, accountId: unknown, house?: unknown): Promise<LogAnswer> {
    return logOf(this.env.TILL_DB, wallet, accountId, house, new Date());
  }

  /** Renames an organization: whoever may manage it. */
  async renameTeam(
    wallet: unknown,
    accountId: unknown,
    name: unknown,
    house?: unknown,
  ): Promise<TeamAnswer> {
    return renameTeam(this.env.TILL_DB, wallet, accountId, name, house, new Date());
  }

  /** Balance, lots, spend over `range` (`7d`, `30d`, `12m`), the last lines and, for an organization, its members. */
  async statement(
    wallet: unknown,
    accountId: unknown,
    range: unknown,
    house?: unknown,
  ): Promise<StatementAnswer> {
    return statement(this.env.TILL_DB, wallet, accountId, range, house, new Date());
  }

  /** An organization's members: to any of them. */
  async members(wallet: unknown, accountId: unknown, house?: unknown): Promise<MembersAnswer> {
    return members(this.env.TILL_DB, wallet, accountId, house, new Date());
  }

  /** Adds a member, or makes one `admin` or `member`: only below one's own highest role, never oneself or an owner. */
  async setMember(
    wallet: unknown,
    accountId: unknown,
    memberWallet: unknown,
    role: unknown,
    house?: unknown,
  ): Promise<MembersAnswer> {
    return setMember(this.env.TILL_DB, wallet, accountId, memberWallet, role, house, new Date());
  }

  /** Removes a member below one's own highest role, or lets the wallet leave; never the last owner. */
  async removeMember(
    wallet: unknown,
    accountId: unknown,
    memberWallet: unknown,
    house?: unknown,
  ): Promise<MembersAnswer> {
    return removeMember(this.env.TILL_DB, wallet, accountId, memberWallet, house, new Date());
  }

  /** Opens a Stripe Checkout Session of 10, 50 or 100 € for the wallet's account or an organization where it may top up. */
  async startTopup(
    wallet: unknown,
    accountId: unknown,
    amountKey: unknown,
    returnBase: unknown,
    house?: unknown,
  ): Promise<TopupStart> {
    return startTopup(
      this.env.TILL_DB,
      paymentsFor(this.env),
      wallet,
      accountId,
      amountKey,
      returnBase,
      house,
      new Date(),
    );
  }

  /** When the buyer comes back: the session's state, credited once when paid. */
  async confirmTopup(wallet: unknown, sessionId: unknown): Promise<TopupConfirm> {
    return confirmTopup(this.env.TILL_DB, paymentsFor(this.env), wallet, sessionId, new Date());
  }

  // ---- «Tu nombre y tu cara» (2026-10-16, STD-053): a name and a Bazar avatar of one's own ----

  /** What the wallet published — its name and avatar — or null: to the wallet itself. */
  async profile(wallet: unknown): Promise<ProfileAnswer> {
    return profileAnswer(this.env.TILL_DB, wallet);
  }

  /**
   * Publishes or replaces the wallet's name and avatar (`{ name, avatar }`),
   * or stops showing them (`null`): the row is deleted, and no history kept.
   * Only the people who share an organization with it, and the house where
   * it enters, are ever shown them (`roles`).
   */
  async setProfile(wallet: unknown, change: unknown): Promise<ProfileAnswer> {
    return changeProfile(this.env.TILL_DB, wallet, change, new Date());
  }

  // ---- «El censo» (2026-10-16, STD-053): who has signed in, to the house alone ----

  /**
   * The wallet signed in now: its first time is kept, its last time moves
   * forward. Nothing else is kept — no address, no browser, no count.
   */
  async signedIn(wallet: unknown): Promise<SignedInAnswer> {
    return recordSignIn(this.env.TILL_DB, wallet, new Date());
  }

  /**
   * Everyone who has signed in, newest last time first, with the name and
   * avatar each published and how many organizations they are in; a search
   * (`query`, a piece of wallet or name) and pages of 200 (`cursor`). To the
   * house's staff alone (`house` true); the list belongs to no organization,
   * so reading it writes no `house-read` line.
   */
  async citizens(
    wallet: unknown,
    house?: unknown,
    query?: unknown,
    cursor?: unknown,
  ): Promise<CitizensAnswer> {
    return citizens(this.env.TILL_DB, wallet, house, query, cursor);
  }

  // ---- «Tu agenda» (2026-10-17): who is going to which encounter ----

  /** The wallet says it is going to the encounter `ritualId`; answers all the ids it is going to. */
  async rsvp(wallet: unknown, ritualId: unknown): Promise<MyRsvpsAnswer> {
    return rsvp(this.env.TILL_DB, wallet, ritualId, new Date());
  }

  /** The wallet is no longer going to `ritualId`; the row goes, no history kept. */
  async unrsvp(wallet: unknown, ritualId: unknown): Promise<MyRsvpsAnswer> {
    return unrsvp(this.env.TILL_DB, wallet, ritualId);
  }

  /** The ritual ids the wallet said it is going to, to the wallet itself. */
  async myRsvps(wallet: unknown): Promise<MyRsvpsAnswer> {
    return myRsvps(this.env.TILL_DB, wallet);
  }

  /** How many people are going to each of up to 100 encounters: public, who they are told to nobody. */
  async rsvpCounts(ritualIds: unknown): Promise<RsvpCountsAnswer> {
    return rsvpCounts(this.env.TILL_DB, ritualIds);
  }

  // ---- «Seguir» (2026-10-17): who follows which community ----

  /** The wallet follows the community `communityId`; answers all the ids it follows. */
  async follow(wallet: unknown, communityId: unknown): Promise<MyFollowsAnswer> {
    return follow(this.env.TILL_DB, wallet, communityId, new Date());
  }

  /** The wallet no longer follows `communityId`; the row goes, no history kept. */
  async unfollow(wallet: unknown, communityId: unknown): Promise<MyFollowsAnswer> {
    return unfollow(this.env.TILL_DB, wallet, communityId);
  }

  /** The community ids the wallet follows, to the wallet itself. */
  async myFollows(wallet: unknown): Promise<MyFollowsAnswer> {
    return myFollows(this.env.TILL_DB, wallet);
  }

  /** How many people follow each of up to 100 communities: public, who they are told to nobody. */
  async followCounts(communityIds: unknown): Promise<FollowCountsAnswer> {
    return followCounts(this.env.TILL_DB, communityIds);
  }

  // ---- «Una comunidad ES una organización» (2026-10-16): the house opens a community's account ----

  /**
   * The house opens the organization of a register community the first time
   * it uses it, and answers its account either way: the id is derived from
   * the community id, so two first calls make one. To the house's staff
   * alone (`house` true); the wallet is made a member holding the administrator role and the account
   * does not count against the founder bound.
   */
  async ensureCommunityTeam(
    wallet: unknown,
    house: unknown,
    communityId: unknown,
    name: unknown,
  ): Promise<EnsureAnswer> {
    return ensureCommunityTeam(this.env.TILL_DB, wallet, house, communityId, name, new Date());
  }

  // ---- «Ajustes de la comunidad» (cut 8, 2026-10-16): pieces, words and «Qué ha pasado» ----

  /** Which pieces of the panel are off and how it names things: to a member or the house. */
  async settings(wallet: unknown, accountId: unknown, house?: unknown): Promise<SettingsAnswer> {
    return settings(this.env.TILL_DB, wallet, accountId, house, new Date());
  }

  /** Turns pieces on or off and picks the words: whoever may manage the organization; logged. */
  async changeSettings(
    wallet: unknown,
    accountId: unknown,
    change: unknown,
    house?: unknown,
  ): Promise<SettingsAnswer> {
    return changeSettings(this.env.TILL_DB, wallet, accountId, change, house, new Date());
  }

  /** The organization's log as a readable list, 30 lines a page, newest first: to a member or the house. */
  async happenings(
    wallet: unknown,
    accountId: unknown,
    before?: unknown,
    house?: unknown,
  ): Promise<HappeningsAnswer> {
    return happenings(this.env.TILL_DB, wallet, accountId, before, house, new Date());
  }

  /**
   * The house opens the organization of 1 to 50 communities (`{ id, name }`
   * each) in one call, as `ensureCommunityTeam` does for one; answers
   * `{ ok: true, accounts: { id, name, created }[] }` in the order sent.
   */
  async openAllCommunities(
    wallet: unknown,
    house: unknown,
    communities: unknown,
  ): Promise<OpenAllAnswer> {
    return openAllCommunities(this.env.TILL_DB, wallet, house, communities, new Date());
  }

  // ---- «Hazla tuya» for real (cut G, 2026-10-17): claiming a community and asking to join it ----

  /** The signed-in wallet claims a community (`claim`) or asks to join it (`join`), with an optional note. */
  async requestCommunity(
    wallet: unknown,
    communityId: unknown,
    kind: unknown,
    note?: unknown,
  ): Promise<RequestAnswer> {
    return requestCommunity(this.env.TILL_DB, wallet, communityId, kind, note, new Date());
  }

  /** The wallet's own requests, newest first; `communityId` narrows them to one community. */
  async myCommunityRequests(wallet: unknown, communityId?: unknown): Promise<MyRequestsAnswer> {
    return myCommunityRequests(this.env.TILL_DB, wallet, communityId);
  }

  /**
   * The open requests of one community, to the house or an administrator of
   * its organization; with no community, every open one, to the house alone.
   */
  async communityRequests(
    wallet: unknown,
    house?: unknown,
    communityId?: unknown,
  ): Promise<RequestsAnswer> {
    return communityRequests(this.env.TILL_DB, wallet, house, communityId);
  }

  /**
   * Accepts or declines an open request: the house or an administrator of the
   * organization. `name` is the community's name, for the house to open the
   * organization when a claim is accepted before it is open. Logged.
   */
  async decideCommunityRequest(
    wallet: unknown,
    requestId: unknown,
    accept: unknown,
    house?: unknown,
    name?: unknown,
  ): Promise<RequestAnswer> {
    return decideCommunityRequest(
      this.env.TILL_DB,
      wallet,
      house,
      requestId,
      accept,
      name,
      new Date(),
    );
  }

  // ---- «Crear → Un encuentro» for real (cut M, 2026-10-17): encounters published from numinia.com ----

  /**
   * The house or an administrator of the community's organization publishes
   * an encounter: `draft` is `{ communityId, title, start, end?, mode, where,
   * note?, worldId? }`. Logged in «Qué ha pasado».
   */
  async createRitual(wallet: unknown, draft: unknown, house?: unknown): Promise<RitualAnswer> {
    return createRitual(this.env.TILL_DB, wallet, house, draft, new Date());
  }

  /** The same people cancel an encounter; once. Logged. */
  async cancelRitual(wallet: unknown, ritualId: unknown, house?: unknown): Promise<RitualAnswer> {
    return cancelRitual(this.env.TILL_DB, wallet, house, ritualId, new Date());
  }

  /** Public: the not cancelled encounters of `communityIds` (null: all); `upcoming` keeps those not over. */
  async ritualsOf(communityIds?: unknown, upcoming?: unknown): Promise<RitualsAnswer> {
    return ritualsOf(this.env.TILL_DB, communityIds, upcoming, new Date());
  }

  /** Public: one encounter by its till id, cancelled or not; `ritual` is null when there is none. */
  async ritual(
    ritualId: unknown,
  ): Promise<{ readonly ok: true; readonly ritual: TillRitual | null } | Refusal> {
    return ritualById(this.env.TILL_DB, ritualId);
  }

  // ---- «IAs de organización» (2026-10-17): the AIs an organization sends into its worlds ----

  /** The organization's agents with their state, to a member or the house. */
  async agents(wallet: unknown, accountId: unknown, house?: unknown): Promise<AgentsAnswer> {
    return agentsOf(this.env.TILL_DB, wallet, accountId, house, new Date());
  }

  /** A new agent: whoever holds manage-roles, as a member, who then answers for it (ORG-011); logged. */
  async createAgent(
    wallet: unknown,
    accountId: unknown,
    agent: unknown,
    house?: unknown,
  ): Promise<AgentsAnswer> {
    return createAgent(this.env.TILL_DB, wallet, accountId, agent, house, new Date());
  }

  /** Switches an agent on or off and/or sets its state (activa, dormida); logged. */
  async changeAgent(
    wallet: unknown,
    accountId: unknown,
    agentId: unknown,
    change: unknown,
    house?: unknown,
  ): Promise<AgentsAnswer> {
    return changeAgent(this.env.TILL_DB, wallet, accountId, agentId, change, house, new Date());
  }

  /** Removes an agent; logged. */
  async removeAgent(
    wallet: unknown,
    accountId: unknown,
    agentId: unknown,
    house?: unknown,
  ): Promise<AgentsAnswer> {
    return removeAgent(this.env.TILL_DB, wallet, accountId, agentId, house, new Date());
  }

  /** Gives a role to an agent below the asker's highest role; logged. */
  async giveAgentRole(
    wallet: unknown,
    accountId: unknown,
    agentId: unknown,
    roleId: unknown,
    house?: unknown,
  ): Promise<AgentsAnswer> {
    return assignAgentRole(
      this.env.TILL_DB,
      true,
      wallet,
      accountId,
      agentId,
      roleId,
      house,
      new Date(),
    );
  }

  /** Takes a role from an agent below the asker's highest role; logged. */
  async takeAgentRole(
    wallet: unknown,
    accountId: unknown,
    agentId: unknown,
    roleId: unknown,
    house?: unknown,
  ): Promise<AgentsAnswer> {
    return assignAgentRole(
      this.env.TILL_DB,
      false,
      wallet,
      accountId,
      agentId,
      roleId,
      house,
      new Date(),
    );
  }

  /**
   * What an agent's pass is made of (its key, switch, state, who answers for
   * it, what it holds): asked with no wallet by numinia.com, which signs
   * nothing before it has verified the agent's signature. Read-only.
   */
  async agentPass(accountId: unknown, agentId: unknown): Promise<AgentPassAnswer> {
    return agentPass(this.env.TILL_DB, accountId, agentId);
  }

  /** Uses up one signed pass request (agent, world, second): a second use is refused (replay). */
  async claimAgentPass(
    accountId: unknown,
    agentId: unknown,
    aud: unknown,
    t: unknown,
  ): Promise<ClaimAnswer> {
    return claimAgentPass(this.env.TILL_DB, accountId, agentId, aud, t, new Date());
  }

  // ---- «Mundos ↔ organizaciones» (2026-10-16): which organization each world belongs to ----

  /**
   * The house places 1 to 50 worlds (fleet ids) in one organization, which
   * pays for them and administers them; a world has exactly one. To the
   * house's staff alone (`house` true). Not the billing table `worlds`.
   */
  async placeWorld(
    wallet: unknown,
    house: unknown,
    worldIds: unknown,
    accountId: unknown,
  ): Promise<PlaceAnswer> {
    return placeWorld(this.env.TILL_DB, wallet, house, worldIds, accountId, new Date());
  }

  /** Where every placed world stands, with the organization's name: to the house alone. */
  async placements(wallet: unknown, house?: unknown): Promise<PlacementsAnswer> {
    return placements(this.env.TILL_DB, wallet, house);
  }

  /** The worlds placed in one organization: to its members and owners, and the house. */
  async worldsOf(wallet: unknown, house: unknown, accountId: unknown): Promise<WorldsOfAnswer> {
    return worldsOf(this.env.TILL_DB, wallet, house, accountId);
  }

  /**
   * The organization one world belongs to — public, so `wallet` and `house`
   * may be absent — and `manage`: the caller is a member, an owner or the house.
   */
  async homeOf(worldId: unknown, wallet?: unknown, house?: unknown): Promise<HomeOfAnswer> {
    return homeOf(this.env.TILL_DB, worldId, wallet, house);
  }
}

/** The fleet's DNS over this Worker's token, or a desk that answers `not-configured`. */
export function fleetDnsFor(
  env: Pick<Env, 'CLOUDFLARE_DNS_TOKEN'>,
  fetcher?: DnsFetcher,
): FleetDns {
  const token = env.CLOUDFLARE_DNS_TOKEN;
  // Deployed, the runtime's own fetch (called, never detached); tests inject a fake Cloudflare.
  const call: DnsFetcher = fetcher ?? ((url, init) => fetch(url, init));
  return new FleetDns(
    token === undefined || token === '' ? null : new CloudflareDns(token, call),
    call,
  );
}

/**
 * The DNS desk: a world's address written by the fleet itself, so a world
 * on any machine but the first needs no record made by hand. Bound by
 * numinia.com as `TILL_DNS`; its API route checks the Oracle's session
 * (`manage-worlds`), maps the machine to its public host name from its own
 * list and passes the session's wallet as `by`. Every argument is
 * re-validated (lib/fleet-dns.ts holds the rails); a refusal is an answer,
 * only Cloudflare failing to answer throws. Methods, not arrow properties:
 * RPC exposes only what the prototype declares.
 */
export class DnsDesk extends WorkerEntrypoint<Env> {
  /** Who answers for an address today (the wildcard, the fleet, or a record by hand) and where the machine of `host` is. */
  async look(domain: unknown, host?: unknown): Promise<DnsLook | DnsRefusal> {
    return fleetDnsFor(this.env).look(domain, host);
  }

  /** Points the address at the machine (A, DNS only), creating or moving the fleet's record. */
  async point(
    domain: unknown,
    machine: unknown,
    host: unknown,
    by: unknown,
  ): Promise<DnsDone | DnsRefusal> {
    return fleetDnsFor(this.env).point(domain, machine, host, by);
  }

  /** Deletes the fleet's record of the address for this machine; one made by hand stays. */
  async release(domain: unknown, machine: unknown): Promise<DnsDone | DnsRefusal> {
    return fleetDnsFor(this.env).release(domain, machine);
  }
}

const worker = {
  fetch: (request: Request): Response => handleFetch(request),
  scheduled: async (controller: ScheduledController, env: Env): Promise<void> => {
    await dispatchScheduled(controller, env);
  },
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line no-restricted-syntax -- the Workers runtime calls the module's default export
export default worker;
