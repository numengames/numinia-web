/**
 * Step definitions for the sign-in door (features/sign-in-door.feature,
 * QA 2026-10-15): the built /lap/session/ pages and the island's script.
 * Kept in their own file so the shared acceptance.steps.mjs stays untouched.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Then } from '@cucumber/cucumber';

const LOCALES = [
  { prefix: '', title: 'Sign in to Numinia', close: 'Close' },
  { prefix: 'es', title: 'Inicia sesión en Numinia', close: 'Cerrar' },
  { prefix: 'ja', title: 'ヌミニアにログイン', close: '閉じる' },
  { prefix: 'ko', title: '누미니아에 로그인', close: '닫기' },
  { prefix: 'pt-br', title: 'Entrar em Numinia', close: 'Fechar' },
];

async function doorHtml(distDir, prefix) {
  const file = path.join(distDir, prefix, 'lap', 'session', 'index.html');
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${prefix || 'en'}/lap/session/`);
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
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag ?? '');
  return match ? match[1] : null;
}

Then(
  "every locale's sign-in door is one labelled dialog with a close button first",
  async function () {
    for (const { prefix, title, close } of LOCALES) {
      const html = await doorHtml(this.distDir, prefix);
      const where = `${prefix || 'en'}/lap/session/`;
      const dialog = tagWith(html, 'role="dialog"');
      assert.ok(dialog, `${where}: no dialog`);
      assert.equal(attr(dialog, 'aria-modal'), 'true', `${where}: not modal`);
      const labelledBy = attr(dialog, 'aria-labelledby');
      const heading = tagWith(html, `id="${labelledBy}"`);
      assert.ok(heading?.startsWith('<h1'), `${where}: the dialog is not labelled by its h1`);
      const headingText = html.slice(html.indexOf(heading) + heading.length);
      assert.ok(headingText.includes(`>${title}<`), `${where}: title is not «${title}»`);
      // The close button is the panel's first control, before the widget.
      const body = html.slice(html.indexOf(dialog));
      const firstControl = /<(a|button|input)\b[^>]*>/.exec(body)?.[0];
      assert.equal(attr(firstControl, 'aria-label'), close, `${where}: × is not first`);
      assert.equal(attr(firstControl, 'data-metric'), 'auth-close', `${where}: × metric`);
      // The LAP rail and the old page's «← Ajustes» are gone.
      assert.ok(!html.includes('data-lap-shell'), `${where}: still inside the LAP shell`);
      assert.ok(!html.includes('data-metric="session-back"'), `${where}: still has «← Ajustes»`);
    }
  },
);

Then(
  'no sign-in door asks for a tick and each links the terms and the privacy policy',
  async function () {
    for (const { prefix } of LOCALES) {
      const html = await doorHtml(this.distDir, prefix);
      const where = `${prefix || 'en'}/lap/session/`;
      const base = prefix ? `/${prefix}` : '';
      assert.ok(!/type="checkbox"/.test(html), `${where}: a checkbox is still asked`);
      assert.ok(!html.includes('data-legal-gate'), `${where}: the legal gate is still there`);
      const legal = tagWith(html, 'data-door-legal');
      assert.ok(legal, `${where}: no legal line`);
      const line = html.slice(html.indexOf(legal), html.indexOf('</p>', html.indexOf(legal)));
      assert.equal(
        attr(tagWith(line, 'data-metric="auth-legal-terms"'), 'href'),
        `${base}/legal/terms/`,
        `${where}: terms link`,
      );
      assert.equal(
        attr(tagWith(line, 'data-metric="auth-legal-privacy"'), 'href'),
        `${base}/legal/privacy/`,
        `${where}: privacy link`,
      );
    }
  },
);

Then(
  "the sign-in door's script sends the current legal corpus version with the login",
  async function () {
    const { LEGAL_DOC_VERSION } = await import('../../apps/store/src/lib/legal.ts');
    const html = await doorHtml(this.distDir, 'es');
    const island = attr(tagWith(html, 'component-export="LoginSpike"'), 'component-url');
    assert.ok(island, 'the door mounts no LoginSpike island');
    const script = await readFile(path.join(this.distDir, island), 'utf8');
    assert.ok(script.includes('/api/auth/login'), 'the island does not reach the login endpoint');
    // The login body carries the accepted corpus beside the signature …
    assert.ok(
      /JSON\.stringify\(\{[^}]*\bsignature:[^}]*\bterms:/.test(script),
      'the login request carries no `terms`',
    );
    // … built from the current versions of the terms and the privacy policy.
    assert.ok(script.includes('terms@') && script.includes('+privacy@'), 'no corpus version');
    for (const doc of ['terms', 'privacy']) {
      assert.ok(
        script.includes(`${doc}:\`${LEGAL_DOC_VERSION[doc]}\``) ||
          script.includes(`${doc}:"${LEGAL_DOC_VERSION[doc]}"`),
        `the island does not carry ${doc} ${LEGAL_DOC_VERSION[doc]}`,
      );
    }
  },
);
