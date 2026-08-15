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
