/**
 * Codex export editions (MIS-085 C, D6): the book always travels free.
 * One canonical MD → PDF (print stylesheet, Diurno) + EPUB (Kindle-ready,
 * Alegreya embedded, CC0 rights metadata), produced by the site's own
 * render engine and dropped into the built client dir as static downloads.
 *
 * Two editions, like the reader: the Spanish original
 * (Numinia_Manual_del_juego_de_rol_v…) and the English edition
 * (Numinia_The_Roleplaying_Game_Manual_v…), each with its own glossary,
 * acknowledgments and character sheet. An English source that has not
 * landed yet falls back to the Spanish one, as on the site.
 *
 * Usage: node scripts/build-exports.mjs   (requires apps/store/dist to exist;
 * run after `astro build`, before deploy/e2e. DATA_SOURCE=fixture builds the
 * hermetic edition for gates; deploys build from the fetched .lore corpus.)
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadCodexEngine, resolveDoc, resolveManual } from './exports/engine.mjs';
import { buildEpub, escXml } from './exports/epub.mjs';
import { bookHtml, coverJpeg, printPdf } from './exports/pdf.mjs';

const root = process.cwd();
const outDir = path.join(root, 'apps', 'store', 'dist', 'client', 'descargas');
if (!existsSync(path.join(root, 'apps', 'store', 'dist', 'client'))) {
  console.error('build-exports: apps/store/dist/client missing — run the build first.');
  process.exit(1);
}

const engine = await loadCodexEngine(root);
const version = engine.MANUAL_VERSION;
mkdirSync(outDir, { recursive: true });

/** Words of the exported book that the reader's chrome does not carry. */
const EXPORT = {
  es: {
    coverTitle: 'Cubierta',
    coverAlt: 'Numinia. El juego de rol — cubierta',
    colophon: 'Colofón',
    glossaryFile: 'glosario',
    acknowledgmentsFile: 'agradecimientos',
    sheetSlug: 'hoja-de-personaje',
  },
  en: {
    coverTitle: 'Cover',
    coverAlt: 'Numinia. The Roleplaying Game — cover',
    colophon: 'Colophon',
    glossaryFile: 'glossary',
    acknowledgmentsFile: 'acknowledgments',
    sheetSlug: 'character-sheet',
  },
};

async function exportEdition(lang) {
  const ui = engine.CODEX_UI[lang];
  const words = EXPORT[lang];
  const manual = resolveManual(root, lang);
  const chapters = engine.splitManual(manual.text);
  engine.buildManifest(chapters); // loud structural validation, same as the site

  const eyebrowOf = (chapter) =>
    chapter.number !== null
      ? ui.chapterKicker(chapter.number)
      : chapter.slug === 'el-espejo-roto' || chapter.slug === 'the-broken-mirror'
        ? ui.moduleKicker
        : ui.introKicker;

  const rendered = chapters.map((chapter) => ({
    slug: chapter.slug,
    title: chapter.title,
    eyebrow: eyebrowOf(chapter),
    rendered: engine.renderChapter(chapter),
  }));

  // The character-sheet annex (§4.9) travels with every edition (D15: free).
  rendered.push({
    slug: words.sheetSlug,
    title: ui.sheet.name,
    eyebrow: ui.annex,
    rendered: engine.renderChapter({
      slug: words.sheetSlug,
      title: ui.sheet.name,
      number: null,
      access: 'public',
      raw: resolveDoc(root, 'hoja-de-personaje', lang).text,
    }),
  });

  const glossary = engine.parseGlossary(resolveDoc(root, 'glosario', lang).text);
  const glossaryHtml =
    `<dl>` +
    glossary
      .map(
        (entry) =>
          `<dt id="${engine.slugify(entry.term)}">${escXml(entry.term)}</dt>` +
          `<dd>${escXml(entry.definition)}` +
          (entry.source ? `<span class="fuente">${escXml(entry.source)}</span>` : '') +
          `</dd>`,
      )
      .join('') +
    `</dl>`;
  // The EPUB edition links each chapter's first term mention to the
  // glossary (§4.8), same engine as the site; print keeps plain ink.
  const termTargets = engine.glossaryVariants(glossary);
  const glossaryFile = `${words.glossaryFile}.xhtml`;

  const acknowledgmentsHtml = resolveDoc(root, 'agradecimientos', lang)
    .text.replace(/^# .*\n/, '')
    .trim()
    .split(/\n\s*\n/)
    .map((block) => `<p>${escXml(block.replaceAll('\n', ' '))}</p>`)
    .join('\n');

  // Same text the site's colophon carries: the lore is CC0 (2026-09-24).
  const c = ui.colophon;
  const colofon =
    `<div class="colofon"><p>${escXml(c.line1(version))}<br/>` +
    `${escXml(c.line2)}<br/>` +
    `${escXml(c.line3)}<br/>` +
    `${escXml(c.line4)}</p>` +
    `<p class="firma">numen games · leave things better than we found them</p></div>`;

  const base = engine.codexBookBase(lang, version);

  console.log(
    `build-exports [${lang}]: manual v${version}, ${chapters.length} chapters, ` +
      `${glossary.length} glossary terms${manual.fromFixture ? ' [FIXTURE edition]' : ''}`,
  );

  const cover = await coverJpeg(root, version, lang);
  const epubSections = [
    {
      id: 'cover',
      file: 'cover.xhtml',
      title: words.coverTitle,
      body: `<figure style="margin:0"><img src="../cover.jpg" alt="${escXml(words.coverAlt)}"/></figure>`,
    },
    ...rendered.map((chapter) => ({
      id: `c-${chapter.slug}`,
      file: `${chapter.slug}.xhtml`,
      title: chapter.title,
      eyebrow: chapter.eyebrow,
      rendered: {
        ...chapter.rendered,
        html: engine.linkGlossaryTerms(chapter.rendered.html, termTargets, glossaryFile),
      },
    })),
    {
      id: words.glossaryFile,
      file: glossaryFile,
      title: ui.glossary.name,
      body: `<h1>${escXml(ui.glossary.name)}</h1>${glossaryHtml}`,
    },
    {
      id: words.acknowledgmentsFile,
      file: `${words.acknowledgmentsFile}.xhtml`,
      title: ui.home.acknowledgments,
      body: `<h1>${escXml(ui.home.acknowledgments)}</h1>${acknowledgmentsHtml}`,
    },
    { id: 'colofon', file: 'colofon.xhtml', title: words.colophon, body: colofon },
  ];
  const epub = buildEpub(root, { version, sections: epubSections, coverJpeg: cover, lang });
  writeFileSync(path.join(outDir, `${base}.epub`), epub);
  console.log(`build-exports: ${base}.epub — ${(epub.length / 1024).toFixed(0)}KB`);

  const html = bookHtml(root, {
    version,
    lang,
    chapters: rendered.map((chapter) => ({
      eyebrow: chapter.eyebrow,
      title: escXml(chapter.title),
      html: chapter.rendered.html,
    })),
    glossaryHtml,
    acknowledgmentsHtml,
    colofon,
  });
  const pdf = await printPdf(root, html, lang);
  writeFileSync(path.join(outDir, `${base}.pdf`), pdf);
  console.log(`build-exports: ${base}.pdf — ${(pdf.length / 1024).toFixed(0)}KB`);
}

await exportEdition('es');
await exportEdition('en');
