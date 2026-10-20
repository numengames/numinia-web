/**
 * «MCP remoto», story W2 (2026-10-19): how an organization's AI was connected
 * (migration 0022's `connected_via`, `detail.via` in the log), the worlds of
 * an agent's organization in one query (`agentWorlds`), and the agent a live
 * token belongs to, by its hash alone (`agentByToken`). The till only ever
 * holds SHA-256(token): no test here needs a token, and every one that writes
 * the log asserts the hash is not in it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AGENT_PROBLEMS, readAgentChange, readAgentDraft } from '../src/lib/agents';
import { AccountDesk } from '../src/worker';
import { migrationFiles, migratedTill, sqliteD1 } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ctx = {} as ExecutionContext;
const HASH_A = 'a'.repeat(64);
const HASH_C = 'c'.repeat(64);
const TOKEN = {
  auth: 'token',
  id: 'claude-ana',
  name: 'Claude de Ana',
  tokenHash: HASH_A,
  tokenPrefix: 'ab12cd34',
};
const MIGRATIONS = fileURLToPath(new URL('../migrations/', import.meta.url).href);

function scene() {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}
type Scene = ReturnType<typeof scene>;

async function team(s: Scene): Promise<string> {
  const made = await s.desk.createTeam(PABLO, 'Numen');
  if (!made.ok) throw new Error(made.problems.join());
  return made.account.id;
}

const problems = (answer: {
  readonly ok: boolean;
  readonly problems?: readonly string[];
}): string[] => (answer.ok ? [] : [...(answer.problems as readonly string[])]);

const hearsOf = (s: Scene): unknown =>
  (s.sqlite.prepare('SELECT hears FROM team_agents').get() as { hears: unknown }).hears;

describe('reading hears', () => {
  it('reads it in a draft (off when absent) and in a change', () => {
    expect(readAgentDraft(TOKEN)).toMatchObject({ hears: false });
    expect(readAgentDraft({ ...TOKEN, hears: true })).toMatchObject({ hears: true });
    expect(readAgentDraft({ ...TOKEN, hears: 'yes' })).toEqual([AGENT_PROBLEMS.hears]);
    expect(readAgentChange({ hears: true })).toEqual({ hears: true });
    expect(readAgentChange({ enabled: false, hears: false })).toEqual({
      enabled: false,
      hears: false,
    });
    expect(readAgentChange({ hears: 1 })).toEqual([AGENT_PROBLEMS.hears]);
  });
});

describe('an AI’s hearing', () => {
  it('is off by default, and on when the new AI is made so', async () => {
    const s = scene();
    const id = await team(s);
    const made = await s.desk.createAgent(PABLO, id, TOKEN);
    expect(made.ok && made.agents[0]).toMatchObject({ hears: false });
    expect(hearsOf(s)).toBe(0);
    const s2 = scene();
    const id2 = await team(s2);
    const made2 = await s2.desk.createAgent(PABLO, id2, { ...TOKEN, hears: true });
    expect(made2.ok && made2.agents[0]).toMatchObject({ hears: true });
    expect(hearsOf(s2)).toBe(1);
    expect(await s2.desk.agentByToken(HASH_A)).toMatchObject({ ok: true, agent: { hears: true } });
  });

  it('is flipped by whoever may edit it, logged, and nothing when nothing changes', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.createAgent(PABLO, id, TOKEN);
    const before = s.sqlite.prepare('SELECT count(*) AS n FROM team_log').get() as { n: number };
    const on = await s.desk.changeAgent(PABLO, id, 'claude-ana', { hears: true });
    expect(on.ok && on.agents[0]).toMatchObject({ hears: true, enabled: true, mayEdit: true });
    const same = await s.desk.changeAgent(PABLO, id, 'claude-ana', { hears: true });
    expect(same.ok && same.agents[0]).toMatchObject({ hears: true });
    await s.desk.changeAgent(PABLO, id, 'claude-ana', { hears: false });
    const lines = s.sqlite
      .prepare("SELECT act, detail FROM team_log WHERE act = 'agent-state' ORDER BY seq")
      .all() as { act: string; detail: string }[];
    expect(lines.map((line) => JSON.parse(line.detail))).toEqual([
      { name: 'Claude de Ana', hears: 'on' },
      { name: 'Claude de Ana', hears: 'off' },
    ]);
    const after = s.sqlite.prepare('SELECT count(*) AS n FROM team_log').get() as { n: number };
    expect(after.n).toBe(before.n + 2);
    expect(hearsOf(s)).toBe(0);
  });

  it('is refused to a stranger and to a member who may not edit the AI', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.createAgent(PABLO, id, TOKEN);
    expect(
      problems(await s.desk.changeAgent(MARIA, id, 'claude-ana', { hears: true })).length,
    ).toBeGreaterThan(0);
    expect(hearsOf(s)).toBe(0);
  });
});

describe('migration 0023', () => {
  it('adds hears without a rebuild: old rows hear nothing and the log is untouched', async () => {
    const shim = sqliteD1();
    const names = migrationFiles();
    const at = names.indexOf('0023_agent_hears.sql');
    expect(at).toBe(names.length - 1);
    for (const name of names.slice(0, at)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
    const desk = new AccountDesk(ctx, { TILL_DB: shim.db });
    const made = await desk.createTeam(PABLO, 'Numen');
    if (!made.ok) throw new Error(made.problems.join());
    shim.sqlite
      .prepare(
        `INSERT INTO team_agents (account_id, agent_id, name, auth_kind, token_hash, token_prefix, token_created_at, responsible_wallet, created_by, created_at, updated_at)
         VALUES (?, 'old', 'Old', 'token', ?, 'ab12cd34', '2026-10-18T10:00:00.000Z', ?, ?, '2026-10-18T10:00:00.000Z', '2026-10-18T10:00:00.000Z')`,
      )
      .run(made.account.id, HASH_C, PABLO, PABLO);
    const logBefore = shim.sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE name = 'team_log'")
      .get();
    shim.sqlite.exec(readFileSync(join(MIGRATIONS, names[at] as string), 'utf8'));
    expect(shim.sqlite.prepare('SELECT hears FROM team_agents').get()).toEqual({ hears: 0 });
    expect(
      shim.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'team_log'").get(),
    ).toEqual(logBefore);
    expect(() => shim.sqlite.prepare('UPDATE team_agents SET hears = 2').run()).toThrow();
  });
});
