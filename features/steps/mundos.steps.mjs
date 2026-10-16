/**
 * Step definitions for «Mundos ↔ organizaciones» (features/mundos.feature, cut
 * 4, 2026-10-16): the built server — started once, on a free port, with
 * throwaway secrets, DATA_SOURCE being frozen into the build as `fixture` —
 * asked over HTTP with sessions signed by the same secret (the rank in the
 * cookie is the only thing the server takes for the house), and the built
 * pages of Sedes and the Worlds room. Kept in their own file so the shared
 * acceptance.steps.mjs stays untouched.
 */
import { strict as assert } from 'node:assert';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { createPublicKey, generateKeyPairSync, randomBytes, verify } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { AfterAll, Given, Then, When } from '@cucumber/cucumber';
import { createSessionToken } from '@numinia/auth';

const storeRoot = fileURLToPath(new URL('../../apps/store/', import.meta.url));
const repoRoot = path.resolve(storeRoot, '..', '..');
const ORACLE = `0x${'99'.repeat(20)}`;
/** Admin of Numen Games in the fixture desk. */
const MEMBER = `0x${'ab'.repeat(20)}`;
/** Signed in, and in no organization at all. */
const STRANGER = `0x${'ee'.repeat(20)}`;

const SESSIONS = {
  Oracle: { wallet: ORACLE, rank: 'oracle' },
  member: { wallet: MEMBER, rank: 'nomad' },
  stranger: { wallet: STRANGER, rank: 'nomad' },
};

/** The one server of the run, started by the first scenario that needs it. */
let running = null;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() =>
        resolve(typeof address === 'object' && address !== null ? address.port : 0),
      );
    });
  });
}

async function startStore() {
  if (running !== null) return running;
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const secret = randomBytes(32).toString('hex');
  // A throwaway world-pass key: the server signs with it, the scenario verifies with what it publishes.
  const passKey = generateKeyPairSync('ed25519').privateKey;
  const child = spawn(process.execPath, ['dist/server/entry.mjs'], {
    cwd: storeRoot,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATA_SOURCE: 'fixture',
      AUTH_SESSION_SECRET: secret,
      THIRDWEB_SECRET_KEY: randomBytes(32).toString('hex'),
      ADMIN_WALLET_ADDRESSES: ORACLE,
      WORLD_PASS_PRIVATE_KEY: passKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  const until = Date.now() + 30_000;
  for (;;) {
    const answered = await fetch(`${origin}/api/auth/session`).then(
      (response) => response.text().then(() => true),
      () => false,
    );
    if (answered) break;
    assert.ok(Date.now() < until, `the built store never answered at ${origin}: ${stderr}`);
    await sleep(200);
  }
  running = { origin, secret, child, ids: new Map(), unplaced: null };
  return running;
}

AfterAll(async function () {
  if (running === null) return;
  const { child } = running;
  running = null;
  child.kill();
  await once(child, 'exit');
});

async function cookieOf(store, who) {
  const { wallet, rank } = SESSIONS[who];
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: 'terms@1.0.0+privacy@1.0.0' },
    store.secret,
  );
  return `numinia_session=${token}`;
}

/** One request as `who` (nobody: no cookie); the reply is kept on the scenario's world. */
async function ask(world, who, pathname, init = {}) {
  const headers = { ...init.headers };
  if (who !== null) headers.cookie = await cookieOf(world.store, who);
  const response = await fetch(`${world.store.origin}${pathname}`, { ...init, headers });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  world.reply = { status: response.status, json, text };
}

Given("the built store is running with the house's wallet on the Oracle list", async function () {
  this.store = await startStore();
});

async function idOf(world, name) {
  const known = world.store.ids.get(name);
  if (known !== undefined) return known;
  await ask(world, 'Oracle', '/api/saldo');
  const found = world.reply.json.accounts.find((account) => account.name === name);
  assert.ok(found, `the Oracle's list does not name ${name}`);
  world.store.ids.set(name, found.id);
  return found.id;
}

/** A world of the fleet that no organization has yet: the first one found, kept for the run. */
async function unplacedWorld(world) {
  if (world.store.unplaced !== null) return world.store.unplaced;
  await ask(world, 'Oracle', '/api/admin/worlds');
  const ids = world.reply.json.rows.map((row) => row.id);
  await ask(world, 'Oracle', '/api/admin/worlds/homes');
  const placed = new Set(world.reply.json.homes.map((home) => home.worldId));
  const free = ids.find((id) => !placed.has(id));
  assert.ok(free, 'every world of the fixture fleet is already placed');
  world.store.unplaced = free;
  return free;
}

const post = (body) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

When('the Oracle assigns the unplaced world to {string}', async function (name) {
  const worldId = await unplacedWorld(this);
  const accountId = await idOf(this, name);
  await ask(this, 'Oracle', '/api/admin/worlds/place', post({ worldIds: [worldId], accountId }));
  assert.equal(
    this.reply.status,
    200,
    `the house's placement of ${worldId} in ${accountId} was refused: ${this.reply.text}`,
  );
  assert.equal(this.reply.json.placed, 1);
});

Then("the house's list of placements says the world belongs to {string}", async function (name) {
  const worldId = await unplacedWorld(this);
  await ask(this, 'Oracle', '/api/admin/worlds/homes');
  const home = this.reply.json.homes.find((entry) => entry.worldId === worldId);
  assert.ok(home, `${worldId} is not in the list of placements`);
  assert.equal(home.accountName, name);
});

When('a stranger tries to assign a world to {string}', async function (name) {
  const accountId = await idOf(this, name);
  await ask(
    this,
    'stranger',
    '/api/admin/worlds/place',
    post({ worldIds: ['agora-plaza'], accountId }),
  );
});

Then('the till refuses it with {int}', function (status) {
  assert.equal(this.reply.status, status);
});

When('a member of {string} lists the worlds of {string}', async function (_org, name) {
  await ask(this, 'member', `/api/mundos?org=${encodeURIComponent(await idOf(this, name))}`);
});

When('a person who is not in {string} lists the worlds of {string}', async function (_org, name) {
  await ask(this, 'stranger', `/api/mundos?org=${encodeURIComponent(await idOf(this, name))}`);
});

Then('the list has the world', async function () {
  assert.equal(this.reply.status, 200);
  const worldId = await unplacedWorld(this);
  assert.ok(
    this.reply.json.worlds.some((entry) => entry.worldId === worldId),
    `${worldId} is not in the organization's worlds`,
  );
});

When('anyone opens the page of the world', async function () {
  const worldId = await unplacedWorld(this);
  await ask(this, null, `/es/mundos/${worldId}/`);
  this.page = this.reply;
  await ask(this, null, `/api/mundos/${worldId}`);
  this.api = this.reply;
});

Then('the page names the world and says it belongs to {string}', async function (name) {
  const worldId = await unplacedWorld(this);
  assert.equal(this.page.status, 200);
  assert.ok(this.page.text.includes('data-world-id'), 'the page has no world heading');
  assert.ok(this.page.text.includes(worldId), 'the page does not name the world');
  assert.equal(this.api.status, 200);
  assert.equal(this.api.json.home.accountName, name);
});

Then('the page offers no administration', function () {
  assert.equal(this.api.json.manage, false);
});

When('a member of {string} asks for the page of the world', async function (_org) {
  const worldId = await unplacedWorld(this);
  await ask(this, 'member', `/api/mundos/${worldId}`);
});

Then('the page offers the administration', function () {
  assert.equal(this.reply.status, 200);
  assert.equal(this.reply.json.manage, true);
});

// ---- «Entrar»: the world pass (cut 5) --------------------------------------------

When('anyone presses Entrar on the world', async function () {
  const worldId = await unplacedWorld(this);
  await ask(this, null, `/api/mundos/${worldId}/pass`, post({}));
  this.entered = this.reply;
});

When('a member of {string} presses Entrar on the world', async function (_org) {
  const worldId = await unplacedWorld(this);
  await ask(this, 'member', `/api/mundos/${worldId}/pass`, post({}));
  this.entered = this.reply;
});

Then("they are sent to the world's plain address, with no pass", async function () {
  assert.equal(this.entered.status, 200);
  assert.equal(this.entered.json.pass, false);
  const url = new URL(this.entered.json.url);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hash, '');
});

Then(
  "they are sent to the world's address with a pass the published key verifies",
  async function () {
    const worldId = await unplacedWorld(this);
    assert.equal(this.entered.status, 200);
    assert.equal(this.entered.json.pass, true);
    const url = new URL(this.entered.json.url);
    assert.equal(url.protocol, 'https:');
    const token = url.hash.replace(/^#pass=/, '');
    const [head, body, signature] = token.split('.');
    assert.ok(head && body && signature, 'the pass is not three parts');
    await ask(this, null, '/.well-known/world-pass-key.json');
    assert.equal(this.reply.status, 200);
    const published = this.reply.json;
    assert.equal(published.alg, 'Ed25519');
    const key = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: published.publicKey },
      format: 'jwk',
    });
    assert.ok(
      verify(null, Buffer.from(`${head}.${body}`), key, Buffer.from(signature, 'base64url')),
      'the signature does not verify with the published key',
    );
    const header = JSON.parse(Buffer.from(head, 'base64url').toString('utf8'));
    assert.deepEqual(header, { alg: 'EdDSA', typ: 'numinia-world-pass', kid: published.kid });
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    assert.equal(payload.v, 1);
    assert.equal(payload.iss, 'numinia.com');
    assert.equal(payload.aud, worldId);
    assert.equal(payload.org, await idOf(this, 'Numen Games'));
    assert.equal(payload.exp - payload.iat, 600);
    assert.match(payload.sub, /^p_[0-9a-f]{32}$/);
    assert.ok(payload.perm.includes('enter-worlds'), 'a member may enter');
    assert.ok(!body.includes(MEMBER.slice(2)), 'the pass must not carry the wallet');
  },
);

// ---- The built pages ----------------------------------------------------------

const LOCALES = [
  { prefix: '', venues: 'Homes', assign: 'Assign to an organization' },
  { prefix: 'es', venues: 'Sedes', assign: 'Asignar a una organización' },
  { prefix: 'ja', venues: '拠点', assign: '組織に割り当てる' },
  { prefix: 'ko', venues: '거점', assign: '조직에 배정' },
  { prefix: 'pt-br', venues: 'Sedes', assign: 'Atribuir a uma organização' },
];

async function built(distDir, prefix, ...segments) {
  const file = path.join(distDir, prefix, ...segments, 'index.html');
  const html = await readFile(file, 'utf8').catch(() => null);
  assert.ok(html, `missing ${path.relative(distDir, file)}`);
  return html;
}

Then("every locale has the panel's Sedes with its words", async function () {
  for (const { prefix, venues } of LOCALES) {
    const where = prefix || 'en';
    const html = await built(this.distDir, prefix, 'panel', 'sedes');
    const h1 = html.match(/<h1\b[^>]*>([^<]*)<\/h1>/);
    assert.equal(h1?.[1], venues, `${where}: the h1 is not «${venues}»`);
    assert.ok(
      html.includes('data-face="venues"') || html.includes('venues'),
      `${where}: not Sedes`,
    );
  }
});

Then(
  "every locale's Worlds room carries the words to assign a world to an organization",
  async function () {
    for (const { prefix, assign } of LOCALES) {
      const html = await built(this.distDir, prefix, 'lap', 'admin', 'worlds');
      assert.ok(html.includes(assign), `${prefix || 'en'}: the room does not say «${assign}»`);
    }
  },
);

const CUT_METRICS = [
  'worlds-select',
  'worlds-select-shown',
  'worlds-select-clear',
  'worlds-assign',
  'worlds-assign-chosen',
  'worlds-page-link',
  'worlds-assign-org',
  'worlds-assign-save',
  'worlds-assign-cancel',
  'panel-venue-open',
  'panel-venue-enter',
  'panel-venues-retry',
  'world-enter',
  'world-page-retry',
  'world-page-home',
  'world-page-venues',
  'world-page-members',
  'world-page-balance',
];

Then('every control of the cut carries a registered data-metric', async function () {
  const events = await readFile(
    path.join(repoRoot, 'packages', 'analytics', 'src', 'events.ts'),
    'utf8',
  );
  const sources = await Promise.all(
    [
      'components/lap/admin/WorldPlace.tsx',
      'components/lap/admin/WorldViews.tsx',
      'components/lap/admin/WorldsPanel.tsx',
      'components/panel/PanelSedes.tsx',
      'components/mundos/WorldView.tsx',
    ].map((file) => readFile(path.join(storeRoot, 'src', file), 'utf8')),
  );
  const code = sources.join('\n');
  for (const metric of CUT_METRICS) {
    assert.ok(events.includes(`\`${metric}\``), `${metric} is not registered`);
    // `world-page-${id}` is how the three links of the administration block are written.
    const written = code.includes(`data-metric="${metric}"`) || code.includes(`world-page-$\{id}`);
    assert.ok(written, `${metric} is registered but no control carries it`);
  }
  // And no control of these screens carries a metric that is not in the list above.
  for (const match of code.matchAll(
    /data-metric="((?:worlds-(?:select|assign|page)|panel-venue|world-page)[a-z-]*)"/g,
  )) {
    assert.ok(CUT_METRICS.includes(match[1]), `${match[1]} is not in the cut's register`);
  }
});
