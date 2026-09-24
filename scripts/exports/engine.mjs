/**
 * Export engine loader (MIS-085 C): the site's OWN codex modules, run under
 * plain Node. esbuild bundles the TypeScript render/parse/manifest modules
 * (they are Vite-free by design) so the exports are produced by the exact
 * same engine the reader uses — never a parallel parser. The manual text is
 * sacred; one engine keeps it that way.
 */
import { Buffer } from 'node:buffer';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const LIB = path.join('apps', 'store', 'src', 'lib', 'codex');
const I18N = path.join('apps', 'store', 'src', 'i18n');

/** Bundle the codex TS modules and import them as one ESM module. */
export async function loadCodexEngine(root) {
  const { build } = await import('esbuild');
  const lib = path.resolve(root, LIB).replaceAll('\\', '/');
  const i18n = path.resolve(root, I18N).replaceAll('\\', '/');
  const entry = [
    `export { splitManual, chapterAnchors, slugify } from '${lib}/parse.ts';`,
    `export { buildManifest, MANUAL_VERSION } from '${lib}/manifest.ts';`,
    `export { renderChapter, chapterPreview } from '${lib}/render.ts';`,
    `export { parseGlossary } from '${lib}/glossary.ts';`,
    `export { glossaryVariants, linkGlossaryTerms } from '${lib}/terms.ts';`,
    `export { CODEX_UI, codexBookBase } from '${i18n}/codex.ts';`,
  ].join('\n');
  const result = await build({
    stdin: { contents: entry, resolveDir: path.resolve(root, 'apps', 'store'), loader: 'js' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    logLevel: 'silent',
  });
  const code = Buffer.from(result.outputFiles[0].contents).toString('base64');
  return import(`data:text/javascript;base64,${code}`);
}

/** Two-source resolution, mirroring src/lib/codex/source.ts and docs.ts:
 * DATA_SOURCE=fixture forces the committed fixture; otherwise the fetched
 * .lore file wins and the fixture is the hermetic fallback. */
function resolveText(root, realPath, fixturePath, label) {
  const real = path.join(root, realPath);
  const fixture = path.join(root, fixturePath);
  const chosen =
    process.env.DATA_SOURCE === 'fixture' ? fixture : existsSync(real) ? real : fixture;
  if (!existsSync(chosen)) {
    throw new Error(`build-exports: ${label} missing — neither ${realPath} nor its fixture.`);
  }
  return { text: readFileSync(chosen, 'utf8'), fromFixture: chosen === fixture };
}

/** The manual of one edition. English falls back to the Spanish text
 * when the English corpus is absent — same rule as source.ts. */
export function resolveManual(root, lang = 'es') {
  const english = 'apps/store/.lore/manual-v0_6_0.en.md';
  if (
    lang === 'en' &&
    process.env.DATA_SOURCE !== 'fixture' &&
    existsSync(path.join(root, english))
  ) {
    return { text: readFileSync(path.join(root, english), 'utf8'), fromFixture: false };
  }
  return resolveText(
    root,
    'apps/store/.lore/manual-v0_6_0.md',
    'apps/store/fixtures/manual/manual-v0_6_0-fixture.md',
    'manual',
  );
}

/** English file names of the edition matter (lore/codex/en/), as in docs.ts. */
const DOC_EN = {
  glosario: 'glossary',
  agradecimientos: 'acknowledgments',
  'hoja-de-personaje': 'character-sheet',
};

export function resolveDoc(root, name, lang = 'es') {
  if (lang === 'en') {
    const dir =
      process.env.DATA_SOURCE === 'fixture'
        ? 'apps/store/fixtures/codex/en'
        : 'apps/store/.lore/codex/en';
    const english = path.join(root, dir, `${DOC_EN[name]}.md`);
    if (existsSync(english)) {
      const text = readFileSync(english, 'utf8');
      return {
        text: text.replaceAll(/<!--[\s\S]*?-->/g, '').trim(),
        fromFixture: dir.includes('fixtures'),
      };
    }
  }
  const { text, fromFixture } = resolveText(
    root,
    `apps/store/.lore/codex/${name}.md`,
    `apps/store/fixtures/codex/${name}.md`,
    name,
  );
  // Authoring comments never reach an edition — same rule as docs.ts.
  return { text: text.replaceAll(/<!--[\s\S]*?-->/g, '').trim(), fromFixture };
}
