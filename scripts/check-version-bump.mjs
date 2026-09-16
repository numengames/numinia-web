/**
 * check-version-bump — a change to the site must say what it changed.
 *
 * THE RULE (Oracle, 2026-09-16): every pull request that touches
 * apps/store/src/** adds an entry to REBUILD_UPDATES in
 * apps/store/src/lib/updates.ts and raises the version. The footer prints
 * that version and links to /updates; a version that never moves tells the
 * returning reader nothing, and a timeline nobody is forced to write goes
 * stale in two weeks.
 *
 * HOW: compare HEAD against its merge base with the base branch. If any
 * file under apps/store/src/ changed (other than updates.ts itself) and the
 * newest version in updates.ts is unchanged, fail with the instruction.
 *
 * Usage: node scripts/check-version-bump.mjs [--base <ref>]   (default origin/main)
 */
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args[baseIdx + 1] : 'origin/main';
const UPDATES = 'apps/store/src/lib/updates.ts';
const SCOPE = 'apps/store/src/';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

let mergeBase;
try {
  mergeBase = sh(`git merge-base ${base} HEAD`);
} catch {
  console.log(`check-version-bump: cannot resolve ${base}; skipping (not a PR context).`);
  process.exit(0);
}

const changed = sh(`git diff --name-only ${mergeBase} HEAD`).split('\n').filter(Boolean);
const siteChanged = changed.filter((f) => f.startsWith(SCOPE) && f !== UPDATES);
if (siteChanged.length === 0) {
  console.log('check-version-bump: no change under apps/store/src — nothing to record.');
  process.exit(0);
}

// The first `version: 'vX.Y.Z'` in the file is the newest (newest first).
const versionOf = (src) => /version:\s*'(v\d+\.\d+\.\d+)'/.exec(src)?.[1] ?? null;
const headVersion = versionOf(sh(`git show HEAD:${UPDATES}`));
let baseVersion = null;
try {
  baseVersion = versionOf(sh(`git show ${mergeBase}:${UPDATES}`));
} catch {
  /* updates.ts did not exist on the base */
}

if (!headVersion) {
  console.error(`check-version-bump: ${UPDATES} has no version entry.`);
  process.exit(1);
}
if (baseVersion === headVersion) {
  console.error(
    `check-version-bump: ${siteChanged.length} file(s) under ${SCOPE} changed and the version is still ${headVersion}.\n` +
      `  Add an entry at the top of REBUILD_UPDATES in ${UPDATES} with the next version and what this change does for a visitor.\n` +
      `  Changed: ${siteChanged.slice(0, 8).join(', ')}${siteChanged.length > 8 ? ', …' : ''}`,
  );
  process.exit(1);
}
console.log(`check-version-bump: ${baseVersion ?? '(none)'} → ${headVersion}, ${siteChanged.length} site file(s) changed.`);
