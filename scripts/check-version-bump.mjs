/**
 * check-version-bump — a change to the site must say what it changed.
 *
 * THE RULE (Oracle, 2026-09-16; one file per entry since 2026-10-27): every
 * pull request that touches apps/store/src/** adds ONE note file to
 * apps/store/src/content/updates/ (name YYYY-MM-DD-HHMM-slug.md, UTC). The
 * version is worked out from the number of files, so nobody writes or
 * bumps a version by hand and two open pull requests never edit the same
 * line. The footer prints that version and links to /updates; a version that
 * never moves tells the returning reader nothing.
 *
 * HOW: compare HEAD against its merge base with the base branch. If any
 * file under apps/store/src/ changed (other than the notes themselves) and no
 * note file was added, fail with the instruction. Two guards keep released
 * numbers stable, because the Nth file by name is the Nth release:
 *   - a note may not be deleted or renamed;
 *   - a new note's name must sort after every note on the tip of the base
 *     (a stale branch fixes it by renaming its file to a later time).
 *
 * Usage: node scripts/check-version-bump.mjs [--base <ref>]   (default origin/main)
 */
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args[baseIdx + 1] : 'origin/main';
const NOTES = 'apps/store/src/content/updates/';
const SCOPE = 'apps/store/src/';
// The communities' register is content, not the site: a community's page or
// ritual edited in GitHub's editor (the Oracle's «Edit», v0.85.0) publishes
// without a release note. Its pages still rebuild, and every gate still runs.
const CONTENT = 'apps/store/src/content/communities/';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const lines = (text) => text.split('\n').filter(Boolean);

let mergeBase;
try {
  mergeBase = sh(`git merge-base ${base} HEAD`);
} catch {
  console.log(`check-version-bump: cannot resolve ${base}; skipping (not a PR context).`);
  process.exit(0);
}

// `--no-renames` turns a rename into a delete plus an add, so both guards see it.
const diff = (filter) =>
  lines(sh(`git diff --no-renames --diff-filter=${filter} --name-only ${mergeBase} HEAD`));
const siteChanged = diff('ACDMRT').filter(
  (f) => f.startsWith(SCOPE) && !f.startsWith(NOTES) && !f.startsWith(CONTENT),
);
const notesAdded = diff('A').filter((f) => f.startsWith(NOTES) && f.endsWith('.md'));
const notesDeleted = diff('D').filter((f) => f.startsWith(NOTES));

if (notesDeleted.length > 0) {
  console.error(
    `check-version-bump: a note was deleted or renamed (${notesDeleted.join(', ')}).\n` +
      `  The Nth note by name is the Nth release, so removing one renumbers every later release. Restore it; to correct a note, edit it in place.`,
  );
  process.exit(1);
}

const newestOnBase = lines(sh(`git ls-tree -r --name-only ${base} -- ${NOTES}`))
  .sort()
  .at(-1);
const stale = notesAdded.filter((f) => newestOnBase !== undefined && f <= newestOnBase);
if (stale.length > 0) {
  console.error(
    `check-version-bump: ${stale.join(', ')} does not sort after ${newestOnBase}, already on ${base}.\n` +
      `  Rename the file with a later UTC time (YYYY-MM-DD-HHMM) so no released version changes number.`,
  );
  process.exit(1);
}

if (siteChanged.length === 0) {
  console.log(
    'check-version-bump: no change under apps/store/src (register content aside) — nothing to record.',
  );
  process.exit(0);
}
if (notesAdded.length === 0) {
  console.error(
    `check-version-bump: ${siteChanged.length} file(s) under ${SCOPE} changed and no release note was added.\n` +
      `  Add ONE file ${NOTES}YYYY-MM-DD-HHMM-slug.md (UTC) with lines "- NEW|FIX|UPD — what this change does for a visitor". The version is worked out from the number of notes; do not write one.\n` +
      `  Changed: ${siteChanged.slice(0, 8).join(', ')}${siteChanged.length > 8 ? ', …' : ''}`,
  );
  process.exit(1);
}
console.log(
  `check-version-bump: ${notesAdded.length} note(s) added (${notesAdded.map((f) => f.slice(NOTES.length)).join(', ')}), ${siteChanged.length} site file(s) changed.`,
);
