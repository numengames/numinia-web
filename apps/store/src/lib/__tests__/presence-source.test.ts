import { describe, expect, it, vi } from 'vitest';
import type { AccountDesk, Asker } from '../accounts';
import { createPlaza, type Plaza } from '../presence-plaza';
import { answerBeat, boundPlaza, plazaFrom, resetFixturePlazaForTests } from '../presence-source';

/** POST /api/presencia (MIS-266): one beat a minute, with a session, members only. */
const ME = `0x${'ab'.repeat(20)}`;
const citizen: Asker = { wallet: ME, house: false };
const TEAM = { id: 'acc_team', kind: 'team', name: 'Equipo', role: 'member', balanceCents: 0 };
const PERSONAL = { id: 'acc_me', kind: 'personal', name: null, role: 'owner', balanceCents: 0 };
const quiet = vi.fn();

const deskWith = (accounts: unknown[]): AccountDesk =>
  ({ overview: vi.fn(async () => ({ ok: true, accounts })) }) as unknown as AccountDesk;

const beat = (body: unknown): Request =>
  new Request('https://numinia.com/api/presencia', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

function fresh(): { plaza: Plaza; now: { t: number } } {
  const now = { t: Date.UTC(2026, 9, 26, 12, 0, 0) };
  return { plaza: createPlaza(() => now.t), now };
}

describe('answerBeat', () => {
  it('401 without a session, and the plaza hears nothing', async () => {
    const { plaza } = fresh();
    const spy = vi.spyOn(plaza, 'beat');
    const res = await answerBeat(plaza, deskWith([TEAM]), null, beat({ active: true }), quiet);
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('503 when there is no plaza or no desk bound', async () => {
    const { plaza } = fresh();
    expect(
      (await answerBeat(null, deskWith([TEAM]), citizen, beat({ active: true }), quiet)).status,
    ).toBe(503);
    expect((await answerBeat(plaza, null, citizen, beat({ active: true }), quiet)).status).toBe(
      503,
    );
  });

  it('only members: a person with no organization but their own account is refused', async () => {
    const { plaza } = fresh();
    const spy = vi.spyOn(plaza, 'beat');
    const res = await answerBeat(
      plaza,
      deskWith([PERSONAL]),
      citizen,
      beat({ active: true }),
      quiet,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'not-member' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('the house is not a member: an organization it only enters as the house does not count', async () => {
    const { plaza } = fresh();
    const entered = { ...TEAM, as: 'house' };
    const res = await answerBeat(
      plaza,
      deskWith([PERSONAL, entered]),
      { wallet: ME, house: true },
      beat({ active: true }),
      quiet,
    );
    expect(res.status).toBe(403);
  });

  it('a member beats; the answer is only their state as the others see it', async () => {
    const { plaza } = fresh();
    plaza.choose(ME, 'online');
    const res = await answerBeat(
      plaza,
      deskWith([PERSONAL, TEAM]),
      citizen,
      beat({ active: true }),
      quiet,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ state: 'online' });
    expect(plaza.states([ME])[ME]).toBe('online');
  });

  it('PRS-003: a member who has not answered the first-time question is told offline', async () => {
    const { plaza } = fresh();
    const res = await answerBeat(plaza, deskWith([TEAM]), citizen, beat({ active: true }), quiet);
    expect(await res.json()).toEqual({ state: 'offline' });
  });

  it('PRS-002: invisible members are told offline', async () => {
    const { plaza } = fresh();
    plaza.choose(ME, 'invisible');
    const res = await answerBeat(plaza, deskWith([TEAM]), citizen, beat({ active: true }), quiet);
    expect(await res.json()).toEqual({ state: 'offline' });
  });

  it('passes «active: false» on: a hidden or idle page still beats', async () => {
    const { plaza } = fresh();
    const spy = vi.spyOn(plaza, 'beat');
    await answerBeat(plaza, deskWith([TEAM]), citizen, beat({ active: false }), quiet);
    expect(spy).toHaveBeenCalledWith(ME, false);
  });

  it('400 for a body that is not exactly {active: boolean}, or too long', async () => {
    const { plaza } = fresh();
    const desk = deskWith([TEAM]);
    for (const body of [
      'nope',
      '[]',
      {},
      { active: 'yes' },
      { active: true, status: 'dnd' },
      { active: true, wallet: ME },
    ]) {
      expect((await answerBeat(plaza, desk, citizen, beat(body), quiet)).status).toBe(400);
    }
    expect(
      (
        await answerBeat(
          plaza,
          desk,
          citizen,
          beat(`{"active":true,"x":"${'a'.repeat(400)}"}`),
          quiet,
        )
      ).status,
    ).toBe(400);
  });

  it("the wallet is the session's, lowercased; nothing in the body can name another person", async () => {
    const { plaza } = fresh();
    const spy = vi.spyOn(plaza, 'beat');
    const upper: Asker = { wallet: ME.toUpperCase().replace('0X', '0x'), house: false };
    await answerBeat(plaza, deskWith([TEAM]), upper, beat({ active: true }), quiet);
    expect(spy).toHaveBeenCalledWith(ME, true);
  });

  it('502 when the till fails or answers out of shape, and the log names the rule only', async () => {
    const { plaza } = fresh();
    const log = vi.fn();
    const throws = {
      overview: vi.fn(async () => {
        throw new Error('boom');
      }),
    } as unknown as AccountDesk;
    expect((await answerBeat(plaza, throws, citizen, beat({ active: true }), log)).status).toBe(
      502,
    );
    const odd = { overview: vi.fn(async () => ({ nope: 1 })) } as unknown as AccountDesk;
    expect((await answerBeat(plaza, odd, citizen, beat({ active: true }), log)).status).toBe(502);
    const text = { overview: vi.fn(async () => 'no') } as unknown as AccountDesk;
    expect((await answerBeat(plaza, text, citizen, beat({ active: true }), log)).status).toBe(502);
    const refused = {
      overview: vi.fn(async () => ({ ok: false, problems: ['x'] })),
    } as unknown as AccountDesk;
    expect((await answerBeat(plaza, refused, citizen, beat({ active: true }), log)).status).toBe(
      403,
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(ME);
  });
});

const noop = (): void => undefined;

describe('plazaFrom', () => {
  it('prefers a bound plaza over the fixture', () => {
    const binding = { beat: noop, choose: noop, states: () => ({}) };
    expect(plazaFrom({ binding, dataSource: 'fixture' })).not.toBeNull();
    expect(plazaFrom({ binding, dataSource: undefined })).not.toBeNull();
  });

  it('reads a bound plaza by its methods', async () => {
    const calls: unknown[] = [];
    const binding = {
      beat: async (...a: unknown[]) => void calls.push(['beat', ...a]),
      choose: async (...a: unknown[]) => void calls.push(['choose', ...a]),
      states: async (people: string[]) => Object.fromEntries(people.map((p) => [p, 'online'])),
    };
    const plaza = boundPlaza(binding);
    expect(plaza).not.toBeNull();
    await plaza!.beat(ME, true);
    await plaza!.choose(ME, 'dnd');
    expect(calls).toEqual([
      ['beat', ME, true],
      ['choose', ME, 'dnd'],
    ]);
    expect(await plaza!.states([ME])).toEqual({ [ME]: 'online' });
    expect(boundPlaza(null)).toBeNull();
    expect(boundPlaza({ beat: 1 })).toBeNull();
    expect(boundPlaza({ beat: noop, choose: noop })).toBeNull();
    expect(boundPlaza(noop)).toBeNull();
    expect(boundPlaza('plaza')).toBeNull();
  });

  it('falls back to the fixture plaza only when the build reads fixtures', () => {
    resetFixturePlazaForTests();
    expect(plazaFrom({ binding: undefined, dataSource: undefined })).toBeNull();
    const a = plazaFrom({ binding: undefined, dataSource: 'fixture' });
    expect(a).not.toBeNull();
    expect(plazaFrom({ binding: undefined, dataSource: 'fixture' })).toBe(a);
  });
});
