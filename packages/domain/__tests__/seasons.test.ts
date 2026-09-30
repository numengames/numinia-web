import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, type LocalizedString } from '../src/types/i18n.js';
import { PUZZLE_TYPES, REWARD_TRACKS, SEASON_STATUSES } from '../src/types/season.js';
import {
  SEASON_ONE,
  SEASON_ONE_ADVENTURES,
  rewardOn,
  seasonMinutes,
} from '../src/constants/seasons.js';

function expectFullyLocalized(context: string, value: LocalizedString): void {
  for (const locale of SUPPORTED_LOCALES) {
    expect(
      value[locale]?.trim().length,
      `${context} is missing locale "${locale}"`,
    ).toBeGreaterThan(0);
  }
}

describe('Season I — The Awakening of the Veil', () => {
  it('is fully localized, season, adventures and rewards', () => {
    expectFullyLocalized('season name', SEASON_ONE.name);
    expectFullyLocalized('season description', SEASON_ONE.description);
    for (const adventure of SEASON_ONE_ADVENTURES) {
      expectFullyLocalized(`${adventure.id} name`, adventure.name);
      expectFullyLocalized(`${adventure.id} description`, adventure.description);
      for (const reward of adventure.rewards) {
        expectFullyLocalized(`${reward.id} name`, reward.name);
        expectFullyLocalized(`${reward.id} description`, reward.description);
      }
    }
  });

  it('has eight doors in order, every one open to everyone with a world to enter', () => {
    expect(SEASON_ONE.adventures).toHaveLength(8);
    expect(SEASON_ONE.adventures.map((a) => a.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const adventure of SEASON_ONE.adventures) {
      expect(adventure.seasonId).toBe(SEASON_ONE.id);
      expect(adventure.worldUrl).toMatch(/^https:\/\//);
      expect(PUZZLE_TYPES).toContain(adventure.puzzle);
      expect(adventure.difficulty).toBeGreaterThanOrEqual(1);
      expect(adventure.difficulty).toBeLessThanOrEqual(5);
      expect(adventure.durationMinutes).toBeGreaterThan(0);
    }
  });

  it('gives exactly one free and one premium reward per door, with unique ids', () => {
    const ids = new Set<string>();
    for (const adventure of SEASON_ONE.adventures) {
      expect(adventure.rewards.map((r) => r.track).sort()).toEqual([...REWARD_TRACKS].sort());
      for (const reward of adventure.rewards) ids.add(reward.id);
    }
    expect(ids.size).toBe(16);
  });

  it('keeps its Spanish names as Spanish (numinia.store stored them under English)', () => {
    expect(SEASON_ONE.adventures[1]!.name.es).toBe('Espejo roto');
    expect(SEASON_ONE.adventures[1]!.name.en).toBe('Broken Mirror');
    expect(SEASON_ONE.adventures[7]!.name.en).toBe('The Veil');
  });

  it('never invents time: no dates until the Oracle sets them', () => {
    expect(SEASON_STATUSES).toContain(SEASON_ONE.status);
    expect(SEASON_ONE.startsAt).toBeNull();
    expect(SEASON_ONE.endsAt).toBeNull();
  });

  it('adds up its minutes and finds a reward by track', () => {
    expect(seasonMinutes(SEASON_ONE)).toBe(125);
    const first = SEASON_ONE.adventures[0]!;
    expect(rewardOn(first, 'premium')?.id).toBe('loot-p-001');
    expect(rewardOn({ ...first, rewards: [] }, 'free')).toBeUndefined();
  });
});
