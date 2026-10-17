/**
 * Step definitions for «Encuentros» (features/encuentros.feature, v3 lane 2):
 * the built /calendar/ pages read as HTML. The upcoming encounters are taken
 * from the register's own files (status not «held»), so a new file in
 * src/content/communities/rituals/ is checked without touching this file.
 * Kept apart so the shared acceptance.steps.mjs stays untouched.
 */
import { strict as assert } from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Then } from '@cucumber/cucumber';
import { parse as parseYaml } from 'yaml';

const ritualsDir = fileURLToPath(
  new URL('../../apps/store/src/content/communities/rituals/', import.meta.url),
);
const PREFIXES = ['', 'es', 'ja', 'ko', 'pt-br'];

/** The upcoming encounters on file, nearest first: [id, start]. */
async function upcomingOnFile() {
  const files = (await readdir(ritualsDir)).filter((file) => file.endsWith('.md'));
  const rows = [];
  for (const file of files) {
    const text = await readFile(path.join(ritualsDir, file), 'utf8');
    const front = parseYaml(text.split(/^---$/m)[1]);
    if (front.status === 'held') continue;
    rows.push([file.replace(/\.md$/, ''), String(front.start)]);
  }
  return rows.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
}

async function encuentrosHtml(distDir, prefix) {
  return readFile(path.join(distDir, prefix, 'calendar', 'index.html'), 'utf8');
}

Then(
  'the Encuentros page of every locale lists each upcoming encounter once, by month in date order',
  async function () {
    const coming = await upcomingOnFile();
    assert.ok(coming.length > 0, 'no upcoming encounter on file to check against');
    for (const prefix of PREFIXES) {
      const where = prefix || 'en';
      const html = await encuentrosHtml(this.distDir, prefix);
      const list = html.slice(
        html.indexOf('data-enc-panel="list"'),
        html.indexOf('data-enc-panel="month"'),
      );
      assert.ok(list.length > 0, `${where}: no list view`);
      const rows = [...list.matchAll(/data-enc-row="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(
        rows,
        coming.map(([id]) => id),
        `${where}: rows are not the upcoming encounters in date order`,
      );
      const base = prefix ? `/${prefix}` : '';
      for (const [id] of coming) {
        assert.ok(
          list.includes(`href="${base}/rituals/${id}/"`),
          `${where}: ${id} does not link to its page`,
        );
      }
      const months = [...list.matchAll(/id="mes-(\d{4}-\d{2})"/g)].map((match) => match[1]);
      const expected = [...new Set(coming.map(([, start]) => start.slice(0, 7)))];
      assert.deepEqual(months, expected, `${where}: month sections are not the encounters' months`);
    }
  },
);

Then('the Encuentros page also carries the month grid and the city feed', async function () {
  for (const prefix of PREFIXES) {
    const where = prefix || 'en';
    const html = await encuentrosHtml(this.distDir, prefix);
    assert.ok(
      /data-enc-panel="month"[^>]*hidden/.test(html) ||
        /hidden[^>]*data-enc-panel="month"/.test(html),
      `${where}: the month grid is not built hidden`,
    );
    assert.ok(html.includes('class="cal"'), `${where}: no month grid`);
    assert.ok(html.includes('href="/calendar.ics"'), `${where}: no city feed`);
    assert.ok(html.includes('data-metric="encuentros-view-month"'), `${where}: no «Mes» switch`);
  }
});
