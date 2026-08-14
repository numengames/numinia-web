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
  await writeFile(
    fixturePath,
    'export function bad(x: any): void { console.log(x); }\n',
    'utf8',
  );
});

When('the lint gate runs on it', async function () {
  this.lint = await new Promise((resolve) => {
    execFile(
      'npx',
      ['eslint', fixturePath],
      { cwd: repoRoot },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, output: stdout + stderr }),
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
