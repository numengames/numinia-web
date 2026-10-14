/**
 * What a community's space uses: the five pieces its page lists and the
 * honest state of each — a home to enter (counted only in the fleet) or none
 * yet, the gatherings coming, and what is not built yet.
 */

import { describe, expect, it } from 'vitest';
import { parseCommunity, parseRitual, type Community, type Ritual } from '../communities';
import { spaceUses, type Piece, type PieceId, type PieceState } from '../space-uses';

const COMMONS = { href: 'https://v2.oncyber.io/agora_plaza_of_numinia', name: 'Plaza del Ágora' };

const BASE = {
  name: 'La Tarugo',
  kind: { en: 'Conference', es: 'Congreso' },
  places: ['madrid'],
  summary: { en: 'People who make things.', es: 'Gente que hace cosas.' },
};

function community(id: string, extra: Record<string, unknown> = {}): Community {
  return parseCommunity(id, { ...BASE, ...extra });
}

function gathering(id: string, extra: Record<string, unknown> = {}): Ritual {
  return parseRitual(id, {
    community: 'trgcon',
    title: id,
    start: '2026-10-22',
    where: { en: 'Madrid', es: 'Madrid' },
    ...extra,
  });
}

function stateOf(pieces: readonly Piece[], id: PieceId): PieceState {
  const piece = pieces.find((entry) => entry.id === id);
  if (!piece) throw new Error(`no piece ${id}`);
  return piece.state;
}

describe('spaceUses', () => {
  it('lists the five pieces in the page order', () => {
    const pieces = spaceUses(community('trgcon'), [], COMMONS, 'es');
    expect(pieces.map((piece) => piece.id)).toEqual([
      'home',
      'gatherings',
      'archive',
      'members',
      'balance',
    ]);
  });

  it('says a community without a home has none yet, and whether the house is building it', () => {
    expect(stateOf(spaceUses(community('trgcon'), [], COMMONS, 'es'), 'home')).toEqual({
      kind: 'no-home',
      building: false,
    });
    const building = community('cps', { homeInProgress: true });
    expect(stateOf(spaceUses(building, [], COMMONS, 'es'), 'home')).toEqual({
      kind: 'no-home',
      building: true,
    });
  });

  it('opens a home of the fleet and counts who is inside it', () => {
    const vic = community('vic', {
      name: 'València Innovation Capital',
      sede: { href: 'https://vic.numinia.com/' },
    });
    expect(stateOf(spaceUses(vic, [], COMMONS, 'es'), 'home')).toEqual({
      kind: 'world',
      world: { href: 'https://vic.numinia.com/', name: 'València Innovation Capital' },
      counted: true,
    });
  });

  it('opens a home elsewhere but never guesses who is inside it', () => {
    const elsewhere = community('merge', {
      sede: { href: 'https://example.org/world', name: { en: 'The Hall', es: 'El Salón' } },
    });
    expect(stateOf(spaceUses(elsewhere, [], COMMONS, 'en'), 'home')).toEqual({
      kind: 'world',
      world: { href: 'https://example.org/world', name: 'The Hall' },
      counted: false,
    });
  });

  it('gives the founder the commons, uncounted, and what its file says of its archive and people', () => {
    const founder = community('numen-games', {
      name: 'Numen Games',
      state: 'founder',
      archive: { en: 'The Summa: numinia.org', es: 'La Summa: numinia.org' },
      people: { en: 'The Oracles', es: 'Los Oráculos' },
    });
    const pieces = spaceUses(founder, [], COMMONS, 'es');
    expect(stateOf(pieces, 'home')).toEqual({ kind: 'world', world: COMMONS, counted: false });
    expect(stateOf(pieces, 'archive')).toEqual({
      kind: 'stated',
      text: { en: 'The Summa: numinia.org', es: 'La Summa: numinia.org' },
    });
    expect(stateOf(pieces, 'members')).toEqual({
      kind: 'stated',
      text: { en: 'The Oracles', es: 'Los Oráculos' },
    });
  });

  it('marks the archive, the members and the balance as not built when the file says nothing', () => {
    const pieces = spaceUses(community('trgcon'), [], COMMONS, 'es');
    expect(stateOf(pieces, 'archive')).toEqual({ kind: 'building' });
    expect(stateOf(pieces, 'members')).toEqual({ kind: 'building' });
    expect(stateOf(pieces, 'balance')).toEqual({ kind: 'building' });
  });

  it('counts only its own gatherings still to come', () => {
    const register = [
      gathering('trg26'),
      gathering('trg27', { start: '2027-10-21' }),
      gathering('trg25', { start: '2025-10-23', status: 'held' }),
      gathering('merge-madrid-2026', { community: 'merge' }),
    ];
    expect(stateOf(spaceUses(community('trgcon'), register, COMMONS, 'es'), 'gatherings')).toEqual({
      kind: 'coming',
      count: 2,
    });
    expect(stateOf(spaceUses(community('vic'), register, COMMONS, 'es'), 'gatherings')).toEqual({
      kind: 'coming',
      count: 0,
    });
  });
});
