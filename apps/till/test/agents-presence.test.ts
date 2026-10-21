/**
 * «La IA dentro del mundo», story S17 (2026-10-21): how an organization's AI
 * is present in its worlds and which worlds it lives in (migration 0026's
 * `presence_json`, `worlds_mode` and `team_agent_worlds`). The pure readings,
 * the migration over an old database, and the desk's doors: reading it with
 * the agents, changing the presence, choosing the worlds, the pass and
 * `agentWorlds` that respect it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_AGENT_PRESENCE, agentPassIa, parseAgentPassIa } from '@numinia/domain';
import { describe, expect, it } from 'vitest';
import {
  AGENT_PROBLEMS,
  PRESENCE_PROBLEMS,
  hearingOf,
  presenceDiff,
  presenceOfAgent,
  readAgentChange,
  readAgentDraft,
  readAgentPresenceChange,
  readAgentWorlds,
  sortedWorlds,
  worldsText,
} from '../src/lib/agents';
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

/** A community with two worlds placed, and an AI in it (two worlds placed: it lives in «todos»). */
async function withWorlds(draft: Record<string, unknown> = {}) {
  const s = scene();
  const id = await team(s);
  await s.desk.placeWorld(HOUSE, true, ['torre', 'agora-plaza'], id);
  const made = await s.desk.createAgent(PABLO, id, { ...TOKEN, ...draft });
  if (!made.ok) throw new Error(made.problems.join());
  return { s, id };
}

const problems = (answer: {
  readonly ok: boolean;
  readonly problems?: readonly string[];
}): string[] => (answer.ok ? [] : [...(answer.problems as readonly string[])]);

interface AgentRow {
  presence_json: string | null;
  worlds_mode: string;
  hears: number;
}
const rowOf = (s: Scene, agentId = 'claude-ana'): AgentRow =>
  s.sqlite
    .prepare('SELECT presence_json, worlds_mode, hears FROM team_agents WHERE agent_id = ?')
    .get(agentId) as unknown as AgentRow;
const chosenIn = (s: Scene, agentId = 'claude-ana'): string[] =>
  (
    s.sqlite
      .prepare('SELECT world_id FROM team_agent_worlds WHERE agent_id = ? ORDER BY world_id')
      .all(agentId) as { world_id: string }[]
  ).map((row) => row.world_id);
const logOf = (s: Scene) =>
  (
    s.sqlite
      .prepare("SELECT act, subject, detail FROM team_log WHERE act LIKE 'agent-%' ORDER BY seq")
      .all() as { act: string; subject: string; detail: string }[]
  ).map((line) => ({ ...line, detail: JSON.parse(line.detail) as Record<string, string> }));
const agentOf = async (s: Scene, id: string, agentId = 'claude-ana') => {
  const view = await s.desk.agents(PABLO, id);
  if (!view.ok) throw new Error(view.problems.join());
  return view.agents.find((one) => one.id === agentId);
};

describe('reading presence and worlds', () => {
  it('reads a change to the presence, with its problems prefixed', () => {
    expect(readAgentPresenceChange({ burbuja: { radio: 6 } })).toEqual({ burbuja: { radio: 6 } });
    expect((readAgentPresenceChange({ burbuja: { radio: 60 } }) as string[])[0]).toMatch(
      /^presence: burbuja\.radio: /,
    );
    expect(readAgentPresenceChange(undefined)).toEqual([
      `presence: ${PRESENCE_PROBLEMS.presenceNone}`,
    ]);
    expect(readAgentPresenceChange({})).toHaveLength(1);
  });

  it('reads where it lives: all, or one to fifty worlds', () => {
    expect(readAgentWorlds({ todos: true })).toEqual({ todos: true });
    expect(readAgentWorlds({ mundos: ['torre'] })).toEqual({ mundos: ['torre'] });
    expect((readAgentWorlds({ mundos: [] }) as string[])[0]).toMatch(/^worlds: mundos: /);
    expect(readAgentWorlds('torre')).toHaveLength(1);
    expect(sortedWorlds({ mundos: ['torre', 'agora-plaza'] })).toEqual({
      mundos: ['agora-plaza', 'torre'],
    });
    expect(sortedWorlds({ todos: true })).toEqual({ todos: true });
    expect(worldsText({ todos: true })).toBe('todos');
    expect(worldsText({ mundos: ['a', 'b'] })).toBe('a,b');
  });

  it('puts the hearing ladder in step with the hears column', () => {
    expect(hearingOf(true, 'llamada')).toBe('todo');
    expect(hearingOf(false, 'todo')).toBe('llamada');
    expect(hearingOf(false, 'burbuja')).toBe('burbuja');
    expect(presenceOfAgent(null, false)).toEqual(DEFAULT_AGENT_PRESENCE);
    expect(presenceOfAgent(null, true).oye).toBe('todo');
    const stored = JSON.stringify({ ...DEFAULT_AGENT_PRESENCE, oye: 'burbuja' });
    expect(presenceOfAgent(stored, false).oye).toBe('burbuja');
    expect(
      presenceOfAgent(JSON.stringify({ ...DEFAULT_AGENT_PRESENCE, oye: 'todo' }), false).oye,
    ).toBe('llamada');
  });

  it('says what changed, path by path', () => {
    const phrased = {
      ...DEFAULT_AGENT_PRESENCE,
      burbuja: { ...DEFAULT_AGENT_PRESENCE.burbuja, radio: 6 },
      llamada: { ...DEFAULT_AGENT_PRESENCE.llamada, frase: 'ven' },
      quedarse_h: 4 as const,
    };
    expect(presenceDiff(DEFAULT_AGENT_PRESENCE, phrased)).toEqual([
      'burbuja.radio=6',
      'llamada.frase=ven',
      'quedarse_h=4',
    ]);
    expect(presenceDiff(phrased, DEFAULT_AGENT_PRESENCE)).toEqual([
      'burbuja.radio=4',
      'llamada.frase=',
      'quedarse_h=0',
    ]);
    expect(presenceDiff(phrased, phrased)).toEqual([]);
  });

  it('reads presence and worlds in a draft, and refuses a draft that contradicts itself', () => {
    expect(
      readAgentDraft({
        ...TOKEN,
        presence: { burbuja: { forma: 'caja' }, oye: 'burbuja' },
        worlds: { mundos: ['torre'] },
      }),
    ).toMatchObject({
      hears: false,
      presence: { burbuja: { forma: 'caja', radio: 4 }, oye: 'burbuja' },
      worlds: { mundos: ['torre'] },
    });
    expect(readAgentDraft({ ...TOKEN, presence: { oye: 'todo' } })).toMatchObject({
      hears: true,
      presence: { oye: 'todo' },
    });
    expect(readAgentDraft({ ...TOKEN, hears: true })).toMatchObject({
      hears: true,
      presence: { oye: 'todo' },
    });
    expect(readAgentDraft(TOKEN)).not.toHaveProperty('worlds');
    expect(readAgentDraft({ ...TOKEN, hears: false, presence: { oye: 'todo' } })).toEqual([
      PRESENCE_PROBLEMS.hearsConflict,
    ]);
    expect(readAgentDraft({ ...TOKEN, presence: { quedarse_h: 3 } })).toHaveLength(1);
    expect(readAgentDraft({ ...TOKEN, worlds: { mundos: [] } })).toHaveLength(1);
    // A change to an AI still takes only what it always took.
    expect(Array.isArray(readAgentChange({ presence: {} }))).toBe(true);
  });
});

describe('migration 0026', () => {
  it('adds presence and worlds without a rebuild: old AIs live in «todos» with the defaults', async () => {
    const shim = sqliteD1();
    const names = migrationFiles();
    const at = names.indexOf('0026_agent_presence.sql');
    expect(at).toBe(names.length - 1);
    for (const name of names.slice(0, at)) {
      shim.sqlite.exec(readFileSync(join(MIGRATIONS, name), 'utf8'));
    }
    const desk = new AccountDesk(ctx, { TILL_DB: shim.db });
    const made = await desk.createTeam(PABLO, 'Numen');
    if (!made.ok) throw new Error(made.problems.join());
    // The desk already knows the new columns: an old AI is written by hand, in the old shape.
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
    expect(shim.sqlite.prepare('SELECT presence_json, worlds_mode FROM team_agents').get()).toEqual(
      {
        presence_json: null,
        worlds_mode: 'todos',
      },
    );
    expect(
      shim.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'team_log'").get(),
    ).toEqual(logBefore);
    // The old AI is read as it always was: every world, the house's robot.
    await desk.placeWorld(HOUSE, true, ['torre'], made.account.id);
    expect(await desk.agentWorlds(made.account.id, 'old')).toMatchObject({
      ok: true,
      worldIds: ['torre'],
      worlds: { todos: true },
      presence: DEFAULT_AGENT_PRESENCE,
    });
  });

  it('keeps the database honest: modes, JSON, ids, and the AI’s own organization', async () => {
    const { s, id } = await withWorlds();
    const run = (sql: string) => () => s.sqlite.prepare(sql).run();
    expect(run("UPDATE team_agents SET worlds_mode = 'algunos'")).toThrow();
    expect(run("UPDATE team_agents SET presence_json = 'not json'")).toThrow();
    expect(run("UPDATE team_agents SET presence_json = '[]'")).toThrow();
    expect(run("UPDATE team_agents SET presence_json = '{}'")).not.toThrow();
    const insert = (world: string) =>
      s.sqlite
        .prepare('INSERT INTO team_agent_worlds (account_id, agent_id, world_id) VALUES (?, ?, ?)')
        .run(id, 'claude-ana', world);
    expect(() => insert('Torre')).toThrow();
    expect(() => insert('-torre')).toThrow();
    expect(() => insert('la--torre')).toThrow();
    expect(() => insert('bosque')).toThrow(/only in the worlds of its own organization/);
    expect(() => insert('torre')).not.toThrow();
    expect(() => insert('torre')).toThrow();
  });

  it('goes with the AI when it is removed, and with the world when the house moves it', async () => {
    const { s, id } = await withWorlds();
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { mundos: ['torre', 'agora-plaza'] });
    expect(chosenIn(s)).toEqual(['agora-plaza', 'torre']);
    const other = await team(s, MARIA, 'Reset');
    await s.desk.placeWorld(HOUSE, true, ['torre'], other);
    expect(chosenIn(s)).toEqual(['agora-plaza']);
    await s.desk.removeAgent(PABLO, id, 'claude-ana');
    expect(chosenIn(s)).toEqual([]);
  });
});

describe('where a new AI lives', () => {
  it('is every world when the community has none or several, as before', async () => {
    const { s, id } = await withWorlds();
    expect(await agentOf(s, id)).toMatchObject({
      worlds: { todos: true },
      presence: DEFAULT_AGENT_PRESENCE,
    });
    expect(rowOf(s)).toEqual({ presence_json: null, worlds_mode: 'todos', hears: 0 });
    const s2 = scene();
    const id2 = await team(s2);
    await s2.desk.createAgent(PABLO, id2, TOKEN);
    expect(await agentOf(s2, id2)).toMatchObject({ worlds: { todos: true } });
    expect(logOf(s2)[0]?.detail).toEqual({ name: 'Claude de Ana', via: 'panel' });
  });

  it('is the one world of a community that has just one (design §5)', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.placeWorld(HOUSE, true, ['torre'], id);
    await s.desk.createAgent(PABLO, id, TOKEN);
    expect(await agentOf(s, id)).toMatchObject({ worlds: { mundos: ['torre'] } });
    expect(rowOf(s).worlds_mode).toBe('elegidos');
    expect(chosenIn(s)).toEqual(['torre']);
    expect(logOf(s)[0]?.detail).toMatchObject({ worlds: 'torre' });
    // A second world placed later is not where it lives.
    await s.desk.placeWorld(HOUSE, true, ['agora-plaza'], id);
    expect(await s.desk.agentWorlds(id, 'claude-ana')).toMatchObject({
      worldIds: ['torre'],
      worlds: { mundos: ['torre'] },
    });
  });

  it('is what the draft says: chosen worlds, or all, with a presence of its own', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.placeWorld(HOUSE, true, ['torre', 'agora-plaza', 'bosque'], id);
    const made = await s.desk.createAgent(PABLO, id, {
      ...TOKEN,
      worlds: { mundos: ['torre', 'bosque'] },
      presence: { cuerpo: { modelo: 2 }, burbuja: { forma: 'cupula', radio: 8 }, quedarse_h: 4 },
    });
    expect(made.ok && made.agents[0]).toMatchObject({
      worlds: { mundos: ['bosque', 'torre'] },
      presence: {
        cuerpo: { tipo: 'casa', modelo: 2 },
        burbuja: { forma: 'cupula', radio: 8 },
        quedarse_h: 4,
      },
    });
    expect(JSON.parse(rowOf(s).presence_json as string)).toMatchObject({
      cuerpo: { modelo: 2 },
      quedarse_h: 4,
    });
    expect(logOf(s)[0]?.detail).toEqual({
      name: 'Claude de Ana',
      via: 'panel',
      presence: 'cuerpo.modelo=2;burbuja.forma=cupula;burbuja.radio=8;quedarse_h=4',
      worlds: 'bosque,torre',
    });
    const all = await s.desk.createAgent(PABLO, id, {
      ...TOKEN,
      id: 'todas',
      tokenHash: HASH_B,
      worlds: { todos: true },
    });
    expect(all.ok && all.agents.find((one) => one.id === 'todas')).toMatchObject({
      worlds: { todos: true },
    });
    expect(rowOf(s, 'todas').worlds_mode).toBe('todos');
  });

  it('is never a world the community does not have: nothing is written', async () => {
    const s = scene();
    const id = await team(s);
    const other = await team(s, MARIA, 'Reset');
    await s.desk.placeWorld(HOUSE, true, ['torre'], id);
    await s.desk.placeWorld(HOUSE, true, ['bosque'], other);
    for (const worlds of [{ mundos: ['bosque'] }, { mundos: ['nada'] }]) {
      expect(problems(await s.desk.createAgent(PABLO, id, { ...TOKEN, worlds }))).toEqual([
        PRESENCE_PROBLEMS.worldsNotHere,
      ]);
    }
    const bad = await s.desk.createAgent(PABLO, id, { ...TOKEN, worlds: { todos: false } });
    expect(problems(bad)).toHaveLength(1);
    expect(await agentOf(s, id)).toBeUndefined();
    expect(logOf(s)).toEqual([]);
  });

  it('hears everything when the draft says so, in both places', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.createAgent(PABLO, id, { ...TOKEN, presence: { oye: 'todo' } });
    expect(rowOf(s)).toMatchObject({ hears: 1 });
    expect(JSON.parse(rowOf(s).presence_json as string).oye).toBe('todo');
    expect(await agentOf(s, id)).toMatchObject({ hears: true, presence: { oye: 'todo' } });
  });
});

describe('changing the presence', () => {
  it('moves what the change names, stores it, and writes one line in the log', async () => {
    const { s, id } = await withWorlds();
    const changed = await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', {
      burbuja: { radio: 6, visible: 'siempre' },
      llamada: { frase: '  agente, responde ', solo_dentro: false },
    });
    expect(changed.ok && changed.agents[0]).toMatchObject({
      presence: {
        cuerpo: { tipo: 'casa', modelo: 0 },
        burbuja: { forma: 'esfera', radio: 6, visible: 'siempre' },
        llamada: {
          nombre: true,
          barra: true,
          boton: true,
          solo_dentro: false,
          frase: 'agente, responde',
        },
        oye: 'llamada',
        quedarse_h: 0,
      },
    });
    expect(JSON.parse(rowOf(s).presence_json as string).burbuja).toEqual({
      forma: 'esfera',
      radio: 6,
      visible: 'siempre',
    });
    expect(logOf(s).at(-1)).toEqual({
      act: 'agent-state',
      subject: 'claude-ana',
      detail: {
        name: 'Claude de Ana',
        presence:
          'burbuja.radio=6;burbuja.visible=siempre;llamada.solo_dentro=false;llamada.frase=agente, responde',
      },
    });
    // The phrase goes with null; going back to the defaults stores nothing.
    await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', {
      llamada: { frase: null, solo_dentro: true },
    });
    await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', {
      burbuja: { radio: 4, visible: 'al-acercarte' },
    });
    expect(rowOf(s).presence_json).toBeNull();
    expect(await agentOf(s, id)).toMatchObject({ presence: DEFAULT_AGENT_PRESENCE });
  });

  it('writes nothing when nothing changes', async () => {
    const { s, id } = await withWorlds();
    const before = s.sqlite.prepare('SELECT count(*) AS n FROM team_log').get();
    const same = await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', {
      burbuja: { radio: 4 },
    });
    expect(same.ok && same.agents[0]).toMatchObject({ presence: DEFAULT_AGENT_PRESENCE });
    expect(s.sqlite.prepare('SELECT count(*) AS n FROM team_log').get()).toEqual(before);
  });

  it('keeps the last rung of «what it hears» and the hears column together, both ways', async () => {
    const { s, id } = await withWorlds();
    await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', { oye: 'burbuja' });
    expect(rowOf(s).hears).toBe(0);
    expect(await agentOf(s, id)).toMatchObject({ hears: false, presence: { oye: 'burbuja' } });
    await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', { oye: 'todo' });
    expect(rowOf(s).hears).toBe(1);
    expect(await agentOf(s, id)).toMatchObject({ hears: true, presence: { oye: 'todo' } });
    expect(logOf(s).filter((line) => line.detail['hears'] !== undefined)).toEqual([
      { act: 'agent-state', subject: 'claude-ana', detail: { name: 'Claude de Ana', hears: 'on' } },
    ]);
    // The old switch moves the ladder: off drops «todo» to the first rung; on puts it back.
    await s.desk.changeAgent(PABLO, id, 'claude-ana', { hears: false });
    expect(await agentOf(s, id)).toMatchObject({ hears: false, presence: { oye: 'llamada' } });
    await s.desk.changeAgent(PABLO, id, 'claude-ana', { hears: true });
    expect(await agentOf(s, id)).toMatchObject({ hears: true, presence: { oye: 'todo' } });
    expect(JSON.parse(rowOf(s).presence_json as string).oye).toBe('todo');
    await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', { oye: 'llamada' });
    expect(rowOf(s)).toEqual({ presence_json: null, worlds_mode: 'todos', hears: 0 });
  });

  it('is refused to a stranger and for a change out of shape; nothing is written', async () => {
    const { s, id } = await withWorlds();
    const stranger = await s.desk.changeAgentPresence(MARIA, id, 'claude-ana', { oye: 'todo' });
    expect(problems(stranger).length).toBeGreaterThan(0);
    for (const change of [{}, { burbuja: { radio: 99 } }, { color: 'rojo' }, 'x', null]) {
      const refused = await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', change);
      expect(problems(refused).length).toBeGreaterThan(0);
    }
    expect(problems(await s.desk.changeAgentPresence(PABLO, id, 'nadie', { oye: 'todo' }))).toEqual(
      [AGENT_PROBLEMS.noSuchAgent],
    );
    expect(rowOf(s)).toEqual({ presence_json: null, worlds_mode: 'todos', hears: 0 });
    expect(logOf(s).filter((line) => line.act === 'agent-state')).toEqual([]);
  });

  it('feeds the pass: the block the engine accepts, built from the stored presence', async () => {
    const { s, id } = await withWorlds();
    await s.desk.changeAgentPresence(PABLO, id, 'claude-ana', {
      cuerpo: { modelo: 1 },
      llamada: { frase: 'ven' },
      quedarse_h: 24,
      oye: 'burbuja',
    });
    const pass = await s.desk.agentPass(id, 'claude-ana');
    if (!pass.ok) throw new Error(pass.problems.join());
    expect(pass.agent.presence.oye).toBe('burbuja');
    const ia = agentPassIa(pass.agent.presence, { comunidad: 'Numen', nombre: 'Ana' });
    expect(parseAgentPassIa(ia)).toEqual({ ok: true, value: ia });
    expect(ia).toMatchObject({
      cuerpo: { modelo: 1 },
      llamada: { frase: 'ven' },
      quedarse_h: 24,
      responde: { comunidad: 'Numen', nombre: 'Ana' },
    });
  });
});

describe('choosing the worlds', () => {
  it('sets one world, several, or all; logged; rows and mode agree', async () => {
    const { s, id } = await withWorlds();
    const one = await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { mundos: ['torre'] });
    expect(one.ok && one.agents[0]).toMatchObject({ worlds: { mundos: ['torre'] } });
    expect(rowOf(s).worlds_mode).toBe('elegidos');
    expect(chosenIn(s)).toEqual(['torre']);
    const two = await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', {
      mundos: ['torre', 'agora-plaza'],
    });
    expect(two.ok && two.agents[0]).toMatchObject({ worlds: { mundos: ['agora-plaza', 'torre'] } });
    expect(chosenIn(s)).toEqual(['agora-plaza', 'torre']);
    const all = await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { todos: true });
    expect(all.ok && all.agents[0]).toMatchObject({ worlds: { todos: true } });
    expect(rowOf(s).worlds_mode).toBe('todos');
    expect(chosenIn(s)).toEqual([]);
    expect(logOf(s).map((line) => line.detail)).toEqual([
      { name: 'Claude de Ana', via: 'panel' },
      { name: 'Claude de Ana', prefix: 'ab12cd34', via: 'panel' },
      { name: 'Claude de Ana', worlds: 'torre' },
      { name: 'Claude de Ana', worlds: 'agora-plaza,torre' },
      { name: 'Claude de Ana', worlds: 'todos' },
    ]);
  });

  it('writes nothing when it already lives there, however the worlds are ordered', async () => {
    const { s, id } = await withWorlds();
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { mundos: ['torre', 'agora-plaza'] });
    const lines = logOf(s).length;
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { mundos: ['agora-plaza', 'torre'] });
    expect(logOf(s)).toHaveLength(lines);
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { todos: true });
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { todos: true });
    expect(logOf(s)).toHaveLength(lines + 1);
  });

  it('refuses a world of another community, one nobody placed, a stranger and a shape it does not know', async () => {
    const { s, id } = await withWorlds();
    const other = await team(s, MARIA, 'Reset');
    await s.desk.placeWorld(HOUSE, true, ['bosque'], other);
    for (const worlds of [{ mundos: ['bosque'] }, { mundos: ['torre', 'nada'] }]) {
      expect(problems(await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', worlds))).toEqual([
        PRESENCE_PROBLEMS.worldsNotHere,
      ]);
    }
    for (const worlds of [
      { mundos: [] },
      { todos: false },
      {},
      'torre',
      { mundos: ['torre', 'torre'] },
    ]) {
      const refused = await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', worlds);
      expect(problems(refused).length).toBeGreaterThan(0);
    }
    const stranger = await s.desk.setAgentWorlds(MARIA, id, 'claude-ana', { mundos: ['torre'] });
    expect(problems(stranger).length).toBeGreaterThan(0);
    expect(problems(await s.desk.setAgentWorlds(PABLO, id, 'nadie', { todos: true }))).toEqual([
      AGENT_PROBLEMS.noSuchAgent,
    ]);
    expect(rowOf(s).worlds_mode).toBe('todos');
    expect(chosenIn(s)).toEqual([]);
  });
});

describe('the worlds an AI lives in, as the store asks for them', () => {
  it('answers the chosen ones only, in one query, and all for an AI that lives in «todos»', async () => {
    const { s, id } = await withWorlds();
    await s.desk.createAgent(PABLO, id, { ...TOKEN, id: 'otra', tokenHash: HASH_B });
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { mundos: ['torre'] });
    const prepare = s.db.prepare.bind(s.db);
    let statements = 0;
    s.db.prepare = (query: string) => {
      statements += 1;
      return prepare(query);
    };
    expect(await s.desk.agentWorlds(id, 'claude-ana')).toEqual({
      ok: true,
      accountId: id,
      agentId: 'claude-ana',
      worldIds: ['torre'],
      worlds: { mundos: ['torre'] },
      presence: DEFAULT_AGENT_PRESENCE,
    });
    expect(statements).toBe(1);
    expect(await s.desk.agentWorlds(id, 'otra')).toMatchObject({
      worldIds: ['agora-plaza', 'torre'],
      worlds: { todos: true },
    });
  });

  it('answers none when the chosen worlds left the community, and the pass says where it lives', async () => {
    const { s, id } = await withWorlds();
    await s.desk.setAgentWorlds(PABLO, id, 'claude-ana', { mundos: ['torre'] });
    const pass = await s.desk.agentPass(id, 'claude-ana');
    expect(pass.ok && pass.agent.worlds).toEqual({ mundos: ['torre'] });
    const other = await team(s, MARIA, 'Reset');
    await s.desk.placeWorld(HOUSE, true, ['torre'], other);
    expect(await s.desk.agentWorlds(id, 'claude-ana')).toMatchObject({
      ok: true,
      worldIds: [],
      worlds: { mundos: [] },
    });
    expect((await agentOf(s, id))?.worlds).toEqual({ mundos: [] });
    // A row that outlives a sweep (a world moved without the desk) is never read.
    s.sqlite.exec('DROP TRIGGER team_agent_worlds_of_its_organization');
    s.sqlite
      .prepare('INSERT INTO team_agent_worlds (account_id, agent_id, world_id) VALUES (?, ?, ?)')
      .run(id, 'claude-ana', 'torre');
    expect(await s.desk.agentWorlds(id, 'claude-ana')).toMatchObject({ worldIds: [] });
    expect((await agentOf(s, id))?.worlds).toEqual({ mundos: [] });
  });
});
