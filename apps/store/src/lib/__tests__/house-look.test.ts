/**
 * The house look — numinia.org leads the design (the Oracle, 2026-09-29),
 * and numinia.com wears it as an app: since v0.112.0 «La ciudad y tú», two
 * mirrored rails (the city on the left, you on the right).
 *
 * These checks pin the measurable part of the app shell in the sources, so
 * a later edit cannot drift back silently: the rails (sticky, 256 px or
 * 72 px folded, the Khepri with the wordmark on the city's, the folds
 * applied before paint, above the page), the mirror of position but not of
 * reading, the menus outside the rails, the phone's header, bottom bar and
 * «Tú» sheet, the folded footer at the city's foot, the sprite, the page
 * at the full width, the night sky, the kit's entrance, primary button,
 * eyebrows and the two radii. Pixels stay with the Playwright gates; this
 * is the contract they draw.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(process.cwd(), '..', '..');
const read = (path: string): Promise<string> => readFile(join(root, path), 'utf8');

const CHROME = 'apps/store/src/components/chrome';
const CITY = `${CHROME}/CityRail.astro`;
const YOU = `${CHROME}/YouRail.astro`;
const PHONE_BAR = `${CHROME}/PhoneBar.astro`;
const PHONE_HEADER = `${CHROME}/PhoneHeader.astro`;
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

/** The phone-upright block of the shell stylesheet (below 768 px). */
const phone = (css: string): string =>
  /@media \(max-width: 767px\) and \(min-height: 541px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

describe('the rails', () => {
  it('the city opens with the Khepri and the Numinia wordmark, in currentColor, named for a screen reader', async () => {
    const src = await read(CITY);
    expect(src).toMatch(
      /class="rail-marca"[\s\S]*?data-metric="nav-home"[\s\S]*?aria-label="Numinia"/,
    );
    expect(src).toMatch(/<svg class="rail-khepri" fill="currentColor"[\s\S]*?symbolId\('khepri'\)/);
    expect(src).toMatch(
      /<svg class="rail-palabra" fill="currentColor"[\s\S]*?symbolId\('wordmark'\)/,
    );
    const sprite = await read(SPRITE);
    expect(sprite).toContain("import khepri from '@numinia/ui/assets/brand/Khepri_Logo.svg?raw'");
    expect(sprite).toContain(
      "import wordmark from '@numinia/ui/assets/brand/Numinia_Word.svg?raw'",
    );
    const css = await read(SHELL);
    expect(rule(css, /\.rail-marca:hover,\s*\.rail-marca:focus-visible/)).toMatch(
      /color:\s*var\(--enlace\)/,
    );
    expect(rule(css, /\.rail-khepri/)).toMatch(/height:\s*36px/);
  });

  it('are sticky, the window tall, 256 px or 72 px folded, one each side of the page', async () => {
    const css = await read(SHELL);
    expect(css).toMatch(/--rail:\s*256px/);
    expect(css).toMatch(/--rail-plegada:\s*72px/);
    const rail = rule(css, /\n\.rail/);
    expect(rail).toMatch(/position:\s*sticky/);
    expect(rail).toMatch(/height:\s*100vh/);
    expect(Number(/z-index:\s*(\d+)/.exec(rail)?.[1])).toBeGreaterThan(40);
    expect(rule(css, /\n\.app/)).toMatch(
      /grid-template-columns:\s*var\(--rail-izq\) minmax\(0, 1fr\) var\(--rail-der\)/,
    );
    expect(css).toMatch(
      /html\[data-rail-city='collapsed'\]\s*\{\s*--rail-izq:\s*var\(--rail-plegada\)/,
    );
    expect(css).toMatch(
      /html\[data-rail-you='collapsed'\]\s*\{\s*--rail-der:\s*var\(--rail-plegada\)/,
    );
  });

  it('remember each fold on the device and apply it before the first paint', async () => {
    const layout = await read(LAYOUT);
    const boot = /<script is:inline>([\s\S]*?)<\/script>/.exec(layout)?.[1] ?? '';
    expect(boot).toContain("localStorage.getItem('numinia-sidebar')");
    expect(boot).toContain("dataset.railCity = rail('city')");
    expect(boot).toContain("dataset.railYou = rail('you')");
    for (const src of [await read(CITY), await read(YOU)]) {
      expect(src).toMatch(/class="rail-plegar"[\s\S]*?aria-expanded="true"/);
      expect(src).toContain('<Icon name="sidebar-simple"');
    }
  });

  it('the city: search with «/», then its five places from lib/app-nav with their counts', async () => {
    const src = await read(CITY);
    expect(src).toMatch(
      /class="rail-caja"[\s\S]*?aria-keyshortcuts="\/"[\s\S]*?data-metric="nav-search"/,
    );
    expect(src).toContain('CITY_ITEMS.map');
    expect(src).toContain('data-metric={`nav-${item.id}`}');
    expect(src).toContain('communities: COMMUNITIES.length');
  });

  it('yours: the door or your face, «Crear», then your places; the menus live outside the rail', async () => {
    const src = await read(YOU);
    expect(src).toContain('data-metric="chrome-sign-in"');
    expect(src).toMatch(/popovertarget="menu-cara"[\s\S]*?data-metric="chrome-account"/);
    expect(src).toMatch(/popovertarget="menu-crear"[\s\S]*?data-metric="you-create"/);
    expect(src).toContain('YOU_ITEMS.map');
    expect(src).toContain('CREATE_ITEMS.map');
    const aside = src.indexOf('</aside>');
    expect(src.indexOf('id="menu-cara"')).toBeGreaterThan(aside);
    expect(src.indexOf('id="menu-crear"')).toBeGreaterThan(aside);
    // No presence: never a control that does nothing.
    expect(src).not.toMatch(/e-en-linea|frase de estado|yo-frase|data-presence/i);
  });

  it('mirror the position, never the reading: icon and word from the left on both rails', async () => {
    const css = await read(SHELL);
    expect(rule(css, /\n\.rail-item/)).not.toMatch(/flex-direction:\s*row-reverse/);
    expect(rule(css, /\n\.rail-n/)).toMatch(/margin-left:\s*-6px/);
  });

  it('tint icons and words with the link colour, never with a box', async () => {
    const css = await read(SHELL);
    expect(rule(css, /\.rail-item:hover,\s*\.rail-item:focus-visible/)).toMatch(
      /color:\s*var\(--enlace\)/,
    );
    expect(rule(css, /\n\.rail-item/)).not.toMatch(/background:/);
    expect(rule(css, /\.rail-item\[aria-current\] \.icono/)).toMatch(/var\(--enlace\)/);
  });
});

describe('the sprite', () => {
  it('carries what the chrome draws twice, and the places draw it with <use>', async () => {
    const sprite = await read(SPRITE);
    expect(sprite).toContain('<svg class="sprite" aria-hidden="true">');
    expect(sprite).toContain("'magnifying-glass',");
    expect(sprite).toContain('{icons.map((name) => <Icon name={name} symbol />)}');
    expect(sprite).toContain('navIcon(item, navState(item, basePath))');
    expect(await read(CITY)).toContain('<Icon name={navIcon(item, state)} size={24} use />');
    expect(await read(YOU)).toContain('<Icon name={navIcon(item, state)} size={24} use />');
    expect(await read(PHONE_BAR)).toContain('<Icon name={navIcon(item, state)} size={24} use />');
    const layout = await read(LAYOUT);
    expect(layout).toContain('{chrome && <ChromeSprite basePath={basePath} />}');
  });
});

describe('the phone', () => {
  it('swaps the rails for a header and a fixed bottom bar of four places and «Tú», 56 px and the safe area', async () => {
    const bar = await read(PHONE_BAR);
    expect(bar).toContain('PHONE_ITEMS.map');
    expect(bar).toContain('data-metric={`tab-${item.id}`}');
    expect(bar).toMatch(/popovertarget="hoja-tu"[\s\S]*?data-metric="tab-you"/);
    const header = await read(PHONE_HEADER);
    expect(header).toContain('data-metric="phone-bazaar"');
    expect(header).toContain('data-metric="phone-search"');
    const block = phone(await read(SHELL));
    expect(block).toMatch(/\.rail\s*\{\s*display:\s*none/);
    expect(block).toMatch(
      /\.barra-movil\s*\{[^}]*position:\s*fixed[^}]*env\(safe-area-inset-bottom/,
    );
    expect(block).toMatch(/min-height:\s*56px/);
  });

  it('opens «Tú» as a sheet above the bar, the bar staying', async () => {
    const block = phone(await read(SHELL));
    expect(block).toMatch(
      /\.hoja-tu:popover-open\s*\{[^}]*inset:\s*auto 0 calc\(var\(--barra-movil\)/,
    );
    expect(block).toMatch(/\.hoja-tu::backdrop\s*\{[^}]*bottom:\s*calc\(var\(--barra-movil\)/);
  });

  it('closes the page with the folded footer, so the legal texts stay reachable', async () => {
    const block = phone(await read(SHELL));
    expect(block).toMatch(/\.pie-movil\s*\{\s*display:\s*block/);
  });
});

describe('the folded footer', () => {
  it('sits at the city rail’s foot, and once more at a phone’s page end', async () => {
    expect(await read(CITY)).toContain('<ShellFooter locale={locale} />');
    const layout = await read(LAYOUT);
    expect(layout).toMatch(
      /<\/main>[\s\S]*?<div class="pie-movil">\s*<ShellFooter locale=\{locale\} where="page" \/>/,
    );
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
      'footer-back',
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
    expect(rule(css, /:where\(\.app-centro\) > main/)).toMatch(
      /padding:\s*var\(--s5\) var\(--s7\)/,
    );
    expect(css).not.toMatch(/\.app[^{]*\{[^}]*max-width:\s*1100px/);
    expect(phone(css)).toMatch(
      /:where\(\.app-centro\) > main\s*\{\s*padding:\s*var\(--s4\) var\(--s4\)/,
    );
  });

  it('keeps the skip link first, then the city, the page and you, and the reading column for the chromeless planes', async () => {
    const layout = await read(LAYOUT);
    const body = layout.slice(layout.indexOf('<body>'));
    expect(body.indexOf('class="saltar"')).toBeLessThan(body.indexOf('<CityRail'));
    expect(body.indexOf('<CityRail')).toBeLessThan(body.indexOf('<main id="contenido"'));
    expect(body.indexOf('<main id="contenido"')).toBeLessThan(body.indexOf('<YouRail'));
    expect(body).toContain('<main id="contenido" tabindex="-1"');
    expect(layout).toContain('{chrome && <Starfield />}');
    expect(layout).toMatch(/\.plano\s*\{[^}]*max-width:\s*1100px/);
  });

  it('raises tier-3 text to tier-2 on elevated surfaces and inside cards', async () => {
    const css = await read(SHELL);
    expect(css).toMatch(
      /:is\(\.pop, \.hoja-tu, \.tarjeta, dialog, \[role='dialog'\], \.bocadillo\)\s*\{\s*--texto-3:\s*var\(--texto-2\)/,
    );
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
