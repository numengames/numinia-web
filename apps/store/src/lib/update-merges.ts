/**
 * Where each version of the site was merged (the Oracle, 2026-10-15: from
 * every version card «tienes que poder ir a ver exactamente cada uno de los
 * merges … al GitHub»). Pure: a version in, an address out.
 *
 * MERGED_PRS was backfilled once from `git log origin/main --format=%s`:
 * squash titles end in «(vX.Y.Z) (#N)» (or «(…, vX.Y.Z) (#N)»), plus v0.89.0
 * → #122, open when the map was written. A version without a pull request
 * of its own (the early rebuild pushed straight to main) falls back to
 * GitHub's search of merged pull requests whose title carries the version.
 * The legacy versions (v0.1.0–v0.15.0, content/legacy-changelog.md) belong
 * to the retired numinia.store line and get no link.
 *
 * The integrator adds the new version's number here with each release.
 */

import { REPO_URL } from './build-info';

/** Version → number of the pull request that merged it. Newest first. */
export const MERGED_PRS: Readonly<Record<string, number>> = {
  'v0.90.0': 123,
  'v0.89.0': 122,
  'v0.88.0': 120,
  'v0.87.0': 119,
  'v0.86.0': 118,
  'v0.85.0': 117,
  'v0.84.0': 116,
  'v0.83.0': 112,
  'v0.82.0': 111,
  'v0.81.0': 110,
  'v0.80.0': 107,
  'v0.79.0': 106,
  'v0.78.0': 104,
  'v0.77.0': 103,
  'v0.76.1': 102,
  'v0.76.0': 96,
  'v0.75.1': 95,
  'v0.75.0': 94,
  'v0.74.0': 93,
  'v0.73.0': 92,
  'v0.72.0': 91,
  'v0.71.0': 81,
  'v0.70.0': 80,
  'v0.69.0': 79,
  'v0.68.1': 73,
  'v0.68.0': 72,
  'v0.67.0': 71,
  'v0.66.0': 70,
  'v0.65.0': 69,
  'v0.64.0': 68,
  'v0.63.0': 67,
  'v0.62.0': 66,
  'v0.61.0': 65,
  'v0.60.0': 64,
  'v0.59.0': 63,
  'v0.58.0': 53,
  'v0.54.0': 42,
  'v0.53.0': 36,
  'v0.52.1': 35,
};

/** The last version of the legacy numinia.store line (its record has no PRs here). */
export const LAST_LEGACY_MINOR = 15;

const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/;
/** A note file's name (content/updates/): only characters that cannot break out of a URL. */
const NOTE_FILE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}-[a-z0-9-]+\.md$/;

/** Whether a version belongs to the legacy line (v0.1.0–v0.15.0). */
export function isLegacyVersion(version: string): boolean {
  const parts = SEMVER.exec(version);
  return parts !== null && parts[1] === '0' && Number(parts[2]) <= LAST_LEGACY_MINOR;
}

/**
 * The GitHub address of a version's merge: its pull request when known,
 * else — for a version made by a note file — the history of that file, whose
 * one commit is the merge, else the search of merged pull requests whose
 * title carries the version. Null for the legacy line and for anything that
 * is not a version.
 */
export function mergeUrl(version: string, source?: string): string | null {
  if (!SEMVER.test(version) || isLegacyVersion(version)) return null;
  // The regex admits only «vX.Y.Z», so no lookup can land on an Object.prototype name.
  const pr = MERGED_PRS[version];
  if (pr !== undefined) return `${REPO_URL}/pull/${pr}`;
  if (source !== undefined && NOTE_FILE.test(source)) {
    return `${REPO_URL}/commits/main/apps/store/src/content/updates/${source}`;
  }
  const query = encodeURIComponent(`is:pr is:merged in:title "${version}"`).replace(/%20/g, '+');
  return `${REPO_URL}/pulls?q=${query}`;
}
