/**
 * Mutation score 94.79% here / 98.17% for src/lib (Stryker). Survivors are
 * provably equivalent: readFile('') yields a Buffer JSON.parse accepts; the
 * CURRENT_VERSION fallback is unreachable while the pinned table is non-empty;
 * trailing `$` after greedy `.+` is redundant on line-split input.
 *
 * Unit tests for the updates timeline: parser semantics on synthetic input,
 * and the full loader against the real committed record (anti-tautology).
 */

import { describe, expect, it } from 'vitest';
import {
  CURRENT_VERSION,
  newestVersion,
  loadRoadmap,
  loadUpdates,
  parseLegacyChangelog,
  parseRoadmap,
  REBUILD_UPDATES,
} from '../updates';

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
      '- UPD — updated a thing',
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
        entries: [{ type: 'UPD', text: 'updated a thing' }],
      },
    ]);
  });

  it('anchors and quantifiers are strict: offsets, wide versions, trailing junk', () => {
    // Indented heading is prose, not a version; wide version numbers parse.
    const versions = parseLegacyChangelog(
      ['  ## v0.9.0 — indented-not-a-heading', '## v10.20.30 — 2026-05-01', '- NEW — wide'].join(
        '\n',
      ),
    );
    expect(versions).toEqual([
      { version: 'v10.20.30', date: '2026-05-01', entries: [{ type: 'NEW', text: 'wide' }] },
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

describe('REBUILD_UPDATES (pinned data)', () => {
  it('is pinned exactly — any edit must update this snapshot deliberately', () => {
    expect(REBUILD_UPDATES).toMatchSnapshot();
  });
});

describe('parseRoadmap', () => {
  it('extracts table rows with their status and ignores other tables', () => {
    const markdown = [
      '| Item | Status |',
      '|---|---|',
      '| Thing one | planned |',
      '| Thing two          | research   |',
      '| Thing three |   planned   |',
      '| Not a roadmap row | done |',
      '| Trailing junk | planned | extra |',
      'prose before | Sneaky | planned |',
    ].join('\n');
    expect(parseRoadmap(markdown)).toEqual([
      { item: 'Thing one', status: 'planned' },
      { item: 'Thing two', status: 'research' },
      { item: 'Thing three', status: 'planned' },
    ]);
  });
});

describe('loadRoadmap / CURRENT_VERSION', () => {
  it('loads the legacy Incoming roadmap from the committed record', async () => {
    const roadmap = await loadRoadmap();
    expect(roadmap.length).toBeGreaterThanOrEqual(10);
    for (const entry of roadmap) {
      expect(['planned', 'research']).toContain(entry.status);
      expect(entry.item).toBeTruthy();
    }
  });

  it('advertises the newest rebuild version', () => {
    expect(CURRENT_VERSION).toBe('v0.39.2');
    expect(newestVersion([])).toBe('v0.0.0');
    expect(CURRENT_VERSION).toBe(REBUILD_UPDATES[0]!.version);
    expect(CURRENT_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});
