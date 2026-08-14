/**
 * Server-side environment for the store app.
 *
 * Single call site for `parseEnv` at module scope: any page importing this
 * during the SSG build (or any on-demand route at runtime) inherits the
 * fail-closed guarantee — a missing variable crashes before output exists.
 */

import { parseEnv, type DomainEnv } from '@numinia/domain';

export const env: DomainEnv = parseEnv(process.env);
