/**
 * Auth configuration — fail closed at boot (ADR-006 non-negotiable §2).
 * A missing or weak secret crashes naming the variable; there is no fallback.
 */

import { z } from 'zod';

const schema = z.object({
  AUTH_SESSION_SECRET: z.string().min(32, 'AUTH_SESSION_SECRET must be at least 32 characters'),
});

export interface AuthEnv {
  readonly sessionSecret: string;
}

export class AuthConfigError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid auth configuration:\n${issues.map((issue) => `  ${issue}`).join('\n')}`);
    this.name = 'AuthConfigError';
  }
}

export function formatIssue(issue: {
  readonly path: ReadonlyArray<string | number | symbol>;
  readonly message: string;
}): string {
  return `${issue.path.map(String).join('.')}: ${issue.message}`;
}

export function parseAuthEnv(input: Readonly<Record<string, string | undefined>>): AuthEnv {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AuthConfigError(result.error.issues.map(formatIssue));
  }
  return { sessionSecret: result.data.AUTH_SESSION_SECRET };
}
