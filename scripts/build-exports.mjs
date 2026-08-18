/**
 * Codex export editions (MIS-085 C, D6): the book always travels free.
 * One canonical MD → PDF (print stylesheet, Diurno) + EPUB (Kindle-ready,
 * Alegreya embedded, reserved-rights metadata), produced by the site's own
 * render engine and dropped into the built client dir as static downloads.
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
const manual = resolveManual(root);
const chapters = engine.splitManual(manual.text);
engine.buildManifest(chapters); // loud structural validation, same as the site
const version = engine.MANUAL_VERSION;

const ORDINALS = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo'];
const eyebrowOf = (chapter) =>
  chapter.number !== null
    ? `Capítulo ${ORDINALS[chapter.number - 1] ?? chapter.number}`
    : chapter.slug === 'el-espejo-roto'
      ? 'Módulo'
      : 'Introducción';

const rendered = chapters.map((chapter) => ({
  slug: chapter.slug,
  title: chapter.title,
  eyebrow: eyebrowOf(chapter),
  rendered: engine.renderChapter(chapter),
}));

// The character-sheet annex (§4.9) travels with every edition (D15: free).
rendered.push({
  slug: 'hoja-de-personaje',
  title: 'Hoja de Personaje',
  eyebrow: 'Anexo',
  rendered: engine.renderChapter({
    slug: 'hoja-de-personaje',
    title: 'Hoja de Personaje',
    number: null,
    access: 'public',
    raw: resolveDoc(root, 'hoja-de-personaje').text,
  }),
});

const glossary = engine.parseGlossary(resolveDoc(root, 'glosario').text);
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

const acknowledgmentsHtml = resolveDoc(root, 'agradecimientos')
  .text.replace(/^# .*\n/, '')
  .trim()
  .split(/\n\s*\n/)
  .map((block) => `<p>${escXml(block.replaceAll('\n', ' '))}</p>`)
  .join('\n');

// PROVISIONAL legal wording (D10) — same text the site's colophon carries.
const colofon =
  `<div class="colofon"><p>Numinia · Manual del juego de rol · versión ${version}<br/>` +
  `Autoría: Christian Märtens (80 %) · Pablo Fernández-Maquieira Martínez (20 %)<br/>` +
  `© 2026 Numen Games S.L. · Texto e ilustraciones: todos los derechos reservados · ` +
  `<em>nota provisional</em><br/>` +
  `Compuesto en Alegreya con el Sistema · La fuente de verdad vive en Git</p>` +
  `<p class="firma">numen games · leave things better than we found them</p></div>`;

const base = `Numinia_Manual_del_juego_de_rol_v${version.replaceAll('.', '_')}`;
mkdirSync(outDir, { recursive: true });

console.log(
  `build-exports: manual v${version}, ${chapters.length} chapters, ` +
    `${glossary.length} glossary terms${manual.fromFixture ? ' [FIXTURE edition]' : ''}`,
);

const cover = await coverJpeg(root, version);
const epubSections = [
  {
    id: 'cover',
    file: 'cover.xhtml',
    title: 'Cubierta',
    body: `<figure style="margin:0"><img src="../cover.jpg" alt="Numinia. El juego de rol — cubierta"/></figure>`,
  },
  ...rendered.map((chapter) => ({
    id: `c-${chapter.slug}`,
    file: `${chapter.slug}.xhtml`,
    title: chapter.title,
    eyebrow: chapter.eyebrow,
    rendered: {
      ...chapter.rendered,
      html: engine.linkGlossaryTerms(chapter.rendered.html, termTargets, 'glosario.xhtml'),
    },
  })),
  {
    id: 'glosario',
    file: 'glosario.xhtml',
    title: 'Glosario',
    body: `<h1>Glosario</h1>${glossaryHtml}`,
  },
  {
    id: 'agradecimientos',
    file: 'agradecimientos.xhtml',
    title: 'Agradecimientos',
    body: `<h1>Agradecimientos</h1>${acknowledgmentsHtml}`,
  },
  { id: 'colofon', file: 'colofon.xhtml', title: 'Colofón', body: colofon },
];
const epub = buildEpub(root, { version, sections: epubSections, coverJpeg: cover });
writeFileSync(path.join(outDir, `${base}.epub`), epub);
console.log(`build-exports: ${base}.epub — ${(epub.length / 1024).toFixed(0)}KB`);

const html = bookHtml(root, {
  version,
  chapters: rendered.map((chapter) => ({
    eyebrow: chapter.eyebrow,
    title: escXml(chapter.title),
    html: chapter.rendered.html,
  })),
  glossaryHtml,
  acknowledgmentsHtml,
  colofon,
});
const pdf = await printPdf(root, html);
writeFileSync(path.join(outDir, `${base}.pdf`), pdf);
console.log(`build-exports: ${base}.pdf — ${(pdf.length / 1024).toFixed(0)}KB`);
