/**
 * «Ajustes de la comunidad» and «Qué ha pasado» (cut 8, 2026-10-16): the pure
 * rules, migration 0010 on the D1 shim, and the account desk as numinia.com's
 * binding calls it. One describe per rule or per door.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { DEFAULT_AI_MODEL, DEFAULT_AI_TRIAL_CAP_CENTS } from '../src/lib/ai-brain';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import {
  DEFAULT_VOCABULARY,
  HAPPENINGS_PAGE,
  SETTINGS_PROBLEMS,
  readBefore,
  readChange,
  readOff,
  readVocabulary,
  storedOff,
} from '../src/lib/settings';
import { AccountDesk } from '../src/worker';
import { migratedTill, migrationFiles, sqliteD1 } from './sqlite-d1';

const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ctx = {} as ExecutionContext;

function scene() {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

type Scene = ReturnType<typeof scene>;

async function team(s: Scene): Promise<string> {
  const made = await s.desk.createTeam(PABLO, 'Numen');
  if (!made.ok) throw new Error(made.problems.join());
  const added = await s.desk.setMember(PABLO, made.account.id, MARIA, 'member');
  if (!added.ok) throw new Error(added.problems.join());
  return made.account.id;
}

const settingsOf = (answer: Awaited<ReturnType<AccountDesk['settings']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};

const linesOf = (answer: Awaited<ReturnType<AccountDesk['happenings']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};

const acts = (s: Scene, id: string): string[] =>
  s.sqlite
    .prepare('SELECT act FROM team_log WHERE account_id = ? ORDER BY seq')
    .all(id)
    .map((row) => String(row['act']));

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url).href);
const AI_BRAIN_MIGRATION = '0016_organization_ai_brain.sql';

describe('the rules of the settings', () => {
  it('reads pieces: each once, only the ones that may be turned off, in the order of the panel', () => {
    expect(readOff([])).toEqual([]);
    expect(readOff(['balance', 'venues'])).toEqual(['venues', 'balance']);
    expect(readOff(['balance', 'gente', 'venues'])).toEqual(['venues', 'gente', 'balance']);
    expect(readOff(['agents', 'roles'])).toEqual(['roles', 'agents']);
    for (const value of [
      'venues',
      null,
      ['summary'],
      ['venues', 'venues'],
      ['venues', 'members', 'roles', 'balance', 'venues'],
      [1],
    ]) {
      expect(readOff(value)).toBeUndefined();
    }
  });

  it('reads a preset and a cursor', () => {
    expect(DEFAULT_VOCABULARY).toBe('mixed');
    expect(readVocabulary('simple')).toBe('simple');
    expect(readVocabulary('Simple')).toBeUndefined();
    expect(readVocabulary(3)).toBeUndefined();
    expect(readBefore(undefined)).toBeNull();
    expect(readBefore(null)).toBeNull();
    expect(readBefore(12)).toBe(12);
    for (const value of [0, -1, 1.5, '3', Number.MAX_SAFE_INTEGER + 1]) {
      expect(readBefore(value)).toBeUndefined();
    }
  });

  it('reads a change: only off and vocabulary, at least one, each valid', () => {
    expect(readChange({ off: ['roles'] })).toEqual({ change: { off: ['roles'] } });
    expect(readChange({ vocabulary: 'numinia' })).toEqual({ change: { vocabulary: 'numinia' } });
    expect(readChange({ off: [], vocabulary: 'simple' })).toEqual({
      change: { off: [], vocabulary: 'simple' },
    });
    for (const value of [null, 'x', [], {}, { other: 1 }, { off: [], other: 1 }]) {
      expect(readChange(value)).toEqual({ problems: [SETTINGS_PROBLEMS.change] });
    }
    expect(readChange({ off: ['summary'] })).toEqual({ problems: [SETTINGS_PROBLEMS.off] });
    expect(readChange({ vocabulary: 'x' })).toEqual({ problems: [SETTINGS_PROBLEMS.vocabulary] });
    expect(readChange({ off: 1, vocabulary: 1 })).toEqual({
      problems: [SETTINGS_PROBLEMS.off, SETTINGS_PROBLEMS.vocabulary],
    });
  });

  it('reads what is stored and forgets what is no longer a piece', () => {
    expect(storedOff('["roles","gone","venues"]')).toEqual(['venues', 'roles']);
    expect(storedOff('{}')).toEqual([]);
    expect(storedOff('not json')).toEqual([]);
  });
});

describe('migration 0010', () => {
  it('keeps the log append-only and knows the new act', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.changeSettings(PABLO, id, { vocabulary: 'simple' });
    expect(acts(s, id)).toContain('settings-changed');
    expect(() => s.sqlite.prepare('DELETE FROM team_log').run()).toThrow(/log is kept/);
    expect(() =>
      s.sqlite.prepare("UPDATE organization_settings SET vocabulary = 'other'").run(),
    ).toThrow();
  });
});

describe('settings', () => {
  it('answers today’s behaviour to a member of an organization that never changed anything', async () => {
    const s = scene();
    const id = await team(s);
    expect(settingsOf(await s.desk.settings(MARIA, id))).toEqual({
      ok: true,
      accountId: id,
      off: [],
      vocabulary: 'mixed',
      mayEdit: false,
      aiAgent: {
        enabled: true,
        model: DEFAULT_AI_MODEL,
        trialCapCents: DEFAULT_AI_TRIAL_CAP_CENTS,
      },
    });
    expect(settingsOf(await s.desk.settings(PABLO, id)).mayEdit).toBe(true);
  });

  it('refuses a stranger, a bad argument and an unknown organization', async () => {
    const s = scene();
    const id = await team(s);
    expect(await s.desk.settings(STRANGER, id)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    expect(await s.desk.settings('x', 'y y', 'z')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROBLEMS.accountId, ORG_PROBLEMS.house],
    });
  });

  it('writes the house’s read down, and the house sees any organization', async () => {
    const s = scene();
    const id = await team(s);
    expect(settingsOf(await s.desk.settings(HOUSE, id, true)).mayEdit).toBe(true);
    expect(acts(s, id).at(-1)).toBe('house-read');
  });
});

describe('changeSettings', () => {
  it('turns a piece off and picks the words, each change a line of the log', async () => {
    const s = scene();
    const id = await team(s);
    const first = settingsOf(await s.desk.changeSettings(PABLO, id, { off: ['roles', 'venues'] }));
    expect(first).toMatchObject({ off: ['venues', 'roles'], vocabulary: 'mixed', mayEdit: true });
    const second = settingsOf(await s.desk.changeSettings(PABLO, id, { vocabulary: 'numinia' }));
    expect(second).toMatchObject({ off: ['venues', 'roles'], vocabulary: 'numinia' });
    expect(settingsOf(await s.desk.settings(MARIA, id))).toMatchObject({
      off: ['venues', 'roles'],
      vocabulary: 'numinia',
    });
    const lines = linesOf(await s.desk.happenings(PABLO, id)).lines.filter(
      (line) => line.act === 'settings-changed',
    );
    expect(lines.map((line) => line.detail)).toEqual([
      { vocabulary: 'numinia' },
      { off: 'venues,roles' },
    ]);
  });

  it('writes nothing when nothing changes', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.changeSettings(PABLO, id, { vocabulary: 'simple' });
    const before = acts(s, id).length;
    expect(
      settingsOf(await s.desk.changeSettings(PABLO, id, { vocabulary: 'simple', off: [] })),
    ).toMatchObject({
      vocabulary: 'simple',
    });
    expect(acts(s, id)).toHaveLength(before);
  });

  it('is for whoever may manage the organization, not a member, not a stranger', async () => {
    const s = scene();
    const id = await team(s);
    const member = await s.desk.changeSettings(MARIA, id, { off: ['roles'] });
    expect(member.ok).toBe(false);
    expect(await s.desk.changeSettings(STRANGER, id, { off: ['roles'] })).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    expect(settingsOf(await s.desk.settings(PABLO, id)).off).toEqual([]);
  });

  it('refuses a malformed change, naming what is wrong, and writes nothing', async () => {
    const s = scene();
    const id = await team(s);
    expect(await s.desk.changeSettings(PABLO, id, { off: ['summary'] })).toEqual({
      ok: false,
      problems: [SETTINGS_PROBLEMS.off],
    });
    expect(await s.desk.changeSettings('x', id, { vocabulary: 'q' })).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, SETTINGS_PROBLEMS.vocabulary],
    });
  });

  it('lets the house change them, as the house, with its name in the log', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.changeSettings(HOUSE, id, { off: ['balance'] }, true);
    const last = linesOf(await s.desk.happenings(PABLO, id)).lines[0];
    expect(last).toMatchObject({ act: 'settings-changed', asHouse: true, actor: HOUSE });
  });

  it('says so when the organization changed meanwhile', async () => {
    const s = scene();
    const id = await team(s);
    const racing: typeof s.db = {
      ...s.db,
      batch: async <T = unknown>(statements: D1PreparedStatement[]) => {
        s.sqlite.exec('UPDATE team_profiles SET revision = revision + 1');
        return s.db.batch<T>(statements);
      },
    };
    const raced = new AccountDesk(ctx, { TILL_DB: racing });
    expect(await raced.changeSettings(PABLO, id, { off: ['roles'] })).toEqual({
      ok: false,
      problems: [PROBLEMS.meanwhile],
    });
    expect(settingsOf(await s.desk.settings(PABLO, id)).off).toEqual([]);
    expect(acts(s, id)).not.toContain('settings-changed');
  });
});

describe('happenings', () => {
  it('lists the log newest first, 30 a page, and the page after a line', async () => {
    const s = scene();
    const id = await team(s);
    for (let i = 0; i < HAPPENINGS_PAGE; i += 1) {
      await s.desk.changeSettings(PABLO, id, { vocabulary: i % 2 === 0 ? 'simple' : 'numinia' });
    }
    const first = linesOf(await s.desk.happenings(MARIA, id));
    expect(first.lines).toHaveLength(HAPPENINGS_PAGE);
    expect(first.more).toBe(true);
    const seqs = first.lines.map((line) => line.seq);
    expect([...seqs].sort((a, b) => b - a)).toEqual(seqs);
    const rest = linesOf(await s.desk.happenings(MARIA, id, seqs.at(-1)));
    expect(rest.more).toBe(false);
    expect(rest.lines.length).toBeGreaterThan(0);
    expect(rest.lines.every((line) => line.seq < (seqs.at(-1) ?? 0))).toBe(true);
  });

  it('gives the name an author published and null otherwise', async () => {
    const s = scene();
    const id = await team(s);
    await s.desk.setProfile(PABLO, { name: 'Pablo', avatar: null });
    const lines = linesOf(await s.desk.happenings(MARIA, id)).lines;
    const created = lines.find((line) => line.act === 'organization-created');
    expect(created).toMatchObject({ actor: PABLO, actorName: 'Pablo' });
    const added = lines.find((line) => line.act === 'member-added');
    expect(added?.subject).toBe(MARIA);
    expect(lines.every((line) => line.actorName === 'Pablo')).toBe(true);
    const bare = linesOf(await s.desk.happenings(HOUSE, id, null, true)).lines;
    expect(bare[0]).toMatchObject({ act: 'house-read', asHouse: true, actorName: null });
  });

  it('is for members and the house; the house’s later pages are not logged', async () => {
    const s = scene();
    const id = await team(s);
    expect(await s.desk.happenings(STRANGER, id)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    expect(await s.desk.happenings(MARIA, id, 'x')).toEqual({
      ok: false,
      problems: [SETTINGS_PROBLEMS.before],
    });
    await s.desk.happenings(HOUSE, id, null, true);
    const reads = acts(s, id).filter((act) => act === 'house-read').length;
    await s.desk.happenings(HOUSE, id, 1000, true);
    expect(acts(s, id).filter((act) => act === 'house-read')).toHaveLength(reads);
  });
});

describe('settings: the organization’s built-in AI agent (Historia 1)', () => {
  it('shows the house-wide default to an organization founded by hand, with no stored row', async () => {
    const s = scene();
    const id = await team(s);
    expect(settingsOf(await s.desk.settings(PABLO, id)).aiAgent).toEqual({
      enabled: true,
      model: DEFAULT_AI_MODEL,
      trialCapCents: DEFAULT_AI_TRIAL_CAP_CENTS,
    });
    expect(
      s.sqlite.prepare('SELECT * FROM organization_ai_brain WHERE account_id = ?').all(id),
    ).toEqual([]);
  });
});

describe('migration 0015: the backfill of every organization already open', () => {
  it('gives the same default to an organization open before this migration ran, once', () => {
    const shim = sqliteD1();
    const files = migrationFiles().filter((name) => name !== AI_BRAIN_MIGRATION);
    for (const name of files) {
      shim.sqlite.exec(readFileSync(`${MIGRATIONS_DIR}${name}`, 'utf8'));
    }
    // A community's and a by-hand organization's account, both already open before this
    // migration — exactly what production holds the day it ships — plus a personal account,
    // which is not an organization and must stay untouched.
    shim.sqlite.exec(`
      INSERT INTO accounts (id, kind, created_at) VALUES
        ('acc_t_old1', 'team', '2026-01-01T00:00:00.000Z'),
        ('acc_t_old2', 'team', '2026-02-02T00:00:00.000Z'),
        ('acc_p_old', 'personal', '2026-01-01T00:00:00.000Z')`);
    shim.sqlite.exec(readFileSync(`${MIGRATIONS_DIR}${AI_BRAIN_MIGRATION}`, 'utf8'));
    const rows = shim.sqlite
      .prepare(
        'SELECT account_id, enabled, model, trial_cap_cents FROM organization_ai_brain ORDER BY account_id',
      )
      .all();
    expect(rows).toEqual([
      {
        account_id: 'acc_t_old1',
        enabled: 1,
        model: DEFAULT_AI_MODEL,
        trial_cap_cents: DEFAULT_AI_TRIAL_CAP_CENTS,
      },
      {
        account_id: 'acc_t_old2',
        enabled: 1,
        model: DEFAULT_AI_MODEL,
        trial_cap_cents: DEFAULT_AI_TRIAL_CAP_CENTS,
      },
    ]);
  });
});
