/**
 * The fixture desk («Saldo»): a small, documented fake of the till's
 * `AccountDesk`, for CI, the acceptance run and screenshots
 * (DATA_SOURCE=fixture). Never reached in a real build: the bound till
 * answers there, or nothing does.
 *
 * Each wallet that asks gets its own copy of the seed (fixtures/accounts/
 * desk.json): a personal account at 4,20 € and the organization «Numen
 * Games» at 0,88 € with three members — the seed's `self` member is the
 * wallet asking. Lines are dated in days before today, so the chart always
 * has thirty days to draw. A top-up never leaves this process: it answers
 * the site's own way back with `session_id=cs_test_fixture_<n>`, and
 * confirming it credits the account — the shape of a Stripe Checkout, no
 * Stripe at all. It is a fake: the till holds the real rules (apps/till).
 */

import {
  ADMIN_ONLY,
  LAST_ADMIN,
  NOT_MEMBER,
  isCheckoutId,
  isSpendRange,
  isTopupKey,
  teamName,
  walletOf,
  type AccountDesk,
  type DeskAccount,
  type DeskConfirmAnswer,
  type DeskLine,
  type DeskLot,
  type DeskMember,
  type DeskMembersAnswer,
  type DeskOverview,
  type DeskRefusal,
  type DeskStatement,
  type DeskTeamAnswer,
  type DeskTopupAnswer,
  type LineKind,
  type MemberRole,
  type SpendRange,
  type TopupKey,
} from './accounts';

/** One line of the seed, dated in days before today. */
export interface SeedLine {
  readonly kind: LineKind;
  readonly daysAgo: number;
  readonly amountCents: number;
  readonly vatCents?: number;
  readonly worldId?: string;
  readonly size?: string;
  readonly reason?: string;
}

export interface SeedMember {
  /** `self` is the wallet asking. */
  readonly wallet: string;
  readonly role: MemberRole;
  readonly addedDaysAgo: number;
}

export interface SeedTeam {
  readonly id: string;
  readonly name: string;
  readonly createdDaysAgo: number;
  readonly members: readonly SeedMember[];
  readonly lines: readonly SeedLine[];
}

/** What the fixture desk starts with, for every wallet. */
export interface AccountsSeed {
  readonly personal: { readonly id: string; readonly lines: readonly SeedLine[] };
  readonly teams: readonly SeedTeam[];
}

const DAY_MS = 86_400_000;
/** The till's daily run charges a world's day at 00:30 UTC; top-ups land mid-morning. */
const CHARGE_AT_MS = 30 * 60_000;
const TOPUP_AT_MS = 10 * 3_600_000;
const VAT_RATE = 0.21;
const LAST_LINES = 100;

/** The way back must be this site: production, or a local server. */
const RETURN_BASES = ['https://numinia.com/', 'http://localhost', 'http://127.0.0.1'];

interface Book {
  id: string;
  kind: 'personal' | 'team';
  name: string | null;
  lines: DeskLine[];
  members: DeskMember[];
}

interface Checkout {
  readonly wallet: string;
  readonly accountId: string;
  readonly key: TopupKey;
  state: 'open' | 'paid';
}

const refuse = (...problems: string[]): DeskRefusal => ({ ok: false, problems });
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function dayStart(now: Date, daysAgo: number): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - daysAgo * DAY_MS;
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

/** What the worlds cost in each bucket of the range: a day, or a month for 12 months. */
export function spendOf(
  lines: readonly DeskLine[],
  range: SpendRange,
  now: Date,
): { spend: { bucket: string; cents: number }[]; total: number } {
  const monthly = range === '12m';
  const first = monthly
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)).toISOString().slice(0, 7)
    : new Date(dayStart(now, range === '7d' ? 6 : 29)).toISOString().slice(0, 10);
  const buckets = new Map<string, number>();
  for (const line of lines) {
    if (line.kind !== 'world_day' || typeof line.day !== 'string') continue;
    const bucket = monthly ? line.day.slice(0, 7) : line.day;
    if (bucket < first) continue;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) - line.amountCents);
  }
  const spend = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, cents]) => ({ bucket, cents }));
  return { spend, total: spend.reduce((sum, entry) => sum + entry.cents, 0) };
}

function booksFor(seed: AccountsSeed, wallet: string, now: Date): Book[] {
  const personal: Book = {
    id: seed.personal.id,
    kind: 'personal',
    name: null,
    lines: seed.personal.lines.map((line) => lineOf(line, now)).sort(byTime),
    members: [],
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
  let teamsMade = 0;

  /** The wallet's books, created on first sight like the till's personal account. */
  const booksOf = (wallet: string): Book[] => {
    let books = wallets.get(wallet);
    if (books === undefined) {
      books = booksFor(seed, wallet, now());
      wallets.set(wallet, books);
    }
    return books;
  };

  const roleIn = (book: Book, wallet: string): DeskAccount['role'] | null => {
    if (book.kind === 'personal') return 'owner';
    return book.members.find((member) => member.wallet === wallet)?.role ?? null;
  };

  const accountOf = (book: Book, wallet: string): DeskAccount => ({
    id: book.id,
    kind: book.kind,
    name: book.name,
    role: roleIn(book, wallet) as DeskAccount['role'],
    balanceCents: balanceOf(book),
  });

  /** The book a member sees, or why not. */
  const find = (wallet: unknown, accountId: unknown): { who: string; book: Book } | DeskRefusal => {
    const who = typeof wallet === 'string' ? walletOf(wallet) : null;
    if (who === null) return refuse('wallet must be a lowercase 0x address');
    const book = booksOf(who).find((candidate) => candidate.id === accountId);
    if (book === undefined || roleIn(book, who) === null) return refuse(NOT_MEMBER);
    return { who, book };
  };

  /** The team an admin manages, or why not. */
  const managed = (
    wallet: unknown,
    accountId: unknown,
  ): { who: string; book: Book } | DeskRefusal => {
    const found = find(wallet, accountId);
    if ('ok' in found) return found;
    if (found.book.kind !== 'team' || roleIn(found.book, found.who) !== 'admin') {
      return refuse(ADMIN_ONLY);
    }
    return found;
  };

  const membersAnswer = (book: Book): DeskMembersAnswer => ({
    ok: true,
    members: copy(book.members),
  });

  return {
    overview: async (wallet): Promise<DeskOverview | DeskRefusal> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      if (who === null) return refuse('wallet must be a lowercase 0x address');
      const books = booksOf(who).filter((book) => roleIn(book, who) !== null);
      const [personal, ...teams] = books.map((book) => accountOf(book, who));
      teams.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      return { accounts: [personal as DeskAccount, ...teams] };
    },

    createTeam: async (wallet, name): Promise<DeskTeamAnswer> => {
      const who = typeof wallet === 'string' ? walletOf(wallet) : null;
      if (who === null) return refuse('wallet must be a lowercase 0x address');
      const clean = typeof name === 'string' ? teamName(name) : null;
      if (clean === null) return refuse('name must be 1 to 60 characters');
      teamsMade += 1;
      const book: Book = {
        id: `acc_team_fixture_${teamsMade}`,
        kind: 'team',
        name: clean,
        lines: [],
        members: [{ wallet: who, role: 'admin', addedAt: now().toISOString() }],
      };
      booksOf(who).push(book);
      return { ok: true, account: accountOf(book, who) };
    },

    renameTeam: async (wallet, accountId, name): Promise<DeskTeamAnswer> => {
      const found = managed(wallet, accountId);
      if ('ok' in found) return found;
      const clean = typeof name === 'string' ? teamName(name) : null;
      if (clean === null) return refuse('name must be 1 to 60 characters');
      found.book.name = clean;
      return { ok: true, account: accountOf(found.book, found.who) };
    },

    statement: async (wallet, accountId, range): Promise<DeskStatement | DeskRefusal> => {
      const found = find(wallet, accountId);
      if ('ok' in found) return found;
      if (!isSpendRange(range)) return refuse('range must be 7d, 30d or 12m');
      const { book, who } = found;
      const balanceCents = balanceOf(book);
      const { spend, total } = spendOf(book.lines, range, now());
      const statement: DeskStatement = {
        account: accountOf(book, who),
        balanceCents,
        lowBalance: balanceCents < 1000,
        lots: lotsOf(book.lines),
        spend,
        spendTotalCents: total,
        lines: copy([...book.lines].reverse().slice(0, LAST_LINES)),
      };
      if (book.kind === 'team') statement.members = copy(book.members);
      return statement;
    },

    members: async (wallet, accountId): Promise<DeskMembersAnswer> => {
      const found = managed(wallet, accountId);
      return 'ok' in found ? found : membersAnswer(found.book);
    },

    setMember: async (wallet, accountId, memberWallet, role): Promise<DeskMembersAnswer> => {
      const found = managed(wallet, accountId);
      if ('ok' in found) return found;
      const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
      if (member === null) return refuse('member must be a 0x address');
      if (role !== 'admin' && role !== 'member') return refuse('role must be admin or member');
      const { members } = found.book;
      const current = members.find((entry) => entry.wallet === member);
      const admins = members.filter((entry) => entry.role === 'admin').length;
      if (current?.role === 'admin' && role === 'member' && admins === 1) return refuse(LAST_ADMIN);
      if (current) current.role = role;
      else members.push({ wallet: member, role, addedAt: now().toISOString() });
      return membersAnswer(found.book);
    },

    removeMember: async (wallet, accountId, memberWallet): Promise<DeskMembersAnswer> => {
      const found = managed(wallet, accountId);
      if ('ok' in found) return found;
      const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
      const { members } = found.book;
      const index = members.findIndex((entry) => entry.wallet === member);
      if (index === -1) return refuse('not in this team');
      const admins = members.filter((entry) => entry.role === 'admin').length;
      if (members[index]?.role === 'admin' && admins === 1) return refuse(LAST_ADMIN);
      members.splice(index, 1);
      return membersAnswer(found.book);
    },

    startTopup: async (wallet, accountId, amountKey, returnBase): Promise<DeskTopupAnswer> => {
      const found = find(wallet, accountId);
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
  };
}
