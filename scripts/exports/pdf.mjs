/**
 * Print edition (MIS-085 C, D6): the whole book as ONE page dressed by the
 * site's own codex.css (its @media print block forces Diurno and the compact
 * paper rhythm), printed by headless Chromium with running headers and page
 * numbers. The cover image for the EPUB is a screenshot of the same portada
 * — one visual identity for every edition.
 */
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CSS_PATH = path.join('apps', 'store', 'src', 'styles', 'codex.css');
const FONTS_REL = '../../../../packages/ui/src/assets/fonts/';

const MARCO_PATH = 'M4 70 V14 Q4 4 14 4 H70 M4 30 Q14 30 18 22 Q22 14 30 14 M12 4 Q12 12 4 12';
const marcos = ['ne', 'no', 'se', 'so']
  .map(
    (corner) =>
      `<span class="marco ${corner}" aria-hidden="true"><svg viewBox="0 0 74 74">` +
      `<path d="${MARCO_PATH}"/></svg></span>`,
  )
  .join('');

/** The site stylesheet with its font URLs resolved to absolute file:// so a
 * scratch-file page finds them. */
function siteCss(root) {
  const fontsAbs = `${pathToFileURL(path.join(root, 'packages', 'ui', 'src', 'assets', 'fonts')).href}/`;
  return readFileSync(path.join(root, CSS_PATH), 'utf8').replaceAll(FONTS_REL, fontsAbs);
}

const BOOK_EXTRA = `
@media print {
  .codex .pliego { break-before: page; }
  .codex .portada-libro { break-after: page; }
  .codex .hoja { break-before: page; }
  .codex .toc-libro { list-style: none; padding: 0; }
  .codex .toc-libro li { margin: 0.5em 0; }
  /* Corner frames don't survive pagination: fragments leak across pages. */
  .codex .marco { display: none; }
  .codex .cap-abre { break-inside: avoid; }
}
`;

function portadaHtml(version) {
  return (
    `<header class="portada portada-libro dibujado">${marcos}` +
    `<p class="ed">Numen Games presenta</p>` +
    `<h1>Numi<span>n</span>ia</h1>` +
    `<p class="sub"><em>Un juego de rol entre planos: vapor, cobre y código.</em></p>` +
    `<div class="filete"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1">` +
    `<circle cx="16" cy="16" r="14" stroke-dasharray="3 2.4"></circle><path d="M16 6 26 16 16 26 6 16z"></path></svg></div>` +
    `<p class="aut">Christian Märtens · Pablo Fernández-Maquieira Martínez</p>` +
    `<p class="ver">manual del juego de rol · v${version} · edición impresa</p>` +
    `</header>`
  );
}

/** Assemble the full book as one printable HTML document. */
export function bookHtml(root, { version, chapters, glossaryHtml, acknowledgmentsHtml, colofon }) {
  const toc = chapters
    .map((chapter) => `<li><span class="n">${chapter.eyebrow}</span> · ${chapter.title}</li>`)
    .join('\n');
  const body = chapters
    .map(
      (chapter) =>
        `<article class="pliego"><header class="cap-abre dibujado">${marcos}` +
        `<span class="num">${chapter.eyebrow}</span><h2>${chapter.title}</h2></header>` +
        `<div class="pliego-int"><div class="cuerpo">${chapter.html}</div></div></article>`,
    )
    .join('\n');
  return (
    `<!doctype html><html lang="es"><head><meta charset="utf-8"/>` +
    `<title>Numinia. El juego de rol — v${version}</title>` +
    `<style>${siteCss(root)}</style><style>${BOOK_EXTRA}</style></head>` +
    `<body><div class="codex"><main class="lienzo">` +
    portadaHtml(version) +
    `<section class="hoja"><p class="etq">Índice</p><ul class="toc-libro">${toc}</ul></section>` +
    body +
    `<section class="hoja"><p class="etq">Glosario</p>${glossaryHtml}</section>` +
    `<section class="hoja"><p class="etq">Agradecimientos</p>${acknowledgmentsHtml}</section>` +
    `<section class="hoja">${colofon}</section>` +
    `</main></div></body></html>`
  );
}

async function chromiumFrom(root) {
  // Resolve from the app that owns the e2e stack; the CJS module hangs its
  // browser handles off the default export.
  const require = createRequire(path.join(root, 'apps', 'store', 'package.json'));
  const mod = await import(pathToFileURL(require.resolve('playwright')).href);
  return mod.default ?? mod;
}

/** Print the book HTML to PDF bytes (A4, Diurno, headers + page numbers). */
export async function printPdf(root, html) {
  const { chromium } = await chromiumFrom(root);
  const scratch = mkdtempSync(path.join(tmpdir(), 'codex-pdf-'));
  const file = path.join(scratch, 'libro.html');
  writeFileSync(file, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready');
    const template = (inner) =>
      `<div style="width:100%;font-size:7.5pt;color:#75695e;` +
      `font-family:Georgia,serif;padding:0 17mm;">${inner}</div>`;
    return await page.pdf({
      format: 'A4',
      margin: { top: '20mm', bottom: '18mm', left: '17mm', right: '17mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: template(`<span>Numinia · Manual del juego de rol</span>`),
      footerTemplate: template(
        `<span style="float:right"><span class="pageNumber"></span> / <span class="totalPages"></span></span>`,
      ),
    });
  } finally {
    await browser.close();
  }
}

/** Screenshot the portada as the EPUB cover (portrait, 1600×2560). */
export async function coverJpeg(root, version) {
  const { chromium } = await chromiumFrom(root);
  const html =
    `<!doctype html><html lang="es"><head><meta charset="utf-8"/>` +
    `<style>${siteCss(root)}</style>` +
    `<style>html,body{margin:0} .codex .portada{min-height:100vh}</style></head>` +
    `<body><div class="codex">${portadaHtml(version)}</div></body></html>`;
  const scratch = mkdtempSync(path.join(tmpdir(), 'codex-cover-'));
  const file = path.join(scratch, 'cubierta.html');
  writeFileSync(file, html);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 800, height: 1280 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready');
    return await page.screenshot({ type: 'jpeg', quality: 85 });
  } finally {
    await browser.close();
  }
}
