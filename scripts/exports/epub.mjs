/**
 * EPUB 3 assembly (MIS-085 C, D6): the canonical manual as a Kindle-ready
 * book — hand-built zip (mimetype stored first, per spec), per-chapter nav,
 * Alegreya embedded under its SIL OFL license, reserved-rights metadata
 * (D10 provisional wording). No pandoc: the chapter XHTML comes from the
 * site's own render engine, so web and EPUB can never drift apart.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';

const FONTS_DIR = path.join('packages', 'ui', 'src', 'assets', 'fonts');
const FONTS = [
  'Alegreya-Variable.woff2',
  'Alegreya-Italic-Variable.woff2',
  'AlegreyaSC-Regular.woff2',
  'AlegreyaSC-Medium.woff2',
];

const RIGHTS =
  '© 2026 Numen Games S.L. · Texto e ilustraciones: todos los derechos reservados (nota provisional)';

const CSS = `
@font-face { font-family: 'Alegreya'; src: url('../fonts/Alegreya-Variable.woff2') format('woff2'); font-weight: 400 900; font-style: normal; }
@font-face { font-family: 'Alegreya'; src: url('../fonts/Alegreya-Italic-Variable.woff2') format('woff2'); font-weight: 400 900; font-style: italic; }
@font-face { font-family: 'Alegreya SC'; src: url('../fonts/AlegreyaSC-Regular.woff2') format('woff2'); font-weight: 400; }
@font-face { font-family: 'Alegreya SC'; src: url('../fonts/AlegreyaSC-Medium.woff2') format('woff2'); font-weight: 500; }
body { font-family: 'Alegreya', 'Iowan Old Style', Palatino, Georgia, serif; line-height: 1.6; }
h1, h2, h3 { font-family: 'Alegreya SC', 'Alegreya', serif; font-weight: 500; line-height: 1.2; }
.portadilla { text-align: center; margin: 3em 0 2em; }
.portadilla .num { display: block; font-size: 0.8em; letter-spacing: 0.3em; text-transform: uppercase; color: #7a5100; margin-bottom: 1em; }
.lectura { border: 1px solid #7a5100; border-left-width: 4px; padding: 0.8em 1em; margin: 1.2em 0; font-style: italic; }
.nota-pie { font-size: 0.85em; color: #5a4f45; border-top: 1px dotted #c4b5a6; padding-top: 0.4em; margin: 1em 0; }
.tabla table { border-collapse: collapse; width: 100%; font-size: 0.9em; }
.tabla caption { font-family: 'Alegreya SC', serif; color: #7a5100; margin-bottom: 0.4em; }
.tabla th, .tabla td { border: 1px solid #c4b5a6; padding: 0.35em 0.5em; text-align: left; }
.lamina { margin: 1.5em 0; text-align: center; }
.lamina .arte-hueco { border: 1px dashed #c4b5a6; padding: 2em 1em; color: #75695e; font-size: 0.85em; }
.lamina figcaption { font-size: 0.8em; color: #75695e; }
dt { font-weight: 700; margin-top: 1em; }
dd { margin: 0.2em 0 0 1em; }
dd .fuente { display: block; font-size: 0.85em; color: #75695e; }
.colofon { text-align: center; font-size: 0.9em; color: #5a4f45; margin-top: 3em; }
`.trim();

function xhtml(title, body, lang = 'es') {
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n` +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ` +
    `lang="${lang}" xml:lang="${lang}">\n<head><meta charset="utf-8"/><title>${title}</title>` +
    `<link rel="stylesheet" type="text/css" href="../styles/codex.css"/></head>\n` +
    `<body>\n${body}\n</body>\n</html>\n`
  );
}

function esc(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Chapter body: portadilla + the render engine's HTML (already XHTML-safe:
 * every tag it emits is paired and every text node escaped). */
function chapterXhtml(meta, rendered, eyebrow) {
  const body =
    `<section epub:type="chapter" aria-label="${esc(meta.title)}">\n` +
    `<header class="portadilla"><span class="num">${esc(eyebrow)}</span>` +
    `<h1>${esc(meta.title)}</h1></header>\n${rendered.html}\n</section>`;
  return xhtml(esc(meta.title), body);
}

function navXhtml(entries) {
  const items = entries
    .map((entry) => `<li><a href="text/${entry.file}">${esc(entry.title)}</a></li>`)
    .join('\n');
  const body =
    `<nav epub:type="toc" aria-label="Índice"><h1>Índice</h1><ol>\n${items}\n</ol></nav>\n` +
    `<nav epub:type="landmarks" aria-label="Hitos" hidden=""><ol>` +
    `<li><a epub:type="cover" href="text/cover.xhtml">Cubierta</a></li>` +
    `<li><a epub:type="bodymatter" href="text/${entries[1].file}">Comienzo</a></li>` +
    `</ol></nav>`;
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n` +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" ` +
    `lang="es" xml:lang="es">\n<head><meta charset="utf-8"/><title>Índice</title>` +
    `<link rel="stylesheet" type="text/css" href="styles/codex.css"/></head>\n` +
    `<body>\n${body}\n</body>\n</html>\n`
  );
}

function contentOpf(version, entries, modified) {
  const manifest = [
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="css" href="styles/codex.css" media-type="text/css"/>`,
    `<item id="cover-img" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>`,
    ...FONTS.map(
      (font, index) => `<item id="font-${index}" href="fonts/${font}" media-type="font/woff2"/>`,
    ),
    ...entries.map(
      (entry) =>
        `<item id="${entry.id}" href="text/${entry.file}" media-type="application/xhtml+xml"/>`,
    ),
  ].join('\n    ');
  const spine = entries.map((entry) => `<itemref idref="${entry.id}"/>`).join('\n    ');
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="es">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:numinia:manual:${version}</dc:identifier>
    <dc:title>Numinia. El juego de rol</dc:title>
    <dc:language>es</dc:language>
    <dc:creator id="aut1">Christian Märtens</dc:creator>
    <dc:creator id="aut2">Pablo Fernández-Maquieira Martínez</dc:creator>
    <dc:publisher>Numen Games S.L.</dc:publisher>
    <dc:rights>${RIGHTS}</dc:rights>
    <dc:date>2026</dc:date>
    <meta property="dcterms:modified">${modified}</meta>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine>
    ${spine}
  </spine>
</package>
`;
}

const CONTAINER = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

/**
 * Assemble the .epub bytes.
 * sections: [{id, file, title, body?, rendered?, eyebrow?}] — either a
 * ready XHTML `body` or a render-engine `rendered` chapter.
 */
export function buildEpub(root, { version, sections, coverJpeg }) {
  const files = {
    // The spec's handshake: first entry, stored, exact bytes.
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(CONTAINER),
    'OEBPS/content.opf': strToU8(
      contentOpf(version, sections, new Date().toISOString().replace(/\.\d+Z$/, 'Z')),
    ),
    'OEBPS/nav.xhtml': strToU8(navXhtml(sections)),
    'OEBPS/styles/codex.css': strToU8(CSS),
    'OEBPS/cover.jpg': [new Uint8Array(coverJpeg), { level: 0 }],
  };
  for (const font of FONTS) {
    files[`OEBPS/fonts/${font}`] = [
      new Uint8Array(readFileSync(path.join(root, FONTS_DIR, font))),
      { level: 0 },
    ];
  }
  // Embedding license (SIL OFL 1.1) travels with the fonts it covers.
  files['OEBPS/fonts/LICENSE-Alegreya.txt'] = strToU8(
    readFileSync(path.join(root, FONTS_DIR, 'LICENSE-Alegreya.txt'), 'utf8'),
  );
  for (const section of sections) {
    const doc = section.rendered
      ? chapterXhtml(section, section.rendered, section.eyebrow ?? '')
      : xhtml(esc(section.title), section.body ?? '');
    files[`OEBPS/text/${section.file}`] = strToU8(doc);
  }
  return zipSync(files, { level: 9, mtime: new Date() });
}

export { esc as escXml };
