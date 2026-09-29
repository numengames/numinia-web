/**
 * The house look — numinia.org leads the design (the Oracle, 2026-09-29).
 *
 * The four sites of Numen Games must read as one family. These checks pin
 * the measurable part of that family resemblance in the sources, so a later
 * edit cannot drift back silently: the bar (sticky, 56 px, blurred, the
 * wordmark, Mono entries with a Phosphor icon, Turquesa for the active one,
 * a full-screen menu on phones), the 1100 px column, the night sky, the
 * entrance, the system primary button, Verdemar eyebrows, and the two radii.
 * Pixels stay with the Playwright gates; this is the contract they draw.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), '..', '..');
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8');

const HEADER = 'apps/store/src/components/chrome/SiteHeader.astro';
const FOOTER = 'apps/store/src/components/chrome/SiteFooter.astro';
const LAYOUT = 'apps/store/src/layouts/BaseLayout.astro';
const LANDING = 'apps/store/src/components/Landing.astro';
const PLATFORM = 'packages/ui/src/platform.css';
const CODEX = 'apps/store/src/styles/codex.css';

/** Every `border-radius` value in a stylesheet, as written. */
const radii = (css: string): string[] =>
  [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => (m[1] ?? '').trim());

describe('the bar, as numinia.org draws it', () => {
  it('keeps the wordmark as the first thing, named for a screen reader', async () => {
    const src = await read(HEADER);
    expect(src).toContain("import wordmark from '@numinia/ui/assets/brand/Numinia_Word.svg?raw'");
    expect(src).toMatch(/class="brand"[\s\S]*?aria-label="Numinia"[\s\S]*?set:html=\{wordmark\}/);
  });

  it('is sticky, 56 px high, the page at 85 % with a 24 px blur and a half hairline', async () => {
    const src = await read(HEADER);
    expect(src).toMatch(/position:\s*sticky/);
    expect(src).toMatch(/height:\s*56px/);
    expect(src).toMatch(/color-mix\(in srgb, var\(--fondo\) 85%, transparent\)/);
    expect(src).toMatch(/backdrop-filter:\s*blur\(24px\)/);
    expect(src).toMatch(
      /border-bottom:\s*1px solid color-mix\(in srgb, var\(--linea-f\) 50%, transparent\)/,
    );
    expect(src).toMatch(/max-width:\s*1100px/);
  });

  it('writes its entries in Mono 0.7rem, tracked 0.15em, each with a 14 px Phosphor icon', async () => {
    const src = await read(HEADER);
    expect(src).toMatch(/font-size:\s*0\.7rem/);
    expect(src).toMatch(/letter-spacing:\s*0\.15em/);
    expect(src).toMatch(/<Icon name=\{item\.icon\} size=\{14\} \/>/);
    expect(src).not.toMatch(/letter-spacing:\s*0\.1em/);
  });

  it('marks the active entry with a 2 px Turquesa underline, never Ámbar', async () => {
    const src = await read(HEADER);
    expect(src).toMatch(/\[aria-current='page'\][^}]*border-bottom-color:\s*var\(--turquesa\)/);
    expect(src).not.toContain('var(--ambar)');
  });

  it('on a phone, one 44 px button opens a full-screen panel with the same entries', async () => {
    const src = await read(HEADER);
    expect(src).toMatch(/aria-controls="menu-movil"/);
    expect(src).toMatch(/aria-expanded="false"/);
    expect(src).toMatch(/aria-label=\{t\.menuOpen\}/);
    expect(src).toMatch(/id="menu-movil"/);
  });

  it('the menu entries of the kit follow the same rule (Turquesa, 0.7rem, 0.15em)', async () => {
    const css = await read(PLATFORM);
    expect(css).toMatch(/\.menu-entrada\[aria-current\]\s*\{[^}]*var\(--turquesa\)/);
    expect(css).toMatch(
      /\.menu-entrada\s*\{[^}]*font-size:\s*0\.7rem[^}]*letter-spacing:\s*0\.15em/,
    );
  });
});

describe('the page', () => {
  it('reads in a 1100 px column and always closes with the house footer', async () => {
    const layout = await read(LAYOUT);
    expect(layout).toMatch(/main\s*\{[^}]*max-width:\s*1100px/);
    expect(layout).toMatch(/\{chrome && <SiteFooter locale=\{locale\} \/>\}/);
    const footer = await read(FOOTER);
    expect(footer).toMatch(/footer\s*\{[^}]*max-width:\s*1100px/);
    // The footer's headings are quiet (numinia.org's `text-dim`), never Ámbar.
    expect(footer).not.toContain('var(--ambar)');
  });

  it('draws the night sky: 175 stars by rarity, still under reduced motion, none by day', async () => {
    const layout = await read(LAYOUT);
    expect(layout).toMatch(/<canvas[^>]*id="starfield"[^>]*aria-hidden="true"/);
    expect(layout).toContain('STAR_COUNT = 175');
    for (const weight of ['60', '25', '10', '4', '1']) {
      expect(layout).toMatch(new RegExp(`weight: ${weight}\\b`));
    }
    expect(layout).toContain('prefers-reduced-motion: reduce');
    expect(layout).toMatch(/html\[data-modo='diurno'\]\) #starfield[^{]*\{\s*display:\s*none/);
  });

  it('opens with the entrance: label, headline, line, 600 ms, 100 ms apart', async () => {
    const css = await read(PLATFORM);
    expect(css).toMatch(/@keyframes entrada\s*\{[\s\S]*?translateY\(24px\)/);
    expect(css).toMatch(/entrada 600ms var\(--ciclo\)/);
    const landing = await read(LANDING);
    expect(landing).toMatch(/class="[^"]*\bentrada\b/);
    expect(landing).toContain('entrada-1');
    expect(landing).toContain('entrada-2');
  });

  it('headlines are Geist 400 at -0.025em', async () => {
    const css = await read(PLATFORM);
    expect(css).toMatch(
      /h1,\s*\.display-l,\s*\.display-m\s*\{[^}]*font-weight:\s*400[^}]*letter-spacing:\s*-0\.025em/,
    );
  });

  it('the primary button is the system primary (#017C8D, white), not an ink fill', async () => {
    const css = await read(PLATFORM);
    expect(css).not.toMatch(/\.btn-primario\s*\{[^}]*background:\s*var\(--texto\)/);
  });

  it('section eyebrows speak Verdemar (the link voice), not Ámbar', async () => {
    const css = await read(PLATFORM);
    expect(css).toMatch(/\.etiqueta\s*\{[^}]*color:\s*var\(--enlace\)/);
  });
});

describe('the two radii and the palette', () => {
  it('the Codex draws only 6 px, 8 px or a circle, and no stray line colour', async () => {
    const css = await read(CODEX);
    expect(css.toLowerCase()).not.toContain('#e4d6c4');
    for (const value of radii(css)) {
      expect(value, `border-radius: ${value}`).toMatch(/^(?:(?:0|6px|8px|50%)\s*)+$/);
    }
  });
});
