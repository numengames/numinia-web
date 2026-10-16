/**
 * Step definitions for MISSION-000 acceptance criteria.
 * Runs against real artifacts: the SSG build output, the real env validator,
 * and the real lint gate — never against re-implementations (audit rule 1).
 */
import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
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

// --- the Bazaar (v0.83.0): the Finder rethought, the one door to the goods ---

const LOCALE_PREFIXES = ['', 'es', 'ja', 'ko', 'pt-br'];

// Each locale's name for it — the H1 the page must carry.
const BAZAAR_TITLES = { '': 'Bazaar', es: 'Bazar', ja: 'バザール', ko: '바자르', 'pt-br': 'Bazar' };

async function bazaarHtml(distDir, prefix) {
  return readFile(path.join(distDir, prefix, 'bazaar', 'index.html'), 'utf8').catch(() => null);
}

Then('the bazaar page exists under every locale prefix with its own name', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await bazaarHtml(this.distDir, prefix);
    assert.ok(html, `missing bazaar page for ${prefix || 'en'}`);
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(html);
    assert.equal(h1?.[1], BAZAAR_TITLES[prefix], `bazaar title for ${prefix || 'en'}`);
  }
});

Then('each bazaar page mounts exactly one island', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await bazaarHtml(this.distDir, prefix);
    const islands = html.match(/<astro-island/g) ?? [];
    assert.equal(islands.length, 1, `island count wrong for ${prefix || 'en'}`);
  }
});

Then('the bazaar island data covers every public asset', async function () {
  const html = await bazaarHtml(this.distDir, '');
  for (const id of this.publicIds) {
    assert.ok(html.includes(id), `bazaar island data misses asset ${id}`);
  }
});

Then('the bazaar keeps the licence in sight', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await bazaarHtml(this.distDir, prefix);
    assert.ok(html.includes('data-bazaar-licence'), `licence note missing for ${prefix || 'en'}`);
  }
});

Then('every retired door leads to the bazaar of its locale', async function () {
  // The map astro.config.mjs reads: each door answers a 301 at runtime, so
  // the proof in the build is twofold — no page left behind at the old
  // address, and a built Bazaar where each one leads.
  const { REDIRECTS } = await import('../../apps/store/src/lib/redirects.ts');
  for (const prefix of LOCALE_PREFIXES) {
    const base = prefix ? `/${prefix}` : '';
    for (const door of ['finder', 'assets', 'gallery', 'archive', 'inspector']) {
      assert.equal(REDIRECTS[`${base}/${door}/`], `${base}/bazaar/`, `${base}/${door}/`);
      const left = await readFile(path.join(this.distDir, prefix, door, 'index.html'), 'utf8')
        .then(() => true)
        .catch(() => false);
      assert.ok(!left, `${base}/${door}/ still has a page`);
    }
    assert.ok(await bazaarHtml(this.distDir, prefix), `no bazaar for ${prefix || 'en'}`);
  }
});

Then('every docs page leads to numinia.org', async function () {
  const { REDIRECTS } = await import('../../apps/store/src/lib/redirects.ts');
  for (const prefix of LOCALE_PREFIXES) {
    const base = prefix ? `/${prefix}` : '';
    for (const slug of ['', 'about/license/', 'developers/database/', 'help/']) {
      assert.equal(
        REDIRECTS[`${base}/docs/${slug}`],
        'https://numinia.org/',
        `${base}/docs/${slug}`,
      );
    }
    const left = await readFile(path.join(this.distDir, prefix, 'docs', 'index.html'), 'utf8')
      .then(() => true)
      .catch(() => false);
    assert.ok(!left, `${base}/docs/ still has a page`);
  }
});

Then('each detail page leads back to the bazaar of its locale', async function () {
  const [id] = this.publicIds;
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(
      path.join(this.distDir, prefix, 'archive', id, 'index.html'),
      'utf8',
    );
    const back = /<a[^>]*href="([^"]*)"[^>]*data-metric="archive-back"[^>]*>([^<]*)<\/a>/.exec(
      html,
    );
    assert.ok(back, `archive/${id} (${prefix || 'en'}) has no way back`);
    assert.equal(back[1], `${prefix ? `/${prefix}` : ''}/bazaar/`);
    assert.equal(back[2], BAZAAR_TITLES[prefix]);
  }
});

// --- updates + legal (MISSION-003 P3) ---

// Route slugs of the four legal texts, in the footer order.
const LEGAL_DOCS = ['legal-notice', 'privacy', 'cookies', 'terms'];
// What each page's data-legal-doc names it (lib/legal.ts LegalDoc).
const LEGAL_DOC_ID = {
  'legal-notice': 'notice',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
};
// A landmark of each master, proving the real text shipped.
const LEGAL_LANDMARK = {
  'legal-notice': 'Legal Notice',
  privacy: 'LOPDGDD',
  cookies: 'numinia_consent',
  terms: 'Numen Games S.L',
};

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

Then('the legal notice is also reachable at its short address', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(
      path.join(this.distDir, prefix, 'legal', 'notice', 'index.html'),
      'utf8',
    ).catch(() => null);
    assert.ok(html, `missing legal/notice redirect for ${prefix || 'en'}`);
    assert.ok(
      html.includes(`${prefix ? `/${prefix}` : ''}/legal/legal-notice/`),
      `legal/notice (${prefix || 'en'}) does not lead to the legal notice`,
    );
  }
});

Then('the legal pages render the corpus without draft or review markers', async function () {
  const { LEGAL_FORBIDDEN_STRINGS: forbidden } = await import('../../apps/store/src/lib/legal.ts');
  for (const prefix of LOCALE_PREFIXES) {
    for (const doc of LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      const where = `legal/${doc} (${prefix || 'en'})`;
      assert.ok(html.includes(`data-legal-doc="${LEGAL_DOC_ID[doc]}"`), `${where} empty`);
      assert.ok(
        /data-legal-version="\d+\.\d+\.\d+"/.test(html),
        `${where} does not stamp the master version`,
      );
      assert.ok(html.includes(LEGAL_LANDMARK[doc]), `${where} misses "${LEGAL_LANDMARK[doc]}"`);
      for (const needle of forbidden) {
        assert.ok(!html.includes(needle), `${where} shows "${needle}"`);
      }
      const emails = new Set(html.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []);
      for (const email of emails) {
        assert.equal(email, 'legal@numengames.com', `${where} prints ${email}`);
      }
    }
  }
});

Then('the legal pages carry no scope note', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const doc of LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      assert.ok(!html.includes('data-legal-scope'), `legal/${doc} (${prefix || 'en'}) scope note`);
      assert.ok(!html.includes('under review'), `legal/${doc} (${prefix || 'en'}) "under review"`);
    }
  }
});

Then('the legal pages disclose the language they are written in', async function () {
  // Every master is English: every other locale must say so. Read from the
  // platform's own mapping instead of restating it.
  const { LEGAL_DOC_LANGUAGE: language } = await import('../../apps/store/src/lib/legal.ts');
  for (const prefix of LOCALE_PREFIXES) {
    const locale = prefix || 'en';
    for (const doc of LEGAL_DOCS) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'legal', doc, 'index.html'),
        'utf8',
      );
      const notice = /<p[^>]*data-legal-lang-notice/.test(html);
      const expected = locale !== language[LEGAL_DOC_ID[doc]];
      assert.equal(notice, expected, `legal/${doc} (${locale}) language notice mismatch`);
    }
  }
});

Then('every page footer shows the current version linking to the updates page', async function () {
  for (const page of ['index.html', 'bazaar/index.html', 'es/bazaar/index.html']) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    const match = /<a[^>]*data-metric="footer-version"[^>]*>(v\d+\.\d+\.\d+)<\/a>/.exec(html);
    assert.ok(match, `${page}: footer version link missing`);
    const href = /href="([^"]*)"[^>]*data-metric="footer-version"/.exec(html);
    assert.ok(href && href[1].endsWith('/updates/'), `${page}: version does not link updates`);
  }
});

const SAMPLED_PAGES = ['index.html', 'bazaar/index.html', 'es/bazaar/index.html', 'ja/index.html'];

Then(
  'every sampled page footer links the four legal texts and the cookie choice',
  async function () {
    for (const page of SAMPLED_PAGES) {
      const html = await readFile(path.join(this.distDir, page), 'utf8');
      const footer = /<footer[\s\S]*?<\/footer>/.exec(html);
      assert.ok(footer, `${page}: footer missing`);
      const prefix = page.startsWith('es/') ? '/es' : page.startsWith('ja/') ? '/ja' : '';
      const hrefs = [...footer[0].matchAll(/href="([^"]*\/legal\/[^"]*)"/g)].map((m) => m[1]);
      assert.deepEqual(
        hrefs,
        LEGAL_DOCS.map((doc) => `${prefix}/legal/${doc}/`),
        `${page}: footer legal links out of order or missing`,
      );
      assert.ok(footer[0].includes('data-cookie-choice'), `${page}: cookie choice button missing`);
    }
  },
);

Then('every sampled page loads the cookie notice', async function () {
  for (const page of SAMPLED_PAGES) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    // The old combined Terms+Cookies banner must never come back.
    assert.ok(!html.includes('data-consent-version'), `${page}: old consent banner`);
    assert.ok(!html.includes('consent-accept'), `${page}: old accept button`);
  }
  // The notice's bootstrap reaches every page through one module chunk that
  // names the consent cookie.
  const html = await readFile(path.join(this.distDir, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  let found = scripts.some((body) => body.includes('numinia_consent'));
  for (const src of srcs) {
    if (found) break;
    const body = await readFile(path.join(this.distDir, src), 'utf8').catch(() => '');
    found = body.includes('numinia_consent');
  }
  assert.ok(found, 'index.html: cookie notice bootstrap missing');
});

Then('the Codex links the four legal texts and the cookie choice', async function () {
  const shell = await readFile(
    path.join(repoRoot, 'apps', 'store', 'src', 'components', 'lap', 'codex', 'CodexShell.astro'),
    'utf8',
  );
  // The Codex is rendered on demand (session-gated), so its source is the
  // artefact: the legal line and the notice ride on every Codex page.
  for (const doc of LEGAL_DOCS) {
    assert.ok(shell.includes(`/legal/${doc}/`), `Codex misses /legal/${doc}/`);
  }
  assert.ok(shell.includes('data-cookie-choice'), 'Codex misses the cookie choice');
  const layout = await readFile(
    path.join(repoRoot, 'apps', 'store', 'src', 'layouts', 'BaseLayout.astro'),
    'utf8',
  );
  assert.ok(/^\s*<CookieNotice \/>/m.test(layout), 'the notice must render without chrome too');
});

Then('the updates page shows the incoming roadmap', async function () {
  const html = await readFile(path.join(this.distDir, 'updates', 'index.html'), 'utf8');
  assert.ok(html.includes('data-roadmap'), 'roadmap section missing');
  assert.ok(html.includes('Radicle.xyz'), 'roadmap items missing');
});

// --- SEO descriptions (v0.17.0 polish) ---

Then('key pages declare meta description and open graph tags', async function () {
  const pages = [
    'index.html',
    'es/index.html',
    'bazaar/index.html',
    'es/bazaar/index.html',
    'updates/index.html',
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

// --- three pillars (MISSION-004), the app shell (2026-10-14, v0.83.0) ---

// Pages every workstream keeps: the front door in two locales, the
// communities' index, the Bazar and the LAP.
const SHELL_PAGES = [
  'index.html',
  'es/index.html',
  'communities/index.html',
  'bazaar/index.html',
  'lap/index.html',
];

Then('every page bar carries the scarab, the search, the mode and the door', async function () {
  for (const page of SHELL_PAGES) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    for (const metric of [
      'nav-home',
      'nav-search',
      'chrome-mode',
      'chrome-mode-system',
      'chrome-mode-day',
      'chrome-sign-in',
      'chrome-account',
      'you-create',
    ]) {
      assert.ok(html.includes(`data-metric="${metric}"`), `${page}: missing ${metric}`);
    }
    for (const metric of [
      'nav-city',
      'nav-assets',
      'nav-lap',
      'nav-gallery',
      'chrome-menu',
      'chrome-more',
      'nav-more',
      'nav-for-you',
      'nav-explore',
    ]) {
      assert.ok(!html.includes(`data-metric="${metric}"`), `${page}: old menu entry ${metric}`);
    }
  }
});

Then('every page city rail, your rail and phone bar carry their places', async function () {
  const city = ['now', 'communities', 'encounters', 'worlds', 'bazaar'];
  const yours = ['notices', 'your-communities', 'balance', 'loot'];
  for (const page of SHELL_PAGES) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    const left = /<aside class="rail rail-ciudad"[\s\S]*?<\/aside>/.exec(html);
    assert.ok(left, `${page}: the city's rail is missing`);
    const right = /<aside class="rail rail-tu"[\s\S]*?<\/aside>/.exec(html);
    assert.ok(right, `${page}: your rail is missing`);
    const tabs = /<nav class="barra-movil"[\s\S]*?<\/nav>/.exec(html);
    assert.ok(tabs, `${page}: the phone's bottom bar is missing`);
    for (const place of city) {
      assert.ok(
        left[0].includes(`data-metric="nav-${place}"`),
        `${page}: city rail lacks ${place}`,
      );
    }
    for (const place of yours) {
      assert.ok(
        right[0].includes(`data-metric="you-${place}"`),
        `${page}: your rail lacks ${place}`,
      );
    }
    for (const place of ['now', 'communities', 'encounters', 'worlds', 'you']) {
      assert.ok(
        tabs[0].includes(`data-metric="tab-${place}"`),
        `${page}: phone bar lacks ${place}`,
      );
    }
    // The rails read the same way: the right one is never written backwards.
    assert.ok(!right[0].includes('dir="rtl"'), `${page}: your rail reads backwards`);
    // Exactly the same city place is current in the rail and in the phone bar.
    const current = (block) =>
      [...block.matchAll(/aria-current="page"[^>]*data-metric="(?:nav|tab)-([a-z-]+)"/g)].map(
        (m) => m[1],
      );
    assert.deepEqual(
      current(tabs[0]),
      current(left[0]).filter((id) => id !== 'bazaar'),
      `${page}: the city rail and the phone bar light different places`,
    );
  }
});

Then('every page footer names the three sister sites and no social links', async function () {
  for (const page of SHELL_PAGES) {
    const html = await readFile(path.join(this.distDir, page), 'utf8');
    const footer = /<footer class="pie-app"[\s\S]*?<\/footer>/.exec(html);
    assert.ok(footer, `${page}: footer missing`);
    for (const site of ['https://numen.games', 'https://numinia.org']) {
      assert.ok(footer[0].includes(`href="${site}"`), `${page}: footer lacks ${site}`);
    }
    assert.ok(footer[0].includes('aria-current="page"'), `${page}: this site is not marked`);
    for (const gone of ['nwos.numen.games', 'github.com/numengames"', 'discord', 'footer-social']) {
      assert.ok(!footer[0].includes(gone), `${page}: footer still carries ${gone}`);
    }
    assert.ok(!html.includes('data-metric="footer-social'), `${page}: social links remain`);
  }
});

// --- communities (phase 0, 2026-10-14) ---

const COMMUNITY_FILES = path.join(repoRoot, 'apps/store/src/content/communities');

function frontmatterOf(file) {
  const text = readFileSync(file, 'utf8');
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  assert.ok(block, `${file}: no front matter`);
  return block[1];
}

Then('the communities index exists under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(
      path.join(this.distDir, prefix, 'communities', 'index.html'),
      'utf8',
    ).catch(() => null);
    assert.ok(html, `missing communities index for ${prefix || 'en'}`);
    assert.ok(
      html.includes('data-metric="communities-search"'),
      `${prefix || 'en'}: no search box`,
    );
    const calendar = await readFile(
      path.join(this.distDir, prefix, 'calendar', 'index.html'),
      'utf8',
    ).catch(() => null);
    assert.ok(calendar, `missing calendar for ${prefix || 'en'}`);
  }
});

Then('every public community has a page and every prepared one has none', async function () {
  const files = readdirSync(COMMUNITY_FILES).filter((name) => name.endsWith('.md'));
  assert.ok(files.length >= 15, `only ${files.length} community files`);
  let published = 0;
  let prepared = 0;
  for (const name of files) {
    const id = name.replace(/\.md$/, '');
    const house = /^visibility:\s*house\s*$/m.test(frontmatterOf(path.join(COMMUNITY_FILES, name)));
    const page = path.join(this.distDir, 'communities', id, 'index.html');
    const exists = await readFile(page, 'utf8')
      .then(() => true)
      .catch(() => false);
    if (house) {
      prepared += 1;
      assert.ok(!exists, `${id} is prepared (house only) but has a page`);
      const index = await readFile(path.join(this.distDir, 'communities', 'index.html'), 'utf8');
      assert.ok(!index.includes(`/communities/${id}/`), `${id} is prepared but listed`);
    } else {
      published += 1;
      assert.ok(exists, `${id} has no page`);
      const feed = await readFile(
        path.join(this.distDir, 'communities', id, 'calendar.ics'),
        'utf8',
      ).catch(() => null);
      assert.ok(feed && feed.startsWith('BEGIN:VCALENDAR'), `${id}: no calendar feed`);
    }
  }
  assert.ok(published >= 11, `only ${published} published`);
  assert.ok(prepared >= 4, `only ${prepared} prepared`);
});

Then('the home lists the upcoming rituals and the city feed is a calendar', async function () {
  const home = await readFile(path.join(this.distDir, 'index.html'), 'utf8');
  const cards = (home.match(/data-metric="ritual-card"/g) ?? []).length;
  assert.ok(cards >= 3, `home shows ${cards} ritual cards`);
  // The «full calendar» button left the home with the app shell (v0.83.0):
  // the calendar is one click away in the shell itself.
  const feed = await readFile(path.join(this.distDir, 'calendar.ics'), 'utf8');
  assert.ok(feed.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'), 'city feed is not a calendar');
  const events = (feed.match(/BEGIN:VEVENT/g) ?? []).length;
  assert.equal(events, cards, `feed has ${events} events, home ${cards} cards`);
  for (const line of feed.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `feed line over 75 octets: ${line}`);
  }
});

// --- the app shell pages (v0.83.0) ---

/** The headings the front door used to explain itself with, per locale. */
const RETIRED_HOME_HEADINGS = [
  'Una ciudad donde las comunidades tienen sede.',
  'A city where communities have a home.',
  'コミュニティが拠点を持つ都市。',
  '커뮤니티가 거점을 갖는 도시.',
  'Uma cidade onde as comunidades têm sede.',
];

/** Published community ids, read from the register's files. */
function publishedCommunityIds() {
  return readdirSync(COMMUNITY_FILES)
    .filter((name) => name.endsWith('.md'))
    .filter(
      (name) => !/^visibility:\s*house\s*$/m.test(frontmatterOf(path.join(COMMUNITY_FILES, name))),
    )
    .map((name) => name.replace(/\.md$/, ''));
}

Then('the home carries no explanation heading and opens on the featured card', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(path.join(this.distDir, prefix, 'index.html'), 'utf8');
    const where = prefix || 'en';
    for (const heading of RETIRED_HOME_HEADINGS) {
      assert.ok(!html.includes(heading), `${where}: the home still explains itself (${heading})`);
    }
    for (const metric of ['landing-calendar', 'landing-all-communities']) {
      assert.ok(
        !html.includes(`data-metric="${metric}"`),
        `${where}: the home still has ${metric}`,
      );
    }
    // The encounters the build presents (a world's slide waits hidden for the live count).
    const slides = [...html.matchAll(/<article\b[^>]*\bdata-featured-slide\b[^>]*>/g)].filter(
      (match) => !match[0].includes('data-live-slide'),
    ).length;
    assert.ok(slides >= 1 && slides <= 3, `${where}: ${slides} featured slides`);
    const featured = html.indexOf('data-featured-slide');
    assert.ok(featured < html.indexOf('id="rituals"'), `${where}: the featured card is not first`);
    assert.ok(html.indexOf('id="rituals"') < html.indexOf('id="bazaar"'), `${where}: block order`);
    assert.ok(
      html.includes(`href="${prefix ? `/${prefix}` : ''}/how-it-works/"`),
      `${where}: no door`,
    );
  }
});

Then(
  'the home is «Ahora» in every locale: one face, the featured frame first, then encounters, communities and the newest goods',
  async function () {
    for (const prefix of LOCALE_PREFIXES) {
      const html = await readFile(path.join(this.distDir, prefix, 'index.html'), 'utf8');
      const where = prefix || 'en';
      // One face for everyone: no visitor face, no signed-in face waiting hidden.
      assert.ok(!html.includes('class="visita"'), `${where}: the visitor face is still there`);
      assert.ok(!html.includes('<div data-session-in hidden'), `${where}: a hidden second face`);
      const main = html.slice(html.indexOf('<main'));
      assert.equal((main.match(/<h1\b/g) ?? []).length, 1, `${where}: one h1`);
      // Top to bottom: the frame, the encounters, the communities, the newest goods, the doors.
      const order = [
        'id="destacado"',
        'id="rituals"',
        'id="alive"',
        'id="bazaar"',
        'class="final"',
      ].map((marker) => [marker, html.indexOf(marker)]);
      for (const [marker, at] of order) assert.ok(at !== -1, `${where}: no ${marker}`);
      for (let i = 1; i < order.length; i += 1) {
        assert.ok(
          order[i - 1][1] < order[i][1],
          `${where}: ${order[i][0]} before ${order[i - 1][0]}`,
        );
      }
      // The frame: one big action per encounter, arrows that move it, no autoplay.
      const frame = html.slice(html.indexOf('id="destacado"'), html.indexOf('id="rituals"'));
      for (const step of ['-1', '1']) {
        assert.match(
          frame,
          new RegExp(`data-featured-step="${step}"`),
          `${where}: no arrow ${step}`,
        );
      }
      assert.ok(frame.includes('data-metric="home-featured-calendar"'), `${where}: no «Me apunto»`);
      assert.ok(!/autoplay|setInterval/.test(frame), `${where}: the frame moves on its own`);
      // The worlds with people are not repeated as cards: on the phone a list
      // that shows only once the live count says someone is inside.
      const phone = /<section\b[^>]*class="vivo-movil"[^>]*>/.exec(html);
      if (phone) {
        assert.match(
          phone[0],
          /\bdata-inside-any\b/,
          `${where}: the phone list is not tied to the count`,
        );
        assert.match(phone[0], /\bhidden\b/, `${where}: the phone list shows before the count`);
      }
      assert.ok(
        !html.includes('data-metric="live-now-enter"'),
        `${where}: Live's cards on the home`,
      );
    }
  },
);

Then('the questions of the old visitor face are on how it works', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const html = await readFile(
      path.join(this.distDir, prefix, 'how-it-works', 'index.html'),
      'utf8',
    );
    const faq = html.slice(html.indexOf('id="faq"'));
    const section = faq.slice(0, faq.indexOf('</section>'));
    assert.ok(html.includes('id="faq"'), `${prefix || 'en'}: no questions`);
    assert.equal(
      (section.match(/<details\b/g) ?? []).length,
      5,
      `${prefix || 'en'}: five questions`,
    );
  }
});

Then('the home shows the Bazar block with real goods and their licence', async function () {
  for (const [prefix, licence] of [
    ['', 'CC0 · free, no permission needed'],
    ['es', 'CC0 · libre, sin pedir permiso'],
  ]) {
    const html = await readFile(path.join(this.distDir, prefix, 'index.html'), 'utf8');
    const block = html.slice(html.indexOf('id="bazaar"'), html.indexOf('class="final"'));
    const goods = [...block.matchAll(/href="([^"]+)"[^>]*data-metric="home-good"/g)].map(
      (match) => match[1],
    );
    assert.equal(goods.length, 4, `${prefix || 'en'}: ${goods.length} goods on the home`);
    for (const href of goods) {
      const page = await readFile(path.join(this.distDir, href, 'index.html'), 'utf8').catch(
        () => null,
      );
      assert.ok(page, `${prefix || 'en'}: ${href} is not an object page`);
    }
    const licences = block.split(licence).length - 1;
    assert.equal(licences, 4, `${prefix || 'en'}: ${licences} licence lines for 4 goods`);
    assert.ok(
      block.includes('data-metric="home-bazaar"'),
      `${prefix || 'en'}: no way to the Bazar`,
    );
  }
});

Then(
  '{string}, {string} and {string} exist under every locale prefix',
  async function (first, second, third) {
    const slugs = [first, second, third];
    const markers = {
      'how-it-works': ['id="open"', 'mailto:hola@numengames.com', 'data-metric="how-step-bazaar"'],
      live: ['id="now"', 'id="next"', 'data-countdown='],
      belong: ['data-follows-data', '/lap/session/', 'data-metric="belong-explore"'],
    };
    for (const prefix of LOCALE_PREFIXES) {
      for (const slug of slugs) {
        const html = await readFile(
          path.join(this.distDir, prefix, slug, 'index.html'),
          'utf8',
        ).catch(() => null);
        assert.ok(html, `missing ${slug} for ${prefix || 'en'}`);
        assert.equal(
          (html.match(/<h1[\s>]/g) ?? []).length,
          1,
          `${prefix || 'en'}/${slug}: one h1`,
        );
        for (const marker of markers[slug] ?? []) {
          assert.ok(html.includes(marker), `${prefix || 'en'}/${slug} lacks ${marker}`);
        }
      }
    }
    // «Perteneces» embeds what it draws: every published community, nothing else.
    const belong = await readFile(path.join(this.distDir, 'belong', 'index.html'), 'utf8');
    const json = /data-follows-data[^>]*>([\s\S]*?)<\/script>/.exec(belong);
    assert.ok(json, 'belong: no embedded communities');
    const ids = JSON.parse(json[1]).map((entry) => entry.id);
    assert.deepEqual([...ids].sort(), publishedCommunityIds().sort(), 'belong: embedded ids');
  },
);

Then('every city address redirects to how it works in its own locale', async function () {
  // Redirects declared in astro.config.mjs leave no file in dist/client: the
  // Node server answers them with a 301 and the Cloudflare build writes them
  // into _redirects, both from the route manifest the server is built with.
  const server = await readFile(path.join(this.distDir, '..', 'server', 'entry.mjs'), 'utf8');
  const escape = (text) => text.replace(/[/\\^$.*+?()[\]{}|-]/g, '\\$&');
  for (const prefix of LOCALE_PREFIXES) {
    const base = prefix ? `/${prefix}` : '';
    for (const chapter of ['', '/inhabitants', '/districts', '/the-game']) {
      const from = `${base}/city${chapter}`;
      const to = `${base}/how-it-works/`;
      const route = new RegExp(`"pathname":"${escape(from)}"[^}]*?"redirect":"${escape(to)}"`);
      assert.match(server, route, `${from} does not redirect to ${to}`);
      const page = await readFile(
        path.join(this.distDir, prefix, `city${chapter}`, 'index.html'),
        'utf8',
      ).catch(() => null);
      assert.equal(page, null, `${from} is still a page`);
    }
  }
  const sitemap = await readFile(path.join(this.distDir, 'sitemap-0.xml'), 'utf8');
  assert.ok(!/\/city\/<\/loc>/.test(sitemap), 'sitemap lists a retired city address');
});

// --- «Me apunto» for real and «Tu agenda» (cut F, v0.116.0) ---

Then(
  'every upcoming encounter page offers «Me apunto» as a toggle and the calendar as a second action',
  async function () {
    // The built page carries both faces — the door signed out, the toggle
    // signed in — and the .ics as the ghost button; no count is painted at
    // build (it is asked once the session is in, and only shown above zero).
    const dir = path.join(this.distDir, 'es', 'rituals');
    let upcoming = 0;
    for (const id of readdirSync(dir)) {
      const html = await readFile(path.join(dir, id, 'index.html'), 'utf8').catch(() => null);
      if (html === null) continue;
      const held = /class="chip"[^>]*>Celebrado</.test(html);
      if (held) {
        assert.ok(!html.includes('data-rsvp="'), `${id} is held and still offers «Me apunto»`);
        continue;
      }
      upcoming += 1;
      assert.ok(
        html.includes(`data-rsvp="${id}"`) && html.includes('aria-pressed="false"'),
        `${id} lacks the RSVP toggle`,
      );
      assert.ok(html.includes('data-metric="ritual-rsvp-sign-in"'), `${id} lacks the door`);
      assert.ok(
        /class="btn btn-fantasma" href="\/rituals\/[^"]+\.ics" data-metric="ritual-add-calendar"[^<]*(<[^>]*>[^<]*)*?Añadir a mi calendario<\/a>/.test(
          html,
        ),
        `${id} lacks «Añadir a mi calendario» as a ghost button`,
      );
      assert.ok(html.includes(`data-rsvp-count="${id}" hidden`), `${id} paints a count at build`);
      assert.ok(html.includes('data-metric="ritual-your-agenda"'), `${id} lacks «Tu agenda»`);
    }
    assert.ok(upcoming >= 1, 'no upcoming encounter page to check');
  },
);

Then('the agenda page is rendered on demand under every locale prefix', async function () {
  const server = await readFile(path.join(this.distDir, '..', 'server', 'entry.mjs'), 'utf8');
  for (const prefix of LOCALE_PREFIXES) {
    const pathname = prefix ? `/${prefix}/agenda` : '/agenda';
    assert.match(
      server,
      new RegExp(`"pathname":"${pathname.replace(/[/-]/g, '\\$&')}","prerender":false`),
      `${pathname} is not an on-demand route`,
    );
    const file = await readFile(
      path.join(this.distDir, prefix, 'agenda', 'index.html'),
      'utf8',
    ).catch(() => null);
    assert.equal(file, null, `${pathname} was built as a static file`);
  }
});

Then('every community page carries the follow button', async function () {
  // The house's page is a narrative since v3 (features/house.feature): no card, no follow.
  for (const id of publishedCommunityIds().filter((entry) => entry !== 'numen-games')) {
    for (const prefix of ['', 'es']) {
      const html = await readFile(
        path.join(this.distDir, prefix, 'communities', id, 'index.html'),
        'utf8',
      );
      assert.ok(
        html.includes('data-metric="community-follow"'),
        `${id} (${prefix || 'en'}): no follow`,
      );
      assert.ok(html.includes(`data-follow="${id}"`), `${id}: the button follows another id`);
      assert.ok(html.includes('numinia-follows'), `${id}: the follow list key is missing`);
    }
  }
});

Then('a ritual page opens on its world stage', async function () {
  // A city ritual opens in the commons: a real world, entered from the stage.
  const city = await readFile(
    path.join(this.distDir, 'es', 'rituals', 'numinia-anniversary-2026', 'index.html'),
    'utf8',
  );
  const stage = city.indexOf('class="mundo');
  assert.ok(stage > -1 && stage < city.indexOf('<h1'), 'city ritual: the stage is not first');
  assert.ok(
    city.includes('data-metric="ritual-enter-world"'),
    'city ritual: no way into its world',
  );
  // The way in leads to the commons: the link's own address, parsed and
  // compared whole — a substring of the page could sit inside any URL.
  const enter = /<a\b[^>]*\bdata-metric="ritual-enter-world"[^>]*>/.exec(city);
  const href = enter && /\bhref="([^"]+)"/.exec(enter[0]);
  assert.ok(href, 'city ritual: the way in has no address');
  const world = new URL(href[1]);
  assert.equal(
    `${world.origin}${world.pathname}`,
    'https://v2.oncyber.io/agora_plaza_of_numinia',
    'city ritual: the way in does not lead to the commons',
  );
  // A community without a home yet says so, and offers the calendar instead.
  const trg = await readFile(
    path.join(this.distDir, 'es', 'rituals', 'trg26', 'index.html'),
    'utf8',
  );
  assert.ok(trg.indexOf('class="mundo') < trg.indexOf('<h1'), 'trg26: the stage is not first');
  assert.ok(!trg.includes('data-metric="ritual-enter-world"'), 'trg26: a world it does not have');
  assert.ok(trg.includes('data-metric="ritual-stage-calendar"'), 'trg26: no calendar on the stage');
  assert.ok(trg.includes('data-metric="ritual-share"'), 'trg26: no share');
});

/** The address of the first link carrying a metric, parsed (never a substring of the page). */
function hrefOf(html, metric) {
  const tag = new RegExp(`<a\\b[^>]*\\bdata-metric="${metric}"[^>]*>`).exec(html);
  const href = tag && /\bhref="([^"]+)"/.exec(tag[0]);
  return href ? new URL(href[1].replace(/&amp;/g, '&')) : null;
}

Then('a community with a home opens it and counts who is inside', async function () {
  const vic = await readFile(
    path.join(this.distDir, 'es', 'communities', 'vic', 'index.html'),
    'utf8',
  );
  const enter = hrefOf(vic, 'community-enter-world');
  assert.ok(enter, 'vic: no way into its home');
  assert.equal(enter.origin, 'https://vic.numinia.com', 'vic: the way in leads elsewhere');
  assert.ok(vic.includes('data-inside="vic"'), 'vic: no slot for who is inside');
  assert.ok(vic.includes('/api/live'), 'vic: nothing reads who is inside');
  // A community without a home has neither the door nor the count.
  const trg = await readFile(
    path.join(this.distDir, 'es', 'communities', 'trgcon', 'index.html'),
    'utf8',
  );
  assert.ok(
    !trg.includes('data-metric="community-enter-world"'),
    'trgcon: a home it does not have',
  );
  assert.ok(!trg.includes('data-inside='), 'trgcon: counts a home it does not have');
});

Then('Live lists the open homes with their doors', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    const live = await readFile(path.join(this.distDir, prefix, 'live', 'index.html'), 'utf8');
    assert.ok(live.includes('id="homes"'), `live (${prefix || 'en'}): no open homes`);
    assert.ok(
      live.includes('data-inside-row="vic"'),
      `live (${prefix || 'en'}): vic is not in «Now»`,
    );
    assert.ok(live.includes('data-inside-empty'), `live (${prefix || 'en'}): no word for nobody`);
  }
  const live = await readFile(path.join(this.distDir, 'es', 'live', 'index.html'), 'utf8');
  const door = hrefOf(live, 'live-home-enter');
  assert.ok(door, 'live: an open home without a door');
});

Then('the Oracle alone sees how to edit a community and its rituals', async function () {
  const vic = await readFile(
    path.join(this.distDir, 'es', 'communities', 'vic', 'index.html'),
    'utf8',
  );
  const edit = hrefOf(vic, 'community-edit');
  assert.ok(edit, 'vic: no edit');
  assert.equal(
    `${edit.origin}${edit.pathname}`,
    'https://github.com/numengames/numinia-web/edit/main/apps/store/src/content/communities/vic.md',
    'vic: the edit opens another file',
  );
  const add = hrefOf(vic, 'community-add-ritual');
  assert.ok(add && add.pathname.endsWith('/content/communities/rituals'), 'vic: no new ritual');
  assert.ok(
    (add.searchParams.get('value') ?? '').includes('community: vic'),
    'vic: the draft is not hers',
  );
  const card = /<section\b[^>]*data-session-ranks="oracle"[^>]*>/.exec(vic);
  assert.ok(card && /\bhidden\b/.test(card[0]), 'vic: the edit card is not hidden by default');
  const ritual = await readFile(
    path.join(this.distDir, 'es', 'rituals', 'trg26', 'index.html'),
    'utf8',
  );
  const editRitual = hrefOf(ritual, 'ritual-edit');
  assert.ok(editRitual && editRitual.pathname.endsWith('/rituals/trg26.md'), 'trg26: no edit');
});

// --- the Oracle's video, 2026-10-14: the home's shelf, what a space uses, the word ---

Then(
  "the home's newest goods are four in one row, and the encounters ride a strip with arrows",
  async function () {
    for (const prefix of LOCALE_PREFIXES) {
      const where = prefix || 'en';
      const html = await readFile(path.join(this.distDir, prefix, 'index.html'), 'utf8');
      // The encounters ride a strip (.pista) with its two arrows.
      const section = html.slice(html.indexOf('id="rituals"'), html.indexOf('id="alive"'));
      const tag = /<div\b[^>]*\bclass="pista[^"]*"[^>]*\bid="rituales-pista"[^>]*>/.exec(section);
      assert.ok(tag, `${where}: rituales-pista is not a strip`);
      assert.match(tag[0], /\bdata-step-px="\d+"/, `${where}: rituales-pista has no step`);
      for (const step of ['-1', '1']) {
        assert.match(
          section,
          new RegExp(
            `<button\\b[^>]*data-step="${step}"[^>]*aria-controls="rituales-pista"[^>]*data-metric=`,
          ),
          `${where}: rituales-pista lacks its ${step === '1' ? 'next' : 'previous'} arrow`,
        );
      }
      // «Recién llegado al Bazar»: four goods, one row of a grid that fits four.
      const block = html.slice(html.indexOf('id="bazaar"'), html.indexOf('class="final"'));
      assert.ok(block.includes('rejilla-obj'), `${where}: the newest goods are not a row`);
      assert.equal(
        (block.match(/data-metric="home-good"/g) ?? []).length,
        4,
        `${where}: the row does not carry the four newest goods`,
      );
    }
  },
);

const SPACE_PIECES = ['home', 'gatherings', 'archive', 'members', 'balance'];

/** One piece of a page's «what this space uses»: its state and its markup. */
function spacePiece(html, piece) {
  const match = new RegExp(
    `<li\\b[^>]*\\bdata-piece="${piece}"[^>]*\\bdata-state="([a-z-]+)"[^>]*>([\\s\\S]*?)</li>`,
  ).exec(html);
  return match ? { state: match[1], body: match[2] } : null;
}

Then('every community page lists the five pieces its space uses', async function () {
  // The house's page is a narrative since v3 (features/house.feature): it tells, it lists no pieces.
  for (const id of publishedCommunityIds().filter((entry) => entry !== 'numen-games')) {
    for (const prefix of LOCALE_PREFIXES) {
      const where = `${id} (${prefix || 'en'})`;
      const html = await readFile(
        path.join(this.distDir, prefix, 'communities', id, 'index.html'),
        'utf8',
      );
      const start = html.indexOf('data-space-uses');
      assert.ok(start !== -1, `${where}: no «what this space uses»`);
      const block = html.slice(start, html.indexOf('</section>', start));
      assert.deepEqual(
        [...block.matchAll(/\bdata-piece="([a-z]+)"/g)].map((match) => match[1]),
        SPACE_PIECES,
        `${where}: the pieces`,
      );
      assert.ok(start < html.indexOf('id="encuentros"'), `${where}: the block is not first`);
    }
  }
});

Then(
  'a home is entered and counted only where it exists, and the rest is marked under construction',
  async function () {
    const page = (id) =>
      readFile(path.join(this.distDir, 'es', 'communities', id, 'index.html'), 'utf8');
    const crane = /class="icono grua"/;
    // VIC's home is in the fleet: the block enters it and counts who is inside.
    const vic = spacePiece(await page('vic'), 'home');
    assert.equal(vic?.state, 'world', 'vic: no home in the block');
    assert.equal(hrefOf(vic.body, 'community-uses-home')?.origin, 'https://vic.numinia.com');
    assert.ok(
      vic.body.includes('data-inside="vic"'),
      'vic: the block does not count who is inside',
    );
    // TRGCON has no home: it says so and counts nothing.
    const trgHtml = await page('trgcon');
    const trg = spacePiece(trgHtml, 'home');
    assert.equal(trg?.state, 'no-home', 'trgcon: a home it does not have');
    assert.ok(trg.body.includes('Sin sede todavía'), 'trgcon: no «sin sede todavía»');
    assert.ok(!trg.body.includes('data-inside='), 'trgcon: counts a home it does not have');
    // Its gatherings: as many as the page lists coming, linked to that list.
    const coming = (trgHtml.match(/data-metric="ritual-card"/g) ?? []).length;
    const gatherings = spacePiece(trgHtml, 'gatherings');
    assert.equal(gatherings?.state, 'coming');
    assert.ok(coming >= 1, 'trgcon: no gathering coming in the register');
    const said = coming === 1 ? '1 próximo' : `${coming} próximos`;
    assert.ok(gatherings.body.includes(said), `trgcon: the block does not say «${said}»`);
    assert.match(gatherings.body, /href="#encuentros"/, 'trgcon: the count leads nowhere');
    // What is not built yet carries the crane and says so.
    for (const piece of ['archive', 'members', 'balance']) {
      const entry = spacePiece(trgHtml, piece);
      assert.equal(entry?.state, 'building', `trgcon: ${piece} is not marked`);
      assert.ok(entry.body.includes('En construcción'), `trgcon: ${piece} without its words`);
      assert.match(entry.body, crane, `trgcon: ${piece} without the crane`);
    }
    // The founder keeps the commons (nothing counted there): its narrative page opens them in «Lo que cuida».
    const founderHtml = await page('numen-games');
    const door = hrefOf(founderHtml, 'house-world-enter');
    assert.equal(
      `${door?.origin}${door?.pathname}`,
      'https://v2.oncyber.io/agora_plaza_of_numinia',
      'numen-games: «Lo que cuida» does not open the commons',
    );
    assert.ok(!founderHtml.includes('data-inside='), 'numen-games: counts the commons');
  },
);

/** Where the next `<name …>` opens at or after `from` in the lower-cased page; -1 when none. */
function openingOf(lower, name, from) {
  for (
    let at = lower.indexOf(`<${name}`, from);
    at !== -1;
    at = lower.indexOf(`<${name}`, at + 1)
  ) {
    const next = lower.charAt(at + name.length + 1);
    if (next === '>' || next === '/' || next.trim() === '') return at;
  }
  return -1;
}

/** The page with its <script> and <style> elements cut out, found in any case by walking the
 *  lower-cased text with indexOf. A tag regex misses <SCRIPT> (CodeQL js/bad-tag-filter). */
function withoutCode(html) {
  const lower = html.toLowerCase();
  let kept = '';
  let at = 0;
  for (;;) {
    const opens = ['script', 'style']
      .map((name) => ({ name, start: openingOf(lower, name, at) }))
      .filter((open) => open.start !== -1)
      .sort((a, b) => a.start - b.start);
    if (opens.length === 0) return kept + html.slice(at);
    const { name, start } = opens[0];
    const close = lower.indexOf(`</${name}`, start);
    const end = close === -1 ? -1 : lower.indexOf('>', close);
    kept += `${html.slice(at, start)} `;
    if (end === -1) return kept;
    at = end + 1;
  }
}

/** The words a reader meets on a page: its text, and the labels read aloud or shown on hover.
 *  A path stays as it is (a gathering's «Its file» names src/content/communities/rituals/…):
 *  file names and routes keep the old word by design, only the words on screen changed. */
function visibleText(html) {
  const bare = withoutCode(html);
  const labels = [...bare.matchAll(/\b(?:aria-label|title|alt|placeholder)="([^"]*)"/g)].map(
    (match) => match[1],
  );
  return `${bare.replace(/<[^>]+>/g, ' ')} ${labels.join(' ')}`.replace(/\S*\/rituals\/\S*/g, ' ');
}

/** The old word, per locale; how-it-works.ts's own word replaced it on screen. */
const OLD_WORD = {
  '': /\britual/i,
  es: /\britual/i,
  ja: /儀式/,
  ko: /의식/,
  'pt-br': /\britua(l|is)\b/i,
};

Then('the pages of the communities say «encuentro», never «ritual»', async function () {
  const rituals = readdirSync(path.join(COMMUNITY_FILES, 'rituals'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `rituals/${name.replace(/\.md$/, '')}/index.html`);
  const communities = publishedCommunityIds().map((id) => `communities/${id}/index.html`);
  const pages = [
    'index.html',
    'communities/index.html',
    'calendar/index.html',
    'live/index.html',
    'belong/index.html',
    'how-it-works/index.html',
    ...communities,
    ...rituals,
  ];
  for (const prefix of LOCALE_PREFIXES) {
    for (const page of pages) {
      const html = await readFile(path.join(this.distDir, prefix, page), 'utf8').catch(() => null);
      if (html === null) continue; // a gathering of a community not published has no page
      const found = OLD_WORD[prefix].exec(visibleText(html));
      assert.equal(found, null, `${prefix || 'en'}/${page} still says «${found?.[0]}»`);
    }
  }
});

Then('the bazaar and lap pages exist under every locale prefix', async function () {
  for (const prefix of LOCALE_PREFIXES) {
    for (const slug of ['bazaar', 'lap']) {
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

// STD-044 CEL-010, CEL-009: a thanks page exists in every locale, carries
// noindex, is out of the sitemap, and keeps nothing about the buyer.
Then('every thanks page asks not to be indexed and stays out of the sitemap', async function () {
  const sitemap = await readFile(path.join(this.distDir, 'sitemap-0.xml'), 'utf8');
  assert.ok(!sitemap.includes('/back/thanks/'), 'sitemap lists a thanks page');
  assert.ok(!sitemap.includes('/support/thanks/'), 'sitemap lists a thanks redirect stub');
  for (const prefix of ['', 'es/', 'ja/', 'ko/', 'pt-br/']) {
    const html = await readFile(
      path.join(this.distDir, `${prefix}back/thanks/backer/index.html`),
      'utf8',
    );
    assert.match(
      html,
      /<meta name="robots" content="noindex"/,
      `${prefix}back/thanks/backer has no noindex`,
    );
    assert.ok(
      !/location\.search|URLSearchParams/.test(html),
      `${prefix}back/thanks/backer reads its address`,
    );
  }
});

Then(
  'the pages of communities with an organization carry a hidden slot for its people, and the others carry none',
  async function () {
    let linked = 0;
    let alone = 0;
    for (const id of publishedCommunityIds()) {
      const hasTeam = /^team:\s*\S+\s*$/m.test(
        frontmatterOf(path.join(COMMUNITY_FILES, `${id}.md`)),
      );
      for (const prefix of LOCALE_PREFIXES) {
        const where = `${id} (${prefix || 'en'})`;
        const html = await readFile(
          path.join(this.distDir, prefix, 'communities', id, 'index.html'),
          'utf8',
        );
        const slot = /<div[^>]*\bdata-people="([^"]*)"[^>]*>/.exec(html);
        if (!hasTeam) {
          assert.equal(slot, null, `${where}: a slot for people with no organization linked`);
          continue;
        }
        assert.ok(slot, `${where}: no slot for its people`);
        assert.equal(slot[1], id, `${where}: the slot names another community`);
        assert.ok(/\bhidden\b/.test(slot[0]), `${where}: the slot is not hidden at build`);
        const start = html.indexOf(slot[0]);
        const block = html.slice(start, html.indexOf('<script', start));
        assert.ok(!/0x[0-9a-f]{4}/i.test(block), `${where}: the built page names a wallet`);
        assert.ok(
          /<p[^>]*\bdata-people-count\b[^>]*><\/p>/.test(block),
          `${where}: the built page carries a count`,
        );
        assert.ok(
          /<div[^>]*\bdata-people-groups\b[^>]*><\/div>/.test(block),
          `${where}: the built page carries people`,
        );
      }
      if (hasTeam) linked += 1;
      else alone += 1;
    }
    assert.ok(linked >= 1, 'no community links an organization');
    assert.ok(alone >= 10, `only ${alone} communities without one`);
  },
);
