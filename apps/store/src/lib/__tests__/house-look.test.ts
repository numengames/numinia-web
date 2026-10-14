/**
 * The house look — numinia.org leads the design (the Oracle, 2026-09-29),
 * and numinia.com wears it as an app (the Oracle's design, 2026-10-14).
 *
 * These checks pin the measurable part of the app shell in the sources, so
 * a later edit cannot drift back silently: the sidebar (sticky, 252 px or
 * 76 px folded, the Khepri with the wordmark, the fold remembered before
 * paint, above the page), the top bar (sticky, 64 px of glass, no menu:
 * the door and ⋮ with the mode, the language and the settings), the phone's
 * tab bar, the folded footer (one copy, last in the page, pinned to the
 * sidebar's foot), the sprite, the page at the full width, the night sky,
 * the kit's entrance, primary button, eyebrows and the two radii. Pixels
 * stay with the Playwright gates; this is the contract they draw.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), '..', '..');
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8');

const CHROME = 'apps/store/src/components/chrome';
const SIDEBAR = `${CHROME}/Sidebar.astro`;
const TOPBAR = `${CHROME}/TopBar.astro`;
const TABBAR = `${CHROME}/TabBar.astro`;
const FOOTER = `${CHROME}/ShellFooter.astro`;
const SPRITE = `${CHROME}/ChromeSprite.astro`;
const SHELL = 'apps/store/src/styles/shell.css';
const LAYOUT = 'apps/store/src/layouts/BaseLayout.astro';
const STARFIELD = `${CHROME}/Starfield.astro`;
const LANDING = 'apps/store/src/components/Landing.astro';
const PLATFORM = 'packages/ui/src/platform.css';
const CODEX = 'apps/store/src/styles/codex.css';

/** Every `border-radius` value in a stylesheet, as written. */
const radii = (css: string): string[] =>
  [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => (m[1] ?? '').trim());

/** The body of the first rule whose selector list matches `selector`. */
const rule = (css: string, selector: RegExp): string => {
  const match = new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`).exec(css);
  return match?.[1] ?? '';
};

/** The phone's block of the shell stylesheet (860 px and below). */
const phone = (css: string): string =>
  /@media \(max-width: 53\.75rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

describe('the sidebar', () => {
  it('opens with the Khepri and the Numinia wordmark, in currentColor, named for a screen reader', async () => {
    const src = await read(SIDEBAR);
    expect(src).toContain("import wordmark from '@numinia/ui/assets/brand/Numinia_Word.svg?raw'");
    expect(src).toMatch(
      /class="lat-marca"[\s\S]*?data-metric="nav-home"[\s\S]*?aria-label="Numinia"/,
    );
    expect(src).toMatch(/<svg class="lat-khepri" fill="currentColor"[\s\S]*?symbolId\('khepri'\)/);
    const sprite = await read(SPRITE);
    expect(sprite).toContain("import khepri from '@numinia/ui/assets/brand/Khepri_Logo.svg?raw'");
    const css = await read(SHELL);
    expect(rule(css, /\.lat-marca:hover,\s*\.lat-marca:focus-visible/)).toMatch(
      /color:\s*var\(--enlace\)/,
    );
    expect(rule(css, /\.lat-khepri/)).toMatch(/height:\s*36px/);
  });

  it('is sticky, the window tall, 252 px or 76 px folded, and paints above the page', async () => {
    const css = await read(SHELL);
    expect(css).toMatch(/--app-lat:\s*252px/);
    expect(css).toMatch(/--app-lat-plegada:\s*76px/);
    const lat = rule(css, /\n\.lat/);
    expect(lat).toMatch(/position:\s*sticky/);
    expect(lat).toMatch(/height:\s*100vh/);
    const latZ = Number(/z-index:\s*(\d+)/.exec(lat)?.[1]);
    const cimaZ = Number(/z-index:\s*(\d+)/.exec(rule(css, /\n\.cima/))?.[1]);
    expect(latZ).toBeGreaterThan(cimaZ);
    expect(css).toMatch(/html\[data-sidebar='collapsed'\] \.app\s*\{[^}]*var\(--app-lat-plegada\)/);
  });

  it('remembers the fold on the device and applies it before the first paint', async () => {
    const layout = await read(LAYOUT);
    const boot = /<script is:inline>([\s\S]*?)<\/script>/.exec(layout)?.[1] ?? '';
    expect(boot).toContain("dataset.sidebar = localStorage.getItem('numinia-sidebar')");
    const src = await read(SIDEBAR);
    expect(src).toMatch(/class="lat-plegar"[\s\S]*?aria-expanded="true"/);
    expect(src).toContain('<Icon name="sidebar-simple"');
    expect(src).toContain('keep(SIDEBAR_KEY, next)');
    expect(src).toContain('fold.ariaExpanded = String(open)');
  });

  it('searches from a field with the «/» key, then the places of lib/app-nav', async () => {
    const src = await read(SIDEBAR);
    expect(src).toMatch(
      /class="lat-buscar"[\s\S]*?aria-keyshortcuts="\/"[\s\S]*?data-metric="nav-search"/,
    );
    expect(src).toContain('NAV_ITEMS.map');
    expect(src).toContain('EXPLORE_ITEMS.map');
    expect(src).toContain('data-metric={`nav-${item.id}`}');
    expect(src).toContain('<details class="lat-mas" name="shell-menu" data-popover>');
    expect(src).toContain('data-metric="nav-sign-in"');
    expect(src).toContain('COMMUNITIES.length');
  });

  it('tints icons and words with the link colour, never with a box', async () => {
    const css = await read(SHELL);
    expect(
      rule(css, /\.lat-item:hover,\s*\.lat-item:focus-visible,\s*\.lat-mas\[open\] > \.lat-item/),
    ).toMatch(/color:\s*var\(--enlace\)/);
    expect(rule(css, /\n\.lat-item/)).toMatch(/background:\s*none/);
    expect(rule(css, /\.lat-item\[aria-current\] \.icono/)).toMatch(/var\(--enlace\)/);
  });
});

describe('the sprite', () => {
  it('carries what the chrome draws twice, and the places draw it with <use>', async () => {
    const sprite = await read(SPRITE);
    expect(sprite).toContain('<svg class="sprite" aria-hidden="true">');
    expect(sprite).toContain('<Icon name="magnifying-glass" symbol />');
    expect(sprite).toContain('navIcon(item, navState(item, basePath))');
    expect(await read(SIDEBAR)).toContain('<Icon name={navIcon(item, state)} size={26} use />');
    expect(await read(TABBAR)).toContain('<Icon name={navIcon(item, state)} size={24} use />');
    const layout = await read(LAYOUT);
    expect(layout).toContain('{chrome && <ChromeSprite basePath={basePath} />}');
  });
});

describe('the top bar', () => {
  it('is sticky, 64 px of glass: the page at 86 % with a 24 px blur', async () => {
    const css = await read(SHELL);
    expect(css).toMatch(/--app-cima:\s*64px/);
    const cima = rule(css, /\n\.cima/);
    expect(cima).toMatch(/position:\s*sticky/);
    expect(cima).toMatch(/height:\s*var\(--app-cima\)/);
    const glass = rule(css, /\.cima::before/);
    expect(glass).toMatch(/color-mix\(in srgb, var\(--fondo\) 86%, transparent\)/);
    expect(glass).toMatch(/backdrop-filter:\s*blur\(24px\)/);
  });

  it('carries no menu: the door, then ⋮ with the mode, the language and the settings', async () => {
    const src = await read(TOPBAR);
    for (const metric of [
      'nav-home',
      'nav-search',
      'chrome-sign-in',
      'chrome-more',
      'chrome-mode',
      'chrome-settings',
    ]) {
      expect(src).toContain(`data-metric="${metric}"`);
    }
    expect(src).toContain('<LanguageMenu');
    expect(src).toContain('<Icon name="dots-three-vertical"');
    expect(src).toContain('<details class="cima-mas" name="shell-menu" data-popover>');
    expect(src).not.toMatch(
      /menu-movil|data-menu-btn|data-metric="chrome-menu"|nav-city|nav-assets|nav-lap/,
    );
  });

  it('the mode switch shows the mode you are in: moon with stars at night, sun by day', async () => {
    const src = await read(TOPBAR);
    expect(src).toMatch(/class="solo-nocturno"><Icon name="moon-stars"/);
    expect(src).toMatch(/class="solo-diurno"><Icon name="sun"/);
    const css = await read(SHELL);
    expect(css).toMatch(
      /html:not\(\[data-modo='diurno'\]\) \.pop-modo \.solo-diurno,\s*html\[data-modo='diurno'\] \.pop-modo \.solo-nocturno\s*\{\s*display:\s*none/,
    );
  });
});

describe('the phone', () => {
  it('swaps the sidebar for a fixed tab bar of the same five places, 56 px and the safe area', async () => {
    const src = await read(TABBAR);
    expect(src).toContain('NAV_ITEMS.map');
    expect(src).toContain('data-metric={`tab-${item.id}`}');
    const css = await read(SHELL);
    expect(css).toMatch(/--app-pestanas:\s*56px/);
    const block = phone(css);
    expect(block).toMatch(/\.lat\s*\{\s*display:\s*none/);
    expect(block).toMatch(
      /\.pestanas-app\s*\{[^}]*position:\s*fixed[^}]*padding-bottom:\s*env\(safe-area-inset-bottom/,
    );
    expect(block).toMatch(/\.pestanas-app a\s*\{[^}]*min-height:\s*var\(--app-pestanas\)/);
    expect(block).toMatch(/\.app,[^{]*\{[^}]*padding-bottom:\s*calc\(var\(--app-pestanas\)/);
  });

  it('closes the page with «Más» and the folded footer, so the legal texts stay reachable', async () => {
    const css = await read(SHELL);
    const block = phone(css);
    expect(block).toMatch(/\.app-pie,[^{]*\{[^}]*position:\s*static/);
    expect(block).toMatch(/\.mas-movil\s*\{\s*display:\s*block/);
  });
});

describe('the folded footer', () => {
  it('is one copy, last in the page after main, pinned to the sidebar foot on a desktop', async () => {
    const layout = await read(LAYOUT);
    expect(layout).toMatch(
      /<\/main>\s*<\/div>[\s\S]*?<div class="app-pie">\s*<nav class="mas-movil"[^>]*>\s*<MoreList locale=\{locale\} compact \/>\s*<\/nav>\s*<ShellFooter locale=\{locale\} \/>/,
    );
    expect(layout.match(/<ShellFooter /g)).toHaveLength(1);
    const css = await read(SHELL);
    const pie = rule(css, /\n\.app-pie/);
    expect(pie).toMatch(/position:\s*fixed/);
    expect(pie).toMatch(/bottom:\s*0/);
    expect(pie).toMatch(/width:\s*var\(--app-lat\)/);
    expect(rule(css, /\n\.lat/)).toMatch(/padding:\s*var\(--s4\) var\(--s3\) var\(--app-pie\)/);
  });

  it('names only Numen Games, Numinia (here) and the Archive — no NWOS, no social', async () => {
    const src = await read(FOOTER);
    expect(src).toContain('HOUSE_LINKS.map');
    expect(src).toContain('{t.footerThisSite}');
    expect(src).not.toContain('SOCIAL_LINKS');
    expect(src).not.toContain('footer-social');
  });

  it('folds the legal texts with the cookie choice and the build line, then signs and versions', async () => {
    const src = await read(FOOTER);
    for (const metric of [
      'footer-notice',
      'footer-privacy',
      'footer-cookies',
      'footer-terms',
      'footer-cookie-choice',
      'footer-licence',
      'footer-telemetry',
      'footer-commit',
      'footer-numen-signature',
      'footer-version',
      'footer-epitaph',
    ]) {
      expect(src).toContain(metric);
    }
    expect(src.match(/<details class="pie-pliegue">/g)).toHaveLength(2);
  });
});

describe('the page', () => {
  it('takes the full remaining width: 48 px sides on a desktop, 16 px on a phone', async () => {
    const css = await read(SHELL);
    expect(rule(css, /:where\(\.app-col\) > main/)).toMatch(/padding:\s*var\(--s2\) var\(--s7\)/);
    expect(css).not.toMatch(/\.app[^{]*\{[^}]*max-width:\s*1100px/);
    expect(phone(css)).toMatch(
      /:where\(\.app-col\) > main\s*\{\s*padding:\s*var\(--s2\) var\(--s4\)/,
    );
  });

  it('keeps the skip link first, the sky, and the reading column for the chromeless planes', async () => {
    const layout = await read(LAYOUT);
    const body = layout.slice(layout.indexOf('<body>'));
    expect(body.indexOf('class="saltar"')).toBeLessThan(body.indexOf('<Sidebar'));
    expect(body.indexOf('<Sidebar')).toBeLessThan(body.indexOf('<TopBar'));
    expect(body).toContain('<main id="contenido" tabindex="-1"');
    expect(layout).toContain('{chrome && <Starfield />}');
    expect(layout).toMatch(/\.plano\s*\{[^}]*max-width:\s*1100px/);
  });

  it('draws the night sky: 175 stars by rarity, still under reduced motion, none by day', async () => {
    const sky = await read(STARFIELD);
    expect(sky).toMatch(/<canvas[^>]*id="starfield"[^>]*aria-hidden="true"/);
    expect(sky).toContain('STAR_COUNT = 175');
    for (const weight of ['60', '25', '10', '4', '1']) {
      expect(sky).toMatch(new RegExp(`weight: ${weight}\\b`));
    }
    expect(sky).toContain('prefers-reduced-motion: reduce');
    expect(sky).toMatch(/html\[data-modo='diurno'\]\) #starfield[^{]*\{\s*display:\s*none/);
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

  it('the kit menu entries keep their rule (Turquesa, 0.7rem, 0.15em)', async () => {
    const css = await read(PLATFORM);
    expect(css).toMatch(/\.menu-entrada\[aria-current\]\s*\{[^}]*var\(--turquesa\)/);
    expect(css).toMatch(
      /\.menu-entrada\s*\{[^}]*font-size:\s*0\.7rem[^}]*letter-spacing:\s*0\.15em/,
    );
  });
});

describe('the two radii and the palette', () => {
  it('the shell draws only 6 px, 8 px or a circle, and never in Ámbar', async () => {
    const css = await read(SHELL);
    for (const value of radii(css)) {
      expect(value, `border-radius: ${value}`).toMatch(
        /^(?:var\(--radio-control\)|var\(--radio-marco\)|50%|0)$/,
      );
    }
    expect(css).not.toContain('var(--ambar)');
  });

  it('the Codex draws only 6 px, 8 px or a circle, and no stray line colour', async () => {
    const css = await read(CODEX);
    expect(css.toLowerCase()).not.toContain('#e4d6c4');
    for (const value of radii(css)) {
      expect(value, `border-radius: ${value}`).toMatch(/^(?:(?:0|6px|8px|50%)\s*)+$/);
    }
  });
});
