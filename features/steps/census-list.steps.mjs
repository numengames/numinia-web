/**
 * Step definitions for «Quién ha entrado» (features/census-list.feature, cut
 * «El censo», 2026-10-16): the built /lap/admin/census/ pages in every
 * locale. Kept in their own file so the shared acceptance.steps.mjs stays
 * untouched. The data-metric ids are checked against the register's block
 * for this cut in packages/analytics/src/events.ts.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Then } from '@cucumber/cucumber';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const LOCALES = [
  {
    prefix: 'es',
    title: 'Quién ha entrado',
    before: 'Solo aparece quien ha entrado desde que existe esta lista',
  },
  {
    prefix: '',
    title: 'Who has signed in',
    before: 'Only people who have signed in since this list began',
  },
  { prefix: 'ja', title: 'サインインした人', before: 'このリストができてからサインインした人だけ' },
  { prefix: 'ko', title: '로그인한 사람', before: '이 목록이 생긴 뒤 로그인한 사람만' },
  {
    prefix: 'pt-br',
    title: 'Quem já entrou',
    before: 'Só aparece quem entrou desde que esta lista existe',
  },
];

async function censusHtml(distDir, prefix) {
  const file = path.join(distDir, prefix, 'lap', 'admin', 'census', 'index.html');
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${prefix || 'en'}/lap/admin/census/`);
  return html;
}

/** The opening tag of the first element carrying `marker`. */
function tagWith(html, marker) {
  const at = html.indexOf(marker);
  if (at < 0) return null;
  const start = html.lastIndexOf('<', at);
  return html.slice(start, html.indexOf('>', at) + 1);
}

function attr(tag, name) {
  const match = new RegExp(`\\s${name}(?:="([^"]*)")?[\\s>/]`).exec(tag ?? '');
  return match ? (match[1] ?? '') : null;
}

/** The list's section, from its opening tag to its own end. */
function sectionOf(html, where) {
  const open = tagWith(html, 'data-citizens=');
  assert.ok(open?.startsWith('<section'), `${where}: no <section data-citizens>`);
  const start = html.indexOf(open);
  const end = html.indexOf('</section>', start);
  return { open, start, body: html.slice(start, end) };
}

Then(
  "every locale's Census page has the list «Quién ha entrado» above the lookup, hidden until an Oracle signs in",
  async function () {
    for (const { prefix, title } of LOCALES) {
      const where = prefix || 'en';
      const html = await censusHtml(this.distDir, prefix);
      const { open, start, body } = sectionOf(html, where);
      assert.equal(attr(open, 'data-session-ranks'), 'oracle', `${where}: not for the house only`);
      assert.notEqual(attr(open, 'hidden'), null, `${where}: shown before the session is known`);
      assert.ok(body.includes(title), `${where}: no title «${title}»`);
      const lookup = html.indexOf('data-census-panel');
      assert.ok(lookup > start, `${where}: the list is not above the one-wallet lookup`);
    }
  },
);

Then(
  'each list says in one sentence that people who signed in before today appear once they sign in again',
  async function () {
    for (const { prefix, before } of LOCALES) {
      const where = prefix || 'en';
      const { body } = sectionOf(await censusHtml(this.distDir, prefix), where);
      const note = tagWith(body, 'data-citizens-before');
      assert.ok(note, `${where}: no sentence about those who signed in before`);
      assert.ok(body.includes(before), `${where}: the sentence does not say «${before}»`);
    }
  },
);

Then('every control of the list carries a registered data-metric', async function () {
  const events = await readFile(
    path.join(repoRoot, 'packages', 'analytics', 'src', 'events.ts'),
    'utf8',
  );
  for (const { prefix } of LOCALES) {
    const where = prefix || 'en';
    const { body } = sectionOf(await censusHtml(this.distDir, prefix), where);
    const controls = body.match(/<(?:input|button|select|a)\b[^>]*>/g) ?? [];
    assert.ok(controls.length > 0, `${where}: the list has no control`);
    for (const control of controls) {
      const metric = attr(control, 'data-metric');
      assert.ok(metric, `${where}: no data-metric on ${control}`);
      assert.ok(events.includes(`\`${metric}\``), `${where}: ${metric} is not registered`);
    }
  }
});
