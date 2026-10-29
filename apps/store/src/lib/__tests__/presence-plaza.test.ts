import { describe, expect, it } from 'vitest';
import { AWAY_AFTER_MS, OFFLINE_AFTER_MS, createPlaza, type Plaza } from '../presence-plaza';

/**
 * «La plaza» (MIS-266, STD-053 PRS-001/002/003/005) on a simulated clock:
 * who is online, away, do-not-disturb or offline is a function of the
 * last beat, the last touch and what the person chose — never a history.
 */
const ANA = `0x${'a1'.repeat(20)}`;
const BEA = `0x${'b2'.repeat(20)}`;
const MIN = 60_000;

function setup(): { plaza: Plaza; tick: (ms: number) => void } {
  let now = Date.UTC(2026, 9, 26, 12, 0, 0);
  return { plaza: createPlaza(() => now), tick: (ms) => void (now += ms) };
}

describe('the plaza: thresholds (PRS-001)', () => {
  it('pins the numbers: away at 10 minutes, offline at 2', () => {
    expect(AWAY_AFTER_MS).toBe(10 * MIN);
    expect(OFFLINE_AFTER_MS).toBe(2 * MIN);
  });

  it('PRS-003: until the person answers the first-time question they show offline', () => {
    const { plaza } = setup();
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
  });

  it('a person who chose «online» shows online while the beats come with a touch', () => {
    const { plaza, tick } = setup();
    plaza.choose(ANA, 'online');
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('online');
    tick(MIN);
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('online');
  });

  it('goes away by itself after 10 minutes without a touch, and back on the next touch', () => {
    const { plaza, tick } = setup();
    plaza.choose(ANA, 'online');
    plaza.beat(ANA, true);
    for (let i = 0; i < 9; i += 1) {
      tick(MIN);
      plaza.beat(ANA, false);
    }
    expect(plaza.states([ANA])[ANA]).toBe('online');
    tick(MIN);
    plaza.beat(ANA, false);
    expect(plaza.states([ANA])[ANA]).toBe('away');
    tick(MIN);
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('online');
  });

  it('is offline 2 minutes after the last beat, and not before', () => {
    const { plaza, tick } = setup();
    plaza.choose(ANA, 'online');
    plaza.beat(ANA, true);
    tick(2 * MIN - 1);
    expect(plaza.states([ANA])[ANA]).toBe('online');
    tick(1);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
  });

  it('a person never heard from is offline', () => {
    const { plaza } = setup();
    expect(plaza.states([BEA])[BEA]).toBe('offline');
  });

  it('a beat after silence brings the person back', () => {
    const { plaza, tick } = setup();
    plaza.choose(ANA, 'online');
    plaza.beat(ANA, true);
    tick(5 * MIN);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('online');
  });
});

describe('the plaza: what is chosen', () => {
  it('«away» stays away however much the person touches', () => {
    const { plaza } = setup();
    plaza.choose(ANA, 'away');
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('away');
  });

  it('«do not disturb» shows as such', () => {
    const { plaza } = setup();
    plaza.choose(ANA, 'dnd');
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('dnd');
  });

  it('PRS-002: invisible reads as offline to everybody else, beats and all', () => {
    const { plaza, tick } = setup();
    plaza.choose(ANA, 'invisible');
    plaza.beat(ANA, true);
    tick(MIN);
    plaza.beat(ANA, true);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
  });

  it('invisible rules: nothing automatic changes it, and leaving it shows the person again', () => {
    const { plaza } = setup();
    plaza.choose(ANA, 'invisible');
    plaza.beat(ANA, false);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
    plaza.choose(ANA, 'online');
    expect(plaza.states([ANA])[ANA]).toBe('online');
  });

  it('answers for exactly the people asked, each by their own state', () => {
    const { plaza } = setup();
    plaza.choose(ANA, 'dnd');
    plaza.beat(ANA, true);
    plaza.choose(BEA, 'invisible');
    plaza.beat(BEA, true);
    expect(plaza.states([ANA, BEA])).toEqual({ [ANA]: 'dnd', [BEA]: 'offline' });
    expect(plaza.states([])).toEqual({});
  });
});

describe('the plaza: no history (PRS-005)', () => {
  it('forgets the beats of a person who went silent: no «last seen» is kept', () => {
    const { plaza, tick } = setup();
    plaza.choose(ANA, 'online');
    plaza.beat(ANA, true);
    expect(plaza.size()).toBe(1);
    tick(OFFLINE_AFTER_MS);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
    plaza.sweep();
    expect(plaza.size()).toBe(0);
    expect(plaza.states([ANA])[ANA]).toBe('offline');
    plaza.beat(ANA, false); // the choice outlives the beats; the touch does not
    expect(plaza.states([ANA])[ANA]).toBe('online');
  });

  it('keeps nothing but state: the answer is a plain word per person', () => {
    const { plaza } = setup();
    plaza.choose(ANA, 'online');
    plaza.beat(ANA, true);
    expect(JSON.stringify(plaza.states([ANA]))).toBe(`{"${ANA}":"online"}`);
  });
});
