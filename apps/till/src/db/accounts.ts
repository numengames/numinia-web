/**
 * The account desk's database work (cut «Saldo», MIS-179, MIS-180): what
 * numinia.com's Saldo screen reads and does through the till's
 * `AccountDesk` entrypoint (src/worker.ts). Each wallet sees its own
 * account and the organizations (teams) it belongs to.
 *
 * Inside an organization, what each wallet may do comes from that
 * organization's own roles (numinia-archive ADR-071: the rules are STD-051,
 * worked out by @numinia/domain; src/db/organizations.ts reads them at every
 * request). The Saldo screen still speaks of `admin` and `member`: `admin` is
 * an owner or whoever holds administrator, and «make admin» gives the highest
 * role carrying administrator below the one who asks.
 *
 * Who is calling is numinia.com's signed session: the till trusts its bound
 * caller for the wallet — and for `house`, its word that the wallet is the
 * house's staff — and decides here, from its own tables, what that wallet may
 * do. Every argument is read as untrusted (`src/lib/accounts.ts`); a refusal
 * is an answer with problems in words, never a throw. Only a failing
 * database, or Stripe failing to answer, throws — so the caller can tell a
 * failure from a refusal.
 *
 * A top-up is credited by `applySession`, the one place that turns a paid
 * Stripe Checkout Session into a `topup` line: when the buyer comes back
 * (`confirmTopup`) and when the minute's poll reads Stripe's events
 * (`pollStripe`). Both may see the same payment, any number of times: the
 * line carries the payment intent as `stripe_payment_id`, and the ledger's
 * keep-first trigger (0001) drops a second insert of it.
 */

import {
  DEFAULT_LOCALE,
  accessOf,
  canActOnMember,
  canAssignRole,
  canLeave,
  rolesFromTemplate,
  type HouseAccess,
  type OrganizationAccess,
} from '@numinia/domain';
import {
  LOW_BALANCE_CENTS,
  readAccountId,
  readAmountKey,
  readMemberWallet,
  readRange,
  readReturnBase,
  readRole,
  readSessionId,
  readTeamName,
  readWallet,
  spendBuckets,
  type AmountKey,
  type SpendBucket,
  type SpendRange,
  type TeamRole,
  type TopupPrices,
} from '../lib/accounts';
import { compareLines, lineId, lotsAt, type LedgerLine } from '../lib/ledger';
import {
  ACTS,
  ORG_PROBLEMS,
  administratorRoleFor,
  compatRole,
  holdersOf,
  needs,
  readHouse,
  refusalOf,
  topDown,
} from '../lib/organizations';
import type { CheckoutSession, SessionEvent, Stripe } from '../lib/stripe';
import { dayOf } from '../lib/utc-day';
import {
  ADD_MEMBER,
  DROP_MEMBER,
  GIVE_ROLE,
  MIRROR_ROLE,
  RENAME,
  TAKE_ROLE,
  accessIn,
  actingIn,
  commit,
  loadOrganization,
  logLine,
  memberIn,
  type Acting,
  type ActingAs,
  type LogAct,
  type Organization,
} from './organizations';
import { cents, column, day, instant, text, type Row, type TillDatabase } from './repository';

/** One account as a wallet sees it: its own, or an organization it belongs to. */
export interface AccountSummary {
  readonly id: string;
  readonly kind: 'personal' | 'team';
  /** An organization's name; null for a personal account. */
  readonly name: string | null;
  /** `owner` of one's own account; of an organization, `admin` for an owner or a holder of administrator, `member` otherwise. */
  readonly role: 'owner' | TeamRole;
  readonly balanceCents: number;
}

/** A refusal: what is wrong, in words. Nothing was written. */
export interface Refusal {
  readonly ok: false;
  readonly problems: readonly string[];
}

export interface Overview {
  readonly ok: true;
  /** The wallet's own account first, then its organizations by name. */
  readonly accounts: readonly AccountSummary[];
}

export type TeamAnswer = { readonly ok: true; readonly account: AccountSummary } | Refusal;

/** A lot: a positive line, and how much of it is left now. */
export interface StatementLot {
  readonly lineId: string;
  readonly at: string;
  readonly amountCents: number;
  readonly remainderCents: number;
}

/** A line as the screen lists it: the fields of its kind only. */
export interface StatementLine {
  readonly id: string;
  readonly kind: LedgerLine['kind'];
  readonly at: string;
  readonly amountCents: number;
  /** A top-up's VAT. */
  readonly vatCents?: number;
  /** A world's day: the UTC date, the world and its size. */
  readonly day?: string;
  readonly worldId?: string;
  readonly size?: string;
  /** An adjustment's reason. */
  readonly reason?: string;
}

export interface Member {
  readonly wallet: string;
  readonly role: TeamRole;
  readonly addedAt: string;
}

export interface Statement {
  readonly ok: true;
  readonly account: AccountSummary;
  readonly balanceCents: number;
  /** Under 10 €: the screen warns. */
  readonly lowBalance: boolean;
  /** Every lot, oldest first, with what is left of it now. */
  readonly lots: readonly StatementLot[];
  /** What worlds' days cost in the range, every bucket present, oldest first. */
  readonly spend: readonly SpendBucket[];
  readonly spendTotalCents: number;
  /** The last 100 lines, newest first. */
  readonly lines: readonly StatementLine[];
  /** An organization's members (admins first); absent for a personal account. */
  readonly members?: readonly Member[];
}

export type StatementAnswer = Statement | Refusal;

export type MembersAnswer = { readonly ok: true; readonly members: readonly Member[] } | Refusal;

/** A role as `access` shows it. */
interface RoleView {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly position: number;
  readonly hoist: boolean;
}

/** What a wallet may do in an organization: the question numinia.com asks before it shows anything. */
interface AccessView {
  readonly ok: true;
  readonly accountId: string;
  /** On whose behalf it acts there: its own as an owner or a member, or the house's. */
  readonly as: ActingAs;
  /** In the register's order: the permissions, then the owners' acts. */
  readonly permissions: readonly OrganizationAccess[];
  /** The roles it holds, the base role included, from the top down; the house holds none. */
  readonly roles: readonly RoleView[];
  /** For every act, the roles that carry it, from the top down; the owners hold them all. */
  readonly holders: Readonly<Record<OrganizationAccess, readonly string[]>>;
  readonly houseAccess: HouseAccess;
}

export type AccessAnswer = AccessView | Refusal;

export type TopupStart = { readonly ok: true; readonly url: string } | Refusal;

export type CheckoutState = 'open' | 'paid' | 'expired';

export type TopupConfirm =
  | {
      readonly ok: true;
      readonly state: CheckoutState;
      readonly accountId: string;
      readonly balanceCents: number;
    }
  | Refusal;

/** What taking payments needs: the Stripe client and the price of each quick top-up. Null: not configured. */
export interface Payments {
  readonly stripe: Stripe;
  readonly prices: TopupPrices;
}

/** What one minute's poll of Stripe's events did. */
export interface PollRun {
  /** Events read, every page. */
  readonly events: number;
  /** Paid sessions of the till's checkouts applied (a payment seen again counts again: it writes nothing). */
  readonly applied: number;
  /** Paid sessions the till refused to credit (wrong currency, account or amounts). */
  readonly uncreditable: number;
  /** Refund, dispute and dispute-won events of the till's own top-ups applied (again: nothing written). */
  readonly takenBack: number;
  /** Refunds or disputes of the till's top-ups it could not apply (not euros). */
  readonly unapplied: number;
  /** The high-water mark after the run (unix seconds). */
  readonly cursor: number;
  /** False when more events remained than one run reads: the cursor did not move. */
  readonly complete: boolean;
  /** The cursor was, before this run, or still is after it, more than two days behind now. */
  readonly lagging: boolean;
}

export const PROBLEMS = {
  wallet: 'wallet must be a lowercase 0x wallet',
  accountId: 'accountId must be an account id',
  name: 'name must be 1 to 60 characters, none of them a control character',
  notMember: 'not a member',
  notTeam: 'not an organization',
  memberWallet: 'memberWallet must be a 0x wallet',
  role: 'role must be admin or member',
  noSuchMember: 'that wallet is not a member of the organization',
  range: 'range must be 7d, 30d or 12m',
  amountKey: 'amountKey must be 10, 50 or 100',
  returnBase: 'returnBase must be a page of https://numinia.com/ or of a local run',
  notConfigured: 'payments are not configured',
  sessionId: 'sessionId must be a Checkout Session id',
  notOurs: 'not a checkout of this wallet',
  uncreditable: 'Stripe answered a payment the till cannot credit: tell an Oracle',
  teamsPerFounder: 'a wallet may found at most 20 organizations',
  meanwhile: 'the organization changed meanwhile: read it again',
} as const;

/** How many organizations one wallet may found: enough for anyone, a bound for a script. */
export const TEAMS_PER_FOUNDER = 20;

/** How many lines a statement lists. */
export const STATEMENT_LINES = 100;

/** The events of a paid session: paid at once, or later (a bank transfer, SEPA). */
export const PAID_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
] as const;

/**
 * Every event the minute's poll reads: the paid ones; a late payment that
 * failed; and the money Stripe takes back — a refund (Managed Payments may
 * refund up to 60 days after the sale, and applies the EU withdrawal period)
 * or a dispute, and a dispute's end, which gives it back when it is won.
 */
export const POLLED_EVENTS = [
  ...PAID_EVENTS,
  'checkout.session.async_payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
] as const;

/** Stripe keeps events 30 days: a cursor more than two days behind is told (logs and the Oracle's room). */
export const LAG_SECONDS = 2 * 86_400;

/** Who writes the line that gives a won dispute back. */
export const STRIPE_AUTHOR = 'stripe';

/** Seconds the poll reads back past its cursor: Stripe's `created` is not strictly ordered with its writes. */
export const POLL_OVERLAP_SECONDS = 300;

/** The first poll, with no cursor yet, reads the last day. */
export const FIRST_POLL_SECONDS = 86_400;

/** Pages one minute's run reads at most (100 events each). */
export const POLL_MAX_PAGES = 20;

export function refuse(...problems: string[]): Refusal {
  return { ok: false, problems };
}

/**
 * A wallet's personal account id: derived from the wallet, so two first
 * calls at once create one account, and without the wallet in it.
 */
export async function personalAccountId(wallet: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`numinia-till personal account ${wallet}`),
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0'));
  return `acc_p_${hex.join('').slice(0, 24)}`;
}

/** A new organization's id: random, as nothing about it is known in advance. */
function teamAccountId(): string {
  return `acc_t_${crypto.randomUUID().replaceAll('-', '')}`;
}

const BALANCE = `(SELECT coalesce(SUM(amount_cents), 0) FROM ledger_lines WHERE account_id = a.id)`;

/**
 * The Saldo screen's role of the member row `m`: `admin` for an owner or a
 * holder of administrator — through a role given, or through the base role —
 * and `member` otherwise. What anyone may do is never read from it.
 */
const SALDO_ROLE = `
  CASE WHEN m.owner = 1 OR EXISTS (
    SELECT 1 FROM team_roles AS r, json_each(r.permissions) AS p
     WHERE r.account_id = m.account_id AND p.value = 'administrator'
       AND (r.position = 0 OR EXISTS (
         SELECT 1 FROM team_member_roles AS h
          WHERE h.account_id = m.account_id AND h.wallet = m.wallet AND h.role_id = r.id)))
  THEN 'admin' ELSE 'member' END`;

/** Every account the wallet ?1 may see: its own and its organizations', with role and balance. */
const SELECT_ACCOUNTS = `
  SELECT a.id AS id, a.kind AS kind, NULL AS name, 'owner' AS role, ${BALANCE} AS balance_cents
    FROM account_wallets AS w JOIN accounts AS a ON a.id = w.account_id
   WHERE w.wallet = ?1
  UNION ALL
  SELECT a.id, a.kind, p.name, ${SALDO_ROLE}, ${BALANCE}
    FROM team_members AS m
    JOIN accounts AS a ON a.id = m.account_id
    JOIN team_profiles AS p ON p.account_id = a.id
   WHERE m.wallet = ?1
   ORDER BY kind, name COLLATE NOCASE, id`;

/** One account ?1 as the wallet ?2 sees it; no row when the wallet is neither its owner nor a member. */
const SELECT_ACCOUNT = `
  SELECT a.id AS id, a.kind AS kind, p.name AS name,
         CASE WHEN w.wallet IS NOT NULL THEN 'owner' ELSE ${SALDO_ROLE} END AS role,
         ${BALANCE} AS balance_cents
    FROM accounts AS a
    LEFT JOIN account_wallets AS w ON w.account_id = a.id AND w.wallet = ?2
    LEFT JOIN team_profiles AS p ON p.account_id = a.id
    LEFT JOIN team_members AS m ON m.account_id = a.id AND m.wallet = ?2
   WHERE a.id = ?1 AND (w.wallet IS NOT NULL OR m.wallet IS NOT NULL)`;

/** An organization's members as the Saldo screen lists them: admins first, then by arrival. */
const SELECT_MEMBERS = `
  SELECT wallet, role, added_at FROM (
    SELECT m.wallet AS wallet, ${SALDO_ROLE} AS role, m.added_at AS added_at
      FROM team_members AS m WHERE m.account_id = ?1)
   ORDER BY role = 'member', added_at, wallet`;

const SELECT_LINES = `
  SELECT id, account_id, kind, amount_cents, at, vat_cents, stripe_payment_id, stripe_invoice_id,
         world_id, machine, day, minutes_running, minutes_stopped, size, tariff_version_id,
         "by", reason, corrects_line_id, lot_line_id, stripe_event_id
    FROM ledger_lines WHERE account_id = ?1 ORDER BY at, id`;

const INSERT_PERSONAL = `
  INSERT INTO accounts (id, kind, created_at) VALUES (?1, 'personal', ?2) ON CONFLICT DO NOTHING`;

const INSERT_WALLET = `
  INSERT INTO account_wallets (wallet, account_id) VALUES (?1, ?2) ON CONFLICT DO NOTHING`;

/** A new organization, written only while its founder has founded fewer than the bound. */
const INSERT_TEAM = `
  INSERT INTO accounts (id, kind, created_at)
  SELECT ?1, 'team', ?2
   WHERE (SELECT COUNT(*) FROM team_profiles WHERE created_by = ?3) < ?4`;

const INSERT_PROFILE = `
  INSERT INTO team_profiles (account_id, name, created_by, created_at)
  SELECT ?1, ?2, ?3, ?4 WHERE EXISTS (SELECT 1 FROM accounts WHERE id = ?1)`;

/** The founder joins as the organization's first owner (ORG-002); `admin` is for a Worker still reading the old column. */
const INSERT_FOUNDER = `
  INSERT INTO team_members (account_id, wallet, role, added_by, added_at, owner)
  SELECT ?1, ?2, 'admin', ?2, ?3, 1 WHERE EXISTS (SELECT 1 FROM team_profiles WHERE account_id = ?1)`;

/** One of the roles a new organization is born with (STD-052). */
const INSERT_ROLE = `
  INSERT INTO team_roles (account_id, id, name, color, position, hoist, permissions)
  SELECT ?1, ?2, ?3, NULL, ?4, ?5, ?6 WHERE EXISTS (SELECT 1 FROM team_profiles WHERE account_id = ?1)`;

const INSERT_CHECKOUT = `
  INSERT INTO checkouts (id, account_id, wallet, amount_key, created_at, state)
  VALUES (?1, ?2, ?3, ?4, ?5, 'open')`;

const SELECT_CHECKOUT = 'SELECT id, account_id, wallet, state FROM checkouts WHERE id = ?1';

const SELECT_CHECKOUTS = `
  SELECT id, account_id, wallet, state FROM checkouts
   WHERE id IN (SELECT value FROM json_each(?1))`;

const INSERT_TOPUP = `
  INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents,
                            stripe_payment_id, stripe_invoice_id)
  VALUES (?1, ?2, 'topup', ?3, ?4, ?5, ?6, ?7)`;

const MARK_PAID = "UPDATE checkouts SET state = 'paid' WHERE id = ?1 AND state <> 'paid'";

const MARK_EXPIRED = "UPDATE checkouts SET state = 'expired' WHERE id = ?1 AND state = 'open'";

const SELECT_BALANCE =
  'SELECT coalesce(SUM(amount_cents), 0) AS balance_cents FROM ledger_lines WHERE account_id = ?1';

const SELECT_CURSOR = 'SELECT last_created FROM stripe_cursor WHERE id = 1';

const MOVE_CURSOR = `
  INSERT INTO stripe_cursor (id, last_created) VALUES (1, ?1)
  ON CONFLICT (id) DO UPDATE SET last_created = max(last_created, excluded.last_created)`;

function nullable<T>(row: Row, name: string, read: (row: Row, name: string) => T): T | null {
  return column(row, name) === null ? null : read(row, name);
}

function roleOf(value: string): AccountSummary['role'] {
  if (value === 'owner' || readRole(value) !== undefined) return value as AccountSummary['role'];
  throw new TypeError(`till database: unknown role ${value}`);
}

export function summaryOf(row: Row): AccountSummary {
  const kind = text(row, 'kind');
  if (kind !== 'personal' && kind !== 'team') {
    throw new TypeError(`till database: unknown kind ${kind}`);
  }
  return {
    id: text(row, 'id'),
    kind,
    name: kind === 'team' ? text(row, 'name') : null,
    role: roleOf(text(row, 'role')),
    balanceCents: cents(row, 'balance_cents'),
  };
}

export function memberOf(row: Row): Member {
  const role = readRole(text(row, 'role'));
  if (role === undefined) throw new TypeError('till database: a member is an admin or a member');
  return {
    wallet: text(row, 'wallet'),
    role,
    addedAt: instant(row, 'added_at'),
  };
}

/** A `ledger_lines` row as the ledger's own type; a throw when the schema's promise is broken. */
export function ledgerLineOf(row: Row): LedgerLine {
  const base = {
    id: text(row, 'id'),
    accountId: text(row, 'account_id'),
    amountCents: cents(row, 'amount_cents'),
    at: instant(row, 'at'),
  };
  const kind = text(row, 'kind');
  switch (kind) {
    case 'topup':
      return {
        ...base,
        kind,
        vatCents: cents(row, 'vat_cents'),
        stripePaymentId: nullable(row, 'stripe_payment_id', text),
        stripeInvoiceId: nullable(row, 'stripe_invoice_id', text),
      };
    case 'world_day':
      return {
        ...base,
        kind,
        worldId: text(row, 'world_id'),
        machine: text(row, 'machine'),
        day: day(row, 'day'),
        minutesRunning: cents(row, 'minutes_running'),
        minutesStopped: cents(row, 'minutes_stopped'),
        size: text(row, 'size'),
        tariffVersionId: cents(row, 'tariff_version_id'),
      };
    case 'adjustment':
      return {
        ...base,
        kind,
        by: text(row, 'by'),
        reason: text(row, 'reason'),
        correctsLineId: nullable(row, 'corrects_line_id', text),
      };
    case 'refund':
    case 'chargeback':
      return {
        ...base,
        kind,
        lotLineId: text(row, 'lot_line_id'),
        stripeEventId: nullable(row, 'stripe_event_id', text),
      };
    default:
      throw new TypeError(`till database: unknown line kind ${kind}`);
  }
}

/** A line as the statement lists it. */
function statementLineOf(line: LedgerLine): StatementLine {
  const base = { id: line.id, kind: line.kind, at: line.at, amountCents: line.amountCents };
  switch (line.kind) {
    case 'topup':
      return { ...base, vatCents: line.vatCents };
    case 'world_day':
      return { ...base, day: line.day, worldId: line.worldId, size: line.size };
    case 'adjustment':
      return { ...base, reason: line.reason };
    default:
      return base;
  }
}

async function batchOf(db: TillDatabase, statements: D1PreparedStatement[]): Promise<Row[][]> {
  const results = await db.batch<Row>(statements);
  if (results.length !== statements.length) {
    throw new Error(`till database: ${statements.length} statements, ${results.length} answers`);
  }
  return results.map((result) => result.results);
}

/** The account `accountId` as `wallet` sees it, or null when the wallet is neither its owner nor a member. */
async function accountFor(
  db: TillDatabase,
  wallet: string,
  accountId: string,
): Promise<AccountSummary | null> {
  const row = await db.prepare(SELECT_ACCOUNT).bind(accountId, wallet).first<Row>();
  return row === null ? null : summaryOf(row);
}

/** An organization as someone entered it: its tables as read now, and on whose behalf they act. */
export interface Entered {
  readonly org: Organization;
  readonly acting: Acting;
}

/**
 * The organization `accountId` as `wallet` enters it — as an owner, the
 * house's staff or a member — or why not: a stranger to it, or no
 * organization at all.
 */
export async function enter(
  db: TillDatabase,
  wallet: string,
  accountId: string,
  house: boolean,
): Promise<Entered | Refusal> {
  const org = await loadOrganization(db, accountId);
  if (org === null) {
    const account = await accountFor(db, wallet, accountId);
    return refuse(account === null ? PROBLEMS.notMember : PROBLEMS.notTeam);
  }
  const acting = actingIn(org, wallet, house);
  return acting === null ? refuse(PROBLEMS.notMember) : { org, acting };
}

/** Null when the one who entered may do `act`; otherwise the refusal, naming who holds it. */
export function lacking({ org, acting }: Entered, act: OrganizationAccess): Refusal | null {
  return acting.access.permissions.has(act)
    ? null
    : refuse(needs(act, holdersOf(org.state.roles, act)));
}

/** Writes down what the house's staff read (ORG-009): every act of theirs is logged, reads too. */
export async function houseRead(
  { org, acting }: Entered,
  db: TillDatabase,
  now: Date,
  what: string,
) {
  if (acting.as !== 'house') return;
  await logLine(db, org.accountId, now, acting, 'house-read', null, { what }, null).run();
}

/** The organization as the one who entered it sees it on the Saldo screen. */
function summaryIn({ org, acting }: Entered): AccountSummary {
  return {
    id: org.accountId,
    kind: 'team',
    name: org.name,
    role: compatRole(acting.access),
    balanceCents: org.balanceCents,
  };
}

/** A new role's id: random, unique within its organization. */
export function roleId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `role_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function membersOf(db: TillDatabase, accountId: string): Promise<Member[]> {
  const { results } = await db.prepare(SELECT_MEMBERS).bind(accountId).all<Row>();
  return results.map(memberOf);
}

/**
 * The wallet's own account (created the first time the till sees the
 * wallet, in the same batch that reads it) and every organization it
 * belongs to, with its role and balance.
 */
export async function overview(
  db: TillDatabase,
  sent: unknown,
  now: Date,
): Promise<Overview | Refusal> {
  const wallet = readWallet(sent);
  if (wallet === undefined) return refuse(PROBLEMS.wallet);
  const personal = await personalAccountId(wallet);
  const [, , rows] = await batchOf(db, [
    db.prepare(INSERT_PERSONAL).bind(personal, now.toISOString()),
    db.prepare(INSERT_WALLET).bind(wallet, personal),
    db.prepare(SELECT_ACCOUNTS).bind(wallet),
  ]);
  return { ok: true, accounts: (rows as Row[]).map(summaryOf) };
}

/**
 * A new organization named `sentName`, founded by the wallet, its first
 * owner, born with the Team template of STD-052 — the roles of MIS-179 —
 * named in the site's default language.
 */
export async function createTeam(
  db: TillDatabase,
  sent: unknown,
  sentName: unknown,
  now: Date,
): Promise<TeamAnswer> {
  const wallet = readWallet(sent);
  const name = readTeamName(sentName);
  const problems = [
    ...(wallet === undefined ? [PROBLEMS.wallet] : []),
    ...(name === undefined ? [PROBLEMS.name] : []),
  ];
  if (wallet === undefined || name === undefined) return refuse(...problems);
  const id = teamAccountId();
  const at = now.toISOString();
  const roles = rolesFromTemplate('team', DEFAULT_LOCALE, roleId);
  const results = await db.batch([
    db.prepare(INSERT_TEAM).bind(id, at, wallet, TEAMS_PER_FOUNDER),
    db.prepare(INSERT_PROFILE).bind(id, name, wallet, at),
    db.prepare(INSERT_FOUNDER).bind(id, wallet, at),
    ...roles.map((role) =>
      db
        .prepare(INSERT_ROLE)
        .bind(
          id,
          role.id,
          role.name,
          role.position,
          role.hoist ? 1 : 0,
          JSON.stringify(role.permissions),
        ),
    ),
    // Guarded by the new organization's first revision: nothing when it was not founded.
    logLine(
      db,
      id,
      now,
      { wallet, as: 'owner' },
      'organization-created',
      null,
      { name, template: 'team' },
      0,
    ),
  ]);
  if (results[0]?.meta.changes !== 1) return refuse(PROBLEMS.teamsPerFounder);
  return { ok: true, account: { id, kind: 'team', name, role: 'admin', balanceCents: 0 } };
}

/** Renames an organization: whoever may manage it (`manage-organization`). */
export async function renameTeam(
  db: TillDatabase,
  sent: unknown,
  sentAccount: unknown,
  sentName: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<TeamAnswer> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const name = readTeamName(sentName);
  const house = readHouse(sentHouse);
  if (
    wallet === undefined ||
    accountId === undefined ||
    name === undefined ||
    house === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(name === undefined ? [PROBLEMS.name] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const entered = await enter(db, wallet, accountId, house);
  if ('problems' in entered) return entered;
  const refused = lacking(entered, 'manage-organization');
  if (refused !== null) return refused;
  const { org, acting } = entered;
  const renamed = await commit(
    db,
    org,
    [
      logLine(
        db,
        accountId,
        now,
        acting,
        'organization-renamed',
        null,
        { from: org.name, to: name },
        org.revision,
      ),
    ],
    db.prepare(RENAME).bind(accountId, org.revision, name),
  );
  if (!renamed) return refuse(PROBLEMS.meanwhile);
  return { ok: true, account: { ...summaryIn(entered), name } };
}

/**
 * The statement of an account the wallet owns or belongs to: balance,
 * lots, the spend of `sentRange` in UTC days or months, the last lines and,
 * for an organization, its members — read in one batch.
 */
export async function statement(
  db: TillDatabase,
  sent: unknown,
  sentAccount: unknown,
  sentRange: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<StatementAnswer> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const range: SpendRange | undefined = readRange(sentRange);
  const house = readHouse(sentHouse);
  if (
    wallet === undefined ||
    accountId === undefined ||
    range === undefined ||
    house === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(range === undefined ? [PROBLEMS.range] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  let account: AccountSummary;
  const org = await loadOrganization(db, accountId);
  if (org === null) {
    const own = await accountFor(db, wallet, accountId);
    if (own === null) return refuse(PROBLEMS.notMember);
    account = own;
  } else {
    const acting = actingIn(org, wallet, house);
    if (acting === null) return refuse(PROBLEMS.notMember);
    const entered = { org, acting };
    const refused = lacking(entered, 'view-balance');
    if (refused !== null) return refused;
    await houseRead(entered, db, now, 'statement');
    account = summaryIn(entered);
  }
  const [lineRows, memberRows] = (await batchOf(db, [
    db.prepare(SELECT_LINES).bind(accountId),
    db.prepare(SELECT_MEMBERS).bind(accountId),
  ])) as [Row[], Row[]];
  const lines = lineRows.map(ledgerLineOf);
  const spend = spendBuckets(
    range,
    dayOf(now),
    lines.flatMap((line) =>
      line.kind === 'world_day' ? [{ day: line.day, cents: -line.amountCents }] : [],
    ),
  );
  const answer: Statement = {
    ok: true,
    account,
    balanceCents: account.balanceCents,
    lowBalance: account.balanceCents < LOW_BALANCE_CENTS,
    lots: lotsAt(lines, now.toISOString()).lots.map((lot) => ({ ...lot })),
    spend,
    spendTotalCents: spend.reduce((sum, bucket) => sum + bucket.cents, 0),
    lines: [...lines]
      .sort((a, b) => compareLines(b, a))
      .slice(0, STATEMENT_LINES)
      .map(statementLineOf),
  };
  return account.kind === 'team' ? { ...answer, members: memberRows.map(memberOf) } : answer;
}

/** An organization's members: any of them, and the house's staff where it may enter. */
export async function members(
  db: TillDatabase,
  sent: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<MembersAnswer> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const house = readHouse(sentHouse);
  if (wallet === undefined || accountId === undefined || house === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const entered = await enter(db, wallet, accountId, house);
  if ('problems' in entered) return entered;
  await houseRead(entered, db, now, 'members');
  return { ok: true, members: await membersOf(db, accountId) };
}

/**
 * What the wallet may do in the organization (STD-051, worked out by
 * @numinia/domain from the tables as they are now): on whose behalf it acts,
 * every act it may do, the roles it holds, and for every act the roles that
 * hold it — so a screen can say why a door is closed and who could open it.
 */
export async function access(
  db: TillDatabase,
  sent: unknown,
  sentAccount: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<AccessAnswer> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const house = readHouse(sentHouse);
  if (wallet === undefined || accountId === undefined || house === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const entered = await enter(db, wallet, accountId, house);
  if ('problems' in entered) return entered;
  await houseRead(entered, db, now, 'access');
  const { org, acting } = entered;
  const held = acting.as === 'house' ? [] : (memberIn(org, wallet)?.roleIds ?? []);
  const roles = topDown(org.state.roles).filter(
    (role) => acting.as !== 'house' && (role.position === 0 || held.includes(role.id)),
  );
  return {
    ok: true,
    accountId,
    as: acting.as,
    permissions: ACTS.filter((act) => acting.access.permissions.has(act)),
    roles: roles.map(({ id, name, color, position, hoist }) => ({
      id,
      name,
      color,
      position,
      hoist,
    })),
    holders: Object.fromEntries(
      ACTS.map((act) => [act, holdersOf(org.state.roles, act)]),
    ) as Record<OrganizationAccess, string[]>,
    houseAccess: org.state.houseAccess,
  };
}

/**
 * The Saldo screen's door to roles: adds a member, or makes one `admin` or
 * `member`. «admin» gives the highest role carrying administrator below the
 * one who asks; «member» takes away every role carrying it. Adding needs
 * `invite-members`, a role needs `manage-roles`, and nobody acts on a role or
 * a member at or above their own highest role, on an owner, or on themselves
 * (STD-051 ORG-003, ORG-004).
 */
export async function setMember(
  db: TillDatabase,
  sent: unknown,
  sentAccount: unknown,
  sentMember: unknown,
  sentRole: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<MembersAnswer> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const member = readMemberWallet(sentMember);
  const role = readRole(sentRole);
  const house = readHouse(sentHouse);
  if (
    wallet === undefined ||
    accountId === undefined ||
    member === undefined ||
    role === undefined ||
    house === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(member === undefined ? [PROBLEMS.memberWallet] : []),
      ...(role === undefined ? [PROBLEMS.role] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const entered = await enter(db, wallet, accountId, house);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  if (member === wallet) return refuse(ORG_PROBLEMS.ownRoles);
  const existing = memberIn(org, member);
  if (existing?.isOwner === true) {
    return role === 'admin'
      ? { ok: true, members: await membersOf(db, accountId) }
      : refuse(ORG_PROBLEMS.owner);
  }
  const target =
    existing === undefined
      ? accessOf(org.state, {
          kind: 'member',
          member: { personId: member, kind: 'human', isOwner: false, roleIds: [] },
        })
      : accessIn(org, member);
  const now_ = now.toISOString();
  const writes: D1PreparedStatement[] = [];
  const log = (act: LogAct, detail: Readonly<Record<string, string>> | null) =>
    logLine(db, accountId, now, acting, act, member, detail, org.revision);
  if (existing === undefined) {
    const refused = lacking(entered, 'invite-members');
    if (refused !== null) return refused;
    writes.push(
      db.prepare(ADD_MEMBER).bind(accountId, member, role, wallet, now_, org.revision),
      log('member-added', null),
    );
  } else if (compatRole(target) === role) {
    return { ok: true, members: await membersOf(db, accountId) };
  }
  if (role === 'admin' && compatRole(target) === 'member') {
    const given = administratorRoleFor(acting.access, org.state.roles);
    if (typeof given === 'string') return refuse(given);
    const verdict = canAssignRole(acting.access, target, given);
    if (!verdict.ok) return refuse(refusalOf(verdict.refusal, 'manage-roles', org.state.roles));
    writes.push(
      db.prepare(GIVE_ROLE).bind(accountId, member, given.id, org.revision),
      log('role-given', { role: given.id }),
    );
  }
  if (role === 'member' && compatRole(target) === 'admin') {
    const carrying = org.state.roles.filter((held) => held.permissions.includes('administrator'));
    for (const taken of carrying) {
      const holds = taken.position === 0 || existing?.roleIds.includes(taken.id) === true;
      if (!holds) continue;
      const verdict = canAssignRole(acting.access, target, taken);
      if (!verdict.ok) return refuse(refusalOf(verdict.refusal, 'manage-roles', org.state.roles));
      writes.push(
        db.prepare(TAKE_ROLE).bind(accountId, member, taken.id, org.revision),
        log('role-taken', { role: taken.id }),
      );
    }
  }
  if (existing !== undefined) {
    writes.push(db.prepare(MIRROR_ROLE).bind(accountId, member, role, org.revision));
  }
  if (!(await commit(db, org, writes))) return refuse(PROBLEMS.meanwhile);
  return { ok: true, members: await membersOf(db, accountId) };
}

/**
 * Takes a member out of the organization, or lets one leave. Anyone may
 * leave but the last owner; only owners take an owner out; anyone else
 * needs `remove-members` and a member below them (STD-051 ORG-002, ORG-003).
 */
export async function removeMember(
  db: TillDatabase,
  sent: unknown,
  sentAccount: unknown,
  sentMember: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<MembersAnswer> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const member = readMemberWallet(sentMember);
  const house = readHouse(sentHouse);
  if (
    wallet === undefined ||
    accountId === undefined ||
    member === undefined ||
    house === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(member === undefined ? [PROBLEMS.memberWallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const entered = await enter(db, wallet, accountId, house);
  if ('problems' in entered) return entered;
  const { org, acting } = entered;
  const target = memberIn(org, member);
  if (target === undefined) return refuse(PROBLEMS.noSuchMember);
  let act: LogAct = 'member-removed';
  if (member === wallet) {
    const owners = org.members.filter((one) => one.isOwner).length;
    const verdict = canLeave(target, owners);
    if (!verdict.ok) return refuse(refusalOf(verdict.refusal, 'remove-members', org.state.roles));
    act = 'member-left';
  } else if (target.isOwner) {
    // Naming or removing owners is the owners' own act (STD-052); another owner always remains.
    if (!acting.access.permissions.has('manage-owners')) return refuse(ORG_PROBLEMS.owner);
  } else {
    const verdict = canActOnMember(acting.access, accessIn(org, member), 'remove');
    if (!verdict.ok) return refuse(refusalOf(verdict.refusal, 'remove-members', org.state.roles));
  }
  const removed = await commit(db, org, [
    db.prepare(DROP_MEMBER).bind(accountId, member, org.revision),
    logLine(db, accountId, now, acting, act, member, null, org.revision),
  ]);
  if (!removed) return refuse(PROBLEMS.meanwhile);
  return { ok: true, members: await membersOf(db, accountId) };
}

/** The Checkout Session parameters of a quick top-up (Stripe's form keys). */
export function checkoutParams(
  price: string,
  accountId: string,
  wallet: string,
  returnBase: string,
): Record<string, string> {
  return {
    mode: 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    // Stripe Managed Payments sells: it is the merchant of record, and
    // works out and collects the tax of the buyer's country.
    'managed_payments[enabled]': 'true',
    client_reference_id: accountId,
    'metadata[account]': accountId,
    'metadata[wallet]': wallet,
    success_url: `${returnBase}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnBase}?cancelled=1`,
  };
}

/**
 * Opens a Stripe Checkout Session to top up the wallet's own account, or an
 * organization where it may (`top-up`, every member by default), and keeps who opened it for
 * which account; in an organization, its log keeps it too. Answers where to
 * pay.
 */
export async function startTopup(
  db: TillDatabase,
  payments: Payments | null,
  sent: unknown,
  sentAccount: unknown,
  sentAmount: unknown,
  sentReturn: unknown,
  sentHouse: unknown,
  now: Date,
): Promise<TopupStart> {
  const wallet = readWallet(sent);
  const accountId = readAccountId(sentAccount);
  const amountKey: AmountKey | undefined = readAmountKey(sentAmount);
  const returnBase = readReturnBase(sentReturn);
  const house = readHouse(sentHouse);
  if (
    wallet === undefined ||
    accountId === undefined ||
    amountKey === undefined ||
    returnBase === undefined ||
    house === undefined
  ) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(accountId === undefined ? [PROBLEMS.accountId] : []),
      ...(amountKey === undefined ? [PROBLEMS.amountKey] : []),
      ...(returnBase === undefined ? [PROBLEMS.returnBase] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
    );
  }
  const org = await loadOrganization(db, accountId);
  let acting: Acting | null = null;
  if (org === null) {
    if ((await accountFor(db, wallet, accountId)) === null) return refuse(PROBLEMS.notMember);
  } else {
    acting = actingIn(org, wallet, house);
    if (acting === null) return refuse(PROBLEMS.notMember);
    // Its own permission, which every template gives to the base role (STD-052 0.2.0).
    const refused = lacking({ org, acting }, 'top-up');
    if (refused !== null) return refused;
  }
  if (payments === null) return refuse(PROBLEMS.notConfigured);
  const session = await payments.stripe.createCheckoutSession(
    checkoutParams(payments.prices[amountKey], accountId, wallet, returnBase),
  );
  const checkout = db
    .prepare(INSERT_CHECKOUT)
    .bind(session.id, accountId, wallet, amountKey, now.toISOString());
  await db.batch([
    checkout,
    ...(acting === null
      ? []
      : [logLine(db, accountId, now, acting, 'topup-started', null, { amount: amountKey }, null)]),
  ]);
  // createCheckoutSession answers only an open session with its url.
  return { ok: true, url: session.url as string };
}

export interface CheckoutRow {
  readonly id: string;
  readonly accountId: string;
  readonly wallet: string;
  readonly state: CheckoutState;
}

export function checkoutOf(row: Row): CheckoutRow {
  const state = text(row, 'state');
  if (state !== 'open' && state !== 'paid' && state !== 'expired') {
    throw new TypeError(`till database: unknown checkout state ${state}`);
  }
  return {
    id: text(row, 'id'),
    accountId: text(row, 'account_id'),
    wallet: text(row, 'wallet'),
    state,
  };
}

/**
 * What a paid session credits: the amount the buyer PAID, tax included, as
 * balance — Pablo's decision (2026-10-14): +10 € is 10 € of balance in every
 * country, and Stripe's refunds are on the amount paid, so a refund takes
 * back exactly what was credited. The tax Managed Payments collected is kept
 * beside it (`vat_cents`) for the books. Only when the session is the
 * checkout's own — same account, euros, a payment intent, a tax no larger
 * than the total, a positive amount. Null: not a payment the till may credit.
 */
export function creditOf(
  checkout: Pick<CheckoutRow, 'id' | 'accountId'>,
  session: CheckoutSession,
): { paidCents: number; vatCents: number; paymentId: string } | null {
  const { amountTotal, amountTax, paymentIntent } = session;
  if (session.id !== checkout.id || session.clientReferenceId !== checkout.accountId) return null;
  if (session.currency !== 'eur' || paymentIntent === null) return null;
  if (amountTotal === null || amountTax === null || amountTax < 0) return null;
  if (amountTotal <= 0 || amountTax >= amountTotal) return null;
  return { paidCents: amountTotal, vatCents: amountTax, paymentId: paymentIntent };
}

/**
 * Applies what Stripe says of a checkout's session: paid, it writes the
 * top-up line and marks the checkout paid, in one batch (a second time
 * writes nothing); expired, it marks the checkout expired; otherwise it is
 * still open (or its payment still processing). `uncreditable`: paid, but
 * not a payment the till may credit — nothing written.
 */
export async function applySession(
  db: TillDatabase,
  checkout: CheckoutRow,
  session: CheckoutSession,
  now: Date,
): Promise<CheckoutState | 'uncreditable'> {
  if (session.paymentStatus === 'paid') {
    const credit = creditOf(checkout, session);
    if (credit === null) return 'uncreditable';
    await db.batch([
      db
        .prepare(INSERT_TOPUP)
        .bind(
          lineId(now.getTime(), `topup:${session.id}`),
          checkout.accountId,
          credit.paidCents,
          now.toISOString(),
          credit.vatCents,
          credit.paymentId,
          session.invoice,
        ),
      db.prepare(MARK_PAID).bind(checkout.id),
    ]);
    return 'paid';
  }
  if (session.status === 'expired') {
    await db.prepare(MARK_EXPIRED).bind(checkout.id).run();
    return 'expired';
  }
  return 'open';
}

/**
 * When the buyer comes back from Stripe: reads the session from Stripe and
 * applies it, if it is a checkout this wallet opened. A checkout already
 * paid answers at once, without asking Stripe again.
 */
export async function confirmTopup(
  db: TillDatabase,
  payments: Payments | null,
  sent: unknown,
  sentSession: unknown,
  now: Date,
): Promise<TopupConfirm> {
  const wallet = readWallet(sent);
  const sessionId = readSessionId(sentSession);
  if (wallet === undefined || sessionId === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(sessionId === undefined ? [PROBLEMS.sessionId] : []),
    );
  }
  const row = await db.prepare(SELECT_CHECKOUT).bind(sessionId).first<Row>();
  const checkout = row === null ? null : checkoutOf(row);
  if (checkout === null || checkout.wallet !== wallet) return refuse(PROBLEMS.notOurs);
  let state: CheckoutState = checkout.state;
  if (state !== 'paid') {
    if (payments === null) return refuse(PROBLEMS.notConfigured);
    const applied = await applySession(
      db,
      checkout,
      await payments.stripe.retrieveCheckoutSession(sessionId),
      now,
    );
    if (applied === 'uncreditable') return refuse(PROBLEMS.uncreditable);
    state = applied;
  }
  const balance = await db.prepare(SELECT_BALANCE).bind(checkout.accountId).first<Row>();
  return {
    ok: true,
    state,
    accountId: checkout.accountId,
    balanceCents: cents(balance as Row, 'balance_cents'),
  };
}

const SELECT_LOT_BY_PAYMENT = `
  SELECT id, account_id FROM ledger_lines WHERE kind = 'topup' AND stripe_payment_id = ?1`;

const SELECT_REFUNDED = `
  SELECT coalesce(-SUM(amount_cents), 0) AS refunded_cents
    FROM ledger_lines WHERE kind = 'refund' AND lot_line_id = ?1`;

const INSERT_TAKEBACK = `
  INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, lot_line_id, stripe_event_id)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`;

/** The oldest chargeback of a lot that no line corrects yet: what a won dispute gives back. */
const SELECT_OPEN_CHARGEBACK = `
  SELECT id, amount_cents FROM ledger_lines AS cb
   WHERE cb.kind = 'chargeback' AND cb.lot_line_id = ?1 AND cb.amount_cents = ?2
     AND NOT EXISTS (SELECT 1 FROM ledger_lines AS fix WHERE fix.corrects_line_id = cb.id)
   ORDER BY cb.at, cb.id LIMIT 1`;

const INSERT_GIVEBACK = `
  INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, "by", reason, corrects_line_id)
  VALUES (?1, ?2, 'adjustment', ?3, ?4, ?5, ?6, ?7)`;

/** An event's instant, as the ledger writes instants. */
function eventAt(event: SessionEvent): string {
  return new Date(event.created * 1000).toISOString();
}

/**
 * Takes back what Stripe took back, for a top-up of the till's own (found by
 * its payment intent; anything else is not the till's and is skipped):
 *
 * - `charge.refunded`: the charge's refunded total is cumulative, so the line
 *   is what it adds to the refunds already written for that top-up (a partial
 *   refund, then another, each its own line);
 * - `charge.dispute.created`: a chargeback line of the disputed amount;
 * - `charge.dispute.closed` and won: an adjustment by `stripe` that gives that
 *   chargeback back, naming it. Lost or anything else: nothing more.
 *
 * Each line is keyed by its event (refund and chargeback lines by
 * `stripe_event_id`, the give-back by an id derived from the event), so an
 * event read twice writes once. The balance may go below zero — Pablo's
 * decision (2026-10-14): the till's at-zero rules then apply, and the next
 * top-up pays the debt first. `unapplied`: the till's own top-up, but not in
 * euros — nothing written, the run reports it.
 */
export async function applyTakeBack(
  db: TillDatabase,
  event: SessionEvent,
): Promise<'applied' | 'skipped' | 'unapplied'> {
  const facts = event.charge ?? event.dispute;
  if (facts === null || facts.paymentIntent === null) return 'skipped';
  const lotRow = await db.prepare(SELECT_LOT_BY_PAYMENT).bind(facts.paymentIntent).first<Row>();
  if (lotRow === null) return 'skipped';
  if (facts.currency !== 'eur') return 'unapplied';
  const lotId = text(lotRow, 'id');
  const accountId = text(lotRow, 'account_id');
  const at = eventAt(event);
  const atMs = event.created * 1000;

  if (event.type === 'charge.refunded' && event.charge !== null) {
    const row = await db.prepare(SELECT_REFUNDED).bind(lotId).first<Row>();
    const added = event.charge.amountRefunded - cents(row as Row, 'refunded_cents');
    if (added <= 0) return 'applied';
    await db
      .prepare(INSERT_TAKEBACK)
      .bind(lineId(atMs, `refund:${event.id}`), accountId, 'refund', -added, at, lotId, event.id)
      .run();
    return 'applied';
  }
  if (event.dispute === null || event.dispute.amount <= 0) return 'skipped';
  if (event.type === 'charge.dispute.created') {
    await db
      .prepare(INSERT_TAKEBACK)
      .bind(
        lineId(atMs, `chargeback:${event.id}`),
        accountId,
        'chargeback',
        -event.dispute.amount,
        at,
        lotId,
        event.id,
      )
      .run();
    return 'applied';
  }
  if (event.type === 'charge.dispute.closed' && event.dispute.status === 'won') {
    const open = await db
      .prepare(SELECT_OPEN_CHARGEBACK)
      .bind(lotId, -event.dispute.amount)
      .first<Row>();
    if (open === null) return 'applied';
    await db
      .prepare(INSERT_GIVEBACK)
      .bind(
        lineId(atMs, `dispute-won:${event.id}`),
        accountId,
        event.dispute.amount,
        at,
        STRIPE_AUTHOR,
        `dispute ${event.dispute.id} won`,
        text(open, 'id'),
      )
      .run();
    return 'applied';
  }
  return 'skipped';
}

/** Where the poll has read Stripe up to, and whether that is more than two days behind `now`. */
export interface PollState {
  /** The cursor as an instant; null before the first poll. */
  readonly readThrough: string | null;
  readonly lagging: boolean;
}

export async function pollState(db: TillDatabase, now: Date): Promise<PollState> {
  const row = await db.prepare(SELECT_CURSOR).first<Row>();
  if (row === null) return { readThrough: null, lagging: false };
  const cursor = cents(row, 'last_created');
  return {
    readThrough: new Date(cursor * 1000).toISOString(),
    lagging: Math.floor(now.getTime() / 1000) - cursor > LAG_SECONDS,
  };
}

/**
 * The minute's poll: Stripe's events since the cursor (less an overlap),
 * every page, applied OLDEST first — a dispute's start before its end, one
 * partial refund before the next. A paid session of one of the till's
 * checkouts is credited as `confirmTopup` credits it (without the wallet
 * check: the checkout's own account); a late payment that failed marks its
 * checkout expired; refunds and disputes of the till's own top-ups take
 * money back (`applyTakeBack`). Events about anything else of the same
 * Stripe account are skipped. Then the cursor moves to the newest event read.
 */
export async function pollStripe(db: TillDatabase, stripe: Stripe, now: Date): Promise<PollRun> {
  const cursorRow = await db.prepare(SELECT_CURSOR).first<Row>();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const cursor =
    cursorRow === null ? nowSeconds - FIRST_POLL_SECONDS : cents(cursorRow, 'last_created');
  const createdGte = Math.max(0, cursor - POLL_OVERLAP_SECONDS);

  const read: SessionEvent[] = [];
  // With no event the mark still moves, to a little before now: the next
  // run's overlap covers an event Stripe had not listed yet.
  let newest = Math.max(cursor, nowSeconds - POLL_OVERLAP_SECONDS);
  let complete = false;
  let startingAfter: string | undefined;
  for (let page = 0; page < POLL_MAX_PAGES && !complete; page += 1) {
    const listed = await stripe.listEvents({
      types: POLLED_EVENTS,
      createdGte,
      ...(startingAfter === undefined ? {} : { startingAfter }),
    });
    for (const event of listed.events) {
      newest = Math.max(newest, event.created);
      read.push(event);
    }
    startingAfter = listed.events.at(-1)?.id;
    complete = !listed.hasMore || startingAfter === undefined;
  }
  // Stripe lists newest first: reversed, the run applies them as they happened.
  const events = read.reverse();

  const sessions = events.flatMap((event) => (event.session === null ? [] : [event.session]));
  const ids = [...new Set(sessions.map((session) => session.id))];
  const { results } = await db.prepare(SELECT_CHECKOUTS).bind(JSON.stringify(ids)).all<Row>();
  const checkouts = new Map(results.map((row) => [text(row, 'id'), checkoutOf(row)]));
  let applied = 0;
  let uncreditable = 0;
  let takenBack = 0;
  let unapplied = 0;
  for (const event of events) {
    if (event.session !== null) {
      const checkout = checkouts.get(event.session.id);
      if (checkout === undefined) continue;
      if (event.type === 'checkout.session.async_payment_failed') {
        await db.prepare(MARK_EXPIRED).bind(checkout.id).run();
        continue;
      }
      const state = await applySession(db, checkout, event.session, now);
      if (state === 'uncreditable') uncreditable += 1;
      else if (state === 'paid') applied += 1;
      continue;
    }
    const taken = await applyTakeBack(db, event);
    if (taken === 'applied') takenBack += 1;
    else if (taken === 'unapplied') unapplied += 1;
  }
  // A run that could not read every page leaves the cursor where it was, so
  // the next one reads the same window again rather than skipping events.
  if (complete) await db.prepare(MOVE_CURSOR).bind(newest).run();
  const after = complete ? newest : cursor;
  return {
    events: events.length,
    applied,
    uncreditable,
    takenBack,
    unapplied,
    cursor: after,
    complete,
    // Behind before this run (the poll had stopped), or still behind after it.
    lagging: nowSeconds - cursor > LAG_SECONDS || nowSeconds - after > LAG_SECONDS,
  };
}
