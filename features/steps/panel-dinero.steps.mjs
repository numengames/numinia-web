/**
 * Step definitions for the money of the panel (features/panel-dinero.feature,
 * cut 2026-10-16): the built Saldo pages (/saldo/ and /panel/saldo/) and the
 * panel's Resumen in the five locales. The islands are static until a
 * session paints them, so what the build can show is the words they are
 * handed (Astro writes an island's props into its `props` attribute) and
 * that no figure is in the HTML. Kept in its own file so the shared
 * acceptance.steps.mjs stays untouched.
 */
import { strict as assert } from 'node:assert';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Then } from '@cucumber/cucumber';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The words each page is handed, in each language. */
const LOCALES = [
  {
    prefix: '',
    saldo: [
      'This month',
      'Low-balance warning',
      'Each day closes at midnight UTC.',
      'Download (.csv)',
      'Rules in sight',
      'It is your personal account: only you top it up and see these figures.',
    ],
    summary: ['Coming up', 'No homes yet', 'What happened'],
    eventMode: /event mode/i,
  },
  {
    prefix: 'es',
    saldo: [
      'Este mes',
      'Aviso de saldo bajo',
      'Cada día se cierra a medianoche UTC.',
      'Descargar (.csv)',
      'Las reglas, a la vista',
      'Es tu cuenta personal: solo tú recargas y ves estos datos.',
    ],
    summary: ['Lo próximo', 'Ninguna sede todavía', 'Qué ha pasado'],
    eventMode: /modo evento/i,
  },
  {
    prefix: 'ja',
    saldo: [
      '今月',
      '残高不足のお知らせ',
      '1日はUTCの午前0時に締まります。',
      'ダウンロード（.csv）',
      'ルールを見える形で',
      'あなたの個人アカウントです。チャージできるのも、この数字を見られるのもあなただけです。',
    ],
    summary: ['次の予定', 'まだ拠点はありません', '最近の出来事'],
    eventMode: /イベントモード/,
  },
  {
    prefix: 'ko',
    saldo: [
      '이번 달',
      '잔액 부족 알림',
      '하루는 UTC 자정에 마감됩니다.',
      '다운로드(.csv)',
      '한눈에 보는 규칙',
      '내 개인 계정입니다. 충전하고 이 내역을 보는 사람은 나뿐입니다.',
    ],
    summary: ['다음 일정', '아직 거점이 없습니다', '최근 있었던 일'],
    eventMode: /이벤트 모드/,
  },
  {
    prefix: 'pt-br',
    saldo: [
      'Este mês',
      'Aviso de saldo baixo',
      'Cada dia fecha à meia-noite UTC.',
      'Baixar (.csv)',
      'As regras, à vista',
      'É a sua conta pessoal: só você recarrega e vê estes dados.',
    ],
    summary: ['O próximo', 'Nenhuma sede ainda', 'O que aconteceu'],
    eventMode: /modo evento/i,
  },
];

const base = (prefix) => (prefix ? `/${prefix}` : '');

async function read(distDir, ...segments) {
  const file = path.join(distDir, ...segments);
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${path.relative(distDir, file)}`);
  return html;
}

/** Astro escapes an island's props as an HTML attribute: undo the escapes to read the words. */
const unescaped = (html) =>
  html
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The money's pages of a locale: Saldo, the panel's Saldo y consumo and its Resumen. */
async function* moneyPages(distDir) {
  for (const locale of LOCALES) {
    for (const [kind, segments] of [
      ['saldo', ['saldo', 'index.html']],
      ['panel-saldo', ['panel', 'saldo', 'index.html']],
      ['summary', ['panel', 'index.html']],
    ]) {
      const where = `${base(locale.prefix)}/${segments.slice(0, -1).join('/')}/`;
      yield {
        locale,
        kind,
        where,
        html: unescaped(await read(distDir, locale.prefix, ...segments)),
      };
    }
  }
}

Then(
  'every Saldo page and every panel Saldo page carries the words of its cards, its chart, its movements and its rules',
  async function () {
    for await (const { locale, kind, where, html } of moneyPages(this.distDir)) {
      if (kind === 'summary') continue;
      for (const words of locale.saldo) {
        assert.ok(html.includes(words), `${where}: the island is not handed «${words}»`);
      }
    }
  },
);

Then('no Saldo page, panel Saldo page or panel Resumen speaks of an event mode', async function () {
  for await (const { locale, where, html } of moneyPages(this.distDir)) {
    assert.ok(!locale.eventMode.test(html), `${where}: speaks of an event mode`);
  }
});

Then(
  'no Saldo page, panel Saldo page or panel Resumen carries a card of figures in its built HTML',
  async function () {
    for await (const { where, html } of moneyPages(this.distDir)) {
      for (const marker of ['data-saldo-kpis', 'data-summary-cards', 'data-saldo-balance']) {
        assert.ok(!html.includes(marker), `${where}: «${marker}» is in the built HTML`);
      }
    }
  },
);

Then(
  'every panel Resumen carries the words of its four cards and of «Lo último»',
  async function () {
    for await (const { locale, kind, where, html } of moneyPages(this.distDir)) {
      if (kind !== 'summary') continue;
      for (const words of locale.summary) {
        assert.ok(html.includes(words), `${where}: the Resumen is not handed «${words}»`);
      }
    }
  },
);

Then(
  'every panel Resumen hands its island encounters that are built pages of its own locale',
  async function () {
    for await (const { locale, kind, where, html } of moneyPages(this.distDir)) {
      if (kind !== 'summary') continue;
      assert.ok(html.includes('"encounters"'), `${where}: the island is handed no encounters`);
      const prefix = base(locale.prefix);
      const hrefs = [...html.matchAll(/"href":\[0,"([^"]+)"\]/g)].map((match) => match[1]);
      for (const href of hrefs) {
        assert.ok(
          href.startsWith(`${prefix}/rituals/`),
          `${where}: ${href} is not a ritual of «${prefix || '/'}»`,
        );
        await read(this.distDir, ...href.split('/').filter(Boolean), 'index.html');
      }
    }
  },
);

/** Every file under a directory, relative to it. */
async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(full)));
    else files.push(full);
  }
  return files;
}

Then('the site has no endpoint that makes a CSV of the movements', async function () {
  const api = path.join(repoRoot, 'apps', 'store', 'src', 'pages', 'api');
  const files = await filesUnder(api);
  assert.ok(files.length > 0, 'no API routes were found');
  const csv = files.filter((file) => /csv/i.test(path.basename(file)));
  assert.deepEqual(csv, [], 'an API route makes a CSV');
  for (const file of files.filter((entry) => entry.includes(`${path.sep}saldo`))) {
    const source = await readFile(file, 'utf8');
    assert.ok(!/text\/csv/i.test(source), `${path.relative(repoRoot, file)} answers a CSV`);
  }
});
