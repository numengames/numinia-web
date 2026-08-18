/**
 * Design-source guarantees (MISSION-006 Phase A · ADR-022).
 *
 * The Sistema de Diseño is NOT kept in this repository: numinia-nwos governs
 * it and this repo only carries the kit files it actually ships, pinned in
 * design-source.json. These tests fail the build the moment a vendored copy is
 * edited by hand — the kit is generated from the .md and MUST NOT be rewritten
 * (§13.1). Drift against the upstream document is a network check and lives in
 * `npm run design:check`, out of the hermetic suite.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), '..', '..');
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8');

interface DesignSource {
  readonly source: { readonly version: string; readonly sha256: string; readonly repo: string };
  readonly vendored: Readonly<Record<string, { readonly sha256: string }>>;
}

const manifest = async (): Promise<DesignSource> =>
  JSON.parse(await read('design-source.json')) as DesignSource;

describe('pinned design source', () => {
  it('names the governing repo and a pinned version', async () => {
    const { source } = await manifest();
    expect(source.repo).toBe('numengames/numinia-nwos');
    expect(source.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('every vendored kit file matches its recorded digest', async () => {
    const { vendored } = await manifest();
    expect(Object.keys(vendored).length).toBeGreaterThan(0);
    for (const [path, { sha256 }] of Object.entries(vendored)) {
      const bytes = await readFile(join(root, path));
      expect(createHash('sha256').update(bytes).digest('hex'), path).toBe(sha256);
    }
  });

  it('ships the fonts the kit @font-face rules expect', async () => {
    await expect(read('packages/ui/src/assets/fonts/LICENSE-Geist.txt')).resolves.toContain(
      'SIL OPEN FONT LICENSE',
    );
    const css = await read('packages/ui/src/sistema.css');
    for (const font of ['Geist-Variable.woff2', 'GeistMono-Variable.woff2']) {
      expect(css).toContain(`assets/fonts/${font}`);
      await expect(
        readFile(join(root, 'packages/ui/src/assets/fonts', font)),
      ).resolves.toBeTruthy();
    }
  });

  it('the canonical palette reaches the CSS the apps consume', async () => {
    const css = await read('packages/ui/src/sistema.css');
    // The six canonical colors (§3.1) must reach the CSS verbatim.
    for (const hex of ['#A6DAD5', '#018EA1', '#EFA517', '#F9EBDC', '#F35059', '#D33440']) {
      expect(css).toContain(hex);
    }
  });

  it('the legacy bridge aliases Sistema variables and holds no palette hexes', async () => {
    const bridge = await read('packages/ui/src/tokens.css');
    expect(bridge).toContain("@import './sistema.css'");
    for (const alias of [
      '--numinia-color-primary: var(--turquesa)',
      '--numinia-font-sans: var(--sans)',
    ]) {
      expect(bridge).toContain(alias);
    }
    // No raw palette values outside the kit: the Sistema is the single source.
    expect(bridge).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
