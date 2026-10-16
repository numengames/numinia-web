/**
 * The Worlds room's door to the till's DNS desk. Server only.
 *
 * Trust model, as the price room's (lib/prices-source.ts): the till's
 * `DnsDesk` is reachable from nowhere but this Worker's service binding
 * `TILL_DNS` (root wrangler.jsonc), an RPC entrypoint with no URL. The API
 * route checks the Oracle's session first (`manage-worlds`), turns the
 * machine's alias into its public host name from the room's own list
 * (FLEET_MACHINES) — the browser never names a host or an IP — and passes
 * the session's wallet as `by`. The till holds the Cloudflare token and
 * re-validates everything; this Worker still holds no key.
 *
 * Under DATA_SOURCE=fixture the desk is an in-memory stand-in with the same
 * rules, so CI and screenshots walk the whole flow without Cloudflare.
 */

import { machineHost } from './worlds';
import { logEvent } from './telemetry';

/** The desk's answers, as the till gives them (apps/till/src/lib/fleet-dns.ts). */
export type DeskAnswer =
  | {
      readonly ok: true;
      readonly domain: string;
      readonly record?: 'none' | 'fleet' | 'hand';
      readonly ips?: readonly string[];
      readonly machine?: string | null;
      readonly machineIp?: string | null;
      readonly done?: string;
      readonly ip?: string | null;
    }
  | { readonly ok: false; readonly problem: string };

/** The three acts of the till's DNS desk. */
export interface DnsDeskApi {
  look(domain: string, host?: string): Promise<DeskAnswer>;
  point(domain: string, machine: string, host: string, by: string): Promise<DeskAnswer>;
  release(domain: string, machine: string): Promise<DeskAnswer>;
}

/** The desk read off whatever workerd bound, or null when it is not one. */
export function boundDnsDesk(binding: unknown): DnsDeskApi | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<keyof DnsDeskApi, unknown>>;
  if (
    typeof desk.look !== 'function' ||
    typeof desk.point !== 'function' ||
    typeof desk.release !== 'function'
  ) {
    return null;
  }
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as DnsDeskApi;
  return {
    look: (domain, host) => stub.look(domain, host),
    point: (domain, machine, host, by) => stub.point(domain, machine, host, by),
    release: (domain, machine) => stub.release(domain, machine),
  };
}

// ---- The fixture desk --------------------------------------------------------

/** Where the fixture's machines are: documentation addresses (RFC 5737), never real ones. */
const FIXTURE_IPS: Readonly<Record<string, string>> = {
  'vps-39c7f315.vps.ovh.net': '192.0.2.10',
  'vps-1e2f105f.vps.ovh.ca': '192.0.2.20',
};

interface FixtureRecord {
  readonly ip: string;
  /** The machine of a record the fleet made; null for one made by hand. */
  readonly machine: string | null;
}

const ZONES = ['numinia.com', 'numen.games'];
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function inZone(domain: string): boolean {
  return ZONES.some((zone) => {
    const suffix = `.${zone}`;
    return domain.endsWith(suffix) && LABEL.test(domain.slice(0, -suffix.length));
  });
}

/** An in-memory desk with the till's rules, seeded with one record made by hand. */
export function createFixtureDnsDesk(): DnsDeskApi {
  const records = new Map<string, FixtureRecord>([
    ['alchemiststower.numinia.com', { ip: '192.0.2.20', machine: null }],
    ['blog.numinia.com', { ip: '198.51.100.7', machine: null }],
  ]);
  const ipOf = (host: string): string | null => FIXTURE_IPS[host] ?? null;
  return {
    async look(domain, host) {
      if (!inZone(domain)) return { ok: false, problem: 'domain' };
      const record = records.get(domain);
      return {
        ok: true,
        domain,
        record: record === undefined ? 'none' : record.machine === null ? 'hand' : 'fleet',
        ips: record === undefined ? [] : [record.ip],
        machine: record?.machine ?? null,
        machineIp: host === undefined ? null : ipOf(host),
      };
    },
    async point(domain, machine, host) {
      if (!inZone(domain)) return { ok: false, problem: 'domain' };
      const ip = ipOf(host);
      if (ip === null) return { ok: false, problem: 'host' };
      const record = records.get(domain);
      if (record?.machine === null) {
        return record.ip === ip
          ? { ok: true, domain, done: 'already', ip }
          : { ok: false, problem: 'taken' };
      }
      records.set(domain, { ip, machine });
      if (record === undefined) return { ok: true, domain, done: 'created', ip };
      return { ok: true, domain, done: record.ip === ip ? 'already' : 'moved', ip };
    },
    async release(domain, machine) {
      if (!inZone(domain)) return { ok: false, problem: 'domain' };
      const record = records.get(domain);
      if (record?.machine !== machine) return { ok: true, domain, done: 'nothing', ip: null };
      records.delete(domain);
      return { ok: true, domain, done: 'deleted', ip: null };
    },
  };
}

let fixture: DnsDeskApi | null = null;

/** Test seam: a fresh fixture desk for the next scenario. */
export function resetFixtureDnsDeskForTests(): void {
  fixture = null;
}

/** The desk to ask: the bound till, else the fixture under DATA_SOURCE=fixture, else null. */
export function dnsDeskFrom(env: {
  readonly binding: unknown;
  readonly dataSource: string | undefined;
}): DnsDeskApi | null {
  const bound = boundDnsDesk(env.binding);
  if (bound !== null) return bound;
  if (env.dataSource !== 'fixture') return null;
  fixture ??= createFixtureDnsDesk();
  return fixture;
}

// ---- The route's answers -----------------------------------------------------

const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
/** Bytes a POST may carry: three short strings. */
const MAX_BODY = 1024;

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

/** A domain and a machine the room knows, or the problem with them. */
function readPlace(
  domain: unknown,
  machine: unknown,
): { readonly domain: string; readonly machine: string; readonly host: string } | string {
  if (typeof domain !== 'string' || !DOMAIN.test(domain)) return 'domain';
  if (typeof machine !== 'string') return 'machine';
  const host = machineHost(machine);
  return host === null ? 'machine' : { domain, machine, host };
}

/** Calls the desk; a desk that throws is a 502, logged by rule, never by value. */
async function ask(call: () => Promise<DeskAnswer>, act: string): Promise<Response> {
  try {
    return json(await call());
  } catch {
    logEvent({ event: 'worlds.dns.failed', act });
    return json({ error: 'till-failed' }, 502);
  }
}

/** GET ?domain=&machine= → who answers for the address, and where the machine is. */
export async function answerDnsLook(desk: DnsDeskApi | null, url: URL): Promise<Response> {
  if (desk === null) return json({ error: 'not-bound' }, 503);
  const place = readPlace(url.searchParams.get('domain'), url.searchParams.get('machine'));
  if (typeof place === 'string') return json({ ok: false, problem: place }, 400);
  return ask(() => desk.look(place.domain, place.host), 'look');
}

/** POST {action: point|release, domain, machine} → what the desk did, as `by` the session's wallet. */
export async function answerDnsWrite(
  desk: DnsDeskApi | null,
  request: Request,
  wallet: string,
): Promise<Response> {
  if (desk === null) return json({ error: 'not-bound' }, 503);
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) {
    return json({ error: 'json-only' }, 415);
  }
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: 'too-large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'json' }, 400);
  }
  const { action, domain, machine } = (body ?? {}) as Record<string, unknown>;
  const place = readPlace(domain, machine);
  if (typeof place === 'string') return json({ ok: false, problem: place }, 400);
  if (action === 'point') {
    return ask(
      () => desk.point(place.domain, place.machine, place.host, wallet.toLowerCase()),
      'point',
    );
  }
  if (action === 'release') return ask(() => desk.release(place.domain, place.machine), 'release');
  return json({ ok: false, problem: 'action' }, 400);
}
