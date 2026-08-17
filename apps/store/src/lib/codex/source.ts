/**
 * Codex source resolution (MIS-085 Phase A), same two-source pattern as the
 * legacy reader: the real v0.6.0 manual arrives via `npm run lore:fetch`
 * into the gitignored .lore/ directory; hermetic/CI builds use the committed
 * synthetic fixture. Both are bundle-embedded (Workers have no node:fs).
 * DATA_SOURCE=fixture forces the fixture even when the real corpus exists.
 */
import { buildManifest, type CodexManifest } from './manifest.js';
import { splitManual, type CodexChapter } from './parse.js';

const loreFiles = import.meta.glob('../../../.lore/manual-v0_6_0.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureFiles = import.meta.glob('../../../fixtures/manual/manual-v0_6_0-fixture.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const realManual = Object.values(loreFiles)[0];
const fixtureManual = Object.values(fixtureFiles)[0];
// Direct property read on purpose (see src/lib/env.ts): bundlers replace
// `process.env.DATA_SOURCE`, which keeps this Worker-safe.
const resolved = (process.env.DATA_SOURCE === 'fixture' ? undefined : realManual) ?? fixtureManual;
if (resolved === undefined) {
  // Fail closed and loud: the fixture is committed, so this only fires if
  // the repo itself is broken — never silently render an empty Códex.
  throw new Error('Codex source missing: neither .lore/manual-v0_6_0.md nor the fixture resolved.');
}
const codexRaw: string = resolved;

export interface Codex {
  readonly chapters: readonly CodexChapter[];
  readonly manifest: CodexManifest;
}

/** The whole canonical file, verbatim — the free .md download (D6). */
export function codexSourceText(): string {
  return codexRaw;
}

let cache: Codex | null = null;

/** The v0.6.0 manual, split once per build from the canonical single file. */
export function loadCodex(): Codex {
  if (cache === null) {
    const chapters = splitManual(codexRaw);
    cache = { chapters, manifest: buildManifest(chapters) };
  }
  return cache;
}
