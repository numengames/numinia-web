/**
 * «Crear → Un encuentro» for real (cut M) at the store: a till row becomes
 * the same `Ritual` the pages read (every locale filled, the status from
 * its dates), files and rows merge by start, what a browser sends is read
 * strictly, and each door turns the till's answer into a status. A till
 * older than the store answers 503.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  DESK_METHODS,
  NOT_IMPLEMENTED,
  type AccountDesk,
  type Asker,
  type DeskRitual,
} from '../accounts';
import { boundAccounts } from '../accounts-source';
import type { Community, Ritual } from '../communities';
import {
  RITUAL_NOTE_MAX,
  RITUAL_PROBLEMS,
  RITUAL_TITLE_MAX,
  RITUAL_WHERE_MAX,
  allRituals,
  answerCancelRitual,
  answerCreateRitual,
  answerRituals,
  isTillRitualId,
  readRitualDraft,
  readRitualNote,
  readTillRitualId,
  ritualFromTill,
  tillRitual,
  tillRituals,
  tillStatus,
} from '../rituals-till';

const HOUSE: Asker = { wallet: `0x${'99'.repeat(20)}`, house: true };
const PABLO: Asker = { wallet: `0x${'AB'.repeat(20)}`, house: false };
const ID = 'rit_0123456789abcdef';
const NOW = Date.parse('2026-10-17T12:00:00.000Z');

const register = [
  { id: 'numen-games', name: 'Numen Games' },
  { id: 'reset', name: 'Reset' },
] as unknown as readonly Community[];

const quiet = vi.fn();
const json = async (response: Response): Promise<unknown> => response.json();
const post = (body: unknown, type = 'application/json'): Request =>
  new Request('https://numinia.test/api/ritual', {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const url = (query = ''): URL => new URL(`https://numinia.test/api/rituals${query}`);

const row: DeskRitual = {
  id: ID,
  communityId: 'numen-games',
  title: 'Taller de Hyperfy',
  start: '2026-11-03',
  end: '2026-11-04',
  allDay: true,
  mode: 'in-person',
  where: 'La Nave, Madrid',
  note: 'Trae portátil',
  worldId: null,
  createdBy: PABLO.wallet.toLowerCase(),
  createdAt: '2026-10-17T10:00:00.000Z',
  cancelledAt: null,
};

const DRAFT = {
  communityId: 'numen-games',
  title: ' Taller de Hyperfy ',
  start: '2026-11-03',
  mode: 'in-person',
  where: 'La Nave, Madrid',
};

const deskWith = (methods: Partial<Record<keyof AccountDesk, () => Promise<unknown>>>) =>
  Object.fromEntries(
    Object.entries(methods).map(([name, answer]) => [name, vi.fn(answer)]),
  ) as unknown as AccountDesk;

const older = (method: string): AccountDesk =>
  deskWith({
    [method]: async () => {
      throw new TypeError(`The desk ${NOT_IMPLEMENTED} "${method}".`);
    },
  } as Partial<Record<keyof AccountDesk, () => Promise<unknown>>>);

describe('a till id', () => {
  it('is rit_ and 16 hex; a file id is a slug', () => {
    expect(isTillRitualId(ID)).toBe(true);
    expect(isTillRitualId('trg26')).toBe(false);
    expect(readTillRitualId(ID)).toBe(ID);
    for (const value of ['rit_', `${ID}0`, 'RIT_0123456789ABCDEF', 7]) {
      expect(readTillRitualId(value)).toBeUndefined();
    }
  });
});

describe('a till row as a Ritual', () => {
  it('fills every locale with the one text, keeps the dates, names the community as its source', () => {
    const ritual = ritualFromTill(row, 'Numen Games', NOW);
    expect(ritual).toEqual({
      id: ID,
      community: 'numen-games',
      title: {
        en: 'Taller de Hyperfy',
        es: 'Taller de Hyperfy',
        ja: 'Taller de Hyperfy',
        ko: 'Taller de Hyperfy',
        'pt-br': 'Taller de Hyperfy',
      },
      start: '2026-11-03',
      end: '2026-11-04',
      allDay: true,
      mode: 'in-person',
      status: 'upcoming',
      city: false,
      where: {
        en: 'La Nave, Madrid',
        es: 'La Nave, Madrid',
        ja: 'La Nave, Madrid',
        ko: 'La Nave, Madrid',
        'pt-br': 'La Nave, Madrid',
      },
      programme: undefined,
      note: {
        en: 'Trae portátil',
        es: 'Trae portátil',
        ja: 'Trae portátil',
        ko: 'Trae portátil',
        'pt-br': 'Trae portátil',
      },
      source: { name: 'Numen Games', date: '2026-10-17' },
      image: undefined,
    });
    expect(ritualFromTill({ ...row, note: null }, 'Numen Games', NOW).note).toBeUndefined();
  });

  it('is upcoming until it is over: the day after its last day, or its end instant', () => {
    expect(
      tillStatus({ end: '2026-11-04', allDay: true }, Date.parse('2026-11-04T23:59:00Z')),
    ).toBe('upcoming');
    expect(
      tillStatus({ end: '2026-11-04', allDay: true }, Date.parse('2026-11-05T00:00:00Z')),
    ).toBe('held');
    const timed = { end: '2026-11-03T20:00:00.000Z', allDay: false };
    expect(tillStatus(timed, Date.parse('2026-11-03T19:59:59Z'))).toBe('upcoming');
    expect(tillStatus(timed, Date.parse('2026-11-03T20:00:00Z'))).toBe('held');
  });

  it('merges files and rows by start, dropping a row of a community the register lacks', () => {
    const file = {
      id: 'trg26',
      community: 'numen-games',
      start: '2026-10-22',
      end: '2026-10-24',
      allDay: true,
      status: 'upcoming',
    } as unknown as Ritual;
    const early = { ...row, id: 'rit_00000000000000aa', start: '2026-10-01', end: '2026-10-01' };
    const stray = { ...row, id: 'rit_00000000000000bb', communityId: 'nobody' };
    const merged = allRituals([file], [row, early, stray], register, NOW);
    expect(merged.map((ritual) => ritual.id)).toEqual([early.id, 'trg26', ID]);
    expect(allRituals([], [], register, NOW)).toEqual([]);
  });
});

describe('reading what a browser sends', () => {
  it('reads the note: nothing is null, blank is null, 600 clean characters at most', () => {
    expect(readRitualNote(undefined)).toBeNull();
    expect(readRitualNote(null)).toBeNull();
    expect(readRitualNote('  ')).toBeNull();
    expect(readRitualNote(' Trae portátil ')).toBe('Trae portátil');
    expect(readRitualNote('a'.repeat(RITUAL_NOTE_MAX))).toHaveLength(RITUAL_NOTE_MAX);
    expect(readRitualNote('a'.repeat(RITUAL_NOTE_MAX + 1))).toBeUndefined();
    expect(readRitualNote('a\nb')).toBeUndefined();
    expect(readRitualNote(4)).toBeUndefined();
  });

  it('reads a draft whole: trimmed, the end optional, the world optional, nothing extra', () => {
    expect(readRitualDraft(DRAFT)).toEqual({
      communityId: 'numen-games',
      title: 'Taller de Hyperfy',
      start: '2026-11-03',
      end: null,
      mode: 'in-person',
      where: 'La Nave, Madrid',
      note: null,
      worldId: null,
    });
    expect(
      readRitualDraft({
        ...DRAFT,
        start: '2026-11-03T18:00:00.000Z',
        end: '2026-11-03T20:00:00.000Z',
        mode: 'online',
        note: ' En la sede ',
        worldId: 'sede-numen-games',
      }),
    ).toMatchObject({
      start: '2026-11-03T18:00:00.000Z',
      end: '2026-11-03T20:00:00.000Z',
      mode: 'online',
      note: 'En la sede',
      worldId: 'sede-numen-games',
    });
    expect(readRitualDraft({ ...DRAFT, end: '2026-11-05', worldId: null })).toMatchObject({
      end: '2026-11-05',
      worldId: null,
    });
    const bad: unknown[] = [
      null,
      [],
      'draft',
      { ...DRAFT, extra: 1 },
      { ...DRAFT, communityId: 'Numen' },
      { ...DRAFT, title: '' },
      { ...DRAFT, title: 'a'.repeat(RITUAL_TITLE_MAX + 1) },
      { ...DRAFT, start: undefined },
      { ...DRAFT, start: 'mañana' },
      { ...DRAFT, start: '2026-13-40' },
      { ...DRAFT, start: '2026-11-03T25:00:00.000Z' },
      { ...DRAFT, end: 7 },
      { ...DRAFT, end: '2026-11-02' },
      { ...DRAFT, end: '2026-11-03T18:00:00.000Z' },
      { ...DRAFT, start: '2026-11-03T18:00:00.000Z', end: '2026-11-04' },
      { ...DRAFT, start: '2026-11-03T18:00:00.000Z', end: '2026-11-03T17:00:00.000Z' },
      { ...DRAFT, start: '2026-11-03T18:00:00.000Z', end: '2026-11-03T99:00:00.000Z' },
      { ...DRAFT, mode: 'presencial' },
      { ...DRAFT, where: 'a'.repeat(RITUAL_WHERE_MAX + 1) },
      { ...DRAFT, note: 'a'.repeat(RITUAL_NOTE_MAX + 1) },
      { ...DRAFT, worldId: 'Sede' },
      { ...DRAFT, worldId: 3 },
    ];
    for (const value of bad) expect(readRitualDraft(value), JSON.stringify(value)).toBeNull();
  });
});

describe('POST /api/ritual', () => {
  it('asks for a session, a JSON body in shape, a community of the register, and a till', async () => {
    expect((await answerCreateRitual(null, null, register, post(DRAFT), quiet)).status).toBe(401);
    expect(
      (await answerCreateRitual(null, PABLO, register, post('x', 'text/plain'), quiet)).status,
    ).toBe(415);
    const shapeless = await answerCreateRitual(null, PABLO, register, post({ title: 'x' }), quiet);
    expect(shapeless.status).toBe(400);
    expect(await json(shapeless)).toEqual({ error: RITUAL_PROBLEMS.draft });
    const stray = await answerCreateRitual(
      null,
      PABLO,
      register,
      post({ ...DRAFT, communityId: 'nobody' }),
      quiet,
    );
    expect(stray.status).toBe(404);
    expect((await answerCreateRitual(null, PABLO, register, post(DRAFT), quiet)).status).toBe(503);
    expect(
      (await answerCreateRitual(older('createRitual'), PABLO, register, post(DRAFT), quiet)).status,
    ).toBe(503);
  });

  it('publishes as the session’s wallet, lowercased, with the house flag, and logs the community', async () => {
    const log = vi.fn();
    const desk = deskWith({ createRitual: async () => ({ ok: true, ritual: row }) });
    const response = await answerCreateRitual(desk, HOUSE, register, post(DRAFT), log);
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ ok: true, ritual: row });
    expect(desk.createRitual).toHaveBeenCalledWith(
      HOUSE.wallet.toLowerCase(),
      {
        communityId: 'numen-games',
        title: 'Taller de Hyperfy',
        start: '2026-11-03',
        end: null,
        mode: 'in-person',
        where: 'La Nave, Madrid',
        note: null,
        worldId: null,
      },
      true,
    );
    expect(log).toHaveBeenCalledWith({
      level: 'info',
      kind: 'ritual',
      action: 'created',
      community: 'numen-games',
    });
  });

  it('turns the till’s refusals into statuses: 403 the door, 400 the rest; an odd answer is 502', async () => {
    const refusing = (problem: string) =>
      deskWith({ createRitual: async () => ({ ok: false, problems: [problem] }) });
    for (const [problem, status] of [
      [RITUAL_PROBLEMS.notAllowed, 403],
      [RITUAL_PROBLEMS.noOrganization, 403],
      ['title must be text', 400],
    ] as const) {
      const response = await answerCreateRitual(
        refusing(problem),
        PABLO,
        register,
        post(DRAFT),
        quiet,
      );
      expect(response.status).toBe(status);
      expect(await json(response)).toEqual({ error: 'refused', problems: [problem] });
    }
    const odd = deskWith({ createRitual: async () => ({ ok: true }) });
    expect((await answerCreateRitual(odd, PABLO, register, post(DRAFT), quiet)).status).toBe(502);
  });
});

describe('POST /api/ritual/cancel', () => {
  it('asks for a session, `{ ritualId }` alone, and a till', async () => {
    expect((await answerCancelRitual(null, null, post({ ritualId: ID }), quiet)).status).toBe(401);
    expect((await answerCancelRitual(null, PABLO, post('x', 'text/plain'), quiet)).status).toBe(
      415,
    );
    for (const body of [null, [], { ritualId: 'trg26' }, { ritualId: ID, more: 1 }]) {
      expect((await answerCancelRitual(null, PABLO, post(body), quiet)).status).toBe(400);
    }
    expect((await answerCancelRitual(null, PABLO, post({ ritualId: ID }), quiet)).status).toBe(503);
    expect(
      (await answerCancelRitual(older('cancelRitual'), PABLO, post({ ritualId: ID }), quiet))
        .status,
    ).toBe(503);
  });

  it('cancels as the session’s wallet and logs; 404 for none, 409 for one cancelled already', async () => {
    const log = vi.fn();
    const cancelled = { ...row, cancelledAt: '2026-10-18T10:00:00.000Z' };
    const desk = deskWith({ cancelRitual: async () => ({ ok: true, ritual: cancelled }) });
    const response = await answerCancelRitual(desk, PABLO, post({ ritualId: ID }), log);
    expect(await json(response)).toEqual({ ok: true, ritual: cancelled });
    expect(desk.cancelRitual).toHaveBeenCalledWith(PABLO.wallet.toLowerCase(), ID, false);
    expect(log).toHaveBeenCalledWith({
      level: 'info',
      kind: 'ritual',
      action: 'cancelled',
      community: 'numen-games',
    });
    for (const [problem, status] of [
      [RITUAL_PROBLEMS.noSuchRitual, 404],
      [RITUAL_PROBLEMS.cancelled, 409],
      [RITUAL_PROBLEMS.notAllowed, 403],
    ] as const) {
      const refusing = deskWith({ cancelRitual: async () => ({ ok: false, problems: [problem] }) });
      expect(
        (await answerCancelRitual(refusing, PABLO, post({ ritualId: ID }), quiet)).status,
      ).toBe(status);
    }
  });
});

describe('GET /api/rituals', () => {
  it('lists publicly, cached a minute, each row with its community’s name; a stray row is dropped', async () => {
    const stray = { ...row, id: 'rit_00000000000000bb', communityId: 'nobody' };
    const desk = deskWith({ ritualsOf: async () => ({ ok: true, rituals: [row, stray] }) });
    const response = await answerRituals(desk, register, url('?upcoming=1'), quiet);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(await json(response)).toEqual({
      ok: true,
      rituals: [{ ...row, communityName: 'Numen Games' }],
    });
    expect(desk.ritualsOf).toHaveBeenCalledWith(null, true);
    await answerRituals(desk, register, url('?comunidad=numen-games,reset'), quiet);
    expect(desk.ritualsOf).toHaveBeenLastCalledWith(['numen-games', 'reset'], false);
  });

  it('refuses malformed community ids, says 503 without a till, passes the till’s refusal on', async () => {
    expect((await answerRituals(null, register, url('?comunidad=Numen'), quiet)).status).toBe(400);
    expect((await answerRituals(null, register, url(), quiet)).status).toBe(503);
    expect((await answerRituals(older('ritualsOf'), register, url(), quiet)).status).toBe(503);
    const refusing = deskWith({ ritualsOf: async () => ({ ok: false, problems: ['x'] }) });
    expect((await answerRituals(refusing, register, url(), quiet)).status).toBe(400);
  });
});

describe('the rows for a page rendered on demand', () => {
  it('reads one encounter, or null when the till lacks it, is not there, or refuses', async () => {
    expect(await tillRitual(null, ID, quiet)).toBeNull();
    const desk = deskWith({ ritual: async () => ({ ok: true, ritual: row }) });
    expect(await tillRitual(desk, ID, quiet)).toEqual(row);
    const none = deskWith({ ritual: async () => ({ ok: true, ritual: null }) });
    expect(await tillRitual(none, ID, quiet)).toBeNull();
    const refusing = deskWith({ ritual: async () => ({ ok: false, problems: ['x'] }) });
    expect(await tillRitual(refusing, ID, quiet)).toBeNull();
    expect(await tillRitual(older('ritual'), ID, quiet)).toBeNull();
  });

  it('reads the list, or nothing when the till is not there or refuses', async () => {
    expect(await tillRituals(null, null, true, quiet)).toEqual([]);
    const desk = deskWith({ ritualsOf: async () => ({ ok: true, rituals: [row] }) });
    expect(await tillRituals(desk, ['numen-games'], false, quiet)).toEqual([row]);
    expect(desk.ritualsOf).toHaveBeenCalledWith(['numen-games'], false);
    const refusing = deskWith({ ritualsOf: async () => ({ ok: false, problems: ['x'] }) });
    expect(await tillRituals(refusing, null, true, quiet)).toEqual([]);
  });
});

/** A bound till with every method a desk needs but this cut's four. */
const oldBinding = (): Record<string, unknown> =>
  Object.fromEntries(
    DESK_METHODS.filter(
      (method) => !['createRitual', 'cancelRitual', 'ritualsOf', 'ritual'].includes(method),
    ).map((method) => [method, vi.fn()]),
  );

describe('a till older than the store (boundAccounts)', () => {
  it('is still a desk without the four methods, and passes each through to a till that has them', async () => {
    const old = boundAccounts(oldBinding());
    expect(old).not.toBeNull();
    const draft = readRitualDraft(DRAFT);
    if (draft === null) throw new Error('the draft reads');
    await expect(old?.createRitual(PABLO.wallet, draft)).rejects.toThrow(/does not implement/);
    await expect(old?.cancelRitual(PABLO.wallet, ID)).rejects.toThrow(/does not implement/);
    await expect(old?.ritualsOf(null, true)).rejects.toThrow(/does not implement/);
    await expect(old?.ritual(ID)).rejects.toThrow(/does not implement/);
    const createRitual = vi.fn(async () => ({ ok: true, ritual: row }));
    const cancelRitual = vi.fn(async () => ({ ok: true, ritual: row }));
    const ritualsOf = vi.fn(async () => ({ ok: true, rituals: [row] }));
    const ritual = vi.fn(async () => ({ ok: true, ritual: row }));
    const desk = boundAccounts({ ...oldBinding(), createRitual, cancelRitual, ritualsOf, ritual });
    await desk?.createRitual(PABLO.wallet, draft, false);
    expect(createRitual).toHaveBeenCalledWith(PABLO.wallet, draft, false);
    await desk?.cancelRitual(PABLO.wallet, ID, true);
    expect(cancelRitual).toHaveBeenCalledWith(PABLO.wallet, ID, true);
    await desk?.ritualsOf(['numen-games'], true);
    expect(ritualsOf).toHaveBeenCalledWith(['numen-games'], true);
    await desk?.ritual(ID);
    expect(ritual).toHaveBeenCalledWith(ID);
  });
});
