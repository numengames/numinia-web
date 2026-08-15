/**
 * Unit tests for the updates timeline: parser semantics on synthetic input,
 * and the full loader against the real committed record (anti-tautology).
 */

import { describe, expect, it } from 'vitest';
import { loadUpdates, parseLegacyChangelog, REBUILD_UPDATES } from '../updates';

describe('parseLegacyChangelog', () => {
  it('extracts versions with typed entries and ignores prose', () => {
    const markdown = [
      '# Title',
      'Intro prose - NEW — not an entry (no list dash at start? it has)',
      '- NEW — orphan entry before any version is dropped',
      '## v0.2.0 — 2026-02-20',
      '- NEW — added a thing',
      '- FIX — fixed a thing',
      'random prose line',
      '## v0.1.0 — 2026-02-10',
      '- IMP — improved a thing',
      '- WAT — unknown types are ignored',
    ].join('\n');
    const versions = parseLegacyChangelog(markdown);
    expect(versions).toEqual([
      {
        version: 'v0.2.0',
        date: '2026-02-20',
        entries: [
          { type: 'NEW', text: 'added a thing' },
          { type: 'FIX', text: 'fixed a thing' },
        ],
      },
      {
        version: 'v0.1.0',
        date: '2026-02-10',
        entries: [{ type: 'IMP', text: 'improved a thing' }],
      },
    ]);
  });

  it('returns an empty list for markdown without version headings', () => {
    expect(parseLegacyChangelog('# nothing here\n- NEW — floating')).toEqual([]);
  });
});

describe('loadUpdates', () => {
  it('prepends rebuild versions to all fifteen legacy versions, newest first', async () => {
    const updates = await loadUpdates();
    const versions = updates.map((update) => update.version);
    expect(versions.slice(0, REBUILD_UPDATES.length)).toEqual(
      REBUILD_UPDATES.map((update) => update.version),
    );
    for (let major = 1; major <= 15; major += 1) {
      expect(versions).toContain(`v0.${major}.0`);
    }
    for (const update of updates) {
      expect(update.entries.length).toBeGreaterThan(0);
    }
  });
});
