import { describe, expect, it } from 'vitest';
import {
  CloudflareDns,
  FleetDns,
  fleetComment,
  fleetMachineOf,
  lookOf,
  machineIp,
  parseRecord,
  placeOf,
  readDoh,
  type DnsRecord,
  type Fetcher,
} from '../src/lib/fleet-dns';
import { DnsDesk, fleetDnsFor } from '../src/worker';

const TOKEN = 'cf-token-pretend';
const WALLET = '0x1234567890abcdef1234567890abcdef12345678';
const OPEN1 = { host: 'vps-39c7f315.vps.ovh.net', ip: '152.228.240.108' };
const BRONTE = { host: 'vps-1e2f105f.vps.ovh.ca', ip: '51.222.220.14' };

interface Stored extends DnsRecord {
  readonly name: string;
  readonly zone: string;
}

/** Cloudflare's API and public DNS, in memory, as the desk calls them. */
class FakeCloudflare {
  records: Stored[] = [];
  calls: string[] = [];
  /** A call name that answers `success: false` with this status. */
  failing: { readonly call: string; readonly status: number } | null = null;
  hosts: Record<string, string[]> = { [OPEN1.host]: [OPEN1.ip], [BRONTE.host]: [BRONTE.ip] };
  dohStatus = 200;
  private next = 1;
  readonly zones: Record<string, string> = { 'numinia.com': 'z-numinia', 'numen.games': 'z-numen' };

  readonly fetch: Fetcher = async (url, init) => {
    const { pathname, searchParams, hostname } = new URL(url);
    if (hostname === 'cloudflare-dns.com') {
      const name = searchParams.get('name') ?? '';
      const ips = this.hosts[name] ?? [];
      return Response.json(
        { Status: ips.length > 0 ? 0 : 3, Answer: ips.map((data) => ({ type: 1, data })) },
        { status: this.dohStatus },
      );
    }
    expect(new Headers(init.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
    const method = init.method ?? 'GET';
    const parts = pathname.replace('/client/v4/', '').split('/');
    const call =
      parts[0] === 'zones' && parts.length === 1
        ? 'zone'
        : parts.length === 3
          ? method === 'POST'
            ? 'create'
            : 'list'
          : method === 'PATCH'
            ? 'update'
            : 'delete';
    this.calls.push(call);
    if (this.failing?.call === call) {
      return Response.json({ success: false, errors: [] }, { status: this.failing.status });
    }
    const ok = (result: unknown): Response => Response.json({ success: true, result });
    if (call === 'zone') {
      const id = this.zones[searchParams.get('name') ?? ''];
      return ok(id === undefined ? [] : [{ id }]);
    }
    const zone = parts[1] ?? '';
    if (call === 'list') {
      const name = searchParams.get('name.exact');
      return ok(this.records.filter((record) => record.zone === zone && record.name === name));
    }
    const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
    if (call === 'create') {
      this.records.push({
        id: `r${this.next++}`,
        zone,
        name: String(body.name),
        type: String(body.type),
        content: String(body.content),
        proxied: body.proxied === true,
        comment: typeof body.comment === 'string' ? body.comment : null,
      });
      return ok({});
    }
    const id = parts[3];
    if (call === 'update') {
      this.records = this.records.map((record) =>
        record.id === id
          ? {
              ...record,
              content: String(body.content),
              proxied: body.proxied === true,
              comment: String(body.comment),
            }
          : record,
      );
      return ok({});
    }
    this.records = this.records.filter((record) => record.id !== id);
    return ok({ id });
  };

  add(name: string, content: string, comment: string | null, type = 'A', proxied = false): void {
    const zone = name.endsWith('numen.games') ? 'z-numen' : 'z-numinia';
    this.records.push({ id: `r${this.next++}`, zone, name, type, content, proxied, comment });
  }
}

function desk(fake: FakeCloudflare): FleetDns {
  return new FleetDns(new CloudflareDns(TOKEN, fake.fetch), fake.fetch);
}

describe('the address a world may get', () => {
  it('is one label under a house zone, lowercased', () => {
    expect(placeOf(' Torre.Numinia.com ')).toEqual({
      zone: 'numinia.com',
      label: 'torre',
      domain: 'torre.numinia.com',
    });
    expect(placeOf('expo-1.numen.games')?.zone).toBe('numen.games');
  });

  it('is never the zone, a deeper name, another zone or not a name', () => {
    for (const bad of [
      'numinia.com',
      'a.b.numinia.com',
      'torre.example.com',
      '-x.numinia.com',
      7,
    ]) {
      expect(placeOf(bad)).toBeNull();
    }
  });
});

describe('the fleet mark', () => {
  it('names the machine and a short wallet, and is read back', () => {
    const comment = fleetComment('bronte-xs-ca-003', WALLET);
    expect(comment).toBe('numinia-fleet bronte-xs-ca-003 0x1234…5678');
    expect(fleetMachineOf(comment)).toBe('bronte-xs-ca-003');
  });

  it('is not a record by hand, nor a mark without a machine', () => {
    expect(fleetMachineOf(null)).toBeNull();
    expect(fleetMachineOf('made by Pablo')).toBeNull();
    expect(fleetMachineOf('numinia-fleet')).toBeNull();
    expect(fleetMachineOf('numinia-fleet BAD_alias')).toBeNull();
  });
});

describe('reading answers', () => {
  it('reads the IPv4s of a DoH answer and nothing else', () => {
    expect(
      readDoh({
        Status: 0,
        Answer: [
          { type: 5, data: 'x.example.' },
          { type: 1, data: '51.222.220.14' },
          { type: 1, data: 'nope' },
          null,
        ],
      }),
    ).toEqual(['51.222.220.14']);
    expect(readDoh({ Status: 0 })).toEqual([]);
    expect(readDoh({ Status: 2 })).toBeNull();
    expect(readDoh(null)).toBeNull();
  });

  it('reads a record, or nothing when it is not one', () => {
    expect(parseRecord({ id: 'a', type: 'A', content: '1.2.3.4' })).toEqual({
      id: 'a',
      type: 'A',
      content: '1.2.3.4',
      proxied: false,
      comment: null,
    });
    expect(parseRecord({ id: 'a', type: 'A' })).toBeNull();
    expect(parseRecord('a')).toBeNull();
  });

  it('tells nobody, the fleet and a hand apart', () => {
    expect(lookOf('a.numinia.com', []).record).toBe('none');
    const fleet: DnsRecord = {
      id: '1',
      type: 'A',
      content: BRONTE.ip,
      proxied: false,
      comment: 'numinia-fleet bronte-xs-ca-003',
    };
    expect(lookOf('a.numinia.com', [fleet])).toMatchObject({
      record: 'fleet',
      machine: 'bronte-xs-ca-003',
      ips: [BRONTE.ip],
    });
    expect(lookOf('a.numinia.com', [{ ...fleet, comment: null }]).record).toBe('hand');
    expect(lookOf('a.numinia.com', [{ ...fleet, type: 'CNAME' }]).record).toBe('hand');
  });
});

describe('pointing an address at a machine', () => {
  it('creates a grey A record at the machine when nobody answers for it', async () => {
    const fake = new FakeCloudflare();
    const answer = await desk(fake).point(
      'torre.numinia.com',
      'bronte-xs-ca-003',
      BRONTE.host,
      WALLET,
    );
    expect(answer).toEqual({
      ok: true,
      domain: 'torre.numinia.com',
      done: 'created',
      ip: BRONTE.ip,
    });
    expect(fake.records).toEqual([
      expect.objectContaining({
        name: 'torre.numinia.com',
        type: 'A',
        content: BRONTE.ip,
        proxied: false,
        comment: 'numinia-fleet bronte-xs-ca-003 0x1234…5678',
      }),
    ]);
  });

  it('finds its own record already right, and asks the zone only once', async () => {
    const fake = new FakeCloudflare();
    const dns = desk(fake);
    await dns.point('torre.numen.games', 'bronte-xs-ca-003', BRONTE.host, WALLET);
    const again = await dns.point('torre.numen.games', 'bronte-xs-ca-003', BRONTE.host, WALLET);
    expect(again).toMatchObject({ done: 'already' });
    expect(fake.calls.filter((call) => call === 'zone')).toHaveLength(1);
  });

  it('moves its own record to another machine, and drops a duplicate', async () => {
    const fake = new FakeCloudflare();
    fake.add('torre.numinia.com', BRONTE.ip, 'numinia-fleet bronte-xs-ca-003 x');
    fake.add('torre.numinia.com', BRONTE.ip, 'numinia-fleet bronte-xs-ca-003 x');
    const answer = await desk(fake).point('torre.numinia.com', 'open-1', OPEN1.host, WALLET);
    expect(answer).toMatchObject({ done: 'moved', ip: OPEN1.ip });
    expect(fake.records).toHaveLength(1);
    expect(fake.records[0]).toMatchObject({
      content: OPEN1.ip,
      comment: expect.stringContaining('open-1'),
    });
  });

  it('calls a duplicate dropped a move even when the first was right', async () => {
    const fake = new FakeCloudflare();
    fake.add('torre.numinia.com', BRONTE.ip, 'numinia-fleet bronte-xs-ca-003 x');
    fake.add('torre.numinia.com', BRONTE.ip, 'numinia-fleet bronte-xs-ca-003 x');
    const answer = await desk(fake).point(
      'torre.numinia.com',
      'bronte-xs-ca-003',
      BRONTE.host,
      WALLET,
    );
    expect(answer).toMatchObject({ done: 'moved' });
    expect(fake.records).toHaveLength(1);
  });

  it('turns its own orange record grey', async () => {
    const fake = new FakeCloudflare();
    fake.add('torre.numinia.com', BRONTE.ip, 'numinia-fleet bronte-xs-ca-003 x', 'A', true);
    const answer = await desk(fake).point(
      'torre.numinia.com',
      'bronte-xs-ca-003',
      BRONTE.host,
      WALLET,
    );
    expect(answer).toMatchObject({ done: 'moved' });
    expect(fake.records[0]?.proxied).toBe(false);
  });

  it('leaves a record by hand that already points at the machine', async () => {
    const fake = new FakeCloudflare();
    fake.add('alchemiststower.numinia.com', BRONTE.ip, null);
    const answer = await desk(fake).point(
      'alchemiststower.numinia.com',
      'bronte-xs-ca-003',
      BRONTE.host,
      WALLET,
    );
    expect(answer).toMatchObject({ done: 'already' });
    expect(fake.calls).not.toContain('update');
  });

  it('refuses a record by hand elsewhere, or of another type', async () => {
    const fake = new FakeCloudflare();
    fake.add('blog.numinia.com', '9.9.9.9', null);
    fake.add('docs.numinia.com', 'x.example.com', null, 'CNAME');
    const dns = desk(fake);
    for (const name of ['blog.numinia.com', 'docs.numinia.com']) {
      expect(await dns.point(name, 'bronte-xs-ca-003', BRONTE.host, WALLET)).toEqual({
        ok: false,
        problem: 'taken',
      });
    }
    expect(fake.calls).not.toContain('create');
  });

  it('refuses what breaks a rail, before asking Cloudflare to write anything', async () => {
    const fake = new FakeCloudflare();
    const dns = desk(fake);
    const cases: [unknown[], string][] = [
      [['numinia.com', 'open-1', OPEN1.host, WALLET], 'domain'],
      [['www.numinia.com', 'open-1', OPEN1.host, WALLET], 'reserved'],
      [['torre.numinia.com', 'Open 1', OPEN1.host, WALLET], 'machine'],
      [['torre.numinia.com', 'open-1', '152.228.240.108', WALLET], 'host'],
      [['torre.numinia.com', 'open-1', 'gone.example.com', WALLET], 'host'],
      [['torre.numinia.com', 'open-1', OPEN1.host, 'pablo'], 'wallet'],
    ];
    for (const [args, problem] of cases) {
      const [domain, machine, host, by] = args;
      expect(await dns.point(domain, machine, host, by)).toEqual({ ok: false, problem });
    }
    expect(fake.records).toEqual([]);
  });
});

describe('releasing an address', () => {
  it("deletes only the fleet's record for that machine", async () => {
    const fake = new FakeCloudflare();
    fake.add('torre.numinia.com', BRONTE.ip, 'numinia-fleet bronte-xs-ca-003 x');
    fake.add('hecho.numinia.com', BRONTE.ip, null);
    const dns = desk(fake);
    expect(await dns.release('torre.numinia.com', 'open-1')).toMatchObject({ done: 'nothing' });
    expect(await dns.release('torre.numinia.com', 'bronte-xs-ca-003')).toEqual({
      ok: true,
      domain: 'torre.numinia.com',
      done: 'deleted',
      ip: null,
    });
    expect(await dns.release('hecho.numinia.com', 'bronte-xs-ca-003')).toMatchObject({
      done: 'nothing',
    });
    expect(fake.records.map((record) => record.name)).toEqual(['hecho.numinia.com']);
  });

  it('refuses a name or a machine that is not one', async () => {
    const dns = desk(new FakeCloudflare());
    expect(await dns.release('x.example.com', 'open-1')).toEqual({ ok: false, problem: 'domain' });
    expect(await dns.release('a.numinia.com', 3)).toEqual({ ok: false, problem: 'machine' });
  });
});

describe('looking', () => {
  it('says who answers, or refuses a name that is not one', async () => {
    const fake = new FakeCloudflare();
    fake.add('alchemiststower.numinia.com', BRONTE.ip, null);
    const dns = desk(fake);
    expect(await dns.look('alchemiststower.numinia.com')).toMatchObject({
      record: 'hand',
      ips: [BRONTE.ip],
    });
    expect(await dns.look('nueva.numinia.com')).toMatchObject({ record: 'none', machineIp: null });
    expect(await dns.look('nueva.numinia.com', BRONTE.host)).toMatchObject({
      record: 'none',
      machineIp: BRONTE.ip,
    });
    expect(await dns.look('nueva.numinia.com', '1.2.3.4')).toEqual({ ok: false, problem: 'host' });
    expect(await dns.look('numinia.com')).toEqual({ ok: false, problem: 'domain' });
  });
});

describe('failures', () => {
  it('throws on a Cloudflare call that fails, naming the call and status only', async () => {
    const fake = new FakeCloudflare();
    fake.failing = { call: 'create', status: 403 };
    await expect(
      desk(fake).point('torre.numinia.com', 'open-1', OPEN1.host, WALLET),
    ).rejects.toThrow(/^cloudflare create: status 403$/);
  });

  it('throws when the zone is not in the account, or the list is not one', async () => {
    const fake = new FakeCloudflare();
    delete (fake.zones as Record<string, string>)['numen.games'];
    await expect(desk(fake).look('a.numen.games')).rejects.toThrow('cloudflare zone: not found');
    const odd: Fetcher = async () => Response.json({ success: true, result: { id: 'z' } });
    await expect(new CloudflareDns(TOKEN, odd).zoneId('numinia.com')).rejects.toThrow(
      'cloudflare zone: not found',
    );
    const notList: Fetcher = async (url) =>
      Response.json({ success: true, result: url.includes('dns_records') ? {} : [{ id: 'z' }] });
    await expect(
      new CloudflareDns(TOKEN, notList).records('numinia.com', 'a.numinia.com'),
    ).rejects.toThrow('cloudflare list: not a list');
  });

  it('throws when the answer is not JSON', async () => {
    const broken: Fetcher = async () => new Response('<html>', { status: 502 });
    await expect(new CloudflareDns(TOKEN, broken).zoneId('numinia.com')).rejects.toThrow(
      'cloudflare zone: status 502',
    );
  });

  it('throws when public DNS cannot say where the machine is', async () => {
    const fake = new FakeCloudflare();
    fake.dohStatus = 500;
    await expect(machineIp(fake.fetch, OPEN1.host)).rejects.toThrow('doh: status 500');
    const odd: Fetcher = async () => Response.json({ Status: 2 });
    await expect(machineIp(odd, OPEN1.host)).rejects.toThrow('doh: not an answer');
  });
});

describe('the DNS desk', () => {
  it('answers not-configured without a token, for every act', async () => {
    const dns = fleetDnsFor({});
    expect(await dns.look('a.numinia.com')).toEqual({ ok: false, problem: 'not-configured' });
    expect(await dns.point('a.numinia.com', 'open-1', OPEN1.host, WALLET)).toEqual({
      ok: false,
      problem: 'not-configured',
    });
    expect(await dns.release('a.numinia.com', 'open-1')).toEqual({
      ok: false,
      problem: 'not-configured',
    });
    expect(await fleetDnsFor({ CLOUDFLARE_DNS_TOKEN: '' }).look('a.numinia.com')).toEqual({
      ok: false,
      problem: 'not-configured',
    });
  });

  it('works through the token it is given', async () => {
    const fake = new FakeCloudflare();
    const dns = fleetDnsFor({ CLOUDFLARE_DNS_TOKEN: TOKEN }, fake.fetch);
    expect(await dns.point('a.numinia.com', 'open-1', OPEN1.host, WALLET)).toMatchObject({
      done: 'created',
    });
  });

  it('is an RPC entrypoint whose methods answer without a token', async () => {
    const entry = new DnsDesk({} as ExecutionContext, {} as never);
    expect(await entry.look('a.numinia.com')).toEqual({ ok: false, problem: 'not-configured' });
    expect(await entry.point('a.numinia.com', 'open-1', OPEN1.host, WALLET)).toMatchObject({
      ok: false,
    });
    expect(await entry.release('a.numinia.com', 'open-1')).toMatchObject({ ok: false });
  });
});
