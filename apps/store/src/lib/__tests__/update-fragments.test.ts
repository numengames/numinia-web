/**
 * Release notes as files: one note parses to one timeline card, the Nth file
 * by name is the Nth release after the frozen table, and every malformed file
 * fails loudly (naming itself) instead of silently dropping out of the page.
 */

import { describe, expect, it } from 'vitest';
import { buildFragmentUpdates, parseFragment } from '../update-fragments';

const GOOD = '2026-10-27-2151-first-note.md';

describe('parseFragment', () => {
  it('reads the date from the name and the typed entries from the lines', () => {
    const note = parseFragment(
      GOOD,
      ['- FIX — the grid shows March', '', '- NEW — a second thing', ''].join('\n'),
    );
    expect(note).toEqual({
      date: '2026-10-27 21:51',
      entries: [
        { type: 'FIX', text: 'the grid shows March' },
        { type: 'NEW', text: 'a second thing' },
      ],
      source: GOOD,
    });
    expect(note).not.toHaveProperty('missions');
  });

  it('reads missions from the front matter, with CRLF endings too', () => {
    const note = parseFragment(
      GOOD,
      '---\r\nmissions: MIS-268, ADR-041\r\n---\r\n- UPD — changed\r\n',
    );
    expect(note.missions).toEqual(['MIS-268', 'ADR-041']);
    expect(note.entries).toEqual([{ type: 'UPD', text: 'changed' }]);
  });

  it('accepts a front matter that closes at the end of the file, then refuses the empty note', () => {
    expect(() => parseFragment(GOOD, '---\nmissions: MIS-1\n---')).toThrow(/no entries/);
  });

  it.each([
    ['upper case', '2026-10-27-2151-First.md'],
    ['no time', '2026-10-27-first.md'],
    ['hour 24', '2026-10-27-2451-first.md'],
    ['minute 60', '2026-10-27-2160-first.md'],
    ['month 13', '2026-13-27-2151-first.md'],
    ['day 32', '2026-10-32-2151-first.md'],
    ['double dash', '2026-10-27-2151-first--note.md'],
    ['not markdown', '2026-10-27-2151-first.txt'],
    ['a path', 'x/2026-10-27-2151-first.md'],
  ])('refuses a name with %s', (_why, name) => {
    expect(() => parseFragment(name, '- NEW — x')).toThrow(/YYYY-MM-DD-HHMM-slug\.md/);
  });

  it('refuses a front matter field other than missions', () => {
    expect(() => parseFragment(GOOD, '---\nversion: v0.9.0\n---\n- NEW — x')).toThrow(
      /only «missions: …»/,
    );
  });

  it('refuses a mission id that is not an id', () => {
    expect(() => parseFragment(GOOD, '---\nmissions: MIS-1, soon\n---\n- NEW — x')).toThrow(
      /«soon» is not a mission id/,
    );
  });

  it.each([
    ['a prose line', 'just words'],
    ['an unknown type', '- WAT — x'],
    ['a hyphen instead of the dash', '- NEW - x'],
    ['an empty text', '- NEW — '],
    ['an indented entry', '  - NEW — x'],
  ])('refuses %s', (_why, line) => {
    expect(() => parseFragment(GOOD, line)).toThrow(/expected «- NEW\|FIX\|UPD — text»/);
  });

  it('names the file in every error', () => {
    expect(() => parseFragment(GOOD, '')).toThrow(`updates/${GOOD}: no entries`);
  });
});

describe('buildFragmentUpdates', () => {
  const note = (text: string) => `- NEW — ${text}`;

  it('numbers the Nth file by name as the Nth minor after the frozen table, newest first', () => {
    const updates = buildFragmentUpdates(
      {
        '../content/updates/2026-10-28-0900-c.md': note('c'),
        '../content/updates/2026-10-27-2200-a.md': note('a'),
        '../content/updates/2026-10-27-2300-b.md': note('b'),
      },
      'v0.171.0',
    );
    expect(updates.map((u) => [u.version, u.source, u.entries[0]?.text])).toEqual([
      ['v0.174.0', '2026-10-28-0900-c.md', 'c'],
      ['v0.173.0', '2026-10-27-2300-b.md', 'b'],
      ['v0.172.0', '2026-10-27-2200-a.md', 'a'],
    ]);
  });

  it('does not depend on the order the files are listed in', () => {
    const files = {
      'x/2026-10-27-2200-a.md': note('a'),
      'x/2026-10-27-2300-b.md': note('b'),
    };
    const reversed = Object.fromEntries(Object.entries(files).reverse());
    expect(buildFragmentUpdates(reversed, 'v0.10.0')).toEqual(
      buildFragmentUpdates(files, 'v0.10.0'),
    );
  });

  it('gives an empty timeline when there are no files', () => {
    expect(buildFragmentUpdates({}, 'v0.171.0')).toEqual([]);
  });

  it('counts from the minor of a frozen table whose newest is a patch', () => {
    const [only] = buildFragmentUpdates({ 'x/2026-10-27-2200-a.md': note('a') }, 'v0.52.1');
    expect(only?.version).toBe('v0.53.0');
  });

  it('refuses a frozen version that is not v0.N.x', () => {
    for (const bad of ['', 'v1.2.0', '0.171.0', 'v0.x.0']) {
      expect(() => buildFragmentUpdates({}, bad), bad).toThrow(/frozen table must end at v0\.N\.x/);
    }
  });

  it('fails the whole build when one file is malformed', () => {
    expect(() => buildFragmentUpdates({ 'x/2026-10-27-2200-a.md': 'oops' }, 'v0.1.0')).toThrow(
      /2026-10-27-2200-a\.md: expected/,
    );
  });
});
