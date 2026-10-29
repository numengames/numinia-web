/**
 * Step definitions for «Tu nombre en la ciudad» (features/profile-name.feature,
 * cut «Tu nombre y tu cara», 2026-10-16): the built /lap/settings/ pages in
 * every locale. Kept in their own file so the shared acceptance.steps.mjs
 * stays untouched. The Bazar's avatars are read from the committed catalogue
 * and the baked thumbnails' manifest, as the build reads them.
 */
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Then } from '@cucumber/cucumber';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const store = path.join(repoRoot, 'apps', 'store');

const LOCALES = [
  { prefix: 'es', title: 'Tu nombre en la ciudad', nobody: 'Nadie más.' },
  { prefix: '', title: 'Your name in the city', nobody: 'Nobody else.' },
  { prefix: 'ja', title: 'まちでのあなたの名前', nobody: 'それ以外の人には見えません。' },
  { prefix: 'ko', title: '도시에서 쓰는 내 이름', nobody: '그 밖의 누구도 볼 수 없습니다.' },
  { prefix: 'pt-br', title: 'Seu nome na cidade', nobody: 'Mais ninguém.' },
];

async function settingsHtml(distDir, prefix) {
  const file = path.join(distDir, prefix, 'lap', 'settings', 'index.html');
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${prefix || 'en'}/lap/settings/`);
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

/** The section «Tu nombre en la ciudad», from its opening tag to its own end. */
function sectionOf(html, where) {
  const open = tagWith(html, 'id="nombre"');
  assert.ok(open?.startsWith('<section'), `${where}: no <section id="nombre">`);
  const start = html.indexOf(open);
  const end = html.indexOf('</section>', start);
  return { open, start, body: html.slice(start, end) };
}

/** The Bazar's avatars a person may choose: public, not drafts, with a baked thumbnail. */
async function bazaarAvatars() {
  const catalogs = JSON.parse(
    await readFile(path.join(store, 'fixtures', 'catalogs.json'), 'utf8'),
  );
  const baked = new Set(
    JSON.parse(await readFile(path.join(store, 'src', 'generated', 'local-thumbs.json'), 'utf8')),
  );
  return catalogs.avatars
    .filter((asset) => asset.is_public === true && asset.is_draft !== true && baked.has(asset.id))
    .map((asset) => asset.id);
}

Then(
  "every locale's settings page has the section «Tu nombre en la ciudad» at #nombre, right after the session's",
  async function () {
    for (const { prefix, title } of LOCALES) {
      const html = await settingsHtml(this.distDir, prefix);
      const where = `${prefix || 'en'}/lap/settings/`;
      const { open, start } = sectionOf(html, where);
      assert.equal(attr(open, 'aria-labelledby'), 's-nombre', `${where}: not labelled by its h3`);
      const heading = tagWith(html, 'id="s-nombre"');
      // An h3 since MIS-268: the section sits inside the «Cuenta» part (h2).
      assert.ok(heading?.startsWith('<h3'), `${where}: the label is not an h3`);
      const after = html.slice(html.indexOf(heading) + heading.length);
      assert.ok(after.startsWith(`${title}<`), `${where}: the title is not «${title}»`);
      // Right after «Sesión»: the session's section ends, and this one is the next.
      const session = html.indexOf('id="s-session"');
      assert.ok(session > 0 && session < start, `${where}: not after the session`);
      const between = html.slice(html.indexOf('</section>', session), start);
      assert.ok(!between.includes('<section'), `${where}: another section sits in between`);
    }
  },
);

Then(
  'each section says who will see the name before it asks for one, and stays hidden until there is a session',
  async function () {
    for (const { prefix, nobody } of LOCALES) {
      const html = await settingsHtml(this.distDir, prefix);
      const where = `${prefix || 'en'}/lap/settings/`;
      const { open, body } = sectionOf(html, where);
      assert.notEqual(attr(open, 'data-session-in'), null, `${where}: not tied to the session`);
      assert.notEqual(attr(open, 'hidden'), null, `${where}: shown before the session is known`);
      const who = body.indexOf('data-profile-who');
      assert.ok(who > 0, `${where}: nobody is told who will see it`);
      const sentence = body.slice(who, body.indexOf('</p>', who));
      assert.ok(sentence.includes(nobody), `${where}: the sentence does not end «${nobody}»`);
      const input = body.indexOf('id="profile-name"');
      assert.ok(input > who, `${where}: the name is asked before saying who sees it`);
    }
  },
);

Then(
  "every locale's section offers the Bazar's avatars with their baked thumbnails, no avatar first and chosen",
  async function () {
    const expected = await bazaarAvatars();
    assert.ok(expected.length >= 2, 'the Bazar offers fewer than two avatars');
    for (const { prefix } of LOCALES) {
      const html = await settingsHtml(this.distDir, prefix);
      const where = `${prefix || 'en'}/lap/settings/`;
      const { body } = sectionOf(html, where);
      const radios = [...body.matchAll(/<input\b[^>]*\bname="avatar"[^>]*>/g)].map((m) => m[0]);
      assert.equal(attr(radios[0], 'value'), '', `${where}: «no avatar» is not first`);
      assert.notEqual(attr(radios[0], 'checked'), null, `${where}: «no avatar» is not chosen`);
      for (const radio of radios)
        assert.equal(attr(radio, 'type'), 'radio', `${where}: not a radio`);
      assert.deepEqual(
        radios.slice(1).map((radio) => attr(radio, 'value')),
        expected,
        `${where}: not the Bazar's avatars`,
      );
      for (const id of expected) {
        const face = `/thumbs/1x/${id}.webp`;
        const img = tagWith(body, `src="${face}"`);
        assert.ok(img?.startsWith('<img'), `${where}: no thumbnail for ${id}`);
        assert.equal(attr(img, 'alt'), '', `${where}: ${id}'s thumbnail is not decorative`);
        assert.ok(
          existsSync(path.join(this.distDir, face)),
          `${where}: ${face} is not in the build`,
        );
      }
      assert.ok(!/<input\b[^>]*type="file"/.test(body), `${where}: a picture can be uploaded`);
    }
  },
);

Then('every control of the section carries a data-metric', async function () {
  for (const { prefix } of LOCALES) {
    const html = await settingsHtml(this.distDir, prefix);
    const where = `${prefix || 'en'}/lap/settings/`;
    const { body } = sectionOf(html, where);
    const controls = [...body.matchAll(/<(?:a|button|input|select|textarea)\b[^>]*>/g)].map(
      (m) => m[0],
    );
    assert.ok(controls.length >= 4, `${where}: too few controls`);
    for (const control of controls) {
      assert.ok(attr(control, 'data-metric'), `${where}: no data-metric on ${control}`);
    }
  }
});
