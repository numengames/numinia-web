/**
 * «Una comunidad ES una organización» (cut 6, 2026-10-16): the house opens a
 * community's organization the first time it uses it — the account id is a
 * SHA-256 of the community id, so two first calls make one account — without
 * a founder, without a member, and outside the founder bound. One describe
 * per rule or per door.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PROBLEMS, TEAMS_PER_FOUNDER } from '../src/db/accounts';
import type { EnsureAnswer } from '../src/db/community-teams';
import { readAccountId } from '../src/lib/accounts';
import { DEFAULT_AI_MODEL, DEFAULT_AI_TRIAL_CAP_CENTS } from '../src/lib/ai-brain';
import {
  COMMUNITY_PROBLEMS,
  communityAccountId,
  readCommunityId,
} from '../src/lib/community-teams';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

/** The id the contract names, worked out here on its own: 'acc_t_' + 32 hex of the SHA-256. */
const expectedId = (community: string): string =>
  `acc_t_${createHash('sha256').update(`numinia-till community ${community}`).digest('hex').slice(0, 32)}`;

const accountOf = (answer: EnsureAnswer) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.account;
};

const count = (sqlite: Shim['sqlite'], sql: string, ...values: string[]): number =>
  Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${sql}`).get(...values)?.['n']);

describe('the rules of a community’s account', () => {
  it('derives the id from the community: acc_t_ and 32 hex of the SHA-256, the same every time', async () => {
    const id = await communityAccountId('numen-games');
    expect(id).toBe(expectedId('numen-games'));
    expect(id).toMatch(/^acc_t_[0-9a-f]{32}$/);
    expect(await communityAccountId('numen-games')).toBe(id);
    expect(await communityAccountId('numinia')).not.toBe(id);
    expect(readAccountId(id)).toBe(id);
  });

  it('reads a community id as the register writes it: 1 to 63 of a-z, 0-9 and hyphens, not leading with one', () => {
    for (const id of ['numen-games', 'a', '0', 'a-b-c', 'a--b', 'a-', 'a'.repeat(63)]) {
      expect(readCommunityId(id), id).toBe(id);
    }
    for (const value of [
      '',
      '-a',
      'a'.repeat(64),
      'Numen',
      'numen games',
      'numen_games',
      '../etc',
      'nu\nmen',
      'ñu',
      7,
      null,
      undefined,
      {},
      ['numen'],
    ]) {
      expect(readCommunityId(value), JSON.stringify(value)).toBeUndefined();
    }
  });

  it('words its refusals plainly', () => {
    expect(COMMUNITY_PROBLEMS).toEqual({
      notHouse: 'only the house opens the organization of a community',
      community:
        'communityId must be 1 to 63 characters: lowercase letters, digits and hyphens, not starting with a hyphen',
      communities:
        'communities must be a list of 1 to 50 objects with an id (a community id) and a name (1 to 60 characters)',
    });
  });
});

describe('ensureCommunityTeam: the house opens a community’s account', () => {
  it('creates the account the first time: its id, its name, created true', async () => {
    const { desk, sqlite } = scene();
    const answer = await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', '  Numen Games ');
    expect(answer).toEqual({
      ok: true,
      account: { id: expectedId('numen-games'), name: 'Numen Games', created: true },
    });
    expect(
      sqlite
        .prepare(
          `SELECT a.kind, p.name, p.created_by, p.house_access, p.revision
             FROM accounts AS a JOIN team_profiles AS p ON p.account_id = a.id WHERE a.id = ?`,
        )
        .get(expectedId('numen-games')),
    ).toMatchObject({
      kind: 'team',
      name: 'Numen Games',
      created_by: HOUSE,
      house_access: 'alpha',
      revision: 1,
    });
  });

  it('is born with the Team template’s roles and colours, the same as an organization founded by hand', async () => {
    const { desk, sqlite } = scene();
    const made = await desk.createTeam(PABLO, 'By hand');
    if (!made.ok) throw new Error(made.problems.join());
    const id = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numinia', 'Numen')).id;
    const rolesOf = (account: string) =>
      sqlite
        .prepare(
          'SELECT name, color, position, hoist, permissions FROM team_roles WHERE account_id = ? ORDER BY position',
        )
        .all(account)
        .map((row) => ({ ...row }));
    expect(rolesOf(id)).toHaveLength(4);
    expect(rolesOf(id)).toEqual(rolesOf(made.account.id));
  });

  it('makes the opening Oracle a member with the administrator role — and no owner', async () => {
    const { desk, sqlite } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    expect(
      sqlite.prepare('SELECT wallet, owner FROM team_members WHERE account_id = ?').all(id),
    ).toEqual([{ wallet: HOUSE, owner: 0 }]);
    expect(count(sqlite, 'team_member_roles WHERE account_id = ?', id)).toBe(1);
    expect(count(sqlite, 'account_wallets WHERE wallet = ?', HOUSE)).toBe(0);
  });

  it('writes one `organization-created` line, by the house, and none on the second call', async () => {
    const { desk, sqlite } = scene();
    const first = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    const lines = () =>
      sqlite
        .prepare(
          "SELECT actor, as_house, act, subject, detail FROM team_log WHERE account_id = ? AND act = 'organization-created'",
        )
        .all(first.id)
        .map((row) => ({ ...row }));
    expect(lines()).toEqual([
      {
        actor: HOUSE,
        as_house: 1,
        act: 'organization-created',
        subject: null,
        detail: JSON.stringify({ name: 'Numen', template: 'team', community: 'numen-games' }),
      },
    ]);
    await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen');
    await desk.ensureCommunityTeam(wallet('98'), true, 'numen-games', 'Numen');
    expect(lines()).toHaveLength(1);
  });

  it('answers the same account the second time, created false, and keeps the name it has', async () => {
    const { desk, sqlite } = scene();
    const first = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    const again = accountOf(
      await desk.ensureCommunityTeam(wallet('98'), true, 'numen-games', 'Another name'),
    );
    expect(first.created).toBe(true);
    expect(again).toEqual({ id: first.id, name: 'Numen', created: false });
    expect(count(sqlite, 'team_profiles')).toBe(1);
    expect(count(sqlite, 'team_roles')).toBe(4);
  });

  it('makes one account of two first calls at once', async () => {
    const { desk, sqlite } = scene();
    const answers = await Promise.all([
      desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'),
      desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'),
    ]);
    expect(answers.map((answer) => accountOf(answer).created).sort()).toEqual([false, true]);
    expect(new Set(answers.map((answer) => accountOf(answer).id)).size).toBe(1);
    expect(count(sqlite, 'team_profiles')).toBe(1);
    expect(count(sqlite, "team_log WHERE act = 'organization-created'")).toBe(1);
    expect(count(sqlite, 'team_members')).toBe(1);
  });

  it('gives the same id in another database, and another id to another community', async () => {
    const one = accountOf(await scene().desk.ensureCommunityTeam(HOUSE, true, 'numinia', 'A'));
    const other = scene().desk;
    const two = accountOf(await other.ensureCommunityTeam(MARIA, true, 'numinia', 'B'));
    const third = accountOf(await other.ensureCommunityTeam(MARIA, true, 'numen-games', 'B'));
    expect(two.id).toBe(one.id);
    expect(third.id).not.toBe(one.id);
  });

  it('is born with the house-wide default AI agent (Historia 1), once, not again on a second call', async () => {
    const { desk, sqlite } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    const row = (): unknown =>
      sqlite
        .prepare(
          'SELECT enabled, model, trial_cap_cents FROM organization_ai_brain WHERE account_id = ?',
        )
        .get(id);
    expect(row()).toEqual({
      enabled: 1,
      model: DEFAULT_AI_MODEL,
      trial_cap_cents: DEFAULT_AI_TRIAL_CAP_CENTS,
    });
    await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen');
    expect(count(sqlite, 'organization_ai_brain WHERE account_id = ?', id)).toBe(1);
  });
});

describe('ensureCommunityTeam: who may and what it reads', () => {
  it('refuses everyone but the house, in words, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    for (const house of [false, undefined]) {
      expect(await desk.ensureCommunityTeam(PABLO, house, 'numen-games', 'Numen')).toEqual({
        ok: false,
        problems: [COMMUNITY_PROBLEMS.notHouse],
      });
    }
    expect(count(sqlite, 'accounts')).toBe(0);
    expect(count(sqlite, 'team_log')).toBe(0);
  });

  it('refuses a community id out of shape', async () => {
    const { desk, sqlite } = scene();
    for (const bad of ['', '-a', 'A', 'a b', 'a'.repeat(64), '../x', 7, null, undefined]) {
      expect(await desk.ensureCommunityTeam(HOUSE, true, bad, 'Numen'), String(bad)).toEqual({
        ok: false,
        problems: [COMMUNITY_PROBLEMS.community],
      });
    }
    expect(count(sqlite, 'accounts')).toBe(0);
  });

  it('refuses a name out of shape: empty, over 60, with a control character, not text', async () => {
    const { desk, sqlite } = scene();
    for (const bad of ['', '   ', 'x'.repeat(61), 'Nu\u0000men', 'Nu\nmen', 7, null, undefined]) {
      expect(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', bad), String(bad)).toEqual({
        ok: false,
        problems: [PROBLEMS.name],
      });
    }
    expect(count(sqlite, 'accounts')).toBe(0);
  });

  it('accepts a name of 60 characters', async () => {
    const { desk } = scene();
    const name = 'ñ'.repeat(60);
    expect(accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', name)).name).toBe(
      name,
    );
  });

  it('names every problem at once: the wallet, the flag, the community and the name', async () => {
    const { desk } = scene();
    expect(await desk.ensureCommunityTeam('nobody', 'yes', 'No Good', '')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house, COMMUNITY_PROBLEMS.community, PROBLEMS.name],
    });
  });

  it('puts the house’s refusal after the shape: a stranger with a bad id hears the id', async () => {
    const { desk } = scene();
    expect(await desk.ensureCommunityTeam(PABLO, false, 'No Good', 'Numen')).toEqual({
      ok: false,
      problems: [COMMUNITY_PROBLEMS.community],
    });
  });
});

describe('ensureCommunityTeam: outside the founder bound', () => {
  it('does not count against TEAMS_PER_FOUNDER: the house still founds twenty by hand', async () => {
    const { desk } = scene();
    for (let n = 0; n < TEAMS_PER_FOUNDER + 5; n += 1) {
      accountOf(await desk.ensureCommunityTeam(HOUSE, true, `community-${n}`, `Community ${n}`));
    }
    for (let n = 0; n < TEAMS_PER_FOUNDER; n += 1) {
      const made = await desk.createTeam(HOUSE, `By hand ${n}`);
      expect(made.ok, String(n)).toBe(true);
    }
    expect(await desk.createTeam(HOUSE, 'One too many')).toEqual({
      ok: false,
      problems: [PROBLEMS.teamsPerFounder],
    });
  });

  it('is not refused by a wallet that has founded twenty by hand', async () => {
    const { desk } = scene();
    for (let n = 0; n < TEAMS_PER_FOUNDER; n += 1) await desk.createTeam(HOUSE, `By hand ${n}`);
    expect((await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen')).ok).toBe(true);
  });
});

describe('a community’s account in the rest of the till', () => {
  it('shows in the house’s directory by name — and not in the overview of a wallet that is not in it', async () => {
    const { desk } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    expect(await desk.directory(HOUSE, true)).toEqual({
      ok: true,
      accounts: [{ id, kind: 'team', name: 'Numen' }],
    });
    const overview = await desk.overview(PABLO);
    if (!overview.ok) throw new Error(overview.problems.join());
    expect(overview.accounts.map((account) => account.id)).not.toContain(id);
  });

  it('is entered by the house, its only member: access, members, statement and log', async () => {
    const { desk } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    const access = await desk.access(HOUSE, id, true);
    expect(access).toMatchObject({ ok: true, accountId: id, as: 'house' });
    expect(await desk.members(HOUSE, id, true)).toMatchObject({
      ok: true,
      members: [{ wallet: HOUSE, role: 'admin' }],
    });
    expect(await desk.statement(HOUSE, id, '7d', true)).toMatchObject({
      ok: true,
      balanceCents: 0,
    });
    const log = await desk.log(HOUSE, id, true);
    if (!log.ok) throw new Error(log.problems.join());
    expect(log.lines.map((line) => line.act)).toContain('organization-created');
  });

  it('is closed to a wallet that is not in it, as any organization is', async () => {
    const { desk } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    expect(await desk.members(PABLO, id)).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
    expect(await desk.statement(PABLO, id, '7d')).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
  });

  it('takes its first member from the house, who then sees it in the overview with the role', async () => {
    const { desk } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    const added = await desk.setMember(HOUSE, id, MARIA, 'member', true);
    expect(added).toMatchObject({
      ok: true,
      members: [
        { wallet: HOUSE, role: 'admin' },
        { wallet: MARIA, role: 'member' },
      ],
    });
    const overview = await desk.overview(MARIA);
    if (!overview.ok) throw new Error(overview.problems.join());
    expect(overview.accounts).toContainEqual({
      id,
      kind: 'team',
      name: 'Numen',
      role: 'member',
      balanceCents: 0,
    });
    // Ensuring again leaves the member alone.
    await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen');
    expect(await desk.members(HOUSE, id, true)).toMatchObject({
      ok: true,
      members: [{ wallet: HOUSE }, { wallet: MARIA }],
    });
  });

  it('lets the last member leave, and an organization with nobody left still answers', async () => {
    const { desk } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    await desk.setMember(HOUSE, id, MARIA, 'member', true);
    const left = await desk.removeMember(MARIA, id, MARIA);
    expect(left).toMatchObject({ ok: true, members: [{ wallet: HOUSE }] });
    expect(await desk.members(HOUSE, id, true)).toMatchObject({
      ok: true,
      members: [{ wallet: HOUSE }],
    });
  });

  it('takes a world from the house, as any organization does', async () => {
    const { desk } = scene();
    const { id } = accountOf(await desk.ensureCommunityTeam(HOUSE, true, 'numen-games', 'Numen'));
    expect(await desk.placeWorld(HOUSE, true, ['reset'], id)).toEqual({ ok: true, placed: 1 });
    expect(await desk.homeOf('reset', undefined, null)).toMatchObject({
      ok: true,
      home: { accountId: id, accountName: 'Numen' },
    });
  });
});
