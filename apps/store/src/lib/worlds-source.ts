/**
 * The worlds room's reads of the worlds themselves, made like any visitor:
 * each world's public `/status` (is it up, how many inside), where an
 * address points in public DNS, and a world's own page (its title and its
 * loading picture, for a world the Summa has no card for).
 *
 * The machines are read through their doors (lib/fleet.ts). Nothing here
 * writes anywhere, and nothing here needs a key.
 */

import {
  compareDns,
  machineHost,
  readDohAnswer,
  readProbe,
  type AddressDns,
  type Probe,
  type WorldFace,
  type WorldOrder,
} from './worlds';

type Fetch = typeof fetch;

/** Ask a world's public `/status`, like a visitor. Never throws. */
export async function probeWorld(
  fetchImpl: Fetch,
  domain: string,
  timeoutMs = 3000,
): Promise<Probe> {
  let response: Response;
  try {
    response = await fetchImpl(`https://${domain}/status`, {
      headers: { accept: 'application/json', 'user-agent': 'numinia-worlds-room' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    return {
      ok: false,
      reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network',
    };
  }
  if (!response.ok) return { ok: false, reason: 'http', status: response.status };
  try {
    return readProbe(await response.json());
  } catch {
    return { ok: false, reason: 'shape' };
  }
}

/** Probe every running order in parallel; stopped ones are not asked. */
export async function probeFleet(
  fetchImpl: Fetch,
  orders: readonly WorldOrder[],
  timeoutMs = 3000,
): Promise<Record<string, Probe>> {
  return probeWorlds(
    fetchImpl,
    orders.filter((order) => order.state === 'running'),
    timeoutMs,
  );
}

// Public DNS over HTTPS (CORS `*`), the same lookup any visitor's browser makes.
const DOH = 'https://cloudflare-dns.com/dns-query';

/** A name's IPv4 addresses; null when the lookup could not be made or read. */
async function resolveA(
  fetchImpl: Fetch,
  name: string,
  timeoutMs: number,
): Promise<string[] | null> {
  try {
    const response = await fetchImpl(`${DOH}?name=${encodeURIComponent(name)}&type=A`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return readDohAnswer(await response.json());
  } catch {
    return null;
  }
}

/**
 * Where a world's address points in public DNS, compared with the machine
 * chosen for it. Asked from the Oracle's browser while the wizard is open;
 * nothing is written anywhere. Never throws.
 */
export async function checkAddress(
  fetchImpl: Fetch,
  domain: string,
  machine: string,
  timeoutMs = 3000,
): Promise<AddressDns> {
  const host = machineHost(machine);
  if (host === null) return 'unknown';
  const [address, own] = await Promise.all([
    resolveA(fetchImpl, domain, timeoutMs),
    resolveA(fetchImpl, host, timeoutMs),
  ]);
  if (address === null || own === null) return 'unknown';
  return compareDns(address, own);
}

/** Probe any list of worlds by address, in parallel (the legacy list has no state to filter on). */
export async function probeWorlds(
  fetchImpl: Fetch,
  worlds: readonly { readonly id: string; readonly domain: string }[],
  timeoutMs = 3000,
): Promise<Record<string, Probe>> {
  const answers = await Promise.all(
    worlds.map(
      async (world) => [world.id, await probeWorld(fetchImpl, world.domain, timeoutMs)] as const,
    ),
  );
  return Object.fromEntries(answers);
}

// ---------------------------------------------------------------------------
// A world's face: what its own page says it is (title and loading picture)
// ---------------------------------------------------------------------------

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

const unescape = (text: string): string =>
  text.replace(/&(?:amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity] as string);

function meta(html: string, property: string): string | null {
  const match = new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, 'i').exec(html);
  const value = unescape(match?.[1] ?? '').trim();
  return value === '' ? null : value;
}

/**
 * The engine serves each world's title and its Settings image as og: tags —
 * the same picture the world shows while it loads. Only a picture served by
 * the world itself is kept.
 */
export function parseFace(html: string, domain: string): WorldFace {
  const titleTag = /<title>([^<]*)<\/title>/i.exec(html)?.[1];
  const title = meta(html, 'og:title') ?? (unescape(titleTag ?? '').trim() || null);
  const image = meta(html, 'og:image');
  return { title, image: image?.startsWith(`https://${domain}/`) ? image : null };
}

/** Read a world's page like a visitor; null when it does not answer. Never throws. */
export async function readFace(
  fetchImpl: Fetch,
  domain: string,
  timeoutMs = 3000,
): Promise<WorldFace | null> {
  try {
    const response = await fetchImpl(`https://${domain}/`, {
      headers: { accept: 'text/html', 'user-agent': 'numinia-worlds-room' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return parseFace((await response.text()).slice(0, 200_000), domain);
  } catch {
    return null;
  }
}

/** The faces of several worlds, in parallel; a world that does not answer is left out. */
export async function readFaces(
  fetchImpl: Fetch,
  worlds: readonly { readonly id: string; readonly domain: string }[],
  timeoutMs = 3000,
): Promise<Record<string, WorldFace>> {
  const answers = await Promise.all(
    worlds.map(
      async (world) => [world.id, await readFace(fetchImpl, world.domain, timeoutMs)] as const,
    ),
  );
  return Object.fromEntries(
    answers.filter((entry): entry is readonly [string, WorldFace] => entry[1] !== null),
  );
}
