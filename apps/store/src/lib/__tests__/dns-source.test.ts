import { afterEach, describe, expect, it } from 'vitest';
import {
  answerDnsLook,
  answerDnsWrite,
  boundDnsDesk,
  createFixtureDnsDesk,
  dnsDeskFrom,
  resetFixtureDnsDeskForTests,
  type DeskAnswer,
  type DnsDeskApi,
} from '../dns-source';

const WALLET = '0xABCDEF0123456789ABCDEF0123456789ABCDEF01';
const BRONTE = 'vps-1e2f105f.vps.ovh.ca';

/** A desk that records what it is asked and answers `answer`. */
function spyDesk(answer: DeskAnswer | 'throw' = { ok: true, domain: 'x', done: 'created' }) {
  const asked: unknown[][] = [];
  const reply = async (...args: unknown[]): Promise<DeskAnswer> => {
    asked.push(args);
    if (answer === 'throw') throw new Error('till down');
    return answer;
  };
  const desk: DnsDeskApi = {
    look: (...args) => reply('look', ...args),
    point: (...args) => reply('point', ...args),
    release: (...args) => reply('release', ...args),
  };
  return { desk, asked };
}

const post = (body: unknown, type = 'application/json'): Request =>
  new Request('https://numinia.com/api/admin/dns', {
    method: 'POST',
    headers: { 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

afterEach(() => resetFixtureDnsDeskForTests());

describe('the bound desk', () => {
  it('is read off an RPC stub with its three methods, called on the stub', async () => {
    const stub = {
      prefix: 'stub',
      async look(this: { prefix: string }, domain: string, host?: string) {
        return { ok: true, domain: `${this.prefix}:${domain}:${host}` } as DeskAnswer;
      },
      async point(
        this: { prefix: string },
        domain: string,
        machine: string,
        host: string,
        by: string,
      ) {
        return {
          ok: true,
          domain: `${this.prefix}:${domain}:${machine}:${host}:${by}`,
        } as DeskAnswer;
      },
      async release(this: { prefix: string }, domain: string, machine: string) {
        return { ok: true, domain: `${this.prefix}:${domain}:${machine}` } as DeskAnswer;
      },
    };
    const desk = boundDnsDesk(stub);
    expect(await desk?.look('a', 'h')).toEqual({ ok: true, domain: 'stub:a:h' });
    expect(await desk?.point('a', 'm', 'h', 'w')).toEqual({ ok: true, domain: 'stub:a:m:h:w' });
    expect(await desk?.release('a', 'm')).toEqual({ ok: true, domain: 'stub:a:m' });
  });

  it('is nothing when the binding is missing or not a desk', () => {
    expect(boundDnsDesk(undefined)).toBeNull();
    expect(boundDnsDesk(null)).toBeNull();
    expect(boundDnsDesk('TILL_DNS')).toBeNull();
    expect(boundDnsDesk({ look: () => null })).toBeNull();
    expect(boundDnsDesk(Object.assign(() => null, { look: 1 }))).toBeNull();
  });

  it('falls to the fixture only under DATA_SOURCE=fixture, one per process', () => {
    expect(dnsDeskFrom({ binding: undefined, dataSource: 'github' })).toBeNull();
    const fixture = dnsDeskFrom({ binding: undefined, dataSource: 'fixture' });
    expect(fixture).not.toBeNull();
    expect(dnsDeskFrom({ binding: undefined, dataSource: 'fixture' })).toBe(fixture);
    const { desk } = spyDesk();
    expect(dnsDeskFrom({ binding: desk, dataSource: 'fixture' })).not.toBe(fixture);
  });
});

describe('the fixture desk, with the till’s rules', () => {
  it('creates, finds right, moves and releases the fleet’s own record', async () => {
    const desk = createFixtureDnsDesk();
    expect(await desk.look('torre.numinia.com', BRONTE)).toMatchObject({
      record: 'none',
      machineIp: '192.0.2.20',
    });
    expect(await desk.point('torre.numinia.com', 'bronte-xs-ca-003', BRONTE, WALLET)).toMatchObject(
      { done: 'created', ip: '192.0.2.20' },
    );
    expect(await desk.look('torre.numinia.com')).toMatchObject({
      record: 'fleet',
      machine: 'bronte-xs-ca-003',
      machineIp: null,
    });
    expect(await desk.point('torre.numinia.com', 'bronte-xs-ca-003', BRONTE, WALLET)).toMatchObject(
      { done: 'already' },
    );
    expect(
      await desk.point('torre.numinia.com', 'open-1', 'vps-39c7f315.vps.ovh.net', WALLET),
    ).toMatchObject({ done: 'moved' });
    expect(await desk.release('torre.numinia.com', 'bronte-xs-ca-003')).toMatchObject({
      done: 'nothing',
    });
    expect(await desk.release('torre.numinia.com', 'open-1')).toMatchObject({ done: 'deleted' });
  });

  it('leaves a record by hand at the machine, refuses one elsewhere and anything outside the zones', async () => {
    const desk = createFixtureDnsDesk();
    expect(await desk.look('alchemiststower.numinia.com', BRONTE)).toMatchObject({
      record: 'hand',
    });
    expect(
      await desk.point('alchemiststower.numinia.com', 'bronte-xs-ca-003', BRONTE, WALLET),
    ).toMatchObject({ done: 'already' });
    expect(await desk.point('blog.numinia.com', 'bronte-xs-ca-003', BRONTE, WALLET)).toEqual({
      ok: false,
      problem: 'taken',
    });
    expect(await desk.point('a.numinia.com', 'x', 'nowhere.example.com', WALLET)).toEqual({
      ok: false,
      problem: 'host',
    });
    for (const act of [
      desk.look('a.example.com'),
      desk.point('numinia.com', 'open-1', BRONTE, WALLET),
      desk.release('a.b.numinia.com', 'open-1'),
    ]) {
      expect(await act).toEqual({ ok: false, problem: 'domain' });
    }
  });
});

describe('GET — who answers for an address', () => {
  it('asks the desk with the machine’s host from the room’s own list', async () => {
    const { desk, asked } = spyDesk();
    const response = await answerDnsLook(
      desk,
      new URL(
        'https://numinia.com/api/admin/dns?domain=torre.numinia.com&machine=bronte-xs-ca-003',
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(asked).toEqual([['look', 'torre.numinia.com', BRONTE]]);
  });

  it('refuses an address or a machine it does not know, and says when there is no desk', async () => {
    const { desk, asked } = spyDesk();
    const at = (query: string) =>
      answerDnsLook(desk, new URL(`https://numinia.com/api/admin/dns?${query}`));
    expect(await (await at('domain=x&machine=open-1')).json()).toEqual({
      ok: false,
      problem: 'domain',
    });
    expect((await at('domain=a.numinia.com')).status).toBe(400);
    expect(await (await at('domain=a.numinia.com&machine=open-9')).json()).toEqual({
      ok: false,
      problem: 'machine',
    });
    expect(asked).toEqual([]);
    const none = await answerDnsLook(null, new URL('https://numinia.com/api/admin/dns'));
    expect(none.status).toBe(503);
  });

  it('answers 502 when the till fails', async () => {
    const { desk } = spyDesk('throw');
    const response = await answerDnsLook(
      desk,
      new URL('https://numinia.com/api/admin/dns?domain=a.numinia.com&machine=open-1'),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'till-failed' });
  });
});

describe('POST — point or release', () => {
  it('points with the host from the list and the session’s wallet, lowercased', async () => {
    const { desk, asked } = spyDesk();
    const response = await answerDnsWrite(
      desk,
      post({ action: 'point', domain: 'torre.numinia.com', machine: 'bronte-xs-ca-003' }),
      WALLET,
    );
    expect(response.status).toBe(200);
    expect(asked).toEqual([
      ['point', 'torre.numinia.com', 'bronte-xs-ca-003', BRONTE, WALLET.toLowerCase()],
    ]);
  });

  it('releases for the machine named', async () => {
    const { desk, asked } = spyDesk();
    await answerDnsWrite(
      desk,
      post({ action: 'release', domain: 'torre.numinia.com', machine: 'open-1' }),
      WALLET,
    );
    expect(asked).toEqual([['release', 'torre.numinia.com', 'open-1']]);
  });

  it('refuses what is not a request it takes, before asking the desk', async () => {
    const { desk, asked } = spyDesk();
    const cases: [Request, number][] = [
      [post('x', 'text/plain'), 415],
      [post('a'.repeat(2000)), 413],
      [post('{nope'), 400],
      [post({ action: 'point', domain: 'torre.numinia.com', machine: 7 }), 400],
      [post({ action: 'wipe', domain: 'torre.numinia.com', machine: 'open-1' }), 400],
      [post('null'), 400],
    ];
    for (const [request, status] of cases) {
      expect((await answerDnsWrite(desk, request, WALLET)).status).toBe(status);
    }
    expect(asked).toEqual([]);
    expect((await answerDnsWrite(null, post({}), WALLET)).status).toBe(503);
  });

  it('answers 502 when the till fails', async () => {
    const { desk } = spyDesk('throw');
    const response = await answerDnsWrite(
      desk,
      post({ action: 'point', domain: 'torre.numinia.com', machine: 'open-1' }),
      WALLET,
    );
    expect(response.status).toBe(502);
  });
});
