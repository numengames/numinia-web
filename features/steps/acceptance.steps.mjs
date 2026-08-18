/**
 * Step definitions for MISSION-000 acceptance criteria.
 * Runs against real artifacts: the SSG build output, the real env validator,
 * and the real lint gate — never against re-implementations (audit rule 1).
 */
import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Given, When, Then } from '@cucumber/cucumber';
import { parseEnv, EnvValidationError } from '@numinia/domain';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storeDist = path.join(repoRoot, 'apps', 'store', 'dist', 'client');

// --- i18n routing ---

Given('the store application has been built', function () {
  this.distDir = storeDist;
});

When('I inspect the generated page for locale {string}', async function (locale) {
  const relative = locale === 'en' ? 'index.html' : path.join(locale, 'index.html');
  try {
    this.pageHtml = await readFile(path.join(this.distDir, relative), 'utf8');
  } catch {
    this.pageHtml = null;
  }
  this.locale = locale;
});

Then('the page exists', function () {
  assert.ok(this.pageHtml, `page for locale ${this.locale} was not generated`);
});

Then('its html lang attribute is {string}', function (locale) {
  const match = this.pageHtml.match(/<html\s+lang="([^"]+)"/);
  assert.ok(match, 'page has no <html lang> attribute');
  assert.equal(match[1], locale);
});

// --- env validation ---

Given('an environment without {string}', function (variable) {
  this.env = { GITHUB_REPO_OWNER: 'o', GITHUB_REPO_NAME: 'r' };
  delete this.env[variable];
});

Given('a complete required environment', function () {
  this.env = { GITHUB_REPO_OWNER: 'o', GITHUB_REPO_NAME: 'r' };
});

When('the environment is validated at boot', function () {
  try {
    this.parsed = parseEnv(this.env);
    this.error = null;
  } catch (error) {
    this.parsed = null;
    this.error = error;
  }
});

Then('validation crashes', function () {
  assert.ok(this.error instanceof EnvValidationError, 'expected an EnvValidationError');
});

Then('the error names {string}', function (variable) {
  assert.ok(String(this.error).includes(variable), `error does not name ${variable}`);
});

Then('validation succeeds', function () {
  assert.equal(this.error, null);
  assert.ok(this.parsed);
});

// --- quality pipeline ---

const fixturePath = path.join(repoRoot, 'packages', 'domain', 'src', 'acceptance-fixture.ts');

Given('a source file containing an {string} type and a {string}', async function (_type, _call) {
  await writeFile(fixturePath, 'export function bad(x: any): void { console.log(x); }\n', 'utf8');
});

When('the lint gate runs on it', async function () {
  this.lint = await new Promise((resolve) => {
    execFile('npx', ['eslint', fixturePath], { cwd: repoRoot }, (error, stdout, stderr) =>
      resolve({ code: error?.code ?? 0, output: stdout + stderr }),
    );
  });
  await unlink(fixturePath);
});

Then('the gate exits non-zero', function () {
  assert.notEqual(this.lint.code, 0);
});

Then('the report names the offending file and both line positions', function () {
  assert.ok(this.lint.output.includes('acceptance-fixture.ts'), 'file not named');
  assert.ok(this.lint.output.includes('no-explicit-any'), 'any rule not reported');
  assert.ok(this.lint.output.includes('no-console'), 'console rule not reported');
  assert.ok(/\d+:\d+/.test(this.lint.output), 'line:column positions missing');
});

// --- data fixture ---

import { ASSET_FORMATS, parseAssetCatalog } from '@numinia/domain';

Given('the committed avatar catalog fixture', async function () {
  this.fixtureRaw = JSON.parse(
    await readFile(path.join(repoRoot, 'apps', 'store', 'fixtures', 'avatar-catalog.json'), 'utf8'),
  );
});

When('it is parsed with the domain asset validator', function () {
  this.catalog = parseAssetCatalog(this.fixtureRaw);
});

Then('it yields at least {int} valid asset', function (minimum) {
  assert.ok(this.catalog.length >= minimum, `only ${this.catalog.length} assets`);
});

Then('every asset has a non-empty id and a known format', function () {
  for (const asset of this.catalog) {
    assert.ok(asset.id.length > 0);
    assert.ok(ASSET_FORMATS.includes(asset.format), `unknown format ${asset.format}`);
  }
});

// --- archive (MISSION-001) ---

Given('the committed multi-catalog fixture', async function () {
  const raw = JSON.parse(
    await readFile(path.join(repoRoot, 'apps', 'store', 'fixtures', 'catalogs.json'), 'utf8'),
  );
  this.publicIds = Object.values(raw)
    .flat()
    .filter((record) => record.is_public !== false && record.is_draft !== true)
    .map((record) => record.id);
  assert.ok(this.publicIds.length > 0, 'fixture has no public assets');
});

When('I collect the public asset ids', function () {
  assert.ok(Array.isArray(this.publicIds));
});

Then('each asset has a detail page under every locale prefix', async function () {
  const prefixes = ['', 'es', 'ja', 'ko', 'pt-br'];
  for (const id of this.publicIds) {
    for (const prefix of prefixes) {
      const page = path.join(this.distDir, prefix, 'archive', id, 'index.html');
      const html = await readFile(page, 'utf8').catch(() => null);
      assert.ok(html, `missing page ${prefix || 'en'}/archive/${id}`);
    }
  }
});

Then('each detail page carries a download control or an unavailable notice', async function () {
  for (const id of this.publicIds) {
    const html = await readFile(path.join(this.distDir, 'archive', id, 'index.html'), 'utf8');
    assert.ok(
      html.includes('data-metric="archive-download"') || html.includes('data-download-unavailable'),
      `page ${id} lacks download control and unavailable notice`,
    );
  }
});

Then('the archive index contains one card per public asset', async function () {
  const html = await readFile(path.join(this.distDir, 'archive', 'index.html'), 'utf8');
  const cards = html.match(/data-archive-card/g) ?? [];
  // The inline filter script references the attribute once; discount it.
  assert.equal(cards.length - 1, this.publicIds.length);
});

Then('the archive index offers search and format filters', async function () {
  const html = await readFile(path.join(this.distDir, 'archive', 'index.html'), 'utf8');
  assert.ok(html.includes('id="archive-search"'), 'search input missing');
  assert.ok(html.includes('data-filter-format'), 'format filters missing');
});

// --- SEO plumbing ---

Then('the page declares a canonical link', function () {
  assert.match(this.pageHtml, /<link rel="canonical" href="[^"]+"/);
});

Then('it declares hreflang alternates for every locale and x-default', function () {
  for (const code of ['en', 'es', 'ja', 'ko', 'pt-br', 'x-default']) {
    assert.ok(
      this.pageHtml.includes(`hreflang="${code}"`),
      `missing hreflang alternate for ${code}`,
    );
  }
});

Then('the sitemap exists and lists every public asset page', async function () {
  const sitemap = await readFile(path.join(this.distDir, 'sitemap-0.xml'), 'utf8');
  for (const id of this.publicIds) {
    assert.ok(sitemap.includes(`/archive/${id}/`), `sitemap missing archive/${id}`);
  }
});

Then('the sitemap does not list internal pages', async function () {
  const sitemap = await readFile(path.join(this.distDir, 'sitemap-0.xml'), 'utf8');
  assert.ok(!sitemap.includes('/spike/'), 'sitemap leaks the spike page');
});

// --- gallery (MISSION-003 P1) ---

const LOCALE_PREFIXES = ['', 'es', 'ja', 'ko', 'pt-br'];

async function publicAvatarIds() {
  const raw = JSON.parse(
    await readFile(path.join(repoRoot, 'apps', 'store', 'fixtures', 'catalogs.json'), 'utf8'),
  );
  return (raw.avatars ?? [])
    .filter((record) => record.is_public !== false && record.is_draft !== true)
    .map((record) => record.id);
}

Then('the gallery page exists under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const page = path.join(this.distDir, prefix, 'gallery', 'index.html');
    const html = await readFile(page, 'utf8').catch(() => null);
    assert.ok(html, `missing gallery page for ${prefix || 'en'}`);
  }
});

Then('each gallery page shows a card for every public avatar', async function () {
  const avatarIds = await publicAvatarIds();
  assert.ok(avatarIds.length > 0, 'fixture has no public avatars');
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(path.join(this.distDir, prefix, 'gallery', 'index.html'), 'utf8');
    const cards = html.match(/data-gallery-card/g) ?? [];
    assert.equal(cards.length, avatarIds.length, `card count mismatch for ${prefix || 'en'}`);
  }
});

Then('every gallery card links to its archive detail page', async function () {
  const avatarIds = await publicAvatarIds();
  const html = await readFile(path.join(this.distDir, 'gallery', 'index.html'), 'utf8');
  for (const id of avatarIds) {
    assert.ok(html.includes(`/archive/${id}/`), `gallery misses link to archive/${id}`);
  }
});

Then('every gallery card carries the {string} metric', async function (metric) {
  const html = await readFile(path.join(this.distDir, 'gallery', 'index.html'), 'utf8');
  const cards = (html.match(/data-gallery-card/g) ?? []).length;
  const metrics = (html.match(new RegExp(`data-metric="${metric}"`, 'g')) ?? []).length;
  assert.ok(cards > 0, 'no gallery cards found');
  assert.equal(metrics, cards, 'metric count differs from card count');
});

Then('the gallery page ships no JS islands', async function () {
  const html = await readFile(path.join(this.distDir, 'gallery', 'index.html'), 'utf8');
  assert.ok(!html.includes('<astro-island'), 'gallery page hydrates a JS island');
});

// --- finder (MISSION-003 P2) ---

Then('the finder page exists under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const page = path.join(this.distDir, prefix, 'finder', 'index.html');
    const html = await readFile(page, 'utf8').catch(() => null);
    assert.ok(html, `missing finder page for ${prefix || 'en'}`);
  }
});

Then('each finder page mounts exactly one island', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(path.join(this.distDir, prefix, 'finder', 'index.html'), 'utf8');
    const islands = html.match(/<astro-island/g) ?? [];
    assert.equal(islands.length, 1, `island count wrong for ${prefix || 'en'}`);
  }
});

Then('the finder island data covers every public asset', async function () {
  const html = await readFile(path.join(this.distDir, 'finder', 'index.html'), 'utf8');
  for (const id of this.publicIds) {
    assert.ok(html.includes(id), `finder island data misses asset ${id}`);
  }
});

// --- updates + legal (MISSION-003 P3) ---

const LEGAL_DOCS = ['privacy', 'cookies', 'terms', 'legal-notice'];
// terms + privacy carry the real corpus since MIS-086; the rest stay drafts.
const PUBLISHED_LEGAL_DOCS = ['terms', 'privacy'];
const DRAFT_LEGAL_DOCS = ['cookies', 'legal-notice'];

Then('the updates page exists under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const page = path.join(this.distDir, prefix, 'updates', 'index.html');
    const html = await readFile(page, 'utf8').catch(() => null);
    assert.ok(html, `missing updates page for ${prefix || 'en'}`);
  }
});

Then(
  'the updates page lists every version from {string} to {string}',
  async function (first, last) {
    const html = await readFile(path.join(this.distDir, 'updates', 'index.html'), 'utf8');
    for (let minor = Number(first); minor <= Number(last); minor += 1) {
      assert.ok(html.includes(`data-version="v0.${minor}.0"`), `missing v0.${minor}.0`);
    }
  },
);

Then('the updates page lists version {string} and {string}', async function (a, b) {
  const html = await readFile(path.join(this.distDir, 'updates', 'index.html'), 'utf8');
  for (const version of [a, b]) {
    assert.ok(html.includes(`data-version="${version}"`), `missing ${version}`);
  }
});

Then('every legal page exists under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const doc of LEGAL_DOCS) {
      const page = path.join(this.distDir, prefix, 'legal', doc, 'index.html');
      const html = await readFile(page, 'utf8').catch(() => null);
      assert.ok(html, `missing legal/${doc} for ${prefix || 'en'}`);
    }
  }
});

Then('every draft legal page carries the draft banner', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const doc of DRAFT_LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      assert.ok(html.includes('data-legal-draft'), `legal/${doc} (${prefix || 'en'}) lacks banner`);
    }
  }
});

Then('the published legal pages render the corpus without the draft banner', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const doc of PUBLISHED_LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      // The attribute also appears in the route's CSS: assert on the element.
      assert.ok(
        !/<p[^>]*data-legal-draft/.test(html),
        `legal/${doc} (${prefix || 'en'}) still shows the draft banner`,
      );
      assert.ok(html.includes(`data-legal-doc="${doc}"`), `legal/${doc} (${prefix || 'en'}) empty`);
      assert.ok(
        /data-legal-version="\d+\.\d+\.\d+"/.test(html),
        `legal/${doc} (${prefix || 'en'}) does not stamp the master version`,
      );
      // A landmark section of each master, proving the real text shipped.
      const landmark = doc === 'terms' ? 'Numen Games S.L' : 'LOPDGDD';
      assert.ok(html.includes(landmark), `legal/${doc} (${prefix || 'en'}) misses "${landmark}"`);
    }
  }
});

Then('the published legal pages carry the scope note in every locale', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const doc of PUBLISHED_LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      assert.ok(
        /<p[^>]*data-legal-scope/.test(html),
        `legal/${doc} (${prefix || 'en'}) hides the scope note`,
      );
    }
  }
});

Then('the published legal pages disclose the language they are written in', async function () {
  // terms are EN-only, privacy ES-only: every other locale must say so.
  const language = { terms: 'en', privacy: 'es' };
  for (const prefix of LOCALE_PREFIXES) {
    const locale = prefix || 'en';
    for (const doc of PUBLISHED_LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      const notice = /<p[^>]*data-legal-lang-notice/.test(html);
      const expected = locale !== language[doc];
      assert.equal(notice, expected, `legal/${doc} (${locale}) language notice mismatch`);
    }
  }
});

Then('every page footer shows the current version linking to the updates page', async function () {
  for (const page of ['index.html', 'gallery/index.html', 'es/archive/index.html']) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    const match = /<a[^>]*data-metric="footer-version"[^>]*>(v\d+\.\d+\.\d+)<\/a>/.exec(html);
    assert.ok(match, `${page}: footer version link missing`);
    const href = /href="([^"]*)"[^>]*data-metric="footer-version"/.exec(html);
    assert.ok(href && href[1].endsWith('/updates/'), `${page}: version does not link updates`);
  }
});

Then('every sampled page carries the consent banner with its legal links', async function () {
  for (const page of [
    'index.html',
    'gallery/index.html',
    'es/archive/index.html',
    'ja/index.html',
  ]) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    const banner = /<aside[^>]*data-consent-version="[^"]+"[\s\S]*?<\/aside>/.exec(html);
    assert.ok(banner, `${page}: consent banner missing`);
    assert.ok(
      banner[0].includes('data-metric="consent-accept"'),
      `${page}: accept control missing`,
    );
    assert.ok(/href="[^"]*\/legal\/terms\/"/.test(banner[0]), `${page}: terms link missing`);
    assert.ok(/href="[^"]*\/legal\/cookies\/"/.test(banner[0]), `${page}: cookies link missing`);
  }
});

Then('the updates page shows the incoming roadmap', async function () {
  const html = await readFile(path.join(this.distDir, 'updates', 'index.html'), 'utf8');
  assert.ok(html.includes('data-roadmap'), 'roadmap section missing');
  assert.ok(html.includes('Radicle.xyz'), 'roadmap items missing');
});

// --- docs (MISSION-003 P4) ---

Then('the docs index exists under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const page = path.join(this.distDir, prefix, 'docs', 'index.html');
    const html = await readFile(page, 'utf8').catch(() => null);
    assert.ok(html, `missing docs index for ${prefix || 'en'}`);
    assert.ok(
      html.includes('data-metric="docs-nav"'),
      `docs sidebar missing for ${prefix || 'en'}`,
    );
  }
});

Then('the docs section renders {string} pages per locale', async function (expected) {
  const { readdir } = await import('node:fs/promises');
  for (const prefix of LOCALE_PREFIXES) {
    const root = path.join(this.distDir, prefix, 'docs');
    let count = 0;
    const walk = async (dir) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) await walk(path.join(dir, entry.name));
        else if (entry.name === 'index.html') count += 1;
      }
    };
    await walk(root);
    assert.equal(count, Number(expected), `docs page count for ${prefix || 'en'}`);
  }
});

Then('legacy-architecture docs carry the legacy banner', async function () {
  for (const slug of ['developers', 'developers/database', 'developers/website']) {
    const html = await readFile(path.join(this.distDir, 'docs', slug, 'index.html'), 'utf8');
    assert.ok(html.includes('data-doc-legacy'), `docs/${slug} lacks the legacy banner`);
  }
  const evergreen = await readFile(path.join(this.distDir, 'docs', 'help', 'index.html'), 'utf8');
  assert.ok(!evergreen.includes('data-doc-legacy'), 'docs/help wrongly flagged legacy');
});

// --- inspector (MISSION-003 P5) ---

Then('the inspector page exists under every locale prefix as an island', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(
      path.join(this.distDir, prefix, 'inspector', 'index.html'),
      'utf8',
    ).catch(() => null);
    assert.ok(html, `missing inspector page for ${prefix || 'en'}`);
    assert.ok(html.includes('<astro-island'), `inspector island missing for ${prefix || 'en'}`);
  }
});

// --- SEO descriptions (v0.17.0 polish) ---

Then('key pages declare meta description and open graph tags', async function () {
  const pages = [
    'index.html',
    'es/index.html',
    'gallery/index.html',
    'archive/index.html',
    'finder/index.html',
    'updates/index.html',
    'docs/index.html',
    'inspector/index.html',
    'legal/privacy/index.html',
  ];
  for (const page of pages) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    assert.ok(/<meta name="description" content="[^"]+"/.test(html), `${page}: no description`);
    assert.ok(html.includes('property="og:title"'), `${page}: no og:title`);
    assert.ok(html.includes('property="og:locale"'), `${page}: no og:locale`);
    const ogTitles = html.match(/property="og:title"/g) ?? [];
    assert.equal(ogTitles.length, 1, `${page}: duplicated og:title`);
  }
});

// --- three pillars (MISSION-004) ---

Then('every page header links city, assets, and lap', async function () {
  for (const page of ['index.html', 'es/index.html', 'gallery/index.html', 'lap/index.html']) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    for (const metric of ['nav-city', 'nav-assets', 'nav-lap']) {
      assert.ok(html.includes(`data-metric="${metric}"`), `${page}: missing ${metric}`);
    }
    assert.ok(!html.includes('data-metric="nav-gallery"'), `${page}: old nav still present`);
  }
});

Then('the city pages exist under every locale prefix', async function () {
  // MISSION-007: one chronicle. The city page carries the four chapter
  // anchors; the old subpages survive as redirect stubs to those anchors.
  for (const prefix of LOCALE_PREFIXES) {
    const city = await readFile(
      path.join(this.distDir, prefix, 'city', 'index.html'),
      'utf8',
    ).catch(() => null);
    assert.ok(city, `missing city for ${prefix || 'en'}`);
    for (const anchor of [
      'id="semilla"',
      'id="ciudad"',
      'id="identidad"',
      'id="vida"',
      'id="juego"',
    ]) {
      assert.ok(city.includes(anchor), `city (${prefix || 'en'}) lacks ${anchor}`);
    }
    for (const [slug, anchor] of [
      ['city/inhabitants', '#identidad'],
      ['city/districts', '#ciudad'],
      ['city/the-game', '#juego'],
    ]) {
      const stub = await readFile(
        path.join(this.distDir, prefix, slug, 'index.html'),
        'utf8',
      ).catch(() => null);
      assert.ok(stub, `missing redirect stub ${slug} for ${prefix || 'en'}`);
      assert.ok(stub.includes(anchor), `${slug} (${prefix || 'en'}) does not point at ${anchor}`);
    }
  }
});

Then('the assets hub and lap pages exist under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const slug of ['assets', 'lap']) {
      const html = await readFile(
        path.join(this.distDir, prefix, slug, 'index.html'),
        'utf8',
      ).catch(() => null);
      assert.ok(html, `missing ${slug} for ${prefix || 'en'}`);
    }
  }
  const lap = await readFile(path.join(this.distDir, 'lap', 'index.html'), 'utf8');
  assert.ok(lap.includes('data-lap-ranks'), 'lap page lacks the ranks list');
  assert.ok(lap.includes('data-lap-status'), 'lap page lacks the status note');
});

Then('the link integrity gate passes', async function () {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const result = await run('node', [path.join(repoRoot, 'scripts', 'link-check.mjs')], {
    cwd: repoRoot,
  });
  assert.match(result.stdout, /0 broken/);
});

Then('every external link opens in a new tab', async function () {
  const { readdir } = await import('node:fs/promises');
  const offenders = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.html')) {
        const html = await readFile(full, 'utf8');
        for (const match of html.matchAll(/<a\s[^>]*href="https?:\/\/[^"]+"[^>]*>/g)) {
          if (!match[0].includes('target="_blank"')) {
            offenders.push(`${path.relative(this.distDir, full)}: ${match[0].slice(0, 80)}`);
          }
        }
      }
    }
  };
  await walk(this.distDir);
  assert.deepEqual(
    offenders.slice(0, 5),
    [],
    `external links without target=_blank (${offenders.length})`,
  );
});
