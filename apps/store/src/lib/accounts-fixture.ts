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
  LAST_OWNER,
  NOT_BELOW,
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
  type DeskConfirmAnswer,
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

/** An organization's roles at birth: the Team template, in Castilian, ids counted from 1. */
function birthRoles(): OrganizationRole[] {
  return [...rolesFromTemplate('team', 'es', (index) => hex16(index + 1))];
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

  /** The team where the wallet may do `act`, or why not. */
  const managed = (
    wallet: unknown,
    accountId: unknown,
    act: OrganizationAccess,
  ): { who: string; book: Book } | DeskRefusal => {
    const found = find(wallet, accountId);
    if ('ok' in found) return found;
    if (found.book.kind !== 'team') return refuse('not an organization');
    if (roleIn(found.book, found.who) !== 'admin' && !BASE_ACTS.includes(act)) {
      return refuse(needs(act));
    }
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

  const accessIn = (book: Book, wallet: string) =>
    accessOf(stateOf(book), { kind: 'member', member: memberOf(book, wallet) });

  const topDown = (roles: readonly OrganizationRole[]): OrganizationRole[] =>
    [...roles].sort((a, b) => b.position - a.position);

  /** The till's words for a refusal; a missing permission names who holds it. */
  const refusalOf = (
    refusal: OrganizationRefusal,
    act: OrganizationAccess,
    book: Book,
  ): DeskRefusal => {
    if (refusal !== 'missing-permission') return refuse(REFUSALS[refusal]);
    // The fake names the highest role that holds the act (the Team template has one for each).
    const holder = topDown(book.roles).find((role) =>
      role.permissions.some((held) => held === act || held === 'administrator'),
    ) as OrganizationRole;
    return refuse(`this needs ${act}, which the owners hold, and the role ${holder.name}`);
  };

  /** The organization as the one asking may handle its roles. */
  const viewOf = (book: Book, who: string): DeskRoles => {
    const access = accessIn(book, who);
    return {
      ok: true,
      accountId: book.id,
      as: access.isOwner ? 'owner' : 'member',
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
          };
        }),
    };
  };

  const record = (
    book: Book,
    who: string,
    act: DeskLogAct,
    subject: string | null,
    detail: Record<string, string> | null,
  ): void => {
    changeSeq += 1;
    book.changes.push({
      seq: changeSeq,
      at: now().toISOString(),
      actor: who,
      asHouse: false,
      act,
      subject,
      detail,
    });
  };

  /** An organization the wallet belongs to, or why not. */
  const entering = (
    wallet: unknown,
    accountId: unknown,
  ): { who: string; book: Book } | DeskRefusal => {
    const found = find(wallet, accountId);
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
  ): DeskRolesAnswer => {
    const found = entering(wallet, accountId);
    if ('ok' in found) return found;
    const { book, who } = found;
    const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
    const target = book.members.find((entry) => entry.wallet === member);
    if (target === undefined) return refuse(NO_SUCH_MEMBER);
    const role = book.roles.find((entry) => entry.id === roleId);
    if (role === undefined) return refuse(NO_SUCH_ROLE);
    const allowed = canAssignRole(accessIn(book, who), accessIn(book, target.wallet), role);
    if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
    const ids = heldBy(book, target.wallet).filter((id) => id !== role.id);
    book.held.set(target.wallet, give ? [...ids, role.id] : ids);
    record(book, who, give ? 'role-given' : 'role-taken', target.wallet, {
      role: role.id,
      name: role.name,
    });
    return viewOf(book, who);
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
        roles: birthRoles(),
        held: new Map(),
        changes: [],
      };
      booksOf(who).push(book);
      return { ok: true, account: accountOf(book, who) };
    },

    renameTeam: async (wallet, accountId, name): Promise<DeskTeamAnswer> => {
      const found = managed(wallet, accountId, 'manage-organization');
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
      const found = find(wallet, accountId);
      if ('ok' in found) return found;
      return found.book.kind === 'team' ? membersAnswer(found.book) : refuse('not an organization');
    },

    access: async (wallet, accountId) => {
      const found = find(wallet, accountId);
      if ('ok' in found) return found;
      if (found.book.kind !== 'team') return refuse('not an organization');
      const owner = roleIn(found.book, found.who) === 'admin';
      const acts = [...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS];
      const access: DeskAccess = {
        as: owner ? 'owner' : 'member',
        permissions: owner ? acts : [...BASE_ACTS],
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

    setMember: async (wallet, accountId, memberWallet, role): Promise<DeskMembersAnswer> => {
      const found = find(wallet, accountId);
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
      );
      if ('ok' in allowed) return allowed;
      if (member === found.who) return refuse(OWN_ROLES);
      if (current) current.role = role;
      else members.push({ wallet: member, role, addedAt: now().toISOString() });
      return membersAnswer(found.book);
    },

    removeMember: async (wallet, accountId, memberWallet): Promise<DeskMembersAnswer> => {
      const found = find(wallet, accountId);
      if ('ok' in found) return found;
      if (found.book.kind !== 'team') return refuse('not an organization');
      const member = typeof memberWallet === 'string' ? walletOf(memberWallet) : null;
      const { members } = found.book;
      const index = members.findIndex((entry) => entry.wallet === member);
      if (index === -1) return refuse('that wallet is not a member of the organization');
      const leaving = member === found.who;
      if (!leaving) {
        const allowed = managed(wallet, accountId, 'remove-members');
        if ('ok' in allowed) return allowed;
      }
      const owners = members.filter((entry) => entry.role === 'admin').length;
      if (members[index]?.role === 'admin' && owners === 1) return refuse(LAST_OWNER);
      members.splice(index, 1);
      return membersAnswer(found.book);
    },

    roles: async (wallet, accountId): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId);
      return 'ok' in found ? found : viewOf(found.book, found.who);
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

    createRole: async (wallet, accountId, role): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId);
      if ('ok' in found) return found;
      const { book, who } = found;
      const problems = nameProblems(role);
      if (problems.length > 0) return refuse(...problems);
      const access = accessIn(book, who);
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
      record(book, who, 'role-created', null, { role: id, name: role.name.trim() });
      return viewOf(book, who);
    },

    editRole: async (wallet, accountId, roleId, change): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId);
      if ('ok' in found) return found;
      const { book, who } = found;
      const role = book.roles.find((entry) => entry.id === roleId);
      if (role === undefined) return refuse(NO_SUCH_ROLE);
      const problems = nameProblems(change);
      if (problems.length > 0) return refuse(...problems);
      if (role.position === BASE_ROLE_POSITION && change.name !== undefined) {
        return refuse(BASE_FIXED);
      }
      const next = change.permissions ?? role.permissions;
      const allowed = canEditRole(accessIn(book, who), role, next);
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
      record(book, who, 'role-edited', null, { role: roleId, name: role.name });
      return viewOf(book, who);
    },

    moveRole: async (wallet, accountId, roleId, position): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId);
      if ('ok' in found) return found;
      const { book, who } = found;
      const role = book.roles.find((entry) => entry.id === roleId);
      if (role === undefined) return refuse(NO_SUCH_ROLE);
      const allowed = canMoveRole(accessIn(book, who), role, position);
      if (!allowed.ok) return refusalOf(allowed.refusal, 'manage-roles', book);
      const others = aboveBase(book).filter((entry) => entry.id !== roleId);
      const to = Math.min(position, others.length + 1);
      const at = others.length + 1 - to;
      place(book, [...others.slice(0, at), role, ...others.slice(at)]);
      record(book, who, 'role-moved', null, {
        role: roleId,
        name: role.name,
        position: String(to),
      });
      return viewOf(book, who);
    },

    deleteRole: async (wallet, accountId, roleId): Promise<DeskRolesAnswer> => {
      const found = entering(wallet, accountId);
      if ('ok' in found) return found;
      const { book, who } = found;
      const role = book.roles.find((entry) => entry.id === roleId);
      if (role === undefined) return refuse(NO_SUCH_ROLE);
      const allowed = canDeleteRole(accessIn(book, who), role);
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
      record(book, who, 'role-deleted', null, { role: roleId, name: role.name });
      return viewOf(book, who);
    },

    giveRole: async (wallet, accountId, memberWallet, roleId): Promise<DeskRolesAnswer> =>
      assign(true, wallet, accountId, memberWallet, roleId),

    takeRole: async (wallet, accountId, memberWallet, roleId): Promise<DeskRolesAnswer> =>
      assign(false, wallet, accountId, memberWallet, roleId),

    log: async (wallet, accountId): Promise<DeskLogAnswer> => {
      const found = entering(wallet, accountId);
      if ('ok' in found) return found;
      const { book, who } = found;
      if (!accessIn(book, who).permissions.has('view-organization-log')) {
        return refusalOf('missing-permission', 'view-organization-log', book);
      }
      return {
        ok: true,
        accountId: book.id,
        lines: copy([...book.changes].reverse().slice(0, LAST_LINES)),
      };
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
