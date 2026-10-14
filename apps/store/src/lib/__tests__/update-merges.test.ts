/**
 * Every version card links to its merge on GitHub: the pull request when
 * the map knows it, else GitHub's search of merged pull requests by title;
 * the legacy line and anything that is not a version get no link.
 */

import { describe, expect, it } from 'vitest';
import { REPO_URL } from '../build-info';
import { LAST_LEGACY_MINOR, MERGED_PRS, isLegacyVersion, mergeUrl } from '../update-merges';
import { REBUILD_UPDATES } from '../updates';

describe('MERGED_PRS', () => {
  it('maps versions to pull request numbers, newest first, v0.89.0 to #122', () => {
    expect(MERGED_PRS['v0.89.0']).toBe(122);
    expect(MERGED_PRS['v0.88.0']).toBe(120);
    const versions = Object.keys(MERGED_PRS);
    for (const version of versions) expect(version).toMatch(/^v\d+\.\d+\.\d+$/);
    const numbers = Object.values(MERGED_PRS);
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('only names versions the updates timeline lists', () => {
    const listed = new Set(REBUILD_UPDATES.map((update) => update.version));
    for (const version of Object.keys(MERGED_PRS)) expect(listed.has(version), version).toBe(true);
  });
});

describe('isLegacyVersion', () => {
  it('is the numinia.store line, v0.1.0 to v0.15.0', () => {
    expect(LAST_LEGACY_MINOR).toBe(15);
    expect(isLegacyVersion('v0.1.0')).toBe(true);
    expect(isLegacyVersion('v0.15.0')).toBe(true);
    expect(isLegacyVersion('v0.16.0')).toBe(false);
    expect(isLegacyVersion('v1.2.0')).toBe(false);
    expect(isLegacyVersion('nonsense')).toBe(false);
  });
});

describe('mergeUrl', () => {
  it('opens the pull request of a mapped version', () => {
    expect(mergeUrl('v0.89.0')).toBe('https://github.com/numengames/numinia-web/pull/122');
    expect(mergeUrl('v0.52.1')).toBe(`${REPO_URL}/pull/35`);
  });

  it('falls back to the search of merged pull requests whose title carries the version', () => {
    expect(mergeUrl('v0.50.0')).toBe(
      'https://github.com/numengames/numinia-web/pulls?q=is%3Apr+is%3Amerged+in%3Atitle+%22v0.50.0%22',
    );
    expect(mergeUrl('v1.0.0')).toBe(
      `${REPO_URL}/pulls?q=is%3Apr+is%3Amerged+in%3Atitle+%22v1.0.0%22`,
    );
  });

  it('gives the legacy line and anything that is not a version no link', () => {
    expect(mergeUrl('v0.15.0')).toBeNull();
    expect(mergeUrl('v0.1.0')).toBeNull();
    for (const hostile of ['', 'constructor', '__proto__', 'v0.89.0"><script>', 'v0.89']) {
      expect(mergeUrl(hostile), hostile).toBeNull();
    }
  });

  it('links every rebuild version the timeline shows', () => {
    for (const update of REBUILD_UPDATES) {
      const url = mergeUrl(update.version);
      expect(url, update.version).not.toBeNull();
      expect(new URL(url ?? '').origin).toBe('https://github.com');
    }
  });
});
