/**
 * Step definitions for the house (features/house-enters.feature, QA
 * 2026-10-15): the built server — started once, on a free port, with
 * throwaway secrets, DATA_SOURCE being frozen into the build as `fixture` —
 * asked over HTTP with sessions signed by the same secret, as the rank in a
 * session's cookie is the only thing the server takes for the house.
 * Kept in their own file so the shared acceptance.steps.mjs stays untouched.
 */
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { AfterAll, Given, Then, When } from '@cucumber/cucumber';
import { createSessionToken } from '@numinia/auth';

const storeRoot = fileURLToPath(new URL('../../apps/store/', import.meta.url));
const ORACLE = `0x${'ab'.repeat(20)}`;
const CITIZEN = `0x${'cd'.repeat(20)}`;

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
  running = { origin, secret, child, ids: new Map() };
  return running;
}

AfterAll(async function () {
  if (running === null) return;
  const { child } = running;
  running = null;
  child.kill();
  await once(child, 'exit');
});

/** A session the server itself signed: the rank travels in the cookie, as at sign-in. */
async function cookieOf(store, wallet, rank) {
  const now = Math.floor(Date.now() / 1000);
  const token = await createSessionToken(
    { sub: wallet, rank, iat: now, exp: now + 3_600, terms: 'terms@1.0.0+privacy@1.0.0' },
    store.secret,
  );
  return `numinia_session=${token}`;
}

const SESSIONS = {
  Oracle: { wallet: ORACLE, rank: 'oracle' },
  citizen: { wallet: CITIZEN, rank: 'nomad' },
};

async function ask(world, who, path, init = {}) {
  const { wallet, rank } = SESSIONS[who];
  const response = await fetch(`${world.store.origin}${path}`, {
    ...init,
    headers: { cookie: await cookieOf(world.store, wallet, rank), ...init.headers },
  });
  world.reply = { status: response.status, json: await response.json() };
}

/** The id of an organization by its name, as the Oracle's own list gives it. */
async function idOf(world, name) {
  const known = world.store.ids.get(name);
  if (known !== undefined) return known;
  await ask(world, 'Oracle', '/api/saldo');
  const found = world.reply.json.accounts.find((account) => account.name === name);
  assert.ok(found, `the Oracle's list does not name ${name}`);
  world.store.ids.set(name, found.id);
  return found.id;
}

Given('the built store is running with a wallet on the Oracle list', async function () {
  this.store = await startStore();
});

When('the Oracle asks for its accounts', async function () {
  await ask(this, 'Oracle', '/api/saldo');
});

When('a citizen asks for its accounts', async function () {
  await ask(this, 'citizen', '/api/saldo');
});

Then('the answer shows {string} as its own', function (name) {
  assert.equal(this.reply.status, 200);
  const account = this.reply.json.accounts.find((one) => one.name === name);
  assert.ok(account, `${name} is not listed`);
  assert.equal(account.as, undefined, `${name} is marked, and it is its own`);
});

Then("the answer shows {string} and {string} as the house's", function (first, second) {
  for (const name of [first, second]) {
    const account = this.reply.json.accounts.find((one) => one.name === name);
    assert.ok(account, `${name} is not listed`);
    assert.equal(account.as, 'house', `${name} is not marked as the house's`);
  }
});

Then("the answer shows no organization as the house's", function () {
  assert.deepEqual(
    this.reply.json.accounts.filter((account) => account.as !== undefined),
    [],
  );
});

When('the Oracle opens the roles of {string}', async function (name) {
  await ask(this, 'Oracle', `/api/saldo/roles?cuenta=${await idOf(this, name)}`);
});

When('the citizen opens the roles of {string}', async function (name) {
  await ask(this, 'citizen', `/api/saldo/roles?cuenta=${await idOf(this, name)}`);
});

When(
  'the citizen asks for the roles of {string} claiming to be the house in the query',
  async function (name) {
    await ask(this, 'citizen', `/api/saldo/roles?house=true&cuenta=${await idOf(this, name)}`);
  },
);

When(
  'the citizen sends a rename of {string} claiming to be the house in the body',
  async function (name) {
    const body = { action: 'rename', accountId: await idOf(this, name), name: 'Mine', house: true };
    await ask(this, 'citizen', '/api/saldo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
);

Then('the till answers that it acts as the house', function () {
  assert.equal(this.reply.status, 200);
  assert.equal(this.reply.json.roles.as, 'house');
});

Then('the till refuses with {string}', function (problem) {
  assert.equal(this.reply.status, 403);
  assert.deepEqual(this.reply.json.problems, [problem]);
});

Then('the request is refused before the till sees it', function () {
  assert.equal(this.reply.status, 400);
  assert.match(this.reply.json.error, /house/);
});
