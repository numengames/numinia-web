/**
 * The worlds room's reads of the worlds themselves, against fake worlds:
 * each world's public /status, where an address points in public DNS, and
 * a world's own page (its title and loading picture).
 */

import { describe, expect, it } from 'vitest';
import type { WorldOrder } from '../worlds';
import {
  ENGINE_RELEASE_RETRY_MS,
  ENGINE_RELEASE_TTL_MS,
  ENGINE_RELEASE_URL,
  askAddress,
  checkAddress,
  forgetEngineRelease,
  latestEngine,
  parseFace,
  probeFleet,
  probeWorld,
  probeWorlds,
  readFace,
  readFaces,
  writeDns,
} from '../worlds-source';

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

describe('latestEngine — the Numinia Engine’s newest build, from its release', () => {
  const RELEASE = {
    image: `ghcr.io/numengames/numinia-engine:sha-${'d'.repeat(40)}`,
    commit: 'd'.repeat(40),
    build: 'ddddddd 2026-10-16',
    digest: `sha256:${'e'.repeat(64)}`,
  };

  it('reads imagen.json once, and keeps a found build a few minutes', async () => {
    forgetEngineRelease();
    const { fetch, calls } = fakeFetch(() => ok(RELEASE));
    expect(await latestEngine(fetch, 1_000)).toEqual(RELEASE);
    expect(calls.map((call) => call.url)).toEqual([ENGINE_RELEASE_URL]);
    expect(await latestEngine(fetch, 1_000 + ENGINE_RELEASE_TTL_MS - 1)).toEqual(RELEASE);
    expect(calls).toHaveLength(1);
    expect(await latestEngine(fetch, 1_000 + ENGINE_RELEASE_TTL_MS)).toEqual(RELEASE);
    expect(calls).toHaveLength(2);
  });

  it('says none while there is no release, or it cannot be read, and asks again after a minute', async () => {
    for (const answer of [
      () => fail(404),
      () => text('<html>'),
      () => ok({ ...RELEASE, image: 'ghcr.io/numengames/numinia-engine:latest' }),
      () => Promise.reject(new TypeError('dns')),
    ]) {
      forgetEngineRelease();
      const { fetch, calls } = fakeFetch(answer);
      expect(await latestEngine(fetch, 5_000)).toBeNull();
      expect(await latestEngine(fetch, 5_000 + ENGINE_RELEASE_RETRY_MS - 1)).toBeNull();
      expect(calls).toHaveLength(1);
      await latestEngine(fetch, 5_000 + ENGINE_RELEASE_RETRY_MS);
      expect(calls).toHaveLength(2);
    }
    forgetEngineRelease();
    // With no clock given, now.
    expect(await latestEngine(fakeFetch(() => ok(RELEASE)).fetch)).toEqual(RELEASE);
    forgetEngineRelease();
  });
});

describe('askAddress — the till’s DNS desk first, public DNS when it is not there', () => {
  const HOST = 'vps-1e2f105f.vps.ovh.ca';
  const look = (record: string, ips: string[], machineIp: string | null): Response =>
    ok({ ok: true, domain: 'torre.numinia.com', record, ips, machine: null, machineIp });

  it('asks the room’s own route with the address and the machine', async () => {
    const { fetch, calls } = fakeFetch(() => look('none', [], '192.0.2.20'));
    expect(await askAddress(fetch, 'torre.numinia.com', 'bronte-xs-ca-003')).toBe('create');
    expect(calls[0]?.url).toBe('/api/admin/dns?domain=torre.numinia.com&machine=bronte-xs-ca-003');
  });

  it('reads each answer of the desk', async () => {
    const ask = (answer: Response): Promise<string> =>
      askAddress(fakeFetch(() => answer).fetch, 'torre.numinia.com', 'bronte-xs-ca-003');
    expect(await ask(look('fleet', ['192.0.2.20'], '192.0.2.20'))).toBe('machine');
    expect(await ask(look('fleet', ['192.0.2.10'], '192.0.2.20'))).toBe('move');
    expect(await ask(look('hand', ['192.0.2.20'], '192.0.2.20'))).toBe('machine');
    expect(await ask(look('hand', ['198.51.100.7'], '192.0.2.20'))).toBe('elsewhere');
  });

  it('falls back to public DNS when the desk refuses, fails or is not bound', async () => {
    const doh = (name: string): Response =>
      ok({ Status: 0, Answer: [{ type: 1, data: name === HOST ? '192.0.2.20' : '192.0.2.10' }] });
    for (const desk of [
      () => ok({ ok: false, problem: 'not-configured' }),
      () => fail(503),
      () => {
        throw new Error('offline');
      },
    ]) {
      const { fetch } = fakeFetch((call) => {
        if (call.url.startsWith('/api/admin/dns')) return desk();
        return doh(new URL(call.url).searchParams.get('name') ?? '');
      });
      expect(await askAddress(fetch, 'torre.numinia.com', 'bronte-xs-ca-003')).toBe('elsewhere');
    }
  });
});

describe('writeDns — the room asks its desk to write or delete a record', () => {
  it('posts the act, the address and the machine as JSON, and reads what was done', async () => {
    const { fetch, calls } = fakeFetch(() =>
      ok({ ok: true, domain: 'torre.numinia.com', done: 'created', ip: '192.0.2.20' }),
    );
    expect(await writeDns(fetch, 'point', 'torre.numinia.com', 'bronte-xs-ca-003')).toEqual({
      ok: true,
      done: 'created',
    });
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: '/api/admin/dns',
      body: { action: 'point', domain: 'torre.numinia.com', machine: 'bronte-xs-ca-003' },
    });
  });

  it('says why not: the desk’s problem, the route’s error, nothing readable, no answer', async () => {
    const write = (answer: () => Response): Promise<unknown> =>
      writeDns(fakeFetch(answer).fetch, 'release', 'torre.numinia.com', 'open-1');
    expect(await write(() => ok({ ok: false, problem: 'taken' }))).toEqual({
      ok: false,
      problem: 'taken',
    });
    expect(await write(() => ok({ error: 'not-bound' }, 503))).toEqual({
      ok: false,
      problem: 'not-bound',
    });
    expect(await write(() => text('<html>', 502))).toEqual({ ok: false, problem: 'unexpected' });
    expect(
      await write(() => {
        throw new Error('offline');
      }),
    ).toEqual({ ok: false, problem: 'unreachable' });
  });
});
