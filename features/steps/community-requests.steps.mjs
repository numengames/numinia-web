/**
 * Step definitions for «Hazla tuya» for real (features/community-requests.feature,
 * cut G, 2026-10-17): the built community pages and Census pages in every
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
  { prefix: 'es', claim: 'Es mi comunidad', join: 'Quiero entrar', note: 'Cuéntanos quién eres' },
  { prefix: '', claim: 'It is my community', join: 'I want in', note: 'Tell us who you are' },
  {
    prefix: 'ja',
    claim: '私のコミュニティです',
    join: '参加したい',
    note: 'あなたについて教えてください',
  },
  {
    prefix: 'ko',
    claim: '내 커뮤니티입니다',
    join: '들어가고 싶어요',
    note: '당신이 누구인지 알려주세요',
  },
  {
    prefix: 'pt-br',
    claim: 'É a minha comunidade',
    join: 'Quero entrar',
    note: 'Conte-nos quem você é',
  },
];

async function pageHtml(distDir, prefix, ...segments) {
  const file = path.join(distDir, prefix, ...segments, 'index.html');
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${prefix || 'en'}/${segments.join('/')}/`);
  return html;
}

/** The strip, from its opening tag to the dialog's end. */
function stripOf(html, where) {
  const start = html.indexOf('data-claim-strip');
  assert.ok(start >= 0, `${where}: no [data-claim-strip]`);
  const end = html.indexOf('</dialog>', start);
  assert.ok(end > start, `${where}: the strip has no dialog`);
  return html.slice(html.lastIndexOf('<', start), end);
}

function attr(tag, name) {
  const match = new RegExp(`\\s${name}(?:="([^"]*)")?[\\s>/]`).exec(tag ?? '');
  return match ? (match[1] ?? '') : null;
}

Then(
  "every locale's page of {string} carries the claim strip with the sign-in button, the two asks and the dialog with one optional line of 280",
  async function (community) {
    for (const { prefix, claim, join, note } of LOCALES) {
      const where = prefix || 'en';
      const strip = stripOf(await pageHtml(this.distDir, prefix, 'communities', community), where);
      assert.ok(strip.includes('data-claim-signin'), `${where}: no sign-in button`);
      assert.ok(strip.includes(claim), `${where}: no «${claim}»`);
      assert.ok(strip.includes('data-claim-ask="claim"'), `${where}: no claim ask`);
      assert.ok(strip.includes('data-claim-ask="join"'), `${where}: no join ask`);
      assert.ok(strip.includes(join), `${where}: no «${join}»`);
      assert.ok(strip.includes(note), `${where}: no «${note}»`);
      assert.ok(
        /<input[^>]*maxlength="280"/.test(strip),
        `${where}: the line is not bounded to 280`,
      );
      assert.ok(/<input[^>]*id="peticion-nota"/.test(strip), `${where}: the line has no id`);
      assert.ok(strip.includes('for="peticion-nota"'), `${where}: the line has no label`);
      // Signed out by default: only the sign-in button is visible before JavaScript.
      const asks = strip.match(/<button[^>]*data-claim-ask[^>]*>/g) ?? [];
      assert.equal(asks.length, 2, `${where}: ${asks.length} asks`);
      for (const ask of asks)
        assert.ok(/\shidden[\s>]/.test(ask), `${where}: an ask is not hidden by default`);
    }
  },
);

Then("the house's page {string} carries no claim strip", async function (community) {
  for (const { prefix } of LOCALES) {
    const html = await pageHtml(this.distDir, prefix, 'communities', community);
    assert.ok(!html.includes('data-claim-strip'), `${prefix || 'en'}: the house has a claim strip`);
  }
});

Then('every control of the strip carries a registered data-metric', async function () {
  const events = await readFile(
    path.join(repoRoot, 'packages', 'analytics', 'src', 'events.ts'),
    'utf8',
  );
  for (const { prefix } of LOCALES) {
    const where = prefix || 'en';
    const strip = stripOf(await pageHtml(this.distDir, prefix, 'communities', 'merge'), where);
    const controls = strip.match(/<(?:input|button|a)\b[^>]*>/g) ?? [];
    assert.ok(controls.length >= 6, `${where}: the strip has ${controls.length} controls`);
    for (const control of controls) {
      const metric = attr(control, 'data-metric');
      assert.ok(metric, `${where}: no data-metric on ${control}`);
      assert.ok(events.includes(`\`${metric}\``), `${where}: ${metric} is not registered`);
    }
  }
});

Then(
  "every locale's Census page has a «Peticiones» section hidden until an Oracle signs in",
  async function () {
    for (const { prefix } of LOCALES) {
      const where = prefix || 'en';
      const html = await pageHtml(this.distDir, prefix, 'lap', 'admin', 'census');
      const at = html.indexOf('data-census-requests');
      assert.ok(at >= 0, `${where}: no [data-census-requests]`);
      const tag = html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1);
      assert.ok(tag.startsWith('<section'), `${where}: not a section`);
      assert.equal(attr(tag, 'data-session-ranks'), 'oracle', `${where}: not for the Oracle alone`);
      assert.notEqual(attr(tag, 'hidden'), null, `${where}: not hidden by default`);
    }
  },
);
