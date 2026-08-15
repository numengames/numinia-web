/**
 * State configuration — fail closed at boot (ADR-018, same doctrine as
 * @numinia/auth). A missing variable crashes naming itself; no fallback.
 * The token is the crown jewel: fine-grained, scoped to the ONE state repo.
 */

import { z } from 'zod';

const schema = z.object({
  STATE_REPO_OWNER: z.string().min(1, 'STATE_REPO_OWNER must be set'),
  STATE_REPO_NAME: z.string().min(1, 'STATE_REPO_NAME must be set'),
  STATE_GITHUB_TOKEN: z.string().min(20, 'STATE_GITHUB_TOKEN looks too short to be real'),
  STATE_BRANCH: z.string().min(1).optional(),
});

export interface StateEnv {
  readonly owner: string;
  readonly repo: string;
  readonly token: string;
  readonly branch: string;
}

export class StateConfigError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid state configuration:\n${issues.map((issue) => `  ${issue}`).join('\n')}`);
    this.name = 'StateConfigError';
  }
}

export function parseStateEnv(input: Readonly<Record<string, string | undefined>>): StateEnv {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new StateConfigError(
      parsed.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`),
    );
  }
  return {
    owner: parsed.data.STATE_REPO_OWNER,
    repo: parsed.data.STATE_REPO_NAME,
    token: parsed.data.STATE_GITHUB_TOKEN,
    branch: parsed.data.STATE_BRANCH ?? 'main',
  };
}
