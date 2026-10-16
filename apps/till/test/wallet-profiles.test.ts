/**
 * «Tu nombre y tu cara» (cut of 2026-10-16): a name and one of the Bazar's
 * avatars a person may publish, seen only by the people who share an
 * organization with them and by the house where it enters (numinia-archive
 * STD-053: «Nobody is shown before choosing», «Only fellow members see who it
 * is»). The pure rules, migration 0006 on the D1 shim, and the account desk
 * as numinia.com's binding calls it. One describe per rule or per door.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import type { RolesAnswer, RolesView } from '../src/db/roles';
import {
  AVATAR_ID_MAX,
  PROFILE_NAME_MAX,
  PROFILE_PROBLEMS,
  readAvatarId,
  readProfileChange,
  readProfileName,
} from '../src/lib/profiles';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

const NOW = new Date('2026-10-16T09:30:00.000Z');
const wallet = (pair: string): string => `0x${pair.repeat(20)}`;
const PABLO = wallet('ab');
const MARIA = wallet('cd');
const ANA = wallet('56');
const STRANGER = wallet('ef');
const HOUSE = wallet('99');
const ARLA = 'avatar-arla-mncdhz3l';
const LYRA = 'ndg-019d3e6c-129a-701e-95fc-ce1754d5c917';
const ctx = {} as ExecutionContext;

type Shim = ReturnType<typeof migratedTill>;

function scene(): Shim & { readonly desk: AccountDesk } {
  const shim = migratedTill();
  return { ...shim, desk: new AccountDesk(ctx, { TILL_DB: shim.db }) };
}

const viewOf = (answer: RolesAnswer): RolesView => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer;
};

/** Every code point a name may never hold: C0, DEL, C1, and the direction overrides and isolates. */
const FORBIDDEN = [
  ...Array.from({ length: 32 }, (_, index) => index),
  0x7f,
  ...Array.from({ length: 32 }, (_, index) => 0x80 + index),
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
];

/** Pablo's organization, with María and Ana in it. */
async function organization(desk: AccountDesk): Promise<string> {
  const created = await desk.createTeam(PABLO, 'Estudio Lucía');
  if (!created.ok) throw new Error(created.problems.join());
  for (const [who, role] of [
    [MARIA, 'admin'],
    [ANA, 'member'],
  ] as const) {
    const added = await desk.setMember(PABLO, created.account.id, who, role);
    if (!added.ok) throw new Error(added.problems.join());
  }
  return created.account.id;
}

const memberOf = (view: RolesView, who: string) => {
  const member = view.members.find((candidate) => candidate.wallet === who);
  if (member === undefined) throw new Error(`no member ${who}`);
  return member;
};

function profileRows(sqlite: Shim['sqlite']): Record<string, unknown>[] {
  return sqlite
    .prepare('SELECT wallet, name, avatar, updated_at FROM wallet_profiles ORDER BY wallet')
    .all()
    .map((row) => ({ ...row }));
}

/** Every row of every table, as text: what «no history is kept» is checked against. */
function everything(sqlite: Shim['sqlite']): string {
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => String((row as { name: string }).name));
  return JSON.stringify(tables.map((table) => sqlite.prepare(`SELECT * FROM "${table}"`).all()));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the rules of a name and an avatar', () => {
  it('trims a name and counts its characters as people count them: 1 to 60', () => {
    expect(PROFILE_NAME_MAX).toBe(60);
    expect(readProfileName('  Rima  ')).toBe('Rima');
    expect(readProfileName('Ana María Ferrán')).toBe('Ana María Ferrán');
    expect(readProfileName('a'.repeat(60))).toBe('a'.repeat(60));
    expect(readProfileName('a'.repeat(61))).toBeUndefined();
    // An emoji is one character to a person, two to JavaScript's length.
    expect(readProfileName('🙂'.repeat(60))).toBe('🙂'.repeat(60));
    expect(readProfileName('🙂'.repeat(61))).toBeUndefined();
    expect(readProfileName('')).toBeUndefined();
    expect(readProfileName('   ')).toBeUndefined();
    expect(readProfileName('\u3000')).toBeUndefined();
    for (const value of [undefined, null, 1, true, {}, ['Rima']]) {
      expect(readProfileName(value)).toBeUndefined();
    }
  });

  it('refuses a control character or a direction override anywhere in a name', () => {
    for (const point of FORBIDDEN) {
      const sneaky = `Ri${String.fromCodePoint(point)}ma`;
      expect(readProfileName(sneaky), `U+${point.toString(16)}`).toBeUndefined();
    }
    // A line break at either end is only space: it is trimmed away.
    expect(readProfileName('Rima\n')).toBe('Rima');
  });

  it('wants at least one character that shows', () => {
    expect(readProfileName('\u200b')).toBeUndefined();
    expect(readProfileName('\u200b\u200c\u2060')).toBeUndefined();
    expect(readProfileName('R\u200bima')).toBe('R\u200bima');
    expect(readProfileName('🙂')).toBe('🙂');
    expect(readProfileName('·')).toBe('·');
    expect(readProfileName('7')).toBe('7');
  });

  it('takes an avatar as the id of a good of the Bazar, or none', () => {
    expect(AVATAR_ID_MAX).toBe(64);
    expect(readAvatarId(null)).toBeNull();
    expect(readAvatarId(ARLA)).toBe(ARLA);
    expect(readAvatarId(LYRA)).toBe(LYRA);
    expect(readAvatarId('starter-avatar-01')).toBe('starter-avatar-01');
    expect(readAvatarId('a'.repeat(64))).toBe('a'.repeat(64));
    for (const value of [
      'a'.repeat(65),
      'Avatar-Arla',
      'avatar_arla',
      '-arla',
      '',
      '../thumbs/x',
      'https://example.org/me.png',
      'data:image/png;base64,AAAA',
      'arla mncdhz3l',
      undefined,
      1,
      {},
    ]) {
      expect(readAvatarId(value), String(value)).toBeUndefined();
    }
  });

  it('reads a change: a name and an avatar to publish, or null to stop showing them', () => {
    expect(readProfileChange(null)).toBeNull();
    expect(readProfileChange({ name: ' Rima ', avatar: null })).toEqual({
      name: 'Rima',
      avatar: null,
    });
    expect(readProfileChange({ name: 'Rima', avatar: ARLA })).toEqual({
      name: 'Rima',
      avatar: ARLA,
    });
    for (const value of [
      undefined,
      'Rima',
      [],
      ['Rima', ARLA],
      { name: 'Rima' },
      { avatar: ARLA },
      { name: 'Rima', avatar: undefined },
      { name: 'Rima', avatar: null, wallet: MARIA },
    ]) {
      expect(readProfileChange(value), JSON.stringify(value)).toEqual([PROFILE_PROBLEMS.change]);
    }
    expect(readProfileChange({ name: '', avatar: 'Bad Id' })).toEqual([
      PROFILE_PROBLEMS.name,
      PROFILE_PROBLEMS.avatar,
    ]);
    expect(readProfileChange({ name: 'Rima', avatar: new Date(0) })).toEqual([
      PROFILE_PROBLEMS.avatar,
    ]);
    expect(readProfileChange({ name: 'Ri\u202ema', avatar: ARLA })).toEqual([
      PROFILE_PROBLEMS.name,
    ]);
  });

  it('words its refusals plainly', () => {
    expect(PROFILE_PROBLEMS).toEqual({
      change: 'change must be an object with name and avatar, or null to stop showing them',
      name: 'name must be 1 to 60 characters, at least one of them visible, none of them a control character or a direction override',
      avatar: 'avatar must be the id of an avatar of the Bazar, or null',
    });
  });
});

describe('migration 0006: one row per wallet that chose to publish', () => {
  it('is a STRICT table of a wallet, a name, an avatar or none, and when', () => {
    const { sqlite } = migratedTill();
    expect(
      sqlite
        .prepare("SELECT strict FROM pragma_table_list WHERE name = 'wallet_profiles'")
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([{ strict: 1 }]);
    expect(
      sqlite
        .prepare(
          `SELECT name, type, "notnull", pk FROM pragma_table_info('wallet_profiles') ORDER BY cid`,
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      { name: 'wallet', type: 'TEXT', notnull: 1, pk: 1 },
      { name: 'name', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'avatar', type: 'TEXT', notnull: 0, pk: 0 },
      { name: 'updated_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
  });

  it('refuses at the database what the desk refuses first', () => {
    const { sqlite } = migratedTill();
    const insert = (row: {
      wallet?: string;
      name?: string;
      avatar?: string | null;
      updatedAt?: string;
    }): void => {
      sqlite
        .prepare(
          'INSERT INTO wallet_profiles (wallet, name, avatar, updated_at) VALUES (?, ?, ?, ?)',
        )
        .run(
          row.wallet ?? PABLO,
          row.name ?? 'Rima',
          row.avatar === undefined ? null : row.avatar,
          row.updatedAt ?? NOW.toISOString(),
        );
      sqlite.prepare('DELETE FROM wallet_profiles').run();
    };
    insert({});
    insert({ name: 'a'.repeat(60), avatar: 'a'.repeat(64) });
    insert({ name: 'Ana María 🙂', avatar: LYRA });
    const refused = [
      { wallet: PABLO.toUpperCase().replace('0X', '0x') },
      { wallet: PABLO.slice(0, 41) },
      { wallet: `1x${'ab'.repeat(20)}` },
      { name: '' },
      { name: ' Rima' },
      { name: 'Rima ' },
      { name: 'a'.repeat(61) },
      { avatar: '' },
      { avatar: 'Avatar' },
      { avatar: '-arla' },
      { avatar: 'arla_x' },
      { avatar: 'a'.repeat(65) },
      { updatedAt: '2026-10-16' },
      { updatedAt: 'now' },
      ...FORBIDDEN.map((point) => ({ name: `Ri${String.fromCodePoint(point)}ma` })),
    ];
    for (const row of refused) {
      // A CHECK refuses; `'now'` is refused before it, as non-deterministic.
      expect(() => insert(row), JSON.stringify(row)).toThrow(
        /CHECK constraint failed|non-deterministic use of strftime/,
      );
    }
    expect(profileRows(sqlite)).toEqual([]);
  });

  it('is not append-only: an update replaces the row and a delete removes it', () => {
    const { sqlite } = migratedTill();
    sqlite
      .prepare('INSERT INTO wallet_profiles (wallet, name, avatar, updated_at) VALUES (?, ?, ?, ?)')
      .run(PABLO, 'Rima', ARLA, NOW.toISOString());
    sqlite
      .prepare('UPDATE wallet_profiles SET name = ?, avatar = NULL WHERE wallet = ?')
      .run('Rima Ferrán', PABLO);
    expect(profileRows(sqlite)).toEqual([
      { wallet: PABLO, name: 'Rima Ferrán', avatar: null, updated_at: NOW.toISOString() },
    ]);
    sqlite.prepare('DELETE FROM wallet_profiles WHERE wallet = ?').run(PABLO);
    expect(profileRows(sqlite)).toEqual([]);
  });
});

describe('the account desk: one’s own name and avatar', () => {
  it('shows nobody before they choose: nothing is kept until a name is saved', async () => {
    const { desk, sqlite } = scene();
    expect(await desk.profile(PABLO)).toEqual({ ok: true, profile: null });
    await organization(desk);
    await desk.overview(MARIA);
    expect(await desk.profile(MARIA)).toEqual({ ok: true, profile: null });
    expect(profileRows(sqlite)).toEqual([]);
  });

  it('publishes, replaces and removes — the row goes, and no history is kept anywhere', async () => {
    const { desk, sqlite } = scene();
    await organization(desk);
    const published = { name: 'Rima', avatar: ARLA, updatedAt: NOW.toISOString() };
    expect(await desk.setProfile(PABLO, { name: '  Rima ', avatar: ARLA })).toEqual({
      ok: true,
      profile: published,
    });
    expect(await desk.profile(PABLO)).toEqual({ ok: true, profile: published });

    const later = new Date('2026-10-16T10:00:00.000Z');
    vi.setSystemTime(later);
    const replaced = { name: 'Rima Ferrán', avatar: null, updatedAt: later.toISOString() };
    expect(await desk.setProfile(PABLO, { name: 'Rima Ferrán', avatar: null })).toEqual({
      ok: true,
      profile: replaced,
    });
    expect(profileRows(sqlite)).toEqual([
      { wallet: PABLO, name: 'Rima Ferrán', avatar: null, updated_at: later.toISOString() },
    ]);
    expect(everything(sqlite)).not.toContain('"Rima"');

    expect(await desk.setProfile(PABLO, null)).toEqual({ ok: true, profile: null });
    expect(await desk.profile(PABLO)).toEqual({ ok: true, profile: null });
    expect(profileRows(sqlite)).toEqual([]);
    expect(everything(sqlite)).not.toContain('Rima');
    // Removing what is not there is no error: nothing is shown either way.
    expect(await desk.setProfile(PABLO, null)).toEqual({ ok: true, profile: null });
  });

  it('refuses a wallet that is not the session’s shape, or a change out of shape, and writes nothing', async () => {
    const { desk, sqlite } = scene();
    const badWallet = { ok: false, problems: [PROBLEMS.wallet] };
    expect(await desk.profile(PABLO.toUpperCase())).toEqual(badWallet);
    expect(await desk.profile(undefined)).toEqual(badWallet);
    expect(await desk.setProfile(PABLO.toUpperCase(), { name: 'Rima', avatar: null })).toEqual(
      badWallet,
    );
    expect(await desk.setProfile(1, 'Rima')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, PROFILE_PROBLEMS.change],
    });
    expect(await desk.setProfile(PABLO, { name: ' ', avatar: 'Not An Id' })).toEqual({
      ok: false,
      problems: [PROFILE_PROBLEMS.name, PROFILE_PROBLEMS.avatar],
    });
    expect(await desk.setProfile(PABLO, undefined)).toEqual({
      ok: false,
      problems: [PROFILE_PROBLEMS.change],
    });
    expect(profileRows(sqlite)).toEqual([]);
  });

  it('touches only the wallet that asks', async () => {
    const { desk, sqlite } = scene();
    await desk.setProfile(PABLO, { name: 'Rima', avatar: ARLA });
    await desk.setProfile(MARIA, { name: 'María', avatar: null });
    expect(await desk.setProfile(MARIA, null)).toEqual({ ok: true, profile: null });
    expect(await desk.profile(MARIA)).toEqual({ ok: true, profile: null });
    expect(await desk.profile(PABLO)).toEqual({
      ok: true,
      profile: { name: 'Rima', avatar: ARLA, updatedAt: NOW.toISOString() },
    });
    expect(profileRows(sqlite).map((row) => row['wallet'])).toEqual([PABLO]);
  });
});

describe('the roles view: only fellow members see who it is', () => {
  it('shows a member what fellow members published, and nothing for whoever published nothing', async () => {
    const { desk } = scene();
    const id = await organization(desk);
    await desk.setProfile(MARIA, { name: 'María', avatar: LYRA });
    await desk.setProfile(ANA, { name: 'Ana', avatar: null });
    for (const asker of [PABLO, MARIA, ANA]) {
      const view = viewOf(await desk.roles(asker, id));
      expect(memberOf(view, MARIA)).toMatchObject({ name: 'María', avatar: LYRA });
      expect(memberOf(view, ANA)).toMatchObject({ name: 'Ana', avatar: null });
      // Absent, not null: the member published nothing.
      expect(memberOf(view, PABLO)).not.toHaveProperty('name');
      expect(memberOf(view, PABLO)).not.toHaveProperty('avatar');
      expect(Object.keys(memberOf(view, MARIA)).sort()).toEqual([
        'addedAt',
        'assignable',
        'avatar',
        'name',
        'owner',
        'roleIds',
        'wallet',
      ]);
    }
  });

  it('tells a stranger no name, and the head count stays a number', async () => {
    const { desk } = scene();
    const id = await organization(desk);
    await desk.setProfile(MARIA, { name: 'María', avatar: LYRA });
    const refused = await desk.roles(STRANGER, id);
    expect(refused).toEqual({ ok: false, problems: [PROBLEMS.notMember] });
    expect(await desk.headcount(id)).toEqual({ ok: true, accountId: id, members: 3 });
    // A name published for one organization does not open another's door.
    await desk.setProfile(STRANGER, { name: 'Intrusa', avatar: ARLA });
    expect(await desk.roles(STRANGER, id)).toEqual({
      ok: false,
      problems: [PROBLEMS.notMember],
    });
    expect(JSON.stringify(viewOf(await desk.roles(PABLO, id)))).not.toContain('Intrusa');
  });

  it('shows the house the names where it enters', async () => {
    const { desk } = scene();
    const id = await organization(desk);
    await desk.setProfile(MARIA, { name: 'María', avatar: LYRA });
    const view = viewOf(await desk.roles(HOUSE, id, true));
    expect(view.as).toBe('house');
    expect(memberOf(view, MARIA)).toMatchObject({ name: 'María', avatar: LYRA });
  });

  it('carries them in every answer of the roles desk, a change that changes nothing included', async () => {
    const { desk } = scene();
    const id = await organization(desk);
    await desk.setProfile(ANA, { name: 'Ana', avatar: ARLA });
    const named = (answer: RolesAnswer): void => {
      expect(memberOf(viewOf(answer), ANA)).toMatchObject({ name: 'Ana', avatar: ARLA });
    };
    const created = viewOf(
      await desk.createRole(PABLO, id, {
        name: 'Guía',
        color: null,
        hoist: false,
        permissions: [],
      }),
    );
    named(created);
    const guide = created.roles.find((role) => role.name === 'Guía');
    if (guide === undefined) throw new Error('no role Guía');
    named(await desk.giveRole(PABLO, id, ANA, guide.id));
    named(await desk.giveRole(PABLO, id, ANA, guide.id));
    named(await desk.editRole(PABLO, id, guide.id, { name: 'Guía' }));
    named(await desk.editRole(PABLO, id, guide.id, { color: '#14b8a6' }));
    named(await desk.moveRole(PABLO, id, guide.id, guide.position));
    named(await desk.moveRole(PABLO, id, guide.id, 1));
    named(await desk.takeRole(PABLO, id, ANA, guide.id));
    named(await desk.deleteRole(PABLO, id, guide.id));
  });

  it('follows the person: a name removed leaves every view at once', async () => {
    const { desk } = scene();
    const id = await organization(desk);
    await desk.setProfile(MARIA, { name: 'María', avatar: LYRA });
    await desk.setProfile(MARIA, null);
    const view = viewOf(await desk.roles(PABLO, id));
    expect(memberOf(view, MARIA)).not.toHaveProperty('name');
    expect(JSON.stringify(view)).not.toContain('María');
  });
});
