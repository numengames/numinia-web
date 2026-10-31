/**
 * «Crear → Un encuentro» for real (cut M, 2026-10-17): someone who runs a
 * community publishes an encounter from numinia.com, the city lists it,
 * the same people cancel it. The pure rules, migration 0015 on the D1 shim,
 * and the account desk as numinia.com's binding calls it. One describe per
 * rule or per door.
 */

import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../src/db/accounts';
import { COMMUNITY_PROBLEMS, readCommunityId } from '../src/lib/community-teams';
import { ORG_PROBLEMS } from '../src/lib/organizations';
import {
  RITUAL_COMMUNITIES_MAX,
  RITUAL_NOTE_MAX,
  RITUAL_PROBLEMS,
  RITUAL_TITLE_MAX,
  RITUAL_WHERE_MAX,
  readCommunityIds,
  readMode,
  readRitualNote,
  readTillRitualId,
  readTitle,
  readWhen,
  readWhere,
  readWorldId,
  tillRitualId,
} from '../src/lib/rituals';
import { AccountDesk } from '../src/worker';
import { migratedTill } from './sqlite-d1';

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

const ritualOf = (answer: Awaited<ReturnType<AccountDesk['createRitual']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.ritual;
};

const listOf = (answer: Awaited<ReturnType<AccountDesk['ritualsOf']>>) => {
  if (!answer.ok) throw new Error(answer.problems.join());
  return answer.rituals;
};

const acts = (s: Scene, id: string): string[] =>
  s.sqlite
    .prepare('SELECT act FROM team_log WHERE account_id = ? ORDER BY seq')
    .all(id)
    .map((row) => String(row['act']));

/** The house opens the community's organization and makes PABLO its administrator. */
async function run(s: Scene, community = 'numen-games'): Promise<string> {
  const answer = await s.desk.ensureCommunityTeam(HOUSE, true, community, 'Numen Games');
  if (!answer.ok) throw new Error(answer.problems.join());
  await s.desk.setMember(HOUSE, answer.account.id, PABLO, 'admin', true);
  return answer.account.id;
}

const DRAFT = {
  communityId: 'numen-games',
  title: ' Taller de Hyperfy ',
  start: '2026-11-03',
  mode: 'in-person',
  where: 'La Nave, Madrid',
} as const;

describe('the rules of an encounter', () => {
  it('reads a till id, a mode, a world id', () => {
    const id = tillRitualId();
    expect(id).toMatch(/^rit_[0-9a-f]{16}$/);
    expect(readTillRitualId(id)).toBe(id);
    expect(tillRitualId()).not.toBe(id);
    for (const value of ['rit_', 'trg26', `${id}0`, 7])
      expect(readTillRitualId(value)).toBeUndefined();
    expect(readMode('in-person')).toBe('in-person');
    expect(readMode('online')).toBe('online');
    expect(readMode('mixed')).toBe('mixed');
    for (const value of ['presencial', '', null]) expect(readMode(value)).toBeUndefined();
    expect(readWorldId(undefined)).toBeNull();
    expect(readWorldId(null)).toBeNull();
    expect(readWorldId('sede-numen-games')).toBe('sede-numen-games');
    for (const value of ['-x', 'A', 'a'.repeat(101), 3]) expect(readWorldId(value)).toBeUndefined();
  });

  it('reads the title, the place and the note within their lengths, no control characters', () => {
    expect(readTitle(' TRG26 ')).toBe('TRG26');
    expect(readTitle('a'.repeat(RITUAL_TITLE_MAX))).toHaveLength(RITUAL_TITLE_MAX);
    for (const value of ['', '  ', 'a'.repeat(RITUAL_TITLE_MAX + 1), 'a\nb', 4]) {
      expect(readTitle(value)).toBeUndefined();
    }
    expect(readWhere('La Nave')).toBe('La Nave');
    expect(readWhere('a'.repeat(RITUAL_WHERE_MAX + 1))).toBeUndefined();
    expect(readRitualNote(undefined)).toBeNull();
    expect(readRitualNote(null)).toBeNull();
    expect(readRitualNote('  ')).toBeNull();
    expect(readRitualNote(' Trae portátil ')).toBe('Trae portátil');
    expect(readRitualNote('a'.repeat(RITUAL_NOTE_MAX))).toHaveLength(RITUAL_NOTE_MAX);
    expect(readRitualNote('a'.repeat(RITUAL_NOTE_MAX + 1))).toBeUndefined();
    expect(readRitualNote('a\u0007')).toBeUndefined();
    expect(readRitualNote(1)).toBeUndefined();
  });

  it('reads when: days or instants, both alike, the end not before the start', () => {
    expect(readWhen('2026-11-03', undefined)).toEqual({
      start: '2026-11-03',
      end: '2026-11-03',
      allDay: true,
    });
    expect(readWhen('2026-11-03', '2026-11-05')).toEqual({
      start: '2026-11-03',
      end: '2026-11-05',
      allDay: true,
    });
    expect(readWhen('2026-11-03T18:00:00.000Z', null)).toEqual({
      start: '2026-11-03T18:00:00.000Z',
      end: '2026-11-03T18:00:00.000Z',
      allDay: false,
    });
    expect(readWhen('2026-11-03T18:00:00.000Z', '2026-11-03T20:00:00.000Z')?.allDay).toBe(false);
    for (const [start, end] of [
      [undefined, undefined],
      ['2026-11-03', 7],
      ['2026-11-03', '2026-11-02'],
      ['2026-11-03', '2026-11-03T18:00:00.000Z'],
      ['2026-02-30', undefined],
      ['2026-11-03', '2026-13-01'],
      ['2026-11-03T18:00:00.000Z', '2026-11-03'],
      ['2026-11-03T25:00:00.000Z', undefined],
      ['2026-11-03T18:00:00.000Z', '2026-11-03T17:00:00.000Z'],
      ['2026-11-03T18:00:00.000Z', '2026-11-03T24:00:00.000Z'],
      ['noviembre', undefined],
    ]) {
      expect(readWhen(start, end)).toBeUndefined();
    }
  });

  it('reads the community ids: null for all, a list without duplicates, nothing malformed', () => {
    expect(readCommunityIds(undefined, readCommunityId)).toBeNull();
    expect(readCommunityIds(null, readCommunityId)).toBeNull();
    expect(readCommunityIds([], readCommunityId)).toEqual([]);
    expect(readCommunityIds(['numen-games', 'merge', 'numen-games'], readCommunityId)).toEqual([
      'numen-games',
      'merge',
    ]);
    expect(readCommunityIds('numen-games', readCommunityId)).toBeUndefined();
    expect(readCommunityIds(['Numen Games'], readCommunityId)).toBeUndefined();
    expect(
      readCommunityIds(
        Array.from({ length: RITUAL_COMMUNITIES_MAX + 1 }, () => 'a'),
        readCommunityId,
      ),
    ).toBeUndefined();
  });
});

describe('publishing an encounter', () => {
  it('refuses what it cannot read, every problem at once', async () => {
    const s = scene();
    expect(
      await s.desk.createRitual(
        'pablo',
        {
          communityId: 'Numen',
          title: '',
          start: 'mañana',
          mode: 'presencial',
          where: '',
          note: 'a'.repeat(601),
          worldId: '-',
        },
        'maybe',
      ),
    ).toEqual({
      ok: false,
      problems: [
        PROBLEMS.wallet,
        ORG_PROBLEMS.house,
        COMMUNITY_PROBLEMS.community,
        RITUAL_PROBLEMS.title,
        RITUAL_PROBLEMS.when,
        RITUAL_PROBLEMS.mode,
        RITUAL_PROBLEMS.where,
        RITUAL_PROBLEMS.note,
        RITUAL_PROBLEMS.worldId,
      ],
    });
    expect(await s.desk.createRitual(PABLO, 'not a draft')).toMatchObject({ ok: false });
  });

  it('refuses a community whose organization is not open, a stranger and a plain member', async () => {
    const s = scene();
    expect(await s.desk.createRitual(PABLO, DRAFT)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.noOrganization],
    });
    const id = await run(s);
    await s.desk.setMember(HOUSE, id, MARIA, 'member', true);
    expect(await s.desk.createRitual(STRANGER, DRAFT)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.notAllowed],
    });
    expect(await s.desk.createRitual(MARIA, DRAFT, false)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.notAllowed],
    });
    expect(listOf(await s.desk.ritualsOf())).toEqual([]);
  });

  it('publishes for an administrator, trimmed and whole, and logs it', async () => {
    const s = scene();
    const id = await run(s);
    const ritual = ritualOf(
      await s.desk.createRitual(PABLO, { ...DRAFT, note: ' Trae portátil ' }),
    );
    expect(ritual).toMatchObject({
      communityId: 'numen-games',
      title: 'Taller de Hyperfy',
      start: '2026-11-03',
      end: '2026-11-03',
      allDay: true,
      mode: 'in-person',
      where: 'La Nave, Madrid',
      note: 'Trae portátil',
      worldId: null,
      createdBy: PABLO,
      cancelledAt: null,
    });
    expect(ritual.id).toMatch(/^rit_[0-9a-f]{16}$/);
    expect(ritual.createdAt).toMatch(/Z$/);
    expect(acts(s, id).at(-1)).toBe('ritual-created');
    const found = await s.desk.ritual(ritual.id);
    expect(found).toEqual({ ok: true, ritual });
    expect(await s.desk.ritual('trg26')).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.ritualId],
    });
    expect(await s.desk.ritual(tillRitualId())).toEqual({ ok: true, ritual: null });
  });

  it('publishes for the house, timed and in the world, where the organization lets it in', async () => {
    const s = scene();
    await run(s);
    const ritual = ritualOf(
      await s.desk.createRitual(
        HOUSE,
        {
          ...DRAFT,
          start: '2026-11-03T18:00:00.000Z',
          end: '2026-11-03T20:00:00.000Z',
          mode: 'online',
          worldId: 'sede-numen-games',
        },
        true,
      ),
    );
    expect(ritual).toMatchObject({
      allDay: false,
      start: '2026-11-03T18:00:00.000Z',
      end: '2026-11-03T20:00:00.000Z',
      mode: 'online',
      worldId: 'sede-numen-games',
      createdBy: HOUSE,
    });
  });
});

describe('listing encounters', () => {
  it('lists the not cancelled ones of the communities asked, or of all, soonest first; upcoming keeps those not over', async () => {
    const s = scene();
    await run(s);
    await run(s, 'merge');
    // Dates are relative to today (UTC): a fixed calendar date turns «not over»
    // into «over» the day after it, and the test goes red on every PR.
    const inDays = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const late = ritualOf(await s.desk.createRitual(PABLO, { ...DRAFT, start: inDays(60) }));
    const soon = ritualOf(
      await s.desk.createRitual(PABLO, {
        ...DRAFT,
        communityId: 'merge',
        start: inDays(-30),
        end: inDays(7),
      }),
    );
    const past = ritualOf(await s.desk.createRitual(PABLO, { ...DRAFT, start: '2020-01-01' }));
    expect(listOf(await s.desk.ritualsOf()).map((r) => r.id)).toEqual([past.id, soon.id, late.id]);
    expect(listOf(await s.desk.ritualsOf(['numen-games'])).map((r) => r.id)).toEqual([
      past.id,
      late.id,
    ]);
    expect(listOf(await s.desk.ritualsOf(null, true)).map((r) => r.id)).toEqual([soon.id, late.id]);
    expect(listOf(await s.desk.ritualsOf([], true))).toEqual([]);
    expect(await s.desk.ritualsOf(['Merge'])).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.communityIds],
    });
  });
});

describe('cancelling an encounter', () => {
  it('refuses what it cannot read, one not there, and someone who does not run the community', async () => {
    const s = scene();
    expect(await s.desk.cancelRitual('x', 'trg26', 'maybe')).toEqual({
      ok: false,
      problems: [PROBLEMS.wallet, ORG_PROBLEMS.house, RITUAL_PROBLEMS.ritualId],
    });
    expect(await s.desk.cancelRitual(PABLO, tillRitualId())).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.noSuchRitual],
    });
    await run(s);
    const ritual = ritualOf(await s.desk.createRitual(PABLO, DRAFT));
    expect(await s.desk.cancelRitual(STRANGER, ritual.id)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.notAllowed],
    });
    expect(listOf(await s.desk.ritualsOf())).toHaveLength(1);
  });

  it('cancels once for its runner, keeps the row, leaves the lists, logs it', async () => {
    const s = scene();
    const id = await run(s);
    const ritual = ritualOf(await s.desk.createRitual(PABLO, DRAFT));
    const cancelled = await s.desk.cancelRitual(HOUSE, ritual.id, true);
    expect(cancelled.ok && cancelled.ritual.cancelledAt).toMatch(/Z$/);
    expect(listOf(await s.desk.ritualsOf())).toEqual([]);
    const found = await s.desk.ritual(ritual.id);
    expect(found.ok && found.ritual?.cancelledAt).not.toBeNull();
    expect(await s.desk.cancelRitual(PABLO, ritual.id)).toEqual({
      ok: false,
      problems: [RITUAL_PROBLEMS.cancelled],
    });
    expect(acts(s, id).slice(-2)).toEqual(['ritual-created', 'ritual-cancelled']);
  });
});
