/**
 * The footer's build line must never lie about what it is: the version is
 * the updates timeline's, the SHA is the deploy's or an honest "dev", and
 * the commit link exists only when the SHA is real.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_VERSION } from '../updates';

async function loadFresh() {
  vi.resetModules();
  return import('../build-info');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('build-info', () => {
  it('prints the updates timeline version, never a hand-written one', async () => {
    const m = await loadFresh();
    expect(m.VERSION).toBe(CURRENT_VERSION);
    expect(m.VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('degrades to "dev" without a deploy SHA and links nowhere', async () => {
    vi.stubEnv('WORKERS_CI_COMMIT_SHA', '');
    const m = await loadFresh();
    expect(m.COMMIT_SHA).toBe('dev');
    expect(m.HAS_SHA).toBe(false);
    expect(m.COMMIT_URL).toBeNull();
  });

  it('shortens the deploy SHA to seven and links the commit on GitHub', async () => {
    vi.stubEnv('WORKERS_CI_COMMIT_SHA', 'deadbeefcafe0123456789');
    const m = await loadFresh();
    expect(m.COMMIT_SHA).toBe('deadbee');
    expect(m.HAS_SHA).toBe(true);
    expect(m.COMMIT_URL).toBe('https://github.com/numengames/numinia-web/commit/deadbee');
  });

  it('the licence link is the REUSE map of this repository', async () => {
    const m = await loadFresh();
    expect(m.LICENSE_URL).toBe('https://github.com/numengames/numinia-web/blob/main/REUSE.toml');
    expect(m.LICENSE_URL.startsWith(m.REPO_URL)).toBe(true);
  });
});
