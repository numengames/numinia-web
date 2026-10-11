/**
 * The worlds room's I/O against a fake GitHub and fake worlds: reading the
 * order book as plain files (its index, then each order), the API's extras
 * (proposals, history) as best effort, probing each world's public /status,
 * and opening a proposal as one branch, its commits and one PR.
 */

import { describe, expect, it } from 'vitest';
import { renderIndex, renderOrder, type WorldOrder } from '../worlds';
import {
  FleetError,
  ProposalError,
  checkAddress,
  probeFleet,
  probeWorld,
  probeWorlds,
  proposeChange,
  parseFace,
  readExtras,
  readFace,
  readFaces,
  readFleet,
  worldsToken,
} from '../worlds-source';

const API = 'https://api.github.com/repos/numengames/numinia-assets';
const RAW = 'https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds';
const INDEX = `${RAW}/index.json`;
const PULLS = `${API}/pulls?state=open&per_page=100`;
const COMMITS = `${API}/commits?path=open-worlds&sha=main&per_page=15`;

const ORDER: WorldOrder = {
  id: 'agora',
  card: 'agora',
  state: 'running',
  server: 'open-1',
  domain: 'agora.numen.games',
  image: 'ghcr.io/numengames/numinia-hyperfy2:sha-0123456',
  limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
};

interface Call {
  readonly method: string;
  readonly url: string;
  readonly body: unknown;
  readonly auth: string | null;
}

type Route = (call: Call) => Response | Promise<Response> | undefined;

function fakeFetch(route: Route): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const impl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(input),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      auth: headers.get('authorization'),
    };
    calls.push(call);
    const answer = await route(call);
    if (!answer) throw new Error(`unrouted ${call.method} ${call.url}`);
    return answer;
  };
  return { fetch: impl as typeof fetch, calls };
}

const ok = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });
const text = (body: string, status = 200): Response => new Response(body, { status });
const fail = (status: number): Response => new Response('{}', { status });

describe('worldsToken', () => {
  it('takes a real-looking token and ignores anything shorter', () => {
    expect(worldsToken({ WORLDS_GITHUB_TOKEN: ` ${'x'.repeat(40)} ` })).toBe('x'.repeat(40));
    expect(worldsToken({ WORLDS_GITHUB_TOKEN: 'short' })).toBeNull();
    expect(worldsToken({})).toBeNull();
  });
});

function bookRoutes(overrides: Partial<Record<string, Response>> = {}): Route {
  return (call) => {
    if (call.url in overrides) return overrides[call.url];
    // The index may name what is not a world id: dropped, never fetched.
    if (call.url === INDEX) return text('{"orders": ["agora", "broken", "index", "../x", 7]}');
    if (call.url === `${RAW}/agora.json`) return text(renderOrder(ORDER));
    if (call.url === `${RAW}/broken.json`)
      return text(JSON.stringify({ ...ORDER, id: 'broken', image: 'x:latest' }));
    if (call.url === PULLS) {
      return ok([
        {
          number: 7,
          html_url: 'https://github.com/x/pull/7',
          head: { ref: 'open-worlds/agora/stop-abc' },
        },
        {
          number: 8,
          html_url: 'https://github.com/x/pull/8',
          head: { ref: 'dependabot/pip/reuse' },
        },
      ]);
    }
    if (call.url === COMMITS) {
      return ok([
        {
          sha: '0123456789abcdef',
          html_url: 'https://github.com/x/commit/0123456',
          author: { login: 'PabloFMM' },
          commit: {
            message: 'feat(open-worlds): order the world agora\n\nActing-Wallet: 0xabc',
            author: { name: 'Pablo', date: '2026-10-09T10:00:00Z' },
          },
        },
        {
          sha: 'fedcba9876543210',
          html_url: 'https://github.com/x/commit/fedcba9',
          author: null,
          commit: {
            message: 'chore: tidy',
            author: { name: 'Someone', date: '2026-10-08T10:00:00Z' },
          },
        },
      ]);
    }
    return undefined;
  };
}

describe('readFleet', () => {
  it('reads valid orders, sets the broken ones apart, finds the room’s proposals and the history', async () => {
    const { fetch, calls } = fakeFetch(bookRoutes());
    const fleet = await readFleet(fetch, 'token-'.padEnd(30, 'x'));
    expect(fleet.orders).toEqual([ORDER]);
    expect(fleet.invalid).toEqual([{ file: 'broken.json', problems: ['image'] }]);
    expect(fleet.pending).toEqual([
      { id: 'agora', action: 'stop', number: 7, url: 'https://github.com/x/pull/7' },
    ]);
    expect(fleet.history).toEqual([
      {
        sha: '0123456',
        subject: 'feat(open-worlds): order the world agora',
        author: 'PabloFMM',
        date: '2026-10-09T10:00:00Z',
        url: 'https://github.com/x/commit/0123456',
      },
      expect.objectContaining({ sha: 'fedcba9', author: 'Someone' }),
    ]);
    expect(fleet.missing).toEqual([]);
    // The API calls carry the token; the raw file reads do not need it.
    expect(calls.find((call) => call.url.startsWith(API))?.auth).toMatch(/^Bearer token-/);
    const raw = calls.filter((call) => call.url.startsWith(RAW));
    expect(raw.every((call) => call.auth === null)).toBe(true);
    // The book is read as plain files: the index, then only the orders it names.
    expect(raw.map((call) => call.url)).toEqual([INDEX, `${RAW}/agora.json`, `${RAW}/broken.json`]);
    // Listing the folder through the API — the read GitHub rations — is never asked.
    expect(calls.some((call) => call.url.includes('/contents/'))).toBe(false);
  });

  it('reads without a token too', async () => {
    const { fetch, calls } = fakeFetch(bookRoutes());
    await readFleet(fetch, null);
    expect(calls.every((call) => call.auth === null)).toBe(true);
  });

  it('treats a missing index as an empty fleet', async () => {
    const { fetch } = fakeFetch(bookRoutes({ [INDEX]: fail(404) }));
    const fleet = await readFleet(fetch, null);
    expect(fleet.orders).toEqual([]);
    expect(fleet.invalid).toEqual([]);
  });

  it('fails loud when the index or an order cannot be read, or the index is not one', async () => {
    const index = fakeFetch(bookRoutes({ [INDEX]: fail(500) }));
    await expect(readFleet(index.fetch, null)).rejects.toMatchObject({
      name: 'FleetError',
      status: 500,
      quota: false,
      resetAt: null,
    });
    const file = fakeFetch(bookRoutes({ [`${RAW}/agora.json`]: fail(404) }));
    await expect(readFleet(file.fetch, null)).rejects.toThrow('404 on open-worlds/agora.json');
    for (const bad of ['{', '[]', '{"orders": {}}', '{"orders": [], "x": 1}']) {
      const shape = fakeFetch(bookRoutes({ [INDEX]: text(bad) }));
      await expect(readFleet(shape.fetch, null)).rejects.toThrow('unexpected shape');
    }
  });

  it('shows the book without the proposals or the history when GitHub refuses those', async () => {
    const pulls = fakeFetch(bookRoutes({ [PULLS]: fail(429) }));
    const withoutPulls = await readFleet(pulls.fetch, null);
    expect(withoutPulls.orders.map((order) => order.id)).toEqual(['agora']);
    expect(withoutPulls.pending).toEqual([]);
    expect(withoutPulls.history).toHaveLength(2);
    expect(withoutPulls.missing).toEqual(['pulls']);
    expect(withoutPulls.resetAt).toBeNull();
    const both = fakeFetch(bookRoutes({ [PULLS]: fail(403), [COMMITS]: fail(403) }));
    const bare = await readFleet(both.fetch, null);
    expect(bare.history).toEqual([]);
    expect(bare.missing).toEqual(['pulls', 'history']);
  });

  it('treats an API answer in a shape it does not expect as that extra missing', async () => {
    const commit = {
      sha: 'abc1234',
      html_url: 'u',
      author: null,
      commit: { message: 'm', author: { name: 'n', date: 'd' } },
    };
    const cases: [Record<string, Response>, string][] = [
      [{ [PULLS]: ok({}) }, 'pulls'],
      [{ [PULLS]: ok([null]) }, 'pulls'],
      [{ [PULLS]: ok([{ number: '7', html_url: 'u', head: { ref: 'r' } }]) }, 'pulls'],
      [{ [PULLS]: ok([{ number: 7, html_url: 'u', head: null }]) }, 'pulls'],
      [{ [COMMITS]: ok([{ ...commit, author: { login: 3 } }]) }, 'history'],
      [{ [COMMITS]: ok([{ ...commit, commit: { message: 'm' } }]) }, 'history'],
      [{ [COMMITS]: ok([{ ...commit, sha: null }]) }, 'history'],
    ];
    for (const [overrides, extra] of cases) {
      const { fetch } = fakeFetch(bookRoutes(overrides));
      const fleet = await readFleet(fetch, null);
      expect(fleet.orders).toEqual([ORDER]);
      expect(fleet.missing).toEqual([extra]);
    }
  });
});

describe('probeWorld — like a visitor', () => {
  it('reads a live world', async () => {
    const { fetch, calls } = fakeFetch(() =>
      ok({ uptime: 30, connectedUsers: [{ name: 'x' }], commitHash: 'abcdef123' }),
    );
    expect(await probeWorld(fetch, 'agora.numen.games')).toEqual({
      ok: true,
      users: 1,
      uptime: 30,
      commit: 'abcdef1',
    });
    expect(calls[0]?.url).toBe('https://agora.numen.games/status');
  });

  it('names each way of failing', async () => {
    const timeout = Object.assign(new Error('slow'), { name: 'TimeoutError' });
    const abort = Object.assign(new Error('gone'), { name: 'AbortError' });
    expect(
      await probeWorld(fakeFetch(() => Promise.reject(timeout)).fetch, 'a.numen.games'),
    ).toEqual({ ok: false, reason: 'timeout' });
    expect(await probeWorld(fakeFetch(() => Promise.reject(abort)).fetch, 'a.numen.games')).toEqual(
      { ok: false, reason: 'timeout' },
    );
    expect(
      await probeWorld(
        fakeFetch(() => Promise.reject(new TypeError('dns'))).fetch,
        'a.numen.games',
      ),
    ).toEqual({ ok: false, reason: 'network' });
    expect(
      await probeWorld(fakeFetch(() => Promise.reject('weird')).fetch, 'a.numen.games'),
    ).toEqual({ ok: false, reason: 'network' });
    expect(await probeWorld(fakeFetch(() => fail(502)).fetch, 'a.numen.games')).toEqual({
      ok: false,
      reason: 'http',
      status: 502,
    });
    expect(await probeWorld(fakeFetch(() => text('<html>')).fetch, 'a.numen.games')).toEqual({
      ok: false,
      reason: 'shape',
    });
  });

  it('asks only the running worlds', async () => {
    const { fetch, calls } = fakeFetch(() => ok({ uptime: 1, connectedUsers: [] }));
    const probes = await probeFleet(
      fetch,
      [ORDER, { ...ORDER, id: 'off', domain: 'off.numen.games', state: 'stopped' }],
      50,
    );
    expect(Object.keys(probes)).toEqual(['agora']);
    expect(calls).toHaveLength(1);
  });

  it('asks every world of a list it is given (the legacy list has no state)', async () => {
    const { fetch, calls } = fakeFetch(() => ok({ uptime: 1, connectedUsers: [] }));
    const probes = await probeWorlds(fetch, [
      { id: 'vic', domain: 'vic.numinia.com' },
      { id: 'demo', domain: 'demo.numinia.com' },
    ]);
    expect(Object.keys(probes)).toEqual(['vic', 'demo']);
    expect(calls.map((call) => call.url)).toEqual([
      'https://vic.numinia.com/status',
      'https://demo.numinia.com/status',
    ]);
  });
});

const PAGE = `<!DOCTYPE html><html><head>
<title>The Cultural Cyber Hive</title>
<meta property="og:title" content="The Cultural Cyber Hive &amp; Friends">
<meta property="og:description" content="A Little Playground for Digital Art">
<meta property="og:image" content="https://hive.numinia.com/assets/fe6b.jpeg">
</head></html>`;

describe('checkAddress — where an address points, asked of public DNS', () => {
  const DOH = 'https://cloudflare-dns.com/dns-query';
  const HOST = 'vps-39c7f315.vps.ovh.net';
  const answer = (...ips: string[]): Response =>
    ok({ Status: 0, Answer: ips.map((data) => ({ type: 1, data })) });
  const dns = (table: Record<string, Response | 'throw'>) =>
    fakeFetch((call) => {
      const name = new URL(call.url).searchParams.get('name') ?? '';
      const entry = table[name];
      if (entry === 'throw') throw new Error('offline');
      return entry;
    });

  it('asks Cloudflare’s DNS for the address and the machine, as JSON', async () => {
    const { fetch, calls } = dns({
      'p1.numinia.com': answer('192.0.2.1'),
      [HOST]: answer('192.0.2.1'),
    });
    expect(await checkAddress(fetch, 'p1.numinia.com', 'open-1')).toBe('machine');
    expect(calls.map((call) => call.url).sort()).toEqual([
      `${DOH}?name=p1.numinia.com&type=A`,
      `${DOH}?name=${HOST}&type=A`,
    ]);
  });

  it('tells another machine, a name not yet in DNS, and what it cannot tell', async () => {
    // A Response body is read once: each lookup gets its own.
    const machine = (): Response => answer('192.0.2.1');
    const check = (name: string, table: Record<string, Response | 'throw'>): Promise<string> =>
      checkAddress(dns(table).fetch, name, 'open-1');
    expect(
      await check('vic.numinia.com', {
        'vic.numinia.com': answer('198.51.100.7'),
        [HOST]: machine(),
      }),
    ).toBe('elsewhere');
    expect(
      await check('new.numen.games', { 'new.numen.games': ok({ Status: 3 }), [HOST]: machine() }),
    ).toBe('none');
    expect(await check('p1.numinia.com', { 'p1.numinia.com': fail(502), [HOST]: machine() })).toBe(
      'unknown',
    );
    expect(await check('p1.numinia.com', { 'p1.numinia.com': machine(), [HOST]: 'throw' })).toBe(
      'unknown',
    );
  });

  it('asks nothing for a machine the room does not know', async () => {
    const { fetch, calls } = dns({});
    expect(await checkAddress(fetch, 'p1.numinia.com', 'open-9')).toBe('unknown');
    expect(calls).toHaveLength(0);
  });
});

describe('a world’s face — its own title and loading picture', () => {
  it('reads the og: title and image the engine serves', () => {
    expect(parseFace(PAGE, 'hive.numinia.com')).toEqual({
      title: 'The Cultural Cyber Hive & Friends',
      image: 'https://hive.numinia.com/assets/fe6b.jpeg',
    });
  });

  it('falls back to the <title>, and keeps only a picture the world itself serves', () => {
    const page =
      '<title>Escenario del crimen</title><meta property="og:title" content=""><meta property="og:image" content="https://elsewhere.com/x.jpeg">';
    expect(parseFace(page, 'demo.numinia.com')).toEqual({
      title: 'Escenario del crimen',
      image: null,
    });
    expect(parseFace('<meta property="og:image" content="">', 'x.numinia.com')).toEqual({
      title: null,
      image: null,
    });
    expect(parseFace('<title> &lt;World&gt; &quot;1&quot; &#39;2&#39; </title>', 'x')).toEqual({
      title: '<World> "1" \'2\'',
      image: null,
    });
  });

  it('asks the page like a visitor, and gives up quietly', async () => {
    const page = fakeFetch(() => text(PAGE));
    expect(await readFace(page.fetch, 'hive.numinia.com')).toMatchObject({
      title: expect.any(String),
    });
    expect(page.calls[0]?.url).toBe('https://hive.numinia.com/');
    expect(await readFace(fakeFetch(() => fail(502)).fetch, 'hive.numinia.com')).toBeNull();
    expect(
      await readFace(fakeFetch(() => Promise.reject(new TypeError('dns'))).fetch, 'x'),
    ).toBeNull();
  });

  it('reads several faces and leaves out the worlds that do not answer', async () => {
    const { fetch } = fakeFetch((call) =>
      call.url === 'https://hive.numinia.com/' ? text(PAGE) : fail(404),
    );
    const faces = await readFaces(fetch, [
      { id: 'hive', domain: 'hive.numinia.com' },
      { id: 'gone', domain: 'gone.numinia.com' },
    ]);
    expect(Object.keys(faces)).toEqual(['hive']);
  });
});

const TOKEN = 'ghp_'.padEnd(40, 'x');

function proposalRoutes(
  existing: Response | null,
  overrides: Partial<Record<string, Response>> = {},
): Route {
  return (call) => {
    const key = `${call.method} ${call.url}`;
    if (key in overrides) return overrides[key];
    if (key === `GET ${API}/git/ref/heads/main`) return ok({ object: { sha: 'base-sha' } });
    if (key === `GET ${API}/contents/open-worlds/agora.json?ref=main`) return existing ?? fail(404);
    if (key === `POST ${API}/git/refs`) return ok({}, 201);
    if (key === `PUT ${API}/contents/open-worlds/agora.json`) return ok({}, 201);
    if (key === `DELETE ${API}/contents/open-worlds/agora.json`) return ok({});
    // The index on the branch just made: it names the world only when the order exists.
    if (key.startsWith(`GET ${API}/contents/open-worlds/index.json?ref=open-worlds/agora/`))
      return indexFile(existing ? ['agora', 'plaza'] : ['plaza']);
    if (key === `PUT ${API}/contents/open-worlds/index.json`) return ok({}, 201);
    if (key === `POST ${API}/pulls`)
      return ok({ number: 21, html_url: 'https://github.com/x/pull/21' }, 201);
    if (key.startsWith(`POST ${API}/pulls/21/requested_reviewers`)) return ok({}, 201);
    return undefined;
  };
}

const existingFile = (order: unknown): Response =>
  ok({
    sha: 'file-sha',
    content: Buffer.from(JSON.stringify(order, null, 2))
      .toString('base64')
      .replace(/(.{60})/g, '$1\n'),
  });

const indexFile = (ids: string[]): Response =>
  ok({ sha: 'index-sha', content: Buffer.from(renderIndex(ids)).toString('base64') });

const decoded = (body: unknown): string =>
  Buffer.from((body as { content: string }).content, 'base64').toString('utf8');

const putsTo = (calls: Call[], path: string): Call[] =>
  calls.filter((call) => call.method === 'PUT' && call.url === `${API}/contents/${path}`);

describe('proposeChange — one branch, its commits, one pull request', () => {
  it('orders a new world, lists it in the index, and asks the house’s reviewers one by one', async () => {
    const { fetch, calls } = fakeFetch(proposalRoutes(null));
    const proposal = await proposeChange(
      fetch,
      TOKEN,
      { action: 'create', order: ORDER },
      '0xabc',
      'lz1',
    );
    expect(proposal).toEqual({ number: 21, url: 'https://github.com/x/pull/21' });
    const ref = calls.find((call) => call.url === `${API}/git/refs`);
    expect(ref?.body).toEqual({ ref: 'refs/heads/open-worlds/agora/create-lz1', sha: 'base-sha' });
    const put = putsTo(calls, 'open-worlds/agora.json')[0];
    const putBody = put?.body as { message: string; content: string; branch: string };
    expect(putBody.branch).toBe('open-worlds/agora/create-lz1');
    expect(putBody.message).toContain('Acting-Wallet: 0xabc');
    expect(decoded(putBody)).toBe(renderOrder(ORDER));
    // The depot's test wants the index equal to the folder: same branch, right after.
    const index = putsTo(calls, 'open-worlds/index.json')[0];
    expect(index?.body).toMatchObject({ sha: 'index-sha', branch: 'open-worlds/agora/create-lz1' });
    expect(decoded(index?.body)).toBe(renderIndex(['agora', 'plaza']));
    expect(calls.indexOf(put as Call)).toBeLessThan(calls.indexOf(index as Call));
    const pull = calls.find((call) => call.url === `${API}/pulls`);
    expect(pull?.body).toMatchObject({ head: 'open-worlds/agora/create-lz1', base: 'main' });
    const reviewers = calls.filter((call) => call.url.endsWith('/requested_reviewers'));
    expect(reviewers.map((call) => call.body)).toEqual([
      { reviewers: ['PabloFMM'] },
      { reviewers: ['MariaGarciaJordan'] },
      { reviewers: ['Christian-Numen'] },
    ]);
    expect(calls.every((call) => call.auth === `Bearer ${TOKEN}`)).toBe(true);
  });

  it('refuses to order a world whose order already exists', async () => {
    const { fetch } = fakeFetch(proposalRoutes(existingFile(ORDER)));
    await expect(
      proposeChange(fetch, TOKEN, { action: 'create', order: ORDER }, '0xabc', 'lz1'),
    ).rejects.toMatchObject({
      code: 'exists',
      status: 409,
    });
  });

  it('stops a world by rewriting only its state, against the file’s sha; the index is left alone', async () => {
    const { fetch, calls } = fakeFetch(proposalRoutes(existingFile(ORDER)));
    await proposeChange(fetch, TOKEN, { action: 'stop', id: 'agora' }, '0xabc', 'lz2');
    const put = putsTo(calls, 'open-worlds/agora.json')[0]?.body as { sha: string };
    expect(put.sha).toBe('file-sha');
    expect(JSON.parse(decoded(put))).toEqual({ ...ORDER, state: 'stopped' });
    expect(calls.some((call) => call.url.includes('index.json'))).toBe(false);
  });

  it('starts a stopped world', async () => {
    const { fetch, calls } = fakeFetch(
      proposalRoutes(existingFile({ ...ORDER, state: 'stopped' })),
    );
    await proposeChange(fetch, TOKEN, { action: 'start', id: 'agora' }, '0xabc', 'lz3');
    const put = putsTo(calls, 'open-worlds/agora.json')[0]?.body;
    expect(JSON.parse(decoded(put)).state).toBe('running');
  });

  it('closes a world by deleting its order and striking it from the index — nothing else', async () => {
    const { fetch, calls } = fakeFetch(proposalRoutes(existingFile(ORDER)));
    await proposeChange(fetch, TOKEN, { action: 'close', id: 'agora' }, '0xabc', 'lz4');
    const deleted = calls.find((call) => call.method === 'DELETE');
    expect(deleted?.body).toMatchObject({ sha: 'file-sha', branch: 'open-worlds/agora/close-lz4' });
    expect(putsTo(calls, 'open-worlds/agora.json')).toEqual([]);
    const index = putsTo(calls, 'open-worlds/index.json')[0];
    expect(decoded(index?.body)).toBe(renderIndex(['plaza']));
  });

  it('refuses to touch an index that is not one, or that GitHub will not give', async () => {
    const INDEX_ON_BRANCH = `GET ${API}/contents/open-worlds/index.json?ref=open-worlds/agora/create-lz1`;
    const broken = fakeFetch(
      proposalRoutes(null, { [INDEX_ON_BRANCH]: ok({ sha: 'x', content: btoa('{"x": 1}') }) }),
    );
    await expect(
      proposeChange(broken.fetch, TOKEN, { action: 'create', order: ORDER }, '0xabc', 'lz1'),
    ).rejects.toMatchObject({ code: 'github', status: 422 });
    const gone = fakeFetch(proposalRoutes(null, { [INDEX_ON_BRANCH]: fail(404) }));
    await expect(
      proposeChange(gone.fetch, TOKEN, { action: 'create', order: ORDER }, '0xabc', 'lz1'),
    ).rejects.toMatchObject({ code: 'github', status: 404 });
  });

  it('cannot change a world that has no order', async () => {
    const { fetch } = fakeFetch(proposalRoutes(null));
    await expect(
      proposeChange(fetch, TOKEN, { action: 'close', id: 'agora' }, '0xabc', 'lz5'),
    ).rejects.toMatchObject({
      code: 'missing',
    });
  });

  it('refuses to rewrite an order that already breaks the rules', async () => {
    const { fetch } = fakeFetch(proposalRoutes(existingFile({ ...ORDER, image: 'x:latest' })));
    await expect(
      proposeChange(fetch, TOKEN, { action: 'stop', id: 'agora' }, '0xabc', 'lz6'),
    ).rejects.toMatchObject({
      code: 'github',
      status: 422,
    });
  });

  it('surfaces GitHub refusals as github failures', async () => {
    const reading = fakeFetch(proposalRoutes(fail(500)));
    await expect(
      proposeChange(reading.fetch, TOKEN, { action: 'stop', id: 'agora' }, '0xabc', 'lz7'),
    ).rejects.toMatchObject({
      code: 'github',
      status: 500,
    });
    const branching = fakeFetch(proposalRoutes(null, { [`POST ${API}/git/refs`]: fail(422) }));
    await expect(
      proposeChange(branching.fetch, TOKEN, { action: 'create', order: ORDER }, '0xabc', 'lz8'),
    ).rejects.toBeInstanceOf(ProposalError);
  });

  it('never lets a refused reviewer sink a proposal that exists', async () => {
    const { fetch } = fakeFetch((call) => {
      if (call.url.endsWith('/requested_reviewers')) return Promise.reject(new Error('422'));
      return proposalRoutes(null)(call);
    });
    await expect(
      proposeChange(fetch, TOKEN, { action: 'create', order: ORDER }, '0xabc', 'lz9'),
    ).resolves.toEqual({
      number: 21,
      url: 'https://github.com/x/pull/21',
    });
  });
});

describe('readExtras — the API’s part, best effort, from the Worker or the Oracle’s browser', () => {
  const spent = (reset: string): Response =>
    new Response('{}', {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset },
    });

  it('asks only for what is wanted', async () => {
    const { fetch, calls } = fakeFetch(bookRoutes());
    const extras = await readExtras(fetch, null, ['history']);
    expect(extras.pending).toEqual([]);
    expect(extras.history).toHaveLength(2);
    expect(extras.missing).toEqual([]);
    expect(calls.map((call) => call.url)).toEqual([COMMITS]);
    const none = await readExtras(fakeFetch(bookRoutes()).fetch, null, []);
    expect(none).toEqual({ pending: [], history: [], missing: [], resetAt: null });
  });

  it('names a spent keyless quota and when it reopens', async () => {
    const { fetch } = fakeFetch(bookRoutes({ [PULLS]: spent('1791728465'), [COMMITS]: fail(500) }));
    const extras = await readExtras(fetch, null);
    expect(extras.missing).toEqual(['pulls', 'history']);
    expect(extras.resetAt).toBe(1791728465000);
    const unsaid = fakeFetch(bookRoutes({ [PULLS]: spent('') }));
    expect((await readExtras(unsaid.fetch, null)).resetAt).toBeNull();
    // A 403 with quota left is a refusal of the request, not of the address.
    const refused = new Response('{}', { status: 403, headers: { 'x-ratelimit-remaining': '7' } });
    expect(new FleetError(403, 'x', refused).quota).toBe(false);
    expect(new FleetError(403, 'x').quota).toBe(false);
  });

  it('treats a network failure and a wrong shape like a refusal', async () => {
    const { fetch } = fakeFetch((call) => {
      if (call.url === PULLS) return Promise.reject(new Error('offline'));
      if (call.url === COMMITS) return ok({ not: 'a list' });
      return undefined;
    });
    const extras = await readExtras(fetch, null);
    expect(extras.missing).toEqual(['pulls', 'history']);
    expect(extras.pending).toEqual([]);
    expect(extras.history).toEqual([]);
  });
});
