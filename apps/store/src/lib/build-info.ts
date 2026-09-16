/**
 * What the footer says about itself: which version and which commit of the
 * site you are looking at. Same contract as numinia.org
 * (numinia-nwos/web/src/lib/build-info.ts) and as /version.json, which the
 * deploy workflow stamps from the same SHA (.github/workflows/deploy.yml).
 *
 * Neither value is written by hand: the version comes from the updates
 * timeline (the one place the number is maintained), the SHA from
 * WORKERS_CI_COMMIT_SHA, injected at build. Local builds have no SHA and
 * degrade to "dev" rather than fail — a developer running `astro dev`
 * should not need CI variables present.
 */
import { CURRENT_VERSION } from './updates';

export const VERSION: string = CURRENT_VERSION;

export const COMMIT_SHA: string = (() => {
  const sha = process.env.WORKERS_CI_COMMIT_SHA ?? '';
  return sha ? sha.slice(0, 7) : 'dev';
})();

export const HAS_SHA: boolean = COMMIT_SHA !== 'dev';

export const REPO_URL = 'https://github.com/numengames/numinia-web';

export const COMMIT_URL: string | null = HAS_SHA ? `${REPO_URL}/commit/${COMMIT_SHA}` : null;

/** The licence is not one: REUSE.toml assigns it per folder. Link the map. */
export const LICENSE_URL = `${REPO_URL}/blob/main/REUSE.toml`;
