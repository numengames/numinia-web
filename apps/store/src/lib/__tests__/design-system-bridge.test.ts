/**
 * Design-system bridge guarantees (MISSION-006 Phase A).
 *
 * The kit is generated from the design .md and MUST NOT be rewritten (§13.1).
 * packages/ui carries a verbatim copy; this test fails the build the moment
 * the copy diverges from the canonical kit, and pins that the canonical
 * palette actually reaches the CSS the apps consume. The runtime copy of the
 * motion script travels the same way (BaseLayout inlines it).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), '..', '..');
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8');

describe('design-system kit copy', () => {
  it('is byte-identical to the canonical generated kit', async () => {
    const canonical = await read('design-system/kit/sistema.css');
    const copy = await read('packages/ui/src/sistema.css');
    expect(copy).toBe(canonical);
  });

  it('is the same script the layout inlines at runtime', async () => {
    const canonical = await read('design-system/kit/sistema.js');
    const copy = await read('apps/store/src/scripts/sistema.js');
    expect(copy).toBe(canonical);
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
});

describe('design-system tokens', () => {
  it('canonical palette values from tokens.json appear in the kit CSS', async () => {
    const tokens = JSON.parse(await read('design-system/kit/sistema.tokens.json')) as Record<
      string,
      unknown
    >;
    expect(Object.keys(tokens).length).toBeGreaterThan(0);
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
