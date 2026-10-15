/**
 * The directory (QA 2026-10-15, «la casa entra»): the one door of the account
 * desk that lists organizations a wallet is not in — to the house's staff
 * only (numinia-archive STD-051 ORG-007). The real migrations on the D1 shim,
 * and the desk as numinia.com's binding calls it.
 *
 * A directory is names, not entry: it reveals ids and names (never money,
 * never people), writes nothing, and each entry into an organization is
 * still decided and logged where it happens (`access`, `statement`, …).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-15T12:00:00.000Z');
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

async function team(desk: AccountDesk, name: string, founder = PABLO): Promise<string> {
  const made = await desk.createTeam(founder, name);
  if (!made.ok) throw new Error(made.problems.join());
  return made.account.id;
}

/** Everything the desk writes to, counted: a read must leave every count as it was. */
function counts(sqlite: Shim['sqlite']): Record<string, number> {
  const tables = [
    'accounts',
    'account_wallets',
    'team_profiles',
    'team_members',
    'team_roles',
    'team_log',
    'ledger_lines',
    'checkouts',
  ];
  return Object.fromEntries(
    tables.map((table) => [
      table,
      Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()?.['n']),
    ]),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the directory, for the house', () => {
  it('lists every organization by name, whoever founded it and whether or not the asker is in it', async () => {
    const { desk } = scene();
    const numen = await team(desk, 'Numen Games');
    const arca = await team(desk, 'arcasiles');
    const institute = await team(desk, 'Active Inference Institute', MARIA);
    const tarugo = await team(desk, 'La Tarugo', MARIA);
    // The house is in none of them, and is listed all the same.
    expect(await desk.directory(HOUSE, true)).toEqual({
      ok: true,
      accounts: [
        { id: institute, kind: 'team', name: 'Active Inference Institute' },
        { id: arca, kind: 'team', name: 'arcasiles' },
        { id: tarugo, kind: 'team', name: 'La Tarugo' },
        { id: numen, kind: 'team', name: 'Numen Games' },
      ],
    });
    // A member who is also the house sees the same list: the directory is not a membership.
    expect(await desk.directory(PABLO, true)).toEqual(await desk.directory(HOUSE, true));
  });

  it('answers an empty list while there is no organization, and counts no personal account as one', async () => {
    const { desk } = scene();
    expect(await desk.directory(HOUSE, true)).toEqual({ ok: true, accounts: [] });
    await desk.overview(PABLO);
    expect(await desk.directory(HOUSE, true)).toEqual({ ok: true, accounts: [] });
  });

  it('reveals names and ids only: no money, no role, no wallet', async () => {
    const { desk, sqlite } = scene();
    const id = await team(desk, 'Numen Games');
    sqlite.exec(`
      INSERT INTO ledger_lines (id, account_id, kind, amount_cents, at, vat_cents)
        VALUES ('L1', '${id}', 'topup', 5000, '2026-10-10T09:00:00.000Z', 1050);
    `);
    const answer = await desk.directory(HOUSE, true);
    expect(answer.ok && answer.accounts.map((entry) => Object.keys(entry).sort())).toEqual([
      ['id', 'kind', 'name'],
    ]);
    // Neither the balance of 50 €, nor the founder's wallet, nor a role leaves in a directory.
    expect(JSON.stringify(answer)).not.toMatch(/balance|cents|role|0x|5000/i);
  });

  it('answers plain data, which RPC carries by value', async () => {
    const { desk } = scene();
    await team(desk, 'Numen Games');
    const answer = await desk.directory(HOUSE, true);
    expect(structuredClone(answer)).toEqual(answer);
  });

  it('lists only the organizations that let the house in (ORG-007), and writes down nothing', async () => {
    const { desk, sqlite } = scene();
    const open = await team(desk, 'Open');
    const always = await team(desk, 'Always');
    const never = await team(desk, 'Never');
    const onRequest = await team(desk, 'On request');
    sqlite.exec(`
      UPDATE team_profiles SET house_access = 'always' WHERE account_id = '${always}';
      UPDATE team_profiles SET house_access = 'never' WHERE account_id = '${never}';
      UPDATE team_profiles SET house_access = 'on-request' WHERE account_id = '${onRequest}';
    `);
    const before = counts(sqlite);
    const answer = await desk.directory(HOUSE, true);
    const listed = answer.ok ? answer.accounts.map((entry) => entry.id) : [];
    expect(listed).toEqual([always, open]);
    expect(listed).not.toContain(never);
    expect(listed).not.toContain(onRequest);
    // A read of names writes nothing: no log line (the log is per organization), no account,
    // not even the asker's own personal account that `overview` opens the first time.
    expect(counts(sqlite)).toEqual(before);
  });
});

describe('the directory, for anyone else', () => {
  it('refuses unless the house flag is true: a missing flag is false, in plain words', async () => {
    const { desk } = scene();
    await team(desk, 'Numen Games');
    const refusal = { ok: false, problems: [ORG_PROBLEMS.notHouse] };
    expect(ORG_PROBLEMS.notHouse).toBe('only the house reads the directory of organizations');
    expect(await desk.directory(PABLO)).toEqual(refusal);
    expect(await desk.directory(PABLO, undefined)).toEqual(refusal);
    expect(await desk.directory(PABLO, false)).toEqual(refusal);
    // The founder of an organization is no more the house than a stranger is.
    expect(await desk.directory(HOUSE, false)).toEqual(refusal);
  });

  it('refuses a flag that is not a boolean as the desk refuses it everywhere, and a wallet that is not the session’s shape', async () => {
    const { desk } = scene();
    for (const flag of ['true', 'yes', 1, 0, null, {}, []]) {
      expect(await desk.directory(HOUSE, flag)).toEqual({
        ok: false,
        problems: [ORG_PROBLEMS.house],
      });
    }
    expect(await desk.directory('0xNOPE', true)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet],
    });
    expect(await desk.directory(7, 'yes')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house],
    });
    expect(await desk.directory(HOUSE.toUpperCase(), true)).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet],
    });
  });

  it('tells a refused asker nothing of what the directory holds', async () => {
    const { desk } = scene();
    await team(desk, 'Numen Games');
    for (const refusal of [await desk.directory(PABLO, false), await desk.directory(PABLO, 'x')]) {
      expect(JSON.stringify(refusal)).not.toContain('Numen');
      expect(JSON.stringify(refusal)).not.toContain('acc_t_');
    }
  });
});

describe('the directory is no way in', () => {
  it('leaves entering to the organization: the house gets in as the house, and that read is logged', async () => {
    const { desk, sqlite } = scene();
    const id = await team(desk, 'Numen Games');
    const listed = await desk.directory(HOUSE, true);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM team_log WHERE as_house = 1').get()).toEqual({
      n: 0,
    });
    // Without the flag the listed id opens nothing …
    expect(await desk.access(HOUSE, id)).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
    // … with it the house enters as the house, and the log keeps the read.
    const view = await desk.access(HOUSE, id, true);
    expect(listed.ok && listed.accounts[0]?.id).toBe(id);
    expect(view.ok && view.as).toBe('house');
    expect(
      sqlite
        .prepare('SELECT actor, as_house, act, detail FROM team_log WHERE as_house = 1')
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ actor: HOUSE, as_house: 1, act: 'house-read', detail: '{"what":"access"}' }]);
  });
});

describe('a database that fails', () => {
  it('throws, so the caller can tell a failure from a refusal', async () => {
    const { desk, sqlite } = scene();
    await team(desk, 'Numen Games');
    sqlite.close();
    await expect(desk.directory(HOUSE, true)).rejects.toThrow();
  });
});
