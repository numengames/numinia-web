/**
 * Environment validation — fail closed, at boot, naming the variable.
 * Missing config must crash before the server binds (MISSION-000 scenario;
 * legacy audit rule 4: security never degrades silently).
 */

import { z } from 'zod';

const envSchema = z.object({
  GITHUB_REPO_OWNER: z.string().min(1, 'GITHUB_REPO_OWNER is required'),
  GITHUB_REPO_NAME: z.string().min(1, 'GITHUB_REPO_NAME is required'),
  GITHUB_BRANCH: z.string().min(1).default('main'),
  /** Optional in Phase 0: public raw reads need no auth. Empty string = absent. */
  GITHUB_TOKEN: z.string().optional(),
  PUBLIC_SITE_URL: z.url().default('http://localhost:4321'),
  /** 'fixture' builds hermetically from a committed catalog snapshot (offline/CI). */
  DATA_SOURCE: z.enum(['network', 'fixture']).default('network'),
});

export interface DomainEnv {
  readonly githubRepoOwner: string;
  readonly githubRepoName: string;
  readonly githubBranch: string;
  readonly githubToken: string | null;
  readonly publicSiteUrl: string;
  readonly dataSource: 'network' | 'fixture';
}

export class EnvValidationError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid environment variables:\n${issues.map((issue) => `  ${issue}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Pure and side-effect free so the crash behavior itself is testable
 * (the legacy env module was untestable by construction).
 */
export function parseEnv(input: Readonly<Record<string, string | undefined>>): DomainEnv {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }
  const parsed = result.data;
  return {
    githubRepoOwner: parsed.GITHUB_REPO_OWNER,
    githubRepoName: parsed.GITHUB_REPO_NAME,
    githubBranch: parsed.GITHUB_BRANCH,
    githubToken: parsed.GITHUB_TOKEN ? parsed.GITHUB_TOKEN : null,
    publicSiteUrl: parsed.PUBLIC_SITE_URL,
    dataSource: parsed.DATA_SOURCE,
  };
}
