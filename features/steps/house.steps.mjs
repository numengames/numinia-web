/**
 * Step definitions for «La esfera y la casa» (features/house.feature, v3 cut
 * B): the built pages of /communities/ and of Numen Games in the five
 * locales. Kept in their own file so the shared acceptance.steps.mjs stays
 * as it is.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Then } from '@cucumber/cucumber';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMMUNITY_FILES = path.join(repoRoot, 'apps', 'store', 'src', 'content', 'communities');
const PREFIXES = ['', 'es', 'ja', 'ko', 'pt-br'];
const HOUSE = 'numen-games';
const MAX_DOTS = 12;

/** The ids of the published communities other than the house. */
function otherCommunities() {
  return readdirSync(COMMUNITY_FILES)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => {
      const text = readFileSync(path.join(COMMUNITY_FILES, name), 'utf8');
      return !/^visibility:\s*house\s*$/m.test(text) && !/^state:\s*founder\s*$/m.test(text);
    })
    .map((name) => name.replace(/\.md$/, ''));
}

/** The slice of a page from an opening marker to the next closing tag of `tag`. */
function blockFrom(html, marker, end) {
  const start = html.indexOf(marker);
  assert.ok(start !== -1, `no ${marker}`);
  return html.slice(start, html.indexOf(end, start));
}

Then(
  'the communities index in every locale draws the house in its sphere and not in the grid',
  async function () {
    const others = otherCommunities();
    for (const prefix of PREFIXES) {
      const where = prefix || 'en';
      const html = await readFile(
        path.join(this.distDir, prefix, 'communities', 'index.html'),
        'utf8',
      );
      const grid = blockFrom(html, 'id="communities"', 'id="none"');
      assert.ok(!grid.includes(`/communities/${HOUSE}/`), `${where}: the house is in the grid`);
      for (const id of others) {
        assert.ok(grid.includes(`/communities/${id}/`), `${where}: ${id} is not in the grid`);
      }
      const figure = blockFrom(html, 'data-house-figure', '</figure>');
      assert.ok(figure.includes('data-house-sphere'), `${where}: no sphere in the house's card`);
      assert.ok(
        figure.includes(`/communities/${HOUSE}/`),
        `${where}: the card does not lead to the house`,
      );
      const dots = [...figure.matchAll(/\bdata-dot="([^"]+)"/g)].map((match) => match[1]);
      assert.equal(dots.length, Math.min(MAX_DOTS, others.length), `${where}: dots on the ring`);
      assert.ok(!dots.includes(HOUSE), `${where}: the house has a dot on its own ring`);
      const more = /class="mas-com"[^>]*>\s*\+(\d+)/.exec(figure);
      if (others.length > MAX_DOTS) {
        assert.equal(Number(more?.[1]), others.length - MAX_DOTS, `${where}: the «+N» chip`);
      } else {
        assert.equal(more, null, `${where}: a «+N» chip with nothing left out`);
      }
      // The sphere is named for a screen reader, and every dot is a link with a name.
      assert.match(
        figure,
        /role="group"[^>]*aria-label="[^"]{20,}"/,
        `${where}: the sphere has no name`,
      );
      const links = [...figure.matchAll(/<a\b[^>]*data-metric="house-sphere-dot"[^>]*>/g)];
      assert.equal(links.length, dots.length, `${where}: a dot that is not a link`);
      for (const link of links)
        assert.match(link[0], /aria-label="[^"]+"/, `${where}: a dot without a name`);
    }
  },
);

Then(
  'the page of Numen Games in every locale tells the three rings and the metagame and closes on the epitaph',
  async function () {
    for (const prefix of PREFIXES) {
      const where = prefix || 'en';
      const html = await readFile(
        path.join(this.distDir, prefix, 'communities', HOUSE, 'index.html'),
        'utf8',
      );
      assert.ok(html.includes('data-house-sphere'), `${where}: no sphere`);
      assert.ok(!html.includes('data-space-uses'), `${where}: still a card page`);
      const rings = blockFrom(html, 'id="nudo"', '</section>');
      assert.equal((rings.match(/<li\b/g) ?? []).length, 3, `${where}: not three rings`);
      const meta = blockFrom(html, 'id="metajuego"', '</section>');
      assert.equal(
        (meta.match(/<article\b/g) ?? []).length,
        5,
        `${where}: the metagame's five pieces`,
      );
      const ranks = blockFrom(meta, 'data-house-ranks', '</ol>');
      assert.equal((ranks.match(/<li\b/g) ?? []).length, 6, `${where}: the ranks' ladder`);
      assert.ok(html.includes('id="citas"'), `${where}: no gatherings`);
      assert.ok(html.includes('data-people="numen-games"'), `${where}: no people`);
      assert.ok(html.includes('They dreamed and experimented life'), `${where}: no epitaph`);
      assert.ok(html.includes('#i-khepri'), `${where}: no Khepri`);
      // Every community but the house is a chip of the legend.
      const legend = blockFrom(html, 'id="leyenda"', '</figcaption>');
      for (const id of otherCommunities()) {
        assert.ok(
          legend.includes(`data-ring-chip="${id}"`),
          `${where}: ${id} missing from the legend`,
        );
      }
    }
  },
);
