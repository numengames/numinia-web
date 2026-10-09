/**
 * The worlds room's I/O against a fake GitHub and fake worlds: reading the
 * order book (orders, proposals, history), probing each world's public
 * /status, and opening a proposal as one branch, one commit and one PR.
 */

import { describe, expect, it } from 'vitest';
import { renderOrder, type WorldOrder } from '../worlds';
import {
  FleetError,
  ProposalError,
  watchByIds,
  probeFleet,
  probeWorld,
  probeWorlds,
  proposeChange,
  parseFace,
  readFace,
  readFaces,
  readFleet,
  readFleetHere,
  worldsToken,
} from '../worlds-source';

const API = 'https://api.github.com/repos/numengames/numinia-assets';
const RAW = 'https://raw.githubusercontent.com/numengames/numinia-assets/main/open-worlds';

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
    if (call.url === `${API}/contents/open-worlds?ref=main`) {
      return ok([
        { name: 'README.md', type: 'file', download_url: `${RAW}/README.md` },
        { name: 'agora.json', type: 'file', download_url: `${RAW}/agora.json` },
        { name: 'broken.json', type: 'file', download_url: `${RAW}/broken.json` },
        { name: 'nested', type: 'dir', download_url: null },
      ]);
    }
    if (call.url === `${RAW}/agora.json`) return text(renderOrder(ORDER));
    if (call.url === `${RAW}/broken.json`)
      return text(JSON.stringify({ ...ORDER, id: 'broken', image: 'x:latest' }));
    if (call.url === `${API}/pulls?state=open&per_page=100`) {
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
    if (call.url === `${API}/commits?path=open-worlds&sha=main&per_page=15`) {
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
    // The API calls carry the token; the raw file downloads do not need it.
    expect(calls.find((call) => call.url.startsWith(API))?.auth).toMatch(/^Bearer token-/);
    expect(calls.find((call) => call.url.startsWith(RAW))?.auth).toBeNull();
  });

  it('reads without a token too', async () => {
    const { fetch, calls } = fakeFetch(bookRoutes());
    await readFleet(fetch, null);
    expect(calls.every((call) => call.auth === null)).toBe(true);
  });

  it('treats a missing folder as an empty fleet', async () => {
    const { fetch } = fakeFetch(
      bookRoutes({ [`${API}/contents/open-worlds?ref=main`]: fail(404) }),
    );
    const fleet = await readFleet(fetch, null);
    expect(fleet.orders).toEqual([]);
    expect(fleet.invalid).toEqual([]);
  });

  it('fails loud when GitHub refuses the folder, a file or the pulls', async () => {
    const folder = fakeFetch(bookRoutes({ [`${API}/contents/open-worlds?ref=main`]: fail(403) }));
    await expect(readFleet(folder.fetch, null)).rejects.toMatchObject({
      name: 'FleetError',
      status: 403,
    });
    const file = fakeFetch(bookRoutes({ [`${RAW}/agora.json`]: fail(500) }));
    await expect(readFleet(file.fetch, null)).rejects.toBeInstanceOf(FleetError);
    const pulls = fakeFetch(bookRoutes({ [`${API}/pulls?state=open&per_page=100`]: fail(429) }));
    await expect(readFleet(pulls.fetch, null)).rejects.toThrow('GitHub answered 429 on pulls');
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

describe('proposeChange — one branch, one commit, one pull request', () => {
  it('orders a new world and asks the house’s reviewers one by one', async () => {
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
    const put = calls.find((call) => call.method === 'PUT');
    const putBody = put?.body as { message: string; content: string; branch: string };
    expect(putBody.branch).toBe('open-worlds/agora/create-lz1');
    expect(putBody.message).toContain('Acting-Wallet: 0xabc');
    expect(Buffer.from(putBody.content, 'base64').toString('utf8')).toBe(renderOrder(ORDER));
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

  it('stops a world by rewriting only its state, against the file’s sha', async () => {
    const { fetch, calls } = fakeFetch(proposalRoutes(existingFile(ORDER)));
    await proposeChange(fetch, TOKEN, { action: 'stop', id: 'agora' }, '0xabc', 'lz2');
    const put = calls.find((call) => call.method === 'PUT')?.body as {
      content: string;
      sha: string;
    };
    expect(put.sha).toBe('file-sha');
    expect(JSON.parse(Buffer.from(put.content, 'base64').toString('utf8'))).toEqual({
      ...ORDER,
      state: 'stopped',
    });
  });

  it('starts a stopped world', async () => {
    const { fetch, calls } = fakeFetch(
      proposalRoutes(existingFile({ ...ORDER, state: 'stopped' })),
    );
    await proposeChange(fetch, TOKEN, { action: 'start', id: 'agora' }, '0xabc', 'lz3');
    const put = calls.find((call) => call.method === 'PUT')?.body as { content: string };
    expect(JSON.parse(Buffer.from(put.content, 'base64').toString('utf8')).state).toBe('running');
  });

  it('closes a world by deleting its order — nothing else', async () => {
    const { fetch, calls } = fakeFetch(proposalRoutes(existingFile(ORDER)));
    await proposeChange(fetch, TOKEN, { action: 'close', id: 'agora' }, '0xabc', 'lz4');
    const deleted = calls.find((call) => call.method === 'DELETE');
    expect(deleted?.body).toMatchObject({ sha: 'file-sha', branch: 'open-worlds/agora/close-lz4' });
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);
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

const LIVE = { uptime: 30, connectedUsers: [{ name: 'x' }], commitHash: 'abcdef123' };
const SEEN = { ok: true, users: 1, uptime: 30, commit: 'abcdef1' } as const;

describe('watchByIds — the Worker asks only hosts an order names', () => {
  const live = (call: Call): Response | undefined => {
    if (call.url === `${RAW}/agora.json`) return text(renderOrder(ORDER));
    if (call.url === 'https://agora.numen.games/status') return ok(LIVE);
    if (call.url === 'https://agora.numen.games/') return text('<title>Agora</title>');
    return undefined;
  };

  it('reads each order raw, probes the running world and reads its face when it has no card', async () => {
    const { fetch, calls } = fakeFetch(live);
    expect(await watchByIds(fetch, ['agora', 'agora'], new Set())).toEqual({
      probes: { agora: SEEN },
      faces: { agora: { title: 'Agora', image: null } },
    });
    expect(calls.map((call) => call.url).sort()).toEqual(
      [
        `${RAW}/agora.json`,
        'https://agora.numen.games/',
        'https://agora.numen.games/status',
      ].sort(),
    );
  });

  it('does not read the face of a world that has its card', async () => {
    const { fetch, calls } = fakeFetch(live);
    expect(await watchByIds(fetch, ['agora'], new Set(['agora']))).toEqual({
      probes: { agora: SEEN },
      faces: {},
    });
    expect(calls.some((call) => call.url === 'https://agora.numen.games/')).toBe(false);
  });

  it('skips ids that are not slugs, missing or broken orders, failed reads and stopped worlds', async () => {
    const rest = { ...ORDER, id: 'rest', card: 'rest', state: 'stopped' as const };
    const { fetch, calls } = fakeFetch((call) => {
      if (call.url === `${RAW}/missing.json`) return fail(404);
      if (call.url === `${RAW}/broken.json`) return text('{}');
      if (call.url === `${RAW}/rest.json`) return text(renderOrder(rest));
      return undefined;
    });
    expect(
      await watchByIds(
        fetch,
        ['../etc', 'evil.com/x', 'missing', 'broken', 'boom', 'rest'],
        new Set(),
      ),
    ).toEqual({ probes: {}, faces: {} });
    expect(calls.map((call) => call.url)).toEqual([
      `${RAW}/missing.json`,
      `${RAW}/broken.json`,
      `${RAW}/boom.json`,
      `${RAW}/rest.json`,
    ]);
  });
});

describe('readFleetHere — the order book read by the Oracle’s browser', () => {
  const VIC = { id: 'vic', domain: 'vic.numinia.com', server: 'vps-76aa7afe' };
  const ANSWER = {
    rank: 'oracle',
    canPropose: false,
    cards: [],
    legacy: [VIC],
    probes: { vic: SEEN },
    faces: { vic: { title: 'Vic', image: null } },
  };
  const WATCH = '/api/admin/worlds?probe=agora';
  const statuses = (rows: readonly { id: string; status: string; title: string }[]) =>
    rows.map((row) => [row.id, row.status, row.title]);

  it('reads without a key, asks the Worker to watch the running worlds and keeps the legacy ones', async () => {
    const { fetch, calls } = fakeFetch((call) =>
      call.url === WATCH
        ? ok({ probes: { agora: SEEN }, faces: { agora: { title: 'Agora', image: null } } })
        : bookRoutes()(call),
    );
    const fleet = await readFleetHere(fetch, ANSWER);
    expect(fleet.rank).toBe('oracle');
    expect(fleet.canPropose).toBe(false);
    expect(statuses(fleet.rows)).toEqual([
      ['agora', 'running', 'Agora'],
      ['vic', 'running', 'Vic'],
    ]);
    expect(fleet.invalid).toEqual([{ file: 'broken.json', problems: ['image'] }]);
    expect(fleet.history).toHaveLength(2);
    expect(calls.every((call) => call.auth === null)).toBe(true);
  });

  it('leaves a world unknown when the Worker cannot watch it', async () => {
    for (const answer of [fail(500), ok({})]) {
      const { fetch } = fakeFetch((call) => (call.url === WATCH ? answer : bookRoutes()(call)));
      const fleet = await readFleetHere(fetch, { ...ANSWER, legacy: [] });
      expect(statuses(fleet.rows)).toEqual([['agora', 'unknown', 'agora']]);
    }
  });

  it('does not call the Worker when no world is running', async () => {
    const stopped = text(renderOrder({ ...ORDER, state: 'stopped' }));
    const { fetch, calls } = fakeFetch(bookRoutes({ [`${RAW}/agora.json`]: stopped }));
    const fleet = await readFleetHere(fetch, { ...ANSWER, legacy: [] });
    expect(statuses(fleet.rows)).toEqual([['agora', 'stopped', 'agora']]);
    expect(calls.some((call) => call.url.startsWith('/api/'))).toBe(false);
  });
});
