/**
 * A world's address, written by the fleet itself (the Worlds room, ADR-069).
 *
 * Every name under the house zones falls to a wildcard that sends it to the
 * first machine (open-1); a world on any other machine needs its own A
 * record, DNS only (grey cloud: the machine's Caddy holds the certificate
 * and the WebSocket), pointing at that machine. Before this cut an Oracle
 * made it by hand in Cloudflare's panel; now the Worlds room asks the till's
 * DNS desk, and the desk asks Cloudflare.
 *
 * The rails, so a mistake (or a stolen session) cannot take a name the house
 * already uses:
 * - Only one label under a house zone (`<name>.numinia.com`,
 *   `<name>.numen.games`), never the zone itself, never a reserved name.
 * - Only A records, always `proxied: false`, always pointing at the IPv4 the
 *   machine's own public host name resolves to — the IP is never taken
 *   from a browser.
 * - The desk changes or deletes only records it made itself: their comment
 *   starts with `numinia-fleet`. A record made by hand that already points
 *   at the machine is left as it is (nothing to do); any other record by
 *   hand, or of another type, is refused as `taken`.
 *
 * `fetch` is injected: tests run against a fake Cloudflare and never reach
 * api.cloudflare.com. A Cloudflare answer that is not a success is thrown —
 * a failure, never a refusal — naming the call and the status, never the
 * token.
 */

/** The zones a world's address hangs from: the room's WORLD_ZONES and the machine's HOUSE_ZONES. */
export const DNS_ZONES = ['numinia.com', 'numen.games'] as const;

/** Names the desk never writes, even when nothing answers for them yet. */
export const RESERVED_LABELS: readonly string[] = [
  'www',
  'mail',
  'smtp',
  'imap',
  'pop',
  'mx',
  'ns1',
  'ns2',
  'api',
  'auth',
  'admin',
  'status',
];

/** Every record the desk makes carries this comment, then the machine and who asked. */
export const FLEET_MARK = 'numinia-fleet';

const API = 'https://api.cloudflare.com/client/v4';
const DOH = 'https://cloudflare-dns.com/dns-query';
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ALIAS = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const WALLET = /^0x[0-9a-f]{40}$/;
const IPV4 =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;

/** What the client needs of `fetch`. */
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Why the desk will not do it, one code per rule (the room words each one). */
export type DnsProblem =
  'not-configured' | 'domain' | 'reserved' | 'machine' | 'host' | 'wallet' | 'taken';

export interface DnsRefusal {
  readonly ok: false;
  readonly problem: DnsProblem;
}

/** One record of the name, as the desk reads it. */
export interface DnsRecord {
  readonly id: string;
  readonly type: string;
  readonly content: string;
  readonly proxied: boolean;
  readonly comment: string | null;
}

/**
 * Who answers for an address today: nobody (the wildcard does), a record the
 * fleet made (and for which machine), or a record made by hand.
 */
export interface DnsLook {
  readonly ok: true;
  readonly domain: string;
  readonly record: 'none' | 'fleet' | 'hand';
  /** The IPv4s its A records hold (none for `none`). */
  readonly ips: readonly string[];
  /** The machine the fleet's record names; null for `none` and `hand`. */
  readonly machine: string | null;
  /** The IPv4 of the machine asked about (`look` with a host); null when none was asked or it has none. */
  readonly machineIp?: string | null;
}

export interface DnsDone {
  readonly ok: true;
  readonly domain: string;
  /** created, moved to another IP, already right, deleted, or nothing of the fleet's to delete. */
  readonly done: 'created' | 'moved' | 'already' | 'deleted' | 'nothing';
  /** The IPv4 the address points at now; null after a delete. */
  readonly ip: string | null;
}

/** The address as a zone and one label under it; null when it is not one. */
export function placeOf(
  domain: unknown,
): { readonly zone: string; readonly label: string; readonly domain: string } | null {
  if (typeof domain !== 'string') return null;
  const name = domain.trim().toLowerCase();
  for (const zone of DNS_ZONES) {
    const suffix = `.${zone}`;
    if (!name.endsWith(suffix)) continue;
    const label = name.slice(0, -suffix.length);
    return LABEL.test(label) ? { zone, label, domain: name } : null;
  }
  return null;
}

/** The comment a fleet record carries: who made it, for which machine, asked by whom. */
export function fleetComment(machine: string, by: string): string {
  return `${FLEET_MARK} ${machine} ${by.slice(0, 6)}…${by.slice(-4)}`;
}

/** The machine a fleet record names; null when the record is not the fleet's. */
export function fleetMachineOf(comment: string | null): string | null {
  if (comment === null) return null;
  const words = comment.split(' ');
  if (words[0] !== FLEET_MARK) return null;
  const machine = words[1] ?? '';
  return ALIAS.test(machine) ? machine : null;
}

/** Who answers for the name, from its records. */
export function lookOf(domain: string, records: readonly DnsRecord[]): DnsLook {
  if (records.length === 0) return { ok: true, domain, record: 'none', ips: [], machine: null };
  const ips = records.filter((record) => record.type === 'A').map((record) => record.content);
  const machines = records.map((record) => fleetMachineOf(record.comment));
  const fleet = machines.every((machine) => machine !== null) && ips.length === records.length;
  return {
    ok: true,
    domain,
    record: fleet ? 'fleet' : 'hand',
    ips,
    // records is not empty here, so the first machine is there.
    machine: fleet ? (machines[0] as string) : null,
  };
}

/** The answer of a DNS-over-HTTPS JSON lookup → its IPv4s; null when it is not one. */
export function readDoh(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const answer = body as { Status?: unknown; Answer?: unknown };
  // 0 = answered, 3 = no such name; anything else means the lookup failed.
  if (answer.Status !== 0 && answer.Status !== 3) return null;
  const rows = Array.isArray(answer.Answer) ? (answer.Answer as unknown[]) : [];
  return rows
    .filter(
      (row): row is { type: number; data: string } =>
        typeof row === 'object' &&
        row !== null &&
        (row as { type?: unknown }).type === 1 &&
        typeof (row as { data?: unknown }).data === 'string',
    )
    .map((row) => row.data)
    .filter((ip) => IPV4.test(ip));
}

/** A record as Cloudflare answers it → the fields the desk reads; null when it is not one. */
export function parseRecord(value: unknown): DnsRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.type !== 'string' ||
    typeof record.content !== 'string'
  ) {
    return null;
  }
  return {
    id: record.id,
    type: record.type,
    content: record.content,
    proxied: record.proxied === true,
    comment: typeof record.comment === 'string' ? record.comment : null,
  };
}

/** Cloudflare's DNS, the four calls the desk makes, with one API token. */
export class CloudflareDns {
  private readonly zones = new Map<string, string>();

  constructor(
    private readonly token: string,
    private readonly fetcher: Fetcher,
  ) {}

  private async call(what: string, path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.fetcher(`${API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
    });
    const body = (await response.json().catch(() => null)) as {
      success?: unknown;
      result?: unknown;
    } | null;
    if (!response.ok || body === null || body.success !== true) {
      throw new Error(`cloudflare ${what}: status ${response.status}`);
    }
    return body.result;
  }

  /** The zone's id, asked once per isolate. */
  async zoneId(zone: string): Promise<string> {
    const known = this.zones.get(zone);
    if (known !== undefined) return known;
    const result = await this.call('zone', `/zones?name=${encodeURIComponent(zone)}`);
    const first = Array.isArray(result) ? (result[0] as { id?: unknown } | undefined) : undefined;
    if (typeof first?.id !== 'string') throw new Error('cloudflare zone: not found');
    this.zones.set(zone, first.id);
    return first.id;
  }

  /** Every record of exactly this name, whatever its type. */
  async records(zone: string, name: string): Promise<DnsRecord[]> {
    const id = await this.zoneId(zone);
    const result = await this.call(
      'list',
      `/zones/${id}/dns_records?name.exact=${encodeURIComponent(name)}&per_page=50`,
    );
    if (!Array.isArray(result)) throw new Error('cloudflare list: not a list');
    return result.map(parseRecord).filter((record): record is DnsRecord => record !== null);
  }

  /** A new A record, DNS only, automatic TTL. */
  async create(zone: string, name: string, ip: string, comment: string): Promise<void> {
    const id = await this.zoneId(zone);
    await this.call('create', `/zones/${id}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'A', name, content: ip, ttl: 1, proxied: false, comment }),
    });
  }

  /** Points an existing record at another IPv4, still DNS only. */
  async update(zone: string, recordId: string, ip: string, comment: string): Promise<void> {
    const id = await this.zoneId(zone);
    await this.call('update', `/zones/${id}/dns_records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: ip, proxied: false, comment }),
    });
  }

  async remove(zone: string, recordId: string): Promise<void> {
    const id = await this.zoneId(zone);
    await this.call('delete', `/zones/${id}/dns_records/${recordId}`, { method: 'DELETE' });
  }
}

/** The IPv4 a machine's public host name resolves to, asked of public DNS; null when it has none. */
export async function machineIp(fetcher: Fetcher, host: string): Promise<string | null> {
  const response = await fetcher(`${DOH}?name=${encodeURIComponent(host)}&type=A`, {
    headers: { accept: 'application/dns-json' },
  });
  if (!response.ok) throw new Error(`doh: status ${response.status}`);
  const ips = readDoh(await response.json());
  if (ips === null) throw new Error('doh: not an answer');
  return ips[0] ?? null;
}

const refuse = (problem: DnsProblem): DnsRefusal => ({ ok: false, problem });

/** The desk's three acts, over a Cloudflare client (null when no token is configured). */
export class FleetDns {
  constructor(
    private readonly cloudflare: CloudflareDns | null,
    private readonly fetcher: Fetcher,
  ) {}

  /**
   * Who answers for an address today, and — given a machine's public host
   * name — where that machine is, so the room can tell «already there» from
   * «somewhere else». Writes nothing.
   */
  async look(domain: unknown, host?: unknown): Promise<DnsLook | DnsRefusal> {
    if (this.cloudflare === null) return refuse('not-configured');
    const place = placeOf(domain);
    if (place === null) return refuse('domain');
    if (host !== undefined && (typeof host !== 'string' || !HOST.test(host))) {
      return refuse('host');
    }
    const [records, ip] = await Promise.all([
      this.cloudflare.records(place.zone, place.domain),
      host === undefined ? Promise.resolve(null) : machineIp(this.fetcher, host),
    ]);
    return { ...lookOf(place.domain, records), machineIp: ip };
  }

  /**
   * Points the address at the machine: creates the fleet's record, moves the
   * fleet's record to the machine, or finds it already right. `host` is the
   * machine's public host name as numinia.com's own list holds it; `by` the
   * Oracle's wallet, as numinia.com's session verified it.
   */
  async point(
    domain: unknown,
    machine: unknown,
    host: unknown,
    by: unknown,
  ): Promise<DnsDone | DnsRefusal> {
    if (this.cloudflare === null) return refuse('not-configured');
    const place = placeOf(domain);
    if (place === null) return refuse('domain');
    if (RESERVED_LABELS.includes(place.label)) return refuse('reserved');
    if (typeof machine !== 'string' || !ALIAS.test(machine)) return refuse('machine');
    if (typeof host !== 'string' || !HOST.test(host)) return refuse('host');
    if (typeof by !== 'string' || !WALLET.test(by)) return refuse('wallet');
    const ip = await machineIp(this.fetcher, host);
    if (ip === null) return refuse('host');

    const records = await this.cloudflare.records(place.zone, place.domain);
    const look = lookOf(place.domain, records);
    const comment = fleetComment(machine, by);
    const answer = (done: DnsDone['done']): DnsDone => ({
      ok: true,
      domain: place.domain,
      done,
      ip,
    });

    if (look.record === 'hand') {
      // A record by hand already at the machine is fine as it is; anything else is not ours.
      return look.ips.length === records.length && look.ips.every((one) => one === ip)
        ? answer('already')
        : refuse('taken');
    }
    if (look.record === 'none') {
      await this.cloudflare.create(place.zone, place.domain, ip, comment);
      return answer('created');
    }
    const [first, ...extra] = records as [DnsRecord, ...DnsRecord[]];
    for (const record of extra) await this.cloudflare.remove(place.zone, record.id);
    if (first.content === ip && !first.proxied && fleetMachineOf(first.comment) === machine) {
      return answer(extra.length > 0 ? 'moved' : 'already');
    }
    await this.cloudflare.update(place.zone, first.id, ip, comment);
    return answer('moved');
  }

  /**
   * Deletes the fleet's record of the address for this machine, when the
   * world there is gone. A record by hand, or the fleet's for another
   * machine, is left alone (`nothing`).
   */
  async release(domain: unknown, machine: unknown): Promise<DnsDone | DnsRefusal> {
    if (this.cloudflare === null) return refuse('not-configured');
    const place = placeOf(domain);
    if (place === null) return refuse('domain');
    if (typeof machine !== 'string' || !ALIAS.test(machine)) return refuse('machine');
    const records = await this.cloudflare.records(place.zone, place.domain);
    const ours = records.filter((record) => fleetMachineOf(record.comment) === machine);
    for (const record of ours) await this.cloudflare.remove(place.zone, record.id);
    return {
      ok: true,
      domain: place.domain,
      done: ours.length > 0 ? 'deleted' : 'nothing',
      ip: null,
    };
  }
}
