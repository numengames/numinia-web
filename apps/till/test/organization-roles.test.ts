/**
 * Organisation roles in the till (numinia-archive ADR-071: the rules are
 * STD-051, what a role can carry is the register STD-052; MIS-179's table):
 * the real migrations on the D1 shim, and the account desk as numinia.com's
 * binding calls it. One describe per rule, named by its plate.
 */

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORGANIZATION_PERMISSIONS, OWNER_ACTS, type OrganizationAccess } from '@numinia/domain';
import { PROBLEMS } from '../src/db/accounts';
import { ORG_PROBLEMS, needs } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { FAKE_PRICES, FakeStripe } from './fake-stripe';
import { migratedTill, migrationFiles, sqliteD1 } from './sqlite-d1';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ANA = wallet('56');
const FER = wallet('12');
const MEMO = wallet('34');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const RETURN = 'https://numinia.com/es/saldo/vuelta/';
const ctx = {} as ExecutionContext;
const EVERYTHING = [...ORGANIZATION_PERMISSIONS, ...OWNER_ACTS];

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  const stripe = new FakeStripe();
  vi.stubGlobal('fetch', stripe.fetch);
  const env = {
    TILL_DB: shim.db,
    STRIPE_KEY: 'rk_test_pretend',
    TILL_TOPUP_PRICES: JSON.stringify(FAKE_PRICES),
  };
  return { ...shim, desk: new AccountDesk(ctx, env) };
}

/** Gives `who` the role named `role` of the organization, as a write past the desk would. */
function give(sqlite: Shim['sqlite'], accountId: string, who: string, role: string): void {
  sqlite
    .prepare(
      `INSERT INTO team_member_roles (account_id, wallet, role_id)
       SELECT ?1, ?2, id FROM team_roles WHERE account_id = ?1 AND name = ?3`,
    )
    .run(accountId, who, role);
}

/**
 * Lucía's studio of MIS-179, with the Team template: Pablo founded it and
 * owns it, María administers it, Fer keeps its money, Memo works in it.
 */
async function studio(desk: AccountDesk, sqlite: Shim['sqlite']): Promise<string> {
  const created = await desk.createTeam(PABLO, 'Estudio Lucía');
  if (!created.ok) throw new Error(created.problems.join());
  const id = created.account.id;
  for (const [who, role] of [
    [MARIA, 'admin'],
    [FER, 'member'],
    [MEMO, 'member'],
  ] as const) {
    const added = await desk.setMember(PABLO, id, who, role);
    if (!added.ok) throw new Error(added.problems.join());
  }
  give(sqlite, id, FER, 'Finance');
  give(sqlite, id, MEMO, 'Member');
  return id;
}

function logOf(sqlite: Shim['sqlite'], accountId: string): unknown[] {
  return sqlite
    .prepare(
      `SELECT actor, as_house, act, subject, detail FROM team_log
        WHERE account_id = ? ORDER BY seq`,
    )
    .all(accountId)
    .map((row) => ({ ...row }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('migration 0004: every organization founded before roles keeps working', () => {
  it('gives each the Team template, its founder ownership, and admins and members their roles', () => {
    const { sqlite } = sqliteD1();
    const [last, ...earlier] = migrationFiles().reverse();
    expect(last).toBe('0004_organization_roles.sql');
    for (const name of earlier.reverse()) {
      sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8'));
    }
    const at = '2026-10-14T12:00:00.000Z';
    sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc_t_one', 'team', '${at}');
      INSERT INTO team_profiles VALUES ('acc_t_one', 'One', '${PABLO}', '${at}');
      INSERT INTO team_members VALUES ('acc_t_one', '${PABLO}', 'admin', '${PABLO}', '${at}');
      INSERT INTO team_members VALUES ('acc_t_one', '${MARIA}', 'admin', '${PABLO}', '${at}');
      INSERT INTO team_members VALUES ('acc_t_one', '${MEMO}', 'member', '${PABLO}', '${at}');
      INSERT INTO accounts (id, kind, created_at) VALUES ('acc_t_two', 'team', '${at}');
      INSERT INTO team_profiles VALUES ('acc_t_two', 'Two', '${STRANGER}', '${at}');
      INSERT INTO team_members VALUES ('acc_t_two', '${MARIA}', 'admin', '${STRANGER}', '${at}');
      INSERT INTO team_members VALUES ('acc_t_two', '${FER}', 'admin', '${STRANGER}', '${at}');
      INSERT INTO team_members VALUES ('acc_t_two', '${MEMO}', 'member', '${STRANGER}', '${at}');
    `);
    sqlite.exec(readFileSync(new URL(`../migrations/${last}`, import.meta.url), 'utf8'));

    const roles = sqlite
      .prepare(
        `SELECT name, position, hoist, permissions FROM team_roles
          WHERE account_id = 'acc_t_one' ORDER BY position DESC`,
      )
      .all()
      .map((row) => ({ ...row }));
    expect(roles).toEqual([
      { name: 'Administration', position: 3, hoist: 1, permissions: '["administrator"]' },
      { name: 'Finance', position: 2, hoist: 0, permissions: '["manage-balance"]' },
      {
        name: 'Member',
        position: 1,
        hoist: 0,
        permissions: '["enter-worlds","start-stop-worlds","build-in-worlds"]',
      },
      { name: '@everyone', position: 0, hoist: 0, permissions: '["view-balance"]' },
    ]);
    const members = sqlite
      .prepare(
        `SELECT m.account_id AS team, m.wallet, m.owner,
                (SELECT group_concat(r.name) FROM team_member_roles AS h
                   JOIN team_roles AS r ON r.account_id = h.account_id AND r.id = h.role_id
                  WHERE h.account_id = m.account_id AND h.wallet = m.wallet) AS roles
           FROM team_members AS m ORDER BY m.account_id, m.wallet`,
      )
      .all()
      .map((row) => ({ ...row }));
    // The founder owns One; Two's founder left, so each of its admins owns it.
    expect(members).toEqual([
      { team: 'acc_t_one', wallet: MEMO, owner: 0, roles: 'Member' },
      { team: 'acc_t_one', wallet: PABLO, owner: 1, roles: 'Administration' },
      { team: 'acc_t_one', wallet: MARIA, owner: 0, roles: 'Administration' },
      { team: 'acc_t_two', wallet: FER, owner: 1, roles: 'Administration' },
      { team: 'acc_t_two', wallet: MEMO, owner: 0, roles: 'Member' },
      { team: 'acc_t_two', wallet: MARIA, owner: 1, roles: 'Administration' },
    ]);
    expect(
      sqlite.prepare('SELECT DISTINCT house_access, revision FROM team_profiles').all(),
    ).toEqual([{ house_access: 'alpha', revision: 0 }]);
    // The old guard kept an admin; the new one keeps an owner.
    sqlite.exec(`UPDATE team_members SET role = 'member' WHERE account_id = 'acc_t_one'`);
    expect(() =>
      sqlite.exec(`DELETE FROM team_members WHERE account_id = 'acc_t_one' AND owner = 1`),
    ).toThrow(/owner/);
  });
});

describe('ORG-001: roles add up — what numinia.com asks before it shows anything', () => {
  it('answers each person what they may do, their roles, and who holds each act', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const owner = await desk.access(PABLO, id);
    expect(owner.ok && [owner.as, owner.permissions, owner.roles]).toEqual([
      'owner',
      EVERYTHING,
      [
        {
          id: expect.stringMatching(/^role_[0-9a-f]{16}$/),
          name: '@everyone',
          color: null,
          position: 0,
          hoist: false,
        },
      ],
    ]);
    const finance = await desk.access(FER, id);
    if (!finance.ok) throw new Error(finance.problems.join());
    expect(finance.as).toBe('member');
    expect(finance.permissions).toEqual(['view-balance', 'manage-balance']);
    expect(finance.roles.map((r) => r.name)).toEqual(['Finance', '@everyone']);
    expect(finance.holders['manage-balance']).toEqual(['Administration', 'Finance']);
    expect(finance.holders['delete-world']).toEqual([]);
    expect(finance.houseAccess).toBe('alpha');
    const member = await desk.access(MEMO, id);
    expect(member.ok && member.permissions).toEqual([
      'enter-worlds',
      'build-in-worlds',
      'start-stop-worlds',
      'view-balance',
    ]);
    const admin = await desk.access(MARIA, id);
    expect(admin.ok && admin.permissions).toEqual([...ORGANIZATION_PERMISSIONS]);
  });

  it('answers nothing to a stranger, to a personal account or to a malformed question', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.access(STRANGER, id)).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
    const own = await desk.overview(PABLO);
    const personal = own.ok ? (own.accounts[0]?.id ?? '') : '';
    expect(await desk.access(PABLO, personal)).toEqual({ ok: false, problems: [PROBLEMS.notTeam] });
    expect(await desk.access(PABLO, id, 'yes')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.house],
    });
    expect(await desk.access('0xnope', 'a b', 1)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, ORG_PROBLEMS.house],
    });
  });
});

describe('MIS-179: every cell of the four-role table, on the Team template', () => {
  // The table of ADR-070 point 7, as MIS-179 keeps it. A cell with a door in
  // the desk is asked through it; the rest through `access`. Every refusal
  // names the roles that hold the act.
  const people = { owner: PABLO, administration: MARIA, finance: FER, member: MEMO };
  const newcomer = {
    owner: wallet('7a'),
    administration: wallet('7b'),
    finance: wallet('7c'),
    member: wallet('7d'),
  };
  type Who = keyof typeof people;
  const table: ReadonlyArray<readonly [string, readonly OrganizationAccess[], readonly Who[]]> = [
    [
      'see worlds, usage and invoices',
      ['view-balance'],
      ['owner', 'administration', 'finance', 'member'],
    ],
    ['start and stop worlds', ['start-stop-worlds'], ['owner', 'administration', 'member']],
    ['create worlds', ['create-worlds'], ['owner', 'administration']],
    [
      'delete a world, see or change its code, download it',
      ['delete-world', 'see-world-code', 'download-world'],
      ['owner'],
    ],
    [
      'top up and change billing details',
      ['manage-balance'],
      ['owner', 'administration', 'finance'],
    ],
    [
      'invite, remove and change roles',
      ['invite-members', 'remove-members', 'manage-roles'],
      ['owner', 'administration'],
    ],
    ['close the team or hand it over', ['close-organization', 'hand-over-organization'], ['owner']],
  ];
  const HOLDERS: Partial<Record<OrganizationAccess, readonly string[]>> = {
    'view-balance': ['Administration', '@everyone'],
    'start-stop-worlds': ['Administration', 'Member'],
    'create-worlds': ['Administration'],
    'manage-balance': ['Administration', 'Finance'],
    'invite-members': ['Administration'],
    'remove-members': ['Administration'],
    'manage-roles': ['Administration'],
  };

  for (const [act, needed, allowed] of table) {
    for (const who of Object.keys(people) as Who[]) {
      const may = allowed.includes(who);
      it(`${act}: ${who} ${may ? 'may' : 'may not'}`, async () => {
        const { desk, sqlite } = scene();
        const id = await studio(desk, sqlite);
        const view = await desk.access(people[who], id);
        if (!view.ok) throw new Error(view.problems.join());
        for (const permission of needed) {
          expect(view.permissions.includes(permission)).toBe(may);
          expect(view.holders[permission]).toEqual(HOLDERS[permission] ?? []);
        }
        const refusal = (permission: OrganizationAccess) => ({
          ok: false,
          problems: [needs(permission, HOLDERS[permission] ?? [])],
        });
        if (needed.includes('view-balance')) {
          const read = await desk.statement(people[who], id, '7d');
          expect(read.ok).toBe(true);
        }
        if (needed.includes('manage-balance')) {
          const topup = await desk.startTopup(people[who], id, '10', RETURN);
          if (may) expect(topup.ok).toBe(true);
          else expect(topup).toEqual(refusal('manage-balance'));
        }
        if (needed.includes('invite-members')) {
          const invited = await desk.setMember(people[who], id, newcomer[who], 'member');
          if (may) expect(invited.ok).toBe(true);
          else expect(invited).toEqual(refusal('invite-members'));
          const someoneElse = people[who] === MEMO ? FER : MEMO;
          const removed = await desk.removeMember(
            people[who],
            id,
            may ? newcomer[who] : someoneElse,
          );
          if (may) expect(removed.ok).toBe(true);
          else expect(removed).toEqual(refusal('remove-members'));
        }
      });
    }
  }
});

describe('ORG-002: owners are not a role', () => {
  it('lets the last owner neither leave nor be removed, and a second owner go', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.removeMember(PABLO, id, PABLO)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.lastOwner],
    });
    expect(await desk.removeMember(MARIA, id, PABLO)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.owner],
    });
    expect(await desk.setMember(MARIA, id, PABLO, 'member')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.owner],
    });
    sqlite.exec(`UPDATE team_members SET owner = 1 WHERE wallet = '${MARIA}'`);
    const left = await desk.removeMember(PABLO, id, PABLO);
    expect(left.ok && left.members.map((m) => [m.wallet, m.role])).toEqual([
      [MARIA, 'admin'],
      [FER, 'member'],
      [MEMO, 'member'],
    ]);
    expect(await desk.access(PABLO, id)).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
  });

  it('makes the founder of a new organization its owner, holding no role', async () => {
    const { desk, sqlite } = scene();
    const created = await desk.createTeam(PABLO, 'Numen Games');
    if (!created.ok) throw new Error(created.problems.join());
    expect(created.account.role).toBe('admin');
    expect(
      sqlite
        .prepare('SELECT wallet, owner FROM team_members')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ wallet: PABLO, owner: 1 }]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_member_roles').get()).toEqual({ n: 0 });
    expect(
      sqlite
        .prepare('SELECT name FROM team_roles ORDER BY position DESC')
        .all()
        .map((row) => row['name']),
    ).toEqual(['Administration', 'Finance', 'Member', '@everyone']);
  });
});

describe('ORG-003: only below your highest role', () => {
  it('lets administration add and remove members below it, never another administrator', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    await desk.setMember(PABLO, id, ANA, 'admin');
    expect(await desk.setMember(MARIA, id, FER, 'admin')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    expect(await desk.removeMember(MARIA, id, ANA)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    expect(await desk.setMember(MARIA, id, ANA, 'member')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.notBelow],
    });
    const removed = await desk.removeMember(MARIA, id, MEMO);
    // Admins first, then members; at the same instant, by wallet.
    expect(removed.ok && removed.members.map((m) => m.wallet)).toEqual([ANA, PABLO, MARIA, FER]);
    const demoted = await desk.setMember(PABLO, id, ANA, 'member');
    expect(demoted.ok && demoted.members.find((m) => m.wallet === ANA)?.role).toBe('member');
  });

  it('says so when no role carries administrator, and when nothing changes writes nothing', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const before = logOf(sqlite, id).length;
    const same = await desk.setMember(PABLO, id, MEMO, 'member');
    expect(same.ok).toBe(true);
    expect(logOf(sqlite, id)).toHaveLength(before);
    sqlite.exec(`DELETE FROM team_roles WHERE name = 'Administration'`);
    expect(await desk.setMember(PABLO, id, MEMO, 'admin')).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.noAdministratorRole],
    });
  });
});

describe('ORG-004: nobody changes their own roles', () => {
  it('refuses it to an administrator and to an owner alike', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    for (const who of [MARIA, PABLO]) {
      expect(await desk.setMember(who, id, who, 'member')).toEqual({
        ok: false,
        problems: [ORG_PROBLEMS.ownRoles],
      });
    }
  });

  it('lets anyone below the owners leave', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const left = await desk.removeMember(MEMO, id, MEMO);
    expect(left.ok && left.members.map((m) => m.wallet)).toEqual([PABLO, MARIA, FER]);
  });
});

describe('ORG-005: on the server, every time', () => {
  it('stops a role taken away at the very next request', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect((await desk.renameTeam(MARIA, id, 'Estudio')).ok).toBe(true);
    sqlite.exec(`DELETE FROM team_member_roles WHERE wallet = '${MARIA}'`);
    expect(await desk.renameTeam(MARIA, id, 'Mío')).toEqual({
      ok: false,
      problems: [needs('manage-organization', ['Administration'])],
    });
  });

  it('writes nothing when the organization changed between its read and its write', async () => {
    const { desk, sqlite, db } = scene();
    const id = await studio(desk, sqlite);
    // Another request changes the organization just before this one writes.
    const racing: typeof db = {
      ...db,
      batch: async <T = unknown>(statements: D1PreparedStatement[]) => {
        sqlite.exec('UPDATE team_profiles SET revision = revision + 1');
        return db.batch<T>(statements);
      },
    };
    const raced = new AccountDesk(ctx, { TILL_DB: racing });
    expect(await raced.setMember(PABLO, id, ANA, 'member')).toEqual({
      ok: false,
      problems: [PROBLEMS.meanwhile],
    });
    expect(
      sqlite.prepare(`SELECT COUNT(*) AS n FROM team_members WHERE wallet = ?`).get(ANA),
    ).toEqual({
      n: 0,
    });
  });
});

describe('ORG-006: one organization never reaches another', () => {
  it('grants in each organization only what its own roles carry', async () => {
    const { desk, sqlite } = scene();
    const one = await studio(desk, sqlite);
    const other = await desk.createTeam(FER, 'Otra');
    if (!other.ok) throw new Error(other.problems.join());
    await desk.setMember(FER, other.account.id, MARIA, 'member');
    await desk.setMember(FER, other.account.id, ANA, 'member');
    const there = await desk.access(MARIA, other.account.id);
    expect(there.ok && there.permissions).toEqual(['view-balance']);
    expect(await desk.removeMember(MARIA, other.account.id, ANA)).toEqual({
      ok: false,
      problems: [needs('remove-members', ['Administration'])],
    });
    const here = await desk.access(MARIA, one);
    expect(here.ok && here.permissions).toEqual([...ORGANIZATION_PERMISSIONS]);
  });
});

describe('ORG-007: the house enters as the organization allows', () => {
  it('enters every organization during the alpha with an administrator’s reach, as the house', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = await desk.access(HOUSE, id, true);
    expect(view.ok && [view.as, view.permissions, view.roles]).toEqual([
      'house',
      [...ORGANIZATION_PERMISSIONS],
      [],
    ]);
    expect((await desk.renameTeam(HOUSE, id, 'Estudio', true)).ok).toBe(true);
    expect((await desk.statement(HOUSE, id, '7d', true)).ok).toBe(true);
    expect((await desk.setMember(HOUSE, id, MARIA, 'member', true)).ok).toBe(true);
    expect(await desk.removeMember(HOUSE, id, PABLO, true)).toEqual({
      ok: false,
      problems: [ORG_PROBLEMS.owner],
    });
  });

  it('is a stranger without the flag, or where the organization says never', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    expect(await desk.access(HOUSE, id)).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
    sqlite.exec(`UPDATE team_profiles SET house_access = 'never'`);
    expect(await desk.access(HOUSE, id, true)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    expect(await desk.members(HOUSE, id, true)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
  });

  it('lets an owner who is also the house act as an owner', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const view = await desk.access(PABLO, id, true);
    expect(view.ok && view.as).toBe('owner');
  });
});

describe('ORG-009: every change is written down', () => {
  it('writes who, on whose behalf, what and when — the house’s reads too', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    await desk.renameTeam(MARIA, id, 'Estudio');
    await desk.removeMember(MARIA, id, MEMO);
    await desk.members(HOUSE, id, true);
    await desk.setMember(HOUSE, id, MEMO, 'admin', true);
    expect(logOf(sqlite, id)).toEqual([
      {
        actor: PABLO,
        as_house: 0,
        act: 'organization-created',
        subject: null,
        detail: '{"name":"Estudio Lucía","template":"team"}',
      },
      { actor: PABLO, as_house: 0, act: 'member-added', subject: MARIA, detail: null },
      {
        actor: PABLO,
        as_house: 0,
        act: 'role-given',
        subject: MARIA,
        detail: expect.stringMatching(/^\{"role":"role_[0-9a-f]{16}"\}$/),
      },
      { actor: PABLO, as_house: 0, act: 'member-added', subject: FER, detail: null },
      { actor: PABLO, as_house: 0, act: 'member-added', subject: MEMO, detail: null },
      {
        actor: MARIA,
        as_house: 0,
        act: 'organization-renamed',
        subject: null,
        detail: '{"from":"Estudio Lucía","to":"Estudio"}',
      },
      { actor: MARIA, as_house: 0, act: 'member-removed', subject: MEMO, detail: null },
      { actor: HOUSE, as_house: 1, act: 'house-read', subject: null, detail: '{"what":"members"}' },
      { actor: HOUSE, as_house: 1, act: 'member-added', subject: MEMO, detail: null },
      {
        actor: HOUSE,
        as_house: 1,
        act: 'role-given',
        subject: MEMO,
        detail: expect.stringMatching(/"role"/),
      },
    ]);
    expect(
      sqlite
        .prepare('SELECT DISTINCT at FROM team_log')
        .all()
        .map((row) => row['at']),
    ).toEqual([NOW.toISOString()]);
  });

  it('keeps the log: no line is changed or deleted', async () => {
    const { desk, sqlite } = scene();
    await studio(desk, sqlite);
    expect(() => sqlite.exec(`UPDATE team_log SET act = 'member-left'`)).toThrow(/kept/);
    expect(() => sqlite.exec('DELETE FROM team_log')).toThrow(/kept/);
  });
});

describe('the Saldo screen reads the same shapes', () => {
  it('calls admins the owners and whoever holds administrator; everyone else a member', async () => {
    const { desk, sqlite } = scene();
    const id = await studio(desk, sqlite);
    const read = await desk.statement(FER, id, '7d');
    expect(read.ok && read.members?.map((m) => [m.wallet, m.role])).toEqual([
      [PABLO, 'admin'],
      [MARIA, 'admin'],
      [FER, 'member'],
      [MEMO, 'member'],
    ]);
    const overview = await desk.overview(MARIA);
    expect(overview.ok && overview.accounts.map((a) => [a.kind, a.role])).toEqual([
      ['personal', 'owner'],
      ['team', 'admin'],
    ]);
    const listed = await desk.members(MEMO, id);
    expect(listed.ok && listed.members).toHaveLength(4);
  });
});
