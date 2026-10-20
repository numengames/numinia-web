/**
 * «IAs de organización», cut 2 — access tokens (2026-10-17): the rules that
 * read a token draft, migration 0021 on the D1 shim (the rebuild keeps the
 * data, the roles and the log), and the desk's token methods. The till only
 * ever holds SHA-256(token) and an 8-character prefix: no test here needs a
 * token, and one asserts the log carries neither.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AGENT_PROBLEMS, readAgentDraft, readTokenHash, readTokenPrefix } from '../src/lib/agents';
import { AccountDesk } from '../src/worker';
import { migrationFiles, migratedTill, sqliteD1 } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const STRANGER = wallet('ef');
const ctx = {} as ExecutionContext;

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const KEY = `ed25519:${b64url(new Uint8Array(32).fill(7))}`;
const TOKEN = {
  auth: 'token',
  id: 'tok-bot',
  name: 'Token bot',
  tokenHash: HASH_A,
  tokenPrefix: 'ab12cd34',
};
const BOT = { id: 'hermes-1', name: 'Hermes', publicKey: KEY };

function scene() {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}
type Scene = ReturnType<typeof scene>;

async function team(s: Scene) {
  const made = await s.desk.createTeam(PABLO, 'Numen');
  if (!made.ok) throw new Error(made.problems.join());
  const id = made.account.id;
  await s.desk.setMember(PABLO, id, MARIA, 'member');
  const roles = await s.desk.roles(PABLO, id);
  if (!roles.ok) throw new Error(roles.problems.join());
  const member = roles.roles.find((r) => r.name === 'Member')?.id as string;
  return { id, member };
}

const problems = (answer: {
  readonly ok: boolean;
  readonly problems?: readonly string[];
}): string[] => (answer.ok ? [] : [...(answer.problems as readonly string[])]);

const MIGRATIONS = fileURLToPath(new URL('../migrations/', import.meta.url).href);

describe('reading a token', () => {
  it('knows a SHA-256 in hex and an 8-character prefix, and nothing else', () => {
    expect(readTokenHash(HASH_A)).toBe(HASH_A);
    for (const value of ['A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), 7, null]) {
      expect(readTokenHash(value)).toBeUndefined();
    }
    expect(readTokenPrefix('ab12_-cD')).toBe('ab12_-cD');
    for (const value of ['ab12cd3', 'ab12cd345', 'ab12cd3!', 7]) {
      expect(readTokenPrefix(value)).toBeUndefined();
    }
  });

  it('reads a token draft: auth token, a hash and a prefix, and never a key beside them', () => {
    expect(readAgentDraft(TOKEN)).toEqual({ ...TOKEN, roleIds: [], via: 'panel', hears: false });
    expect(readAgentDraft({ ...TOKEN, roleIds: ['role_0123456789abcdef'] })).toMatchObject({
      auth: 'token',
      roleIds: ['role_0123456789abcdef'],
    });
    expect(readAgentDraft({ ...TOKEN, publicKey: KEY })).toEqual([AGENT_PROBLEMS.draft]);
    expect(readAgentDraft({ ...BOT, tokenHash: HASH_A })).toEqual([AGENT_PROBLEMS.draft]);
    expect(readAgentDraft({ auth: 'token' })).toEqual([
      AGENT_PROBLEMS.agentId,
      AGENT_PROBLEMS.name,
      AGENT_PROBLEMS.tokenHash,
      AGENT_PROBLEMS.tokenPrefix,
    ]);
  });
});

describe('migration 0021', () => {
  it('rebuilds team_agents keeping the data, the roles and the log, and allows a null key only for a token', async () => {
    const shim = sqliteD1();
    const names = migrationFiles();
    const at = names.indexOf('0021_agent_access_tokens.sql');
    expect(at).toBeGreaterThan(0);
    for (const name of names.slice(0, at)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
    const desk = new AccountDesk(ctx, { TILL_DB: shim.db });
    const made = await desk.createTeam(PABLO, 'Numen');
    if (!made.ok) throw new Error(made.problems.join());
    const id = made.account.id;
    const roles = await desk.roles(PABLO, id);
    if (!roles.ok) throw new Error(roles.problems.join());
    const member = roles.roles.find((r) => r.name === 'Member')?.id as string;
    // Written by the previous code (0011's columns): a key agent with a role.
    shim.sqlite
      .prepare(
        `INSERT INTO team_agents (account_id, agent_id, name, public_key, responsible_wallet, created_by, created_at, updated_at)
         VALUES (?, 'hermes-1', 'Hermes', ?, ?, ?, '2026-10-17T10:00:00.000Z', '2026-10-17T10:00:00.000Z')`,
      )
      .run(id, KEY, PABLO, PABLO);
    shim.sqlite
      .prepare('INSERT INTO team_agent_roles (account_id, agent_id, role_id) VALUES (?, ?, ?)')
      .run(id, 'hermes-1', member);
    const logBefore = shim.sqlite.prepare('SELECT count(*) AS n FROM team_log').get();
    const before = shim.sqlite.prepare('SELECT * FROM team_agents').all();

    shim.sqlite.exec(readFileSync(join(MIGRATIONS, '0021_agent_access_tokens.sql'), 'utf8'));

    const after = shim.sqlite.prepare('SELECT * FROM team_agents').all();
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      ...before[0],
      auth_kind: 'key',
      token_hash: null,
      token_prefix: null,
      token_created_at: null,
    });
    expect(shim.sqlite.prepare('SELECT role_id FROM team_agent_roles').all()).toEqual([
      { role_id: member },
    ]);
    expect(shim.sqlite.prepare('SELECT count(*) AS n FROM team_log').get()).toEqual(logBefore);
    // The log keeps every act the migrations before it allowed (0013, 0015).
    const logSql = (
      shim.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'team_log'").get() as {
        sql: string;
      }
    ).sql;
    for (const act of [
      'request-accepted',
      'request-declined',
      'ritual-created',
      'ritual-cancelled',
    ]) {
      expect(logSql).toContain(`'${act}'`);
    }
    expect(
      shim.sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE name LIKE 'team_agents%keep' OR name LIKE '%_keep'",
        )
        .all(),
    ).toEqual([]);
    expect(shim.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    // The migrations after it, then the agent still works through the new code.
    for (const name of names.slice(at + 1)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
    const view = await desk.agents(PABLO, id);
    expect(view.ok && view.agents[0]).toMatchObject({
      id: 'hermes-1',
      auth: 'key',
      publicKey: KEY,
    });
  });

  it('holds the key-or-token rule in the table itself', async () => {
    const s = scene();
    const { id } = await team(s);
    const insert = (
      agent: string,
      auth: string,
      key: string | null,
      hash: string | null,
      prefix: string | null,
      at: string | null,
    ) =>
      s.sqlite
        .prepare(
          `INSERT INTO team_agents (account_id, agent_id, name, auth_kind, public_key, token_hash, token_prefix, token_created_at, responsible_wallet, created_by, created_at, updated_at)
           VALUES (?, ?, 'X', ?, ?, ?, ?, ?, ?, ?, '2026-10-17T10:00:00.000Z', '2026-10-17T10:00:00.000Z')`,
        )
        .run(id, agent, auth, key, hash, prefix, at, PABLO, PABLO);
    const at = '2026-10-17T10:00:00.000Z';
    expect(() => insert('k', 'key', KEY, null, null, null)).not.toThrow();
    expect(() => insert('t', 'token', null, HASH_A, 'ab12cd34', at)).not.toThrow();
    expect(() => insert('r', 'token', null, null, null, null)).not.toThrow();
    // A key agent needs a key and no token; a token agent has no key; never both.
    expect(() => insert('k2', 'key', null, null, null, null)).toThrow();
    expect(() => insert('k3', 'key', KEY.replace('A', 'B'), HASH_B, 'ab12cd34', at)).toThrow();
    expect(() => insert('t2', 'token', KEY, HASH_B, 'ab12cd34', at)).toThrow();
    expect(() => insert('t3', 'token', null, HASH_B, null, at)).toThrow();
    expect(() => insert('t4', 'token', null, 'ZZ'.repeat(32), 'ab12cd34', at)).toThrow();
    expect(() => insert('t5', 'token', null, HASH_B, 'short', at)).toThrow();
    expect(() => insert('t6', 'token', null, HASH_B, 'ab12cd34', 'yesterday')).toThrow();
    expect(() => insert('t7', 'password', null, HASH_B, 'ab12cd34', at)).toThrow();
    // Two agents never share a token hash.
    expect(() => insert('t8', 'token', null, HASH_A, 'ab12cd34', at)).toThrow();
  });
});

describe('creating a token agent', () => {
  it('keeps the hash and the prefix, shows the prefix, and logs the prefix only', async () => {
    const s = scene();
    const { id, member } = await team(s);
    const made = await s.desk.createAgent(PABLO, id, { ...TOKEN, roleIds: [member] });
    if (!made.ok) throw new Error(made.problems.join());
    expect(made.agents[0]).toMatchObject({
      id: 'tok-bot',
      auth: 'token',
      tokenPrefix: 'ab12cd34',
      enabled: true,
      status: 'activa',
      roleIds: [member],
    });
    expect(made.agents[0]).not.toHaveProperty('publicKey');
    expect(JSON.stringify(made)).not.toContain(HASH_A);
    const lines = s.sqlite
      .prepare("SELECT act, subject, detail FROM team_log WHERE act LIKE 'agent-%' ORDER BY seq")
      .all();
    expect(lines.map((line) => line['act'])).toEqual(['agent-created', 'agent-token-created']);
    expect(lines[1]).toMatchObject({
      subject: 'tok-bot',
      detail: JSON.stringify({ name: 'Token bot', prefix: 'ab12cd34', via: 'panel' }),
    });
    expect(JSON.stringify(lines)).not.toContain(HASH_A);
  });

  it('refuses the same hash twice, a draft out of shape, and keeps key agents next to token agents', async () => {
    const s = scene();
    const { id } = await team(s);
    expect((await s.desk.createAgent(PABLO, id, TOKEN)).ok).toBe(true);
    expect(problems(await s.desk.createAgent(PABLO, id, { ...TOKEN, id: 'other' }))).toEqual([
      AGENT_PROBLEMS.taken,
    ]);
    expect(problems(await s.desk.createAgent(PABLO, id, { ...TOKEN, tokenHash: 'x' }))).toEqual([
      AGENT_PROBLEMS.tokenHash,
    ]);
    expect(
      problems(await s.desk.createAgent(MARIA, id, { ...TOKEN, id: 'm', tokenHash: HASH_B }))[0],
    ).toMatch(/manage-roles/);
    expect((await s.desk.createAgent(PABLO, id, BOT)).ok).toBe(true);
    const view = await s.desk.agents(PABLO, id);
    expect(view.ok && view.agents.map((a) => [a.id, a.auth])).toEqual([
      ['tok-bot', 'token'],
      ['hermes-1', 'key'],
    ]);
  });

  it('gives the pass route the hash of a token agent and the key of a key agent, never both', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, TOKEN);
    await s.desk.createAgent(PABLO, id, BOT);
    const token = await s.desk.agentPass(id, 'tok-bot');
    const key = await s.desk.agentPass(id, 'hermes-1');
    if (!token.ok || !key.ok) throw new Error('no pass');
    expect(token.agent).toEqual({
      auth: 'token',
      id: 'tok-bot',
      name: 'Token bot',
      tokenHash: HASH_A,
      enabled: true,
      state: 'activa',
      hears: false,
    });
    expect(key.agent).toMatchObject({ auth: 'key', publicKey: KEY });
    expect(key.agent).not.toHaveProperty('tokenHash');
  });
});

describe('renewing a token', () => {
  it('replaces the hash and the prefix, keeps the switch, and logs the new prefix', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, TOKEN);
    await s.desk.changeAgent(PABLO, id, 'tok-bot', { enabled: false });
    const renewed = await s.desk.renewAgentToken(PABLO, id, 'tok-bot', HASH_B, 'zz99yy88');
    if (!renewed.ok) throw new Error(renewed.problems.join());
    expect(renewed.agents[0]).toMatchObject({ tokenPrefix: 'zz99yy88', enabled: false });
    const pass = await s.desk.agentPass(id, 'tok-bot');
    expect(pass.ok && pass.agent).toMatchObject({ tokenHash: HASH_B });
    const line = s.sqlite
      .prepare("SELECT subject, detail FROM team_log WHERE act = 'agent-token-renewed'")
      .get();
    expect(line).toMatchObject({
      subject: 'tok-bot',
      detail: JSON.stringify({ name: 'Token bot', prefix: 'zz99yy88', via: 'panel' }),
    });
    expect(JSON.stringify(s.sqlite.prepare('SELECT * FROM team_log').all())).not.toContain(HASH_B);
  });

  it('refuses a bad hash or prefix, the same hash, a key agent, a stranger, a member without manage-roles and an unknown agent', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, TOKEN);
    await s.desk.createAgent(PABLO, id, BOT);
    expect(problems(await s.desk.renewAgentToken(PABLO, id, 'tok-bot', 'x', 'y'))).toEqual([
      AGENT_PROBLEMS.tokenHash,
      AGENT_PROBLEMS.tokenPrefix,
    ]);
    expect(
      problems(await s.desk.renewAgentToken(PABLO, id, 'tok-bot', HASH_A, 'zz99yy88')),
    ).toEqual([AGENT_PROBLEMS.taken]);
    expect(
      problems(await s.desk.renewAgentToken(PABLO, id, 'hermes-1', HASH_B, 'zz99yy88')),
    ).toEqual([AGENT_PROBLEMS.notToken]);
    expect(
      problems(await s.desk.renewAgentToken(STRANGER, id, 'tok-bot', HASH_B, 'zz99yy88')),
    ).toHaveLength(1);
    expect(
      problems(await s.desk.renewAgentToken(MARIA, id, 'tok-bot', HASH_B, 'zz99yy88'))[0],
    ).toMatch(/manage-roles/);
    expect(problems(await s.desk.renewAgentToken(PABLO, id, 'ghost', HASH_B, 'zz99yy88'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    const pass = await s.desk.agentPass(id, 'tok-bot');
    expect(pass.ok && pass.agent).toMatchObject({ tokenHash: HASH_A });
  });
});

describe('revoking a token', () => {
  it('switches the agent off and leaves it with no token until it is renewed', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, TOKEN);
    const revoked = await s.desk.revokeAgentToken(PABLO, id, 'tok-bot');
    if (!revoked.ok) throw new Error(revoked.problems.join());
    expect(revoked.agents[0]).toMatchObject({ auth: 'token', enabled: false, status: 'apagada' });
    expect(revoked.agents[0]).not.toHaveProperty('tokenPrefix');
    const pass = await s.desk.agentPass(id, 'tok-bot');
    expect(pass.ok && pass.agent).not.toHaveProperty('tokenHash');
    expect(
      s.sqlite.prepare("SELECT detail FROM team_log WHERE act = 'agent-token-revoked'").get(),
    ).toMatchObject({ detail: JSON.stringify({ name: 'Token bot', prefix: 'ab12cd34' }) });
    // A second revoke is nothing to do; a renewal gives it a token again (still off).
    const again = await s.desk.revokeAgentToken(PABLO, id, 'tok-bot');
    expect(again.ok).toBe(true);
    expect(
      s.sqlite
        .prepare("SELECT count(*) AS n FROM team_log WHERE act = 'agent-token-revoked'")
        .get(),
    ).toMatchObject({ n: 1 });
    const renewed = await s.desk.renewAgentToken(PABLO, id, 'tok-bot', HASH_B, 'zz99yy88');
    expect(renewed.ok && renewed.agents[0]).toMatchObject({
      tokenPrefix: 'zz99yy88',
      enabled: false,
    });
  });

  it('refuses a key agent, a member without manage-roles and an unknown agent', async () => {
    const s = scene();
    const { id } = await team(s);
    await s.desk.createAgent(PABLO, id, BOT);
    await s.desk.createAgent(PABLO, id, TOKEN);
    expect(problems(await s.desk.revokeAgentToken(PABLO, id, 'hermes-1'))).toEqual([
      AGENT_PROBLEMS.notToken,
    ]);
    expect(problems(await s.desk.revokeAgentToken(MARIA, id, 'tok-bot'))[0]).toMatch(
      /manage-roles/,
    );
    expect(problems(await s.desk.revokeAgentToken(PABLO, id, 'ghost'))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(problems(await s.desk.revokeAgentToken('x', id, 'tok-bot'))).toHaveLength(1);
  });
});
