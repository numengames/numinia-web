/**
 * Archive stats over the committed catalog. The manual parser tests moved
 * to codex-parse/codex-render with the v0.6.0 pipeline (MIS-085 B); the
 * legacy typographic parser is gone.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { computeArchiveStats } from '../lap/stats';

// ../env parses process.env at module scope: stub before importing archive.
beforeAll(() => {
  vi.stubEnv('GITHUB_REPO_OWNER', 'o');
  vi.stubEnv('GITHUB_REPO_NAME', 'r');
  vi.stubEnv('DATA_SOURCE', 'fixture');
});

describe('archive stats', () => {
  it('computes real numbers from the committed catalog', async () => {
    const { loadArchive } = await import('../archive');
    const stats = computeArchiveStats(await loadArchive());
    expect(stats.total).toBeGreaterThanOrEqual(30);
    expect(stats.projects).toBeGreaterThanOrEqual(5);
    expect(stats.byFormat.reduce((sum, row) => sum + row.count, 0)).toBe(stats.total);
    expect(stats.redundancy.redundant + stats.redundancy.single).toBe(stats.total);
    expect(stats.layers['r2']).toBeGreaterThan(0);
  });
});
