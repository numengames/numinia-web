/**
 * Server-side environment for the store app.
 *
 * Single call site for `parseEnv` at module scope: any page importing this
 * during the SSG build (or any on-demand route at runtime) inherits the
 * fail-closed guarantee — a missing variable crashes before output exists.
 *
 * The keys are listed ONE BY ONE on purpose: bundlers replace property reads
 * (`process.env.X`), never the whole object, so this is what lets the same
 * code prerender inside a Cloudflare Worker, which has no process.env at all.
 */

import { parseEnv, type DomainEnv } from '@numinia/domain';

export const env: DomainEnv = parseEnv({
  GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
  GITHUB_BRANCH: process.env.GITHUB_BRANCH,
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
  DATA_SOURCE: process.env.DATA_SOURCE,
});
