/**
 * Release notes as one file per entry (Oracle, 2026-10-27).
 *
 * A change used to add its note to the top of one array and raise a version
 * literal in a test, so two changes prepared at the same time always fought
 * over the same lines. Now each change adds ONE file to
 * `src/content/updates/` and nobody edits a shared line.
 *
 *   2026-10-27-2151-version-from-files.md
 *   ---
 *   missions: MIS-268, ADR-041        (optional)
 *   ---
 *   - FIX — what a visitor now sees, one line per entry
 *   - NEW — another entry
 *
 * The file name is `YYYY-MM-DD-HHMM-slug.md`, in UTC. Its date is the card's
 * date and its sort position is the card's release: the Nth file, oldest
 * first, is the Nth release after the frozen table in `updates.ts`. The
 * numbers are never written down, so they cannot collide; `check-version-bump`
 * keeps them stable by refusing a new file that sorts before an existing one
 * and refusing a deleted one.
 *
 * Pure: strings in, timeline out (the build feeds it `import.meta.glob`).
 */

import type { UpdateVersion } from './updates';

const NAME =
  /^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))-([01]\d|2[0-3])([0-5]\d)-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const ENTRY_LINE = /^- (NEW|FIX|UPD) — (\S.*)$/;
const MISSION_ID = /^[A-Z]+-\d+$/;
const FRONT_MATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const FROZEN_VERSION = /^v0\.(\d+)\.\d+$/;

type FragmentUpdate = Omit<UpdateVersion, 'version'>;

/** Read one note file. Throws, naming the file, on anything it cannot place. */
export function parseFragment(fileName: string, raw: string): FragmentUpdate & { source: string } {
  const name = NAME.exec(fileName);
  if (!name) {
    throw new Error(
      `updates/${fileName}: the name must be YYYY-MM-DD-HHMM-slug.md (UTC, a-z 0-9 -)`,
    );
  }
  let body = raw.replace(/\r\n/g, '\n');
  let missions: string[] | undefined;
  const front = FRONT_MATTER.exec(body);
  if (front) {
    body = body.slice(front[0].length);
    for (const line of (front[1] as string).split('\n')) {
      const field = /^missions: *(.+)$/.exec(line);
      if (!field)
        throw new Error(
          `updates/${fileName}: front matter allows only «missions: …», got «${line}»`,
        );
      missions = (field[1] as string).split(',').map((id) => id.trim());
      for (const id of missions) {
        if (!MISSION_ID.test(id))
          throw new Error(`updates/${fileName}: «${id}» is not a mission id (MIS-123)`);
      }
    }
  }
  const entries: UpdateVersion['entries'][number][] = [];
  for (const line of body.split('\n')) {
    if (line.trim() === '') continue;
    const entry = ENTRY_LINE.exec(line);
    if (!entry)
      throw new Error(`updates/${fileName}: expected «- NEW|FIX|UPD — text», got «${line}»`);
    entries.push({ type: entry[1] as 'NEW' | 'FIX' | 'UPD', text: entry[2] as string });
  }
  if (entries.length === 0) throw new Error(`updates/${fileName}: no entries`);
  return {
    date: `${name[1]} ${name[2]}:${name[3]}`,
    ...(missions ? { missions } : {}),
    entries,
    source: fileName,
  };
}

/**
 * The timeline the files make, newest first. Release N is the Nth file by
 * name, counted from the minor after `frozenNewest` (the last version written
 * by hand in `updates.ts`).
 */
export function buildFragmentUpdates(
  files: Readonly<Record<string, string>>,
  frozenNewest: string,
): readonly UpdateVersion[] {
  const frozen = FROZEN_VERSION.exec(frozenNewest);
  if (!frozen) throw new Error(`the frozen table must end at v0.N.x, got «${frozenNewest}»`);
  const firstMinor = Number(frozen[1]) + 1;
  const names = Object.keys(files)
    .map((path) => path.slice(path.lastIndexOf('/') + 1))
    .sort();
  const byName = new Map(
    Object.entries(files).map(([path, raw]) => [path.slice(path.lastIndexOf('/') + 1), raw]),
  );
  const updates = names.map((fileName, index) => ({
    version: `v0.${firstMinor + index}.0`,
    ...parseFragment(fileName, byName.get(fileName) as string),
  }));
  return updates.reverse();
}
