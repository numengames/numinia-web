/**
 * «MCP remoto», story W2 (2026-10-19): how an organization's AI was connected
 * (migration 0022's `connected_via`, `detail.via` in the log), the worlds of
 * an agent's organization in one query (`agentWorlds`), and the agent a live
 * token belongs to, by its hash alone (`agentByToken`). The till only ever
 * holds SHA-256(token): no test here needs a token, and every one that writes
 * the log asserts the hash is not in it.
 */

import { DEFAULT_AGENT_PRESENCE } from '@numinia/domain';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AGENT_PROBLEMS, VIA_PANEL, readAgentDraft, readConnectedVia } from '../src/lib/agents';
import { AccountDesk } from '../src/worker';
import { migrationFiles, migratedTill, sqliteD1 } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const KEY = `ed25519:${btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '')}`;
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

async function team(s: Scene, owner = PABLO, name = 'Numen'): Promise<string> {
  const made = await s.desk.createTeam(owner, name);
  if (!made.ok) throw new Error(made.problems.join());
  return made.account.id;
}

const problems = (answer: {
  readonly ok: boolean;
  readonly problems?: readonly string[];
}): string[] => (answer.ok ? [] : [...(answer.problems as readonly string[])]);

/** The organization's agent lines, oldest first, with their detail read. */
const agentLines = (s: Scene) =>
  (
    s.sqlite
      .prepare("SELECT act, subject, detail FROM team_log WHERE act LIKE 'agent-%' ORDER BY seq")
      .all() as { act: string; subject: string; detail: string }[]
  ).map((line) => ({ ...line, detail: JSON.parse(line.detail) as Record<string, string> }));

const viaOf = (s: Scene, agentId: string): unknown =>
  (
    s.sqlite.prepare('SELECT connected_via FROM team_agents WHERE agent_id = ?').get(agentId) as {
      connected_via: unknown;
    }
  ).connected_via;

describe('reading how an AI was connected', () => {
  it('knows the panel, and mcp: with the host its client returns to', () => {
    expect(readConnectedVia(undefined)).toBe(VIA_PANEL);
    expect(readConnectedVia('panel')).toBe('panel');
    for (const via of ['mcp:claude.ai', 'mcp:chatgpt.com', 'mcp:localhost', 'mcp:127.0.0.1']) {
      expect(readConnectedVia(via)).toBe(via);
    }
    expect(readConnectedVia(`mcp:${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}`)).toBe(
      `mcp:${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}`,
    );
    for (const via of [
      null,
      7,
      '',
      'Panel',
      'mcp:',
      'mcp:Claude.ai',
      'mcp:claude.ai:443',
      'mcp:-claude.ai',
      'mcp:claude..ai',
      'mcp:https://claude.ai',
      'mcp:[::1]',
      `mcp:${'a'.repeat(64)}`,
      `mcp:${Array.from({ length: 64 }, () => 'abc').join('.')}`,
      'oauth:claude.ai',
    ]) {
      expect(readConnectedVia(via)).toBeUndefined();
    }
  });

  it('reads via in a draft, the panel when absent, and refuses one out of shape', () => {
    expect(readAgentDraft(TOKEN)).toMatchObject({ via: 'panel' });
    expect(readAgentDraft({ ...TOKEN, via: 'mcp:claude.ai' })).toMatchObject({
      via: 'mcp:claude.ai',
    });
    expect(readAgentDraft({ id: 'k', name: 'K', publicKey: KEY, via: 'mcp:x.org' })).toMatchObject({
      auth: 'key',
      via: 'mcp:x.org',
    });
    expect(readAgentDraft({ ...TOKEN, via: 'claude.ai' })).toEqual([AGENT_PROBLEMS.via]);
  });
});

describe('migration 0022', () => {
  it('adds connected_via without a rebuild: rows, roles and the log are kept, and old rows are null', async () => {
    const shim = sqliteD1();
    const names = migrationFiles();
    const at = names.indexOf('0022_agent_connected_via.sql');
    expect(at).toBeGreaterThan(0);
    for (const name of names.slice(0, at)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
    const desk = new AccountDesk(ctx, { TILL_DB: shim.db });
    const made = await desk.createTeam(PABLO, 'Numen');
    if (!made.ok) throw new Error(made.problems.join());
    const accountId = made.account.id;
    shim.sqlite
      .prepare(
        `INSERT INTO team_agents (account_id, agent_id, name, auth_kind, token_hash, token_prefix, token_created_at, responsible_wallet, created_by, created_at, updated_at)
         VALUES (?, 'old', 'Old', 'token', ?, 'ab12cd34', '2026-10-18T10:00:00.000Z', ?, ?, '2026-10-18T10:00:00.000Z', '2026-10-18T10:00:00.000Z')`,
      )
      .run(accountId, HASH_C, PABLO, PABLO);
    const before = shim.sqlite.prepare('SELECT * FROM team_agents').all();
    const logBefore = shim.sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE name = 'team_log'")
      .get();

    shim.sqlite.exec(readFileSync(join(MIGRATIONS, names[at] as string), 'utf8'));
    expect(shim.sqlite.prepare('SELECT * FROM team_agents').all()).toEqual(
      before.map((row) => ({ ...(row as object), connected_via: null })),
    );
    // The later migrations (0023 adds hears) run over it, as in production.
    for (const name of names.slice(at + 1)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }

    expect(shim.sqlite.prepare('SELECT * FROM team_agents').all()).toEqual(
      before.map((row) => ({
        ...(row as object),
        connected_via: null,
        hears: 0,
        responsible_house: 0,
        presence_json: null,
        worlds_mode: 'todos',
      })),
    );
    // team_log is untouched: same act list, the founding trigger still there.
    expect(
      shim.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'team_log'").get(),
    ).toEqual(logBefore);
    expect(
      shim.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE name = 'team_members_founded_as_before'")
        .all(),
    ).toHaveLength(1);
    // An agent made before is shown with no way, and still found by its token.
    const view = await desk.agents(PABLO, accountId);
    expect(view.ok && view.agents[0]).not.toHaveProperty('via');
    expect(await desk.agentByToken(HASH_C)).toMatchObject({ ok: true, agent: { id: 'old' } });
  });

  it('holds the way’s alphabet in the table itself', async () => {
    const s = scene();
    const accountId = await team(s);
    await s.desk.createAgent(PABLO, accountId, TOKEN);
    const set = (via: string | null) =>
      s.sqlite
        .prepare("UPDATE team_agents SET connected_via = ? WHERE agent_id = 'claude-ana'")
        .run(via);
    for (const via of [null, 'panel', 'mcp:claude.ai', 'mcp:localhost']) {
      expect(() => set(via)).not.toThrow();
    }
    for (const via of ['', 'Panel', 'mcp:', 'mcp:Claude.ai', 'mcp:a b', 'mcp:x:1', 'oauth:x']) {
      expect(() => set(via)).toThrow();
    }
  });
});

describe('creating an agent with a way', () => {
  it('keeps mcp:<host> on the row, shows it, and writes it as detail.via, never the hash', async () => {
    const s = scene();
    const accountId = await team(s);
    const made = await s.desk.createAgent(PABLO, accountId, { ...TOKEN, via: 'mcp:claude.ai' });
    if (!made.ok) throw new Error(made.problems.join());
    expect(made.agents[0]).toMatchObject({ id: 'claude-ana', via: 'mcp:claude.ai' });
    expect(viaOf(s, 'claude-ana')).toBe('mcp:claude.ai');
    expect(agentLines(s)).toEqual([
      {
        act: 'agent-created',
        subject: 'claude-ana',
        detail: { name: 'Claude de Ana', via: 'mcp:claude.ai' },
      },
      {
        act: 'agent-token-created',
        subject: 'claude-ana',
        detail: { name: 'Claude de Ana', prefix: 'ab12cd34', via: 'mcp:claude.ai' },
      },
    ]);
    expect(JSON.stringify(s.sqlite.prepare('SELECT * FROM team_log').all())).not.toContain(HASH_A);
    expect(JSON.stringify(made)).not.toContain(HASH_A);
  });

  it('is the panel when the draft says nothing, for a key agent too', async () => {
    const s = scene();
    const accountId = await team(s);
    await s.desk.createAgent(PABLO, accountId, TOKEN);
    await s.desk.createAgent(PABLO, accountId, { id: 'keyed', name: 'Keyed', publicKey: KEY });
    expect(viaOf(s, 'claude-ana')).toBe('panel');
    expect(viaOf(s, 'keyed')).toBe('panel');
    const view = await s.desk.agents(PABLO, accountId);
    expect(view.ok && view.agents.map((agent) => agent.via)).toEqual(['panel', 'panel']);
    expect(agentLines(s).map((line) => line.detail['via'])).toEqual(['panel', 'panel', 'panel']);
  });

  it('refuses a way out of shape and writes nothing', async () => {
    const s = scene();
    const accountId = await team(s);
    expect(
      problems(await s.desk.createAgent(PABLO, accountId, { ...TOKEN, via: 'mcp:Claude.AI' })),
    ).toEqual([AGENT_PROBLEMS.via]);
    expect(agentLines(s)).toEqual([]);
  });
});

describe('renewing a token with a way', () => {
  it('changes the row’s way to the renewal’s, and writes it as detail.via, never either hash', async () => {
    const s = scene();
    const accountId = await team(s);
    await s.desk.createAgent(PABLO, accountId, TOKEN);
    const renewed = await s.desk.renewAgentToken(
      PABLO,
      accountId,
      'claude-ana',
      HASH_B,
      'zz99yy88',
      false,
      'mcp:chatgpt.com',
    );
    if (!renewed.ok) throw new Error(renewed.problems.join());
    expect(renewed.agents[0]).toMatchObject({ via: 'mcp:chatgpt.com', tokenPrefix: 'zz99yy88' });
    expect(viaOf(s, 'claude-ana')).toBe('mcp:chatgpt.com');
    expect(agentLines(s).at(-1)).toEqual({
      act: 'agent-token-renewed',
      subject: 'claude-ana',
      detail: { name: 'Claude de Ana', prefix: 'zz99yy88', via: 'mcp:chatgpt.com' },
    });
    // Back from the panel, with no way said: the panel again.
    await s.desk.renewAgentToken(PABLO, accountId, 'claude-ana', HASH_C, 'qq77ww66');
    expect(viaOf(s, 'claude-ana')).toBe('panel');
    expect(agentLines(s).at(-1)?.detail['via']).toBe('panel');
    const log = JSON.stringify(s.sqlite.prepare('SELECT * FROM team_log').all());
    for (const hash of [HASH_A, HASH_B, HASH_C]) expect(log).not.toContain(hash);
  });

  it('keeps the way through a revocation, and refuses a way out of shape', async () => {
    const s = scene();
    const accountId = await team(s);
    await s.desk.createAgent(PABLO, accountId, { ...TOKEN, via: 'mcp:claude.ai' });
    await s.desk.revokeAgentToken(PABLO, accountId, 'claude-ana');
    expect(viaOf(s, 'claude-ana')).toBe('mcp:claude.ai');
    expect(
      problems(
        await s.desk.renewAgentToken(PABLO, accountId, 'claude-ana', HASH_B, 'zz99yy88', false, 7),
      ),
    ).toEqual([AGENT_PROBLEMS.via]);
    expect(viaOf(s, 'claude-ana')).toBe('mcp:claude.ai');
  });
});

describe('the worlds of an agent’s organization', () => {
  async function placed() {
    const s = scene();
    const numen = await team(s);
    const reset = await team(s, MARIA, 'Reset');
    await s.desk.createAgent(PABLO, numen, TOKEN);
    await s.desk.createAgent(MARIA, reset, { ...TOKEN, tokenHash: HASH_B });
    await s.desk.placeWorld(HOUSE, true, ['torre', 'agora-plaza'], numen);
    await s.desk.placeWorld(HOUSE, true, ['bosque'], reset);
    return { s, numen, reset };
  }

  it('lists its organization’s worlds, by id, in one query', async () => {
    const { s, numen, reset } = await placed();
    const prepare = s.db.prepare.bind(s.db);
    let statements = 0;
    s.db.prepare = (query: string) => {
      statements += 1;
      return prepare(query);
    };
    expect(await s.desk.agentWorlds(numen, 'claude-ana')).toEqual({
      ok: true,
      accountId: numen,
      agentId: 'claude-ana',
      worldIds: ['agora-plaza', 'torre'],
      worlds: { todos: true },
      presence: DEFAULT_AGENT_PRESENCE,
    });
    expect(statements).toBe(1);
    expect(await s.desk.agentWorlds(reset, 'claude-ana')).toMatchObject({ worldIds: ['bosque'] });
  });

  it('answers an empty list for an organization with no world', async () => {
    const s = scene();
    const numen = await team(s);
    await s.desk.createAgent(PABLO, numen, TOKEN);
    expect(await s.desk.agentWorlds(numen, 'claude-ana')).toMatchObject({ ok: true, worldIds: [] });
  });

  it('refuses an agent of another organization, an unknown one and arguments out of shape', async () => {
    const { s, numen, reset } = await placed();
    await s.desk.createAgent(PABLO, numen, { ...TOKEN, id: 'solo-numen', tokenHash: HASH_C });
    expect(problems(await s.desk.agentWorlds(reset, 'solo-numen'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.agentWorlds(numen, 'ghost'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.agentWorlds(7, 'Bad!'))).toHaveLength(2);
    expect(problems(await s.desk.agentWorlds(numen, 'Bad!'))).toEqual([AGENT_PROBLEMS.agentId]);
    expect(problems(await s.desk.agentWorlds(7, 'claude-ana'))).toHaveLength(1);
  });

  it('still lists them for a revoked agent: placement is public, the pass decides who enters', async () => {
    const { s, numen } = await placed();
    await s.desk.revokeAgentToken(PABLO, numen, 'claude-ana');
    expect(await s.desk.agentWorlds(numen, 'claude-ana')).toMatchObject({
      worldIds: ['agora-plaza', 'torre'],
    });
  });
});

describe('the agent a token belongs to', () => {
  it('is found by its hash alone and answered as its pass', async () => {
    const s = scene();
    const numen = await team(s);
    await s.desk.createAgent(PABLO, numen, { ...TOKEN, via: 'mcp:claude.ai' });
    const found = await s.desk.agentByToken(HASH_A);
    expect(found).toEqual(await s.desk.agentPass(numen, 'claude-ana'));
    expect(found).toMatchObject({ ok: true, accountId: numen, agent: { id: 'claude-ana' } });
  });

  it('is found switched off, and told so', async () => {
    const s = scene();
    const numen = await team(s);
    await s.desk.createAgent(PABLO, numen, TOKEN);
    await s.desk.changeAgent(PABLO, numen, 'claude-ana', { enabled: false });
    expect(await s.desk.agentByToken(HASH_A)).toMatchObject({ agent: { enabled: false } });
  });

  it('is nobody for an unknown hash, a revoked token, a renewed one’s old hash, or a hash out of shape', async () => {
    const s = scene();
    const numen = await team(s);
    await s.desk.createAgent(PABLO, numen, TOKEN);
    await s.desk.createAgent(PABLO, numen, { ...TOKEN, id: 'revoked', tokenHash: HASH_B });
    await s.desk.createAgent(PABLO, numen, { id: 'keyed', name: 'Keyed', publicKey: KEY });
    await s.desk.revokeAgentToken(PABLO, numen, 'revoked');
    expect(problems(await s.desk.agentByToken(HASH_C))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(problems(await s.desk.agentByToken(HASH_B))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    await s.desk.renewAgentToken(PABLO, numen, 'claude-ana', HASH_C, 'zz99yy88');
    expect(problems(await s.desk.agentByToken(HASH_A))).toEqual([AGENT_PROBLEMS.noSuchAgent]);
    expect(await s.desk.agentByToken(HASH_C)).toMatchObject({ agent: { id: 'claude-ana' } });
    for (const sent of ['ntk_secret', 'A'.repeat(64), null, 7]) {
      expect(problems(await s.desk.agentByToken(sent))).toEqual([AGENT_PROBLEMS.tokenHash]);
    }
  });
});
