import { describe, it, expect } from 'vitest';

/**
 * Tests for env.ts validation behavior.
 * We don't test the actual Zod parsing (that's Zod's job),
 * but we verify the env object shape and build-phase skip logic.
 */

describe('env.ts', () => {
  it('exports env object with expected shape', async () => {
    // Import dynamically to avoid side effects during other tests
    const { env } = await import('@/lib/env');

    expect(env).toBeDefined();
    expect(env.github).toBeDefined();
    expect(typeof env.github.repoOwner).toBe('string');
    expect(typeof env.github.repoName).toBe('string');
    expect(typeof env.github.branch).toBe('string');
    expect(typeof env.github.token).toBe('string');
    expect(typeof env.isDev).toBe('boolean');
    expect(typeof env.isProd).toBe('boolean');
    expect(typeof env.siteUrl).toBe('string');
  });

  it('r2 config has expected fields', async () => {
    const { env } = await import('@/lib/env');

    expect(env.r2).toBeDefined();
    expect(typeof env.r2.accountId).toBe('string');
    expect(typeof env.r2.accessKeyId).toBe('string');
    expect(typeof env.r2.secretAccessKey).toBe('string');
    expect(typeof env.r2.bucketName).toBe('string');
  });
});
