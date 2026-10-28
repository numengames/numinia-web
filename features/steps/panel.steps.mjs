/**
 * Step definitions for the organization panel (features/panel.feature, QA
 * 2026-10-15; «La gente», 2026-10-16): the built /panel/ pages in the five
 * locales, the door in the account menu, the walls of the pages where the
 * wallet signs (Miembros and Roles) and Saldo's old members address, which
 * now only sends to the panel. Kept in their own file so the shared
 * acceptance.steps.mjs stays untouched.
 */
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Then } from '@cucumber/cucumber';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The words each page says in each language (the titles, the menu door, the mark). */
const LOCALES = [
  {
    prefix: '',
    summary: 'Overview',
    venues: 'Homes',
    gatherings: 'Gatherings',
    members: 'Members',
    roles: 'Roles',
    gente: 'People',
    agents: 'Agents',
    balance: 'Balance and usage',
    settings: 'Settings',
    panels: 'Panels',
    building: 'Under construction',
  },
  {
    prefix: 'es',
    summary: 'Resumen',
    venues: 'Sedes',
    gatherings: 'Encuentros',
    members: 'Miembros',
    roles: 'Roles',
    gente: 'Gente',
    agents: 'Agentes',
    balance: 'Saldo y consumo',
    settings: 'Ajustes',
    panels: 'Paneles',
    building: 'En construcción',
  },
  {
    prefix: 'ja',
    summary: '概要',
    venues: '拠点',
    gatherings: '集まり',
    members: 'メンバー',
    roles: 'ロール',
    gente: 'ピープル',
    agents: 'エージェント',
    balance: '残高と利用状況',
    settings: '設定',
    panels: 'パネル',
    building: '準備中',
  },
  {
    prefix: 'ko',
    summary: '개요',
    venues: '거점',
    gatherings: '모임',
    members: '구성원',
    roles: '역할',
    gente: '사람들',
    agents: '에이전트',
    balance: '잔액과 사용량',
    settings: '설정',
    panels: '패널',
    building: '준비 중',
  },
  {
    prefix: 'pt-br',
    summary: 'Resumo',
    venues: 'Sedes',
    gatherings: 'Encontros',
    members: 'Membros',
    roles: 'Papéis',
    gente: 'Gente',
    agents: 'Agentes',
    balance: 'Saldo e uso',
    settings: 'Configurações',
    panels: 'Painéis',
    building: 'Em construção',
  },
];

/** The screens: the route under /panel/ and the piece each one is. */
const FACES = [
  { segment: '', piece: 'summary' },
  { segment: 'sedes/', piece: 'venues' },
  { segment: 'encuentros/', piece: 'gatherings' },
  { segment: 'miembros/', piece: 'members' },
  { segment: 'roles/', piece: 'roles' },
  { segment: 'gente/', piece: 'gente' },
  { segment: 'agentes/', piece: 'agents' },
  { segment: 'saldo/', piece: 'balance' },
  { segment: 'ajustes/', piece: 'settings' },
];

const PIECES = [
  'summary',
  'venues',
  'gatherings',
  'members',
  'roles',
  'gente',
  'agents',
  'memory',
  'bazaar',
  'balance',
  'settings',
];
const BUILT = [
  'summary',
  'venues',
  'gatherings',
  'members',
  'roles',
  'gente',
  'agents',
  'balance',
  'settings',
];
const SOON = ['memory', 'bazaar'];
const ROOMS = ['census', 'worlds', 'prices', 'assets'];

const base = (prefix) => (prefix ? `/${prefix}` : '');

async function read(distDir, ...segments) {
  const file = path.join(distDir, ...segments);
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${path.relative(distDir, file)}`);
  return html;
}

async function panelPage(distDir, prefix, segment) {
  return read(distDir, prefix, 'panel', segment, 'index.html');
}

/** Every page of the panel, with where it lives, for every locale. */
async function* panelPages(distDir) {
  for (const locale of LOCALES) {
    for (const face of FACES) {
      yield {
        locale,
        face,
        where: `${base(locale.prefix) || ''}/panel/${face.segment}`,
        html: await panelPage(distDir, locale.prefix, face.segment),
      };
    }
  }
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

function hasFlag(tag, name) {
  return new RegExp(`\\s${name}(=""|\\s|>)`).test(tag ?? '');
}

/** The rail of a panel page: from its <nav> to the </nav>. */
function railOf(html, where) {
  const at = html.indexOf('data-org-rail');
  assert.ok(at >= 0, `${where}: no rail`);
  const start = html.lastIndexOf('<nav', at);
  return html.slice(start, html.indexOf('</nav>', at) + '</nav>'.length);
}

/** The rows of the rail's list: `{ id, tag, text }`. */
function rowsOf(rail) {
  const rows = [];
  const list = rail.slice(rail.indexOf('data-piece-list'));
  for (const match of list.matchAll(/<li\b[^>]*\bdata-piece="([a-z]+)"[^>]*>([\s\S]*?)<\/li>/g)) {
    rows.push({ id: match[1], tag: match[0].slice(0, match[0].indexOf('>') + 1), inner: match[2] });
  }
  return rows;
}

const textOf = (inner) =>
  inner
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

Then(
  'every locale has the panel, its homes, its members, its roles and its balance, each titled in its own words',
  async function () {
    for await (const { locale, face, where, html } of panelPages(this.distDir)) {
      const lang = locale.prefix || 'en';
      assert.ok(html.includes(`<html lang="${lang}"`), `${where}: not in «${lang}»`);
      const headings = html.match(/<h1\b[^>]*>([^<]*)<\/h1>/g) ?? [];
      assert.equal(headings.length, 1, `${where}: expected one h1, got ${headings.length}`);
      const title = locale[face.piece];
      assert.ok(headings[0].includes(`>${title}<`), `${where}: the h1 is not «${title}»`);
      assert.ok(
        html.includes(`<title>${title} — Numinia</title>`),
        `${where}: the title is not «${title}»`,
      );
    }
  },
);

Then('every panel page draws the rail of pieces the same way in every locale', async function () {
  for await (const { locale, where, html } of panelPages(this.distDir)) {
    const rail = railOf(html, where);
    const rows = rowsOf(rail);
    assert.deepEqual(
      rows.map((row) => row.id),
      PIECES,
      `${where}: the pieces are not the eleven of the prototype, in its order`,
    );
    const prefix = base(locale.prefix);
    const hrefs = {
      summary: `${prefix}/panel/`,
      venues: `${prefix}/panel/sedes/`,
      gatherings: `${prefix}/panel/encuentros/`,
      members: `${prefix}/panel/miembros/`,
      roles: `${prefix}/panel/roles/`,
      gente: `${prefix}/panel/gente/`,
      agents: `${prefix}/panel/agentes/`,
      balance: `${prefix}/panel/saldo/`,
      settings: `${prefix}/panel/ajustes/`,
    };
    for (const id of BUILT) {
      const link = tagWith(rail, `data-metric="panel-nav-${id}"`);
      assert.ok(link?.startsWith('<a '), `${where}: ${id} is not a link`);
      assert.equal(attr(link, 'href'), hrefs[id], `${where}: ${id} leads elsewhere`);
    }
    for (const id of SOON) {
      const row = rows.find((entry) => entry.id === id);
      assert.ok(hasFlag(row.tag, 'data-building'), `${where}: ${id} is not marked as building`);
      assert.ok(
        textOf(row.inner).includes(locale.building),
        `${where}: ${id} does not say «${locale.building}»`,
      );
    }
    for (const id of BUILT) {
      const row = rows.find((entry) => entry.id === id);
      assert.ok(!hasFlag(row.tag, 'data-building'), `${where}: ${id} is marked as building`);
    }
    const rooms = rail.slice(rail.indexOf('data-org-rooms'));
    for (const room of ROOMS) {
      const link = tagWith(rooms, `data-metric="panel-room-${room}"`);
      assert.ok(link?.startsWith('<a '), `${where}: the room ${room} is not a link`);
      assert.equal(attr(link, 'href'), `${prefix}/lap/admin/${room}/`, `${where}: room ${room}`);
    }
  }
});

Then('no panel page links a piece that is not built', async function () {
  for await (const { where, face, html } of panelPages(this.distDir)) {
    const rail = railOf(html, where);
    // Eight built pieces and four rooms: twelve links, not one more.
    assert.equal(
      (rail.match(/<a\b/g) ?? []).length,
      BUILT.length + ROOMS.length,
      `${where}: rail links`,
    );
    for (const id of SOON) {
      assert.ok(
        !html.includes(`data-metric="panel-nav-${id}"`),
        `${where}: ${id} is a link in the rail`,
      );
      assert.ok(!html.includes(`data-metric="panel-card-${id}"`), `${where}: ${id} is a link card`);
      const card = tagWith(html, `data-org-card="${id}"`);
      if (face.piece === 'summary') {
        assert.ok(card, `${where}: no card for ${id}`);
        assert.ok(!card.startsWith('<a '), `${where}: the card of ${id} is a link`);
        assert.ok(hasFlag(card, 'data-building'), `${where}: the card of ${id} is not marked`);
      }
    }
  }
});

Then(
  "the Oracle's rooms stay hidden on every panel page until the session says Oracle",
  async function () {
    for await (const { where, face, html } of panelPages(this.distDir)) {
      const zones = [...html.matchAll(/<[a-z]+\b[^>]*\bdata-org-rooms\b[^>]*>/g)].map((m) => m[0]);
      // The rail's zone on every page; the cards' zone too on the summary.
      assert.equal(zones.length, face.piece === 'summary' ? 2 : 1, `${where}: Oracle zones`);
      for (const zone of zones) {
        assert.equal(attr(zone, 'data-session-ranks'), 'oracle', `${where}: not Oracle only`);
        assert.ok(hasFlag(zone, 'hidden'), `${where}: shown before the session answers`);
      }
      const links = (html.match(/data-metric="panel-room(-card)?-[a-z]+"/g) ?? []).length;
      assert.equal(
        links,
        zones.length * ROOMS.length,
        `${where}: a room link sits outside the Oracle's zones`,
      );
    }
  },
);

Then(
  "every locale's account menu offers the panels between the profile and the settings, for people who are in",
  async function () {
    for (const locale of LOCALES) {
      const where = `${base(locale.prefix) || ''}/`;
      const html = await read(this.distDir, locale.prefix, 'index.html');
      const account = html.indexOf('data-metric="chrome-account"');
      assert.ok(account >= 0, `${where}: no account menu`);
      // The face that opens the menu shows only to people who are in.
      const faceTag = html.slice(
        html.lastIndexOf('<button', account),
        html.indexOf('>', account) + 1,
      );
      assert.ok(
        hasFlag(faceTag, 'data-session-in'),
        `${where}: the face shows to people who are out`,
      );
      assert.ok(hasFlag(faceTag, 'hidden'), `${where}: the face is not hidden until the session`);
      assert.equal(attr(faceTag, 'popovertarget'), 'menu-cara', `${where}: the face opens no menu`);
      const start = html.indexOf('<div id="menu-cara"');
      assert.ok(start >= 0, `${where}: no face menu`);
      assert.ok(
        hasFlag(html.slice(start, html.indexOf('>', start) + 1), 'popover'),
        `${where}: the face menu is not a popover`,
      );
      const menu = html.slice(start, html.indexOf('<div id="menu-crear"', start));
      const order = [
        'chrome-profile',
        'chrome-panels',
        'chrome-account-settings',
        'chrome-sign-out',
      ].map((metric) => menu.indexOf(`data-metric="${metric}"`));
      assert.ok(!order.includes(-1), `${where}: an entry of the menu is missing (${order})`);
      assert.deepEqual(
        [...order].sort((a, b) => a - b),
        order,
        `${where}: the panels are not between`,
      );
      const door = tagWith(menu, 'data-metric="chrome-panels"');
      assert.ok(door.startsWith('<a '), `${where}: the door is not a link`);
      assert.equal(
        attr(door, 'href'),
        `${base(locale.prefix)}/panel/`,
        `${where}: the door leads elsewhere`,
      );
      const inner = menu.slice(
        menu.indexOf(door) + door.length,
        menu.indexOf('</a>', menu.indexOf(door)),
      );
      assert.equal(textOf(inner), locale.panels, `${where}: the door is not «${locale.panels}»`);
      // One door to the panel: no organization is named in the menu, so no request on every page.
      assert.ok(!menu.includes('data-org'), `${where}: the menu names an organization`);
    }
  },
);

Then(
  'the panel pages light «Tus comunidades» on your rail and «Tú» on the phone bar',
  async function () {
    for await (const { where, html } of panelPages(this.distDir)) {
      const rail = /<aside class="rail rail-tu"[\s\S]*?<\/aside>/.exec(html);
      const tabs = /<nav class="barra-movil"[\s\S]*?<\/nav>/.exec(html);
      const city = /<aside class="rail rail-ciudad"[\s\S]*?<\/aside>/.exec(html);
      assert.ok(rail && tabs && city, `${where}: no rails or phone bar`);
      assert.equal(
        attr(tagWith(rail[0], 'data-metric="you-your-communities"'), 'aria-current'),
        'true',
        `${where}: your rail`,
      );
      assert.equal(
        attr(tagWith(tabs[0], 'data-metric="tab-you"'), 'aria-current'),
        'true',
        `${where}: phone bar`,
      );
      assert.equal(
        attr(tagWith(city[0], 'data-metric="nav-communities"'), 'aria-current'),
        null,
        `${where}: Comunidades lit too`,
      );
    }
  },
);

Then(
  "the members and roles pages of the panel have the wallet's walls in every locale",
  async function () {
    const headers = (
      await readFile(path.join(repoRoot, 'apps/store/public/_headers'), 'utf8')
    ).split('\n');
    for (const locale of LOCALES) {
      for (const screen of ['miembros', 'roles']) {
        const route = `${base(locale.prefix)}/panel/${screen}/*`;
        const at = headers.indexOf(route);
        assert.ok(at >= 0, `_headers: no block for ${route}`);
        // The block runs while lines are indented. Cloudflare ADDS the headers of every matching rule
        // and the browser enforces them all, so the global strict policy must be detached first.
        const block = [];
        for (let i = at + 1; i < headers.length && /^\s+\S/.test(headers[i] ?? ''); i += 1) {
          block.push(headers[i]);
        }
        const detach = block.findIndex((l) => l.trim() === '! Content-Security-Policy');
        const set = block.findIndex((l) => l.includes('Content-Security-Policy:'));
        const policy = block[set] ?? '';
        assert.ok(set >= 0, `${route}: no policy under it`);
        assert.ok(
          detach >= 0 && detach < set,
          `${route}: must detach the global Content-Security-Policy before relaxing it`,
        );
        assert.ok(
          policy.includes("connect-src 'self' blob: https: wss:"),
          `${route}: no wss for WalletConnect`,
        );
        assert.ok(policy.includes('frame-src https:'), `${route}: no frame for the in-app wallets`);
      }
      // The old address only sends on: it loads no wallet, so it keeps the strict walls.
      const old = `${base(locale.prefix)}/saldo/miembros/*`;
      assert.ok(!headers.includes(old), `_headers: ${old} still relaxes the walls`);
    }
    // The same walls for the pages the Worker answers: the regular expression in the middleware.
    const source = await readFile(path.join(repoRoot, 'apps/store/src/middleware.ts'), 'utf8');
    const body = source.slice(source.indexOf('function isSessionPath'));
    const literal = /return\s+(\/(?:\\\/|[^/\n])+\/[a-z]*)\s*\.test\(/.exec(body);
    assert.ok(literal, 'middleware.ts: isSessionPath no longer returns a regular expression');
    const slash = literal[1].lastIndexOf('/');
    const isSession = new RegExp(literal[1].slice(1, slash), literal[1].slice(slash + 1));
    for (const locale of LOCALES) {
      const prefix = base(locale.prefix);
      for (const screen of ['miembros', 'roles']) {
        assert.ok(
          isSession.test(`${prefix}/panel/${screen}/`),
          `${prefix}/panel/${screen}/: no session walls`,
        );
      }
      assert.ok(!isSession.test(`${prefix}/panel/`), `${prefix}/panel/: walls it does not need`);
      assert.ok(
        !isSession.test(`${prefix}/panel/saldo/`),
        `${prefix}/panel/saldo/: walls it does not need`,
      );
      assert.ok(
        !isSession.test(`${prefix}/saldo/miembros/`),
        `${prefix}/saldo/miembros/: walls a page that only sends on does not need`,
      );
    }
  },
);

Then(
  "every locale's old members page of Saldo sends to its panel's Miembros, with a link, out of the index",
  async function () {
    const sitemap = await readFile(path.join(this.distDir, 'sitemap-0.xml'), 'utf8');
    for (const locale of LOCALES) {
      const prefix = base(locale.prefix);
      const where = `${prefix}/saldo/miembros/`;
      const to = `${prefix}/panel/miembros/`;
      const html = await read(this.distDir, locale.prefix, 'saldo', 'miembros', 'index.html');
      assert.ok(
        html.includes(`<meta http-equiv="refresh" content="0;url=${to}"`),
        `${where}: does not send to ${to}`,
      );
      assert.ok(html.includes(`<a href="${to}"`), `${where}: no link to ${to}`);
      assert.ok(html.includes('<meta name="robots" content="noindex"'), `${where}: no noindex`);
      // Nothing else is loaded on the way: no island, no wallet.
      assert.ok(!html.includes('<script'), `${where}: loads a script`);
      assert.ok(!sitemap.includes(`${where}<`), `${where}: listed in the sitemap`);
    }
  },
);

Then("Saldo's members tab leads to the panel's Miembros in every locale", async function () {
  for (const locale of LOCALES) {
    const prefix = base(locale.prefix);
    const html = await read(this.distDir, locale.prefix, 'saldo', 'index.html');
    const tabs = /<nav class="saldo-pestanas"[\s\S]*?<\/nav>/.exec(html);
    assert.ok(tabs, `${prefix}/saldo/: no tabs`);
    const links = [...tabs[0].matchAll(/<a\b[^>]*>/g)].map((match) => attr(match[0], 'href'));
    assert.deepEqual(
      links,
      [`${prefix}/saldo/`, `${prefix}/panel/miembros/`, `${prefix}/saldo/referidos/`],
      `${prefix}/saldo/: the tabs lead elsewhere`,
    );
  }
});

Then(
  "every locale's Encuentros page carries its communities' encounters from the register, and none kept on file",
  async function () {
    for (const locale of LOCALES) {
      const prefix = base(locale.prefix);
      const where = `${prefix}/panel/encuentros/`;
      const html = await panelPage(this.distDir, locale.prefix, 'encuentros/');
      // The island's props: Numen Games by its `team:`, with its encounter's page in this locale.
      assert.ok(
        html.includes('acc_t_2e2dd18c880ba974da1512dc7cde2431'),
        `${where}: Numen Games is not reached`,
      );
      assert.ok(
        html.includes(`${prefix}/rituals/numinia-anniversary-2026/`),
        `${where}: its encounter has no page in «${locale.prefix || 'en'}»`,
      );
      assert.ok(
        html.includes('/communities/numen-games/calendar.ics'),
        `${where}: no calendar to subscribe to`,
      );
      // A community the house keeps on file is listed under no account.
      assert.ok(
        !html.includes('/communities/adigital/calendar.ics'),
        `${where}: a community kept on file is listed`,
      );
    }
  },
);
