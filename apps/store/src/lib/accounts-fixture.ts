/**
 * The fixture desk («Saldo»): a small, documented fake of the till's
 * `AccountDesk`, for CI, the acceptance run and screenshots
 * (DATA_SOURCE=fixture). Never reached in a real build: the bound till
 * answers there, or nothing does.
 *
 * Each wallet that asks gets its own copy of the seed (fixtures/accounts/
 * desk.json): a personal account at 4,20 € and three organizations — «Numen
 * Games» at 0,88 € with three members, whose `self` member is the wallet
 * asking, and «Active Inference Institute» and «La Tarugo», which the
 * wallet is NOT in (QA 2026-10-15, «la casa entra»). Lines are dated in days
 * before today, so the chart always has thirty days to draw: about 35 days
 * of worlds' days per account, over two or three worlds of different sizes,
 * each day's minutes running and stopped and what they cost at the seed's
 * tariff (cut 2026-10-16 «el dinero»), a top-up and an adjustment. The
 * statement answers as a till of that cut does — each bucket split between
 * running and stopped with the till's arithmetic, each world over the range,
 * the pace of the last 7 complete days and of the month, the tariff in force
 * for the sizes in use. A top-up never
 * leaves this process: it answers the site's own way back with
 * `session_id=cs_test_fixture_<n>`, and confirming it credits the account —
 * the shape of a Stripe Checkout, no Stripe at all.
 *
 * The house (STD-051 ORG-007): with the flag `house` the desk lets the wallet
 * into the organizations it is not in, as `house`, and lists them all in its
 * `directory`; without it, or false, the wallet gets the till's own refusals.
 * What the house reads and does is written down in the organization's log
 * (ORG-009), as the till does. It is a fake: the till holds the real rules
 * (apps/till).
 */

import {
  BASE_ROLE_POSITION,
  MAX_ORGANIZATION_ROLES,
  ORGANIZATION_PERMISSIONS,
  OWNER_ACTS,
  accessOf,
  canAssignRole,
  canCreateRole,
  canDeleteRole,
  canEditRole,
  canMoveRole,
  placeForNewRole,
  rolesFromTemplate,
  type OrganizationAccess,
  type OrganizationMember,
  type OrganizationRefusal,
  type OrganizationRole,
  type OrganizationState,
} from '@numinia/domain';
import {
  ALPHA,
  BASE_ROLE as BASE_ROLE_SENTENCE,
  GRANT_EXCEEDS,
  HOUSE_BOOLEAN,
  LAST_OWNER,
  NOT_BELOW,
  NOT_HOUSE,
  NOT_HOUSE_CENSUS,
  NOT_MEMBER,
  OWNERS_ONLY,
  OWNER_ONLY,
  OWN_ROLES,
  isCheckoutId,
  isSpendRange,
  isTopupKey,
  teamName,
  walletOf,
  type AccountDesk,
  type DeskAccess,
  type DeskAccount,
  type DeskCitizen,
  type DeskCitizensAnswer,
  type DeskHome,
  type DeskHomeOfAnswer,
  type DeskPlaceAnswer,
  type DeskPlacementsAnswer,
  type DeskWorldsOfAnswer,
  type DeskConfirmAnswer,
  type DeskDirectoryAnswer,
  type DeskEnsureAnswer,
  type DeskOpenAllAnswer,
  type DeskDirectoryEntry,
  type DeskLine,
  type DeskLogAct,
  type DeskLogAnswer,
  type DeskHeadcountAnswer,
  type DeskLogLine,
  type DeskLot,
  type DeskMember,
  type DeskMemberDetail,
  type DeskMembersAnswer,
  type DeskRoleChange,
  type DeskRoleDraft,
  type DeskRoles,
  type DeskRolesAnswer,
  type DeskSettings,
  type DeskSettingsAnswer,
  type DeskHappeningsAnswer,
  type DeskOverview,
  type DeskPace,
  type DeskProfile,
  type DeskProfileAnswer,
  type DeskRefusal,
  type DeskSignedInAnswer,
  type DeskSizePrice,
  type DeskSpend,
  type DeskStatement,
  type DeskTariff,
  type DeskTeamAnswer,
  type DeskTopupAnswer,
  type DeskWorld,
  type LineKind,
  type MemberRole,
  type SpendRange,
  type TopupKey,
} from './accounts';
import { createAgentsFixture, type HostEntry } from './agents-fixture';
import { communityAccountId, readCommunityId } from './community-teams';
import {
  DEFAULT_VOCABULARY,
  HAPPENINGS_PAGE,
  SWITCHABLE_PIECES,
  isSwitchable,
  isVocabulary,
  type SwitchablePiece,
  type Vocabulary,
} from './panel-settings';
import { readProfileChange } from './profile-name';
import { PLACEMENT_PROBLEMS, readAccountId, readWorldId, readWorldIds } from './worlds-homes';

/** One line of the seed, dated in days before today. */
export interface SeedLine {
  readonly kind: LineKind;
  readonly daysAgo: number;
  readonly amountCents: number;
  readonly vatCents?: number;
  readonly worldId?: string;
  readonly size?: string;
  /** A world's day: its minutes running and stopped (the amount is what they cost at the seed's tariff). */
  readonly minutesRunning?: number;
  readonly minutesStopped?: number;
  readonly reason?: string;
}

/** The seed's tariff: its prices per size, the two rules a person reads, and since when (in days before today). */
interface SeedTariff {
  readonly startsDaysAgo: number;
  readonly sizes: Readonly<Record<string, DeskSizePrice>>;
  readonly rules: DeskTariff['rules'];
}

export interface SeedMember {
  /** `self` is the wallet asking. */
  readonly wallet: string;
  readonly role: MemberRole;
  /** The Team template's roles held, counted from the top (1 = Administración); a plain member holds the third. */
  readonly roles?: readonly number[];
  readonly addedDaysAgo: number;
}

export interface SeedTeam {
  readonly id: string;
  readonly name: string;
  readonly createdDaysAgo: number;
  readonly members: readonly SeedMember[];
  readonly lines: readonly SeedLine[];
}

/** A name and a Bazar avatar a seeded person has published (cut «Tu nombre y tu cara»). */
interface SeedProfile {
  readonly wallet: string;
  readonly name: string;
  readonly avatar: string | null;
}

/** Someone who has signed in (cut «El censo»): the first and the last time, in days before today. */
interface SeedSignIn {
  readonly wallet: string;
  readonly firstDaysAgo: number;
  readonly lastDaysAgo: number;
}

/** A world placed already (cut «Mundos ↔ organizaciones»): its organization, and how many days ago. */
interface SeedHome {
  readonly worldId: string;
  readonly accountId: string;
  readonly placedDaysAgo: number;
}

/** What the fixture desk starts with, for every wallet. */
export interface AccountsSeed {
  /** Absent: the desk answers as a till before the cut «el dinero» would, with no tariff to show. */
  readonly tariff?: SeedTariff;
  readonly personal: { readonly id: string; readonly lines: readonly SeedLine[] };
  readonly teams: readonly SeedTeam[];
  /** Who has published a name already: the members screens and the people lists show them. */
  readonly profiles?: readonly SeedProfile[];
  /** Who has signed in already: the Census page's list shows them to the house. */
  readonly signIns?: readonly SeedSignIn[];
  /** Which organization each placed world belongs to (fixtures/worlds/homes.json). */
  readonly homes?: readonly SeedHome[] | undefined;
}

const DAY_MS = 86_400_000;
/** The till's daily run charges a world's day at 00:30 UTC; top-ups land mid-morning. */
const CHARGE_AT_MS = 30 * 60_000;
const TOPUP_AT_MS = 10 * 3_600_000;
const VAT_RATE = 0.21;
const LAST_LINES = 100;

/**
 * The fixture's two roles, in the till's words: «admin» is an owner (every
 * act), «member» holds only what the base role gives in the Alpha template.
 */
const ADMIN_ROLE = 'Administration';
const BASE_ROLE = '@everyone';
const BASE_ACTS: readonly OrganizationAccess[] = ['enter-worlds', 'top-up', 'view-balance'];

/** The till's refusal for want of a permission, as it words it. */
const needs = (act: OrganizationAccess): string =>
  `this needs ${act}, which the owners hold, and the role ${ADMIN_ROLE}`;

/** The way back must be this site: production, or a local server. */
const RETURN_BASES = ['https://numinia.com/', 'http://localhost', 'http://127.0.0.1'];

interface Book {
  id: string;
  kind: 'personal' | 'team';
  name: string | null;
  lines: DeskLine[];
  members: DeskMember[];
  /** An organization's roles, the base role included (the Team template); none for a personal account. */
  roles: OrganizationRole[];
  /** The roles each member holds besides the base role. */
  held: Map<string, string[]>;
  /** The last changes, oldest first. */
  changes: DeskLogLine[];
}

/** The till's words for each refusal of the domain (apps/till lib/organizations.ts REFUSALS). */
const REFUSALS: Readonly<Record<Exclude<OrganizationRefusal, 'missing-permission'>, string>> = {
  'not-below': NOT_BELOW,
  'own-roles': OWN_ROLES,
  self: OWN_ROLES,
  owner: OWNER_ONLY,
  'base-role': BASE_ROLE_SENTENCE,
  'grant-exceeds': GRANT_EXCEEDS,
  'role-limit': `an organization holds at most ${MAX_ORGANIZATION_ROLES} roles besides the base role`,
  'owners-only': OWNERS_ONLY,
  'last-owner': LAST_OWNER,
  alpha: ALPHA,
};

const BASE_FIXED = 'the base role keeps its name and its place: only what it carries changes';
const NO_SUCH_ROLE = 'the organization has no such role';
const NO_SUCH_MEMBER = 'that wallet is not a member of the organization';
const hex16 = (n: number): string => `role_${n.toString(16).padStart(16, '0')}`;

/**
 * The Team template's default colours, top-down: Administration orange,
 * Finance blue, Member green; the base role keeps none. The hex values are
 * the Roles editor's own swatches (i18n/panel-people.ts), as the till's.
 */
const BIRTH_COLORS: readonly (string | null)[] = ['#d98324', '#2f7fa8', '#3d8b5f', null];

/**
 * The communities whose administrator role is named otherwise: Numen Games'
 * administrators are the Oracles. Castilian here, like the rest of the fixture.
 */
const ADMIN_ROLE_NAMES: Readonly<Record<string, string>> = { 'numen-games': 'Oráculos' };

/**
 * An organization's roles at birth: the Team template, in Castilian, ids
 * counted from 1, the default colours, and — for a community that has its
 * own word for it — the administrator role under that name.
 */
function birthRoles(community?: string): OrganizationRole[] {
  const adminName = community === undefined ? undefined : ADMIN_ROLE_NAMES[community];
  return rolesFromTemplate('team', 'es', (index) => hex16(index + 1)).map((role, index) => ({
    ...role,
    color: BIRTH_COLORS[index] ?? null,
    name: index === 0 && adminName !== undefined ? adminName : role.name,
  }));
}

interface Checkout {
  readonly wallet: string;
  readonly accountId: string;
  readonly key: TopupKey;
  state: 'open' | 'paid';
}

/** On whose behalf a wallet is in an organization: the till's `ActingAs`. */
type Standing = 'owner' | 'house' | 'member';

/** An organization as one wallet entered it, and on whose behalf. */
interface Entry {
  readonly who: string;
  readonly book: Book;
  readonly as: Standing;
}

const BAD_WALLET = 'wallet must be a lowercase 0x address';
const refuse = (...problems: string[]): DeskRefusal => ({ ok: false, problems });
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** An organization's name: only a personal account has none. */
/** The most communities one call to `openAllCommunities` opens (the till's own cap). */
const OPEN_ALL_MAX = 50;
const ONLY_HOUSE_OPENS = 'only the house opens the organization of a community';

const nameOf = (book: Book): string => book.name as string;

/** The flag as the till reads it: absent is false, anything but a boolean is a problem. */
const isFlag = (house: unknown): house is boolean | undefined =>
  house === undefined || typeof house === 'boolean';

function dayStart(now: Date, daysAgo: number): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - daysAgo * DAY_MS;
}

// ---- «El censo»: the list's rules, as the till's src/lib/census.ts reads them ----

const CENSUS_PAGE = 200;
const CENSUS_QUERY_MAX = 100;
const CENSUS_QUERY = `query must be text of ${CENSUS_QUERY_MAX} characters at most, none of them a control character`;
const CENSUS_CURSOR = 'cursor must be one this list gave';
const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~(0x[0-9a-f]{40})$/;

/** The instant `days` before `now`, to the millisecond. */
function daysBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

/** A search, trimmed and lowercased ('' for everyone), or undefined when it is not one. */
function readSearch(value: unknown): string | undefined {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return undefined;
  const query = value.trim();
  return query.length <= CENSUS_QUERY_MAX ? query.toLowerCase() : undefined;
}

/** A cursor the list gave, null for the first page, undefined otherwise. */
function readCursor(value: unknown): { last: string; wallet: string } | null | undefined {
  if (value === undefined || value === null) return null;
  const match = typeof value === 'string' ? CURSOR.exec(value) : null;
  return match === null ? undefined : { last: match[1] as string, wallet: match[2] as string };
}

function lineOf(seed: SeedLine, now: Date): DeskLine {
  const start = dayStart(now, seed.daysAgo);
  const line: DeskLine = {
    kind: seed.kind,
    at: new Date(start + (seed.kind === 'topup' ? TOPUP_AT_MS : CHARGE_AT_MS)).toISOString(),
    amountCents: seed.amountCents,
  };
  if (seed.vatCents !== undefined) line.vatCents = seed.vatCents;
  if (seed.kind === 'world_day') line.day = new Date(start).toISOString().slice(0, 10);
  if (seed.worldId !== undefined) line.worldId = seed.worldId;
  if (seed.size !== undefined) line.size = seed.size;
  if (seed.minutesRunning !== undefined) line.minutesRunning = seed.minutesRunning;
  if (seed.minutesStopped !== undefined) line.minutesStopped = seed.minutesStopped;
  if (seed.reason !== undefined) line.reason = seed.reason;
  return line;
}

/** Oldest first: the order the ledger was written in. */
const byTime = (a: DeskLine, b: DeskLine): number => a.at.localeCompare(b.at);

const balanceOf = (book: Book): number =>
  book.lines.reduce((sum, line) => sum + line.amountCents, 0);

/** The top-ups still holding money, spent oldest first (first in, first out). */
export function lotsOf(lines: readonly DeskLine[]): DeskLot[] {
  const ordered = lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => byTime(a.line, b.line));
  let spent = ordered
    .filter(({ line }) => line.amountCents < 0)
    .reduce((sum, { line }) => sum - line.amountCents, 0);
  return ordered
    .filter(({ line }) => line.kind === 'topup')
    .map(({ line, index }) => {
      const used = Math.min(spent, line.amountCents);
      spent -= used;
      return {
        lineId: `l${index + 1}`,
        at: line.at,
        amountCents: line.amountCents,
        remainderCents: line.amountCents - used,
      };
    });
}

/** The till's `worldDayCostCents`: per minute of a 1440-minute day, rounded half up once. */
function dayCost(price: DeskSizePrice, running: number, stopped: number): number {
  const total = running * price.runningCentsPerDay + stopped * price.stoppedCentsPerDay;
  const remainder = total % 1440;
  return (total - remainder) / 1440 + (remainder * 2 >= 1440 ? 1 : 0);
}

/**
 * A world's day split as the till splits it (apps/till lib/tariff.ts
 * `splitWorldDayCents`): the stopped minutes get what they alone cost, running
 * the rest; nothing stopped on a day charged with stopped minutes free; a day
 * with no price or no minutes counts as running whole.
 */
function splitOf(
  line: DeskLine,
  prices: Readonly<Record<string, DeskSizePrice>>,
): { runningCents: number; stoppedCents: number } {
  const spent = -line.amountCents;
  const price = prices[String(line.size)];
  const running = line.minutesRunning;
  const stopped = line.minutesStopped;
  if (price === undefined || typeof running !== 'number' || typeof stopped !== 'number') {
    return { runningCents: spent, stoppedCents: 0 };
  }
  const free =
    spent !== dayCost(price, running, stopped) &&
    spent === dayCost({ ...price, stoppedCentsPerDay: 0 }, running, stopped);
  const stoppedCents = free ? 0 : Math.min(spent, dayCost(price, 0, stopped));
  return { runningCents: spent - stoppedCents, stoppedCents };
}

/** A world's day with the UTC day it charges. */
type WorldDay = DeskLine & { readonly day: string };

/** The worlds' days among the lines, in ledger order (oldest first). */
function worldDays(lines: readonly DeskLine[]): WorldDay[] {
  return lines.filter(
    (line): line is WorldDay => line.kind === 'world_day' && typeof line.day === 'string',
  );
}

/** The first bucket of a range ending today: a day, or a month for 12 months. */
function firstBucket(range: SpendRange, now: Date): string {
  return range === '12m'
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)).toISOString().slice(0, 7)
    : new Date(dayStart(now, range === '7d' ? 6 : 29)).toISOString().slice(0, 10);
}

/** The worlds' days of a range, each with the bucket it falls in. */
function daysIn(
  lines: readonly DeskLine[],
  range: SpendRange,
  now: Date,
): { line: WorldDay; bucket: string }[] {
  const first = firstBucket(range, now);
  return worldDays(lines)
    .map((line) => ({ line, bucket: range === '12m' ? line.day.slice(0, 7) : line.day }))
    .filter(({ bucket }) => bucket >= first);
}

/**
 * What the worlds cost in each bucket of the range — a day, or a month for 12
 * months — split between running and stopped at the seed's prices.
 */
export function spendOf(
  lines: readonly DeskLine[],
  range: SpendRange,
  now: Date,
  prices: Readonly<Record<string, DeskSizePrice>> = {},
): { spend: DeskSpend[]; total: number } {
  const buckets = new Map<string, { cents: number; runningCents: number; stoppedCents: number }>();
  for (const { line, bucket } of daysIn(lines, range, now)) {
    const split = splitOf(line, prices);
    const before = buckets.get(bucket) ?? { cents: 0, runningCents: 0, stoppedCents: 0 };
    buckets.set(bucket, {
      cents: before.cents - line.amountCents,
      runningCents: before.runningCents + split.runningCents,
      stoppedCents: before.stoppedCents + split.stoppedCents,
    });
  }
  const spend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, figures]) => ({ bucket, ...figures }));
  return { spend, total: spend.reduce((sum, entry) => sum + entry.cents, 0) };
}

/**
 * Each world of the range: the size of its latest day (the lines are in
 * ledger order, so the last one seen), the days it ran at all (a day with no
 * minutes counts as running), what it cost; the most expensive first, then by id.
 */
function worldsOf(lines: readonly DeskLine[], range: SpendRange, now: Date): DeskWorld[] {
  const worlds = new Map<string, DeskWorld>();
  for (const { line } of daysIn(lines, range, now)) {
    const id = String(line.worldId);
    const world = worlds.get(id) ?? { worldId: id, size: '', daysRunning: 0, cents: 0 };
    world.size = String(line.size);
    world.daysRunning += (line.minutesRunning ?? 1) > 0 ? 1 : 0;
    world.cents -= line.amountCents;
    worlds.set(id, world);
  }
  // Array sort is stable: by id first, then by cost.
  return [...worlds.values()]
    .sort((a, b) => a.worldId.localeCompare(b.worldId))
    .sort((a, b) => b.cents - a.cents);
}

/** The 7 complete UTC days before today, and the month so far with how many worlds it charged. */
function paceOf(lines: readonly DeskLine[], now: Date): DeskPace {
  const today = new Date(dayStart(now, 0)).toISOString().slice(0, 10);
  const weekStart = new Date(dayStart(now, 7)).toISOString().slice(0, 10);
  const days = worldDays(lines);
  const week = days.filter((line) => line.day >= weekStart && line.day < today);
  const month = days.filter((line) => line.day.slice(0, 7) === today.slice(0, 7));
  const spent = (some: readonly WorldDay[]): number =>
    some.reduce((sum, line) => sum - line.amountCents, 0);
  return {
    sevenDaysCents: spent(week),
    monthCents: spent(month),
    monthWorlds: new Set(
      month.filter((line) => line.amountCents < 0).map((line) => String(line.worldId)),
    ).size,
  };
}

/** The seed's tariff as the statement shows it: the sizes the account's worlds reserve (all, when none). */
function tariffOf(tariff: SeedTariff, lines: readonly DeskLine[], now: Date): DeskTariff {
  const inUse = new Set(worldDays(lines).map((line) => String(line.size)));
  const priced = Object.entries(tariff.sizes).filter(([size]) => inUse.has(size));
  return {
    startsOn: new Date(dayStart(now, tariff.startsDaysAgo)).toISOString().slice(0, 10),
    sizes: Object.fromEntries(priced.length > 0 ? priced : Object.entries(tariff.sizes)),
    rules: { ...tariff.rules },
  };
}

function booksFor(seed: AccountsSeed, wallet: string, now: Date): Book[] {
  const personal: Book = {
    id: seed.personal.id,
    kind: 'personal',
    name: null,
    lines: seed.personal.lines.map((line) => lineOf(line, now)).sort(byTime),
    members: [],
    roles: [],
    held: new Map(),
    changes: [],
  };
  const teams = seed.teams.map((team): Book => ({
    id: team.id,
    kind: 'team',
    name: team.name,
    lines: team.lines.map((line) => lineOf(line, now)).sort(byTime),
    members: team.members.map((member) => ({
      wallet: member.wallet === 'self' ? wallet : member.wallet,
      role: member.role,
      addedAt: new Date(dayStart(now, member.addedDaysAgo)).toISOString(),
    })),
    roles: birthRoles(),
    // A plain member holds the Team template's third role («Miembro») unless the seed says otherwise.
    held: new Map(
      team.members.map((member) => [
        member.wallet === 'self' ? wallet : member.wallet,
        (member.roles ?? (member.role === 'member' ? [3] : [])).map(hex16),
      ]),
    ),
    changes: [],
  }));
  return [personal, ...teams];
}

/** A desk in memory, seeded as given, on the clock given (the real one by default). */
export function createAccountsFixtureDesk(
  seed: AccountsSeed,
  now: () => Date = () => new Date(),
): AccountDesk {
  const wallets = new Map<string, Book[]>();
  const checkouts = new Map<string, Checkout>();
  /**
   * «Una comunidad ES una organización»: the accounts the house opened for
   * communities, as the till's rows — shared by every wallet's copy of the
   * seed, with no member (the house reaches them as the house).
   */
  const communityBooks = new Map<string, Book>();
  let teamsMade = 0;
  /**
   * «Tu nombre y tu cara»: one entry per wallet that published, as the till's
   * `wallet_profiles` — shared by every wallet's copy of the seed, replaced
   * on change and deleted on removal.
   */
  const profiles = new Map<string, DeskProfile>(
    (seed.profiles ?? []).map(({ wallet, name, avatar }) => [
      wallet,
      { name, avatar, updatedAt: now().toISOString() },
    ]),
  );
  /**
   * «El censo»: who has signed in, as the till's `wallet_sign_ins` — the
   * first and the last time per wallet, shared by every wallet's copy.
   */
  const signIns = new Map<string, { first: string; last: string }>(
    (seed.signIns ?? []).map(({ wallet, firstDaysAgo, lastDaysAgo }) => [
      wallet,
      { first: daysBefore(now(), firstDaysAgo), last: daysBefore(now(), lastDaysAgo) },
    ]),
  );
  /**
   * «Mundos ↔ organizaciones»: which organization each world belongs to, as the
   * till's `world_placements` — one per world, shared by every wallet's copy.
   */
  const homes = new Map<string, { accountId: string; accountName: string; placedAt: string }>(
    (seed.homes ?? []).flatMap(({ worldId, accountId, placedDaysAgo }) => {
      const team = seed.teams.find((candidate) => candidate.id === accountId);
      // A seeded home whose organization the seed lacks is not kept.
      return team === undefined
        ? []
        : [
            [
              worldId,
              { accountId, accountName: team.name, placedAt: daysBefore(now(), placedDaysAgo) },
            ] as const,
          ];
    }),
  );
  /** What a member published, as the till's roles view adds it: absent when nothing. */
  const publishedBy = (wallet: string): Pick<DeskMemberDetail, 'name' | 'avatar'> => {
    const profile = profiles.get(wallet);
    return profile === undefined ? {} : { name: profile.name, avatar: profile.avatar };
  };

  /** The wallet's books, created on first sight like the till's personal account. */
  const booksOf = (wallet: string): Book[] => {
    let books = wallets.get(wallet);
    if (books === undefined) {
      books = [...booksFor(seed, wallet, now()), ...communityBooks.values()];
      wallets.set(wallet, books);
    }
    return books;
  };

  const roleIn = (book: Book, wallet: string): DeskAccount['role'] | null => {
    if (book.kind === 'personal') return 'owner';
    return book.members.find((member) => member.wallet === wallet)?.role ?? null;
  };

  /**
   * On whose behalf the wallet is in the book — the till's `actingIn`: as an
   * owner first; then as the house's staff, when numinia.com vouches for it
   * (the organization lets the house in during the alpha, ORG-007); then as a
   * member. Null: a stranger to it. A personal account is always its own.
   */
  const standing = (book: Book, wallet: string, house: boolean): Standing | null => {
    if (book.kind === 'personal') return 'owner';
    const role = roleIn(book, wallet);
    if (role === 'admin') return 'owner';
    if (house) return 'house';
    return role === null ? null : 'member';
  };

  /** The account as the one who entered it sees it: the house is an admin, as the till answers. */
  const accountOf = (book: Book, wallet: string, as?: Standing): DeskAccount => ({
    id: book.id,
    kind: book.kind,
    name: book.name,
    role: as === 'house' ? 'admin' : (roleIn(book, wallet) as DeskAccount['role']),
    balanceCents: balanceOf(book),
  });

  /** The wallet and the house's flag as the till reads them, or the refusal of what it cannot read. */
  const asker = (
    wallet: unknown,
    house: unknown,
  ): { who: string; house: boolean } | DeskRefusal => {
    const who = typeof wallet === 'string' ? walletOf(wallet) : null;
    if (who !== null && isFlag(house)) return { who, house: house === true };
    return refuse(...(who === null ? [BAD_WALLET] : []), ...(isFlag(house) ? [] : [HOUSE_BOOLEAN]));
  };

  /** The book a member — or the house — sees, or why not. */
  const find = (wallet: unknown, accountId: unknown, house: unknown): Entry | DeskRefusal => {
    const asking = asker(wallet, house);
    if ('ok' in asking) return asking;
    const { who } = asking;
    const book = booksOf(who).find((candidate) => candidate.id === accountId);
    const as = book === undefined ? null : standing(book, who, asking.house);
    return book === undefined || as === null ? refuse(NOT_MEMBER) : { who, book, as };
  };

  /** The team where the wallet may do `act`, or why not. */
  const managed = (
    wallet: unknown,
    accountId: unknown,
    act: OrganizationAccess,
    house: unknown,
  ): Entry | DeskRefusal => {
    const found = find(wallet, accountId, house);
    if ('ok' in found) return found;
    if (found.book.kind !== 'team') return refuse('not an organization');
    // The owners and the house hold every act; a member only what the base role gives.
    if (found.as === 'member' && !BASE_ACTS.includes(act)) return refuse(needs(act));
    return found;
  };

  // ---- Roles: the domain's own rules (STD-051, STD-052), the till's words -------

  let rolesMade = 100;
  let changeSeq = 0;

  const stateOf = (book: Book): OrganizationState => ({
    roles: book.roles,
    houseAccess: 'alpha',
    houseLeaveOpen: false,
  });

  /** The roles a member holds besides the base role: none until they are given one. */
  const heldBy = (book: Book, wallet: string): string[] => book.held.get(wallet) ?? [];

  const memberOf = (book: Book, wallet: string): OrganizationMember => ({
    personId: wallet,
    kind: 'human',
    isOwner: book.members.find((member) => member.wallet === wallet)?.role === 'admin',
    roleIds: heldBy(book, wallet),
  });

  const accessIn = (book: Book, wallet: string, as: Standing = 'member') =>
    accessOf(
      stateOf(book),
      as === 'house'
        ? { kind: 'house', personId: wallet }
        : { kind: 'member', member: memberOf(book, wallet) },
    );

  const topDown = (roles: readonly OrganizationRole[]): OrganizationRole[] =>
    [...roles].sort((a, b) => b.position - a.position);

  /** The till's words for a refusal; a missing permission names who holds it. */
  const refusalOf = (
    refusal: OrganizationRefusal,
    act: OrganizationAccess,
    book: { readonly roles: readonly OrganizationRole[] },
  ): DeskRefusal => {
    if (refusal !== 'missing-permission') return refuse(REFUSALS[refusal]);
    // The fake names the highest role that holds the act (the Team template has one for each).
    const holder = topDown(book.roles).find((role) =>
      role.permissions.some((held) => held === act || held === 'administrator'),
    ) as OrganizationRole;
    return refuse(`this needs ${act}, which the owners hold, and the role ${holder.name}`);
  };

  /** The organization as the one asking — an owner, the house or a member — may handle its roles. */
  const viewOf = ({ book, who, as }: Entry): DeskRoles => {
    const access = accessIn(book, who, as);
    return {
      ok: true,
      accountId: book.id,
      as,
      roles: topDown(book.roles).map((role) => {
        const base = role.position === BASE_ROLE_POSITION;
        return {
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          hoist: role.hoist,
          permissions: [...role.permissions],
          members: base
            ? book.members.length
            : book.members.filter((member) => heldBy(book, member.wallet).includes(role.id)).length,
          mayEdit: !base && canEditRole(access, role).ok,
        };
      }),
      members: [...book.members]
        .sort((a, b) => Number(b.role === 'admin') - Number(a.role === 'admin'))
        .map((member): DeskMemberDetail => {
          const target = accessIn(book, member.wallet);
          return {
            wallet: member.wallet,
            owner: member.role === 'admin',
            addedAt: member.addedAt,
            roleIds: [...heldBy(book, member.wallet)],
            assignable: book.roles
              .filter((role) => canAssignRole(access, target, role).ok)
              .map((role) => role.id),
            ...publishedBy(member.wallet),
          };
        }),
    };
  };

  /** Writes a line in the organization's log: the house's are marked as such (ORG-009). */
  const record = (
    { book, who, as }: Entry,
    act: DeskLogAct,
    subject: string | null,
    detail: Record<string, string> | null,
  ): void => {
    changeSeq += 1;
    book.changes.push({
      seq: changeSeq,
      at: now().toISOString(),
      actor: who,
      asHouse: as === 'house',
      act,
      subject,
      detail,
    });
  };

  /** The role that carries the administrator permission, the template's first. */
  const administratorOf = (book: Book): OrganizationRole | undefined =>
    book.roles.find((role) => role.permissions.includes('administrator'));

  /**
   * The wallet becomes a member of the organization holding the administrator
   * role (not an owner): a no-op when it is a member already.
   */
  const joinAsAdministrator = (book: Book, wallet: string): boolean => {
    if (book.members.some((member) => member.wallet === wallet)) return false;
    book.members.push({ wallet, role: 'member', addedAt: now().toISOString() });
    const role = administratorOf(book);
    book.held.set(wallet, role === undefined ? [] : [role.id]);
    return true;
  };

  /**
   * Opens a community's account once, under the id derived from the
   * community's, and makes the house's wallet an administrator of it — also
   * when the account was already open and the house was not in it. Only the
   * first opening writes a line in the log.
   */
  const ensureOne = async (
    who: string,
    community: string,
    name: string,
  ): Promise<{ id: string; name: string; created: boolean }> => {
    const id = await communityAccountId(community);
    const found = communityBooks.get(id);
    if (found !== undefined) {
      joinAsAdministrator(found, who);
      return { id, name: nameOf(found), created: false };
    }
    const book: Book = {
      id,
      kind: 'team',
      name,
      lines: [],
      members: [],
      roles: birthRoles(community),
      held: new Map(),
      changes: [],
    };
    joinAsAdministrator(book, who);
    communityBooks.set(id, book);
    for (const books of wallets.values()) books.push(book);
    record({ book, who, as: 'house' }, 'organization-created', null, { name });
    return { id, name, created: true };
  };

  /** Writes down what the house reads (ORG-009); an owner's or a member's own reads leave no line. */
  const houseRead = (entry: Entry, what: string): void => {
    if (entry.as === 'house') record(entry, 'house-read', null, { what });
  };

  /** An organization the wallet belongs to — or, for the house, any — or why not. */
  const entering = (wallet: unknown, accountId: unknown, house: unknown): Entry | DeskRefusal => {
    const found = find(wallet, accountId, house);
    if ('ok' in found) return found;
    return found.book.kind === 'team' ? found : refuse('not an organization');
  };

  const nameProblems = (value: DeskRoleDraft | DeskRoleChange): string[] =>
    value.name !== undefined && (value.name.trim().length < 1 || value.name.trim().length > 100)
      ? ['name must be 1 to 100 characters, none of them a control character']
      : [];

  /** Puts the non-base roles at positions n..1 in the order given, the base role at 0. */
  const place = (book: Book, ordered: readonly OrganizationRole[]): void => {
    const base = book.roles.filter((role) => role.position === BASE_ROLE_POSITION);
    book.roles = [
      ...ordered.map((role, index) => ({ ...role, position: ordered.length - index })),
      ...base,
    ];
  };

  const aboveBase = (book: Book): OrganizationRole[] =>
    topDown(book.roles).filter((role) => role.position !== BASE_ROLE_POSITION);

  /** Gives or takes one role of a member, below the asker's highest role. */
  const assign = (
    give: boolean,
    wallet: unknown,
    accountId: unknown,
    memberWallet: unknown,
    roleId: unknown,
    house: unknown,
  ): DeskRolesAnswer => {
    const found = entering(wallet, accountId, house);
    if ('ok' in found) return found;
    const { book, who, as } = found;
    const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
    const target = book.members.find((entry) => entry.wallet === member);
    if (target === undefined) return refuse(NO_SUCH_MEMBER);
    const role = book.roles.find((entry) => entry.id === roleId);
    if (role === undefined) return refuse(NO_SUCH_ROLE);
    const allowed = canAssignRole(accessIn(book, who, as), accessIn(book, target.wallet), role);
    if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
    const ids = heldBy(book, target.wallet).filter((id) => id !== role.id);
    book.held.set(target.wallet, give ? [...ids, role.id] : ids);
    record(found, give ? 'role-given' : 'role-taken', target.wallet, {
      role: role.id,
      name: role.name,
    });
    return viewOf(found);
  };

  const membersAnswer = (book: Book): DeskMembersAnswer => ({
    ok: true,
    members: copy(book.members),
  });

  // ---- «Ajustes de la comunidad»: shared by every wallet's copy, as the till's organization_settings ----
  const settings = new WeakMap<Book, { off: SwitchablePiece[]; vocabulary: Vocabulary }>();
  const settingsOf = (book: Book): { off: SwitchablePiece[]; vocabulary: Vocabulary } =>
    settings.get(book) ?? { off: [], vocabulary: DEFAULT_VOCABULARY };
  const settingsView = ({ book, who, as }: Entry): DeskSettings => ({
    ok: true,
    accountId: book.id,
    ...copy(settingsOf(book)),
    mayEdit: accessIn(book, who, as).permissions.has('manage-organization'),
  });
  /** The till's reading of a change: only `off` (pieces that may be off) and `vocabulary`. */
  const readSettingsChange = (
    change: unknown,
  ): { off?: SwitchablePiece[]; vocabulary?: Vocabulary } | { problems: string[] } => {
    const sent =
      typeof change === 'object' && change !== null ? (change as Record<string, unknown>) : {};
    const keys = Object.keys(sent);
    const off = sent['off'];
    const vocabulary = sent['vocabulary'];
    const offOk =
      off === undefined ||
      (Array.isArray(off) &&
        off.every((piece) => typeof piece === 'string' && isSwitchable(piece)) &&
        new Set(off).size === off.length);
    const vocabularyOk = vocabulary === undefined || isVocabulary(vocabulary);
    if (keys.length === 0 || keys.some((key) => key !== 'off' && key !== 'vocabulary')) {
      return { problems: ['change must be an object with off and/or vocabulary, nothing else'] };
    }
    if (!offOk || !vocabularyOk) {
      return {
        problems: [
          ...(offOk ? [] : ['off must be a list of pieces, each once']),
          ...(vocabularyOk ? [] : ['vocabulary must be one of: simple, mixed, numinia']),
        ],
      };
    }
    return {
      ...(off === undefined
        ? {}
        : { off: SWITCHABLE_PIECES.filter((piece) => (off as string[]).includes(piece)) }),
      ...(vocabulary === undefined ? {} : { vocabulary: vocabulary as Vocabulary }),
    };
  };

  // ---- «IAs de organización»: kept apart (agents-fixture.ts), told what this desk knows ----
  const hostEntries = new WeakMap<HostEntry, Entry>();
  const agents = createAgentsFixture(
    {
      enter: (wallet, accountId, house) => {
        const found = entering(wallet, accountId, house);
        if ('ok' in found) return found;
        const entry: HostEntry = {
          accountId: found.book.id,
          who: found.who,
          as: found.as,
          state: stateOf(found.book),
          access: accessIn(found.book, found.who, found.as),
        };
        hostEntries.set(entry, found);
        return entry;
      },
      responsible: (accountId, wallet) => {
        const book = booksOf(wallet).find(
          (candidate) => candidate.id === accountId && candidate.kind === 'team',
        );
        return book === undefined
          ? null
          : {
              state: stateOf(book),
              access: book.members.some((held) => held.wallet === wallet)
                ? accessIn(book, wallet)
                : null,
            };
      },
      record: (entry, act, subject, detail) =>
        record(hostEntries.get(entry) as Entry, act, subject, detail),
      houseRead: (entry, what) => houseRead(hostEntries.get(entry) as Entry, what),
      published: (wallet) => profiles.get(wallet)?.name,
      refusalOf: (refusal, act, state) => refusalOf(refusal, act, state),
    },
    now,
  );

  return {
    overview: async (wallet): Promise<DeskOverview | DeskRefusal> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      if (who === null) return refuse(BAD_WALLET);
      const books = booksOf(who).filter((book) => roleIn(book, who) !== null);
      const [personal, ...teams] = books.map((book) => accountOf(book, who));
      teams.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      return { accounts: [personal as DeskAccount, ...teams] };
    },

    directory: async (wallet, house): Promise<DeskDirectoryAnswer> => {
      const asking = asker(wallet, house);
      if ('ok' in asking) return asking;
      if (!asking.house) return refuse(NOT_HOUSE);
      // Every organization of the desk, the wallet's own among them: ids and names, no money.
      const accounts = booksOf(asking.who)
        .filter((book) => book.kind === 'team')
        .map((book): DeskDirectoryEntry => ({ id: book.id, kind: 'team', name: nameOf(book) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { ok: true, accounts };
    },

    createTeam: async (wallet, name): Promise<DeskTeamAnswer> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      if (who === null) return refuse(BAD_WALLET);
      const clean = typeof name === 'string' ? teamName(name) : null;
      if (clean === null) return refuse('name must be 1 to 60 characters');
      teamsMade += 1;
      const book: Book = {
        id: `acc_team_fixture_${teamsMade}`,
        kind: 'team',
        name: clean,
        lines: [],
        members: [{ wallet: who, role: 'admin', addedAt: now().toISOString() }],
        roles: birthRoles(),
        held: new Map(),
        changes: [],
      };
      booksOf(who).push(book);
      return { ok: true, account: accountOf(book, who) };
    },

    renameTeam: async (wallet, accountId, name, house): Promise<DeskTeamAnswer> => {
      const found = managed(wallet, accountId, 'manage-organization', house);
      if ('ok' in found) return found;
      const clean = typeof name === 'string' ? teamName(name) : null;
      if (clean === null) return refuse('name must be 1 to 60 characters');
      record(found, 'organization-renamed', null, { from: nameOf(found.book), to: clean });
      found.book.name = clean;
      return { ok: true, account: accountOf(found.book, found.who, found.as) };
    },

    statement: async (wallet, accountId, range, house): Promise<DeskStatement | DeskRefusal> => {
      const found = find(wallet, accountId, house);
      if ('ok' in found) return found;
      if (!isSpendRange(range)) return refuse('range must be 7d, 30d or 12m');
      houseRead(found, 'statement');
      const { book, who, as } = found;
      const balanceCents = balanceOf(book);
      const { spend, total } = spendOf(book.lines, range, now(), seed.tariff?.sizes);
      const statement: DeskStatement = {
        account: accountOf(book, who, as),
        balanceCents,
        lowBalance: balanceCents < 1000,
        lots: lotsOf(book.lines),
        spend,
        spendTotalCents: total,
        lines: copy([...book.lines].reverse().slice(0, LAST_LINES)),
        worlds: worldsOf(book.lines, range, now()),
        pace: paceOf(book.lines, now()),
      };
      if (seed.tariff !== undefined) statement.tariff = tariffOf(seed.tariff, book.lines, now());
      if (book.kind === 'team') statement.members = copy(book.members);
      return statement;
    },

    members: async (wallet, accountId, house): Promise<DeskMembersAnswer> => {
      const found = find(wallet, accountId, house);
      if ('ok' in found) return found;
      if (found.book.kind !== 'team') return refuse('not an organization');
      houseRead(found, 'members');
      return membersAnswer(found.book);
    },

    access: async (wallet, accountId, house) => {
      const found = find(wallet, accountId, house);
      if ('ok' in found) return found;
      if (found.book.kind !== 'team') return refuse('not an organization');
      houseRead(found, 'access');
      const acts = [...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS];
      const permissions = {
        owner: acts,
        // The house holds every permission of the organization, none of the owners' own acts.
        house: [...ORGANIZATION_PERMISSIONS],
        member: [...BASE_ACTS],
      }[found.as];
      const access: DeskAccess = {
        as: found.as,
        permissions,
        holders: Object.fromEntries(
          acts.map((act) => [
            act,
            (OWNER_ACTS as readonly string[]).includes(act)
              ? []
              : BASE_ACTS.includes(act)
                ? [ADMIN_ROLE, BASE_ROLE]
                : [ADMIN_ROLE],
          ]),
        ),
      };
      return { ok: true, accountId: found.book.id, ...access };
    },

    setMember: async (wallet, accountId, memberWallet, role, house): Promise<DeskMembersAnswer> => {
      const found = find(wallet, accountId, house);
      if ('ok' in found) return found;
      if (found.book.kind !== 'team') return refuse('not an organization');
      const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
      if (member === null) return refuse('member must be a 0x address');
      if (role !== 'admin' && role !== 'member') return refuse('role must be admin or member');
      const { members } = found.book;
      const current = members.find((entry) => entry.wallet === member);
      // Adding needs «invite-members»; a role needs «manage-roles» (STD-052).
      const allowed = managed(
        wallet,
        accountId,
        current === undefined ? 'invite-members' : 'manage-roles',
        house,
      );
      if ('ok' in allowed) return allowed;
      // The house adding ITSELF to an organization it is not in is the one own-act allowed: it
      // joins as an administrator whatever role was asked. Already an administrator there it is
      // a no-op; changing its own roles as any other member stays refused.
      if (member === found.who) {
        if (found.as !== 'house') return refuse(OWN_ROLES);
        if (current === undefined) {
          joinAsAdministrator(found.book, member);
          record(found, 'member-added', member, null);
          record(found, 'role-given', member, { role: administratorOf(found.book)?.id ?? '' });
          return membersAnswer(found.book);
        }
        const admin = administratorOf(found.book);
        const holds = admin !== undefined && heldBy(found.book, member).includes(admin.id);
        return holds || current.role === 'admin' ? membersAnswer(found.book) : refuse(OWN_ROLES);
      }
      // The house stands below the owners (ORG-007): it names none and demotes none.
      if (found.as === 'house' && current?.role === 'admin') {
        return role === 'admin' ? membersAnswer(found.book) : refuse(OWNER_ONLY);
      }
      if (current === undefined) {
        members.push({ wallet: member, role, addedAt: now().toISOString() });
        record(found, 'member-added', member, null);
      } else if (current.role !== role) {
        current.role = role;
        record(found, role === 'admin' ? 'role-given' : 'role-taken', member, { role });
      }
      return membersAnswer(found.book);
    },

    removeMember: async (wallet, accountId, memberWallet, house): Promise<DeskMembersAnswer> => {
      const found = find(wallet, accountId, house);
      if ('ok' in found) return found;
      if (found.book.kind !== 'team') return refuse('not an organization');
      const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
      const { members } = found.book;
      const index = members.findIndex((entry) => entry.wallet === member);
      if (index === -1) return refuse('that wallet is not a member of the organization');
      const leaving = member === found.who;
      if (!leaving) {
        const allowed = managed(wallet, accountId, 'remove-members', house);
        if ('ok' in allowed) return allowed;
        // The house sends no owner away (ORG-007).
        if (found.as === 'house' && members[index]?.role === 'admin') return refuse(OWNER_ONLY);
      }
      const owners = members.filter((entry) => entry.role === 'admin').length;
      if (members[index]?.role === 'admin' && owners === 1) return refuse(LAST_OWNER);
      members.splice(index, 1);
      record(found, leaving ? 'member-left' : 'member-removed', member, null);
      return membersAnswer(found.book);
    },

    roles: async (wallet, accountId, house): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      houseRead(found, 'roles');
      return viewOf(found);
    },

    headcount: async (accountId): Promise<DeskHeadcountAnswer> => {
      // No wallet is asking: the organization as some wallet last left it, else as seeded.
      const live = [...wallets.values()]
        .flat()
        .find((book) => book.kind === 'team' && book.id === accountId);
      const seeded = seed.teams.find((team) => team.id === accountId);
      const found = live ?? seeded;
      if (found === undefined) return refuse('not an organization');
      return { ok: true, accountId: found.id, members: found.members.length };
    },

    createRole: async (wallet, accountId, role, house): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      const { book, who, as } = found;
      const problems = nameProblems(role);
      if (problems.length > 0) return refuse(...problems);
      const access = accessIn(book, who, as);
      const allowed = canCreateRole(access, stateOf(book));
      if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
      // Nobody here holds less than every permission, so «only what you hold» never bites in the fake.
      const spot = placeForNewRole(access, book.roles);
      rolesMade += 1;
      const id = hex16(rolesMade);
      book.roles = [
        ...book.roles.map((entry) =>
          spot.raised.includes(entry.id) ? { ...entry, position: entry.position + 1 } : entry,
        ),
        {
          id,
          name: role.name.trim(),
          color: role.color,
          position: spot.position,
          hoist: role.hoist,
          permissions: [...role.permissions],
        },
      ];
      record(found, 'role-created', null, { role: id, name: role.name.trim() });
      return viewOf(found);
    },

    editRole: async (wallet, accountId, roleId, change, house): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      const { book, who, as } = found;
      const role = book.roles.find((entry) => entry.id === roleId);
      if (role === undefined) return refuse(NO_SUCH_ROLE);
      const problems = nameProblems(change);
      if (problems.length > 0) return refuse(...problems);
      if (role.position === BASE_ROLE_POSITION && change.name !== undefined) {
        return refuse(BASE_FIXED);
      }
      const next = change.permissions ?? role.permissions;
      const allowed = canEditRole(accessIn(book, who, as), role, next);
      if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
      book.roles = book.roles.map((entry) =>
        entry.id === roleId
          ? {
              ...entry,
              name: change.name === undefined ? entry.name : change.name.trim(),
              color: change.color === undefined ? entry.color : change.color,
              hoist: change.hoist ?? entry.hoist,
              permissions: [...next],
            }
          : entry,
      );
      record(found, 'role-edited', null, { role: roleId, name: role.name });
      return viewOf(found);
    },

    moveRole: async (wallet, accountId, roleId, position, house): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      const { book, who, as } = found;
      const role = book.roles.find((entry) => entry.id === roleId);
      if (role === undefined) return refuse(NO_SUCH_ROLE);
      const allowed = canMoveRole(accessIn(book, who, as), role, position);
      if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
      const others = aboveBase(book).filter((entry) => entry.id !== roleId);
      const to = Math.min(position, others.length + 1);
      const at = others.length + 1 - to;
      place(book, [...others.slice(0, at), role, ...others.slice(at)]);
      record(found, 'role-moved', null, {
        role: roleId,
        name: role.name,
        position: String(to),
      });
      return viewOf(found);
    },

    deleteRole: async (wallet, accountId, roleId, house): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      const { book, who, as } = found;
      const role = book.roles.find((entry) => entry.id === roleId);
      if (role === undefined) return refuse(NO_SUCH_ROLE);
      const allowed = canDeleteRole(accessIn(book, who, as), role);
      if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
      place(
        book,
        aboveBase(book).filter((entry) => entry.id !== roleId),
      );
      for (const [member, ids] of book.held) {
        book.held.set(
          member,
          ids.filter((id) => id !== roleId),
        );
      }
      record(found, 'role-deleted', null, { role: roleId, name: role.name });
      return viewOf(found);
    },

    giveRole: async (wallet, accountId, memberWallet, roleId, house): Promise<DeskRolesAnswer> =>
      assign(true, wallet, accountId, memberWallet, roleId, house),

    takeRole: async (wallet, accountId, memberWallet, roleId, house): Promise<DeskRolesAnswer> =>
      assign(false, wallet, accountId, memberWallet, roleId, house),

    log: async (wallet, accountId, house): Promise<DeskLogAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      const { book, who, as } = found;
      if (!accessIn(book, who, as).permissions.has('view-organization-log')) {
        return refusalOf('missing-permission', 'view-organization-log', book);
      }
      // The till writes the read down before it answers: the house sees its own read first.
      houseRead(found, 'log');
      return {
        ok: true,
        accountId: book.id,
        lines: copy([...book.changes].reverse().slice(0, LAST_LINES)),
      };
    },

    startTopup: async (
      wallet,
      accountId,
      amountKey,
      returnBase,
      house,
    ): Promise<DeskTopupAnswer> => {
      const found = find(wallet, accountId, house);
      if ('ok' in found) return found;
      if (!isTopupKey(amountKey)) return refuse('amount must be 10, 50 or 100');
      if (typeof returnBase !== 'string' || !RETURN_BASES.some((b) => returnBase.startsWith(b))) {
        return refuse('returnBase is not this site');
      }
      const id = `cs_test_fixture_${checkouts.size + 1}`;
      checkouts.set(id, {
        wallet: found.who,
        accountId: found.book.id,
        key: amountKey,
        state: 'open',
      });
      if (found.book.kind === 'team') record(found, 'topup-started', null, { amount: amountKey });
      return { ok: true, url: `${returnBase}?session_id=${id}` };
    },

    confirmTopup: async (wallet, sessionId): Promise<DeskConfirmAnswer> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      const checkout =
        typeof sessionId === 'string' && isCheckoutId(sessionId)
          ? checkouts.get(sessionId)
          : undefined;
      if (who === null || checkout === undefined || checkout.wallet !== who) {
        return refuse('unknown checkout');
      }
      const book = booksOf(who).find((candidate) => candidate.id === checkout.accountId) as Book;
      if (checkout.state === 'open') {
        const net = Number(checkout.key) * 100;
        book.lines.push({
          kind: 'topup',
          at: now().toISOString(),
          amountCents: net,
          vatCents: Math.round(net * VAT_RATE),
        });
        checkout.state = 'paid';
      }
      return { ok: true, state: 'paid', accountId: book.id, balanceCents: balanceOf(book) };
    },

    // ---- «Tu nombre y tu cara» (2026-10-16): the till's `profile` and `setProfile` ----

    profile: async (wallet): Promise<DeskProfileAnswer> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      if (who === null || who !== wallet) return refuse(BAD_WALLET);
      return { ok: true, profile: copy(profiles.get(who) ?? null) };
    },

    setProfile: async (wallet, change): Promise<DeskProfileAnswer> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      const read = readProfileChange(change);
      const lowercase = who !== null && who === wallet;
      if (!lowercase || Array.isArray(read)) {
        return refuse(...(lowercase ? [] : [BAD_WALLET]), ...(Array.isArray(read) ? read : []));
      }
      if (read === null) {
        profiles.delete(who);
        return { ok: true, profile: null };
      }
      const profile: DeskProfile = { ...read, updatedAt: now().toISOString() };
      profiles.set(who, profile);
      return { ok: true, profile: copy(profile) };
    },

    // ---- «El censo» (2026-10-16): the till's `signedIn` and `citizens` ----

    signedIn: async (wallet): Promise<DeskSignedInAnswer> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      if (who === null || who !== wallet) return refuse(BAD_WALLET);
      const at = now().toISOString();
      const known = signIns.get(who);
      signIns.set(who, {
        first: known?.first ?? at,
        last: known === undefined || at > known.last ? at : known.last,
      });
      return { ok: true };
    },

    citizens: async (wallet, house, query, cursor): Promise<DeskCitizensAnswer> => {
      const asking = asker(wallet, house);
      if ('ok' in asking) return asking;
      const search = readSearch(query);
      const after = readCursor(cursor);
      if (search === undefined || after === undefined) {
        return refuse(
          ...(search === undefined ? [CENSUS_QUERY] : []),
          ...(after === undefined ? [CENSUS_CURSOR] : []),
        );
      }
      if (!asking.house) return refuse(NOT_HOUSE_CENSUS);
      const teams = booksOf(asking.who).filter((book) => book.kind === 'team');
      const matching = [...signIns.entries()]
        .map(([who, seen]): DeskCitizen => {
          const profile = profiles.get(who);
          return {
            wallet: who,
            firstSeenAt: seen.first,
            lastSeenAt: seen.last,
            ...(profile === undefined ? {} : { name: profile.name, avatar: profile.avatar }),
            organizations: teams.filter((book) =>
              book.members.some((member) => member.wallet === who),
            ).length,
          };
        })
        .filter(
          (person) =>
            person.wallet.includes(search) || (person.name ?? '').toLowerCase().includes(search),
        )
        .sort((a, b) =>
          a.lastSeenAt === b.lastSeenAt
            ? a.wallet.localeCompare(b.wallet)
            : b.lastSeenAt.localeCompare(a.lastSeenAt),
        );
      const rest =
        after === null
          ? matching
          : matching.filter(
              (person) =>
                person.lastSeenAt < after.last ||
                (person.lastSeenAt === after.last && person.wallet > after.wallet),
            );
      const people = rest.slice(0, CENSUS_PAGE);
      const last = people.at(-1);
      return {
        ok: true,
        people: copy(people),
        total: matching.length,
        next:
          rest.length > CENSUS_PAGE && last !== undefined
            ? `${last.lastSeenAt}~${last.wallet}`
            : null,
      };
    },

    // ---- «Mundos ↔ organizaciones» (2026-10-16): the till's placements ----

    placeWorld: async (wallet, house, worldIds, accountId): Promise<DeskPlaceAnswer> => {
      const asking = asker(wallet, house);
      const ids = readWorldIds(worldIds);
      const account = readAccountId(accountId);
      if ('ok' in asking || ids === undefined || account === undefined) {
        return refuse(
          ...('ok' in asking ? asking.problems : []),
          ...(ids === undefined ? [PLACEMENT_PROBLEMS.worlds] : []),
          ...(account === undefined ? [PLACEMENT_PROBLEMS.account] : []),
        );
      }
      if (!asking.house) return refuse(PLACEMENT_PROBLEMS.notHouse);
      const team = booksOf(asking.who).find((book) => book.kind === 'team' && book.id === account);
      if (team === undefined) return refuse(PLACEMENT_PROBLEMS.noAccount);
      for (const worldId of ids) {
        if (homes.get(worldId)?.accountId !== account) {
          homes.set(worldId, {
            accountId: account,
            accountName: nameOf(team),
            placedAt: now().toISOString(),
          });
        }
      }
      return { ok: true, placed: ids.length };
    },

    placements: async (wallet, house): Promise<DeskPlacementsAnswer> => {
      const asking = asker(wallet, house);
      if ('ok' in asking) return asking;
      if (!asking.house) return refuse(PLACEMENT_PROBLEMS.notHouse);
      const list = [...homes.entries()]
        .map(([worldId, home]): DeskHome => ({ worldId, ...home }))
        .sort((a, b) => a.worldId.localeCompare(b.worldId));
      return { ok: true, homes: list };
    },

    worldsOf: async (wallet, house, accountId): Promise<DeskWorldsOfAnswer> => {
      const asking = asker(wallet, house);
      const account = readAccountId(accountId);
      if ('ok' in asking || account === undefined) {
        return refuse(
          ...('ok' in asking ? asking.problems : []),
          ...(account === undefined ? [PLACEMENT_PROBLEMS.account] : []),
        );
      }
      const book = booksOf(asking.who).find(
        (candidate) => candidate.kind === 'team' && candidate.id === account,
      );
      if (asking.house) {
        if (book === undefined) return refuse(PLACEMENT_PROBLEMS.noAccount);
      } else if (book === undefined || roleIn(book, asking.who) === null) {
        return refuse(PLACEMENT_PROBLEMS.notMember);
      }
      const worlds = [...homes.entries()]
        .filter(([, home]) => home.accountId === account)
        .map(([worldId]) => ({ worldId, accountId: account }))
        .sort((a, b) => a.worldId.localeCompare(b.worldId));
      return { ok: true, worlds };
    },

    homeOf: async (worldId, wallet, house): Promise<DeskHomeOfAnswer> => {
      const id = readWorldId(worldId);
      const anonymous = wallet === undefined || wallet === null;
      const who = anonymous
        ? null
        : ((typeof wallet === 'string' ? walletOf(wallet) : null) ?? undefined);
      const flag = house === null ? false : isFlag(house) ? house === true : undefined;
      if (id === undefined || who === undefined || flag === undefined) {
        return refuse(
          ...(id === undefined ? [PLACEMENT_PROBLEMS.world] : []),
          ...(who === undefined ? [BAD_WALLET] : []),
          ...(flag === undefined ? [HOUSE_BOOLEAN] : []),
        );
      }
      const home = homes.get(id);
      if (home === undefined) return { ok: true, home: null, manage: flag };
      const book = who === null ? undefined : booksOf(who).find((c) => c.id === home.accountId);
      const member = who !== null && book !== undefined && roleIn(book, who) !== null;
      return { ok: true, home: { ...home }, manage: flag || member };
    },

    // ---- «Una comunidad ES una organización» (cut 6): the house opens a community's account ----

    ensureCommunityTeam: async (wallet, house, communityId, name): Promise<DeskEnsureAnswer> => {
      const asking = asker(wallet, house);
      const community = readCommunityId(communityId);
      const clean = typeof name === 'string' ? teamName(name) : null;
      if ('ok' in asking || community === undefined || clean === null) {
        return refuse(
          ...('ok' in asking ? asking.problems : []),
          ...(community === undefined ? ['communityId must be a community id'] : []),
          ...(clean === null ? ['name must be 1 to 60 characters'] : []),
        );
      }
      if (!asking.house) return refuse(ONLY_HOUSE_OPENS);
      return { ok: true, account: await ensureOne(asking.who, community, clean) };
    },

    // ---- Cut 7: the house opens every community at once, and becomes an administrator of each ----

    openAllCommunities: async (wallet, house, communities): Promise<DeskOpenAllAnswer> => {
      const asking = asker(wallet, house);
      if ('ok' in asking) return asking;
      if (!asking.house) return refuse(ONLY_HOUSE_OPENS);
      if (
        !Array.isArray(communities) ||
        communities.length < 1 ||
        communities.length > OPEN_ALL_MAX
      ) {
        return refuse(`communities must be 1 to ${OPEN_ALL_MAX} communities`);
      }
      const asked = communities.map((entry) => ({
        community: readCommunityId(entry?.id),
        name: typeof entry?.name === 'string' ? teamName(entry.name) : null,
      }));
      if (asked.some(({ community, name }) => community === undefined || name === null)) {
        return refuse('each community needs a community id and a name of 1 to 60 characters');
      }
      const accounts: { id: string; name: string; created: boolean }[] = [];
      for (const { community, name } of asked) {
        accounts.push(await ensureOne(asking.who, community as string, name as string));
      }
      return { ok: true, accounts };
    },

    // ---- «Ajustes de la comunidad» (cut 8): pieces, words and «Qué ha pasado» ----

    settings: async (wallet, accountId, house): Promise<DeskSettingsAnswer> => {
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      houseRead(found, 'settings');
      return settingsView(found);
    },

    changeSettings: async (wallet, accountId, change, house): Promise<DeskSettingsAnswer> => {
      const read = readSettingsChange(change);
      const found = managed(wallet, accountId, 'manage-organization', house);
      if ('ok' in found) return found;
      if ('problems' in read) return refuse(...read.problems);
      const before = settingsOf(found.book);
      const off = read.off ?? before.off;
      const vocabulary = read.vocabulary ?? before.vocabulary;
      const piecesChanged = off.join() !== before.off.join();
      const wordsChanged = vocabulary !== before.vocabulary;
      if (piecesChanged || wordsChanged) {
        settings.set(found.book, { off, vocabulary });
        record(found, 'settings-changed', null, {
          ...(piecesChanged ? { off: off.join(',') } : {}),
          ...(wordsChanged ? { vocabulary } : {}),
        });
      }
      return settingsView(found);
    },

    happenings: async (wallet, accountId, before, house): Promise<DeskHappeningsAnswer> => {
      const after = before === undefined || before === null ? null : before;
      const found = entering(wallet, accountId, house);
      if ('ok' in found) return found;
      if (after !== null && !(Number.isSafeInteger(after) && after > 0)) {
        return refuse('before must be the number of a line of the log, or null');
      }
      if (after === null) houseRead(found, 'happenings');
      const older = [...found.book.changes]
        .reverse()
        .filter((line) => after === null || line.seq < after);
      return {
        ok: true,
        accountId: found.book.id,
        lines: copy(
          older.slice(0, HAPPENINGS_PAGE).map((line) => ({
            ...line,
            actorName: profiles.get(line.actor)?.name ?? null,
          })),
        ),
        more: older.length > HAPPENINGS_PAGE,
      };
    },

    ...agents,
  };
}
